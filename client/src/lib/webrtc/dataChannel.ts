type DataChannelMessage = {
  type: 'text';
  id: string;
  content: string;
  timestamp: string;
  senderId: string;
};

type DataChannelHandlers = {
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: DataChannelMessage) => void;
  onError?: (error: string) => void;
};

type DataChannelState = 'connecting' | 'open' | 'closed' | 'failed';

class DataChannelManager {
  private channel: RTCDataChannel | null = null;
  private handlers: DataChannelHandlers = {};
  private state: DataChannelState = 'closed';
  private isClosing = false;

  getState(): DataChannelState {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === 'open' && this.channel?.readyState === 'open';
  }

  attach(channel: RTCDataChannel) {
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
      console.error('[dataChannel] error:', err);
      this.state = 'failed';
      this.handlers.onError?.('DATA_CHANNEL_ERROR');
    };

    channel.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as DataChannelMessage;
        if (!this.isValidMessage(parsed)) {
          throw new Error('Invalid message payload');
        }
        this.handlers.onMessage?.(parsed);
      } catch (err) {
        console.error('[dataChannel] invalid message:', err);
        this.handlers.onError?.('INVALID_MESSAGE');
      }
    };
  }

  private isValidMessage(message: unknown): message is DataChannelMessage {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return false;
    }
    const m = message as Record<string, unknown>;
    return (
      m.type === 'text' &&
      typeof m.id === 'string' &&
      typeof m.content === 'string' &&
      typeof m.timestamp === 'string' &&
      typeof m.senderId === 'string'
    );
  }

  send(content: string, senderId: string): boolean {
    if (!this.isOpen() || !this.channel) {
      return false;
    }

    const message: DataChannelMessage = {
      type: 'text',
      id: crypto.randomUUID(),
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

  close() {
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

export function closeDataChannelManager() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

export type {
  DataChannelManager,
  DataChannelMessage,
  DataChannelHandlers,
  DataChannelState,
};
