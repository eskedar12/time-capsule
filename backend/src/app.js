import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import capsuleRoutes from "./routes/capsule.routes.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Behind Render's proxy, trust it so rate limits see the real visitor IP.
if (env.isProduction) app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URLS }));
app.use(express.json({ limit: "100kb" }));
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/capsules", capsuleRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
