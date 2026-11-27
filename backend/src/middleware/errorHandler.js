import multer from "multer";
import { ApiError } from "../utils/ApiError.js";
import { limits } from "../config/env.js";

const { MAX_PHOTOS, MAX_PHOTO_BYTES } = limits;

export function notFound(req, res) {
  res.status(404).json({ message: "Route not found" });
}

function multerMessage(err) {
  switch (err.code) {
    case "LIMIT_FILE_SIZE":
      return `Each photo must be smaller than ${MAX_PHOTO_BYTES / 1024 / 1024} MB`;
    case "LIMIT_FILE_COUNT":
    case "LIMIT_UNEXPECTED_FILE":
      return `You can attach up to ${MAX_PHOTOS} photos`;
    default:
      return "Upload failed. Check your photos and try again.";
  }
}

// Express recognises an error handler by its four arguments, so keep `next`.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let message = "Something went wrong. Please try again.";
  let errors;

  if (err instanceof ApiError) {
    status = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = multerMessage(err);
  } else if (err?.name === "ValidationError" && err.errors) {
    status = 400;
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = errors[0]?.message || "Invalid data";
  } else if (err?.name === "CastError") {
    status = 400;
    message = "Invalid ID";
  } else if (err?.code === 11000) {
    status = 409;
    message = "That value is already in use";
  } else if (err?.type === "entity.parse.failed") {
    status = 400;
    message = "Request body is not valid JSON";
  } else if (err?.type === "entity.too.large") {
    status = 413;
    message = "Request body is too large";
  }

  if (status >= 500) console.error(err);

  res.status(status).json({ message, ...(errors && { errors }) });
}
