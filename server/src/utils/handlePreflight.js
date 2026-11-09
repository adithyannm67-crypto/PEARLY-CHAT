import { getAllowedOrigins, isOriginAllowed } from "#utils/allowedOrigins.js";

export default function handlePreflight(req, res) {
  const origin = req.headers.origin;
  const isAllowed = isOriginAllowed(origin);

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
