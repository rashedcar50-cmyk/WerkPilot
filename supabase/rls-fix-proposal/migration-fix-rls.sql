-- WerkPilot RLS fix -- PROPOSAL, tested only in an isolated local Supabase
-- stack. NOT applied to the production project (jljzobaggesefsdeslrf).
--
-- Replaces every "using(true) with check(true)" policy (open to the public
-- anon key) with a per-company policy keyed off a real, authenticated
-- Supabase user via a new user_profiles table (auth.users.id -> company_id,
-- role). Removing the open policy means an unauthenticated (anon) request
-- gets zero rows back automatically -- Postgres RLS denies by default when
-- no policy matches, so "block access without login" needs no extra rule.
--
-- IMPORTANT: this does not, by itself, change anything a visitor to the
-- live app experiences, because the WerkPilot client has no Supabase Auth
-- integration yet (it only ever uses the anon key, no sign-in). Applying
-- this migration to the production project as-is would make cloud
-- sync silently return zero rows for everyone until the client is updated
-- to actually sign users in via Supabase Auth and until every real
-- business user has a user_profiles row. That client-side work is NOT
-- part of this pass -- see fix-report-06-supabase-rls.md for what it
-- would take.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id text not null,
  role text not null default 'mechanic',
  created_at timestamptz default now()
);
alter table public.user_profiles enable row level security;
drop policy if exists "user_profiles_self_read" on public.user_profiles;
create policy "user_profiles_self_read" on public.user_profiles
  for select using (id = auth.uid());

create or replace function public.current_company_id()
returns text
language sql security definer stable
as $$
  select company_id from public.user_profiles where id = auth.uid()
$$;

-- companies: row id IS the company id
drop policy if exists "wp_companies_all" on companies;
create policy "wp_companies_company_scoped" on companies
  for all
  using (id = public.current_company_id())
  with check (id = public.current_company_id());

-- every other table: scoped by its own company_id column
do $$
declare
  t text;
begin
  foreach t in array array['purchases','customers','vehicles','inventory','repairs','appointments','invoices','expenses']
  loop
    execute format('drop policy if exists %I on %I', 'wp_'||t||'_all', t);
    execute format(
      'create policy %I on %I for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id())',
      'wp_'||t||'_company_scoped', t
    );
  end loop;
end $$;
