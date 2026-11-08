-- Rollback for migration-fix-company-id-type.sql
--
-- Reverts company_id back to bigint on the tables this migration
-- touched. WARNING: this will fail (and should fail -- do not force it)
-- if any row now holds a non-numeric company_id value such as 'de' or
-- 'es', because that is precisely the data the fix migration exists to
-- allow. If you need to roll back AFTER the app has started writing
-- real 'de'/'es' values, you must first decide what to do with those
-- rows (this script intentionally does not delete or coerce them).
--
-- Only use this if the fix migration itself caused a new problem.
-- Re-run the verification query at the bottom of
-- migration-fix-company-id-type.sql first to see current column types
-- before deciding to roll back.

do $$
declare
  t text;
begin
  foreach t in array array['customers','vehicles','inventory','purchases','repairs','appointments','invoices','expenses']
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=t and column_name='company_id' and data_type='text'
    ) then
      raise notice 'Reverting %.company_id to bigint', t;
      execute format('alter table public.%I alter column company_id type bigint using nullif(company_id, '''')::bigint', t);
    end if;
  end loop;
end $$;
