# Resala AUC Email API

Send emails from the Resala AUC account. You choose the recipients, subject,
body, and when it goes out: now, after a delay, or at a set time.

## Base URL

```
https://upnmxdgqdkvgzfwqaicb.supabase.co/functions/v1/forms-api
```

## Authentication

```
Authorization: Bearer rsl_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

> **Server-side only.** Store the key as a Vercel environment variable
> (`RESALA_EMAIL_API_KEY`, no `NEXT_PUBLIC_` prefix) and call the API from a
> route handler, server action, or a trigger in your own database. Requests
> sent from a browser are refused with `403 browser_request_refused`.
>
> This key sends email as Resala AUC. If it leaks, tell Resala at once so it
> can be revoked.

---

## `POST /v1/emails`: send or schedule an email

**Headers**

| Header | Required | Notes |
|---|---|---|
| `Authorization` | yes | `Bearer <key>` |
| `Content-Type` | yes | `application/json` |
| `Idempotency-Key` | recommended | A unique id you choose for this email, e.g. `team_42_confirmation`. If you retry with the same key, you get the original email back and nothing is sent twice. |

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `to` | string or string[] | yes | Recipient address(es). |
| `cc` | string or string[] | no | |
| `bcc` | string or string[] | no | Hidden from other recipients. |
| `subject` | string | yes | Max 250 characters. |
| `html` | string | one of `html`/`text` | HTML body. A plain-text version is generated if you don't send `text`. |
| `text` | string | one of `html`/`text` | Plain-text body. If sent alone, it is also used for the HTML version. |
| `reply_to` | string or string[] | no | Where replies go, up to 5 addresses. A reply goes to **all** of them, so list the Resala inbox too if it should get a copy. Defaults to the address Resala set for your key, otherwise the Resala account. |
| `send_at` | string | no | When to send, as ISO 8601 **with a time zone**, e.g. `2026-11-19T18:00:00+02:00` (Cairo). Omit it, pass `"now"`, or pass a past time to send right away. Up to 60 days ahead. |
| `delay_minutes` | number | no | Instead of `send_at`: send this many minutes from now. `60` = in an hour, `1440` = tomorrow. |

At most 50 recipients per email across `to`, `cc` and `bcc`. The body can be
up to 200,000 characters.

**Send now**

```bash
curl -X POST "$BASE/v1/emails" \
  -H "Authorization: Bearer $RESALA_EMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: team_42_confirmation" \
  -d '{
    "to": "captain@aucegypt.edu",
    "cc": ["organizer@aucegypt.edu"],
    "subject": "You are registered for The Good Game",
    "html": "<p>Hi Sara,</p><p>Your team <b>Night Owls</b> is registered.</p>"
  }'
```

**In an hour**

```json
{ "to": "captain@aucegypt.edu", "subject": "Reminder: complete your payment", "text": "Hi Sara, …", "delay_minutes": 60 }
```

**At a set time**

```json
{ "to": "captain@aucegypt.edu", "subject": "See you tomorrow", "html": "…", "send_at": "2026-11-19T18:00:00+02:00" }
```

**Response `202`** (`200` with `"replayed": true` for a retried `Idempotency-Key`)

```json
{
  "ok": true,
  "replayed": false,
  "email": {
    "id": "9b2f5c1e-7a0d-4c8e-b1f3-2d6a8e4c7f10",
    "status": "scheduled",
    "to": ["captain@aucegypt.edu"],
    "cc": ["organizer@aucegypt.edu"],
    "bcc": [],
    "subject": "You are registered for The Good Game",
    "send_at": "2026-11-13T10:00:00.000Z",
    "sent_at": null,
    "cancelled_at": null,
    "error": null,
    "created_at": "2026-11-13T10:00:00.000Z"
  }
}
```

Save `email.id` if you may need to cancel the email or check on it later.

**Delivery time:** queued emails go out within about **5 minutes** of
`send_at`. "Now" means within 5 minutes, not instantly.

---

## `GET /v1/emails/{id}`: check an email

Returns the same `email` object.

| `status` | Meaning |
|---|---|
| `scheduled` | Waiting for its send time. |
| `sent` | Sent; `sent_at` is set. |
| `cancelled` | You cancelled it, or the key was revoked. |
| `failed` | Could not be sent after 3 tries; `error` says why. |

## `POST /v1/emails/{id}/cancel`: cancel a scheduled email

Works while the status is `scheduled`. Use it for a reminder that's no longer
needed, for example after someone pays:

```bash
curl -X POST "$BASE/v1/emails/9b2f5c1e-7a0d-4c8e-b1f3-2d6a8e4c7f10/cancel" \
  -H "Authorization: Bearer $RESALA_EMAIL_API_KEY"
```

Returns `409 not_cancellable` if the email was already sent.

**Typical pattern for a payment reminder:** schedule it when the person
registers, store its `id`, and cancel it when they pay.

---

## Errors

```json
{ "ok": false, "error": { "code": "invalid_recipients", "message": "…" }, "request_id": "…" }
```

| HTTP | `code` | What to do |
|---|---|---|
| 400 | `invalid_json` | Send a JSON object. |
| 401 | `unauthorized` | The key is missing, wrong, or revoked. |
| 403 | `browser_request_refused` | Move the call into server code. |
| 404 | `not_found` | Wrong id, or the email belongs to another key. |
| 409 | `not_cancellable` | The email was already sent. |
| 413 | `payload_too_large` | Keep the request under 300 KB. |
| 422 | `invalid_recipients`, `too_many_recipients`, `invalid_subject`, `missing_body`, `invalid_body`, `invalid_schedule`, `invalid_request` | Fix the field named in `message`. |
| 429 | `rate_limited` | Wait `Retry-After` seconds, then retry with the same `Idempotency-Key`. |
| 5xx | `internal_error`, `api_disabled` | Retry later with the same `Idempotency-Key`. Include `request_id` when you report it. |

## Limits

These are the defaults. Ask Resala if you need more.

- 60 API requests per minute.
- 300 recipients per 24 hours across all emails. Emails over the cap wait an
  hour and retry; they aren't dropped.
- 10 emails per 24 hours to the same `to` address. Extra emails wait instead of
  being dropped.
- 50 recipients per email, scheduled up to 60 days ahead.

---

## Next.js helper

```ts
// lib/resala-email.ts (server only)
const BASE = "https://upnmxdgqdkvgzfwqaicb.supabase.co/functions/v1/forms-api";

type SendEmail = {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  sendAt?: string;        // ISO with time zone, e.g. "2026-11-19T18:00:00+02:00"
  delayMinutes?: number;  // or: minutes from now
  idempotencyKey?: string;
};

async function call(path: string, init: RequestInit & { idempotencyKey?: string } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.RESALA_EMAIL_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {})
    },
    cache: "no-store"
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Resala email API ${res.status}: ${body.error?.code} ${body.error?.message}`);
  return body.email as { id: string; status: string };
}

export function sendEmail(email: SendEmail) {
  return call("/v1/emails", {
    method: "POST",
    idempotencyKey: email.idempotencyKey,
    body: JSON.stringify({
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      subject: email.subject,
      html: email.html,
      text: email.text,
      reply_to: email.replyTo,
      send_at: email.sendAt,
      delay_minutes: email.delayMinutes
    })
  });
}

export function cancelEmail(id: string) {
  return call(`/v1/emails/${id}/cancel`, { method: "POST" });
}
```

```ts
// On registration: confirm now, remind in 24 hours.
await sendEmail({ to: captain.email, subject: "You're registered", html: confirmationHtml,
                  idempotencyKey: `team_${team.id}_confirmation` });
const reminder = await sendEmail({ to: captain.email, subject: "Complete your payment", html: reminderHtml,
                                   delayMinutes: 24 * 60, idempotencyKey: `team_${team.id}_reminder_1` });
await db.teams.update(team.id, { reminderEmailId: reminder.id });

// When the payment is verified: stop the reminder, send the confirmation.
await cancelEmail(team.reminderEmailId);
await sendEmail({ to: captain.email, subject: "Payment confirmed", html: paidHtml,
                  idempotencyKey: `team_${team.id}_paid` });
```
