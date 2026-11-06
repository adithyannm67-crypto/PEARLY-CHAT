import http from "http";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { setupSignaling } from "./ws/signaling.js";
import signinHandler from "./api/auth/signin/route.js";
import signupHandler from "./api/auth/signup/route.js";
import logoutHandler from "./api/auth/logout/route.js";
import conversationsHandler from "./api/conversations/route.js";
import connectionRequestsHandler from "./api/connection-requests/route.js";
import connectionRequestHistoryHandler from "./api/connection-request-history/route.js";
import messagesHandler from "./api/messages/route.js";
import usersHandler from "./api/users/route.js";
import * as responseHandler from "#utils/responseHandler.js";
import handlePreflight from "#utils/handlePreflight.js";
import parseCookies from "#utils/parseCookies.js";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

const server = http.createServer(async (req, res) => {
  if (handlePreflight(req, res)) return;

  if (!isProduction) {
    console.log(req.method, req.url);
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  req.cookies = parseCookies(req);

  try {
    let output;

    if (pathname === "/api/auth/signin") {
      output = await signinHandler(req, res);
    } else if (pathname === "/api/auth/signup") {
      output = await signupHandler(req, res);
    } else if (pathname === "/api/auth/logout") {
      output = await logoutHandler(req, res);
    } else if (pathname === "/api/conversations") {
      output = await conversationsHandler(req, res);
    } else if (pathname === "/api/connection-requests/history") {
      output = await connectionRequestHistoryHandler(req, res);
    } else if (pathname === "/api/connection-requests") {
      output = await connectionRequestsHandler(req, res);
    } else if (pathname === "/api/messages") {
      output = await messagesHandler(req, res);
    } else if (pathname === "/api/users") {
      output = await usersHandler(req, res);
    } else {
      responseHandler.notFoundResponse(res, "Route not found");
      return;
    }

    if (!res.headersSent) {
      responseHandler.successResponse(res, output);
    }
  } catch (error) {
    console.error(`[${req.method} ${pathname}]`, error?.message || error);
    if (!isProduction && error?.stack) {
      console.error(error.stack);
    }

    if (!res.headersSent) {
      const status = Number(error?.status) || 500;
      const message =
        status >= 500 && isProduction
          ? "Internal server error"
          : error?.message || "Internal server error";
      responseHandler.errorResponse(res, message, status);
    }
  }
});

const wss = new WebSocketServer({ server });

setupSignaling(wss);

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Peerly server running on port ${PORT}`);
});
