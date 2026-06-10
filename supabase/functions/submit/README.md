Deploy this function with the Supabase CLI.

1. Install Supabase CLI:
   https://supabase.com/docs/guides/cli

2. Set env vars in Supabase project:
   supabase secrets set SHEET_ID='<sheet id>' GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"..."}'

3. Deploy:
   supabase functions deploy submit

4. Use the function URL in resala-form/script.js:
   https://<project>.functions.supabase.co/submit
