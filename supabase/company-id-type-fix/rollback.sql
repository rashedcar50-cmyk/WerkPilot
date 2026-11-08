-- Rollback for migration-fix-company-id-type.sql (fourth pass)
--
-- Mirrors the forward migration exactly, in reverse: captures every
-- policy depending on company_memberships.company_id (wherever it
-- lives) or sitting on our 9 tables, drops them, reverts the 9
-- columns to bigint, then recreates every policy -- stripping the
-- ::text cast back out for policies on tables we don't own, since
-- company_id over there was never touched.
--
-- WARNING: the ALTER step will fail (and should fail -- do not force
-- it) if any row now holds a non-numeric company_id value such as
-- 'de'/'es', because that is precisely the data the fix migration
-- exists to allow. If you need to roll back after the app has started
-- writing real values, decide what to do with those rows first; this
-- script does not delete or coerce them.
--
-- Only use this if the fix migration itself caused a new problem.
-- Runs inside one transaction: if anything fails, nothing commits and
-- every policy this script captured is still exactly as it was.

begin;

do $$
declare
  pol record;
  my_tables text[] := array['customers','vehicles','inventory','purchases','repairs','appointments','invoices','expenses','company_memberships'];
  new_qual text;
  new_check text;
  create_sql text;
begin
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

  for pol in select * from _policy_backup loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  execute 'alter table customers alter column company_id type bigint using nullif(company_id, '''')::bigint';
  execute 'alter table vehicles alter column company_id type bigint using nullif(company_id, '''')::bigint';
  execute 'alter table inventory alter column company_id type bigint using nullif(company_id, '''')::bigint';
  execute 'alter table purchases alter column company_id type bigint using nullif(company_id, '''')::bigint';
  execute 'alter table repairs alter column company_id type bigint using nullif(company_id, '''')::bigint';
  execute 'alter table appointments alter column company_id type bigint using nullif(company_id, '''')::bigint';
  execute 'alter table invoices alter column company_id type bigint using nullif(company_id, '''')::bigint';
  execute 'alter table expenses alter column company_id type bigint using nullif(company_id, '''')::bigint';
  execute 'alter table company_memberships alter column company_id type bigint using nullif(company_id, '''')::bigint';

  for pol in select * from _policy_backup loop
    new_qual := pol.qual_text;
    new_check := pol.check_text;
    if not (pol.tablename = any(my_tables)) then
      -- strip the ::text cast back out -- that table's own column was
      -- never changed, so the comparison goes back to bigint = bigint.
      if new_qual is not null then
        new_qual := regexp_replace(new_qual, 'cm\.company_id = \(?(\w+\.\w+)\)?::text', 'cm.company_id = \1', 'g');
      end if;
      if new_check is not null then
        new_check := regexp_replace(new_check, 'cm\.company_id = \(?(\w+\.\w+)\)?::text', 'cm.company_id = \1', 'g');
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

  -- re-add the 8 FK constraints this migration drops (now valid again
  -- since both sides are bigint).
  execute 'alter table customers add constraint customers_company_id_fkey foreign key (company_id) references companies(id)';
  execute 'alter table vehicles add constraint vehicles_company_id_fkey foreign key (company_id) references companies(id)';
  execute 'alter table inventory add constraint inventory_company_id_fkey foreign key (company_id) references companies(id)';
  execute 'alter table purchases add constraint purchases_company_id_fkey foreign key (company_id) references companies(id)';
  execute 'alter table appointments add constraint appointments_company_id_fkey foreign key (company_id) references companies(id)';
  execute 'alter table invoices add constraint invoices_company_id_fkey foreign key (company_id) references companies(id)';
  execute 'alter table expenses add constraint expenses_company_id_fkey foreign key (company_id) references companies(id)';
  execute 'alter table company_memberships add constraint company_memberships_company_id_fkey foreign key (company_id) references companies(id)';
end $$;

commit;
