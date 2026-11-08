# Fix report 04 — OCR hardcoded API key + XSS escaping inconsistencies

**Branch:** `fix/security-invoicing-print-ocr-i18n`
**Status:** fixed, tested, NOT merged/deployed — awaiting owner review

## Bug A — hardcoded OCR.space API key in public client source

`js/ocr.js`'s `spaceRead()` fell back to a real, hardcoded OCR.space API
key (`K81772188988957`) whenever the workshop hadn't configured its own
key in Settings:

```js
const key=(window.db && db.settings && db.settings.ocrSpaceKey) || 'K81772188988957';
```

Because this file ships in the public GitHub repo backing a live PWA,
that key — and whatever usage quota/plan it belongs to — was visible to
and usable by anyone who read the source, independent of the app itself.
(For contrast: the separate Supabase Edge Function `schein-ocr` already
keeps the OpenAI key correctly server-side — that pattern was not the
problem; this one hardcoded client-side fallback was.)

**Scope boundary respected:** per instruction, this fix does **not** add
or choose a new OCR provider or subscription — the provider choice is
still open/under comparison. It only removes the silent embedded-key
fallback.

**Fix:** the fallback literal is gone. If no key is configured in
`db.settings.ocrSpaceKey`, `spaceRead()` now returns `{}` immediately
without calling OCR.space at all. `js/ocr.js`'s `read()` already runs
several OCR tiers in parallel (server edge function, OCR.space, local
Tesseract) and merges whichever succeed — removing this one tier when
unconfigured degrades gracefully rather than breaking OCR.

**Proof of the bug (regression guard):** the test suite asserts the
literal string `K81772188988957` no longer appears anywhere in
`js/ocr.js`.

**Proof the fix works:** with no key configured, `spaceRead()` is called
directly in a sandboxed test with a `fetch` spy — asserted to make
**zero** network calls and return `{}`. Once a key is set in
`db.settings.ocrSpaceKey` (simulating the workshop configuring its own),
the exact same call does reach `fetch` — proving the feature still works
normally for an admin who opts in with their own key.

## Bug B — inconsistent XSS escaping for customer/vehicle names in tables

The i18n/XSS audit flagged `customers.js:167`: the vehicles table
inserted `customerName(v.customerId)` straight into an HTML table cell
with **no escaping**, while every sibling cell in the same row (plate,
VIN, make, model, year) called `esc(...)`. `js/print.js`'s `table()` /
`buildDocHTML` helpers trust every cell value they're given to already
be safe HTML — some cells intentionally contain real markup (buttons),
so the escaping responsibility falls on each call site, and this one
site broke the pattern.

`customerName()`/`vehicleName()` return free text (a customer's saved
name, or a vehicle's plate/make/model) that can originate from manual
entry or from OCR-scanned vehicle documents — i.e. attacker-influenceable
if someone hands the shop a doctored document or a crafted name. An
HTML/script payload saved into one of these fields would execute for
every user who later views that table (a stored-XSS pattern).

Re-auditing every call site of these two helpers across the codebase
found the same inconsistency recurring **five more times**, all in
`js/app.js` — `vehicleName()` used unescaped in: the dashboard's
"repairs" summary table, the appointments list, the estimates list, the
invoices list, and the unpaid/debts list.

**Fix:** wrapped all six unescaped call sites in `esc(...)`, matching
every sibling cell in the same row:
- `js/customers.js` — vehicles table (the originally flagged spot)
- `js/app.js` — dashboard repairs table, appointments list, estimates
  list, invoices list, unpaid/debts list

**Proof of the bug (regression guard) + proof the fix works:** the test
suite checks the exact source text at each of the six locations — the
old unescaped pattern is confirmed gone and the new escaped pattern is
confirmed present. A behavioral test also runs the real `esc()` function
against an `<img src=x onerror=alert(1)>` payload and confirms the
angle brackets are neutralized.

Full suite: `node tests/run.js` → `all tests passed`, exit code `0`
(157 total assertions across all fixes so far, all green).

## What was NOT changed

- No new OCR provider or subscription was added or selected.
- `print.js`'s `table()`/`buildDocHTML` helpers were left as-is (trusting
  callers to escape) rather than auto-escaping everything, since several
  cells deliberately contain real HTML (action buttons) — auto-escaping
  there would break those buttons.
- This pass fixed the specific flagged inconsistency and every other
  instance of the exact same `customerName()`/`vehicleName()` pattern
  found by re-auditing; it is not a claim that every `innerHTML` use in
  the app is now exhaustively audited for XSS.
