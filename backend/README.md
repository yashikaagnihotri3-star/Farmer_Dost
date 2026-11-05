# Farmer Dost Backend API

Express 5 API backed by MongoDB/Mongoose. It includes the existing cookie-session authentication API and authenticated, user-scoped soil report endpoints.

## Setup

- Requirements: Node.js 20+ and npm.
- Run `npm install`.
- Copy `.env.example` to `.env`; set `MONGODB_URI`, a random `SESSION_SECRET` with at least 32 characters, and the exact `FRONTEND_ORIGIN`.
- Keep `SOIL_UPLOAD_DIR` outside any public web root. Its default is `private_uploads/soil-reports` under the backend folder.
- Run `npm run dev` for development or `npm start` to start the API.
- Run `npm test` for authentication and soil report API integration tests using MongoDB Memory Server.

Never commit `.env` or uploaded files. See [`SOIL_REPORTS_API.md`](./SOIL_REPORTS_API.md) for endpoints, payloads, status codes, and file handling.
