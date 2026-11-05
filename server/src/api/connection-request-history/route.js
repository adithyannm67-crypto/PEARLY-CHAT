import withAuth from "#utils/withAuth.js";
import { listConnectionRequestHistory } from "../../services/connectionRequestService.js";

export default async function handler(req) {
  const { user, accessToken } = await withAuth(req);

  if (req.method !== "GET") {
    throw new Error("Method not allowed");
  }

  const requests = await listConnectionRequestHistory(user.id, accessToken);
  return { requests };
}
