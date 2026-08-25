import { DurableObject } from "cloudflare:workers";

import { isThemeId, type ThemeId } from "../shared/themes";
import {
  CARD_DECKS,
  emptyRoomState,
  type CardType,
  type ClientMessage,
  type RoomState,
  type ServerMessage,
  type Vote,
} from "../shared/types";
import type { Env } from "./env";

const STORAGE_KEY = "state";
const LAST_VISITED_KEY = "lastVisitedAt";
const DEPARTURE_PREFIX = "departure:";
// Password verifier lives outside RoomState (never broadcast) — only its salt+hash are
// persisted, and only this Durable Object ever sees the plaintext.
const PASSWORD_SALT_KEY = "passwordSalt";
const PASSWORD_HASH_KEY = "passwordHash";

async function hashPassword(password: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * How long a room is kept around after its last visit (any WebSocket connection, joined or
 * just previewing) before it's deleted — a sliding TTL, pushed out on every visit, so an
 * actively-used room never expires but a truly abandoned one eventually does. Being empty
 * of current users does NOT by itself trigger deletion — only prolonged total inactivity does.
 */
const ROOM_TTL_DAYS = 30;
const ROOM_TTL_MS = ROOM_TTL_DAYS * 24 * 60 * 60 * 1000;
const RECONNECT_GRACE_PERIOD_MS = 2_000;

interface WebSocketAttachment {
  userId: string;
  userName: string;
}

/**
 * One instance per room name. Uses the WebSocket Hibernation API so an idle
 * room holds no live memory/compute between messages — all state lives in
 * ctx.storage (SQLite-backed), and per-socket identity survives hibernation
 * via ws.serializeAttachment.
 */
export class Room extends DurableObject<Env> {
  /**
   * In-memory cache of the persisted state, valid only for this instance's current
   * (non-hibernated) lifetime — avoids a redundant storage read on every message.
   * Never relied on for correctness: cleared across hibernation, always rehydrated
   * from ctx.storage on first access after a wake.
   */
  private cachedState: RoomState | null = null;

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket upgrade request", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    void this.recordVisit();

    // Preview the room's current state (e.g. "N players in the room" on an invite
    // link's nickname screen) without delaying the WebSocket handshake itself.
    void this.getState().then((state) => {
      server.send(JSON.stringify({ type: "update_room", state } satisfies ServerMessage));
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;

    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    switch (parsed.type) {
      case "join":
        await this.handleJoin(ws, parsed.userName, parsed.userId, parsed.password, parsed.isObserver);
        break;
      case "vote":
        await this.handleVote(ws, parsed.vote);
        break;
      case "toggle_reveal_cards":
        await this.handleToggleReveal();
        break;
      case "change_card_types":
        await this.handleChangeCardType(parsed.cardType);
        break;
      case "change_theme":
        await this.handleChangeTheme(parsed.theme);
        break;
      case "set_privacy":
        await this.handleSetPrivacy(parsed.private, parsed.password);
        break;
      case "set_observer":
        await this.handleSetObserver(ws, parsed.isObserver);
        break;
      case "set_kick_allowed":
        await this.handleSetKickAllowed(parsed.allowed);
        break;
      case "reset":
        await this.handleReset(ws);
        break;
      case "kick":
        await this.handleKick(ws, parsed.userId);
        break;
      case "nudge":
        await this.handleNudge(ws, parsed.userId);
        break;
      case "leave":
        await this.handleLeave(ws);
        break;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleLeave(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleLeave(ws);
  }

  /**
   * Fires for two independent reasons — whichever comes sooner: a departed user's
   * reconnect-grace window elapsed (prune them from the roster), or the room's 7-day
   * inactivity TTL elapsed (delete it entirely). Always reschedules itself for whatever's
   * next via `scheduleAlarm`.
   */
  async alarm(): Promise<void> {
    const state = await this.getState();
    const now = Date.now();
    const departures = await this.ctx.storage.list<number>({ prefix: DEPARTURE_PREFIX });
    let stateChanged = false;

    for (const [key, deadline] of departures) {
      if (deadline > now) continue;

      const userId = key.slice(DEPARTURE_PREFIX.length);
      const reconnected = this.ctx
        .getWebSockets()
        .some(
          (socket) =>
            socket.readyState === WebSocket.OPEN &&
            this.getAttachment(socket)?.userId === userId,
        );

      if (!reconnected) {
        state.users = state.users.filter((user) => user.id !== userId);
        stateChanged = true;
      }
      await this.ctx.storage.delete(key);
    }

    if (stateChanged) {
      await this.saveState(state);
      await this.broadcast({ type: "update_room", state });
    }

    const lastVisitedAt = (await this.ctx.storage.get<number>(LAST_VISITED_KEY)) ?? now;
    if (now - lastVisitedAt >= ROOM_TTL_MS) {
      this.cachedState = null;
      await this.ctx.storage.deleteAll();
      return;
    }

    await this.scheduleAlarm();
  }

  /** Records a visit (any WebSocket connection) and pushes the room's TTL out from now. */
  private async recordVisit(): Promise<void> {
    await this.ctx.storage.put(LAST_VISITED_KEY, Date.now());
    await this.scheduleAlarm();
  }

  /** Sets the single DO alarm to the earliest of: the TTL deadline, any pending departure. */
  private async scheduleAlarm(): Promise<void> {
    const lastVisitedAt = (await this.ctx.storage.get<number>(LAST_VISITED_KEY)) ?? Date.now();
    let nextAlarm = lastVisitedAt + ROOM_TTL_MS;

    const departures = await this.ctx.storage.list<number>({ prefix: DEPARTURE_PREFIX });
    for (const deadline of departures.values()) {
      nextAlarm = Math.min(nextAlarm, deadline);
    }

    await this.ctx.storage.setAlarm(nextAlarm);
  }

  private async handleJoin(
    ws: WebSocket,
    userName: string,
    userId: string,
    password?: string,
    isObserver?: boolean,
  ): Promise<void> {
    if (!userId || userId.length > 128) return;

    const state = await this.getState();
    const existing = state.users.find((user) => user.id === userId);

    // A rejoin from someone already seated (e.g. a refresh) is trusted without a password —
    // they already proved membership once this session. Everyone else needs the current one.
    if (state.private && !existing) {
      const salt = await this.ctx.storage.get<string>(PASSWORD_SALT_KEY);
      const expectedHash = await this.ctx.storage.get<string>(PASSWORD_HASH_KEY);
      const providedHash = salt && password ? await hashPassword(password, salt) : null;
      if (!expectedHash || providedHash !== expectedHash) {
        ws.send(
          JSON.stringify({
            type: "join_rejected",
            reason: password ? "invalid_password" : "password_required",
          } satisfies ServerMessage),
        );
        return;
      }
    }

    ws.serializeAttachment({ userId, userName } satisfies WebSocketAttachment);
    await this.ctx.storage.delete(`${DEPARTURE_PREFIX}${userId}`);
    if (existing) {
      existing.name = userName;
      // Only a brand-new participant's choice should land here — a reconnect/rename
      // omits this, and must never silently flip someone back into (or out of) observing.
      if (isObserver !== undefined) existing.isObserver = isObserver;
    } else {
      state.users.push({ id: userId, name: userName, vote: null, isObserver: isObserver ?? false });
    }
    await this.saveState(state);

    // A refresh presents the same per-tab identity. Keep the participant and vote,
    // and retire the superseded socket without briefly removing them from the room.
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws && this.getAttachment(other)?.userId === userId) {
        other.send(JSON.stringify({ type: "session_replaced" } satisfies ServerMessage));
        other.close(4001, "Room opened in another tab");
      }
    }

    ws.send(JSON.stringify({ type: "joined", userId } satisfies ServerMessage));
    await this.broadcast({ type: "update_room", state });
  }

  private async handleVote(ws: WebSocket, vote: Vote): Promise<void> {
    const attachment = this.getAttachment(ws);
    if (!attachment) return;

    const state = await this.getState();
    const user = state.users.find((u) => u.id === attachment.userId);
    // The client already blurs/disables the deck for observers — this is the backstop
    // in case a stale tab or a modified client still tries to send a vote.
    if (!user || user.isObserver) return;

    // Clicking the same card again un-votes.
    user.vote = user.vote?.name === vote.name ? null : vote;

    await this.saveState(state);
    await this.broadcast({ type: "update_room", state });
  }

  private async handleToggleReveal(): Promise<void> {
    const state = await this.getState();
    state.revealed = !state.revealed;
    await this.saveState(state);
    await this.broadcast({ type: "update_room", state });
  }

  private async handleChangeCardType(cardType: CardType): Promise<void> {
    if (!(cardType in CARD_DECKS)) return;

    const state = await this.getState();
    state.cardType = cardType;
    await this.saveState(state);
    await this.broadcast({ type: "update_room", state });
  }

  private async handleChangeTheme(theme: ThemeId): Promise<void> {
    if (!isThemeId(theme)) return;

    const state = await this.getState();
    state.theme = theme;
    await this.saveState(state);
    await this.broadcast({ type: "update_room", state });
  }

  private async handleSetPrivacy(isPrivate: boolean, password: string | null): Promise<void> {
    if (isPrivate) {
      if (!password) return;
      const salt = crypto.randomUUID();
      await this.ctx.storage.put(PASSWORD_SALT_KEY, salt);
      await this.ctx.storage.put(PASSWORD_HASH_KEY, await hashPassword(password, salt));
    } else {
      await this.ctx.storage.delete(PASSWORD_SALT_KEY);
      await this.ctx.storage.delete(PASSWORD_HASH_KEY);
    }

    const state = await this.getState();
    state.private = isPrivate;
    await this.saveState(state);
    await this.broadcast({ type: "update_room", state });
  }

  private async handleSetObserver(ws: WebSocket, isObserver: boolean): Promise<void> {
    const attachment = this.getAttachment(ws);
    if (!attachment) return;

    const state = await this.getState();
    const user = state.users.find((u) => u.id === attachment.userId);
    if (!user) return;

    user.isObserver = isObserver;
    // Opting out of voting mid-round shouldn't leave a stale vote counted in the average.
    if (isObserver) user.vote = null;

    await this.saveState(state);
    await this.broadcast({ type: "update_room", state });
  }

  private async handleReset(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    const state = await this.getState();
    // Nothing revealed and nothing voted means there's genuinely nothing to clear —
    // skip the state write and broadcast so it doesn't spam a "reset the cards" toast.
    if (!state.revealed && state.users.every((user) => user.vote === null)) return;

    state.revealed = false;
    for (const user of state.users) user.vote = null;
    await this.saveState(state);
    await this.broadcast({ type: "reset_room", state, resetBy: attachment?.userName ?? "Someone" });
  }

  private async handleSetKickAllowed(allowed: boolean): Promise<void> {
    const state = await this.getState();
    state.allowKick = allowed;
    await this.saveState(state);
    await this.broadcast({ type: "update_room", state });
  }

  /**
   * Any seated participant can remove any other once the room has opted in via
   * `allowKick` — there's no room-owner concept here, same flat model as reveal/reset/theme
   * changes. Removes them from the roster immediately and force-closes every socket they
   * currently have open (e.g. two tabs), so it actually takes effect rather than just
   * hiding them from the list while they keep voting.
   */
  private async handleKick(ws: WebSocket, userId: string): Promise<void> {
    const attachment = this.getAttachment(ws);
    if (!attachment || attachment.userId === userId) return;

    const state = await this.getState();
    if (!state.allowKick) return;
    const kickedUser = state.users.find((user) => user.id === userId);
    if (!kickedUser) return;
    const kickedName = kickedUser.name;

    state.users = state.users.filter((user) => user.id !== userId);
    await this.ctx.storage.delete(`${DEPARTURE_PREFIX}${userId}`);
    await this.saveState(state);

    // Sent before `update_room` (and only to sockets other than the removed user's own) so
    // clients learn this was a kick before their roster diff notices the user is gone.
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState === WebSocket.OPEN && this.getAttachment(socket)?.userId !== userId) {
        socket.send(
          JSON.stringify({
            type: "user_kicked",
            kickedUserId: userId,
            kickedName,
            kickedByName: attachment.userName,
          } satisfies ServerMessage),
        );
      }
    }

    await this.broadcast({ type: "update_room", state });

    for (const socket of this.ctx.getWebSockets()) {
      if (this.getAttachment(socket)?.userId === userId) {
        socket.send(JSON.stringify({ type: "kicked" } satisfies ServerMessage));
        socket.close(4002, "Removed from room");
      }
    }
  }

  /** A one-off ping at another participant — no room-state change, just a sound on their end. */
  private async handleNudge(ws: WebSocket, userId: string): Promise<void> {
    const attachment = this.getAttachment(ws);
    if (!attachment || attachment.userId === userId) return;

    const state = await this.getState();
    if (!state.users.some((user) => user.id === userId)) return;

    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState === WebSocket.OPEN && this.getAttachment(socket)?.userId === userId) {
        socket.send(
          JSON.stringify({ type: "nudged", fromName: attachment.userName } satisfies ServerMessage),
        );
      }
    }
  }

  private async handleLeave(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    if (!attachment) return;

    const replacementIsOpen = this.ctx.getWebSockets().some(
      (other) =>
        other !== ws &&
        other.readyState === WebSocket.OPEN &&
        this.getAttachment(other)?.userId === attachment.userId,
    );
    if (replacementIsOpen) {
      await this.ctx.storage.delete(`${DEPARTURE_PREFIX}${attachment.userId}`);
      return;
    }

    // Keep the participant visible briefly. A refresh reconnects with the same ID and
    // cancels this departure; a genuine disconnect is removed by the alarm.
    const deadline = Date.now() + RECONNECT_GRACE_PERIOD_MS;
    await this.ctx.storage.put(`${DEPARTURE_PREFIX}${attachment.userId}`, deadline);
    await this.scheduleAlarm();
  }

  private getAttachment(ws: WebSocket): WebSocketAttachment | null {
    return (ws.deserializeAttachment() as WebSocketAttachment | null) ?? null;
  }

  private async getState(): Promise<RoomState> {
    if (this.cachedState) return this.cachedState;
    const stored = await this.ctx.storage.get<RoomState>(STORAGE_KEY);
    this.cachedState = stored ?? emptyRoomState();
    return this.cachedState;
  }

  private async saveState(state: RoomState): Promise<void> {
    this.cachedState = state;
    await this.ctx.storage.put(STORAGE_KEY, state);
  }

  private async broadcast(message: ServerMessage): Promise<void> {
    const payload = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}
