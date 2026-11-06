const http = require("http");
const { WebSocket } = require("ws");

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "localhost", port: 5000, path, method, headers: { "Content-Type": "application/json" } },
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

(async () => {
  const s1 = await request("POST", "/api/auth/signin", { email: "user1_1793945577992@example.com", password: "Password123!" });
  console.log("signin:", s1.status, s1.body.slice(0, 200));
  const b1 = JSON.parse(s1.body).data;
  const tok = b1.session?.access_token;
  console.log("token:", tok ? tok.slice(0, 30) : "NONE");
  if (!tok) return;

  const ws = new WebSocket("ws://localhost:5000");
  ws.on("open", () => {
    console.log("WS OPEN");
    ws.send(JSON.stringify({ type: "AUTH", token: tok }));
  });
  ws.on("message", (d) => { console.log("MSG:", d.toString()); });
  ws.on("error", (e) => { console.log("ERR:", e.message); });
  ws.on("close", () => { console.log("CLOSE"); });
  setTimeout(() => { ws.close(); process.exit(0); }, 5000);
})();
