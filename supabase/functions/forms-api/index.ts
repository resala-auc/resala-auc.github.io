/*
 * Forms API — lets a trusted developer's server send email from the Resala
 * AUC Gmail account.
 *
 * The caller sends the subject, the body, the recipients and when to send.
 * The email is queued and the cron worker sends it when it is due.
 *
 * Routes (all under /functions/v1/forms-api):
 *   POST /v1/emails              queue an email (now, after a delay, or at a time)
 *   GET  /v1/emails/{id}         its status
 *   POST /v1/emails/{id}/cancel  cancel it if it hasn't been sent yet
 *   POST /internal/run           cron worker (x-reminder-secret)
 *
 * The key can send anything to anyone, so the guards are about limiting the
 * damage of a leaked or misused key: server-only calls, per-minute and
 * per-day caps, a recipient cap per email, a full log, one-line revoke
 * (forms_api_clients.active) and a global kill switch (FORMS_API_DISABLED).
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET") ?? "";
const GMAIL_REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN") ?? "";
const GMAIL_SENDER_EMAIL = Deno.env.get("GMAIL_SENDER_EMAIL") ?? "";
const GMAIL_SENDER_NAME = Deno.env.get("GMAIL_SENDER_NAME") ?? "Resala AUC";
const REMINDER_JOB_SECRET = Deno.env.get("REMINDER_JOB_SECRET") ?? "";
/* Global kill switch: set to "true" to refuse every API call and send nothing. */
const FORMS_API_DISABLED = (Deno.env.get("FORMS_API_DISABLED") ?? "").toLowerCase() === "true";

const MAX_REQUEST_BYTES = 300 * 1024;
const MAX_BODY_CHARS = 200_000;
const MAX_SUBJECT_CHARS = 250;
const MAX_RECIPIENTS = 50;
const MAX_REPLY_TO = 5;
const MAX_SCHEDULE_DAYS = 60;
const WORKER_BATCH = 40;
/* Spaces sends out so Gmail's per-minute limit isn't hit. */
const WORKER_PAUSE_MS = 400;

const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

type Client = {
  id: string;
  name: string;
  active: boolean;
  reply_to: string | null;
  requests_per_minute: number;
  daily_email_cap: number;
  per_recipient_daily_cap: number;
};

type Message = {
  id: string;
  client_id: string;
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses: string[];
  reply_to: string | null;
  subject: string;
  html_body: string | null;
  text_body: string | null;
  recipient_count: number;
  send_at: string;
  status: "scheduled" | "sending" | "sent" | "cancelled" | "failed";
  attempts: number;
  sent_at: string | null;
  cancelled_at: string | null;
  last_error: string | null;
  created_at: string;
};

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extraHeaders: Record<string, string> = {}
  ) {
    super(message);
  }
}

let db: SupabaseClient | null = null;
function database(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not available.");
  }
  db ??= createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return db;
}

Deno.serve(async (request) => {
  const path = routePath(new URL(request.url).pathname);
  const requestId = crypto.randomUUID();

  try {
    if (path === "/internal/run") {
      return await runWorker(request);
    }

    if (FORMS_API_DISABLED) {
      throw new ApiError(503, "api_disabled", "The Forms API is temporarily switched off.");
    }

    /*
     * The key must live on the caller's server. A browser always sends
     * Origin on a cross-site fetch, so seeing one means the key is in
     * front-end code where anyone can read it. There are deliberately no CORS
     * headers on this function for the same reason.
     */
    if (request.headers.get("origin")) {
      throw new ApiError(
        403,
        "browser_request_refused",
        "Call this API from your server (e.g. a Vercel API route or server action), never from browser code."
      );
    }

    const client = await authenticate(request);
    await enforceRateLimit(client, request.method, path);

    const response = await route(request, path, client);
    response.headers.set("X-Request-Id", requestId);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return json(
        { ok: false, error: { code: error.code, message: error.message }, request_id: requestId },
        error.status,
        error.extraHeaders
      );
    }
    console.error(`[forms-api] ${requestId}`, error);
    return json(
      { ok: false, error: { code: "internal_error", message: "Something went wrong on our side." }, request_id: requestId },
      500
    );
  }
});

/* "/forms-api/v1/emails" → "/v1/emails". */
function routePath(pathname: string): string {
  const marker = "/forms-api";
  const index = pathname.indexOf(marker);
  const rest = index === -1 ? pathname : pathname.slice(index + marker.length);
  return (rest || "/").replace(/\/+$/, "") || "/";
}

async function route(request: Request, path: string, client: Client): Promise<Response> {
  const segments = path.split("/").filter(Boolean); // ["v1", "emails", id?, action?]
  if (segments[0] !== "v1" || segments[1] !== "emails") {
    throw new ApiError(404, "not_found", "No such endpoint.");
  }

  if (segments.length === 2) {
    if (request.method === "POST") return await queueEmail(request, client);
    throw methodNotAllowed();
  }

  const id = segments[2];
  if (!UUID_PATTERN.test(id)) throw new ApiError(404, "not_found", "No email with that id.");

  if (segments.length === 3 && request.method === "GET") {
    return json({ ok: true, email: present(await findMessage(client, id)) });
  }
  if (segments.length === 4 && segments[3] === "cancel" && request.method === "POST") {
    return await cancelEmail(client, id);
  }
  throw new ApiError(404, "not_found", "No such endpoint.");
}

/* ---------- authentication & limits ---------- */

async function authenticate(request: Request): Promise<Client> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(rsl_live_[A-Za-z0-9_-]{20,100})$/);
  if (!match) {
    throw new ApiError(401, "unauthorized", "Send your API key as: Authorization: Bearer rsl_live_…");
  }

  const { data, error } = await database()
    .from("forms_api_clients")
    .select("id, name, active, reply_to, requests_per_minute, daily_email_cap, per_recipient_daily_cap")
    .eq("key_hash", await sha256Hex(match[1]))
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.active) {
    throw new ApiError(401, "unauthorized", "This API key is not valid or has been revoked.");
  }

  await database().from("forms_api_clients").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data as Client;
}

async function enforceRateLimit(client: Client, method: string, path: string): Promise<void> {
  const { data, error } = await database().rpc("forms_api_hit", {
    p_client_id: client.id,
    p_method: method,
    p_path: path
  });
  if (error) throw error;
  if (Number(data) > client.requests_per_minute) {
    throw new ApiError(429, "rate_limited", "Too many requests. Slow down and retry shortly.", {
      "Retry-After": "60"
    });
  }
}

/* ---------- endpoints ---------- */

async function queueEmail(request: Request, client: Client): Promise<Response> {
  const body = await readJson(request);

  const to = addressList(body.to, "to", true);
  const cc = addressList(body.cc, "cc", false);
  const bcc = addressList(body.bcc, "bcc", false);
  const recipientCount = new Set([...to, ...cc, ...bcc]).size;
  if (recipientCount > MAX_RECIPIENTS) {
    throw new ApiError(422, "too_many_recipients", `At most ${MAX_RECIPIENTS} recipients per email (to + cc + bcc).`);
  }

  /* Stored as one validated, comma-separated header value: a reply goes to
     every address on it. */
  const replyToList = addressList(body.reply_to, "reply_to", false);
  if (replyToList.length > MAX_REPLY_TO) {
    throw new ApiError(422, "invalid_recipients", `\`reply_to\` can list at most ${MAX_REPLY_TO} addresses.`);
  }
  const replyTo = replyToList.length ? replyToList.join(", ") : client.reply_to;

  const subject = String(body.subject ?? "").replace(/[\r\n]+/g, " ").trim();
  if (!subject || subject.length > MAX_SUBJECT_CHARS) {
    throw new ApiError(422, "invalid_subject", `\`subject\` is required (max ${MAX_SUBJECT_CHARS} characters).`);
  }

  const html = optionalBody(body.html, "html");
  const text = optionalBody(body.text, "text");
  if (!html && !text) {
    throw new ApiError(422, "missing_body", "Send the email body as `html`, `text`, or both.");
  }

  const sendAt = resolveSendAt(body.send_at, body.delay_minutes);
  const idempotencyKey = optionalToken(request.headers.get("idempotency-key"), "Idempotency-Key");

  if (idempotencyKey) {
    const existing = await findByIdempotencyKey(client, idempotencyKey);
    if (existing) return json({ ok: true, replayed: true, email: present(existing) });
  }

  const inserted = await database()
    .from("forms_api_messages")
    .insert({
      client_id: client.id,
      idempotency_key: idempotencyKey,
      to_addresses: to,
      cc_addresses: cc,
      bcc_addresses: bcc,
      reply_to: replyTo,
      subject,
      html_body: html,
      text_body: text,
      recipient_count: recipientCount,
      send_at: new Date(sendAt).toISOString()
    })
    .select("*")
    .single();

  if (inserted.error) {
    /* Two identical requests raced: answer with the one that won. */
    if (inserted.error.code === "23505" && idempotencyKey) {
      const winner = await findByIdempotencyKey(client, idempotencyKey);
      if (winner) return json({ ok: true, replayed: true, email: present(winner) });
    }
    throw inserted.error;
  }

  return json({ ok: true, replayed: false, email: present(inserted.data as Message) }, 202);
}

async function cancelEmail(client: Client, id: string): Promise<Response> {
  const updated = await database()
    .from("forms_api_messages")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("client_id", client.id)
    .eq("status", "scheduled")
    .select("*")
    .maybeSingle();
  if (updated.error) throw updated.error;

  if (!updated.data) {
    const message = await findMessage(client, id);
    if (message.status === "cancelled") return json({ ok: true, email: present(message) });
    throw new ApiError(409, "not_cancellable", `This email is already ${message.status === "sending" ? "being sent" : message.status}.`);
  }
  return json({ ok: true, email: present(updated.data as Message) });
}

/* ---------- worker ---------- */

async function runWorker(request: Request): Promise<Response> {
  if (request.method !== "POST") throw methodNotAllowed();
  if (!REMINDER_JOB_SECRET || !timingSafeEqual(request.headers.get("x-reminder-secret") ?? "", REMINDER_JOB_SECRET)) {
    throw new ApiError(401, "unauthorized", "Unauthorized.");
  }
  if (FORMS_API_DISABLED) return json({ ok: true, disabled: true });
  if (!gmailConfigured()) throw new Error("Gmail sending is not configured.");

  await database().rpc("forms_api_fail_stuck_messages");
  const claimed = await database().rpc("forms_api_claim_due_messages", { p_limit: WORKER_BATCH });
  if (claimed.error) throw claimed.error;

  const jobs = (claimed.data ?? []) as Message[];
  const result = { claimed: jobs.length, sent: 0, deferred: 0, cancelled: 0, failed: 0 };
  if (!jobs.length) return json({ ok: true, ...result });

  const clients = new Map<string, Client>();
  const sentToday = new Map<string, number>();
  let gmailToken = "";

  for (const job of jobs) {
    try {
      let client = clients.get(job.client_id);
      if (!client) {
        client = await loadClient(job.client_id);
        clients.set(client.id, client);
      }

      /* A revoked key's queued emails are dropped, not sent. */
      if (!client.active) {
        await updateMessage(job.id, { status: "cancelled", cancelled_at: new Date().toISOString(), last_error: "API key revoked." });
        result.cancelled += 1;
        continue;
      }

      if (!sentToday.has(client.id)) sentToday.set(client.id, await recipientsSentToday(client.id));
      const capReason =
        (sentToday.get(client.id)! + job.recipient_count > client.daily_email_cap
          ? "Daily email cap reached for this key; retrying in an hour."
          : "") || (await recipientCapReason(client, job));
      if (capReason) {
        await updateMessage(job.id, {
          status: "scheduled",
          send_at: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: capReason
        });
        result.deferred += 1;
        continue;
      }

      gmailToken ||= await getGmailAccessToken();
      const outcome = await sendEmail(gmailToken, job);

      if (outcome.rateLimited) {
        await updateMessage(job.id, {
          status: "scheduled",
          send_at: new Date(Date.now() + 2 * 60_000).toISOString(),
          last_error: "Gmail rate limit; retrying."
        });
        result.deferred += 1;
      } else {
        await updateMessage(job.id, {
          status: "sent",
          sent_at: new Date().toISOString(),
          gmail_message_id: outcome.id,
          last_error: null
        });
        sentToday.set(client.id, sentToday.get(client.id)! + job.recipient_count);
        result.sent += 1;
      }
      await sleep(WORKER_PAUSE_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retry = job.attempts < 3;
      await updateMessage(job.id, {
        status: retry ? "scheduled" : "failed",
        send_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        last_error: message.slice(0, 300)
      });
      result.failed += 1;
    }
  }

  return json({ ok: true, ...result });
}

async function recipientsSentToday(clientId: string): Promise<number> {
  const { data, error } = await database().rpc("forms_api_recipients_sent_today", { p_client_id: clientId });
  if (error) throw error;
  return Number(data ?? 0);
}

/* Stops one address being flooded: counts emails this key sent to each "to"
   address in the last 24 hours. */
async function recipientCapReason(client: Client, job: Message): Promise<string> {
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  for (const address of job.to_addresses) {
    const { count, error } = await database()
      .from("forms_api_messages")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client.id)
      .eq("status", "sent")
      .gte("sent_at", since)
      .contains("to_addresses", [address]);
    if (error) throw error;
    if ((count ?? 0) >= client.per_recipient_daily_cap) {
      return `${address} already got ${count} emails from this key today; retrying in an hour.`;
    }
  }
  return "";
}

/* ---------- data helpers ---------- */

async function findMessage(client: Client, id: string): Promise<Message> {
  const { data, error } = await database()
    .from("forms_api_messages")
    .select("*")
    .eq("id", id)
    .eq("client_id", client.id)
    .maybeSingle();
  if (error) throw error;
  /* Another key's email answers 404 too, so ids can't be probed. */
  if (!data) throw new ApiError(404, "not_found", "No email with that id.");
  return data as Message;
}

async function findByIdempotencyKey(client: Client, key: string): Promise<Message | null> {
  const { data, error } = await database()
    .from("forms_api_messages")
    .select("*")
    .eq("client_id", client.id)
    .eq("idempotency_key", key)
    .maybeSingle();
  if (error) throw error;
  return (data as Message) ?? null;
}

async function loadClient(id: string): Promise<Client> {
  const { data, error } = await database()
    .from("forms_api_clients")
    .select("id, name, active, reply_to, requests_per_minute, daily_email_cap, per_recipient_daily_cap")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Client;
}

async function updateMessage(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await database().from("forms_api_messages").update(patch).eq("id", id);
  if (error) throw error;
}

function present(message: Message): Record<string, unknown> {
  return {
    id: message.id,
    status: message.status === "sending" ? "scheduled" : message.status,
    to: message.to_addresses,
    cc: message.cc_addresses,
    bcc: message.bcc_addresses,
    reply_to: message.reply_to ? message.reply_to.split(/\s*,\s*/) : [],
    subject: message.subject,
    send_at: message.send_at,
    sent_at: message.sent_at,
    cancelled_at: message.cancelled_at,
    error: message.status === "failed" ? message.last_error : null,
    created_at: message.created_at
  };
}

/* ---------- input parsing ---------- */

function addressList(value: unknown, field: string, required: boolean): string[] {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ApiError(422, "invalid_recipients", `\`${field}\` is required.`);
    return [];
  }
  const items = Array.isArray(value) ? value : [value];
  const addresses = items.map((item) => singleAddress(item, field));
  const unique = [...new Set(addresses)];
  if (required && !unique.length) throw new ApiError(422, "invalid_recipients", `\`${field}\` is required.`);
  return unique;
}

function singleAddress(value: unknown, field: string): string {
  const address = String(value ?? "").trim().toLowerCase();
  /* The pattern has no spaces, commas or line breaks, so an address can't
     smuggle extra recipients or headers into the raw message. */
  if (address.length > 254 || !EMAIL_PATTERN.test(address)) {
    throw new ApiError(422, "invalid_recipients", `\`${field}\` contains an invalid email address: ${String(value).slice(0, 80)}`);
  }
  return address;
}

function optionalBody(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ApiError(422, "invalid_body", `\`${field}\` must be a string.`);
  if (value.length > MAX_BODY_CHARS) {
    throw new ApiError(422, "invalid_body", `\`${field}\` must be under ${MAX_BODY_CHARS.toLocaleString("en-US")} characters.`);
  }
  return value;
}

function resolveSendAt(sendAt: unknown, delayMinutes: unknown): number {
  const now = Date.now();
  const latest = now + MAX_SCHEDULE_DAYS * 24 * 3_600_000;

  if (sendAt !== undefined && sendAt !== null && sendAt !== "" && sendAt !== "now") {
    if (delayMinutes !== undefined && delayMinutes !== null) {
      throw new ApiError(422, "invalid_schedule", "Send either `send_at` or `delay_minutes`, not both.");
    }
    const raw = String(sendAt);
    /* A time without an offset would be read in the server's zone (UTC),
       two hours off Cairo — refuse it instead of guessing. */
    if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
      throw new ApiError(422, "invalid_schedule", "`send_at` needs a time zone, e.g. 2026-11-19T18:00:00+02:00 or …Z.");
    }
    const at = Date.parse(raw);
    if (!Number.isFinite(at)) throw new ApiError(422, "invalid_schedule", "`send_at` is not a valid ISO 8601 date-time.");
    if (at > latest) throw new ApiError(422, "invalid_schedule", `\`send_at\` can be at most ${MAX_SCHEDULE_DAYS} days ahead.`);
    return Math.max(at, now); // a time in the past means "now"
  }

  if (delayMinutes !== undefined && delayMinutes !== null) {
    const minutes = Number(delayMinutes);
    if (!Number.isFinite(minutes) || minutes < 0 || now + minutes * 60_000 > latest) {
      throw new ApiError(422, "invalid_schedule", `\`delay_minutes\` must be between 0 and ${MAX_SCHEDULE_DAYS * 24 * 60}.`);
    }
    return now + minutes * 60_000;
  }

  return now;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    throw new ApiError(413, "payload_too_large", "Request body must be under 300 KB.");
  }
  const raw = await request.text();
  if (raw.length > MAX_REQUEST_BYTES) {
    throw new ApiError(413, "payload_too_large", "Request body must be under 300 KB.");
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "invalid_json", "The body must be a JSON object.");
  }
}

function optionalToken(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  const token = String(value);
  if (!TOKEN_PATTERN.test(token)) {
    throw new ApiError(422, "invalid_request", `\`${field}\` may only contain letters, digits and . _ : - (max 128).`);
  }
  return token;
}

/* ---------- Gmail ---------- */

function gmailConfigured(): boolean {
  return Boolean(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN && GMAIL_SENDER_EMAIL);
}

async function getGmailAccessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(`Gmail token refresh failed: ${response.status}`);
  }
  return body.access_token;
}

async function sendEmail(accessToken: string, message: Message): Promise<{ rateLimited: boolean; id: string | null }> {
  /* Re-checked here as well as at intake: these strings go into raw headers. */
  const all = [...message.to_addresses, ...message.cc_addresses, ...message.bcc_addresses];
  const replyTo = message.reply_to ? message.reply_to.split(/\s*,\s*/) : [];
  if ([...all, ...replyTo].some((address) => !EMAIL_PATTERN.test(address))) {
    throw new Error("Refusing to send to an invalid address.");
  }

  const text = message.text_body ?? htmlToText(message.html_body ?? "");
  const html = message.html_body ?? textToHtml(message.text_body ?? "");
  const boundary = `resala-${crypto.randomUUID()}`;

  const raw = [
    `From: ${encodeHeader(GMAIL_SENDER_NAME)} <${GMAIL_SENDER_EMAIL}>`,
    `To: ${message.to_addresses.join(", ")}`,
    ...(message.cc_addresses.length ? [`Cc: ${message.cc_addresses.join(", ")}`] : []),
    /* Gmail delivers to Bcc and strips the header before it goes out. */
    ...(message.bcc_addresses.length ? [`Bcc: ${message.bcc_addresses.join(", ")}`] : []),
    ...(replyTo.length ? [`Reply-To: ${replyTo.join(", ")}`] : []),
    `Subject: ${encodeHeader(message.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(utf8Base64(text)),
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(utf8Base64(html)),
    `--${boundary}--`
  ].join("\r\n");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: utf8Base64(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "") })
  });

  if (response.status === 429) return { rateLimited: true, id: null };
  const detail = await response.text();
  if (!response.ok) {
    if (/rateLimitExceeded|userRateLimitExceeded/.test(detail)) return { rateLimited: true, id: null };
    throw new Error(`Gmail send failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  try {
    return { rateLimited: false, id: JSON.parse(detail).id ?? null };
  } catch {
    return { rateLimited: false, id: null };
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textToHtml(text: string): string {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#172033;">${escaped.replace(/\r?\n/g, "<br>")}</body></html>`;
}

/* ---------- small utilities ---------- */

function encodeHeader(value: string): string {
  const clean = String(value).replace(/[\r\n]+/g, " ");
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${utf8Base64(clean)}?=`;
}

function utf8Base64(value: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function wrapBase64(value: string): string {
  return value.replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function methodNotAllowed(): ApiError {
  return new ApiError(405, "method_not_allowed", "Method not allowed.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers }
  });
}
