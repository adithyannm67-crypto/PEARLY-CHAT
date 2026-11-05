import { SquarePen, Settings, LogOut, Bell } from 'lucide-react';
import Avatar from '@/components/Avatar';

import type { ChatUser, ConnectionRequest } from '@/types/chat';

interface SidebarHeaderProps {
    currentUser: ChatUser | null;
    setRequestsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    connectionRequests: ConnectionRequest[];
    sentConnectionRequests: ConnectionRequest[];
    handleLogout: () => void;
    setActiveModal: (modal: 'new-chat' | 'settings' | null) => void;
}
const SidebarHeader = ({ currentUser, setRequestsOpen, connectionRequests, sentConnectionRequests, handleLogout, setActiveModal }: SidebarHeaderProps) => {
    return (<header className="h-16 bg-bg-secondary border-b border-border-custom px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
            <Avatar
                initials={currentUser?.avatar ?? '?'}
                size="sm"
                showOnline
            />
            <span className="font-semibold text-lg text-text-primary">Chats</span>
        </div>

        <div className="flex items-center gap-1 relative">
            <button
                type="button"
                aria-label="Connection requests"
                title="Connection requests"
                onClick={() => setRequestsOpen((value) => !value)}
                className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer relative"
            >
                <Bell size={18} />
                {(connectionRequests.length + sentConnectionRequests.length) > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-medium px-1">
                        {connectionRequests.length + sentConnectionRequests.length}
                    </span>
                )}
            </button>
            <button
                type="button"
                aria-label="New chat"
                title="New chat"
                onClick={() => setActiveModal('new-chat')}
                disabled={!currentUser}
                className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <SquarePen size={18} />
            </button>
            <button
                type="button"
                aria-label="Settings"
                title="Settings"
                onClick={() => setActiveModal('settings')}
                disabled={!currentUser}
                className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Settings size={18} />
            </button>
            <button
                type="button"
                aria-label="Log out"
                title="Log out"
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
                <LogOut size={18} />
            </button>
        </div>
    </header>)
}

export default SidebarHeader;