#!/usr/bin/env node
// Grants (or creates + grants) company access for a WerkPilot cloud
// identity. Run this YOURSELF, with YOUR OWN Supabase project's
// service_role key -- never share that key or ask anyone else
// (including an AI assistant) to type it in for you. It never touches
// localStorage data or anything in a user's browser; it only sets
// Supabase Auth's app_metadata for one user, which is what the RLS
// policies in migration-fix-rls.sql check.
//
// Usage:
//   node provision-user.js <SUPABASE_URL> <SERVICE_ROLE_KEY> <email> \
//        <company_ids_comma_separated> <role> [--create <temp_password>]
//
// Examples:
//   # Grant an account that already exists (created itself via the
//   # app's "link to cloud" / forced-password-setup flow) access to
//   # company "de" with role "developer":
//   node provision-user.js https://xxx.supabase.co sb_secret_... \
//        rashid@example.com de developer
//
//   # Create a brand-new cloud identity (no prior self-link) AND grant
//   # it access in one step, with a temporary password the person
//   # must change on first login:
//   node provision-user.js https://xxx.supabase.co sb_secret_... \
//        ismail@example.com de mechanic --create 'TempPass#2026!'
//
// For the 5 accounts migrated from this engagement's local seed data
// (admin/manager, Rashid/developer, accountant/accountant,
// ismail/mechanic, warehouse/warehouse), run this once per person
// with company_ids "de" (the only real, active company in the seed
// data today) -- or "de,es" to exactly match their current unrestricted
// client-side access to both companies. This is a judgment call for the
// business owner, not something this script decides for you.

const [, , SUPABASE_URL, SERVICE_ROLE_KEY, email, companyIdsCsv, role, createFlag, tempPassword] = process.argv;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !email || !companyIdsCsv || !role) {
  console.error('usage: node provision-user.js <SUPABASE_URL> <SERVICE_ROLE_KEY> <email> <company_ids_csv> <role> [--create <temp_password>]');
  process.exit(2);
}

const company_ids = companyIdsCsv.split(',').map(s => s.trim()).filter(Boolean);
const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json'
};

async function findUserByEmail(email) {
  // admin/users supports ?email= as an exact-match filter in current
  // GoTrue versions; falls back to a single page scan for older ones.
  let res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers });
  let json = await res.json().catch(() => ({}));
  const list = json.users || (Array.isArray(json) ? json : []);
  const hit = list.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
  if (hit) return hit;
  res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers });
  json = await res.json().catch(() => ({}));
  return (json.users || []).find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
}

async function createUser(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST', headers,
    body: JSON.stringify({ email, password, email_confirm: true })
  });
  const json = await res.json();
  if (!res.ok) throw new Error('createUser failed: ' + JSON.stringify(json));
  return json;
}

async function grantAccess(userId, company_ids, role) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ app_metadata: { company_ids, role } })
  });
  const json = await res.json();
  if (!res.ok) throw new Error('grantAccess failed: ' + JSON.stringify(json));
  return json;
}

(async () => {
  let user = await findUserByEmail(email);
  if (!user) {
    if (createFlag !== '--create' || !tempPassword) {
      console.error(`No cloud account exists yet for ${email}. Either have that person link their account first (Settings -> "Cloud account" in the app), or re-run with: --create '<temporary password>'`);
      process.exit(1);
    }
    console.log(`Creating a new cloud account for ${email} with a temporary password...`);
    user = await createUser(email, tempPassword);
    console.log('IMPORTANT: tell this person their temporary password through a secure channel (not this terminal\'s scrollback, not email in plain text) and have them change it immediately via "Forgot password?" or Settings.');
  }
  const updated = await grantAccess(user.id, company_ids, role);
  console.log(`Granted ${email} (user id ${user.id}) access to companies [${company_ids.join(', ')}] as role "${role}".`);
  console.log('app_metadata now:', JSON.stringify(updated.app_metadata));
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
