-- WerkPilot: fix company_id column type mismatch (bigint -> text)
--
-- THIRD AND FINAL PASS (2026-11-08). Two earlier passes each uncovered
-- a dependency the previous one didn't know about; this one accounts
-- for all three, tested together end-to-end. History, in order:
--
-- PASS 1 -- the root cause. Every upsert*Cloud() in js/cloud.js sends
-- company_id as 'de'/'es' (text). The real columns on customers,
-- vehicles, inventory, purchases, repairs, appointments, invoices,
-- expenses, and company_memberships are bigint. Confirmed via
-- Supabase's own API logs on a real save: Postgres 22P02,
-- "invalid input syntax for type bigint: \"de\"".
--
-- PASS 2 -- RLS policies. A straight `alter column type text` failed:
-- "cannot alter type of a column used in a policy definition".
-- Production has a members-based RLS layer (company_memberships +
-- 16 policies across 7 of the 8 tables) not documented anywhere in
-- this repo, discovered only by reading production's own pg_policies.
--
-- PASS 3 -- foreign keys (this pass). Running pass 2's migration
-- against production failed differently: "foreign key constraint
-- customers_company_id_fkey cannot be implemented ... Key columns
-- company_id and id are of incompatible types: text and bigint".
-- Investigation (read-only, against production):
--   * companies has exactly 3 columns: id (bigint, identity),
--     name (text), created_at. No country/currency/code column --
--     nothing holding 'de'/'es' anywhere. Confirmed directly, not
--     assumed.
--   * companies has 0 rows. company_memberships has 0 rows.
--   * ALL 24 company_id columns across this Supabase project (a much
--     larger, otherwise-undocumented schema -- activity_logs,
--     employees, estimates, bank_transactions, etc., none of which
--     WerkPilot's code touches) carry an identical FK:
--     <table>_company_id_fkey -> companies(id).
-- Conclusion: this companies/company_memberships scaffold belongs to
-- a separate, unrelated, never-populated system that WerkPilot's own
-- company model ('de'/'es' string codes, defined in js/core.js, never
-- read from this table) was never actually integrated with. Changing
-- companies.id itself to text would be the only way to keep the FK
-- meaningful, but that column is shared by all 24 tables -- 16 of
-- which are outside WerkPilot entirely and have not been touched or
-- investigated here. Re-typing it risks breaking an unrelated system
-- this project has no visibility into. The FK also could not become
-- meaningful for WerkPilot's own data even if types matched: with
-- companies empty, no non-null company_id could ever satisfy it
-- regardless of type, so today it is already non-functional for any
-- real use, on every one of these 8 tables.
-- Decision: drop only the 8 FK constraints listed below (WerkPilot's
-- own tables; company_memberships' FK is also dropped since that
-- table's company_id must match the same text values to keep the RLS
-- policies meaningful). Nothing about companies itself, nor the other
-- 16 unrelated tables, nor their FKs, is touched.
--
-- ALSO FOUND while investigating (read-only): the first, partial
-- attempt at pass 2's migration left production in a mixed state --
-- repairs.company_id was already converted to text (that table has
-- no FK and no RLS policy referencing company_id, so its ALTER simply
-- succeeded on its own), and the open policy "wp_expenses_all" was
-- missing (every other expected policy, including the restrictive
-- "members can manage expenses", was still present and unaffected).
-- This migration is written defensively (IF EXISTS / re-creates every
-- open policy) so it is correct regardless of that partial state, and
-- was tested against a local reproduction seeded with exactly that
-- same partial state alongside a clean one.
--
-- SCOPE: drop 8 FK constraints (all pointing at an empty, unrelated
-- table, confirmed above) + drop and recreate 16 RLS policies with
-- byte-for-byte identical logic + the type change on 9 tables. No
-- rows deleted, no customer numbers/ids change, no table dropped, no
-- access-control logic changes, nothing outside these 9 tables and
-- their listed constraints/policies is touched.

-- Step 1: drop the 8 foreign keys that block the type change (see
-- PASS 3 above for why -- each points at an empty, unrelated table).
alter table customers drop constraint if exists customers_company_id_fkey;
alter table vehicles drop constraint if exists vehicles_company_id_fkey;
alter table inventory drop constraint if exists inventory_company_id_fkey;
alter table purchases drop constraint if exists purchases_company_id_fkey;
alter table appointments drop constraint if exists appointments_company_id_fkey;
alter table invoices drop constraint if exists invoices_company_id_fkey;
alter table expenses drop constraint if exists expenses_company_id_fkey;
alter table company_memberships drop constraint if exists company_memberships_company_id_fkey;

-- Step 2: drop the policies that depend on company_id (pulled
-- verbatim from production's own pg_policies). IF EXISTS so this is
-- safe to run even against the partial state described above.
drop policy if exists "members can insert customers" on customers;
drop policy if exists "members can update customers" on customers;
drop policy if exists "members can delete customers" on customers;
drop policy if exists "members can view customers" on customers;
drop policy if exists "members can insert vehicles" on vehicles;
drop policy if exists "members can update vehicles" on vehicles;
drop policy if exists "members can delete vehicles" on vehicles;
drop policy if exists "members can view vehicles" on vehicles;
drop policy if exists "members can manage inventory" on inventory;
drop policy if exists "members can manage expenses" on expenses;
drop policy if exists "members can manage appointments" on appointments;
drop policy if exists "members can insert invoices" on invoices;
drop policy if exists "members can update invoices" on invoices;
drop policy if exists "members can delete invoices" on invoices;
drop policy if exists "members can view invoices" on invoices;
drop policy if exists "members can manage purchases" on purchases;

-- Also drop+recreate every open wp_X_all policy, defensively: the
-- partial first attempt left "wp_expenses_all" missing while leaving
-- everything else alone, for reasons that couldn't be reconstructed
-- with certainty. Doing this for all 8 costs nothing (same policy,
-- re-created identically) and guarantees a consistent end state
-- regardless of exactly what state production is in right now.
drop policy if exists "wp_customers_all" on customers;
drop policy if exists "wp_vehicles_all" on vehicles;
drop policy if exists "wp_inventory_all" on inventory;
drop policy if exists "wp_purchases_all" on purchases;
drop policy if exists "wp_appointments_all" on appointments;
drop policy if exists "wp_invoices_all" on invoices;
drop policy if exists "wp_expenses_all" on expenses;

-- Step 3: the actual type fix, on all 9 affected tables. Safe even on
-- a column already text (repairs) -- ::text on text is a no-op cast.
alter table customers alter column company_id type text using company_id::text;
alter table vehicles alter column company_id type text using company_id::text;
alter table inventory alter column company_id type text using company_id::text;
alter table purchases alter column company_id type text using company_id::text;
alter table repairs alter column company_id type text using company_id::text;
alter table appointments alter column company_id type text using company_id::text;
alter table invoices alter column company_id type text using company_id::text;
alter table expenses alter column company_id type text using company_id::text;
alter table company_memberships alter column company_id type text using company_id::text;

-- Step 4: recreate every open wp_X_all policy (byte-for-byte as
-- originally defined -- using(true) with check(true), i.e. no access
-- restriction, matching current production behavior exactly).
create policy "wp_customers_all" on customers for all using (true) with check (true);
create policy "wp_vehicles_all" on vehicles for all using (true) with check (true);
create policy "wp_inventory_all" on inventory for all using (true) with check (true);
create policy "wp_purchases_all" on purchases for all using (true) with check (true);
create policy "wp_appointments_all" on appointments for all using (true) with check (true);
create policy "wp_invoices_all" on invoices for all using (true) with check (true);
create policy "wp_expenses_all" on expenses for all using (true) with check (true);

-- Step 5: recreate every dropped members-based policy with
-- byte-for-byte the same logic (same table, same command, same
-- USING/WITH CHECK condition -- only the compared columns' type
-- changed, not what the policy checks). The company_memberships FK
-- being gone doesn't change this logic at all; it only stops a
-- row from being rejected at insert time for pointing at a
-- nonexistent companies.id -- which could never happen anyway with
-- companies empty, so nothing here newly allows anything these
-- policies didn't already functionally allow (or, since
-- company_memberships is empty, never matched) before.
create policy "members can insert customers" on customers for insert with check (exists (select 1 from company_memberships cm where cm.company_id = customers.company_id and cm.user_id = auth.uid() and cm.active = true));
create policy "members can update customers" on customers for update using (exists (select 1 from company_memberships cm where cm.company_id = customers.company_id and cm.user_id = auth.uid() and cm.active = true)) with check (exists (select 1 from company_memberships cm where cm.company_id = customers.company_id and cm.user_id = auth.uid() and cm.active = true));
create policy "members can delete customers" on customers for delete using (exists (select 1 from company_memberships cm where cm.company_id = customers.company_id and cm.user_id = auth.uid() and cm.active = true));
create policy "members can view customers" on customers for select using (exists (select 1 from company_memberships cm where cm.company_id = customers.company_id and cm.user_id = auth.uid() and cm.active = true));

create policy "members can insert vehicles" on vehicles for insert with check (exists (select 1 from company_memberships cm where cm.company_id = vehicles.company_id and cm.user_id = auth.uid() and cm.active = true));
create policy "members can update vehicles" on vehicles for update using (exists (select 1 from company_memberships cm where cm.company_id = vehicles.company_id and cm.user_id = auth.uid() and cm.active = true)) with check (exists (select 1 from company_memberships cm where cm.company_id = vehicles.company_id and cm.user_id = auth.uid() and cm.active = true));
create policy "members can delete vehicles" on vehicles for delete using (exists (select 1 from company_memberships cm where cm.company_id = vehicles.company_id and cm.user_id = auth.uid() and cm.active = true));
create policy "members can view vehicles" on vehicles for select using (exists (select 1 from company_memberships cm where cm.company_id = vehicles.company_id and cm.user_id = auth.uid() and cm.active = true));

create policy "members can manage inventory" on inventory for all using (exists (select 1 from company_memberships cm where cm.company_id = inventory.company_id and cm.user_id = auth.uid() and cm.active = true)) with check (exists (select 1 from company_memberships cm where cm.company_id = inventory.company_id and cm.user_id = auth.uid() and cm.active = true));
create policy "members can manage expenses" on expenses for all using (exists (select 1 from company_memberships cm where cm.company_id = expenses.company_id and cm.user_id = auth.uid() and cm.active = true)) with check (exists (select 1 from company_memberships cm where cm.company_id = expenses.company_id and cm.user_id = auth.uid() and cm.active = true));
create policy "members can manage appointments" on appointments for all using (exists (select 1 from company_memberships cm where cm.company_id = appointments.company_id and cm.user_id = auth.uid() and cm.active = true)) with check (exists (select 1 from company_memberships cm where cm.company_id = appointments.company_id and cm.user_id = auth.uid() and cm.active = true));

create policy "members can insert invoices" on invoices for insert with check (exists (select 1 from company_memberships cm where cm.company_id = invoices.company_id and cm.user_id = auth.uid() and cm.active = true));
create policy "members can update invoices" on invoices for update using (exists (select 1 from company_memberships cm where cm.company_id = invoices.company_id and cm.user_id = auth.uid() and cm.active = true)) with check (exists (select 1 from company_memberships cm where cm.company_id = invoices.company_id and cm.user_id = auth.uid() and cm.active = true));
create policy "members can delete invoices" on invoices for delete using (exists (select 1 from company_memberships cm where cm.company_id = invoices.company_id and cm.user_id = auth.uid() and cm.active = true));
create policy "members can view invoices" on invoices for select using (exists (select 1 from company_memberships cm where cm.company_id = invoices.company_id and cm.user_id = auth.uid() and cm.active = true));

create policy "members can manage purchases" on purchases for all using (exists (select 1 from company_memberships cm where cm.company_id = purchases.company_id and cm.user_id = auth.uid() and cm.active = true)) with check (exists (select 1 from company_memberships cm where cm.company_id = purchases.company_id and cm.user_id = auth.uid() and cm.active = true));

-- Verification queries (safe to run anytime, read-only):
-- select table_name, data_type from information_schema.columns
-- where table_schema='public' and column_name='company_id'
-- and table_name in ('customers','vehicles','inventory','purchases',
-- 'repairs','appointments','invoices','expenses','company_memberships')
-- order by table_name;
-- -- expect: text, all 9 rows
--
-- select tablename, count(*) from pg_policies where schemaname='public'
-- and tablename in ('customers','vehicles','inventory','purchases',
-- 'repairs','appointments','invoices','expenses','company_memberships')
-- group by tablename order by tablename;
-- -- expect: customers 5, vehicles 5, invoices 5, appointments 2,
-- -- expenses 2, inventory 2, purchases 2, repairs 1, company_memberships 1
