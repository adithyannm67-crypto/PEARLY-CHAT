import { authFetch } from "@/lib/authFetch";
import { SERVER_URL } from "@/lib/serverProxy";

type IceServer = { urls: string; username?: string; credential?: string };

export async function fetchIceServers(): Promise<IceServer[]> {
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
