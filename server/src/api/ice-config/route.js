import twilio from "twilio";
import withAuth from "#utils/withAuth.js";
import HttpError from "#utils/HttpError.js";

export default async function handler(req) {
  const { user } = await withAuth(req);

  if (req.method !== "GET") {
    throw new HttpError(405, "Method not allowed. Only GET is accepted.");
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new HttpError(500, "Twilio credentials not configured on server");
  }

  try {
    const client = twilio(accountSid, authToken);
    const token = await client.tokens.create();

    const iceServers = (token.iceServers || []).map((s) => ({
      urls: Array.isArray(s.urls) ? s.urls : [s.urls],
      username: s.username,
      credential: s.credential,
    }));

    return { iceServers };
  } catch (error) {
    console.error("[ice-config] Twilio token error:", error);
    throw new HttpError(500, "Failed to generate ICE server configuration");
  }
}
