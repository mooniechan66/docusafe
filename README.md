# Docusafe

Secure, ephemeral document sharing platform.

## Repo Layout

- `backend/` — Node.js (Express + Prisma/SQLite)
- `frontend/` — Angular app

## Local Development

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on: `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on: `http://localhost:4200`

## Environment

Backend reads env vars from `.env` (not committed). Minimum:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me"
FRONTEND_URL="http://localhost:4200"
```

## Notes

- SQLite DB is just a file on disk (see `DATABASE_URL`).
- In dev, signup returns a `verificationLink` (and may include an Ethereal `previewUrl`) to help test email verification without real SMTP.
