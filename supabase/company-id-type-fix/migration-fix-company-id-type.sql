-- WerkPilot: fix company_id column type mismatch (bigint -> text)
--
-- CONFIRMED ROOT CAUSE (2026-11-08):
-- Every sync write from the app sends company_id as a string: 'de' or
-- 'es' (see js/cloud.js, every upsert*Cloud function, and
-- window.SUPABASE_URL's companies table in supabase-schema.sql, which
-- seeds companies.id as 'de'/'es' text values). But the ACTUAL live
-- columns named company_id on at least customers, vehicles, repairs,
-- invoices and inventory (reproduced live, 2026-11-08, via the app's
-- own normal save actions on clearly-labeled TEST records) are typed
-- bigint, not text -- confirmed by Supabase's own API logs:
--   POST /rest/v1/customers -> 400, Postgres code 22P02,
--   "invalid input syntax for type bigint: \"de\""
-- The js/cloud.js source already contains a prior developer's comment
-- on upsertPurchaseCloud documenting the exact same discovery for
-- purchases specifically ("company_id في قاعدة البيانات bigint FK --
-- نتركه null مؤقتاً لتجنب خطأ المفتاح الأجنبي"), worked around there by
-- never sending company_id at all (which avoids the error, but means
-- every purchase synced to the cloud has always landed with NO company
-- tag). This migration fixes the column type at its source instead, so
-- every table can send company_id normally going forward.
--
-- Likely origin: these company_id columns were added via the Supabase
-- Table Editor UI at some point (which defaults a new "*_id" column to
-- int8) rather than via supabase-schema.sql's
-- "alter table ... add column if not exists company_id text" lines --
-- those lines are a silent no-op when the column already exists
-- (regardless of its existing type), which is exactly why the schema
-- file's stated intent (text) was never actually applied.
--
-- SCOPE: type change only. No rows are deleted, no RLS policy is
-- touched, no column is removed, no customer numbers or ids change.
-- Every existing company_id value (bigint) is cast to its text
-- representation via `using company_id::text` -- this is a lossless,
-- always-valid cast in Postgres for any integer value, and leaves NULLs
-- as NULL. Given the error above means no insert of 'de'/'es' could
-- ever have succeeded, these columns are expected to be entirely NULL
-- today in production -- but the cast is written to be safe even if
-- that assumption is wrong.
--
-- Run this in: Supabase Dashboard -> SQL Editor, on project
-- jljzobaggesefsdeslrf, AFTER taking a backup (see README.md in this
-- folder). Tested locally first against a disposable Supabase CLI
-- stack that reproduced the exact bug (see local-repro-and-test.md).

do $$
declare
  t text;
  col_type text;
begin
  foreach t in array array['customers','vehicles','inventory','purchases','repairs','appointments','invoices','expenses']
  loop
    -- Only touch tables/columns that actually exist and aren't already text.
    select data_type into col_type
    from information_schema.columns
    where table_schema = 'public' and table_name = t and column_name = 'company_id';

    if col_type is not null and col_type <> 'text' then
      raise notice 'Converting %.company_id from % to text', t, col_type;
      execute format('alter table public.%I alter column company_id type text using company_id::text', t);
    elsif col_type is null then
      raise notice 'Skipping % -- no company_id column found', t;
    else
      raise notice 'Skipping % -- company_id already text', t;
    end if;
  end loop;
end $$;

-- Verification query (safe to run anytime, read-only):
-- select table_name, column_name, data_type
-- from information_schema.columns
-- where table_schema='public' and column_name='company_id'
-- order by table_name;
