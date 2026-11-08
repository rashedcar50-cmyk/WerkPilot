# Fix report 10 — post-deploy verification results, and what's left

**Status:** Merged and deployed to production (`main` @ `7ff839d`,
GitHub Pages build succeeded). **No database/Supabase-side change has
been made.** Everything below is either a real result from testing the
live site, or an exact, ready-to-run set of steps for the owner — no
guessing, no partial completion claimed.

## One hard boundary this report runs into, upfront

A large part of what's asked for next — finishing SMTP, applying the
RLS migration, provisioning real accounts — all require either creating
a third-party account, or entering a `service_role` key / database
password / dashboard login somewhere. **This is not something any
authorization can change**: entering credentials or creating accounts
on the user's behalf is outside what this process does, full stop,
independent of how explicitly it's authorized. The same applies to
logging into the live production app with real credentials — including
the legacy default passwords, even though they're already known from
the old public source history, were never typed anywhere by this
process. Everything in this report respects that line; where it blocks
something, it's named exactly, with the precise step needed from the
owner instead.

## What was actually verified against the live production site

All checks below were run against `https://rashedcar50-cmyk.github.io/WerkPilot/`
directly, read-only or using only the public anon key (no secrets, no
login, no data mutation):

| Check | Result |
|---|---|
| GitHub Pages build for the merge commit | `status: "built"`, commit `7ff839d` (confirmed via the GitHub API) |
| Live page loads, console clean | No errors or warnings on load |
| New UI present | "Passwort vergessen?" (Forgot password?) link confirmed rendered |
| New code actually running | `window.boot`, `window.WP.CloudAuth` both present; `SUPABASE_URL` correctly points at the real project |
| **TDZ data-loss bug — confirmed fixed, live** | This browser's existing stored data (5 users, 3 customers) survived the reload with real (non-null) passwords intact — previously this would have reset to the hardcoded seed defaults on every load (see `fix-report-09`) |
| Forgot-password **request** flow | Called directly against the real Supabase Auth API (anon key only) for a test address — returned the correct generic success response |
| Service worker cache versioning | `sw.js` already carries the new version string — returning visitors' browsers will correctly fetch the new code, not a stale cache |

## What could **not** be tested, and exactly why

| Area | Why blocked | What it needs |
|---|---|---|
| Actually logging in | Requires typing a real password (or a known legacy default) into the live login form — never done by this process, regardless of authorization | The owner logs in once, on their own device, with their own credentials |
| Sync, invoice creation, printing | All gated behind an authenticated session (confirmed directly: calling the print function without one throws, by design — `session` is `null` until login) | Same as above — needs a real login first |
| Real email delivery | No SMTP configured yet in production; no cloud identity exists yet for any real account to receive a reset email | SMTP setup (below) + one real account linking |

**What this means in practice:** the *mechanism* is verified end-to-end
(request flow hits the real API correctly, the data-loss bug is fixed,
the code is live and clean) — but confirming "my real account still
logs in" needs the owner to actually try it, once, themselves. This is
the one step in this whole report that cannot be done any other way.

## The remaining steps, in the safe order already agreed — exact commands

Nothing below has been run. These are the precise, ready-to-paste steps.

### Step 1 — Take a backup (before step 2)

In the Supabase dashboard (`jljzobaggesefsdeslrf` project) → Database →
Backups, or `pg_dump` with your own connection string. This project's
RLS migration only changes policies and adds one function — it never
touches a data row — but a backup first is the standing safety margin
regardless.

### Step 2 — Apply the RLS fix

In Supabase Studio → SQL Editor, run the contents of
`supabase/rls-fix-proposal/migration-fix-rls.sql` (already in `main`).
This alone changes nothing visible yet, since no client is signed in.

### Step 3 — Set up SMTP (can happen in parallel with step 2)

Full detail: `supabase/rls-fix-proposal/smtp-config-template.md`.
Recommended: Brevo's free tier (≈$0/month at this volume). Create the
account yourself, verify a sender, then enter the resulting SMTP host/
port/username/password into **Authentication → Emails → SMTP Settings**
on the production project, plus confirm **Authentication → URL
Configuration → Redirect URLs** includes
`https://rashedcar50-cmyk.github.io/WerkPilot/`.

### Step 4 — Each real account links once, then gets provisioned

For each person: they open the live app, log in with their **current**
real password (if it's still one of the old defaults, they'll be
walked through setting a new one automatically), then either during
that forced setup or later in **Settings → Cloud account**, they enter
a real email and the same password to link.

Once linked, run (with **your own** `service_role` key — never shared
with or typed by this process):

```
node provision-user.js <PROD_URL> <YOUR_service_role_key> <email> de,es developer   # Rashid (owner)
node provision-user.js <PROD_URL> <YOUR_service_role_key> <email> de manager        # admin
node provision-user.js <PROD_URL> <YOUR_service_role_key> <email> de accountant     # accountant
node provision-user.js <PROD_URL> <YOUR_service_role_key> <email> de mechanic       # ismail
node provision-user.js <PROD_URL> <YOUR_service_role_key> <email> de warehouse      # warehouse
```

(`<PROD_URL>` = `https://jljzobaggesefsdeslrf.supabase.co`; grants match
the decision recorded in `fix-report-08`: owner gets both companies,
everyone else gets `de` only.)

### Step 5 — Verify, with test data only

Once at least one real account is linked and provisioned: log in, create
one clearly-labeled test customer/vehicle/invoice (e.g. "TEST — DO NOT
USE"), confirm it appears in the Supabase table editor under the right
`company_id`, preview/print it, then delete it. **Never edit a real
customer's invoice for this.**

## If something critical shows up at any step

Stop at that step. Each step has an independent, already-tested
rollback:
- Step 2 (RLS): run `supabase/rls-fix-proposal/rollback-rls.sql` —
  tested in this engagement (applied, then rolled back, then
  reconfirmed original behavior).
- Step 3 (SMTP): just turn custom SMTP back off in the dashboard; the
  app keeps working without it (forgot-password just won't deliver).
- Step 4 (provisioning): `provision-user.js` can be re-run with an
  empty `company_ids` to revoke access for one account without
  affecting the others.
- The frontend deploy itself: `git revert` the merge commit — see
  `fix-report-09` for why that's safe and fast.

No data is lost by any of these rollbacks; each only touches policies,
SMTP configuration, or one account's `app_metadata` — never a business
record.

## Summary for your question — what succeeded, what's left

**Succeeded (verified against live production):**
- Deployment itself, confirmed via the GitHub API and the live page.
- The critical data-loss bug fix, confirmed active with real (if demo)
  stored data surviving a reload.
- The forgot-password request mechanism, confirmed hitting the real
  Supabase Auth API correctly.
- Cache versioning, confirmed correct for returning visitors.

**Left — all owner-only, none of it skippable by further authorization:**
- An actual login test with real credentials (2 minutes, your own
  device).
- SMTP account creation + credential entry (steps above).
- RLS migration application (steps above, after a backup).
- Linking + provisioning the 5 real accounts (step 4 above).
- Confirming email actually arrives, once SMTP + one linked account
  exist.
