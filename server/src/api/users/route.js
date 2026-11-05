import parseBody from "#utils/parseBody.js";
import HttpError from "#utils/HttpError.js";
import isUuid from "#utils/isUuid.js";
import withAuth from "#utils/withAuth.js";
import { listUsers, updateUser } from "../../services/chatService.js";

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export default async function handler(req) {
  const { user, accessToken } = await withAuth(req);

  if (req.method === "GET") {
    const { searchParams } = new URL(req.url, "http://localhost");
    const excludeUserId = searchParams.get("excludeUserId");
    const search = searchParams.get("search") || "";

    if (excludeUserId && !isUuid(excludeUserId)) {
      throw new HttpError(400, "Invalid excludeUserId");
    }

    return {
      users: await listUsers(excludeUserId || user.id, accessToken, search),
    };
  }

  if (req.method === "PATCH") {
    const body = await parseBody(req);
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const username =
      typeof body.username === "string" ? body.username.trim().toLowerCase() : undefined;

    if (name !== undefined && !name) {
      throw new HttpError(400, "Name cannot be empty");
    }

    if (username !== undefined && !USERNAME_PATTERN.test(username)) {
      throw new HttpError(
        400,
        "Username must be 3-30 characters and contain only letters, numbers, or underscores",
      );
    }

    if (name === undefined && username === undefined) {
      throw new HttpError(400, "No profile fields to update");
    }

    const updates = {};
    if (name !== undefined) updates.full_name = name;
    if (username !== undefined) updates.username = username;

    return { user: await updateUser(user.id, updates, accessToken) };
  }

  throw new HttpError(405, "Method not allowed. Only GET and PATCH are accepted.");
}
