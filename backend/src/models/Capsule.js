import mongoose from "mongoose";
import crypto from "crypto";

const photoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const capsuleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 5000, select: false },
    photos: {
      type: [photoSchema],
      default: [],
      select: false,
      validate: {
        validator: (list) => list.length <= 10,
        message: "A capsule can have at most 10 photos",
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
    accessToken: {
      type: String,
      default: () => crypto.randomBytes(32).toString("hex"),
      unique: true,
      select: false,
    },
    emailSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

capsuleSchema.index({ emailSentAt: 1, unlockAt: 1 });

capsuleSchema.virtual("isLocked").get(function () {
  return this.unlockAt.getTime() > Date.now();
});

export default mongoose.model("Capsule", capsuleSchema);