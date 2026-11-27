import mongoose from "mongoose";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { startUnlockScheduler } from "./jobs/unlockScheduler.js";

async function startServer() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });

  const scheduler = startUnlockScheduler();

  // Hosts send SIGTERM before stopping the server: finish cleanly.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    scheduler.stop();
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

startServer();
