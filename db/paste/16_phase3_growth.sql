-- 16: Phase 3 (differentiation and growth). Idempotent. Three NEW user tables (TradeNotes now has 25):
--   backtest_trades:      hypothetical trades typed in by hand (Premium). Deliberately a separate table: nothing here can ever reach the real
--                         `trades` table or any real statistic. Exits are a small JSON list on the row (max 10), so no second table is needed.
--   backtest_screenshots: images attached to a hypothetical trade. Same private bucket as real screenshots, separate path prefix
--                         "<user_id>/backtest/<id>/<uuid>.<ext>", counted in the same per-user quota and the same upload rate window.
--   share_links:          owner-controlled, revocable public report links. Only a SHA-256 hash of the token is stored (the token is shown once).
--                         Public pages resolve a link through resolve_share_link(hash); nobody can list or read links except their owner.
-- All three: row-level security (own rows only), no grants to anon/authenticated, owner checks in triggers, caps.

-- ---------- backtest_trades ----------
create table if not exists tradenotes.backtest_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tn_user(id) on delete cascade,
  symbol text not null check (length(symbol) between 1 and 24),
  asset_class text check (asset_class in ('stock','option','future','forex','crypto','other')),
  side text not null check (side in ('long','short')),
  quantity numeric(20,8) not null check (quantity > 0),
  entry_price numeric(20,8) not null check (entry_price > 0),
  stop_price numeric(20,8) check (stop_price is null or stop_price > 0),
  target_price numeric(20,8) check (target_price is null or target_price > 0),
  multiplier numeric(20,8) not null default 1 check (multiplier > 0),
  fees numeric(18,2) not null default 0 check (fees >= 0),
  initial_risk numeric(18,2),
  opened_at timestamptz not null,
  closed_at timestamptz,
  exits jsonb not null default '[]'::jsonb check (jsonb_typeof(exits) = 'array' and jsonb_array_length(exits) <= 10),
  strategy text check (strategy is null or length(strategy) between 1 and 60),
  timeframe text check (timeframe is null or length(timeframe) <= 40),
  session text check (session is null or length(session) <= 40),
  pre_trade_notes text check (pre_trade_notes is null or length(pre_trade_notes) <= 5000),
  post_trade_notes text check (post_trade_notes is null or length(post_trade_notes) <= 5000),
  lessons text check (lessons is null or length(lessons) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closed_at is null or closed_at >= opened_at)
);
create index if not exists backtest_trades_user_opened on tradenotes.backtest_trades (user_id, opened_at desc);

create or replace function tradenotes.check_backtest_trade() returns trigger language plpgsql security definer set search_path = '' as $$
declare e jsonb;
begin
  for e in select * from jsonb_array_elements(new.exits) loop
    -- coalesce: a missing key gives NULL, and a NULL condition would silently pass the check
    if coalesce(jsonb_typeof(e), '') <> 'object' or coalesce(jsonb_typeof(e->'quantity'), '') <> 'number' or coalesce(jsonb_typeof(e->'price'), '') <> 'number'
       or (e->>'quantity')::numeric <= 0 or (e->>'price')::numeric <= 0 then
      raise exception 'invalid exit in backtest trade';
    end if;
  end loop;
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtext('tn_backtests:' || new.user_id::text)); -- two parallel inserts cannot both pass the count
    if (select count(*) from tradenotes.backtest_trades where user_id = new.user_id) >= 2000 then
      raise exception 'backtest trade limit reached';
    end if;
  end if;
  return new;
end $$;
revoke all on function tradenotes.check_backtest_trade() from public;
drop trigger if exists backtest_trades_check on tradenotes.backtest_trades;
create trigger backtest_trades_check before insert or update on tradenotes.backtest_trades for each row execute function tradenotes.check_backtest_trade();

-- ---------- backtest_screenshots ----------
create table if not exists tradenotes.backtest_screenshots (
  id uuid primary key default gen_random_uuid(),
  backtest_id uuid not null references tradenotes.backtest_trades(id) on delete cascade,
  user_id uuid not null references public.tn_user(id) on delete cascade,
  storage_path text not null,
  caption text check (caption is null or length(caption) <= 500),
  size_bytes integer not null default 0 check (size_bytes between 0 and 2097152),
  content_type text not null default 'image/png' check (content_type in ('image/png','image/jpeg','image/webp')),
  created_at timestamptz not null default now(),
  -- Object path must be <user_id>/backtest/<backtest_id>/<uuid>.<ext> and match the row's own user and backtest (no path tricks).
  check (storage_path = user_id::text || '/backtest/' || backtest_id::text || '/' || split_part(storage_path, '/', 4)
         and split_part(storage_path, '/', 4) ~ '^[0-9a-f-]{36}\.(png|jpg|webp)$')
);
create unique index if not exists backtest_screenshots_path_uidx on tradenotes.backtest_screenshots (storage_path);
create index if not exists backtest_screenshots_backtest_idx on tradenotes.backtest_screenshots (backtest_id);
create index if not exists backtest_screenshots_user_created on tradenotes.backtest_screenshots (user_id, created_at desc);

-- Same rules as real screenshots: 5 per hypothetical trade; uploads share the per-user hourly window (30) with real screenshots.
create or replace function tradenotes.check_backtest_screenshot() returns trigger language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  perform 1 from tradenotes.backtest_trades where id = new.backtest_id and user_id = new.user_id for update;
  if not found then raise exception 'backtest trade does not belong to user'; end if;
  if tg_op = 'UPDATE' then return new; end if;
  if (select count(*) from tradenotes.backtest_screenshots where backtest_id = new.backtest_id) >= 5 then
    raise exception 'screenshot limit reached for this backtest trade';
  end if;
  update tradenotes.profiles
     set shot_window_count = case when shot_window_start > now() - interval '1 hour' then shot_window_count + 1 else 1 end,
         shot_window_start = case when shot_window_start > now() - interval '1 hour' then shot_window_start else now() end
   where id = new.user_id returning shot_window_count into n;
  if n > 30 then raise exception 'screenshot rate limit reached'; end if;
  return new;
end $$;
revoke all on function tradenotes.check_backtest_screenshot() from public;
drop trigger if exists backtest_shots_check on tradenotes.backtest_screenshots;
create trigger backtest_shots_check before insert or update on tradenotes.backtest_screenshots for each row execute function tradenotes.check_backtest_screenshot();

-- Storage total on plain Postgres (no storage schema) now includes hypothetical-trade screenshots too. On Supabase it still reads storage.objects.
create or replace function tradenotes.storage_used_bytes() returns bigint language plpgsql security definer set search_path = '' stable as $$
declare total bigint;
begin
  if to_regclass('storage.objects') is not null then
    begin
      execute 'select coalesce(sum((metadata->>''size'')::bigint), 0) from storage.objects' into total;
      return total;
    exception when others then null; -- no privilege: fall back below
    end;
  end if;
  select coalesce((select sum(size_bytes) from tradenotes.trade_screenshots), 0) + coalesce((select sum(size_bytes) from tradenotes.backtest_screenshots), 0) into total;
  return total;
end $$;
revoke all on function tradenotes.storage_used_bytes() from public;
grant execute on function tradenotes.storage_used_bytes() to app_user;

-- ---------- share_links ----------
create table if not exists tradenotes.share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tn_user(id) on delete cascade,
  label text check (label is null or length(label) <= 60),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  scope text not null default 'all' check (scope in ('all','ytd','90d','30d')),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  show_amounts boolean not null default false, -- false (default): the public page shows ratios and the shape of the curve only, no money amounts
  check (expires_at > created_at and expires_at <= created_at + interval '366 days')
);
alter table tradenotes.share_links add column if not exists show_amounts boolean not null default false; -- for databases that already ran an earlier draft of this file
create index if not exists share_links_user_idx on tradenotes.share_links (user_id, created_at desc);

-- At most 5 usable links and 100 rows per user. After creation only the label and the revocation can change, and a revoked link stays revoked.
create or replace function tradenotes.check_share_link() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtext('tn_share_links:' || new.user_id::text));
    if (select count(*) from tradenotes.share_links where user_id = new.user_id and revoked_at is null and expires_at > now()) >= 5 then
      raise exception 'share link limit reached';
    end if;
    if (select count(*) from tradenotes.share_links where user_id = new.user_id) >= 100 then
      raise exception 'share link history limit reached';
    end if;
  else
    if new.user_id is distinct from old.user_id or new.token_hash is distinct from old.token_hash or new.scope is distinct from old.scope
       or new.expires_at is distinct from old.expires_at or new.created_at is distinct from old.created_at or new.show_amounts is distinct from old.show_amounts then
      raise exception 'a share link cannot be changed, only revoked';
    end if;
    if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
      raise exception 'a revoked share link stays revoked';
    end if;
  end if;
  return new;
end $$;
revoke all on function tradenotes.check_share_link() from public;
drop trigger if exists share_links_check on tradenotes.share_links;
create trigger share_links_check before insert or update on tradenotes.share_links for each row execute function tradenotes.check_share_link();

-- The ONLY way a public page learns whose report a token opens: exact hash match, not revoked, not expired. Returns nothing otherwise.
drop function if exists tradenotes.resolve_share_link(text); -- the return type grew (show_amounts); CREATE OR REPLACE cannot change it
create or replace function tradenotes.resolve_share_link(p_hash text) returns table (user_id uuid, scope text, show_amounts boolean)
language sql security definer set search_path = '' stable as $$
  select s.user_id, s.scope, s.show_amounts from tradenotes.share_links s
   where s.token_hash = p_hash and s.revoked_at is null and s.expires_at > now();
$$;
revoke all on function tradenotes.resolve_share_link(text) from public;
grant execute on function tradenotes.resolve_share_link(text) to app_user;

-- ---------- row-level security, grants ----------
alter table tradenotes.backtest_trades enable row level security;
alter table tradenotes.backtest_screenshots enable row level security;
alter table tradenotes.share_links enable row level security;
do $$
declare t text;
begin
  foreach t in array array['backtest_trades','backtest_screenshots','share_links'] loop
    execute format('drop policy if exists own_rows on tradenotes.%I', t);
    execute format('create policy own_rows on tradenotes.%I for all using (user_id = (select tradenotes.uid())) with check (user_id = (select tradenotes.uid()))', t);
  end loop;
end $$;
grant select, insert, update, delete on tradenotes.backtest_trades, tradenotes.backtest_screenshots, tradenotes.share_links to app_user;

-- Same guard as 06/11/13/14: the public API roles never get a grant on anything TradeNotes owns.
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema tradenotes from %I', r);
      execute format('revoke all on all functions in schema tradenotes from %I', r);
    end if;
  end loop;
end $$;
