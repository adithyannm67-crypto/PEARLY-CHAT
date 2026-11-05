import supabaseAuth from "#config/supabase-auth.js";
import HttpError from "#utils/HttpError.js";
import { getOrCreateDirectConversation } from "./chatService.js";

const PUBLIC_COLUMNS = "id, username, avatar_url, full_name, created_at";
const REQUEST_COLUMNS = "id, sender_id, receiver_id, status, created_at";

import { CONNECTION_REQUEST_STATUS } from "#config/database-enums.js";

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

function mapRequest(row, user) {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    status: row.status,
    createdAt: row.created_at,
    user,
  };
}

async function getProfilesByIds(ids, accessToken) {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabaseAuth(accessToken)
    .from("public_user_profiles")
    .select(PUBLIC_COLUMNS)
    .in("id", ids);

  if (error) {
    // public_user_profiles is created by the chat migration; degrade gracefully
    // if it is missing so request create/list still work.
    console.warn("public_user_profiles lookup failed:", error.message);
    return new Map();
  }

  return new Map((data || []).map((row) => [row.id, mapUser(row)]));
}

async function requestWithProfile(row, otherUserId, accessToken) {
  const profiles = await getProfilesByIds([otherUserId], accessToken);
  return mapRequest(
    row,
    profiles.get(otherUserId) ||
      mapUser({ id: otherUserId, username: "", full_name: "Unknown user" }),
  );
}

async function findExistingConversation(userId, otherUserId, accessToken) {
  const db = supabaseAuth(accessToken);

  const { data: memberships, error: membershipError } = await db
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;

  const conversationIds = [
    ...new Set((memberships || []).map((row) => row.conversation_id)),
  ];

  if (conversationIds.length === 0) return false;

  const { data: shared, error: sharedError } = await db
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", otherUserId)
    .in("conversation_id", conversationIds)
    .limit(1);

  if (sharedError) throw sharedError;

  return Boolean(shared && shared.length > 0);
}

export async function listConnectionRequests1(userId, accessToken) {
  const db = supabaseAuth(accessToken);

  const { data, error } = await db
    .from("connection_requests")
    .select(REQUEST_COLUMNS)
    .eq("sender_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  console.log("Connection requests:", data);
  return data.map((row) => mapRequest(row, null));
}

export async function listConnectionRequests(
  userId,
  accessToken,
  direction = "incoming",
  status = "PENDING",
) {
  const db = supabaseAuth(accessToken);
  const isOutgoing = direction === "outgoing";
  const userColumn = isOutgoing ? "sender_id" : "receiver_id";
  const otherUserColumn = isOutgoing ? "receiver_id" : "sender_id";

  let query = db
    .from("connection_requests")
    .select(REQUEST_COLUMNS)
    .eq(userColumn, userId)
    .order("created_at", { ascending: true });

  if (status && status !== "ALL") {
    // query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) throw error;

  const otherUserIds = [
    ...new Set((data || []).map((row) => row[otherUserColumn])),
  ];
  const profiles = await getProfilesByIds(otherUserIds, accessToken);

  return (data || []).map((row) =>
    mapRequest(
      row,
      profiles.get(row[otherUserColumn]) ||
        mapUser({ id: row[otherUserColumn] }),
    ),
  );
}

export async function createConnectionRequest(userId, receiverId, accessToken) {
  const db = supabaseAuth(accessToken);

  console.log("[Connection Request] Creating request:", {
    senderId: userId,
    receiverId,
  });

  if (await findExistingConversation(userId, receiverId, accessToken)) {
    throw new HttpError(409, "You are already connected with this user");
  }

  const { data: existing, error: existingError } = await db
    .from("connection_requests")
    .select(REQUEST_COLUMNS)
    .eq("status", CONNECTION_REQUEST_STATUS.PENDING)
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),` +
        `and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`,
    )
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    if (existing.sender_id === userId) {
      throw new HttpError(409, "Connection request already pending");
    }

    throw new HttpError(
      409,
      "This user has already sent you a connection request. Check your pending requests.",
    );
  }

  const { data, error } = await db
    .from("connection_requests")
    .insert({
      sender_id: userId,
      receiver_id: receiverId,
    })
    .select(REQUEST_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new HttpError(409, "Connection request already pending");
    }
    throw error;
  }

  console.log("[Connection Request] Database response:", data);

  return requestWithProfile(data, receiverId, accessToken);
}

export async function acceptConnectionRequest(userId, requestId, accessToken) {
  const db = supabaseAuth(accessToken);

  console.log("[Connection Request] Accepting:", {
    userId,
    requestId,
  });

  const { data: request, error } = await db
    .from("connection_requests")
    .select(REQUEST_COLUMNS)
    .eq("id", requestId)
    .eq("receiver_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!request) {
    throw new HttpError(404, "Connection request not found");
  }

  if (request.status !== CONNECTION_REQUEST_STATUS.PENDING) {
    throw new HttpError(409, "Connection request is no longer pending");
  }

  const conversation = await getOrCreateDirectConversation(
    userId,
    request.sender_id,
    accessToken,
  );

  const { data: updated, error: updateError } = await db
    .from("connection_requests")
    .update({ status: CONNECTION_REQUEST_STATUS.ACCEPTED })
    .eq("id", requestId)
    .eq("receiver_id", userId)
    .eq("status", CONNECTION_REQUEST_STATUS.PENDING)
    .select(REQUEST_COLUMNS)
    .maybeSingle();

  if (updateError) throw updateError;

  console.log("[Connection Request] Updated:", updated);

  if (!updated) {
    throw new HttpError(409, "Connection request is no longer pending");
  }

  return {
    request: await requestWithProfile(updated, request.sender_id, accessToken),
    conversation,
  };
}

export async function cancelConnectionRequest(userId, requestId, accessToken) {
  const db = supabaseAuth(accessToken);
console.log("r",requestId,"u", userId);

  const { data: updated, error } = await db.from("connection_requests")
    .update({ status: CONNECTION_REQUEST_STATUS.CANCELLED })
    .eq("id", requestId)
    .eq("sender_id", userId)
    .eq("status", CONNECTION_REQUEST_STATUS.PENDING)
    .select(REQUEST_COLUMNS)
    .maybeSingle();
  console.log("[Connection Request] Cancelled:", updated);
  if (error) throw error;

  if (!updated) {
    throw new HttpError(404, "Pending connection request not found");
  }

  return {
    request: await requestWithProfile(
      updated,
      updated.receiver_id,
      accessToken,
    ),
  };
}

export async function listConnectionRequestHistory(userId, accessToken) {
  const [incoming, outgoing] = await Promise.all([
    listConnectionRequests(userId, accessToken, "incoming", "all"),
    listConnectionRequests(userId, accessToken, "outgoing", "all"),
  ]);

  return [
    ...incoming.map((request) => ({ ...request, direction: "incoming" })),
    ...outgoing.map((request) => ({ ...request, direction: "outgoing" })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function rejectConnectionRequest(userId, requestId, accessToken) {
  const { data: updated, error } = await supabaseAuth(accessToken)
    .from("connection_requests")
    .update({ status: CONNECTION_REQUEST_STATUS.REJECTED })
    .eq("id", requestId)
    .eq("receiver_id", userId)
    .eq("status", CONNECTION_REQUEST_STATUS.PENDING)
    .select(REQUEST_COLUMNS)
    .maybeSingle();

  if (error) throw error;

  if (!updated) {
    throw new HttpError(404, "Pending connection request not found");
  }

  return { request: updated };
}
