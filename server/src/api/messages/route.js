import parseBody from "#utils/parseBody.js";
import {
  createMessage,
  getMessages,
} from "../../services/chatService.js";

export default async function handler(req) {
  const { searchParams } = new URL(req.url, "http://localhost");

  if (req.method === "GET") {
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      throw new Error("conversationId is required");
    }

    return { messages: await getMessages(conversationId) };
  }

  if (req.method === "POST") {
    const body = await parseBody(req);
    const { conversationId, senderId, content } = body;

    if (!conversationId || !senderId || !content?.trim()) {
      throw new Error("conversationId, senderId and content are required");
    }

    const message = await createMessage({
      conversationId,
      senderId,
      content: content.trim(),
    });

    return { message };
  }

  throw new Error("Method not allowed. Only GET and POST requests are accepted.");
}
