# Fix report 05 — account migration safety + two bugs found while running the full cycle

**Branch:** `fix/security-invoicing-print-ocr-i18n`
**Status:** fixed, tested (including live in a real browser), NOT merged/deployed

This report covers the additional verification the owner explicitly asked
for: that removing the hardcoded default passwords is not treated as a
complete fix by itself, that existing accounts migrate without being
locked out, and a real end-to-end cycle (login → customer → vehicle →
repair order → invoice → preview → print) with matching amounts and no
data mutation on preview. Two previously-unknown, pre-existing bugs
(unrelated to this engagement's original scope, but found while actually
running the app rather than only reading the source) were found and
fixed along the way, because without them the full-cycle test could not
be completed honestly.

## Bug 1 — every page load silently wiped all real data back to demo seed data

**Severity: critical.** Pre-existing in `main` (commit `f9549e4`), not
introduced by this branch.

`js/core.js` calls `let db=load(), session=null;` near the top of the
file. `load()` calls `ensureCompanyProfiles()`, which calls
`defaultWorkshopProfile()`, both of which reference `WORKSHOP_KEYS` — a
`const` that was declared **further down in the same file**, after
`load()`'s call site. Referencing a `const`/`let` before its own
declaration has executed throws a `ReferenceError` (the "temporal dead
zone"). `load()`'s own `try{...}catch{return clone(seed)}` swallowed
that error silently and fell back to the pure demo seed — discarding
every real customer, vehicle, repair order and invoice, on **every
single page load**, with no visible error anywhere.

**Proof of the bug:** reproduced directly in a real Chrome browser
(not just a Node simulation): seeded `localStorage` with a fake
"existing install" (a real customer `Real Customer GmbH` and a
non-default password for `Rashid`), reloaded the page, and confirmed
`window.db` came back as pure seed/demo data — the seeded data was
gone.

**Fix:** moved the single `WORKSHOP_KEYS` array literal to before
`let db=load()`. Nothing else changes — this is a one-line relocation.

**Proof the fix works:** re-ran the exact same browser reproduction
after the fix — the seeded data survived the reload unchanged. Also
added `tests/run.js` coverage that runs the real `load()` function
(not a recreation of its logic) against four scenarios: an existing
install with original plaintext passwords, an existing install with an
already-rotated/hashed password, a genuinely fresh install, and the
real login-decision function applied to the migrated data — see the
"Account migration" section of `tests/run.js`.

## Bug 2 — "Manueller Auftrag" (new repair order) silently did nothing

**Severity: high.** Pre-existing in `main`, not introduced by this
branch. Found while actually clicking through the "create a repair
order" step of the requested full cycle — static code reading would
not have caught this.

`js/repairs.js` wired the button as `$('#add').onclick=repairModal` — a
bare function reference. A DOM `onclick` handler is always called with
the click `Event` as its first argument, so `repairModal` received the
`Event` as its `existing` parameter. Since an `Event` object is truthy,
`repairModal` took the "editing an existing repair" branch instead of
"create a new one": it looked up
`db.repairs.findIndex(x=>x.id===existing.id)` (`existing.id` is
`undefined` on an `Event`, so never found) and did nothing — no repair
was ever pushed into `db.repairs`. The modal still closed normally with
no error, so this looked like success.

**Proof of the bug:** clicked "Manueller Auftrag" in a real browser,
filled in the form, saved — `db.repairs` was unchanged (still only the
2 seed repairs) and the list screen never showed the new entry.

**Fix:** `$('#add').onclick=()=>repairModal();` — the button now calls
`repairModal()` with no arguments, so a click `Event` can never be
mistaken for an existing record.

**Proof the fix works:** re-ran the same browser steps after the fix —
the modal title correctly read "Neuer Auftrag" (not "Auftrag
bearbeiten"), and the new repair order ("RZ-TS 100 · Opel Astra",
"Klappergeraeusch Auspuff") appeared in the list and in `db.repairs`
immediately after saving.

## Full cycle test (live, in a real Chrome browser, against the branch)

Served the branch locally (`npx serve` on `localhost:4173`, fully
isolated from production — no Supabase, no real data) and ran the
complete requested cycle:

1. **Login** as a fresh account (`Rashid`, `p:null`) → correctly forced
   into the one-time password-setup modal → set a real password →
   logged in normally.
2. Reloaded and logged in again with the **same custom password** → no
   setup loop, straight into the app (zero regression for a rotated
   account).
3. **Customer**: created "Test Kunde Müller" (umlaut renders correctly,
   confirming the XSS-escaping fix doesn't mangle legitimate text).
4. **Vehicle**: created "RZ-TS 100 · Opel Astra" for that customer.
5. **Repair order**: created "Klappergeraeusch Auspuff" for that
   vehicle (this is where bug 2 above was found and fixed); confirmed
   the new print/PDF/share buttons (fix report 03) are present on the
   work-order view and render real content via `buildDocHTML('repairs', id)`.
6. **Invoice**: created a genuinely mixed-tax-rate invoice for that
   vehicle — two lines at 19% (parts 100€, labor 100€) and one line at
   7% (disposal fee 50€, net 250€ total). The live running total in the
   editor showed **291,50 €** — the mathematically correct per-line-tax
   total (119 + 119 + 53.50), not the old flat-19%-on-everything total
   that would have shown 297,50 €.
7. **Save**: the saved invoice's `total` field is `291.5` — matches the
   editor exactly.
8. **Preview/print**: `printDocMarkup`'s rendered output shows
   "Gesamtbetrag ... 291,50" — matches the saved total exactly. Edit,
   save, and print all agree.
9. **No mutation on preview**: rendered the same invoice's preview 5
   times in a row and confirmed `db.customers` was byte-for-byte
   identical before and after — preview never writes to the database.

Full suite: `node tests/run.js` → `all tests passed`, exit code `0`.

## What remains blocked

The owner's explicit request to verify the database's RLS/service_role
protection on an isolated Supabase test project could not be completed
in this pass: starting Docker (needed for a local Supabase stack) had
the unintended side effect of auto-starting the separate, paused
BusinessPilot/Firmenkraft Docker stack (backend, worker, postgres,
redis, minio, frontend containers), which this engagement was
explicitly told must stay untouched. An attempt to stop those
containers again was blocked by a safety guard. **This needs the
owner's decision** on how to proceed with Docker before the Supabase
RLS test can be attempted — see the chat summary for details.
