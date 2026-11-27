import mongoose from "mongoose";
import crypto from "crypto";
import { limits } from "../config/env.js";
import "./User.js"; // makes sure the User model exists for populate("sender")

// Photos live on Cloudinary. We keep only the id; signed URLs are made on demand after unlock.
const photoSchema = new mongoose.Schema(
  { publicId: { type: String, required: true } },
  { _id: false }
);

const capsuleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },

    // Locked content: never loaded unless a query explicitly asks (+message +photos).
    message: { type: String, required: true, maxlength: 5000, select: false },
    photos: {
      type: [photoSchema],
      default: [],
      select: false,
      validate: {
        validator: (list) => list.length <= limits.MAX_PHOTOS,
        message: `A capsule can have at most ${limits.MAX_PHOTOS} photos`,
      },
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Always stored in UTC.
    unlockAt: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.isNew || value.getTime() > Date.now();
        },
        message: "Unlock date must be in the future",
      },
    },

    // Secret key for the link in the recipient's email. Never returned by the API.
    accessToken: {
      type: String,
      default: () => crypto.randomBytes(32).toString("hex"),
      unique: true,
      select: false,
    },

    // Unlock-email bookkeeping used by the scheduler.
    emailSentAt: { type: Date, default: null },
    emailClaimedAt: { type: Date, default: null },
    emailAttempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Speeds up the scheduler's "which capsules are due and not yet emailed?" query.
capsuleSchema.index({ emailSentAt: 1, unlockAt: 1 });

export default mongoose.model("Capsule", capsuleSchema);
