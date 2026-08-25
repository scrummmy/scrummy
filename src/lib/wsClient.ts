import type { ThemeId } from "@shared/themes";
import type { CardType, ClientMessage, ServerMessage, Vote } from "@shared/types";

type MessageListener = (message: ServerMessage) => void;
type ConnectionListener = () => void;
type CloseListener = (event: CloseEvent) => void;

/** Thin WebSocket client: opens the room socket and exposes one method per client action. */
export class RoomSocket {
  private ws: WebSocket | null = null;
  private queue: ClientMessage[] = [];
  private messageListeners = new Set<MessageListener>();
  private openListeners = new Set<ConnectionListener>();
  private closeListeners = new Set<CloseListener>();

  /** Opens the socket only — lets the caller preview room state before deciding to join. */
  connect(roomSlug: string): void {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    this.ws = new WebSocket(`${protocol}//${location.host}/ws/${encodeURIComponent(roomSlug)}`);

    this.ws.addEventListener("open", () => {
      for (const message of this.queue) this.ws!.send(JSON.stringify(message));
      this.queue = [];
      for (const listener of this.openListeners) listener();
    });

    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data as string) as ServerMessage;
      for (const listener of this.messageListeners) listener(message);
    });

    this.ws.addEventListener("close", (event) => {
      for (const listener of this.closeListeners) listener(event);
    });
  }

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onOpen(listener: ConnectionListener): () => void {
    this.openListeners.add(listener);
    return () => this.openListeners.delete(listener);
  }

  onClose(listener: CloseListener): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  join(
    roomSlug: string,
    userName: string,
    userId: string,
    password?: string,
    isObserver?: boolean,
  ): void {
    this.send({ type: "join", roomName: roomSlug, userName, userId, password, isObserver });
  }

  vote(vote: Vote): void {
    this.send({ type: "vote", vote });
  }

  toggleReveal(): void {
    this.send({ type: "toggle_reveal_cards" });
  }

  changeCardType(cardType: CardType): void {
    this.send({ type: "change_card_types", cardType });
  }

  changeTheme(theme: ThemeId): void {
    this.send({ type: "change_theme", theme });
  }

  setPrivacy(isPrivate: boolean, password: string | null): void {
    this.send({ type: "set_privacy", private: isPrivate, password });
  }

  setObserver(isObserver: boolean): void {
    this.send({ type: "set_observer", isObserver });
  }

  setKickAllowed(allowed: boolean): void {
    this.send({ type: "set_kick_allowed", allowed });
  }

  reset(): void {
    this.send({ type: "reset" });
  }

  kick(userId: string): void {
    this.send({ type: "kick", userId });
  }

  nudge(userId: string): void {
    this.send({ type: "nudge", userId });
  }

  leave(): void {
    this.send({ type: "leave" });
    this.ws?.close();
    this.ws = null;
  }

  private send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.queue.push(message);
    }
  }
}
