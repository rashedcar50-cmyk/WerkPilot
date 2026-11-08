-- WerkPilot RLS fix -- PROPOSAL, tested only in an isolated local Supabase
-- stack. NOT applied to the production project (jljzobaggesefsdeslrf).
--
-- Replaces every "using(true) with check(true)" policy (open to the public
-- anon key) with a per-company policy keyed off a real, authenticated
-- Supabase user's own app_metadata.company_ids claim. Removing the open
-- policy means an unauthenticated (anon) request gets zero rows back
-- automatically -- Postgres RLS denies by default when no policy matches,
-- so "block access without login" needs no extra rule.
--
-- Design note (2026-11-08 revision): company access lives in
-- auth.users.raw_app_meta_data, NOT in a separate table a signed-in user
-- could write to. app_metadata can only be set via the Supabase Admin API
-- (a service_role key) -- never by the user's own client calls, including
-- signUp/signIn/updateUser. That is what makes "a user can prove who they
-- are, but can't grant themselves access to a company" hold: creating the
-- LOGIN identity (self-service, via auth.signUp) and GRANTING it company
-- access (admin-only, via provision-user.js) are two separate steps.
--
-- Faithfully mirrors the local app's own existing permission model: a
-- user with no `.companies` restriction (today, every seeded account) can
-- already see every company from the company switcher client-side, so
-- company_ids here is a LIST, not a single id -- provisioning a migrated
-- account with every company it already has local access to is what
-- "same permissions, not reduced" means for this migration. See
-- provision-user.js.
--
-- IMPORTANT: this does not, by itself, change anything a visitor to the
-- live app experiences while the client has no signed-in cloud session --
-- cloud.js's calls just keep using the anon key, which after this
-- migration gets zero rows back. It only takes effect together with the
-- client-side login integration (js/auth.js, wired into js/app.js's
-- login flow in this same change) AND an app_metadata grant for that
-- person. See fix-report-07-cloud-auth.md.

create or replace function public.user_has_company(cid text)
returns boolean
language sql stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' -> 'company_ids') ? cid,
    false
  )
$$;

-- companies: row id IS the company id
drop policy if exists "wp_companies_all" on companies;
drop policy if exists "wp_companies_company_scoped" on companies;
create policy "wp_companies_company_scoped" on companies
  for all
  using (public.user_has_company(id))
  with check (public.user_has_company(id));

-- every other table: scoped by its own company_id column
do $$
declare
  t text;
begin
  foreach t in array array['purchases','customers','vehicles','inventory','repairs','appointments','invoices','expenses']
  loop
    execute format('drop policy if exists %I on %I', 'wp_'||t||'_all', t);
    execute format('drop policy if exists %I on %I', 'wp_'||t||'_company_scoped', t);
    execute format(
      'create policy %I on %I for all using (public.user_has_company(company_id)) with check (public.user_has_company(company_id))',
      'wp_'||t||'_company_scoped', t
    );
  end loop;
end $$;
