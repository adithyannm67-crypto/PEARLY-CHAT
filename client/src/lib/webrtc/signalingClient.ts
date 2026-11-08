import { supabase } from '@/lib/supabase/client';
import { SERVER_URL } from '@/lib/serverProxy';
import { log } from './logger';

type SignalingEvent =
  | { type: 'AUTHENTICATED'; userId: string }
  | { type: 'ROOM_JOINED'; conversationId: string; participantCount: number; participantIds: string[] }
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
  | { type: 'ERROR'; code: string; message: string }
  | { type: 'PONG'; timestamp: number };

type SignalingHandlers = {
  onAuthenticated?: (userId: string) => void;
  onRoomJoined?: (conversationId: string, participantCount: number, participantIds: string[]) => void;
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
  private readonly instanceId: string;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPongReceived = 0;
  private readonly HEARTBEAT_INTERVAL = 30000;
  private readonly HEARTBEAT_TIMEOUT = 5000;

  constructor(handlers: SignalingHandlers = {}) {
    this.handlers = handlers;
    this.instanceId = crypto.randomUUID();
    const wsUrl = SERVER_URL!.replace(/^http(?=s?)/, 'ws');
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

  async connect(token?: string): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return;
    }

    this.isConnecting = true;
    this.setState('connecting');

    const effectiveToken = token ?? (await supabase.auth.getSession()).data.session?.access_token;

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(`${this.url}?token=${encodeURIComponent(effectiveToken ?? '')}`);
        this.ws = ws;

        ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.setState('connected');
          this.lastPongReceived = Date.now();
          this.handlers.onConnect?.();
          log('[WS]', null, 'WebSocket opened', {
            instanceId: this.instanceId,
            readyState: ws.readyState,
            url: this.url,
          });
          this.startHeartbeat();
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as SignalingEvent;
            if (message.type === 'OFFER') {
              log('[EDGE-OFFER]', message.conversationId, `OFFER received via WebSocket sender=${message.senderId}`, { sdpLength: message.sdp?.length });
            } else if (message.type === 'ANSWER') {
              log('[ANSWER]', message.conversationId, `ANSWER received via WebSocket sender=${message.senderId}`, { sdpLength: message.sdp?.length });
            } else if (message.type === 'ICE_CANDIDATE') {
              log('[ICE-RECEIVE]', message.conversationId, `ICE candidate received via WebSocket sender=${message.senderId}`, {
                candidate: typeof message.candidate === 'string' ? message.candidate.slice(0, 80) : message.candidate,
                type: typeof message.candidate === 'string' ? message.candidate.split(' ')[0] : 'unknown',
                sdpMid: message.sdpMid,
                sdpMLineIndex: message.sdpMLineIndex,
              });
            }
            this.handleMessage(message);
          } catch {
            log('[signaling]', null, 'malformed WebSocket message', event.data?.slice(0, 200));
          }
        };

        ws.onclose = (event) => {
          this.stopHeartbeat();
          this.ws = null;
          if (this.state !== 'disconnected') {
            this.setState('disconnected');
            log('[WS]', null, 'WebSocket closed', {
              instanceId: this.instanceId,
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
              reconnectAttempts: this.reconnectAttempts,
              shouldReconnect: this.shouldReconnect,
            });
            this.handlers.onDisconnect?.();
            if (this.shouldReconnect) {
              this.scheduleReconnect();
            }
          }
        };

        ws.onerror = (err) => {
          log('[WS]', null, 'WebSocket error', {
            instanceId: this.instanceId,
            readyState: this.ws?.readyState,
          });
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
    log('[WS]', null, 'scheduling reconnect', {
      instanceId: this.instanceId,
      attempt: this.reconnectAttempts,
      delayMs: delay,
      maxAttempts: this.maxReconnectAttempts,
    });
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
        this.handlers.onRoomJoined?.(
          message.conversationId,
          message.participantCount,
          message.participantIds,
        );
        break;
      case 'PEER_JOINED':
        this.handlers.onPeerJoined?.(message.conversationId, message.userId);
        break;
      case 'PEER_LEFT':
        this.handlers.onPeerLeft?.(message.conversationId, message.userId);
        break;
      case 'OFFER':
        log('[EDGE-OFFER]', message.conversationId, 'OFFER handler executing', { senderId: message.senderId });
        this.handlers.onOffer?.(message.senderId, message.conversationId, message.sdp);
        break;
      case 'ANSWER':
        log('[ANSWER]', message.conversationId, 'ANSWER handler executing', { senderId: message.senderId });
        this.handlers.onAnswer?.(message.senderId, message.conversationId, message.sdp);
        break;
      case 'ICE_CANDIDATE':
        log('[ICE-RECEIVE]', message.conversationId, 'ICE candidate handler executing', {
          senderId: message.senderId,
          sdpMid: message.sdpMid,
          sdpMLineIndex: message.sdpMLineIndex,
        });
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
      case 'PONG':
        this.lastPongReceived = Date.now();
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
    log('[OFFER-SEND]', conversationId, 'signalingClient.sendOffer executing WebSocket send', { sdpLength: sdp?.length });
    return this.send({ type: 'OFFER', sdp, conversationId });
  }

  sendAnswer(conversationId: string, sdp: string): boolean {
    log('[ANSWER]', conversationId, 'signalingClient.sendAnswer executing WebSocket send', { sdpLength: sdp?.length });
    return this.send({ type: 'ANSWER', sdp, conversationId });
  }

  sendIceCandidate(
    conversationId: string,
    candidate: unknown,
    sdpMid?: string,
    sdpMLineIndex?: number,
  ): boolean {
    const candidateType = typeof candidate === 'string' ? candidate.split(' ')[0] : 'unknown';
    log('[ICE-SEND]', conversationId, 'signalingClient.sendIceCandidate executing WebSocket send', {
      candidate: typeof candidate === 'string' ? candidate.slice(0, 80) : candidate,
      type: candidateType,
      sdpMid,
      sdpMLineIndex,
    });
    return this.send({ type: 'ICE_CANDIDATE', candidate, conversationId, sdpMid, sdpMLineIndex });
  }

  setHandlers(handlers: SignalingHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();

      // If no pong received within the timeout window, the connection is stale.
      if (now - this.lastPongReceived > this.HEARTBEAT_TIMEOUT) {
        log('[heartbeat]', null, 'no pong received, closing stale WebSocket', {
          instanceId: this.instanceId,
          lastPongReceived: this.lastPongReceived,
          now,
          timeoutMs: this.HEARTBEAT_TIMEOUT,
        });
        this.ws?.close(1000, 'heartbeat timeout');
        return;
      }

      this.ws?.send(JSON.stringify({ type: 'PING', timestamp: now }));
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  isHealthy(): boolean {
    return (
      this.isConnected() &&
      Date.now() - this.lastPongReceived <= this.HEARTBEAT_TIMEOUT
    );
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopHeartbeat();
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

  async reconnect(token?: string): Promise<void> {
    log('[WS]', null, 'reconnecting WebSocket', {
      instanceId: this.instanceId,
      attempt: this.reconnectAttempts + 1,
    });
    this.shouldReconnect = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
    await this.connect(token);
    const effectiveToken = token ?? (await supabase.auth.getSession()).data.session?.access_token;
    if (effectiveToken) {
      await this.authenticate(effectiveToken);
    }
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

export type {
  SignalingClient,
  SignalingHandlers,
  SignalingEvent,
  ConnectionState,
};
