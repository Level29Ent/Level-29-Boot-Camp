-- Fresh-project setup only. No dependency on the previous game's project.
create table public.bootcamp_profiles (
  id uuid primary key,
  token_hash text not null unique check (length(token_hash) = 64),
  data jsonb not null,
  version integer not null default 0,
  updated_at timestamptz not null default now()
);
create table public.bootcamp_rooms (
  code text primary key check (code ~ '^[A-F0-9]{6}$'),
  data jsonb not null,
  version integer not null default 0,
  expires_at timestamptz not null
);
create index bootcamp_rooms_expiry on public.bootcamp_rooms(expires_at);
create table public.bootcamp_limits (
  bucket text primary key,
  count integer not null,
  expires_at timestamptz not null
);
alter table public.bootcamp_profiles enable row level security;
alter table public.bootcamp_rooms enable row level security;
alter table public.bootcamp_limits enable row level security;
-- Only the Edge Function service role may read/write, never browser API keys.
revoke all on public.bootcamp_profiles, public.bootcamp_rooms, public.bootcamp_limits from anon, authenticated;
grant select, insert, update, delete on public.bootcamp_profiles, public.bootcamp_rooms, public.bootcamp_limits to service_role;

-- Atomic rate buckets prevent concurrent invocations bypassing a read/update check.
create function public.bootcamp_rate(p_bucket text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare hits integer; begin
  insert into public.bootcamp_limits(bucket,count,expires_at)
  values (p_bucket,1,now()+make_interval(secs=>p_seconds))
  on conflict (bucket) do update set
    count = case when public.bootcamp_limits.expires_at <= now() then 1 else public.bootcamp_limits.count+1 end,
    expires_at = case when public.bootcamp_limits.expires_at <= now() then now()+make_interval(secs=>p_seconds) else public.bootcamp_limits.expires_at end
  returning count into hits;
  return hits <= p_limit;
end $$;
revoke all on function public.bootcamp_rate(text,integer,integer) from public, anon, authenticated;
grant execute on function public.bootcamp_rate(text,integer,integer) to service_role;
