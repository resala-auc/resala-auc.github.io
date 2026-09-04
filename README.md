# Resala AUC Recruitment

This repo contains the Resala AUC recruitment landing page, application form, and a Supabase Edge Function that writes applications to Google Sheets.

## What is included

- `src/` — static site source for the landing page and application form
- `supabase/functions/submit/` — public form submission endpoint for the static GitHub Pages site
- `supabase/functions/send-interview-reminders/` — scheduled reminder email job for the heads cycle's interviews
- `member-recruitment/`, `committee-members/`, `team/` — the members cycle's three dashboards
- `dist/` — generated static site output after `npm run build`

## Supabase setup

The static form posts to:

```js
window.RESALA_APPLICATIONS_ENDPOINT = "https://upnmxdgqdkvgzfwqaicb.supabase.co/functions/v1/submit";
```

Required Supabase secrets:

- `SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_SENDER_EMAIL`
- `GMAIL_SENDER_NAME` is optional
- `EMAIL_LOGO_URL` is optional and defaults to the public Supabase Storage Resala logo at `https://upnmxdgqdkvgzfwqaicb.supabase.co/storage/v1/object/public/resala-logo/Resala%20Logo%20-%20source.png`
- `TASK_SUBMISSION_URL` is optional but recommended. Set it to the deployed `/tasks/` page URL so confirmation and reminder emails send applicants to the task submission form. If unset, emails ask applicants to reply with their files or links.
- `CALENDAR_ID` is optional if it is the same as `GMAIL_SENDER_EMAIL`
- `CALENDAR_TIME_ZONE` is optional and defaults to `Africa/Cairo`
- `MEMBER_REMINDER_SECRET` is optional and falls back to `REMINDER_JOB_SECRET`, then `ADMIN_RESET_SECRET`. With none of the three set the member reminder endpoint refuses every request rather than falling open
- `MEMBER_REMINDER_MINUTES` is optional and defaults to 60
- `MEMBER_APPLICATION_DEADLINE` is optional. It is a Cairo wall-clock time, so a September date is `+03:00`, not `+02:00`

`GOOGLE_SERVICE_ACCOUNT_KEY` can be the full Google service account JSON or its base64-encoded JSON. The Google Sheet must be shared with that service account's `client_email`. To attach task PDFs when the Google Docs are not public, also share the task documents with the same service account.

For Gmail confirmation emails and applicant Calendar invites, the function uses OAuth refresh-token flow with the Gmail sender account. The refresh token must include all three scopes:

```text
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/meetings.space.created
```

The third is what lets the function create the interview as a Google Meet space of its own with `accessType: OPEN`, so an applicant with no AUC account walks straight in instead of waiting to be admitted. Without it every Meet call fails and the event falls back to letting Calendar create the meeting — working, but people may have to be knocked through by a host. `Check Meet access` on the member recruitment dashboard reports which of the two you are getting.

Regenerating the token, without breaking everything:

- Request **all three** scopes, not just the new one. The token is replaced wholesale, so anything omitted stops working.
- The OAuth Playground is a registered redirect URI on the client. Use the gear icon, tick **Use your own OAuth credentials**, and set **Access type: Offline** with **Force prompt: Consent Screen** — without both, Google returns no refresh token at all.
- `GMAIL_REFRESH_TOKEN` takes the `1//…` refresh token, never the `ya29.…` access token, which expires in an hour.
- **Do not reset the client secret** while fetching it from the Cloud Console. Resetting invalidates the secret Supabase holds and takes down every email and calendar invite until `GMAIL_CLIENT_SECRET` is updated too. The symptom is `invalid_client: The provided client secret is invalid` in the function logs.
- A refresh token belongs to the client that minted it. If you change the OAuth client, all three of `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` and `GMAIL_REFRESH_TOKEN` must change together.
- Verify before deploying: `curl -s https://oauth2.googleapis.com/token -d client_id=… -d client_secret=… -d refresh_token=… -d grant_type=refresh_token` should return an `access_token`.
- Supabase secrets are stored as digests; `supabase secrets list` shows names and SHA-256 only. A value that is lost cannot be read back, only replaced.
- Redeploy the function after changing a secret. The constants are read once when an instance boots, so a running one keeps the old value.

The function will also create and use two sheet tabs if they do not already exist:

- `Interview Slots`
- `Interview Reservations`

The `Interview Slots` tab seeds editable one-hour rows for `12:01 PM`, `2:00 PM`, `3:00 PM`, `7:00 PM`, `8:00 PM`, and `10:00 PM`. Only dated, active, non-full, future slots appear on the form.

Recruitment slots run from Monday, June 22, 2026 through Wednesday, July 15, 2026. The backend generates one row per date/time, with a unique `Slot ID` for every row:

```text
slot-2026-06-22-1201 | 2026-06-22 | 12:01 PM | 1:01 PM | 2026-06-22 at 12:01 PM | 1 | TRUE
slot-2026-06-22-1400 | 2026-06-22 | 2:00 PM | 3:00 PM | 2026-06-22 at 2:00 PM | 1 | TRUE
slot-2026-06-22-1500 | 2026-06-22 | 3:00 PM | 4:00 PM | 2026-06-22 at 3:00 PM | 1 | TRUE
slot-2026-06-22-1900 | 2026-06-22 | 7:00 PM | 8:00 PM | 2026-06-22 at 7:00 PM | 1 | TRUE
slot-2026-06-22-2000 | 2026-06-22 | 8:00 PM | 9:00 PM | 2026-06-22 at 8:00 PM | 1 | TRUE
slot-2026-06-22-2200 | 2026-06-22 | 10:00 PM | 11:00 PM | 2026-06-22 at 10:00 PM | 1 | TRUE
```

The generated sheet includes those six rows for every date through `2026-07-15`. Existing sheets are also backfilled with any missing generated rows from the current `Africa/Cairo` date through `2026-07-15`. Once a slot's start time passes in the `Africa/Cairo` timezone, the backend automatically hides it from the form. Same-day slots are also closed from 11:00 AM Cairo time so applicants have enough time to read and complete the next steps before the interview. Older default half-hour rows such as `7:30 PM - 8:30 PM` are hidden by the backend to avoid overlaps.

Calendar setup:

- Enable Google Calendar API and Google Meet/conferencing for the Google project.
- Make sure the Gmail sender account can create events on the target calendar.
- Set `CALENDAR_ID` to that calendar ID if it is not the same as `GMAIL_SENDER_EMAIL`.

Reminder emails:

- Each reservation stores `Reminder Send At`, `Reminder Sent At`, and `Reminder Status` in `Interview Reservations`.
- New reservations also store `Role Applied For` and `Second Preference` in `Interview Reservations` so reminder emails can repeat both task links.
- Deploy `send-interview-reminders` with `--no-verify-jwt` and schedule it to run every few minutes from Supabase.
- The reminder function sends from the configured Gmail account when `Reminder Send At` is due, skips rows marked `Done`, and avoids stale reminders older than `REMINDER_STALE_MINUTES` minutes.
- The scheduler authenticates with `REMINDER_JOB_SECRET` in the `x-reminder-secret` header.

Task submissions:

- The static site builds a task submission page at `/tasks/`.
- The static site also builds a frontend-only match registration page at `/world-cup/` for the Egypt vs Australia gathering. It is prepared for the registration flow but intentionally has no backend connection yet.
- Applicants submit with the same AUC email and Student ID used in the application.
- The submit function matches both values against the Applications sheet and updates the same row.
- Applications sheet task columns are `Task Submitted At`, `First Preference Task Link`, `Second Preference Task Link`, `Task Notes`, and `Task Submission Status`.

Schedule the reminder worker from the Supabase SQL editor:

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select vault.create_secret('https://upnmxdgqdkvgzfwqaicb.supabase.co', 'project_url');
select vault.create_secret('YOUR_PRIVATE_REMINDER_JOB_SECRET', 'reminder_job_secret');

select cron.schedule(
  'send-interview-reminders-every-5-minutes',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-interview-reminders',
    headers := jsonb_build_object(
      'Content-type', 'application/json',
      'x-reminder-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_job_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

Deploy:

```bash
supabase secrets set --project-ref upnmxdgqdkvgzfwqaicb SHEET_ID='1AIoEVXGc6I_SZcvndvum4GadrbF_HIpyGHqL5BJW2C8'
supabase secrets set --project-ref upnmxdgqdkvgzfwqaicb GOOGLE_SERVICE_ACCOUNT_KEY='<service-account-json-or-base64>'
supabase secrets set --project-ref upnmxdgqdkvgzfwqaicb TASK_SUBMISSION_URL='https://YOUR_SITE_URL/tasks/'
supabase functions deploy submit --project-ref upnmxdgqdkvgzfwqaicb --no-verify-jwt --use-api
supabase functions deploy send-interview-reminders --project-ref upnmxdgqdkvgzfwqaicb --no-verify-jwt --use-api
```

## Notes

- The landing page links directly to `/apply/`.
- Role cards deep-link to `/apply/?role=<role-id>` and preselect that role.
- Submission status is stored as `Pending` in the sheet.
- Applications store the applicant's first role preference and second role preference.
- Duplicate checking uses AUC email or Student ID.
- Interview slots are live and reserved through the sheet-backed booking list.
- Past interview slots are automatically hidden based on their start time in the configured calendar timezone.
- Each reservation creates a Google Calendar event from the Gmail sender account, invites the applicant as an attendee, generates a Google Meet link, stores the link in `Interview Reservations`, and sends it in the confirmation email.
- Confirmation emails include two task documents, one for each role preference, with Google Doc/PDF links and PDF attachments when Drive export is available.
- A separate scheduled Supabase function sends a direct Gmail reminder 30 minutes before the interview, reminds applicants to submit both tasks if they have not submitted yet, and marks the reminder as `Sent`.
- The `/tasks/` page lets applicants submit task links and maps them back to their application row.
- `Interview Reservations` includes an `Interview Status` column seeded as `Not Done`; update it to `Done` after the interview.
- The admin dashboard can update each reservation's interview status and includes an `Extend booked to 1 hour` action for patching already-created Calendar events after deploying the one-hour duration change.
- The Edge Function is deployed with JWT verification disabled so GitHub Pages can post to it directly.

## `/join/` — the animated recruitment experience

`/join/` is a second, cinematic front door to the same application pipeline.
`/apply/` is untouched and still works; both post the identical
`ApplicationPayload` to the Supabase `submit` function.

The flow runs as: identity → the pen handover → which lane → committee and
sub-committee → the committee's questions, one screen at a time → interview
slot → sealed. A draft is kept in `localStorage` under `resala-join-draft`, so
a refresh mid-flow never costs the applicant their typing; it is cleared on
success.

`/join/` now serves the **members** cycle, not heads — see the section below.

Source lives in `experience/` (React 19 + Vite + Tailwind v4 + `motion/react`):

| Path | Purpose |
| --- | --- |
| `experience/src/App.tsx` | Act state machine and payload assembly |
| `experience/src/acts/` | One file per act |
| `experience/src/data/members.ts` | The members cycle's committees and sub-committees. Self-contained on purpose — it does not read `src/role-guide-data.mjs`, so a members edit cannot desync `/guides/` or the heads dashboards |
| `experience/src/data/committees.ts` | The heads cycle's version, reading `src/role-guide-data.mjs`. No longer imported by the app; kept because the heads cycle may run again |
| `experience/src/lib/api.ts` | Slot fetch + submit against the same endpoint |
| `experience/public/media/` | Optional recorded handover audio and hero film — see the README there |

Commands:

```bash
npm run dev:join     # Vite dev server for the experience alone
npm run build        # static site + experience together, into dist/
```

`npm run build` also runs the Vite build, which writes to `dist/join/`. Assets
are emitted with a relative base, so the route works under any deploy path.
The heads chapter list is derived from `src/role-guide-data.mjs`, so editing a
role guide updates `/guides/` and `/apply/` at once. `/join/` reads
`experience/src/data/members.ts` instead.

Note: the landing page CTA still reads "Applications closed" and points at
`/apply/`. Point it at `./join/` when the new cycle opens.

## The members cycle

`/join/` serves member recruitment. Members choose a committee and then a
sub-committee inside it, answer three questions, and book a 15-minute
interview. There is no second-preference committee and no task.

Its data lives in `experience/src/data/members.ts`, deliberately apart from the
heads cycle's `src/role-guide-data.mjs`, and is mirrored by hand in the edge
function — the interview board and the Cairo offset appear in both files and
must be changed together.

### Pages

| URL | Who signs in | What it is for |
| --- | --- | --- |
| `/join/` | applicants | The application itself |
| `/member-recruitment/` | recruitment admins | Every committee's applicants, approvals, reminders, and the repair tools |
| `/committee-members/` | a committee's directors and heads | That committee's applicants only: scoring, ranking, decisions, rescheduling |
| `/team/` | recruitment admins | The team board — who is on the team, which grants access to the two above |

### The team board is the roster of record

`Board Hierarchy` holds everyone on the team, heads included. It used to hold
only directors, with "who is a head" read off whoever had `Accepted = Yes` in
the heads applications — which can represent neither a resignation nor somebody
head-hunted who never applied.

Everything that needs to know who is on a committee reads it live: the
interview email Cc, the committee portal's sign-in, the committee dashboard's
sign-in. Add a head at `/team/` and they can sign in immediately; remove them
and they are off the Cc and locked out, and their recruitment-admin row is
revoked once they are off the board entirely.

Three committees go by two names — a director's row says `Tech Director`,
`Initiatives Director` or `Children Day Director` while everything downstream
of the heads cycle writes `Tech Team`, `Initiatives` and `Children's Day`.
Compare committees with `committeeKey`, never `normalizeRole`; it collapses
both forms and folds the two apostrophes of "Children's Day".

### Sheet tabs

| Tab | Holds |
| --- | --- |
| `Member Recruitment` | One row per applicant, including the interview, the decision, the confirmation's Gmail thread, and the approval trail |
| `Member Recruitment Interview Reservations` | The live slot holds. Availability is counted from these rows, so deleting one is what frees a time |
| `Member Scores` | One row per interviewer per applicant. The portal ranks on the average |
| `Board Hierarchy` | The team roster |
| `Board Committees` | Committee names, so a team can exist before anyone is on it |

Columns are only ever **appended** to `Member Recruitment`; inserting one
shifts every existing row under its headers.

### Interview times are Cairo time, with a real offset

Egypt reinstated daylight saving in 2023: `+02:00` in winter, `+03:00` from the
last Friday of April to the last Thursday of October. The whole September board
is `+03:00`. Hardcoding `+02:00` put every booking on the calendar an hour
after the time the portal, the sheet and the email all displayed. `cairoOffsetFor`
derives it from `Africa/Cairo` per date; `Check interview times` on the admin
dashboard repairs any invite that drifted, and leaves interviews that have
already happened alone.

### The decision path

A committee scores its applicants in `/committee-members/` and records an
initial decision. Accepted applicants are submitted per sub-committee, an
admin approves the list at `/member-recruitment/` → **Approvals**, and only
then is an acceptance email sent. Approval is recorded before the email is
attempted: approved-but-not-told is fixable, told-but-not-recorded is not.

### Member reminders

The member reminder lives in the `submit` function, not in
`send-interview-reminders`, because the thread ids it replies onto are stored
beside the application. It authenticates with `MEMBER_REMINDER_SECRET`, falling
back to `REMINDER_JOB_SECRET` so it can join the existing schedule:

```sql
select cron.schedule(
  'member-interview-reminders',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/submit',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'mode', 'member-send-reminders',
      'secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_job_secret'),
      'apply', true
    )
  ) as request_id;
  $$
);
```

A `Reminder Sent At` stamp makes over-firing free, so a tight schedule is
correct — a coarse one just means somebody is reminded 40 minutes before
instead of 60.

### When Google fails

Booking an interview never fails because Google did: the row is written and the
slot held even with no calendar invite and no email. The other half of that
bargain is on the dashboard — applicants holding a slot with no Meet link get a
**Send the invite and email** button that rebuilds both without touching the
time they already have.

## Local testing

Build and serve locally:

```bash
npm run build
npm run dev
```
