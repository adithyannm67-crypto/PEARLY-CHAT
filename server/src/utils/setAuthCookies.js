function buildCookie(name, value, maxAge, isProduction) {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
    ...(isProduction ? ["Secure"] : []),
  ].join("; ");
}

export default function setAuthCookies(res, session, isProduction = process.env.NODE_ENV === "production") {
  res.setHeader("Set-Cookie", [
    buildCookie("access_token", session.access_token, session.expires_in || 60 * 60, isProduction),
    buildCookie("refresh_token", session.refresh_token, 60 * 60 * 24 * 30, isProduction),
  ]);
}
