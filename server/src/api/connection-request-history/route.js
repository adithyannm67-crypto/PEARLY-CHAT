import HttpError from "#utils/HttpError.js";
import withAuth from "#utils/withAuth.js";
import { listConnectionRequestHistory } from "../../services/connectionRequestService.js";

export default async function handler(req) {
  const { user, accessToken } = await withAuth(req);

  if (req.method !== "GET") {
    throw new HttpError(405, "Method not allowed. Only GET is accepted.");
  }

  const requests = await listConnectionRequestHistory(user.id, accessToken);
  return { requests };
}
