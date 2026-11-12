/* Customers + vehicles + Schein bind */
// Cross-device sync bugfix (2026-11-12): a record that hasn't actually
// reached the cloud yet (no cloudId) or is sitting on a recorded push
// error (syncError) now shows a small, honest "pending" marker in the
// list instead of looking identical to one that's fully synced -- the
// exact gap that let two different devices silently diverge for days
// with no visible sign anything was wrong.
function syncBadge(row){
  if(!row) return '';
  if(row.syncError) return ` <span class="status warn" title="${esc(row.syncError)}">⏳ ${esc(t('cloudPendingTitle'))}</span>`;
  if(!row.cloudId) return ` <span class="status warn">⏳ ${esc(t('cloudPendingTitle'))}</span>`;
  return '';
}
function customers(){
 const rows=companyRows('customers');
 $('#content').innerHTML=head(t('customers'),canEdit()?`<button class="btn ok" id="scanCust">📷 ${t('scanSchein')}</button><button class="btn primary" id="add">${t('newCustomer')}</button>`:'')+
 listShareBar('customers')+
 table([t('name'),t('phone'),t('taxId'),t('address'),t('cars'),t('action')],rows.map(c=>[
  esc(c.companyName? (c.companyName+' · '+(c.contact||c.name||'')) : (c.name||'-'))+syncBadge(c),
  esc(c.phone||'-'),esc(c.taxId||c.ustId||'-'),esc(c.address||'-'),
  db.vehicles.filter(v=>v.customerId===c.id).length,
  canEdit()?`<button class="btn small" onclick="editCustomer('${c.id}')">${t('edit')}</button>
  <button class="btn small primary" onclick="invoiceForCustomer('${c.id}')">${t('newInvoice')}</button>
  <button class="btn small" onclick="invoicesForCustomer('${c.id}')">${t('invoicesOf')}</button>`:'—'
 ]), 'customers');
 if(canEdit() && $('#add')) $('#add').onclick=()=>customerModal();
 if(canEdit() && $('#scanCust')) $('#scanCust').onclick=()=>openScheinWizard({onDone:(c,v)=>afterCustomerVehicle(c,v)});
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
 ${existing?`<div class="field span2">
   <button type="button" class="btn ok full" id="custScanVehicle">📷 ${t('scanSchein')} — ${t('addVehicleToCustomer')||t('newVehicle')}</button>
 </div>`:''}
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
  let c={id:c0.id||id('c'),companyId:c0.companyId||session.company.id,cloudId:c0.cloudId,
    type:$('#ctype').value, name:firma||person, contact:person, companyName:firma,
    taxId:$('#ctax').value.trim(), phone:$('#ph').value, email:$('#em').value, address:$('#ad').value, kdNr:$('#kd').value.trim()};
  if(!c.kdNr) c.kdNr=nextKdNr();
  if(!c.name)return toast(t('needName'));
  if(existing){
    const i=db.customers.findIndex(x=>x.id===c0.id);
    if(i>=0){ db.customers[i]={...db.customers[i],...c}; c=db.customers[i]; }
    audit('customer.update',c.name);
  }
  else { db.customers.push(c); audit('customer.create',c.name); }
  const plate=$('#vplate').value.trim(), vin=$('#vvin').value.trim();
  let veh=null;
  if(plate||vin){
    const vm=WP.ScheinEngine.findVehicleMatch(vin, plate, companyRows('vehicles'));
    const already=vm.strong||vm.weak;
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
 if($('#custScanVehicle')) $('#custScanVehicle').onclick=()=>{
   closeModal();
   openScheinWizard({ contextCustomerId:c0.id, onDone:(c,v)=>{ toast((c.name||'')+' · '+(v.plate||v.vin||'')); editCustomer(c0.id); } });
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
   esc(customerName(v.customerId)),esc(v.plate||'-')+syncBadge(v),esc(v.vin||'-'),esc(v.make||'-'),esc(v.model||'-'),esc(v.year||'-'),
   canEdit()?`<button class="btn small" onclick="editVehicle('${v.id}')">${t('edit')}</button> <button class="btn small" onclick="addVehiclePhoto('${v.id}')">${t('photo')}</button>`:'—'
 ]), 'vehicles');
 if(canEdit()){
   $('#add').onclick=()=>vehicleModal();
   $('#scan').onclick=()=>openScheinWizard({onDone:(c,v)=>{ render(); toast((c.name||'')+' · '+(v.plate||v.vin||'')); }});
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
 <div class="field"><label>${t('firstReg')}</label><input id="firstreg" value="${esc(prefill.firstRegistration||'')}" placeholder="TT.MM.JJJJ"></div>
 <div class="field"><label>${t('year')}</label><input id="yr" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.year||'')}"></div>
 <div class="field"><label>${t('displacement')}</label><input id="cc" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.engine_displacement_cm3||'')}"></div>
 <div class="field"><label>${t('fuel')}</label><input id="fuel" value="${esc(prefill.fuel_type||'')}"></div>
 <div class="field"><label>${t('powerKw')}</label><input id="kw" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.engine_power_kw||'')}"></div>
 <div class="field"><label>${t('ratedRpm')}</label><input id="vrpm" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.engine_rated_rpm||prefill.ratedRpm||'')}" placeholder="U/min"></div>
 <div class="field"><label>${t('maxWeight')}</label><input id="vmaxw" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.maxWeight||'')}"></div>
 <div class="field"><label>${t('seats')}</label><input id="vseats" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.seats||'')}"></div>
 <div class="field"><label>${t('vClass')}</label><input id="vklass" value="${esc(prefill.vehicleClass||'')}" placeholder="M1"></div>
 <div class="field"><label>${t('engineCode')}</label><input id="en" value="${esc(prefill.engine||'')}"></div>
 <div class="field"><label>${t('paintCode')}</label><input id="pa" value="${esc(prefill.paint||'')}" placeholder="z. B. Schwarz Metallic"></div>
 <div class="field"><label>${t('km')}</label><input id="vkm" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.km||'')}"></div>
 <div class="field"><label>${t('nextService')}</label><input id="vnext" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.nextServiceKm||'')}"></div>
 </div>
 <details class="form-grid-details"><summary>${t('scheinExtraFields')}</summary>
 <div class="form-grid">
 <div class="field"><label>HU</label><input id="vhu" value="${esc(prefill.nextHu||'')}" placeholder="MM.JJJJ"></div>
 <div class="field"><label>VSN</label><input id="vvsn" value="${esc(prefill.vsn||'')}"></div>
 <div class="field"><label>Feld 2.2</label><input id="vtsnfull" value="${esc(prefill.tsnFull||'')}"></div>
 <div class="field"><label>Feld 3</label><input id="vvincheck" value="${esc(prefill.vinCheckDigit||'')}"></div>
 <div class="field"><label>D.2.1</label><input id="vtyp1" value="${esc(prefill.typ1||'')}"></div>
 <div class="field"><label>D.2.2</label><input id="vtyp2" value="${esc(prefill.typ2||'')}"></div>
 <div class="field"><label>D.2.3</label><input id="vtyp3" value="${esc(prefill.typ3||'')}"></div>
 <div class="field"><label>D.2.4</label><input id="vtyp4" value="${esc(prefill.typ4||'')}"></div>
 <div class="field"><label>Feld 14</label><input id="vemclass" value="${esc(prefill.emissionClass||'')}"></div>
 <div class="field"><label>Feld 14.1</label><input id="vemcode" value="${esc(prefill.emissionCode||'')}"></div>
 <div class="field"><label>F.2</label><input id="vweightnat" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.maxWeightNational||'')}"></div>
 <div class="field"><label>G</label><input id="vunladen" class="latnum" inputmode="decimal" lang="de" value="${esc(prefill.unladenWeight||'')}"></div>
 <div class="field"><label>Feld 15.1</label><input id="vtire1" value="${esc(prefill.tireAxle1||'')}"></div>
 <div class="field"><label>Feld 15.2</label><input id="vtire2" value="${esc(prefill.tireAxle2||'')}"></div>
 <div class="field"><label>Feld 6</label><input id="vdatek" value="${esc(prefill.dateK||'')}"></div>
 <div class="field span2"><label>Feld 22</label><textarea id="vnotes" rows="2">${esc(prefill.specialNotes||'')}</textarea></div>
 </div>
 </details>`,()=>{
  if(!$('#cu').value)return toast(t('pickCustomerFirst'));
  const v={id:prefill.id||id('v'),companyId:prefill.companyId||session.company.id,cloudId:prefill.cloudId,customerId:$('#cu').value,plate:$('#pl').value.trim(),vin:$('#vin').value.trim().toUpperCase(),hsn:$('#hsn').value.trim(),tsn:$('#tsn').value.trim().toUpperCase(),kba:($('#hsn').value.trim()+' '+$('#tsn').value.trim().toUpperCase()).trim(),make:$('#mk').value.trim(),model:$('#mo').value.trim(),firstRegistration:$('#firstreg')?.value.trim()||'',year:$('#yr').value,engine:$('#en').value.trim(),paint:$('#pa').value.trim(),engine_displacement_cm3:$('#cc').value,fuel_type:$('#fuel').value,engine_power_kw:$('#kw').value,ratedRpm:$('#vrpm')?.value||'',maxWeight:$('#vmaxw')?.value||'',seats:$('#vseats')?.value||'',vehicleClass:$('#vklass')?.value||'',ocrSource:prefill.ocrSource||'',km:Number($('#vkm').value||0),nextServiceKm:Number($('#vnext').value||0),photo:prefill.photo||'',
   nextHu:$('#vhu')?.value.trim()||'',vsn:$('#vvsn')?.value.trim().toUpperCase()||'',tsnFull:$('#vtsnfull')?.value.trim()||'',vinCheckDigit:$('#vvincheck')?.value.trim()||'',
   typ1:$('#vtyp1')?.value.trim()||'',typ2:$('#vtyp2')?.value.trim()||'',typ3:$('#vtyp3')?.value.trim()||'',typ4:$('#vtyp4')?.value.trim()||'',
   emissionClass:$('#vemclass')?.value.trim()||'',emissionCode:$('#vemcode')?.value.trim()||'',
   specialNotes:$('#vnotes')?.value.trim()||'',maxWeightNational:$('#vweightnat')?.value||'',unladenWeight:$('#vunladen')?.value||'',
   tireAxle1:$('#vtire1')?.value.trim()||'',tireAxle2:$('#vtire2')?.value.trim()||'',dateK:$('#vdatek')?.value.trim()||'',
   ocrRaw:prefill.ocrRaw||''};
  if(prefill.id){ const i=db.vehicles.findIndex(x=>x.id===prefill.id); if(i>=0) db.vehicles[i]=v; audit('vehicle.update',v.plate||v.vin); save(); upsertVehicleCloud(v); closeModal(); render(); }
  else { db.vehicles.push(v);save();upsertVehicleCloud(v);audit('vehicle.create',v.plate||v.vin);closeModal();render(); if(canEdit()) setTimeout(()=>addVehiclePhoto(v.id), 200); }
 });
  $('#partslinkBtn').onclick=()=>window.open('https://www.partslink24.com/','_blank');
  if($('#distriBtn')) $('#distriBtn').onclick=()=>openDistriAutoVin($('#vin')?.value||'');
  bindVinEnter('#vin',{vin:'#vin',make:'#mk',model:'#mo',year:'#yr',cc:'#cc',fuel:'#fuel',kw:'#kw',en:'#en',pa:'#pa'});
  bindKbaEnter('#hsn','#tsn',{make:'#mk',model:'#mo',year:'#yr',kw:'#kw',cc:'#cc',fuel:'#fuel',seats:'#vseats',weight:'#vmaxw',klass:'#vklass'});
}
// Low-friction entry point for places (like the invoice designer's quick
// scan field) that already have a file and no room for the full wizard
// UI. Uses the SAME engine (WP.ScheinEngine + WP.ScheinWizard.executeSave)
// so results are never inconsistent with the Customers/Vehicles pages --
// it only auto-decides the UNAMBIGUOUS cases (VIN match, or 0/1 confident
// customer candidate); anything ambiguous (vehicle plate-only match,
// several/uncertain customer candidates) opens the same wizard instead of
// guessing silently.
async function scheinFileToCustomerVehicle(file){
  const ai=await (window.WP&&WP.OCR&&WP.OCR.read? WP.OCR.read(file): Promise.reject(new Error('ocr-module-missing')));
  const clean=(WP.OCR&&WP.OCR.stripDemo)?WP.OCR.stripDemo(ai||{}):(ai||{});
  const form={
    owner_name:clean.owner_name||clean.holder||'', address:clean.address||'',
    license_plate:clean.license_plate||clean.plate||'', vin:(clean.vin||'').toUpperCase(),
    hsn:clean.hsn||'', tsn:clean.tsn||'', vsn:clean.vsn||'', brand:clean.brand||clean.make||'', model:clean.model||'',
    first_registration:clean.first_registration||'', year:clean.year||'',
    engine_displacement_cm3:clean.engine_displacement_cm3||'', engine_power_kw:clean.engine_power_kw||'',
    engine_rated_rpm:clean.engine_rated_rpm||'', fuel_type:clean.fuel_type||'', maxWeight:clean.maxWeight||'',
    seats:clean.seats||'', color:clean.color||clean.paint||'', vehicleClass:clean.vehicleClass||'',
    nextHu:clean.nextHu||'', tsnFull:clean.tsnFull||'', vinCheckDigit:clean.vinCheckDigit||'',
    typ1:clean.typ1||'', typ2:clean.typ2||'', typ3:clean.typ3||'', typ4:clean.typ4||'',
    emissionClass:clean.emissionClass||'', emissionCode:clean.emissionCode||'', specialNotes:clean.specialNotes||'',
    maxWeightNational:clean.maxWeightNational||'', unladenWeight:clean.unladenWeight||'',
    tireAxle1:clean.tireAxle1||'', tireAxle2:clean.tireAxle2||'', dateK:clean.dateK||'',
    ocrRaw: clean.raw ? JSON.stringify(clean.raw) : ''
  };
  const vehicles=companyRows('vehicles'), customers=companyRows('customers');
  const {strong,weak}=WP.ScheinEngine.findVehicleMatch(form.vin, form.license_plate, vehicles);
  if(strong){
    const {customer,vehicle}=await WP.ScheinWizard.executeSave({form, vehicleDecision:{mode:'update',id:strong.id}, customerDecision:{mode:'existing', id:strong.customerId}});
    return {c:customer, v:vehicle, ai:clean};
  }
  if(weak){
    return new Promise(resolve=>{
      openScheinWizard({ onDone:(customer,vehicle)=>resolve({c:customer,v:vehicle,ai:clean}), onCancel:()=>resolve({c:null,v:null,ai:clean,cancelled:true}) });
    });
  }
  const candidates=WP.ScheinEngine.findCustomerCandidates({name:form.owner_name,address:form.address}, customers);
  if(candidates.length>1 || (candidates.length===1 && candidates[0].score<70)){
    return new Promise(resolve=>{
      openScheinWizard({ onDone:(customer,vehicle)=>resolve({c:customer,v:vehicle,ai:clean}), onCancel:()=>resolve({c:null,v:null,ai:clean,cancelled:true}) });
    });
  }
  const customerDecision=candidates.length===1 ? {mode:'existing', id:candidates[0].customer.id} : {mode:'new'};
  const {customer,vehicle}=await WP.ScheinWizard.executeSave({form, vehicleDecision:{mode:'create'}, customerDecision});
  return {c:customer, v:vehicle, ai:clean};
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
