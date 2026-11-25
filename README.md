# Time Capsule

A digital time capsule app. Write a message, add photos, and lock them until a future date. Send a capsule to someone else: they can't open it until the date arrives, and they get an email when it unlocks.

**Live app:** https://your-app-url-here
**API:** https://your-api-url-here
**Repo:** https://github.com/your-username/time-capsule

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

```
time-capsule/
├── frontend/    # React frontend
└── backend/     # Express API, models, cron job, email
```

## Getting started

### Prerequisites

- Node.js 18+
- A MongoDB Atlas database
- A Cloudinary account
- A Resend account

### 1. Clone

```bash
git clone https://github.com/your-username/time-capsule.git
cd time-capsule
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:

```
PORT=5000
MONGO_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_API_KEY=
EMAIL_FROM=
```

Then start it:

```bash
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000/api
```

Then start it:

```bash
npm run dev
```

The app runs at http://localhost:5173.

## API overview

| Method | Endpoint                    | Description                                         |
| ------ | --------------------------- | --------------------------------------------------- |
| POST   | `/api/auth/register`        | Create an account                                   |
| POST   | `/api/auth/login`           | Log in, returns a JWT                               |
| GET    | `/api/auth/me`              | Current user                                        |
| POST   | `/api/capsules`             | Create a capsule (multipart, with photos)           |
| GET    | `/api/capsules`             | List the user's capsules (locked ones are redacted) |
| GET    | `/api/capsules/:id`         | Get one capsule; content only if unlocked           |
| GET    | `/api/capsules/open/:token` | Open a received capsule by token (if unlocked)      |

## Design decisions

- **Server-side lock:** the lock is enforced in the service layer, not the UI. Calling the API directly before the date returns no content.
- **UTC everywhere:** unlock times are stored in UTC and converted to the viewer's local time in the browser.
- **No duplicate emails:** an `emailSentAt` field makes the scheduler safe to restart and safe to run repeatedly.
- **Secure recipient links:** access tokens are long random strings, and the token endpoint is rate limited.
- **Upload limits:** only jpg, png and webp, with a size cap and a maximum number of photos per capsule.

## Deployment

- **Database:** MongoDB Atlas
- **API:** Render (root directory `backend`), with the environment variables above set in the dashboard
- **Frontend:** Vercel (root directory `frontend`), with `VITE_API_URL` pointing to the deployed API
- Set `CLIENT_URL` on the backend to the deployed frontend URL so CORS and email links work

## Future improvements

- Password reset
- Video and audio attachments
- Reminder email to the sender before unlock
- Edit or delete a capsule before it is locked
- Tests for the lock logic and scheduler