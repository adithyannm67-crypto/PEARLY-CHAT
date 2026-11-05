export default function parseCookies(req) {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) return {};

  const cookies = {};

  for (const cookie of cookieHeader.split(";")) {
    const index = cookie.indexOf("=");

    if (index === -1) continue;

    const name = cookie.slice(0, index).trim();
    const value = cookie.slice(index + 1).trim();

    if (!name) continue;

    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }

  return cookies;
}
