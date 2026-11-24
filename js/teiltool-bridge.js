// Bridge to the company's own Teiltool services (same server the shop uses):
//  * vehicle search by KBA number (HSN/TSN) -- public for the shop and this app;
//  * article title + selling price by part number, and the workshop's shop
//    customer account -- for the signed-in user only (the session token is
//    sent to our own server, which checks it with Supabase).
// Every call fails soft: without the server the app works as before.
(function(){
  const API='https://teiltool-fahrzeugsuche.onrender.com';
  async function bearer(){
    try{
      const sb=window.supabaseClient; if(!sb) return '';
      const {data}=await sb.auth.getSession();
      return (data&&data.session&&data.session.access_token)||'';
    }catch(e){ return ''; }
  }
  async function call(path,opt){
    const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),20000);
    try{
      const r=await fetch(API+path,Object.assign({signal:ctl.signal},opt||{}));
      let j=null; try{ j=await r.json(); }catch(e){}
      return {ok:r.ok,status:r.status,data:j};
    }catch(e){ return {ok:false,status:0,data:null}; }
    finally{ clearTimeout(tm); }
  }
  // Shop price (cents, gross or net) -> net editor price.
  function netPrice(cents,taxIncluded,rate){
    rate=Number(rate)||19;
    return taxIncluded ? Math.round(cents/(1+rate/100))/100 : cents/100;
  }
  const api={
    netPrice,
    async kba(hsn,tsn){
      hsn=String(hsn||'').trim(); tsn=String(tsn||'').trim().toUpperCase().slice(0,3);
      if(!/^[0-9]{4}$/.test(hsn) || !/^[A-Z0-9]{3}$/.test(tsn)) return {error:'input'};
      const r=await call('/fz/kba?hsn='+hsn+'&tsn='+tsn);
      if(!r.ok) return {error:r.status===429?'rate':'offline'};
      return {vehicles:(r.data&&r.data.vehicles)||[]};
    },
    // Catalogue lists for the make -> model -> engine choice (cached per page).
    _lists:{},
    async list(path){
      if(api._lists[path]) return api._lists[path];
      const r=await call(path); if(!r.ok||!r.data) return null;
      const d=r.data, arr=Array.isArray(d)?d:(d.makes||d.models||d.engines||d.vehicles||[]);
      return (api._lists[path]=arr);
    },
    makes(){ return api.list('/fz/makes'); },
    models(makeId){ return /^\d{1,9}$/.test(String(makeId))?api.list('/fz/models?make='+makeId):Promise.resolve(null); },
    engines(modelId){ return /^\d{1,9}$/.test(String(modelId))?api.list('/fz/engines?model='+modelId):Promise.resolve(null); },
    engineLabel(v){
      const y=x=>x?String(x).slice(0,7):'';
      return [v.engine, v.kw?Math.round(v.kw)+' kW / '+Math.round(v.ps||v.kw*1.36)+' PS':'', v.fuel, v.body, (v.from||v.to)?y(v.from)+' – '+(y(v.to)||'…'):'', v.engineCodes].filter(Boolean).join(' · ');
    },
    // -> {sku,name,price(net)} or null (unknown, not signed in, not set up).
    async article(sku,rate){
      sku=String(sku||'').trim(); if(sku.length<2||sku.length>40) return null;
      const tok=await bearer(); if(!tok) return null;
      const r=await call('/wp/article?sku='+encodeURIComponent(sku),{headers:{Authorization:'Bearer '+tok}});
      const a=r.ok&&r.data&&r.data.articles&&r.data.articles[0];
      if(!a || !Number.isFinite(Number(a.priceCents))) return null;
      return {sku:String(a.sku||sku).slice(0,60),name:String(a.name||'').slice(0,200),price:netPrice(Number(a.priceCents),!!a.taxIncluded,rate),source:'Teiltool'};
    },
    async createCustomer(company){
      const tok=await bearer(); if(!tok) return {error:'auth'};
      const r=await call('/wp/customer',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify({company:String(company||'').slice(0,100)})});
      if(r.ok&&r.data&&r.data.customer) return {created:!!r.data.created,customer:String(r.data.customer)};
      return {error:r.status===503?'setup':r.status===401?'auth':'offline'};
    }
  };
  window.WP=window.WP||{}; WP.Teiltool=api;

  const $id=id=>document.getElementById(id);
  const tt=k=>typeof t==='function'?t(k):k;
  function setField(id,val){
    const el=$id(id); if(!el||val==null||val==='') return;
    if(el.tagName==='SELECT'){
      const want=String(val).toLowerCase();
      const o=[...el.options].find(o=>o.value.toLowerCase()===want||o.textContent.trim().toLowerCase()===want);
      if(o) el.value=o.value; return;
    }
    el.value=String(val);
  }
  // Two forms use the vehicle search: the vehicle form and the vehicle part
  // of the customer form (other field ids).
  const FORMS={ttKba:{hsn:'hsn',tsn:'tsn',make:'mk',model:'mo',cc:'cc',kw:'kw',fuel:'fuel',en:'en',out:'ttKbaOut',cat:'ttCatId'},
               ttKbaC:{hsn:'vhsn',tsn:'vtsn',make:'vmake',model:'vmodel',out:'ttKbaCOut'}};
  // Fill from the catalogue without silently destroying typed data: a field is
  // written when it is empty or was itself filled from the catalogue before.
  // Production years are shown as a hint only -- they are neither the year of
  // manufacture nor the first registration of this particular car.
  function catSet(id,val){
    const el=id&&$id(id); if(!el||val==null||val==='') return;
    if(el.value && el.dataset.cat!=='1' && String(el.value).trim().toLowerCase()!==String(val).trim().toLowerCase()) return;
    setField(id,val); el.dataset.cat='1';
  }
  function applyVehicle(v,f){
    catSet(f.make,v.make);
    catSet(f.model,[v.model,v.engine].filter(Boolean).join(' '));
    catSet(f.cc,v.ccm?Math.round(v.ccm):'');
    catSet(f.kw,v.kw?Math.round(v.kw):'');
    catSet(f.fuel,v.fuel);
    catSet(f.en,Array.isArray(v.engineCodes)?v.engineCodes.join(', '):v.engineCodes);
    if(f.cat&&$id(f.cat)) $id(f.cat).value=v.vehicleId||'';
    const out=$id(f.out);
    if(out){ const y=x=>x?String(x).slice(0,7):''; out.textContent='✓ '+[v.make,v.model,v.engine].filter(Boolean).join(' ')+((v.from||v.to)?' · '+tt('vfBuilt')+' '+y(v.from)+' – '+(y(v.to)||'…'):''); }
  }
  // Typing into a catalogue-filled field makes it the user's own again.
  document.addEventListener('input',e=>{
    const el=e.target; if(el&&el.dataset&&el.dataset.cat==='1'&&e.isTrusted) delete el.dataset.cat;
  });
  // make -> model -> engine
  const opt=(v,tx)=>{ const o=document.createElement('option'); o.value=v; o.textContent=tx; return o; };
  function resetSel(id){ const s=$id(id); if(!s) return; s.innerHTML=''; s.appendChild(opt('','—')); s.disabled=true; }
  async function loadMakes(){
    const dl=$id('ttMakeList'); if(!dl||dl.dataset.ok) return;
    const list=await api.makes(); if(!list||!$id('ttMakeList')) return;
    dl.dataset.ok='1'; dl.innerHTML=''; list.forEach(m=>dl.appendChild(opt(m.name,'')));
  }
  document.addEventListener('focusin',e=>{ if(e.target&&e.target.id==='ttMake') loadMakes(); });
  async function onMake(){
    const inp=$id('ttMake'); if(!inp) return;
    resetSel('ttModel'); resetSel('ttEngine'); if($id('ttCatId')) $id('ttCatId').value='';
    const name=inp.value.trim().toUpperCase(); if(!name) return;
    const list=await api.makes(); const m=list&&list.find(x=>String(x.name).toUpperCase()===name);
    if(!m) return;
    const out=$id('ttKbaOut'); if(out) out.textContent='…';
    const models=await api.models(m.id); const sel=$id('ttModel');
    if(out) out.textContent=models?'':tt('ttOffline');
    if(!models||!sel||inp.value.trim().toUpperCase()!==name) return;
    models.forEach(x=>sel.appendChild(opt(x.id,x.name+((x.from||x.to)?' ('+String(x.from||'').slice(0,4)+'–'+String(x.to||'').slice(0,4)+')':''))));
    sel.disabled=false;
  }
  async function onModel(){
    const sel=$id('ttModel'); resetSel('ttEngine'); if($id('ttCatId')) $id('ttCatId').value='';
    if(!sel||!sel.value) return;
    const id=sel.value, out=$id('ttKbaOut'); if(out) out.textContent='…';
    const engines=await api.engines(id); const es=$id('ttEngine');
    if(out) out.textContent=engines?'':tt('ttOffline');
    if(!engines||!es||sel.value!==id) return;
    es._vehicles=engines;
    engines.forEach((v,i)=>es.appendChild(opt(String(i),api.engineLabel(v))));
    es.disabled=false;
  }
  function onEngine(){
    const es=$id('ttEngine'); if(!es||es.value===''||!es._vehicles) return;
    const v=es._vehicles[Number(es.value)]; if(v) applyVehicle(v,FORMS.ttKba);
  }
  document.addEventListener('change',e=>{
    const id=e.target&&e.target.id;
    if(id==='ttMake') onMake(); else if(id==='ttModel') onModel(); else if(id==='ttEngine') onEngine();
  });
  document.addEventListener('click',async e=>{
    const b=e.target.closest&&e.target.closest('#ttKba,#ttKbaC');
    if(b){
      const f=FORMS[b.id];
      const out=$id(f.out); if(out) out.textContent='…';
      b.disabled=true;
      const r=await api.kba($id(f.hsn)&&$id(f.hsn).value,$id(f.tsn)&&$id(f.tsn).value);
      b.disabled=false; if(!out) return;
      if(r.error){ out.textContent=tt(r.error==='input'?'ttKbaInput':'ttOffline'); return; }
      if(!r.vehicles.length){ out.textContent=tt('ttKbaNone'); return; }
      if(r.vehicles.length===1) return applyVehicle(r.vehicles[0],f);
      out.textContent=tt('ttKbaPick')+' ';
      r.vehicles.slice(0,12).forEach(v=>{
        const c=document.createElement('button'); c.type='button'; c.className='btn small tt-kba-c';
        c.textContent=[v.model,v.engine,v.kw?Math.round(v.kw)+' kW':'',v.from?String(v.from).slice(0,4):''].filter(Boolean).join(' · ');
        c.onclick=()=>applyVehicle(v,f); out.appendChild(c);
      });
      return;
    }
    const c=e.target.closest&&e.target.closest('#ttCustomer');
    if(c){
      const out=$id('ttCustomerOut'); c.disabled=true; if(out) out.textContent='…';
      const w=typeof workshop==='function'?workshop():{};
      const name=w.workshopName||w.name||(window.session&&session.company&&session.company.name)||db.settings.workshopName||'';
      const r=await api.createCustomer(name);
      c.disabled=false;
      if(r.customer){ w.teiltoolCustomerId=r.customer; db.settings.teiltoolCustomerId=r.customer; if(typeof save==='function') save(); }
      if(out) out.textContent=r.customer?tt(r.created?'ttCustNew':'ttCustOld'):tt(r.error==='setup'?'ttSetup':r.error==='auth'?'ttAuth':'ttOffline');
    }
  });
})();
