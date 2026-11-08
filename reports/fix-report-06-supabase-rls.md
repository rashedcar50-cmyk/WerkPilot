# Fix report 06 — Supabase RLS fix, verified against an isolated local stack

**Branch:** `fix/security-invoicing-print-ocr-i18n`
**Status:** **proposal, verified in isolation — NOT applied to the production
Supabase project (`jljzobaggesefsdeslrf`).** Nothing in this report
touched real data. Files are saved under `supabase/rls-fix-proposal/`.

This closes the scope boundary left open in `fix-report-01-security-credentials.md`:
that report explained the RLS fix couldn't be implemented safely without
either a `service_role` key (never handled directly) or a disposable
Supabase project to test against. A fully local, disposable Supabase
stack (Postgres + Auth + REST API, via the official `supabase` CLI and
Docker — free, no account, no cloud project) now exists for exactly
this, and the fix has been designed, applied, and verified against it
with fake data only.

## What was tested, and how

A local Supabase stack was started (`supabase start`), the exact
production schema and RLS policies (`supabase-schema.sql`, unmodified)
were applied to it, then a Node test script
(`supabase/rls-fix-proposal/rls-test.js`) drove the whole verification
through the same REST/Auth HTTP APIs the real app uses — never through
a direct database connection, so this exercises exactly what an anon
key or a logged-in user's key can and cannot do, the same way the
browser app would.

### Suite A — reproducing today's production vulnerability

| Check | Result |
|---|---|
| Anonymous (no login) `SELECT` returns rows from **every** company's customers | confirmed — it does |
| Anonymous (no login) `INSERT` into any company's table succeeds | confirmed — it does |
| Anonymous (no login) `DELETE` of any row succeeds | confirmed — it does |

This is the concrete, reproduced version of what the earlier audit
reported statically: the public anon key (not a secret by design) is
all anyone needs to read, write, or delete anything in any company's
data, because every policy is `using(true) with check(true)`.

### The fix — `supabase/rls-fix-proposal/migration-fix-rls.sql`

- Adds a `user_profiles` table: `id` (references `auth.users`),
  `company_id`, `role`.
- Adds a `current_company_id()` helper (`security definer`) that looks
  up the signed-in user's company from `user_profiles`.
- Replaces every `using(true) with check(true)` policy, on all 9
  tables, with `using (company_id = current_company_id()) with check
  (company_id = current_company_id())` (and `id = current_company_id()`
  for the `companies` table itself, whose row *is* the company).
- Removing the open policy is enough to block anonymous access — when
  no policy matches a role, Postgres RLS returns zero rows rather than
  an error, so "no login, no access" needs no extra rule.

A full rollback (`supabase/rls-fix-proposal/rollback-rls.sql`) restores
the exact original open policies and drops the new table/function,
tested below.

### Suite B — access without login, after the fix

| Check | Result |
|---|---|
| Anonymous `SELECT` | now returns **zero rows** |
| Anonymous `INSERT` | now **rejected** |

### Suite C — access with a real login, after the fix

Two real Supabase Auth users were provisioned (local-only, via the
local stack's own `service_role` key — a well-known, publicly
documented default that ships with every local Supabase instance,
never the production project's real key, and never entered into any
client code): one in company `de`, one in company `es`.

| Check | Result |
|---|---|
| DE user's `SELECT` | sees **only** DE customers |
| ES user's `SELECT` | sees **only** ES customers |
| DE user `INSERT`s into their **own** company | succeeds |
| DE user tries to `INSERT` into the **ES** company | **rejected** by RLS `with check` |

### Migration safety

The two customers seeded *before* the fix was applied (simulating
pre-existing production data) were still present and still correctly
scoped to their own company *after* the migration — the fix only
changes *policies*, never touches a data row, so applying it cannot
lose or corrupt existing records.

### Rollback

Applied `rollback-rls.sql` and re-confirmed anonymous access returns to
exactly the original (current production) behaviour — the rollback is
a real, tested escape hatch, not just a design on paper.

### Secrets never reach the frontend

- Every request shaped like something the real app would send (select,
  insert, delete, sign-in) used only the **anon** key or a **user's own
  JWT** from signing in — never the service_role/secret key.
- The service_role key was used only for this test's own admin setup
  (seeding fake rows, provisioning the two test Auth users) — the exact
  same separation of concerns the production Edge Function
  (`schein-ocr`) already correctly follows for the OpenAI key.
- Re-confirmed statically: `grep -rniE "service_role|service-role" js/
  index.html supabase-config.js` → zero matches in the real WerkPilot
  client code.

**15 of 15 checks passed.**

## What this does NOT do, and what adopting it would require

This is a **tested proposal**, not a drop-in deploy:

1. **The WerkPilot client has no Supabase Auth integration at all today**
   — it only ever uses the anon key, with no sign-in step. Applying
   this migration to production as-is would make every existing user's
   cloud sync start silently returning zero rows (not an error — RLS
   just filters everything out) until:
   - the client is updated to actually sign users in through Supabase
     Auth (email/password or another provider), and
   - every real business user gets a `user_profiles` row pointing at
     their company and role.
2. **Deciding how local accounts map to Supabase Auth users** is a
   product decision for the owner: today's local accounts (`admin`,
   `Rashid`, `accountant`, `ismail`, `warehouse`) live only in
   `localStorage`, per device/browser — there is no existing concept of
   a single real email/password identity for each of them to carry over.
3. A **production backup** of the 9 tables (`pg_dump` or the Supabase
   dashboard's backup feature) should be taken immediately before this
   migration is ever run for real, even though the migration itself
   does not modify data — purely as a safety margin before any schema/
   policy change on the live project.

**Recommended next step, if the owner wants to proceed:** build and
test the client-side Supabase Auth sign-in flow (ideally in this same
local stack) *before* touching the production project's policies, so
the two land together and no gap of "logged in, but zero data visible"
is ever shipped to a real user.
