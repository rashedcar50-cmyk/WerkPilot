# Local test log — fourth pass (dynamic, schema-wide migration)

2026-11-08. All runs against a disposable local Supabase CLI stack
(`npx supabase start`, project id `WerkPilot`), never against
production. BusinessPilot/Firmenkraft containers confirmed untouched
(same timestamps) before and after every run in this session.

## Why a fourth pass

Pass 3's migration (FK-aware, 9 tables, 16 policies) failed live
against production with a new error: a policy on `work_orders` — a
table WerkPilot's code has never touched — depended on
`company_memberships.company_id`. Reading `pg_policies` schema-wide
(read-only) found **36 policies across 23 tables** depend on it, not
16 across 7. Only 8 of those 23 tables are WerkPilot's own; the other
15 (`activity_logs`, `app_settings`, `attachments`,
`bank_transactions`, `employees`, `estimates`, `estimate_items`,
`inventory_movements`, `invoice_items`, `journal`, `payments`,
`payroll`, `suppliers`, `time_entries`, `work_orders`) belong to a
much larger shop-management schema this Supabase project also hosts.

At that scale, hand-transcribing every policy risks silent errors
(wrong role, wrong permissive flag, a missed cast). The migration was
rewritten to capture each dependent policy's *live* definition
(table, name, permissive/restrictive, roles, command, USING, WITH
CHECK) via `pg_policies`, drop it, make the type change, then
recreate it from the captured text — injecting an explicit `::text`
cast only where the comparison is against a column outside our 9
tables (which stays bigint, untouched).

## Reproduction

Built a local schema covering every distinct shape found in
production: `customers` (4-way CRUD split, FK, our own),
`work_orders` (4-way CRUD split, FK, **not** ours), `expenses`
(single ALL policy, FK, our own), `employees` (single ALL policy, FK,
not ours), `companies` (the `cm.company_id = companies.id` special
case), `company_memberships` (its own non-company_id policy,
`user_id = auth.uid()`), and `repairs` (no policy, no FK — the one
table that's genuinely only ours).

## Results

1. Baseline: `select count(*) from pg_policies` → 22 (12 tables).
2. Ran the pass-4 migration: `BEGIN` → `NOTICE: Done: 20 policies
   captured and restored, 8 FKs dropped, 9 columns retyped to text`
   → `COMMIT`. Zero errors.
3. Post-migration count: still 22, identical per-table breakdown.
4. Inspected the recreated policies directly:
   - `work_orders` / `members can view work orders` (and its 3
     siblings): `cm.company_id = (work_orders.company_id)::text` —
     cast injected correctly, nothing else changed.
   - `companies` / `members can view their companies`:
     `cm.company_id = (companies.id)::text` — same.
   - `employees` / `members can manage employees`: same pattern.
   - `work_orders` / `wp_work_orders_all` — deliberately created as
     `using (false) with check (false)` in the test schema (an
     obviously-wrong policy no real system would use) specifically to
     prove the migration doesn't quietly "fix" or alter policies it
     isn't supposed to touch logically — survived byte-for-byte as
     `false`/`false`.
5. Real REST inserts (`company_id: "de"`) — `201` on all 8
   WerkPilot-facing tables.
6. Sanity checks on the two tables deliberately left alone:
   - `work_orders` insert with the original bigint value → correctly
     rejected by RLS (`42501`, matching its pre-existing, untouched
     policy logic) — not broken, not newly permitted.
   - `employees` anon select → empty array, not an error — consistent
     with before.
7. Ran the exact same migration a **second time** with no changes in
   between: `NOTICE: constraint ... does not exist, skipping` ×8 (FK
   drops, harmless), same 20-policy result, `COMMIT`. Confirms this
   version is idempotent — safe to re-run if ever needed, unlike the
   earlier hand-written passes.
8. Tested the updated `rollback.sql`:
   - With real `'de'` data still present in `vehicles`: failed with
     `invalid input syntax for type bigint: "de"` inside the explicit
     transaction → `ROLLBACK` — confirmed via `information_schema`
     immediately after that `customers`/`vehicles` were still `text`,
     i.e. nothing was left half-reverted.
   - With all test rows cleared: reverted cleanly — all 9 columns
     back to `bigint`, all 8 FK constraints restored, policy count
     back to 22, `work_orders`/`employees` untouched throughout.
9. Stopped the stack (`npx supabase stop`); confirmed BusinessPilot
   containers were never started at any point in this session.
