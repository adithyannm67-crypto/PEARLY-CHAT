import parseBody from "#utils/parseBody.js";
import {
  getConversations,
  getOrCreateDirectConversation,
  getUser,
} from "../../services/chatService.js";

export default async function handler(req) {
  const { searchParams } = new URL(req.url, "http://localhost");

  if (req.method === "GET") {
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

  if (req.method === "POST") {
    const body = await parseBody(req);
    const { userId, otherUserId } = body;

    if (!userId || !otherUserId) {
      throw new Error("userId and otherUserId are required");
    }

    const conversation = await getOrCreateDirectConversation(
      userId,
      otherUserId
    );

    return { conversation };
  }

  throw new Error("Method not allowed. Only GET and POST requests are accepted.");
}
