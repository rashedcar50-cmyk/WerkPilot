-- Rollback for migration-fix-company-id-type.sql
--
-- Reverts company_id back to bigint on the 9 tables the fix touched,
-- going through the same drop-policy / alter / recreate-policy cycle
-- as the forward migration (required for the same reason: the
-- "members can ..." policies depend on company_id).
--
-- WARNING: the ALTER step will fail (and should fail -- do not force
-- it) if any row now holds a non-numeric company_id value such as
-- 'de' or 'es', because that is precisely the data the fix migration
-- exists to allow. If that happens mid-script, the policies this
-- script already dropped will NOT have been recreated yet -- re-run
-- just the CREATE POLICY statements from the bottom of this file (or
-- from migration-fix-company-id-type.sql, which has the identical
-- text-comparison versions -- the policy text itself doesn't change
-- between bigint and text, only the column's declared type does) to
-- restore them before doing anything else.
--
-- Only use this if the fix migration itself caused a new problem.

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

alter table customers alter column company_id type bigint using nullif(company_id, '')::bigint;
alter table vehicles alter column company_id type bigint using nullif(company_id, '')::bigint;
alter table inventory alter column company_id type bigint using nullif(company_id, '')::bigint;
alter table purchases alter column company_id type bigint using nullif(company_id, '')::bigint;
alter table repairs alter column company_id type bigint using nullif(company_id, '')::bigint;
alter table appointments alter column company_id type bigint using nullif(company_id, '')::bigint;
alter table invoices alter column company_id type bigint using nullif(company_id, '')::bigint;
alter table expenses alter column company_id type bigint using nullif(company_id, '')::bigint;
alter table company_memberships alter column company_id type bigint using nullif(company_id, '')::bigint;

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
