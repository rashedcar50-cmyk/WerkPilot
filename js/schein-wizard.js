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
    const cls=opts.wide||opts.textarea?'field span2':'field';
    const codeHtml=opts.code?`<span class="field-code">${esc_(opts.code)}</span> `:'';
    const unitHtml=opts.unit?` <span class="field-unit">(${esc_(opts.unit)})</span>`:'';
    const fullLabel=codeHtml+esc_(label)+unitHtml;
    const control=opts.textarea
      ? `<textarea id="${id}" rows="2"${ph}>${esc_(value||'')}</textarea>`
      : `<input id="${id}" value="${esc_(value||'')}"${ph}>`;
    return `<div class="${cls}"><label>${fullLabel}</label>${control}</div>`;
  }

  // Current UI language -- same convention used throughout the app
  // (js/config.js, i18n.js, js/core.js): db.settings.uiLang, falling back
  // to German.
  function uiLang_(){ try{ return (db.settings && db.settings.uiLang) || 'de'; }catch(e){ return 'de'; } }

  // Groups the vehicle fields exactly the way the user's Autosiastik
  // account currently reports them (Seite 1/2/3, per the BASIC package's
  // configured report pages), NOT a claimed visual replica of the real
  // certificate layout -- this is an honest "best available" grouping.
  // Each field's own license code (e.g. "F.1", "Feld 14.1") and unit are
  // shown next to its bilingual label so the source is always traceable.
  function vehicleFieldGroups(ai){
    ai=ai||{};
    const mw=L_('manuell eintragen','أدخل يدويًا');
    return [
      { titleDe:'Fahrzeugdaten – Seite 1', titleAr:'بيانات المركبة – الصفحة 1', fields:[
        {id:'w_plate', code:'A', de:'Kennzeichen', ar:'رقم اللوحة', value: ai.license_plate||ai.plate||''},
        {id:'w_hu', code:'HU', de:'Nächste Hauptuntersuchung (HU)', ar:'تاريخ الفحص الفني القادم (HU)', value: ai.nextHu||''}
      ]},
      { titleDe:'Fahrzeugdaten – Seite 2', titleAr:'بيانات المركبة – الصفحة 2', fields:[
        {id:'w_firstreg', code:'B', de:'Erstzulassung', ar:'تاريخ أول تسجيل', value: ai.first_registration||''},
        {id:'w_hsn', code:'2.1', de:'HSN', ar:'HSN', value: ai.hsn||''},
        {id:'w_tsnfull', code:'2.2', de:'Schlüsselnummer (Feld 2.2)', ar:'رمز المفتاح (الحقل 2.2)', value: ai.tsnFull||''},
        {id:'w_vin', code:'E', de:'FIN / VIN', ar:'رقم الهيكل (VIN)', value: ai.vin||''},
        {id:'w_class', code:'J', de:'Fahrzeugklasse', ar:'فئة المركبة', value: ai.vehicleClass||''},
        {id:'w_vincheck', code:'3', de:'Prüfziffer zur VIN', ar:'رقم تحقق الهيكل (VIN)', value: ai.vinCheckDigit||''},
        {id:'w_make', code:'D.1', de:'Marke', ar:'الماركة', value: ai.brand||ai.make||''},
        {id:'w_typ1', code:'D.2.1', de:'Typ/Variante/Version', ar:'الطراز/المتغير/الإصدار', value: ai.typ1||''},
        {id:'w_typ2', code:'D.2.2', de:'Typ/Variante/Version', ar:'الطراز/المتغير/الإصدار', value: ai.typ2||''},
        {id:'w_typ3', code:'D.2.3', de:'Typ/Variante/Version', ar:'الطراز/المتغير/الإصدار', value: ai.typ3||''},
        {id:'w_typ4', code:'D.2.4', de:'Typ/Variante/Version', ar:'الطراز/المتغير/الإصدار', value: ai.typ4||''},
        {id:'w_model', code:'D.3', de:'Modell', ar:'الموديل', value: ai.model||''},
        {id:'w_cc', code:'P.1', de:'Hubraum', ar:'سعة المحرك', unit:'cm³', value: ai.engine_displacement_cm3||''},
        {id:'w_fuel', code:'P.3', de:'Kraftstoff', ar:'نوع الوقود', value: ai.fuel_type||''},
        {id:'w_emclass', code:'14', de:'Nationale Emissionsklasse', ar:'فئة الانبعاثات الوطنية', value: ai.emissionClass||''},
        {id:'w_emcode', code:'14.1', de:'Code zu V.9/P.9', ar:'رمز متعلق بـ V.9/P.9', value: ai.emissionCode||''},
        {id:'w_notes', code:'22', de:'Sondereintragungen', ar:'ملاحظات / قيود خاصة', value: ai.specialNotes||'', wide:true, textarea:true}
      ]},
      { titleDe:'Fahrzeugdaten – Seite 3', titleAr:'بيانات المركبة – الصفحة 3', fields:[
        {id:'w_kw', code:'P.2', de:'Leistung', ar:'القدرة', unit:'kW', value: ai.engine_power_kw||''},
        {id:'w_rpm', code:'P.4', de:'Nenndrehzahl', ar:'سرعة الدوران الاسمية', unit:'U/min', value: ai.engine_rated_rpm||''},
        {id:'w_weight', code:'F.1', de:'Zul. Gesamtmasse', ar:'الكتلة الإجمالية المسموحة', unit:'kg', value: ai.maxWeight||'', placeholder:mw},
        {id:'w_weightnat', code:'F.2', de:'Zul. Gesamtmasse im Zulassungsstaat', ar:'الكتلة الإجمالية المسموحة (دولة التسجيل)', unit:'kg', value: ai.maxWeightNational||''},
        {id:'w_unladen', code:'G', de:'Leermasse', ar:'الكتلة الفارغة', unit:'kg', value: ai.unladenWeight||''},
        {id:'w_seats', code:'S.1', de:'Sitze', ar:'عدد المقاعد', value: ai.seats||'', placeholder:mw},
        {id:'w_color', code:'R', de:'Farbe', ar:'اللون', value: ai.color||ai.paint||''},
        {id:'w_tire1', code:'15.1', de:'Bereifung Achse 1', ar:'مقاس الإطارات – المحور 1', value: ai.tireAxle1||''},
        {id:'w_tire2', code:'15.2', de:'Bereifung Achse 2', ar:'مقاس الإطارات – المحور 2', value: ai.tireAxle2||''},
        {id:'w_datek', code:'6', de:'Datum zu K', ar:'تاريخ متعلق بـ K', value: ai.dateK||''}
      ]}
    ];
  }
  function L_(de, ar){ return uiLang_()==='ar' ? ar : de; }
  function renderFieldGroups(ai){
    const lang=uiLang_();
    return vehicleFieldGroups(ai).map(g=>{
      const title=lang==='ar'?g.titleAr:g.titleDe;
      const rows=g.fields.map(f=>fieldRow(f.id, lang==='ar'?f.ar:f.de, f.value, {code:f.code, unit:f.unit, wide:f.wide, textarea:f.textarea, placeholder:f.placeholder})).join('');
      return `<div class="field span2"><b>${esc_(title)}</b></div>${rows}`;
    }).join('');
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
        </div>
        <div class="hint">${tr('fieldGroupHint','Gruppierung nach Seite 1/2/3 des aktuell konfigurierten Scan-Berichts -- keine grafische Nachbildung des Originaldokuments.')}</div>
        <div class="form-grid">
          ${renderFieldGroups(ai)}
          ${fieldRow('w_year', L_('Baujahr (abgeleitet)','سنة التصنيع (مُستَنتَجة)'), ai.year||'')}
          ${fieldRow('w_tsn', L_('HSN/TSN zusammen','HSN/TSN معًا'), ai.tsn||'')}
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
        color:v('#w_color'), vehicleClass:v('#w_class'),
        // Newly-configured BASIC-package fields (see js/autosiastik.js mapScan)
        nextHu:v('#w_hu'), tsnFull:v('#w_tsnfull'), vinCheckDigit:v('#w_vincheck'),
        typ1:v('#w_typ1'), typ2:v('#w_typ2'), typ3:v('#w_typ3'), typ4:v('#w_typ4'),
        emissionClass:v('#w_emclass'), emissionCode:v('#w_emcode'), specialNotes:v('#w_notes'),
        maxWeightNational:v('#w_weightnat'), unladenWeight:v('#w_unladen'),
        tireAxle1:v('#w_tire1'), tireAxle2:v('#w_tire2'), dateK:v('#w_datek'),
        // The ORIGINAL provider response (no images), kept separate from
        // every value above -- those may have just been hand-corrected.
        ocrRaw: (state.ai && state.ai.raw) ? JSON.stringify(state.ai.raw) : ''
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
      // Newly-configured BASIC-package fields -- see js/autosiastik.js
      // mapScan() for the provider-documentation source of each one.
      nextHu:(form.nextHu||'').trim(), tsnFull:(form.tsnFull||'').trim(), vinCheckDigit:(form.vinCheckDigit||'').trim(),
      typ1:(form.typ1||'').trim(), typ2:(form.typ2||'').trim(), typ3:(form.typ3||'').trim(), typ4:(form.typ4||'').trim(),
      emissionClass:(form.emissionClass||'').trim(), emissionCode:(form.emissionCode||'').trim(),
      specialNotes:(form.specialNotes||'').trim(),
      maxWeightNational:(form.maxWeightNational||'').trim(), unladenWeight:(form.unladenWeight||'').trim(),
      tireAxle1:(form.tireAxle1||'').trim(), tireAxle2:(form.tireAxle2||'').trim(), dateK:(form.dateK||'').trim(),
      ocrSource:'autosiastik'
    };
    // The raw provider response (no images) is kept on its own field,
    // separate from every corrected value above -- only overwritten when
    // a fresh scan actually produced one, so re-saving after a manual edit
    // (no new scan) never erases the original snapshot from an earlier scan.
    if(form.ocrRaw) fields.ocrRaw=form.ocrRaw;

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
