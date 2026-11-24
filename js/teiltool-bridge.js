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
  function applyVehicle(v){
    setField('mk',v.make);
    setField('mo',[v.model,v.engine].filter(Boolean).join(' '));
    if($id('cc')&&!$id('cc').value) setField('cc',v.ccm?Math.round(v.ccm):'');
    if($id('kw')&&!$id('kw').value) setField('kw',v.kw?Math.round(v.kw):'');
    if($id('fuel')&&!$id('fuel').value) setField('fuel',v.fuel);
    if($id('en')&&!$id('en').value) setField('en',Array.isArray(v.engineCodes)?v.engineCodes.join(', '):v.engineCodes);
    const out=$id('ttKbaOut'); if(out) out.textContent='✓ '+[v.make,v.model,v.engine].filter(Boolean).join(' ');
  }
  document.addEventListener('click',async e=>{
    const b=e.target.closest&&e.target.closest('#ttKba');
    if(b){
      const out=$id('ttKbaOut'); if(out) out.textContent='…';
      b.disabled=true;
      const r=await api.kba($id('hsn')&&$id('hsn').value,$id('tsn')&&$id('tsn').value);
      b.disabled=false; if(!out) return;
      if(r.error){ out.textContent=tt(r.error==='input'?'ttKbaInput':'ttOffline'); return; }
      if(!r.vehicles.length){ out.textContent=tt('ttKbaNone'); return; }
      if(r.vehicles.length===1) return applyVehicle(r.vehicles[0]);
      out.textContent=tt('ttKbaPick')+' ';
      r.vehicles.slice(0,12).forEach(v=>{
        const c=document.createElement('button'); c.type='button'; c.className='btn small tt-kba-c';
        c.textContent=[v.model,v.engine,v.kw?Math.round(v.kw)+' kW':'',v.from?String(v.from).slice(0,4):''].filter(Boolean).join(' · ');
        c.onclick=()=>applyVehicle(v); out.appendChild(c);
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
