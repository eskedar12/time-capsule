import dotenv from "dotenv";

dotenv.config({ quiet: true });

const required = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing environment variable(s): ${missing.join(", ")}`);
}

if (process.env.JWT_SECRET.length < 16) {
  throw new Error("JWT_SECRET must be at least 16 characters long");
}

// CLIENT_URL may hold several comma-separated addresses (e.g. local + deployed).
const clientUrls = process.env.CLIENT_URL.split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// Limits shared by the model, upload middleware, validation and error messages.
export const limits = {
  MAX_PHOTOS: 5,
  MAX_PHOTO_BYTES: 5 * 1024 * 1024, // 5 MB per photo
  MAX_YEARS_AHEAD: 50,
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  PORT: Number(process.env.PORT) || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  CLIENT_URLS: clientUrls,
  CLIENT_URL: clientUrls[0], // used when building links inside emails
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
  EMAIL_API_KEY: process.env.EMAIL_API_KEY || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "Time Capsule <onboarding@resend.dev>",
};
