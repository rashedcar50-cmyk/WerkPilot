/* Invoice HTML layout */
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
function payCode(v){
  const s=String(v||'').toLowerCase();
  const eq=k=>{ try{ return s===String(t(k)||'').toLowerCase(); }catch(e){ return false; } };
  if(eq('payCash') || /cash|bar|نقد|kartein/.test(s)) return 'cash';
  if(eq('payCard') || /card|karte|بطاقة|ec-?karte/.test(s)) return 'card';
  if(eq('payBank') || /bank|überweis|uberweis|تحويل|iban/.test(s)) return 'bank';
  return 'open';
}
window.payCode=payCode;
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

