export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

export function requireServerUrl(): string {
  if (!SERVER_URL) {
    throw new Error(
      'NEXT_PUBLIC_SERVER_URL must be set in environment variables',
    );
  }
  return SERVER_URL;
}
