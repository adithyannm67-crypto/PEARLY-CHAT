'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import Avatar from '@/components/Avatar';
import ChatModal from '@/components/ChatModal';
import { authFetch } from '@/lib/authFetch';
import type { ChatUser } from '@/types/chat';

interface NewChatModalProps {
  currentUserId: string;
  onClose: () => void;
}

export default function NewChatModal({
  currentUserId,
  onClose,
}: NewChatModalProps) {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      setError('');

      try {
        const query = new URLSearchParams({
          excludeUserId: currentUserId,
        });

        if (searchQuery.trim()) {
          query.set('search', searchQuery.trim());
        }

        const response = await authFetch(`/api/users?${query.toString()}`, {
          cache: 'no-store',
          method: 'GET',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load users');
        }

        if (!cancelled) {
          setUsers(data.data?.users ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load users');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(loadUsers, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentUserId, searchQuery]);

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
  });

  const handleSendRequest = async (user: ChatUser) => {
    setCreatingId(user.id);
    setError('');
    setSentTo(null);

    try {
      const response = await authFetch('/api/connection-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: user.id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send connection request');
      }

      setSentTo(user.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to send connection request'
      );
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <ChatModal title="New chat" onClose={onClose}>
      <div className="p-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search people..."
            className="w-full bg-surface border-none rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {error && <p className="text-error text-sm mt-3">{error}</p>}

        {sentTo && (
          <p className="text-online text-sm mt-3">
            Connection request sent. You can start chatting once they accept.
          </p>
        )}

        <div className="mt-3 max-h-80 overflow-y-auto -mx-2">
          {loading && (
            <p className="p-4 text-center text-sm text-text-secondary">
              Loading people...
            </p>
          )}

          {!loading &&
            filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                disabled={creatingId !== null || sentTo === user.id}
                onClick={() => handleSendRequest(user)}
                className="w-full text-left px-2 py-2.5 flex items-center gap-3 rounded-lg hover:bg-surface/60 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Avatar initials={user.avatar} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-text-primary truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    @{user.username || 'unknown'}
                  </p>
                </div>
                {creatingId === user.id && (
                  <span className="text-xs text-text-secondary">Sending...</span>
                )}
                {sentTo === user.id && (
                  <span className="text-xs text-online">Request sent</span>
                )}
              </button>
            ))}

          {!loading && !error && filteredUsers.length === 0 && (
            <p className="p-4 text-center text-sm text-text-secondary">
              No people found
            </p>
          )}
        </div>
      </div>
    </ChatModal>
  );
}
