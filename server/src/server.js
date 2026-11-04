import http from "http";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import signinHandler from "./api/auth/signin/route.js";
import signupHandler from "./api/auth/signup/route.js";
import * as responseHandler from "#utils/responseHandler.js";
dotenv.config();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
  "Access-Control-Allow-Credentials": "true",
};

// Secure cookie settings
const COOKIE_SECURE = process.env.NODE_ENV === "production";
const COOKIE_SAME_SITE = "lax";

const server = http.createServer(async (req, res) => {
  // Set CORS headers
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
  let output = null;
  try {
    // Auth routes
    if (req.method === "POST" && req.url === "/api/auth/signin") {
      output = await signinHandler(req, res);
    } else if (req.method === "POST" && req.url === "/api/auth/signup") {
      output = await signupHandler(req, res);
    } else {
      responseHandler.notFoundResponse(res, "Route not found");
      return;
    }

    // Existing routes
    // if (req.method === "POST" && req.url === "/api/request-connection") {
    //   const createConnectionRequest = require("./services/getUserService.js").default;
    //   createConnectionRequest(req, res);
    //   return;
    // }
    responseHandler.successResponse(res, output);
  } catch (error) {
    console.log(error);
    responseHandler.errorResponse(res, error.message);
  }
});

// Middleware to parse cookies
server.on("request", (req, res) => {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    req.cookies = {};
    cookieHeader.split(";").forEach((cookie) => {
      const [key, value] = cookie.trim().split("=");
      req.cookies[key] = value;
    });
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
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Credentials": "true",
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
