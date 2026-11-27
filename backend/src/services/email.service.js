import fs from "node:fs";
import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.EMAIL_API_KEY ? new Resend(env.EMAIL_API_KEY) : null;

if (!resend) {
  console.warn(
    "EMAIL_API_KEY is not set: emails will be printed to the console instead of sent."
  );
}

const loadTemplate = (name) =>
  fs.readFileSync(new URL(`../templates/${name}`, import.meta.url), "utf8");

const templates = {
  received: loadTemplate("capsuleReceived.html"),
  unlocked: loadTemplate("capsuleUnlocked.html"),
};

// Titles and names come from users, so they must never be able to inject HTML.
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );

const render = (template, vars) =>
  template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => escapeHtml(vars[key] ?? ""));

const oneLine = (value) => String(value).replace(/[\r\n]+/g, " ");

const formatUtc = (date) =>
  `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(date))} UTC`;

export const openLink = (token) => `${env.CLIENT_URL}/open/${token}`;

export async function sendEmail({ to, subject, html, text }) {
  if (!resend) {
    // Forgetting the key in production must fail loudly, not silently "succeed".
    if (env.isProduction) {
      throw new Error("Email is not configured (EMAIL_API_KEY is missing)");
    }
    console.log(`\n--- EMAIL (not sent, no EMAIL_API_KEY) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n------------------------------------------\n`);
    return;
  }

  // Resend reports problems in `error` instead of throwing.
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// "Someone sent you a capsule" - sent right when it is created.
export async function sendCapsuleReceivedEmail({ to, senderName, title, unlockAt, token }) {
  const link = openLink(token);
  const unlockDate = formatUtc(unlockAt);
  await sendEmail({
    to,
    subject: oneLine(`${senderName} sent you a time capsule`),
    html: render(templates.received, { senderName, title, unlockDate, link }),
    text: `${senderName} sent you a time capsule called "${title}".\n\nIt is sealed until ${unlockDate}. We will email you again when it is ready.\n\nYour link: ${link}`,
  });
}

// "It's ready" - sent by the scheduler when the unlock time arrives.
export async function sendCapsuleUnlockedEmail({ to, fromLine, title, token }) {
  const link = openLink(token);
  await sendEmail({
    to,
    subject: oneLine(`Your time capsule "${title}" is ready to open`),
    html: render(templates.unlocked, { fromLine, title, link }),
    text: `A time capsule from ${fromLine} called "${title}" is ready to open.\n\nOpen it here: ${link}`,
  });
}
