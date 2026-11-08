-- Rollback for migration-fix-rls.sql -- restores the exact open policies
-- (using(true) with check(true)) that are live in production today, so
-- the app's existing anon-key-only client code keeps working unchanged
-- if the fix migration needs to be reverted.

drop policy if exists "wp_companies_company_scoped" on companies;
create policy "wp_companies_all" on companies for all using (true) with check (true);

do $$
declare
  t text;
begin
  foreach t in array array['purchases','customers','vehicles','inventory','repairs','appointments','invoices','expenses']
  loop
    execute format('drop policy if exists %I on %I', 'wp_'||t||'_company_scoped', t);
    execute format('create policy %I on %I for all using (true) with check (true)', 'wp_'||t||'_all', t);
  end loop;
end $$;

drop function if exists public.current_company_id();
drop policy if exists "user_profiles_self_read" on public.user_profiles;
drop table if exists public.user_profiles;
