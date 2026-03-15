const WS_URL =
  process.env.NEXT_PUBLIC_HL_WS_URL ?? 'wss://api.hyperliquid.xyz/ws';

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const MAX_RECONNECT_DELAY = 30_000; // 30 seconds
const INITIAL_RECONNECT_DELAY = 1_000; // 1 second

type MessageHandler = (data: unknown) => void;

export interface Subscription {
  type: string;
  [key: string]: unknown;
}

export class HyperliquidWS {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = INITIAL_RECONNECT_DELAY;
  private activeSubscriptions: Subscription[] = [];
  private shouldReconnect = false;

  // ── Connection ─────────────────────────────────────────
  connect(): void {
    this.shouldReconnect = true;
    this.createConnection();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.cleanup();
  }

  // ── Subscriptions ──────────────────────────────────────
  subscribe(channel: string, payload: Record<string, unknown> = {}): void {
    const subscription: Subscription = { type: channel, ...payload };
    this.activeSubscriptions.push(subscription);
    this.sendSubscription('subscribe', subscription);
  }

  unsubscribe(channel: string, payload: Record<string, unknown> = {}): void {
    const subscription: Subscription = { type: channel, ...payload };
    this.activeSubscriptions = this.activeSubscriptions.filter(
      (s) =>
        !(s.type === channel && JSON.stringify({ ...s, type: undefined }) ===
          JSON.stringify(payload)),
    );
    this.sendSubscription('unsubscribe', subscription);
  }

  // ── Message handler ────────────────────────────────────
  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  // ── Internals ──────────────────────────────────────────
  private createConnection(): void {
    this.cleanup();

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      this.reconnectDelay = INITIAL_RECONNECT_DELAY;
      this.startHeartbeat();
      // Re-subscribe to all active subscriptions after reconnect
      for (const sub of this.activeSubscriptions) {
        this.sendSubscription('subscribe', sub);
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data: unknown = JSON.parse(String(event.data));
        for (const handler of this.handlers) {
          handler(data);
        }
      } catch {
        // Ignore invalid JSON messages
      }
    };

    ws.onclose = () => {
      this.stopHeartbeat();
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
    };

    this.ws = ws;
  }

  private sendSubscription(
    method: 'subscribe' | 'unsubscribe',
    subscription: Subscription,
  ): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ method, subscription }));
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.createConnection();
    }, this.reconnectDelay);
    // Exponential backoff capped at MAX_RECONNECT_DELAY
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      MAX_RECONNECT_DELAY,
    );
  }

  private cleanup(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }
  }
}
