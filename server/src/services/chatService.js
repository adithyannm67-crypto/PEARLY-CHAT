import supabaseAuth from "#config/supabase-auth.js";

const USER_OWN_COLUMNS = "id, email, username, avatar_url, full_name, created_at";
const USER_PUBLIC_COLUMNS = "id, username, avatar_url, full_name, created_at";
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

export async function getUser(userId, accessToken) {
  const { data, error } = await supabaseAuth(accessToken)
    .from("users")
    .select(USER_OWN_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return mapUser(data);
}

export async function getConversations(userId, accessToken) {
  const db = supabaseAuth(accessToken);

  const { data: memberships, error: membershipError } = await db
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;

  const conversationIds = [
    ...new Set((memberships || []).map((row) => row.conversation_id)),
  ];

  if (conversationIds.length === 0) return [];

  const { data: participants, error: participantError } = await db
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", conversationIds);

  if (participantError) throw participantError;

  const participantIds = [
    ...new Set((participants || []).map((row) => row.user_id)),
  ];

  const [usersResult, messagesResult] = await Promise.all([
    db.from("public_user_profiles").select(USER_PUBLIC_COLUMNS).in("id", participantIds),
    db
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
    const conversationMessages = messagesByConversation.get(conversationId) || [];
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

export async function getMessages(conversationId, accessToken) {
  const { data, error } = await supabaseAuth(accessToken)
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapMessage);
}

export async function createMessage({ conversationId, senderId, content, accessToken }) {
  const { data, error } = await supabaseAuth(accessToken)
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

export async function listUsers(excludeUserId, accessToken, search = "") {
  let query = supabaseAuth(accessToken)
    .from("public_user_profiles")
    .select(USER_PUBLIC_COLUMNS)
    .order("full_name", { ascending: true })
    .limit(50);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const term = search.trim().replace(/[%_,()]/g, "");
  if (term) {
    query = query.or(`username.ilike.%${term}%,full_name.ilike.%${term}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map(mapUser);
}

export async function updateUser(userId, updates, accessToken) {
  const payload = {};

  if (updates.full_name !== undefined) {
    payload.full_name = updates.full_name.trim();
  }

  if (updates.username !== undefined) {
    payload.username = updates.username.trim().toLowerCase();
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("No profile fields to update");
  }

  const { data, error } = await supabaseAuth(accessToken)
    .from("users")
    .update(payload)
    .eq("id", userId)
    .select(USER_OWN_COLUMNS)
    .single();

  if (error) throw error;
  return mapUser(data);
}

export async function deleteConversation(userId, conversationId, accessToken) {
  const db = supabaseAuth(accessToken);

  const participant = await isConversationParticipant(
    conversationId,
    userId,
    accessToken
  );

  if (!participant) {
    throw new Error("Conversation not found");
  }

  const { error } = await db
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  if (error) throw error;

  return { success: true };
}

export async function isConversationParticipant(conversationId, userId, accessToken) {
  const { data, error } = await supabaseAuth(accessToken)
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function findConversation(userId, conversationId, accessToken) {
  const conversations = await getConversations(userId, accessToken);
  const conversation = conversations.find((item) => item.id === conversationId);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
}

export async function getOrCreateDirectConversation(userId, otherUserId, accessToken) {
  const { data: conversationId, error } = await supabaseAuth(accessToken).rpc(
    "get_or_create_direct_conversation",
    { p_other_user_id: otherUserId }
  );

  if (error) throw error;
  if (!conversationId) throw new Error("Could not create conversation");

  return findConversation(userId, conversationId, accessToken);
}
