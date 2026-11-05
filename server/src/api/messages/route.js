import parseBody from "#utils/parseBody.js";
import HttpError from "#utils/HttpError.js";
import isUuid from "#utils/isUuid.js";
import withAuth from "#utils/withAuth.js";
import {
  createMessage,
  getMessages,
  isConversationParticipant,
} from "../../services/chatService.js";

export default async function handler(req) {
  const { user, accessToken } = await withAuth(req);

  if (req.method === "GET") {
    const { searchParams } = new URL(req.url, "http://localhost");
    const conversationId = searchParams.get("conversationId");

    if (!isUuid(conversationId)) {
      throw new HttpError(400, "A valid conversationId is required");
    }

    const allowed = await isConversationParticipant(
      conversationId,
      user.id,
      accessToken,
    );

    if (!allowed) {
      throw new HttpError(403, "You do not have access to this conversation");
    }

    return { messages: await getMessages(conversationId, accessToken) };
  }

  if (req.method === "POST") {
    const body = await parseBody(req);
    const { conversationId, content } = body;

    if (!isUuid(conversationId) || typeof content !== "string" || !content.trim()) {
      throw new HttpError(400, "A valid conversationId and content are required");
    }

    const allowed = await isConversationParticipant(
      conversationId,
      user.id,
      accessToken,
    );

    if (!allowed) {
      throw new HttpError(403, "You do not have access to this conversation");
    }

    const message = await createMessage({
      conversationId,
      senderId: user.id,
      content: content.trim(),
      accessToken,
    });

    return { message };
  }

  throw new HttpError(405, "Method not allowed. Only GET and POST are accepted.");
}
