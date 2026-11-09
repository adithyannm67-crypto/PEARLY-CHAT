import { authFetch } from "../authFetch";
import { SERVER_URL } from "../serverProxy";

type IceServer = { urls: string; username?: string; credential?: string };

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

  return servers;
}

async function fetchIceServers(): Promise<IceServer[]> {
  try {
    const response = await authFetch(`${SERVER_URL}/api/ice-config`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.data?.iceServers ?? [];
  } catch {
    return [];
  }
}

export type { IceServer };
export { fetchIceServers };

export function hasTurnCredentials(iceServers: IceServer[]): boolean {
  return iceServers.some(
    (s) => s.username && s.credential && s.username.length > 0 && s.credential.length > 0,
  );
}
