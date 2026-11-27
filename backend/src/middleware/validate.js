import { z } from "zod";
import { ApiError } from "../utils/ApiError.js";
import { limits } from "../config/env.js";

// ---------------------------------------------------------------------------
// The middleware. Usage: router.post("/", validate(someSchema), controller)
// Replaces req.body with the cleaned data and drops any fields the schema doesn't know.
// ---------------------------------------------------------------------------
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    throw new ApiError(400, errors[0].message, errors);
  }

  req.body = result.data;
  next();
};

// ---------------------------------------------------------------------------
// Schemas: the rules each request body must follow.
// ---------------------------------------------------------------------------
const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254, "Email is too long");

export const registerSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(60, "Name must be at most 60 characters"),
  email,
  // bcrypt only uses the first 72 bytes, so longer passwords add nothing.
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

export const loginSchema = z.object({
  email,
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required")
    .max(72, "Password is too long"),
});

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export const createCapsuleSchema = z.object({
  title: z
    .string({ error: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be at most 100 characters"),

  message: z
    .string({ error: "Message is required" })
    .trim()
    .min(1, "Message is required")
    .max(5000, "Message must be at most 5000 characters"),

  // Must carry a timezone (e.g. "2030-01-01T09:00:00.000Z") so there is no guessing.
  // The browser should send new Date(value).toISOString().
  unlockAt: z.iso
    .datetime({
      offset: true,
      error: "Unlock date must be an ISO date with a timezone, e.g. 2030-01-01T09:00:00Z",
    })
    .transform((value) => new Date(value))
    .refine((date) => date.getTime() > Date.now(), "Unlock date must be in the future")
    .refine(
      (date) => date.getTime() < Date.now() + limits.MAX_YEARS_AHEAD * YEAR_MS,
      `Unlock date must be within ${limits.MAX_YEARS_AHEAD} years`
    ),

  // Optional: leave empty to send the capsule to yourself.
  recipientEmail: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid recipient email address")
      .max(254, "Recipient email is too long")
      .optional()
  ),
});
