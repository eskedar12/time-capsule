# Time Capsule

A digital time capsule app. Write a message, add photos, and lock them until a future date. Send a capsule to someone else: they can't open it until the date arrives, and they get an email when it unlocks.

## Features

- Create capsules with a message, photos and an unlock date
- Real server-side lock: before the unlock date, the API never returns the message or photos, even to the owner
- Send a capsule to any email address; recipients without an account can open it through a secure link
- Automatic email to the recipient when the capsule unlocks
- Live countdown on locked capsules and a reveal when they open
- Dashboard with three views: My capsules, Sent, Received
- JWT authentication, rate limiting, input validation and upload limits

## Tech stack

| Layer      | Tools                                              |
| ---------- | -------------------------------------------------- |
| Frontend   | React (Vite), React Router, Axios                  |
| Backend    | Node.js, Express                                   |
| Database   | MongoDB Atlas, Mongoose                            |
| Images     | Cloudinary                                         |
| Email      | Resend                                             |
| Scheduling | node-cron                                          |
| Security   | bcryptjs, JWT, helmet, express-rate-limit, zod     |
| Hosting    | Render (API), Vercel (frontend), MongoDB Atlas     |

## How it works

1. A user registers and creates a capsule with a message, photos, an unlock date and an optional recipient email.
2. The unlock date is stored in UTC. Photos go to Cloudinary; only their URLs are stored in MongoDB.
3. While `now < unlockAt`, the API returns only safe fields (sender, unlock date, status). The message and photo URLs are never sent.
4. A cron job runs every minute and finds capsules where `unlockAt <= now` and `emailSentAt` is empty. It emails the recipient with a link, then sets `emailSentAt` so no email is ever sent twice. It also runs once on server startup to catch anything missed while the server was down.
5. Recipients without an account open the capsule through `/open/:token`, which uses a random access token.

## Project structure


time-capsule/
├── frontend/    # React frontend
└── backend/     # Express API, models, cron job, email
