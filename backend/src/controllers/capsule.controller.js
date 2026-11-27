import Capsule from "../models/Capsule.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadImages, deleteImages } from "../services/upload.service.js";
import { sendCapsuleReceivedEmail } from "../services/email.service.js";
import {
  canAccess,
  presentCapsule,
  presentSummary,
} from "../services/capsule.service.js";

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const ACCESS_TOKEN = /^[a-f0-9]{64}$/;

// POST /api/capsules
export async function createCapsule(req, res) {
  const { title, message, unlockAt, recipientEmail } = req.body;
  const to = recipientEmail || req.user.email; // no recipient means "to myself"

  const uploaded = await uploadImages(req.files ?? [], `time-capsule/${req.user.id}`);

  let capsule;
  try {
    capsule = await Capsule.create({
      title,
      message,
      unlockAt,
      sender: req.user._id,
      recipientEmail: to,
      photos: uploaded,
    });
  } catch (error) {
    // Don't leave orphaned photos on Cloudinary if saving failed.
    await deleteImages(uploaded.map((photo) => photo.publicId));
    throw error;
  }

  // Heads-up email for someone else. Best effort: a failure must not undo the capsule.
  if (to !== req.user.email) {
    sendCapsuleReceivedEmail({
      to,
      senderName: req.user.name,
      title,
      unlockAt: capsule.unlockAt,
      token: capsule.accessToken,
    }).catch((error) =>
      console.error("Could not send 'capsule received' email:", error.message)
    );
  }

  await capsule.populate("sender", "name");
  res.status(201).json({ capsule: presentSummary(capsule.toObject(), req.user.id) });
}

// GET /api/capsules?type=mine|sent|received
export async function listCapsules(req, res) {
  const type = req.query.type ?? "mine";
  const { _id: id, email } = req.user;

  const filters = {
    mine: { sender: id, recipientEmail: email }, // to myself
    sent: { sender: id, recipientEmail: { $ne: email } }, // to other people
    received: { recipientEmail: email, sender: { $ne: id } }, // from other people
  };

  if (typeof type !== "string" || !Object.hasOwn(filters, type)) {
    throw new ApiError(400, "type must be mine, sent or received");
  }

  const capsules = await Capsule.find(filters[type])
    .sort({ unlockAt: 1 })
    .limit(200)
    .populate("sender", "name")
    .lean();

  res.json({
    capsules: capsules.map((capsule) => presentSummary(capsule, req.user.id)),
  });
}

// GET /api/capsules/:id
export async function getCapsule(req, res) {
  if (!OBJECT_ID.test(req.params.id)) throw new ApiError(404, "Capsule not found");

  const capsule = await Capsule.findById(req.params.id)
    .populate("sender", "name")
    .lean();

  // Same answer for "doesn't exist" and "not yours", so ids can't be probed.
  if (!capsule || !canAccess(capsule, req.user)) {
    throw new ApiError(404, "Capsule not found");
  }

  res.json({ capsule: await presentCapsule(capsule, req.user.id) });
}

// GET /api/capsules/open/:token  (public: used by the link in the email)
export async function openByToken(req, res) {
  if (!ACCESS_TOKEN.test(req.params.token)) {
    throw new ApiError(404, "Capsule not found");
  }

  const capsule = await Capsule.findOne({ accessToken: req.params.token })
    .populate("sender", "name")
    .lean();
  if (!capsule) throw new ApiError(404, "Capsule not found");

  res.json({ capsule: await presentCapsule(capsule) });
}
