import multer from "multer";
import { ApiError } from "../utils/ApiError.js";
import { limits } from "../config/env.js";

const { MAX_PHOTOS, MAX_PHOTO_BYTES } = limits;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Files are kept in memory briefly, then streamed to Cloudinary. Nothing touches the disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_BYTES,
    files: MAX_PHOTOS,
    fields: 10,
    fieldSize: 64 * 1024,
  },
  fileFilter(req, file, cb) {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, "Only JPG, PNG and WebP photos are allowed"));
    }
    cb(null, true);
  },
});

// The declared type can be faked, so also check the file's first bytes.
function looksLikeImage(buf) {
  if (buf.length < 12) return false;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png =
    buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  const webp =
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || webp;
}

function verifyImages(req, res, next) {
  for (const file of req.files ?? []) {
    if (!looksLikeImage(file.buffer)) {
      throw new ApiError(400, "One of the files is not a valid JPG, PNG or WebP image");
    }
  }
  next();
}

// Use as: router.post("/", ...uploadPhotos, controller)
export const uploadPhotos = [upload.array("photos", MAX_PHOTOS), verifyImages];
