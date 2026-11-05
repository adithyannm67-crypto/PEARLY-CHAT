import HttpError from "#utils/HttpError.js";

export default function parseBody(req, maxSize = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"];

    if (!contentType || !contentType.includes("application/json")) {
      return reject(new HttpError(415, "Content-Type must be application/json"));
    }

    let body = "";
    let size = 0;
    let finished = false;

    function fail(error) {
      if (finished) return;
      finished = true;
      reject(error);
    }

    req.on("data", (chunk) => {
      if (finished) return;

      size += chunk.length;

      if (size > maxSize) {
        return fail(new HttpError(413, "Request body too large"));
      }

      body += chunk.toString("utf8");
    });

    req.on("end", () => {
      if (finished) return;

      if (!body.trim()) {
        return fail(new HttpError(400, "Request body cannot be empty"));
      }

      try {
        const parsedBody = JSON.parse(body);

        if (typeof parsedBody !== "object" || parsedBody === null) {
          return fail(new HttpError(400, "JSON body must be an object or array"));
        }

        finished = true;
        resolve(parsedBody);
      } catch {
        fail(new HttpError(400, "Invalid JSON format"));
      }
    });

    req.on("aborted", () => {
      fail(new HttpError(400, "Request was aborted"));
    });

    req.on("error", () => {
      fail(new HttpError(400, "Error reading request body"));
    });

    req.on("close", () => {
      if (!req.complete) {
        fail(new HttpError(400, "Request connection closed prematurely"));
      }
    });
  });
}
