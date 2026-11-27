import cloudinary, { cloudinaryEnabled } from "../config/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";

function uploadOne(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        // "authenticated" means the image can't be fetched without a signed URL,
        // so a photo can't be viewed early even if someone learns its id.
        type: "authenticated",
        allowed_formats: ["jpg", "png", "webp"],
      },
      (error, result) =>
        error ? reject(error) : resolve({ publicId: result.public_id })
    );
    stream.end(buffer);
  });
}

// Uploads all files. If any one fails, the ones that worked are removed again.
export async function uploadImages(files, folder) {
  if (files.length === 0) return [];

  if (!cloudinaryEnabled) {
    throw new ApiError(503, "Photo uploads are not available right now");
  }

  const results = await Promise.allSettled(
    files.map((file) => uploadOne(file.buffer, folder))
  );
  const uploaded = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  if (uploaded.length !== results.length) {
    await deleteImages(uploaded.map((p) => p.publicId));
    const failed = results.find((r) => r.status === "rejected");
    console.error("Photo upload failed:", failed.reason?.message || failed.reason);
    throw new ApiError(502, "Could not upload your photos. Please try again.");
  }

  return uploaded;
}

export async function deleteImages(publicIds) {
  if (!cloudinaryEnabled || publicIds.length === 0) return;
  try {
    await cloudinary.api.delete_resources(publicIds, {
      type: "authenticated",
      resource_type: "image",
    });
  } catch (error) {
    console.error("Could not delete images from Cloudinary:", error.message);
  }
}

// A link that works only because it carries a signature made with our secret.
export function signedPhotoUrl(publicId) {
  return cloudinary.url(publicId, {
    type: "authenticated",
    resource_type: "image",
    sign_url: true,
    secure: true,
  });
}
