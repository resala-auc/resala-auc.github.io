#!/usr/bin/env node
/*
 * Issues a Forms API key.
 *
 *   node scripts/forms-api-key.mjs "Good Game tournament site" [reply-to@address]
 *
 * Prints the key once (hand it to the developer over a private channel) and
 * the SQL to paste into the Supabase SQL editor. Only the sha256 of the key is
 * stored, so a lost key can't be recovered: issue a new one and deactivate
 * the old row instead.
 *
 * Whoever holds the key can send any email from the Resala account, so give
 * it only to a developer you trust, for a server they control.
 */
import { createHash, randomBytes } from "node:crypto";

const [name, replyTo = ""] = process.argv.slice(2);
if (!name) {
  console.error('Usage: node scripts/forms-api-key.mjs "<who the key is for>" [reply-to@address]');
  process.exit(1);
}
if (replyTo && !/^[^\s<>@,;"]+@[^\s<>@,;"]+\.[^\s<>@,;"]+$/.test(replyTo)) {
  console.error("The reply-to address is not a valid email address.");
  process.exit(1);
}

const key = `rsl_live_${randomBytes(32).toString("base64url")}`;
const hash = createHash("sha256").update(key).digest("hex");
const prefix = key.slice(0, 16);
const sql = (value) => (value ? `'${value.replaceAll("'", "''")}'` : "null");

console.log(`
API key (shown once; send it privately, never in a public repo or group chat):

  ${key}

SQL to run in the Supabase SQL editor:

insert into public.forms_api_clients (name, key_prefix, key_hash, event_name, reply_to, per_recipient_daily_cap)
values (${sql(name)}, ${sql(prefix)}, ${sql(hash)}, ${sql(name)}, ${sql(replyTo)}, 10);

Limits (change any time with an update on that row):
  requests_per_minute = 60, daily_email_cap = 300 recipients / 24h,
  per_recipient_daily_cap = 10 emails to the same address / 24h

To revoke (queued emails are dropped too):

update public.forms_api_clients set active = false where key_prefix = ${sql(prefix)};
`);
