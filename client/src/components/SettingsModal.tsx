'use client';

import { useState } from 'react';
import Avatar from '@/components/Avatar';
import ChatModal from '@/components/ChatModal';
import type { ChatUser } from '@/types/chat';

interface SettingsModalProps {
  currentUser: ChatUser;
  onClose: () => void;
  onUserUpdated: (user: ChatUser) => void;
}

export default function SettingsModal({
  currentUser,
  onClose,
  onUserUpdated,
}: SettingsModalProps) {
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setError('');
    setSaved('');

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          name: name.trim(),
          username: username.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      onUserUpdated(data.data.user);
      setSaved('User updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ChatModal title="Settings" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar initials={currentUser.avatar} size="lg" />
          <div className="min-w-0">
            <p className="font-medium text-text-primary truncate">
              {currentUser.name}
            </p>
            <p className="text-sm text-text-secondary truncate">
              {currentUser.email}
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="settings-name"
            className="block text-xs font-medium text-text-secondary mb-1"
          >
            Display name
          </label>
          <input
            id="settings-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full bg-surface border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label
            htmlFor="settings-username"
            className="block text-xs font-medium text-text-secondary mb-1"
          >
            Username
          </label>
          <input
            id="settings-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full bg-surface border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {error && <p className="text-error text-sm">{error}</p>}
        {saved && <p className="text-online text-sm">{saved}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim() || !username.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </ChatModal>
  );
}
