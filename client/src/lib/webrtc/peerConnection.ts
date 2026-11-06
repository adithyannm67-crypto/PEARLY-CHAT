import { getSignalingClient } from './signalingClient';

type IceServer = { urls: string; username?: string; credential?: string };

type RTCIceInitLocal = {
  candidate?: string | null;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

type PeerConnectionConfig = {
  iceServers?: IceServer[];
};

type PeerConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

type PeerConnectionHandlers = {
  onStateChange?: (state: PeerConnectionState) => void;
  onDataChannel?: (channel: RTCDataChannel) => void;
  onError?: (error: string) => void;
};

const DEFAULT_ICE_SERVERS: IceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

class PeerConnectionManager {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private remoteDescriptionSet = false;
  private iceCandidateQueue: RTCIceInitLocal[] = [];
  private isOfferer = false;
  private handlers: PeerConnectionHandlers = {};
  private state: PeerConnectionState = 'new';
  private config: RTCConfiguration;
  private conversationId: string | null = null;
  private negotiating = false;

  constructor(config: PeerConnectionConfig = {}, handlers: PeerConnectionHandlers = {}) {
    this.handlers = handlers;
    this.config = {
      iceServers: config.iceServers ?? DEFAULT_ICE_SERVERS,
      iceTransportPolicy: 'all',
    };
  }

  getState(): PeerConnectionState {
    return this.state;
  }

  getDataChannel(): RTCDataChannel | null {
    return this.dataChannel;
  }

  private setState(state: PeerConnectionState) {
    this.state = state;
    this.handlers.onStateChange?.(state);
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.config);

    pc.oniceconnectionstatechange = () => {
      switch (pc.iceConnectionState) {
        case 'new':
          this.setState('new');
          break;
        case 'checking':
        case 'connected':
          this.setState('connected');
          break;
        case 'completed':
          this.setState('connected');
          break;
        case 'disconnected':
          this.setState('disconnected');
          break;
        case 'failed':
          this.setState('failed');
          this.handlers.onError?.('ICE_CONNECTION_FAILED');
          break;
        case 'closed':
          this.setState('closed');
          break;
        default:
          this.setState('connecting');
      }
    };

    pc.onsignalingstatechange = () => {
      switch (pc.signalingState) {
        case 'stable':
          this.setState('connected');
          break;
        case 'closed':
          this.setState('closed');
          break;
        default:
          this.setState('connecting');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate: RTCIceInitLocal = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        };
        this.sendIceCandidate(candidate);
      }
    };

    pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.handlers.onDataChannel?.(event.channel);
    };

    return pc;
  }

  private async sendIceCandidate(candidate: RTCIceInitLocal) {
    const client = getSignalingClient();
    if (!client || !this.conversationId || !client.isConnected()) return;

    client.sendIceCandidate(
      this.conversationId,
      candidate.candidate ?? undefined,
      candidate.sdpMid ?? undefined,
      candidate.sdpMLineIndex ?? undefined,
    );
  }

  async createOffer(conversationId: string): Promise<string> {
    if (this.negotiating) {
      throw new Error('Already negotiating');
    }

    this.negotiating = true;
    this.conversationId = conversationId;
    this.isOfferer = true;

    // Close any existing peer connection before creating a new one
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    const pc = this.createPeerConnection();
    this.pc = pc;

    this.dataChannel = pc.createDataChannel('chat', {
      negotiated: false,
      ordered: true,
    });
    this.handlers.onDataChannel?.(this.dataChannel);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const offerSdp = pc.localDescription?.sdp;
      if (!offerSdp) {
        throw new Error('Failed to create offer SDP');
      }

      const client = getSignalingClient();
      if (client && client.isConnected()) {
        client.sendOffer(conversationId, offerSdp);
      }

      this.setState('connecting');
      return offerSdp;
    } finally {
      this.negotiating = false;
    }
  }

  async setOffer(conversationId: string, sdp: string): Promise<void> {
    if (this.negotiating) {
      throw new Error('Already negotiating');
    }

    this.negotiating = true;
    this.conversationId = conversationId;
    this.isOfferer = false;

    const pc = this.createPeerConnection();
    this.pc = pc;

    try {
      await pc.setRemoteDescription({ type: 'offer', sdp });
      this.remoteDescriptionSet = true;

      // Flush queued ICE candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        if (candidate) {
          await pc.addIceCandidate({
            candidate: candidate.candidate ?? undefined,
            sdpMid: candidate.sdpMid ?? undefined,
            sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
          });
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const answerSdp = pc.localDescription?.sdp;
      if (!answerSdp) {
        throw new Error('Failed to create answer SDP');
      }

      const client = getSignalingClient();
      if (client && client.isConnected()) {
        client.sendAnswer(conversationId, answerSdp);
      }

      this.setState('connecting');
    } finally {
      this.negotiating = false;
    }
  }

  async setAnswer(conversationId: string, sdp: string): Promise<void> {
    if (this.negotiating) {
      throw new Error('Already negotiating');
    }

    if (!this.pc) {
      throw new Error('No peer connection to set answer on');
    }

    this.negotiating = true;
    this.conversationId = conversationId;

    const pc = this.pc;

    try {
      await pc.setRemoteDescription({ type: 'answer', sdp });
      this.remoteDescriptionSet = true;

      // Flush queued ICE candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        if (candidate) {
          await pc.addIceCandidate({
            candidate: candidate.candidate ?? undefined,
            sdpMid: candidate.sdpMid ?? undefined,
            sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
          });
        }
      }

      this.setState('connecting');
    } finally {
      this.negotiating = false;
    }
  }

  async addIceCandidate(
    conversationId: string,
    candidate: unknown,
    sdpMid?: string,
    sdpMLineIndex?: number,
  ): Promise<void> {
    const iceCandidate: RTCIceInitLocal = {
      candidate: typeof candidate === 'string' ? candidate : undefined,
      sdpMid,
      sdpMLineIndex,
    };

    if (!this.remoteDescriptionSet || !this.pc) {
      this.iceCandidateQueue.push(iceCandidate);
      return;
    }

    await this.pc.addIceCandidate({
      candidate: iceCandidate.candidate ?? undefined,
      sdpMid: iceCandidate.sdpMid ?? undefined,
      sdpMLineIndex: iceCandidate.sdpMLineIndex ?? undefined,
    });
  }

  async close() {
    this.negotiating = false;

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.iceCandidateQueue = [];
    this.remoteDescriptionSet = false;
    this.isOfferer = false;
    this.setState('closed');
  }

  setHandlers(handlers: PeerConnectionHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }
}

let instance: PeerConnectionManager | null = null;

export function getPeerConnectionManager(
  config?: PeerConnectionConfig,
  handlers?: PeerConnectionHandlers,
): PeerConnectionManager {
  if (!instance) {
    instance = new PeerConnectionManager(config, handlers);
  } else if (handlers) {
    instance.setHandlers(handlers);
  }
  return instance;
}

export function closePeerConnectionManager() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

export type {
  PeerConnectionManager,
  PeerConnectionConfig,
  PeerConnectionState,
  PeerConnectionHandlers,
  IceServer,
};
