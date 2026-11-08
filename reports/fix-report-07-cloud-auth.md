# Fix report 07 — cloud login (Supabase Auth), forgot password, and the RLS gap closed

**Branch:** `fix/security-invoicing-print-ocr-i18n`
**Status:** implemented and fully verified in an isolated local Supabase
stack with fake test accounts and a fake test email. **NOT applied to
the production project. NOT deployed.** No real user, no real email, no
production data was touched anywhere in this work.

This closes the gap left open by `fix-report-06-supabase-rls.md`: that
report's RLS fix was correct but couldn't take effect, because the
WerkPilot client had no Supabase Auth integration — every request used
only the public anon key, so after that RLS fix, cloud sync would have
silently returned zero rows for everyone. This report adds the missing
client-side login integration, a password-recovery flow, and a tested
migration path for the 5 existing local accounts, closing that gap
end-to-end.

## What was built

### 1. Login tied to Supabase Auth, without disrupting the existing local login

The existing local username/password login (already hardened in an
earlier pass — forced rotation off default passwords) stays the **only**
thing required to use the app at all, including fully offline with no
Supabase configured. Nothing in this change can lock anyone out of the
local app.

A local account gains a real cloud identity by setting one new field,
`cloudEmail`, on its record — done either:
- **During the existing forced password-setup step** (the modal shown
  the first time an account logs in, or when it's still on an old
  published default): an optional email field was added right there —
  the natural, lowest-friction moment, since the person is already
  choosing a real password. Leaving it blank keeps the account exactly
  as local-only as it is today.
- **Later, from Settings** ("Cloud account" section, for an
  already-rotated account that skipped linking the first time): re-enter
  the current password to prove it, plus an email, and it links the
  same way.

Once linked, every normal login **also** (silently, awaited, never
blocking) signs into Supabase Auth with the exact same password the
person just typed locally — so cloud sync calls carry a real
authenticated session instead of just the anon key. If the cloud
sign-in fails for any reason (not linked yet, no Supabase configured,
a stale cloud password), the local login still succeeds exactly as
before — full graceful degradation, no new failure mode.

### 2. Existing users linked to identity AND permissions, without losing data or changing ownership

Company/role access lives in the Supabase Auth user's own
`app_metadata` (`company_ids: string[]`, `role`) — **not** a table the
signed-in user could write to themselves. `app_metadata` can only be
set via the Admin API (a `service_role` key), never by a user's own
`signUp`/`signIn`/`updateUser` calls. This is what makes "a user can
prove who they are, but can't grant themselves access to a company"
hold: *creating* the login identity (self-service) and *granting* it
company access (admin-only) are two separate steps — see
`supabase/rls-fix-proposal/provision-user.js`.

This mirrors the local app's own existing permission model exactly:
today every seeded account with no `.companies` restriction can already
see every company from the company switcher. `company_ids` is therefore
a **list**, not a single id — granting a migrated account every company
it already has local access to is what "same permissions, not reduced"
means here. **Which companies each of the 5 real accounts should be
granted is a business decision for the owner** (documented as a
decision point below, not decided unilaterally).

No local data moves, no `company_id` on any customer/vehicle/invoice/
etc. row changes. Only a new, separate Supabase Auth identity gets
permission to access the company's existing rows going forward.

### 3. "Forgot password?" — in Arabic, German, and English (and all 8 languages)

A clearly visible link on the login screen opens a small modal: enter
the email, and the SAME generic message shows regardless of whether
that email is actually linked to any account — built on Supabase's own
`resetPasswordForEmail`, which already never reveals which case it was
(confirmed by testing a known vs. unknown email and checking the
responses are indistinguishable).

The emailed link lands back on the app, which detects Supabase's
recovery marker (either flow format: the implicit `#access_token=...&
type=recovery` hash or the PKCE `?code=...` query param) and shows a
dedicated "set a new password" screen instead of the normal login.
After saving, it returns to login with a confirmation message.

**Invalid/expired link handling:** a clear, single message — distinguishing
*why* a link failed (expired vs. tampered vs. reused) is deliberately
not attempted, since that itself can leak information; the message just
says to request a new one from the login screen.

### 4. A real bug found and fixed while testing this: a stale session could let a bad link "succeed"

While testing live in a browser, a garbage/tampered recovery link
appeared to work — not because the link was valid, but because the
browser already had an unrelated, genuinely-authenticated session open.
`completePasswordReset` was checking "does *any* session exist", not
"was *this* link's token actually validated by the server". Fixed by
requiring the Supabase SDK's own `PASSWORD_RECOVERY` event (fired only
after it validates a token's signature and expiry against the server)
before trusting an implicit-flow session as a genuine recovery — a PKCE
`?code=` exchange is separately self-validating and was already correct.
Reproduced the bug, fixed it, and reproduced the fix working, both live
in a browser and in a dedicated regression test.

### 5. A second bug found while wiring this up: Settings' own password field

`js/app.js`'s Settings page had its own "new password" field that
stored the password in **plain text**, with no minimum length and no
check against the old published defaults — bypassing every protection
the login flow enforces, and able to "change" a password right back to
a known default. Fixed to hash, validate, and (if the account is
cloud-linked) keep the cloud password in sync the same way a password
reset does.

## Verified in the isolated local Supabase stack (fake data, fake email)

Two full test suites, run against a disposable local Supabase stack
(Docker, the official CLI — no cloud account, no cost):

**`supabase/rls-fix-proposal/rls-test.js`** (from the previous pass,
re-verified): 15/15 — open-policy vulnerability reproduced, fix applied,
unauthenticated access blocked, company-scoped read/write verified,
rollback verified.

**`supabase/rls-fix-proposal/auth-test.js`** (new, this pass): 21/21 —
1. Self sign-up creates a cloud identity (exactly what "link to cloud"
   does).
2. Granted via `provision-user.js` — the exact script an owner would
   run.
3. Sign-in with the correct password succeeds.
4. RLS with `app_metadata`: a granted (DE-only) user can read/write DE,
   cannot read/write ES.
5. Anonymous access still fully blocked.
6. Wrong password rejected.
7–9. **Forgot password end-to-end through a real email**: request
   accepted, the email actually arrives (captured by the stack's own
   Mailpit test mailbox), the real link is found and followed, a
   recovery token is extracted from the real redirect, the password is
   updated via that session, the **old password stops working** and
   the **new password works**.
10. Anti-enumeration: requesting a reset for an unregistered email
    returns the identical generic response.
11. Sign-out succeeds.

**Live in a real browser** (Claude in Chrome, against the same local
stack, `localhost` test config — never production):
- Logged in as a fresh account, linked it to a cloud email during the
  forced password-setup step, confirmed the cloud session exists and
  the email matches.
- Granted company access via `provision-user.js`, refreshed the
  session, and confirmed a newly-created customer **actually synced to
  the Supabase database** — proving sync works after RLS is active, not
  just blocked.
- **Re-ran the full workshop cycle** (customer → vehicle → repair order
  → invoice → preview/print) under the new cloud-auth-gated login and
  confirmed the vehicle, repair order, and invoice all synced correctly,
  scoped to the right company.
- Logged out, clicked "Passwort vergessen?", saw the correct generic
  message, found the real email in Mailpit, clicked the real link (in
  a new tab, exactly as a real email client would open it), landed on
  "Neues Passwort festlegen", set a new password, got the confirmation
  toast, returned to login.
- Confirmed the **old password is rejected** and the **new password
  works** — both locally and for the cloud identity, kept in sync.
- Reproduced the stale-session bug (bug #4 above) live, fixed it,
  reproduced the fix working live.

## Email delivery & redirect configuration — what's needed, and what's missing

**In the local test stack:** nothing to configure — the local Supabase
CLI runs its own test mailbox (Mailpit) automatically; every email the
app would send is captured there instead of actually being delivered.
This is why testing could be done safely with a fake address.

**For the real production project, two things are required and are
currently NOT configured (this is the "remaining blocker" for anything
beyond this isolated test):**

1. **An email provider.** Supabase's own built-in email sending is
   explicitly rate-limited and meant for testing only — not reliable
   for real users receiving real password-reset emails. The project
   needs a real SMTP provider configured in the Supabase dashboard
   under **Authentication → Emails → SMTP Settings** (e.g. a transactional
   email service). **This is a decision and a cost the owner needs to
   make** — nothing was set up or paid for as part of this work, and no
   specific provider is recommended here without the owner's input on
   budget and existing accounts.
2. **Redirect URL allow-list.** Supabase refuses to honor a
   `redirectTo` that isn't on the project's **Authentication → URL
   Configuration → Redirect URLs** list. The production project's list
   needs to include the real app URL
   (`https://rashedcar50-cmyk.github.io/WerkPilot/`) — currently
   unconfirmed whether this is already present, since this pass never
   touched the production project's settings. Without it, password-reset
   emails in production would link back to the wrong place (or be
   rejected) even once SMTP is configured.

Neither of these can be verified or fixed without owner access to the
production Supabase dashboard — flagged here as exactly what's missing,
not guessed at or worked around.

## Migration plan — moving the 5 existing accounts to cloud identities

Nothing is applied automatically; this is the plan for the owner to
execute, at their own pace, whenever they're ready:

1. **Apply `supabase/rls-fix-proposal/migration-fix-rls.sql`** to the
   production project (after taking a backup — next section). This
   alone changes nothing visible, since no client yet signs in.
2. **Deploy this branch's client changes** (after merge/review). From
   that point, any account that links itself (via the forced-setup
   email field or Settings) gets a real cloud identity, but still has
   **zero company access** until explicitly granted — safe by
   construction.
3. **For each of the 5 real accounts** (`admin`/manager, `Rashid`/
   developer — the owner, `accountant`, `ismail`/mechanic, `warehouse`),
   decide a real email address for them (these don't exist today — local
   usernames aren't emails), have them link their account once, then run:
   ```
   node provision-user.js <PROD_URL> <YOUR_OWN_service_role_key> \
        <their-email> de developer-or-whatever-role
   ```
   **Decision point for the owner:** grant `de` only, or `de,es` to
   exactly match today's unrestricted client-side access to both
   companies? This script supports either; the choice isn't made here.
4. Nothing about this requires all 5 people to migrate at once — each
   account keeps working locally, ungranted, until it's linked and
   provisioned.

## Backup & rollback plan

**Before step 1 above (applying the RLS migration to production):**
take a full backup of the 9 affected tables — either `pg_dump` against
the project's connection string, or the Supabase dashboard's own
backup/restore feature. The migration itself never modifies a data row
(only policies and one new function), but this is a safety margin
before any schema/policy change on a live project, per standard
practice.

**Rollback**, if ever needed: `supabase/rls-fix-proposal/rollback-rls.sql`
restores the exact `using(true) with check(true)` policies live in
production today and drops the new `user_has_company` function —
tested in this pass (applied, then rolled back, then re-confirmed
anonymous access returns to today's exact behavior). This does not
touch any Supabase Auth user that was created or granted access in the
meantime — those stay as harmless, unused identities until re-applied.

**Rolling back the client change** is simpler still: it's a normal git
revert of this branch's `js/` changes; local login is completely
unaffected either way, since it was never made to depend on any of this.

## What remains before any of this reaches production

- [ ] Owner decides the company-grant scope for each of the 5 real
      accounts (step 3 above).
- [ ] Owner sets up a real SMTP provider for the production Supabase
      project (and accepts whatever cost that provider charges — not
      decided or incurred here).
- [ ] Owner confirms/adds the production app URL to the Redirect URLs
      allow-list.
- [ ] Owner takes a backup of the 9 tables before applying the RLS
      migration.
- [ ] Review of this report, the code, and the two test suites.
- [ ] Merge, then apply `migration-fix-rls.sql` to production, then
      have each real account link and get provisioned (migration plan
      above) — in that order.

Nothing beyond the isolated local stack was touched. No messages were
sent, no payments were made, no paid service was created.
