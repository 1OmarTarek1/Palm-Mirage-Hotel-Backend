import { Server } from "socket.io";
import * as dbService from "../DB/db.service.js";
import { allowOrigin } from "../config/origins.js";
import { userModel } from "../DB/Model/User.model.js";
import { verifyToken } from "../utils/security/token.security.js";
import { logger } from "../utils/logger.js";

let ioInstance = null;

const parseCookies = (cookieHeader = "") =>
  cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      accumulator[key] = value;
      return accumulator;
    }, {});

export const initializeSocket = (httpServer) => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(httpServer, {
    cors: {
      origin: allowOrigin,
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie || "");
      const accessToken =
        socket.handshake.auth?.accessToken ||
        socket.handshake.auth?.token ||
        cookies.accessToken;
      const authScheme =
        socket.handshake.auth?.authScheme ||
        socket.handshake.auth?.scheme ||
        "Bearer";

      if (!accessToken) {
        logger.warn("[socket] unauthorized: missing access token");
        return next(new Error("Unauthorized"));
      }

      let decoded;
      try {
        decoded = verifyToken({
          token: accessToken,
          signature:
            authScheme === "System"
              ? process.env.SYSTEM_ACCESS_TOKEN
              : process.env.USER_ACCESS_TOKEN,
        });
      } catch (error) {
        if (authScheme === "Bearer") {
          decoded = verifyToken({
            token: accessToken,
            signature: process.env.SYSTEM_ACCESS_TOKEN,
          });
        } else {
          throw error;
        }
      }

      if (!decoded?.id) {
        logger.warn("[socket] unauthorized: decoded token missing user id");
        return next(new Error("Unauthorized"));
      }

      const user = await dbService.findOne({
        model: userModel,
        filter: { _id: decoded.id },
        select: "_id role changeCredentialTime",
      });

      if (!user) {
        logger.warn("[socket] unauthorized: user not found for token", decoded.id);
        return next(new Error("Unauthorized"));
      }

      if (user.changeCredentialTime?.getTime() >= decoded.iat * 1000) {
        logger.warn("[socket] unauthorized: credentials changed after token issuance", {
          userId: user._id?.toString?.(),
          tokenIat: decoded.iat,
        });
        return next(new Error("Unauthorized"));
      }

      socket.user = {
        id: user._id.toString(),
        role: user.role,
      };

      return next();
    } catch (error) {
      logger.warn("[socket] unauthorized during handshake", error?.message || error);
      return next(new Error("Unauthorized"));
    }
  });

  ioInstance.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.join(`role:${socket.user.role}`);
  });

  return ioInstance;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.io is not initialized");
  }

  return ioInstance;
};

export const emitSocketEvent = ({ room, event, payload }) => {
  if (!ioInstance || !room || !event) {
    return false;
  }

  ioInstance.to(room).emit(event, payload);
  return true;
};
