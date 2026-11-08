# Fix report 02 — invoice preview data mutation + tax/discount/rounding unification

**Branch:** `fix/security-invoicing-print-ocr-i18n`
**Status:** fixed, tested, NOT merged/deployed — awaiting owner review

## Bug A — preview/print wrote to the database

`js/invoice-print.js`'s `ensureKd(cust)` ran every time an invoice was
rendered — preview, print, PDF, email — and if the customer had no
permanent number (`kdNr`) yet, it allocated one and immediately wrote it
into `db.customers` and called `save()`. A read-only action (opening a
preview) was enough to permanently hand out and persist a real customer
number, in whatever order invoices happened to be previewed — even for an
invoice that was never actually saved.

**Proof of the bug:** the test suite's regex check on the pre-fix
`ensureKd` body (now a guard against regressions) matched a direct
`save()` call inside the function; a test rendering a customer through
`ensureKd` showed the in-memory customer record changing and `save()`
being invoked, with nothing having been explicitly "saved" by the user.

**Fix:** `ensureKd` is now purely read-only — it fills in a number for
*this render only* (never written back) if one is missing. A new
`assignKdNr(custId)` is the one place a number is actually persisted, and
it is called explicitly at the moment an invoice is actually saved for
that customer (`js/invoice-edit.js`'s save handler, and `lookup.js`'s
`createInvoiceAuto`). It is idempotent — calling it again for a customer
who already has a number is a no-op.

**Proof of fix** (`tests/run.js`): rendering a customer via `ensureKd`
leaves the stored record and `save()` call count completely untouched;
`assignKdNr` persists exactly once when actually invoked, and never
overwrites an existing number on a second call.

## Bug B — tax/discount/rounding disagreed between edit, preview, and print

The invoice editor's save handler (`js/invoice-edit.js`) and the
auto-create path (`js/lookup.js`'s `createInvoiceAuto`, used by
`convertRepairToInvoice` and any automation) both applied **one flat
header tax rate** to the whole discounted sum when computing the `net`/
`total` that got saved and booked to the journal/debt list — even though
each line in the invoice carries its own editable tax rate. Meanwhile
`js/invoice-print.js`'s `invoiceModel` (used for preview/print/PDF/email)
already computed VAT correctly per line's own tax rate, prorating the
discount across tax-rate buckets. For any invoice with mixed tax rates
across its lines (e.g. parts at 19%, a disposal fee line at 7%), the
amount actually booked internally could differ from the amount the
printed document showed the customer.

**Proof of the bug:** `tests/run.js` recomputes a known mixed-rate
invoice (100 @ 19% parts, 50 @ 7% parts, 120 @ 19% labor) both the old
flat-rate way and the new way, and asserts they disagree — reproducing
the exact discrepancy.

**Fix:** extracted the correct per-line-tax computation out of
`invoiceModel` into a single shared function, `computeInvoiceTotals
(lines, discount)`, in `js/invoice-print.js`. All three call sites now
use it:
- `js/invoice-edit.js`'s save handler (replacing its flat-rate formula)
- `js/invoice-edit.js`'s `refreshInvoiceSums` (the live running total
  shown while still editing — so what's on screen while typing already
  matches what will be saved and printed)
- `js/lookup.js`'s `createInvoiceAuto`
- `js/invoice-print.js`'s `invoiceModel` itself (unchanged behavior,
  just now calling the extracted function instead of inlining it)

**Proof the fix works:** `tests/run.js` asserts `computeInvoiceTotals`
produces the legally-correct per-rate total on the mixed-rate example,
confirms both `invoice-edit.js` and `lookup.js` now route through the
shared function (and no longer contain the old flat-rate formula), and —
critically — asserts a **single-rate invoice (the overwhelming common
case: everything at 19%, no mixed rates) totals identically to the old
formula**, proving zero behavior change for ordinary invoices.

Full suite: `node tests/run.js` → `all tests passed`, exit code `0`
(158 original + 9 credential-fix + 18 invoicing-fix assertions, all
green).

## What was NOT changed

- No existing/saved invoice's stored `net`/`total`/`tax` fields are
  rewritten. Old invoices print exactly as before (the print path's
  formula is unchanged, only relocated into a shared function).
- `obj.tax` on a saved invoice still reflects the header rate field as a
  display default (used by list views and to prefill the editor) — it was
  never the source of truth for the actual charged amount, and still
  isn't; `net`/`total` are.
