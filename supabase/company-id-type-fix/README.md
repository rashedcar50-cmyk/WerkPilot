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

## What's in this folder

- `migration-fix-company-id-type.sql` — the fix. Converts `company_id`
  to `text` on all 8 affected tables (`customers`, `vehicles`,
  `inventory`, `purchases`, `repairs`, `appointments`, `invoices`,
  `expenses`), but only where the column exists and isn't already
  `text` — safe to run more than once. Uses
  `using company_id::text`, a lossless cast; no rows are deleted, no
  RLS policy is touched, no other column is changed.
- `rollback.sql` — reverts the type back to `bigint`. Deliberately
  **fails instead of silently discarding data** if any row already
  holds a non-numeric value like `'de'`/`'es'` by then (tested below).

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
   `rollback.sql` again — it **failed with an error** (`invalid input
   syntax for type bigint: "de"`) instead of silently dropping that
   row or the column; verified afterward that every column was still
   `text` and the test row was untouched. This confirms the rollback
   script's safety behavior is real, not just documented.
8. Tore the local stack down (`npx supabase stop`) and confirmed the
   separate BusinessPilot/Firmenkraft containers were never started or
   touched at any point.

## Code change made alongside this (already tested, included in the PR)

`js/cloud.js`'s `upsertPurchaseCloud` no longer omits `company_id` —
it now sends it the same way every other `upsert*Cloud` function does.
This was only safe to do *because* the type fix above removes the
reason that workaround existed. `node tests/run.js` still passes (all
cases) after this change.

## What the owner needs to do

1. **Backup first.** Supabase Dashboard → Database → Backups (or
   `pg_dump`) on project `jljzobaggesefsdeslrf`, before running
   anything below.
2. Supabase Dashboard → SQL Editor → paste and run
   `migration-fix-company-id-type.sql`.
3. Run the verification query at the bottom of that same file (or see
   step 3 below) to confirm all 8 columns now read `text`.
4. Report back — then sync will be re-tested end-to-end using the
   existing TEST records, and the fix report will be updated.

If anything looks wrong after running it, `rollback.sql` is ready, but
note its safety behavior above — it won't silently discard real data,
so if real `'de'`/`'es'` values exist by the time a rollback is ever
needed, that needs a conscious decision first, not just running the
script.
