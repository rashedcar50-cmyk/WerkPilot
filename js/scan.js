/* Scan/OCR form binding — split from app.js */
(function(W){
  function set(sel,val){
    const el=typeof $==='function'?$(sel):null;
    if(el && val!=null && val!=='') el.value=val;
  }
  function apply(ai){
    if(!ai) return;
    const demo=/muster(man|mann|frau|stadt|strasse|straße|weg)|ab[\s\-]*cd[\s\-]*123|1hgbh41|hh[\s\-]*ab[\s\-]*1234|john doe/i;
    ['owner_name','holder','customer_name','address','license_plate','plate','vin','brand','make','model'].forEach(k=>{
      if(demo.test(String(ai[k]||''))) ai[k]='';
    });
    ['#n','#ad','#vplate','#pl','#vvin','#vin'].forEach(sel=>{
      const el=typeof $==='function'?$(sel):null;
      if(el && demo.test(el.value||'')) el.value='';
    });
    let owner=ai.owner_name||ai.holder||ai.customer_name||'';
    if(/Vorname|C\.\?\s*1|Anschrift|Firmenname|Kennzeichen/i.test(owner)) owner='';
    const addr=ai.address||[ai.street,ai.postal_code,ai.city].filter(Boolean).join(', ');
    const plate=ai.license_plate||ai.plate||'';
    set('#n', owner);
    set('#ad', addr);
    set('#vplate', plate); set('#pl', plate);
    set('#vvin', ai.vin); set('#vin', ai.vin);
    set('#vhsn', ai.hsn); set('#hsn', ai.hsn);
    set('#vtsn', ai.tsn); set('#tsn', ai.tsn);
    set('#vmake', ai.brand||ai.make); set('#mk', ai.brand||ai.make);
    set('#vmodel', ai.model); set('#mo', ai.model);
    set('#vyear', ai.year); set('#yr', ai.year);
    const hsnVal=(typeof $==='function' && $('#vhsn') && $('#vhsn').value)||(typeof $==='function' && $('#hsn') && $('#hsn').value)||ai.hsn||'';
    const tsnVal=(typeof $==='function' && $('#vtsn') && $('#vtsn').value)||(typeof $==='function' && $('#tsn') && $('#tsn').value)||ai.tsn||'';
    if(hsnVal && typeof lookupKbaLocal==='function'){
      const loc=lookupKbaLocal(hsnVal,tsnVal);
      if(loc.make){ if(typeof $==='function' && $('#vmake') && !$('#vmake').value) set('#vmake', loc.make); set('#mk', loc.make); }
      if(loc.model){ if(typeof $==='function' && $('#vmodel') && !$('#vmodel').value) set('#vmodel', loc.model); set('#mo', loc.model); }
    }
    if(hsnVal && tsnVal && typeof lookupKbaFree==='function'){
      lookupKbaFree(hsnVal,tsnVal).then(info=>{
        if(!info) return;
        if(info.make && $('#vmake') && !$('#vmake').value) $('#vmake').value=info.make;
        if(info.make && $('#mk') && !$('#mk').value) $('#mk').value=info.make;
        if(info.model && $('#vmodel') && !$('#vmodel').value) $('#vmodel').value=info.model;
        if(info.model && $('#mo') && !$('#mo').value) $('#mo').value=info.model;
      }).catch(()=>{});
    }
  }
  const MAPPED_FIELD_LABELS={
    license_plate:'Kennzeichen', vin:'VIN', hsn:'HSN', tsn:'TSN',
    brand:'Marke', model:'Modell', year:'Baujahr', first_registration:'Erstzulassung',
    engine_power_kw:'Leistung (kW)', engine_displacement_cm3:'Hubraum (cm³)',
    fuel_type:'Kraftstoff', color:'Farbe', vehicleClass:'Fahrzeugklasse',
    owner_name:'Halter', address:'Anschrift'
  };
  function kv(label, val){
    return `<div class="ocr-kv"><span class="ocr-kv-k">${label}</span><span class="ocr-kv-v">${val===''||val==null?'<i>—</i>':val}</span></div>`;
  }
  function renderReview(ai, containerSel){
    containerSel=containerSel||'#ocrReview';
    const el=typeof $==='function' ? $(containerSel) : (typeof document!=='undefined' ? document.querySelector(containerSel) : null);
    if(!el) return;
    if(!ai){ el.innerHTML=''; return; }
    const esc_=typeof esc==='function' ? esc : (s)=>String(s==null?'':s);
    const warnings=ai.validationWarnings||[];
    const cutouts=ai.cutouts||null;
    let html='';

    // Source: which provider actually produced this result. Shown as a
    // clear, colored badge -- not a muted footnote -- since telling
    // Autosiastik apart from the OpenAI/local fallback is exactly what
    // needs to be unmistakable before trusting the extracted data.
    const src=String(ai.ocrSource||'unbekannt');
    const srcOk=src==='autosiastik';
    const srcLabel=srcOk?'Autosiastik':(src==='unbekannt'?'Quelle unbekannt':('Fallback: '+src));
    html+=`<div class="ocr-source ${srcOk?'ocr-source-ok':'ocr-source-fallback'}">Quelle: <b>${esc_(srcLabel)}</b></div>`;
    if(window.WP && window.WP._autosiastikError){
      html+=`<div class="ocr-warnings"><div class="ocr-warn">⚠️ Autosiastik-Fehler (Fallback genutzt): ${esc_(window.WP._autosiastikError)}</div></div>`;
    }

    // Mapped fields -- exactly what will be offered to save, so a mapping
    // mistake is visible here, before the save click, not after.
    html+='<div class="ocr-fieldset"><b>Zugeordnete Felder</b>'+
      Object.keys(MAPPED_FIELD_LABELS).map(k=>kv(MAPPED_FIELD_LABELS[k], ai[k]!=null?esc_(ai[k]):'')).join('')+
      '</div>';

    if(warnings.length){
      html+=`<ul class="ocr-warnings">${warnings.map(w=>`<li class="ocr-warn">⚠️ ${esc_(w)}</li>`).join('')}</ul>`;
    }
    if(cutouts){
      const imgs=Object.keys(cutouts).filter(k=>cutouts[k]).map(k=>`<img class="ocr-cutout" title="${esc_(k)}" src="${cutouts[k]}">`).join('');
      if(imgs) html+=`<div class="ocr-cutouts">${imgs}</div>`;
    }

    // Raw provider response (fields only, no images) -- lets a mismatch
    // between what the provider actually returned and what we mapped be
    // traced without the browser's Network tab.
    if(ai.raw && typeof ai.raw==='object' && Object.keys(ai.raw).length){
      const rows=Object.keys(ai.raw).sort().map(k=>kv(esc_(k), esc_(ai.raw[k]))).join('');
      html+=`<details class="ocr-raw"><summary>Rohdaten des Anbieters (${Object.keys(ai.raw).length} Felder)</summary>${rows}</details>`;
    } else if(!srcOk && window.WP && window.WP._ocrRaw){
      html+=`<details class="ocr-raw"><summary>Roh-OCR-Text (Fallback)</summary><pre class="ocr-raw-text">${esc_(String(window.WP._ocrRaw).slice(0,4000))}</pre></details>`;
    }

    el.innerHTML=html;
  }
  W.Scan={apply,renderReview};
  window.applyScheinToCustomerForm=apply;
  window.renderScheinReview=renderReview;
})(window.WP=window.WP||{});
