import { supabase } from '@/lib/supabase/client';
import { SERVER_URL } from '@/lib/serverProxy';

type SignalingEvent =
  | { type: 'AUTHENTICATED'; userId: string }
  | { type: 'ROOM_JOINED'; conversationId: string; participantCount: number }
  | { type: 'PEER_JOINED'; conversationId: string; userId: string }
  | { type: 'PEER_LEFT'; conversationId: string; userId: string }
  | { type: 'OFFER'; senderId: string; conversationId: string; sdp: string }
  | { type: 'ANSWER'; senderId: string; conversationId: string; sdp: string }
  | {
      type: 'ICE_CANDIDATE';
      senderId: string;
      conversationId: string;
      candidate: unknown;
      sdpMid?: string;
      sdpMLineIndex?: number;
    }
  | { type: 'ERROR'; code: string; message: string };

type SignalingHandlers = {
  onAuthenticated?: (userId: string) => void;
  onRoomJoined?: (conversationId: string, participantCount: number) => void;
  onPeerJoined?: (conversationId: string, userId: string) => void;
  onPeerLeft?: (conversationId: string, userId: string) => void;
  onOffer?: (senderId: string, conversationId: string, sdp: string) => void;
  onAnswer?: (senderId: string, conversationId: string, sdp: string) => void;
  onIceCandidate?: (
    senderId: string,
    conversationId: string,
    candidate: unknown,
    sdpMid?: string,
    sdpMLineIndex?: number,
  ) => void;
  onError?: (code: string, message: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';

class SignalingClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: SignalingHandlers = {};
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(handlers: SignalingHandlers = {}) {
    this.handlers = handlers;
    const wsUrl = SERVER_URL.replace(/^http(?=s?)/, 'ws');
    this.url = `${wsUrl}`;
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  private setState(state: ConnectionState) {
    this.state = state;
  }

  private send(payload: unknown): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.ws.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return;
    }

    this.isConnecting = true;
    this.setState('connecting');

    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(`${this.url}?token=${encodeURIComponent(token ?? '')}`);
        this.ws = ws;

        ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.setState('connected');
          this.handlers.onConnect?.();
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as SignalingEvent;
            this.handleMessage(message);
          } catch {
            // ignore malformed messages
          }
        };

        ws.onclose = () => {
          this.ws = null;
          if (this.state !== 'disconnected') {
            this.setState('disconnected');
            this.handlers.onDisconnect?.();
            if (this.shouldReconnect) {
              this.scheduleReconnect();
            }
          }
        };

        ws.onerror = (err) => {
          console.error('[signaling] WebSocket error:', err);
          this.setState('failed');
          this.handlers.onError?.('CONNECTION_ERROR', 'WebSocket connection failed');
        };
      } catch (err) {
        this.isConnecting = false;
        this.setState('failed');
        reject(err);
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState('failed');
      return;
    }

    this.reconnectAttempts += 1;
    this.setState('reconnecting');

    const delay = Math.min(1000 * this.reconnectAttempts, 30000);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      void this.connect();
    }, delay);
  }

  private handleMessage(message: SignalingEvent) {
    switch (message.type) {
      case 'AUTHENTICATED':
        this.handlers.onAuthenticated?.(message.userId);
        break;
      case 'ROOM_JOINED':
        this.handlers.onRoomJoined?.(message.conversationId, message.participantCount);
        break;
      case 'PEER_JOINED':
        this.handlers.onPeerJoined?.(message.conversationId, message.userId);
        break;
      case 'PEER_LEFT':
        this.handlers.onPeerLeft?.(message.conversationId, message.userId);
        break;
      case 'OFFER':
        this.handlers.onOffer?.(message.senderId, message.conversationId, message.sdp);
        break;
      case 'ANSWER':
        this.handlers.onAnswer?.(message.senderId, message.conversationId, message.sdp);
        break;
      case 'ICE_CANDIDATE':
        this.handlers.onIceCandidate?.(
          message.senderId,
          message.conversationId,
          message.candidate,
          message.sdpMid,
          message.sdpMLineIndex,
        );
        break;
      case 'ERROR':
        this.handlers.onError?.(message.code, message.message);
        break;
    }
  }

  async authenticate(token?: string): Promise<boolean> {
    const effectiveToken = token ?? (await supabase.auth.getSession()).data.session?.access_token;
    if (!effectiveToken) {
      return false;
    }
    return this.send({ type: 'AUTH', token: effectiveToken });
  }

  joinRoom(conversationId: string): boolean {
    return this.send({ type: 'JOIN_ROOM', conversationId });
  }

  leaveRoom(conversationId: string): boolean {
    return this.send({ type: 'LEAVE_ROOM', conversationId });
  }

  sendOffer(conversationId: string, sdp: string): boolean {
    return this.send({ type: 'OFFER', sdp, conversationId });
  }

  sendAnswer(conversationId: string, sdp: string): boolean {
    return this.send({ type: 'ANSWER', sdp, conversationId });
  }

  sendIceCandidate(
    conversationId: string,
    candidate: unknown,
    sdpMid?: string,
    sdpMLineIndex?: number,
  ): boolean {
    return this.send({ type: 'ICE_CANDIDATE', candidate, conversationId, sdpMid, sdpMLineIndex });
  }

  setHandlers(handlers: SignalingHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }
}

let clientInstance: SignalingClient | null = null;

export function getSignalingClient(handlers?: SignalingHandlers): SignalingClient {
  if (!clientInstance) {
    clientInstance = new SignalingClient(handlers);
  } else if (handlers) {
    clientInstance.setHandlers(handlers);
  }
  return clientInstance;
}

export function closeSignalingClient() {
  if (clientInstance) {
    clientInstance.disconnect();
    clientInstance = null;
  }
}

export type {
  SignalingClient,
  SignalingHandlers,
  SignalingEvent,
  ConnectionState,
};
