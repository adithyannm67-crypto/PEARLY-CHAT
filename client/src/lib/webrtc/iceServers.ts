type IceServer = { urls: string; username?: string; credential?: string };

const DEFAULT_ICE_SERVERS: IceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function parseStunServers(): IceServer[] {
  const servers: IceServer[] = [];

  for (let i = 1; i <= 5; i++) {
    const url = (process.env as Record<string, string | undefined>)[
      `NEXT_PUBLIC_STUN_URL_${i}`
    ];
    if (url && url.trim()) {
      servers.push({ urls: url.trim() });
    }
  }

  return servers.length > 0 ? servers : DEFAULT_ICE_SERVERS;
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
