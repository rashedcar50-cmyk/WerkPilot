/* Autosiastik Fahrzeugschein-Scanner integration (client side).
   Calls the Supabase edge function `autosiastik-scan`, which holds
   AUTOSIASTIK_ACCESS_KEY server-side -- this file never sees that key.
   See https://api.fahrzeugschein-scanner.de/redoc for the upstream schema. */
(function(W){
  function str(v){ return v==null ? '' : String(v).trim(); }

  // Maps the upstream ScanResponseDe fields onto WerkPilot's internal
  // vehicle/customer field names. Values are kept exactly as returned
  // (hsn/tsn/plate/vin are strings in the API, so leading zeros survive);
  // nothing here invents a value for a field the API returned null/empty.
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
    return {
      license_plate: plate, plate,
      vin: str(d.vin).toUpperCase(),
      brand: str(d.d1), make: str(d.d1),
      model: str(d.d3),
      year,
      first_registration: firstReg, firstRegistration: firstReg,
      owner_name: ownerName,
      address,
      engine_displacement_cm3: str(d.p1),
      engine_power_kw: str(d.p2_p4),
      fuel_type: str(d.p3),
      color: str(d.r), paint: str(d.r),
      hsn, tsn, kba: (hsn && tsn) ? (hsn+' '+tsn) : '',
      maxWeight: str(d.f1) || str(d.f2),
      seats: str(d.s1),
      vehicleClass: str(d.j)
    };
  }

  function buildWarnings(d){
    d=d||{};
    const w=[];
    if(d.vin && d.vin_valid===false) w.push('VIN-Prüfziffer unsicher'+(d.vin_validation_msg?(': '+d.vin_validation_msg):''));
    if(d.hsn && d.hsn_valid===false) w.push('HSN passt nicht zum Fahrzeugkatalog'+(d.hsn_validation_msg?(': '+d.hsn_validation_msg):''));
    if(d.tsn && d.tsn_valid===false) w.push('TSN passt nicht zum Fahrzeugkatalog'+(d.tsn_validation_msg?(': '+d.tsn_validation_msg):''));
    if(d.plate && d.plate.valid===false) w.push('Kennzeichenformat nicht sicher erkannt');
    if(d.field_22_continued) w.push('Feld 22 wird auf einem Beiblatt fortgesetzt (nicht mitgescannt)');
    return w;
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
    mapped.validationWarnings=buildWarnings(d);
    mapped.cutouts=buildCutouts(d);
    mapped.kbaFound=(d.kba_found===true);
    mapped.documentId=str(d.document_id);
    return mapped;
  }

  W.Autosiastik={read, mapScan, buildWarnings, buildCutouts};
})(window.WP=window.WP||{});
