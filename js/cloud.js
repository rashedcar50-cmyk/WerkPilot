/* BayMeister cloud (Supabase) */
/* ===== Supabase data layer (purchases أولاً) ===== */
async function sbReady(){
  return !!(window.supabaseClient);
}

/* ===== Relation helpers =====
   The real tables use numeric bigint ids for relations (customer_id,
   vehicle_id, ...), but WerkPilot's local records use string ids
   (e.g. "c_abc123"). resolveCloudId looks up the related local
   record's cloudId, syncing it first (recursively) if it hasn't
   synced yet -- this makes relation order self-healing instead of
   depending on every call site syncing parents before children.
   localIdForCloudId is the reverse, used when reading cloud rows back
   into local state. */
async function resolveCloudId(table, localId, upsertFn){
  if(!localId) return null;
  const row = (db[table]||[]).find(x=>x.id===localId);
  if(!row) return null;
  if(!row.cloudId && typeof upsertFn==='function'){
    try{ await upsertFn(row); }catch(e){ console.warn('resolveCloudId', table, e); }
  }
  return row.cloudId!=null ? row.cloudId : null;
}
function localIdForCloudId(table, cloudId){
  if(cloudId===null || cloudId===undefined || cloudId==='') return '';
  const n = Number(cloudId);
  const row = (db[table]||[]).find(x=>x.cloudId===n || x.cloudId===cloudId);
  return row ? row.id : '';
}
// Cross-device sync bugfix (2026-11-12): a pending-sync badge that only
// ever updates on the NEXT full page load is barely better than no
// badge -- upsert*Cloud() calls are deliberately fire-and-forget (the UI
// doesn't block on the network), so the badge needs to catch up once the
// background call actually resolves. Debounced so a batch of parallel
// retries (e.g. retryPendingCloud() resolving many records at once)
// triggers one re-render, not one per record.
let _syncRerenderTimer=null;
function scheduleSyncRerender(){
  if(typeof session==='undefined' || !session || typeof render!=='function') return;
  if(!['customers','vehicles','dashboard'].includes(session.page)) return;
  clearTimeout(_syncRerenderTimer);
  _syncRerenderTimer=setTimeout(()=>{ try{ render(); }catch(e){} }, 300);
}
// Bugfix (2026-11-12): found by inspecting a REAL sync failure recorded
// on the owner's own laptop -- the Nissan Almera's save was rejected
// with "date/time field value out of range: \"19.05.2004\"". Root cause:
// production's vehicles.first_registration column is a real Postgres
// `date` column (one of the richer pre-existing columns alongside the
// simple set this app writes, per the schema audit in
// reports/fix-report-11-cloud-sync-full.md), but firstRegistration is
// always stored/displayed as a German-format string (DD.MM.YYYY, e.g.
// from Autosiastik's own ez_string or from manual entry) -- sent
// unconverted, "19" as a month is invalid to Postgres's date parser. Has
// nothing to do with auth/RLS -- a plain data-format bug that made every
// scanned vehicle's save fail at the database, after authentication and
// RLS had already passed. Converts DD.MM.YYYY -> YYYY-MM-DD; passes an
// already-ISO value through; anything else (blank, unparseable, an
// out-of-range day/month) becomes null -- never guessed, never sent as
// literal text to a typed date column.
function toIsoDateOrNull(s){
  s=String(s||'').trim();
  if(!s) return null;
  let m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if(m){
    const day=+m[1], month=+m[2], year=+m[3];
    if(month>=1 && month<=12 && day>=1 && day<=31) return year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    return null;
  }
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}
// Reverse of the above, for reading first_registration back from the
// cloud's real `date` column (PostgREST returns ISO "YYYY-MM-DD") into
// the German DD.MM.YYYY string this app stores/displays everywhere else.
function isoDateToGerman(s){
  const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[3]+'.'+m[2]+'.'+m[1]) : '';
}
function markSyncOk(x){ if(x){ x.syncError=''; x.syncPending=false; scheduleSyncRerender(); } }
// Repeated-conflict bugfix, part 2 (2026-11-13): fixing mergeByCompany()
// to re-push a "local wins" record (above) still wasn't enough on its
// own for the four tables whose conflict check tracks a real `updatedAt`
// (invoices/purchases/appointments/expenses -- confirmed live: production's
// invoices.updated_at is a plain column with no auto-touch-on-update
// trigger, so it only ever gets set once, at insert). A push that never
// sends updated_at leaves the cloud row's timestamp frozen at its
// original value forever -- so even a successful, correct repush still
// looks "older than local" on the very next pull, and the SAME conflict
// fires again, endlessly, even though the content now genuinely matches.
// Returns the single timestamp both sides must end up sharing: the
// record's own pending edit time if it has one, else right now.
function syncTimestamp(x){ return x.updatedAt || new Date().toISOString(); }
function markSyncError(x, message){
  if(x){ x.syncError=message||'sync failed'; x.syncPending=false; save(); scheduleSyncRerender(); }
  if(db && db.settings){ db.settings.lastSyncError={message, at:new Date().toISOString()}; }
  // Mobile root-cause fix (2026-11-12): "new row violates row-level
  // security policy" has TWO genuinely different real causes that read
  // identically in the error text alone -- (a) a validly, currently
  // authenticated identity that simply has no company_memberships row
  // for this workshop, and (b) a session that LOOKS signed-in locally
  // but has actually expired/gone invalid server-side (a known failure
  // mode when a mobile browser tab sits backgrounded long enough that
  // its token refresh timer gets suspended). These need different
  // messages and the same one action (sign in again) -- (a) additionally
  // needs the owner to grant access, which no client-side action can do.
  // getUser() is the one call that actually asks the AUTH SERVER "is
  // this token still good right now" (unlike getSession(), which only
  // reads the locally-cached token and its claimed, not verified,
  // expiry) -- so it's the only way to tell these apart with evidence
  // instead of guessing from the error text alone.
  if(classifySyncError(message)==='company' && typeof window!=='undefined' && window.supabaseClient){
    window.supabaseClient.auth.getUser().then(({data, error})=>{
      if(!db || !db.settings) return;
      if(error || !(data && data.user)){
        db.settings.cloudAuthError='session-expired';
        try{ save(); scheduleSyncRerender(); }catch(e){}
      }
    }).catch(()=>{});
  }
}

// Repeated-conflict bugfix (2026-11-13): mergeByCompany() now returns
// every record whose pull-time conflict resolved with "local" as the
// winner -- that resolution only ever changed the in-memory copy, so
// without this, the cloud row stayed stale forever and the SAME conflict
// re-logged on every single future sync pass (found live: one real
// invoice logged 24 identical "local wins" conflicts over ~36h because
// nothing ever told the cloud about the resolution). Re-pushing the
// winning version here is what actually makes the conflict resolve
// instead of just re-detecting itself endlessly.
function repushLocalWinners(records, upsertFn){
  (records||[]).forEach(rec=>{ try{ upsertFn(rec); }catch(e){ console.warn('repushLocalWinners', e); } });
}
async function loadPurchasesFromCloud(){
  try{
    const sb = window.supabaseClient;
    if(!sb) return false;
    let q=sb.from('purchases').select('*').order('purchase_date', { ascending: false });
    q=cloudCompanyFilter(q);
    const { data, error } = await q;
    if(error){ console.warn('loadPurchases', error.message); return false; }
    if(!Array.isArray(data)) return false;
    const localWon = mergeByCompany('purchases', data.map(r => ({
      updatedAt:r.updated_at||r.purchase_date||'',
      id: 'p_cloud_' + r.id,
      cloudId: r.id,
      companyId: r.company_id || 'de',
      supplier: r.supplier || '',
      invoice_number: r.invoice_number || '',
      item: r.item || '',
      qty: r.qty,
      price: r.price,
      subtotal: r.subtotal,
      tax_amount: r.tax_amount,
      total_amount: r.total_amount,
      date: r.purchase_date || r.date || '',
      payment_status: r.payment_status || r.status || 'pending',
      notes: r.notes || '',
      receipt_url: r.receipt_url || ''
    })));
    repushLocalWinners(localWon, upsertPurchaseCloud);
    return true;
  }catch(e){ console.warn(e); return false; }
}

async function upsertPurchaseCloud(p){
  try{
    const sb = window.supabaseClient;
    if(!sb) return;
    const syncedAt = syncTimestamp(p);
    const row = {
      company_id: p.companyId || session?.company?.id || 'de',
      supplier: p.supplier || '',
      invoice_number: p.invoice_number || '',
      item: p.item || '',
      qty: Number(p.qty ?? 1),
      price: Number(p.price ?? 0),
      subtotal: Number(p.subtotal ?? 0),
      tax_amount: Number(p.tax_amount ?? 0),
      total_amount: Number(p.total_amount ?? 0),
      purchase_date: p.date || new Date().toISOString().slice(0,10),
      payment_status: p.payment_status || 'pending',
      notes: p.notes || '',
      receipt_url: p.receipt_url || '',
      updated_at: syncedAt
    };
    let error;
    if(p.cloudId){
      ({ error } = await sb.from('purchases').update(row).eq('id', p.cloudId));
    } else {
      const res = await sb.from('purchases').insert(row).select('id').single();
      error = res.error;
      if(res.data?.id){
        p.cloudId = res.data.id;
        const local = db.purchases.find(x => x.id === p.id);
        if(local) local.cloudId = res.data.id;
        save();
      }
    }
    if(error){ console.warn('upsertPurchase', error.message); markSyncError(p, error.message); }
    else { p.updatedAt=syncedAt; markSyncOk(p); }
  }catch(e){ console.warn(e); markSyncError(p, e.message); }
}

async function deletePurchaseCloud(pid){
  try{
    const sb = window.supabaseClient;
    if(!sb) return;
    const local = db.purchases.find(x => x.id === pid);
    const cloudId = local?.cloudId;
    if(!cloudId) return;
    const { error } = await sb.from('purchases').delete().eq('id', cloudId);
    if(error) console.warn('deletePurchase', error.message);
  }catch(e){ console.warn(e); }
}

async function loadCustomersFromCloud(){
  try{
    const sb=window.supabaseClient; if(!sb) return false;
    const {data,error}=await cloudCompanyFilter(sb.from('customers').select('*'));
    if(error||!Array.isArray(data)||!data.length) return false;
    const mapped=data.map(r=>({
      id:'c_cloud_'+r.id, cloudId:r.id, companyId:r.company_id||session?.company?.id||'de',
      name:r.name||'', phone:r.phone||'', email:r.email||'', address:r.address||''
    })).filter(x=>x.name);
    if(mapped.length){ repushLocalWinners(mergeByCompany('customers', mapped), upsertCustomerCloud); return true; }
  }catch(e){console.warn(e)}
  return false;
}
async function upsertCustomerCloud(c){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const row={name:c.name||'',phone:c.phone||'',email:c.email||'',address:c.address||'',company_id:c.companyId||session?.company?.id||'de'};
    if(c.cloudId){
      const {error}=await sb.from('customers').update(row).eq('id',c.cloudId);
      if(error){ console.warn('upsertCustomer',error.message); markSyncError(c,error.message); } else markSyncOk(c);
    } else {
      const {data,error}=await sb.from('customers').insert(row).select('id').single();
      if(!error && data?.id){ c.cloudId=data.id; markSyncOk(c); save(); }
      else if(error){ console.warn('upsertCustomer',error.message); markSyncError(c,error.message); }
    }
  }catch(e){console.warn(e); markSyncError(c,e.message)}
}
async function loadInventoryFromCloud(){
  try{
    const sb=window.supabaseClient; if(!sb) return false;
    const {data,error}=await cloudCompanyFilter(sb.from('inventory').select('*'));
    if(error||!Array.isArray(data)||!data.length) return false;
    const mapped=data.map(r=>({
      id:'inv_cloud_'+r.id, cloudId:r.id, companyId:r.company_id||session?.company?.id||'de',
      sku:r.sku||'', name:r.name||'', qty:Number(r.qty||0), buy:Number(r.buy||0), sell:Number(r.sell||0)
    })).filter(x=>x.name||x.sku);
    if(mapped.length){ repushLocalWinners(mergeByCompany('inventory', mapped), upsertInventoryCloud); return true; }
  }catch(e){console.warn(e)}
  return false;
}
async function upsertInventoryCloud(item){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const row={sku:item.sku||'',name:item.name||'',qty:Number(item.qty||0),buy:Number(item.buy||0),sell:Number(item.sell||0),company_id:item.companyId||session?.company?.id||'de'};
    if(item.cloudId){
      const {error}=await sb.from('inventory').update(row).eq('id',item.cloudId);
      if(error){ console.warn('upsertInventory',error.message); markSyncError(item,error.message); } else markSyncOk(item);
    } else {
      const {data,error}=await sb.from('inventory').insert(row).select('id').single();
      if(!error && data?.id){ item.cloudId=data.id; markSyncOk(item); save(); }
      else if(error){ console.warn('upsertInventory',error.message); markSyncError(item,error.message); }
    }
  }catch(e){console.warn(e); markSyncError(item,e.message)}
}

async function loadVehiclesFromCloud(){
  try{
    const sb=window.supabaseClient; if(!sb) return false;
    const {data,error}=await cloudCompanyFilter(sb.from('vehicles').select('*'));
    if(error||!Array.isArray(data)||!data.length) return false;
    const localWon = mergeByCompany('vehicles', data.map(r=>({
      id:'v_cloud_'+r.id, cloudId:r.id, companyId:r.company_id||'de',
      customerId:localIdForCloudId('customers', r.customer_id), plate:r.plate||'', vin:r.vin||'',
      make:r.make||'', model:r.model||'', year:r.year||'', engine:r.engine||'',
      paint:r.paint||'', km:r.km||0, nextServiceKm:r.next_service_km||0, photo:r.photo||'',
      hsn:r.hsn||'', tsn:r.tsn||'', vsn:r.vsn||'', kba:r.kba||'', firstRegistration:isoDateToGerman(r.first_registration),
      engine_displacement_cm3:r.engine_displacement_cm3||'', engine_power_kw:r.engine_power_kw||'',
      ratedRpm:r.rated_rpm||'', fuel_type:r.fuel_type||'', maxWeight:r.max_weight||'',
      seats:r.seats||'', vehicleClass:r.vehicle_class||'', ocrSource:r.ocr_source||'',
      nextHu:r.next_hu||'', tsnFull:r.tsn_full||'', vinCheckDigit:r.vin_check_digit||'',
      typ1:r.typ1||'', typ2:r.typ2||'', typ3:r.typ3||'', typ4:r.typ4||'',
      emissionClass:r.emission_class||'', emissionCode:r.emission_code||'', specialNotes:r.special_notes||'',
      maxWeightNational:r.max_weight_national||'', unladenWeight:r.unladen_weight||'',
      tireAxle1:r.tire_axle1||'', tireAxle2:r.tire_axle2||'', dateK:r.date_k||'',
      ocrRaw: r.ocr_raw ? (typeof r.ocr_raw==='string'?r.ocr_raw:JSON.stringify(r.ocr_raw)) : ''
    })));
    repushLocalWinners(localWon, upsertVehicleCloud);
    return true;
  }catch(e){console.warn(e);return false}
}
async function upsertVehicleCloud(v){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const customerCloudId = await resolveCloudId('customers', v.customerId, upsertCustomerCloud);
    const yearNum = v.year!=null && String(v.year).trim()!=='' ? (parseInt(v.year,10)||null) : null;
    const row={company_id:v.companyId||'de',customer_id:customerCloudId,plate:v.plate||'',vin:v.vin||'',make:v.make||'',model:v.model||'',year:yearNum,engine:v.engine||'',paint:v.paint||'',km:Number(v.km||0),next_service_km:Number(v.nextServiceKm||0),photo:(v.photo&&v.photo.length<180000)?v.photo:'',
      hsn:v.hsn||'', tsn:v.tsn||'', vsn:v.vsn||'', kba:v.kba||'', first_registration:toIsoDateOrNull(v.firstRegistration),
      engine_displacement_cm3:v.engine_displacement_cm3||'', engine_power_kw:v.engine_power_kw||'',
      rated_rpm:v.ratedRpm||'', fuel_type:v.fuel_type||'', max_weight:v.maxWeight||'',
      seats:v.seats||'', vehicle_class:v.vehicleClass||'', ocr_source:v.ocrSource||'',
      next_hu:v.nextHu||'', tsn_full:v.tsnFull||'', vin_check_digit:v.vinCheckDigit||'',
      typ1:v.typ1||'', typ2:v.typ2||'', typ3:v.typ3||'', typ4:v.typ4||'',
      emission_class:v.emissionClass||'', emission_code:v.emissionCode||'', special_notes:v.specialNotes||'',
      max_weight_national:v.maxWeightNational||'', unladen_weight:v.unladenWeight||'',
      tire_axle1:v.tireAxle1||'', tire_axle2:v.tireAxle2||'', date_k:v.dateK||'',
      ocr_raw:v.ocrRaw||''};
    if(v.cloudId){
      const {error}=await sb.from('vehicles').update(row).eq('id',v.cloudId);
      if(error){ console.warn('upsertVehicle',error.message); markSyncError(v,error.message); } else markSyncOk(v);
    } else {
      // Cross-device dedup bugfix (2026-11-12): a vehicle with no LOCAL
      // cloudId does not mean no CLOUD row exists for it -- the exact
      // bug found live in production: the three demo-seed vehicles
      // (shipped identically on every fresh install, see js/core.js)
      // ended up as six rows in the cloud, because each separate device
      // that ever synced them had its own never-yet-set cloudId and
      // blindly inserted its own copy. VIN is a real-world unique
      // identifier (unlike a name), so it's safe to look an existing
      // cloud row up by it first and adopt/update that one instead of
      // inserting a duplicate -- this is the same natural-key principle
      // mergeByCompany() already applies on the PULL side (js/core.js),
      // extended here to the PUSH side where it was missing.
      let existingId=null;
      if(v.vin){
        try{
          const {data:existing}=await cloudCompanyFilter(sb.from('vehicles').select('id').eq('vin', v.vin)).limit(1).maybeSingle();
          if(existing && existing.id) existingId=existing.id;
        }catch(e){ console.warn('upsertVehicle vin-lookup', e); }
      }
      if(existingId){
        const {error}=await sb.from('vehicles').update(row).eq('id',existingId);
        if(error){ console.warn('upsertVehicle',error.message); markSyncError(v,error.message); }
        else{ v.cloudId=existingId; markSyncOk(v); save(); }
      } else {
        const {data,error}=await sb.from('vehicles').insert(row).select('id').single();
        if(!error&&data?.id){ v.cloudId=data.id; markSyncOk(v); save(); }
        else if(error){ console.warn('upsertVehicle',error.message); markSyncError(v,error.message); }
      }
    }
  }catch(e){console.warn(e); markSyncError(v,e.message)}
}
async function loadRepairsFromCloud(){
  try{
    const sb=window.supabaseClient; if(!sb) return false;
    const {data,error}=await cloudCompanyFilter(sb.from('repairs').select('*'));
    if(error||!Array.isArray(data)||!data.length) return false;
    const localWon = mergeByCompany('repairs', data.map(r=>({
      id:'r_cloud_'+r.id, cloudId:r.id, companyId:r.company_id||'de',
      vehicleId: localIdForCloudId('vehicles', r.vehicle_id) || r.vehicle_id || '',
      description:r.description||'', complaint:r.complaint||'', tech:r.tech||'', hours:r.hours||0,
      status:r.status||'intake', km:r.km||'', fuel:r.fuel||'', date:r.repair_date||'',
      jobs: r.jobs? (typeof r.jobs==='string'? JSON.parse(r.jobs||'[]'):r.jobs):[],
      parts: r.parts? (typeof r.parts==='string'? JSON.parse(r.parts||'[]'):r.parts):[],
      photos: r.photos? (typeof r.photos==='string'? JSON.parse(r.photos||'[]'):r.photos):[]
    })));
    repushLocalWinners(localWon, upsertRepairCloud);
    return true;
  }catch(e){console.warn(e);return false}
}
async function upsertRepairCloud(r){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const vehicleCloudId = await resolveCloudId('vehicles', r.vehicleId, upsertVehicleCloud);
    const row={company_id:r.companyId||'de',vehicle_id:vehicleCloudId!=null?String(vehicleCloudId):'',description:r.description||'',complaint:r.complaint||'',tech:r.tech||'',hours:Number(r.hours||0),status:r.status||'',km:Number(r.km||0)||null,fuel:r.fuel||'',jobs:JSON.stringify(r.jobs||[]),parts:JSON.stringify(r.parts||[]),photos:JSON.stringify((r.photos||[]).map(x=>({kind:x.kind,url:x.url}))),repair_date:r.date||new Date().toISOString().slice(0,10)};
    if(r.cloudId){
      const {error}=await sb.from('repairs').update(row).eq('id',r.cloudId);
      if(error){ console.warn('upsertRepair',error.message); markSyncError(r,error.message); } else markSyncOk(r);
    } else {
      const {data,error}=await sb.from('repairs').insert(row).select('id').single();
      if(!error&&data?.id){ r.cloudId=data.id; markSyncOk(r); save(); }
      else if(error){ console.warn('upsertRepair',error.message); markSyncError(r,error.message); }
    }
  }catch(e){console.warn(e); markSyncError(r,e.message)}
}
async function loadAppointmentsFromCloud(){
  try{
    const sb=window.supabaseClient; if(!sb) return false;
    const {data,error}=await cloudCompanyFilter(sb.from('appointments').select('*'));
    if(error||!Array.isArray(data)||!data.length) return false;
    const localWon = mergeByCompany('appointments', data.map(r=>{
      const meta=r.metadata||{};
      const dt=r.start_at?new Date(r.start_at):null;
      return {
        id:'ap_cloud_'+r.id, cloudId:r.id, companyId:r.company_id||'de',
        vehicleId:localIdForCloudId('vehicles', r.vehicle_id), customerId:localIdForCloudId('customers', r.customer_id),
        date: dt?dt.toISOString().slice(0,10):'', time: meta.time || (dt?dt.toISOString().slice(11,16):''),
        tech: meta.tech||'', note:r.notes||'', status:r.status||'',
        updatedAt:r.updated_at||''
      };
    }));
    repushLocalWinners(localWon, upsertAppointmentCloud);
    return true;
  }catch(e){console.warn(e);return false}
}
async function upsertAppointmentCloud(a){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const customerCloudId = await resolveCloudId('customers', a.customerId, upsertCustomerCloud);
    const vehicleCloudId = await resolveCloudId('vehicles', a.vehicleId, upsertVehicleCloud);
    const startAt = new Date((a.date||new Date().toISOString().slice(0,10))+'T'+(a.time||'00:00')+':00').toISOString();
    const vehicleLocal=(db.vehicles||[]).find(x=>x.id===a.vehicleId);
    const title = a.note || (vehicleLocal?(vehicleLocal.plate||vehicleLocal.make||'Termin'):'Termin');
    const syncedAt = syncTimestamp(a);
    const row={company_id:a.companyId||'de',customer_id:customerCloudId,vehicle_id:vehicleCloudId,title,status:a.status||'confirmed',start_at:startAt,notes:a.note||'',metadata:{tech:a.tech||'',time:a.time||''},updated_at:syncedAt};
    if(a.cloudId){
      const {error}=await sb.from('appointments').update(row).eq('id',a.cloudId);
      if(error){ console.warn('upsertAppointment',error.message); markSyncError(a,error.message); } else { a.updatedAt=syncedAt; markSyncOk(a); }
    } else {
      const {data,error}=await sb.from('appointments').insert(row).select('id').single();
      if(!error&&data?.id){ a.cloudId=data.id; a.updatedAt=syncedAt; markSyncOk(a); save(); }
      else if(error){ console.warn('upsertAppointment',error.message); markSyncError(a,error.message); }
    }
  }catch(e){console.warn(e); markSyncError(a,e.message)}
}
async function loadInvoicesFromCloud(){
  try{
    const sb=window.supabaseClient; if(!sb) return false;
    const {data,error}=await cloudCompanyFilter(sb.from('invoices').select('*'));
    if(error||!Array.isArray(data)||!data.length) return false;
    const localWon = mergeByCompany('invoices', data.map(r=>{
      const meta=r.metadata||{};
      const paid = r.status==='paid' || (Number(r.total_amount||0)>0 && Number(r.paid_amount||0)>=Number(r.total_amount||0));
      return {
        id:'i_cloud_'+r.id, cloudId:r.id, companyId:r.company_id||'de',
        vehicleId:localIdForCloudId('vehicles', r.vehicle_id),
        customerId:localIdForCloudId('customers', r.customer_id),
        repairId:meta.repairLocalId||'', number:r.invoice_number||'', type:meta.type||'Rechnung',
        parts:meta.parts||0, labor:meta.labor||0, discount:meta.discount||0, tax:meta.taxPercent||19,
        net:r.subtotal||0, total:r.total_amount||0, payment:meta.payment||'', paid,
        date:r.issue_date||'', updatedAt:r.updated_at||r.issue_date||'', lines: meta.lines||[]
      };
    }));
    repushLocalWinners(localWon, upsertInvoiceCloud);
    return true;
  }catch(e){console.warn(e);return false}
}
async function upsertInvoiceCloud(inv){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const vehicleCloudId = await resolveCloudId('vehicles', inv.vehicleId, upsertVehicleCloud);
    const vehicle = (db.vehicles||[]).find(x=>x.id===inv.vehicleId);
    const customerLocalId = inv.customerId || vehicle?.customerId;
    const customerCloudId = await resolveCloudId('customers', customerLocalId, upsertCustomerCloud);
    const net = Number(inv.net||0), total = Number(inv.total||0);
    const syncedAt = syncTimestamp(inv);
    const row={
      company_id:inv.companyId||'de', customer_id:customerCloudId, vehicle_id:vehicleCloudId,
      invoice_number:inv.number||'', status:inv.paid?'paid':'open',
      issue_date:inv.date||new Date().toISOString().slice(0,10),
      subtotal:net, tax_amount:Math.max(total-net,0), total_amount:total,
      paid_amount: inv.paid?total:0,
      metadata:{type:inv.type||'Rechnung', parts:Number(inv.parts||0), labor:Number(inv.labor||0), discount:Number(inv.discount||0), taxPercent:Number(inv.tax||19), payment:inv.payment||'', repairLocalId:inv.repairId||'', lines:inv.lines||[]},
      updated_at: syncedAt
    };
    if(inv.cloudId){
      const {error}=await sb.from('invoices').update(row).eq('id',inv.cloudId);
      if(error){ console.warn('upsertInvoice',error.message); markSyncError(inv,error.message); } else { inv.updatedAt=syncedAt; markSyncOk(inv); }
    } else {
      const {data,error}=await sb.from('invoices').insert(row).select('id').single();
      if(!error&&data?.id){ inv.cloudId=data.id; inv.updatedAt=syncedAt; markSyncOk(inv); save(); }
      else if(error){ console.warn('upsertInvoice',error.message); markSyncError(inv,error.message); }
    }
  }catch(e){console.warn(e); markSyncError(inv,e.message)}
}
async function upsertExpenseCloud(x){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const syncedAt = syncTimestamp(x);
    const row={company_id:x.companyId||'de',category:x.category||'',description:x.note||x.description||'',expense_date:x.date||new Date().toISOString().slice(0,10),net_amount:Number(x.amount||0),tax_amount:0,total_amount:Number(x.amount||0),notes:x.note||'',updated_at:syncedAt};
    if(x.cloudId){
      const {error}=await sb.from('expenses').update(row).eq('id',x.cloudId);
      if(error){ console.warn('upsertExpense',error.message); markSyncError(x,error.message); } else { x.updatedAt=syncedAt; markSyncOk(x); }
    } else {
      const {data,error}=await sb.from('expenses').insert(row).select('id').single();
      if(!error&&data?.id){ x.cloudId=data.id; x.updatedAt=syncedAt; markSyncOk(x); save(); }
      else if(error){ console.warn('upsertExpense',error.message); markSyncError(x,error.message); }
    }
  }catch(e){console.warn(e); markSyncError(x,e.message)}
}
async function loadExpensesFromCloud(){
  try{
    const sb=window.supabaseClient; if(!sb) return false;
    const {data,error}=await cloudCompanyFilter(sb.from('expenses').select('*'));
    if(error||!Array.isArray(data)||!data.length) return false;
    const localWon = mergeByCompany('expenses', data.map(r=>({
      id:'ex_cloud_'+r.id, cloudId:r.id, companyId:r.company_id||'de',
      category:r.category||'', note:r.notes||r.description||'', date:r.expense_date||'',
      amount:Number(r.total_amount||0), updatedAt:r.updated_at||''
    })));
    repushLocalWinners(localWon, upsertExpenseCloud);
    return true;
  }catch(e){console.warn(e);return false}
}
/* Network-recovery fix (2026-11-09): a record saved while the cloud
   was unreachable gets its upsert call's rejection recorded via
   markSyncError (syncError set, cloudId stays unset) -- but nothing
   ever retried it afterward. syncAllCloud() only ever *pulled* from
   the cloud; reconnecting (even logging back in) did not re-push a
   single locally-pending change. Found by actually simulating a
   blocked connection, creating/editing a record, restoring the
   connection, and watching it stay unsynced -- not by code reading.
   Fixed by retrying every record (in the current company) that has
   no cloudId yet or still carries a syncError, using the exact same
   upsert function a normal save would call, before the usual pull. */
function cloudSyncTables(){
  return [
    ['customers', upsertCustomerCloud], ['vehicles', upsertVehicleCloud],
    ['purchases', upsertPurchaseCloud], ['inventory', upsertInventoryCloud],
    ['expenses', upsertExpenseCloud], ['repairs', upsertRepairCloud],
    ['appointments', upsertAppointmentCloud], ['invoices', upsertInvoiceCloud]
  ];
}
// Mobile root-cause fix (2026-11-12): this used to retry EVERY pending
// record on EVERY trigger (online, tab-visible, every 5 minutes) with no
// exceptions -- harmless for a transient network blip, but for a
// company/auth-category rejection (no valid session, or no membership
// for this workshop), no amount of silent automatic retrying can ever
// succeed; it would just re-send the identical doomed request forever.
// Automatic triggers now skip a record stuck on a company/auth error --
// only an explicit user action (the "retry now" button on that record,
// or "sync now" after actually signing back in) retries those, via
// `manual:true`.
async function retryPendingCloud(manual){
  const companyId = session && session.company && session.company.id;
  if(!companyId) return;
  for(const [table, fn] of cloudSyncTables()){
    const pending = (db[table]||[]).filter(x => x.companyId===companyId && (!x.cloudId || x.syncError));
    const toRetry = manual ? pending : pending.filter(x => !['company','auth'].includes(classifySyncError(x.syncError)));
    await Promise.all(toRetry.map(rec => fn(rec).catch(e => console.warn('retryPendingCloud', table, e))));
  }
}
// Mobile sync-diagnosis bugfix (2026-11-12): a bare "pending" badge on
// every row told the user THAT something was wrong but never WHY, and
// never distinguished "never linked on this device" from "signed in but
// this identity has no access to this workshop" from "a genuine network
// problem" from "a server-side data error" -- all of which need a
// different action, and none of which the user could previously tell
// apart. Classifies the last recorded error's TEXT (Postgres/PostgREST
// error messages -- never a secret, key, or token) into a category.
function classifySyncError(message){
  if(!message) return null;
  const m=String(message).toLowerCase();
  if(m.includes('row-level security') || m.includes('rls')) return 'company';
  if(m.includes('invalid login credentials') || m.includes('jwt') || m.includes('refresh_token') || m.includes('session') || m.includes('user_not_found')) return 'auth';
  if(m.includes('failed to fetch') || m.includes('network') || m.includes('timeout') || m.includes('timed out')) return 'network';
  if(m.includes('date/time') || m.includes('invalid input syntax') || m.includes('column') || m.includes('constraint') || m.includes('violates')) return 'data';
  return 'unknown';
}
// One structured snapshot of "why isn't this device's data in the
// cloud" -- online/config/link/auth/company/pending/last-error, each a
// SEPARATE signal (never collapsed into one generic status), so the UI
// can name the actual blocker instead of a silent/perpetual spinner.
// Read-only; never changes anything, never exposes a key/token/password.
function cloudDiagnostics(){
  const companyId = session && session.company && session.company.id;
  const pending = pendingSyncCount();
  const lastErr = db && db.settings && db.settings.lastSyncError;
  const lastErrCategory = lastErr ? classifySyncError(lastErr.message) : null;
  const authError = db && db.settings && db.settings.cloudAuthError;
  let status;
  if(typeof navigator!=='undefined' && navigator.onLine===false) status='offline';
  // Login-unification (2026-11-13): 'not-linked'/'auth-failed' no longer
  // exist as distinct states -- being logged in at all now means the
  // cloud sign-in already succeeded (see app.js's completeLogin()), so
  // db.settings.cloudAuthError is only ever '' or 'session-expired'.
  else if(authError==='session-expired') status='session-expired';
  else if(lastErrCategory==='company') status='no-company-access';
  else if(lastErrCategory==='network') status='network';
  else if(lastErrCategory==='data') status='data-error';
  else if(pending>0) status='pending';
  else status='ok';
  return {
    status, online: typeof navigator!=='undefined' ? navigator.onLine!==false : true,
    companyId: companyId||null, pendingCount: pending,
    lastError: lastErr ? {message:lastErr.message, category:lastErrCategory, at:lastErr.at} : null,
    checkedAt: new Date().toISOString()
  };
}
// Cross-device sync bugfix (2026-11-12): how many of THIS company's
// records have never reached the cloud (no cloudId yet) or are sitting
// on a recorded error (syncError) -- the dashboard surfaces this count
// so "saved" never silently means "saved locally only" with no visible
// trace. Read-only; never changes anything.
function pendingSyncCount(){
  const companyId = session && session.company && session.company.id;
  if(!companyId) return 0;
  let n=0;
  for(const [table] of cloudSyncTables()){
    n += (db[table]||[]).filter(x => x.companyId===companyId && (!x.cloudId || x.syncError)).length;
  }
  return n;
}
let _cloudSyncInFlight=null;
// `manual:true` (the user's own "sync now" / post-relink retry) also
// retries records stuck on a company/auth error -- the automatic
// triggers below never pass it, so they can never hammer a persistently
// -rejected request (see retryPendingCloud's own comment).
function syncAllCloud(manual){
  // Never run two full sync passes at once (e.g. the 'online' handler
  // and a visibility-change refresh firing close together) -- share the
  // one in-flight promise instead of racing duplicate pushes.
  if(_cloudSyncInFlight) return _cloudSyncInFlight;
  /* Customers and vehicles must land first -- repairs, appointments
     and invoices resolve their relations against db.customers /
     db.vehicles while loading, so those two load sequentially before
     everything else (which has no inter-dependencies among itself). */
  _cloudSyncInFlight = retryPendingCloud(manual)
    .then(()=>loadCustomersFromCloud())
    .then(()=>loadVehiclesFromCloud())
    .then(()=>Promise.all([
      loadPurchasesFromCloud(), loadInventoryFromCloud(), loadExpensesFromCloud(),
      loadRepairsFromCloud(), loadAppointmentsFromCloud(), loadInvoicesFromCloud()
    ]))
    .then(function(ok){
      if(db && db.settings) db.settings.lastCloudSync=new Date().toISOString();
      save();
      return ok;
    })
    .finally(()=>{ _cloudSyncInFlight=null; });
  return _cloudSyncInFlight;
}
// Cross-device sync bugfix (2026-11-12): previously the ONLY things that
// ever triggered a sync pass were login and switching the active
// company -- a tab left open for a long shift never saw what a
// colleague on another device added, and a save made while offline only
// got pushed again on the NEXT full login, not as soon as the network
// actually came back. Three triggers now cover "fetch on open" (already
// true via login), "fetch on return to the app", and "push the moment
// connectivity returns": `online`, the tab becoming visible again, and a
// light periodic refresh while the tab stays open and visible. All three
// share the same in-flight guard above, so they can never pile up.
if(typeof window!=='undefined' && typeof window.addEventListener==='function'){
  window.addEventListener('online', ()=>{ if(typeof session!=='undefined' && session) syncAllCloud().then(()=>{ if(typeof render==='function') render(); }); });
  if(typeof document!=='undefined' && typeof document.addEventListener==='function'){
    document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState==='visible' && typeof session!=='undefined' && session){
        syncAllCloud().then(()=>{ if(typeof render==='function') render(); });
      }
    });
  }
  setInterval(()=>{
    if(typeof session!=='undefined' && session && typeof document!=='undefined' && document.visibilityState==='visible'){
      syncAllCloud().then(()=>{ if(typeof render==='function') render(); });
    }
  }, 5*60*1000);
}
