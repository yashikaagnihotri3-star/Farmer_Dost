# Soil Reports API

All endpoints use the existing Express session cookie. Mutating requests require the session's CSRF token in `X-CSRF-Token`; obtain it from `GET /api/auth/csrf`. Send browser requests with credentials enabled. Report ownership comes only from the authenticated session; `userId` is never accepted from the request body.

## Endpoints

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| `POST` | `/api/soil-reports` | Create a report | `201 { report }` |
| `GET` | `/api/soil-reports` | List the current user's reports, newest updated first | `200 { reports }` |
| `GET` | `/api/soil-reports/:id` | Read one owned report | `200 { report }` |
| `PUT` | `/api/soil-reports/:id` | Update an owned report | `200 { report }` |
| `DELETE` | `/api/soil-reports/:id` | Delete an owned report and its file | `204` |
| `POST` | `/api/soil-reports/upload` | Upload one report file as multipart field `file` | `201 { file }` |
| `GET` | `/api/soil-reports/:id/file` | View an owned report's file inline | `200` file stream |

Create and update JSON fields:

```json
{
  "reportName": "North field — Kharif",
  "farmerName": "Asha Kaur",
  "soilType": "Loamy",
  "soilPH": 6.8,
  "nitrogen": 120,
  "phosphorus": 45,
  "potassium": 60,
  "organicCarbon": 0.8,
  "moisture": 35,
  "electricalConductivity": 0.4,
  "testDate": "2026-11-05",
  "location": "North field",
  "extractionStatus": "not_requested"
}
```

Required fields are `reportName`, `farmerName`, `soilType`, `testDate`, and `location`. Numeric measurements are optional and range-checked. To attach a previously uploaded file, include its `uploadId` from the upload response when creating or updating a report. Upload IDs are private to the user's storage directory and are consumed when attached. Stored file paths and IDs are not returned with report records.

`entryMethod` is assigned by the server based on whether a valid uploaded file is attached. `extractionStatus` is one of `not_requested`, `unavailable`, or `manual_review`; no OCR or AI extraction is claimed or performed.

## File handling and errors

Uploads are restricted to PDF, JPG/JPEG and PNG with a 10 MB limit and 20 uploads per authenticated session/IP in 15 minutes. Extension, declared MIME type, and file signature are checked. Server-generated UUID filenames are saved under `SOIL_UPLOAD_DIR/<authenticated-user-id>` outside the frontend's public assets. Unattached uploads older than 24 hours are cleaned up during the next upload by that user. The file route checks both the report ID and session owner before streaming. Deleting the report also removes its stored file.

Errors use `{ "error": { "code": "...", "fields": {} } }` when field details apply. Expected statuses include `400` validation or malformed input, `401` unauthenticated, `403` invalid CSRF, `404` missing or not-owned report, `413` oversized file, `415` unsupported or invalid file content, and `503` service unavailable.

## Tests

Run `npm test` from `backend/`. The soil report suite uses MongoDB Memory Server and a temporary private upload directory; it does not need the configured development database.
