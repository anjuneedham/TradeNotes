-- TradeNotes schema for plain Postgres (Supabase or Neon).
-- Part 1: Better Auth tables (public, prefixed tn_ so they cannot collide with another app sharing the database). Columns match better-auth 1.7; ids are uuid (advanced.database.generateId = "uuid").
create table if not exists public.tn_user (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create table if not exists public.tn_session (
  id uuid primary key default gen_random_uuid(),
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" uuid not null references public.tn_user(id) on delete cascade
);
create index if not exists tn_session_user_idx on public.tn_session ("userId");
create table if not exists public.tn_account (
  id uuid primary key default gen_random_uuid(),
  "accountId" text not null,
  "providerId" text not null,
  "userId" uuid not null references public.tn_user(id) on delete cascade,
  "accessToken" text, "refreshToken" text, "idToken" text,
  "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz,
  scope text, password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists tn_account_user_idx on public.tn_account ("userId");
create table if not exists public.tn_verification (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists tn_verification_identifier_idx on public.tn_verification (identifier);

-- Shared rate-limit counters for auth endpoints (works across serverless instances).
create table if not exists public.tn_rate_limit (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  count integer not null,
  "lastRequest" bigint not null
);
