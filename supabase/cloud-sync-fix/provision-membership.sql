-- WerkPilot: grant a real cloud identity access to a company's data.
--
-- Context (2026-11-09): every WerkPilot table already has a correct,
-- restrictive "members can ..." RLS policy that checks
--   exists (select 1 from company_memberships cm
--           where cm.company_id = <table>.company_id
--             and cm.user_id = auth.uid() and cm.active = true)
-- This policy has never been able to pass for anyone, because
-- auth.users and company_memberships were both empty (confirmed via
-- read-only queries this session) -- not because the policy is wrong.
--
-- This script does NOT create a login identity and does NOT touch any
-- RLS policy. It only inserts the membership row that makes an
-- identity -- once one exists -- count as a member of a company. That
-- identity itself can only be created by the account owner (Supabase
-- Auth signUp, e.g. via the app's own Settings -> "cloud account" link
-- flow in js/auth.js), never by this script or by an assistant typing
-- a password on someone's behalf.
--
-- Usage: replace the email below with the address that was just used
-- to sign up, pick the company_id(s) that person should see (the two
-- real companies in this project are 'de' = TABAH AUTO and 'es' =
-- Auto Service España), and run in the Supabase SQL editor.

insert into company_memberships (company_id, user_id, role, active)
select 'de', u.id, 'developer', true
from auth.users u
where u.email = 'REPLACE_WITH_THE_SIGNED_UP_EMAIL'
on conflict do nothing;

-- Uncomment to also grant the same identity access to 'es' (Auto
-- Service España) -- only if this is the owner's own account; do not
-- grant other staff access to a company they don't work at.
-- insert into company_memberships (company_id, user_id, role, active)
-- select 'es', u.id, 'developer', true
-- from auth.users u
-- where u.email = 'REPLACE_WITH_THE_SIGNED_UP_EMAIL'
-- on conflict do nothing;

-- Verify afterward:
-- select cm.*, u.email from company_memberships cm
--   join auth.users u on u.id = cm.user_id;
