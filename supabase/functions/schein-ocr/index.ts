const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const key = Deno.env.get('OPENAI_API_KEY') || '';
  if (!key) return json({ error: 'no-server-key' }, 503);
  let body: { image?: string } = {};
  try { body = await req.json(); } catch { return json({ error: 'bad-json' }, 400); }
  const image = String(body.image || '');
  if (!image.startsWith('data:image/')) return json({ error: 'no-image' }, 400);

  const system = 'Du bist ein OCR-Gerät für deutsche Zulassungsbescheinigung Teil I/II. Transkribiere nur sichtbaren Text. Keine Beispiele, keine Mustermann-Werte.';
  const r1 = await openai(key, {
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: [
        { type: 'text', text: 'Transkription zeilenweise. Teil II: aktuelle rechte Haltersäule.' },
        { type: 'image_url', image_url: { url: image, detail: 'high' } }
      ]}
    ]
  });
  if (!r1.ok) return json({ error: 'openai', status: r1.status, detail: r1.err }, r1.status || 502);
  const raw = r1.text || '';
  const r2 = await openai(key, {
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Extrahiere NUR aus dem Text. Leere Felder wenn unsicher. VERBOTEN: Mustermann, Musterstraße, AB-CD 123.' },
      { role: 'user', content: 'Text:\n' + raw.slice(0, 4000) + '\nJSON: owner_name,address,license_plate,vin,brand,model,year,hsn,tsn,first_registration' }
    ]
  });
  let fields: Record<string, string> = {};
  try { fields = JSON.parse(r2.text || '{}'); } catch { fields = {}; }
  return json({ ok: true, source: 'server', raw, fields });
});

async function openai(key: string, body: unknown) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify(body)
  });
  const js = await res.json().catch(() => ({}));
  const text = js?.choices?.[0]?.message?.content || '';
  const err = js?.error?.message || '';
  return { ok: res.ok, status: res.status, text, err };
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}
