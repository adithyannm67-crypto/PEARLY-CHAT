import HttpError from "#utils/HttpError.js";

const attempts = new Map();

const CLEANUP_INTERVAL_MS = 5 * 60_000; // 5 minutes

export function getClientKey(req, prefix) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress || "unknown";
  return `${prefix}:${ip}`;
}

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of attempts.entries()) {
    if (now >= entry.resetAt) {
      attempts.delete(key);
    }
  }
}

// Periodically clean up expired rate-limit entries to prevent unbounded memory growth.
const cleanupInterval = setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS);

// Allow tests or module consumers to stop the cleanup timer if needed.
export function stopRateLimitCleanup() {
  clearInterval(cleanupInterval);
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
