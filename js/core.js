/* BayMeister core: storage, workshop profile, helpers */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const storeKey='baymeister_v1';
const seed={
 users:[
  {u:'admin',p:'1980D',name:'المدير',role:'manager'},
  {u:'Rashid',p:'1976R',name:'Rashid Tabah',role:'developer'},
  {u:'accountant',p:'1978B',name:'المحاسب',role:'accountant'},
  {u:'ismail',p:'1977A',name:'Ismail',role:'mechanic'},
  {u:'warehouse',p:'1979C',name:'أمين المستودع',role:'warehouse'}
 ],
 companies:[
  {id:'de',name:'TST — Autoteile und Autoservice Tabah UG',country:'DE',currency:'EUR',docLang:'de'},
  {id:'es',name:'Auto Service España',country:'ES',currency:'EUR',docLang:'es'}
 ],
 customers:[
  {id:'c_demo1',companyId:'de',name:'أحمد الخليل',phone:'+49 170 1112233',email:'ahmad@example.de',address:'Berlin, Germany'},
  {id:'c_demo2',companyId:'de',name:'Maria Schmidt',phone:'+49 151 4455667',email:'maria@example.de',address:'Hamburg, Germany'},
  {id:'c_demo3',companyId:'de',name:'يوسف منصور',phone:'+49 160 9988776',email:'youssef@example.de',address:'München, Germany'}
 ],
 vehicles:[
  {id:'v_demo1',companyId:'de',customerId:'c_demo1',plate:'B-AK 1234',vin:'WVWZZZ1JZYW123456',make:'VW',model:'Golf 7',year:'2018',engine:'CJZA',paint:'LC9X',km:86500,nextServiceKm:90000},
  {id:'v_demo2',companyId:'de',customerId:'c_demo2',plate:'HH-MS 55',vin:'WBA8E9G50JNU12345',make:'BMW',model:'320d',year:'2019',engine:'B47',paint:'300',km:112000,nextServiceKm:120000},
  {id:'v_demo3',companyId:'de',customerId:'c_demo3',plate:'M-YM 900',vin:'WDD2050041A123456',make:'Mercedes',model:'C 200',year:'2020',engine:'M264',paint:'197',km:54000,nextServiceKm:60000}
 ],
 repairs:[
  {id:'r_demo1',companyId:'de',vehicleId:'v_demo1',description:'تغيير زيت + فلتر',complaint:'صوت من المحرك عند التشغيل',km:86500,fuel:'نصف',tech:'الميكانيكي',hours:1.5,status:'قيد التنفيذ',jobs:['تغيير زيت','تغيير فلتر زيت'],parts:[{sku:'OIL-5W30',name:'زيت محرك 5W30 5L',qty:1,price:35},{sku:'FIL-OIL-VW',name:'فلتر زيت VW',qty:1,price:9}],photos:[],date:new Date().toISOString().slice(0,10)},
  {id:'r_demo2',companyId:'de',vehicleId:'v_demo2',description:'فحص فرامل أمامية',complaint:'صرير عند الفرملة',km:112000,fuel:'ربع',tech:'الميكانيكي',hours:2,status:'انتظار قطع',jobs:['فحص فرامل','تغيير فحمات إن لزم'],parts:[{sku:'BRK-PAD-F',name:'فحمات فرامل أمامية',qty:1,price:55}],photos:[],date:new Date().toISOString().slice(0,10)}
 ],
 appointments:[
  {id:'ap_demo1',companyId:'de',vehicleId:'v_demo1',customerId:'c_demo1',date:new Date().toISOString().slice(0,10),time:'09:30',tech:'الميكانيكي',note:'تسليم بعد تغيير الزيت',status:'مؤكد'}
 ],
 estimates:[],
 invoices:[
  {id:'i_demo1',companyId:'de',vehicleId:'v_demo1',number:'RE-2026-0001',type:'فاتورة',parts:45,labor:80,discount:0,tax:19,net:125,total:148.75,payment:'بطاقة',paid:true,date:new Date().toISOString(),lines:[{name:'زيت + فلتر',qty:1,price:45},{name:'أجور عمل',qty:1,price:80}]}
 ],
 purchases:[
  {id:'p_demo1',companyId:'de',supplier:'carparts-cat.com',invoice_number:'CP-10021',item:'فلتر زيت',qty:10,price:6.5,subtotal:65,tax_amount:12.35,total_amount:77.35,date:new Date().toISOString().slice(0,10),payment_status:'paid',notes:'طلب تجريبي',receipt_url:''}
 ],
 inventory:[
  {id:'inv_demo1',companyId:'de',sku:'OIL-5W30',name:'زيت محرك 5W30 5L',qty:12,buy:22,sell:35,minQty:4},
  {id:'inv_demo2',companyId:'de',sku:'FIL-OIL-VW',name:'فلتر زيت VW',qty:25,buy:4.5,sell:9,minQty:6},
  {id:'inv_demo3',companyId:'de',sku:'BRK-PAD-F',name:'فحمات فرامل أمامية',qty:8,buy:28,sell:55,minQty:4},
  {id:'inv_demo4',companyId:'de',sku:'BAT-12V-70',name:'بطارية 12V 70Ah',qty:2,buy:85,sell:140,minQty:3}
 ],
 employees:[
  {id:'e_demo1',companyId:'de',name:'الميكانيكي',role:'فني',phone:'+49 170 0000001',salary:2800},
  {id:'e_demo2',companyId:'de',name:'أمين المستودع',role:'مستودع',phone:'+49 170 0000002',salary:2400}
 ],
 expenses:[
  {id:'x_demo1',companyId:'de',date:new Date().toISOString().slice(0,10),note:'إيجار الورشة',amount:1200,category:'تشغيل'}
 ],
 journal:[],
 audit:[],
 settings:{theme:'light',font:16,uiLang:'ar',invoiceSeq:311,auftragSeq:1,lastBackup:'',hourlyRate:100,workshopName:'Autoteile und Autoservice Tabah UG (haftungsbeschränkt)',workshopBrand:'TST',workshopAddress:'Hans-Koch-Ring 12, 21493 Schwarzenbek',workshopPhone:'016096585124',workshopEmail:'rashed.car50@gmail.com',workshopTaxId:'DE369361489',workshopSteuerNr:'22 290/41079',workshopCourt:'Amtsgericht Lübeck',workshopOwner:'Rashid Tabah',workshopBank:'Raiffeisenbank eG',workshopIban:'DE36230631290000273384',workshopAccountHolder:'Autoteile und Autoservice Tabah UG (haftungsbeschränkt)',workshopHrb:'25248 HL',workshopBic:'GENODEF1RLB',workshopSitz:'Schwarzenbek',paymentDays:0,invoiceTpl:'modern',printPaper:'A4',printMargin:'8mm',printColor:true,katyUser:'',katyPass:'',katyUrl:'https://www.matthies.de/software/katy.html',henryUrl:'https://henry.matthies.de/',vincarioKey:'',vincarioSecret:''}
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
  if(!['ar','de','en','es'].includes(merged.settings.uiLang)) merged.settings.uiLang='ar';

  if(!Array.isArray(merged.users) || !merged.users.length) merged.users=clone(seed.users);
  if(!merged.users.some(u=>u.role==='developer')) merged.users.push({u:'Rashid',p:'1976R',name:'Rashid Tabah',role:'developer'});
  merged.users.forEach(u=>{
    if(u.role==='developer' && (u.u==='owner' || u.u==='Rashid' || u.p==='bm-dev-2026')){
      u.u='Rashid'; u.p='1976R'; u.name=u.name&&u.name!=='صاحب الورشة / تطوير'?u.name:'Rashid Tabah';
    }
    if(u.role==='mechanic' && (u.u==='mechanic' || u.u==='ismail')){
      u.u='ismail'; u.p='1977A'; u.name='Ismail';
    }
    if(u.role==='accountant'){ u.p='1978B'; }
    if(u.role==='warehouse'){ u.p='1979C'; }
    if(u.role==='manager' && (u.u==='admin' || u.p==='1234')){ u.p='1980D'; }
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
  slim.audit=(slim.audit||[]).slice(0,300);
  (slim.vehicles||[]).forEach(v=>{ if((v.photo||'').length>80000) v.photo=''; });
  (slim.repairs||[]).forEach(r=>{ if((r.photos||[]).length>8) r.photos=r.photos.slice(0,8); });
  return slim;
}
function save(){
  try{
    persistJson(storeKey, db);
    try{ persistJson(storeKey+'_bak', db); }catch(e){}
    window.db=db;
    if(window.WP){ WP.db=db; WP.session=session; WP.run('afterSave', db); }
  }catch(err){
    try{
      db=slimForStorage(db);
      persistJson(storeKey, db);
      if(typeof toast==='function') toast('الحفظ تم بعد تخفيف الصور/السجل');
    }catch(err2){
      console.error('save failed', err2);
      if(typeof toast==='function') toast('تعذر الحفظ المحلي — صدّر نسخة احتياطية الآن');
    }
  }
}
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
function money(v){return Number(v||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'})}
function toast(msg){const x=document.createElement('div');x.className='toast';x.textContent=(typeof L==='function')?L(String(msg||'')):String(msg||'');document.body.append(x);setTimeout(()=>x.remove(),2200)}
function audit(action,detail=''){db.audit.unshift({id:id('a'),ts:new Date().toISOString(),user:session?.user?.name||'system',company:session?.company?.id||'',action,detail});save()}
function companyRows(name){return (db[name]||[]).filter(x=>x.companyId===session.company.id)}
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
  const cid=session?.company?.id;
  if(!cid){ db[key]=rows; return; }
  db[key]=(db[key]||[]).filter(x=>x.companyId!==cid).concat(rows||[]);
}
function cloudCompanyFilter(query){
  const cid=session?.company?.id;
  return cid ? query.eq('company_id', cid) : query;
}

