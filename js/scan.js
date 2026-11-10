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
  function renderReview(ai, containerSel){
    containerSel=containerSel||'#ocrReview';
    const el=typeof $==='function' ? $(containerSel) : (typeof document!=='undefined' ? document.querySelector(containerSel) : null);
    if(!el) return;
    if(!ai){ el.innerHTML=''; return; }
    const esc_=typeof esc==='function' ? esc : (s)=>String(s==null?'':s);
    const warnings=ai.validationWarnings||[];
    const cutouts=ai.cutouts||null;
    let html='';
    if(ai.ocrSource) html+=`<div class="hint">OCR: ${esc_(ai.ocrSource)}</div>`;
    if(typeof window!=='undefined' && window.WP && window.WP._autosiastikError){
      html+=`<div class="ocr-warnings"><div class="ocr-warn">⚠️ ${esc_(window.WP._autosiastikError)}</div></div>`;
    }
    if(warnings.length){
      html+=`<ul class="ocr-warnings">${warnings.map(w=>`<li class="ocr-warn">⚠️ ${esc_(w)}</li>`).join('')}</ul>`;
    }
    if(cutouts){
      const imgs=Object.keys(cutouts).filter(k=>cutouts[k]).map(k=>`<img class="ocr-cutout" title="${esc_(k)}" src="${cutouts[k]}">`).join('');
      if(imgs) html+=`<div class="ocr-cutouts">${imgs}</div>`;
    }
    el.innerHTML=html;
  }
  W.Scan={apply,renderReview};
  window.applyScheinToCustomerForm=apply;
  window.renderScheinReview=renderReview;
})(window.WP=window.WP||{});
