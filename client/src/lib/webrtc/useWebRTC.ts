import { useCallback, useEffect, useRef, useState } from 'react';
import { useSupabase } from '@/context/AuthProvider';
import { authFetch } from '@/lib/authFetch';
import { getSignalingClient } from './signalingClient';
import {
  getPeerConnectionManager,
  type PeerConnectionState,
} from './peerConnection';
import {
  getDataChannelManager,
  type DataChannelMessage,
} from './dataChannel';
import { fetchIceServers } from './iceServers';
import type { IceServer } from './iceServers';
import { log } from './logger';

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
  sendMessage: (content: string) => Promise<boolean>;
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
  const peerUserIdRef = useRef<string | null>(null);
  const peerJoinedRef = useRef(false);
  const iceServersRef = useRef<IceServer[]>([]);

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
      onAuthenticated: (userId) => {
        log('[WS]', null, 'authenticated', { userId });
        // Room joining is handled explicitly in connect(), not here.
        // This prevents duplicate JOIN_ROOM messages.
      },
      onRoomJoined: (_conversationId, participantCount, participantIds) => {
        log(
          '[WS]',
          _conversationId,
          'room joined',
          {
            conversationId: _conversationId,
            participantCount,
            participantIds,
            localUserId: localUserId.current,
          },
        );

        // Determine the other participant (the peer we negotiate with)
        const otherUserId = participantIds.find(
          (id) => id !== localUserId.current,
        );

        if (otherUserId) {
          peerUserIdRef.current = otherUserId;
          void manager.init(
            localUserId.current!,
            otherUserId,
            _conversationId,
            iceServersRef.current,
          );
        } else {
          log(
            '[WS]',
            _conversationId,
            'room joined but no other participant found',
            { conversationId: _conversationId, participantIds },
          );
        }

        setConnectionState(
          participantCount >= 2 ? 'negotiating' : 'waiting-for-peer',
        );
      },
      onPeerJoined: (_conversationId, peerUserId) => {
        log(
          '[WS]',
          _conversationId,
          'peer joined',
          {
            conversationId: _conversationId,
            peerUserId,
            localUserId: localUserId.current,
          },
        );

        peerJoinedRef.current = true;
        peerUserIdRef.current = peerUserId;

        if (localUserId.current && peerUserId) {
          void manager.init(
            localUserId.current,
            peerUserId,
            _conversationId,
            iceServersRef.current,
          );
        }

        setConnectionState('negotiating');

        // Do NOT create the offer manually here.
        // Negotiation is driven by onnegotiationneeded in the peer connection manager.
        // Both peers independently decide polite/impolite roles via manager.init().
      },
      onPeerLeft: () => {
        log('[WS]', null, 'peer left');

        peerJoinedRef.current = false;
        setConnectionState('disconnected');
        manager?.close();
        channelMgr?.close();
      },
      onOffer: async (_senderId, _conversationId, sdp) => {
        log(
          '[WS]',
          _conversationId,
          'offer received',
          { conversationId: _conversationId, senderId: _senderId, sdpLength: sdp?.length },
        );
        if (!manager) return;
        await manager.handleOffer(_conversationId, sdp);
      },
      onAnswer: async (_senderId, _conversationId, sdp) => {
        log(
          '[WS]',
          _conversationId,
          'answer received',
          { conversationId: _conversationId, senderId: _senderId, sdpLength: sdp?.length },
        );
        if (!manager) return;
        await manager.handleAnswer(_conversationId, sdp);
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
        log('[webrtc]', null, 'signaling error', { code, message });
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
        log('[webrtc]', null, 'peer connection error', error);
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
        // Skip benign errors during intentional shutdown
        if (dataChannelRef.current?.getState() === 'closed') return;
        // Log but don't tear down the connection — data channel errors
        // can be transient or occur during intentional disconnect.
        log('[webrtc]', null, 'data channel error', error);
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
    peerUserIdRef.current = null;
    setMessages([]);
    setIsDataChannelOpen(false);
    setConnectionState('connecting');

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

      // Fetch ICE server configuration from backend (includes temporary TURN credentials)
      const iceServers = await fetchIceServers();
      iceServersRef.current = iceServers;

      // Join the room exactly once after authentication succeeds.
      client.joinRoom(conversationId);

      await peerManagerRef.current?.flushIceCandidates();
    } catch (err) {
      console.error('[webrtc] connect error:', err);
      setConnectionState('failed');
    }
  }, [conversationId, userId]);

  const disconnect = useCallback(() => {
    // FIX: Save conversation ID BEFORE nulling it, so leaveRoom uses the correct ID.
    const convId = currentConversationId.current;

    currentConversationId.current = null;
    peerJoinedRef.current = false;
    peerUserIdRef.current = null;
    setMessages([]);
    setIsDataChannelOpen(false);
    setConnectionState('disconnected');
    setPeerConnectionState('new');

    if (convId) {
      signalingClientRef.current?.leaveRoom(convId);
    }
    peerManagerRef.current?.close();
    dataChannelRef.current?.close();
  }, []);

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!userId || !currentConversationId.current) return false;
      const sent = dataChannelRef.current?.send(content, userId);
      if (sent) {
        const optimistic: DataChannelMessage = {
          type: 'text',
          id: crypto.randomUUID(),
          content,
          timestamp: new Date().toISOString(),
          senderId: userId,
        };
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === optimistic.id);
          if (exists) return prev;
          return [...prev, optimistic];
        });

        // Persist to backend for history across refreshes
        try {
          await authFetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: currentConversationId.current,
              content,
            }),
          });
        } catch {
          // Persistence is best-effort; message still sent via data channel.
        }

        return true;
      }
      return false;
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
