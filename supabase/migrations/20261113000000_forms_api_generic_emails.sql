-- Forms API v2: a plain "send this email" API.
--
-- The caller (a trusted developer's server) sends subject, body, recipients
-- and when to send. Each email is queued here and the cron worker sends it
-- from the Resala Gmail account when it is due.
--
-- Keys, per-key caps and the request log stay in forms_api_clients and
-- forms_api_requests from the first migration.

create table if not exists public.forms_api_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.forms_api_clients(id) on delete cascade,
  idempotency_key text check (idempotency_key is null or length(idempotency_key) <= 128),
  to_addresses text[] not null,
  cc_addresses text[] not null default '{}',
  bcc_addresses text[] not null default '{}',
  reply_to text,
  subject text not null check (length(subject) <= 250),
  html_body text,
  text_body text,
  recipient_count integer not null check (recipient_count between 1 and 50),
  send_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'sending', 'sent', 'cancelled', 'failed')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  gmail_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  unique (client_id, idempotency_key)
);

create index if not exists forms_api_messages_due_idx
  on public.forms_api_messages (send_at) where status = 'scheduled';
create index if not exists forms_api_messages_sent_client_idx
  on public.forms_api_messages (client_id, sent_at) where status = 'sent';
create index if not exists forms_api_messages_to_idx
  on public.forms_api_messages using gin (to_addresses);

alter table public.forms_api_messages enable row level security;

create or replace function public.forms_api_claim_due_messages(p_limit integer)
returns setof public.forms_api_messages
language sql
security definer
set search_path = public
as $$
  update public.forms_api_messages m
     set status = 'sending', attempts = m.attempts + 1, claimed_at = now()
   where m.id in (
     select id from public.forms_api_messages
      where status = 'scheduled' and send_at <= now()
      order by send_at
      limit greatest(1, least(p_limit, 100))
      for update skip locked
   )
  returning m.*;
$$;

-- A worker run that died mid-send leaves rows in 'sending'. Gmail may already
-- have delivered them, so they are marked failed instead of sent twice.
create or replace function public.forms_api_fail_stuck_messages()
returns integer
language sql
security definer
set search_path = public
as $$
  with stuck as (
    update public.forms_api_messages
       set status = 'failed', last_error = 'Worker stopped before confirming the send.'
     where status = 'sending' and claimed_at < now() - interval '15 minutes'
    returning 1
  )
  select count(*)::integer from stuck;
$$;

-- Recipients this key has been sent to in the last 24 hours, for the daily cap.
create or replace function public.forms_api_recipients_sent_today(p_client_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(recipient_count), 0)::integer
    from public.forms_api_messages
   where client_id = p_client_id and status = 'sent' and sent_at > now() - interval '24 hours';
$$;

revoke all on function public.forms_api_claim_due_messages(integer) from public, anon, authenticated;
revoke all on function public.forms_api_fail_stuck_messages() from public, anon, authenticated;
revoke all on function public.forms_api_recipients_sent_today(uuid) from public, anon, authenticated;

-- The registration / receipt flow this replaces was never given to anyone, so
-- its tables are empty. Uncomment to remove them:
-- (functions first: forms_api_claim_due_emails returns the table's row type)
-- drop function if exists public.forms_api_claim_due_emails(integer);
-- drop function if exists public.forms_api_fail_stuck_emails();
-- drop table if exists public.forms_api_emails;
-- drop table if exists public.forms_api_submissions;
