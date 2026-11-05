import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import type { ChatUser, Conversation } from '@/types/chat';

export function useConversations(userId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadConversations = async () => {
    if (!userId) return;

    setLoading(true);
    setError('');

    try {
      const response = await authFetch('/api/conversations', {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load conversations');
      }

      setConversations(data.data?.conversations ?? data.conversations ?? []);
      setCurrentUser(data.data?.currentUser ?? data.currentUser ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load conversations'
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    const response = await authFetch(
      `/api/conversations?conversationId=${encodeURIComponent(conversationId)}`,
      { method: 'DELETE' }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete conversation');
    }

    setConversations((prev) =>
      prev.filter((conversation) => conversation.id !== conversationId)
    );
  };

  const handleConversationCreated = (conversation: Conversation) => {
    setConversations((prev) => [
      conversation,
      ...prev.filter((item) => item.id !== conversation.id),
    ]);
  };

  useEffect(() => {
    if (!userId) {
      void Promise.resolve().then(() => {
        setConversations([]);
        setCurrentUser(null);
        setLoading(false);
      });
      return;
    }

    void Promise.resolve().then(() => {
      void loadConversations();
    });
  }, [userId]);

  return {
    conversations,
    setConversations,
    currentUser,
    setCurrentUser,
    loading,
    error,
    loadConversations,
    deleteConversation,
    handleConversationCreated,
  };
}
