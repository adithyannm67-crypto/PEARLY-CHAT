import parseCookies from "#utils/parseCookies.js";

export default function getAccessToken(req) {
  const authorization = req.headers.authorization || req.headers.Authorization;

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();
    if (token) return token;
  }

  const cookies = req.cookies || parseCookies(req);
  return cookies.access_token || null;
}
