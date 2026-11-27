import cron from "node-cron";
import Capsule from "../models/Capsule.js";
import { sendCapsuleUnlockedEmail } from "../services/email.service.js";

const MAX_ATTEMPTS = 5; // give up after this many failed sends
const LEASE_MS = 10 * 60 * 1000; // a failed send is retried after this long
const BATCH_LIMIT = 50; // capsules handled per run

let running = false;

// "Check out" one due capsule. The update repeats the due-conditions in its filter,
// so if two runs (or two servers) race for the same capsule, only one update
// succeeds and the other moves on. That is what prevents double emails.
async function claimNext() {
  for (let tries = 0; tries < 5; tries++) {
    const now = new Date();
    const due = {
      emailSentAt: null,
      unlockAt: { $lte: now },
      emailAttempts: { $lt: MAX_ATTEMPTS },
      $or: [
        { emailClaimedAt: null },
        { emailClaimedAt: { $lt: new Date(now.getTime() - LEASE_MS) } },
      ],
    };

    const candidate = await Capsule.findOne(due)
      .sort({ unlockAt: 1 })
      .select("_id")
      .lean();
    if (!candidate) return null; // nothing is due

    const claim = await Capsule.updateOne(
      { _id: candidate._id, ...due },
      { $set: { emailClaimedAt: now }, $inc: { emailAttempts: 1 } }
    );
    if (claim.modifiedCount === 1) {
      return Capsule.findById(candidate._id)
        .select("+accessToken")
        .populate("sender", "name email");
    }
    // Someone else claimed it first: look for the next one.
  }
  return null;
}

export async function runUnlockJob() {
  if (running) return; // previous run still going
  running = true;

  try {
    for (let i = 0; i < BATCH_LIMIT; i++) {
      const capsule = await claimNext();
      if (!capsule) break;

      try {
        const isSelf = capsule.sender?.email === capsule.recipientEmail;
        await sendCapsuleUnlockedEmail({
          to: capsule.recipientEmail,
          fromLine: isSelf ? "your past self" : capsule.sender?.name ?? "someone",
          title: capsule.title,
          token: capsule.accessToken,
        });

        // Only now is it recorded as sent.
        await Capsule.updateOne(
          { _id: capsule._id },
          { $set: { emailSentAt: new Date() } }
        );
        console.log(`Unlock email sent for capsule ${capsule._id}`);
      } catch (error) {
        // emailClaimedAt stays set, so it is retried after LEASE_MS, not immediately.
        console.error(
          `Unlock email failed for capsule ${capsule._id} (attempt ${capsule.emailAttempts}/${MAX_ATTEMPTS}):`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("Unlock job error:", error.message);
  } finally {
    running = false;
  }
}

export function startUnlockScheduler() {
  runUnlockJob(); // catch up on anything that came due while the server was off
  const task = cron.schedule("* * * * *", runUnlockJob); // then every minute
  console.log("Unlock scheduler started (checks every minute)");
  return task;
}
