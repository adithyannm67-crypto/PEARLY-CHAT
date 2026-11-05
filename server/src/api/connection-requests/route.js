import parseBody from "#utils/parseBody.js";
import HttpError from "#utils/HttpError.js";
import isUuid from "#utils/isUuid.js";
import withAuth from "#utils/withAuth.js";
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  createConnectionRequest,
  listConnectionRequests,
  rejectConnectionRequest,
} from "../../services/connectionRequestService.js";

export default async function handler(req) {
  const { user, accessToken } = await withAuth(req);

  if (req.method === "GET") {
    const { searchParams } = new URL(req.url, "http://localhost");
    const direction = searchParams.get("direction") || "incoming";
    const status = searchParams.get("status") || "pending";

    if (direction !== "incoming" && direction !== "outgoing") {
      throw new HttpError(400, "direction must be incoming or outgoing");
    }

    if (!["pending", "accepted", "rejected", "all"].includes(status)) {
      throw new HttpError(400, "status must be pending, accepted, rejected, or all");
    }

    const requests = await listConnectionRequests(
      user.id,
      accessToken,
      direction,
      status.toUpperCase()
    );

    return { requests };
  }

  if (req.method === "POST") {
    const body = await parseBody(req);
    const { receiverId } = body;

    if (!isUuid(receiverId)) {
      throw new HttpError(400, "A valid receiverId is required");
    }

    if (receiverId === user.id) {
      throw new HttpError(
        400,
        "You cannot send a connection request to yourself"
      );
    }

    const request = await createConnectionRequest(
      user.id,
      receiverId,
      accessToken
    );

    return { request };
  }

  if (req.method === "PATCH") {
    const body = await parseBody(req);
    const { requestId, action } = body;

    if (!isUuid(requestId)) {
      throw new HttpError(400, "A valid requestId is required");
    }

    if (action === "accept") {
      return acceptConnectionRequest(user.id, requestId, accessToken);
    }

    if (action === "reject") {
      return rejectConnectionRequest(user.id, requestId, accessToken);
    }

    if (action === "cancel") {
      return cancelConnectionRequest(user.id, requestId, accessToken);
    }

    throw new HttpError(400, "action must be accept or reject");
  }

  throw new HttpError(
    405,
    "Method not allowed. Only GET, POST and PATCH are accepted."
  );
}
