import HttpError from "#utils/HttpError.js";
import isUuid from "#utils/isUuid.js";
import withAuth from "#utils/withAuth.js";
import {
  deleteConversation,
  getConversations,
  getUser,
} from "../../services/chatService.js";

export default async function handler(req) {
  const { user, accessToken } = await withAuth(req);

  if (req.method === "GET") {
    const [conversations, currentUser] = await Promise.all([
      getConversations(user.id, accessToken),
      getUser(user.id, accessToken),
    ]);

    return { conversations, currentUser };
  }

  if (req.method === "DELETE") {
    const { searchParams } = new URL(req.url, "http://localhost");
    const conversationId = searchParams.get("conversationId");

    if (!isUuid(conversationId)) {
      throw new HttpError(400, "A valid conversationId is required");
    }

    await deleteConversation(user.id, conversationId, accessToken);
    return { success: true };
  }

  throw new HttpError(
    405,
    "Method not allowed. Only GET and DELETE are accepted."
  );
}
