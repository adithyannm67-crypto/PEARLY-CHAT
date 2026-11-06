import { WebSocket } from "ws";
import supabase from "#config/supabase.js";
import { isConversationParticipant } from "#services/chatService.js";

const MAX_PAYLOAD_SIZE = 64 * 1024;
const MAX_PARTICIPANTS = 2;

// conversationId -> { sockets: Set<WebSocket>, participants: Map<userId, Set<WebSocket>> }
const rooms = new Map();

function getRoom(conversationId) {
  let room = rooms.get(conversationId);
  if (!room) {
    room = { sockets: new Set(), participants: new Map() };
    rooms.set(conversationId, room);
  }
  return room;
}

function send(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    console.log("[ws] send:", payload.type, JSON.stringify(payload).slice(0, 120));
    socket.send(JSON.stringify(payload));
  }
}

function sendError(socket, code, message) {
  send(socket, { type: "ERROR", code, message });
}

function extractToken(request) {
  try {
    const url = new URL(
      request.url,
      `http://${request.headers.host || "localhost"}`
    );
    const token = url.searchParams.get("token");
    if (token) return token;
  } catch (err) {
    // ignore invalid URL
  }

  const cookie = request.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);

  const auth = request.headers.authorization || request.headers.Authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();

  return null;
}

async function authenticateUser(token) {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

function isAuthenticated(socket) {
  return Boolean(socket.authenticated && socket.userId);
}

function broadcast(room, excludeSocket, payload) {
  for (const socket of room.sockets) {
    if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
      send(socket, payload);
    }
  }
}

function removeSocketFromRoom(socket, conversationId) {
  const room = rooms.get(conversationId);
  if (!room) return;

  room.sockets.delete(socket);

  const userSockets = room.participants.get(socket.userId);
  if (userSockets) {
    userSockets.delete(socket);
    if (userSockets.size === 0) {
      room.participants.delete(socket.userId);
    }
  }

  socket.rooms.delete(conversationId);

  if (socket.userId) {
    const others = [...room.sockets].filter((s) => s.userId !== socket.userId);
    for (const other of others) {
      send(other, {
        type: "PEER_LEFT",
        conversationId,
        userId: socket.userId,
      });
    }
  }

  if (room.sockets.size === 0) {
    rooms.delete(conversationId);
  }
}

function handleClose(socket) {
  for (const conversationId of [...socket.rooms]) {
    removeSocketFromRoom(socket, conversationId);
  }
  socket.rooms.clear();
}

async function handleAuth(socket, payload) {
  const token = payload.token;
  if (!token || typeof token !== "string") {
    return sendError(socket, "INVALID_TOKEN", "Token is required");
  }

  const user = await authenticateUser(token);
  console.log("[ws] auth result:", user ? `user ${user.id}` : "FAILED");
  if (!user) {
    return sendError(socket, "INVALID_TOKEN", "Invalid or expired session");
  }

  socket.userId = user.id;
  socket.accessToken = token;
  socket.authenticated = true;

  send(socket, { type: "AUTHENTICATED", userId: user.id });
}

async function handleJoinRoom(socket, payload) {
  const { conversationId } = payload;

  if (!conversationId || typeof conversationId !== "string") {
    return sendError(socket, "INVALID_PAYLOAD", "conversationId is required");
  }

  let isParticipant;
  try {
    isParticipant = await isConversationParticipant(
      conversationId,
      socket.userId,
      socket.accessToken
    );
  } catch (err) {
    return sendError(socket, "MEMBERSHIP_ERROR", "Failed to verify membership");
  }

  if (!isParticipant) {
    return sendError(socket, "FORBIDDEN", "Not a participant of this conversation");
  }

  const room = getRoom(conversationId);

  const participantIds = new Set(room.participants.keys());
  if (!participantIds.has(socket.userId) && participantIds.size >= MAX_PARTICIPANTS) {
    return sendError(socket, "ROOM_FULL", "Conversation already has two participants");
  }

  room.sockets.add(socket);
  if (!room.participants.has(socket.userId)) {
    room.participants.set(socket.userId, new Set());
  }
  room.participants.get(socket.userId).add(socket);
  socket.rooms.add(conversationId);

  send(socket, {
    type: "ROOM_JOINED",
    conversationId,
    participantCount: room.participants.size,
  });

  const others = [...room.sockets].filter((s) => s.userId !== socket.userId);
  for (const other of others) {
    send(other, {
      type: "PEER_JOINED",
      conversationId,
      userId: socket.userId,
    });
  }
}

function handleLeaveRoom(socket, payload) {
  const { conversationId } = payload;

  if (!conversationId || typeof conversationId !== "string") {
    return sendError(socket, "INVALID_PAYLOAD", "conversationId is required");
  }

  removeSocketFromRoom(socket, conversationId);
}

function getSignalingRoom(socket) {
  for (const conversationId of socket.rooms) {
    if (rooms.has(conversationId)) {
      return conversationId;
    }
  }
  return null;
}

async function handleSignaling(socket, payload, type) {
  const conversationId = getSignalingRoom(socket);

  if (!conversationId) {
    return sendError(socket, "NOT_IN_ROOM", "Not in a signaling room");
  }

  const room = getRoom(conversationId);

  if (type === "OFFER" || type === "ANSWER") {
    if (typeof payload.sdp !== "string" || !payload.sdp.trim()) {
      return sendError(socket, "INVALID_SDP", `Invalid SDP for ${type}`);
    }
  }

  if (type === "ICE_CANDIDATE") {
    if (payload.candidate === undefined || payload.candidate === null) {
      return sendError(socket, "INVALID_CANDIDATE", "ICE candidate is required");
    }
  }

  const forwardPayload = {
    type,
    senderId: socket.userId,
    conversationId,
  };

  if (type === "OFFER" || type === "ANSWER") {
    forwardPayload.sdp = payload.sdp;
  }

  if (type === "ICE_CANDIDATE") {
    forwardPayload.candidate = payload.candidate;
    if (payload.sdpMid !== undefined) forwardPayload.sdpMid = payload.sdpMid;
    if (payload.sdpMLineIndex !== undefined) forwardPayload.sdpMLineIndex = payload.sdpMLineIndex;
  }

  broadcast(room, socket, forwardPayload);
}

async function handleMessage(socket, raw) {
  try {
    if (
      typeof raw === "string" &&
      raw.length > MAX_PAYLOAD_SIZE
    ) {
      return sendError(socket, "PAYLOAD_TOO_LARGE", "Message payload too large");
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      return sendError(socket, "INVALID_JSON", "Invalid JSON payload");
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return sendError(socket, "INVALID_PAYLOAD", "Payload must be a JSON object");
    }

    const { type } = payload;

    if (type === "AUTH") {
      await handleAuth(socket, payload);
      return;
    }

    if (!isAuthenticated(socket)) {
      return sendError(socket, "NOT_AUTHENTICATED", "Authentication required");
    }

    switch (type) {
      case "JOIN_ROOM":
        await handleJoinRoom(socket, payload);
        break;
      case "LEAVE_ROOM":
        handleLeaveRoom(socket, payload);
        break;
      case "OFFER":
        await handleSignaling(socket, payload, "OFFER");
        break;
      case "ANSWER":
        await handleSignaling(socket, payload, "ANSWER");
        break;
      case "ICE_CANDIDATE":
        await handleSignaling(socket, payload, "ICE_CANDIDATE");
        break;
      default:
        sendError(socket, "UNKNOWN_EVENT", `Unknown event type: ${type}`);
    }
  } catch (err) {
    console.error("[signaling] message error:", err);
    sendError(socket, "INTERNAL_ERROR", "Internal server error");
  }
}

export function setupSignaling(wss) {
  wss.on("connection", (socket, request) => {
    socket.userId = null;
    socket.accessToken = null;
    socket.authenticated = false;
    socket.rooms = new Set();

    (async () => {
      try {
        const token = extractToken(request);
        if (token) {
          const user = await authenticateUser(token);
          if (user) {
            socket.userId = user.id;
            socket.accessToken = token;
            socket.authenticated = true;
            send(socket, { type: "AUTHENTICATED", userId: user.id });
          }
        }
      } catch (err) {
        // Remain unauthenticated; client must send AUTH message.
      }
    })();

    socket.on("message", (message) => {
      console.log("[ws] raw message:", typeof message, message.toString().slice(0, 120));
      handleMessage(socket, message);
    });

    socket.on("close", () => {
      handleClose(socket);
    });

    socket.on("error", () => {
      handleClose(socket);
    });
  });
}

export { rooms };
