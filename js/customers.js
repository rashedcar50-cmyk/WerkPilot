/* Customers + vehicles + Schein bind */
function customers(){
 const rows=companyRows('customers');
 $('#content').innerHTML=head(t('customers'),canEdit()?`<button class="btn ok" id="scanCust">📷 ${t('scanSchein')}</button><button class="btn primary" id="add">${t('newCustomer')}</button>`:'')+
 listShareBar('customers')+
 table([t('name'),t('phone'),t('taxId'),t('address'),t('cars'),t('action')],rows.map(c=>[
  esc(c.companyName? (c.companyName+' · '+(c.contact||c.name||'')) : (c.name||'-')),
  esc(c.phone||'-'),esc(c.taxId||c.ustId||'-'),esc(c.address||'-'),
  db.vehicles.filter(v=>v.customerId===c.id).length,
  canEdit()?`<button class="btn small" onclick="editCustomer('${c.id}')">${t('edit')}</button>
  <button class="btn small primary" onclick="invoiceForCustomer('${c.id}')">${t('newInvoice')}</button>
  <button class="btn small" onclick="invoicesForCustomer('${c.id}')">${t('invoicesOf')}</button>`:'—'
 ]), 'customers');
 if(canEdit() && $('#add')) $('#add').onclick=()=>customerModal();
 if(canEdit() && $('#scanCust')) $('#scanCust').onclick=()=>customerModal();
}
function applyScheinToCustomerForm(ai){
  if(window.WP && WP.Scan && WP.Scan.apply) return WP.Scan.apply(ai);
}
function afterCustomerVehicle(c,v){
  if(!v){ render(); return; }
  modal(t('nextForCar'),`<div class="okbox">${esc(c.name||c.companyName||'')} · ${esc(v.plate||v.vin||'')}</div>
    <div class="toolbar" style="flex-direction:column;margin-top:12px">
      <button type="button" class="btn primary full" id="goAppt">${t('newAppt')}</button>
      <button type="button" class="btn primary full" id="goInv">${t('newInvoice')}</button>
      <button type="button" class="btn full" id="goEst">${t('createQuote')}</button>
    </div>`,()=>render(), t('closeBtn'));
  if($('#goAppt')) $('#goAppt').onclick=()=>{ closeModal(); session.page='appointments'; render(); setTimeout(()=>{
    const add=$('#add'); if(add) add.click();
    setTimeout(()=>{ const sel=$('#av'); if(sel && v.id) sel.value=v.id; }, 80);
  }, 40); };
  if($('#goInv')) $('#goInv').onclick=()=>{ closeModal(); session.page='invoices'; invoiceDesigner('invoice', c.id, null, v.id); };
  if($('#goEst')) $('#goEst').onclick=()=>{ closeModal(); session.page='estimates'; financeModal('estimate', v.id, c.id); };
}
function customerModal(existing){
 const c0=existing||{};
 modal(existing?t('editCustomer'):t('newCustomer'),`<div class="form-grid">
 ${existing?'':`<div class="field span2"><label>${t('scanSchein')}</label>
  <input id="doc" type="file" accept="image/*" class="hidden">
  <div class="toolbar">
    <button type="button" class="btn primary" id="custCam">📷 ${t('openCam')}</button>
    <button type="button" class="btn" id="custPick">${t('pickFile')}</button>
    ${waBtn("#doc")}
  </div>
  <div class="hint">${t('ocrHint')}</div>
  <img id="ocrImg" class="ocr-preview hidden">
  <div id="ocrStatus" class="hint"></div>
 </div>`}
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
  let veh=null;
  if(plate||vin){
    const already=findExistingVehicle({license_plate:plate,vin});
    if(already){
      toast(t('vehicleExists'));
      save();upsertCustomerCloud(c);closeModal();
      session.page='vehicles'; render();
      setTimeout(()=>vehicleModal(already), 80);
      return;
    }
    veh={id:id('v'),companyId:session.company.id,customerId:c.id,plate,vin,hsn:$('#vhsn').value.trim(),tsn:$('#vtsn').value.trim().toUpperCase(),kba:($('#vhsn').value.trim()+' '+$('#vtsn').value.trim().toUpperCase()).trim(),make:$('#vmake').value.trim(),model:$('#vmodel').value.trim(),year:$('#vyear').value.trim(),km:$('#vkm').value};
    db.vehicles.push(veh); if(typeof upsertVehicleCloud==='function') upsertVehicleCloud(veh);
  }
  save();upsertCustomerCloud(c);closeModal();
  if(veh && !existing) afterCustomerVehicle(c,veh);
  else render();
 });
 bindVinEnter('#vvin',{vin:'#vvin',make:'#vmake',model:'#vmodel',year:'#vyear'});
 bindKbaEnter('#vhsn','#vtsn',{make:'#vmake',model:'#vmodel',year:'#vyear'});
 if($('#custPick')) $('#custPick').onclick=()=>$('#doc') && $('#doc').click();
 if($('#custWa')) $('#custWa').onclick=()=>pickWhatsApp('#doc');
 if($('#custCam')) $('#custCam').onclick=()=>openCamera('#doc');
 setTimeout(()=>applySharedFileTo('#doc'), 50);
 if($('#doc')) $('#doc').onchange=async e=>{
   const f=e.target.files && e.target.files[0]; if(!f) return;
   if($('#ocrImg')){ $('#ocrImg').src=URL.createObjectURL(f); $('#ocrImg').classList.remove('hidden'); }
   await ingestScheinFile(f);
 };
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
      const max=640;
      let w=img.width,h=img.height;
      if(w>max||h>max){const s=max/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s)}
      const c=document.createElement('canvas'); c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg',0.45));
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
      ${waBtn("#vphoto")}
      <button type="button" class="btn primary" onclick="openCamera('#vphoto')">📷 ${t('openCam')}</button>
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
 prefill.make=prefill.make||prefill.brand||'';
 prefill.paint=prefill.paint||prefill.color||'';
 prefill.engine=prefill.engine||prefill.engine_code||'';
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
 ${waBtn("#doc")}
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
   $('#ocrStatus').textContent = t('readingAI');
   let ai = await (WP.OCR && WP.OCR.read ? WP.OCR.read(f) : readScheinAI(f));
   if(WP.OCR && WP.OCR.stripDemo) ai=WP.OCR.stripDemo(ai||{});
   const {c,v}=findOrCreateFromSchein(ai);
   closeModal();
   vehicleModal(v);
   toast((c&&c.name?c.name+' · ':'')+(v.plate||v.vin||''));
  }catch(e){console.error(e);$('#ocrStatus').textContent=t('ocrManual');$('#msave').disabled=false}
 },t('readData'));
 $('#doc').onchange=()=>{const f=$('#doc').files[0];if(f){const u=URL.createObjectURL(f);$('#ocrImg').src=u;$('#ocrImg').classList.remove('hidden'); if($('#docName')) $('#docName').textContent=f.name;}};
 if($('#pickDoc')) $('#pickDoc').onclick=()=>$('#doc').click();
}

async function readScheinAI(file){
  if(window.WP && WP.OCR && WP.OCR.read) return WP.OCR.read(file);
  throw new Error('ocr-module-missing');
}
function normPlate(p){ return String(p||'').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g,''); }
function findExistingVehicle(ai){
  const plate=normPlate(ai && (ai.license_plate||ai.plate));
  const vin=String((ai&&ai.vin)||'').trim().toUpperCase();
  const rows=(typeof companyRows==='function'?companyRows('vehicles'):(db.vehicles||[]));
  return rows.find(x=>{
    if(vin && String(x.vin||'').toUpperCase()===vin) return true;
    if(plate && normPlate(x.plate)===plate) return true;
    return false;
  })||null;
}
function findOrCreateFromSchein(ai){
  const plate = (ai.license_plate || ai.plate || '').trim();
  const vin = (ai.vin || '').trim().toUpperCase();
  let v = findExistingVehicle(ai);
  if(v){
    const c = db.customers.find(x=>x.id===v.customerId) || db.customers.find(x=>x.companyId===session.company.id && x.id===v.customerId);
    return {c,v,existing:true};
  }
  const ownerName = (ai.owner_name || ai.holder || ai.customer_name || '').trim() || (plate ? (t('holderOf')+' '+plate) : t('newCustDefault'));
  const ownerPhone = (ai.phone || ai.owner_phone || '').trim();
  const ownerAddr = (ai.address || ai.owner_address || '').trim();
  let c = db.customers.find(x=>x.companyId===session.company.id && x.name===ownerName);
  if(!c){
    c={id:id('c'),companyId:session.company.id,name:ownerName,phone:ownerPhone,email:'',address:ownerAddr};
    db.customers.push(c); upsertCustomerCloud(c);
  }
  v={id:id('v'),companyId:session.company.id,customerId:c.id,cloudId:undefined,
    plate, vin, make:ai.brand||ai.make||'', model:ai.model||'', year:ai.year||'',
    engine:ai.engine_code||ai.engine||'', paint:ai.color||ai.paint||'',
    engine_displacement_cm3:ai.engine_displacement_cm3||'', fuel_type:ai.fuel_type||'',
    engine_power_kw:ai.engine_power_kw||'', hsn:ai.hsn||'', tsn:ai.tsn||'', kba:ai.kba||((ai.hsn||'')+' '+(ai.tsn||'')).trim(),
    maxWeight:ai.maxWeight||'', seats:ai.seats||'', vehicleClass:ai.vehicleClass||'',
    km:0, nextServiceKm:0, photo:'',
    ocrSource:'fahrzeugschein'};
  db.vehicles.push(v); upsertVehicleCloud(v);
  return {c,v,existing:false};
}
async function scheinFileToCustomerVehicle(file){
  let ai;
  try{
    ai=await (window.WP&&WP.OCR&&WP.OCR.read? WP.OCR.read(file): readScheinAI(file));
    if(WP.OCR&&WP.OCR.stripDemo) ai=WP.OCR.stripDemo(ai||{});
  }catch(err){
    const compressed=await compressVehiclePhoto(file);
    let text='';
    try{ await WP.loadOcr(); }catch(e){}
    if(window.Tesseract){
      const res=await Tesseract.recognize(compressed,'deu+eng');
      text=res?.data?.text||'';
    }
    const parsed=parseVehicleOCR(text||'');
    ai={license_plate:parsed.plate,vin:parsed.vin,brand:parsed.make,model:parsed.model,year:parsed.year,owner_name:parsed.owner_name||parsed.owner||''};
    if(WP.OCR&&WP.OCR.stripDemo) ai=WP.OCR.stripDemo(ai);
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
