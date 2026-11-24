// WerkPilot: create a new workshop (tenant) with its own login.
//
// Only the platform owner may call this: a signed-in user with an ACTIVE
// membership of company "de" with role "developer". The function then
//   1. registers the workshop in `companies`,
//   2. creates a login for the workshop's e-mail (random password that nobody
//      ever sees) and makes it the "manager" of that one workshop only,
//   3. sends the standard "set your password" e-mail, so the workshop chooses
//      its own password.
// If a step fails, the earlier steps are undone. The service-role key never
// leaves the server (Supabase provides it to the function as an env variable).
// Nothing personal is logged.
import { createClient } from 'npm:@supabase/supabase-js@2';

const APP_ORIGIN = 'https://rashedcar50-cmyk.github.io';
const APP_URL = APP_ORIGIN + '/WerkPilot/';
const HOME_COMPANY = 'de';

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin === APP_ORIGIN ? APP_ORIGIN : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
const clean = (v: unknown, max: number) =>
  String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const EMAIL = /^[^@\s<>"',;]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?\.[A-Za-z]{2,24}$/;

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get('origin')), 'Content-Type': 'application/json' };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'method' });

  const url = Deno.env.get('SUPABASE_URL') || '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!url || !service) return reply(503, { error: 'not_configured' });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  // Who is calling? Checked with the auth server, then against memberships.
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'auth' });
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user) return reply(401, { error: 'auth' });
  const { data: mine } = await admin.from('company_memberships').select('role,active')
    .eq('user_id', who.user.id).eq('company_id', HOME_COMPANY).eq('active', true).eq('role', 'developer').limit(1);
  if (!mine || !mine.length) return reply(403, { error: 'forbidden' });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return reply(400, { error: 'input' }); }
  const name = clean(body.name, 100);
  const email = clean(body.email, 254).toLowerCase();
  const country = /^[A-Z]{2}$/.test(String(body.country || '')) ? String(body.country) : 'DE';
  const currency = /^[A-Z]{3}$/.test(String(body.currency || '')) ? String(body.currency) : 'EUR';
  if (name.length < 2 || !EMAIL.test(email)) return reply(400, { error: 'input' });

  // One login = one e-mail. An existing account is never silently given a workshop.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) return reply(502, { error: 'auth_list' });
  if ((list?.users || []).some((u) => (u.email || '').toLowerCase() === email)) return reply(409, { error: 'email_in_use' });

  const id = 'ws_' + Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, '0')).join('');
  const { error: coErr } = await admin.from('companies').insert({ id, name, country, currency });
  if (coErr) return reply(500, { error: 'company', detail: coErr.message });

  const password = Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, '0')).join('') + 'aA1!';
  const { data: made, error: userErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { workshops: { [id]: { name, country, currency } } },
  });
  if (userErr || !made?.user) {
    await admin.from('companies').delete().eq('id', id);
    return reply(500, { error: 'user', detail: userErr?.message || '' });
  }
  const { error: memErr } = await admin.from('company_memberships')
    .insert({ company_id: id, user_id: made.user.id, role: 'manager', active: true });
  if (memErr) {
    await admin.auth.admin.deleteUser(made.user.id);
    await admin.from('companies').delete().eq('id', id);
    return reply(500, { error: 'membership', detail: memErr.message });
  }

  // "Set your password" mail through the normal recovery flow of the app.
  let mailed = false;
  try {
    const pub = createClient(url, anon || service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await pub.auth.resetPasswordForEmail(email, { redirectTo: APP_URL });
    mailed = !error;
  } catch { mailed = false; }

  console.log('workshop_created', id, mailed ? 'mailed' : 'not_mailed');
  return reply(200, { companyId: id, mailed });
});
