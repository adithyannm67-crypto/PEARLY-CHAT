type IceServer = { urls: string; username?: string; credential?: string };

const DEFAULT_ICE_SERVERS: IceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function parseStunServers(): IceServer[] {
  const raw = process.env.NEXT_PUBLIC_STUN_URLS;
  if (!raw) return DEFAULT_ICE_SERVERS;

  return raw
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ urls: url }));
}

function buildIceServers(): IceServer[] {
  const servers = [...parseStunServers()];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}

export type { IceServer };
export { DEFAULT_ICE_SERVERS, buildIceServers };
