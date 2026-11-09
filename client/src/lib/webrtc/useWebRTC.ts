import { useCallback, useEffect, useRef, useState } from 'react';
import { useSupabase } from '@/context/AuthProvider';
import { authFetch } from '@/lib/authFetch';
import { useNotifications } from '@/context/NotificationContext';
import { getSignalingClient } from './signalingClient';
import {
  getPeerConnectionManager,
  type PeerConnectionState,
} from './peerConnection';
import {
  getDataChannelManager,
  type DataChannelMessage,
  ACK_TIMEOUT_MS,
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
  reconnect: () => Promise<void>;
  iceRestartFailed: boolean;
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
  const [iceRestartFailed, setIceRestartFailed] = useState(false);
  const iceRestartInProgressRef = useRef(false);

  const { session: authSession, supabase } = useSupabase();
  const { addNotification } = useNotifications();

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

  // Track messages waiting for delivery acknowledgement
  type PendingAck = {
    resolve: (value: boolean) => void;
    reject: (reason?: unknown) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  };
  const pendingAcksRef = useRef<Map<string, PendingAck>>(new Map());

  const addMessage = useCallback((message: DataChannelMessage) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id);
      if (exists) return prev;
      return [...prev, message];
    });
  }, []);

  const clearPendingAck = useCallback(
    (messageId: string) => {
      const pending = pendingAcksRef.current.get(messageId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingAcksRef.current.delete(messageId);
      }
    },
    [],
  );

  const reconnect = useCallback(async () => {
    const client = signalingClientRef.current;
    if (!client) return;
    await client.reconnect();
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
      onReconnecting: (attempt, maxAttempts) => {
        log('[WS]', null, 'reconnecting', { attempt, maxAttempts });
        setConnectionState('reconnecting');
        addNotification({
          type: 'warning',
          title: 'Reconnecting...',
          message: `Attempt ${attempt} of ${maxAttempts}. Please wait.`,
          persistent: attempt >= maxAttempts,
        });
      },
      onReconnectFailed: () => {
        log('[WS]', null, 'reconnection failed');
        setConnectionState('failed');
        addNotification({
          type: 'error',
          title: 'Reconnection failed.',
          message: 'Unable to reconnect. Please try again.',
          persistent: true,
          retry: () => {
            void reconnect();
          },
        });
      },
      onReconnected: () => {
        log('[WS]', null, 'reconnected');
        setConnectionState('connected');
        addNotification({
          type: 'success',
          title: 'Connection restored.',
          message: 'You are back online.',
          persistent: false,
          duration: 3000,
        });
      },
    });

    manager.setHandlers({
      onStateChange: (state) => {
        setPeerConnectionState(state);
        if (state === 'connected') {
          setConnectionState('connected');
          setIceRestartFailed(false);
          iceRestartInProgressRef.current = false;
        } else if (state === 'failed') {
          setConnectionState('failed');
          if (iceRestartInProgressRef.current) {
            setIceRestartFailed(true);
          }
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
        if (iceRestartInProgressRef.current) {
          setIceRestartFailed(true);
          addNotification({
            type: 'error',
            title: 'Unable to restore the connection.',
            message: 'ICE restart failed. Please try connecting again.',
            persistent: true,
            retry: () => {
              void reconnect();
            },
          });
        }
      },
      onIceRestartStart: () => {
        iceRestartInProgressRef.current = true;
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
      onAck: (ackId) => {
        const pending = pendingAcksRef.current.get(ackId);
        if (pending) {
          clearTimeout(pending.timeoutId);
          pendingAcksRef.current.delete(ackId);
          pending.resolve(true);
        }
      },
      onError: (error) => {
        if (dataChannelRef.current?.getState() === 'closed') return;
        log('[webrtc]', null, 'data channel error', error);
      },
    });

    return () => {
      manager.close();
      channelMgr.close();
      peerManagerRef.current = null;
      dataChannelRef.current = null;
    };
  }, [addMessage, clearPendingAck]);

  useEffect(() => {
    localUserId.current = userId;
  }, [userId]);

  const connect = useCallback(async () => {
    if (!conversationId || !userId) return;
    if (currentConversationId.current === conversationId) return;

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

      const iceServers = await fetchIceServers();
      iceServersRef.current = iceServers;

      client.joinRoom(conversationId);

      await peerManagerRef.current?.flushIceCandidates();
    } catch (err) {
      console.error('[webrtc] connect error:', err);
      setConnectionState('failed');
    }
  }, [conversationId, userId, supabase.auth]);

  const disconnect = useCallback(() => {
    const convId = currentConversationId.current;

    currentConversationId.current = null;
    peerJoinedRef.current = false;
    peerUserIdRef.current = null;
    setMessages([]);
    setIsDataChannelOpen(false);
    setConnectionState('disconnected');
    setPeerConnectionState('new');

    // Reject all pending ACKs on disconnect
    pendingAcksRef.current.forEach((pending, messageId) => {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('Disconnected'));
    });
    pendingAcksRef.current.clear();

    if (convId) {
      signalingClientRef.current?.leaveRoom(convId);
    }
    peerManagerRef.current?.close();
    dataChannelRef.current?.close();
  }, []);

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!userId || !currentConversationId.current) return false;

      const messageId = crypto.randomUUID();
      const sent = dataChannelRef.current?.send(content, userId, messageId);
      if (!sent) {
        // Could not deliver via data channel - surface failure to UI
        return false;
      }

      // Wait for delivery acknowledgement from peer with timeout
      const ackReceived = await new Promise<boolean>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          pendingAcksRef.current.delete(messageId);
          reject(new Error('ACK timeout'));
        }, ACK_TIMEOUT_MS);

        pendingAcksRef.current.set(messageId, { resolve, reject, timeoutId });
      });

      // Persist to backend for history across refreshes (best-effort)
      // This does not block message sending - delivery and persistence are separate concerns
      try {
        await authFetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: currentConversationId.current,
            content,
          }),
        });
      } catch (persistError) {
        // Surface persistence failure but do not block delivery
        log('[webrtc]', null, 'message persistence failure', { error: persistError });
        // Could add notification here if desired
      }

      // Return whether delivery ACK was received, not persistence status
      return ackReceived;
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
    reconnect,
    sendMessage,
    iceRestartFailed,
  };
}

export type {
  ConnectionStatus,
  UseWebRTCOptions,
  UseWebRTCReturn,
};
