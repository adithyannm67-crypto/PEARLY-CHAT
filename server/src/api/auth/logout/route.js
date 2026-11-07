import HttpError from "#utils/HttpError.js";
import parseCookies from "#utils/parseCookies.js";
import getAccessToken from "#utils/getAccessToken.js";
import createUserClient from "#config/supabase-auth.js";

function getProjectRef() {
  try {
    const url = new URL(process.env.SUPABASE_URL);
    return url.hostname.split(".")[0];
  } catch {
    return null;
  }
}

function clearCookie(name, isProduction) {
  return [
    `${name}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ...(isProduction ? ["Secure"] : []),
  ].join("; ");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    throw new HttpError(405, "Method not allowed");
  }

  const cookies = req.cookies || parseCookies(req);
  const accessToken = getAccessToken(req) || cookies.access_token;
  const refreshToken = cookies.refresh_token;

  if (accessToken && refreshToken) {
    try {
      const client = createUserClient(accessToken);
      await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      await client.auth.signOut();
    } catch {
      // Local cookies are still cleared even if remote revocation fails.
    }
  }

  const isProduction = process.env.NODE_ENV === "production";
  const projectRef = getProjectRef();
  const cookieNames = ["access_token", "refresh_token", "sb:token"];

  if (projectRef) {
    cookieNames.push(
      `sb-${projectRef}-auth-token`,
      `sb-${projectRef}-auth-token-code-verifier`,
      `sb-${projectRef}-auth-token.0`,
      `sb-${projectRef}-auth-token.1`,
      `sb-${projectRef}-auth-token.2`,
      `sb-${projectRef}-auth-token.3`,
      `sb-${projectRef}-auth-token.4`,
    );
  }

  res.setHeader("Set-Cookie", cookieNames.map((name) => clearCookie(name, isProduction)));

  return { success: true, message: "Logged out" };
}
