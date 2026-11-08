# SMTP configuration template for production password-reset email

**Nothing in this file has been applied anywhere.** No account was
created, no service was purchased, no setting was changed on the
production Supabase project or on any other project (including
BusinessPilot/Firmenkraft). This is a filled-in template for the owner
to execute, plus the cost research behind the recommendation.

## Why this is needed

Supabase's own built-in email sender (no SMTP configured) is explicitly
rate-limited and documented as suitable for testing only, not for real
users receiving real password-reset emails in production. A custom SMTP
provider is required before the "Forgot password?" flow built in
`fix-report-07-cloud-auth.md` can be used for real.

## Provider options researched (none purchased)

WerkPilot's realistic email volume is tiny: password resets for ~5
staff accounts, used occasionally. At that volume, a provider's free
tier should cover this indefinitely.

| Provider | Free tier | Entry paid tier (if ever needed) |
|---|---|---|
| **Brevo** (formerly Sendinblue) | 9,000 emails/month (300/day), no credit card required | $9/mo for 5,000 emails |
| **Resend** | 3,000 emails/month | $20/mo for 50,000 emails |
| **Postmark** | Trial/sandbox only, no ongoing free production tier | $15/mo for 10,000 emails |

**Recommendation: Brevo's free tier**, given WerkPilot's volume — this
should cost **$0/month** unless usage grows far beyond 5 staff accounts
occasionally resetting a password. This is a recommendation, not a
decision made on the owner's behalf: creating any account, verifying a
sending domain, and entering the resulting SMTP credentials into the
Supabase dashboard are all steps only the owner should do, with their
own login.

**Important — keep this separate from any other project's email
setup.** Use a distinct sender account/credentials for WerkPilot, not
whatever BusinessPilot/Firmenkraft may already use — this was not
checked (per the standing instruction that app must remain untouched),
so there is no way to know here whether reusing the same sender would
create a conflict. A separate account for WerkPilot avoids that
question entirely.

## What to actually enter in Supabase, once a provider account exists

**Dashboard path:** `Authentication` → `Emails` → `SMTP Settings` on the
production project (`jljzobaggesefsdeslrf`).

| Field | Value |
|---|---|
| Enable Custom SMTP | On |
| Sender email | e.g. `no-reply@<a domain the owner controls>` |
| Sender name | `TABAH AUTO` (or whatever brand name the owner prefers in the inbox) |
| Host | Provided by the chosen provider after signup (e.g. Brevo: `smtp-relay.brevo.com`) |
| Port | Provider-specific, typically `587` (STARTTLS) |
| Username | Provided by the provider |
| Password | The provider's own SMTP credential — **never typed by anyone but the owner, directly into the Supabase dashboard** |

## Redirect URL allow-list (separate from SMTP, also required)

**Dashboard path:** `Authentication` → `URL Configuration` → `Redirect
URLs` on the production project.

The app's `js/auth.js` sends `redirectTo: location.origin +
location.pathname` — i.e. whatever URL actually served the page. For
production, that means this exact URL needs to be present in the
allow-list:

```
https://rashedcar50-cmyk.github.io/WerkPilot/
```

If the "Site URL" field at the top of that same page is currently set
to something else (unconfirmed — this pass never read the production
project's settings), it should also point at that same production URL,
or password-reset links could silently redirect to the wrong place even
with SMTP correctly configured.

For local/isolated testing (already done, see `fix-report-07`), the
local Supabase CLI stack's own `config.toml` was given its own
`additional_redirect_urls` entry for `http://localhost:4173` — this
was only ever in the disposable local test stack, never in production,
and that local stack has already been torn down.

## Checklist for the owner

- [ ] Create a Brevo (or chosen provider) account, verify a sending
      domain/address.
- [ ] Enter the resulting SMTP credentials into the production
      Supabase project's `Authentication → Emails → SMTP Settings`.
- [ ] Add `https://rashedcar50-cmyk.github.io/WerkPilot/` to
      `Authentication → URL Configuration → Redirect URLs` (and confirm
      "Site URL" matches).
- [ ] Send a real test reset email to confirm delivery before relying
      on it for real staff.
