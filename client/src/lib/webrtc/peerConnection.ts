import { getSignalingClient } from "./signalingClient";
import { log } from "./logger";
import { fetchIceServers } from "./iceServers";
import type { IceServer } from "./iceServers";

type RTCIceInitLocal = {
  candidate?: string | null;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

type PeerConnectionConfig = {
  iceServers?: IceServer[];
};

type PeerConnectionState =
  | "new"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "closed";

type PeerConnectionHandlers = {
  onStateChange?: (state: PeerConnectionState) => void;
  onDataChannel?: (channel: RTCDataChannel) => void;
  onError?: (error: string) => void;
};

class PeerConnectionManager {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private remoteDescriptionSet = false;
  private iceCandidateQueue: RTCIceInitLocal[] = [];

  // Perfect Negotiation state
  private polite = false;
  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemoteAnswerPending = false;

  private handlers: PeerConnectionHandlers = {};
  private state: PeerConnectionState = "new";
  private config: RTCConfiguration;
  private conversationId: string | null = null;
  private localUserId: string | null = null;
  private peerUserId: string | null = null;
  private dataChannelOwner = false;

  constructor(
    config: PeerConnectionConfig = {},
    handlers: PeerConnectionHandlers = {},
  ) {
    this.handlers = handlers;
    this.config = {
      iceServers: config.iceServers ?? [],
      iceTransportPolicy: "all",
    };
  }

  getState(): PeerConnectionState {
    return this.state;
  }

  getDataChannel(): RTCDataChannel | null {
    return this.dataChannel;
  }

  getPolite(): boolean {
    return this.polite;
  }

  getPeerUserId(): string | null {
    return this.peerUserId;
  }

  private setState(state: PeerConnectionState) {
    this.state = state;
    this.handlers.onStateChange?.(state);
  }

  private createPeerConnection(iceServers: IceServer[]): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: "all",
    });

    pc.onicegatheringstatechange = () => {
      log(
        "[ICE-GATHERING]",
        this.conversationId,
        `iceGatheringState=${pc.iceGatheringState} signalingState=${pc.signalingState} hasLocalDescription=${!!pc.localDescription}`,
      );
    };

    pc.onicecandidateerror = (event) => {
      console.error("[webrtc] ICE candidate error:", event);
    };

    pc.oniceconnectionstatechange = () => {
      log(
        "[ICE-GATHERING]",
        this.conversationId,
        `iceConnectionState=${pc.iceConnectionState}`,
      );
      switch (pc.iceConnectionState) {
        case "new":
          this.setState("new");
          break;
        case "checking":
        case "connected":
          this.setState("connected");
          break;
        case "completed":
          this.setState("connected");
          break;
        case "disconnected":
          this.setState("disconnected");
          break;
        case "failed":
          this.setState("failed");
          this.handlers.onError?.("ICE_CONNECTION_FAILED");
          break;
        case "closed":
          this.setState("closed");
          break;
        default:
          this.setState("connecting");
      }
    };

    pc.onsignalingstatechange = () => {
      switch (pc.signalingState) {
        case "stable":
          this.setState("connected");
          break;
        case "closed":
          this.setState("closed");
          break;
        default:
          this.setState("connecting");
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateType = event.candidate.candidate.split(" ")[0] ?? "unknown";
        log(
          "[ICE-GATHERING]",
          this.conversationId,
          "onicecandidate fired",
          {
            candidate: event.candidate.candidate.slice(0, 80),
            type: candidateType,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
        );
        const candidate: RTCIceInitLocal = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        };
        this.sendIceCandidate(candidate);
      } else {
        log(
          "[ICE-GATHERING]",
          this.conversationId,
          "onicecandidate fired null (ICE gathering complete)",
        );
      }
    };

    pc.ondatachannel = (event) => {
      log(
        "[DATA-CHANNEL]",
        this.conversationId,
        "ondatachannel received (remote peer created data channel)",
      );
      this.dataChannel = event.channel;
      this.handlers.onDataChannel?.(event.channel);
    };

    return pc;
  }

  /**
   * Initialize the peer connection for a conversation.
   * Call this once after both peers know each other's user IDs.
   */
  async init(
    localUserId: string,
    peerUserId: string,
    conversationId: string,
    iceServers?: IceServer[],
  ): Promise<void> {
    this.localUserId = localUserId;
    this.peerUserId = peerUserId;
    this.conversationId = conversationId;
    this.polite = localUserId > peerUserId;
    this.dataChannelOwner = this.polite;

    log(
      "[ROLE]",
      conversationId,
      `polite=${this.polite} localUserId=${localUserId} peerUserId=${peerUserId} dataChannelOwner=${this.dataChannelOwner}`,
    );

    if (!this.pc) {
      const resolvedIceServers = iceServers ?? (await fetchIceServers());
      this.pc = this.createPeerConnection(resolvedIceServers);

      // Set up onnegotiationneeded BEFORE creating data channel so the handler is registered
      // when createDataChannel triggers it.
      this.pc.onnegotiationneeded = async () => {
        log(
          "[NEGOTIATION-NEEDED]",
          this.conversationId,
          "onnegotiationneeded fired",
        );
        if (this.isSettingRemoteAnswerPending) {
          log(
            "[NEGOTIATION-NEEDED]",
            this.conversationId,
            "skipping negotiate (isSettingRemoteAnswerPending)",
          );
          return;
        }
        await this.negotiate();
      };

      if (this.dataChannelOwner) {
        log(
          "[DATA-CHANNEL]",
          this.conversationId,
          "creating data channel (polite peer owns data channel creation)",
        );
        this.dataChannel = this.pc.createDataChannel("chat", {
          negotiated: false,
          ordered: true,
        });
        this.handlers.onDataChannel?.(this.dataChannel);
      } else {
        log(
          "[DATA-CHANNEL]",
          this.conversationId,
          "waiting for remote data channel (impolite peer)",
        );
      }
    } else {
      log(
        "[INIT]",
        this.conversationId,
        "peer connection already exists, reusing",
      );
    }
  }

  private async sendOfferViaSignaling(sdp: string) {
    const client = getSignalingClient();
    if (client && client.isConnected()) {
      log("[OFFER-SEND]", this.conversationId, "calling client.sendOffer");
      client.sendOffer(this.conversationId!, sdp);
    } else {
      log(
        "[OFFER-SEND]",
        this.conversationId,
        "sendOffer skipped (signaling client not connected)",
      );
    }
  }

  private async sendAnswerViaSignaling(sdp: string) {
    const client = getSignalingClient();
    if (client && client.isConnected()) {
      log("[ANSWER]", this.conversationId, "calling client.sendAnswer");
      client.sendAnswer(this.conversationId!, sdp);
    } else {
      log(
        "[ANSWER]",
        this.conversationId,
        "sendAnswer skipped (signaling client not connected)",
      );
    }
  }

  /**
   * Perfect Negotiation entry point. Called by onnegotiationneeded or externally.
   */
  async negotiate(): Promise<void> {
    log("[NEGOTIATE]", this.conversationId, "negotiate called");

    if (this.makingOffer) {
      log("[NEGOTIATE]", this.conversationId, "already making offer, skipping");
      return;
    }

    if (!this.pc) {
      log("[NEGOTIATE]", this.conversationId, "no peer connection, skipping");
      return;
    }

    this.makingOffer = true;
    log(
      "[NEGOTIATE]",
      this.conversationId,
      "makingOffer=true, creating offer",
    );

    try {
      const offer = await this.pc.createOffer();
      log(
        "[OFFER-SEND]",
        this.conversationId,
        "createOffer completed",
        { type: offer.type, sdpLength: offer.sdp?.length },
      );
      await this.pc.setLocalDescription(offer);
      log(
        "[OFFER-SEND]",
        this.conversationId,
        "setLocalDescription completed",
        { localDescriptionSdp: !!this.pc.localDescription?.sdp },
      );

      const offerSdp = this.pc.localDescription?.sdp;
      if (!offerSdp) {
        throw new Error("Failed to create offer SDP");
      }

      await this.sendOfferViaSignaling(offerSdp);
    } catch (err) {
      log(
        "[NEGOTIATE]",
        this.conversationId,
        "negotiate failed",
        { error: err instanceof Error ? err.message : String(err) },
      );
    } finally {
      this.makingOffer = false;
      log(
        "[NEGOTIATE]",
        this.conversationId,
        "makingOffer=false",
      );
    }
  }

  /**
   * Handle an incoming OFFER from the remote peer.
   * Implements Perfect Negotiation collision handling.
   */
  async handleOffer(conversationId: string, sdp: string): Promise<void> {
    log(
      "[EDGE-OFFER]",
      conversationId,
      "handleOffer called",
      { sdpLength: sdp?.length },
    );

    if (!this.pc) {
      log("[EDGE-OFFER]", conversationId, "no peer connection, creating one");
      const offerIceServers = await fetchIceServers();
      this.pc = this.createPeerConnection(offerIceServers);
      this.pc.onnegotiationneeded = async () => {
        await this.negotiate();
      };
    }

    // Collision detection: if signaling state is not stable, both sides are offering simultaneously
    if (this.pc.signalingState !== "stable") {
      log(
        "[EDGE-OFFER]",
        conversationId,
        "collision detected (signalingState=" + this.pc.signalingState + ")",
      );
      this.ignoreOffer = true;

      if (!this.polite) {
        log(
          "[EDGE-OFFER]",
          conversationId,
          "impolite peer ignoring remote offer due to collision",
        );
        return;
      }

      log(
        "[EDGE-OFFER]",
        conversationId,
        "polite peer accepting remote offer despite collision",
      );
    }

    await this.pc.setRemoteDescription({ type: "offer", sdp });
    this.remoteDescriptionSet = true;
    log(
      "[EDGE-OFFER]",
      conversationId,
      "setRemoteDescription completed",
      { remoteDescriptionSet: this.remoteDescriptionSet },
    );

    // Flush queued ICE candidates now that remote description is set
    await this.flushIceCandidatesToPC();

    const answer = await this.pc.createAnswer();
    log(
      "[ANSWER]",
      conversationId,
      "createAnswer completed",
      { type: answer.type, sdpLength: answer.sdp?.length },
    );
    await this.pc.setLocalDescription(answer);
    log(
      "[ANSWER]",
      conversationId,
      "setLocalDescription(answer) completed",
      { localDescriptionSdp: !!this.pc.localDescription?.sdp },
    );

    const answerSdp = this.pc.localDescription?.sdp;
    if (!answerSdp) {
      throw new Error("Failed to create answer SDP");
    }

    await this.sendAnswerViaSignaling(answerSdp);
  }

  /**
   * Handle an incoming ANSWER from the remote peer.
   * Implements rollback for offer collisions.
   */
  async handleAnswer(conversationId: string, sdp: string): Promise<void> {
    log(
      "[ANSWER]",
      conversationId,
      "handleAnswer called",
      { sdpLength: sdp?.length },
    );

    if (this.isSettingRemoteAnswerPending) {
      log(
        "[ANSWER]",
        conversationId,
        "skipping (isSettingRemoteAnswerPending already true)",
      );
      return;
    }

    if (this.ignoreOffer) {
      log(
        "[ANSWER]",
        conversationId,
        "collision rollback: ignoreOffer=true, rolling back local offer",
      );
      this.ignoreOffer = false;

      if (this.pc) {
        await this.pc.setLocalDescription({ type: "rollback" });
        log(
          "[ANSWER]",
          conversationId,
          "rollback completed",
        );
      }

      this.makingOffer = false;

      // Re-negotiate after rollback
      log(
        "[ANSWER]",
        conversationId,
        "re-negotiating after rollback",
      );
      await this.negotiate();
    } else {
      this.isSettingRemoteAnswerPending = true;
      try {
        if (!this.pc) {
          throw new Error("No peer connection to set answer on");
        }
        await this.pc.setRemoteDescription({ type: "answer", sdp });
        this.remoteDescriptionSet = true;
        log(
          "[ANSWER]",
          conversationId,
          "setRemoteDescription(answer) completed",
          { remoteDescriptionSet: this.remoteDescriptionSet },
        );

        // Flush queued ICE candidates after setting remote answer
        await this.flushIceCandidatesToPC();
      } finally {
        this.isSettingRemoteAnswerPending = false;
        this.makingOffer = false;
      }
    }
  }

  /**
   * Add an ICE candidate received from the remote peer.
   * Queues if remote description is not yet set.
   */
  async addIceCandidate(
    conversationId: string,
    candidate: unknown,
    sdpMid?: string,
    sdpMLineIndex?: number,
  ): Promise<void> {
    const candidateType =
      typeof candidate === "string" ? candidate.split(" ")[0] : "unknown";
    log(
      "[ICE-ADD]",
      conversationId,
      "addIceCandidate called",
      {
        candidate:
          typeof candidate === "string" ? candidate.slice(0, 80) : candidate,
        type: candidateType,
        sdpMid,
        sdpMLineIndex,
      },
    );

    const iceCandidate: RTCIceInitLocal = {
      candidate: typeof candidate === "string" ? candidate : undefined,
      sdpMid,
      sdpMLineIndex,
    };

    if (!this.remoteDescriptionSet || !this.pc) {
      log(
        "[ICE-ADD]",
        conversationId,
        "addIceCandidate queued (remote description not set yet)",
        {
          candidate:
            typeof candidate === "string" ? candidate.slice(0, 80) : candidate,
          type: candidateType,
          sdpMid,
          sdpMLineIndex,
        },
      );
      this.iceCandidateQueue.push(iceCandidate);
      return;
    }

    try {
      await this.pc.addIceCandidate({
        candidate: iceCandidate.candidate ?? undefined,
        sdpMid: iceCandidate.sdpMid ?? undefined,
        sdpMLineIndex: iceCandidate.sdpMLineIndex ?? undefined,
      });
      log(
        "[ICE-ADD]",
        conversationId,
        "addIceCandidate succeeded",
        {
          candidate:
            typeof candidate === "string" ? candidate.slice(0, 80) : candidate,
          type: candidateType,
          sdpMid,
          sdpMLineIndex,
        },
      );
    } catch (err) {
      log(
        "[ICE-ADD]",
        conversationId,
        "addIceCandidate failed",
        {
          error: err instanceof Error ? err.message : String(err),
          candidate:
            typeof candidate === "string" ? candidate.slice(0, 80) : candidate,
        },
      );
    }
  }

  /**
   * Flush queued ICE candidates into the peer connection.
   * Called after remote description is installed.
   */
  private async flushIceCandidatesToPC(): Promise<void> {
    if (!this.pc) return;

    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      if (candidate) {
        try {
          await this.pc.addIceCandidate({
            candidate: candidate.candidate ?? undefined,
            sdpMid: candidate.sdpMid ?? undefined,
            sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
          });
          log(
            "[ICE-ADD]",
            this.conversationId,
            "flushed queued ICE candidate",
            {
              candidate:
                typeof candidate.candidate === "string"
                  ? candidate.candidate.slice(0, 80)
                  : candidate.candidate,
              type:
                typeof candidate.candidate === "string"
                  ? candidate.candidate.split(" ")[0]
                  : "unknown",
              sdpMid: candidate.sdpMid,
              sdpMLineIndex: candidate.sdpMLineIndex,
            },
          );
        } catch (err) {
          log(
            "[ICE-ADD]",
            this.conversationId,
            "flushed queued ICE candidate failed",
            {
              error: err instanceof Error ? err.message : String(err),
            },
          );
        }
      }
    }
  }

  private async sendIceCandidate(candidate: RTCIceInitLocal) {
    const client = getSignalingClient();
    if (!client || !this.conversationId || !client.isConnected()) {
      log("[ICE-SEND]", this.conversationId, "sendIceCandidate skipped (socket not ready)", {
        hasClient: !!client,
        hasConversationId: !!this.conversationId,
        wsConnected: client?.isConnected() ?? false,
      });
      this.iceCandidateQueue.push(candidate);
      return;
    }

    const candidateType = candidate.candidate?.split(" ")[0] ?? "unknown";
    log("[ICE-SEND]", this.conversationId, "sending ICE candidate", {
      candidate: candidate.candidate?.slice(0, 80),
      type: candidateType,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
    });

    client.sendIceCandidate(
      this.conversationId,
      candidate.candidate ?? undefined,
      candidate.sdpMid ?? undefined,
      candidate.sdpMLineIndex ?? undefined,
    );
  }

  async flushIceCandidates() {
    const client = getSignalingClient();
    if (!client || !this.conversationId || !client.isConnected()) return;

    log(
      "[ICE-SEND]",
      this.conversationId,
      `flushing ${this.iceCandidateQueue.length} queued ICE candidates`,
    );

    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      if (candidate) {
        const candidateType = candidate.candidate?.split(" ")[0] ?? "unknown";
        log("[ICE-SEND]", this.conversationId, "flushing queued ICE candidate", {
          candidate: candidate.candidate?.slice(0, 80),
          type: candidateType,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        });
        client.sendIceCandidate(
          this.conversationId,
          candidate.candidate ?? undefined,
          candidate.sdpMid ?? undefined,
          candidate.sdpMLineIndex ?? undefined,
        );
      }
    }
  }

  async close() {
    log("[CLOSE]", this.conversationId, "closing peer connection");

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
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.isSettingRemoteAnswerPending = false;
    this.polite = false;
    this.dataChannelOwner = false;
    this.localUserId = null;
    this.peerUserId = null;
    this.conversationId = null;

    this.setState("closed");
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
