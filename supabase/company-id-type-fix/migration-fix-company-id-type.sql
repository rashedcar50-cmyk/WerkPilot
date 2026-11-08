-- WerkPilot: fix company_id column type mismatch (bigint -> text)
--
-- FOURTH AND FINAL PASS (2026-11-08). History:
--
-- PASS 1 (root cause): every upsert*Cloud() in js/cloud.js sends
-- company_id as 'de'/'es' (text). The real columns on customers,
-- vehicles, inventory, purchases, repairs, appointments, invoices,
-- expenses, and company_memberships are bigint. Confirmed via a real
-- failed save: Postgres 22P02, invalid input syntax for type bigint.
--
-- PASS 2 (RLS on our own tables): a plain type change failed because
-- 16 policies on 7 of our 8 tables depend on company_id via a join
-- against company_memberships (a members-based access layer not
-- documented anywhere in this repo).
--
-- PASS 3 (foreign keys): fixing the policies above still failed --
-- customers_company_id_fkey (and 7 identical siblings) point at
-- companies(id), which is bigint. companies has only id/name/
-- created_at (no 'de'/'es' anywhere) and 0 rows; the FK could never
-- be satisfied by any non-null value regardless of type, so dropping
-- WerkPilot's own 8 FKs changes nothing that currently works.
--
-- PASS 4 (this one): applying pass 3's migration failed AGAIN, this
-- time on "members can view work orders" on work_orders -- a table
-- WerkPilot's code has never touched. Investigating schema-wide (read
-- only) found company_memberships.company_id is referenced, the same
-- way, by **36 policies across 23 tables** -- activity_logs,
-- app_settings, appointments, attachments, bank_transactions,
-- companies, customers, employees, estimate_items, estimates,
-- expenses, inventory, inventory_movements, invoice_items, invoices,
-- journal, payments, payroll, purchases, suppliers, time_entries,
-- vehicles, work_orders. Only 8 of those 23 tables are WerkPilot's
-- own; the other 15 belong to a much larger, separate shop-management
-- schema that this Supabase project apparently also hosts (`repairs`
-- is WerkPilot's one genuinely own table -- it has no such policy and
-- no FK, which is why passes 1-3 didn't surface it).
--
-- Given that scale, this migration does NOT hand-transcribe every
-- policy. It captures the exact live definition (table, name,
-- permissive/restrictive, roles, command, USING, WITH CHECK) of every
-- policy that depends on company_memberships.company_id -- wherever
-- it lives, on any table -- drops them, makes the type change, then
-- recreates every one of them from the captured definition. For
-- policies on WerkPilot's own 9 tables (whose company_id is also
-- becoming text), the captured expression is reused verbatim -- both
-- sides are text, nothing to adapt. For policies on any OTHER table
-- (company_id there is intentionally left bigint -- out of scope, see
-- PASS 3), the single comparison `cm.company_id = <table>.<column>`
-- is recreated with an explicit `::text` cast added on that other
-- side, so the check keeps evaluating the exact same condition it
-- always did -- same logic, same outcome for every row, adapted only
-- for the type this migration intentionally doesn't touch there.
-- Nothing about those other 15 tables' own columns, data, or any
-- other policy is touched.
--
-- Also handles the two known partial-state artifacts from earlier
-- attempts (repairs.company_id already text; wp_expenses_all missing)
-- automatically, since every DROP here is IF-EXISTS-safe by construction
-- (it only ever drops what it just captured as existing) and the type
-- change is a harmless no-op cast on a column already text.
--
-- The whole thing runs inside one explicit transaction: if anything
-- fails anywhere, nothing commits, and RLS is never left disabled.
--
-- SCOPE: 8 FK constraints dropped (WerkPilot's own tables only, each
-- already-unsatisfiable -- see PASS 3), N policies (wherever they
-- live) dropped and recreated with identical access logic, 9 columns
-- retyped. No table, row, or column outside of this is touched; no
-- customer numbers or ids change; no access-control logic changes.
--
-- Tested end-to-end against a disposable local Supabase stack
-- reproducing every distinct shape found in production: a 4-way CRUD
-- table of our own (customers) and one outside WerkPilot (work_orders),
-- an ALL-policy table of our own (expenses) and one outside (employees),
-- the companies self-referencing case, and repairs (no policy, no FK).
-- See local-test-log.md in this folder for the full run.

begin;

do $$
declare
  pol record;
  my_tables text[] := array['customers','vehicles','inventory','purchases','repairs','appointments','invoices','expenses','company_memberships'];
  new_qual text;
  new_check text;
  create_sql text;
begin
  -- Step 1: snapshot the exact live definition of every policy that
  -- either depends on company_memberships.company_id (wherever it
  -- lives) or sits on one of our own 9 tables (to also catch the
  -- plain wp_X_all policies, which don't mention company_memberships
  -- in their own text but still need to survive the round trip).
  create temporary table _policy_backup as
  select schemaname, tablename, policyname, permissive, roles, cmd,
         qual::text as qual_text, with_check::text as check_text
  from pg_policies
  where schemaname = 'public'
    and (
      qual::text ilike '%company_memberships%'
      or with_check::text ilike '%company_memberships%'
      or tablename = any(my_tables)
    );

  -- Step 2: drop every one of those policies.
  for pol in select * from _policy_backup loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  -- Step 3: drop the FK constraints that block the type change --
  -- WerkPilot's own 8 tables only (see PASS 3 above for why this is
  -- safe: companies is empty, so none of these could ever be
  -- satisfied by any non-null value regardless of type).
  execute 'alter table customers drop constraint if exists customers_company_id_fkey';
  execute 'alter table vehicles drop constraint if exists vehicles_company_id_fkey';
  execute 'alter table inventory drop constraint if exists inventory_company_id_fkey';
  execute 'alter table purchases drop constraint if exists purchases_company_id_fkey';
  execute 'alter table appointments drop constraint if exists appointments_company_id_fkey';
  execute 'alter table invoices drop constraint if exists invoices_company_id_fkey';
  execute 'alter table expenses drop constraint if exists expenses_company_id_fkey';
  execute 'alter table company_memberships drop constraint if exists company_memberships_company_id_fkey';

  -- Step 4: the type fix itself, on our 9 tables only.
  execute 'alter table customers alter column company_id type text using company_id::text';
  execute 'alter table vehicles alter column company_id type text using company_id::text';
  execute 'alter table inventory alter column company_id type text using company_id::text';
  execute 'alter table purchases alter column company_id type text using company_id::text';
  execute 'alter table repairs alter column company_id type text using company_id::text';
  execute 'alter table appointments alter column company_id type text using company_id::text';
  execute 'alter table invoices alter column company_id type text using company_id::text';
  execute 'alter table expenses alter column company_id type text using company_id::text';
  execute 'alter table company_memberships alter column company_id type text using company_id::text';

  -- Step 5: recreate every captured policy. Off our 9 tables, inject
  -- an explicit ::text cast on the right-hand side of the
  -- cm.company_id comparison so it keeps the exact same logic working
  -- against a column this migration deliberately left bigint.
  for pol in select * from _policy_backup loop
    new_qual := pol.qual_text;
    new_check := pol.check_text;
    if not (pol.tablename = any(my_tables)) then
      if new_qual is not null then
        new_qual := regexp_replace(new_qual, 'cm\.company_id = (\w+\.\w+)', 'cm.company_id = \1::text', 'g');
      end if;
      if new_check is not null then
        new_check := regexp_replace(new_check, 'cm\.company_id = (\w+\.\w+)', 'cm.company_id = \1::text', 'g');
      end if;
    end if;

    create_sql := format('create policy %I on %I.%I as %s for %s to %s',
      pol.policyname, pol.schemaname, pol.tablename,
      case when pol.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
      pol.cmd,
      array_to_string(pol.roles, ', '));
    if new_qual is not null then
      create_sql := create_sql || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      create_sql := create_sql || format(' with check (%s)', new_check);
    end if;
    execute create_sql;
  end loop;

  raise notice 'Done: % policies captured and restored, 8 FKs dropped, 9 columns retyped to text', (select count(*) from _policy_backup);
end $$;

commit;

-- Verification queries (safe to run anytime, read-only):
-- select table_name, data_type from information_schema.columns
-- where table_schema='public' and column_name='company_id'
-- and table_name in ('customers','vehicles','inventory','purchases',
-- 'repairs','appointments','invoices','expenses','company_memberships')
-- order by table_name;
-- -- expect: text, all 9 rows
--
-- select count(*) from pg_policies where schemaname='public';
-- -- compare to the count from before running this -- should be identical
