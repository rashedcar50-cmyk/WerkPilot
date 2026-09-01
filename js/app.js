/* BayMeister screens */
function vehicleOf(vid){ return (typeof rowById==='function' && rowById('vehicles',vid)) || (db.vehicles||[]).find(x=>x.id===vid); }
function customerOf(cid){ return (typeof rowById==='function' && rowById('customers',cid)) || (db.customers||[]).find(c=>c.id===cid); }
function waBtn(sel, cls){
  const lab=(typeof t==='function' && t('fromWhatsApp') && t('fromWhatsApp')!=='fromWhatsApp') ? t('fromWhatsApp') : 'WhatsApp';
  return `<button type="button" class="btn btn-wa ${cls||''}" onclick="pickWhatsApp('${sel}')"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.89 14.09c-.25.7-1.45 1.29-2.02 1.37-.52.07-1.17.1-1.89-.12-.43-.13-.99-.32-1.7-.63-3-1.3-4.96-4.33-5.11-4.53-.15-.2-1.25-1.66-1.25-3.17 0-1.5.79-2.24 1.07-2.54.28-.3.61-.37.81-.37h.58c.19 0 .44-.07.69.53.25.61.85 2.08.93 2.23.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.38-.45.51-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.28.1 1.75.83 2.05.98.3.15.5.22.57.34.07.12.07.7-.18 1.4z"/></svg> ${lab}</button>`;
}
window.waBtn=waBtn;
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

function login(){
 applyUiLang();
 $('#app').innerHTML=`<div class="login-screen"><div class="login-card">
 <div class="brand-mark"><div class="brand-word">Werkivo</div></div><div class="tag">${t('tag')}</div>
 <div class="field"><label>${t('user')}</label><input id="lu" autocomplete="username"></div>
 <div class="field"><label>${t('pass')}</label><input id="lp" type="password" autocomplete="current-password"></div>
 <div class="field"><label>${t('language')}</label><select id="loginLang">${langOptions(db.settings.uiLang||'de')}</select></div>
 <button class="btn primary full" id="loginBtn">${t('login')}</button>
 <div class="login-fail" id="loginErr"></div><p class="muted" style="margin-top:14px;font-size:.8rem"><a href="impressum.html">${t('impressum')}</a> · <a href="privacy.html">${t('privacy')}</a></p>
 </div></div>`;
 if(typeof scrubUiLang==='function') scrubUiLang($('#app'));
 window._loginFails = window._loginFails || 0;
 const lg=$('#loginLang');
 if(lg){ lg.onchange=()=>{db.settings.uiLang=lg.value;save();login();}; }
 $('#loginBtn').onclick=async ()=>{
  if(lg) {db.settings.uiLang=lg.value;save();}
  if(window._loginFails>=5) return $('#loginErr').textContent=t('loginBlocked');
  const name=$('#lu').value.trim(), pass=$('#lp').value;
  const cand=(db.users||[]).find(x=>x.u===name);
  const ok=cand && WP.Engine && await WP.Engine.passOk(cand.p, pass);
  if(!ok){ window._loginFails++; $('#loginErr').textContent=t('loginBad'); return toast(t('loginBad')); }
  if(cand.p===pass && WP.Engine.hashPassAsync){
    try{ cand.p=await WP.Engine.hashPassAsync(pass); save(true); }catch(e){}
  }
  window._loginFails=0;
  const startPage=(location.search.match(/[?&]page=([a-z]+)/)||[])[1]||'dashboard';
  session={user:WP.Engine.publicUser(cand),company:db.companies[0],page:startPage};
  audit('login');
  syncAllCloud().finally(async ()=>{
    WP.run("afterLogin", session);
    if(/share=1/.test(location.search) || await consumeSharedWhatsApp()){
      session.page='customers';
      render();
      setTimeout(()=>{
        customerModal();
        setTimeout(()=>{
          applySharedFileTo('#doc');
          if(window._sharedWaFile) ingestScheinFile(window._sharedWaFile);
        }, 250);
      }, 200);
    } else render();
  });
 };
}

function closeMobileMenus(){
  const side=$('#side'); if(side) side.classList.remove('open');
  const slot=$('#toolsSlot'); if(slot) slot.classList.remove('open');
  const scrim=$('#navScrim'); if(scrim) scrim.classList.remove('on');
  document.body.classList.remove('nav-open');
}
function bindShellEvents(){
 $$('[data-page]').forEach(b=>b.onclick=()=>{ closeMobileMenus(); goPage(b.dataset.page); });
 if($('#backBtn')) $('#backBtn').onclick=()=>{ closeMobileMenus(); goBack(); };
 const lo=$('#logout');
 if(lo) lo.onclick=()=>{audit('logout');session=null; const f=$('#devFab'); if(f)f.remove(); const p=$('#devPanel'); if(p)p.remove(); login()};
 if($('#company')) $('#company').onchange=e=>{closeMobileMenus();session.company=db.companies.find(c=>c.id===e.target.value);session.page='dashboard';syncAllCloud().finally(()=>render(true))};
 if($('#addWorkshop')) $('#addWorkshop').onclick=()=>{ closeMobileMenus(); newWorkshopModal(); };
 if($('#uiLangTop')) $('#uiLangTop').onchange=e=>{closeMobileMenus();db.settings.uiLang=e.target.value;save(true);applyUiLang();render(true);};
 if($('#menu')) $('#menu').onclick=()=>{
   const slot=$('#toolsSlot'); if(slot) slot.classList.remove('open');
   const side=$('#side');
   const open=!side.classList.contains('open');
   side.classList.toggle('open', open);
   const scrim=$('#navScrim'); if(scrim) scrim.classList.toggle('on', open);
   document.body.classList.toggle('nav-open', open);
 };
 if($('#moreBtn')) $('#moreBtn').onclick=e=>{
   e.stopPropagation();
   const side=$('#side'); if(side) side.classList.remove('open');
   const slot=$('#toolsSlot'); if(!slot) return;
   const open=!slot.classList.contains('open');
   slot.classList.toggle('open', open);
   const scrim=$('#navScrim'); if(scrim) scrim.classList.toggle('on', open);
   document.body.classList.toggle('nav-open', open);
 };
 if($('#navScrim')) $('#navScrim').onclick=closeMobileMenus;
 if(!window._menuHideBound){
   window._menuHideBound=true;
   document.addEventListener('click', function(ev){
     const slot=$('#toolsSlot');
     if(!slot || !slot.classList.contains('open')) return;
     if(slot.contains(ev.target) || (ev.target.closest && ev.target.closest('#moreBtn'))) return;
     closeMobileMenus();
   });
 }
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
}
function markActivePage(){
 $$('[data-page]').forEach(b=>b.classList.toggle('active', b.dataset.page===session.page));
}
function render(force){
 applyUiLang();
 if(typeof flushRows==='function') flushRows();
 document.documentElement.style.setProperty('--font',db.settings.font+'px');
 const lang=db.settings.uiLang||'de';
 const uid=session&&session.user&&session.user.u;
 const cid=session&&session.company&&session.company.id;
 const shell=$('#app')&&$('#app').querySelector('.shell');
 if(!force && shell && $('#content') && WP._uiLang===lang && WP._uid===uid && WP._cid===cid){
  markActivePage();
  page();
  mountDevDock();
  return;
 }
 WP._uiLang=lang; WP._uid=uid; WP._cid=cid;
 const allowed=nav().filter(([k])=>roleCan(k));
 $('#app').innerHTML=`<div class="shell henry-skin">
 <div class="henry-top"><span class="ver">v1.12.79</span> ${t('loggedInAs')}: ${esc(session.user.name||'')} · TST
  <span class="henry-top-right"><button class="btn ghost small" id="logout">${t('logout')}</button></span>
 </div>
 <aside class="sidebar" id="side"><div class="sidebrand"><div class="brand-mark"><div class="brand-word">Werkivo</div></div><div class="muted" style="margin:6px 0 10px;font-size:.78rem">${t('tag')}</div></div><div class="nav">
 ${allowed.map(([k,l])=>`<button data-page="${k}" class="${session.page===k?'active':''}">${l}</button>`).join('')}
 </div></aside>
 <div class="nav-scrim" id="navScrim"></div>
 <main class="main">
  <div class="topbar">
   <button class="ico-btn mobile-menu" id="menu" type="button" aria-label="Menu">☰</button>
   <button class="ico-btn" id="backBtn" type="button" aria-label="${t('prev')}">←</button>
   <div class="mob-title">Werkivo</div>
   <div class="tools-slot" id="toolsSlot">
    <select id="company">${visibleCompanies().map(c=>`<option value="${c.id}" ${c.id===session.company.id?'selected':''}>${esc(c.profile?.workshopBrand||c.name)} · ${c.country}</option>`).join('')}</select>
    <input class="searchbox" id="qsearch" placeholder="${t('search')}">
    <select id="uiLangTop" title="${t('language')}">${langOptions(db.settings.uiLang||'de')}</select>
    ${canEdit()?`<button class="ico-btn" id="addWorkshop" type="button" title="${t('newWorkshop')}">＋</button>`:''}
   </div>
   <button class="ico-btn mob-only" id="moreBtn" type="button" aria-label="More">⋯</button>
  </div>
  <div class="content" id="content"></div>
 </main>
 <nav class="bottom-nav">
  ${[['dashboard',t('todayShort')],['repairs',t('ordersShort')],['vehicles',t('carsShort')],['appointments',t('apptShort')],['invoices',t('invShort')]].filter(([k])=>roleCan(k)).map(([k,l])=>`<button data-page="${k}" class="${session.page===k?'active':''}">${l}</button>`).join('')}
 </nav>
</div>`;
 bindShellEvents();
 page();
 mountDevDock();
}
function grokPosLoad(){
  try{ return JSON.parse(localStorage.getItem('werkivo_gpos')||'null'); }catch(e){ return null; }
}
function grokPosSave(x,y){
  try{ localStorage.setItem('werkivo_gpos', JSON.stringify({x,y})); }catch(e){}
}
function placeGrokFab(fab, x, y){
  const w=fab.offsetWidth||48, h=fab.offsetHeight||48;
  const maxX=Math.max(8, window.innerWidth-w-8);
  const maxY=Math.max(8, window.innerHeight-h-8);
  x=Math.min(maxX, Math.max(8, x));
  y=Math.min(maxY, Math.max(8, y));
  fab.style.left=x+'px';
  fab.style.top=y+'px';
  fab.style.right='auto';
  fab.style.bottom='auto';
  const pan=$('#devPanel');
  if(pan){
    const pw=Math.min(400, window.innerWidth-16);
    let px=x-pw+w; if(px<8) px=8;
    let py=y+h+8;
    if(py+160>window.innerHeight) py=Math.max(8, y-Math.min(pan.offsetHeight||280, window.innerHeight-16)-8);
    pan.style.left=px+'px';
    pan.style.top=py+'px';
    pan.style.right='auto';
  }
  return {x,y};
}
function mountDevDock(){
  if(typeof isDev!=='function' || !isDev()) return;
  if($('#devFab')) return;
  const fab=document.createElement('div');
  fab.id='devFab'; fab.className='dev-fab'; fab.title='Grok — lange drücken zum Verschieben'; fab.setAttribute('role','button'); fab.textContent='G';
  document.body.appendChild(fab);
  const saved=grokPosLoad();
  requestAnimationFrame(()=>{
    if(saved && typeof saved.x==='number') placeGrokFab(fab, saved.x, saved.y);
  });
  let pressTimer=null, dragging=false, moved=false, armed=false, lastToggle=0, sx=0, sy=0, ox=0, oy=0;
  const tapOpen=()=>{
    if(Date.now()-lastToggle<450) return;
    lastToggle=Date.now();
    toggleDevPanel();
  };
  const point=e=>{
    const t=e.touches&&e.touches[0] || e.changedTouches&&e.changedTouches[0] || e;
    return {x:t.clientX, y:t.clientY};
  };
  const start=e=>{
    if(e.pointerType==='mouse' && e.button!==0) return;
    armed=true;
    const p=point(e);
    sx=p.x; sy=p.y; moved=false; dragging=false;
    const r=fab.getBoundingClientRect(); ox=r.left; oy=r.top;
    if(pressTimer) clearTimeout(pressTimer);
    pressTimer=setTimeout(()=>{
      dragging=true;
      fab.classList.add('dragging');
      if(navigator.vibrate) try{ navigator.vibrate(20); }catch(err){}
    }, 380);
  };
  const move=e=>{
    if(!armed) return;
    const p=point(e);
    if(Math.abs(p.x-sx)>18 || Math.abs(p.y-sy)>18){
      moved=true;
      if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; }
      dragging=true; fab.classList.add('dragging');
    }
    if(!dragging) return;
    if(e.cancelable) e.preventDefault();
    placeGrokFab(fab, ox+(p.x-sx), oy+(p.y-sy));
  };
  const end=()=>{
    if(!armed) return;
    armed=false;
    if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; }
    fab.classList.remove('dragging');
    if(dragging && moved){
      const r=fab.getBoundingClientRect();
      grokPosSave(r.left, r.top);
      dragging=false;
      return;
    }
    dragging=false;
    if(!moved) tapOpen();
  };
  fab.addEventListener('click', e=>{
    e.preventDefault();
    e.stopPropagation();
    if(dragging || moved) return;
    tapOpen();
  });
  if(window.PointerEvent){
    fab.addEventListener('pointerdown', start);
    fab.addEventListener('pointerup', end);
    window.addEventListener('pointermove', move, {passive:false});
    window.addEventListener('pointercancel', end);
  }else{
    fab.addEventListener('touchstart', start, {passive:true});
    fab.addEventListener('touchend', end);
    window.addEventListener('touchmove', move, {passive:false});
    fab.addEventListener('mousedown', start);
    window.addEventListener('mouseup', end);
  }
}
function grokOut(msg){
  const el=$('#devOut'); if(el) el.textContent=String(msg||'');
  toast(String(msg||'').slice(0,80));
}
function runGrokCommand(raw){
  if(typeof isDev!=='function' || !isDev()) return grokOut('Nur Entwickler');
  const text=String(raw||'').trim();
  if(!text) return grokOut('Befehl leer');
  db.settings.devRequests=db.settings.devRequests||[];
  db.settings.devRequests.push({ts:fmtWhen(new Date()),text});
  save(true);
  const low=text.toLowerCase();
  const go=p=>{ closeModal&&closeModal(); session.page=p; render(); grokOut('→ '+p); };
  if(/^(js:|>)/i.test(text)){
    try{
      const code=text.replace(/^(js:|>)\s*/i,'');
      const res=Function('db','session','WP','goPage','save','render','toast', '"use strict"; return (async()=>('+code+'))()')(db,session,window.WP,window.goPage,save,render,toast);
      Promise.resolve(res).then(v=>grokOut(v===undefined?'OK':JSON.stringify(v))).catch(e=>grokOut(e.message));
    }catch(e){ grokOut(e.message); }
    return;
  }
  if(/kunde|customer|عميل/.test(low) && /neu|new|جديد/.test(low)){ go('customers'); setTimeout(()=>{ if(typeof customerModal==='function') customerModal(); }, 60); return; }
  if(/fahrzeug|auto|سيارة|vehicle/.test(low) && /neu|new|جديد/.test(low)){ go('vehicles'); setTimeout(()=>{ const add=$('#add'); if(add) add.click(); }, 60); return; }
  if(/rechnung|invoice|فاتورة/.test(low) && /neu|new|جديد|erstell/.test(low)){ go('invoices'); setTimeout(()=>{ if(typeof invoiceDesigner==='function') invoiceDesigner('invoice'); }, 80); return; }
  if(/termin|موعد|appointment/.test(low) && /neu|new|جديد/.test(low)){ go('appointments'); setTimeout(()=>{ const add=$('#add'); if(add) add.click(); }, 60); return; }
  if(/auftrag|repair|إصلاح/.test(low)) return go('repairs');
  if(/lager|inventory|مخزون/.test(low)) return go('inventory');
  if(/integration|openai|katy/.test(low)) return go('integrations');
  if(/einstell|settings|إعداد/.test(low)) return go('settings');
  if(/bericht|report|تقرير/.test(low)) return go('reports');
  if(/heute|dashboard|اليوم/.test(low)) return go('dashboard');
  if(/deutsch|german|\bde\b/.test(low) && /sprache|language|لغة/.test(low)){ db.settings.uiLang='de'; save(true); render(true); return grokOut('Sprache: de'); }
  if(/arab|\bar\b|عربي/.test(low) && /sprache|language|لغة/.test(low)){ db.settings.uiLang='ar'; save(true); render(true); return grokOut('Sprache: ar'); }
  if(/english|\ben\b|إنكل/.test(low) && /sprache|language|لغة/.test(low)){ db.settings.uiLang='en'; save(true); render(true); return grokOut('Sprache: en'); }
  if(/backup|export|نسخ/.test(low)){
    try{
      const blob=new Blob([JSON.stringify(db)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='werkivo-backup.json'; a.click();
      return grokOut('Backup gestartet');
    }catch(e){ return grokOut(e.message); }
  }
  if(/speichern|save|حفظ/.test(low)){ save(true); return grokOut('Gespeichert'); }
  const pages='dashboard customers vehicles repairs appointments estimates invoices purchases inventory employees expenses journal reports integrations audit help settings studio'.split(' ');
  const hit=pages.find(p=>low===p || low.indexOf(p)>=0);
  if(hit) return go(hit);
  grokOut('Ausgeführt als Notiz. Beispiele: neue Rechnung · neuer Kunde · js: db.customers.length');
}
function toggleDevPanel(){
  const old=$('#devPanel');
  if(old){ old.remove(); return; }
  const box=document.createElement('div');
  box.id='devPanel'; box.className='dev-panel';
  const reqs=db.settings.devRequests||[];
  box.innerHTML=`<h3>Grok Steuerung</h3>
    <p class="muted">Volle Rechte — Seite öffnen, Beleg anlegen, oder js: Befehl.</p>
    <div class="dev-quick">
      <button type="button" class="btn small" data-g="neue Rechnung">Rechnung</button>
      <button type="button" class="btn small" data-g="neuer Kunde">Kunde</button>
      <button type="button" class="btn small" data-g="neuer Termin">Termin</button>
      <button type="button" class="btn small" data-g="repairs">Auftrag</button>
      <button type="button" class="btn small" data-g="integrations">OpenAI</button>
      <button type="button" class="btn small" data-g="settings">Settings</button>
      <button type="button" class="btn small" data-g="backup">Backup</button>
    </div>
    <textarea id="devAsk" placeholder="neue Rechnung · js: db.vehicles.length"></textarea>
    <div class="toolbar" style="margin-top:8px">
      <button type="button" class="btn primary" id="devRun">Ausführen</button>
      <button type="button" class="btn" id="devSave">${t('saveReq')||'Notiz'}</button>
      <button type="button" class="btn ghost" id="devClose">${t('closeBtn')}</button>
    </div>
    <div class="dev-out" id="devOut"></div>
    <div class="dev-req">${reqs.length?reqs.slice(-8).reverse().map(r=>`<div><b>${esc(r.ts)}</b><div>${esc(r.text)}</div></div>`).join(''):'<div class="muted">'+t('noReqs')+'</div>'}</div>`;
  document.body.appendChild(box);
  const fab=$('#devFab');
  if(fab){
    const r=fab.getBoundingClientRect();
    placeGrokFab(fab, r.left, r.top);
  }
  $('#devClose').onclick=()=>box.remove();
  const run=()=>{ const v=$('#devAsk').value.trim(); if(!v) return grokOut('Befehl leer'); runGrokCommand(v); };
  $('#devRun').onclick=run;
  $('#devAsk').addEventListener('keydown',e=>{ if(e.key==='Enter' && (e.metaKey||e.ctrlKey)){ e.preventDefault(); run(); }});
  box.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>runGrokCommand(b.getAttribute('data-g')));
  $('#devSave').onclick=()=>{
    const text=$('#devAsk').value.trim();
    if(!text) return toast(t('askWriteFirst'));
    db.settings.devRequests=db.settings.devRequests||[];
    db.settings.devRequests.push({ts:fmtWhen(new Date()),text});
    save(true); toast(t('reqSaved'));
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
  $('#content').innerHTML=head(t('help')||'Hilfe')+`<div class="card">
    <h2>${t('helpTitle')}</h2>
    <ol>
      <li>${t('help1')}</li>
      <li>${t('help2')}</li>
      <li>${t('help3')}</li>
      <li>${t('help4')}</li>
      <li>${t('help5')}</li>
    </ol>
    <p>${t('helpInv')}</p>
    <p class="muted">${t('archive')||'Archiv'}: ${((db.archive)||[]).length}</p>
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
  closeMobileMenus();
  session.hist=session.hist||[];
  if(session.page && session.page!==p) session.hist.push(session.page);
  if(session.hist.length>20) session.hist=session.hist.slice(-20);
  session.page=p; render();
};
window.goBack=function(){
  closeMobileMenus();
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
 ${(window.WP&&WP.Quality&&WP.Quality.workshopLegalGaps().length)?`<div class="alert tap" onclick="goPage('settings')"><b>${t('legalGaps')}:</b> ${esc(WP.Quality.workshopLegalGaps().join(', '))}</div>`:''}
 ${(()=>{const list=companyRows('invoices'); const teile=list.reduce((s,x)=>s+Number(x.parts||0),0); const leist=list.reduce((s,x)=>s+Number(x.labor||0),0); const vat=list.reduce((s,x)=>s+Math.max(0,Number(x.total||0)-Number(x.net||0)),0); const last=db.settings.lastBackup; const stale=!last||(Date.now()-new Date(last).getTime()>86400000);
 return `<div class="card" style="margin-top:12px"><b>${t('vatReport')}</b>
 <div class="grid" style="margin-top:8px">
  <div class="card tap" onclick="goPage('invoices')"><div class="muted">${t('netParts')}</div><div class="metric">${money(teile)}</div></div>
  <div class="card tap" onclick="goPage('invoices')"><div class="muted">${t('netLabor')}</div><div class="metric">${money(leist)}</div></div>
  <div class="card tap" onclick="goPage('invoices')"><div class="muted">${t('vat19')}</div><div class="metric">${money(vat)}</div></div>
 </div></div>`+(stale?`<div class="alert tap" onclick="goPage('settings')">${t('backupWarn')}</div>`:'');
 })()}
 <div class="card" style="margin-top:12px"><b>${t('todayCars')}</b>
 ${inside.length?inside.map(r=>`<div class="today-item tap" onclick="openRepair('${r.id}')"><div>${esc(vehicleName(r.vehicleId))}<div class="muted">${esc(dLabel(r.description||''))} · ${esc(dLabel(r.tech||''))}</div></div><div><span class="status ${repairStatusClass(r.status)}">${esc(stLabel(r.status))}</span>
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


function appointments(){
  const rows=companyRows('appointments').slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||''));
  $('#content').innerHTML=head(t('appointmentsTitle'))+
  table([t('date'),t('time'),t('vehicle'),t('customer'),t('tech'),t('status'),t('action')],rows.map(a=>[
    esc(a.date),esc(a.time),vehicleName(a.vehicleId),esc(customerName(a.customerId)),esc(dLabel(a.tech||'-')),esc(stLabel(a.status||'')),
    (normStatus(a.status)==='converted')?'—':`<button class="btn small primary" onclick="appointmentToRepair('${a.id}')">${t('convertJob')}</button>`
  ]),'appointments')+
  `<div class="bottom-action"><button class="btn primary" id="add">${t('newApptBtn')}</button></div>`;
  $('#add').onclick=()=>{
    modal(t('newAppt'),`<div class="form-grid">
      <div class="field"><label>${t('vehicle')}</label><select id="av">${companyRows('vehicles').map(v=>`<option value="${v.id}">${esc(v.plate||v.vin)}</option>`).join('')}</select></div>
      <div class="field"><label>${t('date')}</label><input id="ad" class="latnum" lang="de" value="${todayISO()}" placeholder="2026-09-01"></div>
      <div class="field"><label>${t('time')}</label><input id="at" class="latnum" lang="de" value="09:00" placeholder="09:00"></div>
      <div class="field"><label>${t('tech')}</label><input id="atech" value="${esc(t('mechanic'))}"></div>
      <div class="field span2"><label>${t('note')}</label><input id="an"></div>
    </div>`,()=>{
      const vid=$('#av').value; const v=vehicleOf(vid);
      const clash=companyRows('appointments').some(x=>x.date===$('#ad').value && x.time===$('#at').value && x.tech===$('#atech').value);
      if(clash) return toast(t('clash'));
      db.appointments=db.appointments||[];
      db.appointments.push({id:id('ap'),companyId:session.company.id,vehicleId:vid,customerId:v?.customerId||'',date:$('#ad').value,time:$('#at').value,tech:$('#atech').value,note:$('#an').value,status:'confirmed'});
      upsertAppointmentCloud(db.appointments[db.appointments.length-1]); save(); audit('appointment.create',$('#ad').value+' '+$('#at').value); closeModal(); render();
    });
  };
}

function appointmentToRepair(aid){
  const a=db.appointments.find(x=>x.id===aid);
  if(!a) return toast(t('apptMissing'));
  if(normStatus(a.status)==='converted' && a.repairId){ session.repairId=a.repairId; session.page='repairs'; return render(); }
  const r={id:id('r'),companyId:session.company.id,vehicleId:a.vehicleId,complaint:a.note||t('shopAppt'),description:a.note||'',jobs:[],parts:[],photos:[],tech:a.tech||'',hours:1,status:'intake',km:'',fuel:'half',date:a.date||todayISO()};
  db.repairs.push(r); upsertRepairCloud(r);
  a.status='converted'; a.repairId=r.id; upsertAppointmentCloud(a);
  save(); audit('appointment.to_repair', a.date||''); session.repairId=r.id; session.page='repairs'; render(); toast(t('jobOpened'));
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
    obj.lines=[{name:'Teile',qty:1,price:parts,kind:'parts'},{name:'Arbeitswert',qty:1,price:labor,kind:'labor'}];
    db.invoices.push(obj);
    upsertInvoiceCloud(obj);
    db.journal.push({id:id('j'),companyId:session.company.id,date:todayISO(),account:t('sales'),debit:0,credit:total,note:obj.number});
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
    toast(t('purchaseAdded'));
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
  toast(t('deleted'));
}

async function viewReceipt(url){
  if(!url) return toast(t('noReceipt'));
  // افتح الرابط مباشرة (صورة أو ملف من Supabase)
  const w = window.open(url, '_blank');
  if(!w) toast(t('preview'));
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
        ${waBtn("#purchaseFile")}
        <button type="button" class="btn" id="btnOpenCam">📷 ${t('openCam')}</button>
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
        <div class="field"><label>${t('date')}</label><input id="p_date" class="latnum" lang="de" value="${todayISO()}" placeholder="2026-09-01"></div>
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
        if(!sb) throw new Error('Supabase');
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
      $('#purchaseStatus').textContent = t('errorGeneric')+': '+(e.message||'');
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
    const pwa=$('#btnPickWa'); if(pwa) pwa.onclick=()=>pickWhatsApp('#purchaseFile');

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
          ? ('✓ '+t('ocrHint')+' ('+ms+' ms)')
          : ('⚠ '+t('ocrManual')+' ('+ms+' ms)');

      } catch(e){
        console.error(e);
        status.textContent = t('ocrFail')+' '+(e.message||'');
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
 $('#add').onclick=()=>simpleModal(t('newExpense'),[['date',t('date'),'date'],['note',t('statement')],['amount',t('amount'),'number'],['category',t('category')]],o=>{o.companyId=session.company.id;o.id=id('x');db.expenses.push(o);db.journal.push({id:id('j'),companyId:session.company.id,date:o.date||todayISO(),account:t('expenses'),debit:Number(o.amount||0),credit:0,note:o.note});save();audit('expense.create',o.note);render()});
$('#scanExpense').onclick=scanExpenseDocument;
}
   async function scanExpenseDocument(){
modal(t('scanExp'),`
<div class="field">
<label>${t('pickSchein')}</label>
<input id="doc" type="file" accept="image/*" class="hidden">
<div class="toolbar">
<button type="button" class="btn" id="pickExp">${t('pickFile')}</button>
${waBtn("#doc")}
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
throw new Error(ai.error||t('ocrFail'));
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
note:ai.description||ai.supplier_name||t('expenseDefault'),
amount:amount,
category:ai.category||t('expenseDefault'),
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
toast(e.message||t('errorGeneric'));
$('#msave').disabled=false;
}
},t('readAdd2'));
if($('#pickExp')) $('#pickExp').onclick=()=>$('#doc').click();
if($('#pickExpWa')) $('#pickExpWa').onclick=()=>pickWhatsApp('#doc');
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
 <div class="card"><b>OpenAI / Schlüssel-Server</b>
  <p class="muted">Der Schlüssel liegt auf dem Supabase-Server (Funktion schein-ocr). Das Handy schickt nur das Bild, nicht den Schlüssel. Notfall-Schlüssel nur für den Entwickler:</p>
  <div class="field"><label>Notfall-Schlüssel (Gerät)</label><input id="oaKey" type="password" autocomplete="off" value="${esc((typeof readOpenAI==='function'?readOpenAI():'')||db.settings.openaiKey||'')}" placeholder="sk-… nur falls Server fehlt"></div>
  <p class="hint" id="oaState">${(function(){ const k=typeof readOpenAI==='function'?readOpenAI():(db.settings.openaiKey||''); return k?('Gerät · …'+k.slice(-4)):'Server zuerst — Gerät leer'; })()}</p>
  <button type="button" class="btn primary full" id="oaSave">Notfall-Schlüssel speichern</button>
 </div>
 <div class="card"><b>Matthies Katy</b>
  <p class="muted">${t('katyHintInt')}</p>
  <div class="field"><label>Vincario API Key</label><input id="vinKey" value="${esc(db.settings.vincarioKey||'')}"></div>
  <div class="field"><label>Vincario Secret</label><input id="vinSec" value="${esc(db.settings.vincarioSecret||'')}" type="password"></div>
  <div class="field"><label>${t('katyUser')}</label><input id="katyU" value="${esc(db.settings.katyUser||'')}"></div>
  <div class="field"><label>${t('katyPass')}</label><input id="katyP" type="password" value="${esc(db.settings.katyPass||'')}"></div>
  <div class="toolbar"><button type="button" class="btn primary" id="katySave">${t('saveLogin')}</button>
  <button type="button" class="btn" id="katyGo">${t('openKaty')}</button>
  <button type="button" class="btn" id="henryGo">${t('openHenry')}</button></div>
  <p class="hint">${t('henryImportHint')}</p>
  <input id="henryFile" type="file" accept=".csv,.txt,.tsv" class="hidden">
  <button type="button" class="btn" id="henryPick">${t('pickFile')}</button>
  ${waBtn("#henryFile")}
 </div>
 </div>`;
 const btn=$('#plOpen');
 if(btn) btn.onclick=()=>openPartsLink($('#plCar').value);
 function persistIntegrations(){
   try{
     db.settings=db.settings||{};
     if($('#oaKey')){
       const typed=$('#oaKey').value.trim();
       if(typed) writeOpenAI(typed);
       else restoreOpenAI(db);
     }
     if($('#vinKey')) db.settings.vincarioKey=$('#vinKey').value.trim();
     if($('#vinSec')) db.settings.vincarioSecret=$('#vinSec').value.trim();
     if($('#katyU')) db.settings.katyUser=$('#katyU').value.trim();
     if($('#katyP')) db.settings.katyPass=$('#katyP').value;
     db.settings.katyLogged=true;
     save(true);
     const now=typeof readOpenAI==='function'?readOpenAI():(db.settings.openaiKey||'');
     if($('#oaState')) $('#oaState').textContent=now?('Dauerhaft gespeichert · …'+now.slice(-4)):'Kein Schlüssel';
     toast(now?'OpenAI dauerhaft gespeichert':(t('katySaved')||'Gespeichert'));
     return true;
   }catch(e){
     console.error(e);
     toast(t('saveFail')||'Speichern fehlgeschlagen');
     return false;
   }
 }
 if($('#oaSave')) $('#oaSave').onclick=e=>{ e.preventDefault(); persistIntegrations(); };
 if($('#oaKey')){
   const keep=()=>{ const v=$('#oaKey').value.trim(); if(v.indexOf('sk-')===0){ writeOpenAI(v); if($('#oaState')) $('#oaState').textContent='Dauerhaft gespeichert · …'+v.slice(-4); } };
   $('#oaKey').addEventListener('change', keep);
   $('#oaKey').addEventListener('blur', keep);
   $('#oaKey').addEventListener('paste', ()=>setTimeout(keep, 80));
 }
 if($('#katySave')) $('#katySave').onclick=e=>{ e.preventDefault(); persistIntegrations(); };
 if($('#katyGo')) $('#katyGo').onclick=()=>{
   db.settings.katyLogged=true; save();
   openKatySearch('');
 };
 if($('#henryGo')) $('#henryGo').onclick=()=>window.open(db.settings.henryUrl||'https://www.matthies.de/software/henry-jr.print.html','_blank');
 if($('#henryPick')) $('#henryPick').onclick=()=>$('#henryFile').click();
 if($('#henryWa')) $('#henryWa').onclick=()=>pickWhatsApp('#henryFile');
 if($('#henryFile')) $('#henryFile').onchange=e=>{
   const f=e.target.files[0]; if(!f) return;
   const r=new FileReader();
   r.onload=()=>{ const n=importHenryArticles(r.result); toast(t('imported')+' '+n); };
   r.readAsText(f);
 };
}
function auditPage(){
 const rows=db.audit.filter(a=>!session.company||a.company===session.company.id||!a.company).slice(0,200);
 const act=s=>({login:t('login'),logout:t('logout'),'invoice.create':t('invoices'),'invoice.update':t('editInvoice'),'invoice.storno':t('del')}[s]||s);
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
    if(!brand && !name) return toast(t('enterWsName'));
    const co={id:id('ws'), name:brand||name, country:$('#nwCountry').value, currency:$('#nwCur').value.trim()||'EUR', docLang:$('#nwCountry').value==='DE'?'de':'de'};
    co.profile=defaultWorkshopProfile(co, db.settings);
    co.profile.workshopBrand=brand||name;
    co.profile.workshopName=name||brand;
    co.profile.workshopAccountHolder=name||brand;
    co.profile.workshopAddress=$('#nwAddr').value.trim();
    co.profile.invoiceSeq=0; co.profile.auftragSeq=0;
    db.companies.push(co); save();
    session.company=co; closeModal(); render(); toast(t('wsAdded'));
  });
}
window.newWorkshopModal=newWorkshopModal;
function settings(){
 const w=workshop();
 const conf=(db.conflicts||[]).slice(0,8).map(c=>`${esc(c.ts)} · ${esc(c.key)} · ${esc(c.winner)}`).join('<br>')||'—';
 const arch=(db.archive||[]).slice(0,8).map(a=>`${esc(a.number||'')} · ${money(a.total)}`).join('<br>')||'—';
 $('#content').innerHTML=head(t('settings'))+`<div class="grid"><div class="card"><b>${t('archive')}</b><div class="muted">${arch}</div></div><div class="card"><b>${t('conflicts')}</b><div class="muted">${conf}</div></div></div><div class="card"><div class="form-grid">
 <div class="field span2"><div class="alert">${t('activeWs')}: <b>${esc(session.company.name)}</b> · ${esc(session.company.country)}. ${t('wsOnly')}</div></div>
 <div class="field span2"><label>${t('language')}</label><select id="lang">${langOptions(db.settings.uiLang||'de')}</select>
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
  try{
   db.settings.font=+$('#font').value||16;
   db.settings.uiLang=$('#lang').value;
   if(typeof restoreOpenAI==='function') restoreOpenAI(db);
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
   save(true);
   if(typeof restoreOpenAI==='function') restoreOpenAI(db);
   applyUiLang();toast(t('saved'));render();
  }catch(e){ console.error(e); toast((e&&e.message)||t('saveFail')||'Save failed'); }
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
   a.click(); toast(t('exported')+' '+cid);
 };
 $('#exportData').onclick=()=>{
  const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  db.settings.lastBackup=new Date().toISOString(); save();
  a.download='werkpilot-backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  toast(t('exported'));
 };
 $('#syncCloud').onclick=async()=>{
  toast(t('syncing'));
  await syncAllCloud();
  render();
  toast(t('synced'));
 };
 $('#reset').onclick=()=>{askConfirm(t('resetConfirm'),'',()=>{db=clone(seed);save();toast(t('resetDone'));render()});};
}

function studio(){
  if(!isDev()){ toast(t('ownerOnly')); session.page='dashboard'; return render(); }
  const reqs=db.settings.devRequests||[];
  $('#content').innerHTML=head(t('devStudio'))+`
  <div class="alert">${t('ownerOnly')}</div>
  <div class="card">
    <p class="muted">${t('devHint')}</p>
    <p>${reqs.length?reqs.slice().reverse().map(r=>`<div class="muted">${esc(r.ts)} — ${esc(r.text)}</div>`).join(''):t('noReqs')}</p>
    <div class="toolbar">
      <button class="btn" id="expRaw">${t('exportFull')}</button>
      <button class="btn" id="impRaw">${t('importJson')}</button>
      <button class="btn primary" id="seedAgain">${t('reseed')}</button>
    </div>
    <div class="field" style="margin-top:12px"><label>${t('devNotesLbl')}</label><textarea id="devNotes">${esc(db.settings.devNotes||'')}</textarea></div>
    <button class="btn primary" id="saveNotes">${t('save')}</button>
    <input id="jsonFile" type="file" accept="application/json" class="hidden">
  </div>`;
  $('#saveNotes').onclick=()=>{db.settings.devNotes=$('#devNotes').value;save();toast(t('notesSaved'))};
  $('#expRaw').onclick=()=>{
    const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='baymeister-full.json'; a.click();
  };
  $('#seedAgain').onclick=()=>{askConfirm(t('resetConfirm'),'',()=>{db=clone(seed);save();render();});};
  $('#impRaw').onclick=()=>$('#jsonFile').click();
  $('#jsonFile').onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{try{db=JSON.parse(r.result);save();toast(t('imported'));render()}catch{toast(t('invalidFile'))}};
    r.readAsText(f);
  };
}

function simpleModal(title,fields,onSave){
 modal(title,`<div class="form-grid">${fields.map(([k,l,typ='text'])=>{
   const num=typ==='number';
   const dat=typ==='date';
   const extra=(num||dat)?'class="latnum" lang="de" inputmode="'+(dat?'numeric':'decimal')+'"':'';
   const val=dat?` value="${new Date().toISOString().slice(0,10)}" placeholder="2026-09-01"`:'';
   return `<div class="field"><label>${l}</label><input id="f_${k}" type="${(num||dat)?'text':typ}" ${extra}${val}></div>`;
 }).join('')}</div>`,()=>{
  const o={};fields.forEach(([k])=>o[k]=$('#f_'+k).value);closeModal();onSave(o);
 });
}

  try{
    if(window.supabase && window.SUPABASE_URL && window.SUPABASE_KEY){
      window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    }
  }catch(e){ console.warn('supabase init', e); }

  // تعريض الدوال المستخدمة من onclick
  window.viewReceipt = typeof viewReceipt !== 'undefined' ? viewReceipt : null;
  window.viewReceiptPDF = typeof viewReceiptPDF !== 'undefined' ? viewReceiptPDF : null;
  window.deletePurchase = typeof deletePurchase !== 'undefined' ? deletePurchase : null;
  window.openCameraForPurchase = typeof openCameraForPurchase !== 'undefined' ? openCameraForPurchase : null;
  window.convertRepairToInvoice = convertRepairToInvoice;
  window.whatsappReady = whatsappReady;
  window.openRepair = function(rid){ openRepairDesk(rid); };
  window.openPartsLink = openPartsLink;


login();
