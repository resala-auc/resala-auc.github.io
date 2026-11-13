-- Team registrations and a reminder cut-off.
--
-- team_name: a team form (e.g. the Good Game tournament) registers one
-- submission per team, emailed to its first player. The team name is kept so
-- the emails can mention it.
--
-- reminders_stop_at: no payment reminder goes out after this moment. A
-- reminder that would land after an event is worse than none.

alter table public.forms_api_submissions
  add column if not exists team_name text check (team_name is null or length(team_name) <= 120);

alter table public.forms_api_clients
  add column if not exists reminders_stop_at timestamptz;
