// Server-side proxy for the Autosiastik Fahrzeugschein-Scanner API
// (https://api.fahrzeugschein-scanner.de/redoc). The phone/browser sends only
// the document image to this function; AUTOSIASTIK_ACCESS_KEY never leaves
// the Supabase server and is never logged or committed.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const key = Deno.env.get('AUTOSIASTIK_ACCESS_KEY') || '';
  if (!key) return json({ error: 'no-server-key' }, 503);

  let body: { image?: string; showCuts?: boolean; getKbaData?: boolean } = {};
  try { body = await req.json(); } catch { return json({ error: 'bad-json' }, 400); }

  const image = String(body.image || '');
  if (!image.startsWith('data:')) return json({ error: 'no-image' }, 400);

  const comma = image.indexOf(',');
  if (comma < 0) return json({ error: 'bad-image' }, 400);
  const header = image.slice(5, comma); // e.g. "image/jpeg;base64"
  const mime = (header.split(';')[0] || 'image/jpeg').trim() || 'image/jpeg';
  let bytes: Uint8Array;
  try { bytes = base64ToBytes(image.slice(comma + 1)); } catch { return json({ error: 'bad-image' }, 400); }

  const ext = mime.includes('png') ? 'png' : (mime.includes('heic') || mime.includes('heif')) ? 'heic' : 'jpg';
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mime }), `fahrzeugschein.${ext}`);
  form.append('access_key', key);
  form.append('show_cuts', body.showCuts === false ? 'false' : 'true');

  // get_kba_data stays OFF unless the deployment opted in (secret) AND the
  // caller explicitly asked for it -- KBA enrichment can consume additional
  // scan credits, so it must never be a silent default.
  const kbaAllowed = (Deno.env.get('AUTOSIASTIK_ALLOW_KBA') || '').toLowerCase() === 'true';
  if (kbaAllowed && body.getKbaData === true) form.append('get_kba_data', 'true');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28000);
  let upstream: Response;
  try {
    // Single attempt -- no automatic retry. A failed upstream call may still
    // have consumed a scan credit, so retrying here would risk doing that
    // twice for one user action.
    upstream = await fetch('https://api.fahrzeugschein-scanner.de/', {
      method: 'POST',
      body: form,
      signal: controller.signal
    });
  } catch (e) {
    clearTimeout(timeout);
    return json({ ok: false, error: 'network', detail: String(e) }, 502);
  }
  clearTimeout(timeout);

  const text = await upstream.text();
  let payload: unknown = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }

  if (!upstream.ok) {
    const detail = (payload as Record<string, unknown>)?.message
      || (payload as Record<string, unknown>)?.detail
      || 'autosiastik-error';
    return json({ ok: false, status: upstream.status, error: detail }, upstream.status);
  }

  return json({ ok: true, source: 'autosiastik', data: payload });
});

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}
