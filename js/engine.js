/* Werkivo engine: status codes, validation, migration */
(function(W){
  const ALIAS={
    intake:['intake','استلام','Annahme','Check-in'],
    diag:['diag','تشخيص','Diagnose','Diagnosis'],
    wait_parts:['wait_parts','انتظار قطع','Wartet auf Teile','Waiting for parts'],
    working:['working','قيد التنفيذ','جاري العمل','In Arbeit','In progress'],
    ready:['ready','جاهز للتسليم','fertig','Ready'],
    delivered:['delivered','مسلَّم','مسلم','geliefert','Delivered'],
    done:['done','منجز','Fertig','Completed'],
    closed:['closed','مغلق','Abgeschlossen','Closed'],
    confirmed:['confirmed','مؤكد','Bestätigt','Confirmed'],
    converted:['converted','تم التحويل']
  };
  const OPEN=['intake','diag','wait_parts','working'];
  function norm(s){
    const x=String(s||'').trim();
    if(!x) return '';
    for(const [code,list] of Object.entries(ALIAS)){
      if(code===x || list.includes(x)) return code;
    }
    return x;
  }
  function is(s, code){ return norm(s)===code; }
  function isOpen(s){ return OPEN.includes(norm(s)); }
  function flow(){ return ['intake','diag','wait_parts','working','ready','delivered']; }
  function validateVehicle(v){
    const e=[];
    if(!v) return ['no vehicle'];
    const vin=String(v.vin||'').replace(/\s/g,'').toUpperCase();
    if(vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) e.push('vin');
    return e;
  }
  function validateInvoice(x){
    const e=[];
    if(!x) return ['no invoice'];
    if(!(Number(x.total)>0) && !(x.lines&&x.lines.length)) e.push('empty');
    return e;
  }
  function migrate(store){
    if(!store) return store;
    ['repairs','appointments'].forEach(k=>{
      (store[k]||[]).forEach(row=>{
        if(row && row.status) row.status=norm(row.status);
      });
    });
    if(store.settings && !['de','ar','en','tr','sr','ru','pl','es'].includes(store.settings.uiLang)){
      store.settings.uiLang='de';
    }
    store.settings=store.settings||{};
    store.settings.schema=2;
    return store;
  }
  function touch(row){
    if(!row) return row;
    row.updatedAt=new Date().toISOString();
    return row;
  }
  function index(store, companyId){
    const out={
      customers:Object.create(null),
      vehicles:Object.create(null),
      vehiclesByCustomer:Object.create(null),
      invoices:Object.create(null)
    };
    const take=(arr, map)=>{
      (arr||[]).forEach(row=>{
        if(!row||!row.id) return;
        if(companyId && row.companyId && row.companyId!==companyId) return;
        map[row.id]=row;
      });
    };
    take(store&&store.customers, out.customers);
    take(store&&store.vehicles, out.vehicles);
    take(store&&store.invoices, out.invoices);
    Object.keys(out.vehicles).forEach(id=>{
      const v=out.vehicles[id];
      const cid=v.customerId;
      if(!cid) return;
      (out.vehiclesByCustomer[cid]=out.vehiclesByCustomer[cid]||[]).push(v);
    });
    return out;
  }
  function looksHashed(p){ return /^[a-f0-9]{64}$/i.test(String(p||'')); }
  function hashPass(plain){
    const s='werkivo.v1:'+String(plain||'');
    try{
      if(typeof require==='function'){
        return require('crypto').createHash('sha256').update(s).digest('hex');
      }
    }catch(e){}
    let h=2166136261;
    for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
    return ('00000000'+(h>>>0).toString(16)).slice(-8);
  }
  async function hashPassAsync(plain){
    const s='werkivo.v1:'+String(plain||'');
    try{
      if(typeof crypto!=='undefined' && crypto.subtle){
        const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
        return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
      }
    }catch(e){}
    return hashPass(plain);
  }
  async function passOk(stored, plain){
    if(stored==null || plain==null) return false;
    if(String(stored)===String(plain)) return true;
    const h=await hashPassAsync(plain);
    if(stored===h) return true;
    if(looksHashed(stored) && stored===hashPass(plain)) return true;
    return false;
  }
  function publicUser(u){
    if(!u) return null;
    return {u:u.u,name:u.name,role:u.role,companies:u.companies||null};
  }
  W.Engine={norm,is,isOpen,flow,validateVehicle,validateInvoice,migrate,touch,index,looksHashed,hashPass,hashPassAsync,passOk,publicUser,ALIAS,OPEN};
})(window.WP=window.WP||{});
window.normStatus=function(s){ return (WP.Engine&&WP.Engine.norm(s))||s; };
window.isOpenStatus=function(s){ return !!(WP.Engine&&WP.Engine.isOpen(s)); };
