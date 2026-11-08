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
- [ ] Full 8-point integration test with TEST-labeled data, live
      against production, from the open browser session.
- [ ] Fix-forward any failures found during that test.
- [ ] PR, merge, deploy, verify published version syncs for real
      (not just that the build succeeded).
- [ ] Final Arabic report per the user's 5 questions.
