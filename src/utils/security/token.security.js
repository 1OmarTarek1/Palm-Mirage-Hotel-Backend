import jwt from "jsonwebtoken";
import * as dbService from "../../DB/db.service.js";
import { userModel } from "../../DB/Model/User.model.js";

export const tokenTypes = {
  access: "access",
  refresh: "refresh",
};

export const decodeToken = async ({ authorization = "", tokenType = tokenTypes.access, next } = {}) => {
  const [bearer, token] = authorization?.split(" ") || [];

  if (!bearer || !token) {
    return next(new Error("authorization is required or In-valid formate ", { cause: 400 }));
  }
  let accessSignature = "";
  let refreshSignature = "";
  switch (bearer) {
    case "System":
      accessSignature = process.env.SYSTEM_ACCESS_TOKEN;
      refreshSignature = process.env.SYSTEM_REFRESH_TOKEN;
      break;
    case "Bearer":
      accessSignature = process.env.USER_ACCESS_TOKEN;
      refreshSignature = process.env.USER_REFRESH_TOKEN;
      break;

    default:
      break;
  }

  let decoded;
  try {
    decoded = verifyToken({
      token,
      signature: tokenType === tokenTypes.access ? accessSignature : refreshSignature,
    });
  } catch (jwtErr) {
    // Fallback: if "Bearer" token fails with USER key, try SYSTEM key (admin using website)
    if (bearer === "Bearer") {
      try {
        decoded = verifyToken({
          token,
          signature: tokenType === tokenTypes.access
            ? process.env.SYSTEM_ACCESS_TOKEN
            : process.env.SYSTEM_REFRESH_TOKEN,
        });
      } catch (_) {
        return next(new Error("In-valid token", { cause: 400 }));
      }
    } else {
      return next(new Error("In-valid token", { cause: 400 }));
    }
  }
  if (!decoded?.id) {
    return next(new Error("In-valid  token payload", { cause: 400 }));
  }
  /////
  const user = await dbService.findOne({ model: userModel, filter: { _id: decoded.id } });
  if (!user) {
    return next(new Error("In-valid account ", { cause: 404 }));
  }
  if (user.deletedAt) {
    return next(new Error("This account has been deleted", { cause: 401 }));
  }

  if (user.changeCredentialTime?.getTime() >= decoded.iat * 1000) {
    return next(new Error("In-valid  credentials", { cause: 400 }));
  }
  return user;
};

export const generateToken = ({
  payload = {},
  signature = process.env.USER_ACCESS_TOKEN,
  expiresIn = parseInt(process.env.EXPIRESIN) || 86400,
} = {}) => {
  const token = jwt.sign(payload, signature, { expiresIn });
  return token;
};

export const verifyToken = ({ token = "", signature = process.env.USER_ACCESS_TOKEN } = {}) => {
  const decoded = jwt.verify(token, signature);
  return decoded;
};
