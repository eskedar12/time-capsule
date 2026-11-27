import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const MINUTE = 60 * 1000;

const make = (options) =>
  rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test",
    message: { message: "Too many requests. Please wait a bit and try again." },
    ...options,
  });

// Everything under /api.
export const apiLimiter = make({ windowMs: 15 * MINUTE, limit: 300 });

// Wrong-password guessing: only failed logins count.
export const loginLimiter = make({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
});

export const registerLimiter = make({ windowMs: 60 * MINUTE, limit: 10 });

// Guessing recipient links.
export const tokenLimiter = make({ windowMs: 15 * MINUTE, limit: 30 });

// Stops someone using the app to spam emails. Counted per logged-in user.
export const createCapsuleLimiter = make({
  windowMs: 60 * MINUTE,
  limit: 15,
  keyGenerator: (req) => req.user.id,
});
