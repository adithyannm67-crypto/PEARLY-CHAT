export interface ChatUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  status: "online" | "offline" | "away";
  lastSeen: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  otherUser: ChatUser | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
}

export type ConnectionRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export interface ConnectionRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: ConnectionRequestStatus;
  createdAt: string;
  user: ChatUser;
}
