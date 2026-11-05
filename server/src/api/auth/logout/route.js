export default async function handler(req, res) {
  if (req.method !== "POST") {
    throw new Error("Method not allowed");
  }

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = [
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ...(isProduction ? ["Secure"] : []),
  ].join("; ");

  res.setHeader("Set-Cookie", [
    `access_token=; ${cookieOptions}`,
    `refresh_token=; ${cookieOptions}`,
    `sb:token=; ${cookieOptions}`,
  ]);

  return { success: true, message: "Logged out" };
}
