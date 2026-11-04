import { getConversations, getUser } from "../../services/chatService.js";

export default async function handler(req) {
  if (req.method !== "GET") {
    throw new Error("Method not allowed. Only GET requests are accepted.");
  }

  const { searchParams } = new URL(req.url, "http://localhost");
  const userId = searchParams.get("userId");

  if (!userId) {
    throw new Error("userId is required");
  }

  const [conversations, currentUser] = await Promise.all([
    getConversations(userId),
    getUser(userId),
  ]);

  return { conversations, currentUser };
}
