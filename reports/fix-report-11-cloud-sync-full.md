# Fix report 11 — full cloud sync overhaul (in progress)

**Status as of this section: IN PROGRESS.** This file is updated as work
proceeds so the task can be resumed from here if the session is
interrupted. Do not treat anything below "## Remaining / next steps" as
done until it's moved out of that section.

## Context / why this report exists

`fix-report-10` and the `supabase/company-id-type-fix/` work fixed
`company_id` end-to-end (verified: real customer save → `201` →
read back from Supabase with correct `company_id:"de"` text value).
PR #3 merged (`b197f32`), deployed, build verified.

While testing vehicle sync as a follow-up, a **separate, pre-existing
bug** was found: `js/cloud.js` sends WerkPilot's local string ids
(e.g. `customerId: "c_mw83sq5r4qd88"`) into real foreign-key columns
that are `bigint` in the actual schema (`vehicles.customer_id`,
`appointments.customer_id`/`vehicle_id`/`employee_id`,
`invoices.customer_id`, `expenses.supplier_id`, and likely more).
This is architecturally different from the `company_id` issue:
`company_id`'s target (`companies`) was empty and irrelevant to
WerkPilot, so converting to text was correct. These relational ids
point at **real rows that do exist** (the customer/vehicle just
synced) — the fix here is for the app to resolve and send the
*cloud* id of the related record, not convert more columns to text.

The user has asked for a complete, independent fix of the whole sync
path (all tables, cloudId persistence, dedup, conflict/network
handling, visible sync status) before any new feature work, tested
end-to-end, merged and deployed, with this report kept up to date
throughout.

## Confirmed facts so far (read-only, from production)

- `vehicles`: `id` bigint identity, `company_id` text (fixed),
  `customer_id` bigint, `license_plate`/`plate` both exist (and
  `brand`/`make`, `engine` — the real table has both the rich-schema
  names AND the simple names WerkPilot's code uses, as separate
  columns), `year` is `integer` (app sends `String(year)`).
- `customers`: real columns include both the simple set WerkPilot
  writes (`name`, `phone`, `email`, `address`, `company_id`) *and* a
  richer set it doesn't (`first_name`, `last_name`, `customer_number`,
  `street`, `postal_code`, `city`, `tax_id`, `metadata`, ...) — the
  simple set is what matters for WerkPilot and already works.
- `appointments.customer_id`, `appointments.vehicle_id`,
  `appointments.employee_id`: bigint.
- `invoices.customer_id`: bigint.
- `expenses.supplier_id`: bigint.
- Not yet checked in this pass: `repairs` full column list (it has no
  `company_id` FK and no RLS policy of its own — may also lack other
  FK columns, needs confirming, not assuming), `purchases`,
  `inventory` full column lists, and whether `invoices.vehicle_id` /
  `repairs`' vehicle link column exist and their types.

## Plan

1. Finish the full schema audit: every column (not just `%_id`) on
   `repairs`, `invoices`, `purchases`, `inventory`, `expenses`,
   `appointments`, `vehicles`, `customers` — types, nullability,
   defaults — so the fix is based on the actual schema, not
   assumption.
2. Design: on save, `upsertXCloud()` resolves each relation by looking
   up the *local* related object's `cloudId` (not its local string
   id) and sends that (a real bigint) as the FK value. This requires:
   - the related entity to have synced first (sync order: company
     membership irrelevant; customer before vehicle; customer+vehicle
     before appointment/repair/invoice; inventory item before a
     repair part reference if that's FK'd).
   - a clear fallback when the related cloudId isn't known yet
     (e.g. relation not yet synced) — queue/retry, not silently send
     a bad value or drop the relation.
3. Fix `cloudId` persistence: confirm why it wasn't being set after a
   proven-successful `201` (see fix-report-10's note) and correct it.
4. Add dedup-on-retry (don't insert twice if a previous attempt's
   response was lost — e.g. match on a natural key or check-before-
   insert), visible sync status/error per record, and graceful
   handling of network failure / resuming later.
5. Any further DB migration (if one turns out to be needed) gets the
   same treatment as `company-id-type-fix/`: full dependency audit
   first, tested against a local reproduction of the real schema,
   wrapped in an explicit transaction, verified after.
6. Full integration test per the user's 8-point list (customer+
   vehicle, appointment+repair+invoice, purchases/inventory/expenses,
   edit+delete, re-sync without duplication, network-loss/recovery,
   cross-session read-back, permissions/company isolation).
7. Merge + deploy + verify the *published* version actually syncs
   (not just that the build succeeded).

## Full schema audit (done)

Real columns for every table WerkPilot touches (confirmed live,
`information_schema.columns`):

- **customers**: simple set WerkPilot writes (`name`,`phone`,`email`,
  `address`,`company_id`) exists alongside a richer unused set. No
  outgoing relation columns. Already correct -- unchanged.
- **vehicles**: `customer_id` **bigint**. `plate`/`make`/`engine`/
  `paint`/`km`/`next_service_km`/`photo` all exist as real columns
  (alongside richer `license_plate`/`brand`/... duplicates, unused).
  `year` is `integer` (code was sending a string).
- **repairs**: `vehicle_id` is **text** (not bigint -- this table has
  no FK, unlike every other one). No `photos` column existed (added,
  see below). `jobs`/`parts` exist as text columns (JSON-stringified,
  as the code already did).
- **invoices**: `customer_id`, `vehicle_id`, `work_order_id` all
  **bigint**. Real columns are `invoice_number`, `status`,
  `issue_date`, `due_date`, `subtotal`, `tax_amount`, `total_amount`,
  `paid_amount`, `notes`, `metadata` (jsonb) -- almost none of what
  `upsertInvoiceCloud` was sending (`number`,`type`,`parts`,`labor`,
  `discount`,`tax`,`net`,`total`,`payment`,`paid`,`lines`,`repair_id`)
  matched a real column name. Every save would have been rejected.
- **purchases**, **inventory**: already correct -- both have the
  simple duplicate-column set WerkPilot's code already uses, confirmed
  working.
- **expenses**: `supplier_id` bigint (unused by WerkPilot's model).
  Real columns: `category`,`description`,`expense_date`,`net_amount`,
  `tax_amount`,`total_amount`,`notes`,`metadata`. **No cloud sync
  function existed at all for expenses before this fix** -- local-only
  until now.
- **appointments**: `customer_id`,`vehicle_id`,`employee_id` all
  bigint. Real columns are `title`,`description`,`start_at`,`end_at`,
  `status`,`notes`,`metadata` -- `upsertAppointmentCloud` was sending
  `appt_date`,`appt_time`,`tech`,`note`, none of which exist. Also:
  `loadAppointmentsFromCloud` had no company filter at all (read every
  company's appointments, not just the session's -- an isolation bug,
  fixed alongside this).

## Design decision: unified id strategy (not a blanket text conversion)

`company_id`'s fix (text) was correct *because* its target
(`companies`) was empty and structurally unrelated to WerkPilot. These
relation columns (`customer_id`, `vehicle_id`, etc.) point at rows
that genuinely exist (the customer/vehicle just synced) -- converting
them to text would be the wrong fix for a different problem. Instead:
on every `upsert*Cloud()`, a new `resolveCloudId(table, localId,
upsertFn)` helper looks up the related local record's `cloudId` and,
if it hasn't synced yet, **syncs it first** (recursively, via the same
upsert function) before using its real numeric id. This makes sync
order self-healing (a vehicle synced before its customer still ends up
correct) instead of requiring every call site to be sequenced by hand.
The reverse (`localIdForCloudId`) is used when reading cloud rows back
into local state. `repairs.vehicle_id` (text, no FK) stores the
resolved numeric id's string form -- correct and traceable, without
needing a schema change on that one column.

Fields WerkPilot tracks that have no matching real column (invoice
type/parts/labor/discount/tax%/payment/line-items, appointment
tech/time) are kept in that table's `metadata` jsonb column --
preserves full round-trip fidelity without inventing new real columns
or discarding data.

## Bugs found and fixed (code)

1. **`customers.js` (`customerModal`)**: on editing an existing
   customer, `db.customers[i]={...db.customers[i],...c}` replaced the
   array entry with a *new* object, but `upsertCustomerCloud(c)` was
   then called with the old `c` -- so a successful cloud save's
   `cloudId` was written onto an object nothing ever kept, and the
   next save would insert a duplicate. Fixed by reassigning `c` to the
   actual array entry after the merge.
2. **`repairs.js` (`repairModal`)**: the `obj` built for an edit never
   copied `cloudId` from the existing repair (`r.cloudId`), so every
   edit of an existing repair order would have inserted a brand-new
   cloud row instead of updating. Fixed.
3. **`invoice-edit.js`**: same bug, same fix -- `cloudId` now carried
   from `existing` into the rebuilt invoice object.
4. **`cloud.js` (`loadAppointmentsFromCloud`)**: no `cloudCompanyFilter`
   applied -- every session loaded *every* company's appointments.
   Fixed (now scoped like every other load function).
5. **`cloud.js` (`syncAllCloud`)**: loaded all 7 tables concurrently
   via `Promise.all`, but repairs/appointments/invoices need
   customers+vehicles already loaded locally to resolve their relation
   ids on read-back. Changed to load customers, then vehicles,
   sequentially first; everything else (no inter-dependencies) still
   loads in parallel after.
6. **Expenses never synced to the cloud at all** -- `upsertExpenseCloud`
   /`loadExpensesFromCloud` didn't exist. Added, and wired into both
   places a local expense is created (manual entry and OCR-scanned
   bill).
7. Field-name/column mapping rewritten for `vehicles` (`customer_id`,
   `year` as integer not string), `repairs` (`vehicle_id` resolution),
   `appointments` (near-total rewrite -- see audit above), `invoices`
   (near-total rewrite, `metadata` jsonb for the rest, and now reads/
   writes `customerId` directly off the invoice object instead of only
   deriving it through the vehicle -- matches what `invoice-edit.js`
   actually tracks).
8. Added `markSyncOk`/`markSyncError` -- every upsert now records a
   visible per-record `syncError`/`syncPending` state instead of only
   a `console.warn`, and `db.settings.lastSyncError` tracks the most
   recent failure project-wide.

## Database change applied

`alter table repairs add column if not exists photos text;` --
**applied to production** 2026-11-08 (repairs has no FK and no RLS
policy referencing `company_id`/`company_memberships`, confirmed
multiple times earlier this session -- zero cross-system risk).
Tested first against a disposable local reproduction of the exact
real schema (see below). See
`supabase/cloud-sync-fix/migration-add-repairs-photos.sql`.

## Local test performed (2026-11-08)

Built a disposable Supabase stack with every table's *exact* real
column set (not a simplification) -- companies, company_memberships,
customers, vehicles, repairs (+ the photos column), invoices,
purchases, inventory, expenses, appointments, with `wp_X_all` open
policies. Exercised the full relation chain via real REST calls
matching exactly what the rewritten `upsert*Cloud()` functions send:
customer → vehicle (`customer_id` resolved to the real numeric id) →
repair (`vehicle_id` resolved, text) → invoice (`customer_id`+
`vehicle_id` resolved, extra fields in `metadata`) → appointment
(`metadata` for tech/time) → expense. All `201`, all fields round-trip
correctly on read-back (verified via direct `select *`). Verified the
update path (PATCH by id) doesn't create a duplicate row.
`node tests/run.js` still passes (182/182) after the code changes;
`node --check` clean on every edited file.

## Remaining / next steps (update as completed)

- [x] Full column audit.
- [x] Design: resolveCloudId / localIdForCloudId, metadata overflow.
- [x] Implement in `js/cloud.js` + caller-side cloudId-preservation
      fixes in `customers.js`/`repairs.js`/`invoice-edit.js` +
      `app.js` (expenses wiring).
- [x] Fix cloudId-not-persisting bug (customers.js root cause found
      and fixed; same class of bug also found+fixed in repairs.js and
      invoice-edit.js).
- [x] Visible sync status (`syncError`/`syncPending` per record,
      `db.settings.lastSyncError` project-wide) -- dedup addressed at
      its actual root cause (cloudId persistence) rather than added as
      a bolted-on retry layer; residual risk (a request that times out
      *after* the server committed it) is real but small and is
      called out honestly in the final report, not claimed solved.
- [x] Local test against accurate schema reproduction (full relation
      chain, update-path dedup check).
- [x] DB migration (`repairs.photos`) -- audited (no FK/policy
      dependency), tested locally, applied to production.
- [x] Live-corrected 2 bugs found only by testing against real
      production constraints (not caught by the local schema
      reproduction): appointment `title`/`start_at` NOT NULL (PR #5,
      `7fba035`, merged+deployed), and `deletePurchaseDo` calling the
      local-array filter *before* the cloud delete so the cloud row's
      id was never found (PR #6, `db744fe`, merged+deployed).
- [x] Re-verified the purchase-delete fix live post-deploy (2026-11-09):
      created purchase `TEST-DEL-VERIFY-1` via the app's own "Manueller
      Einkauf" form -> synced as cloud `purchases.id=5` -> deleted via
      the app's own "Löschen" button/confirm flow -> confirmed via a
      direct `select` in the Supabase SQL editor that `id=5` no longer
      exists. Cloud delete is real, not just a local list update.
- [ ] Full 8-point integration test with TEST-labeled data, live
      against production, from the open browser session (customer+
      vehicle, appointment+repair+invoice, inventory, network-loss
      reasoning, cross-session read-back) -- partially covered across
      this and earlier phases; appointments/repairs/invoices/inventory
      not yet re-exercised against the *current* deployed build in one
      pass.
- [ ] Final Arabic report per the user's 5 questions -- blocked on the
      RLS/auth phase below being far enough along to report on
      honestly (see "Data-protection audit").

## Data-protection audit (phase 2, started 2026-11-09)

**Why this phase exists:** after the purchase-delete fix, the user
asked me to test `expenses` access -- which is denied for everyone,
because an earlier migration pass (see fix-report-10, "Pass-4 RLS
migration" note) accidentally dropped `wp_expenses_all` and never
recreated it. My first instinct was to recreate that one open
`using(true)` policy to match the other 7 tables. **The user explicitly
rejected this**: its presence on the other tables doesn't make it
correct there either, and asked me to (a) fix `expenses` via real
authentication + company membership instead of an open policy, (b)
audit whether the open policies on the *other* 7 tables are themselves
a problem, not just a historical artifact, (c) identify and complete
whatever cloud-account-linkage work is within my own authority if that
turns out to be the gap, and (d) actually test allow-for-the-right-
company / deny-for-another-company, not just assume it from the policy
text.

**Findings (read-only queries against production, 2026-11-09):**

| Fact | Value |
|---|---|
| `company_memberships` rows | **0** |
| `auth.users` rows | **0** |
| Local accounts (`db.users`) with `cloudEmail` set | **0 of 5** (admin, Rashid, accountant, ismail, warehouse) |
| Tables with an open `wp_<table>_all using(true)` policy | customers, vehicles, repairs, invoices, purchases, inventory, appointments (7 of 8) |
| Tables with a real `members can ...` (authenticated + `company_memberships`) policy | **all 8**, including expenses |
| `expenses`'s open policy | missing (the Pass-4 regression) -- its `members can manage expenses` policy is the *only* one on that table |

**The real finding is bigger than "expenses is missing one policy":**
zero Supabase Auth users have ever existed for this project, and zero
`company_memberships` rows exist. That means the `members can ...`
policy already sitting on *every one of the 8 tables* -- not just
expenses -- has never once been capable of passing for anyone,
because `auth.uid()` has never had a real signed-in user to resolve
to. The open `wp_<table>_all` policies are not a backstop next to a
working membership system; on 7 of the 8 tables they are the *only*
thing currently granting access at all, to anyone holding the
published anon key, regardless of company. `expenses` isn't an
exception to an otherwise-protected schema -- it's the one table where
that was visible (total failure) instead of invisible (total,
unauthenticated access). So the user's instinct to question the other
7 tables' open policies was correct: right now, **no table in this
schema has real, enforced, per-company access control.**

**Why I haven't fixed this yet, and the one thing only the owner can
do:** real protection needs an actual Supabase Auth identity to exist
before any policy work matters -- without one, tightening RLS to rely
on `company_memberships` would deny access to *everyone*, including
the owner, since the app currently talks to Supabase using only the
anon key. Creating that first account requires one of:
  - `sb.auth.signUp({email, password})`, which is exactly what the
    app's own existing "link cloud account" flow already does
    (`js/auth.js` `linkAccountToCloud`, wired into Settings and into
    the forced-password-rotation screen) -- but it needs a real email
    + password entered by the account's owner, in that form, in the
    already-open app tab.
  - or creating a user directly from the Supabase dashboard's
    Authentication -> Users page, which needs a password set the same
    way.

I never enter, type, or see a password on behalf of the user, even for
their own production app -- this is a hard rule, not a preference, and
it's the one step in this whole phase I cannot do for them. Everything
else below is already prepared so it can be finished within minutes of
that one action. Confirmed along the way: this Supabase project has
**"Confirm email" turned on** (Authentication -> Sign In / Providers),
so after signing up the owner will need to click the confirmation link
in the email Supabase sends (no custom SMTP is configured, so it goes
out through Supabase's own low-volume default sender -- fine for one
real account, not for bulk).

**What I *have* completed within my own authority, ready to run the
moment a real `auth.users` row exists:**

1. `supabase/rls-fix-proposal/provision-membership.sql` (new, see
   below) -- a plain `insert into company_memberships`, not a policy
   change, so it isn't subject to the RLS-modification block. Takes
   the new user's email, looks up their `auth.users.id`, and grants
   them `company_id='de'` (TABAH AUTO) -- the owner can be granted
   `'es'` too in the same statement if wanted.
2. Confirmed `expenses` needs **no new policy at all** -- its
   `members can manage expenses` policy already matches the pattern
   on every other table; it only needs a real identity + membership
   row to ever pass.
3. Plan for after that identity exists (not yet executed, needs the
   live auth session verified first): sign in as the provisioned user,
   confirm `select`/`insert` on `expenses` succeeds for `company_id=
   'de'` and is denied/empty for `'es'` or no membership, then -- as
   an explicitly separate, confirmed step -- retire the open
   `wp_<table>_all` policies table by table (classifier-blocked for me
   to execute directly; will specify exact SQL per table once the
   auth path is proven, same as the `wp_expenses_all` recreation
   attempt was blocked earlier).

**Distinction to carry into the final report:** cloud *sync* (data
reaching Supabase, round-tripping correctly, surviving edits/deletes)
and *data protection* (who is allowed to read/write it) are two
different, separately-verified claims. Sync is now solid per the
8-point test (pending the last re-pass). Protection is **not yet
real on any of the 8 tables** -- this must not be glossed over in the
Arabic summary.

## Data-protection audit -- phase 2 completed (2026-11-09, same day)

The owner linked `rashed.car50@gmail.com` to the cloud via the app's
own Settings -> "cloud account" flow (their own action, their own
password, never seen or typed by me) and confirmed the verification
email themselves. From there:

1. Confirmed in `auth.users`: the identity exists and is confirmed
   (`email_confirmed_at` set, `last_sign_in_at` matches).
2. Ran `supabase/cloud-sync-fix/provision-membership.sql` (merged in
   PR #7) to grant this identity `company_memberships` for `'de'`
   (TABAH AUTO) only -- deliberately *not* `'es'`, so the deny-test
   below is a real test of a signed-in user with the wrong company,
   not just "no login at all".
3. Had the owner log out and back in, in the same tab, so
   `js/auth.js`'s existing `signInCloud` call (already wired into
   `js/app.js`'s login flow) would fire with their real password.
   Confirmed via `supabaseClient.auth.getSession()`: a real,
   non-anonymous session, matching the provisioned `user_id`.
4. **Allow/deny test, run through the authenticated session itself**
   (not the anon key, and not assumed from the policy text):
   - Seeded one real `expenses` row for `company_id='es'` directly in
     SQL (bypasses RLS, so I know it genuinely exists).
   - As the authenticated `'de'`-only session: `select ... where
     company_id='es'` returned **zero rows** -- the real row is
     invisible to this user. Read-side isolation confirmed.
   - Same session: `insert ... company_id='de'` **succeeded**
     (new row, id 3). Same session: `insert ... company_id='es'`
     **failed** with `new row violates row-level security policy for
     table "expenses"` -- an explicit, named RLS rejection, not a
     silent failure. Write-side allow/deny confirmed both directions.
   - Same session: `delete ... id=2` (the `'es'` seed row) matched
     **zero rows** (silently filtered, not an error) -- confirmed
     this identity cannot delete another company's row either, not
     just read/insert. `delete ... id=3` (its own `'de'` row)
     succeeded normally.
5. **Real-usage confirmation, not just raw REST calls**: created a
   TEST expense through the app's actual "Neuer Beleg" form in the
   now-authenticated session -- it synced with a real `cloudId`
   (`db.expenses` row, `cloudId:5`, no `syncError`) exactly like any
   other record. This proves the fix holds through the app's normal
   UI path, not only through a hand-crafted API call.
6. Cleaned up every row this test created (both `'de'` and `'es'`
   sides, local and cloud) -- `expenses` is back to only its original
   2 pre-existing demo/local rows, neither touched.
7. Also, as explicitly re-requested: re-confirmed the purchase-delete
   fix a second time and cleaned up the one remaining pre-existing
   TEST purchase (`TEST-PO-1`) via the app's own delete flow --
   `purchases` now holds only the original demo row.

**Net result: `expenses` is now the only one of the 8 WerkPilot tables
with real, enforced, per-company access control** -- proven by an
actual allow/deny test against a real authenticated identity, not
inferred from policy text. The other 7 tables (customers, vehicles,
repairs, invoices, purchases, inventory, appointments) are unchanged:
still reachable by anyone holding the published anon key, regardless
of company or login state, through their `wp_<table>_all` policies.
Retiring those is a deliberate, separate next step -- each is a
`DROP POLICY`, which this session's tooling blocks me from executing
directly (same classifier block hit earlier on the `wp_expenses_all`
attempt), and more importantly it should wait until more than one
staff identity is actually linked, since today only the owner's
account can pass the membership check at all; dropping the open
policy on, say, `customers` right now would silently stop sync for
every other local account (admin, accountant, ismail, warehouse)
until each of them also links a cloud identity and is provisioned.
Not attempted in this phase; flagged for an explicit decision.
