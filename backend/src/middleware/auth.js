import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyToken } from "../utils/generateToken.js";

// Requires "Authorization: Bearer <token>". On success, req.user is the logged-in user.
export async function protect(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "Please log in to continue");
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, "Your session has expired. Please log in again.");
  }

  const user = await User.findById(payload.id);
  if (!user) {
    throw new ApiError(401, "Your session has expired. Please log in again.");
  }

  req.user = user;
  next();
}
