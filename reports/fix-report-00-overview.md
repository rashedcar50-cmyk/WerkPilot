# WerkPilot fix phase — overview (for owner review before production)

**Branch:** `fix/security-invoicing-print-ocr-i18n` (off `main` @ `f9549e4`)
**Status:** implemented and tested in an isolated clone. NOT merged. NOT
deployed. Nothing in this branch has touched the live site, the live
Supabase database, or the GitHub `main` branch.

This branch contains 5 commits, each with its own detailed report in
this `reports/` folder:

| # | Commit | Report | Summary |
|---|---|---|---|
| 1 | `b7caedf` | `fix-report-01-security-credentials.md` | Removed 5 hardcoded plaintext passwords (incl. the owner's own account) from public source; forced one-time rotation instead |
| 2 | `4b74b47` | `fix-report-02-invoicing.md` | Preview/print no longer writes to the database; tax/discount/rounding unified between edit, preview, and print |
| 3 | `535f9fa` | `fix-report-03-printing.md` | Added print/PDF/share for repair orders and appointments (previously missing entirely); fixed estimates exporting the wrong list |
| 4 | `a98f7b3` | `fix-report-04-ocr-xss.md` | Removed a hardcoded OCR.space API key from public source; fixed 6 unescaped-HTML (XSS) spots |
| — | (07fdbc7) | — | report file for commit #1 |

For each fix: a test proves the bug, a test proves the fix, and the
suite proves no regression. Full test suite: `node tests/run.js` from
the repo root → **`all tests passed`, exit code 0** (157 assertions:
158 pre-existing structural/OCR/i18n tests plus the new ones added in
this phase — see each report for the per-fix breakdown).

## What changed, in plain terms

1. **Login security.** Five real passwords — including the business
   owner's — were sitting in the public GitHub repo as plain text, with
   logic that could even silently reset them back. Anyone who read the
   repo could log in as any of these users on the live app. Fixed by
   starting all five accounts with no password and forcing a one-time
   "set a real password" step the first time anyone logs into them (or
   into any account still caught using one of the old published values).
   Already-rotated custom passwords are completely unaffected.

2. **Invoicing.** Opening an invoice preview used to quietly write a
   permanent customer number into the database — a read action causing
   a write. And for any invoice with mixed tax rates across its lines,
   the amount booked internally could differ from the amount printed
   for the customer. Both fixed; no existing invoice's saved numbers
   were touched.

3. **Printing.** Repair orders and appointments had no print/PDF/share
   at all. Added it. The estimates (quotes) screen's print/PDF/share
   buttons were accidentally exporting the invoices list instead of the
   estimates on screen. Fixed.

4. **OCR & XSS.** A real, working OCR.space API key was hardcoded in
   the public source as a silent fallback — removed, with no new OCR
   provider or subscription chosen (that decision is still yours to
   make). Also found and fixed 6 spots where a customer or vehicle name
   could be inserted into the page without escaping — a stored-XSS risk
   if a crafted name or plate were ever saved (e.g. via a scanned
   document).

5. **Translation/RTL.** The pre-existing 507 translation keys were
   already fully consistent across all 8 languages with correct RTL
   support (confirmed in the earlier audit). The only new user-facing
   text added in this phase — the 8 password-setup strings from fix #1
   — was translated into all 8 languages from the start and verified;
   no other translation/RTL gap was found.

## Deliberately NOT done in this pass — needs your decision

The database itself (Supabase project `jljzobaggesefsdeslrf`) still has
Row Level Security enabled on 9 tables, but every policy is
`using(true) with check(true)` — fully open read/write/delete to anyone
holding the public anon key (which is not a secret by design, so this
is a real, separate exposure from the login issue above). A proper fix
needs real per-user Supabase Auth + RLS policies, which requires either
a `service_role` key (which this process will never handle directly)
or a disposable/staging Supabase project to test an auth migration
against — neither of which exists yet. **This needs you** to either
provision a staging Supabase project, or do the initial auth-user
provisioning step yourself in the Supabase dashboard, before a safe fix
can be implemented and tested. Full detail in
`fix-report-01-security-credentials.md`.

## Before this goes anywhere near production

- [ ] You review the 5 commits and 5 reports above.
- [ ] A production-data backup/rollback plan is prepared — not yet
      needed in this pass since nothing here touches the live
      database, but required before merging if you decide any future
      RLS migration should happen.
- [ ] You decide on the RLS/Supabase-Auth scope boundary above.
- [ ] You test the branch yourself (or ask for a staging deploy) before
      any merge to `main`.

Nothing has been merged, pushed to `main`, or deployed. No messages
were sent and no payments were made, per instruction.
