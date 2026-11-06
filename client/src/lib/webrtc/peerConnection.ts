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
          this.setState(this.isOfferer ? 'connected' : 'connected');
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
    this.conversationId = conversationId;
    this.isOfferer = true;
    this.pc = this.createPeerConnection();

    this.dataChannel = this.pc.createDataChannel('chat', {
      negotiated: false,
      ordered: true,
    });
    this.handlers.onDataChannel?.(this.dataChannel);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    const offerSdp = this.pc.localDescription?.sdp;
    if (!offerSdp) {
      throw new Error('Failed to create offer SDP');
    }

    const client = getSignalingClient();
    if (client && client.isConnected()) {
      client.sendOffer(conversationId, offerSdp);
    }

    this.setState('connecting');
    return offerSdp;
  }

  async setOffer(conversationId: string, sdp: string): Promise<void> {
    this.conversationId = conversationId;
    this.isOfferer = false;
    this.pc = this.createPeerConnection();

    await this.pc.setRemoteDescription({ type: 'offer', sdp });
    this.remoteDescriptionSet = true;

    // Flush queued ICE candidates
    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      if (candidate) {
        await this.pc.addIceCandidate({
          candidate: candidate.candidate ?? undefined,
          sdpMid: candidate.sdpMid ?? undefined,
          sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
        });
      }
    }

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    const answerSdp = this.pc.localDescription?.sdp;
    if (!answerSdp) {
      throw new Error('Failed to create answer SDP');
    }

    const client = getSignalingClient();
    if (client && client.isConnected()) {
      client.sendAnswer(conversationId, answerSdp);
    }

    this.setState('connecting');
  }

  async setAnswer(conversationId: string, sdp: string): Promise<void> {
    if (!this.pc) {
      throw new Error('No peer connection to set answer on');
    }

    await this.pc.setRemoteDescription({ type: 'answer', sdp });
    this.remoteDescriptionSet = true;

    // Flush queued ICE candidates
    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      if (candidate) {
        await this.pc.addIceCandidate({
          candidate: candidate.candidate ?? undefined,
          sdpMid: candidate.sdpMid ?? undefined,
          sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
        });
      }
    }

    this.setState('connecting');
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
