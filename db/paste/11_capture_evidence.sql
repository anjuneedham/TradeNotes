-- 11: Phase 1 (capture and evidence). Idempotent and additive; no new tables.
-- * profiles.timezone: IANA zone used to read broker times that carry no offset (stored values stay UTC).
-- * imports.preset: which broker format was used.
-- * trade_screenshots: size + content type (quota and per-image caps are enforced in app code and double-checked here).
-- * storage_used_bytes(): total bytes in the Supabase Storage of this project (all buckets, so a shared project is counted
--   in full), falling back to TradeNotes' own screenshot rows when there is no storage schema (local/CI Postgres).
-- * Supabase Storage defence in depth: the public API roles can never touch the trade-screenshots bucket.

alter table tradenotes.profiles add column if not exists timezone text not null default 'UTC';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_timezone_chk') then
    alter table tradenotes.profiles add constraint profiles_timezone_chk check (timezone ~ '^[A-Za-z0-9_+/-]{1,64}$');
  end if;
end $$;

alter table tradenotes.imports add column if not exists preset text;

alter table tradenotes.trade_screenshots add column if not exists size_bytes integer not null default 0;
alter table tradenotes.trade_screenshots add column if not exists content_type text not null default 'image/png';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'trade_screenshots_size_chk') then
    alter table tradenotes.trade_screenshots add constraint trade_screenshots_size_chk check (size_bytes between 0 and 2097152);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trade_screenshots_type_chk') then
    alter table tradenotes.trade_screenshots add constraint trade_screenshots_type_chk check (content_type in ('image/png','image/jpeg','image/webp'));
  end if;
  -- Object path must be <user_id>/<trade_id>/<uuid>.<ext> and match the row's own user and trade (no path tricks).
  if not exists (select 1 from pg_constraint where conname = 'trade_screenshots_path_chk') then
    alter table tradenotes.trade_screenshots add constraint trade_screenshots_path_chk
      check (storage_path = user_id::text || '/' || trade_id::text || '/' || split_part(storage_path, '/', 3)
             and split_part(storage_path, '/', 3) ~ '^[0-9a-f-]{36}\.(png|jpg|webp)$');
  end if;
end $$;
create unique index if not exists trade_screenshots_path_uidx on tradenotes.trade_screenshots (storage_path);
create index if not exists trade_screenshots_user_created on tradenotes.trade_screenshots (user_id, created_at desc);

-- At most 5 screenshots per trade, enforced in the database too (the app checks first and shows a friendly message).
create or replace function tradenotes.check_screenshot_count() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from tradenotes.trade_screenshots where trade_id = new.trade_id) >= 5 then
    raise exception 'screenshot limit reached for this trade';
  end if;
  return new;
end $$;
drop trigger if exists shots_count on tradenotes.trade_screenshots;
create trigger shots_count before insert on tradenotes.trade_screenshots for each row execute function tradenotes.check_screenshot_count();
revoke all on function tradenotes.check_screenshot_count() from public;

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
  select coalesce(sum(size_bytes), 0) into total from tradenotes.trade_screenshots;
  return total;
end $$;
revoke all on function tradenotes.storage_used_bytes() from public;
grant execute on function tradenotes.storage_used_bytes() to app_user;

-- Supabase only (skipped on plain Postgres): a RESTRICTIVE policy so anon/authenticated can never list, read or write objects
-- in the private bucket, whatever other storage policies exist. The app uses the service role on the server only.
do $$ begin
  if to_regclass('storage.objects') is not null and exists (select 1 from pg_roles where rolname = 'anon') and exists (select 1 from pg_roles where rolname = 'authenticated') then
    begin
      execute 'drop policy if exists tn_trade_screenshots_no_api on storage.objects';
      execute $p$create policy tn_trade_screenshots_no_api on storage.objects as restrictive for all to anon, authenticated
               using (bucket_id <> 'trade-screenshots') with check (bucket_id <> 'trade-screenshots')$p$;
    exception when insufficient_privilege then
      raise notice 'storage policy not created (insufficient privilege); bucket stays private by default';
    end;
  end if;
end $$;

-- Strip any default grants the API roles may have picked up (same guard as 06).
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema tradenotes from %I', r);
      execute format('revoke all on all functions in schema tradenotes from %I', r);
    end if;
  end loop;
end $$;
