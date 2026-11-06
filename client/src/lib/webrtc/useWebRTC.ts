import { useCallback, useEffect, useRef, useState } from 'react';
import { useSupabase } from '@/context/AuthProvider';
import { getSignalingClient } from './signalingClient';
import {
  getPeerConnectionManager,
  type PeerConnectionState,
} from './peerConnection';
import {
  getDataChannelManager,
  type DataChannelMessage,
} from './dataChannel';

type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'waiting-for-peer'
  | 'negotiating'
  | 'connected'
  | 'failed'
  | 'reconnecting';

type UseWebRTCOptions = {
  conversationId: string | null;
  userId: string | null;
  iceConfig?: { iceServers?: { urls: string; username?: string; credential?: string }[] };
};

type UseWebRTCReturn = {
  connectionState: ConnectionStatus;
  isDataChannelOpen: boolean;
  messages: DataChannelMessage[];
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (content: string) => boolean;
  peerConnectionState: PeerConnectionState;
};

export function useWebRTC({
  conversationId,
  userId,
  iceConfig,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [connectionState, setConnectionState] = useState<ConnectionStatus>(
    'disconnected',
  );
  const [peerConnectionState, setPeerConnectionState] =
    useState<PeerConnectionState>('new');
  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false);
  const [messages, setMessages] = useState<DataChannelMessage[]>([]);

  const { session: authSession, supabase } = useSupabase();

  const signalingClientRef = useRef<ReturnType<typeof getSignalingClient>>(
    null,
  );
  const peerManagerRef = useRef<ReturnType<typeof getPeerConnectionManager>>(
    null,
  );
  const dataChannelRef = useRef<ReturnType<typeof getDataChannelManager>>(
    null,
  );
  const currentConversationId = useRef<string | null>(null);
  const localUserId = useRef<string | null>(userId);
  const isOffererRef = useRef(false);
  const peerJoinedRef = useRef(false);
  const peerUserIdRef = useRef<string | null>(null);
  const negotiationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const addMessage = useCallback((message: DataChannelMessage) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id);
      if (exists) return prev;
      return [...prev, message];
    });
  }, []);

  const clearNegotiationTimeout = useCallback(() => {
    if (negotiationTimeoutRef.current) {
      clearTimeout(negotiationTimeoutRef.current);
      negotiationTimeoutRef.current = null;
    }
  }, []);

  const retryNegotiation = useCallback(() => {
    if (
      !conversationId ||
      !userId ||
      !peerManagerRef.current ||
      isDataChannelOpen ||
      connectionState === 'connected'
    ) {
      return;
    }

    console.log('[WebRTC] Retrying negotiation...');

    if (
      localUserId.current &&
      peerJoinedRef.current &&
      peerManagerRef.current
    ) {
      isOffererRef.current = true;
      void peerManagerRef.current.createOffer(conversationId).catch((err) => {
        console.error('[WebRTC] Retry create offer error:', err);
      });
    }
  }, [
    conversationId,
    userId,
    isDataChannelOpen,
    connectionState,
    localUserId.current,
    peerJoinedRef,
  ]);

  useEffect(() => {
    const client = getSignalingClient();
    const manager = getPeerConnectionManager(iceConfig);
    const channelMgr = getDataChannelManager();

    signalingClientRef.current = client;
    peerManagerRef.current = manager;
    dataChannelRef.current = channelMgr;

    client.setHandlers({
      onAuthenticated: () => {
        if (currentConversationId.current) {
          client.joinRoom(currentConversationId.current);
        }
      },
      onRoomJoined: (_conversationId, participantCount) => {
        setConnectionState(
          participantCount >= 2 ? 'negotiating' : 'waiting-for-peer',
        );
        if (participantCount >= 2 && !peerJoinedRef.current) {
          peerJoinedRef.current = true;
        }
        // If we reconnected and have a peer, trigger negotiation
        if (
          participantCount >= 2 &&
          peerJoinedRef.current &&
          peerUserIdRef.current &&
          peerManagerRef.current
        ) {
          console.log('[WebRTC] Re-joined room with peer, triggering negotiation retry');
          if (
            localUserId.current &&
            peerUserIdRef.current &&
            localUserId.current < peerUserIdRef.current &&
            peerManagerRef.current
          ) {
            isOffererRef.current = true;
            void peerManagerRef.current.createOffer(_conversationId).catch((err) => {
              console.error('[WebRTC] Re-connect create offer error:', err);
            });
          }
        }
      },
      onPeerJoined: (_conversationId, peerUserId) => {
        console.log(
          `[WebRTC] Peer joined: ${peerUserId}, I am offerer: ${localUserId.current ? localUserId.current < peerUserId : 'unknown'}`,
        );
        peerJoinedRef.current = true;
        peerUserIdRef.current = peerUserId;
        setConnectionState('negotiating');
        clearNegotiationTimeout();

        // If we are the offerer (smaller userId), create offer immediately
        if (
          localUserId.current &&
          peerUserId &&
          localUserId.current < peerUserId &&
          peerManagerRef.current
        ) {
          isOffererRef.current = true;
          void peerManagerRef.current
            .createOffer(_conversationId)
            .catch((err) => {
              console.error('[WebRTC] Create offer error:', err);
            });
        } else {
          console.log(`[WebRTC] Waiting for offer from peer`);
        }

        // Fallback: if still negotiating after 8 seconds, retry
        negotiationTimeoutRef.current = setTimeout(() => {
          console.log('[WebRTC] Negotiation timeout, retrying...');
          retryNegotiation();
        }, 8000);
      },
      onPeerLeft: () => {
        peerJoinedRef.current = false;
        isOffererRef.current = false;
        setConnectionState('disconnected');
        peerManagerRef.current?.close();
        dataChannelRef.current?.close();
      },
      onOffer: async (_senderId, _conversationId, sdp) => {
        if (!peerManagerRef.current) return;
        await peerManagerRef.current.setOffer(_conversationId, sdp);
      },
      onAnswer: async (_senderId, _conversationId, sdp) => {
        if (!peerManagerRef.current) return;
        await peerManagerRef.current.setAnswer(_conversationId, sdp);
      },
      onIceCandidate: async (
        _senderId,
        _conversationId,
        candidate,
        sdpMid,
        sdpMLineIndex,
      ) => {
        if (!peerManagerRef.current) return;
        await peerManagerRef.current.addIceCandidate(
          _conversationId,
          candidate,
          sdpMid,
          sdpMLineIndex,
        );
      },
      onError: (code, message) => {
        console.error('[webrtc] signaling error:', code, message);
        setConnectionState('failed');
      },
      onConnect: async () => {
        setConnectionState('connecting');
        if (peerManagerRef.current) {
          await peerManagerRef.current.flushSignaledCandidates();
        }
        // Re-join room if we were in a conversation
        if (currentConversationId.current) {
          console.log('[WebRTC] Re-joining room after reconnect:', currentConversationId.current);
          client.joinRoom(currentConversationId.current);
        }
      },
      onDisconnect: () => {
        setConnectionState('disconnected');
      },
    });

    manager.setHandlers({
      onStateChange: (state) => {
        setPeerConnectionState(state);
        if (state === 'connected') {
          setConnectionState('connected');
        } else if (state === 'failed') {
          setConnectionState('failed');
        } else if (state === 'disconnected') {
          setConnectionState('disconnected');
        }
      },
      onDataChannel: (channel) => {
        dataChannelRef.current?.attach(channel);
      },
      onError: (error) => {
        console.error('[webrtc] peer connection error:', error);
        setConnectionState('failed');
      },
    });

    channelMgr.setHandlers({
      onOpen: () => {
        setIsDataChannelOpen(true);
        setConnectionState('connected');
      },
      onClose: () => {
        setIsDataChannelOpen(false);
        setConnectionState('disconnected');
      },
      onMessage: (message) => {
        if (message.senderId === localUserId.current) return;
        addMessage(message);
      },
      onError: (error) => {
        console.error('[webrtc] data channel error:', error);
        setConnectionState('failed');
      },
    });

    return () => {
      clearNegotiationTimeout();
      client.disconnect();
      manager.close();
      channelMgr.close();
      signalingClientRef.current = null;
      peerManagerRef.current = null;
      dataChannelRef.current = null;
    };
  }, [addMessage, clearNegotiationTimeout, retryNegotiation, iceConfig]);

  useEffect(() => {
    localUserId.current = userId;
  }, [userId]);

  const connect = useCallback(async () => {
    if (!conversationId || !userId) return;
    if (currentConversationId.current === conversationId) return;

    try {
      const client = signalingClientRef.current;
      if (!client) return;

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        setConnectionState('failed');
        return;
      }

      await client.connect(token);
      await client.authenticate(token);
      await client.waitForAuthenticated();
      client.joinRoom(conversationId);
    } catch (err) {
      console.error('[webrtc] connect error:', err);
      setConnectionState('failed');
    }
  }, [conversationId, userId]);

  const disconnect = useCallback(() => {
    const leavingConversationId = currentConversationId.current;
    currentConversationId.current = null;
    peerJoinedRef.current = false;
    isOffererRef.current = false;
    setMessages([]);
    setIsDataChannelOpen(false);
    setConnectionState('disconnected');
    setPeerConnectionState('new');

    if (leavingConversationId) {
      signalingClientRef.current?.leaveRoom(leavingConversationId);
    }
    peerManagerRef.current?.close();
    dataChannelRef.current?.close();
  }, []);

  const sendMessage = useCallback(
    (content: string): boolean => {
      if (!userId) return false;
      const sent = dataChannelRef.current?.send(content, userId);
      if (sent) {
        setMessages((prev) => {
          const optimistic: DataChannelMessage = {
            type: 'text',
            id: crypto.randomUUID(),
            content,
            timestamp: new Date().toISOString(),
            senderId: userId,
          };
          return [...prev, optimistic];
        });
      }
      return sent ?? false;
    },
    [userId],
  );

  return {
    connectionState,
    peerConnectionState,
    isDataChannelOpen,
    messages,
    connect,
    disconnect,
    sendMessage,
  };
}

export type {
  ConnectionStatus,
  UseWebRTCOptions,
  UseWebRTCReturn,
};
