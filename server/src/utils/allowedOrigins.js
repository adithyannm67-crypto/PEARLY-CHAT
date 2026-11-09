export function getAllowedOrigins() {
  const raw =
    process.env.ALLOWED_ORIGINS ||
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "";
  const origins = raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const isProduction = process.env.NODE_ENV === "production";
  if (origins.length === 0) {
    if (isProduction) return [];
    return ["http://localhost:3000", "http://localhost:3001"];
  }

  if (!isProduction) {
    // Keep local dev flexible without affecting explicit production config.
    for (const dev of ["http://localhost:3000", "http://localhost:3001"]) {
      if (!origins.includes(dev)) origins.push(dev);
    }
  }
  return origins;
}

export function isOriginAllowed(origin) {
  if (!origin) return true;
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return false; // production misconfiguration
  return allowed.includes(origin);
}
