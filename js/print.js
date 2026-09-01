/* Print / PDF / share */
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
  const now = new Date().toLocaleString(typeof uiLocale==='function'?uiLocale():'de-DE',{numberingSystem:'latn'});
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
  const ui=db.settings.uiLang||'de';
  const dl=docLang(); const ddr=(type==="invoices"&&dl==="de")?"ltr":((window.WP_RTL||[]).includes(ui)?"rtl":"ltr");
  return `<!doctype html><html lang="${type==="invoices"?dl:ui}" dir="${ddr}"><head><meta charset="utf-8"><title>TST</title>
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
  try{ await WP.loadPdf(); }catch(e){ return toast(t('pdfFailLib')); }
  if(!window.html2canvas || !window.jspdf) return toast(t('pdfNotLoaded'));
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
    toast(t('saved'));
  }catch(e){
    console.error(e);
    toast(t('pdfFail'));
  }
  host.remove();
}
window.exportInvoicePDF=exportInvoicePDF;

function exportEmail(type, id){
  const subject = encodeURIComponent('Werkivo - ' + (type || t('reportWord')));
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

