// Teiltool -> WerkPilot cart hand-over.
//
// The Teiltool cart opens WerkPilot with "#tt=<base64url JSON>". The payload
// carries parts and the vehicle TYPE only (no customer, no VIN, no plate).
// After login it is opened as an invoice DRAFT in the editor: nothing gets a
// number, nothing is booked, until the workshop reviews and issues it.
//
// Payload: {v:1, id:'<random>', ti:1|0, l:[[sku,name,qty,priceCents],...],
//           veh:{h:'0035', t:'ASL', mk:'OPEL', md:'ASTRA J', n:'label'}}
(function(){
  const KEY='wp-tt-import';
  // Capture early and take the data out of the address bar / history.
  try{
    const m=(location.hash||'').match(/^#tt=([A-Za-z0-9_-]{8,60000})$/);
    if(m){
      sessionStorage.setItem(KEY,m[1]);
      history.replaceState(null,'',location.pathname+location.search);
    }
  }catch(e){}

  function decode(b64){
    try{
      const s=String(b64||'').replace(/-/g,'+').replace(/_/g,'/');
      const bin=atob(s+'==='.slice((s.length+3)%4));
      const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
      return JSON.parse(new TextDecoder('utf-8').decode(bytes));
    }catch(e){ return null; }
  }
  const clean=(v,max)=>String(v==null?'':v).replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
  // Nothing from the link is trusted: types, sizes and ranges are checked.
  function validate(p){
    if(!p || p.v!==1 || !Array.isArray(p.l) || !p.l.length || p.l.length>100) return null;
    const id=clean(p.id,40); if(!/^[A-Za-z0-9_-]{6,40}$/.test(id)) return null;
    const lines=[];
    for(const r of p.l){
      if(!Array.isArray(r)) return null;
      const sku=clean(r[0],60), name=clean(r[1],200), qty=Number(r[2]), cents=Number(r[3]);
      if(!name && !sku) return null;
      if(!(qty>0 && qty<=999) || !Number.isFinite(cents) || cents<0 || cents>10000000 || Math.round(cents)!==cents) return null;
      lines.push({sku,name:name||sku,qty,cents});
    }
    let veh=null;
    if(p.veh && typeof p.veh==='object'){
      const h=clean(p.veh.h,4), t=clean(p.veh.t,3).toUpperCase();
      const ok=/^[0-9]{4}$/.test(h) && /^[A-Z0-9]{3}$/.test(t);
      const label=clean(p.veh.n,120);
      // Without KBA numbers the vehicle is still shown by name.
      const cid=/^[0-9]{1,9}$/.test(String(p.veh.id==null?'':p.veh.id))?String(p.veh.id):'';
      if(ok || label) veh={hsn:ok?h:'',tsn:ok?t:'',cid,make:clean(p.veh.mk,40),model:clean(p.veh.md,80),label};
    }
    return {id,taxIncluded:p.ti!==0,lines,veh};
  }
  // Teiltool shows prices including VAT; the editor works with net prices.
  function toLines(p,rate){
    rate=Number(rate)||19;
    return p.lines.map(l=>({sku:l.sku,name:l.name,qty:l.qty,tax:rate,kind:'parts',
      price:p.taxIncluded ? Math.round(l.cents/(1+rate/100))/100 : l.cents/100}));
  }
  function findVehicle(veh){
    if(!veh) return [];
    // by catalogue vehicle id (chosen from the lists), else by KBA number
    if(veh.cid){ const byCat=companyRows('vehicles').filter(v=>String(v.catalogVehicleId||'')===veh.cid); if(byCat.length || !veh.hsn) return byCat; }
    if(!veh.hsn) return [];
    return companyRows('vehicles').filter(v=>String(v.hsn||'').trim()===veh.hsn && String(v.tsn||'').trim().toUpperCase().slice(0,3)===veh.tsn);
  }
  function open(p,vehicle){
    const hits=vehicle?[vehicle]:findVehicle(p.veh);
    const v=hits.length===1?hits[0]:null;
    invoiceDesigner('invoice', v&&v.customerId||'', null, v?v.id:'', {lines:toLines(p,19), tax:19, discount:0});
    const main=document.querySelector('.hy-main'); if(!main) return;
    const box=document.createElement('div'); box.className='tt-import-note';
    const vehTxt=p.veh?[p.veh.label||[p.veh.make,p.veh.model].filter(Boolean).join(' '),p.veh.hsn?'HSN/TSN '+p.veh.hsn+' / '+p.veh.tsn:''].filter(Boolean).join(' · '):'';
    box.innerHTML='<b>'+esc(t('ttImported'))+'</b> '+esc(t('ttDraftHint'))+(vehTxt?'<br>'+esc(t('vehicle'))+': '+esc(vehTxt):'')
      +(p.veh&&!v?(hits.length>1?'<br>'+esc(t('ttVehMany')):'<br>'+esc(t('ttVehNew'))+' <button type="button" class="btn small" id="ttVehAdd">'+esc(t('addVehicle'))+'</button>'):'');
    main.insertBefore(box,main.firstChild);
    const add=document.getElementById('ttVehAdd');
    if(add) add.onclick=()=>{
      // Keep the cart while the vehicle form is open; resume() reopens it.
      api._resume=p;
      const cust=document.getElementById('fcust'); const cid=cust&&cust.value!=='walkin'?cust.value:'';
      vehicleModal({hsn:p.veh.hsn,tsn:p.veh.tsn,make:p.veh.make,model:p.veh.model||p.veh.label,customerId:cid});
    };
  }
  function seen(id){ return (db.settings.ttImports||[]).includes(id); }
  function mark(id){ db.settings.ttImports=(db.settings.ttImports||[]).filter(x=>x!==id).concat([id]).slice(-50); save(); }
  const api={
    decode, validate, toLines, _resume:null,
    pending(){ try{ return sessionStorage.getItem(KEY)||''; }catch(e){ return ''; } },
    // Called once after login.
    consume(){
      const raw=api.pending(); if(!raw) return false;
      try{ sessionStorage.removeItem(KEY); }catch(e){}
      const p=validate(decode(raw));
      if(!p){ toast(t('ttBad')); return false; }
      if(typeof canEdit==='function' && !canEdit()){ toast(t('ttBad')); return false; }
      const go=()=>{ mark(p.id); session.page='invoices'; render(); setTimeout(()=>open(p),150); };
      // The same cart is not imported twice by accident (reload, back button).
      if(seen(p.id)) askConfirm(t('ttAgain'), t('ttAgainHint'), go); else go();
      return true;
    },
    // After the vehicle from the cart was created: back to the draft.
    resume(vehicle){
      const p=api._resume; if(!p) return false;
      api._resume=null; setTimeout(()=>open(p,vehicle),150); return true;
    }
  };
  window.WP=window.WP||{}; WP.TeiltoolImport=api;
})();
