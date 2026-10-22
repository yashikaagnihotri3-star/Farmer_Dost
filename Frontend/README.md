# Farmer Dost Frontend

React + Vite frontend for Farmer Dost, including the Phase 1 UI and Phase 2 authentication client integration. The API server is distributed separately.

## Setup
- Requirements: Node.js 20+ and npm.
- Run `npm install`, then `npm run dev`.
- Optionally copy `.env.example` to `.env` and set `VITE_API_BASE_URL`; default: `http://localhost:5000/api`.
- Run `npm test` to check translation key parity or `npm run build` for a production build.

Registration and login call the API and do not fake successful authentication. For complete auth flows, run the separate backend and configure its allowed frontend origin.
