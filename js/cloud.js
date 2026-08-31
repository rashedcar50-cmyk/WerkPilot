/* BayMeister cloud (Supabase) */
/* ===== Supabase data layer (purchases أولاً) ===== */
async function sbReady(){
  return !!(window.supabaseClient);
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
    mergeByCompany('purchases', data.map(r => ({
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
    return true;
  }catch(e){ console.warn(e); return false; }
}

async function upsertPurchaseCloud(p){
  try{
    const sb = window.supabaseClient;
    if(!sb) return;
    const row = {
      // company_id في قاعدة البيانات bigint FK — نتركه null مؤقتاً لتجنب خطأ المفتاح الأجنبي
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
      receipt_url: p.receipt_url || ''
    };
    // إذا id رقمي من السحابة نحدّث، وإلا ندرج صف جديد
    let error;
    if(p.cloudId){
      ({ error } = await sb.from('purchases').update(row).eq('id', p.cloudId));
    } else {
      const res = await sb.from('purchases').insert(row).select('id').single();
      error = res.error;
      if(res.data?.id){
        p.cloudId = res.data.id;
        // حدّث النسخة المحلية بالـ cloudId
        const local = db.purchases.find(x => x.id === p.id);
        if(local) local.cloudId = res.data.id;
        save();
      }
    }
    if(error) console.warn('upsertPurchase', error.message);
  }catch(e){ console.warn(e); }
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
    if(mapped.length){ mergeByCompany('customers', mapped); return true; }
  }catch(e){console.warn(e)}
  return false;
}
async function upsertCustomerCloud(c){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const row={name:c.name||'',phone:c.phone||'',email:c.email||'',address:c.address||'',company_id:c.companyId||session?.company?.id||'de'};
    if(c.cloudId){ await sb.from('customers').update(row).eq('id',c.cloudId); }
    else {
      const {data,error}=await sb.from('customers').insert(row).select('id').single();
      if(!error && data?.id){ c.cloudId=data.id; save(); }
    }
  }catch(e){console.warn(e)}
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
    if(mapped.length){ mergeByCompany('inventory', mapped); return true; }
  }catch(e){console.warn(e)}
  return false;
}
async function upsertInventoryCloud(item){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const row={sku:item.sku||'',name:item.name||'',qty:Number(item.qty||0),buy:Number(item.buy||0),sell:Number(item.sell||0),company_id:item.companyId||session?.company?.id||'de'};
    if(item.cloudId){ await sb.from('inventory').update(row).eq('id',item.cloudId); }
    else {
      const {data,error}=await sb.from('inventory').insert(row).select('id').single();
      if(!error && data?.id){ item.cloudId=data.id; save(); }
    }
  }catch(e){console.warn(e)}
}

async function loadVehiclesFromCloud(){
  try{
    const sb=window.supabaseClient; if(!sb) return false;
    const {data,error}=await cloudCompanyFilter(sb.from('vehicles').select('*'));
    if(error||!Array.isArray(data)||!data.length) return false;
    mergeByCompany('vehicles', data.map(r=>({
      id:'v_cloud_'+r.id, cloudId:r.id, companyId:r.company_id||'de',
      customerId:r.customer_id||'', plate:r.plate||'', vin:r.vin||'',
      make:r.make||'', model:r.model||'', year:r.year||'', engine:r.engine||'',
      paint:r.paint||'', km:r.km||0, nextServiceKm:r.next_service_km||0, photo:r.photo||''
    })));
    return true;
  }catch(e){console.warn(e);return false}
}
async function upsertVehicleCloud(v){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const row={company_id:v.companyId||'de',customer_id:v.customerId||'',plate:v.plate||'',vin:v.vin||'',make:v.make||'',model:v.model||'',year:String(v.year||''),engine:v.engine||'',paint:v.paint||'',km:Number(v.km||0),next_service_km:Number(v.nextServiceKm||0),photo:(v.photo&&v.photo.length<180000)?v.photo:''};
    if(v.cloudId){ await sb.from('vehicles').update(row).eq('id',v.cloudId); }
    else { const {data,error}=await sb.from('vehicles').insert(row).select('id').single(); if(!error&&data?.id){v.cloudId=data.id;save();} }
  }catch(e){console.warn(e)}
}
async function loadRepairsFromCloud(){
  try{
    const sb=window.supabaseClient; if(!sb) return false;
    const {data,error}=await cloudCompanyFilter(sb.from('repairs').select('*'));
    if(error||!Array.isArray(data)||!data.length) return false;
    mergeByCompany('repairs', data.map(r=>({
      id:'r_cloud_'+r.id, cloudId:r.id, companyId:r.company_id||'de', vehicleId:r.vehicle_id||'',
      description:r.description||'', complaint:r.complaint||'', tech:r.tech||'', hours:r.hours||0,
      status:r.status||'استلام', km:r.km||'', fuel:r.fuel||'', date:r.repair_date||'',
      jobs: r.jobs? (typeof r.jobs==='string'? JSON.parse(r.jobs||'[]'):r.jobs):[],
      parts: r.parts? (typeof r.parts==='string'? JSON.parse(r.parts||'[]'):r.parts):[],
      photos: r.photos? (typeof r.photos==='string'? JSON.parse(r.photos||'[]'):r.photos):[]
    })));
    return true;
  }catch(e){console.warn(e);return false}
}
async function upsertRepairCloud(r){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const row={company_id:r.companyId||'de',vehicle_id:r.vehicleId||'',description:r.description||'',complaint:r.complaint||'',tech:r.tech||'',hours:Number(r.hours||0),status:r.status||'',km:Number(r.km||0)||null,fuel:r.fuel||'',jobs:JSON.stringify(r.jobs||[]),parts:JSON.stringify(r.parts||[]),photos:JSON.stringify((r.photos||[]).map(x=>({kind:x.kind,url:x.url}))),repair_date:r.date||new Date().toISOString().slice(0,10)};
    if(r.cloudId){ await sb.from('repairs').update(row).eq('id',r.cloudId); }
    else { const {data,error}=await sb.from('repairs').insert(row).select('id').single(); if(!error&&data?.id){r.cloudId=data.id;save();} }
  }catch(e){console.warn(e)}
}
async function loadAppointmentsFromCloud(){
  try{
    const sb=window.supabaseClient; if(!sb) return false;
    const {data,error}=await sb.from('appointments').select('*');
    if(error||!Array.isArray(data)||!data.length) return false;
    mergeByCompany('appointments', data.map(r=>({
      id:'ap_cloud_'+r.id, cloudId:r.id, companyId:r.company_id||'de',
      vehicleId:r.vehicle_id||'', customerId:r.customer_id||'',
      date:r.appt_date||'', time:r.appt_time||'', tech:r.tech||'', note:r.note||'', status:r.status||'',
      updatedAt:r.updated_at||r.appt_date||''
    })));
    return true;
  }catch(e){console.warn(e);return false}
}
async function upsertAppointmentCloud(a){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const row={company_id:a.companyId||'de',vehicle_id:a.vehicleId||'',customer_id:a.customerId||'',appt_date:a.date||null,appt_time:a.time||'',tech:a.tech||'',note:a.note||'',status:a.status||'مؤكد'};
    if(a.cloudId){ await sb.from('appointments').update(row).eq('id',a.cloudId); }
    else { const {data,error}=await sb.from('appointments').insert(row).select('id').single(); if(!error&&data?.id){a.cloudId=data.id;save();} }
  }catch(e){console.warn(e)}
}
async function loadInvoicesFromCloud(){
  try{
    const sb=window.supabaseClient; if(!sb) return false;
    const {data,error}=await cloudCompanyFilter(sb.from('invoices').select('*'));
    if(error||!Array.isArray(data)||!data.length) return false;
    mergeByCompany('invoices', data.map(r=>({
      id:'i_cloud_'+r.id, cloudId:r.id, companyId:r.company_id||'de', vehicleId:r.vehicle_id||'',
      repairId:r.repair_id||'', number:r.number||'', type:r.type||'فاتورة',
      parts:r.parts||0, labor:r.labor||0, discount:r.discount||0, tax:r.tax||19,
      net:r.net||0, total:r.total||0, payment:r.payment||'', paid:!!r.paid,
      date:r.issued_at||'', updatedAt:r.updated_at||r.issued_at||'', lines: r.lines? (typeof r.lines==='string'?JSON.parse(r.lines||'[]'):r.lines):[]
    })));
    return true;
  }catch(e){console.warn(e);return false}
}
async function upsertInvoiceCloud(inv){
  try{
    const sb=window.supabaseClient; if(!sb) return;
    const row={company_id:inv.companyId||'de',vehicle_id:inv.vehicleId||'',repair_id:inv.repairId||'',number:inv.number||'',type:inv.type||'',parts:Number(inv.parts||0),labor:Number(inv.labor||0),discount:Number(inv.discount||0),tax:Number(inv.tax||19),net:Number(inv.net||0),total:Number(inv.total||0),payment:inv.payment||'',paid:!!inv.paid,lines:JSON.stringify(inv.lines||[])};
    if(inv.cloudId){ await sb.from('invoices').update(row).eq('id',inv.cloudId); }
    else { const {data,error}=await sb.from('invoices').insert(row).select('id').single(); if(!error&&data?.id){inv.cloudId=data.id;save();} }
  }catch(e){console.warn(e)}
}
function syncAllCloud(){
  return Promise.all([
    loadPurchasesFromCloud(), loadCustomersFromCloud(), loadInventoryFromCloud(),
    loadVehiclesFromCloud(), loadRepairsFromCloud(), loadAppointmentsFromCloud(), loadInvoicesFromCloud()
  ]).then(function(ok){
    if(db && db.settings) db.settings.lastCloudSync=new Date().toISOString();
    save();
    return ok;
  });
}
