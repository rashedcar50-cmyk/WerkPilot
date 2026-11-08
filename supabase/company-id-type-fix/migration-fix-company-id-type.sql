-- WerkPilot: fix company_id column type mismatch (bigint -> text)
--
-- CONFIRMED ROOT CAUSE (2026-11-08):
-- Every sync write from the app sends company_id as a string: 'de' or
-- 'es' (see js/cloud.js, every upsert*Cloud function; companies.id is
-- seeded as 'de'/'es' text in supabase-schema.sql). The actual columns
-- named company_id on customers, vehicles, inventory, purchases,
-- repairs, appointments, invoices, expenses, AND company_memberships
-- are bigint in production -- confirmed live via Supabase's own API
-- logs (Postgres 22P02, "invalid input syntax for type bigint: \"de\"")
-- and reproduced identically on a disposable local stack.
--
-- UPDATE (second pass, same day): running the straightforward
-- `alter column ... type text` directly failed with a DIFFERENT error
-- on tables with row-level security policies that reference
-- company_id in an EXISTS-against-company_memberships check (a
-- members-based access-control layer that exists in production but
-- isn't documented in any file in this repo -- discovered live while
-- applying this fix). Those policies must be dropped before the type
-- change and recreated after, with identical logic -- same tables,
-- same commands, same USING/WITH CHECK expressions, just now
-- comparing text to text instead of bigint to bigint. This migration
-- does exactly that and nothing else: no policy's access logic
-- changes, no role grants change, no table is dropped.
--
-- company_memberships itself was confirmed EMPTY (0 rows) in
-- production before this migration was written, so converting its
-- company_id to text alongside the other 8 tables is lossless with
-- certainty, not just by cast semantics.
--
-- SCOPE: type change + a matching policy drop/recreate cycle, both
-- confirmed necessary by two separate live error messages, not
-- assumed in advance. No rows are deleted, no customer numbers or ids
-- change, no NEW policy or table is introduced, no role gets broader
-- access than it already had.
--
-- Run this in: Supabase Dashboard -> SQL Editor, on project
-- jljzobaggesefsdeslrf. Tested end-to-end against a disposable local
-- Supabase stack that reproduced the exact production schema
-- (including company_memberships and all 16 real policy definitions,
-- pulled live from pg_policies) -- see local-test-log.md in this
-- folder for the full run.

-- Step 1: drop the policies that depend on company_id (pulled
-- verbatim from production's own pg_policies, 2026-11-08).
drop policy "members can insert customers" on customers;
drop policy "members can update customers" on customers;
drop policy "members can delete customers" on customers;
drop policy "members can view customers" on customers;
drop policy "members can insert vehicles" on vehicles;
drop policy "members can update vehicles" on vehicles;
drop policy "members can delete vehicles" on vehicles;
drop policy "members can view vehicles" on vehicles;
drop policy "members can manage inventory" on inventory;
drop policy "members can manage expenses" on expenses;
drop policy "members can manage appointments" on appointments;
drop policy "members can insert invoices" on invoices;
drop policy "members can update invoices" on invoices;
drop policy "members can delete invoices" on invoices;
drop policy "members can view invoices" on invoices;
drop policy "members can manage purchases" on purchases;

-- Step 2: the actual type fix, on all 9 affected tables.
alter table customers alter column company_id type text using company_id::text;
alter table vehicles alter column company_id type text using company_id::text;
alter table inventory alter column company_id type text using company_id::text;
alter table purchases alter column company_id type text using company_id::text;
alter table repairs alter column company_id type text using company_id::text;
alter table appointments alter column company_id type text using company_id::text;
alter table invoices alter column company_id type text using company_id::text;
alter table expenses alter column company_id type text using company_id::text;
alter table company_memberships alter column company_id type text using company_id::text;

-- Step 3: recreate every dropped policy with byte-for-byte the same
-- logic (same table, same command, same USING/WITH CHECK condition --
-- only the underlying column type changed, not what the policy checks).
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

-- Verification query (safe to run anytime, read-only):
-- select table_name, column_name, data_type
-- from information_schema.columns
-- where table_schema='public' and column_name='company_id'
-- order by table_name;
--
-- select tablename, count(*) from pg_policies
-- where schemaname='public' group by tablename order by tablename;
-- (compare counts to what existed before -- should be unchanged)
