# Farmer Dost

Farmer Dost is a smart farming assistance platform. This repository contains the React/Vite frontend and the Express/MongoDB API.

## Requirements

- Node.js 20 or later and npm.
- A reachable MongoDB deployment for running the API. MongoDB Memory Server is used for automated API tests.

## Start the API

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env` and set `MONGODB_URI`, a random `SESSION_SECRET` of at least 32 characters, and the exact browser origin in `FRONTEND_ORIGIN`. Keep `SOIL_UPLOAD_DIR` outside any public web root. Then run:

```powershell
npm run dev
```

The API listens on port 5000 by default. `GET /api/health` is a public health check. Authentication uses the existing HTTP-only session cookie and CSRF token flow.

## Start the frontend

```powershell
cd Frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The default frontend API base is `http://localhost:5000/api`. Set `VITE_API_BASE_URL` in `Frontend/.env` to change it. The API's `FRONTEND_ORIGIN` must exactly match the frontend origin used by the browser.

## Soil report behavior

The soil report page is available at `/soil-reports` and uses the logged-in user's existing session. Reports are stored in MongoDB and scoped to the authenticated account. Uploads accept PDF, JPG/JPEG and PNG files up to 10 MB; files are stored in a private server directory and are streamed only through an authenticated, ownership-checked endpoint. OCR/AI extraction is not configured, so the page labels extraction unavailable and requires manual entry and review.

See [backend/SOIL_REPORTS_API.md](backend/SOIL_REPORTS_API.md) for the report API contract and security behavior.

## Checks

```powershell
cd backend
npm test
cd ../Frontend
npm test
npm run build
```

Backend tests exercise the existing authentication/session flows plus soil report validation, persistence, upload handling, ownership isolation, file retrieval, and deletion. Frontend `npm test` checks translation-key parity.

## Keep secrets private

Do not commit `.env` files, MongoDB credentials, session secrets, uploaded report files, `node_modules`, or generated build output. Start from the tracked `.env.example` templates.
