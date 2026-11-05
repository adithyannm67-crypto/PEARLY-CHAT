function getAllowedOrigins() {
  const configured = process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || "http://localhost:3000";
  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default function handlePreflight(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = !origin || allowedOrigins.includes(origin);

  if (origin && isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(isAllowed ? 204 : 403);
    res.end();
    return true;
  }

  return false;
}
