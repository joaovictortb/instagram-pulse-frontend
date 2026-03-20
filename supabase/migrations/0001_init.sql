-- Supabase schema for InstagramPulse
-- This migration is intended to be executed via the Supabase SQL editor/CLI.

-- Enable gen_random_uuid() if not already enabled
create extension if not exists pgcrypto;

-- Account snapshot (optional but useful)
create table if not exists public.instagram_accounts (
  account_id text primary key,
  username text,
  name text,
  profile_picture_url text,
  followers_count bigint,
  follows_count bigint,
  media_count bigint,
  biography text,
  website text,
  updated_at timestamptz not null default now()
);

-- Daily account-level insights (for date filtering + weekly follower gains)
create table if not exists public.instagram_daily_insights (
  account_id text not null references public.instagram_accounts(account_id) on delete cascade,
  insight_date date not null,

  -- Frequently used fields duplicated from metrics JSON for faster queries
  impressions bigint not null default 0,
  reach bigint not null default 0,
  profile_views bigint not null default 0,
  website_clicks bigint not null default 0,
  follower_count bigint not null default 0,

  -- Keep the full raw metrics too (makes it easier to evolve the dashboard)
  metrics jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (account_id, insight_date)
);

create index if not exists instagram_daily_insights_date_idx
  on public.instagram_daily_insights (insight_date);

-- Media snapshot (posts/reels)
create table if not exists public.instagram_media (
  account_id text not null references public.instagram_accounts(account_id) on delete cascade,
  media_id text primary key,

  media_type text not null,
  caption text,
  media_url text,
  thumbnail_url text,
  permalink text,

  -- "timestamp" from Meta is the creation time of the media
  published_at timestamptz,

  like_count bigint not null default 0,
  comments_count bigint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists instagram_media_account_published_idx
  on public.instagram_media (account_id, published_at);

-- Media-level insights (impressions/reach/engagement/saved/plays...)
create table if not exists public.instagram_media_insights (
  media_id text primary key references public.instagram_media(media_id) on delete cascade,

  impressions bigint not null default 0,
  reach bigint not null default 0,
  engagement bigint not null default 0,
  saved bigint not null default 0,

  plays bigint,
  video_views bigint,
  total_interactions bigint,

  metrics jsonb not null default '{}'::jsonb,

  fetched_at timestamptz not null default now()
);

-- Persisted AI reports (so users can revisit)
create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),

  account_id text not null references public.instagram_accounts(account_id) on delete cascade,

  report_type text not null,
  from_date date not null,
  to_date date not null,

  content_markdown text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_reports_account_created_idx
  on public.ai_reports (account_id, created_at desc);

-- A light "updated_at" trigger can be added later if desired.

