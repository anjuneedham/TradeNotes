-- AI Coach (paid plans). Each row is one coach exchange. cost_micros (millionths of a US dollar) is what Anthropic billed for it;
-- the sum for the current calendar month is checked against the plan's monthly AI allowance before every question.
create table if not exists tradenotes.ai_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null default tradenotes.uid() references public.tn_user(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (length(content) <= 20000),
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_micros bigint not null default 0 check (cost_micros >= 0),
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_user_created on tradenotes.ai_messages (user_id, created_at desc);
alter table tradenotes.ai_messages enable row level security;
drop policy if exists own_rows on tradenotes.ai_messages;
create policy own_rows on tradenotes.ai_messages for all using (user_id = (select tradenotes.uid())) with check (user_id = (select tradenotes.uid()));
-- Append-only for clients: the log is also the spend meter, so users must not edit or delete it (it goes when the account is deleted).
grant select, insert on tradenotes.ai_messages to app_user;
revoke update, delete on tradenotes.ai_messages from app_user;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then execute format('revoke all on tradenotes.ai_messages from %I', r); end if;
  end loop;
end $$;
