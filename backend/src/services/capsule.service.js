import Capsule from "../models/Capsule.js";
import { ApiError } from "../utils/ApiError.js";
import { signedPhotoUrl } from "./upload.service.js";

const sameId = (a, b) => String(a) === String(b);

// The one place that decides whether a capsule is open. Everything else calls this.
export const isLocked = (capsule) =>
  new Date(capsule.unlockAt).getTime() > Date.now();

// Only the sender, or the person the capsule was addressed to, may look at it.
export function canAccess(capsule, user) {
  const senderId = capsule.sender?._id ?? capsule.sender;
  return sameId(senderId, user._id) || capsule.recipientEmail === user.email;
}

// Safe-to-share fields only. Contains no message and no photos.
function baseView(capsule, viewerId) {
  const senderId = capsule.sender?._id ?? capsule.sender;
  const view = {
    id: String(capsule._id),
    title: capsule.title,
    senderName: capsule.sender?.name ?? "Someone",
    unlockAt: capsule.unlockAt,
    createdAt: capsule.createdAt,
    isLocked: isLocked(capsule),
    serverTime: new Date(), // lets the browser correct for a wrong clock
  };

  if (viewerId && sameId(senderId, viewerId)) {
    view.isSender = true;
    view.recipientEmail = capsule.recipientEmail;
  }
  return view;
}

// For lists and for locked capsules: never includes content.
export function presentSummary(capsule, viewerId = null) {
  return baseView(capsule, viewerId);
}

// For a single capsule: adds the message and photos, but only once it has unlocked.
export async function presentCapsule(capsule, viewerId = null) {
  const view = baseView(capsule, viewerId);
  if (view.isLocked) return view;

  const content = await Capsule.findById(capsule._id)
    .select("+message +photos")
    .lean();
  if (!content) throw new ApiError(404, "Capsule not found");

  view.message = content.message;
  view.photos = (content.photos ?? []).map((photo) => ({
    url: signedPhotoUrl(photo.publicId),
  }));
  return view;
}
