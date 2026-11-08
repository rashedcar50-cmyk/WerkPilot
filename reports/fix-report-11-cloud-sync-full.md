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

## Remaining / next steps (update as completed)

- [ ] Full column audit: repairs, invoices, purchases, inventory,
      expenses, appointments (beyond the `%_id` columns already seen).
- [ ] Design doc for the cloudId-resolution approach (this file,
      expanded) before writing code.
- [ ] Implement in `js/cloud.js` (and any caller-side ordering fixes
      in `js/app.js`/`js/repairs.js`/`js/invoice-edit.js`/etc.).
- [ ] Fix cloudId-not-persisting bug.
- [ ] Dedup-on-retry + visible sync status/errors.
- [ ] Local test against accurate schema reproduction.
- [ ] Any DB-side migration, if needed (audited, transactional,
      tested, applied by owner or by Claude if tooling allows).
- [ ] Full 8-point integration test with TEST-labeled data.
- [ ] Fix-forward any failures found during that test.
- [ ] PR, merge, deploy, verify published version syncs for real.
- [ ] Final Arabic report per the user's 5 questions.
