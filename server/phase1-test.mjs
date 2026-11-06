import http from "http";
import { WebSocket } from "ws";

const WS = "ws://localhost:5000";

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const req = http.request(
      { host: "localhost", port: 5000, path, method, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function connectWS() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS);
    const msgs = [];
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
    ws.on("message", (raw) => {
      try { msgs.push(JSON.parse(raw.toString())); } catch (e) { msgs.push({ raw: raw.toString() }); }
    });
    ws.waitFor = (type, timeout = 5000) => new Promise((res, rej) => {
      const m = msgs.find((x) => x.type === type);
      if (m) return res(m);
      const t = setTimeout(() => rej(new Error(`timeout waiting for ${type}`)), timeout);
      const iv = setInterval(() => {
        const found = msgs.find((x) => x.type === type);
        if (found) { clearTimeout(t); clearInterval(iv); res(found); }
      }, 30);
    });
    return ws;
  });
}

async function main() {
  const u1 = `user1_${Date.now()}@example.com`;
  const u2 = `user2_${Date.now()}@example.com`;

  console.log("1. Signing up & signing in two users...");
  await request("POST", "/api/auth/signup", { email: u1, password: "Password123!", name: "User One", username: `uone${Date.now()}` });
  await request("POST", "/api/auth/signup", { email: u2, password: "Password123!", name: "User Two", username: `utwo${Date.now()}` });
  const s1 = await request("POST", "/api/auth/signin", { email: u1, password: "Password123!" });
  const s2 = await request("POST", "/api/auth/signin", { email: u2, password: "Password123!" });
  const b1 = JSON.parse(s1.body).data;
  const b2 = JSON.parse(s2.body).data;
  const token1 = b1.session.access_token;
  const token2 = b2.session.access_token;
  const id1 = b1.user.id;
  const id2 = b2.user.id;
  console.log("   id1:", id1, "id2:", id2);

  console.log("2. Creating conversation...");
  await request("POST", "/api/conversations", { otherUserId: id2 }, token1);
  const convs = await request("GET", "/api/conversations", null, token1);
  const cb = JSON.parse(convs.body).data;
  const conversation = cb.conversations.find((c) => c.participants.includes(id2));
  if (!conversation) throw new Error("No conversation found");
  const conversationId = conversation.id;
  console.log("   conversationId:", conversationId);

  console.log("3. Connecting & authenticating ws1...");
  const ws1 = await connectWS();
  ws1.send(JSON.stringify({ type: "AUTH", token: token1 }));
  const a1 = await ws1.waitFor("AUTHENTICATED");
  console.log("   ws1 authenticated as", a1.userId);
  if (a1.userId !== id1) throw new Error("ws1 wrong userId");

  console.log("4. Connecting & authenticating ws2...");
  const ws2 = await connectWS();
  ws2.send(JSON.stringify({ type: "AUTH", token: token2 }));
  const a2 = await ws2.waitFor("AUTHENTICATED");
  console.log("   ws2 authenticated as", a2.userId);
  if (a2.userId !== id2) throw new Error("ws2 wrong userId");

  console.log("5. Both join room...");
  ws1.send(JSON.stringify({ type: "JOIN_ROOM", conversationId }));
  ws2.send(JSON.stringify({ type: "JOIN_ROOM", conversationId }));

  const rj1 = await ws1.waitFor("ROOM_JOINED");
  const rj2 = await ws2.waitFor("ROOM_JOINED");
  console.log("   ws1 ROOM_JOINED:", JSON.stringify(rj1));
  console.log("   ws2 ROOM_JOINED:", JSON.stringify(rj2));
  if (rj2.participantCount !== 2) throw new Error("ws2 participantCount != 2");

  const pj1 = await ws1.waitFor("PEER_JOINED");
  const pj2 = await ws2.waitFor("PEER_JOINED");
  console.log("   ws1 PEER_JOINED:", JSON.stringify(pj1));
  console.log("   ws2 PEER_JOINED:", JSON.stringify(pj2));
  if (pj1.userId !== id2) throw new Error("ws1 peer should be id2");
  if (pj2.userId !== id1) throw new Error("ws2 peer should be id1");

  console.log("6. ws1 leaves -> ws2 gets PEER_LEFT...");
  ws1.send(JSON.stringify({ type: "LEAVE_ROOM", conversationId }));
  const pl2 = await ws2.waitFor("PEER_LEFT");
  console.log("   ws2 PEER_LEFT:", JSON.stringify(pl2));
  if (pl2.userId !== id1) throw new Error("ws2 peerLeft should be id1");

  console.log("7. Unauthenticated JOIN_ROOM rejected...");
  const ws3 = await connectWS();
  ws3.send(JSON.stringify({ type: "JOIN_ROOM", conversationId }));
  const err = await ws3.waitFor("ERROR");
  console.log("   ws3 ERROR:", JSON.stringify(err));
  ws3.close();

  console.log("8. Unknown event rejected...");
  ws1.send(JSON.stringify({ type: "FOO" }));
  const err2 = await ws1.waitFor("ERROR");
  console.log("   ws1 ERROR:", JSON.stringify(err2));

  ws1.close();
  ws2.close();
  console.log("\nALL PHASE 1 TESTS PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error("TEST FAILED:", err.message);
  process.exit(1);
});
