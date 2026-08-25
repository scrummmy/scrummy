// Domain types and message protocol shared between the Worker/Durable Object and the SPA.

import type { ThemeId } from "./themes";

export type CardType = "Fibonacci" | "TshirtSize" | "Binary";

export interface Card {
  name: string;
  /** Numeric weight used for averaging; -1 means "not counted" (label-only or custom). */
  value: number;
}

export const CARD_DECKS: Record<CardType, Card[]> = {
  Fibonacci: [
    { name: "0.5", value: 0.5 },
    { name: "1", value: 1 },
    { name: "2", value: 2 },
    { name: "3", value: 3 },
    { name: "5", value: 5 },
    { name: "8", value: 8 },
    { name: "13", value: 13 },
    { name: "20", value: 20 },
    { name: "40", value: 40 },
  ],
  TshirtSize: [
    { name: "XS", value: -1 },
    { name: "S", value: -1 },
    { name: "M", value: -1 },
    { name: "L", value: -1 },
    { name: "XL", value: -1 },
    { name: "XXL", value: -1 },
  ],
  Binary: [
    { name: "Yes", value: -1 },
    { name: "No", value: -1 },
  ],
};

/** Every deck also allows a free-form custom vote (e.g. an emoji), which is never counted in the average. */
export const CUSTOM_CARD_VALUE = -1;

export interface Vote {
  name: string;
  value: number;
}

export interface User {
  id: string;
  name: string;
  vote: Vote | null;
  /** Opted out of voting — sees a blurred deck and is never counted toward the average. */
  isObserver: boolean;
}

export interface RoomState {
  revealed: boolean;
  cardType: CardType;
  users: User[];
  /** null until someone explicitly changes it — clients fall back to guessing from the room slug. */
  theme: ThemeId | null;
  /** Whether joining requires a password. The password itself never lives in this (broadcast) state. */
  private: boolean;
  /** On by default — anyone can turn it off in settings if they don't want kicking enabled. */
  allowKick: boolean;
}

export function emptyRoomState(): RoomState {
  return { revealed: false, cardType: "Fibonacci", users: [], theme: null, private: false, allowKick: true };
}

/** Average of numeric (value >= 0) votes; null when there are none to average. */
export function averageVote(state: RoomState): number | null {
  const numeric = state.users
    .map((u) => u.vote)
    .filter((v): v is Vote => v !== null && v.value >= 0);
  if (numeric.length === 0) return null;
  const sum = numeric.reduce((acc, v) => acc + v.value, 0);
  return sum / numeric.length;
}

/** True when every vote in the room (comparing by name, not value — T-shirt/Binary decks
 * share value -1 across cards) picked the same card. Requires at least two votes, so a
 * lone voter never counts as "consensus". */
export function isUnanimous(state: RoomState): boolean {
  const votes = state.users.map((u) => u.vote).filter((v): v is Vote => v !== null);
  if (votes.length < 2) return false;
  return votes.every((vote) => vote.name === votes[0].name);
}

// --- Client -> Server messages ---

export type ClientMessage =
  | {
      type: "join";
      roomName: string;
      userName: string;
      userId: string;
      password?: string;
      /** Only meaningful for a brand-new participant — omit to leave an existing one's status alone. */
      isObserver?: boolean;
    }
  | { type: "vote"; vote: Vote }
  | { type: "toggle_reveal_cards" }
  | { type: "change_card_types"; cardType: CardType }
  | { type: "change_theme"; theme: ThemeId }
  | { type: "set_privacy"; private: boolean; password: string | null }
  | { type: "set_observer"; isObserver: boolean }
  | { type: "set_kick_allowed"; allowed: boolean }
  | { type: "reset" }
  | { type: "kick"; userId: string }
  | { type: "nudge"; userId: string }
  | { type: "leave" };

// --- Server -> Client messages ---

export type ServerMessage =
  // Sent only to the socket that just joined, so it can identify its own entry in `users`.
  | { type: "joined"; userId: string }
  | { type: "session_replaced" }
  // Sent only to the removed participant's own socket(s), right before closing them.
  | { type: "kicked" }
  // Sent to everyone else so they can toast "X kicked Y from the room" — the removed
  // participant gets `kicked` instead, so they're excluded from this broadcast. Always sent
  // before the `update_room` that drops them, so clients can tell this apart from a plain
  // disconnect and skip the redundant "Y left the room" toast their roster diff would
  // otherwise also fire.
  | { type: "user_kicked"; kickedUserId: string; kickedName: string; kickedByName: string }
  // Sent only to the nudged participant's own socket(s) — a one-off ping, no state change.
  | { type: "nudged"; fromName: string }
  // Never allowed to join at all — no `users` entry was created, so there's nothing to roll back.
  | { type: "join_rejected"; reason: "password_required" | "invalid_password" }
  | { type: "update_room"; state: RoomState }
  | { type: "reset_room"; state: RoomState; resetBy: string };
