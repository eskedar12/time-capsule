import { Router } from "express";
import {
  createCapsule,
  listCapsules,
  getCapsule,
  openByToken,
} from "../controllers/capsule.controller.js";
import { protect } from "../middleware/auth.js";
import { validate, createCapsuleSchema } from "../middleware/validate.js";
import { uploadPhotos } from "../middleware/upload.js";
import { tokenLimiter, createCapsuleLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Public: the link in the recipient's email. Must come before "/:id".
router.get("/open/:token", tokenLimiter, openByToken);

// Order matters: log in -> limit -> read the upload -> validate the text fields.
router.post(
  "/",
  protect,
  createCapsuleLimiter,
  ...uploadPhotos,
  validate(createCapsuleSchema),
  createCapsule
);

router.get("/", protect, listCapsules);
router.get("/:id", protect, getCapsule);

export default router;
