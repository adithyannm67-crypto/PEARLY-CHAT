import { useCallback, useEffect, useRef, useState } from 'react';
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
}: UseWebRTCOptions): UseWebRTCReturn {
  const [connectionState, setConnectionState] = useState<ConnectionStatus>(
    'disconnected',
  );
  const [peerConnectionState, setPeerConnectionState] =
    useState<PeerConnectionState>('new');
  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false);
  const [messages, setMessages] = useState<DataChannelMessage[]>([]);

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

  const addMessage = useCallback((message: DataChannelMessage) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id);
      if (exists) return prev;
      return [...prev, message];
    });
  }, []);

  useEffect(() => {
    const client = getSignalingClient();
    const manager = getPeerConnectionManager();
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
      },
      onPeerJoined: (_conversationId, peerUserId) => {
        peerJoinedRef.current = true;
        setConnectionState('negotiating');
        if (
          localUserId.current &&
          peerUserId &&
          localUserId.current < peerUserId &&
          manager
        ) {
          isOffererRef.current = true;
          void manager.createOffer(_conversationId);
        }
      },
      onPeerLeft: () => {
        peerJoinedRef.current = false;
        isOffererRef.current = false;
        setConnectionState('disconnected');
        manager?.close();
        channelMgr?.close();
      },
      onOffer: async (_senderId, _conversationId, sdp) => {
        if (!manager) return;
        await manager.setOffer(_conversationId, sdp);
      },
      onAnswer: async (_senderId, _conversationId, sdp) => {
        if (!manager) return;
        await manager.setAnswer(_conversationId, sdp);
      },
      onIceCandidate: async (
        _senderId,
        _conversationId,
        candidate,
        sdpMid,
        sdpMLineIndex,
      ) => {
        if (!manager) return;
        await manager.addIceCandidate(
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
      onConnect: () => {
        setConnectionState('connecting');
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
        channelMgr?.attach(channel);
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
      client.disconnect();
      manager.close();
      channelMgr.close();
      signalingClientRef.current = null;
      peerManagerRef.current = null;
      dataChannelRef.current = null;
    };
  }, [addMessage]);

  useEffect(() => {
    localUserId.current = userId;
  }, [userId]);

  const connect = useCallback(async () => {
    if (!conversationId || !userId) return;
    if (currentConversationId.current === conversationId) return;

    // Reset for new conversation
    currentConversationId.current = conversationId;
    peerJoinedRef.current = false;
    isOffererRef.current = false;
    setMessages([]);
    setIsDataChannelOpen(false);
    setConnectionState('connecting');

    try {
      const client = signalingClientRef.current;
      if (!client) return;

      await client.connect();
      await client.authenticate();
      client.joinRoom(conversationId);
    } catch (err) {
      console.error('[webrtc] connect error:', err);
      setConnectionState('failed');
    }
  }, [conversationId, userId]);

  const disconnect = useCallback(() => {
    currentConversationId.current = null;
    peerJoinedRef.current = false;
    isOffererRef.current = false;
    setMessages([]);
    setIsDataChannelOpen(false);
    setConnectionState('disconnected');
    setPeerConnectionState('new');

    signalingClientRef.current?.leaveRoom(currentConversationId.current ?? '');
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
