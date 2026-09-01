/* BayMeister core: storage, workshop profile, helpers */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const storeKey='baymeister_v1';
const seed={
 users:[
  {u:'admin',p:'1980D',name:'Admin',role:'manager'},
  {u:'Rashid',p:'1976R',name:'Rashid Tabah',role:'developer'},
  {u:'accountant',p:'1978B',name:'Buchhaltung',role:'accountant'},
  {u:'ismail',p:'1977A',name:'Ismail',role:'mechanic'},
  {u:'warehouse',p:'1979C',name:'Lager',role:'warehouse'}
 ],
 companies:[
  {id:'de',name:'TST — Autoteile und Autoservice Tabah UG',country:'DE',currency:'EUR',docLang:'de'},
  {id:'es',name:'Auto Service España',country:'ES',currency:'EUR',docLang:'es'}
 ],
 customers:[
  {id:'c_demo1',companyId:'de',name:'Ahmad Al-Khalil',phone:'+49 170 1112233',email:'ahmad@example.de',address:'Berlin, Germany'},
  {id:'c_demo2',companyId:'de',name:'Maria Schmidt',phone:'+49 151 4455667',email:'maria@example.de',address:'Hamburg, Germany'},
  {id:'c_demo3',companyId:'de',name:'Youssef Mansour',phone:'+49 160 9988776',email:'youssef@example.de',address:'München, Germany'}
 ],
 vehicles:[
  {id:'v_demo1',companyId:'de',customerId:'c_demo1',plate:'B-AK 1234',vin:'WVWZZZ1JZYW123456',make:'VW',model:'Golf 7',year:'2018',engine:'CJZA',paint:'LC9X',km:86500,nextServiceKm:90000},
  {id:'v_demo2',companyId:'de',customerId:'c_demo2',plate:'HH-MS 55',vin:'WBA8E9G50JNU12345',make:'BMW',model:'320d',year:'2019',engine:'B47',paint:'300',km:112000,nextServiceKm:120000},
  {id:'v_demo3',companyId:'de',customerId:'c_demo3',plate:'M-YM 900',vin:'WDD2050041A123456',make:'Mercedes',model:'C 200',year:'2020',engine:'M264',paint:'197',km:54000,nextServiceKm:60000}
 ],
 repairs:[
  {id:'r_demo1',companyId:'de',vehicleId:'v_demo1',description:'Ölwechsel + Filter',complaint:'Geräusch beim Start',km:86500,fuel:'half',tech:'Ismail',hours:1.5,status:'working',jobs:['Ölwechsel','Ölfilter'],parts:[{sku:'OIL-5W30',name:'Motoröl 5W30 5L',qty:1,price:35},{sku:'FIL-OIL-VW',name:'Ölfilter VW',qty:1,price:9}],photos:[],date:new Date().toISOString().slice(0,10)},
  {id:'r_demo2',companyId:'de',vehicleId:'v_demo2',description:'Vorderbremsen prüfen',complaint:'Quietschen beim Bremsen',km:112000,fuel:'quarter',tech:'Ismail',hours:2,status:'wait_parts',jobs:['Bremsen prüfen'],parts:[{sku:'BRK-PAD-F',name:'Bremsbeläge vorn',qty:1,price:55}],photos:[],date:new Date().toISOString().slice(0,10)}
 ],
 appointments:[
  {id:'ap_demo1',companyId:'de',vehicleId:'v_demo1',customerId:'c_demo1',date:new Date().toISOString().slice(0,10),time:'09:30',tech:'Ismail',note:'Abholung nach Ölwechsel',status:'confirmed'}
 ],
 estimates:[],
 invoices:[
  {id:'i_demo1',companyId:'de',vehicleId:'v_demo1',number:'RE-2026-0001',type:'Rechnung',parts:45,labor:80,discount:0,tax:19,net:125,total:148.75,payment:'Karte',paid:true,date:new Date().toISOString(),lines:[{name:'Öl + Filter',qty:1,price:45,kind:'parts'},{name:'Arbeitswert',qty:1,price:80,kind:'labor'}]}
 ],
 purchases:[
  {id:'p_demo1',companyId:'de',supplier:'carparts-cat.com',invoice_number:'CP-10021',item:'Ölfilter',qty:10,price:6.5,subtotal:65,tax_amount:12.35,total_amount:77.35,date:new Date().toISOString().slice(0,10),payment_status:'paid',notes:'Demo',receipt_url:''}
 ],
 inventory:[
  {id:'inv_demo1',companyId:'de',sku:'OIL-5W30',name:'Motoröl 5W30 5L',qty:12,buy:22,sell:35,minQty:4},
  {id:'inv_demo2',companyId:'de',sku:'FIL-OIL-VW',name:'Ölfilter VW',qty:25,buy:4.5,sell:9,minQty:6},
  {id:'inv_demo3',companyId:'de',sku:'BRK-PAD-F',name:'Bremsbeläge vorn',qty:8,buy:28,sell:55,minQty:4},
  {id:'inv_demo4',companyId:'de',sku:'BAT-12V-70',name:'Batterie 12V 70Ah',qty:2,buy:85,sell:140,minQty:3}
 ],
 employees:[
  {id:'e_demo1',companyId:'de',name:'Ismail',role:'Techniker',phone:'+49 170 0000001',salary:2800},
  {id:'e_demo2',companyId:'de',name:'Lager',role:'Lager',phone:'+49 170 0000002',salary:2400}
 ],
 expenses:[
  {id:'x_demo1',companyId:'de',date:new Date().toISOString().slice(0,10),note:'Miete Werkstatt',amount:1200,category:'Betrieb'}
 ],
 journal:[],
 audit:[],
 settings:{theme:'light',font:16,uiLang:'de',invoiceSeq:311,auftragSeq:1,lastBackup:'',hourlyRate:100,workshopName:'Autoteile und Autoservice Tabah UG (haftungsbeschränkt)',workshopBrand:'TST',workshopAddress:'Hans-Koch-Ring 12, 21493 Schwarzenbek',workshopPhone:'016096585124',workshopEmail:'rashed.car50@gmail.com',workshopTaxId:'DE369361489',workshopSteuerNr:'22 290/41079',workshopCourt:'Amtsgericht Lübeck',workshopOwner:'Rashid Tabah',workshopBank:'Raiffeisenbank eG',workshopIban:'DE36230631290000273384',workshopAccountHolder:'Autoteile und Autoservice Tabah UG (haftungsbeschränkt)',workshopHrb:'25248 HL',workshopBic:'GENODEF1RLB',workshopSitz:'Schwarzenbek',paymentDays:0,invoiceTpl:'modern',printPaper:'A4',printMargin:'8mm',printColor:true,katyUser:'',katyPass:'',katyUrl:'https://www.matthies.de/software/katy.html',henryUrl:'https://henry.matthies.de/',vincarioKey:'',vincarioSecret:'',openaiKey:''}
};
let db=load(), session=null;
if(window.WP){ WP.db=db; WP.session=session; }
window.db=db;

function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){
 try{
  const raw=loadRaw();
  const base=clone(seed);
  const merged={...base,...raw};
  // إذا المجموعات فاضية استخدم بيانات التجربة من seed
  ['customers','vehicles','repairs','invoices','purchases','inventory','employees','expenses','appointments','estimates','journal'].forEach(k=>{
   if(!Array.isArray(merged[k]) || merged[k].length===0) merged[k]=clone(seed[k]||[]);
  });
  if(!Array.isArray(merged.katyCache)) merged.katyCache=[];
  if(!merged.settings) merged.settings=clone(seed.settings);
  merged.settings={...clone(seed.settings),...merged.settings};
  if(!['ar','de','en','es','tr','sr','ru','pl'].includes(merged.settings.uiLang)) merged.settings.uiLang='de';
  if(!merged.settings.openaiKey){
    try{
      const stored=(typeof localStorage!=='undefined' && localStorage.getItem('werkivo_openai'))||'';
      if(stored) merged.settings.openaiKey=stored;
    }catch(e){}
  }
  if(window.WP && WP.Engine) WP.Engine.migrate(merged);

  if(!Array.isArray(merged.users) || !merged.users.length) merged.users=clone(seed.users);
  if(!merged.users.some(u=>u.role==='developer')) merged.users.push({u:'Rashid',p:'1976R',name:'Rashid Tabah',role:'developer'});
  merged.users.forEach(u=>{
    if(u.role==='developer' && (u.u==='owner' || u.u==='Rashid')){
      u.u='Rashid';
      if(!u.p || u.p==='bm-dev-2026') u.p='1976R';
      if(!u.name || u.name==='صاحب الورشة / تطوير') u.name='Rashid Tabah';
    }
    if(u.role==='mechanic' && (u.u==='mechanic' || u.u==='ismail')){
      u.u='ismail';
      if(!u.p) u.p='1977A';
      if(!u.name) u.name='Ismail';
    }
  });
  if(!Array.isArray(merged.companies) || !merged.companies.length) merged.companies=clone(seed.companies);
  ensureCompanyProfiles(merged);
  return merged;
 }catch{return clone(seed)}
}
const WORKSHOP_KEYS=['workshopBrand','workshopName','workshopAddress','workshopPhone','workshopEmail','workshopTaxId','workshopSteuerNr','workshopCourt','workshopOwner','workshopBank','workshopIban','workshopAccountHolder','workshopHrb','workshopBic','workshopSitz','hourlyRate','invoiceSeq','auftragSeq','paymentDays','invoiceTpl','printPaper','printMargin','printColor'];
function defaultWorkshopProfile(co, settings){
  const s=settings||(typeof db!=='undefined'&&db&&db.settings)||seed.settings;
  const isDe=co.id==='de' || co.country==='DE';
  const p={};
  WORKSHOP_KEYS.forEach(k=>{ p[k]= isDe ? (s[k]??seed.settings[k]) : (s[k]??''); });
  if(!isDe){
    p.workshopBrand=co.name||'Werkstatt';
    p.workshopName=co.name||'';
    p.workshopAccountHolder=co.name||'';
    p.invoiceSeq=0; p.auftragSeq=0; p.hourlyRate=100; p.paymentDays=0;
    p.invoiceTpl='modern'; p.printPaper='A4'; p.printMargin='8mm'; p.printColor=true;
    p.workshopTaxId=''; p.workshopIban=''; p.workshopHrb=''; p.workshopBic='';
  }
  p.docLang=co.docLang|| (co.country==='DE'?'de':'de');
  p.currency=co.currency||'EUR';
  return p;
}
function ensureCompanyProfiles(store){
  const st=store||db;
  if(!Array.isArray(st.companies)) st.companies=clone(seed.companies);
  st.companies.forEach(co=>{
    if(!co.profile) co.profile=defaultWorkshopProfile(co, st.settings);
    WORKSHOP_KEYS.forEach(k=>{ if(co.profile[k]===undefined) co.profile[k]=defaultWorkshopProfile(co, st.settings)[k]; });
  });
}
function persistJson(key, obj){
  localStorage.setItem(key, JSON.stringify(obj));
}
function slimForStorage(src){
  const slim=clone(src);
  slim.audit=(slim.audit||[]).slice(0,60);
  slim.journal=(slim.journal||[]).slice(0,200);
  if((slim.archive||[]).length>80) slim.archive=slim.archive.slice(0,80);
  (slim.vehicles||[]).forEach(v=>{ if((v.photo||'').length>24000) v.photo=''; });
  (slim.repairs||[]).forEach(r=>{
    if((r.photos||[]).length>3) r.photos=r.photos.slice(0,3);
    (r.photos||[]).forEach(p=>{ if(p && p.url && String(p.url).length>24000) p.url=''; });
  });
  return slim;
}
function touch(row){
  if(row && typeof row==='object') row.updatedAt=new Date().toISOString();
  return row;
}
let _saveTimer=null;
let _rowsMemo=null,_rowsCid=null;
function flushRows(){ _rowsMemo=null; _rowsCid=null; }
function persistNow(){
  try{
    flushRows();
    persistJson(storeKey, slimForStorage(db));
    try{ persistJson(storeKey+'_bak', slimForStorage(db)); }catch(e){}
    window.db=db;
    if(window.WP){ WP.db=db; WP.session=session; WP.run('afterSave', db); }
  }catch(err){
    try{
      db=slimForStorage(db);
      persistJson(storeKey, db);
      if(typeof toast==='function') toast(typeof t==='function'?t('saveSlim'):'Saved');
    }catch(err2){
      console.error('save failed', err2);
      if(typeof toast==='function') toast(typeof t==='function'?t('saveFail'):'Save failed');
    }
  }
}
function save(immediate){
  if(immediate){ if(_saveTimer) clearTimeout(_saveTimer); persistNow(); return; }
  if(_saveTimer) clearTimeout(_saveTimer);
  _saveTimer=setTimeout(persistNow, 80);
}
window.addEventListener('pagehide', function(){ if(_saveTimer) persistNow(); });
window.addEventListener('beforeunload', function(){ if(_saveTimer) persistNow(); });
function loadRaw(){
  for(const key of [storeKey, storeKey+'_bak']){
    try{
      const raw=localStorage.getItem(key);
      if(!raw) continue;
      const parsed=JSON.parse(raw);
      if(parsed && typeof parsed==='object') return parsed;
    }catch(e){ console.warn('load skip', key, e); }
  }
  return {};
}


function id(p='x'){return p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function uiLocale(){
  const lang=(typeof db!=='undefined' && db.settings && db.settings.uiLang) || 'de';
  return ({de:'de-DE',en:'en-GB',tr:'tr-TR',sr:'sr-Latn-RS',ru:'ru-RU',pl:'pl-PL',es:'es-ES',ar:'ar-SY'}[lang])||'de-DE';
}
function fmtWhen(ts){
  try{ return new Date(ts).toLocaleString(uiLocale(),{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',numberingSystem:'latn',hour12:false}); }
  catch(e){ return String(ts||''); }
}
window.uiLocale=uiLocale; window.fmtWhen=fmtWhen;
function money(v){return Number(v||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'})}
function toast(msg){
  const x=document.createElement('div');
  x.className='toast';
  const text=(typeof L==='function')?L(String(msg||'')):String(msg||'');
  x.innerHTML=text.split('\n').map(l=>`<div>${(l||'').replace(/</g,'')}</div>`).join('');
  document.body.append(x);
  setTimeout(()=>x.remove(),2800);
}
function askConfirm(title, detail, onYes){
  document.querySelectorAll('.ask-overlay').forEach(n=>n.remove());
  const box=document.createElement('div');
  box.className='ask-overlay';
  const yes=typeof t==='function'?t('save'):'OK';
  const no=typeof t==='function'?t('cancelBtn'):'Cancel';
  box.innerHTML=`<div class="ask-box" role="dialog">
    <h3>${String(title||'').replace(/</g,'')}</h3>
    ${detail?`<p>${String(detail).replace(/</g,'')}</p>`:''}
    <div class="ask-actions">
      <button type="button" class="btn ghost" id="askNo">${no}</button>
      <button type="button" class="btn bad" id="askYes">${yes}</button>
    </div>
  </div>`;
  document.body.appendChild(box);
  const close=()=>box.remove();
  box.querySelector('#askNo').onclick=close;
  box.querySelector('#askYes').onclick=()=>{ close(); if(onYes) onYes(); };
  box.addEventListener('click',e=>{ if(e.target===box) close(); });
}
window.askConfirm=askConfirm;
function audit(action,detail=''){db.audit.unshift({id:id('a'),ts:new Date().toISOString(),user:session?.user?.name||'system',company:session?.company?.id||'',action,detail});save()}
function companyRows(name){
  const cid=session&&session.company&&session.company.id;
  if(!cid) return [];
  if(_rowsCid!==cid || !_rowsMemo){ _rowsMemo=Object.create(null); _rowsCid=cid; }
  if(_rowsMemo[name]) return _rowsMemo[name];
  return _rowsMemo[name]=(db[name]||[]).filter(x=>x && x.companyId===cid);
}
function rowById(col, rid){
  if(!rid) return null;
  const list=companyRows(col);
  const key='#'+col;
  if(!_rowsMemo[key]){
    const m=Object.create(null);
    list.forEach(x=>{ if(x&&x.id) m[x.id]=x; });
    _rowsMemo[key]=m;
  }
  return _rowsMemo[key][rid]||null;
}
window.flushRows=flushRows;
window.rowById=rowById;
function visibleCompanies(){
  const u=session?.user;
  if(!u) return db.companies||[];
  if(['developer','manager'].includes(u.role) || !u.companies) return db.companies||[];
  return (db.companies||[]).filter(c=>(u.companies||[]).includes(c.id));
}
function workshop(){
  ensureCompanyProfiles();
  const co=session?.company || db.companies[0];
  if(!co.profile) co.profile=defaultWorkshopProfile(co, db.settings);
  return co.profile;
}
function patchWorkshop(fields){
  const co=session.company; if(!co) return;
  co.profile=Object.assign({}, workshop(), fields||{});
  if(fields && fields.workshopBrand) co.name=fields.workshopBrand+(fields.workshopName?(' — '+fields.workshopName):'');
  else if(fields && fields.workshopName && !co.name) co.name=fields.workshopName;
  save();
}
function mergeByCompany(key, rows){
  if(!Array.isArray(db[key])) db[key]=[];
  (rows||[]).forEach(incoming=>upsertRow(key, incoming));
}
function upsertRow(key, incoming){
  if(!incoming) return;
  const list=db[key];
  const cid=incoming.companyId||session?.company?.id;
  const idx=list.findIndex(l=>{
    if(incoming.cloudId && l.cloudId===incoming.cloudId) return true;
    if(incoming.number && l.number && incoming.number===l.number && (l.companyId||cid)===(incoming.companyId||cid)) return true;
    if(incoming.vin && l.vin && incoming.vin===l.vin && (l.companyId||cid)===(incoming.companyId||cid)) return true;
    if(incoming.invoice_number && l.invoice_number && incoming.invoice_number===l.invoice_number && l.supplier===incoming.supplier) return true;
    if(incoming.sku && l.sku && incoming.sku===l.sku && (l.companyId||cid)===(incoming.companyId||cid)) return true;
    return l.id===incoming.id;
  });
  if(idx<0){ list.push(incoming); return; }
  const local=list[idx];
  const lt=Date.parse(local.updatedAt||local.date||0)||0;
  const rt=Date.parse(incoming.updatedAt||incoming.date||0)||0;
  if(lt && rt && Math.abs(lt-rt)>500 && JSON.stringify(local)!==JSON.stringify(incoming)){
    db.conflicts=db.conflicts||[];
    db.conflicts.unshift({ts:new Date().toISOString(), key, id:local.id, winner: lt>rt?'local':'cloud'});
    db.conflicts=db.conflicts.slice(0,80);
  }
  if(lt>rt){
    list[idx]=Object.assign({}, incoming, local, {cloudId:local.cloudId||incoming.cloudId, id:local.id});
  } else {
    list[idx]=Object.assign({}, local, incoming, {id:local.id, cloudId:local.cloudId||incoming.cloudId});
  }
}
function cloudCompanyFilter(query){
  const cid=session?.company?.id;
  return cid ? query.eq('company_id', cid) : query;
}

