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
      <select id="pay">${[['open',t('payOpen')],['cash',t('payCash')],['card',t('payCard')],['bank',t('payBank')]].map(([v,p])=>`<option value="${v}" ${((existing&&existing.payment)|| (kind==='bar'?'cash':'open'))===v?'selected':''}>${p}</option>`).join('')}</select>
      <select id="fv"><option value="">${t('noVehicle')}</option>${companyRows('vehicles').filter(v=>!customerId||v.customerId===customerId|| (existing&&v.id===existing.vehicleId)||v.id===vehicleId).map(v=>`<option value="${v.id}" ${(existing&&v.id===existing.vehicleId)||v.id===vehicleId?'selected':''}>${esc(v.plate||v.vin)} · ${esc(v.make)} ${esc(v.model)}</option>`).join('')}</select>
      <select id="fcust"><option value="walkin" ${!customerId?'selected':''}>${t('walkIn')||t('cashSale')}</option>${companyRows('customers').map(c=>`<option value="${c.id}" ${c.id===customerId?'selected':''}>${esc(c.kdNr||'')} · ${esc(c.companyName||c.name)}</option>`).join('')}</select>
      <button type="button" class="btn ok small" id="scanInvCam" title="${t('openCam')}">📷 ${t('openCam')}</button>
      ${waBtn("#scanInvFile","small")}
      <input id="scanInvFile" type="file" accept="image/*" class="hidden">
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
    if(window.WP&&WP.Quality) WP.Quality.legalToast();
    if(!lines.length) return toast(t('needLine'));
    if(lines.some(l=>!l.name)) return toast(t('needDesc'));
    if(lines.some(l=>!(Number(l.qty)>0))) return toast(t('needQtyPrice'));
    let custId=$('#fcust')?.value||'';
    if(custId==='walkin') custId='';
    const veh=vehicleOf($('#fv')&&$('#fv').value)||{};
    let parts=lines.filter(x=>!isLaborLine(x)).reduce((s,x)=>s+x.qty*x.price,0);
    let labor=lines.filter(isLaborLine).reduce((s,x)=>s+x.qty*x.price,0);
    const discount=latNum($('#fd')?.value), tax=latNum($('#ft')?.value)||19;
    let net=Math.max(0,parts+labor-discount), total=net*(1+tax/100);
    parts=Math.round(parts*100)/100; labor=Math.round(labor*100)/100; net=Math.round(net*100)/100; total=Math.round(total*100)/100;
    const obj={id:existing?existing.id:id('i'),companyId:session.company.id,vehicleId:$('#fv').value,km:veh.km||existing&&existing.km||'',customerId:custId||veh.customerId||'',parts,labor,discount,tax,net,total,date:existing?existing.date:new Date().toISOString(),
      type:kind==='bar'?'Barverkauf':'Rechnung', payment:payCode($('#pay')&&$('#pay').value), paid:['cash','card'].includes(payCode($('#pay')&&$('#pay').value)),
      number:existing?existing.number:nextInvoiceNumber(), lines, repairId:existing&&existing.repairId, auftrag:existing&&existing.auftrag, updatedAt:new Date().toISOString()};
    lines.forEach(rememberKatyArticle);
    if(existing){
      const i=db.invoices.findIndex(x=>x.id===existing.id);
      if(i>=0) db.invoices[i]=obj; else db.invoices.push(obj);
      upsertInvoiceCloud(obj); audit('invoice.update',obj.number);
    } else {
      db.invoices.push(obj); upsertInvoiceCloud(obj);
      db.journal.push({id:id('j'),companyId:session.company.id,date:todayISO(),account:t('sales'),debit:0,credit:total,note:obj.number});
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
  if($('#scanInvCam')) $('#scanInvCam').onclick=()=>openCamera('#scanInvFile');
  if($('#scanInvWa')) $('#scanInvWa').onclick=()=>pickWhatsApp('#scanInvFile');
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
