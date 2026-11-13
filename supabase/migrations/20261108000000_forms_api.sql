-- Forms API: lets an outside form (e.g. one hosted on Vercel) register the
-- people who filled it in, and have Resala send them confirmation and
-- payment-reminder emails from the Resala Gmail account.
--
-- The caller never chooses what an email says or where links point. Wording,
-- the payment link, the reminder delay and the caps all live on the client
-- row below, which only a Resala admin edits. The caller only says "this
-- person registered" and later "this person paid".
--
-- Every table has RLS on and no policies, so only the service role (the edge
-- function) can read or write them. Nothing here is reachable with the anon key.

create extension if not exists pgcrypto;

create table if not exists public.forms_api_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- First characters of the key, safe to show so people can tell keys apart.
  key_prefix text not null unique,
  -- sha256 hex of the full key. The key itself is never stored.
  key_hash text not null unique,
  active boolean not null default true,

  -- What the emails say. Set by Resala, never by the caller.
  event_name text not null,
  confirmation_message text,
  reminder_message text,
  payment_received_message text,
  payment_url text check (payment_url is null or payment_url ~ '^https://'),
  reply_to text check (reply_to is null or reply_to ~ '^[^\s<>@,;"]+@[^\s<>@,;"]+\.[^\s<>@,;"]+$'),

  -- Reminder schedule.
  reminder_delay_hours integer not null default 48 check (reminder_delay_hours between 1 and 720),
  reminder_interval_hours integer not null default 48 check (reminder_interval_hours between 1 and 720),
  max_reminders integer not null default 1 check (max_reminders between 0 and 3),
  send_payment_receipt boolean not null default true,
  -- Email the person when the form tells us they uploaded a payment screenshot.
  send_receipt_acknowledgement boolean not null default true,

  -- Abuse limits.
  requests_per_minute integer not null default 60 check (requests_per_minute between 1 and 600),
  daily_email_cap integer not null default 300 check (daily_email_cap between 1 and 1500),
  per_recipient_daily_cap integer not null default 3 check (per_recipient_daily_cap between 1 and 10),

  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists public.forms_api_submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.forms_api_clients(id) on delete cascade,
  external_id text check (external_id is null or length(external_id) <= 128),
  idempotency_key text check (idempotency_key is null or length(idempotency_key) <= 128),
  email text not null check (length(email) <= 254),
  full_name text not null check (length(full_name) <= 120),
  amount numeric(12, 2) check (amount is null or amount >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  status text not null check (status in ('pending_payment', 'payment_review', 'paid', 'cancelled', 'registered')),
  -- Receipt review happens on the form's own site; these record what it told us.
  receipt_submitted_at timestamptz,
  receipt_submissions integer not null default 0,
  verified_by text check (verified_by is null or length(verified_by) <= 120),
  rejection_reason text check (rejection_reason is null or rejection_reason in
    ('amount_mismatch', 'unreadable', 'payment_not_found', 'duplicate', 'other')),
  rejected_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, external_id),
  unique (client_id, idempotency_key)
);

create index if not exists forms_api_submissions_client_created_idx
  on public.forms_api_submissions (client_id, created_at desc);

create table if not exists public.forms_api_emails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.forms_api_clients(id) on delete cascade,
  submission_id uuid not null references public.forms_api_submissions(id) on delete cascade,
  kind text not null check (kind in
    ('confirmation', 'payment_reminder', 'receipt_received', 'receipt_rejected', 'payment_received')),
  sequence integer not null default 1,
  recipient text not null,
  send_at timestamptz not null,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'cancelled', 'failed')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (submission_id, kind, sequence)
);

create index if not exists forms_api_emails_due_idx
  on public.forms_api_emails (send_at) where status = 'queued';
create index if not exists forms_api_emails_sent_client_idx
  on public.forms_api_emails (client_id, sent_at) where status = 'sent';
create index if not exists forms_api_emails_sent_recipient_idx
  on public.forms_api_emails (recipient, sent_at) where status = 'sent';

create table if not exists public.forms_api_requests (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.forms_api_clients(id) on delete cascade,
  method text not null,
  path text not null,
  status integer,
  created_at timestamptz not null default now()
);

create index if not exists forms_api_requests_client_created_idx
  on public.forms_api_requests (client_id, created_at desc);

alter table public.forms_api_clients enable row level security;
alter table public.forms_api_submissions enable row level security;
alter table public.forms_api_emails enable row level security;
alter table public.forms_api_requests enable row level security;

-- Records one request and returns how many this client made in the last
-- minute, so the function can refuse once it passes the client's limit.
create or replace function public.forms_api_hit(p_client_id uuid, p_method text, p_path text)
returns integer
language sql
security definer
set search_path = public
as $$
  with inserted as (
    insert into public.forms_api_requests (client_id, method, path)
    values (p_client_id, p_method, left(p_path, 200))
    returning 1
  )
  select (select count(*)::integer from public.forms_api_requests
          where client_id = p_client_id and created_at > now() - interval '1 minute')
         + (select count(*)::integer from inserted);
$$;

-- Takes due emails for one worker run. SKIP LOCKED means two overlapping cron
-- runs can never pick up the same row, so nobody gets the same email twice.
create or replace function public.forms_api_claim_due_emails(p_limit integer)
returns setof public.forms_api_emails
language sql
security definer
set search_path = public
as $$
  update public.forms_api_emails e
     set status = 'sending', attempts = e.attempts + 1, claimed_at = now()
   where e.id in (
     select id from public.forms_api_emails
      where status = 'queued' and send_at <= now()
      order by send_at
      limit greatest(1, least(p_limit, 100))
      for update skip locked
   )
  returning e.*;
$$;

-- A run that died between claiming and finishing leaves rows in 'sending'.
-- Those are marked failed rather than retried: Gmail may already have sent
-- them, and a missed reminder is better than a duplicate one.
create or replace function public.forms_api_fail_stuck_emails()
returns integer
language sql
security definer
set search_path = public
as $$
  with stuck as (
    update public.forms_api_emails
       set status = 'failed', last_error = 'Worker stopped before confirming the send.'
     where status = 'sending' and claimed_at < now() - interval '15 minutes'
    returning 1
  )
  select count(*)::integer from stuck;
$$;

revoke all on function public.forms_api_hit(uuid, text, text) from public, anon, authenticated;
revoke all on function public.forms_api_claim_due_emails(integer) from public, anon, authenticated;
revoke all on function public.forms_api_fail_stuck_emails() from public, anon, authenticated;
