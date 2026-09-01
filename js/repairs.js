/* Repairs + Schein-to-job */
function scanScheinStartRepair(mode){
  if(mode && typeof mode==='object') mode='repair';
  mode=mode||'repair';
  const title=mode==='estimate'?t('scanSchein'):mode==='invoice'?t('scanSchein'):t('scanOpenJob');
  modal(title,`<div class="field">
    <label>${t('pickSchein')}</label>
    <input id="doc" type="file" accept="image/*" class="hidden">
    <div class="toolbar">
      <button type="button" class="btn primary" id="pickGallery">${t('pickFile')||t('pickSchein')}</button>
      ${waBtn("#doc")}
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
      const complaint=($('#scheinWork')&&$('#scheinWork').value||'').trim() || t('scheinIntake');
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
      const r={id:id('r'),companyId:session.company.id,vehicleId:v.id,complaint,description:complaint,jobs:[],parts:[],photos:[],tech:session.user.name||'',hours:1,status:'intake',km:km,fuel:'half',date:todayISO()};
      db.repairs.push(r); upsertRepairCloud(r); save();
      audit('repair.from_schein', (v.plate||v.vin)+' '+km);
      closeModal(); session.repairId=r.id; session.page='repairs'; render();
      toast(t('jobOpened')+' — '+esc(v.plate||v.vin)+' / '+km+' km');
      return;
    }
    $('#ocrStatus').textContent=t('readingSchein');
    $('#msave').disabled=true;
    try{
      let ai;
      try{
        ai=await (window.WP&&WP.OCR&&WP.OCR.read? WP.OCR.read(f): readScheinAI(f));
        if(WP.OCR&&WP.OCR.stripDemo) ai=WP.OCR.stripDemo(ai||{});
      }catch(err){
        const compressed=await compressVehiclePhoto(f);
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
      window._scheinAI=ai; window._scheinReady=true;
      const plate=ai.license_plate||ai.plate||'-';
      const vin=ai.vin||'-';
      const owner=ai.owner_name||ai.holder||ai.customer_name||'-';
      $('#scheinPreview').classList.remove('hidden');
      $('#scheinPreview').innerHTML=`<div class="okbox">
        <b>${t('ocrHint')}</b><br>
        ${t('customer')}: ${esc(dePrintName(owner))}<br>
        ${t('plate')}: ${esc(plate)}<br>
        VIN: ${esc(vin)}<br>
        ${esc(ai.brand||ai.make||'')} ${esc(ai.model||'')} ${esc(ai.year||'')}
        <div class="field" style="margin-top:10px"><label>${t('kmNowEx')}</label><input id="scheinKm" class="latnum" inputmode="decimal" lang="de" placeholder="86500"></div>
        <div class="field"><label>${t('repairNeeded')}</label><textarea id="scheinWork" placeholder="${t('repairNeeded')}"></textarea></div>
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
  if($('#pickWa')) $('#pickWa').onclick=()=>pickWhatsApp('#doc');
  setTimeout(()=>applySharedFileTo('#doc'), 50);
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
 const sts=['intake','diag','wait_parts','working','ready','delivered'];
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
      <button type="button" class="btn small" onclick="document.getElementById('phBefore').click()">${t('pickFile')}</button>
      ${waBtn("#phBefore","small")}
      <button type="button" class="btn small" onclick="openCamera('#phBefore')">📷 ${t('openCam')}</button></div>
    <div class="field"><label>${t('after')}</label>${img(after)}
      <input id="phAfter" type="file" accept="image/*" class="hidden" onchange="addRepairPhoto('${r.id}','after',this)">
      <button type="button" class="btn small" onclick="document.getElementById('phAfter').click()">${t('pickFile')}</button>
      ${waBtn("#phAfter","small")}
      <button type="button" class="btn small" onclick="openCamera('#phAfter')">📷 ${t('openCam')}</button></div>
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
   upsertRepairCloud(r); save(); toast(t('kmSaved')); render();
 };
 const add=$('#addStock');
 if(add) add.onclick=()=>{
   const item=db.inventory.find(x=>x.id===$('#stockPick').value);
   if(!item) return toast(t('noStockItem'));
   const qty=Number($('#stockQty').value||1);
   if(Number(item.qty||0)<qty) return toast(t('qtyLow'));
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
  save(); upsertRepairCloud(r); render(); toast(t('photoSaved')||t('shotOk'));
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
  <option value="empty" ${r.fuel==='empty'||r.fuel==='فارغ'?'selected':''}>${t('fuelEmpty')}</option>
  <option value="quarter" ${r.fuel==='quarter'||r.fuel==='ربع'?'selected':''}>${t('fuelQ')}</option>
  <option value="half" ${!r.fuel||r.fuel==='half'||r.fuel==='نصف'?'selected':''}>${t('fuelH')}</option>
  <option value="full" ${r.fuel==='full'||r.fuel==='ممتلئ'?'selected':''}>${t('fuelF')}</option>
 </select></div>
 <div class="field span2"><label>${t('complaint')}</label><textarea id="rc">${esc(r.complaint||'')}</textarea></div>
 <div class="field span2"><label>${t('work')}</label><textarea id="rd">${esc(r.description||'')}</textarea></div>
 <div class="field span2"><label>${t('jobsOnePerLine')}</label><textarea id="rjobs">${esc(jobs)}</textarea></div>
 <div class="field span2"><label>${t('partsLineFmt')}</label><textarea id="rparts">${esc(parts)}</textarea></div>
 <div class="field"><label>${t('hours')}</label><input id="rh" class="latnum" inputmode="decimal" lang="de" step=".25" value="${r.hours||1}"></div>
 <div class="field"><label>${t('status')}</label><select id="rs">
  ${['intake','diag','wait_parts','working','ready','delivered'].map(s=>`<option value="${s}" ${r.status===s?'selected':''}>${stLabel(s)}</option>`).join('')}
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
  if(!r) return toast(t('jobMissing'));
  repairModal(r);
}
window.openRepair=openRepairDesk;
