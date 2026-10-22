# Farmer Dost Backend API

Express + MongoDB authentication API. The frontend is distributed separately.

## Setup
- Requirements: Node.js 20+ and npm.
- Run `npm install`.
- Copy `.env.example` to `.env` and set `MONGODB_URI`, `SESSION_SECRET` (32+ characters), and exact `FRONTEND_ORIGIN`. Configure Atlas network access if applicable.
- Run `npm run dev` for development or `npm start` to start the API (the entry point is `server.js` in this archive).
- Run `npm test` for API integration tests; MongoDB Memory Server is test-only.

The server requires a reachable MongoDB deployment and fails if required configuration is missing. Never commit `.env`. API routes are under `/api`; health check: `GET /api/health`. See the full-project README for API contract and security details.
