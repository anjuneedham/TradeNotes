-- 17: Discord community check-ins (idempotent; additive only). OWNER-CONNECTION ONLY, like the affiliate tables:
-- no policies and no grants to app_user/anon/authenticated. Holds only a Discord user id and what the member typed into /checkin
-- (plan followed yes/partly/no, an optional mistake label, an optional short note). It never holds trades or account data.
create table if not exists tradenotes.discord_checkins (
  id uuid primary key default gen_random_uuid(),
  discord_user_id text not null check (discord_user_id ~ '^[0-9]{5,25}$'),
  day date not null,                                                    -- the member's check-in day (America/Jamaica)
  followed text not null check (followed in ('yes','partly','no')),
  mistake text check (mistake is null or char_length(mistake) <= 40),
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  unique (discord_user_id, day)                                         -- one check-in per member per day; a re-run replaces it
);
alter table tradenotes.discord_checkins enable row level security;
revoke all on tradenotes.discord_checkins from app_user;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on tradenotes.discord_checkins from %I', r);
    end if;
  end loop;
end $$;
