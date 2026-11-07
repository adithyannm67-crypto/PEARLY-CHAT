import twilio from "twilio";
import withAuth from "#utils/withAuth.js";
import HttpError from "#utils/HttpError.js";


function parseStunServers() {
  const servers = [];

  for (let i = 1; i <= 5; i++) {
    const url = process.env[`NEXT_PUBLIC_STUN_URL_${i}`];
    if (url && url.trim()) {
      servers.push({ urls: url.trim() });
    }
  }

  return servers;
}

export default async function handler(req) {
  const { user } = await withAuth(req);

  if (req.method !== "GET") {
    throw new HttpError(405, "Method not allowed. Only GET is accepted.");
  }

  const iceServers =parseStunServers();

  // Add Twilio TURN credentials if configured (optional, not required)
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  console.log("======ICE CONFIG=====", accountSid,"   ", authToken);
  if (!accountSid || !authToken) {
    throw new HttpError(500, "Twilio credentials not configured on server");
  }

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
console.log("[ice-config] iceServers:", iceServers);
  return { iceServers };
}
