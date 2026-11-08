# Fix report 08 — companies/accounts, email setup, and overall readiness

**Branch:** `fix/security-invoicing-print-ocr-i18n`
**Status:** documentation and preparation only. **Nothing merged,
deployed, purchased, or changed in production.**

One note on method: a direct read-only query against the production
Supabase project (to confirm real per-company record counts) was
attempted and was blocked by a safety guard before it ran — production
reads are not permitted automatically in this environment. That block
was respected rather than worked around. Everything below about real
vs. placeholder company usage is therefore reasoned from the
**application's own source code** (what's actually registered as real
business data vs. what's clearly seed/placeholder), not from querying
live data. Where this pass could not fully confirm something, it says
so explicitly rather than guessing.

## 1. Companies and accounts in WerkPilot today

### Companies (from `js/core.js`'s seed — this is what a brand-new
install starts with; it is also exactly what the company switcher
shows for every current account, since none of them restrict which
companies they can see)

| ID | Name | Country | Evidence of real use |
|---|---|---|---|
| `de` | TABAH AUTO — Autoservice und Autoteile UG | DE | **Real.** The app's own settings carry a real, specific registered business name, address, court of registration, and banking/tax identifiers for this entity (not shown here — financial identifiers, already known to the owner, not meaningfully protected by omission but also not useful to restate) that do not exist for `es` at all. This is the company the live app is actually configured for. |
| `es` | Auto Service España | ES | **Confirmed by the owner (2026-11-08): created by them, currently unused.** Kept as-is, with all its existing data — not archived, not merged, not deleted. |

No code change was needed to honor this — `migration-fix-rls.sql` and
`provision-user.js` already treat every company id uniformly; "unused"
only affects who gets granted access to it (nobody, for now, except the
owner), never whether its data is touched.

### Accounts (from the same seed — no passwords or keys shown)

| Username | Display name | Role | What that role can currently see in the app (client-side, from `roleCan()`) |
|---|---|---|---|
| `Rashid` | Rashid Tabah | `developer` | Everything, including the developer/studio tools |
| `admin` | Admin | `manager` | Everything except the developer/studio tools |
| `accountant` | Buchhaltung | `accountant` | Everything except Settings and the developer tools |
| `ismail` | Ismail | `mechanic` | Dashboard, customers, vehicles, repairs, estimates, appointments, help — **not** invoices, inventory, purchases, or settings |
| `warehouse` | Lager | `warehouse` | Dashboard, inventory, purchases, integrations, help — **not** customers, vehicles, repairs, or invoices |

None of these 5 accounts currently has a `.companies` restriction, so
under today's **local** permission model every one of them can already
switch to and see *both* companies from the UI. The new cloud-side
grant (via `provision-user.js`, added in `fix-report-07`) is a
*separate, additional* gate that only applies once an account is
linked to a cloud identity and syncing through RLS — it does not change
anything about local-only usage.

## Cloud access grant per account — owner's decision (2026-11-08)

`es` (Auto Service España) is confirmed by the owner as a real company
they created, currently unused but **to be kept with all its data** —
not archived, not deleted, not merged into `de`. `de` (TABAH AUTO)
stays the default company (already true in the existing code —
`db.companies[0]` is `de`, no change needed). The owner's own account
gets both companies; every staff account gets only the company its
real work is tied to, per their role, with company data kept separated
(already enforced by `migration-fix-rls.sql`'s per-row `company_id`
check — confirmed by `rls-test.js`: a grant for one company cannot read
or write another).

| Account | `company_ids` grant | Role | Reasoning |
|---|---|---|---|
| `Rashid` | `de,es` | `developer` | Owner — explicit access to both companies |
| `admin` | `de` | `manager` | Day-to-day operations are in `de` |
| `accountant` | `de` | `accountant` | All real invoicing/bookkeeping activity is under `de` |
| `ismail` | `de` | `mechanic` | Repair work is tied to the `de` location |
| `warehouse` | `de` | `warehouse` | Inventory/purchases are tied to the `de` location |

This table is ready to execute via `provision-user.js` — one command
per account, run by the owner with their own `service_role` key (see
"What's left" below). No account has been granted anything in
production yet; this table records the decision so provisioning is a
single pass, not five separate judgment calls.
per account, once each person has linked their own cloud identity.

## 2. Email sending — options, what's needed, what it costs

Full detail and the fillable template:
**`supabase/rls-fix-proposal/smtp-config-template.md`**

**Summary:**
- Supabase's own default email sender is testing-only (rate-limited),
  not suitable for real password-reset delivery.
- At WerkPilot's realistic volume (password resets for ~5 staff
  accounts, used occasionally), **Brevo's free tier (9,000 emails/month,
  no credit card) should cost $0/month indefinitely** — researched, not
  purchased or signed up for.
- Two things are genuinely missing before "Forgot password?" works for
  real: (1) a verified SMTP provider entered into the production
  Supabase project's Auth → Emails → SMTP Settings (owner's own
  account, own login, own credentials — never done by this process),
  and (2) the production app URL added to Auth → URL Configuration →
  Redirect URLs. Neither was touched; both are documented with exact
  steps in the template file above.
- Explicit instruction followed: no service was purchased, and nothing
  was checked or changed about any email configuration belonging to
  another project (BusinessPilot/Firmenkraft) — that app's settings
  were not read or touched at all.

## 3. Readiness review — what's tested where

### Local / isolated-stack tested (high confidence — reproduced, fixed, re-verified)

| Area | Evidence |
|---|---|
| Credential hardening (no hardcoded defaults, forced rotation, zero regression for rotated accounts) | `tests/run.js`, live browser |
| Invoice preview no longer mutates data; tax/discount/rounding unified | `tests/run.js`, live browser (mixed-rate invoice matched exactly) |
| Print/PDF for repairs & appointments; estimates share-bar fix | `tests/run.js`, live browser |
| OCR hardcoded key removed; 6 XSS escaping fixes | `tests/run.js` |
| Critical data-loss bug (TDZ wiping all data on load) | Reproduced and fixed **live in a real browser**, plus `tests/run.js` |
| Silent repair-order creation bug | Reproduced and fixed live, plus `tests/run.js` |
| RLS policy design (`migration-fix-rls.sql`) | `rls-test.js`, 15/15, against a disposable local Supabase stack |
| Cloud Auth login, linking, forgot-password end-to-end (real captured email, real link, real token redemption), stale-session recovery bug found and fixed | `auth-test.js`, 21/21, plus extensive live-browser walkthrough including a full workshop cycle re-run with sync confirmed working under RLS |
| Settings page plaintext-password bug | `tests/run.js`, live browser |

**Full automated suite: `node tests/run.js` → 182 assertions, exit code
0, run fresh as of this report.**

### NOT tested on production — genuinely untested, not just "probably fine"

| Area | Why it can't be tested without touching production | What's needed first |
|---|---|---|
| `migration-fix-rls.sql` against the real 9 tables and real data | Would change production access control | Backup first (next section), then apply, ideally at a quiet time |
| Real SMTP delivery to a real inbox | No SMTP is configured in production yet | Owner sets up the provider (section 2) |
| Real users' `provision-user.js` grants | Needs the owner's own `service_role` key | Owner runs the script themselves, per account |
| Whether `es` is genuinely unused | Blocked production read (see method note above) | A one-minute look in the Supabase Table Editor |
| Interaction with any real customer-facing email volume at scale | Current testing used one fake test address only | Only knowable once real usage begins |

### Explicitly NOT done (by instruction)

- Nothing merged to `main`.
- Nothing deployed.
- No production database write, of any kind.
- No SMTP/email service purchased or signed up for.
- No other project's (BusinessPilot) settings read or touched.
- No message sent, no payment made.

## Migration, backup, and rollback plan — reviewed

(Full detail already in `fix-report-07-cloud-auth.md`; summarized here
as part of this readiness review, with the company-grant decision from
section 1 above now folded in.)

1. **Backup first.** Before applying `migration-fix-rls.sql` to
   production: `pg_dump` the 9 affected tables, or use the Supabase
   dashboard's backup feature. The migration itself never modifies a
   data row — only policies and one new function — but a backup is the
   safety margin before any production schema/policy change regardless.
2. **Apply the RLS migration.** Changes nothing visible on its own,
   since no client signs in yet at that point.
3. **Deploy this branch's client changes** (after review/merge).
   Accounts can now link to a cloud identity, but have zero company
   access until explicitly granted — safe by construction.
4. **Configure SMTP + redirect URLs** (section 2) — needed before
   "Forgot password?" works for real, independent of steps 1–3.
5. **Each of the 5 real accounts links once**, then the owner runs
   `provision-user.js` with their own `service_role` key, granting
   `de` (per the proposed table above, or `de,es` if the owner decides
   otherwise).
6. **Rollback, if ever needed:** `rollback-rls.sql` restores the exact
   `using(true) with check(true)` policies live today — already tested
   (applied, then rolled back, then reconfirmed original behavior).
   Rolling back the client change is a plain git revert; local login is
   unaffected either way.

## What's left before any of this goes near production

- [ ] Owner confirms (or corrects) the `es` usage assumption above —
      ideally via the Table Editor, takes a minute.
- [ ] Owner decides `de`-only vs. `de,es` per account (table above).
- [ ] Owner sets up SMTP (Brevo recommended, $0/month at this volume)
      and the redirect URL entry.
- [ ] Owner takes a backup before applying the RLS migration.
- [ ] Review of all 8 reports and the two test suites.
- [ ] Merge, then execute the migration/provisioning steps in the
      order above.

Still awaiting your go-ahead before any of that happens.
