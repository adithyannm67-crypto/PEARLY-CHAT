import { WebSocket } from "ws";
import supabase from "#config/supabase.js";
import { isConversationParticipant } from "#services/chatService.js";

const MAX_PAYLOAD_SIZE = 64 * 1024;
const MAX_PARTICIPANTS = 2;
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 5000;

// conversationId -> { sockets: Set<WebSocket>, participants: Map<userId, Set<WebSocket>> }
const rooms = new Map();

// conversationId + type + senderId + payload hash -> timestamp
const signalingCache = new Map();
const SIGNALING_CACHE_TTL = 1000;

function signalingKey(conversationId, type, senderId, payload) {
  let hash = "";
  if (type === "ICE_CANDIDATE") hash = payload.candidate || "";
  else if (type === "OFFER" || type === "ANSWER") hash = payload.sdp || "";
  return `${conversationId}|${type}|${senderId}|${hash}`;
}

function isDuplicateSignal(conversationId, type, senderId, payload) {
  const key = signalingKey(conversationId, type, senderId, payload);
  const now = Date.now();
  const seen = signalingCache.get(key);
  if (seen && now - seen < SIGNALING_CACHE_TTL) return true;
  signalingCache.set(key, now);
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of signalingCache.entries()) {
    if (now - ts > SIGNALING_CACHE_TTL) signalingCache.delete(key);
  }
}, SIGNALING_CACHE_TTL);

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
    try {
      socket.send(JSON.stringify(payload));
    } catch (err) {
      console.error("[ws] send failed:", err);
    }
  }
}

function sendError(socket, code, message) {
  send(socket, { type: "ERROR", code, message });
}

function extractToken(request) {
  // Security: Do NOT accept tokens via URL query parameters to prevent exposure in logs, referrer headers, and history.
  // Only accept tokens via Authorization header or HttpOnly cookies.
  try {
    const auth = request.headers.authorization || request.headers.Authorization;
    if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  } catch (err) {
    // ignore invalid header
  }

  // Security: Check HttpOnly cookie - never expose token in URL or client-side code
  const cookie = request.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);

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
    const userSockets = room.participants.get(socket.userId);
    const userFullyLeft = !userSockets || userSockets.size === 0;
    if (userFullyLeft) {
      const others = [...room.sockets].filter((s) => s.userId !== socket.userId);
      for (const other of others) {
        send(other, {
          type: "PEER_LEFT",
          conversationId,
          userId: socket.userId,
        });
      }
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
  if (socket.authenticated) {
    send(socket, { type: "AUTHENTICATED", userId: socket.userId });
    return;
  }

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
  // console.log("[ws] join room:", payload);
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
    // console.log("[ws] isParticipant:", isParticipant);
  } catch (err) {
    return sendError(socket, "MEMBERSHIP_ERROR", "Failed to verify membership");
  }

  if (!isParticipant) {
    return sendError(socket, "FORBIDDEN", "Not a participant of this conversation");
  }

  const room = getRoom(conversationId);
  // console.log("[ws] room:", room);

  const participantIds = new Set(room.participants.keys());
  if (!participantIds.has(socket.userId) && participantIds.size >= MAX_PARTICIPANTS) {
    return sendError(socket, "ROOM_FULL", "Conversation already has two participants");
  }

  const alreadyJoined = socket.rooms.has(conversationId);

  // One active room per socket: leave any previous room before joining a new one.
  // This keeps getSignalingRoom() unambiguous.
  for (const prevRoomId of [...socket.rooms]) {
    if (prevRoomId !== conversationId) {
      removeSocketFromRoom(socket, prevRoomId);
    }
  }

  room.sockets.add(socket);
  if (!room.participants.has(socket.userId)) {
    room.participants.set(socket.userId, new Set());
  }
  room.participants.get(socket.userId).add(socket);
  socket.rooms.add(conversationId);

  const otherParticipantIds = [...room.participants.keys()].filter(
    (id) => id !== socket.userId,
  );

  send(socket, {
    type: "ROOM_JOINED",
    conversationId,
    participantCount: room.participants.size,
    participantIds: otherParticipantIds,
  });

  if (!alreadyJoined) {
    const others = [...room.sockets].filter((s) => s.userId !== socket.userId);
    for (const other of others) {
      send(other, {
        type: "PEER_JOINED",
        conversationId,
        userId: socket.userId,
      });
    }
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

  if (isDuplicateSignal(conversationId, type, socket.userId, payload)) {
    return;
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

  const recipients = [...room.sockets].filter((s) => s.userId !== socket.userId);

  if (type === "OFFER") {
    console.log(`[SERVER-OFFER] OFFER received ${new Date().toISOString()} conv=${conversationId} senderId=${socket.userId}`);
  }
  if (type === "ANSWER") {
    console.log(`[SERVER-OFFER] ANSWER received ${new Date().toISOString()} conv=${conversationId} senderId=${socket.userId}`);
  }
  if (type === "ICE_CANDIDATE") {
    const candType = typeof payload.candidate === "string" ? payload.candidate.split(" ")[0] : "unknown";
    // Redact SDP metadata from ICE candidate logging to avoid exposing network topology
    const candidateRedacted = payload.candidate ? payload.candidate.replace(/a=mid:\[^\]]+\]/g, 'a=mid:redacted]') : null;
    console.log(`[SERVER-OFFER] ICE_CANDIDATE received ${new Date().toISOString()} conv=${conversationId} senderId=${socket.userId} candidateType=${candType}`);
  }

  broadcast(room, socket, forwardPayload);

  if (type === "OFFER") {
    console.log(`[SERVER-OFFER] OFFER forwarded ${new Date().toISOString()} conv=${conversationId} senderId=${socket.userId} recipients=${recipients.map((s) => s.userId)}`);
  }
  if (type === "ANSWER") {
    console.log(`[SERVER-OFFER] ANSWER forwarded ${new Date().toISOString()} conv=${conversationId} senderId=${socket.userId} recipients=${recipients.map((s) => s.userId)}`);
  }
  if (type === "ICE_CANDIDATE") {
    const candType = typeof payload.candidate === "string" ? payload.candidate.split(" ")[0] : "unknown";
    console.log(`[SERVER-OFFER] ICE_CANDIDATE forwarded ${new Date().toISOString()} conv=${conversationId} senderId=${socket.userId} candidateType=${candType} recipients=${recipients.map((s) => s.userId)}`);
  }
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
console.log("[signaling] message:", type);
    if (type === "AUTH") {
      await handleAuth(socket, payload);
      return;
    }

    if (!isAuthenticated(socket)) {
      return sendError(socket, "NOT_AUTHENTICATED", "Authentication required");
    }

    switch (type) {
      case "PING":
        send(socket, { type: "PONG", timestamp: payload.timestamp });
        return;
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
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isAlive === false) {
        console.log(
          `[ws] heartbeat close instanceId=${socket.instanceId} userId=${socket.userId} readyState=${socket.readyState}`
        );
        socket.close(1000, "heartbeat timeout");
        return;
      }
      socket.isAlive = false;
      socket.ping();

      // Per-socket pong timeout: if no pong within HEARTBEAT_TIMEOUT,
      // close immediately instead of waiting for the next interval.
      if (socket.pongTimeout) {
        clearTimeout(socket.pongTimeout);
      }
      socket.pongTimeout = setTimeout(() => {
        if (socket.isAlive === false) {
          console.log(
            `[ws] pong timeout close instanceId=${socket.instanceId} userId=${socket.userId} readyState=${socket.readyState}`
          );
          socket.close(1000, "heartbeat timeout");
        }
      }, HEARTBEAT_TIMEOUT);
    });
  }, HEARTBEAT_INTERVAL);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  wss.on("connection", (socket, request) => {
    socket.userId = null;
    socket.accessToken = null;
    socket.authenticated = false;
    socket.rooms = new Set();
    socket.isAlive = true;
    socket.instanceId = crypto.randomUUID();

    socket.on("pong", () => {
      socket.isAlive = true;
      if (socket.pongTimeout) {
        clearTimeout(socket.pongTimeout);
        socket.pongTimeout = null;
      }
    });

    // Security: Validate WebSocket origin on connection.
    // Production requires an explicitly configured allowed frontend origin
    // (ALLOWED_ORIGINS / CLIENT_URL / FRONTEND_URL). No localhost fallback in production.
    const origin = request.headers.origin;
    const rawAllowed =
      process.env.ALLOWED_ORIGINS ||
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "";
    let allowedOrigins = rawAllowed.split(",").map((o) => o.trim()).filter(Boolean);
    const isProduction = process.env.NODE_ENV === "production";
    if (allowedOrigins.length === 0) {
      if (isProduction) {
        console.error("[ws] Rejected connection: no allowed frontend origin configured in production");
        socket.close(1008, "Server origin policy not configured");
        return;
      }
      allowedOrigins = ["http://localhost:3000", "http://localhost:3001"];
    } else if (!isProduction) {
      for (const dev of ["http://localhost:3000", "http://localhost:3001"]) {
        if (!allowedOrigins.includes(dev)) allowedOrigins.push(dev);
      }
    }
    if (origin && !allowedOrigins.includes(origin)) {
      console.warn(`[ws] Rejected connection from disallowed origin: ${origin}`);
      socket.close(1008, "Policy violation - origin not allowed");
      return;
    }

    console.log(
      `[ws] connection instanceId=${socket.instanceId} readyState=${socket.readyState} url=${request.url}`
    );

    (async () => {
      try {
        const token = extractToken(request);
        if (token && !socket.authenticated && socket.readyState === WebSocket.OPEN) {
          const user = await authenticateUser(token);
          if (
            user &&
            !socket.authenticated &&
            socket.readyState === WebSocket.OPEN
          ) {
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

    socket._chain = Promise.resolve();
    socket.on("message", (message) => {
      console.log("[ws] raw message:", typeof message, message.toString().slice(0, 120));
      socket._chain = socket._chain.then(() => handleMessage(socket, message)).catch((err) => {
        console.error("[signaling] message error:", err);
        try {
          sendError(socket, "INTERNAL_ERROR", "Internal server error");
        } catch {}
      });
    });

    socket.on("close", (code, reason) => {
      if (socket.pongTimeout) {
        clearTimeout(socket.pongTimeout);
        socket.pongTimeout = null;
      }
      console.log(
        `[ws] close instanceId=${socket.instanceId} code=${code} reason=${reason} userId=${socket.userId} readyState=${socket.readyState} rooms=${JSON.stringify(
          [...socket.rooms]
        )}`
      );
      handleClose(socket);
    });

    socket.on("error", (err) => {
      console.error(
        `[ws] error instanceId=${socket.instanceId} userId=${socket.userId}`,
        err
      );
    });
  });
}

export { rooms };
