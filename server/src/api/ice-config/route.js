import twilio from "twilio";
import withAuth from "#utils/withAuth.js";
import HttpError from "#utils/HttpError.js";

const DEFAULT_STUN_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302"] },
  { urls: ["stun:stun1.l.google.com:19302"] },
];

export default async function handler(req) {
  const { user } = await withAuth(req);

  if (req.method !== "GET") {
    throw new HttpError(405, "Method not allowed. Only GET is accepted.");
  }

  const iceServers = [...DEFAULT_STUN_SERVERS];

  // Add Twilio TURN credentials if configured (optional, not required)
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (accountSid && authToken) {
    try {
      const client = twilio(accountSid, authToken);
      const token = await client.tokens.create();

      const turnServers = (token.iceServers || []).map((s) => ({
        urls: Array.isArray(s.urls) ? s.urls : [s.urls],
        username: s.username,
        credential: s.credential,
      }));

      iceServers.push(...turnServers);
    } catch (error) {
      console.error("[ice-config] Twilio token error:", error);
      // Continue with STUN-only config if Twilio fails
    }
  }

  return { iceServers };
}
