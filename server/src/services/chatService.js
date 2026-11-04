import { randomUUID } from "node:crypto";
import supabase from "../config/supabase.js";

const USER_COLUMNS = "id, email, username, avatar_url, full_name, created_at";
const MESSAGE_COLUMNS = "id, conversation_id, sender_id, content, created_at";

function getInitials(name, username) {
  const source = (name || username || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function mapUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.full_name || row.username || row.email || "Unknown user",
    username: row.username || "",
    email: row.email || "",
    avatar: getInitials(row.full_name, row.username),
    status: "offline",
    lastSeen: "",
  };
}

function mapMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    timestamp: row.created_at,
    status: "sent",
  };
}

export async function getUser(userId) {
  const { data, error } = await supabase
    .from("users")
    .select(USER_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return mapUser(data);
}

export async function getConversations(userId) {
  const { data: memberships, error: membershipError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;

  const conversationIds = [
    ...new Set((memberships || []).map((row) => row.conversation_id)),
  ];

  if (conversationIds.length === 0) return [];

  const { data: participants, error: participantError } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", conversationIds);

  if (participantError) throw participantError;

  const participantIds = [
    ...new Set((participants || []).map((row) => row.user_id)),
  ];

  const [usersResult, messagesResult] = await Promise.all([
    supabase.from("users").select(USER_COLUMNS).in("id", participantIds),
    supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true }),
  ]);

  if (usersResult.error) throw usersResult.error;
  if (messagesResult.error) throw messagesResult.error;

  const usersById = new Map(
    (usersResult.data || []).map((row) => [row.id, mapUser(row)])
  );

  const messagesByConversation = new Map();
  for (const message of messagesResult.data || []) {
    const list = messagesByConversation.get(message.conversation_id) || [];
    list.push(message);
    messagesByConversation.set(message.conversation_id, list);
  }

  const conversations = conversationIds.map((conversationId) => {
    const memberIds = (participants || [])
      .filter((row) => row.conversation_id === conversationId)
      .map((row) => row.user_id);

    const otherUserId = memberIds.find((id) => id !== userId);
    const conversationMessages =
      messagesByConversation.get(conversationId) || [];
    const lastMessage = conversationMessages[conversationMessages.length - 1];

    return {
      id: conversationId,
      participants: memberIds,
      otherUser: usersById.get(otherUserId) || null,
      lastMessage: lastMessage?.content || "",
      lastMessageTime: lastMessage?.created_at || new Date(0).toISOString(),
      unreadCount: 0,
    };
  });

  return conversations.sort(
    (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
  );
}

export async function getMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapMessage);
}

export async function createMessage({ conversationId, senderId, content }) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) throw error;
  return mapMessage(data);
}

export async function listUsers(excludeUserId) {
  let query = supabase
    .from("users")
    .select(USER_COLUMNS)
    .order("full_name", { ascending: true });

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map(mapUser);
}

export async function updateUser(userId, updates) {
  const payload = {};

  if (updates.full_name !== undefined) payload.full_name = updates.full_name;
  if (updates.username !== undefined) payload.username = updates.username;

  if (Object.keys(payload).length === 0) {
    throw new Error("No profile fields to update");
  }

  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", userId)
    .select(USER_COLUMNS)
    .single();

  if (error) throw error;
  return mapUser(data);
}

async function findConversation(userId, conversationId) {
  const conversations = await getConversations(userId);
  const conversation = conversations.find((item) => item.id === conversationId);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
}

export async function getOrCreateDirectConversation(userId, otherUserId) {
  if (!userId || !otherUserId) {
    throw new Error("userId and otherUserId are required");
  }

  if (userId === otherUserId) {
    throw new Error("You cannot start a conversation with yourself");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;

  const conversationIds = [
    ...new Set((memberships || []).map((row) => row.conversation_id)),
  ];

  if (conversationIds.length > 0) {
    const { data: shared, error: sharedError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .in("conversation_id", conversationIds)
      .eq("user_id", otherUserId)
      .limit(1);

    if (sharedError) throw sharedError;

    if (shared && shared.length > 0) {
      return findConversation(userId, shared[0].conversation_id);
    }
  }

  const conversationId = randomUUID();

  const { error: conversationError } = await supabase
    .from("conversations")
    .insert({ id: conversationId });

  if (conversationError) throw conversationError;

  const { error: participantError } = await supabase
    .from("conversation_participants")
    .insert([
      { conversation_id: conversationId, user_id: userId },
      { conversation_id: conversationId, user_id: otherUserId },
    ]);

  if (participantError) {
    await supabase.from("conversations").delete().eq("id", conversationId);
    throw participantError;
  }

  return findConversation(userId, conversationId);
}
