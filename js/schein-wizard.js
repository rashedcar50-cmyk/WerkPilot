/* Unified Fahrzeugschein scan wizard -- the single entry point used by the
   Customers page, Vehicles page, WhatsApp/share-target ingest, and the
   repairs quick-start flow. Replaces findOrCreateFromSchein(),
   askScheinCustomerChoice(), and the old two-step scanVehicleDocument().

   Flow: pick/capture -> read -> review & correct (owner + vehicle fields
   together, editable) -> match customer/vehicle -> save.
   opts: { contextCustomerId, onDone(customer, vehicle, {created}) } */
(function(){
  function esc_(s){ return typeof esc==='function' ? esc(s) : String(s==null?'':s); }
  function tr(key, fallback){ const v=(typeof t==='function')?t(key):''; return v && v!==key ? v : fallback; }
  function fieldRow(id, label, value, opts){
    opts=opts||{};
    const ph=opts.placeholder?` placeholder="${esc_(opts.placeholder)}"`:'';
    const cls=opts.wide?'field span2':'field';
    return `<div class="${cls}"><label>${label}</label><input id="${id}" value="${esc_(value||'')}"${ph}></div>`;
  }

  function sourceBadgeHtml(ai){
    const src=String(ai.ocrSource||'unbekannt');
    const ok=src==='autosiastik';
    const label=ok?'Autosiastik':(src==='unbekannt'?tr('srcUnknown','Quelle unbekannt'):tr('srcFallback','Fallback')+': '+src);
    let html=`<div class="ocr-source ${ok?'ocr-source-ok':'ocr-source-fallback'}">${tr('sourceLabel','Quelle')}: <b>${esc_(label)}</b></div>`;
    if(window.WP && WP._autosiastikError){
      html+=`<div class="ocr-warn">⚠️ ${tr('autosiastikErrPrefix','Autosiastik-Fehler (Fallback genutzt)')}: ${esc_(WP._autosiastikError)}</div>`;
    }
    return html;
  }
  function warningsHtml(ai){
    const w=ai.validationWarnings||[];
    if(!w.length) return '';
    return `<ul class="ocr-warnings">${w.map(x=>`<li class="ocr-warn">⚠️ ${esc_(x)}</li>`).join('')}</ul>`;
  }
  function cutoutsHtml(ai){
    const c=ai.cutouts; if(!c) return '';
    const imgs=Object.keys(c).filter(k=>c[k]).map(k=>`<img class="ocr-cutout" title="${esc_(k)}" src="${c[k]}">`).join('');
    return imgs?`<div class="ocr-cutouts">${imgs}</div>`:'';
  }
  function rawPanelHtml(ai){
    if(!(ai.raw && typeof ai.raw==='object' && Object.keys(ai.raw).length)) return '';
    const rows=Object.keys(ai.raw).sort().map(k=>`<div class="ocr-kv"><span class="ocr-kv-k">${esc_(k)}</span><span class="ocr-kv-v">${esc_(ai.raw[k])}</span></div>`).join('');
    return `<details class="ocr-raw"><summary>${tr('rawPanelTitle','Rohdaten des Anbieters')} (${Object.keys(ai.raw).length})</summary>${rows}</details>`;
  }

  async function readFile(file){
    const ai=await (window.WP && WP.OCR && WP.OCR.read ? WP.OCR.read(file) : Promise.reject(new Error('ocr-module-missing')));
    return (WP.OCR && WP.OCR.stripDemo) ? WP.OCR.stripDemo(ai||{}) : (ai||{});
  }

  function openScheinWizard(opts){
    opts=opts||{};
    const state={ ai:null, busy:false, cancelled:false };

    // Every phase of the wizard is its own modal() call; this hooks each
    // one's cancel/X buttons so a user backing out at ANY step reliably
    // notifies the caller (e.g. the invoice quick-scan awaits this instead
    // of hanging forever on a closed modal).
    function wireCancel(){
      const fire=()=>{ if(state.cancelled) return; state.cancelled=true; if(typeof opts.onCancel==='function') opts.onCancel(); };
      const xm=document.getElementById('xmod'), mc=document.getElementById('mcancel');
      if(xm) xm.addEventListener('click', fire);
      if(mc) mc.addEventListener('click', fire);
    }

    // When the caller already has a file in hand (WhatsApp/share-target
    // ingest), skip straight to reading instead of asking the user to pick
    // one again.
    function renderPreloaded(file){
      modal(tr('scanWizardTitle','Fahrzeugschein scannen'), `
        <img id="ocrImg" class="ocr-preview" src="${URL.createObjectURL(file)}">
        <div id="ocrStatus" class="hint">${tr('readingAI','Schein wird per KI gelesen...')}</div>
      `, null, tr('cancelBtn','Abbrechen'));
      wireCancel();
      (async()=>{
        try{
          state.ai=await readFile(file);
          renderReview();
        }catch(err){
          console.error(err);
          if($('#ocrStatus')) $('#ocrStatus').textContent=tr('ocrFailSchein','Fahrzeugschein konnte nicht gelesen werden');
        }
      })();
    }

    function renderPick(){
      modal(tr('scanWizardTitle','Fahrzeugschein scannen'), `
        <div class="field">
          <label>${tr('pickSchein','Foto vom Fahrzeugschein wählen')}</label>
          <input id="doc" type="file" accept="image/*" class="hidden">
          <div class="toolbar">
            <button type="button" class="btn" id="pickDoc">${tr('pickFile','Datei wählen')}</button>
            ${typeof waBtn==='function'?waBtn('#doc'):''}
            <button type="button" class="btn primary" id="camOpen">📷 ${tr('openCam','Kamera öffnen')}</button>
          </div>
          <div class="hint">${tr('ocrHint','Das Bild wird im Browser gelesen. Daten vor dem Speichern prüfen.')}</div>
          <img id="ocrImg" class="ocr-preview hidden">
          <div id="ocrStatus" class="hint"></div>
        </div>
      `, null, tr('cancelBtn','Abbrechen'));
      wireCancel();
      if($('#pickDoc')) $('#pickDoc').onclick=()=>$('#doc').click();
      if($('#camOpen')) $('#camOpen').onclick=()=>openCamera('#doc');
      if($('#doc')) $('#doc').onchange=async e=>{
        const f=e.target.files && e.target.files[0]; if(!f) return;
        if($('#ocrImg')){ $('#ocrImg').src=URL.createObjectURL(f); $('#ocrImg').classList.remove('hidden'); }
        if($('#ocrStatus')) $('#ocrStatus').textContent=tr('readingAI','Schein wird per KI gelesen...');
        try{
          const ai=await readFile(f);
          state.ai=ai;
          renderReview();
        }catch(err){
          console.error(err);
          if($('#ocrStatus')) $('#ocrStatus').textContent=tr('ocrFailSchein','Fahrzeugschein konnte nicht gelesen werden');
        }
      };
    }

    function renderReview(){
      const ai=state.ai||{};
      modal(tr('reviewStepTitle','Daten prüfen und korrigieren'), `
        ${sourceBadgeHtml(ai)}
        ${warningsHtml(ai)}
        <div class="form-grid">
          <div class="field span2"><b>${tr('ownerSectionTitle','Halter laut Fahrzeugschein (Vorschlag für den Kunden)')}</b></div>
          ${fieldRow('w_owner', tr('customer','Kunde'), ai.owner_name||ai.holder||'')}
          ${fieldRow('w_addr', tr('address','Anschrift'), ai.address||'', {wide:true})}
          <div class="field span2"><b>${tr('vehicleSectionTitle','Fahrzeugdaten')}</b></div>
          ${fieldRow('w_plate', tr('plate','Kennzeichen'), ai.license_plate||ai.plate||'')}
          ${fieldRow('w_vin', tr('vinLbl','FIN'), ai.vin||'')}
          ${fieldRow('w_hsn', 'HSN', ai.hsn||'')}
          ${fieldRow('w_tsn', 'TSN', ai.tsn||'')}
          ${fieldRow('w_make', tr('make','Marke'), ai.brand||ai.make||'')}
          ${fieldRow('w_model', tr('model','Modell'), ai.model||'')}
          ${fieldRow('w_firstreg', tr('firstReg','Erstzulassung'), ai.first_registration||'')}
          ${fieldRow('w_year', tr('year','Baujahr'), ai.year||'')}
          ${fieldRow('w_cc', tr('displacement','Hubraum (cm³)'), ai.engine_displacement_cm3||'')}
          ${fieldRow('w_kw', tr('powerKw','Leistung (kW)'), ai.engine_power_kw||'')}
          ${fieldRow('w_rpm', tr('ratedRpm','Nenndrehzahl (U/min)'), ai.engine_rated_rpm||'')}
          ${fieldRow('w_fuel', tr('fuel','Kraftstoff'), ai.fuel_type||'')}
          ${fieldRow('w_weight', tr('maxWeight','Zul. Gesamtmasse (kg)'), ai.maxWeight||'', {placeholder:tr('manualEntryPlaceholder','manuell eintragen')})}
          ${fieldRow('w_seats', tr('seats','Sitze'), ai.seats||'', {placeholder:tr('manualEntryPlaceholder','manuell eintragen')})}
          ${fieldRow('w_color', tr('paintCode','Farbcode'), ai.color||ai.paint||'')}
          ${fieldRow('w_class', tr('vClass','Fahrzeugklasse'), ai.vehicleClass||'')}
        </div>
        ${cutoutsHtml(ai)}
        ${rawPanelHtml(ai)}
      `, ()=>goToMatch(), tr('continueToMatch','Weiter: Kunde zuordnen'));
      wireCancel();
    }

    function collectForm(){
      const v=sel=>{ const el=$(sel); return el?el.value.trim():''; };
      return {
        owner_name:v('#w_owner'), address:v('#w_addr'),
        license_plate:v('#w_plate'), vin:v('#w_vin').toUpperCase(),
        hsn:v('#w_hsn'), tsn:v('#w_tsn'),
        brand:v('#w_make'), model:v('#w_model'),
        first_registration:v('#w_firstreg'), year:v('#w_year'),
        engine_displacement_cm3:v('#w_cc'), engine_power_kw:v('#w_kw'), engine_rated_rpm:v('#w_rpm'),
        fuel_type:v('#w_fuel'), maxWeight:v('#w_weight'), seats:v('#w_seats'),
        color:v('#w_color'), vehicleClass:v('#w_class')
      };
    }

    function goToMatch(){
      const form=collectForm();
      const vehicles=companyRows('vehicles');
      const customers=companyRows('customers');
      const {strong, weak}=WP.ScheinEngine.findVehicleMatch(form.vin, form.license_plate, vehicles);

      if(strong){
        const linkedCustomer=customers.find(c=>c.id===strong.customerId)||null;
        if(opts.contextCustomerId && linkedCustomer && linkedCustomer.id!==opts.contextCustomerId){
          return renderVehicleConflict(form, strong, linkedCustomer);
        }
        return renderUpdateExisting(form, strong, linkedCustomer);
      }
      renderCustomerMatch(form, weak);
    }

    function renderVehicleConflict(form, existingVehicle, linkedCustomer){
      modal(tr('vehicleConflictTitle','Fahrzeug bereits verknüpft'), `
        <p class="hint">${tr('vehicleConflictBody','Dieses Fahrzeug (VIN) ist bereits mit einem anderen Kunden verknüpft:')}</p>
        <div class="okbox">${esc_(linkedCustomer?(linkedCustomer.companyName||linkedCustomer.name):'—')} · ${esc_(existingVehicle.plate||existingVehicle.vin||'')}</div>
        <div class="toolbar" style="flex-direction:column;margin-top:12px">
          <button type="button" class="btn primary full" id="keepOrig">${tr('keepWithExistingCustomer','Beim bisherigen Kunden belassen, nur Fahrzeugdaten aktualisieren')}</button>
          <button type="button" class="btn full" id="moveAnyway">${tr('moveToSelectedCustomerAnyway','Trotzdem zum gewählten Kunden verschieben')}</button>
        </div>
      `, null, tr('cancelBtn','Abbrechen'));
      wireCancel();
      if($('#keepOrig')) $('#keepOrig').onclick=()=>renderUpdateExisting(form, existingVehicle, linkedCustomer);
      if($('#moveAnyway')) $('#moveAnyway').onclick=()=>renderUpdateExisting(form, existingVehicle, linkedCustomer, {forceCustomerId:opts.contextCustomerId});
    }

    function renderUpdateExisting(form, existingVehicle, linkedCustomer, moveOpts){
      moveOpts=moveOpts||{};
      const targetCustomerId=moveOpts.forceCustomerId||(linkedCustomer&&linkedCustomer.id)||opts.contextCustomerId||null;
      modal(tr('updateVehicleTitle','Vorhandenes Fahrzeug aktualisieren'), `
        <p class="hint">${tr('updateVehicleBody','Dieses Fahrzeug existiert bereits -- die gelesenen Daten werden in das bestehende Fahrzeug übernommen, es wird keine Kopie angelegt.')}</p>
        <div class="okbox">${esc_(existingVehicle.plate||'')} · ${esc_(existingVehicle.vin||'')}</div>
      `, async()=>{
        if(state.busy) return; state.busy=true;
        try{
          const {customer,vehicle}=await executeSave({form, vehicleDecision:{mode:'update', id:existingVehicle.id}, customerDecision: targetCustomerId?{mode:'existing', id:targetCustomerId}:{mode:'new'}});
          closeModal();
          toast((customer&&customer.name?customer.name+' · ':'')+(vehicle.plate||vehicle.vin||''));
          if(typeof opts.onDone==='function') opts.onDone(customer, vehicle, {created:false});
        }catch(e){ console.error(e); toast(tr('saveFail','Speichern fehlgeschlagen')); }
        finally{ state.busy=false; }
      }, tr('saveBtn','Speichern'));
      wireCancel();
    }

    function renderCustomerMatch(form, weakVehicleMatch){
      const customers=companyRows('customers');
      let candidates=[];
      if(!opts.contextCustomerId){
        candidates=WP.ScheinEngine.findCustomerCandidates({name:form.owner_name,address:form.address}, customers);
      }
      const contextCustomer=opts.contextCustomerId?customers.find(c=>c.id===opts.contextCustomerId):null;
      const ownerKey=WP.ScheinEngine.normName(form.owner_name);
      const contextMismatch=contextCustomer && ownerKey && WP.ScheinEngine.normName(contextCustomer.companyName||contextCustomer.name)!==ownerKey
        && !WP.ScheinEngine.scoreCustomerMatch(contextCustomer,{name:form.owner_name,address:form.address}).score;

      let body='';
      if(weakVehicleMatch){
        body+=`<div class="ocr-warn">⚠️ ${tr('weakPlateMatch','Ein vorhandenes Fahrzeug hat dasselbe Kennzeichen, aber eine andere/keine FIN -- bitte prüfen, ob es sich wirklich um dasselbe Fahrzeug handelt, bevor Sie fortfahren.')}</div>`;
      }
      if(contextCustomer){
        if(contextMismatch) body+=`<div class="ocr-warn">⚠️ ${tr('ownerDiffersFromSelectedCustomer','Der erkannte Halter-Name weicht vom gewählten Kunden ab -- bitte prüfen, ob dieses Fahrzeug wirklich zu diesem Kunden gehört.')}</div>`;
        body+=`<div class="okbox">${tr('selectedCustomerLabel','Zugeordneter Kunde')}: <b>${esc_(contextCustomer.companyName||contextCustomer.name)}</b>${contextCustomer.kdNr?(' · '+esc_(contextCustomer.kdNr)):''}</div>
          <button type="button" class="btn" id="chooseOther">${tr('chooseDifferentCustomer','Anderen Kunden wählen')}</button>`;
      } else if(candidates.length){
        body+=`<p class="hint">${tr('candidatesHint','Möglicherweise bereits vorhanden:')}</p>
          <div id="custCands">${candidates.slice(0,5).map(x=>`<button type="button" class="btn full custcand" data-cid="${esc_(x.customer.id)}" style="margin-bottom:6px;text-align:start">${esc_(x.customer.companyName||x.customer.name)}${x.customer.kdNr?(' · '+esc_(x.customer.kdNr)):''}${x.customer.address?(' · '+esc_(x.customer.address)):''}</button>`).join('')}</div>
          <button type="button" class="btn primary full" id="createNewCust">${tr('createNewCustAnyway','Neuen Kunden anlegen')}</button>`;
      } else {
        body+=`<div class="okbox">${tr('newCustomerWillBeCreated','Neuer Kunde wird angelegt')}: <b>${esc_(form.owner_name||tr('newCustDefault','Neukunde'))}</b></div>`;
      }

      modal(tr('matchStepTitle','Kunde zuordnen'), `
        <div class="form-grid">
          ${fieldRow('m_owner', tr('customer','Kunde'), form.owner_name)}
          ${fieldRow('m_addr', tr('address','Anschrift'), form.address, {wide:true})}
        </div>
        ${body}
      `, async()=>{
        if(state.busy) return; state.busy=true;
        try{
          form.owner_name=$('#m_owner')?$('#m_owner').value.trim():form.owner_name;
          form.address=$('#m_addr')?$('#m_addr').value.trim():form.address;
          const customerDecision=state._customerDecision||(contextCustomer?{mode:'existing',id:contextCustomer.id}:{mode:'new'});
          const {customer,vehicle}=await executeSave({form, vehicleDecision:{mode:'create'}, customerDecision});
          closeModal();
          toast((customer.name?customer.name+' · ':'')+(customer.kdNr?('#'+customer.kdNr+' · '):'')+(vehicle.plate||vehicle.vin||''));
          if(typeof opts.onDone==='function') opts.onDone(customer, vehicle, {created:true});
        }catch(e){ console.error(e); toast(tr('saveFail','Speichern fehlgeschlagen')); }
        finally{ state.busy=false; }
      }, tr('saveBtn','Speichern'));
      wireCancel();

      document.querySelectorAll('#custCands .custcand').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          state._customerDecision={mode:'existing', id:btn.getAttribute('data-cid')};
          document.querySelectorAll('#custCands .custcand').forEach(b=>b.classList.remove('primary'));
          btn.classList.add('primary');
          toast(tr('candidateSelected','Kunde ausgewählt — jetzt speichern'));
        });
      });
      if($('#createNewCust')) $('#createNewCust').onclick=()=>{ state._customerDecision={mode:'new'}; toast(tr('newCustomerChosen','Neuer Kunde wird angelegt — jetzt speichern')); };
      if($('#chooseOther')) $('#chooseOther').onclick=()=>{ renderCustomerMatch(Object.assign({}, form), weakVehicleMatch); opts=Object.assign({}, opts, {contextCustomerId:null}); };
    }

    if(opts.file) renderPreloaded(opts.file);
    else renderPick();
  }

  // Creates/updates the customer and vehicle records per the decisions
  // made in the wizard. Re-checks VIN uniqueness right before writing so a
  // duplicate click (or a retry after the earlier attempt's cloud sync was
  // still pending) updates the already-created record instead of adding a
  // second one -- the save itself is idempotent on the vehicle's VIN.
  async function executeSave({form, vehicleDecision, customerDecision}){
    let customer=null;
    if(customerDecision.mode==='existing'){
      customer=db.customers.find(x=>x.id===customerDecision.id);
    }
    if(!customer){
      const ownerName=(form.owner_name||'').trim()||(form.license_plate?(t('holderOf')+' '+form.license_plate):t('newCustDefault'));
      customer={id:id('c'), companyId:session.company.id, name:ownerName, phone:'', email:'', address:form.address||'', kdNr:nextKdNr()};
      db.customers.push(customer);
      audit('customer.create', customer.name);
      upsertCustomerCloud(customer);
    } else {
      const patch=WP.ScheinEngine.mergeOwnerIntoCustomer(customer, {address:form.address});
      if(Object.keys(patch).length){ Object.assign(customer, patch); audit('customer.update', customer.name); upsertCustomerCloud(customer); }
    }

    // Idempotency: re-check for a vehicle with this VIN right before
    // writing, in case an earlier click already created it.
    const vinNow=(form.vin||'').trim().toUpperCase();
    let vehicle = vehicleDecision.mode==='update'
      ? db.vehicles.find(x=>x.id===vehicleDecision.id)
      : (vinNow ? db.vehicles.find(x=>String(x.vin||'').toUpperCase()===vinNow) : null);

    const fields={
      customerId: customer.id,
      plate:(form.license_plate||'').trim(), vin:vinNow,
      hsn:(form.hsn||'').trim(), tsn:(form.tsn||'').trim().toUpperCase(),
      kba:((form.hsn||'').trim()+' '+(form.tsn||'').trim().toUpperCase()).trim(),
      make:(form.brand||'').trim(), model:(form.model||'').trim(),
      firstRegistration:(form.first_registration||'').trim(), year:(form.year||'').trim(),
      engine_displacement_cm3:(form.engine_displacement_cm3||'').trim(),
      engine_power_kw:(form.engine_power_kw||'').trim(), ratedRpm:(form.engine_rated_rpm||'').trim(),
      fuel_type:(form.fuel_type||'').trim(), maxWeight:(form.maxWeight||'').trim(), seats:(form.seats||'').trim(),
      paint:(form.color||'').trim(), vehicleClass:(form.vehicleClass||'').trim(),
      ocrSource:'autosiastik'
    };

    if(vehicle){
      Object.assign(vehicle, fields);
      audit('vehicle.update', vehicle.plate||vehicle.vin);
    } else {
      vehicle=Object.assign({id:id('v'), companyId:session.company.id, km:0, nextServiceKm:0, photo:''}, fields);
      db.vehicles.push(vehicle);
      audit('vehicle.create', vehicle.plate||vehicle.vin);
    }
    upsertVehicleCloud(vehicle);
    save();
    return {customer, vehicle};
  }

  window.openScheinWizard=openScheinWizard;
  window.WP=window.WP||{};
  window.WP.ScheinWizard={open:openScheinWizard, executeSave};
})();
