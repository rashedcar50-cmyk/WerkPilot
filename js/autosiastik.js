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

  // --- Structured, bilingual, field-anchored warnings --------------------
  // Every warning this module raises is one of these objects, never a
  // pre-rendered string in a single language -- the caller (schein-wizard)
  // picks `.de` or `.ar` at render time based on the CURRENT UI language,
  // and can show it right next to the field(s) it concerns via `.field`
  // (a field id, or an array of ids when one warning concerns more than
  // one input, e.g. a kW/RPM split). This replaces the old approach of
  // baking German text into a flat array, which could never be shown in
  // Arabic and had no reliable link back to a specific input.
  function mkWarn(field, de, ar){ return {field, de, ar}; }
  function warnFields(w){ return Array.isArray(w.field) ? w.field : [w.field]; }

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

    if(brandSource==='catalog') warnings.push(mkWarn('make',
      'Marke "'+brand+'" stammt aus dem Fahrzeugkatalog (HSN/TSN), nicht direkt aus dem Dokument (Feld D.1 war leer) -- bitte mit dem Fahrzeugschein abgleichen.',
      'الماركة "'+brand+'" مأخوذة من كتالوج المركبات (HSN/TSN)، وليست من الوثيقة مباشرة (الحقل D.1 كان فارغًا) -- يرجى مطابقتها مع رخصة السيارة.'
    ));
    else if(brandSource==='derived') warnings.push(mkWarn('make',
      'Marke "'+brand+'" wurde aus der Modellbezeichnung abgeleitet (D.1 leer, kein Katalogeintrag verfügbar) -- bitte prüfen.',
      'الماركة "'+brand+'" استُنتجت من اسم الموديل (D.1 فارغ ولا يوجد مُدخل في الكتالوج) -- يرجى التحقق منها.'
    ));

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
  function resolveNumericField(field, labelDe, labelAr, docVal, catalogVal){
    docVal=str(docVal); catalogVal=str(catalogVal);
    if(!docVal && !catalogVal) return {value:'', conflict:false};
    if(!docVal) return {value:catalogVal, conflict:false};
    if(!catalogVal) return {value:docVal, conflict:false};
    if(numEq(docVal,catalogVal)===true) return {value:docVal, conflict:false};
    return {value:'', conflict:true, docVal, catalogVal,
      warning: mkWarn(field,
        labelDe+' unklar: Dokument liest "'+docVal+'", Fahrzeugkatalog (HSN/TSN) nennt "'+catalogVal+'" -- bitte im Original-Dokument prüfen und manuell eintragen.',
        labelAr+' غير محسوم: الوثيقة تُظهر "'+docVal+'"، بينما كتالوج المركبات (HSN/TSN) يذكر "'+catalogVal+'" -- يرجى التحقق من المستند الأصلي وإدخال القيمة يدويًا.'
      )};
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

  // Known EU vehicle-category codes printed in Feld J (M1/M2/M3 passenger,
  // N1/N2/N3 goods, O1-O4 trailers, L1e-L7e powered two/three-wheelers,
  // T1-T5/C/R/S agricultural & forestry). A value that matches none of
  // these is flagged for review -- NOT rejected or blanked, since a real
  // document could print a national code this list doesn't cover; this is
  // a plausibility hint, not a hard validation.
  const VEHICLE_CLASS_RE=/^(M[123]|N[123]|O[1234]|L[1-7]e|T[1-5]|C|R|S|G)$/i;

  // Maps the upstream ScanResponseDe fields onto WerkPilot's internal
  // vehicle/customer field names. Values are kept exactly as returned
  // (hsn/tsn/plate/vin are strings in the API, so leading zeros survive);
  // nothing here invents a value for a field the API returned null/empty.
  // Collects `_derivationWarnings` for every place a value was derived,
  // conflicting, or implausible -- each a structured {field, de, ar}
  // object (see mkWarn above) so the caller can show it, in the user's
  // own UI language, right next to the specific field it concerns.
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
    // HSN/TSN/VSN: per the provider's own schema, the HSN (hsn) and TSN
    // (tsn) are each their own field, and TSN is documented as exactly the
    // first 3 characters of Feld 2.2, with VSN as characters 4-8 of the
    // same field -- tsn/vsn/field_2_2 are three different views of the
    // SAME underlying key, not three independent readings that could
    // conflict. All three are kept, each honestly labeled by what it is.
    const hsn = str(d.hsn), tsn = str(d.tsn), vsn = str(d.vsn);
    const derivationWarnings=[];

    const bm=resolveBrandModel(d.d1, d.d3, d.maker, d.model);
    derivationWarnings.push(...bm.warnings);

    const pr=splitPowerRpm(d.p2_p4);
    if(pr.derived) derivationWarnings.push(mkWarn(['engine_power_kw','engine_rated_rpm'],
      'Leistung aus "'+str(d.p2_p4)+'" aufgeteilt in '+pr.kw+' kW und Nenndrehzahl '+pr.rpm+' U/min -- bitte prüfen.',
      'القدرة اشتُقت من "'+str(d.p2_p4)+'" وقُسّمت إلى '+pr.kw+' kW وسرعة دوران اسمية '+pr.rpm+' U/min -- يرجى التحقق.'
    ));
    // Cross-check the (possibly just-split) kW against the catalog's own
    // power_kw -- same conflict-or-confirm treatment as Hubraum below.
    const kwCheck=resolveNumericField('engine_power_kw', 'Leistung (kW)', 'القدرة (kW)', pr.kw, d.power_kw);
    if(kwCheck.conflict) derivationWarnings.push(kwCheck.warning);

    if(year) derivationWarnings.push(mkWarn('year',
      'Baujahr '+year+' wurde aus der Erstzulassung ('+firstReg+') abgeleitet, nicht bestätigt -- Erstzulassung ist nicht zwingend das Herstellungsjahr.',
      'سنة التصنيع '+year+' مُستَنتَجة من تاريخ أول تسجيل ('+firstReg+') وغير مؤكدة -- تاريخ أول التسجيل ليس بالضرورة سنة التصنيع الفعلية.'
    ));

    // Hubraum: p1 is read from THIS document; ccm is looked up from the
    // KBA catalog by HSN/TSN. Never silently prefer either on conflict.
    const ccmCheck=resolveNumericField('engine_displacement_cm3', 'Hubraum (cm³)', 'سعة المحرك (سم³)', d.p1, d.ccm);
    if(ccmCheck.conflict) derivationWarnings.push(ccmCheck.warning);

    // Leermasse (G) vs zulässige Gesamtmasse (F.1): a vehicle's empty/curb
    // weight can NEVER legally or physically exceed its permissible gross
    // weight -- this holds for every vehicle, so it is safe to check
    // generally. F.1 has no catalog twin (it's read only from the
    // document), so this is a plausibility check, not a same-concept
    // conflict like Hubraum/Leistung above: the raw G value is kept
    // exactly as returned (for diagnosis against the real document) and
    // is never derived/guessed from part of the digits -- only flagged.
    const f1Num=parseFloat(str(d.f1).replace(',','.'));
    const gNum=parseFloat(str(d.g).replace(',','.'));
    if(!isNaN(f1Num) && !isNaN(gNum) && gNum>f1Num){
      derivationWarnings.push(mkWarn('unladenWeight',
        'Leermasse (G) "'+str(d.g)+'" kg ist größer als die zulässige Gesamtmasse (F.1) "'+str(d.f1)+'" kg -- technisch nicht möglich, der Wert ist wahrscheinlich fehlerhaft erkannt. Bitte im Original-Dokument prüfen; der Rohwert wird zur Diagnose angezeigt, aber nicht als gültiges Gewicht übernommen.',
        'الكتلة الفارغة (G) "'+str(d.g)+'" كغم أكبر من الكتلة الإجمالية المسموحة (F.1) "'+str(d.f1)+'" كغم -- هذا غير ممكن تقنيًا، على الأرجح أن القيمة قُرئت بشكل خاطئ من المزوّد. يرجى التحقق من المستند الأصلي؛ القيمة الخام مُعروضة للتشخيص فقط ولا تُعتمد كوزن صالح.'
      ));
    }

    // Fahrzeugklasse (J): flag an unrecognized code for review without
    // blocking or altering it -- some national documents may print a code
    // outside the common EU list above.
    if(str(d.j) && !isBlankish(d.j) && !VEHICLE_CLASS_RE.test(str(d.j))){
      derivationWarnings.push(mkWarn('vehicleClass',
        'Fahrzeugklasse "'+str(d.j)+'" entspricht keinem bekannten EU-Klassencode (z. B. M1, N1, L3e) -- bitte mit dem Fahrzeugschein abgleichen.',
        'فئة المركبة "'+str(d.j)+'" لا تطابق أي رمز فئة أوروبي معروف (مثل M1، N1، L3e) -- يرجى مطابقتها مع رخصة السيارة.'
      ));
    }

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
      hsn, tsn, vsn, kba: (hsn && tsn) ? (hsn+' '+tsn) : '',
      // F.1 (technisch zulässige Gesamtmasse) and F.2 (zulässige Gesamtmasse
      // im Zulassungsstaat) are two DIFFERENT certificate fields, not two
      // sources for the same fact -- they must never be merged/OR'd, so
      // maxWeight (F.1) is kept separate from maxWeightNational (F.2) below.
      maxWeight: str(d.f1),
      seats: str(d.s1),
      vehicleClass: str(d.j),
      // --- Newly-configured BASIC-package fields (2026-11-12) -- field
      // names/meanings taken from the provider's own OpenAPI schema
      // (component ScanResponseDe), not guessed from the printed license
      // codes. Kept as separate, honestly-labeled raw values; nothing here
      // is auto-corrected (e.g. `g` can look implausible on this document
      // but is preserved exactly as returned for the shop to verify).
      nextHu: str(d.hu), // "Datum der Hauptuntersuchung (HU)"
      tsnFull: str(d.field_2_2), // "Der Inhalt des Feld 2.2" (full HSN/TSN key string)
      vinCheckDigit: str(d.field_3), // "Prüfziffer zur VIN"
      typ1: str(d.d2_1), typ2: str(d.d2_2), typ3: str(d.d2_3), typ4: str(d.d2_4), // "Feld D2.1-4: Typ/Variante/Version"
      emissionClass: str(d.field_14), // "Bezeichnung der nationalen Emissionsklasse"
      emissionCode: str(d.field_14_1), // "Code zu V9 oder P9"
      specialNotes: str(d.field_22), // "Die Sondereintragungen"
      maxWeightNational: str(d.f2), // "Im Zulassungsstaat zulässige Gesamtmasse" (F.2, distinct from F.1)
      unladenWeight: str(d.g), // "Leermasse in KG" (G)
      tireAxle1: str(d.field_15_1), // "Bereifung Achse 1"
      tireAxle2: str(d.field_15_2), // "Bereifung Achse 2"
      dateK: str(d.field_6), // "Datum zu K" (K = Genehmigungsnummer)
      _derivationWarnings: derivationWarnings
    };
  }

  function buildWarnings(d, derivationWarnings){
    d=d||{};
    const w=(derivationWarnings||[]).slice();
    if(d.vin && d.vin_valid===false) w.push(mkWarn('vin',
      'VIN-Prüfziffer unsicher'+(d.vin_validation_msg?(': '+d.vin_validation_msg):''),
      'رقم تحقق الهيكل (VIN) غير مؤكد'+(d.vin_validation_msg?(': '+d.vin_validation_msg):'')
    ));
    if(d.hsn && d.hsn_valid===false) w.push(mkWarn('hsn',
      'HSN passt nicht zum Fahrzeugkatalog'+(d.hsn_validation_msg?(': '+d.hsn_validation_msg):''),
      'HSN لا يطابق كتالوج المركبات'+(d.hsn_validation_msg?(': '+d.hsn_validation_msg):'')
    ));
    if(d.tsn && d.tsn_valid===false) w.push(mkWarn('tsn',
      'TSN passt nicht zum Fahrzeugkatalog'+(d.tsn_validation_msg?(': '+d.tsn_validation_msg):''),
      'TSN لا يطابق كتالوج المركبات'+(d.tsn_validation_msg?(': '+d.tsn_validation_msg):'')
    ));
    if(d.plate && d.plate.valid===false) w.push(mkWarn('plate',
      'Kennzeichenformat nicht sicher erkannt',
      'تنسيق رقم اللوحة غير مؤكد'
    ));
    if(d.field_22_continued) w.push(mkWarn('specialNotes',
      'Feld 22 wird auf einem Beiblatt fortgesetzt (nicht mitgescannt)',
      'الحقل 22 يتواصل في صفحة إضافية (لم تُمسح)'
    ));
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

  W.Autosiastik={read, mapScan, buildWarnings, buildCutouts, rawTextFields, resolveBrandModel, splitPowerRpm, resolveNumericField, flattenForDisplay, isBlankish, warnFields};
})(window.WP=window.WP||{});
