
export const CONNECTION_REQUEST_STATUS = {
    PENDING: "PENDING",
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
}


export interface User {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export type ConnectionRequestStatus = "pending" | "accepted" | "rejected";

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: ConnectionRequestStatus;
  created_at: string;
}

export interface PublicUserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: {
          id: string;
          email?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          full_name?: string | null;
          created_at?: string;
        };
      };
      conversations: {
        Row: Conversation;
        Insert: {
          id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
        };
      };
      conversation_participants: {
        Row: ConversationParticipant;
        Insert: {
          conversation_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          conversation_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: Message;
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      connection_requests: {
        Row: ConnectionRequest;
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          status?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      public_user_profiles: {
        Row: PublicUserProfile;
      };
    };
    Functions: {
      is_conversation_participant: {
        Args: { p_conversation_id: string; p_user_id: string };
        Returns: boolean;
      };
      get_or_create_direct_conversation: {
        Args: { p_other_user_id: string };
        Returns: string;
      };
      resolve_email_by_username: {
        Args: { p_username: string };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    Composites: Record<string, never>;
  };
};

export type UserProfile = User;
