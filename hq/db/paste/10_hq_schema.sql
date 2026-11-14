-- HQ (internal ops) schema. Idempotent. Lives beside tradenotes.* in the same Postgres; touched ONLY by the HQ owner connection.
-- Locked from the Supabase Data API: RLS on with no policies, no grants to anon/authenticated.
do $$ begin
  if to_regclass('public.tn_user') is null or to_regclass('tradenotes.subscriptions') is null then
    raise exception 'TradeNotes customer schema is missing: deploy the customer app first (needs public.tn_user and tradenotes.subscriptions)';
  end if;
end $$;
create schema if not exists hq;

create table if not exists hq.settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
create table if not exists hq.templates (key text primary key, title text not null, body text not null, updated_at timestamptz not null default now());

-- Outreach CRM ------------------------------------------------------------------------------------------
create table if not exists hq.prospects (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('tiktok','instagram','youtube','other')),
  handle text not null check (length(handle) between 1 and 60),
  name text,
  source_note text,                       -- the specific thing they posted (personalisation)
  stage text not null default 'found' check (stage in ('found','engaged','dm_sent','replied','interested','signed_up','activated','paying','lost','not_now')),
  objection text,
  do_not_contact boolean not null default false,
  customer_email text,                    -- set when they sign up (links prospect -> customer)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists prospects_platform_handle on hq.prospects (platform, lower(handle));
create index if not exists prospects_stage_idx on hq.prospects (stage);
create index if not exists prospects_email_idx on hq.prospects (lower(customer_email));

create table if not exists hq.touches (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references hq.prospects(id) on delete cascade,
  kind text not null check (kind in ('comment','follow','dm','followup','reply','demo','call','note')),
  body text,
  link_tag text check (link_tag is null or link_tag ~ '^[a-z0-9-]{1,24}$'),
  at timestamptz not null default now()
);
create index if not exists touches_prospect_idx on hq.touches (prospect_id, at);
create index if not exists touches_at_idx on hq.touches (at);
-- Playbook rule: never send the same message twice to one person.
create unique index if not exists touches_no_dup_message on hq.touches (prospect_id, md5(body)) where kind in ('dm','followup') and body is not null;
-- Playbook rule: one follow-up, then stop.
create unique index if not exists touches_one_followup on hq.touches (prospect_id) where kind = 'followup';

-- Content studio ----------------------------------------------------------------------------------------
create table if not exists hq.content_items (
  id uuid primary key default gen_random_uuid(),
  code int generated always as identity,
  idea_no int,
  format text not null check (format in ('F1','F2','F3','F4','F5')),
  pillar text,
  title text not null,
  hook text,
  talking_points text,
  voiceover text,
  screen_plan text,
  captions_note text,
  cta text,
  yt_title text,
  tt_caption text,
  claims text,
  checks jsonb not null default '{}'::jsonb,   -- compliance checklist ticks
  editing_notes text,
  status text not null default 'idea' check (status in ('idea','scripted','approved','recorded','edited','posted','measured')),
  planned_for date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists content_idea_no on hq.content_items (idea_no) where idea_no is not null;
create index if not exists content_status_idx on hq.content_items (status);

create table if not exists hq.posts (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references hq.content_items(id) on delete set null,
  platform text not null check (platform in ('tiktok','youtube','instagram')),
  url text,
  posted_at timestamptz not null default now(),
  views int not null default 0 check (views >= 0),
  view_rate_3s numeric(5,2) check (view_rate_3s is null or view_rate_3s between 0 and 100),
  avg_watch_pct numeric(5,2) check (avg_watch_pct is null or avg_watch_pct between 0 and 100),
  saves int not null default 0 check (saves >= 0),
  link_clicks int not null default 0 check (link_clicks >= 0),
  signups int not null default 0 check (signups >= 0),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists posts_posted_idx on hq.posts (posted_at);
create index if not exists posts_content_idx on hq.posts (content_id);

-- Social + paid ------------------------------------------------------------------------------------------
create table if not exists hq.social_accounts (platform text primary key check (platform in ('tiktok','youtube','instagram')), handle text, profile_url text, updated_at timestamptz not null default now());
create table if not exists hq.follower_snapshots (platform text not null, day date not null, followers int not null check (followers >= 0), primary key (platform, day));
create table if not exists hq.ad_spend (
  id uuid primary key default gen_random_uuid(),
  day date not null, platform text not null check (platform in ('instagram','tiktok','other')),
  spend numeric(10,2) not null check (spend >= 0), impressions int not null default 0 check (impressions >= 0), clicks int not null default 0 check (clicks >= 0),
  note text, created_at timestamptz not null default now(), unique (day, platform)
);

-- Customers (HQ-side metadata; erased with the user) -------------------------------------------------------
create table if not exists hq.customer_meta (
  user_id uuid primary key references public.tn_user(id) on delete cascade,
  notes text,
  email_ok boolean not null default false,        -- owner confirmed the address belongs to the person
  email_opt_out boolean not null default false,
  founding_call_at timestamptz,
  testimonial text not null default 'none' check (testimonial in ('none','asked','written_permission')),
  updated_at timestamptz not null default now()
);
create table if not exists hq.messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.tn_user(id) on delete cascade,
  step text not null, subject text not null, status text not null check (status in ('sent','failed','skipped')), error text,
  at timestamptz not null default now()
);
-- A nurture step is sent at most once per person (failed/skipped attempts don't block a retry).
create unique index if not exists messages_once on hq.messages (user_id, step) where status in ('sent','skipped');

-- Feedback, tasks, reports, auth -----------------------------------------------------------------------------
create table if not exists hq.feedback (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('feedback','bug','question','objection','testimonial','feature')),
  source text, who text, body text not null, tag text,
  status text not null default 'open' check (status in ('open','done','wontfix')),
  created_at timestamptz not null default now()
);
create table if not exists hq.tasks (
  id uuid primary key default gen_random_uuid(),
  area text not null default 'launch', title text not null, detail text, owner text not null default 'you',
  done boolean not null default false, done_at timestamptz, sort int not null default 100, seed_key text unique,
  created_at timestamptz not null default now()
);
create table if not exists hq.daily_reports (day date primary key, blockers text, bugs text, notes text, snapshot jsonb not null default '{}'::jsonb, saved_at timestamptz not null default now());
create table if not exists hq.login_attempts (id bigint generated always as identity primary key, at timestamptz not null default now(), ok boolean not null, ip text);
create index if not exists login_attempts_at on hq.login_attempts (at);

-- Lock everything: RLS on, no policies, nothing for the Supabase API roles.
do $$ declare t text; r text; begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'hq' and c.relkind = 'r' loop
    execute format('alter table hq.%I enable row level security', t);
  end loop;
  foreach r in array array['anon','authenticated','app_user'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on schema hq from %I', r);
      execute format('revoke all on all tables in schema hq from %I', r);
      execute format('revoke all on all sequences in schema hq from %I', r);
    end if;
  end loop;
end $$;
