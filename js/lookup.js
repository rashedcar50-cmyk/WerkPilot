/* BayMeister VIN / KBA / DistriAuto */
function vehicleOf(vid){return (db.vehicles||[]).find(x=>x.id===vid)}
function customerOf(cid){return (db.customers||[]).find(c=>c.id===cid)}
function customerOfVehicle(vid){
  const v=vehicleOf(vid);
  if(v && v.customerId) return customerOf(v.customerId);
  return null;
}
window.vehicleOf=vehicleOf;
window.customerOf=customerOf;
window.customerOfVehicle=customerOfVehicle;
function cleanVin(v){return String(v||'').replace(/[^A-HJ-NPR-Z0-9]/gi,'').toUpperCase()}
function vinModelYear(vin){
  const c=(vin||'')[9];
  const map={A:2010,B:2011,C:2012,D:2013,E:2014,F:2015,G:2016,H:2017,J:2018,K:2019,L:2020,M:2021,N:2022,P:2023,R:2024,S:2025,T:2026,V:2027,W:2028,X:2029,Y:2030,1:2001,2:2002,3:2003,4:2004,5:2005,6:2006,7:2007,8:2008,9:2009};
  return map[c]||'';
}
function vinMakeFromWmi(vin){
  const w=(vin||'').slice(0,3);
  const map={WVW:'Volkswagen',WV1:'Volkswagen',WV2:'Volkswagen',WVG:'Volkswagen',WAU:'Audi',WUA:'Audi',TRU:'Audi',WBA:'BMW',WBS:'BMW',WBY:'BMW',WDB:'Mercedes-Benz',WDD:'Mercedes-Benz',WDF:'Mercedes-Benz',W1K:'Mercedes-Benz',W1N:'Mercedes-Benz',TMB:'Skoda',TMK:'Skoda',VSS:'Seat',WF0:'Ford',WFO:'Ford',W0L:'Opel',W0V:'Opel',VF1:'Renault',VF3:'Peugeot',VF7:'Citroen',ZFA:'Fiat',ZFF:'Ferrari',JHM:'Honda',JH4:'Acura',KM8:'Hyundai',KMH:'Hyundai',KNA:'Kia',KND:'Kia',NMT:'Toyota',SB1:'Toyota',JF1:'Subaru',YS3:'Saab',YS2:'Scania',XLR:'DAF',WMA:'MAN',WDA:'Daimler',SAL:'Land Rover',SAJ:'Jaguar',YV1:'Volvo',YV2:'Volvo'};
  return map[w]||'';
}
function pickVinVal(v){
  v=String(v||'').trim();
  if(!v || /^0+$/.test(v) || /not applicable|undefined|null|nicht zutreffend/i.test(v)) return '';
  return v;
}
async function lookupVinNhtsa(vin){
  const out={};
  try{
    const res=await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/'+encodeURIComponent(vin)+'?format=json');
    if(!res.ok) return out;
    const data=await res.json();
    const bag={};
    (data.Results||[]).forEach(x=>{ if(x.Variable) bag[x.Variable]=pickVinVal(x.Value); });
    out.make=bag.Make||bag.Manufacturer||'';
    out.model=bag.Model||bag.Series||bag.Trim||bag['Series2']||'';
    out.year=bag['Model Year']||'';
    out.engine=pickVinVal(bag['Engine Model']||bag['Engine Configuration']||'');
    if(bag.DisplacementL) out.engine=(out.engine?out.engine+' ':'')+bag.DisplacementL+'L';
    if(bag['Turbo']) out.engine=(out.engine+' '+bag['Turbo']).trim();
    out.fuel_type=bag['Fuel Type - Primary']||bag['Fuel Type - Alternate']||'';
    out.engine_power_kw=bag['Engine Power (KW)']||'';
    out.engine_displacement_cm3=bag['Displacement (CC)']||(bag['Displacement (L)']?Math.round(Number(bag['Displacement (L)'])*1000):'')||(bag.DisplacementL?Math.round(Number(bag.DisplacementL)*1000):'');
    out.body=bag['Body Class']||'';
    out.cylinders=bag['Engine Number of Cylinders']||'';
  }catch(e){}
  return out;
}
async function lookupVinEdge(vin){
  const out={};
  try{
    const res=await fetch('https://carchecktools.com/api/v1/decode-vin?vin='+encodeURIComponent(vin));
    if(!res.ok) return out;
    const j=await res.json();
    const d=j.data||j.result||j.vehicle||j;
    out.make=pickVinVal(d.make||d.Make);
    out.model=pickVinVal(d.model||d.Model);
    out.year=pickVinVal(d.year||d.modelYear||d.ModelYear);
    out.engine=pickVinVal(d.engine||d.engineModel||d.Engine);
    out.fuel_type=pickVinVal(d.fuel||d.fuelType||d.FuelType);
    out.engine_power_kw=pickVinVal(d.engineKW||d.kw||d.power_kw);
    const cc=d.displacementCC||d.displacement_cc||d.engine_displacement_cm3;
    const liters=d.displacementL||d.displacement_l;
    out.engine_displacement_cm3=pickVinVal(cc)||(liters?String(Math.round(Number(liters)*1000)):'');
    if(liters && !out.engine) out.engine=Number(liters).toFixed(1)+'L';
    out.body=pickVinVal(d.body||d.bodyClass);
  }catch(e){}
  return out;
}
async function sha1hex(s){
  const buf=await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function vagModelFromVin(vin){
  const w=vin.slice(0,3), code=vin.slice(6,8);
  if(!/^(WVW|WV1|WV2|WVG|WAU|WUA|TRU|TMB|TMK|VSS)$/.test(w)) return '';
  const map={'1J':'Golf IV / Bora','1K':'Golf V / Jetta','5K':'Golf VI','5G':'Golf VII','CD':'Golf VIII','6R':'Polo','6C':'Polo','AW':'Polo','9N':'Polo','3C':'Passat B6/B7','3G':'Passat B8','7L':'Touareg','7P':'Touareg','5N':'Tiguan','AD':'Tiguan','5T':'Touran','1T':'Touran','7H':'T5','7E':'T5/T6','SH':'T6.1','8P':'A3 8P','8V':'A3 8V','8Y':'A3 8Y','8E':'A4 B6/B7','8K':'A4 B8','8W':'A4 B9','4B':'A6 C5','4F':'A6 C6','4G':'A6 C7','4K':'A6 C8','4L':'Q7','8U':'Q3','8R':'Q5','1Z':'Octavia II','5E':'Octavia III','NE':'Octavia IV','5J':'Fabia II','NJ':'Fabia III'};
  return map[code]||'';
}
async function lookupVinVincario(vin){
  const key=(db.settings.vincarioKey||'').trim();
  const secret=(db.settings.vincarioSecret||'').trim();
  if(!key||!secret) return {};
  try{
    const sum=(await sha1hex(vin+'|decode|'+key+'|'+secret)).slice(0,10);
    const url='https://api.vincario.com/3.2/'+encodeURIComponent(key)+'/'+sum+'/decode/'+vin+'.json';
    const res=await fetch(url);
    if(!res.ok) return {};
    const j=await res.json();
    const bag={};
    (j.decode||j.data||[]).forEach(x=>{
      const label=String(x.label||x.key||'').toLowerCase();
      const val=pickVinVal(x.value);
      if(label&&val) bag[label]=val;
    });
    const g=k=>bag[k]||'';
    return {
      make:g('make')||g('manufacturer'),
      model:g('model')||g('series'),
      year:g('model year')||g('year'),
      engine:g('engine code')||g('engine')||g('engine model'),
      fuel_type:g('fuel type')||g('fuel'),
      engine_power_kw:(g('engine power (kw)')||g('power kw')||g('engine power')).replace(/[^\d.]/g,''),
      engine_displacement_cm3:(g('engine displacement (ccm)')||g('displacement si')||g('engine displacement')).replace(/[^\d]/g,''),
      body:g('body')||g('body type'),
      paint:g('color')||g('colour')||''
    };
  }catch(e){ return {}; }
}
async function lookupVin(vin){
  vin=cleanVin(vin);
  if(vin.length!==17) throw new Error(typeof t==='function'?t('vinNeed17'):'VIN 17');
  const [vinc,a,b]=await Promise.all([lookupVinVincario(vin), lookupVinNhtsa(vin), lookupVinEdge(vin)]);
  const merge=(k)=>pickVinVal(vinc[k])||pickVinVal(a[k])||pickVinVal(b[k])||'';
  let make=merge('make')||vinMakeFromWmi(vin);
  let model=merge('model')||vagModelFromVin(vin);
  let year=merge('year')||vinModelYear(vin);
  let engine=merge('engine');
  let cc=merge('engine_displacement_cm3');
  if(!engine && cc) engine=(Number(cc)/1000).toFixed(1)+'L'+(merge('cylinders')?(' '+merge('cylinders')+'Zyl.'):'');
  if(!cc && engine && /(\d(?:\.\d)?)\s*L/i.test(engine)) cc=String(Math.round(parseFloat(RegExp.$1)*1000));
  const info={
    vin, make, model, year, engine,
    fuel_type: merge('fuel_type'),
    engine_power_kw: merge('engine_power_kw'),
    engine_displacement_cm3: cc,
    body: merge('body'),
    paint: merge('paint')
  };
  if(!make && !model && !year) throw new Error(typeof t==='function'?t('vinFail'):'VIN');
  return info;
}
function fillVinFields(info, ids){
  const set=(id,val)=>{ const el=$(id); if(el && val) el.value=val; };
  if(ids.vin){ const el=$(ids.vin); if(el) el.value=info.vin; }
  set(ids.make, info.make);
  set(ids.model, info.model);
  set(ids.year, info.year);
  if(ids.cc) set(ids.cc, info.engine_displacement_cm3);
  if(ids.fuel) set(ids.fuel, info.fuel_type);
  if(ids.kw) set(ids.kw, info.engine_power_kw);
  if(ids.en) set(ids.en, info.engine);
  if(ids.pa && info.paint) set(ids.pa, info.paint);
}
function openDistriAutoVin(vin){
  vin=cleanVin(vin);
  const url=vin
    ? 'https://www.distriauto.de/teile-auto/suche?q='+encodeURIComponent(vin)
    : 'https://www.distriauto.de/';
  window.open(url,'_blank');
}
function bindVinEnter(inputId, ids){
  const el=$(inputId); if(!el) return;
  el.placeholder=el.placeholder||(typeof t==='function'?t('vinLbl'):'VIN');
  el.addEventListener('keydown', async ev=>{
    if(ev.key!=='Enter') return;
    ev.preventDefault();
    const vin=cleanVin(el.value);
    el.value=vin;
    if(vin.length!==17) return toast(t('vinNeed17'));
    if(/^\d+$/.test(vin) || /^1234567890/.test(vin) || /[IOQ]/.test(vin)) return toast(t('vinBad')||'FIN ungültig');
    toast(t('fetchingCar'));
    try{
      const info=await lookupVin(vin);
      fillVinFields(info, ids);
      const miss=[];
      if(!info.model) miss.push(t('missModel'));
      if(!info.engine) miss.push(t('missEngine'));
      if(!info.engine_displacement_cm3) miss.push(t('missCc'));
      toast(((info.make||'')+' '+(info.model||'')+' '+(info.year||'')+(info.engine_displacement_cm3?(' · '+info.engine_displacement_cm3+' cm³'):'')+(info.engine?(' · '+info.engine):'')).trim()+(miss.length?(' — '+miss.join(', ')):'') );
      openDistriAutoVin(vin);
     }catch(e){ toast(e.message||t('vinFail')); }
  });
}
const HSN_MAKE={
'0005':'BMW','0575':'BMW','7909':'BMW','0588':'Audi','0590':'Audi','0591':'Audi','7967':'Audi','0603':'Volkswagen','0604':'Volkswagen','1313':'Mercedes-Benz','0710':'Mercedes-Benz','0999':'Mercedes-Benz','8008':'Skoda','8040':'Skoda','7593':'SEAT','7315':'SEAT','0035':'Opel','0039':'Ford','8566':'Ford','5013':'Toyota','8252':'Hyundai','8253':'Kia','7107':'Renault','4136':'Peugeot','3004':'Citroen','0583':'Porsche','0606':'MAN','0600':'Smart'
};
function lookupKbaLocal(hsn,tsn){
  hsn=String(hsn||'').replace(/\D/g,'').padStart(4,'0');
  tsn=String(tsn||'').trim().toUpperCase();
  return {hsn,tsn,kba:(hsn+' '+tsn).trim(),make:HSN_MAKE[hsn]||''};
}
function parseHsnTsnHtml(html, hsn, tsn){
  const key=(hsn+'/'+tsn).toUpperCase();
  const text=String(html||'').replace(/\s+/g,' ');
  const re=new RegExp(key.replace('/','\\/')+'[\\s\\S]{0,280}','i');
  const chunk=(text.match(re)||[text])[0];
  const model=(chunk.match(/>([A-Z][^<]{8,80})</)||chunk.match(/([A-Za-z][A-Za-z0-9 .\/+-]{6,80}\d\.\d[^<]{0,40})/)||[])[1]||'';
  const kw=(chunk.match(/(\d+)\s*kW/i)||[])[1]||'';
  const cc=(chunk.match(/(\d{3,5})\s*ccm/i)||[])[1]||'';
  const fuel=(/Diesel/i.test(chunk)?'Diesel':(/Benzin|Otto/i.test(chunk)?'Benzin':(/Elektro/i.test(chunk)?'Elektro':(/Hybrid/i.test(chunk)?'Hybrid':''))));
  const clean=String(model).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
  return {model:clean, engine_power_kw:kw, engine_displacement_cm3:cc, fuel_type:fuel};
}
async function fetchText(url){
  const ctrl=new AbortController();
  const t=setTimeout(()=>ctrl.abort(),8000);
  try{
    const res=await fetch(url,{signal:ctrl.signal});
    clearTimeout(t);
    if(!res.ok) return '';
    return await res.text();
  }catch(e){ clearTimeout(t); return ''; }
}
function parseFahrzeugdaten(html, fallbackMake){
  const title=(String(html).match(/<title>([^<]+)/i)||html.match(/^Title[:\s]+(.+)$/mi)||[])[1]||'';
  const clean=title.replace(/\s*\|\s*HSN.*$/i,'').replace(/\s+/g,' ').trim();
  const parts=clean.split(/\s+/);
  let make=fallbackMake, model=clean;
  if(parts.length>=2){ make=parts[0]; model=parts.slice(1).join(' '); }
  const kw=(html.match(/(\d+)\s*k\s*w/i)||html.match(/Leistung[^0-9]{0,40}(\d+)/i)||[])[1]||'';
  const cc=(html.match(/Hubraum[^0-9]{0,80}(\d{3,5})/i)||html.match(/(\d{3,5})\s*ccm/i)||[])[1]||'';
  const year=(html.match(/(20\d{2})\s*[–-]\s*(20\d{2}|heute)/i)||html.match(/ab\s+(20\d{2})/i)||[])[1]||'';
  const fuel=/Diesel/i.test(html)?'Diesel':(/Elektro/i.test(html)?'Elektro':(/Hybrid/i.test(html)?'Hybrid':(/Benzin|Otto/i.test(html)?'Benzin':'')));
  return {make, model:String(model).replace(/,/g,' ').replace(/\s+/g,' ').trim(), engine_power_kw:kw, engine_displacement_cm3:cc, year, fuel_type:fuel};
}
function mapKbaFuel(code){
  const m={'1':'Benzin','2':'Diesel','3':'LPG','4':'Elektro','5':'Hybrid','6':'Wasserstoff','7':'Erdgas/CNG','8':'Ethanol','9':'Andere'};
  const c=String(code||'').trim();
  return m[c]||c;
}
async function lookupEasyWerkstatt(hsn,tsn){
  const urls=[
    'https://api.easywerkstatt.com/app/hsnTsn/'+hsn+'/'+tsn,
    'https://api.staging.easywerkstatt.com/app/hsnTsn/'+hsn+'/'+tsn
  ];
  for(const url of urls){
    try{
      const res=await fetch(url);
      if(!res.ok) continue;
      const j=await res.json();
      if(!j || (!j.brand && !j.modelName && !j.kbaBrand)) continue;
      const model=String(j.modelName||'').replace(/,/g,' ').replace(/\s+/g,' ').trim();
      const year=(j.tsnDate||'').slice(0,4);
      return {
        hsn:j.hsn||hsn, tsn:j.tsn||tsn, kba:(hsn+' '+tsn),
        make:j.brand||j.kbaBrand||'',
        model,
        year,
        engine_power_kw:j.powerKw||'',
        engine_displacement_cm3:j.ccm||'',
        fuel_type:mapKbaFuel(j.fuelCode),
        vehicleClass:j.vehicleClass||'',
        maxWeight:j.maxWeight||'',
        seats:j.seats||'',
        source:'easyWerkstatt'
      };
    }catch(e){}
  }
  return null;
}
async function lookupKbaFree(hsn,tsn){
  hsn=String(hsn||'').replace(/\D/g,'').padStart(4,'0');
  tsn=String(tsn||'').trim().toUpperCase();
  const local=lookupKbaLocal(hsn,tsn);
  const ew=await lookupEasyWerkstatt(hsn,tsn);
  if(ew && (ew.model||ew.engine_power_kw||ew.make)) return Object.assign({},local,ew);
  return local;
}
function bindKbaEnter(hsnId,tsnId,fillIds){
  const run=async()=>{
    const hsn=$(hsnId)?.value.trim();
    const tsn=$(tsnId)?.value.trim();
    if(!hsn||hsn.length<4||!tsn) return toast(t('hsnNeed'));
    toast(t('fetchingKba'));
    const info=await lookupKbaFree(hsn,tsn);
    const set=(id,val)=>{ const el=$(id); if(el && val) el.value=val; };
    set(fillIds.make, info.make);
    set(fillIds.model, info.model);
    set(fillIds.year, info.year);
    set(fillIds.kw, info.engine_power_kw);
    set(fillIds.cc, info.engine_displacement_cm3);
    set(fillIds.fuel, info.fuel_type);
    set(fillIds.seats, info.seats);
    set(fillIds.weight, info.maxWeight);
    set(fillIds.klass, info.vehicleClass);
    if(info.model || info.engine_power_kw) toast((info.make||'')+' '+(info.model||'')+(info.engine_displacement_cm3?(' · '+info.engine_displacement_cm3+' cm³'):'')+(info.engine_power_kw?(' · '+info.engine_power_kw+' kW'):''));
    else toast((info.make||'KBA')+' — '+t('kbaNoModel'));
  };
  const hEl=$(hsnId), tEl=$(tsnId);
  if(hEl){
    hEl.addEventListener('input',()=>{
      hEl.value=hEl.value.replace(/\D/g,'').slice(0,4);
      if(hEl.value.length===4 && tEl) tEl.focus();
    });
    hEl.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); if(hEl.value.length===4 && tEl) tEl.focus(); }});
  }
  if(tEl){
    tEl.addEventListener('input',()=>{
      tEl.value=tEl.value.replace(/[^A-Za-z0-9]/g,'').toUpperCase().slice(0,3);
      if(tEl.value.length===3) run();
    });
    tEl.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); run(); }});
  }
}
function nextInvoiceNumber(){
  const y=new Date().getFullYear();
  const w=workshop();
  w.invoiceSeq=Number(w.invoiceSeq||0)+1;
  save();
  const prefix=(session?.company?.id||'RE').toString().slice(0,4).toUpperCase();
  return 'RE-'+prefix+'-'+y+'-'+String(w.invoiceSeq).padStart(4,'0');
}
function nextAuftragNumber(){
  const y=new Date().getFullYear();
  const w=workshop();
  w.auftragSeq=Number(w.auftragSeq||0)+1;
  save();
  const prefix=(session?.company?.id||'AU').toString().slice(0,4).toUpperCase();
  return 'AU-'+prefix+'-'+y+'-'+String(w.auftragSeq).padStart(4,'0');
}
function lowStock(){
  return companyRows('inventory').filter(x=>Number(x.qty||0)<=Number(x.minQty||3));
}
function maintenanceDue(){
  return companyRows('vehicles').filter(v=>v.nextServiceKm && v.km && Number(v.km)>=Number(v.nextServiceKm)-1500);
}
function todayISO(){return new Date().toISOString().slice(0,10)}
function openRepairs(){
  return companyRows('repairs').filter(r=>typeof isOpenStatus==='function'?isOpenStatus(r.status):!['ready','delivered','done','closed'].includes(normStatus(r.status)));
}
function unpaidInvoices(){
  return companyRows('invoices').filter(x=>x.paid===false || (!x.paid && (!x.payment || x.payment==='غير محدد' || x.payment==='offen' || x.payment===t('payOpen'))));
}
function repairPartsTotal(r){
  return (r.parts||[]).reduce((s,p)=>s+Number(p.qty||0)*Number(p.price||0),0);
}
function repairLaborTotal(r){
  return Number(r.hours||0)*Number(workshop().hourlyRate||db.settings.hourlyRate||85);
}
function globalSearch(q){
  q=(q||'').trim().toLowerCase();
  if(!q) return {customers:[],vehicles:[],repairs:[],inventory:[]};
  const has=s=>String(s||'').toLowerCase().includes(q);
  return {
    customers: companyRows('customers').filter(c=>has(c.name)||has(c.phone)||has(c.email)),
    vehicles: companyRows('vehicles').filter(v=>has(v.plate)||has(v.vin)||has(v.make)||has(v.model)),
    repairs: companyRows('repairs').filter(r=>has(r.description)||has(r.status)||has(vehicleName(r.vehicleId))),
    inventory: companyRows('inventory').filter(i=>has(i.sku)||has(i.name))
  };
}
function consumePartsFromRepair(r){
  (r.parts||[]).forEach(p=>{
    if(p.consumed) return;
    const inv=db.inventory.find(x=>x.companyId===r.companyId && (x.sku===p.sku || x.name===p.name));
    if(inv){
      inv.qty=Math.max(0, Number(inv.qty||0)-Number(p.qty||0));
      upsertInventoryCloud(inv);
      p.consumed=true;
    }
  });
  save(); upsertRepairCloud(r);
}
async function uploadWorkshopFile(file, folder){
  const sb=window.supabaseClient;
  if(!sb || !file) return '';
  const name=(folder||'media')+'/'+Date.now()+'-'+(file.name||'img.jpg').replace(/[^a-zA-Z0-9._-]/g,'_');
  for(const bucket of ['workshop-media','purchase-receipts']){
    try{
      const {error}=await sb.storage.from(bucket).upload(name, file, {contentType:file.type||'image/jpeg', upsert:false});
      if(error) continue;
      const {data}=sb.storage.from(bucket).getPublicUrl(name);
      return data&&data.publicUrl||'';
    }catch(e){}
  }
  return '';
}

function createInvoiceAuto(payload){
  payload=payload||{};
  if(!session||!session.company) throw new Error('no-session');
  let lines=(payload.lines||[]).map(l=>({
    sku:String(l.sku||l.number||'').trim(),
    name:String(l.name||l.desc||l.beschreibung||'').trim(),
    qty:Number(l.qty||l.menge||1)||1,
    price:Number(l.price||l.preis||0)||0,
    tax:Number(l.tax||payload.tax||19)||19,
    kind:(l.kind==='labor'||l.kind==='Arbeitsleistung'||l.kind==='اجر'||l.kind==='أجور')?'labor':'parts'
  })).filter(l=>l.name||l.sku);
  if(!lines.length){
    if(Number(payload.parts)>0) lines.push({sku:'',name:'Ersatzteile',qty:1,price:Number(payload.parts),tax:19,kind:'parts'});
    if(Number(payload.labor)>0) lines.push({sku:'',name:'Arbeitswert',qty:1,price:Number(payload.labor),tax:19,kind:'labor'});
  }
  if(!lines.length) throw new Error('no-lines');
  const veh=payload.vehicleId && typeof vehicleOf==='function' ? vehicleOf(payload.vehicleId) : null;
  const custId=payload.customerId || (veh&&veh.customerId) || '';
  const parts=lines.filter(l=>l.kind!=='labor').reduce((s,l)=>s+l.qty*l.price,0);
  const labor=lines.filter(l=>l.kind==='labor').reduce((s,l)=>s+l.qty*l.price,0);
  const discount=Number(payload.discount||0)||0;
  const tax=Number(payload.tax||19)||19;
  const net=Math.max(0,parts+labor-discount);
  const total=Math.round(net*(1+tax/100)*100)/100;
  const inv={
    id:payload.id || (typeof id==='function'?id('i'):('i'+Date.now())),
    companyId:session.company.id,
    vehicleId:payload.vehicleId||'',
    customerId:custId,
    repairId:payload.repairId||'',
    estimateId:payload.estimateId||'',
    km:payload.km || (veh&&veh.km) || '',
    number:payload.number || nextInvoiceNumber(),
    type: (payload.type==='bar'||payload.type==='Barverkauf')?'Barverkauf':'Rechnung',
    parts:Math.round(parts*100)/100,
    labor:Math.round(labor*100)/100,
    discount, tax,
    net:Math.round(net*100)/100,
    total,
    payment:payload.payment||'open',
    paid:payload.paid===true || ['cash','card'].includes(payload.payment),
    date:payload.date || new Date().toISOString(),
    lines,
    auftrag:payload.auftrag||'',
    updatedAt:new Date().toISOString()
  };
  db.invoices=db.invoices||[];
  db.invoices.push(inv);
  try{ if(typeof archiveBeleg==='function') archiveBeleg(inv); }catch(e){}
  try{ if(typeof upsertInvoiceCloud==='function') upsertInvoiceCloud(inv); }catch(e){}
  db.journal=db.journal||[];
  db.journal.push({id:typeof id==='function'?id('j'):('j'+Date.now()),companyId:session.company.id,date:(typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10)),account:'Sales',debit:0,credit:total,note:inv.number});
  if(typeof audit==='function') audit('invoice.auto', inv.number);
  save();
  return inv;
}
window.createInvoiceAuto=createInvoiceAuto;
window.WP=window.WP||{};
window.WP.Invoice={create:createInvoiceAuto};

function convertRepairToInvoice(rid){
  const r=db.repairs.find(x=>x.id===rid);
  if(!r) return toast(t('jobMissing'));
  const lines=[
    ...(r.parts||[]).map(p=>({name:p.name, sku:p.sku, qty:p.qty, price:p.price, kind:'parts'})),
    {name:'Arbeitswert', qty:Number(r.hours||1), price:Number(workshop().hourlyRate||db.settings.hourlyRate||100), kind:'labor'}
  ];
  let inv;
  try{
    inv=createInvoiceAuto({
      vehicleId:r.vehicleId, repairId:r.id, customerId:r.customerId,
      lines, tax:19, auftrag:r.number||nextAuftragNumber(), km:r.km
    });
  }catch(e){ return toast(e.message||'invoice'); }
  r.status='ready';
  consumePartsFromRepair(r);
  if(typeof audit==='function') audit('invoice.from_repair', inv.number);
  save();
  toast(t('invoiceCreated')+' '+inv.number);
  session.page='invoices';
  render();
  setTimeout(()=>{ try{ previewInvoice(inv.id); }catch(e){} }, 200);
}
function whatsappReady(rid){
  const r=db.repairs.find(x=>x.id===rid);
  if(!r) return;
  const v=vehicleOf(r.vehicleId);
  const c=customerOfVehicle(r.vehicleId);
  const phone=(c?.phone||'').replace(/[^\d+]/g,'');
  const car=v?((v.make||'')+' '+(v.model||'')+' — '+(v.plate||'')):'';
  const tpl=(typeof t==='function'&&t('waTpl'))||'Hello {name},\n{car}\n{work}';
  const msg=encodeURIComponent(tpl.replace('{name}',c?.name||'').replace('{car}',car).replace('{work}',r.description||''));
  const num=phone.replace(/^\+/,'');
  window.open(num?('https://wa.me/'+num+'?text='+msg):('https://wa.me/?text='+msg),'_blank');
}
function openPartsLink(vid){
  const v=vehicleOf(vid);
  const q=encodeURIComponent((v&& (v.vin||v.plate))||'');
  window.open('https://www.partslink24.com/','_blank');
  toast(v?.vin ? ('VIN: '+v.vin+' '+t('copyVinPl24')) : t('openPl24'));
}

window.convertRepairToInvoice=convertRepairToInvoice;
window.whatsappReady=whatsappReady;
window.openPartsLink=openPartsLink;
window.openRepair=function(rid){ if(typeof openRepairDesk==='function') openRepairDesk(rid); else if(typeof repairEditModal==='function') repairEditModal(rid); };


function customerName(cid){
  const c=customerOf(cid);
  return (c && (c.companyName||c.name)) || '-';
}
function vehicleName(vid){
  const v=vehicleOf(vid);
  return v?`${v.plate||v.vin||'-'} · ${v.make||''} ${v.model||''}`:'-';
}
window.customerName=customerName;
window.vehicleName=vehicleName;
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function isDev(){return session?.user?.role==='developer'}
function canEdit(){return ['manager','developer'].includes(session?.user?.role)}
function roleCan(section){
 const r=session.user.role;
 if(r==='developer') return true;
 if(r==='manager') return section!=='studio';
 if(r==='accountant') return !['settings','studio'].includes(section);
 if(r==='mechanic') return ['dashboard','customers','vehicles','repairs','estimates','appointments','help'].includes(section);
 if(r==='warehouse') return ['dashboard','inventory','purchases','integrations','help'].includes(section);
 return false;
}

