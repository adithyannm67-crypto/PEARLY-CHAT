import parseBody from "#utils/parseBody.js";
import { listUsers, updateUser } from "../../services/chatService.js";

export default async function handler(req) {
  const { searchParams } = new URL(req.url, "http://localhost");

  if (req.method === "GET") {
    const excludeUserId = searchParams.get("excludeUserId");
    return { users: await listUsers(excludeUserId) };
  }

  if (req.method === "PATCH") {
    const body = await parseBody(req);
    const { userId, name, username } = body;

    if (!userId) {
      throw new Error("userId is required");
    }

    const updates = {};
    if (name !== undefined) updates.full_name = name;
    if (username !== undefined) updates.username = username;

    return { user: await updateUser(userId, updates) };
  }

  throw new Error("Method not allowed. Only GET and PATCH requests are accepted.");
}
