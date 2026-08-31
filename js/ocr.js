/* Werkivo OCR: German Zulassungsbescheinigung Teil I */
(function(W){
  const MAKES=['VOLKSWAGEN','VW','BMW','MERCEDES-BENZ','MERCEDES','AUDI','OPEL','FORD','TOYOTA','RENAULT','PEUGEOT','CITROEN','SKODA','SEAT','FIAT','HYUNDAI','KIA','PORSCHE','MAZDA','NISSAN','HONDA','VOLVO','DACIA','TESLA','MINI','SMART','JEEP','SUZUKI','CUPRA'];

  function fieldAfter(text, keys){
    for(const k of keys){
      const re=new RegExp(k+'\\s*[:.]?\\s*([^\\n]{2,80})','i');
      const m=text.match(re);
      if(m) return m[1].replace(/\s{2,}/g,' ').trim();
    }
    return '';
  }
  function parse(text){
    const raw=String(text||'').replace(/\r/g,'\n');
    const t=raw.replace(/[ \t]+/g,' ').replace(/\n+/g,'\n');
    const upper=t.toUpperCase().replace(/O(?=[A-HJ-NPR-Z0-9]{16})/g,'0');
    const vinMatch=upper.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
    const plateMatch=upper.match(/\b([A-ZÄÖÜ]{1,3})[-\s]?([A-Z]{1,2})[-\s]?(\d{1,4}[EH]?)\b/);
    const plate=plateMatch ? (plateMatch[1]+'-'+plateMatch[2]+' '+plateMatch[3]) : '';
    const hsn=(upper.match(/\bHSN\s*[:.]?\s*(\d{4})\b/)||upper.match(/\b2\.1\s*[:.]?\s*(\d{4})\b/)||[])[1]||'';
    const tsn=(upper.match(/\bTSN\s*[:.]?\s*([A-Z0-9]{3})\b/)||upper.match(/\b2\.2\s*[:.]?\s*([A-Z0-9]{3})\b/)||[])[1]||'';
    const d1=fieldAfter(t,['D\\.1','Marke','Hersteller']);
    const d3=fieldAfter(t,['D\\.3','Handelsbezeichnung']);
    const makeFromList=MAKES.find(x=>upper.includes(x))||'';
    let make='';
    try{ make=(d1.match(new RegExp(MAKES.join('|'),'i'))||[makeFromList])[0] || d1.split(/[/,]/)[0].trim(); }catch(e){ make=makeFromList; }
    const model=(d3||'').replace(new RegExp('^'+String(make||'')+'\\s*','i'),'').trim();
    const yearMatch=t.match(/B\s*[:.]?\s*(\d{2}\.\d{2}\.(19|20)\d{2})/i) || t.match(/\b(\d{2}\.\d{2}\.(19|20)\d{2})\b/);
    const firstRegistration=yearMatch ? (yearMatch[1]||yearMatch[0]) : '';
    const year=firstRegistration.slice(-4);
    return {
      license_plate: plate,
      plate,
      vin: vinMatch? vinMatch[0] : '',
      brand: String(make||'').trim(),
      make: String(make||'').trim(),
      model: String(model||'').trim().slice(0,40),
      year,
      first_registration: firstRegistration,
      firstRegistration,
      owner_name: String(fieldAfter(t,['C\\.1\\.1','Halter','Name oder Firmenname'])||'').replace(/C\.1\.\d/g,'').trim(),
      address: fieldAfter(t,['C\\.1\\.3','Anschrift']),
      engine_displacement_cm3: (fieldAfter(t,['P\\.1','Hubraum']).match(/\d{3,5}/)||[''])[0],
      engine_power_kw: (fieldAfter(t,['P\\.2','Nennleistung']).match(/\d{2,3}/)||[''])[0],
      fuel_type: fieldAfter(t,['P\\.3','Kraftstoff']),
      color: fieldAfter(t,['R\\s','Farbe des Fahrzeugs']),
      paint: fieldAfter(t,['Farbe des Fahrzeugs']),
      engine_code: '',
      hsn, tsn,
      kba: (hsn&&tsn)? (hsn+' '+tsn):''
    };
  }
  function preprocess(file, mode){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      const url=URL.createObjectURL(file);
      img.onload=()=>{
        let w=img.width,h=img.height;
        const minSide=1600;
        if(Math.min(w,h)<minSide){
          const s=minSide/Math.min(w,h); w=Math.round(w*s); h=Math.round(h*s);
        }
        const max=2400;
        if(Math.max(w,h)>max){ const s=max/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s); }
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        const ctx=c.getContext('2d');
        ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
        ctx.drawImage(img,0,0,w,h);
        const data=ctx.getImageData(0,0,w,h);
        const d=data.data;
        let sum=0;
        for(let i=0;i<d.length;i+=4) sum+=d[i]*0.3+d[i+1]*0.59+d[i+2]*0.11;
        const avg=sum/(d.length/4);
        const contrast=mode==='binary'?1.7:1.45;
        for(let i=0;i<d.length;i+=4){
          let g=d[i]*0.3+d[i+1]*0.59+d[i+2]*0.11;
          g=(g-avg)*contrast+128;
          if(mode==='binary') g=g<130?0:255;
          else { g=g<28?0:g>230?255:g; }
          d[i]=d[i+1]=d[i+2]=g;
        }
        ctx.putImageData(data,0,0);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg',0.92));
      };
      img.onerror=reject;
      img.src=url;
    });
  }
  function merge(a,b){
    const pick=(x,y,ok)=>{
      x=String(x||'').trim(); y=String(y||'').trim();
      if(ok){ if(ok(x)) return x; if(ok(y)) return y; }
      return x||y||'';
    };
    a=a||{}; b=b||{};
    return {
      license_plate: pick(a.license_plate||a.plate, b.plate||b.license_plate, v=>/[A-ZÄÖÜ]{1,3}-?[A-Z]{1,2}\s?\d{1,4}/i.test(v)),
      vin: pick(a.vin, b.vin, v=>/^[A-HJ-NPR-Z0-9]{17}$/i.test(v)),
      brand: pick(a.brand||a.make, b.brand||b.make),
      model: pick(a.model, b.model),
      year: pick(a.year, b.year, v=>/^(19|20)\d{2}$/.test(v)),
      owner_name: pick(a.owner_name||a.holder, b.owner_name),
      address: pick(a.address, b.address),
      engine_displacement_cm3: pick(a.engine_displacement_cm3, b.engine_displacement_cm3),
      engine_power_kw: pick(a.engine_power_kw, b.engine_power_kw),
      fuel_type: pick(a.fuel_type, b.fuel_type),
      engine_code: pick(a.engine_code, b.engine_code),
      color: pick(a.color||a.paint, b.color||b.paint),
      first_registration: pick(a.first_registration||a.firstRegistration, b.first_registration||b.firstRegistration),
      hsn: pick(a.hsn, b.hsn),
      tsn: pick(a.tsn, b.tsn),
      kba: pick(a.kba, b.kba)
    };
  }
  function score(r){
    let n=0;
    if(r.vin && r.vin.length===17) n+=40;
    if(r.license_plate) n+=25;
    if(r.brand) n+=10;
    if(r.model) n+=8;
    if(r.owner_name) n+=7;
    if(r.hsn) n+=5;
    if(r.tsn) n+=5;
    return n;
  }
  async function tess(img, psm){
    if(!window.Tesseract) return '';
    const res=await Tesseract.recognize(img,'deu+eng',{
      tessedit_pageseg_mode: String(psm||6)
    });
    return (res&&res.data&&res.data.text)||'';
  }
  async function read(file){
    await (W.loadOcr? W.loadOcr(): Promise.resolve());
    const imgA=await preprocess(file,'contrast');
    const imgB=await preprocess(file,'binary');
    let cloud={};
    try{
      if(window.SUPABASE_URL && window.SUPABASE_KEY){
        const response=await fetch(`${window.SUPABASE_URL}/functions/v1/vehicle-ocr`,{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':window.SUPABASE_KEY,'Authorization':'Bearer '+window.SUPABASE_KEY},
          body:JSON.stringify({image:imgA,country:'DE',document:'Zulassungsbescheinigung Teil I'})
        });
        if(response.ok) cloud=await response.json();
      }
    }catch(e){ console.warn('ocr-cloud',e); }
    let text1='', text2='';
    try{ text1=await tess(imgA,6); }catch(e){}
    try{ text2=await tess(imgB,4); }catch(e){}
    const local=merge(parse(text1), parse(text2));
    const out=merge(cloud, local);
    out.ocrScore=score(out);
    out.ocrSource='werkivo-ocr';
    if(!out.vin && !out.license_plate) throw new Error('ocr-empty');
    return out;
  }
  W.OCR={parse,preprocess,merge,read,score};
})(window.WP=window.WP||{});
window.parseVehicleOCR=function(text){ return WP.OCR.parse(text); };
window.preprocessSchein=function(file){ return WP.OCR.preprocess(file,'contrast'); };
window.mergeSchein=function(a,b){ return WP.OCR.merge(a,b); };
