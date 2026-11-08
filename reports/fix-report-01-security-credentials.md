# Fix report 01 — hardcoded default-password login bypass

**Branch:** `fix/security-invoicing-print-ocr-i18n`
**Commit:** `b7caedf` (fix) — this report is committed alongside it
**Status:** fixed, tested, NOT merged/deployed — awaiting owner review

## The bug

`js/core.js`'s seed data shipped five real, working plaintext passwords in
public source, readable by anyone from the GitHub repo (and from any synced
copy of the app's local data):

| user | role | password |
|---|---|---|
| admin | manager | `1980D` |
| Rashid | **developer / business owner** | `1976R` |
| accountant | accountant | `1978B` |
| ismail | mechanic | `1977A` |
| warehouse | warehouse | `1979C` |

Separately, `core.js`'s `load()` and `js/app.js`'s login path contained logic
that re-stamped the developer and mechanic accounts back onto those exact
default values under certain conditions (missing/blank password, or a
specific known placeholder), so even a deliberately-cleared password would
silently regenerate the leaked value.

Net effect: reading the public repository was sufficient to log in as any of
these five accounts — including the business owner's own account — on the
live production app, with no server-side check of any kind (auth is fully
client-side; see `js/engine.js`'s `passOk`).

## Proof of the bug

Before this fix, the following were true of `js/core.js` (verified by
re-reading the pre-fix file during this audit/fix session):
- `seed.users` contained literal entries like `{u:'Rashid',p:'1976R',...}`
  for all five accounts above.
- `load()`'s `merged.users.forEach(...)` contained
  `if(!u.p || u.p==='bm-dev-2026') u.p='1976R';` and
  `if(!u.p) u.p='1977A';` — active reseed logic.

The regression test added in this fix (`tests/run.js`) encodes exactly this
signature and fails loudly if it ever reappears:

```js
assert(!/p:\s*'(1980D|1976R|1978B|1977A|1979C|bm-dev-2026)'/.test(coreSrc),
  'core.js seed no longer ships a live plaintext default password');
assert(!/u\.p\s*=\s*'(1976R|1977A)'/.test(coreSrc),
  'core.js no longer re-stamps an account back onto its old default');
```

## The fix

- `core.js`: all five seed accounts now start with `p:null` ("no password
  set yet"). The reseed-to-known-default logic is removed entirely —
  nothing in the app ever writes one of the five leaked values into a
  user record again.
- `js/engine.js`: added a read-only `LEGACY_DEFAULT_PASSWORDS` table (the
  same five values, kept in exactly one place) and `isLegacyDefaultPassword
  (username, plain)`, used only to *detect* that someone just typed one of
  the old public values — never to grant or restore it.
- `js/app.js`'s login handler now classifies every login attempt as one of:
  - **freshAccount** (`cand.p==null`) → routed straight to a blocking
    "set a password" step, never silently let in.
  - **legacyDefault** (`passOk` matches, and the value matches
    `isLegacyDefaultPassword`) → the normal check still has to pass first
    (proving the person really does know that value), then they are forced
    to replace it before a session is granted.
  - **normal** (anything else that passes `passOk`) → logs straight in,
    completely unaffected by this fix.
- The new forced-setup modal (`forcePasswordSetup`) is a no-cancel, no-X
  blocking modal: it requires a new password ≥6 chars, confirmed twice, and
  explicitly re-checks the new value against `isLegacyDefaultPassword` so
  someone can't "rotate" straight back onto the same leaked default.
- 8-language i18n strings added for the new modal (`i18n.js`).

## Proof the fix works

`tests/run.js` (run via `node tests/run.js`) now includes, in addition to
the 158 pre-existing assertions, 9 new ones that re-derive the exact
decision `app.js`'s `login()` makes and check all three cases plus the
anti-regression case:

1. A fresh seed account (`p:null`) is forced into first-time setup, not
   silently logged in and not rejected as "wrong password".
2. An account still holding the old leaked default is accepted by `passOk`
   (proving it is recognized) but is still forced to rotate — it never
   reaches `completeLogin()` directly.
3. **The same account, already rotated to a real custom password, logs in
   normally and is NOT forced through setup again** — proves this fix
   introduces zero regression for already-secured, legitimate users.
4. A wrong password on a rotated account is still rejected.
5. `isLegacyDefaultPassword` correctly matches only the exact
   username+value pair it should, and never flags a real custom password
   or an unrelated username.

Result: `node tests/run.js` → `all tests passed`, exit code `0`
(verified: 158 pre-existing + 9 new = all green, no failures).

## Scope boundary — NOT fixed in this pass (proposal only)

This fix closes the *client-side default-password* hole, but the underlying
Supabase database (project `jljzobaggesefsdeslrf`) still has Row Level
Security enabled on 9 tables with every policy set to `using(true) with
check(true)` — i.e. fully open read/write/delete to anyone with the public
anon key (which is not a secret by design, so this is a real, separate
exposure). A proper fix (real per-user Supabase Auth + RLS policies scoped
to `auth.uid()`/company) requires either:
- a `service_role` key to provision/migrate auth users — which I will never
  handle directly, per the engagement's credential-handling rule, or
- testing `supabase.auth.signUp` against a disposable copy of the project,
  which does not exist and should not be improvised against the live
  production database.

**This is intentionally left as a documented blocker for the owner to
unblock** (e.g. by provisioning a staging Supabase project, or doing the
auth-user migration step themselves with their own dashboard access), not
something implemented or worked around in this pass.
