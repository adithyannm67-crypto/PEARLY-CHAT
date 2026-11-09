import { log } from './logger';

type DataChannelMessage = {
  type: 'text';
  id: string;
  content: string;
  timestamp: string;
  senderId: string;
};

type DataChannelAck = {
  type: 'ack';
  id: string;
  ackId: string;
  timestamp: string;
  senderId: string;
};

type DataChannelPayload = DataChannelMessage | DataChannelAck;

type DataChannelHandlers = {
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: DataChannelMessage) => void;
  onAck?: (ackId: string) => void;
  onError?: (error: string) => void;
};

type DataChannelState = 'connecting' | 'open' | 'closed' | 'failed';

const ACK_TIMEOUT_MS = 10_000;

class DataChannelManager {
  private channel: RTCDataChannel | null = null;
  private handlers: DataChannelHandlers = {};
  private state: DataChannelState = 'closed';
  private isClosing = false;
  private seenMessageIds = new Set<string>();

  getState(): DataChannelState {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === 'open' && this.channel?.readyState === 'open';
  }

  attach(channel: RTCDataChannel) {
    this.seenMessageIds.clear();
    this.channel = channel;
    this.state = 'connecting';
    this.isClosing = false;

    channel.onopen = () => {
      this.state = 'open';
      this.handlers.onOpen?.();
    };

    channel.onclose = () => {
      this.isClosing = false;
      this.state = 'closed';
      this.channel = null;
      this.handlers.onClose?.();
    };

    channel.onerror = (err) => {
      if (this.isClosing || !this.channel) {
        return;
      }
      log('[dataChannel]', null, 'error', err);
      this.handlers.onError?.('DATA_CHANNEL_ERROR');
    };

    channel.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as DataChannelPayload;
        if (!this.isValidMessage(parsed)) {
          throw new Error('Invalid message payload');
        }

        if (parsed.type === 'ack') {
          this.handlers.onAck?.(parsed.ackId);
          return;
        }

        // Idempotent handling: if we've seen this message ID before (retry after lost ACK),
        // do not deliver it again, but send another ACK so the sender can mark delivered.
        if (this.seenMessageIds.has(parsed.id)) {
          this.sendAck(parsed.id, parsed.senderId);
          return;
        }
        this.seenMessageIds.add(parsed.id);

        this.handlers.onMessage?.(parsed);

        // Auto-acknowledge received text messages
        this.sendAck(parsed.id, parsed.senderId);
      } catch (err) {
        console.error('[dataChannel] invalid message:', err);
        this.handlers.onError?.('INVALID_MESSAGE');
      }
    };
  }

  private isValidMessage(message: unknown): message is DataChannelPayload {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return false;
    }
    const m = message as Record<string, unknown>;
    if (m.type === 'text') {
      return (
        typeof m.id === 'string' &&
        typeof m.content === 'string' &&
        typeof m.timestamp === 'string' &&
        typeof m.senderId === 'string'
      );
    }
    if (m.type === 'ack') {
      return (
        typeof m.id === 'string' &&
        typeof m.ackId === 'string' &&
        typeof m.timestamp === 'string' &&
        typeof m.senderId === 'string'
      );
    }
    return false;
  }

  send(content: string, senderId: string, messageId?: string): boolean {
    if (!this.isOpen() || !this.channel) {
      return false;
    }

    const id = messageId ?? crypto.randomUUID();
    const message: DataChannelMessage = {
      type: 'text',
      id,
      content,
      timestamp: new Date().toISOString(),
      senderId,
    };

    try {
      this.channel.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error('[dataChannel] send error:', err);
      return false;
    }
  }

  sendAck(ackId: string, senderId: string): boolean {
    if (!this.isOpen() || !this.channel) {
      return false;
    }

    const message: DataChannelAck = {
      type: 'ack',
      id: crypto.randomUUID(),
      ackId,
      timestamp: new Date().toISOString(),
      senderId,
    };

    try {
      this.channel.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error('[dataChannel] send ack error:', err);
      return false;
    }
  }

  close() {
    this.seenMessageIds.clear();
    this.isClosing = true;
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.state = 'closed';
  }

  setHandlers(handlers: DataChannelHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }
}

let instance: DataChannelManager | null = null;

export function getDataChannelManager(
  handlers?: DataChannelHandlers,
): DataChannelManager {
  if (!instance) {
    instance = new DataChannelManager();
  } else if (handlers) {
    instance.setHandlers(handlers);
  }
  return instance;
}

export type {
  DataChannelManager,
  DataChannelMessage,
  DataChannelHandlers,
  DataChannelState,
  DataChannelAck,
};
export { ACK_TIMEOUT_MS };
