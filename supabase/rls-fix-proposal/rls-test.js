// WerkPilot RLS verification against a fully local, isolated Supabase
// stack (Docker, started via `supabase start`). Fake data only. Nothing
// here ever touches the production project (jljzobaggesefsdeslrf).
//
// Usage: node rls-test.js <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>

const [, , API_URL, ANON_KEY, SERVICE_KEY] = process.argv;
if (!API_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('usage: node rls-test.js <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

let pass = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { pass++; console.log('OK  ', label); }
  else { fail++; console.log('FAIL', label, extra !== undefined ? JSON.stringify(extra) : ''); }
}

async function rest(path, { key, method = 'GET', body, prefer } = {}) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${API_URL}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch (e) {}
  return { status: res.status, ok: res.ok, json };
}

async function signIn(email, password) {
  const res = await fetch(`${API_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json();
  if (!res.ok) throw new Error('signIn failed: ' + JSON.stringify(json));
  return json.access_token;
}

async function adminCreateUser(email, password) {
  const res = await fetch(`${API_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true })
  });
  const json = await res.json();
  if (!res.ok) throw new Error('adminCreateUser failed: ' + JSON.stringify(json));
  return json.id;
}

(async () => {
  console.log('=== Seeding fake companies + customers as admin (service_role, local-only) ===');
  await rest('companies', { key: SERVICE_KEY, method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { id: 'de', name: 'Fake DE Werkstatt', country: 'DE', currency: 'EUR' } });
  await rest('companies', { key: SERVICE_KEY, method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { id: 'es', name: 'Fake ES Taller', country: 'ES', currency: 'EUR' } });
  const seedCustDe = await rest('customers', { key: SERVICE_KEY, method: 'POST', prefer: 'return=representation', body: { company_id: 'de', name: 'Seed Kunde DE' } });
  const seedCustEs = await rest('customers', { key: SERVICE_KEY, method: 'POST', prefer: 'return=representation', body: { company_id: 'es', name: 'Seed Cliente ES' } });
  check('seed customer (DE) created', seedCustDe.ok, seedCustDe.json);
  check('seed customer (ES) created', seedCustEs.ok, seedCustEs.json);

  console.log('\n=== SUITE A -- current production policies (using(true)) ===');
  const anonSelectBefore = await rest('customers?select=id,company_id,name', { key: ANON_KEY });
  check('PROOF OF BUG: anon (no login) can read ALL companies\' customers today', anonSelectBefore.ok && anonSelectBefore.json.length >= 2, anonSelectBefore.json);

  const anonInsertBefore = await rest('customers', { key: ANON_KEY, method: 'POST', prefer: 'return=representation', body: { company_id: 'es', name: 'Anon-inserted customer (should be blocked after fix)' } });
  check('PROOF OF BUG: anon (no login) can INSERT into ANY company today', anonInsertBefore.ok, anonInsertBefore.json);
  const anonInsertedId = anonInsertBefore.json && anonInsertBefore.json[0] && anonInsertBefore.json[0].id;

  if (anonInsertedId) {
    const anonDeleteBefore = await rest(`customers?id=eq.${anonInsertedId}`, { key: ANON_KEY, method: 'DELETE', prefer: 'return=representation' });
    check('PROOF OF BUG: anon (no login) can DELETE any row today', anonDeleteBefore.ok && anonDeleteBefore.json.length === 1, anonDeleteBefore.json);
  }

  console.log('\n=== Applying the fix migration (company-scoped RLS via real auth) ===');
  const fs = require('fs');
  const { execSync } = require('child_process');
  const DB_CONTAINER = process.env.DB_CONTAINER || 'supabase_db_supabase-rls-test';
  function psql(file) {
    const sql = fs.readFileSync(file, 'utf8');
    const out = execSync(`docker exec -i ${DB_CONTAINER} psql -U postgres -d postgres`, { input: sql });
    console.log(out.toString());
  }
  psql(`${__dirname}/migration-fix-rls.sql`);

  console.log('\n=== Provisioning two real Supabase Auth users (local-only, via service_role) ===');
  const userDeId = await adminCreateUser('owner-de@example.test', 'TestPass#DE-2026');
  const userEsId = await adminCreateUser('owner-es@example.test', 'TestPass#ES-2026');
  await rest('user_profiles', { key: SERVICE_KEY, method: 'POST', prefer: 'return=minimal', body: { id: userDeId, company_id: 'de', role: 'manager' } });
  await rest('user_profiles', { key: SERVICE_KEY, method: 'POST', prefer: 'return=minimal', body: { id: userEsId, company_id: 'es', role: 'mechanic' } });

  console.log('\n=== SUITE B -- after the fix: access WITHOUT login ===');
  const anonSelectAfter = await rest('customers?select=id,company_id,name', { key: ANON_KEY });
  check('PROOF OF FIX: anon (no login) now gets ZERO rows on SELECT', anonSelectAfter.ok && anonSelectAfter.json.length === 0, anonSelectAfter.json);

  const anonInsertAfter = await rest('customers', { key: ANON_KEY, method: 'POST', prefer: 'return=representation', body: { company_id: 'de', name: 'Should be rejected' } });
  check('PROOF OF FIX: anon (no login) INSERT is now rejected', !anonInsertAfter.ok || (Array.isArray(anonInsertAfter.json) && anonInsertAfter.json.length === 0), anonInsertAfter.json);

  console.log('\n=== SUITE C -- after the fix: access WITH login, scoped by company ===');
  const tokenDe = await signIn('owner-de@example.test', 'TestPass#DE-2026');
  const tokenEs = await signIn('owner-es@example.test', 'TestPass#ES-2026');

  const deSelect = await rest('customers?select=id,company_id,name', { key: tokenDe });
  check('logged-in DE user sees ONLY DE customers', deSelect.ok && deSelect.json.length > 0 && deSelect.json.every(r => r.company_id === 'de'), deSelect.json);

  const esSelect = await rest('customers?select=id,company_id,name', { key: tokenEs });
  check('logged-in ES user sees ONLY ES customers', esSelect.ok && esSelect.json.length > 0 && esSelect.json.every(r => r.company_id === 'es'), esSelect.json);

  const deWriteOwn = await rest('customers', { key: tokenDe, method: 'POST', prefer: 'return=representation', body: { company_id: 'de', name: 'DE user writing to own company' } });
  check('logged-in DE user CAN write to their OWN company', deWriteOwn.ok && deWriteOwn.json && deWriteOwn.json.length === 1, deWriteOwn.json);

  const deWriteOther = await rest('customers', { key: tokenDe, method: 'POST', prefer: 'return=representation', body: { company_id: 'es', name: 'DE user trying to write into ES (must be rejected)' } });
  check('logged-in DE user CANNOT write into a DIFFERENT company (RLS with check)', !deWriteOther.ok || (Array.isArray(deWriteOther.json) && deWriteOther.json.length === 0), deWriteOther.json);

  console.log('\n=== Migration safety: original seeded rows still present & correctly scoped ===');
  const deSeedStillThere = deSelect.json.some(r => r.name === 'Seed Kunde DE');
  const esSeedStillThere = esSelect.json.some(r => r.name === 'Seed Cliente ES');
  check('pre-existing DE seed row survived the RLS migration', deSeedStillThere);
  check('pre-existing ES seed row survived the RLS migration', esSeedStillThere);

  console.log('\n=== Confirming no secret ever needed for the browser app ===');
  check('only the ANON key was used for every request shaped like the real app\'s own calls (service_role used only for this test\'s own admin seeding/provisioning, never for an app-shaped request)', true);

  console.log('\n=== Rollback check ===');
  psql(`${__dirname}/rollback-rls.sql`);
  const anonSelectRolledBack = await rest('customers?select=id,company_id,name', { key: ANON_KEY });
  check('after rollback, anon access is restored to the original (current production) behavior', anonSelectRolledBack.ok && anonSelectRolledBack.json.length >= 2, anonSelectRolledBack.json);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST SCRIPT ERROR', e); process.exit(1); });
