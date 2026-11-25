// Owner page "Lieferantenbestellungen": open shop orders grouped by the supplier of each article,
// so one order per supplier can be placed before the daily cut-off. Data, supplier names and the
// Excel files come from the company's own server, which answers the platform owner only.
// Nothing is stored here except which positions were already ordered (this device).
(function(){
  const API='https://teiltool-fahrzeugsuche.onrender.com';
  const KEY='wp-supplier-ordered';
  const state={data:null,loading:false,error:'',showOrdered:false};
  const L=(k,de)=>{ try{ const v=t(k); return v&&v!==k?v:de; }catch(e){ return de; } };

  function marks(){
    try{ const m=JSON.parse(localStorage.getItem(KEY)||'{}'); return m&&typeof m==='object'?m:{}; }catch(e){ return {}; }
  }
  function saveMarks(m){
    // keep four weeks; an order shipped in the shop disappears from the list by itself
    const limit=Date.now()-28*864e5;
    Object.keys(m).forEach(k=>{ if(!(m[k]>limit)) delete m[k]; });
    try{ localStorage.setItem(KEY,JSON.stringify(m)); }catch(e){}
  }
  async function load(){
    state.loading=true; state.error=''; draw();
    let tok='';
    try{ const s=await window.supabaseClient.auth.getSession(); tok=(s.data&&s.data.session&&s.data.session.access_token)||''; }catch(e){}
    if(!tok){ state.loading=false; state.error='login'; return draw(); }
    const skip=Object.keys(marks()).filter(k=>/^\d{1,20}$/.test(k)).slice(0,400).join(',');
    const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),60000);
    try{
      const r=await fetch(API+'/wp/supplier-orders'+(skip?'?skip='+skip:''),{headers:{Authorization:'Bearer '+tok},signal:ctl.signal});
      const j=await r.json().catch(()=>null);
      if(r.ok&&j&&Array.isArray(j.suppliers)){ state.data=j; }
      else state.error=r.status===403?'owner':r.status===401?'login':r.status===503?'setup':'offline';
    }catch(e){ state.error='offline'; }
    finally{ clearTimeout(tm); state.loading=false; draw(); }
  }

  function address(p){
    if(p.pickup) return '<b>ABHOLUNG</b>';
    const c=p.customer||{};
    return [c.name&&'<b>'+esc(c.name)+'</b>',esc(c.company),esc(c.street),esc(c.extra),esc([c.zip,c.city].filter(Boolean).join(' ')),esc(c.country),c.phone&&'Tel. '+esc(c.phone)].filter(Boolean).join('<br>');
  }
  function download(s){
    try{
      const bin=atob(s.xlsx), bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
      const a=document.createElement('a'); a.href=url; a.download=s.file||'Bestellung.xlsx';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000);
    }catch(e){ toast(L('saveFailed','Speichern fehlgeschlagen')); }
  }
  function sender(){
    const w=(typeof workshop==='function'&&workshop())||{};
    return [w.name||w.brand,w.street||w.address,[w.zip,w.city].filter(Boolean).join(' ')].filter(Boolean).map(esc).join(' · ');
  }
  function printDoc(s,direct){
    const open=s.positions.filter(p=>p.paid&&!p.ordered);
    const day=new Date().toLocaleDateString('de-DE');
    let body;
    if(direct){
      body='<table><thead><tr><th>Bestellung</th><th>Lieferadresse</th><th>Artikelnummer</th><th>Bezeichnung</th><th class="n">Menge</th></tr></thead><tbody>'+
        open.map(p=>'<tr><td>'+esc(p.order)+'<br><small>'+esc(p.date)+'</small></td><td>'+address(p)+'</td><td><b>'+esc(p.article)+'</b>'+(p.ean?'<br><small>EAN '+esc(p.ean)+'</small>':'')+'</td><td>'+esc(p.title)+(p.note?'<br><small>Hinweis: '+esc(p.note)+'</small>':'')+'</td><td class="n">'+p.quantity+'</td></tr>').join('')+'</tbody></table>';
    }else{
      body='<table><thead><tr><th>Artikelnummer</th><th>EAN</th><th>Marke</th><th>Bezeichnung</th><th class="n">Menge</th><th>Bestellungen</th></tr></thead><tbody>'+
        s.totals.map(r=>'<tr><td><b>'+esc(r.article)+'</b></td><td>'+esc(r.ean)+'</td><td>'+esc(r.brand)+'</td><td>'+esc(r.title)+'</td><td class="n">'+r.quantity+'</td><td>'+esc((r.orders||[]).join(', '))+'</td></tr>').join('')+'</tbody></table>';
    }
    const html='<!doctype html><html lang="de"><head><meta charset="utf-8"><title>'+esc((direct?'Kundenversand ':'Bestellung ')+s.name+' '+day)+'</title><style>'+
      '@page{size:A4;margin:14mm}body{font:12px/1.4 Arial,Helvetica,sans-serif;color:#111}h1{font-size:18px;margin:0 0 2px}p{margin:0 0 12px;color:#444}'+
      'table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:5px 6px;text-align:left;vertical-align:top}th{background:#eee}.n{text-align:right;white-space:nowrap}small{color:#555}tr{page-break-inside:avoid}'+
      '</style></head><body><h1>'+esc(direct?'Bestellung mit Direktversand an Kunden':'Bestellung')+' – '+esc(s.name)+'</h1><p>'+esc(day)+' · '+sender()+
      (direct?'<br>Bitte je Position direkt an die angegebene Lieferadresse senden, ohne Rechnung und ohne Preise im Paket.':'')+'</p>'+body+'</body></html>';
    let f=document.getElementById('supplierPrintFrame');
    if(!f){ f=document.createElement('iframe'); f.id='supplierPrintFrame'; f.setAttribute('aria-hidden','true'); f.style.cssText='position:fixed;right:0;bottom:0;width:210mm;height:297mm;opacity:0;border:0;z-index:-1'; document.body.appendChild(f); }
    let done=false; const go=()=>{ if(done) return; done=true; try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){ toast(L('printFail','Drucken fehlgeschlagen')); } };
    f.onload=go; f.srcdoc=html; setTimeout(go,800);
  }

  function supplierCard(s,i){
    const open=s.positions.filter(p=>p.paid&&!p.ordered).length;
    const rows=s.positions.filter(p=>state.showOrdered||!p.ordered);
    return `<div class="card so-card">
      <div class="so-head"><h2>${esc(s.name)}</h2>
        <span class="so-pill">${open} ${L('soOpen','offen')}</span>
        ${s.unpaid?`<span class="so-pill warn">${s.unpaid} ${L('soUnpaid','nicht bezahlt')}</span>`:''}
        ${s.ordered?`<span class="so-pill ok">${s.ordered} ${L('soOrdered','bestellt')}</span>`:''}
      </div>
      <div class="toolbar">
        <button class="btn primary" data-so="xlsx" data-i="${i}" ${s.xlsx?'':'disabled'}>⬇ Excel</button>
        <button class="btn" data-so="pdf" data-i="${i}" ${open?'':'disabled'}>🖨 ${L('soPdfSum','PDF Sammelbestellung')}</button>
        <button class="btn" data-so="pdfd" data-i="${i}" ${open?'':'disabled'}>🖨 ${L('soPdfDirect','PDF Kundenversand')}</button>
        <button class="btn ok" data-so="all" data-i="${i}" ${open?'':'disabled'}>✓ ${L('soMarkAll','Alle als bestellt markieren')}</button>
      </div>
      <div class="table-wrap"><table class="so-table"><thead><tr><th></th><th>${L('soOrder','Bestellung')}</th><th>${L('soCustomer','Kunde / Lieferadresse')}</th><th>${L('soArticle','Artikelnummer')}</th><th>${L('soTitle','Bezeichnung')}</th><th>${L('soQty','Menge')}</th></tr></thead><tbody>
      ${rows.map(p=>`<tr class="${p.ordered?'so-done':''} ${p.paid?'':'so-unpaid'}">
        <td><input type="checkbox" data-line="${esc(p.line)}" ${p.ordered?'checked':''} ${p.paid?'':'disabled'} title="${L('soOrdered','bestellt')}"></td>
        <td><b>${esc(p.order)}</b><br><small>${esc(p.date)}</small>${p.paid?'':`<br><small class="so-warn">${esc(p.payment)}</small>`}</td>
        <td>${address(p)}${p.shipping?`<br><small>${esc(p.shipping)}</small>`:''}</td>
        <td><b>${esc(p.article)}</b>${p.ean?`<br><small>EAN ${esc(p.ean)}</small>`:''}<br><small>${esc(p.brand)}</small></td>
        <td>${esc(p.title)}${p.note?`<br><small>${esc(p.note)}</small>`:''}</td>
        <td class="so-qty">${p.quantity}</td></tr>`).join('')||`<tr><td colspan="6" class="muted">${L('soAllDone','Alles bestellt.')}</td></tr>`}
      </tbody></table></div></div>`;
  }
  function draw(){
    const host=document.getElementById('content'); if(!host||session.page!=='supplierOrders') return;
    const d=state.data;
    const msg={login:L('soLogin','Bitte mit dem Cloud-Konto anmelden.'),owner:L('ownerOnly','Nur Inhaber'),setup:L('soSetup','Die Verbindung zum Shop ist noch nicht eingerichtet.'),offline:L('soOffline','Der Server antwortet nicht. Bitte in einer Minute erneut versuchen.')}[state.error]||'';
    host.innerHTML=head(L('supplierOrders','Lieferantenbestellungen'),`<div class="toolbar">
        <label class="so-toggle"><input type="checkbox" id="soShow" ${state.showOrdered?'checked':''}> ${L('soShowOrdered','Bestellte anzeigen')}</label>
        <button class="btn primary" id="soReload" ${state.loading?'disabled':''}>↻ ${L('soReload','Aktualisieren')}</button></div>`)+
      `<div class="alert">${L('soHint','Offene, bezahlte Shop-Bestellungen je Lieferant. Bestellschluss 16:00 Uhr. Nach dem Bestellen die Positionen abhaken, damit sie morgen nicht erneut in der Datei stehen.')}</div>`+
      (state.loading?`<div class="card muted">${L('soLoading','Bestellungen werden geladen …')}</div>`:'')+
      (msg?`<div class="alert bad">${esc(msg)}</div>`:'')+
      (d&&!state.loading?(
        (d.notes||[]).map(n=>`<div class="alert">${esc(n)}</div>`).join('')+
        (d.suppliers.length?d.suppliers.map(supplierCard).join(''):`<div class="card">${L('soNone','Keine offenen Bestellungen.')}</div>`)+
        `<p class="muted">${L('soStand','Stand')}: ${esc(new Date(d.generated).toLocaleString('de-DE'))}</p>`):'');
    const re=document.getElementById('soReload'); if(re) re.onclick=load;
    const sh=document.getElementById('soShow'); if(sh) sh.onchange=()=>{ state.showOrdered=sh.checked; draw(); };
    host.querySelectorAll('[data-so]').forEach(b=>b.onclick=()=>{
      const s=d.suppliers[Number(b.dataset.i)]; if(!s) return;
      if(b.dataset.so==='xlsx') return download(s);
      if(b.dataset.so==='pdf') return printDoc(s,false);
      if(b.dataset.so==='pdfd') return printDoc(s,true);
      askConfirm(L('soMarkAllAsk','Alle offenen Positionen dieses Lieferanten als bestellt markieren?'),s.name,()=>{
        const m=marks(); s.positions.forEach(p=>{ if(p.paid&&!p.ordered) m[p.line]=Date.now(); }); saveMarks(m); load();
      });
    });
    host.querySelectorAll('input[data-line]').forEach(c=>c.onchange=()=>{
      const m=marks(); if(c.checked) m[c.dataset.line]=Date.now(); else delete m[c.dataset.line]; saveMarks(m); load();
    });
  }
  function pageFn(){
    if(typeof isDev!=='function'||!isDev()){ toast(L('ownerOnly','Nur Inhaber')); session.page='dashboard'; return render(); }
    draw();
    if(!state.data&&!state.loading) load();
  }
  window.WP=window.WP||{}; WP.pages=WP.pages||{}; WP.pages.supplierOrders=pageFn;
  WP.SupplierOrders={marks,address};
})();
