export default function parseBody(req, maxSize = 1024 * 1024) {
    return new Promise((resolve, reject) => {

        // 1. Validate Content-Type
        const contentType = req.headers["content-type"];

        if (!contentType ||
            !contentType.includes("application/json")) {
            return reject(
                new Error(415, "Content-Type must be application/json")
            );
        }

        let body = "";
        let size = 0;
        let finished = false;

        function fail(error) {
            if (finished) return;

            finished = true;
            reject(error);
        }

        // 2. Handle incoming data
        req.on("data", (chunk) => {
            if (finished) return;

            size += chunk.length;

            // 3. Payload size validation
            if (size > maxSize) {
                return fail(
                    new HttpError(413, "Request body too large")
                );
            }

            body += chunk.toString("utf8");
        });

        // 4. Handle end of request
        req.on("end", () => {
            if (finished) return;

            if (!body.trim()) {
                return fail(
                    new Error(400, "Request body cannot be empty")
                );
            }

            try {
                const parsedBody = JSON.parse(body);

                // 5. Ensure JSON is an object or array
                if (
                    typeof parsedBody !== "object" ||
                    parsedBody === null
                ) {
                    return fail(
                        new Error(400, "JSON body must be an object or array")
                    );
                }

                finished = true;
                resolve(parsedBody);

            } catch {
                fail(
                    new Error(400, "Invalid JSON format")
                );
            }
        });

        // 6. Handle aborted request
        req.on("aborted", () => {
            fail(
                new Error(400, "Request was aborted")
            );
        });

        // 7. Handle stream errors
        req.on("error", () => {
            fail(
                new Error(400, "Error reading request body")
            );
        });

        // 8. Handle premature close
        req.on("close", () => {
            if (!req.complete) {
                fail(
                    new Error(400, "Request connection closed prematurely")
                );
            }
        });
    });
}