function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Unknown";
}

export function log(
  prefix: string,
  convId: string | null,
  message: string,
  data?: unknown,
) {
  const conv = convId ?? "-";
  const payload = data !== undefined ? ` ${JSON.stringify(data)}` : "";
  console.log(
    `[${prefix}] conv=${conv} ${new Date().toISOString()} ${message}${payload}`,
  );
}
