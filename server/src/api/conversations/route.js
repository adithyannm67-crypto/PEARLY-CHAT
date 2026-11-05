import parseBody from "#utils/parseBody.js";
import HttpError from "#utils/HttpError.js";
import isUuid from "#utils/isUuid.js";
import withAuth from "#utils/withAuth.js";
import {
  getConversations,
  getOrCreateDirectConversation,
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

  if (req.method === "POST") {
    const body = await parseBody(req);
    const { otherUserId } = body;

    if (!isUuid(otherUserId)) {
      throw new HttpError(400, "A valid otherUserId is required");
    }

    if (otherUserId === user.id) {
      throw new HttpError(400, "You cannot start a conversation with yourself");
    }

    const conversation = await getOrCreateDirectConversation(
      user.id,
      otherUserId,
      accessToken,
    );

    return { conversation };
  }

  throw new HttpError(405, "Method not allowed. Only GET and POST are accepted.");
}
