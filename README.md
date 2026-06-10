# Resala AUC Recruitment

This repo contains the Resala AUC recruitment website front-end and a Supabase Edge Function backend for Google Sheets integration.

## What is included

- `resala-form/` — static HTML/CSS/JS form UI (unchanged design)
- `supabase/functions/submit/` — Supabase Edge Function that validates submissions and writes to Google Sheets
- `src/` — existing Express backend source for local development or alternate hosting

## Supabase deployment

### 1. Deploy the Edge Function

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```
2. Log in and link your project:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```
3. Add required secrets:
   ```bash
   supabase secrets set SHEET_ID='1NLoCaUWODnfywMzphfPvch8sPvwDPFEUFd6FMVWArMM'
   supabase secrets set GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account", ...}'
   ```
   If the JSON is hard to quote, base64-encode it first and then provide the encoded string.
4. Deploy the function:
   ```bash
   supabase functions deploy submit
   ```

### 2. Point the form to the function URL

Update `resala-form/script.js`:
```js
const API_URL = "https://<project>.functions.supabase.co/submit";
```

### 3. Share the Google Sheet

Make sure the Google Sheet is shared with the service account email inside `resala-499016-c892d158deba.json`.

## Environment variables for Supabase

- `SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY`

## Notes

- The form UI remains the same.
- Submission status is stored as `Pending` in the sheet.
- Duplicate checking uses AUC ID or Email.
- The function supports CORS for `POST` and `OPTIONS`.

## Local testing

If you want to test locally you can still run the Node backend:
```bash
npm install
SHEET_ID=... GOOGLE_SERVICE_ACCOUNT_KEY_PATH=... npm run dev
```
