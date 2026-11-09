-- WerkPilot: grant company_memberships for the remaining local
-- accounts, once each has linked a real Supabase Auth identity via
-- the app's own Settings -> "cloud account" flow (their own action,
-- their own password -- never performed or seen by an assistant).
--
-- Local accounts and roles (confirmed from db.users, 2026-11-09):
--   admin       / manager     -- not yet linked
--   Rashid      / developer   -- ALREADY linked + provisioned ('de')
--   accountant  / accountant  -- not yet linked
--   ismail      / mechanic    -- not yet linked
--   warehouse   / warehouse   -- not yet linked
--
-- All 5 operate on company 'de' (TABAH AUTO) in real use; 'es' (Auto
-- Service España) is preserved but has no active staff. Replace each
-- placeholder email below with the address actually used for that
-- person's cloud link once confirmed, then run. Safe to run multiple
-- times (ON CONFLICT DO NOTHING).

insert into company_memberships (company_id, user_id, role, active)
select 'de', u.id, 'manager', true
from auth.users u where u.email = 'REPLACE_WITH_admin_EMAIL'
on conflict do nothing;

insert into company_memberships (company_id, user_id, role, active)
select 'de', u.id, 'accountant', true
from auth.users u where u.email = 'REPLACE_WITH_accountant_EMAIL'
on conflict do nothing;

insert into company_memberships (company_id, user_id, role, active)
select 'de', u.id, 'mechanic', true
from auth.users u where u.email = 'REPLACE_WITH_ismail_EMAIL'
on conflict do nothing;

insert into company_memberships (company_id, user_id, role, active)
select 'de', u.id, 'warehouse', true
from auth.users u where u.email = 'REPLACE_WITH_warehouse_EMAIL'
on conflict do nothing;

-- Verify afterward:
-- select cm.company_id, cm.role, u.email from company_memberships cm
--   join auth.users u on u.id = cm.user_id order by cm.company_id, cm.role;
