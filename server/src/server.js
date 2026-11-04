import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import dotenv from "dotenv";

import {
  successResponse,
  errorResponse,
  notFoundResponse,
} from "#utils/responseHandler.js";

import signupHandler from "./api/auth/signup/route.js";
import signinHandler from "./api/auth/signin/route.js";

dotenv.config();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const server = http.createServer(async (req, res) => {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  res.setHeader("Content-Type", "application/json");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(req.method, req.url);
  try {
    let output = null;
    // Auth routes
    if (req.method === "POST" && req.url === "/api/auth/signin") {
      output = await signinHandler(req, res);
    } else if (req.method === "POST" && req.url === "/api/auth/signup") {
      output = await signupHandler(req, res);
    } else if (req.method === "GET" && req.url === "/api/auth/status") {
      // Check auth status
    }

    // Existing routes
    else if (req.method === "POST" && req.url === "/api/request-connection") {
      // const createConnectionRequest = (await import("./services/getUserService.js")).default;
      // createConnectionRequest(req, res);
      return;
    } else {
      notFoundResponse(res, "Route not found");
      return;
    }

    successResponse(res, output);
  } catch (error) {
    console.error(error);
    errorResponse(res, error.message);
  }
});

function createRequest(req, res) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    try {
      const data = JSON.parse(body);

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });

      res.end(
        JSON.stringify({
          data,
          success: true,
          message: "Submission received",
        }),
      );
    } catch (error) {
      res.writeHead(400, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          success: false,
          error: "Invalid JSON",
        }),
      );
    }
  });
}

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log("A client connected");

  socket.on("message", (message) => {
    console.log("Received:", message.toString());
  });

  socket.on("close", () => {
    console.log("A client disconnected");
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Peerly server running on port ${PORT}`);
});
