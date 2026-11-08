# Fix report 09 — frontend-first deploy: compatibility evidence, backup/rollback

**Branch:** `fix/security-invoicing-print-ocr-i18n`
**Purpose:** answer, with evidence, whether deploying the frontend code
now (merge → GitHub Pages) — **before** SMTP, the RLS migration, or any
account provisioning — is safe: specifically, whether it can block
login or break cloud sync for real users. **Conclusion: it is safe,
and the sequence already planned (frontend now, Supabase-side changes
later, each behind the owner's own manual action) does not need to
change.** The evidence for that conclusion is below, not asserted.

## A significant finding made while verifying this

Checking current production's actual code (`git show f9549e4:js/core.js`
— the exact commit `main` is on right now) against the same reproduction
used earlier to find the TDZ bug confirms: **this data-loss bug is
already active in production today**, not merely a latent risk this
branch avoids. Feeding current production's real `load()` function a
simulated "existing real install" (a real-looking customer record, a
real-looking password) through the same harness used throughout this
engagement:

```
CURRENT PRODUCTION core.js behavior:
db.users: [{"u":"admin","p":"1980D", ...}, {"u":"Rashid","p":"1976R", ...}, ...]   <- reset to the hardcoded defaults
db.customers: [{"id":"c_demo1","name":"Ahmad Al-Khalil", ...}, ...]                  <- reset to demo data, the real customer discarded
```

Tracing why the business hasn't experienced this as obvious data loss:
`db.users` is **never synced to Supabase** (confirmed earlier — there
is no `users` table in the schema), so this reset happens silently on
every page load, and whatever gets typed as a "new" password in
Settings only survives until the next reload, at which point the
original hardcoded default becomes active again. Business records
(customers/vehicles/invoices) *are* synced to Supabase, so
`syncAllCloud()` re-populates them after each reset-and-login, masking
the symptom for that data — but login credentials have no such
cloud copy to recover from, so **the practical effect today is that
the original hardcoded default passwords are very likely still the
actually-working credentials on a fresh load, regardless of anything
anyone has tried to change in Settings.** This makes deploying this
fix not just safe, but overdue independent of anything else in this
plan.

## Does deploying the frontend alone block login? — traced through every real case

`js/core.js`'s `load()` merge (`{...base,...raw}`, `raw` = whatever is
actually in a real user's browser right now) was traced through every
realistic starting state a real user's browser can currently be in:

| Real-world starting state (today, in a user's browser) | What `db.users` contains after deploying this branch's fix | Login result |
|---|---|---|
| Most likely case, per the finding above: last save reset to the hardcoded default (`p:'1980D'` etc.) | That same default, now correctly preserved instead of wiped again | `legacyDefault` path: accepted, then **forced to rotate** — not rejected, not silently let in |
| Less likely: a custom plaintext password happened to survive a session without reload | That custom plaintext value, preserved | Logs in normally, silently upgraded to a proper hash |
| Browser/device that has never loaded the app (empty storage) | `p:null` (fresh seed) | `freshAccount` path: **forced first-time setup** — not rejected |

No traced case results in a login being rejected or an account becoming
inaccessible. This is also exactly what `tests/run.js`'s "account
migration" section (`node tests/run.js`, still 182/182 passing) and the
live-browser reproduction in `fix-report-05` already proved — this
report re-derives the same conclusion directly from current
production's own code, as additional, independent confirmation before
merging.

## Does deploying the frontend alone break sync? — confirmed by diff, not inference

```
git diff f9549e4 -- js/cloud.js   ->  0 lines changed
git diff f9549e4 -- supabase-config.js  ->  0 lines changed (same URL, same anon key)
```

`js/cloud.js` — the entire sync layer — is **byte-for-byte identical**
to what's in production today. `supabase-config.js` — the URL and anon
key cloud.js uses — is also unchanged. Since the RLS migration is
**not** part of this deploy (it requires a `service_role` key / Supabase
dashboard login, which this process cannot handle under any
authorization — see `fix-report-07`), the database's access policies
also don't change. Sync has nothing new to be incompatible with: same
client code, same credentials, same server-side policies.

The only new code that touches Supabase Auth (`js/auth.js`,
`completeLogin`'s cloud sign-in, the `PASSWORD_RECOVERY` listener) is
conditioned on `cand.cloudEmail` being set — which is `undefined` for
every real account immediately after this deploy, since nobody has
gone through the new "link to cloud" step yet. That code is present
but **inert** until an account deliberately opts in; `index.html`'s
only change is one new same-origin `<script>` tag (`js/auth.js`),
loaded the same way every other script already is — no new external
dependency, no CDN, nothing that can fail to load and break the page
differently than before.

## Backup & rollback — for *this* deploy specifically

This deploy touches **only the static client files** served by GitHub
Pages. It does not run any SQL, does not call the Supabase Admin API,
and does not change any row or policy in the database — there is
nothing at the database layer for this specific step to back up.

- **Rollback, if ever needed:** `git revert` the merge commit and push
  — GitHub Pages redeploys the previous version within roughly a
  minute. This returns the live app to *exactly* its current behavior
  (including the pre-existing TDZ bug described above — reverting
  doesn't introduce a new problem, it un-fixes an old one).
- **The separate, later step that genuinely needs a database backup**
  — applying `migration-fix-rls.sql` — is unchanged from the plan in
  `fix-report-07`/`08`: `pg_dump` or the Supabase dashboard's backup
  feature, done by the owner, *before* that specific step, which
  remains sequenced well after this deploy and is not part of it.

## Conclusion

The already-planned order — frontend deploy now, SMTP/RLS/account
provisioning as separate later steps the owner executes with their own
credentials — is the safe order. No change to that sequence was
needed; this report is the evidence requested before merging it.
