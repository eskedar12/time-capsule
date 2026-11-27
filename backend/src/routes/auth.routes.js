import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.js";
import { validate, registerSchema, loginSchema } from "../middleware/validate.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.get("/me", protect, me);

export default router;
