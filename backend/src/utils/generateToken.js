import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(userId) {
  return jwt.sign({ id: String(userId) }, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}