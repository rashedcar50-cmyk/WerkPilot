# company_id type fix (bigint → text)

**Nothing in this file has been applied anywhere.** No change was made
to the production Supabase project (`jljzobaggesefsdeslrf`). This
documents a confirmed bug and a migration tested only against a
disposable local Supabase CLI stack, for the owner to review and apply.

## Confirmed root cause

Found 2026-11-08 while verifying the published app with clearly-labeled
TEST records (customer/vehicle/repair/invoice/inventory item, all named
`TEST — DO NOT USE`). Saving the TEST customer failed to sync to the
cloud; the project owner checked Supabase's own API logs and found:

```
POST /rest/v1/customers -> HTTP 400
Postgres code: 22P02
invalid input syntax for type bigint: "de"
```

Every `upsert*Cloud` function in `js/cloud.js` sends `company_id` as the
text string `'de'` or `'es'` (matching `companies.id`, which is text —
see `supabase-schema.sql`'s seed insert). But the actual `company_id`
columns in production are typed `bigint` on at least `customers`,
`vehicles`, `repairs`, `invoices`, and `inventory` — reproduced live for
all five via the app's own normal save actions on the TEST records.
`purchases` was already known-affected: `js/cloud.js`'s
`upsertPurchaseCloud` carried a prior developer's comment documenting
the exact same discovery, worked around by never sending `company_id`
at all (avoids the error, but means every synced purchase has always
landed with no company tag).

Likely origin: `supabase-schema.sql` only ever does
`alter table X add column if not exists company_id text` — a silent
no-op if the column already existed under a different type (e.g.
created once via the Supabase Table Editor UI, which defaults a new
`*_id` column to `int8`). The file's stated intent (`text`) was never
actually applied to the live database.

**Practical impact:** since this type mismatch rejects every insert
unconditionally, it's likely that `customers`/`vehicles`/`inventory`
records have never successfully synced to the cloud at all, for as
long as this column type has been wrong — independent of the separate
project-pause issue found earlier the same day. Local data has been
safe throughout (the app's local-first design never depended on sync
succeeding), but cross-device access to this data has likely never
worked.

## Second finding (same day, while applying this fix live)

Running the type change directly against production failed with a
*different* error than the one above:

```
ERROR: cannot alter type of a column used in a policy definition
DETAIL: policy members can view customers on table customers
        depends on column "company_id"
```

This revealed something not documented anywhere in this repo: production
already has a real, members-based row-level-security layer — a
`company_memberships` table (`user_id uuid`, `company_id bigint`,
`role`, `active`) plus 16 policies across 7 of the 8 tables (`repairs`
has none) of the shape "members can view/insert/update/delete/manage X
... EXISTS (SELECT 1 FROM company_memberships cm WHERE cm.company_id =
X.company_id AND cm.user_id = auth.uid() AND cm.active = true)". These
coexist with the fully-open `wp_X_all` policies from
`supabase-schema.sql` (RLS policies are OR'd together, so the open ones
currently grant access regardless). `company_memberships.company_id` is
also `bigint`, and the table was confirmed **completely empty** (0 rows)
before this fix — so including it in the type change is lossless with
certainty, not just by cast semantics.

Postgres refuses to change a column's type while a policy's expression
depends on it, so the fix now drops those 16 policies, does the type
change on all 9 tables (the original 8 plus `company_memberships`), then
recreates every policy with byte-for-byte the same logic — same table,
same command, same USING/WITH CHECK condition, only the compared
columns are now text instead of bigint. No policy's access logic
changes, nothing gets newly exposed or newly restricted.

## What's in this folder

- `migration-fix-company-id-type.sql` — the fix: drop the 16
  dependent policies, convert `company_id` to `text` on all 9 affected
  tables (`customers`, `vehicles`, `inventory`, `purchases`, `repairs`,
  `appointments`, `invoices`, `expenses`, `company_memberships`), then
  recreate the 16 policies identically. Uses `using company_id::text`,
  a lossless cast. No rows are deleted, no policy's logic changes, no
  new policy or table is introduced. This is a one-time migration, not
  designed to be re-run (the DROP/CREATE POLICY statements aren't
  idempotent — re-running after a successful run will error on
  "already exists", which is expected and harmless to notice, not
  something to work around).
- `rollback.sql` — mirrors the same drop/alter/recreate cycle in
  reverse, back to `bigint`. Deliberately **fails instead of silently
  discarding data** if any row already holds a non-numeric value like
  `'de'`/`'es'` by then (tested below) — and if it fails partway
  through (after dropping policies but before the type revert
  succeeds), re-running just the `create policy` statements at the
  bottom of either this file or the forward migration restores them
  (the policy text is identical either way; only the column's
  declared type differs).

## Local test performed (2026-11-08)

Tested against a disposable local Supabase CLI stack (`npx supabase
start`, project id `WerkPilot`), never against production:

1. Created 8 tables matching the suspected production shape, each with
   `company_id bigint` (reproducing the bug intentionally).
2. Sent a real REST insert with `company_id: "de"` — got the *exact*
   same error as production: `HTTP 400`, code `22P02`, message
   `invalid input syntax for type bigint: "de"`. Confirms this
   migration targets the real, reproduced cause, not a guess.
3. Applied `migration-fix-company-id-type.sql` — converted all 8
   columns to `text` (confirmed via `information_schema.columns`).
4. Re-ran the exact same insert that failed in step 2 — now
   `HTTP 201`, row created. Repeated with `company_id: "es"` against
   the other 7 tables — all `201`.
5. Ran the migration a second time — every table reported "already
   text", no errors (idempotent, safe to re-run).
6. Ran `rollback.sql` with no conflicting data present — reverted
   cleanly back to `bigint` on all 8 tables.
7. Re-applied the fix, inserted a row with `company_id='de'`, then ran
   `rollback.sql` (first version, policy-free) again — it **failed
   with an error** (`invalid input syntax for type bigint: "de"`)
   instead of silently dropping that row or the column; verified
   afterward that every column was still `text` and the test row was
   untouched. This confirms the rollback script's safety behavior is
   real, not just documented.
8. Tore the local stack down (`npx supabase stop`) and confirmed the
   separate BusinessPilot/Firmenkraft containers were never started or
   touched at any point.

## Second local test pass (same day, after the RLS-dependency finding above)

Rebuilt the local stack from scratch, this time reproducing production's
*exact* schema — all 9 tables (`bigint` company_id), `company_memberships`,
and all 16 real policies, pulled verbatim from production's own
`pg_policies` via the Supabase SQL Editor (read-only):

1. Ran the plain `alter column ... type text` directly — reproduced the
   *exact* same policy-dependency error seen live in production.
2. Rewrote the migration to drop the 16 policies, alter all 9 tables,
   recreate the 16 policies — ran it: 16 `DROP POLICY`, 9
   `ALTER TABLE`, 16 `CREATE POLICY`, zero errors.
3. Verified: all 9 `company_id` columns now `text`; policy counts per
   table unchanged from before (customers 5, vehicles 5, invoices 5,
   appointments 2, expenses 2, inventory 2, purchases 2, repairs 1,
   company_memberships 1 — same totals as production, confirming
   nothing was lost or duplicated).
4. Real REST inserts with `company_id:"de"` — now `201` on all 8
   app-facing tables (previously `400`/`22P02`).
5. Cleared the test rows and ran the updated `rollback.sql` — reverted
   cleanly (16 drops, 9 alters back to `bigint`, 16 recreates), no
   errors.
6. Re-applied the forward migration once more to leave the local stack
   in the fixed state, re-verified all 9 columns read `text`.
7. Tore the stack down again; BusinessPilot/Firmenkraft containers
   confirmed untouched throughout (same timestamps before and after).

## Code change made alongside this (already tested, included in the PR)

`js/cloud.js`'s `upsertPurchaseCloud` no longer omits `company_id` —
it now sends it the same way every other `upsert*Cloud` function does.
This was only safe to do *because* the type fix above removes the
reason that workaround existed. `node tests/run.js` still passes (all
cases) after this change.

## What the owner needs to do

The project's Free plan has no built-in backup feature, and the owner
confirmed (2026-11-08) that current WerkPilot data is all test data and
authorized proceeding without a manual backup/export step. Applying
`drop policy` / `create policy` against production is also outside what
the assistant's own tooling permits (flagged as a security-sensitive
action requiring a human), so this is the one step only the owner can
do:

1. Supabase Dashboard → SQL Editor (already open) → paste and run
   `migration-fix-company-id-type.sql` in full, in one go.
2. Confirm it finishes with `Success. No rows returned` and no error
   partway through.
3. Optionally run the verification queries at the bottom of that file
   to confirm all 9 columns now read `text` and policy counts per
   table are unchanged.

After that, cloud sync will be re-tested end-to-end using the existing
TEST customer/vehicle/repair/invoice records, and this report will be
updated with the result.

If anything looks wrong after running it, `rollback.sql` is ready and
has been tested the same way as the forward migration (see "Second
local test pass" above) — but note its safety behavior: it won't
silently discard real `'de'`/`'es'` data if any exists by the time a
rollback is ever needed.
