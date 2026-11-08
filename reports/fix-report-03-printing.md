# Fix report 03 — print/PDF for repair orders and appointments; estimates share-bar

**Branch:** `fix/security-invoicing-print-ocr-i18n`
**Status:** fixed, tested, NOT merged/deployed — awaiting owner review

## Bug A — no print/PDF/share for repair orders or appointments

`js/print.js`'s `buildDocHTML(type, id)` had no case at all for `'repairs'`
or `'appointments'` — only `customers`, `vehicles`, `purchases`,
`invoices`, and `inventory` were handled. Anything else fell through to
the generic branch and rendered `t('noData')` ("no data"). In practice
this meant the repair-orders list, the single work-order view, and the
appointments list never even offered print/PDF/share buttons in the UI —
the feature was simply missing, not just broken.

**Proof of the bug:** before this fix, `buildDocHTML('repairs', ...)` and
`buildDocHTML('appointments', ...)` both produced the generic "no data"
output; neither `js/repairs.js` nor the appointments screen in
`js/app.js` called `listShareBar`/`shareBar` anywhere.

**Fix:**
- `js/print.js`: added real `'repairs'` (list, and a single work-order
  view with vehicle/customer/status/complaint/work description/issued
  parts/labor+parts totals) and `'appointments'` (list: date, time,
  vehicle, customer, tech, status) cases to `buildDocHTML`.
- `js/repairs.js`: the repair-orders list now has `listShareBar('repairs')`;
  the single work-order view (`repairDesk`) now has `shareBar('repairs',
  r.id)` so a work order can be printed/PDF'd/emailed/WhatsApp'd directly.
- `js/app.js`: the appointments list now has `listShareBar('appointments')`.

**Proof the fix works** (`tests/run.js`): `buildDocHTML` is exercised
directly (via a minimal stubbed sandbox) for `'repairs'` (list and
single-id) and `'appointments'`, asserting the output no longer contains
the `noData` fallback and does contain the actual data (vehicle name,
status, complaint, issued part, appointment date/time). Source checks
confirm the new share-bar calls are actually wired into the repairs list,
the single work-order view, and the appointments list.

## Bug B — estimates screen exported the wrong list

`estimates()` in `js/app.js` called `listShareBar('invoices')` — so its
print/PDF/email/WhatsApp buttons exported the **invoices** list, not the
estimates (Kostenvoranschlag/quotes) actually on screen. `buildDocHTML`
also had no `'estimates'` case of its own; the bug effectively worked by
accident (it showed *something*, just the wrong thing).

**Fix:** `estimates()` now calls `listShareBar('estimates')`, and
`buildDocHTML` gained a real `'estimates'` case (vehicle, parts, labor,
discount, tax%, total, quote fee — the same columns already shown on
screen).

**Proof the fix works:** a source check confirms `estimates()` now calls
`listShareBar('estimates')` and no longer calls `listShareBar('invoices')`;
`buildDocHTML('estimates', ...)` is exercised directly and asserted to
show the actual estimate data instead of falling through to "no data".

Full suite: `node tests/run.js` → `all tests passed`, exit code `0`
(158 original + 9 + 18 + 12 = 197 assertions, all green).

## What was NOT changed

- Invoice print/PDF itself (correct tax/discount/rounding/customer data)
  was already addressed in fix report 02 — this report only adds the
  previously-missing document types and corrects the estimates mixup.
- No existing data is touched; this is purely new rendering code plus
  two UI wiring additions (button bars) and one type-name correction.
