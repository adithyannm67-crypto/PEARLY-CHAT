export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

if (!SERVER_URL) {
  throw new Error(
    'NEXT_PUBLIC_SERVER_URL must be set in environment variables',
  );
}
