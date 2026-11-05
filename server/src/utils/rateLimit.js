import HttpError from "#utils/HttpError.js";

const attempts = new Map();

export function getClientKey(req, prefix) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress || "unknown";
  return `${prefix}:${ip}`;
}

export default function checkRateLimit(key, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now >= entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count += 1;

  if (entry.count > limit) {
    throw new HttpError(429, "Too many attempts. Please try again later.");
  }
}
