-- AI Coach conversation log (Pro). Also the source of truth for the per-user daily message cap.
create table if not exists tradenotes.ai_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null default tradenotes.uid() references public.tn_user(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (length(content) <= 20000),
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_user_created on tradenotes.ai_messages (user_id, created_at desc);
alter table tradenotes.ai_messages enable row level security;
drop policy if exists own_rows on tradenotes.ai_messages;
create policy own_rows on tradenotes.ai_messages for all using (user_id = (select tradenotes.uid())) with check (user_id = (select tradenotes.uid()));
-- Append-only for clients: the log is also the daily allowance counter, so users must not edit or delete it.
grant select, insert on tradenotes.ai_messages to app_user;
revoke update, delete on tradenotes.ai_messages from app_user;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then execute format('revoke all on tradenotes.ai_messages from %I', r); end if;
  end loop;
end $$;
