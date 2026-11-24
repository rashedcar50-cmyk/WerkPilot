/* Invoice designer + preview */
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
  if(inv) return {sku:inv.sku||sku,name:inv.name,qty:1,price:Number(inv.sell||inv.buy||0),source:'stock'};
  const cache=(db.katyCache||[]).find(x=>String(x.sku||'').toUpperCase()===up);
  if(cache) return {sku:cache.sku,name:cache.name,qty:1,price:Number(cache.price||0),source:'Katy'};
  const fromInv=(db.invoices||[]).flatMap(i=>i.lines||[]).find(l=>String(l.sku||'').toUpperCase()===up);
  if(fromInv) return {sku:fromInv.sku,name:fromInv.name,qty:1,price:Number(fromInv.price||0),source:'invoice'};
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
// Web search for a part number: the workshop chooses the site -- built-in
// general ones plus its own list (db.settings.searchSites, {q} = search term).
const WP_SEARCH_SITES=[
  {name:'Teiltool',url:'https://kfcjjs-ri.myshopify.com/search?q={q}'}
];
function searchSites(){
  const own=(db.settings.searchSites||[]).filter(x=>x&&x.name&&/^https:\/\//i.test(x.url||''));
  return WP_SEARCH_SITES.concat(own.map(x=>({name:x.name,url:x.url,own:true})));
}
function searchSiteUrl(site,q){
  const enc=encodeURIComponent(String(q||'').trim());
  if(site.url.includes('{q}')) return site.url.replace('{q}',enc);
  return enc ? site.url+(site.url.includes('?')?'&':'?')+'q='+enc : site.url;
}
function addSearchSite(name,url){
  name=String(name||'').trim(); url=String(url||'').trim();
  if(url && !/^[a-z]+:\/\//i.test(url)) url='https://'+url;
  if(!name || !/^https:\/\/[^\s]+\.[^\s]+/i.test(url)) return false;
  db.settings.searchSites=(db.settings.searchSites||[]).filter(x=>x.name!==name).concat([{name,url}]);
  save(); return true;
}
function removeSearchSite(name){ db.settings.searchSites=(db.settings.searchSites||[]).filter(x=>x.name!==name); save(); }
function renderWebSearch(q){
  const box=$('#webSearch'); if(!box) return;
  if(q!==undefined && $('#wsQ')) $('#wsQ').value=q;
  const list=$('#wsSites'); if(!list) return;
  list.innerHTML=searchSites().map((x,i)=>`<span class="ws-site"><button type="button" class="btn small" data-ws="${i}">${esc(x.name)}</button>${x.own?`<button type="button" class="ws-x" data-wsx="${esc(x.name)}" title="${t('del')}">×</button>`:''}</span>`).join('');
  list.querySelectorAll('[data-ws]').forEach(b=>b.onclick=()=>{
    const site=searchSites()[Number(b.dataset.ws)]; if(!site) return;
    window.open(searchSiteUrl(site,$('#wsQ').value),'_blank','noopener');
  });
  list.querySelectorAll('[data-wsx]').forEach(b=>b.onclick=()=>{ removeSearchSite(b.dataset.wsx); renderWebSearch(); });
}
function openWebSearch(q){
  const box=$('#webSearch'); if(!box) return openKatySearch(q);
  box.hidden=false; renderWebSearch(q||''); const i=$('#wsQ'); if(i){ i.focus(); i.select&&i.select(); }
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
function refreshInvoiceVat(){
  // Per row (also rows still without a name, which collectInvoiceRows skips).
  document.querySelectorAll('#invRows tr').forEach(tr=>{
    const b=tr.querySelector('.c-vat'); if(!b) return;
    const sum=latNum(tr.querySelector('.c-qty')?.value||0)*latNum(tr.querySelector('.c-price')?.value||0);
    const rate=latNum(tr.querySelector('.c-tax')?.value||19);
    b.textContent=(Math.round(sum*rate)/100).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
    b.title=t('taxPct')+': '+String(rate).replace('.',',');
    b.dataset.rate=String(rate).replace('.',',')+' %';
  });
}
function refreshInvoiceSums(){
  refreshInvoiceVat();
  const lines=collectInvoiceRows();
  lines.forEach((l,i)=>{
    const tr=document.querySelectorAll('#invRows tr')[i];
    if(tr && tr.querySelector('.c-sum')) tr.querySelector('.c-sum').textContent=(l.qty*l.price).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
  });
  const disc=latNum($('#fd')?.value||0);
  // Correctness fix (audit 2026-11-08): this running total, shown while
  // still editing, used a flat header tax rate -- now it matches the exact
  // per-line-tax computation the save and print paths use, via
  // computeInvoiceTotals (js/invoice-print.js), so the number on screen
  // never disagrees with what gets saved or printed for mixed-rate lines.
  const totals=computeInvoiceTotals(lines, disc);
  const net=totals.net, gross=totals.total;
  const fmt=n=>(Number(n)||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
  if($('#hySub')) $('#hySub').textContent=fmt(totals.teile+totals.leist);
  if($('#henryEK')) $('#henryEK').textContent=fmt(net);
  if($('#hyVat')) $('#hyVat').textContent=fmt(totals.vat);
  if($('#hyVatLbl')){ const rates=[...new Set(lines.map(l=>Number(l.tax)))]; $('#hyVatLbl').textContent=t('tax')+(rates.length===1?' '+String(rates[0]).replace('.',',')+' %':''); }
  if($('#hyCount')) $('#hyCount').textContent=lines.length;
  if($('#henryGross')) $('#henryGross').textContent=fmt(gross);
}
// Typed text in the invoice editor is upper-cased automatically (ß stays).
// A part number keeps its original spelling when it was pasted or when a
// known article (stock, catalog cache, earlier invoices) is spelled with
// lower-case letters -- some manufacturers' numbers are case-sensitive.
function invUpper(v){ return String(v||'').replace(/[^ß]+/g,m=>m.toUpperCase()); }
function invOriginalSku(v){
  const hit=typeof lookupKatyArticle==='function'?lookupKatyArticle(v):null;
  const o=hit&&String(hit.sku||'');
  return (o && o.toUpperCase()===String(v||'').trim().toUpperCase() && o!==o.toUpperCase()) ? o : '';
}
// + / − next to a quantity: one step up or down, never to zero or below.
function stepQty(v,dir){
  const n=Number(v)||0, nv=Math.round((n+dir)*100)/100;
  return nv>0?nv:n;
}
function wireInvoiceUppercase(desk){
  if(!desk||desk.dataset.upper) return; desk.dataset.upper='1';
  desk.addEventListener('click',e=>{
    const b=e.target.closest&&e.target.closest('.q-btn'); if(!b) return;
    const inp=b.parentNode.querySelector('input'); if(!inp) return;
    const nv=stepQty(latNum(inp.value||0),Number(b.dataset.q));
    inp.value=inp.id==='katyQty'?nv.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}):String(nv);
    refreshInvoiceSums();
  });
  const isText=el=>el&&el.matches&&el.matches('.c-name,.c-sku,#katySku,#qName');
  const isSku=el=>el.matches('.c-sku,#katySku');
  desk.addEventListener('input',e=>{
    const el=e.target; if(!isText(el)||e.isComposing) return;
    if(isSku(el)){
      if(!el.value) delete el.dataset.keepCase;
      if(e.inputType==='insertFromPaste'||e.inputType==='insertFromDrop') el.dataset.keepCase='1';
      if(el.dataset.keepCase) return;
    }
    const up=invUpper(el.value); if(up===el.value) return;
    const a=el.selectionStart,b=el.selectionEnd; el.value=up;
    try{ el.setSelectionRange(a,b); }catch(_){}
  });
  desk.addEventListener('focusout',e=>{
    const el=e.target; if(!isText(el)||!isSku(el)) return;
    const o=invOriginalSku(el.value); if(o && o!==el.value) el.value=o;
  });
}
function addInvoiceRow(data){
  const d=Object.assign({sku:'',name:'',qty:1,price:0,tax:19,kind:'parts'},data||{});
  const tb=$('#invRows'); if(!tb) return;
  const tr=document.createElement('tr');
  tr.innerHTML=`<td class="c-pos"></td>
    <td class="k"><select class="c-kind"><option value="parts" ${d.kind!=='labor'?'selected':''}>${t('kindParts')}</option><option value="labor" ${d.kind==='labor'?'selected':''}>${t('kindLabor')}</option></select></td>
    <td class="s"><input class="c-sku" dir="ltr" value="${esc(d.sku)}" placeholder="${t('sku')}"></td>
    <td class="d"><textarea class="c-name" rows="1" placeholder="${t('desc')}">${esc(d.name)}</textarea></td>
    <td class="n" data-l="${t('colQty')}"><div class="qty-step"><button type="button" class="q-btn" data-q="-1" tabindex="-1" aria-label="−">−</button><input class="c-qty latnum" inputmode="decimal" lang="de" value="${Number(d.qty)}"><button type="button" class="q-btn" data-q="1" tabindex="-1" aria-label="+">+</button></div></td>
    <td class="n" data-l="${t('unitNet')}"><input class="c-price latnum" inputmode="decimal" lang="de" value="${Number(d.price)}"></td>
    <td class="c-sum n" data-l="${t('sumNet')}">${(Number(d.qty||0)*Number(d.price||0)).toLocaleString('de-DE',{minimumFractionDigits:2})}</td>
    <td class="n c-vatcell" data-l="${t('colVat')}"><button type="button" class="c-vat" title="${t('taxPct')}"></button><input class="c-tax latnum" inputmode="decimal" lang="de" value="${Number(d.tax||19)}" hidden></td>
    <td class="x"><button type="button" class="c-del" title="${t('del')}" aria-label="${t('del')}">×</button></td>`;
  tb.appendChild(tr);
  tr.querySelector('.c-del').onclick=()=>{tr.remove(); numberInvoiceRows(); refreshInvoiceSums();};
  tr.querySelectorAll('input,textarea,select').forEach(inp=>inp.addEventListener('input',refreshInvoiceSums));
  // The description wraps and grows with its text instead of being cut off.
  const nameEl=tr.querySelector('.c-name');
  const grow=()=>{ nameEl.style.height='auto'; nameEl.style.height=Math.max(32,nameEl.scrollHeight+2)+'px'; };
  nameEl.addEventListener('input',grow); nameEl.addEventListener('focus',grow); setTimeout(grow,0); setTimeout(grow,250);
  if(window.ResizeObserver){ let w=0; new ResizeObserver(()=>{ if(nameEl.clientWidth!==w){ w=nameEl.clientWidth; grow(); } }).observe(nameEl); }
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(grow).catch(()=>{});
  // The VAT column shows the line's VAT amount; a click on it opens the
  // rate (%) for this line, leaving the field shows the amount again.
  const vatBtn=tr.querySelector('.c-vat'), taxEl=tr.querySelector('.c-tax');
  vatBtn.onclick=()=>{ vatBtn.hidden=true; taxEl.hidden=false; taxEl.focus(); taxEl.select&&taxEl.select(); };
  taxEl.addEventListener('blur',()=>{ taxEl.hidden=true; vatBtn.hidden=false; refreshInvoiceSums(); });
  const order=['.c-sku','.c-name','.c-qty','.c-price'];
  tr.querySelectorAll('input,textarea').forEach(inp=>{
    inp.addEventListener('keydown',e=>{
      if(e.key!=='Enter') return;
      e.preventDefault();
      if(inp===taxEl){ taxEl.blur(); return; }
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
  refreshInvoiceVat();
}
function numberInvoiceRows(){
  [...document.querySelectorAll('#invRows tr')].forEach((tr,i)=>{
    const p=tr.querySelector('.c-pos'); if(p) p.textContent=i+1;
  });
}
function invoiceDesigner(kind='invoice', customerId='', existing=null, vehicleId='', template=null){
  const title = existing ? (t('editInvoice')+' '+(existing.number||'')) : (kind==='bar' ? t('cashSale') : t('createInv'));
  const rate=workshop().hourlyRate||db.settings.hourlyRate||100;
  if(existing){ customerId=customerId||existing.customerId||''; vehicleId=vehicleId||existing.vehicleId||''; }
  modal(title, `<div class="hy-desk">
    <div class="hy-bar">
      <label class="hy-f hy-f-w"><span>${t('customer')}</span><select id="fcust"><option value="walkin" ${!customerId?'selected':''}>${t('walkIn')||t('cashSale')}</option>${companyRows('customers').map(c=>`<option value="${c.id}" ${c.id===customerId?'selected':''}>${esc(c.kdNr||'')} · ${esc(c.companyName||c.name)}</option>`).join('')}</select></label>
      <label class="hy-f hy-f-w"><span>${t('vehicle')}</span><select id="fv"><option value="">${t('noVehicle')}</option>${companyRows('vehicles').filter(v=>!customerId||v.customerId===customerId|| (existing&&v.id===existing.vehicleId)||v.id===vehicleId).map(v=>`<option value="${v.id}" ${(existing&&v.id===existing.vehicleId)||v.id===vehicleId?'selected':''}>${esc(v.plate||v.vin)} · ${esc(v.make)} ${esc(v.model)}</option>`).join('')}</select></label>
      <div class="hy-f"><span>${t('invDate')}</span><output>${new Date().toLocaleDateString('de-DE')}</output></div>
      ${existing?'':`<label class="hy-f"><span>${t('serviceDate')}</span><input id="fsd" type="date" value="${esc(String((template&&template.serviceDate)||todayISO()).slice(0,10))}"></label>`}
      <label class="hy-f"><span>${t('payMethod')}</span><select id="pay">${[['open',t('payOpen')],['cash',t('payCash')],['card',t('payCard')],['bank',t('payBank')]].map(([v,p])=>`<option value="${v}" ${((existing&&existing.payment)|| (kind==='bar'?'cash':'open'))===v?'selected':''}>${p}</option>`).join('')}</select></label>
      <div class="hy-scan">
        <button type="button" class="btn small" id="scanInvCam" title="${t('openCam')}">📷 ${t('openCam')}</button>
        ${waBtn("#scanInvFile","small")}
        <input id="scanInvFile" type="file" accept="image/*" class="hidden">
      </div>
    </div>
    <div class="hy-split">
      <div class="hy-main">
        <div class="table-wrap">
          <table class="inv-edit henry-pos">
            <colgroup><col class="w-pos"><col class="w-kind"><col class="w-sku"><col><col class="w-qty"><col class="w-price"><col class="w-sum"><col class="w-tax"><col class="w-del"></colgroup>
            <thead><tr><th>${t('colPos')}</th><th>${t('colArt')}</th><th>${t('sku')}</th><th>${t('desc')}</th><th class="n">${t('colQty')}</th><th class="n">${t('unitNet')}</th><th class="n">${t('sumNet')}</th><th class="n">${t('colVat')}</th><th></th></tr></thead>
            <tbody id="invRows"></tbody>
          </table>
        </div>
        <div class="hy-cap">${t('quickEntry')}</div>
        <div class="hy-entry">
          <select id="qArt"><option value="parts">${t('kindParts')}</option><option value="labor">${t('kindLabor')}</option></select>
          <div class="qty-step"><button type="button" class="q-btn" data-q="-1" tabindex="-1" aria-label="−">−</button><input id="katyQty" class="latnum" inputmode="decimal" lang="de" value="1,00"><button type="button" class="q-btn" data-q="1" tabindex="-1" aria-label="+">+</button></div>
          <input id="katySku" dir="ltr" placeholder="${t('orderNo')}">
          <input id="qName" placeholder="${t('desc')}">
          <button type="button" class="btn primary" id="katyFetch">${t('apply')}</button>
        </div>
        <div id="katyHint" class="hint">${t('henryHint')}</div>
        <div id="scanInvHint" class="hint"></div>
        <div class="hy-tools">
          <button type="button" class="btn small" id="addRow">+ ${t('kindParts')}</button>
          <button type="button" class="btn small" id="addLabor">+ ${t('kindLabor')}</button>
          <button type="button" class="btn small" id="katyOpen">🔎 ${t('webSearch')}</button>
          <button type="button" class="btn small" id="teiltoolOpen">🛒 Teiltool</button>
        </div>
        <div id="webSearch" class="hy-web" hidden>
          <div class="hy-cap">${t('webSearch')}</div>
          <input id="wsQ" dir="ltr" placeholder="${t('orderNo')}">
          <div id="wsSites" class="ws-sites"></div>
          <details><summary>${t('wsAdd')}</summary>
            <div class="ws-add"><input id="wsName" placeholder="${t('wsName')}"><input id="wsUrl" dir="ltr" placeholder="https://…/suche?q={q}"><button type="button" class="btn small" id="wsSave">${t('save')}</button></div>
            <div class="hint">${t('wsHint')}</div>
          </details>
        </div>
        <textarea id="katyPaste" rows="2" placeholder="${t('pasteHint')}"></textarea>
        <button type="button" class="btn small" id="katyPasteBtn">${t('paste')}</button>
      </div>
      <aside class="hy-side">
        <div class="hy-cap">${t('sumTitle')} · <span id="hyCount">0</span> ${t('positions')}</div>
        <div class="hy-tot"><span>${t('sumItems')}</span><b id="hySub">0,00</b></div>
        <label class="hy-tot hy-in"><span>${t('discount')}</span><input id="fd" class="latnum" inputmode="decimal" lang="de" value="${existing?Number(existing.discount||0):0}"></label>
        <div class="hy-tot"><span>${t('netTotal')}</span><b id="henryEK">0,00</b></div>
        <div class="hy-tot"><span id="hyVatLbl">${t('tax')}</span><b id="hyVat">0,00</b></div>
        <div class="hy-tot hy-gross"><span>${t('total')}</span><b><span id="henryGross">0,00</span> €</b></div>
        <label class="hy-tot hy-in hy-def"><span>${t('taxDefault')}</span><input id="ft" class="latnum" inputmode="decimal" lang="de" value="${existing?Number(existing.tax):19}"></label>
      </aside>
    </div>
  </div>`,()=>{
    // An issued invoice is never overwritten -- see js/invoice-lifecycle.js.
    if(existing && window.WP && WP.InvoiceLifecycle && WP.InvoiceLifecycle.isIssued(existing)) return toast(t('invLocked'));
    const lines=collectInvoiceRows();
    if(window.WP&&WP.Quality) WP.Quality.legalToast();
    if(!lines.length) return toast(t('needLine'));
    if(lines.some(l=>!l.name)) return toast(t('needDesc'));
    if(lines.some(l=>!(Number(l.qty)>0))) return toast(t('needQtyPrice'));
    let custId=$('#fcust')?.value||'';
    if(custId==='walkin') custId='';
    const veh=vehicleOf($('#fv')&&$('#fv').value)||{};
    const discount=latNum($('#fd')?.value), tax=latNum($('#ft')?.value)||19;
    // Correctness fix (audit 2026-11-08): computeInvoiceTotals (js/invoice-print.js)
    // derives net/total per line's own tax rate, exactly like the print/preview
    // path -- so a mixed-rate invoice books the same total here that it prints.
    const totals=computeInvoiceTotals(lines, discount);
    const parts=totals.teile, labor=totals.leist, net=totals.net, total=totals.total;
    const custIdFinal=custId||veh.customerId||'';
    const obj={id:existing?existing.id:id('i'),cloudId:existing&&existing.cloudId,companyId:session.company.id,vehicleId:$('#fv').value,km:veh.km||existing&&existing.km||'',customerId:custIdFinal,parts,labor,discount,tax,net,total,date:existing?existing.date:new Date().toISOString(),
      type:kind==='bar'?'Barverkauf':'Rechnung', payment:payCode($('#pay')&&$('#pay').value), paid:['cash','card'].includes(payCode($('#pay')&&$('#pay').value)),
      number:existing?existing.number:'', lines, repairId:existing?existing.repairId:(template&&template.repairId)||undefined, auftrag:existing?existing.auftrag:(template&&template.auftrag)||undefined, updatedAt:new Date().toISOString()};
    if(!existing){ const sd=$('#fsd')&&$('#fsd').value; if(sd) obj.serviceDate=sd; if(template&&template.km) obj.km=template.km; }
    const issue=()=>{
      lines.forEach(rememberKatyArticle);
      // Customer numbers are assigned only when an invoice is actually saved
      // for that customer -- never as a side effect of preview (see
      // js/invoice-print.js's ensureKd/assignKdNr).
      if(custIdFinal) assignKdNr(custIdFinal);
      if(existing){
        const i=db.invoices.findIndex(x=>x.id===existing.id);
        if(i>=0) db.invoices[i]=obj; else db.invoices.push(obj);
        upsertInvoiceCloud(obj); audit('invoice.update',obj.number);
      } else {
        obj.number=nextInvoiceNumber();
        if(typeof freezeInvoiceParties==='function') freezeInvoiceParties(obj);
        db.invoices.push(obj); upsertInvoiceCloud(obj);
        db.journal.push({id:id('j'),companyId:session.company.id,date:todayISO(),account:t('sales'),debit:0,credit:total,note:obj.number});
        audit('invoice.create',obj.number);
      }
      // Issued from a repair order: link it and book the parts out of stock
      // (once -- consumePartsFromRepair skips parts already booked).
      if(!existing && obj.repairId){ const rr=db.repairs.find(x=>x.id===obj.repairId); if(rr){ rr.invoiceId=obj.id; delete rr.noInvoiceReason; try{ consumePartsFromRepair(rr); }catch(e){} } }
      archiveBeleg(obj);
      save(); closeModal(); render();
      setTimeout(()=>previewInvoice(obj.id), 200);
    };
    if(existing) return issue();
    // Nothing gets a number before this confirmation: an issued invoice can
    // no longer be changed, only cancelled.
    const cName=(()=>{ const c=db.customers.find(x=>x.id===custIdFinal); return c?(c.companyName||c.name||''):(t('walkIn')||''); })();
    askConfirm(t('reviewIssue'),
      [cName, t('serviceDate')+': '+(obj.serviceDate?deDate(obj.serviceDate):'-'), 'Netto: '+money(net), 'MwSt.: '+money(total-net), t('total')+': '+money(total), '', t('issueHint')].filter((x,i)=>x||i===5).join('\n'),
      issue);
  }, existing?t('saveEdit'):t('reviewIssue'));
  if(existing && existing.lines && existing.lines.length){
    existing.lines.forEach(l=>addInvoiceRow(l));
  } else if(!existing && template && template.lines && template.lines.length){
    // New invoice pre-filled from a cancelled one ("cancel and create new").
    template.lines.forEach(l=>addInvoiceRow(Object.assign({}, l)));
    if($('#fd')) $('#fd').value=String(Number(template.discount||0)).replace('.',',');
    if($('#ft') && template.tax) $('#ft').value=String(Number(template.tax)).replace('.',',');
    if(typeof refreshInvoiceSums==='function') refreshInvoiceSums();
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
  if($('#scanInvCam')) $('#scanInvCam').onclick=()=>openCamera('#scanInvFile');
  if($('#scanInvWa')) $('#scanInvWa').onclick=()=>pickWhatsApp('#scanInvFile');
  if($('#scanInvFile')) $('#scanInvFile').onchange=async function(){
    const f=this.files&&this.files[0]; if(!f) return;
    const hint=$('#scanInvHint'); if(hint) hint.textContent=t('readingSchein');
    try{
      const {c,v,cancelled}=await scheinFileToCustomerVehicle(f);
      if(cancelled){ if(hint) hint.textContent=t('scanAborted')||''; this.value=''; return; }
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
      const tax=+$('#ft').value||19;
      const plain=()=>{
        addInvoiceRow({sku,name:typed||sku,qty,price:0,tax,kind});
        if($('#katyHint')) $('#katyHint').textContent=sku?t('notFoundLocal'):'Position übernommen';
        if(sku) openWebSearch(sku);
        refreshInvoiceSums();
      };
      // Unknown here: ask the Teiltool shop for its title and selling price.
      if(sku && kind!=='labor' && window.WP && WP.Teiltool){
        $('#katyHint').textContent='Teiltool …';
        WP.Teiltool.article(sku,tax).then(a=>{
          if(!document.querySelector('#invRows')) return;
          if(!a) return plain();
          addInvoiceRow({sku:a.sku,name:typed||a.name,qty,price:a.price,tax,kind});
          if($('#katyHint')) $('#katyHint').textContent='Teiltool — '+a.name;
          refreshInvoiceSums();
        }).catch(plain);
      } else plain();
    }
    $('#katySku').value=''; if($('#qName')) $('#qName').value=''; $('#katySku').focus();
  };
  if($('#katyFetch')) $('#katyFetch').onclick=doFetch;
  wireInvoiceUppercase(document.querySelector('.hy-desk'));
  ['katySku','katyQty','qName'].forEach(id=>{
    const el=$('#'+id); if(el) el.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); doFetch(); }});
  });
  if($('#katyOpen')) $('#katyOpen').onclick=()=>{
    const box=$('#webSearch');
    if(box && !box.hidden) { box.hidden=true; return; }
    const cur=document.activeElement&&document.activeElement.classList&&document.activeElement.classList.contains('c-sku')?document.activeElement.value:'';
    openWebSearch(($('#katySku').value||cur||'').trim());
  };
  if($('#wsSave')) $('#wsSave').onclick=()=>{
    if(!addSearchSite($('#wsName').value,$('#wsUrl').value)) return toast(t('wsBad'));
    $('#wsName').value=''; $('#wsUrl').value=''; renderWebSearch();
  };
  if($('#wsQ')) $('#wsQ').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); const b=document.querySelector('#wsSites [data-ws]'); if(b) b.click(); }});
  if($('#teiltoolOpen')) $('#teiltoolOpen').onclick=()=>openTeiltool($('#fv')?$('#fv').value:'');
  if($('#katyPasteBtn')) $('#katyPasteBtn').onclick=()=>{
    const raw=$('#katyPaste').value||'';
    const rows=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(!rows.length) return toast(t('needLine'));
    let n=0;
    rows.forEach(line=>{
      const parsed=parseInvoiceLine(line.replace(/\t/g,'|').replace(/\s{2,}/g,'|'));
      if(!parsed.name && !parsed.sku) return;
      addInvoiceRow({sku:parsed.sku,name:parsed.name,qty:parsed.qty||1,price:parsed.price||0,tax:+$('#ft').value||19,kind:'parts'});
      rememberKatyArticle(parsed);
      n++;
    });
    $('#katyPaste').value='';
    toast(t('addedFrom')+' '+n);
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
