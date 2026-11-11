/* Autosiastik Fahrzeugschein-Scanner integration (client side).
   Calls the Supabase edge function `autosiastik-scan`, which holds
   AUTOSIASTIK_ACCESS_KEY server-side -- this file never sees that key.
   See https://api.fahrzeugschein-scanner.de/redoc for the upstream schema. */
(function(W){
  function str(v){ return v==null ? '' : String(v).trim(); }
  function isBlankish(v){
    const s=str(v);
    return !s || /^[-–—]+$/.test(s);
  }
  // Fallback list used only if js/ocr.js (which owns the canonical list)
  // hasn't loaded for some reason -- kept intentionally short since the
  // real list lives in one place (WP.OCR.MAKES) to avoid drift.
  const FALLBACK_MAKES=['VOLKSWAGEN','VW','BMW','MERCEDES-BENZ','MERCEDES','AUDI','OPEL','FORD','TOYOTA','RENAULT','PEUGEOT','CITROEN','SKODA','SEAT','FIAT','HYUNDAI','KIA','PORSCHE','MAZDA','NISSAN','HONDA','VOLVO','DACIA','TESLA','MINI','SMART','JEEP','SUZUKI','CUPRA'];
  function knownMakes(){
    try{ return (window.WP && WP.OCR && WP.OCR.MAKES && WP.OCR.MAKES.length) ? WP.OCR.MAKES : FALLBACK_MAKES; }
    catch(e){ return FALLBACK_MAKES; }
  }

  // --- Brand/model resolution ------------------------------------------
  // The API returns brand/model from TWO independent sources that can
  // disagree:
  //   d1/d3     -- OCR-read directly from THIS document's own D.1/D.3
  //                fields ("Der Inhalt des Feld D1/D3").
  //   maker/model -- "ermittelt aus KBA Daten": looked up from the German
  //                vehicle type-approval catalog by HSN/TSN, i.e. NOT read
  //                from this document at all.
  // Priority: the document's own D.1 wins outright when it has anything to
  // show (it's the ground truth for *this* vehicle). Only when D.1 is
  // blank/a dash do we fall back to the catalog's `maker` (still a real,
  // provider-supplied field -- just from a different source, so it's
  // flagged as such). Only when NEITHER is usable do we fall back to the
  // last-resort heuristic of matching a known manufacturer name at the
  // start of the model text. Every fallback is flagged for review; nothing
  // here invents a brand that isn't already printed/returned somewhere.
  function resolveBrandModel(d1, d3, maker, catalogModel){
    d1=str(d1); d3=str(d3); maker=str(maker); catalogModel=str(catalogModel);
    const warnings=[];
    let brand='', brandSource='';
    if(!isBlankish(d1)){ brand=d1; brandSource='document'; }
    else if(maker){ brand=maker; brandSource='catalog'; }

    const baseModel = !isBlankish(d3) ? d3 : catalogModel;
    const modelSource = !isBlankish(d3) ? 'document' : (catalogModel ? 'catalog' : '');

    if(!brand && baseModel){
      const list=knownMakes();
      for(let i=0;i<list.length;i++){
        const mk=list[i];
        const re=new RegExp('^'+mk.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
        if(re.test(baseModel)){ brand=mk; brandSource='derived'; break; }
      }
    }

    let model=baseModel;
    if(brand && baseModel){
      const re=new RegExp('^'+brand.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
      const rest=baseModel.replace(re,'').trim();
      if(rest) model=rest;
    }

    if(brandSource==='catalog') warnings.push('Marke "'+brand+'" stammt aus dem Fahrzeugkatalog (HSN/TSN), nicht direkt aus dem Dokument (Feld D.1 war leer) -- bitte mit dem Fahrzeugschein abgleichen.');
    else if(brandSource==='derived') warnings.push('Marke "'+brand+'" wurde aus der Modellbezeichnung abgeleitet (D.1 leer, kein Katalogeintrag verfügbar) -- bitte prüfen.');

    return {brand, model, brandSource, modelSource, warnings};
  }

  // --- Generic same-concept conflict resolution -------------------------
  // Some fields exist twice: once read directly from the document, once
  // looked up from the KBA catalog by HSN/TSN. When only one is present,
  // use it. When both are present and agree, use it with confidence. When
  // they DISAGREE, this deliberately does NOT guess which is right (not
  // "pick the bigger number", not "always prefer the catalog") -- it
  // leaves the field blank and surfaces both values for human review.
  function numEq(a,b){
    const na=parseFloat(String(a).replace(',','.'));
    const nb=parseFloat(String(b).replace(',','.'));
    if(isNaN(na)||isNaN(nb)) return null;
    return na===nb;
  }
  function resolveNumericField(label, docVal, catalogVal){
    docVal=str(docVal); catalogVal=str(catalogVal);
    if(!docVal && !catalogVal) return {value:'', conflict:false};
    if(!docVal) return {value:catalogVal, conflict:false};
    if(!catalogVal) return {value:docVal, conflict:false};
    if(numEq(docVal,catalogVal)===true) return {value:docVal, conflict:false};
    return {value:'', conflict:true, docVal, catalogVal,
      warning: label+' unklar: Dokument liest "'+docVal+'", Fahrzeugkatalog (HSN/TSN) nennt "'+catalogVal+'" -- bitte im Original-Dokument prüfen und manuell eintragen.'};
  }

  // Some certificate templates (and some national variants) print P.2.4 as
  // a single combined "kW/Drehzahl" cell (e.g. "85/5600" = 85 kW at 5600
  // U/min) instead of kW alone. Detect that exact two-number pattern and
  // split it; a plain single number (the other template style) is left
  // untouched. Never invents an RPM value when only one number is present.
  function splitPowerRpm(raw){
    const s=str(raw);
    const m=s.match(/^(\d{1,4}(?:[.,]\d+)?)\s*\/\s*(\d{2,6})$/);
    if(!m) return {kw:s, rpm:'', derived:false};
    return {kw:m[1], rpm:m[2], derived:true};
  }

  // Maps the upstream ScanResponseDe fields onto WerkPilot's internal
  // vehicle/customer field names. Values are kept exactly as returned
  // (hsn/tsn/plate/vin are strings in the API, so leading zeros survive);
  // nothing here invents a value for a field the API returned null/empty.
  // Collects `_derivationWarnings` for every place a value was derived
  // (split/matched) rather than read directly from its own API field, so
  // the caller can flag it for review instead of presenting it as a plain
  // fact.
  function mapScan(d){
    d=d||{};
    const plate = str(d.registrationNumber) || (d.plate && str(d.plate.formatted)) || '';
    const name = str(d.name).replace(/\n+/g,' ').replace(/\s{2,}/g,' ').trim();
    const firstname = str(d.firstname);
    const ownerName = [firstname, name].filter(Boolean).join(' ').trim();
    const address1 = str(d.address1), address2 = str(d.address2);
    const address = [address1, address2].filter(Boolean).join(', ') || str(d.address).replace(/\n+/g,', ');
    const firstReg = str(d.ez_string) || str(d.ez);
    const year = (firstReg.match(/(19|20)\d{2}/)||[])[0] || '';
    const hsn = str(d.hsn), tsn = str(d.tsn);
    const derivationWarnings=[];

    const bm=resolveBrandModel(d.d1, d.d3, d.maker, d.model);
    derivationWarnings.push(...bm.warnings);

    const pr=splitPowerRpm(d.p2_p4);
    if(pr.derived) derivationWarnings.push('Leistung aus "'+str(d.p2_p4)+'" aufgeteilt in '+pr.kw+' kW und Nenndrehzahl '+pr.rpm+' U/min -- bitte prüfen.');
    // Cross-check the (possibly just-split) kW against the catalog's own
    // power_kw -- same conflict-or-confirm treatment as Hubraum below.
    const kwCheck=resolveNumericField('Leistung (kW)', pr.kw, d.power_kw);
    if(kwCheck.conflict) derivationWarnings.push(kwCheck.warning);

    if(year) derivationWarnings.push('Baujahr '+year+' wurde aus der Erstzulassung ('+firstReg+') abgeleitet, nicht bestätigt -- Erstzulassung ist nicht zwingend das Herstellungsjahr.');

    // Hubraum: p1 is read from THIS document; ccm is looked up from the
    // KBA catalog by HSN/TSN. Never silently prefer either on conflict.
    const ccmCheck=resolveNumericField('Hubraum (cm³)', d.p1, d.ccm);
    if(ccmCheck.conflict) derivationWarnings.push(ccmCheck.warning);

    return {
      license_plate: plate, plate,
      vin: str(d.vin).toUpperCase(),
      brand: bm.brand, make: bm.brand,
      model: bm.model,
      year,
      first_registration: firstReg, firstRegistration: firstReg,
      owner_name: ownerName,
      address,
      engine_displacement_cm3: ccmCheck.value,
      engine_power_kw: kwCheck.conflict ? '' : (kwCheck.value||pr.kw),
      engine_rated_rpm: pr.rpm,
      fuel_type: str(d.p3),
      color: str(d.r), paint: str(d.r),
      hsn, tsn, kba: (hsn && tsn) ? (hsn+' '+tsn) : '',
      maxWeight: str(d.f1) || str(d.f2),
      seats: str(d.s1),
      vehicleClass: str(d.j),
      _derivationWarnings: derivationWarnings
    };
  }

  function buildWarnings(d, derivationWarnings){
    d=d||{};
    const w=(derivationWarnings||[]).slice();
    if(d.vin && d.vin_valid===false) w.push('VIN-Prüfziffer unsicher'+(d.vin_validation_msg?(': '+d.vin_validation_msg):''));
    if(d.hsn && d.hsn_valid===false) w.push('HSN passt nicht zum Fahrzeugkatalog'+(d.hsn_validation_msg?(': '+d.hsn_validation_msg):''));
    if(d.tsn && d.tsn_valid===false) w.push('TSN passt nicht zum Fahrzeugkatalog'+(d.tsn_validation_msg?(': '+d.tsn_validation_msg):''));
    if(d.plate && d.plate.valid===false) w.push('Kennzeichenformat nicht sicher erkannt');
    if(d.field_22_continued) w.push('Feld 22 wird auf einem Beiblatt fortgesetzt (nicht mitgescannt)');
    return w;
  }

  // Some API fields (e.g. `plate`) are nested objects (PlateDe: raw,
  // district_code, letters, digits, season, valid, ...), not plain
  // strings. Rendered directly in an HTML template they stringify to
  // "[object Object]" -- this flattens them into a readable "key=value,
  // key2=value2" form instead, recursing for doubly-nested objects (e.g.
  // plate.season).
  function flattenForDisplay(v){
    if(v==null) return '';
    if(typeof v!=='object') return String(v);
    if(Array.isArray(v)) return v.map(flattenForDisplay).filter(Boolean).join('; ');
    return Object.keys(v)
      .filter(k=>!/_img$/.test(k) && v[k]!=null && v[k]!=='')
      .map(k=>k+'='+flattenForDisplay(v[k]))
      .join(', ');
  }

  // Strips the (large, base64) *_img fields so the remaining object is safe
  // to keep around and show in a review/trace panel -- this is what lets a
  // mismatch between the provider's own field and our mapping be inspected
  // without needing the browser's Network tab. Nested objects are
  // flattened to readable text (see flattenForDisplay) rather than shown
  // as "[object Object]".
  function rawTextFields(d){
    d=d||{};
    const out={};
    Object.keys(d).forEach(k=>{
      if(/_img$/.test(k)) return;
      if(k==='extra_pages') return;
      const v=d[k];
      if(v==null || v==='') return;
      out[k]=(v && typeof v==='object') ? flattenForDisplay(v) : v;
    });
    return out;
  }

  function buildCutouts(d){
    d=d||{};
    const pick=b64=> b64 ? ('data:image/jpeg;base64,'+b64) : '';
    const c={
      document: pick(d.document_img),
      plate: pick(d.registrationNumber_img),
      vin: pick(d.vin_img),
      hsn: pick(d.field_2_2_img),
      name: pick(d.name1_img)||pick(d.name2_img),
      firstname: pick(d.firstname_img),
      address: pick(d.address1_img)||pick(d.address2_img)
    };
    return Object.values(c).some(Boolean) ? c : null;
  }

  function toDataUrl(file, maxSide, quality){
    maxSide=maxSide||2000; quality=quality||0.85;
    return new Promise((resolve,reject)=>{
      try{
        const img=new Image();
        const url=URL.createObjectURL(file);
        img.onload=()=>{
          let w=img.width,h=img.height;
          if(Math.max(w,h)>maxSide){ const s=maxSide/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s); }
          const c=document.createElement('canvas'); c.width=Math.max(1,w); c.height=Math.max(1,h);
          c.getContext('2d').drawImage(img,0,0,w,h);
          URL.revokeObjectURL(url);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error('image-decode-failed')); };
        img.src=url;
      }catch(e){ reject(e); }
    });
  }

  // Returns:
  //   null              -> provider not configured / unreachable: caller
  //                         should fall back to the existing OCR pipeline
  //   {error:true, ...} -> provider reached but refused/failed: caller shows
  //                         the error and falls back, but must NOT retry
  //                         this same provider for the same image (credits)
  //   {...fields}        -> normalized result, with validationWarnings[]
  //                          and cutouts (when available)
  async function read(file, opts){
    opts=opts||{};
    if(!window.SUPABASE_URL || !window.SUPABASE_KEY) return null;
    let dataUrl;
    try{ dataUrl=await toDataUrl(file); }
    catch(e){ return null; }
    const controller=new AbortController();
    const to=setTimeout(()=>controller.abort(), 30000);
    let res;
    try{
      res=await fetch(`${window.SUPABASE_URL}/functions/v1/autosiastik-scan`,{
        method:'POST', signal:controller.signal,
        headers:{'Content-Type':'application/json','apikey':window.SUPABASE_KEY,'Authorization':'Bearer '+window.SUPABASE_KEY},
        body:JSON.stringify({ image:dataUrl, showCuts: opts.showCuts!==false, getKbaData: opts.getKbaData===true })
      });
    }catch(e){ clearTimeout(to); return null; }
    clearTimeout(to);
    const js=await res.json().catch(()=>({}));
    if(res.status===404 || js.error==='no-server-key') return null;
    if(!res.ok || js.ok===false){
      return { error:true, status: js.status||res.status, message: String(js.error||('HTTP '+res.status)) };
    }
    const d=js.data||{};
    const mapped=mapScan(d);
    const derivationWarnings=mapped._derivationWarnings||[];
    delete mapped._derivationWarnings;
    mapped.validationWarnings=buildWarnings(d, derivationWarnings);
    mapped.cutouts=buildCutouts(d);
    mapped.kbaFound=(d.kba_found===true);
    mapped.documentId=str(d.document_id);
    mapped.raw=rawTextFields(d); // full provider fields (no images) -- for the review/trace panel
    return mapped;
  }

  W.Autosiastik={read, mapScan, buildWarnings, buildCutouts, rawTextFields, resolveBrandModel, splitPowerRpm, resolveNumericField, flattenForDisplay, isBlankish};
})(window.WP=window.WP||{});
