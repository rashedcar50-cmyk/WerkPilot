/* BayMeister screens */
function vehicleOf(vid){ return (window.vehicleOf && window.vehicleOf!==vehicleOf)? window.vehicleOf(vid) : ((db.vehicles||[]).find(x=>x.id===vid)); }
function customerOf(cid){ return (db.customers||[]).find(c=>c.id===cid); }
function customerOfVehicle(vid){
  const v = (typeof vehicleOf==='function') ? vehicleOf(vid) : ((db.vehicles||[]).find(x=>x.id===vid));
  if(v && v.customerId) return customerOf(v.customerId);
  return null;
}
function customerName(cid){ const c=customerOf(cid); return (c&&(c.companyName||c.name))||'-'; }
function vehicleName(vid){ const v=vehicleOf(vid); return v?`${v.plate||v.vin||'-'} · ${v.make||''} ${v.model||''}`:'-'; }
window.vehicleOf=vehicleOf; window.customerOf=customerOf; window.customerOfVehicle=customerOfVehicle;
window.customerName=customerName; window.vehicleName=vehicleName;
function nav(){
 return [
  ['dashboard', t('dash')],['customers', t('customers')],['vehicles', t('vehicles')],['repairs', t('repairs')],['appointments', t('appointments')],
  ['estimates', t('estimates')],['invoices', t('invoices')],['purchases', t('purchases')],
  ['inventory', t('inventory')],['employees', t('employees')],['expenses', t('expenses')],
  ['journal', t('journal')],['reports', t('reports')],['integrations', t('integrations')],
  ['audit', t('audit')],['help', t('help')||'Hilfe'],['settings', t('settings')],['studio', t('studio')]
 ];
}

if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
function login(){
 applyUiLang();
 $('#app').innerHTML=`<div class="login-screen"><div class="login-card">
 <div class="brand-mark"><div class="brand-word">Werkivo</div></div><div class="tag">${t('tag')}</div>
 <div class="field"><label>${t('user')}</label><input id="lu" autocomplete="username"></div>
 <div class="field"><label>${t('pass')}</label><input id="lp" type="password" autocomplete="current-password"></div>
 <div class="field"><label>${t('language')}</label><select id="loginLang">${langOptions(db.settings.uiLang||'ar')}</select></div>
 <button class="btn primary full" id="loginBtn">${t('login')}</button>
 <div class="login-fail" id="loginErr"></div><p class="muted" style="margin-top:14px;font-size:.8rem"><a href="impressum.html">Impressum</a> · <a href="privacy.html">Datenschutz</a></p>
 </div></div>`;
 if(typeof scrubUiLang==='function') scrubUiLang($('#app'));
 window._loginFails = window._loginFails || 0;
 const lg=$('#loginLang');
 if(lg){ lg.onchange=()=>{db.settings.uiLang=lg.value;save();login();}; }
 $('#loginBtn').onclick=()=>{
  if(lg) {db.settings.uiLang=lg.value;save();}
  if(window._loginFails>=5) return $('#loginErr').textContent=t('loginBlocked');
  const u=db.users.find(x=>x.u===$('#lu').value.trim()&&x.p===$('#lp').value);
  if(!u){ window._loginFails++; $('#loginErr').textContent=t('loginBad'); return toast(t('loginBad')); }
  window._loginFails=0;
  session={user:u,company:db.companies[0],page:'dashboard'};
  audit('login');
  syncAllCloud().finally(()=>{ WP.run("afterLogin", session); render(); });
 };
}

function render(){
 applyUiLang();
 document.documentElement.style.setProperty('--font',db.settings.font+'px');
 const allowed=nav().filter(([k])=>roleCan(k));
 $('#app').innerHTML=`<div class="shell henry-skin">
 <div class="henry-top"><span class="ver">v1.11.6</span> Sie sind angemeldet als: ${esc(session.user.name||'')} · TST
  <span class="henry-top-right"><button class="btn ghost small" id="logout">${t('logout')}</button></span>
 </div>
 <aside class="sidebar" id="side"><div class="sidebrand"><div class="brand-mark"><div class="brand-word">Werkivo</div></div><div class="muted" style="margin:6px 0 10px;font-size:.78rem">${t('tag')}</div></div><div class="nav">
 ${allowed.map(([k,l])=>`<button data-page="${k}" class="${session.page===k?'active':''}">${l}</button>`).join('')}
 </div></aside>
 <main class="main">
  <div class="topbar">
   <div class="top-actions"><button class="btn ghost mobile-menu" id="menu">☰</button>
   <select id="company">${visibleCompanies().map(c=>`<option value="${c.id}" ${c.id===session.company.id?'selected':''}>${esc(c.profile?.workshopBrand||c.name)} · ${c.country}</option>`).join('')}</select>${canEdit()?`<button class="btn ghost small" id="addWorkshop" title="${t('newWorkshop')}">＋</button>`:''}
   <input class="searchbox" id="qsearch" placeholder="${t('search')}"></div>
   <div class="top-actions lang-row"><button class="btn ghost small" id="backBtn">${t('prev')}</button><select id="uiLangTop" title="لغة البرنامج">${langOptions(db.settings.uiLang||'ar')}</select><span class="badge hide-mobile"><span class="dot"></span>${esc(dLabel(session.user.name))}</span></div>
  </div>
  <div class="content" id="content"></div>
 </main>
 <nav class="bottom-nav">
  ${[['dashboard',t('todayShort')],['repairs',t('ordersShort')],['vehicles',t('carsShort')],['appointments',t('apptShort')],['invoices',t('invShort')]].filter(([k])=>roleCan(k)).map(([k,l])=>`<button data-page="${k}" class="${session.page===k?'active':''}">${l}</button>`).join('')}
 </nav>
</div>`;
 $$('[data-page]').forEach(b=>b.onclick=()=>goPage(b.dataset.page));
 if($('#backBtn')) $('#backBtn').onclick=goBack;
 $('#logout').onclick=()=>{audit('logout');session=null; const f=$('#devFab'); if(f)f.remove(); const p=$('#devPanel'); if(p)p.remove(); login()};
 $('#company').onchange=e=>{session.company=db.companies.find(c=>c.id===e.target.value);session.page='dashboard';syncAllCloud().finally(()=>render())};
 if($('#addWorkshop')) $('#addWorkshop').onclick=newWorkshopModal;
 if($('#uiLangTop')) $('#uiLangTop').onchange=e=>{db.settings.uiLang=e.target.value;save();applyUiLang();render();};
 $('#menu').onclick=()=>$('#side').classList.toggle('open');
 const qs=$('#qsearch');
 if(qs){
  qs.onkeydown=e=>{
   if(e.key==='Enter'){
     const q=qs.value.trim();
     if(!q) return;
     showSearchResults(q);
   }
  };
 }
 page();
 mountDevDock();
}
function mountDevDock(){
  if(typeof isDev!=='function' || !isDev()) return;
  if($('#devFab')) return;
  const fab=document.createElement('button');
  fab.id='devFab'; fab.className='dev-fab'; fab.title='Grok — طلب تعديل'; fab.textContent='G';
  document.body.appendChild(fab);
  fab.onclick=()=>toggleDevPanel();
}
function toggleDevPanel(){
  const old=$('#devPanel');
  if(old){ old.remove(); return; }
  const box=document.createElement('div');
  box.id='devPanel'; box.className='dev-panel';
  const reqs=db.settings.devRequests||[];
  box.innerHTML=`<h3>Grok داخل الورشة</h3>
    <p class="muted">هاللوحة إلك وحدك (owner). اكتب التعديل، بنحفظه هون. بعدين افتح محادثة Grok والصق الطلب حتى ينفّذ فوراً.</p>
    <textarea id="devAsk" placeholder="مثال: أضف خانة رقم الهيكل على بطاقة الأمر"></textarea>
    <div class="toolbar" style="margin-top:8px">
      <button class="btn primary" id="devSave">حفظ الطلب</button>
      <button class="btn" id="devCopy">نسخ الكل</button>
      <button class="btn ghost" id="devClose">إغلاق</button>
    </div>
    <div class="dev-req">${reqs.length?reqs.slice().reverse().map(r=>`<div><b>${esc(r.ts)}</b><div>${esc(r.text)}</div></div>`).join(''):'<div class="muted">ما في طلبات بعد.</div>'}</div>`;
  document.body.appendChild(box);
  $('#devClose').onclick=()=>box.remove();
  $('#devSave').onclick=()=>{
    const text=$('#devAsk').value.trim();
    if(!text) return toast('اكتب الطلب أولاً');
    db.settings.devRequests=db.settings.devRequests||[];
    db.settings.devRequests.push({ts:new Date().toLocaleString(),text});
    save(); toast('تم حفظ الطلب'); box.remove(); toggleDevPanel();
  };
  $('#devCopy').onclick=()=>{
    const text=(db.settings.devRequests||[]).map(r=>'- '+r.text).join('\n')||$('#devAsk').value;
    navigator.clipboard.writeText(text).then(()=>toast('تم النسخ — الصقه في Grok')).catch(()=>toast(text));
  };
}
function page(){
 const m={dashboard,customers,vehicles,repairs,appointments,estimates,invoices,purchases,inventory,employees,expenses,journal,reports,integrations,audit:auditPage,help:helpPage,settings,studio};
 Object.keys(WP.pages||{}).forEach(k=>{ m[k]=WP.pages[k]; });
 const fn = m[session.page]||dashboard;
 WP.run('beforeRender', session);
 fn();
 if(typeof scrubUiLang==='function'){ scrubUiLang($('#app')); scrubUiLang($('#modalRoot')); }
 WP.run('afterRender', session);
}
function head(title,action=''){return `<div class="page-title"><h1>${title}</h1>${action}</div>`}
function archiveBeleg(inv){
  if(!inv) return;
  try{
    db.archive=db.archive||[];
    const existing=db.archive.find(x=>x.invoiceId===inv.id && x.locked);
    if(existing) return existing;
    let html='';
    try{ html=typeof buildWorkshopRechnung==='function'?buildWorkshopRechnung(inv):''; }catch(e){ html=''; }
    const snap={id:id('a'),invoiceId:inv.id,number:inv.number,total:inv.total,date:inv.date,html,ts:new Date().toISOString(),companyId:session&&session.company&&session.company.id,locked:true};
    const i=db.archive.findIndex(x=>x.invoiceId===inv.id);
    if(i>=0) db.archive[i]=snap; else db.archive.unshift(snap);
    db.archive=db.archive.slice(0,250);
  }catch(e){ console.warn('archive',e); }
}
function helpPage(){
  $('#content').innerHTML=head(t('help')||'Hilfe')+`<div class="card" dir="ltr" lang="de">
    <h2>Werkivo — Kurz-Anleitung</h2>
    <ol>
      <li>Anmelden (Mechaniker: ismail / 1977A).</li>
      <li>Fahrzeugschein fotografieren — Kunde und Fahrzeug werden angelegt.</li>
      <li>km-Stand prüfen, Auftrag oder Rechnung öffnen.</li>
      <li>Positionen wie in Henry: Nummer, Menge, Enter.</li>
      <li>Speichern → Vorschau → Drucken / PDF (Belegnummer bleibt).</li>
    </ol>
    <p>Rechnung bleibt immer Deutsch. Programmsprache ändert nur die Bedienung.</p>
    <p class="muted">Archiv: ${((db.archive)||[]).length} Belege · Konflikte: ${((db.conflicts)||[]).length}</p>
  </div>`;
}

const PAGE_SIZE = 50;
function table(headers, rows, pageKey){
  if(!rows.length) return `<div class="card muted">${t('noData')}</div>`;
  const key = pageKey || 'default';
  if(!window._tblPage) window._tblPage = {};
  if(window._tblPage[key] == null) window._tblPage[key] = 0;
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if(window._tblPage[key] >= pages) window._tblPage[key] = pages - 1;
  const page = window._tblPage[key];
  const slice = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pager = pages > 1 ? `<div class="toolbar" style="margin-top:10px;justify-content:space-between">
    <span class="muted">${t('showing')} ${page*PAGE_SIZE+1}–${Math.min((page+1)*PAGE_SIZE,total)} ${t('of')} ${total}</span>
    <div class="toolbar">
      <button class="btn small ghost" ${page<=0?'disabled':''} onclick="window._tblPage['${key}']=${page-1};render()">${t('prev')}</button>
      <span class="muted">${page+1} / ${pages}</span>
      <button class="btn small ghost" ${page>=pages-1?'disabled':''} onclick="window._tblPage['${key}']=${page+1};render()">${t('next')}</button>
    </div>
  </div>` : `<div class="muted" style="margin-top:8px">${total} ${t('records')}</div>`;
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${slice.map(r=>`<tr>${r.map(c=>`<td>${c??''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${pager}`;
}

function shareBar(type, id){
  return `<div class="share-bar">
    <button class="btn small" onclick="exportPrint('${type}','${id||''}')">🖨️ ${t('print')}</button>
    <button class="btn small" onclick="exportPDF('${type}','${id||''}')">📄 ${t('pdf')}</button>
    <button class="btn small" onclick="exportEmail('${type}','${id||''}')">✉️ ${t('email')}</button>
    <button class="btn small" onclick="exportWhatsApp('${type}','${id||''}')">💬 ${t('whatsapp')}</button>
  </div>`;
}

function listShareBar(type){
  return `<div class="share-bar">
    <button class="btn small" onclick="exportPrint('${type}','')">🖨️ ${t('printList')}</button>
    <button class="btn small" onclick="exportPDF('${type}','')">📄 ${t('pdfList')}</button>
    <button class="btn small" onclick="exportEmail('${type}','')">✉️ ${t('email')}</button>
    <button class="btn small" onclick="exportWhatsApp('${type}','')">💬 ${t('whatsapp')}</button>
  </div>`;
}

function buildDocHTML(type, id){
  const co = session?.company?.name || 'WerkPilot';
  const now = new Date().toLocaleString((db.settings.uiLang==='de'?'de-DE':db.settings.uiLang==='en'?'en-GB':'ar'));
  let title = '', body = '';

  if(type === 'customers'){
    title = t('listCustomers');
    const rows = companyRows('customers');
    body = `<table><thead><tr><th>${t('name')}</th><th>${t('phone')}</th><th>${t('email')}</th><th>${t('address')}</th></tr></thead><tbody>` +
      rows.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone||'')}</td><td>${esc(c.email||'')}</td><td>${esc(c.address||'')}</td></tr>`).join('') +
      `</tbody></table>`;
  } else if(type === 'vehicles'){
    title = t('listVehicles');
    const rows = companyRows('vehicles');
    body = `<table><thead><tr><th>${t('customer')}</th><th>${t('plate')}</th><th>VIN</th><th>${t('make')}</th><th>${t('model')}</th><th>${t('year')}</th></tr></thead><tbody>` +
      rows.map(v=>`<tr><td>${esc(customerName(v.customerId))}</td><td>${esc(v.plate||'')}</td><td>${esc(v.vin||'')}</td><td>${esc(v.make||'')}</td><td>${esc(v.model||'')}</td><td>${esc(v.year||'')}</td></tr>`).join('') +
      `</tbody></table>`;
  } else if(type === 'purchases'){
    title = id ? t('purchaseInv') : t('listPurchases');
    let rows = companyRows('purchases');
    if(id) rows = rows.filter(x => x.id === id);
    body = `<table><thead><tr><th>${t('supplier')}</th><th>${t('invNum')}</th><th>${t('date')}</th><th>${t('total')}</th><th>${t('status')}</th></tr></thead><tbody>` +
      rows.map(x=>{
        const total = Number(x.total_amount || (x.qty||0)*(x.price||0) || 0);
        return `<tr><td>${esc(x.supplier||'')}</td><td>${esc(x.invoice_number||x.item||'')}</td><td>${esc(x.date||'')}</td><td>${money(total)}</td><td>${esc(x.payment_status||'')}</td></tr>`;
      }).join('') + `</tbody></table>`;
  } else if(type === 'invoices'){
    const L = WP_INV_DE;
    let rows = (db.invoices||[]).filter(x=>!session.company || x.companyId===session.company.id);
    if(id){
      const x = rows.find(i=>i.id===id) || db.invoices.find(i=>i.id===id);
      title = '';
      try{ body = x ? buildWorkshopRechnung(x) : '<p>Rechnung nicht gefunden</p>'; }
      catch(err){ console.error(err); body = '<p>Rechnung: '+(err&&err.message?esc(err.message):'Fehler')+'</p>'; }
    } else {
      title = L.invoices;
      body = `<table><thead><tr><th>${L.number}</th><th>${L.type}</th><th>${L.vehicle}</th><th>${L.net}</th><th>${L.tax}</th><th>${L.total}</th><th>${L.payment}</th></tr></thead><tbody>`+
        rows.map(r=>`<tr><td>${esc(r.number||r.id)}</td><td>${esc(r.type||L.invoice)}</td><td>${esc(vehicleName(r.vehicleId)||L.cash)}</td><td>${money(r.net)}</td><td>${r.tax||0}%</td><td>${money(r.total)}</td><td>${esc(r.payment||'')}</td></tr>`).join('')+
        `</tbody></table>`;
    }
  } else if(type === 'inventory'){
    title = t('listInventory');
    const rows = companyRows('inventory');
    body = `<table><thead><tr><th>${t('skuCol')}</th><th>${t('name')}</th><th>${t('qty')}</th><th>${t('buy')}</th><th>${t('sell')}</th></tr></thead><tbody>` +
      rows.map(x=>`<tr><td>${esc(x.sku||'')}</td><td>${esc(dLabel(x.name||''))}</td><td>${x.qty}</td><td>${money(x.buy)}</td><td>${money(x.sell)}</td></tr>`).join('') +
      `</tbody></table>`;
  } else {
    title = t('report');
    body = '<p>'+t('noData')+'</p>';
  }

  if(type==='invoices' && id) return `<div class="print-doc inv-a4">${body}</div>`;
  return `<div class="print-doc"><h1>${title}</h1><div class="meta">${esc(co)} · ${now}</div>${body}</div>`;
}

function plainTextDoc(type, id){
  const div = document.createElement('div');
  div.innerHTML = buildDocHTML(type, id);
  return (div.innerText || div.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

function printDocMarkup(type, id){
  const html = buildDocHTML(type, id);
  const dl=docLang(); const ddr=(type==="invoices"&&dl==="de")?"ltr":(WP_RTL.includes(db.settings.uiLang||"ar")?"rtl":"ltr");
  return `<!doctype html><html lang="${type==="invoices"?dl:(db.settings.uiLang||"ar")}" dir="${ddr}"><head><meta charset="utf-8"><title>TST</title>
    <style>
      @page{size:${(workshop().printPaper||db.settings.printPaper||'A4')} portrait;margin:${(workshop().printMargin||db.settings.printMargin||'8mm')}}
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      html,body{height:auto;margin:0}
      body{font-family:Arial,Helvetica,sans-serif;padding:0;direction:${ddr};color:#111;font-size:11px${(db.settings.printColor===false)?';filter:grayscale(1)':''}}
      .print-doc,.inv-a4{margin:0;padding:0}
      .rechnung{width:100%;max-width:190mm;margin:0 auto}
      .rh-main{display:block}
      .rh-title{text-align:center;font-family:Georgia,'Times New Roman',Times,serif;font-size:18px;font-weight:700;letter-spacing:.5px;margin:0;color:#d4af37}
      .rh-legal{text-align:center;font-size:10px;margin:2px 0}
      .rh-sub{text-align:center;font-size:10px;margin-bottom:10px}
      .rh-grid{display:flex;justify-content:space-between;gap:16px;margin-bottom:10px}
      .rh-cust{font-size:12px;line-height:1.3}
      .meta-tbl{font-size:11px;border-collapse:collapse}
      .meta-tbl td{padding:0 8px 0 0;border:0;text-align:left}
      .meta-tbl td:first-child{font-weight:700;padding-right:10px}
      .rh-h{font-size:16px;margin:6px 0 4px}
      .pos-tbl{width:100%;border-collapse:collapse;margin-top:4px}
      .pos-tbl th{text-align:left;border-bottom:1px solid #111;padding:3px 5px;font-size:11px;background:transparent}
      .pos-tbl td{border:0;border-bottom:1px solid #eee;padding:3px 5px;text-align:left}
      .pos-tbl td:nth-child(4),.pos-tbl td:nth-child(5),.pos-tbl td:nth-child(6),.pos-tbl td:nth-child(7){text-align:right}
      .rh-henry-title{text-align:center;font-size:20px;font-weight:800;letter-spacing:.4px;margin:0 0 6px;line-height:1.15}
      .rh-henry-title span{font-size:16px;font-weight:700}
      .rh-sender{font-size:8px;text-decoration:underline;margin:0 0 14px}
      .rh-docname{font-size:18px;font-weight:800;margin:8px 0 6px}
      .rh-tot{display:flex;justify-content:space-between;gap:20px;margin-top:12px;font-size:11.5px}
      .rh-tot>div{min-width:46%}
      .rh-tot div div{display:flex;justify-content:space-between;padding:1px 0}
      .grand{font-weight:800;border-top:1px solid #111;margin-top:3px;padding-top:3px}
      .rh-thanks{margin:12px 0 4px;font-size:12px;font-style:italic}
      .rh-pay{font-size:10px;margin-top:6px}
      .rh-legalhint{font-size:9px;margin-top:6px;color:#333}
      .rh-foot{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #111;margin-top:10px;padding-top:6px;font-size:9px;page-break-inside:avoid}
      .rh-foot>div{flex:1}
      .rh-band{display:block;width:100%;text-align:center;background:#111;color:#d4af37;padding:10px 0;margin:0 0 8px;border-bottom:3px solid #d4af37}
      .rh-band .rh-title,.rh-band td{color:#d4af37;text-align:center!important;font-family:Georgia,'Times New Roman',Times,serif;font-size:18px;letter-spacing:.5px;width:100%}
      .rh-band .rh-doc{color:#fff}
      .rh-doc{font-size:26px;font-weight:800;letter-spacing:1px}
      .tpl-classic{padding:0}
      .tpl-classic .rh-top{display:block;text-align:center;margin-bottom:12px}
      
      .tpl-atelier .rh-split{display:block;text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px}
      
      h1{margin:0 0 8px}.meta{color:#555;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
    </style>
    </head><body>${html}</body></html>`;
}
function getPrintFrame(){
  let f=document.getElementById('printFrame');
  if(!f){
    f=document.createElement('iframe');
    f.id='printFrame';
    f.setAttribute('aria-hidden','true');
    f.style.cssText='position:fixed;right:0;bottom:0;width:210mm;height:297mm;opacity:0;border:0;z-index:-1';
    document.body.appendChild(f);
  }
  return f;
}
function exportPrint(type, id){
  const live=document.querySelector('#prevHost iframe');
  if(live && live.contentWindow){
    try{ live.contentWindow.focus(); live.contentWindow.print(); return; }
    catch(e){}
  }
  let page='';
  try{ page=printDocMarkup(type,id); }
  catch(e){ console.error(e); return toast((e&&e.message)||t('printFail')); }
  const iframe=getPrintFrame();
  let done=false;
  const go=()=>{
    if(done) return; done=true;
    try{ iframe.contentWindow.focus(); iframe.contentWindow.print(); }
    catch(e){ toast(t('printFail')); }
  };
  iframe.onload=go;
  iframe.srcdoc=page;
  setTimeout(go, 700);
}
function downloadInvoiceFile(iid){
  try{
    const page=printDocMarkup('invoices', iid);
    const inv=(db.invoices||[]).find(x=>x.id===iid);
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([page],{type:'text/html;charset=utf-8'}));
    a.download=((inv&&inv.number)||'Rechnung').replace(/[^\w.-]+/g,'_')+'.html';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
    toast(t('saved'));
  }catch(e){ toast(e.message||t('pdfFail')); }
}

async function exportPDF(type, id){
  if(type==='invoices' && id) return exportInvoicePDF(id);
  try{
    await WP.loadPdf();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const text = plainTextDoc(type, id);
    const lines = doc.splitTextToSize(text, 180);
    let y = 15;
    doc.setFontSize(11);
    lines.forEach(line => {
      if(y > 280){ doc.addPage(); y = 15; }
      doc.text(line, 15, y);
      y += 6;
    });
    const name = `${type || 'report'}-${(id||'list').slice(0,12)}-${Date.now().toString(36)}.pdf`;
    doc.save(name);
    toast(t('pdfOk'));
  }catch(e){
    console.error(e);
    toast(t('pdfFail'));
  }
}
async function exportInvoicePDF(iid){
  const inv=(db.invoices||[]).find(x=>x.id===iid);
  if(!inv) return toast(t('invMissing'));
  toast(t('pdfWait'));
  try{ await WP.loadPdf(); }catch(e){ return toast('تعذر تحميل مكتبة PDF'); }
  if(!window.html2canvas || !window.jspdf) return toast('مكتبة PDF غير محمّلة — حدّث الصفحة');
  const page=printDocMarkup('invoices', iid);
  const host=document.createElement('div');
  host.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1';
  const fr=document.createElement('iframe');
  fr.style.cssText='width:794px;height:1123px;border:0;background:#fff';
  host.appendChild(fr);
  document.body.appendChild(host);
  const doc=fr.contentDocument;
  doc.open(); doc.write(page); doc.close();
  await new Promise(r=>setTimeout(r,180));
  try{
    const canvas=await window.html2canvas(doc.body,{scale:2,backgroundColor:'#ffffff',useCORS:true,windowWidth:794,windowHeight:Math.max(doc.body.scrollHeight,1123)});
    const { jsPDF }=window.jspdf;
    const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const img=canvas.toDataURL('image/jpeg',0.92);
    const pageW=210, pageH=297;
    const imgH=pageW*canvas.height/canvas.width;
    let left=imgH;
    pdf.addImage(img,'JPEG',0,0,pageW,imgH,'inv','FAST');
    let offset=pageH;
    while(left>pageH+1){
      pdf.addPage();
      pdf.addImage(img,'JPEG',0, -(offset), pageW, imgH,'inv','FAST');
      left-=pageH; offset+=pageH;
    }
    const name=(inv.number||'Rechnung').replace(/[^\w.-]+/g,'_')+'.pdf';
    archiveBeleg(inv);
    pdf.save(name);
    toast('تم حفظ PDF');
  }catch(e){
    console.error(e);
    toast(t('pdfFail'));
  }
  host.remove();
}
window.exportInvoicePDF=exportInvoicePDF;

function exportEmail(type, id){
  const subject = encodeURIComponent('Werkivo - ' + (type || 'تقرير'));
  const body = encodeURIComponent(plainTextDoc(type, id).slice(0, 1800));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function exportWhatsApp(type, id){
  const text = encodeURIComponent(plainTextDoc(type, id).slice(0, 1500));
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

window.exportPrint = exportPrint;
window.exportPDF = exportPDF;
window.exportEmail = exportEmail;
window.exportWhatsApp = exportWhatsApp;

function modal(title,body,onSave,saveText){
 saveText=saveText||t('save');
 const preview=/معاينة|Vorschau|preview|design/i.test(title);
 $('#modalRoot').innerHTML=`<div class="modal-back"><div class="modal wide">
 <div class="modal-head"><h2>${title}</h2><button class="btn ghost small" id="xmod">✕</button></div>
 ${body}${onSave?`<div class="toolbar" style="margin-top:14px"><button class="btn primary" id="msave">${saveText}</button><button class="btn ghost" id="mcancel">${t('cancelBtn')}</button></div>`:`<div class="toolbar" style="margin-top:14px"><button class="btn ghost" id="mcancel">${t('cancelBtn')}</button></div>`}
 </div></div>`;
 if(typeof scrubUiLang==='function') try{ scrubUiLang($('#modalRoot')); }catch(e){}
 $('#xmod').onclick=closeModal;
 if($('#mcancel')) $('#mcancel').onclick=closeModal;
 if($('#msave')) $('#msave').onclick=()=>{
   try{ onSave && onSave(); }catch(e){ console.error(e); toast((e&&e.message)||'Save'); }
 };
}
function closeModal(){$('#modalRoot').innerHTML=''}
window.goPage=function(p){
  if(!p) return;
  session.hist=session.hist||[];
  if(session.page && session.page!==p) session.hist.push(session.page);
  if(session.hist.length>20) session.hist=session.hist.slice(-20);
  session.page=p; render();
};
window.goBack=function(){
  session.hist=session.hist||[];
  session.page=session.hist.pop()||'dashboard';
  render();
};

function dashboard(){
 const inv=companyRows('invoices'),exp=companyRows('expenses'),rep=openRepairs(),veh=companyRows('vehicles');
 const sales=inv.reduce((a,x)=>a+Number(x.total||0),0),costs=exp.reduce((a,x)=>a+Number(x.amount||0),0);
 const low=lowStock(), due=maintenanceDue();
 const todayAp=companyRows('appointments').filter(a=>a.date===todayISO());
 const inside=rep.filter(r=>isOpenStatus(r.status));
 $('#content').innerHTML=head(t('todayBoard'))+`
 <div class="grid">
  <div class="card tap" onclick="goPage('repairs')"><div class="muted">${t('carsInShop')}</div><div class="metric">${inside.length}</div><div class="hint">${t('openBtn')}</div></div>
  <div class="card tap" onclick="goPage('repairs')"><div class="muted">${t('openJobs')}</div><div class="metric">${rep.length}</div><div class="hint">${t('openBtn')}</div></div>
  <div class="card tap" onclick="goPage('appointments')"><div class="muted">${t('todayAppts')}</div><div class="metric">${todayAp.length}</div><div class="hint">${t('openBtn')}</div></div>
  <div class="card tap" onclick="goPage('inventory')"><div class="muted">${t('lowStock')}</div><div class="metric">${low.length}</div><div class="hint">${t('openBtn')}</div></div>
  <div class="card tap" onclick="goPage('invoices')"><div class="muted">${t('sales')}</div><div class="metric">${money(sales)}</div><div class="hint">${t('openBtn')}</div></div>
  ${session.user.role==='manager'?`<div class="card tap" onclick="goPage('reports')"><div class="muted">${t('netApprox')}</div><div class="metric">${money(sales-costs)}</div><div class="hint">${t('openBtn')}</div></div>`:''}
 </div>
 ${low.length?`<div class="alert tap" onclick="goPage('inventory')"><b>${t('stockAlert')}:</b> ${low.map(x=>esc(dLabel(x.name))+' ('+x.qty+')').join(' · ')}</div>`:''}
 ${due.length?`<div class="alert tap" onclick="goPage('vehicles')"><b>${t('maintDue')}:</b> ${due.map(v=>esc(v.plate||v.vin)+' '+Number(v.km)+' km').join(' · ')}</div>`:''}
 ${(()=>{const list=companyRows('invoices'); const teile=list.reduce((s,x)=>s+Number(x.parts||0),0); const leist=list.reduce((s,x)=>s+Number(x.labor||0),0); const vat=list.reduce((s,x)=>s+Math.max(0,Number(x.total||0)-Number(x.net||0)),0); const last=db.settings.lastBackup; const stale=!last||(Date.now()-new Date(last).getTime()>86400000);
 return `<div class="card" style="margin-top:12px"><b>${t('vatReport')}</b>
 <div class="grid" style="margin-top:8px">
  <div class="card tap" onclick="goPage('invoices')"><div class="muted">${t('netParts')}</div><div class="metric">${money(teile)}</div></div>
  <div class="card tap" onclick="goPage('invoices')"><div class="muted">${t('netLabor')}</div><div class="metric">${money(leist)}</div></div>
  <div class="card tap" onclick="goPage('invoices')"><div class="muted">${t('vat19')}</div><div class="metric">${money(vat)}</div></div>
 </div></div>`+(stale?`<div class="alert tap" onclick="goPage('settings')">${t('backupWarn')}</div>`:'');
 })()}
 <div class="card" style="margin-top:12px"><b>${t('todayCars')}</b>
 ${inside.length?inside.map(r=>`<div class="today-item tap" onclick="openRepair('${r.id}')"><div>${esc(vehicleName(r.vehicleId))}<div class="muted">${esc(dLabel(r.description||''))} · ${esc(dLabel(r.tech||''))}</div></div><div><span class="status ${r.status==='انتظار قطع'?'warn':r.status==='قيد التنفيذ'?'info':'ok'}">${esc(stLabel(r.status))}</span>
 <button class="btn small" onclick="event.stopPropagation();openRepair('${r.id}')">${t('openBtn')}</button></div></div>`).join(''):`<p class="muted">${t('noCarsInShop')}</p>`}
 </div>
 <div class="card" style="margin-top:12px"><b>${t('todayApptsTitle')}</b>
 ${todayAp.length?todayAp.map(a=>`<div class="today-item tap" onclick="goPage('appointments')"><div>${esc(a.time||'')} · ${esc(vehicleName(a.vehicleId))}<div class="muted">${esc(dLabel(a.note||''))} · ${esc(dLabel(a.tech||''))}</div></div><span class="status info">${esc(stLabel(a.status))}</span></div>`).join(''):`<p class="muted">${t('noApptsToday')}</p>`}
 </div>`;
}
function showSearchResults(q){
  const s=globalSearch(q);
  $('#content').innerHTML=head(t('searchResults')+': '+esc(q))+`
  <div class="card"><b>${t('customers')}</b>${s.customers.length?table([t('name'),t('phone'),t('email')],s.customers.map(c=>[esc(c.name),esc(c.phone),esc(c.email)]),'s_c'):'<p class="muted">'+t('noResults')+'</p>'}</div>
  <div class="card" style="margin-top:10px"><b>${t('vehicles')}</b>${s.vehicles.length?table([t('plate'),'VIN',t('make'),t('model'),'km'],s.vehicles.map(v=>[esc(v.plate),esc(v.vin),esc(v.make),esc(v.model),v.km||'-']),'s_v'):'<p class="muted">'+t('noResults')+'</p>'}</div>
  <div class="card" style="margin-top:10px"><b>${t('repairs')}</b>${s.repairs.length?table([t('vehicle'),t('statement'),t('status')],s.repairs.map(r=>[vehicleName(r.vehicleId),esc(dLabel(r.description)),esc(stLabel(r.status))]),'s_r'):'<p class="muted">'+t('noResults')+'</p>'}</div>
  <div class="card" style="margin-top:10px"><b>${t('inventory')}</b>${s.inventory.length?table(['SKU',t('name'),t('qty')],s.inventory.map(i=>[esc(i.sku),esc(dLabel(i.name)),i.qty]),'s_i'):'<p class="muted">'+t('noResults')+'</p>'}</div>`;
}


function customers(){
 const rows=companyRows('customers');
 $('#content').innerHTML=head(t('customers'),canEdit()?`<button class="btn primary" id="add">${t('newCustomer')}</button>`:'')+
 listShareBar('customers')+
 table([t('name'),t('phone'),t('taxId'),t('address'),t('cars'),t('action')],rows.map(c=>[
  esc(c.companyName? (c.companyName+' · '+(c.contact||c.name||'')) : (c.name||'-')),
  esc(c.phone||'-'),esc(c.taxId||c.ustId||'-'),esc(c.address||'-'),
  db.vehicles.filter(v=>v.customerId===c.id).length,
  canEdit()?`<button class="btn small" onclick="editCustomer('${c.id}')">${t('edit')}</button>
  <button class="btn small primary" onclick="invoiceForCustomer('${c.id}')">${t('newInvoice')}</button>
  <button class="btn small" onclick="invoicesForCustomer('${c.id}')">${t('invoicesOf')}</button>`:'—'
 ]), 'customers');
 if(canEdit() && $('#add')) $('#add').onclick=customerModal;
}
function customerModal(existing){
 const c0=existing||{};
 modal(existing?t('editCustomer'):t('newCustomer'),`<div class="form-grid">
 <div class="field"><label>${t('customerType')}</label><select id="ctype"><option value="person" ${c0.type!=='company'?'selected':''}>${t('person')}</option><option value="company" ${c0.type==='company'?'selected':''}>${t('company')}</option></select></div>
 <div class="field"><label>${t('contact')}</label><input id="n" value="${esc(c0.name||c0.contact||'')}"></div>
 <div class="field"><label>${t('companyName')}</label><input id="cfirma" value="${esc(c0.companyName||'')}"></div>
 <div class="field"><label>USt-IdNr. / Steuernummer</label><input id="ctax" value="${esc(c0.taxId||c0.ustId||'')}" placeholder="DE..."></div>
 <div class="field"><label>${t('custNo')}</label><input id="kd" value="${esc(c0.kdNr||c0.number||'')}"></div>
 <div class="field"><label>${t('phone')}</label><input id="ph" value="${esc(c0.phone||'')}"></div>
 <div class="field"><label>${t('email')}</label><input id="em" value="${esc(c0.email||'')}"></div>
 <div class="field span2"><label>${t('address')}</label><input id="ad" value="${esc(c0.address||'')}"></div>
 <div class="field span2"><b>${t('custVehicle')}</b></div>
 <div class="field"><label>${t('plate')}</label><input id="vplate" placeholder="HH-AB 1234"></div>
 <div class="field"><label>${t('vinLbl')}</label><input id="vvin" maxlength="17" placeholder="W0L..."></div>
 <div class="field span2"><label>${t('kbaKey')}</label>
  <div class="kba-row">
    <input id="vhsn" maxlength="4" inputmode="numeric" placeholder="HSN 2.1">
    <input id="vtsn" maxlength="3" placeholder="TSN 2.2">
  </div>
 </div>
 <div class="field"><label>${t('make')}</label><input id="vmake"></div>
 <div class="field"><label>${t('model')}</label><input id="vmodel"></div>
 <div class="field"><label>${t('year')}</label><input id="vyear"></div>
 <div class="field"><label>${t('km')}</label><input id="vkm" class="latnum" inputmode="decimal" lang="de"></div>
 </div>`,()=>{
  const firma=$('#cfirma').value.trim();
  const person=$('#n').value.trim();
  const c={id:c0.id||id('c'),companyId:c0.companyId||session.company.id,cloudId:c0.cloudId,
    type:$('#ctype').value, name:firma||person, contact:person, companyName:firma,
    taxId:$('#ctax').value.trim(), phone:$('#ph').value, email:$('#em').value, address:$('#ad').value, kdNr:$('#kd').value.trim()};
  if(!c.kdNr) c.kdNr=nextKdNr();
  if(!c.name)return toast(t('needName'));
  if(existing){ const i=db.customers.findIndex(x=>x.id===c0.id); if(i>=0) db.customers[i]={...db.customers[i],...c}; audit('customer.update',c.name); }
  else { db.customers.push(c); audit('customer.create',c.name); }
  const plate=$('#vplate').value.trim(), vin=$('#vvin').value.trim();
  if(plate||vin){
    const v={id:id('v'),companyId:session.company.id,customerId:c.id,plate,vin,hsn:$('#vhsn').value.trim(),tsn:$('#vtsn').value.trim().toUpperCase(),kba:($('#vhsn').value.trim()+' '+$('#vtsn').value.trim().toUpperCase()).trim(),make:$('#vmake').value.trim(),model:$('#vmodel').value.trim(),year:$('#vyear').value.trim(),km:$('#vkm').value};
    db.vehicles.push(v); if(typeof upsertVehicleCloud==='function') upsertVehicleCloud(v);
  }
  save();upsertCustomerCloud(c);closeModal();render();
 });
 bindVinEnter('#vvin',{vin:'#vvin',make:'#vmake',model:'#vmodel',year:'#vyear'});
 bindKbaEnter('#vhsn','#vtsn',{make:'#vmake',model:'#vmodel',year:'#vyear'});
}
function editCustomer(cid){ const c=db.customers.find(x=>x.id===cid); if(c) customerModal(c); }
window.editCustomer=editCustomer;


function carThumb(v){
  if(v && v.photo) return `<img class="car-thumb" src="${v.photo}" alt="">`;
  return `<div class="car-thumb empty">${t('noPhoto')}</div>`;
}
function compressVehiclePhoto(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      const max=720;
      let w=img.width,h=img.height;
      if(w>max||h>max){const s=max/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s)}
      const c=document.createElement('canvas'); c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg',0.55));
    };
    img.onerror=reject;
    img.src=url;
  });
}
function addVehiclePhoto(vid){
  const v=db.vehicles.find(x=>x.id===vid);
  if(!v) return toast(t('carMissing'));
  modal(t('photo'),`
    <div class="field">
      <label>${t('pickPhoto')}</label>
      <input id="vphoto" type="file" accept="image/*" class="hidden">
      <button type="button" class="btn" id="pickVphoto">${t('pickFile')||t('pickPhoto')}</button>
      <button type="button" class="btn primary" onclick="openCamera()">📷 ${t('openCam')}</button>
      ${v.photo?`<img class="ocr-preview" src="${v.photo}">`:''}
    </div>
  `, async()=>{
    const f=$('#vphoto').files[0];
    if(!f) return toast(t('pickPhoto'));
    try{
      v.photo=await compressVehiclePhoto(f);
      save(); audit('vehicle.photo', v.plate||v.vin);
      closeModal(); render(); toast(t('photoSaved'));
    }catch(e){ toast(t('photoFail')); }
  }, t('savePhoto'));
  if($('#pickVphoto')) $('#pickVphoto').onclick=()=>$('#vphoto').click();
}
window.addVehiclePhoto=addVehiclePhoto;

function vehicles(){
 const rows=companyRows('vehicles');
 const addBtn=canEdit()?`<button class="btn primary" id="add">${t('newVehicle')}</button><button class="btn ok" id="scan">📷 ${t('scanSchein')}</button>`:`<span class="muted">—</span>`;
 $('#content').innerHTML=head(t('vehicles'),`<div class="toolbar">${addBtn}</div>`)+
 listShareBar('vehicles')+
 table([t('photo'),t('customer'),t('plate'),'VIN',t('make'),t('model'),t('year'),t('action')],rows.map(v=>[
   carThumb(v),
   customerName(v.customerId),esc(v.plate||'-'),esc(v.vin||'-'),esc(v.make||'-'),esc(v.model||'-'),esc(v.year||'-'),
   canEdit()?`<button class="btn small" onclick="editVehicle('${v.id}')">${t('edit')}</button> <button class="btn small" onclick="addVehiclePhoto('${v.id}')">${t('photo')}</button>`:'—'
 ]), 'vehicles');
 if(canEdit()){
   $('#add').onclick=()=>vehicleModal();
   $('#scan').onclick=scanVehicleDocument;
 }
}
function editVehicle(vid){ const v=db.vehicles.find(x=>x.id===vid); if(v) vehicleModal(v); }
window.editVehicle=editVehicle;
function vehicleModal(prefill={}){
 const customers=companyRows('customers');
 if(!prefill.hsn && prefill.kba){ const p=String(prefill.kba).trim().split(/\s+/); prefill.hsn=p[0]||''; prefill.tsn=p[1]||''; }
 modal(t('addVehicle'),`<div class="form-grid">
 <div class="field"><label>${t('customer')}</label><select id="cu"><option value="">—</option>${customers.map(c=>`<option value="${c.id}" ${c.id===prefill.customerId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
 <div class="field"><label>${t('plate')}</label><input id="pl" value="${esc(prefill.plate||'')}"></div>
 <div class="field"><label>${t('vinLbl')}</label><input id="vin" value="${esc(prefill.vin||'')}" maxlength="17" placeholder="W0L..."></div>
 <div class="field span2"><label>${t('kbaKey')}</label>
  <div class="kba-row">
    <input id="hsn" value="${esc(prefill.hsn||'')}" maxlength="4" inputmode="numeric" placeholder="HSN 2.1">
    <input id="tsn" value="${esc(prefill.tsn||'')}" maxlength="3" placeholder="TSN 2.2">
  </div>
 </div>
 <div class="field span2"><label>${t('partsCat')}</label>
  <div class="toolbar">
    <button type="button" class="btn" id="partslinkBtn">PartsLink24</button>
    <button type="button" class="btn primary" id="distriBtn">DistriAuto (VIN)</button>
  </div>
 </div>
 <div class="field"><label>${t('make')}</label><input id="mk" value="${esc(prefill.make||'')}"></div>
 <div class="field"><label>${t('model')}</label><input id="mo" value="${esc(prefill.model||'')}"></div>
 <div class="field"><label>${t('year')}</label><input id="yr" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.year||'')}"></div>
 <div class="field"><label>${t('displacement')}</label><input id="cc" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.engine_displacement_cm3||'')}"></div>
 <div class="field"><label>${t('fuel')}</label><input id="fuel" value="${esc(prefill.fuel_type||'')}"></div>
 <div class="field"><label>${t('powerKw')}</label><input id="kw" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.engine_power_kw||'')}"></div>
 <div class="field"><label>${t('maxWeight')}</label><input id="vmaxw" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.maxWeight||'')}"></div>
 <div class="field"><label>${t('seats')}</label><input id="vseats" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.seats||'')}"></div>
 <div class="field"><label>${t('vClass')}</label><input id="vklass" value="${esc(prefill.vehicleClass||'')}" placeholder="M1"></div>
 <div class="field"><label>${t('engineCode')}</label><input id="en" value="${esc(prefill.engine||'')}"></div>
 <div class="field"><label>${t('paintCode')}</label><input id="pa" value="${esc(prefill.paint||'')}" placeholder="Fahrzeugschein"></div>
 <div class="field"><label>${t('km')}</label><input id="vkm" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.km||'')}"></div>
 <div class="field"><label>${t('nextService')}</label><input id="vnext" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.nextServiceKm||'')}"></div>
 </div>`,()=>{
  if(!$('#cu').value)return toast(t('pickCustomerFirst'));
  const v={id:prefill.id||id('v'),companyId:prefill.companyId||session.company.id,cloudId:prefill.cloudId,customerId:$('#cu').value,plate:$('#pl').value.trim(),vin:$('#vin').value.trim().toUpperCase(),hsn:$('#hsn').value.trim(),tsn:$('#tsn').value.trim().toUpperCase(),kba:($('#hsn').value.trim()+' '+$('#tsn').value.trim().toUpperCase()).trim(),make:$('#mk').value.trim(),model:$('#mo').value.trim(),year:$('#yr').value,engine:$('#en').value.trim(),paint:$('#pa').value.trim(),engine_displacement_cm3:$('#cc').value,fuel_type:$('#fuel').value,engine_power_kw:$('#kw').value,maxWeight:$('#vmaxw')?.value||'',seats:$('#vseats')?.value||'',vehicleClass:$('#vklass')?.value||'',ocrSource:prefill.ocrSource||'',km:Number($('#vkm').value||0),nextServiceKm:Number($('#vnext').value||0),photo:prefill.photo||''};
  if(prefill.id){ const i=db.vehicles.findIndex(x=>x.id===prefill.id); if(i>=0) db.vehicles[i]=v; audit('vehicle.update',v.plate||v.vin); save(); upsertVehicleCloud(v); closeModal(); render(); }
  else { db.vehicles.push(v);save();upsertVehicleCloud(v);audit('vehicle.create',v.plate||v.vin);closeModal();render(); if(canEdit()) setTimeout(()=>addVehiclePhoto(v.id), 200); }
 });
  $('#partslinkBtn').onclick=()=>window.open('https://www.partslink24.com/','_blank');
  if($('#distriBtn')) $('#distriBtn').onclick=()=>openDistriAutoVin($('#vin')?.value||'');
  bindVinEnter('#vin',{vin:'#vin',make:'#mk',model:'#mo',year:'#yr',cc:'#cc',fuel:'#fuel',kw:'#kw',en:'#en',pa:'#pa'});
  bindKbaEnter('#hsn','#tsn',{make:'#mk',model:'#mo',year:'#yr',kw:'#kw',cc:'#cc',fuel:'#fuel',seats:'#vseats',weight:'#vmaxw',klass:'#vklass'});
}
function scanVehicleDocument(){
 modal(t('scanScheinTitle'),`<div class="field">
 <label>${t('pickSchein')}</label>
 <input id="doc" type="file" accept="image/*" class="hidden">
 <div class="toolbar">
 <button type="button" class="btn" id="pickDoc">${t('pickFile')||t('pickSchein')}</button>
 <button type="button" id="camOpen" class="btn primary" onclick="openCamera()">📷 ${t('openCam')}</button>
 </div>
 <div class="hint" id="docName"></div>
 <div class="hint">${t('ocrHint')}</div>
 <img id="ocrImg" class="ocr-preview hidden">
 <div id="ocrBox" class="hidden"><div class="progress"><div id="ocrProg"></div></div><div id="ocrStatus" class="muted"></div></div>
 </div>`,async()=>{
  const f=$('#doc').files[0];if(!f)return toast(t('pickScheinFirst'));
  $('#ocrBox').classList.remove('hidden');
  $('#msave').disabled=true;
  try{
   const url=URL.createObjectURL(f);$('#ocrImg').src=url;$('#ocrImg').classList.remove('hidden');
   const imageData = await new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result);
reader.onerror = reject;
reader.readAsDataURL(f);
});

$('#ocrStatus').textContent = t('readingAI');

const response = await fetch(
`${window.SUPABASE_URL}/functions/v1/vehicle-ocr`,
{
method: 'POST',
headers: {
'Content-Type': 'application/json',
'apikey': window.SUPABASE_KEY,
'Authorization': `Bearer ${window.SUPABASE_KEY}`
},
body: JSON.stringify({
image: imageData
})
}
   
);

const ai = await response.json();

if (!response.ok) {
console.error(ai);
throw new Error(ai.error || 'تعذرت قراءة ورقة السيارة');
}

const parsed = {
plate: ai.license_plate || '',
vin: ai.vin || '',
make: ai.brand || '',
model: ai.model || '',
year: ai.year || '',
engine_displacement_cm3: ai.engine_displacement_cm3 || '',
fuel_type: ai.fuel_type || '',
engine_power_kw: ai.engine_power_kw || '',
engine: ai.engine_code || '',
paint: ai.color || '',
firstRegistration: ai.first_registration || ''
};

closeModal();

vehicleModal({
...parsed,
ocrSource: f.name
});
   toast('تمت القراءة. راجع الحقول قبل الحفظ.');
  }catch(e){console.error(e);$('#ocrStatus').textContent=t('ocrManual');$('#msave').disabled=false}
 },t('readData'));
 $('#doc').onchange=()=>{const f=$('#doc').files[0];if(f){const u=URL.createObjectURL(f);$('#ocrImg').src=u;$('#ocrImg').classList.remove('hidden'); if($('#docName')) $('#docName').textContent=f.name;}};
 if($('#pickDoc')) $('#pickDoc').onclick=()=>$('#doc').click();
}

function fieldAfter(text, keys){
  for(const k of keys){
    const re=new RegExp(k+'\\s*[:.]?\\s*([^\\n]{2,80})','i');
    const m=text.match(re);
    if(m) return m[1].replace(/\s{2,}/g,' ').trim();
  }
  return '';
}
function parseVehicleOCR(text){
  const raw=String(text||'').replace(/\r/g,'\n');
  const t=raw.replace(/[ \t]+/g,' ').replace(/\n+/g,'\n');
  const upper=t.toUpperCase();
  const vinMatch=upper.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
  const plateMatch=upper.match(/\b([A-ZÄÖÜ]{1,3})[-\s]?([A-Z]{1,2})[-\s]?(\d{1,4}[EH]?)\b/);
  const plate=plateMatch ? (plateMatch[1]+'-'+plateMatch[2]+' '+plateMatch[3]) : '';
  const d1=fieldAfter(t,['D\\.1','Marke','Hersteller']);
  const d3=fieldAfter(t,['D\\.3','Handelsbezeichnung']);
  const makes=['VOLKSWAGEN','VW','BMW','MERCEDES-BENZ','MERCEDES','AUDI','OPEL','FORD','TOYOTA','RENAULT','PEUGEOT','CITROEN','SKODA','SEAT','FIAT','HYUNDAI','KIA','PORSCHE','MAZDA','NISSAN','HONDA','VOLVO','DACIA','TESLA','MINI','SMART','JEEP','SUZUKI','CUPRA'];
  const makeFromList=makes.find(x=>upper.includes(x))||'';
  const make=(d1.match(new RegExp(makes.join('|'),'i'))||[makeFromList])[0] || d1.split(/[/,]/)[0].trim();
  const model=(d3||'').replace(new RegExp('^'+String(make||'')+'\\s*','i'),'').trim();
  const yearMatch=t.match(/B\s*[:.]?\s*(\d{2}\.\d{2}\.(19|20)\d{2})/i) || t.match(/\b(\d{2}\.\d{2}\.(19|20)\d{2})\b/);
  const firstRegistration=yearMatch ? (yearMatch[1]||yearMatch[0]) : '';
  const year=firstRegistration.slice(-4);
  const owner=fieldAfter(t,['C\\.1\\.1','Halter','Name oder Firmenname']);
  const address=fieldAfter(t,['C\\.1\\.3','Anschrift']);
  const engine=fieldAfter(t,['P\\.1','Hubraum']);
  const kw=fieldAfter(t,['P\\.2','Nennleistung']);
  const fuel=fieldAfter(t,['P\\.3','Kraftstoff']);
  const paint=fieldAfter(t,['Farbe des Fahrzeugs']);
  return {
    vin: vinMatch? vinMatch[0] : '',
    plate,
    make: String(make||'').trim(),
    model: String(model||'').trim().slice(0,40),
    year,
    firstRegistration,
    owner_name: String(owner||'').replace(/C\.1\.\d/g,'').trim(),
    address,
    engine_displacement_cm3: (engine.match(/\d{3,5}/)||[''])[0],
    engine_power_kw: (kw.match(/\d{2,3}/)||[''])[0],
    fuel_type: fuel,
    paint,
    engine: ''
  };
}
function preprocessSchein(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      const max=1800;
      let w=img.width,h=img.height;
      if(Math.max(w,h)>max){const s=max/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s);}
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      const ctx=c.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      const data=ctx.getImageData(0,0,w,h);
      const d=data.data;
      for(let i=0;i<d.length;i+=4){
        let g=d[i]*0.3+d[i+1]*0.59+d[i+2]*0.11;
        g=(g-128)*1.35+128;
        g=g<40?0:g>220?255:g;
        d[i]=d[i+1]=d[i+2]=g;
      }
      ctx.putImageData(data,0,0);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg',0.88));
    };
    img.onerror=reject;
    img.src=url;
  });
}
function mergeSchein(ai, local){
  const pick=(a,b,ok)=>{
    const x=(a||'').toString().trim();
    const y=(b||'').toString().trim();
    if(ok){ if(ok(x)) return x; if(ok(y)) return y; }
    return x||y||'';
  };
  ai=ai||{}; local=local||{};
  return {
    license_plate: pick(ai.license_plate||ai.plate, local.plate, v=>/[A-ZÄÖÜ]{1,3}-?[A-Z]{1,2}\s?\d{1,4}/i.test(v)),
    vin: pick(ai.vin, local.vin, v=>/^[A-HJ-NPR-Z0-9]{17}$/i.test(v)),
    brand: pick(ai.brand||ai.make, local.make),
    model: pick(ai.model, local.model),
    year: pick(ai.year, local.year, v=>/^(19|20)\d{2}$/.test(v)),
    owner_name: pick(ai.owner_name||ai.holder||ai.customer_name, local.owner_name),
    address: pick(ai.address||ai.owner_address, local.address),
    engine_displacement_cm3: pick(ai.engine_displacement_cm3, local.engine_displacement_cm3),
    engine_power_kw: pick(ai.engine_power_kw, local.engine_power_kw),
    fuel_type: pick(ai.fuel_type, local.fuel_type),
    engine_code: pick(ai.engine_code||ai.engine, local.engine),
    color: pick(ai.color||ai.paint, local.paint),
    first_registration: pick(ai.first_registration, local.firstRegistration)
  };
}
async function readScheinAI(file){
  if(window.WP && WP.OCR && WP.OCR.read){
    return WP.OCR.read(file);
  }
  const imageData = await preprocessSchein(file);
  let ai={};
  try{
    const response = await fetch(`${window.SUPABASE_URL}/functions/v1/vehicle-ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': window.SUPABASE_KEY,
        'Authorization': `Bearer ${window.SUPABASE_KEY}`
      },
      body: JSON.stringify({
        image: imageData,
        country: 'DE',
        document: 'Zulassungsbescheinigung Teil I',
        fields: ['A Kennzeichen','B Erstzulassung','C.1.1 Halter','C.1.3 Anschrift','D.1 Marke','D.3 Handelsbezeichnung','E VIN','P.1 Hubraum','P.2 kW','P.3 Kraftstoff','R Farbe']
      })
    });
    const js = await response.json();
    if (response.ok) ai = js; else console.warn(js);
  }catch(e){ console.warn('vehicle-ocr', e); }
  let local={};
  try{
    try{ await WP.loadOcr(); }catch(e){}
    if(window.Tesseract){
      const res=await Tesseract.recognize(imageData,'deu+eng');
      local=parseVehicleOCR(res&&res.data&&res.data.text||'');
    }
  }catch(e){ console.warn('tesseract', e); }
  const merged=mergeSchein(ai, local);
  if(!merged.vin && !merged.license_plate) throw new Error('تعذرت قراءة ورقة السيارة');
  return merged;
}
function findOrCreateFromSchein(ai){
  const plate = (ai.license_plate || ai.plate || '').trim();
  const vin = (ai.vin || '').trim().toUpperCase();
  let v = db.vehicles.find(x => (vin && (x.vin||'').toUpperCase()===vin) || (plate && x.plate===plate));
  const ownerName = (ai.owner_name || ai.holder || ai.customer_name || '').trim() || (plate ? ('مالك '+plate) : 'زبون جديد');
  const ownerPhone = (ai.phone || ai.owner_phone || '').trim();
  const ownerAddr = (ai.address || ai.owner_address || '').trim();
  let c = v ? db.customers.find(x=>x.id===v.customerId) : db.customers.find(x=>x.companyId===session.company.id && x.name===ownerName);
  if(!c){
    c={id:id('c'),companyId:session.company.id,name:ownerName,phone:ownerPhone,email:'',address:ownerAddr};
    db.customers.push(c); upsertCustomerCloud(c);
  }
  if(!v){
    v={id:id('v'),companyId:session.company.id,customerId:c.id,cloudId:undefined,
      plate, vin, make:ai.brand||ai.make||'', model:ai.model||'', year:ai.year||'',
      engine:ai.engine_code||ai.engine||'', paint:ai.color||ai.paint||'',
      engine_displacement_cm3:ai.engine_displacement_cm3||'', fuel_type:ai.fuel_type||'',
      engine_power_kw:ai.engine_power_kw||'', km:0, nextServiceKm:0, photo:'',
      ocrSource:'fahrzeugschein'};
    db.vehicles.push(v); upsertVehicleCloud(v);
  } else if(c && v.customerId!==c.id && !v.customerId){
    v.customerId=c.id;
  }
  return {c,v};
}
async function scheinFileToCustomerVehicle(file){
  let ai;
  try{ ai=await readScheinAI(file); }
  catch(err){
    const compressed=await compressVehiclePhoto(file);
    let text='';
    try{ await WP.loadOcr(); }catch(e){}
    if(window.Tesseract){
      const res=await Tesseract.recognize(compressed,'deu+eng');
      text=res?.data?.text||'';
    }
    const parsed=parseVehicleOCR(text||'');
    ai={license_plate:parsed.plate,vin:parsed.vin,brand:parsed.make,model:parsed.model,year:parsed.year,owner_name:''};
    if(!ai.license_plate && !ai.vin) throw err;
  }
  const {c,v}=findOrCreateFromSchein(ai);
  save();
  return {c,v,ai};
}
function fillInvoicePartySelects(c,v){
  const fv=$('#fv'), fc=$('#fcust');
  if(fv && v){
    if(![...fv.options].some(o=>o.value===v.id)){
      const o=document.createElement('option');
      o.value=v.id; o.textContent=(v.plate||v.vin||v.id)+' · '+(v.make||'')+' '+(v.model||'');
      fv.appendChild(o);
    }
    fv.value=v.id;
  }
  if(fc && c){
    if(![...fc.options].some(o=>o.value===c.id)){
      const o=document.createElement('option');
      o.value=c.id; o.textContent=(c.kdNr||'')+' · '+(c.companyName||c.name||c.id);
      fc.appendChild(o);
    }
    fc.value=c.id;
  }
}
function scanScheinStartRepair(mode){
  if(mode && typeof mode==='object') mode='repair';
  mode=mode||'repair';
  const title=mode==='estimate'?t('scanSchein'):mode==='invoice'?t('scanSchein'):t('scanOpenJob');
  modal(title,`<div class="field">
    <label>${t('pickSchein')}</label>
    <input id="doc" type="file" accept="image/*" class="hidden">
    <div class="toolbar">
      <button type="button" class="btn primary" id="pickGallery">${t('pickFile')||t('pickSchein')}</button>
      <button type="button" class="btn" onclick="openCamera()">📷 ${t('openCam')}</button>
    </div>
    <div class="hint">${t('ocrHint')}</div>
    <img id="ocrImg" class="ocr-preview hidden">
    <div id="ocrStatus" class="hint"></div>
    <div id="scheinPreview" class="hidden"></div>
  </div>`, async()=>{
    const f=$('#doc').files[0];
    if(!f) return toast(t('pickScheinFirst'));
    if(window._scheinReady){
      const km=Number($('#scheinKm')?.value||0);
      if(!km) return toast(t('kmNowEx'));
      const ai=window._scheinAI;
      const {c,v}=findOrCreateFromSchein(ai);
      v.km=km; upsertVehicleCloud(v); save();
      const complaint=($('#scheinWork')&&$('#scheinWork').value||'').trim() || 'استلام من ورقة السيارة';
      window._scheinReady=false; window._scheinAI=null;
      if(mode==='estimate'){
        closeModal();
        session.page='estimates';
        financeModal('estimate', v.id, c.id);
        toast((v.plate||v.vin)+' / '+km+' km');
        return;
      }
      if(mode==='invoice'){
        closeModal();
        session.page='invoices';
        invoiceDesigner('invoice', c.id, null, v.id);
        toast((v.plate||v.vin)+' / '+km+' km');
        return;
      }
      const r={id:id('r'),companyId:session.company.id,vehicleId:v.id,complaint,description:complaint,jobs:[],parts:[],photos:[],tech:session.user.name||'',hours:1,status:'استلام',km:km,fuel:'نصف',date:todayISO()};
      db.repairs.push(r); upsertRepairCloud(r); save();
      audit('repair.from_schein', (v.plate||v.vin)+' '+km);
      closeModal(); session.repairId=r.id; session.page='repairs'; render();
      toast('تم فتح الأمر — '+esc(v.plate||v.vin)+' / '+km+' km');
      return;
    }
    $('#ocrStatus').textContent=t('readingSchein');
    $('#msave').disabled=true;
    try{
      let ai;
      try{ ai=await readScheinAI(f); }
      catch(err){
        const compressed=await compressVehiclePhoto(f);
        let text='';
        try{ await WP.loadOcr(); }catch(e){}
        if(window.Tesseract){
          const res=await Tesseract.recognize(compressed,'deu+eng');
          text=res?.data?.text||'';
        }
        const parsed=parseVehicleOCR(text||'');
        ai={license_plate:parsed.plate,vin:parsed.vin,brand:parsed.make,model:parsed.model,year:parsed.year,owner_name:''};
        if(!ai.license_plate && !ai.vin) throw err;
      }
      window._scheinAI=ai; window._scheinReady=true;
      const plate=ai.license_plate||ai.plate||'-';
      const vin=ai.vin||'-';
      const owner=ai.owner_name||ai.holder||ai.customer_name||'-';
      $('#scheinPreview').classList.remove('hidden');
      $('#scheinPreview').innerHTML=`<div class="okbox">
        <b>تمّت القراءة. راجع ثم أدخل الكم:</b><br>
        الزبون: ${esc(owner)}<br>
        اللوحة: ${esc(plate)}<br>
        VIN: ${esc(vin)}<br>
        ${esc(ai.brand||ai.make||'')} ${esc(ai.model||'')} ${esc(ai.year||'')}
        <div class="field" style="margin-top:10px"><label>${t('kmNowEx')}</label><input id="scheinKm" class="latnum" inputmode="decimal" lang="de" inputmode="numeric" placeholder="86500"></div>
        <div class="field"><label>${t('repairNeeded')}</label><textarea id="scheinWork" placeholder="مثلاً: صوت من المحرك / تغيير زيت / فرامل"></textarea></div>
      </div>`;
      $('#ocrStatus').textContent=t('enterKmSave');
      $('#msave').disabled=false;
      $('#msave').textContent=t('saveOpenJob');
      setTimeout(()=>$('#scheinKm')?.focus(), 150);
    }catch(e){
      console.error(e);
      $('#ocrStatus').textContent=t('readFailClear');
      $('#msave').disabled=false;
    }
  }, t('readPaper'));
  $('#doc').onchange=()=>{const f=$('#doc').files[0]; if(f){ $('#ocrImg').src=URL.createObjectURL(f); $('#ocrImg').classList.remove('hidden'); window._scheinReady=false; }};
  if($('#pickGallery')) $('#pickGallery').onclick=()=>$('#doc').click();
}
window.scanScheinStartRepair=scanScheinStartRepair;
function repairStatusClass(st){
  const c=normStatus(st);
  if(['done','closed','delivered','ready'].includes(c)) return 'ok';
  if(['wait_parts','diag'].includes(c)) return 'warn';
  if(['working','intake'].includes(c)) return 'info';
  return '';
}
function repairs(){
 if(session.repairId) return repairDesk(session.repairId);
 const rows=companyRows('repairs').slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const cards=rows.map(r=>`
  <div class="repair-card" onclick="openRepairDesk('${r.id}')">
    <div class="row"><b>${esc(vehicleName(r.vehicleId))}</b><span class="status ${repairStatusClass(r.status)}">${esc(stLabel(r.status))}</span></div>
    <div class="muted">${esc(dLabel(r.complaint||r.description||'-'))}</div>
    <div class="muted">${esc(r.tech||'-')} · ${esc(r.hours||0)} ${t('hoursShort')} · ${money(repairPartsTotal(r))}</div>
  </div>`).join('') || `<div class="card muted">${t('noOrders')}</div>`;
 $('#content').innerHTML=head(t('repairOrders'),`<div class="toolbar"><button class="btn ok" id="scanSchein">📷 ${t('scanSchein')}</button>${canEdit()?`<button class="btn primary" id="add">${t('manualOrder')}</button>`:''}</div>`)+cards+
 `<div class="bottom-action"><button class="btn ok" id="scanSchein2">📷 ${t('scanScheinOpen')}</button></div>`;
 if(canEdit() && $('#add')) $('#add').onclick=repairModal;
 $('#scanSchein').onclick=scanScheinStartRepair;
 if($('#scanSchein2')) $('#scanSchein2').onclick=scanScheinStartRepair;
}
function openRepairDesk(rid){ session.repairId=rid; session.page='repairs'; render(); }
window.openRepairDesk=openRepairDesk;
function repairDesk(rid){
 const r=db.repairs.find(x=>x.id===rid);
 if(!r){ session.repairId=null; return repairs(); }
 const v=vehicleOf(r.vehicleId); const c=customerOfVehicle(r.vehicleId);
 const sts=['استلام','تشخيص','انتظار قطع','قيد التنفيذ','جاهز للتسليم','مسلَّم'];
 const stock=companyRows('inventory');
 const photos=r.photos||[];
 const before=photos.filter(x=>x.kind==='before');
 const after=photos.filter(x=>x.kind==='after');
 const img=(arr)=>arr.map(x=>`<img class="ocr-preview" src="${x.url}">`).join('')||`<div class="muted">${t('noPhotos')}</div>`;
 $('#content').innerHTML=head(t('jobCard'),`<button class="btn ghost" id="backRep">${t('back')}</button>`)+`
 <div class="card">
  <div class="row" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
    <div><b>${esc(vehicleName(r.vehicleId))}</b><div class="muted">${esc(c?.name||'')} · ${esc(c?.phone||'')}</div></div>
    ${v&&v.photo?`<img class="car-thumb" src="${v.photo}">`:''}
  </div>
  <div class="steps">${sts.map(s=>`<button class="btn small ${r.status===s?'primary':''}" onclick="setRepairStatus('${r.id}','${s}')">${stLabel(s)}</button>`).join('')}</div>
  <div class="field"><label>${t('kmNow')}</label>
    <div class="toolbar"><input id="deskKm" class="latnum" inputmode="decimal" lang="de" value="${esc(r.km||'')}">
    <button class="btn primary" id="saveKm">${t('saveKm')}</button></div>
  </div>
  <p><b>${t('complaint')}:</b> ${esc(dLabel(r.complaint||'-'))}<br><b>${t('work')}:</b> ${esc(dLabel(r.description||'-'))}<br>
  <b>${t('fuel')}:</b> ${esc(fuelLabel(r.fuel||'-'))} · <b>${t('tech')}:</b> ${esc(dLabel(r.tech||'-'))}</p>
  <p><b>${t('jobsList')}</b><br>${(r.jobs||[]).map(j=>'• '+esc(dLabel(j))).join('<br>')||'-'}</p>
  <h3>${t('issuePart')}</h3>
  <div class="toolbar">
    <select id="stockPick">${stock.map(i=>`<option value="${i.id}">${esc(i.sku||'')} ${esc(dLabel(i.name))} (${i.qty})</option>`).join('')}</select>
    <input id="stockQty" class="latnum" inputmode="decimal" lang="de" value="1" min="1" style="width:80px">
    <button class="btn primary" id="addStock">${t('issue')}</button>
  </div>
  <p>${(r.parts||[]).map(p=>esc(dLabel(p.name))+' × '+(p.qty||1)+' — '+money(p.price)+(p.consumed?' ✓':'')).join('<br>')||'-'}</p>
  <p>${t('labor')}: ${money(repairLaborTotal(r))} · ${t('parts')}: ${money(repairPartsTotal(r))}</p>
  <h3>${t('photosBA')}</h3>
  <div class="form-grid">
    <div class="field"><label>${t('before')}</label>${img(before)}
      <input id="phBefore" type="file" accept="image/*" class="hidden" onchange="addRepairPhoto('${r.id}','before',this)">
      <button type="button" class="btn small" onclick="document.getElementById('phBefore').click()">${t('pickFile')}</button></div>
    <div class="field"><label>${t('after')}</label>${img(after)}
      <input id="phAfter" type="file" accept="image/*" class="hidden" onchange="addRepairPhoto('${r.id}','after',this)">
      <button type="button" class="btn small" onclick="document.getElementById('phAfter').click()">${t('pickFile')}</button></div>
  </div>
  <div class="toolbar">
    <button class="btn" onclick="openRepair('${r.id}')">${t('edit')}</button>
    <button class="btn ok" onclick="convertRepairToInvoice('${r.id}')">${t('toInvoice')}</button>
    <button class="btn" onclick="whatsappReady('${r.id}')">${t('waReady')}</button>
  </div>
 </div>`;
 $('#backRep').onclick=()=>{session.repairId=null;render()};
 const kmBtn=$('#saveKm');
 if(kmBtn) kmBtn.onclick=()=>{
   r.km=$('#deskKm').value;
   if(v){ v.km=Number(r.km||0); upsertVehicleCloud(v); }
   upsertRepairCloud(r); save(); toast('تم حفظ الكيلومتر'); render();
 };
 const add=$('#addStock');
 if(add) add.onclick=()=>{
   const item=db.inventory.find(x=>x.id===$('#stockPick').value);
   if(!item) return toast('لا قطعة بالمخزون');
   const qty=Number($('#stockQty').value||1);
   if(Number(item.qty||0)<qty) return toast('الكمية غير كافية');
   r.parts=r.parts||[];
   r.parts.push({sku:item.sku,name:item.name,qty,price:Number(item.sell||item.buy||0),consumed:true});
   item.qty=Number(item.qty||0)-qty;
   upsertInventoryCloud(item); upsertRepairCloud(r); save(); audit('repair.part', item.name); render();
 };
}
window.addRepairPhoto=async function(rid,kind,input){
  const r=db.repairs.find(x=>x.id===rid); if(!r||!input.files||!input.files[0]) return;
  const file=input.files[0];
  let url=await uploadWorkshopFile(file,'repairs');
  if(!url){ try{ url=await compressVehiclePhoto(file);}catch(e){ return toast(t('photoFail')); } }
  r.photos=r.photos||[]; r.photos.push({kind,url});
  save(); upsertRepairCloud(r); render(); toast('تم حفظ الصورة');
};
window.setRepairStatus=function(rid,st){
  const r=db.repairs.find(x=>x.id===rid); if(!r) return;
  r.status=st; save(); upsertRepairCloud(r); audit('repair.status',st); render();
};

function repairModal(existing){
 const r=existing||{};
 const jobs=(r.jobs||[]).join('\n');
 const parts=(r.parts||[]).map(p=>[p.sku||'',p.name||'',p.qty||1,p.price||0].join('|')).join('\n');
 modal(existing?t('editOrder'):t('newOrder'),`<div class="form-grid">
 <div class="field"><label>${t('vehicle')}</label><select id="rv">${companyRows('vehicles').map(v=>`<option value="${v.id}" ${v.id===r.vehicleId?'selected':''}>${esc(v.plate||v.vin)} · ${esc(v.make)} ${esc(v.model)}</option>`).join('')}</select></div>
 <div class="field"><label>${t('tech')}</label><input id="rt" value="${esc(r.tech||'')}"></div>
 <div class="field"><label>${t('km')}</label><input id="rkm" class="latnum" inputmode="decimal" lang="de" value="${r.km||''}"></div>
 <div class="field"><label>${t('fuel')}</label><select id="rfuel">
  <option value="فارغ" ${r.fuel==='فارغ'?'selected':''}>${t('fuelEmpty')}</option>
  <option value="ربع" ${r.fuel==='ربع'?'selected':''}>${t('fuelQ')}</option>
  <option value="نصف" ${!r.fuel||r.fuel==='نصف'?'selected':''}>${t('fuelH')}</option>
  <option value="ممتلئ" ${r.fuel==='ممتلئ'?'selected':''}>${t('fuelF')}</option>
 </select></div>
 <div class="field span2"><label>${t('complaint')}</label><textarea id="rc">${esc(r.complaint||'')}</textarea></div>
 <div class="field span2"><label>${t('work')}</label><textarea id="rd">${esc(r.description||'')}</textarea></div>
 <div class="field span2"><label>${t('jobsOnePerLine')}</label><textarea id="rjobs">${esc(jobs)}</textarea></div>
 <div class="field span2"><label>${t('partsLineFmt')}</label><textarea id="rparts">${esc(parts)}</textarea></div>
 <div class="field"><label>${t('hours')}</label><input id="rh" class="latnum" inputmode="decimal" lang="de" step=".25" value="${r.hours||1}"></div>
 <div class="field"><label>${t('status')}</label><select id="rs">
  ${['استلام','تشخيص','انتظار قطع','قيد التنفيذ','جاهز للتسليم','مسلَّم'].map(s=>`<option value="${s}" ${r.status===s?'selected':''}>${stLabel(s)}</option>`).join('')}
 </select></div>
 </div>`,()=>{
  const parsedParts=$('#rparts').value.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
    const [sku,name,qty,price]=l.split('|');
    return {sku:(sku||'').trim(), name:(name||sku||'').trim(), qty:Number(qty||1), price:Number(price||0)};
  });
  const obj={
    id:r.id||id('r'), companyId:session.company.id, vehicleId:$('#rv').value,
    complaint:$('#rc').value, description:$('#rd').value,
    jobs:$('#rjobs').value.split('\n').map(x=>x.trim()).filter(Boolean),
    parts:parsedParts, tech:$('#rt').value, hours:$('#rh').value,
    status:$('#rs').value, km:$('#rkm').value, fuel:$('#rfuel').value,
    photos:r.photos||[], date:r.date||todayISO(), number:r.number||nextAuftragNumber()
  };
  const v=vehicleOf(obj.vehicleId);
  if(v && obj.km){ v.km=Number(obj.km); }
  if(existing){
    const i=db.repairs.findIndex(x=>x.id===r.id);
    if(i>=0) db.repairs[i]=obj;
    upsertRepairCloud(obj);
    audit('repair.update', obj.description);
  } else {
    db.repairs.push(obj);
    upsertRepairCloud(obj);
    audit('repair.create', obj.description);
  }
  save(); closeModal(); render();
 }, existing?t('saveEdit'):t('createOrder'));
}
function repairEditModal(rid){
  const r=db.repairs.find(x=>x.id===rid);
  if(!r) return toast('الأمر غير موجود');
  repairModal(r);
}
window.openRepair=repairEditModal;
function appointments(){
  const rows=companyRows('appointments').slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||''));
  $('#content').innerHTML=head(t('appointmentsTitle'))+
  table([t('date'),t('time'),t('vehicle'),t('customer'),t('tech'),t('status'),t('action')],rows.map(a=>[
    esc(a.date),esc(a.time),vehicleName(a.vehicleId),esc(customerName(a.customerId)),esc(dLabel(a.tech||'-')),esc(stLabel(a.status||'')),
    a.status==='تم التحويل'?'—':`<button class="btn small primary" onclick="appointmentToRepair('${a.id}')">${t('convertJob')}</button>`
  ]),'appointments')+
  `<div class="bottom-action"><button class="btn primary" id="add">${t('newApptBtn')}</button></div>`;
  $('#add').onclick=()=>{
    modal(t('newAppt'),`<div class="form-grid">
      <div class="field"><label>${t('vehicle')}</label><select id="av">${companyRows('vehicles').map(v=>`<option value="${v.id}">${esc(v.plate||v.vin)}</option>`).join('')}</select></div>
      <div class="field"><label>${t('date')}</label><input id="ad" type="date" value="${todayISO()}"></div>
      <div class="field"><label>${t('time')}</label><input id="at" type="time" value="09:00"></div>
      <div class="field"><label>${t('tech')}</label><input id="atech" value="${esc(dLabel('الميكانيكي'))}"></div>
      <div class="field span2"><label>${t('note')}</label><input id="an"></div>
    </div>`,()=>{
      const vid=$('#av').value; const v=vehicleOf(vid);
      const clash=companyRows('appointments').some(x=>x.date===$('#ad').value && x.time===$('#at').value && x.tech===$('#atech').value);
      if(clash) return toast(t('clash'));
      db.appointments=db.appointments||[];
      db.appointments.push({id:id('ap'),companyId:session.company.id,vehicleId:vid,customerId:v?.customerId||'',date:$('#ad').value,time:$('#at').value,tech:$('#atech').value,note:$('#an').value,status:'مؤكد'});
      upsertAppointmentCloud(db.appointments[db.appointments.length-1]); save(); audit('appointment.create',$('#ad').value+' '+$('#at').value); closeModal(); render();
    });
  };
}

function appointmentToRepair(aid){
  const a=db.appointments.find(x=>x.id===aid);
  if(!a) return toast('الموعد غير موجود');
  if(a.status==='تم التحويل' && a.repairId){ session.repairId=a.repairId; session.page='repairs'; return render(); }
  const r={id:id('r'),companyId:session.company.id,vehicleId:a.vehicleId,complaint:a.note||'موعد ورشة',description:a.note||'',jobs:[],parts:[],photos:[],tech:a.tech||'',hours:1,status:'استلام',km:'',fuel:'نصف',date:a.date||todayISO()};
  db.repairs.push(r); upsertRepairCloud(r);
  a.status='تم التحويل'; a.repairId=r.id; upsertAppointmentCloud(a);
  save(); audit('appointment.to_repair', a.date||''); session.repairId=r.id; session.page='repairs'; render(); toast('تم فتح أمر الإصلاح');
}
window.appointmentToRepair=appointmentToRepair;
function estimates(){
 const rows=companyRows('estimates');
 $('#content').innerHTML=head(t('estimates'),`<div class="toolbar"><button class="btn ok" id="scanEst">📷 ${t('scanSchein')}</button><button class="btn primary" id="add">${t('createQuote')}</button></div>`)+
 listShareBar('invoices')+
 table([t('vehicle'),t('partsCol'),t('laborCol'),t('discount'),t('tax'),t('total'),t('quoteFee')],rows.map(x=>[vehicleName(x.vehicleId),money(x.parts),money(x.labor),money(x.discount),x.tax+'%',money(x.total),money(x.fee)]), 'estimates');
 $('#add').onclick=()=>financeModal('estimate');
 if($('#scanEst')) $('#scanEst').onclick=()=>scanScheinStartRepair('estimate');
}
function invoices(){
 const filter=session.customerFilter||'';
 const payFilter=session.invoiceFilter||'';
 let rows=companyRows('invoices');
 if(filter) rows=rows.filter(x=>x.customerId===filter || (vehicleOf(x.vehicleId)||{}).customerId===filter);
 if(payFilter==='unpaid') rows=rows.filter(x=>x.status!=='storno' && !x.paid && !['cash','card'].includes(x.payment));
 const cust=filter && db.customers.find(c=>c.id===filter);
 const title=payFilter==='unpaid' ? (t('unpaidInvoices')||t('invoices')) : (cust?(t('invoicesOf')+' · '+(cust.companyName||cust.name)): t('invoices'));
 $('#content').innerHTML=head(title,`<div class="toolbar"><button class="btn ok" id="scanInv">📷 ${t('scanSchein')}</button><button class="btn primary" id="inv">${t('createInvoice')}</button><button class="btn" id="bar">${t('cashSale')}</button>${filter||payFilter?`<button class="btn" id="clrCust">${t('allInvoices')}</button>`:''}</div>`)+
 listShareBar('invoices')+
 table([t('invoiceNo'),t('type'),t('vehicle'),t('total'),t('payment'),t('design')],rows.map(x=>[
  esc(x.number||x.id)+(x.status==='storno'?' · STORNO':''), esc(x.type||''), vehicleName(x.vehicleId)||'—', money(x.total), esc(payLabel(x.payment||'-')),
  `<button class="btn small primary" onclick="previewInvoice('${x.id}')">${t('preview')}</button>
   <button class="btn small" onclick="editInvoice('${x.id}')">${t('edit')}</button>
   <button class="btn small bad" onclick="deleteInvoice('${x.id}')">${t('del')}</button>
   <button class="btn small" onclick="exportPrint('invoices','${x.id}')">${t('print')}</button>
   <button class="btn small" onclick="exportPDF('invoices','${x.id}')">${t('pdf')}</button>`
 ]), 'invoices')+
 `<div class="bottom-action"><button class="btn primary" id="inv2">${t('createInvoice')}</button></div>`;
 $('#inv').onclick=()=>invoiceDesigner('invoice', session.customerFilter||'');
 if($('#inv2')) $('#inv2').onclick=()=>invoiceDesigner('invoice', session.customerFilter||'');
 if($('#scanInv')) $('#scanInv').onclick=()=>scanScheinStartRepair('invoice');
 $('#bar').onclick=()=>invoiceDesigner('bar', session.customerFilter||'');
 if($('#clrCust')) $('#clrCust').onclick=()=>{session.customerFilter=''; session.invoiceFilter=''; invoices();};
}
function invoiceForCustomer(cid){ invoiceDesigner('invoice', cid); }
function invoicesForCustomer(cid){ session.customerFilter=cid; session.page='invoices'; render(); }
function editInvoice(iid){
  const inv=db.invoices.find(x=>x.id===iid);
  if(!inv) return toast(t('invMissing'));
  invoiceDesigner(inv.type==='Barverkauf'?'bar':'invoice', inv.customerId||'', inv);
}
function deleteInvoice(iid){
  if(!canEdit()) return;
  const inv=db.invoices.find(x=>x.id===iid);
  if(!inv) return;
  askConfirm(
    (t('confirmDelInv')||'Storno')+'  '+ (inv.number||''),
    t('stornoHint')||'',
    ()=>{
      inv.status='storno'; inv.stornoAt=new Date().toISOString();
      if(WP.Engine) WP.Engine.touch(inv);
      audit('invoice.storno', inv.number||iid); save();
      if(typeof upsertInvoiceCloud==='function') try{ upsertInvoiceCloud(inv); }catch(e){}
      render();
      toast((t('invDeleted')||'Storno')+'\n'+(inv.number||''));
    }
  );
}
window.invoiceForCustomer=invoiceForCustomer;
window.invoicesForCustomer=invoicesForCustomer;
window.editInvoice=editInvoice;
window.deleteInvoice=deleteInvoice;
function workshopInfo(){
  const s=workshop();
  return {
    brand: s.workshopBrand || session?.company?.name || 'Werkstatt',
    name: s.workshopName || session?.company?.name || '',
    address: s.workshopAddress || '',
    phone: s.workshopPhone || '',
    email: s.workshopEmail || '',
    taxId: s.workshopTaxId || '',
    steuerNr: s.workshopSteuerNr || '',
    court: s.workshopCourt || '',
    owner: s.workshopOwner || '',
    bank: s.workshopBank || '',
    iban: s.workshopIban || '',
    accountHolder: s.workshopAccountHolder || s.workshopName || '',
    hrb: s.workshopHrb || '',
    bic: s.workshopBic || '',
    sitz: s.workshopSitz || '',
    paymentDays: Number(s.paymentDays||0)
  };
}
function dePrintName(s){
  s=String(s||'').trim();
  if(!s) return '';
  if(typeof dLabel==='function'){
    const d=dLabel(s);
    if(d && d!==s && !/[\u0600-\u06FF]/.test(d)) return d;
  }
  if(/[\u0600-\u06FF]/.test(s)){
    const map={'أحمد الخليل':'Ahmad Al-Khalil','يوسف منصور':'Youssef Mansour','راشد':'Rashid Tabah','رشيد':'Rashid'};
    if(map[s]) return map[s];
  }
  return s;
}
function printLineName(s){
  s=dePrintName(s);
  return String(s)
    .replace(/زيت محرك/g,'Motoröl')
    .replace(/زيت/g,'Öl')
    .replace(/فلتر هواء/g,'Luftfilter')
    .replace(/فلتر زيت/g,'Ölfilter')
    .replace(/فلتر/g,'Filter')
    .replace(/فرامل/g,'Bremsen')
    .replace(/مكابح/g,'Bremsen')
    .replace(/بطارية/g,'Batterie')
    .replace(/شمعات/g,'Zündkerzen')
    .replace(/إطارات/g,'Reifen')
    .replace(/أجور|عمالة|يد عاملة/g,'Arbeitswert')
    .replace(/[\u0600-\u06FF]+/g,'')
    .replace(/\s{2,}/g,' ')
    .trim();
}
window.printLineName=printLineName;
function customerBlock(cust){
  const rawFirma=cust.companyName|| (cust.type==='company'?cust.name:'');
  const rawPerson=cust.contact|| (!rawFirma?cust.name:'');
  const firma=dePrintName(rawFirma);
  const person=dePrintName(rawPerson);
  const tax=cust.taxId||cust.ustId||'';
  return `<div class="rh-cust">
    <div class="muted">Rechnungsempfänger</div>
    ${firma?`<div><b>${esc(firma)}</b></div>`:''}
    ${person?`<div>${esc(person)}</div>`:''}
    ${cust.address?`<div>${esc(cust.address)}</div>`:''}
    ${tax?`<div>USt-IdNr. Empfänger: ${esc(tax)}</div>`:''}
  </div>`;
}
function deMoney(n){
  return Number(n||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function latNum(v){
  const s=String(v??'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(',','.');
  const n=parseFloat(s);
  return isNaN(n)?0:n;
}
function nextKdNr(){
  const nums=(db.customers||[]).map(c=>parseInt(String(c.kdNr||c.number||'').replace(/\D/g,''),10)).filter(n=>n>0);
  const n=(nums.length?Math.max(...nums):1000)+1;
  return String(n).padStart(4,'0');
}
function ensureKd(cust){
  if(!cust || !cust.id) return cust||{};
  if(!cust.kdNr && !cust.number){
    cust.kdNr=nextKdNr();
    const i=db.customers.findIndex(x=>x.id===cust.id);
    if(i>=0){ db.customers[i].kdNr=cust.kdNr; save(); }
  }
  return cust;
}
function deDate(d){
  try{ return new Date(d||Date.now()).toLocaleDateString('de-DE'); }catch(e){ return d||''; }
}
function lineSum(ln){ return Number(ln.qty||1)*Number(ln.price||0); }
function isLaborLine(ln){ if(ln.kind==='parts'||ln.kind==='قطعة'||ln.kind==='Ersatzteil') return false; if(ln.kind==='labor'||ln.kind==='اجر'||ln.kind==='أجور') return true; return /lohn|أجر|اجور|أجور|عمالة|arbeit|Arbeitswert|Leist/i.test(String(ln.name||ln.sku||ln.kind||'')); }
function invoiceModel(x){
  const w=workshopInfo();
  const cust=customerOfVehicle(x.vehicleId) || db.customers.find(c=>c.id===x.customerId) || {};
  const veh=vehicleOf(x.vehicleId) || {};
  const lines=(x.lines&&x.lines.length)?x.lines:[{sku:'',name:'Arbeitswert',qty:1,price:x.labor||0,tax:19}].filter(l=>lineSum(l)||l.name);
  const filled=lines.map((ln,i)=>{
    const labor=isLaborLine(ln);
    return {
      pos:i+1, sku:ln.sku||ln.number||'', name:printLineName(ln.name||ln.desc||''),
      kind: labor?'Arbeitsleistung':'Ersatzteil',
      qty:Number(ln.qty||1), price:Number(ln.price||0),
      tax:Number(ln.tax||x.tax||19), sum:Math.round(lineSum(ln)*100)/100
    };
  });
  const teile=Math.round(filled.filter(l=>l.kind!=='Arbeitsleistung').reduce((s,l)=>s+l.sum,0)*100)/100;
  const leist=Math.round(filled.filter(l=>l.kind==='Arbeitsleistung').reduce((s,l)=>s+l.sum,0)*100)/100;
  const disc=Number(x.discount||0);
  const netBefore=teile+leist;
  const net=Math.round((netBefore-disc)*100)/100;
  const vat19=filled.filter(l=>Number(l.tax)===19).reduce((s,l)=>s+l.sum*0.19,0);
  const vat7=filled.filter(l=>Number(l.tax)===7).reduce((s,l)=>s+l.sum*0.07,0);
  const vatOther=filled.filter(l=>![19,7].includes(Number(l.tax))).reduce((s,l)=>s+l.sum*(Number(l.tax)||0)/100,0);
  const factor=netBefore>0?net/netBefore:1;
  const vat=Math.round((vat19+vat7+vatOther)*factor*100)/100;
  const vat19s=Math.round(vat19*factor*100)/100;
  const vat7s=Math.round(vat7*factor*100)/100;
  const total=Math.round((net+vat)*100)/100;
  ensureKd(cust);
  const kd=cust.kdNr||cust.number||'';
  const beleg=String(x.number||'').replace(/^RE-\d+-/,'') || x.number || '';
  const repair=(db.repairs||[]).find(r=>r.id===x.repairId) || (db.repairs||[]).filter(r=>r.vehicleId===x.vehicleId).slice(-1)[0];
  const auftrag=x.auftrag || (repair&&repair.number) || '';
  const due=new Date(x.date||Date.now());
  due.setDate(due.getDate()+Number(w.paymentDays||0));
  return {w,cust,veh,filled,teile,leist,net,vat,vat19s,vat7s,total,kd,beleg,leistDate:deDate(x.serviceDate||x.date),dueDate:deDate(due),auftrag,repair,x};
}
function posTable(filled){
  return `<table class="pos-tbl">
    <thead><tr><th>Pos.</th><th>Nummer</th><th>Beschreibung</th><th>Menge</th><th>E-Preis</th><th>Summe</th><th>MwSt.</th></tr></thead>
    <tbody>${filled.map(l=>`<tr>
      <td>${l.pos}</td><td>${esc(l.sku)}</td><td>${esc(l.name)}</td>
      <td>${deMoney(l.qty)}</td>
      <td>${deMoney(l.price)}</td>
      <td>${deMoney(l.sum)}</td>
      <td>${l.tax}</td>
    </tr>`).join('')}</tbody></table>`;
}
function totBlock(m){
  return `<div class="rh-tot">
    <div>
      <div>Nettobetrag Teile<span>${deMoney(m.teile)}</span></div>
      <div>Nettobetrag Leistungen<span>${deMoney(m.leist)}</span></div>
      <div>Nettobetrag Sonstiges<span>0,00</span></div>
      <div>Nettobetrag Fahrzeuge<span>0,00</span></div>
      <div>Durchl. gem. §10 / 1 UStG<span>0,00</span></div>
    </div>
    <div>
      <div>Total EUR ohne MwSt.<span>${deMoney(m.net)}</span></div>
      <div>19% MwSt.<span>${deMoney(m.vat19s)}</span></div>
      <div>7% MwSt.<span>${deMoney(m.vat7s)}</span></div>
      <div>AT-MwSt.<span>0,00</span></div>
      <div class="grand">Gesamtbetrag EUR inkl. MwSt.<span>${deMoney(m.total)}</span></div>
    </div>
  </div>
  <p class="rh-pay">Bei Zahlung bitte Kd-Nr und Beleg-Nr angeben. Zahlbar sofort und ohne Abzug.</p>
  <p class="rh-legalhint">Eigentumsvorbehalt: Gelieferte Teile bleiben bis zur vollständigen Bezahlung unser Eigentum. Es gelten unsere AGB. Beleg archiviert unter der Belegnummer. Kein Ersatz für steuerliche Einzelberatung.</p>`;
}
function footBlock(w){
  return `<div class="rh-foot">
    <div>GF: ${esc(w.owner)}<br>${esc(w.address)}</div>
    <div>Steuernummer: ${esc(w.steuerNr)}<br>USt-IdNr.: ${esc(w.taxId)}<br>HRB ${esc(w.hrb)} · Sitz ${esc(w.sitz)}<br>${esc(w.court)}<br>Mobil: ${esc(w.phone)}</div>
    <div>${esc(w.email)}<br>${esc(w.bank)}<br>Kontoinhaber: ${esc(w.accountHolder)}<br>IBAN: ${esc(w.iban)}<br>BIC: ${esc(w.bic)}</div>
  </div>`;
}
function metaTbl(m){
  const {cust,veh,kd,beleg,leistDate,x}=m;
  return `<table class="meta-tbl">
    <tr><td>Kundennummer:</td><td>${esc(kd||'-')}</td></tr>
    <tr><td>Belegnummer:</td><td>${esc(beleg)}</td></tr>
    <tr><td>Auftragsnummer:</td><td>${esc(m.auftrag||'-')}</td></tr>
    <tr><td>Seite:</td><td>1 von 1</td></tr>
    <tr><td>Datum:</td><td>${deDate(x.date)}</td></tr>
    <tr><td>Fällig am:</td><td>${esc(m.dueDate)}</td></tr>
    <tr><td>Leistungsdatum:</td><td>${leistDate} bis ${leistDate}</td></tr>
    <tr><td>Kennzeichen:</td><td>${esc(veh.plate||'-')}</td></tr>
    <tr><td>Hersteller:</td><td>${esc(veh.make||'-')}</td></tr>
    <tr><td>Modell:</td><td>${esc(veh.model||'-')}</td></tr>
    <tr><td>Ident-Nummer:</td><td>${esc(veh.vin||'-')}</td></tr>
    <tr><td>Erstzulassung:</td><td>${esc(veh.firstRegistration||veh.year||'')}</td></tr>
    <tr><td>KBA-Nr.:</td><td>${esc(veh.kba||'')}</td></tr>
    <tr><td>km-Stand:</td><td>${esc(x.km||veh.km||'')}</td></tr>
    <tr><td>Nächste-HU:</td><td>${esc(veh.nextHu||'')}</td></tr>
  </table>`;
}
function buildWorkshopRechnung(x){
  const m=invoiceModel(x);
  const tpl=workshop().invoiceTpl||db.settings.invoiceTpl||'modern';
  const {w,cust}=m;
  const coTitle=(w.name && !/^TST$/i.test(String(w.name).trim())) ? w.name : 'Autoservice und Autoteile Tabah UG';
  const henryHead=`<div class="rh-band"><div class="rh-title">${esc(coTitle)}</div></div>
      <div class="rh-legal">(haftungsbeschränkt)</div>
      <div class="rh-sender">${esc(w.name)}, ${esc(w.address)}</div>`;
  if(tpl==='modern'){
    return `<div class="rechnung tpl-modern" dir="ltr" lang="de"><div class="rh-main">
      ${henryHead}
      <div class="rh-grid">${customerBlock(cust)}<div class="rh-meta">${metaTbl(m)}</div></div>
      <div class="rh-docname">Rechnung</div>
      ${posTable(m.filled)}${totBlock(m)}</div>${footBlock(w)}</div>`;
  }
  return `<div class="rechnung tpl-classic" dir="ltr" lang="de"><div class="rh-main">
      ${henryHead}
      <div class="rh-grid">${customerBlock(cust)}<div class="rh-meta">${metaTbl(m)}</div></div>
      <div class="rh-docname">Rechnung</div>
      ${posTable(m.filled)}${totBlock(m)}</div>${footBlock(w)}</div>`;
}



function importHenryArticles(text){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length) return 0;
  const sep=lines[0].includes(';')?';':(lines[0].includes('\t')?'\t':',');
  let n=0;
  lines.forEach((line,idx)=>{
    const c=line.split(sep).map(x=>x.replace(/^"|"$/g,'').trim());
    if(!c.length) return;
    if(idx===0 && /artikel|nr|bezeich|name|sku/i.test(line) && !/\d{4,}/.test(c[0])) return;
    const sku=c[0];
    if(!sku) return;
    const name=c[1]||sku;
    let price=0;
    for(const x of c.slice(2)){
      const v=Number(String(x).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''));
      if(v>0){ price=v; break; }
    }
    rememberKatyArticle({sku,name,price});
    let inv=(db.inventory||[]).find(x=>String(x.sku||'').toUpperCase()===sku.toUpperCase());
    if(!inv){
      inv={id:id('n'),companyId:session.company.id,sku,name,qty:0,buy:price,sell:price,minQty:3};
      db.inventory.push(inv);
    } else {
      if(price) inv.sell=price;
      if(name) inv.name=name;
    }
    n++;
  });
  save();
  return n;
}
function lookupKatyArticle(sku){
  sku=String(sku||'').trim();
  if(!sku) return null;
  const up=sku.toUpperCase();
  const inv=(db.inventory||[]).find(x=>String(x.sku||'').toUpperCase()===up || String(x.name||'').toUpperCase()===up);
  if(inv) return {sku:inv.sku||sku,name:inv.name,qty:1,price:Number(inv.sell||inv.buy||0),source:'مخزون'};
  const cache=(db.katyCache||[]).find(x=>String(x.sku||'').toUpperCase()===up);
  if(cache) return {sku:cache.sku,name:cache.name,qty:1,price:Number(cache.price||0),source:'Katy'};
  const fromInv=(db.invoices||[]).flatMap(i=>i.lines||[]).find(l=>String(l.sku||'').toUpperCase()===up);
  if(fromInv) return {sku:fromInv.sku,name:fromInv.name,qty:1,price:Number(fromInv.price||0),source:'فاتورة سابقة'};
  return null;
}
function rememberKatyArticle(art){
  if(!art||!art.sku) return;
  db.katyCache=db.katyCache||[];
  const i=db.katyCache.findIndex(x=>String(x.sku).toUpperCase()===String(art.sku).toUpperCase());
  const row={sku:art.sku,name:art.name,price:Number(art.price||0),ts:Date.now()};
  if(i>=0) db.katyCache[i]=row; else db.katyCache.unshift(row);
  db.katyCache=db.katyCache.slice(0,400);
  save();
}
function openKatySearch(sku){
  const base=(db.settings.katyUrl||'https://www.matthies.de/software/katy.html').trim();
  const q=encodeURIComponent(sku||'');
  window.open(q? (base + (base.includes('?')?'&':'?') + 'q='+q) : base, '_blank');
}
function parseInvoiceLine(l){
  const parts=l.split('|').map(x=>x.trim());
  if(parts.length>=4) return {sku:parts[0],name:parts[1],qty:Number(parts[2]||1),price:Number(parts[3]||0)};
  if(parts.length===3){
    const hit=lookupKatyArticle(parts[0]);
    if(hit && !isNaN(parts[1]) && !isNaN(parts[2])) return {sku:parts[0],name:hit.name,qty:Number(parts[1]),price:Number(parts[2])};
    return {sku:'',name:parts[0],qty:Number(parts[1]||1),price:Number(parts[2]||0)};
  }
  if(parts.length===1){
    const hit=lookupKatyArticle(parts[0]);
    if(hit) return hit;
    return {sku:parts[0],name:parts[0],qty:1,price:0};
  }
  return {sku:'',name:parts[0]||'Position',qty:Number(parts[1]||1),price:Number(parts[2]||0)};
}

function collectInvoiceRows(){
  return [...document.querySelectorAll('#invRows tr')].map(tr=>{
    const sku=tr.querySelector('.c-sku')?.value.trim()||'';
    const name=tr.querySelector('.c-name')?.value.trim()||'';
    const qty=latNum(tr.querySelector('.c-qty')?.value||1);
    const price=latNum(tr.querySelector('.c-price')?.value||0);
    const tax=latNum(tr.querySelector('.c-tax')?.value||19);
    const kind=tr.querySelector('.c-kind')?.value||'parts';
    return {sku,name,qty,price,tax,kind,sum:qty*price};
  }).filter(x=>x.name||x.sku);
}
function refreshInvoiceSums(){
  const lines=collectInvoiceRows();
  lines.forEach((l,i)=>{
    const tr=document.querySelectorAll('#invRows tr')[i];
    if(tr && tr.querySelector('.c-sum')) tr.querySelector('.c-sum').textContent=(l.qty*l.price).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
  });
  const disc=latNum($('#fd')?.value||0);
  const tax=latNum($('#ft')?.value||19);
  const net=Math.max(0, lines.reduce((s,l)=>s+l.qty*l.price,0)-disc);
  const gross=net*(1+tax/100);
  const fmt=n=>(Number(n)||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
  if($('#henryEK')) $('#henryEK').textContent=fmt(net);
  if($('#henryVK')) $('#henryVK').textContent=fmt(gross);
  if($('#henryGross')) $('#henryGross').textContent=fmt(gross);
}
function addInvoiceRow(data){
  const d=Object.assign({sku:'',name:'',qty:1,price:0,tax:19,kind:'parts'},data||{});
  const tb=$('#invRows'); if(!tb) return;
  const tr=document.createElement('tr');
  tr.innerHTML=`<td class="c-pos"></td>
    <td><select class="c-kind"><option value="parts" ${d.kind!=='labor'?'selected':''}>${t('kindParts')}</option><option value="labor" ${d.kind==='labor'?'selected':''}>${t('kindLabor')}</option></select></td>
    <td><input class="c-sku" value="${esc(d.sku)}" placeholder="${t('sku')}"></td>
    <td><input class="c-name" value="${esc(d.name)}" placeholder="${t('desc')}"></td>
    <td><input class="c-qty latnum" inputmode="decimal" lang="de" value="${Number(d.qty)}"></td>
    <td><input class="c-price latnum" inputmode="decimal" lang="de" value="${Number(d.price)}"></td>
    <td class="c-sum">${(Number(d.qty||0)*Number(d.price||0)).toLocaleString('de-DE',{minimumFractionDigits:2})}</td>
    <td><input class="c-tax latnum" inputmode="decimal" lang="de" value="${Number(d.tax||19)}" style="width:60px"></td>
    <td><button type="button" class="btn small bad c-del">×</button></td>`;
  tb.appendChild(tr);
  tr.querySelector('.c-del').onclick=()=>{tr.remove(); numberInvoiceRows(); refreshInvoiceSums();};
  tr.querySelectorAll('input').forEach(inp=>inp.addEventListener('input',refreshInvoiceSums));
  const order=['.c-sku','.c-name','.c-qty','.c-price','.c-tax'];
  tr.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('keydown',e=>{
      if(e.key!=='Enter') return;
      e.preventDefault();
      const i=order.findIndex(sel=>tr.querySelector(sel)===inp);
      if(i>=0 && i<order.length-1){
        const next=tr.querySelector(order[i+1]);
        if(next){ next.focus(); next.select&&next.select(); }
        return;
      }
      addInvoiceRow({tax:latNum($('#ft')?.value||19),kind:'parts'});
      const rows=document.querySelectorAll('#invRows tr');
      const last=rows[rows.length-1];
      const sku=last&&last.querySelector('.c-sku');
      if(sku) sku.focus();
    });
  });
  numberInvoiceRows();
}
function numberInvoiceRows(){
  [...document.querySelectorAll('#invRows tr')].forEach((tr,i)=>{
    const p=tr.querySelector('.c-pos'); if(p) p.textContent=i+1;
  });
}
function invoiceDesigner(kind='invoice', customerId='', existing=null, vehicleId=''){
  const title = existing ? (t('editInvoice')+' '+(existing.number||'')) : (kind==='bar' ? t('cashSale') : t('createInv'));
  const rate=workshop().hourlyRate||db.settings.hourlyRate||100;
  if(existing){ customerId=customerId||existing.customerId||''; vehicleId=vehicleId||existing.vehicleId||''; }
  modal(title, `<div class="hy-desk">
    <div class="hy-bar">
      <span>${new Date().toLocaleDateString('de-DE')}</span>
      <select id="pay">${[[t('payOpen')], [t('payCash')],[t('payCard')],[t('payBank')]].map(([p])=>`<option ${((existing&&existing.payment)||'')===p?'selected':''}>${p}</option>`).join('')}</select>
      <select id="fv"><option value="">${t('noVehicle')}</option>${companyRows('vehicles').filter(v=>!customerId||v.customerId===customerId|| (existing&&v.id===existing.vehicleId)||v.id===vehicleId).map(v=>`<option value="${v.id}" ${(existing&&v.id===existing.vehicleId)||v.id===vehicleId?'selected':''}>${esc(v.plate||v.vin)} · ${esc(v.make)} ${esc(v.model)}</option>`).join('')}</select>
      <select id="fcust"><option value="walkin" ${!customerId?'selected':''}>${t('walkIn')||t('cashSale')}</option>${companyRows('customers').map(c=>`<option value="${c.id}" ${c.id===customerId?'selected':''}>${esc(c.kdNr||'')} · ${esc(c.companyName||c.name)}</option>`).join('')}</select>
      <button type="button" class="btn ok small" id="scanInvCam">📷</button>
      <input id="scanInvFile" type="file" accept="image/*" capture="environment" class="hidden">
    </div>
    <div class="hy-split">
      <div class="hy-main">
        <div class="table-wrap">
          <table class="inv-edit henry-pos">
            <thead><tr><th>${t('colPos')}</th><th>${t('colArt')}</th><th>${t('sku')}</th><th>${t('desc')}</th><th>${t('colQty')}</th><th>${t('colPrice')}</th><th>${t('colSum')}</th><th>${t('colVat')}</th><th></th></tr></thead>
            <tbody id="invRows"></tbody>
          </table>
        </div>
        <div class="hy-entry">
          <select id="qArt"><option value="parts">${t('kindParts')}</option><option value="labor">${t('kindLabor')}</option></select>
          <input id="katyQty" class="latnum" inputmode="decimal" lang="de" value="1,00">
          <input id="katySku" placeholder="${t('orderNo')}">
          <input id="qName" placeholder="${t('desc')}">
          <button type="button" class="btn primary" id="katyFetch">${t('apply')}</button>
        </div>
        <div id="katyHint" class="hint">${t('henryHint')}</div>
        <div id="scanInvHint" class="hint"></div>
        <div class="toolbar">
          <button type="button" class="btn small" id="addRow">+ ${t('kindParts')}</button>
          <button type="button" class="btn small" id="addLabor">+ ${t('kindLabor')}</button>
          <button type="button" class="btn small" id="katyOpen">${t('catalog')}</button>
          <button type="button" class="btn small" id="henryOpen">Henry</button>
        </div>
        <textarea id="katyPaste" rows="2" placeholder="${t('pasteHint')}"></textarea>
        <button type="button" class="btn small" id="katyPasteBtn">${t('paste')}</button>
      </div>
      <aside class="hy-side">
        <label>${t('taxPct')}</label>
        <input id="ft" class="latnum" inputmode="decimal" lang="de" value="${existing?Number(existing.tax):19}">
        <div class="hy-tot"><span>EK</span><b id="henryEK">0,00</b></div>
        <div class="hy-tot"><span>VK</span><b id="henryVK">0,00</b></div>
        <label>${t('discount')}</label>
        <input id="fd" class="latnum" inputmode="decimal" lang="de" value="${existing?Number(existing.discount||0):0}">
        <div class="hy-tot hy-gross"><span>${t('total')}</span><b id="henryGross">0,00</b></div>
      </aside>
    </div>
  </div>`,()=>{
    const lines=collectInvoiceRows();
    if(!lines.length) return toast(t('needLine'));
    if(lines.some(l=>!l.name)) return toast(t('needDesc'));
    if(lines.some(l=>!(Number(l.qty)>0))) return toast(t('needQtyPrice'));
    let custId=$('#fcust')?.value||'';
    if(custId==='walkin') custId='';
    const veh=vehicleOf($('#fv').value)||{};
    let parts=lines.filter(x=>!isLaborLine(x)).reduce((s,x)=>s+x.qty*x.price,0);
    let labor=lines.filter(isLaborLine).reduce((s,x)=>s+x.qty*x.price,0);
    const discount=latNum($('#fd')?.value), tax=latNum($('#ft')?.value)||19;
    let net=Math.max(0,parts+labor-discount), total=net*(1+tax/100);
    parts=Math.round(parts*100)/100; labor=Math.round(labor*100)/100; net=Math.round(net*100)/100; total=Math.round(total*100)/100;
    const obj={id:existing?existing.id:id('i'),companyId:session.company.id,vehicleId:$('#fv').value,km:veh.km||existing&&existing.km||'',customerId:custId||veh.customerId||'',parts,labor,discount,tax,net,total,date:existing?existing.date:new Date().toISOString(),
      type:kind==='bar'?'Barverkauf':'Rechnung', payment:payCode($('#pay').value), paid:['cash','card'].includes(payCode($('#pay').value)),
      number:existing?existing.number:nextInvoiceNumber(), lines, repairId:existing&&existing.repairId, auftrag:existing&&existing.auftrag, updatedAt:new Date().toISOString()};
    lines.forEach(rememberKatyArticle);
    if(existing){
      const i=db.invoices.findIndex(x=>x.id===existing.id);
      if(i>=0) db.invoices[i]=obj; else db.invoices.push(obj);
      upsertInvoiceCloud(obj); audit('invoice.update',obj.number);
    } else {
      db.invoices.push(obj); upsertInvoiceCloud(obj);
      db.journal.push({id:id('j'),companyId:session.company.id,date:todayISO(),account:'مبيعات',debit:0,credit:total,note:obj.number});
      audit('invoice.create',obj.number);
    }
    archiveBeleg(obj);
    save(); closeModal(); render();
    setTimeout(()=>previewInvoice(obj.id), 200);
  }, existing?t('saveEdit'):t('saveShowDesign'));
  if(existing && existing.lines && existing.lines.length){
    existing.lines.forEach(l=>addInvoiceRow(l));
  } else if(!existing){
    addInvoiceRow({sku:'',name:'',qty:1,price:0,tax:19,kind:'parts'});
    setTimeout(()=>{
      const sku=document.querySelector('#invRows tr .c-sku');
      if(sku){ sku.focus(); if(sku.select) sku.select(); }
    }, 40);
  }
  ['fd','ft'].forEach(id=>{ const el=$('#'+id); if(el) el.addEventListener('input',refreshInvoiceSums); });
  if($('#fv')) $('#fv').onchange=()=>{
    const v=vehicleOf($('#fv').value);
    if(v && v.customerId && $('#fcust')) $('#fcust').value=v.customerId;
  };
  if($('#scanInvCam')) $('#scanInvCam').onclick=()=>$('#scanInvFile')?.click();
  if($('#scanInvFile')) $('#scanInvFile').onchange=async function(){
    const f=this.files&&this.files[0]; if(!f) return;
    const hint=$('#scanInvHint'); if(hint) hint.textContent=t('readingSchein');
    try{
      const {c,v}=await scheinFileToCustomerVehicle(f);
      fillInvoicePartySelects(c,v);
      if(hint) hint.textContent=(v.plate||v.vin||'')+' · '+(c.name||'');
      toast((v.plate||v.vin||'')+' OK');
    }catch(e){
      if(hint) hint.textContent=t('readFailClear');
    }
    this.value='';
  };
  if($('#addRow')) $('#addRow').onclick=()=>addInvoiceRow({tax:+$('#ft').value||19,kind:'parts'});
  if($('#addLabor')) $('#addLabor').onclick=()=>addInvoiceRow({name:'Arbeitswert',qty:1,price:rate,tax:+$('#ft').value||19,kind:'labor'});
  const doFetch=()=>{
    const sku=$('#katySku').value.trim();
    const kind=$('#qArt')?.value||'parts';
    const qty=latNum($('#katyQty')?.value||1);
    const typed=$('#qName')?.value.trim()||'';
    if(!sku && !typed) return toast(t('needSku'));
    const hit=sku?lookupKatyArticle(sku):null;
    if(hit){
      addInvoiceRow({sku:hit.sku||sku,name:typed||hit.name,qty,price:hit.price,tax:+$('#ft').value||19,kind});
      $('#katyHint').textContent=(hit.source||'OK')+' — '+hit.name;
      rememberKatyArticle(hit);
    } else {
      addInvoiceRow({sku,name:typed||sku,qty,price:0,tax:+$('#ft').value||19,kind});
      $('#katyHint').textContent=sku?t('notFoundLocal'):'Position übernommen';
      if(sku) openKatySearch(sku);
    }
    $('#katySku').value=''; if($('#qName')) $('#qName').value=''; $('#katySku').focus();
  };
  if($('#katyFetch')) $('#katyFetch').onclick=doFetch;
  ['katySku','katyQty','qName'].forEach(id=>{
    const el=$('#'+id); if(el) el.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); doFetch(); }});
  });
  if($('#katyOpen')) $('#katyOpen').onclick=()=>openKatySearch($('#katySku').value.trim());
  if($('#henryOpen')) $('#henryOpen').onclick=()=>window.open(db.settings.henryUrl||'https://henry.matthies.de/','_blank');
  if($('#katyPasteBtn')) $('#katyPasteBtn').onclick=()=>{
    const raw=$('#katyPaste').value||'';
    const rows=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(!rows.length) return toast('الصق سطراً واحداً على الأقل');
    let n=0;
    rows.forEach(line=>{
      const parsed=parseInvoiceLine(line.replace(/\t/g,'|').replace(/\s{2,}/g,'|'));
      if(!parsed.name && !parsed.sku) return;
      addInvoiceRow({sku:parsed.sku,name:parsed.name,qty:parsed.qty||1,price:parsed.price||0,tax:+$('#ft').value||19,kind:'parts'});
      rememberKatyArticle(parsed);
      n++;
    });
    $('#katyPaste').value='';
    toast('تمت إضافة '+n+' بند من الكتالوج');
  };
  if($('#katySku')) $('#katySku').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); doFetch(); }});
}
function previewInvoice(iid){
  try{
    modal(t('showDesign')||t('preview')||'Preview',
      `<div id="prevHost" class="prev-full"></div>
       <div class="toolbar prev-actions">
         <button type="button" class="btn primary" id="printNow">${t('print')}</button>
         <button type="button" class="btn" id="pdfNow">${t('pdf')}</button>
         <button type="button" class="btn" id="dlNow">${t('download')||'Download'}</button>
         <button type="button" class="btn" id="mailNow">${t('email')}</button>
       </div>`, null);
    const box=document.querySelector('#modalRoot .modal');
    if(box) box.classList.add('full');
    let page='';
    try{ page=printDocMarkup('invoices', iid); }
    catch(e){
      console.error(e);
      const inv=(db.invoices||[]).find(x=>x.id===iid);
      page='<pre style="padding:16px;white-space:pre-wrap">'+(inv?esc(JSON.stringify({number:inv.number,total:inv.total,lines:inv.lines},null,2)):String(e))+'</pre>';
    }
    const host=$('#prevHost');
    if(host){
      const fr=document.createElement('iframe');
      fr.setAttribute('title','Rechnung');
      fr.style.cssText='width:100%;height:100%;border:0;background:#fff;min-height:70vh';
      fr.srcdoc=page||'<p>Keine Vorschau</p>';
      host.appendChild(fr);
    }
    const b=$('#printNow'); if(b) b.onclick=()=>{ try{ exportPrint('invoices', iid); }catch(e){ toast(String(e.message||e)); } };
    const p=$('#pdfNow'); if(p) p.onclick=()=>{ try{ exportPDF('invoices', iid); }catch(e){ toast(String(e.message||e)); } };
    const d=$('#dlNow'); if(d) d.onclick=()=>downloadInvoiceFile(iid);
    const m=$('#mailNow'); if(m) m.onclick=()=>{ try{ exportEmail('invoices', iid); }catch(e){ toast(String(e.message||e)); } };
  }catch(e){
    console.error(e);
    toast((e&&e.message)||t('invMissing'));
  }
}
window.previewInvoice=previewInvoice;
window.invoiceDesigner=invoiceDesigner;

function financeModal(type, vehicleId='', customerId=''){
 const title=type==='estimate'?t('estimates'):type==='bar'?t('cashSale'):t('newInv');
 modal(title,`<div class="form-grid">
 <div class="field"><label>${t('vehicle')}</label><select id="fv"><option value="">${t('noCar')}</option>${companyRows('vehicles').map(v=>`<option value="${v.id}" ${v.id===vehicleId?'selected':''}>${esc(v.plate||v.vin)} · ${esc(v.make)} ${esc(v.model)}</option>`).join('')}</select></div>
 <div class="field"><label>${t('partsEuro')}</label><input id="fp" class="latnum" inputmode="decimal" lang="de" step=".01" value="0"></div>
 <div class="field"><label>${t('laborEuro')}</label><input id="fl" class="latnum" inputmode="decimal" lang="de" step=".01" value="0"></div>
 <div class="field"><label>${t('discEuro')}</label><input id="fd" class="latnum" inputmode="decimal" lang="de" step=".01" value="0"></div>
 <div class="field"><label>${t('taxPct2')}</label><input id="ft" class="latnum" inputmode="decimal" lang="de" step=".01" value="19"></div>
 ${type==='estimate'?`<div class="field"><label>${t('quoteFee2')}</label><input id="ff" class="latnum" inputmode="decimal" lang="de" step=".01" value="0"></div>`:`<div class="field"><label>${t('payMethod')}</label><select id="pay"><option value="open">${t('payOpen')}</option><option value="cash">${t('payCash')}</option><option value="card">${t('payCard')}</option><option value="bank">${t('payBank')}</option></select></div>`}
 </div>`,()=>{
  const parts=+$('#fp').value||0,labor=+$('#fl').value||0,discount=+$('#fd').value||0,tax=+$('#ft').value||0,net=Math.max(0,parts+labor-discount),total=net*(1+tax/100);
  const obj={id:id(type[0]),companyId:session.company.id,vehicleId:$('#fv').value,parts,labor,discount,tax,net,total,date:new Date().toISOString()};
  if(type==='estimate'){obj.fee=+$('#ff').value||0;db.estimates.push(obj);audit('estimate.create',money(total))}
  else{
    obj.type=type==='bar'?'Barverkauf':'Rechnung';
    obj.payment=payCode($('#pay').value);
    obj.paid=['cash','card'].includes(obj.payment);
    obj.number=nextInvoiceNumber();
    obj.lines=[{name:'قطع',qty:1,price:parts},{name:'أجور',qty:1,price:labor}];
    db.invoices.push(obj);
    upsertInvoiceCloud(obj);
    db.journal.push({id:id('j'),companyId:session.company.id,date:todayISO(),account:'مبيعات',debit:0,credit:total,note:obj.number});
    audit('invoice.create',obj.number);
  }
  save();closeModal();render();
 });
}

function applyPurchaseToInventory(p){
  const name = (p.item || p.notes || '').trim();
  const qty = Number(p.qty || 0);
  const price = Number(p.price || 0);
  if(!name || qty <= 0) return;
  let inv = db.inventory.find(x => x.companyId === (p.companyId||session?.company?.id) && (x.name === name || x.sku === name));
  if(inv){
    inv.qty = Number(inv.qty||0) + qty;
    if(price > 0) inv.buy = price;
    save();
    upsertInventoryCloud(inv);
  } else {
    const item = {
      id: id('inv'),
      companyId: p.companyId || session?.company?.id || 'de',
      sku: (p.invoice_number || 'AUTO') + '-' + Date.now().toString(36).slice(-4),
      name,
      qty,
      buy: price,
      sell: price ? Math.round(price * 1.6 * 100) / 100 : 0
    };
    db.inventory.push(item);
    save();
    upsertInventoryCloud(item);
  }
}

function purchases(){
  const rows = companyRows('purchases').slice().sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  const totalSpend = rows.reduce((s,x)=> s + Number(x.total_amount || (x.qty||0)*(x.price||0) || 0), 0);

  $('#content').innerHTML = head(t('purchasesTitle'), `
    <div class="toolbar">
      <button class="btn primary" id="scanPurchase">📷 ${t('scanPurchase')}</button>
      <button class="btn primary" id="add">${t('manualBuy')}</button>
    </div>
  `) + listShareBar('purchases') + `
  <div class="grid" style="margin-bottom:14px">
    <div class="card"><div class="muted">${t('invCount')}</div><div class="metric">${rows.length}</div></div>
    <div class="card"><div class="muted">${t('purchaseTotal')}</div><div class="metric">${money(totalSpend)}</div></div>
  </div>
  ` + table(
    [t('supplier'),t('invNum'),t('date'),t('total'),t('status'),t('document'),t('send'),t('action')],
    rows.map(x=>{
      const total = Number(x.total_amount || (Number(x.qty||0)*Number(x.price||0)) || 0);
      const status = x.payment_status || 'pending';
      const statusLabel = status==='paid' ? t('paid') : status==='pending' ? t('pending') : status;
      const statusClass = status==='paid' ? 'ok' : 'warn';
      return [
        esc(x.supplier || '-'),
        esc(x.invoice_number || x.item || '-'),
        esc(x.date || '-'),
        money(total),
        `<span class="status ${statusClass}">${esc(statusLabel)}</span>`,
        x.receipt_url
          ? `<button class="btn small primary" onclick="viewReceipt(${JSON.stringify(x.receipt_url)})">📄 ${t('viewDoc')}</button>`
          : '<span class="muted">—</span>',
        `<button class="btn small" onclick="exportPrint('purchases','${x.id}')">🖨️</button>
         <button class="btn small" onclick="exportPDF('purchases','${x.id}')">📄</button>
         <button class="btn small" onclick="exportEmail('purchases','${x.id}')">✉️</button>
         <button class="btn small" onclick="exportWhatsApp('purchases','${x.id}')">💬</button>`,
        `<button class="btn small bad" onclick="deletePurchase('${x.id}')">${t('deleteBtn')}</button>`
      ];
    }), 'purchases'
  );

  $('#add').onclick = () => purchaseManualModal();
  $('#scanPurchase').onclick = scanPurchaseDocument;
}

function purchaseManualModal(){
  modal(t('manualBuyTitle'), `
    <div class="form-grid">
      <div class="field"><label>${t('supplier')}</label><input id="p_supplier" placeholder="z.B. carparts-cat.com"></div>
      <div class="field"><label>${t('invNum')}</label><input id="p_inv"></div>
      <div class="field"><label>${t('date')}</label><input id="p_date" class="latnum" lang="de" inputmode="numeric" value="${new Date().toISOString().slice(0,10)}" placeholder="2026-09-01"></div>
      <div class="field"><label>${t('total')}</label><input id="p_total" class="latnum" inputmode="decimal" lang="de" step="0.01" value="0"></div>
      <div class="field"><label>${t('status')}</label>
        <select id="p_status">
          <option value="pending">${t('pending')}</option>
          <option value="paid">${t('paid')}</option>
        </select>
      </div>
      <div class="field span2"><label>${t('notesItems')}</label><textarea id="p_notes" placeholder="${t('notesItems')}"></textarea></div>
    </div>
  `, ()=>{
    const supplier = $('#p_supplier').value.trim();
    const total = Number($('#p_total').value)||0;
    if(!supplier) return toast(t('needName'));
    if(total <= 0) return toast(t('needQtyPrice'));

    const purchase = {
      id: id('p'),
      companyId: session.company.id,
      supplier,
      invoice_number: $('#p_inv').value.trim(),
      date: $('#p_date').value || new Date().toISOString().slice(0,10),
      total_amount: total,
      subtotal: total,
      tax_amount: 0,
      payment_status: $('#p_status').value,
      notes: $('#p_notes').value.trim(),
      receipt_url: ''
    };
    db.purchases.push(purchase);
    applyPurchaseToInventory(purchase);
    save();
    upsertPurchaseCloud(purchase);
    audit('purchase.create', purchase.supplier);
    closeModal();
    render();
    toast('تمت إضافة الشراء');
  });
}

function deletePurchase(pid){
  return askConfirm(t('delPurchase'), '', ()=>{ deletePurchaseDo(pid); });
}
function deletePurchaseDo(pid){
  db.purchases = db.purchases.filter(x => x.id !== pid);
  save();
  deletePurchaseCloud(pid);
  audit('purchase.delete', pid);
  render();
  toast('تم الحذف');
}

async function viewReceipt(url){
  if(!url) return toast('لا توجد فاتورة محفوظة');
  // افتح الرابط مباشرة (صورة أو ملف من Supabase)
  const w = window.open(url, '_blank');
  if(!w) toast('اسمح بالنوافذ المنبثقة لعرض الفاتورة');
}

async function viewReceiptPDF(url){
  // توافق مع الاستدعاءات القديمة
  return viewReceipt(url);
}


/** تصغير وضغط الصورة قبل OCR — أسرع وأقل حجماً */
function compressImageForOCR(file, maxSide=1280, quality=0.72){
  return new Promise((resolve, reject)=>{
    if(!file.type.startsWith('image/')){
      // PDF أو غير صورة: أرجعه كما هو
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{
      try{
        let { width, height } = img;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        // JPEG دائماً للـ OCR
        resolve(canvas.toDataURL('image/jpeg', quality));
      }catch(e){
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = (e)=>{ URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

async function scanPurchaseDocument(){
  // حالة مؤقتة للفترة بين الرفع والحفظ
  let pendingFile = null;
  let pendingPreviewUrl = null;
  let pendingAi = {};
  let pendingReceiptUrl = '';

  modal(t('scanBuy'), `
    <div class="field">
      <label>1) ${t('pickSchein')}</label>
      <input id="purchaseFile" type="file" accept="image/*,.pdf" class="hidden">
      <div class="toolbar" style="margin-top:8px">
        <button type="button" class="btn" id="btnPickFile">${t('pickFile')}</button>
        <button type="button" class="btn" id="btnOpenCam">💻 ${t('openCam')}</button>
        <button type="button" class="btn primary" id="btnRead">⚡ ${t('readData')}</button>
        <button type="button" class="btn ghost" id="btnPreview">👁️ ${t('preview')}</button>
      </div>
      <div class="hint" id="purchaseFileName"></div>
      <img id="purchaseImg" class="ocr-preview hidden" style="margin-top:12px;max-height:280px;cursor:pointer">
      <div id="purchaseStatus" class="hint" style="margin-top:8px">${t('ocrHint')}</div>
    </div>

    <div id="purchaseFormBox" class="hidden" style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px">
      <div class="muted" style="margin-bottom:10px">2) ${t('ocrHint')}</div>
      <div class="form-grid">
        <div class="field"><label>${t('supplier')}</label><input id="p_supplier"></div>
        <div class="field"><label>${t('invNum')}</label><input id="p_inv"></div>
        <div class="field"><label>${t('date')}</label><input id="p_date" type="date"></div>
        <div class="field"><label>${t('total')}</label><input id="p_total" class="latnum" inputmode="decimal" lang="de" step="0.01" value="0"></div>
        <div class="field"><label>${t('netEuro')}</label><input id="p_sub" class="latnum" inputmode="decimal" lang="de" step="0.01" value="0"></div>
        <div class="field"><label>${t('taxEuro')}</label><input id="p_tax" class="latnum" inputmode="decimal" lang="de" step="0.01" value="0"></div>
        <div class="field"><label>${t('status')}</label>
          <select id="p_status">
            <option value="pending">${t('pending')}</option>
            <option value="paid">${t('paid')}</option>
          </select>
        </div>
        <div class="field span2"><label>${t('notesItems')}</label><textarea id="p_notes" rows="2"></textarea></div>
      </div>
    </div>
  `, async ()=>{
    // الحفظ النهائي فقط
    const supplier = ($('#p_supplier')?.value || '').trim();
    const total = Number($('#p_total')?.value) || 0;
    if(!pendingFile && !pendingReceiptUrl) return toast(t('pickScheinFirst'));
    if(!supplier) return toast(t('needName'));
    if(total <= 0) return toast(t('needQtyPrice'));

    try{
      $('#msave').disabled = true;
      $('#purchaseStatus').textContent = t('saving');

      // ارفع الملف الآن فقط عند التأكيد (أسرع في مرحلة القراءة)
      let receiptUrl = pendingReceiptUrl;
      if(!receiptUrl && pendingFile){
        const sb = window.supabaseClient;
        if(!sb) throw new Error('Supabase غير مهيأ');
        const fileName = `${Date.now()}-${(pendingFile.name||'receipt.jpg').replace(/[^a-zA-Z0-9._-]/g,'_')}`;
        const { error: uploadError } = await sb.storage
          .from('purchase-receipts')
          .upload(fileName, pendingFile, { contentType: pendingFile.type || 'image/jpeg', upsert: false });
        if(uploadError) throw uploadError;
        const { data: urlData } = sb.storage.from('purchase-receipts').getPublicUrl(fileName);
        receiptUrl = urlData.publicUrl;
      }

      const purchase = {
        id: id('p'),
        companyId: session.company.id,
        supplier,
        invoice_number: ($('#p_inv')?.value || '').trim(),
        receipt_url: receiptUrl || '',
        date: $('#p_date')?.value || new Date().toISOString().slice(0,10),
        subtotal: Number($('#p_sub')?.value) || 0,
        tax_amount: Number($('#p_tax')?.value) || 0,
        total_amount: total,
        payment_status: $('#p_status')?.value || 'pending',
        notes: ($('#p_notes')?.value || '').trim()
      };

      db.purchases.push(purchase);
      applyPurchaseToInventory(purchase);
      save();
      upsertPurchaseCloud(purchase);
      audit('purchase.create', purchase.invoice_number || purchase.supplier);
      if(pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
      closeModal();
      render();
      toast(t('saved'));
    }catch(e){
      console.error(e);
      $('#purchaseStatus').textContent = 'خطأ: ' + (e.message||'');
      toast(e.message || t('saveFailed'));
      $('#msave').disabled = false;
    }
  }, t('save'));

  // تعطيل زر الحفظ في البداية
  setTimeout(()=>{
    const saveBtn = $('#msave');
    if(saveBtn) saveBtn.disabled = true;

    const fileInput = $('#purchaseFile');
    const btnRead = $('#btnRead');
    const btnPreview = $('#btnPreview');
    const btnCam = $('#btnOpenCam');
    const img = $('#purchaseImg');
    const status = $('#purchaseStatus');
    const formBox = $('#purchaseFormBox');

    function setPreviewFromFile(f){
      pendingFile = f;
      if(pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
      pendingPreviewUrl = null;
      pendingAi = {};
      pendingReceiptUrl = '';
      formBox.classList.add('hidden');
      if(saveBtn) saveBtn.disabled = true;

      if(f.type.startsWith('image/')){
        pendingPreviewUrl = URL.createObjectURL(f);
        img.src = pendingPreviewUrl;
        img.classList.remove('hidden');
      } else {
        img.classList.add('hidden');
      }
      btnRead.disabled = false;
      btnPreview.disabled = false;
      status.textContent = t('ocrHint');
    }

    fileInput.onchange = ()=>{
      const f = fileInput.files[0];
      if(f){
        setPreviewFromFile(f);
        const nm=$('#purchaseFileName'); if(nm) nm.textContent=f.name;
      }
    };
    const pick=$('#btnPickFile'); if(pick) pick.onclick=()=>fileInput.click();

    // عرض كامل قبل الحفظ
    function openFullPreview(){
      if(pendingPreviewUrl){
        window.open(pendingPreviewUrl, '_blank');
        return;
      }
      if(pendingFile){
        const url = URL.createObjectURL(pendingFile);
        window.open(url, '_blank');
        setTimeout(()=>URL.revokeObjectURL(url), 60000);
        return;
      }
      toast(t('pickScheinFirst'));
    }
    btnPreview.onclick = openFullPreview;
    img.onclick = openFullPreview;

    btnCam.onclick = ()=> openCameraForPurchase((file)=>{
      // وضع الملف في الـ input
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      setPreviewFromFile(file);
    });

    // قراءة سريعة: OCR فقط بدون رفع
    btnRead.onclick = async ()=>{
      const f = pendingFile || fileInput.files[0];
      if(!f) return toast(t('pickPhoto'));

      btnRead.disabled = true;
      status.textContent = t('readingInv2');
      const t0 = performance.now();

      try{
        // تصغير وضغط الصورة أولاً → أسرع في الإرسال والقراءة
        status.textContent = t('readingInv2');
        const imageData = await compressImageForOCR(f, 1280, 0.72);
        const approxKB = Math.round((imageData.length * 0.75) / 1024);
        status.textContent = t('readingInv2')+' (~'+approxKB+'KB)';

        let ai = {};
        try{
          const controller = new AbortController();
          const timeout = setTimeout(()=> controller.abort(), 15000); // أقصى 15 ثانية

          const response = await fetch(`${window.SUPABASE_URL}/functions/v1/purchase-ocr`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'apikey': window.SUPABASE_KEY,
              'Authorization': `Bearer ${window.SUPABASE_KEY}`
            },
            body: JSON.stringify({ image: imageData })
          });
          clearTimeout(timeout);

          if(response.ok){
            ai = await response.json();
          } else {
            console.warn('OCR failed', await response.text());
          }
        } catch(ocrErr){
          console.warn('OCR error/timeout', ocrErr);
        }

        pendingAi = ai || {};
        const parseNum = (v) => Number(String(v||'0').replace(',','.').replace(/[^\d.-]/g,'')) || 0;

        // املأ النموذج فوراً
        $('#p_supplier').value = ai.supplier_name || ai.supplier || '';
        $('#p_inv').value = ai.invoice_number || '';
        $('#p_date').value = (ai.purchase_date || ai.date || new Date().toISOString().slice(0,10)).toString().slice(0,10);
        $('#p_sub').value = parseNum(ai.subtotal);
        $('#p_tax').value = parseNum(ai.tax_amount);
        const total = parseNum(ai.total_amount) || (parseNum(ai.subtotal) + parseNum(ai.tax_amount));
        $('#p_total').value = total;
        $('#p_notes').value = ai.notes || ai.item || '';
        if(ai.payment_status) $('#p_status').value = ai.payment_status;

        formBox.classList.remove('hidden');
        if(saveBtn) saveBtn.disabled = false;

        const ms = Math.round(performance.now() - t0);
        const hasData = !!(ai.supplier_name || ai.supplier || ai.invoice_number || total);
        status.textContent = hasData
          ? `✓ تمت القراءة خلال ${ms}ms — راجع البيانات ثم احفظ`
          : `⚠ لم تُستخرج بيانات كافية (${ms}ms) — أكمل يدوياً ثم احفظ`;

      } catch(e){
        console.error(e);
        status.textContent = 'خطأ في القراءة: ' + (e.message||'');
        // افتح النموذج يدوياً حتى لو فشل OCR
        formBox.classList.remove('hidden');
        if(saveBtn) saveBtn.disabled = false;
        $('#p_date').value = new Date().toISOString().slice(0,10);
      } finally {
        btnRead.disabled = false;
      }
    };
  }, 30);
}

async function openCameraForPurchase(onCapture){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    return toast(t('camUnsupported')||t('openCam'));
  }

  const box = document.createElement('div');
  box.className = 'modal-back';
  box.innerHTML = `
    <div class="modal" style="max-width:700px">
      <div class="modal-head">
        <b>📷 ${t('scanPurchase')}</b>
        <button id="camClose" class="btn bad">✕</button>
      </div>
      <video id="cameraVideo" autoplay playsinline style="width:100%;border-radius:12px;background:#000;max-height:60vh"></video>
      <div style="margin-top:12px;text-align:center;display:flex;gap:8px;justify-content:center">
        <button id="takePhoto" class="btn primary">📸 ${t('takePhoto')||t('openCam')}</button>
        <button id="camClose2" class="btn ghost">${t('cancelBtn')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(box);

  const video = box.querySelector('#cameraVideo');
  let stream;
  try{
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      audio: false
    });
    video.srcObject = stream;

    const close = ()=>{
      if(stream) stream.getTracks().forEach(t=>t.stop());
      box.remove();
    };
    box.querySelector('#camClose').onclick = close;
    box.querySelector('#camClose2').onclick = close;

    box.querySelector('#takePhoto').onclick = ()=>{
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob(blob=>{
        if(!blob){ toast(t('camDenied')); return; }
        const file = new File([blob], 'purchase-receipt.jpg', { type: 'image/jpeg' });
        close();
        if(typeof onCapture === 'function') onCapture(file);
        else toast(t('shotOk'));
      }, 'image/jpeg', 0.85); // جودة 0.85 = أسرع وأصغر
    };
  } catch(e){
    box.remove();
    toast(t('camDenied'));
    console.error(e);
  }
}


function inventory(){
 const rows=companyRows('inventory');
 const low=lowStock();
 $('#content').innerHTML=head(t('inventoryTitle'),`<button class="btn primary" id="add">${t('newPart')}</button>`)+
 listShareBar('inventory')+
 (low.length?`<div class="alert"><b>${t('underMin')}:</b> ${low.map(x=>esc(dLabel(x.name))+' ('+x.qty+' / '+t('limit')+' '+ (x.minQty||3)+')').join(' · ')}</div>`:'')+
 table([t('skuCol'),t('name'),t('qty'),t('minQty'),t('buy'),t('sell'),t('status')],rows.map(x=>{
   const lowFlag=Number(x.qty||0)<=Number(x.minQty||3);
   return [esc(x.sku),esc(dLabel(x.name)),x.qty,x.minQty||3,money(x.buy),money(x.sell), lowFlag?`<span class="status warn">${t('shortStock')}</span>`:`<span class="status ok">${t('inStock')}</span>`];
 }), 'inventory');
 $('#add').onclick=()=>simpleModal(t('newPart'),[['sku',t('skuCol')],['name',t('colDesc')||'Bezeichnung'],['qty',t('qty'),'number'],['minQty',t('minQty'),'number'],['buy',t('buy'),'number'],['sell',t('sell'),'number']],o=>{o.companyId=session.company.id;o.id=id('i');o.qty=Number(o.qty||0);o.minQty=Number(o.minQty||3);db.inventory.push(o);save();upsertInventoryCloud(o);audit('inventory.create',o.name);render()});
}
function employees(){
 const rows=companyRows('employees');
 $('#content').innerHTML=head(t('employeesTitle'),`<button class="btn primary" id="add">${t('newEmployee')}</button>`)+
 table([t('name'),t('roleJob'),t('phone'),t('salary')],rows.map(x=>[esc(x.name),esc(x.role),esc(x.phone||'-'),money(x.salary)]));
 $('#add').onclick=()=>simpleModal(t('newEmployee'),[['name',t('name')],['role',t('roleJob')],['phone',t('phone')],['salary',t('salary'),'number']],o=>{o.companyId=session.company.id;o.id=id('e');db.employees.push(o);save();audit('employee.create',o.name);render()});
}
function expenses(){
 const rows=companyRows('expenses');
$('#content').innerHTML=head(t('expensesTitle'),`<button class="btn primary" id="scanExpense">📷 ${t('scanBill')}</button> <button class="btn primary" id="add">${t('newExpense')}</button>`)+
 table([t('date'),t('statement'),t('amount'),t('category')],rows.map(x=>[esc(x.date),esc(x.note),money(x.amount),esc(x.category)]));
 $('#add').onclick=()=>simpleModal(t('newExpense'),[['date',t('date'),'date'],['note',t('statement')],['amount',t('amount'),'number'],['category',t('category')]],o=>{o.companyId=session.company.id;o.id=id('x');db.expenses.push(o);db.journal.push({id:id('j'),companyId:session.company.id,date:o.date||todayISO(),account:'مصروف',debit:Number(o.amount||0),credit:0,note:o.note});save();audit('expense.create',o.note);render()});
$('#scanExpense').onclick=scanExpenseDocument;
}
   async function scanExpenseDocument(){
modal(t('scanExp'),`
<div class="field">
<label>${t('pickSchein')}</label>
<input id="doc" type="file" accept="image/*" class="hidden">
<div class="toolbar">
<button type="button" class="btn" id="pickExp">${t('pickFile')}</button>
<button type="button" class="btn primary" onclick="openCamera()">📷 ${t('openCam')}</button>
</div>
<div class="hint">${t('ocrHint')}</div>
<img id="expenseImg" class="ocr-preview hidden">
<div id="expenseStatus" class="hint"></div>
</div>
`,async()=>{
const f=$('#doc').files[0];
if(!f)return toast(t('pickScheinFirst'));

try{
$('#msave').disabled=true;
$('#expenseStatus').textContent=t('readingInv2');

const imageData=await new Promise((resolve,reject)=>{
const reader=new FileReader();
reader.onload=()=>resolve(reader.result);
reader.onerror=reject;
reader.readAsDataURL(f);
});

$('#expenseImg').src=imageData;
$('#expenseImg').classList.remove('hidden');

const response=await fetch(
`${window.SUPABASE_URL}/functions/v1/expense-ocr`,
{
method:'POST',
headers:{
'Content-Type':'application/json',
'apikey':window.SUPABASE_KEY,
'Authorization':`Bearer ${window.SUPABASE_KEY}`
},
body:JSON.stringify({image:imageData})
}
);

const ai=await response.json();

if(!response.ok){
console.error(ai);
throw new Error(ai.error||'تعذرت قراءة الفاتورة');
}

const amount=Number(
String(ai.total_amount||ai.net_amount||'0')
.replace(',','.')
.replace(/[^\d.-]/g,'')
)||0;

const expense={
id:id('x'),
companyId:session.company.id,
date:ai.expense_date||new Date().toISOString().slice(0,10),
note:ai.description||ai.supplier_name||'مصروف',
amount:amount,
category:ai.category||'مصروف',
supplier_name:ai.supplier_name||'',
net_amount:ai.net_amount||'',
tax_amount:ai.tax_amount||'',
total_amount:ai.total_amount||'',
payment_method:ai.payment_method||'',
receipt_number:ai.receipt_number||'',
notes:ai.notes||''
};

db.expenses.push(expense);
save();
audit('expense.create',expense.note);
closeModal();
render();
toast(t('expAdded'));

}catch(e){
console.error(e);
$('#expenseStatus').textContent=t('ocrFail');
toast(e.message||'حدث خطأ');
$('#msave').disabled=false;
}
},t('readAdd2'));
if($('#pickExp')) $('#pickExp').onclick=()=>$('#doc').click();
}

function journal(){
 const rows=companyRows('journal');
 $('#content').innerHTML=head(t('journalTitle'),`<button class="btn primary" id="add">${t('newEntry')}</button>`)+
 table([t('date'),t('account'),t('debit'),t('credit'),t('statement')],rows.map(x=>[esc(x.date),esc(x.account),money(x.debit),money(x.credit),esc(x.note)]));
 $('#add').onclick=()=>simpleModal(t('newEntry'),[['date',t('date'),'date'],['account',t('account')],['debit',t('debit'),'number'],['credit',t('credit'),'number'],['note',t('statement')]],o=>{o.companyId=session.company.id;o.id=id('j');db.journal.push(o);save();audit('journal.create',o.account);render()});
}
function reports(){
 const inv=companyRows('invoices'),exp=companyRows('expenses'),pur=companyRows('purchases');
 const sales=inv.reduce((a,x)=>a+Number(x.total||0),0);
 const purCost=pur.reduce((a,x)=>a+Number(x.total_amount||(x.qty||0)*(x.price||0)||0),0);
 const costs=exp.reduce((a,x)=>a+Number(x.amount||0),0)+purCost;
 const unpaid=inv.filter(x=>x.status!=='storno' && !x.paid && !['cash','card'].includes(x.payment));
 const hours=companyRows('repairs').reduce((a,x)=>a+Number(x.hours||0),0);
 const topParts={};
 companyRows('repairs').forEach(r=>(r.parts||[]).forEach(p=>{topParts[p.name]=(topParts[p.name]||0)+Number(p.qty||0)}));
 const top=Object.entries(topParts).sort((a,b)=>b[1]-a[1]).slice(0,5);
 $('#content').innerHTML=head(t('reportsTitle'))+`<div class="grid">
 <div class="card tap" onclick="session.invoiceFilter='';goPage('invoices')"><div class="muted">${t('sales')}</div><div class="metric">${money(sales)}</div><div class="hint">${t('openBtn')}</div></div>
 <div class="card tap" onclick="goPage('expenses')"><div class="muted">${t('costsPurch')}</div><div class="metric">${money(costs)}</div><div class="hint">${t('openBtn')}</div></div>
 <div class="card tap" onclick="goPage('journal')"><div class="muted">${t('approxDiff')}</div><div class="metric">${money(sales-costs)}</div><div class="hint">${t('openBtn')}</div></div>
 <div class="card tap" onclick="session.invoiceFilter='unpaid';goPage('invoices')"><div class="muted">${t('unpaidInvoices')}</div><div class="metric">${unpaid.length}</div><div class="hint">${t('openBtn')}</div></div>
 <div class="card tap" onclick="goPage('repairs')"><div class="muted">${t('hoursLogged')}</div><div class="metric">${hours}</div><div class="hint">${t('openBtn')}</div></div>
 <div class="card tap" onclick="goPage('repairs')"><div class="muted">${t('openJobs')}</div><div class="metric">${openRepairs().length}</div><div class="hint">${t('openBtn')}</div></div>
 </div>
 <div class="card tap" style="margin-top:12px" onclick="goPage('inventory')"><b>${t('topParts')}</b>
 ${top.length?table([t('parts'),t('qty')],top.map(([n,q])=>[esc(dLabel(n)),q]),'top_parts'):`<p class="muted">${t('noData')}</p>`}
 </div>
 <div class="card" style="margin-top:12px"><b>${t('customerDebts')}</b>
 ${unpaid.length?table([t('invoiceNo'),t('vehicle'),t('total')],unpaid.map(x=>[`<button class="btn small" onclick="previewInvoice('${x.id}')">${esc(x.number||x.id)}</button>`,vehicleName(x.vehicleId),money(x.total)]),'unpaid'):`<p class="muted">${t('noDebts')}</p>`}
 </div>`;
}
function integrations(){
 const cars=companyRows('vehicles');
 $('#content').innerHTML=head(t('integrationsTitle'))+`<div class="grid">
 <div class="card"><b>PartsLink24</b><p class="muted">${t('plHint')}</p>
  <select id="plCar">${cars.map(v=>`<option value="${v.id}">${esc(v.plate||'')} · ${esc(v.vin||'')}</option>`).join('')}</select>
  <button class="btn primary" style="margin-top:8px" id="plOpen">${t('plOpen')}</button>
 </div>
 <div class="card"><b>${t('waTitle')}</b><p class="muted">${t('waHint')}</p></div>
 <div class="card"><b>TSE / Kasse</b><p class="muted">${t('tseHint')}</p></div>
 <div class="card"><b>Matthies Katy</b>
  <p class="muted">${t('katyHintInt')}</p>
  <div class="field"><label>Vincario API Key</label><input id="vinKey" value="${esc(db.settings.vincarioKey||'')}"></div>
  <div class="field"><label>Vincario Secret</label><input id="vinSec" value="${esc(db.settings.vincarioSecret||'')}" type="password"></div>
  <div class="field"><label>${t('katyUser')}</label><input id="katyU" value="${esc(db.settings.katyUser||'')}"></div>
  <div class="field"><label>${t('katyPass')}</label><input id="katyP" type="password" value="${esc(db.settings.katyPass||'')}"></div>
  <div class="toolbar"><button class="btn primary" id="katySave">${t('saveLogin')}</button>
  <button class="btn" id="katyGo">${t('openKaty')}</button>
  <button class="btn" id="henryGo">${t('openHenry')}</button></div>
  <p class="hint">${t('henryImportHint')}</p>
  <input id="henryFile" type="file" accept=".csv,.txt,.tsv">
 </div>
 </div>`;
 const btn=$('#plOpen');
 if(btn) btn.onclick=()=>openPartsLink($('#plCar').value);
 if($('#katySave')) $('#katySave').onclick=()=>{
   if($('#vinKey')) db.settings.vincarioKey=$('#vinKey').value.trim();
   if($('#vinSec')) db.settings.vincarioSecret=$('#vinSec').value.trim();
   db.settings.katyUser=$('#katyU').value.trim();
   db.settings.katyPass=$('#katyP').value;
   db.settings.katyLogged=true;
   save(); toast(t('katySaved'));
 };
 if($('#katyGo')) $('#katyGo').onclick=()=>{
   db.settings.katyLogged=true; save();
   openKatySearch('');
 };
 if($('#henryGo')) $('#henryGo').onclick=()=>window.open(db.settings.henryUrl||'https://www.matthies.de/software/henry-jr.print.html','_blank');
 if($('#henryFile')) $('#henryFile').onchange=e=>{
   const f=e.target.files[0]; if(!f) return;
   const r=new FileReader();
   r.onload=()=>{ const n=importHenryArticles(r.result); toast(t('imported')+' '+n); };
   r.readAsText(f);
 };
}
function auditPage(){
 const rows=db.audit.filter(a=>!session.company||a.company===session.company.id||!a.company).slice(0,200);
 const act=s=>({login:'Login',logout:'Logout','invoice.create':'Rechnung','invoice.update':'Rechnung','invoice.storno':'Storno'}[s]||s);
 $('#content').innerHTML=head(t('auditTitle'))+table([t('when'),t('userCol'),t('actionCol'),t('detailCol')],rows.map(a=>[fmtWhen(a.ts),esc(typeof dLabel==='function'?dLabel(a.user):a.user),esc(act(a.action)),esc(a.detail)]));
}
function newWorkshopModal(){
  modal(t('newWorkshop'), `<div class="form-grid">
    <div class="field"><label>${t('wsTrade')}</label><input id="nwBrand" placeholder="TST Nord"></div>
    <div class="field"><label>${t('wsLegal')}</label><input id="nwName" placeholder="Firma UG"></div>
    <div class="field"><label>${t('country')}</label><select id="nwCountry"><option value="DE">Deutschland</option><option value="AT">Österreich</option><option value="CH">Schweiz</option><option value="ES">España</option><option value="NL">Nederland</option></select></div>
    <div class="field"><label>${t('currency')}</label><input id="nwCur" value="EUR"></div>
    <div class="field span2"><label>${t('address')}</label><input id="nwAddr"></div>
  </div>`, ()=>{
    const brand=$('#nwBrand').value.trim(), name=$('#nwName').value.trim();
    if(!brand && !name) return toast('أدخل اسم الورشة');
    const co={id:id('ws'), name:brand||name, country:$('#nwCountry').value, currency:$('#nwCur').value.trim()||'EUR', docLang:$('#nwCountry').value==='DE'?'de':'de'};
    co.profile=defaultWorkshopProfile(co, db.settings);
    co.profile.workshopBrand=brand||name;
    co.profile.workshopName=name||brand;
    co.profile.workshopAccountHolder=name||brand;
    co.profile.workshopAddress=$('#nwAddr').value.trim();
    co.profile.invoiceSeq=0; co.profile.auftragSeq=0;
    db.companies.push(co); save();
    session.company=co; closeModal(); render(); toast('تمت إضافة الورشة — املأ البيانات القانونية من الإعدادات');
  });
}
window.newWorkshopModal=newWorkshopModal;
function settings(){
 const w=workshop();
 const conf=(db.conflicts||[]).slice(0,8).map(c=>`${esc(c.ts)} · ${esc(c.key)} · ${esc(c.winner)}`).join('<br>')||'—';
 const arch=(db.archive||[]).slice(0,8).map(a=>`${esc(a.number||'')} · ${money(a.total)}`).join('<br>')||'—';
 $('#content').innerHTML=head(t('settings'))+`<div class="grid"><div class="card"><b>Beleg-Archiv</b><div class="muted">${arch}</div></div><div class="card"><b>Sync-Konflikte</b><div class="muted">${conf}</div></div></div><div class="card"><div class="form-grid">
 <div class="field span2"><div class="alert">${t('activeWs')}: <b>${esc(session.company.name)}</b> · ${esc(session.company.country)}. ${t('wsOnly')}</div></div>
 <div class="field span2"><label>${t('language')}</label><select id="lang">${langOptions(db.settings.uiLang||'ar')}</select>
 <div class="hint">${t('langHint')}</div></div>
 <div class="field"><label>${t('font')}</label><input id="font" class="latnum" inputmode="decimal" lang="de" min="13" max="22" value="${db.settings.font}"></div>
 <div class="field"><label>${t('hourly')}</label><input id="hrate" class="latnum" inputmode="decimal" lang="de" step="0.01" value="${w.hourlyRate||85}"></div>
 <div class="field"><label>${t('phone')}</label><input id="wphone" value="${esc(w.workshopPhone||'')}"></div>
 <div class="field span2"><label>${t('invAddr')}</label><input id="waddr" value="${esc(w.workshopAddress||'')}"></div>
 <div class="field span2"><label>${t('invTpl')}</label><select id="itpl">
  <option value="werkstatt" ${(w.invoiceTpl||'modern')==='werkstatt'?'selected':''}>${t('tplShop')}</option>
  <option value="modern" ${w.invoiceTpl==='modern'?'selected':''}>${t('tplModern')}</option>
  <option value="classic" ${w.invoiceTpl==='classic'?'selected':''}>${t('tplClassic')}</option>
  <option value="atelier" ${w.invoiceTpl==='atelier'?'selected':''}>${t('tplAtelier')}</option>
 </select></div>
 <div class="field span2"><label>${t('brandName')}</label><input id="wbrand" value="${esc(w.workshopBrand||'TST')}"></div>
 <div class="field span2"><label>${t('legalName')}</label><input id="wname" value="${esc(w.workshopName||'')}"></div>
 <div class="field"><label>USt-IdNr.</label><input id="wtax" value="${esc(w.workshopTaxId||'')}"></div>
 <div class="field"><label>Steuernummer</label><input id="wstnr" value="${esc(w.workshopSteuerNr||'')}"></div>
 <div class="field"><label>IBAN</label><input id="wiban" value="${esc(w.workshopIban||'')}"></div>
 <div class="field"><label>BIC</label><input id="wbic" value="${esc(w.workshopBic||'')}" placeholder="GENODEF1RLB"></div>
 <div class="field"><label>HRB</label><input id="whrb" value="${esc(w.workshopHrb||'')}" placeholder="25248 HL"></div>
 <div class="field"><label>Sitz</label><input id="wsitz" value="${esc(w.workshopSitz||'')}"></div>
 <div class="field"><label>${t('payDays')}</label><input id="pdays" class="latnum" inputmode="decimal" lang="de" value="${w.paymentDays||0}"></div>
 <div class="field"><label>${t('paper')}</label><select id="ppaper">
  <option value="A4" ${(w.printPaper||'A4')==='A4'?'selected':''}>A4</option>
  <option value="A5" ${w.printPaper==='A5'?'selected':''}>A5</option>
 </select></div>
 <div class="field"><label>${t('margins')}</label><select id="pmargin">
  <option value="6mm" ${w.printMargin==='6mm'?'selected':''}>${t('marginTight')}</option>
  <option value="8mm" ${(w.printMargin||'8mm')==='8mm'?'selected':''}>${t('marginDef')}</option>
  <option value="12mm" ${w.printMargin==='12mm'?'selected':''}>${t('marginNorm')}</option>
 </select></div>
 <div class="field"><label>${t('printColors')}</label><select id="pcolor">
  <option value="1" ${w.printColor!==false?'selected':''}>${t('colorYes')}</option>
  <option value="0" ${w.printColor===false?'selected':''}>${t('colorNo')}</option>
 </select></div>
 <div class="field"><label>${t('bank')}</label><input id="wbank" value="${esc(w.workshopBank||'')}"></div>
 <div class="field"><label>${t('invEmail')}</label><input id="wmail" value="${esc(w.workshopEmail||'')}"></div>
 <div class="field"><label>Amtsgericht</label><input id="wcourt" value="${esc(w.workshopCourt||'')}"></div>
 <div class="field"><label>${t('ownerGf')}</label><input id="wowner" value="${esc(w.workshopOwner||'')}"></div>
 <div class="field"><label>${t('newPass')}</label><input id="newpass" type="password" placeholder="${t('passUnchanged')}"></div>
 </div>
 <p class="okbox">${t('invoiceNote')}</p>
 <div class="toolbar" style="margin-top:12px">
  <button class="btn primary" id="saveset">${t('save')}</button>
  <button class="btn" id="addWsSet">＋ ${t('newWorkshop')}</button>
  <button class="btn" id="exportData">${t('backup')}</button>
  <button class="btn" id="exportCo">${t('exportWs')||t('backup')}</button>
  <button class="btn" id="syncCloud">${t('sync')}</button>
  <button class="btn bad" id="reset">${t('reset')}</button>
 </div>
 </div>`;
 if($('#lang')) $('#lang').onchange=()=>{db.settings.uiLang=$('#lang').value;save();applyUiLang();render();};
 $('#saveset').onclick=()=>{
   db.settings.font=+$('#font').value||16;
   db.settings.uiLang=$('#lang').value;
   patchWorkshop({
     hourlyRate:+$('#hrate').value||85,
     workshopPhone:$('#wphone').value,
     workshopAddress:$('#waddr').value,
     workshopTaxId:$('#wtax').value,
     workshopIban:$('#wiban').value,
     invoiceTpl:$('#itpl')?$('#itpl').value:'modern',
     workshopBrand:$('#wbrand')?$('#wbrand').value:'',
     workshopName:$('#wname')?$('#wname').value:'',
     workshopSteuerNr:$('#wstnr')?$('#wstnr').value:'',
     workshopBank:$('#wbank')?$('#wbank').value:'',
     workshopEmail:$('#wmail')?$('#wmail').value:'',
     workshopCourt:$('#wcourt')?$('#wcourt').value:'',
     workshopOwner:$('#wowner')?$('#wowner').value:'',
     workshopBic:$('#wbic')?$('#wbic').value:'',
     workshopHrb:$('#whrb')?$('#whrb').value:'',
     workshopSitz:$('#wsitz')?$('#wsitz').value:'',
     workshopAccountHolder:($('#wname')?$('#wname').value:'')||workshop().workshopAccountHolder,
     paymentDays:$('#pdays')?+$('#pdays').value||0:0,
     printPaper:$('#ppaper')?$('#ppaper').value:'A4',
     printMargin:$('#pmargin')?$('#pmargin').value:'8mm',
     printColor:$('#pcolor')?$('#pcolor').value!=='0':true
   });
   const np=$('#newpass')&&$('#newpass').value; if(np){ const u=db.users.find(x=>x.u===session.user.u); if(u){u.p=np;session.user.p=np;} }
   applyUiLang();toast(t('saved'));render();
 };
 if($('#addWsSet')) $('#addWsSet').onclick=newWorkshopModal;
 if($('#exportCo')) $('#exportCo').onclick=()=>{
   const cid=session.company.id;
   const pack={company:session.company, exportedAt:new Date().toISOString(),
     customers:companyRows('customers'), vehicles:companyRows('vehicles'), repairs:companyRows('repairs'),
     invoices:companyRows('invoices'), purchases:companyRows('purchases'), inventory:companyRows('inventory'),
     employees:companyRows('employees'), expenses:companyRows('expenses'), appointments:companyRows('appointments')};
   const a=document.createElement('a');
   a.href=URL.createObjectURL(new Blob([JSON.stringify(pack,null,2)],{type:'application/json'}));
   a.download='tst-workshop-'+cid+'-'+new Date().toISOString().slice(0,10)+'.json';
   a.click(); toast('تم تصدير ورشة '+cid);
 };
 $('#exportData').onclick=()=>{
  const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  db.settings.lastBackup=new Date().toISOString(); save();
  a.download='werkpilot-backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  toast('تم التصدير');
 };
 $('#syncCloud').onclick=async()=>{
  toast('جاري المزامنة...');
  await syncAllCloud();
  render();
  toast('تمت المزامنة');
 };
 $('#reset').onclick=()=>{if(confirm('سيتم حذف كل البيانات المحلية. متابعة؟')){db=clone(seed);save();toast('تمت إعادة الضبط');render()}};
}

function studio(){
  if(!isDev()){ toast('هذه الصفحة لصاحب الورشة فقط'); session.page='dashboard'; return render(); }
  const reqs=db.settings.devRequests||[];
  $('#content').innerHTML=head(t('devStudio'))+`
  <div class="alert">هذه الصفحة وزر G تظهر فقط لحساب owner. الموظفون ما بيشوفوهم.</div>
  <div class="card">
    <p class="muted">Grok مو سيرفر جوّا الموقع، بس الطلبات محفوظة هون. الصقها بالمحادثة حتى التنفيذ يصير فوراً.</p>
    <p>${reqs.length?reqs.slice().reverse().map(r=>`<div class="muted">${esc(r.ts)} — ${esc(r.text)}</div>`).join(''):'ما في طلبات بعد. استخدم الزر الذهبي G أسفل يمين الشاشة.'}</p>
    <div class="toolbar">
      <button class="btn" id="expRaw">تصدير JSON كامل</button>
      <button class="btn" id="impRaw">استيراد JSON</button>
      <button class="btn primary" id="seedAgain">إعادة بيانات التجربة</button>
    </div>
    <div class="field" style="margin-top:12px"><label>ملاحظات تطوير</label><textarea id="devNotes">${esc(db.settings.devNotes||'')}</textarea></div>
    <button class="btn primary" id="saveNotes">حفظ الملاحظات</button>
    <input id="jsonFile" type="file" accept="application/json" class="hidden">
  </div>`;
  $('#saveNotes').onclick=()=>{db.settings.devNotes=$('#devNotes').value;save();toast('تم حفظ الملاحظات')};
  $('#expRaw').onclick=()=>{
    const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='baymeister-full.json'; a.click();
  };
  $('#seedAgain').onclick=()=>{if(confirm('إعادة الضبط؟')){db=clone(seed);save();render();}};
  $('#impRaw').onclick=()=>$('#jsonFile').click();
  $('#jsonFile').onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{try{db=JSON.parse(r.result);save();toast('تم الاستيراد');render()}catch{toast('ملف غير صالح')}};
    r.readAsText(f);
  };
}

function simpleModal(title,fields,onSave){
 modal(title,`<div class="form-grid">${fields.map(([k,l,typ='text'])=>{
   const num=typ==='number';
   const extra=num?'class="latnum" inputmode="decimal" lang="de"':'';
   return `<div class="field"><label>${l}</label><input id="f_${k}" type="${num?'text':typ}" ${extra}></div>`;
 }).join('')}</div>`,()=>{
  const o={};fields.forEach(([k])=>o[k]=$('#f_'+k).value);closeModal();onSave(o);
 });
}

   const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_KEY = window.SUPABASE_KEY;
  // جعله عالمياً عشان دوال المشتريات تقدر تستخدمه
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const supabaseClient = window.supabaseClient;

  // تعريض الدوال المستخدمة من onclick
  window.viewReceipt = typeof viewReceipt !== 'undefined' ? viewReceipt : null;
  window.viewReceiptPDF = typeof viewReceiptPDF !== 'undefined' ? viewReceiptPDF : null;
  window.deletePurchase = typeof deletePurchase !== 'undefined' ? deletePurchase : null;
  window.openCameraForPurchase = typeof openCameraForPurchase !== 'undefined' ? openCameraForPurchase : null;
  window.convertRepairToInvoice = convertRepairToInvoice;
  window.whatsappReady = whatsappReady;
  window.openRepair = function(rid){ repairEditModal(rid); };
  window.openPartsLink = openPartsLink;


login();
  async function openCamera(){
if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
return toast(t('camUnsupported')||t('openCam'));
}

const box=document.createElement('div');
box.className='modal-back';
box.innerHTML=`
<div class="modal" style="max-width:700px">
<div class="modal-head">
<b>📷 ${t('scanScheinTitle')||t('scanSchein')}</b>
<button id="camClose" class="btn bad">✕</button>
</div>
<video id="cameraVideo" autoplay playsinline
style="width:100%;border-radius:12px;background:#000"></video>
<div style="margin-top:12px;text-align:center">
<button id="takePhoto" class="btn primary">📸 ${t('takePhoto')||t('openCam')}</button>
</div>
</div>
`;

document.body.appendChild(box);

const video=box.querySelector('#cameraVideo');
let stream;

try{
stream=await navigator.mediaDevices.getUserMedia({
video:{facingMode:{ideal:'environment'}},
audio:false
});

video.srcObject=stream;

const close=()=>{
if(stream) stream.getTracks().forEach(t=>t.stop());
box.remove();
};

box.querySelector('#camClose').onclick=close;

box.querySelector('#takePhoto').onclick=()=>{
const canvas=document.createElement('canvas');
canvas.width=video.videoWidth;
canvas.height=video.videoHeight;

canvas.getContext('2d').drawImage(video,0,0);

canvas.toBlob(blob=>{
const file=new File([blob],'fahrzeugschein.jpg',{type:'image/jpeg'});
const dt=new DataTransfer();
dt.items.add(file);

const input=document.querySelector('#doc');
input.files=dt.files;
input.dispatchEvent(new Event('change',{bubbles:true}));

close();
toast(t('shotOk'));
},'image/jpeg',0.92);
};

}catch(e){
box.remove();
toast(t('camDenied'));
console.error(e);
}
}
 
