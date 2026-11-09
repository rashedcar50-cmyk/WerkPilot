-- WerkPilot: repairs was missing its "members can ..." policy entirely.
--
-- Applied to production 2026-11-09, discovered and fixed within
-- minutes of retiring repairs' open wp_repairs_all policy (see
-- retire-open-policies.sql): repairs had ZERO RLS policies of any
-- kind once the open one was gone, confirmed via `select * from
-- pg_policies where tablename='repairs'` returning no rows, and via
-- a live failing insert using the owner's own authenticated,
-- correctly-company-scoped session. Every other WerkPilot table
-- already had a real "members can ..." policy matching this same
-- shape; repairs never did, likely missed by whichever earlier
-- migration pass added the others. Re-verified immediately after
-- applying: the same insert that failed now succeeds, and the
-- allow/deny test (own company allowed, other company and anon
-- denied) passes identically to every other table.

create policy "members can manage repairs" on repairs for all
  using (exists (select 1 from company_memberships cm
    where cm.company_id = repairs.company_id
      and cm.user_id = auth.uid() and cm.active = true))
  with check (exists (select 1 from company_memberships cm
    where cm.company_id = repairs.company_id
      and cm.user_id = auth.uid() and cm.active = true));
