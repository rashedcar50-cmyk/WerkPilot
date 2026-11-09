-- APPLIED to production 2026-11-09 (see fix-report-11, "phase 3: full
-- rollout"). Kept here as a record of exactly what ran, not as a
-- pending action. One gap found and fixed immediately after applying
-- this: repairs had no "members can ..." policy at all once its open
-- one was gone -- see add-repairs-member-policy.sql.
--
-- WerkPilot: retire the open wp_<table>_all policies on the 7 tables
-- that still have one (expenses already lost/never-recreated its own,
-- see fix-report-11 -- it has been running on real auth+membership
-- only since 2026-11-09, proven via a live allow/deny test).
--
-- DO NOT RUN THIS until every local account that needs ongoing cloud
-- sync has:
--   1. linked a real Supabase Auth identity (app Settings -> "cloud
--      account", their own email + their own current local password,
--      entered by them -- never by an assistant), AND
--   2. a company_memberships row for the company they actually work
--      at (see provision-memberships-batch.sql in this same folder).
-- Dropping an open policy before that is complete silently stops sync
-- for every local account that isn't yet linked+provisioned -- it is
-- not a partial/safe rollout, every one of the 7 tables' open policy
-- is the ONLY thing currently granting that table's access to anyone
-- without a real session.
--
-- Each table already has a complete, correct, company-scoped
-- "members can ..." policy set (confirmed: 0 of 37 reference role --
-- these are company-isolation only, matching the client app's own
-- existing role model, which stays enforced client-side as before).
-- This migration removes only the open policy sitting next to it; it
-- creates nothing new.

drop policy if exists "wp_appointments_all" on appointments;
drop policy if exists "wp_customers_all" on customers;
drop policy if exists "wp_inventory_all" on inventory;
drop policy if exists "wp_invoices_all" on invoices;
drop policy if exists "wp_purchases_all" on purchases;
drop policy if exists "wp_repairs_all" on repairs;
drop policy if exists "wp_vehicles_all" on vehicles;

-- Verify afterward -- should return 0 rows:
-- select tablename, policyname from pg_policies where policyname like 'wp_%_all'
--   and tablename in ('appointments','customers','inventory','invoices','purchases','repairs','vehicles');
