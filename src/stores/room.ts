import { defineStore } from "pinia";

import type { ThemeId } from "@shared/themes";
import {
  averageVote,
  CARD_DECKS,
  emptyRoomState,
  isUnanimous,
  type CardType,
  type RoomState,
} from "@shared/types";
import { celebrateUnanimousVote } from "@/lib/confetti";
import { playSound } from "@/lib/sounds";
import { RoomSocket } from "@/lib/wsClient";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";

type ConnectionStatus = "connecting" | "syncing" | "ready" | "superseded" | "kicked";

interface RoomPreview {
  playerCount: number;
  theme: ThemeId | null;
  private: boolean;
  savedAt: number;
}

const PREVIEW_TTL_MS = 30_000;
const USER_ID_KEY = "scrummy:userId";

function cacheKey(roomSlug: string): string {
  return `scrummy:room-preview:${roomSlug}`;
}

function loadPreview(roomSlug: string): RoomPreview | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(roomSlug));
    if (!raw) return null;
    const preview = JSON.parse(raw) as Partial<RoomPreview>;
    if (
      typeof preview.playerCount !== "number" ||
      typeof preview.savedAt !== "number" ||
      Date.now() - preview.savedAt > PREVIEW_TTL_MS
    ) {
      sessionStorage.removeItem(cacheKey(roomSlug));
      return null;
    }
    return preview as RoomPreview;
  } catch {
    return null;
  }
}

function savePreview(roomSlug: string, state: RoomState): void {
  try {
    const preview: RoomPreview = {
      playerCount: state.users.length,
      theme: state.theme,
      private: state.private,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(cacheKey(roomSlug), JSON.stringify(preview));
  } catch {
    // Caching is a paint optimization only.
  }
}

function playRoomSounds(previous: RoomState, next: RoomState, selfId: string, isReset: boolean): void {
  const previousIds = new Set(previous.users.map((user) => user.id));
  const nextIds = new Set(next.users.map((user) => user.id));
  const someoneElseJoined = next.users.some(
    (user) => user.id !== selfId && !previousIds.has(user.id),
  );
  const someoneElseLeft = previous.users.some(
    (user) => user.id !== selfId && !nextIds.has(user.id),
  );

  if (someoneElseJoined) {
    playSound("join");
  } else if (someoneElseLeft) {
    playSound("left");
  }

  const previouslyVoted = new Set(
    previous.users.filter((user) => user.vote !== null).map((user) => user.id),
  );
  const someoneElseVoted = next.users.some(
    (user) =>
      user.id !== selfId &&
      user.vote !== null &&
      !previouslyVoted.has(user.id),
  );
  if (someoneElseVoted) playSound("voted");

  // Unlike join/left/vote, a reveal is a single room-wide moment everyone should hear
  // together — including whoever triggered it, so this is never gated on `selfId`.
  if (isReset) {
    // Reset always sends cards back down, even if they were never revealed this round
    // (e.g. clearing votes before anyone reveals) — that's still a real action worth a cue,
    // not just an incidental side effect of the reveal toggle's false→true/true→false diff.
    playSound("hide");
  } else if (!previous.revealed && next.revealed) {
    playSound("reveal");
    if (isUnanimous(next)) celebrateUnanimousVote();
  } else if (previous.revealed && !next.revealed) {
    playSound("hide");
  }
}

/** Same before/after roster diff as `playRoomSounds`, but for the join/left toasts — kept
 * separate since sound and toast are independent preferences a user could mute one of.
 * `excludeFromLeft` skips the "left" toast for users who just got a dedicated "kicked"
 * toast instead, so a kick doesn't also read as a plain disconnect. */
function announceRoomChanges(
  previous: RoomState,
  next: RoomState,
  selfId: string,
  excludeFromLeft: Set<string>,
): void {
  const toast = useToastStore();
  const previousIds = new Set(previous.users.map((user) => user.id));
  const nextIds = new Set(next.users.map((user) => user.id));

  for (const user of next.users) {
    if (user.id !== selfId && !previousIds.has(user.id)) toast.push(`${user.name} joined the room`);
  }
  for (const user of previous.users) {
    if (user.id !== selfId && !nextIds.has(user.id) && !excludeFromLeft.has(user.id)) {
      toast.push(`${user.name} left the room`);
    }
  }
}

function getUserId(): string {
  const existing = sessionStorage.getItem(USER_ID_KEY);
  if (existing) return existing;
  const userId = crypto.randomUUID();
  sessionStorage.setItem(USER_ID_KEY, userId);
  return userId;
}

export const useRoomStore = defineStore("room", {
  state: () => ({
    status: "connecting" as ConnectionStatus,
    roomSlug: "",
    selfId: "" as string,
    joinPending: false,
    pendingUserName: "",
    pendingIsNewJoin: false,
    pendingIsObserver: false,
    pendingSoundPlayed: false,
    room: emptyRoomState() as RoomState,
    previewPlayerCount: null as number | null,
    previewTheme: null as ThemeId | null,
    previewPrivate: false,
    joinError: null as "password_required" | "invalid_password" | null,
    socket: null as RoomSocket | null,
  }),
  getters: {
    deck: (state) => CARD_DECKS[state.room.cardType],
    average: (state) => averageVote(state.room),
    selfUser: (state) => state.room.users.find((u) => u.id === state.selfId) ?? null,
    playerCount: (state) =>
      state.status === "ready"
        ? state.room.users.length
        : (state.previewPlayerCount ?? state.room.users.length),
    isPrivate: (state) => (state.status === "ready" ? state.room.private : state.previewPrivate),
  },
  actions: {
    /** Opens the room socket so state (e.g. current player count) can be previewed before joining. */
    connect(roomSlug: string): void {
      if (this.roomSlug === roomSlug && this.socket) return;
      this.leave();

      this.roomSlug = roomSlug;
      this.status = "connecting";
      this.room = emptyRoomState();
      const preview = loadPreview(roomSlug);
      this.previewPlayerCount = preview?.playerCount ?? null;
      this.previewTheme = preview?.theme ?? null;
      this.previewPrivate = preview?.private ?? false;
      this.joinError = null;
      const socket = new RoomSocket();
      // Populated just ahead of the `update_room` that drops a kicked user, so that
      // update's roster diff can skip the redundant "left the room" toast for them.
      const recentlyKickedIds = new Set<string>();
      socket.onMessage((message) => {
        if (message.type === "joined") {
          this.selfId = message.userId;
        } else if (message.type === "session_replaced") {
          this.status = "superseded";
        } else if (message.type === "kicked") {
          this.status = "kicked";
          playSound("kicked");
        } else if (message.type === "nudged") {
          playSound("nudge");
          useToastStore().push(`${message.fromName} nudged you`);
        } else if (message.type === "user_kicked") {
          recentlyKickedIds.add(message.kickedUserId);
          useToastStore().push(`${message.kickedByName} kicked ${message.kickedName} from the room`);
        } else if (message.type === "join_rejected") {
          // Never made it into `users` server-side, so just drop our optimistic guess of self.
          this.room.users = this.room.users.filter((user) => user.id !== this.selfId);
          this.joinPending = false;
          this.pendingUserName = "";
          this.pendingIsNewJoin = false;
          this.pendingIsObserver = false;
          this.pendingSoundPlayed = false;
          this.joinError = message.reason;
        } else {
          // Only play effects once we've already shown a real room state — otherwise the
          // very first update_room (seeding the pre-join preview) would fire join sounds
          // for every player already sitting in the room.
          if (this.status === "ready") {
            playRoomSounds(this.room, message.state, this.selfId, message.type === "reset_room");
            announceRoomChanges(this.room, message.state, this.selfId, recentlyKickedIds);
            recentlyKickedIds.clear();
            if (message.type === "reset_room" && message.resetBy !== useUserStore().userName) {
              useToastStore().push(`${message.resetBy} reset the cards`);
            }
          }

          const serverHasSelf = message.state.users.some((user) => user.id === this.selfId);
          const optimisticSelf = this.room.users.find((user) => user.id === this.selfId);
          this.room =
            this.joinPending && this.selfId && !serverHasSelf
              ? {
                  ...message.state,
                  users: [
                    ...message.state.users,
                    optimisticSelf ?? {
                      id: this.selfId,
                      name: this.pendingUserName,
                      vote: null,
                      isObserver: this.pendingIsObserver,
                    },
                  ],
                }
              : message.state;

          if (serverHasSelf) {
            // Only a genuinely new join deserves the sound — a rename/reconnect also
            // resolves `joinPending`, but shouldn't play it again on every refresh. If we
            // already played it optimistically in `join()`, don't play it a second time here.
            if (this.joinPending && this.pendingIsNewJoin && !this.pendingSoundPlayed) {
              playSound("join");
            }
            this.joinPending = false;
            this.pendingUserName = "";
            this.pendingIsNewJoin = false;
            this.pendingIsObserver = false;
            this.pendingSoundPlayed = false;
            this.joinError = null;
          }
          this.status = "ready";
          this.previewPlayerCount = message.state.users.length;
          this.previewTheme = message.state.theme;
          this.previewPrivate = message.state.private;
          savePreview(roomSlug, message.state);
        }
      });
      socket.onOpen(() => {
        this.status = "syncing";
      });
      socket.onClose((event) => {
        if (this.socket !== socket) return;
        this.socket = null;
        if (this.joinPending && this.selfId) {
          this.room.users = this.room.users.filter((user) => user.id !== this.selfId);
          this.joinPending = false;
          this.pendingUserName = "";
          this.pendingIsNewJoin = false;
          this.pendingIsObserver = false;
          this.pendingSoundPlayed = false;
        }
        if (this.status !== "superseded" && this.status !== "kicked") {
          this.status = event.code === 4001 ? "superseded" : event.code === 4002 ? "kicked" : "connecting";
        }
      });
      socket.connect(roomSlug);
      this.socket = socket;
    },
    join(userName: string, password?: string, isObserver?: boolean): void {
      const socket = this.socket;
      const roomSlug = this.roomSlug;
      const userId = getUserId();
      if (!socket) return;
      this.joinError = null;
      const existingUser = this.room.users.find((user) => user.id === userId);
      this.joinPending = true;
      this.pendingUserName = userName;
      this.pendingIsNewJoin = !existingUser;
      this.pendingIsObserver = isObserver ?? existingUser?.isObserver ?? false;
      this.selfId = userId;
      if (existingUser) {
        existingUser.name = userName;
      } else {
        this.room.users.push({ id: userId, name: userName, vote: null, isObserver: isObserver ?? false });
      }

      // A brand-new room (or one we already know isn't private) can never reject this
      // join for a password — so there's no need to wait out the round-trip (which, for a
      // Durable Object that's never been hit before, can take ~1s) before playing the sound.
      // Same trick as the optimistic room paint above: assume success, correct if wrong.
      this.pendingSoundPlayed = this.pendingIsNewJoin && !this.isPrivate;
      if (this.pendingSoundPlayed) playSound("join");

      socket.join(roomSlug, userName, userId, password, isObserver);
    },
    takeOver(userName: string): void {
      const roomSlug = this.roomSlug;
      if (!roomSlug || this.status !== "superseded") return;
      this.socket = null;
      this.connect(roomSlug);
      this.join(userName);
    },
    vote(name: string, value: number): void {
      this.socket?.vote({ name, value });
    },
    toggleReveal(): void {
      this.socket?.toggleReveal();
    },
    changeCardType(cardType: CardType): void {
      this.socket?.changeCardType(cardType);
    },
    changeTheme(theme: ThemeId): void {
      this.socket?.changeTheme(theme);
    },
    setPrivacy(isPrivate: boolean, password: string | null): void {
      this.socket?.setPrivacy(isPrivate, password);
    },
    setObserver(isObserver: boolean): void {
      this.socket?.setObserver(isObserver);
    },
    setKickAllowed(allowed: boolean): void {
      this.socket?.setKickAllowed(allowed);
    },
    reset(): void {
      this.socket?.reset();
    },
    kick(userId: string): void {
      this.socket?.kick(userId);
    },
    nudge(userId: string): void {
      this.socket?.nudge(userId);
    },
    leave(): void {
      this.socket?.leave();
      this.socket = null;
      this.status = "connecting";
      this.roomSlug = "";
      this.selfId = "";
      this.joinPending = false;
      this.pendingUserName = "";
      this.pendingIsNewJoin = false;
      this.pendingIsObserver = false;
      this.pendingSoundPlayed = false;
      this.room = emptyRoomState();
      this.previewPlayerCount = null;
      this.previewTheme = null;
      this.previewPrivate = false;
      this.joinError = null;
    },
  },
});
