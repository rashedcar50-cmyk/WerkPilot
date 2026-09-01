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
    function ownerFromLines(src){
      const lines=String(src||'').split(/\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
      const isLabel=s=>/C\.?\s*1\.?\s*[123]|P\.?\s*C\.?\s*1|Vorname|Firmenname|Anschrift|Name oder|Amtliches|Kennzeichen|Zulassung|Fahrzeugschein|Bundesrepublik|Teil I|Halter/i.test(s||'');
      const isName=s=>{
        const x=String(s||'').replace(/^[\s.:°*P]+/,'').replace(/\(n\)/g,'').trim();
        if(x.length<2 || x.length>48) return false;
        if(isLabel(x)) return false;
        if(/\d{3,}/.test(x)) return false;
        const letters=(x.match(/[A-Za-zÄÖÜäöüß]/g)||[]).length;
        if(letters<4) return false;
        if(/Vorname|Anschrift|Firmenname|Kennzeichen|Zulassung|Elmenhorst|Nächste HU/i.test(x)) return false;
        return true;
      };
      const after=(i)=>{
        for(let k=1;k<=3 && i+k<lines.length;k++){
          const cand=lines[i+k].replace(/^C\.?\s*1\.?\s*[123]\s*/i,'').replace(/[°*]+/g,'').trim();
          if(isName(cand)) return cand;
        }
        return '';
      };
      let fam='', given='', street='', city='';
      for(let i=0;i<lines.length;i++){
        const L=lines[i];
        if(/C\.?\s*1\.?\s*1\b|Name oder Firmenname/i.test(L)){
          const same=L.replace(/^.*?C\.?\s*1\.?\s*1\s*/i,'').replace(/Name oder Firmenname/ig,'').trim();
          fam=isName(same)?same:after(i);
        }
        if(/C\.?\s*1\.?\s*2\b|Vorname/i.test(L) && !/C\.?\s*1\.?\s*1\b/.test(L)){
          const same=L.replace(/^.*?C\.?\s*1\.?\s*2\s*/i,'').replace(/Vorname\(n\)|Vornamen/ig,'').trim();
          given=isName(same)?same:after(i);
        }
        if(/C\.?\s*1\.?\s*3\b|Anschrift/i.test(L)){
          street=after(i);
          const nxt=lines[i+2]||'';
          if(/\d{5}/.test(nxt)) city=nxt;
          else if(/\d{5}/.test(lines[i+1]||'')) { city=lines[i+1]; if(!/\d/.test(street||'')) street=after(i); }
        }
      }
      if(!fam){
        const hit=lines.find(x=>/Scholty|ßek|[A-ZÄÖÜ][a-zäöüß]{3,}(sek|bek|mann|berg|hoff|witz)$/.test(x) && isName(x) && !/\d/.test(x));
        if(hit) fam=hit;
      }
      let name=[given,fam].filter(Boolean).join(' ').replace(/\s{2,}/g,' ').trim();
      const addr=[street,city].filter(Boolean).join(', ').replace(/\s{2,}/g,' ').trim();
      ownerFromLines._addr=addr;
      return name.slice(0,80);
    }
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
      owner_name: (function(){
        const n=ownerFromLines(raw);
        if(n && !/Vorname|C\.?\s*1|Anschrift|Firmenname/i.test(n)) return n;
        return '';
      })(),
      address: (function(){
        const a=ownerFromLines._addr||'';
        if(/\d{5}/.test(a)) return a;
        const plz=(raw.match(/([A-Za-zÄÖÜäöüß.\- ]+\s+\d+[A-Za-z]?\s*\n\s*\d{5}\s+[A-Za-zÄÖÜäöüß.\- ]+)/)||raw.match(/(\d{5}\s+[A-Za-zÄÖÜäöüß.\- ]{2,40})/)||[])[0];
        return (plz||a||'').replace(/\s+/g,' ').trim();
      })(),
      engine_displacement_cm3: (fieldAfter(t,['P\\.1','Hubraum']).match(/\d{3,5}/)||[''])[0],
      engine_power_kw: (fieldAfter(t,['P\\.2','Nennleistung']).match(/\d{2,3}/)||[''])[0],
      fuel_type: fieldAfter(t,['P\\.3','Kraftstoff']),
      color: fieldAfter(t,['Farbe des Fahrzeugs','\\bFarbe\\b','\\nR\\s+']),
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
  function qualityFromCanvas(ctx,w,h){
    const data=ctx.getImageData(0,0,w,h).data;
    let sum=0, sum2=0, n=w*h;
    for(let i=0;i<data.length;i+=4){
      const g=data[i]*0.3+data[i+1]*0.59+data[i+2]*0.11;
      sum+=g; sum2+=g*g;
    }
    const avg=sum/n, v=sum2/n-avg*avg;
    const issues=[];
    if(avg<45) issues.push('dark');
    if(avg>210) issues.push('bright');
    if(v<180) issues.push('flat');
    return {avg, variance:v, ok:issues.length===0, issues};
  }
  async function quality(file){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      const url=URL.createObjectURL(file);
      img.onload=()=>{
        const c=document.createElement('canvas');
        const s=Math.min(1, 640/Math.max(img.width,img.height));
        c.width=Math.max(8,Math.round(img.width*s)); c.height=Math.max(8,Math.round(img.height*s));
        const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,c.width,c.height);
        URL.revokeObjectURL(url);
        resolve(qualityFromCanvas(ctx,c.width,c.height));
      };
      img.onerror=reject; img.src=url;
    });
  }
  async function deviceText(file){
    try{
      if(typeof window.TextDetector!=='function') return '';
      const det=new TextDetector();
      const bmp=await createImageBitmap(file);
      const boxes=await det.detect(bmp);
      return (boxes||[]).map(b=>b.rawValue||b.cornerPoints&&'').filter(Boolean).join('\n');
    }catch(e){ return ''; }
  }
  function blobFromDataUrl(dataUrl){
    const m=String(dataUrl).split(',');
    const b=atob(m[1]||'');
    const u=new Uint8Array(b.length);
    for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i);
    return new Blob([u],{type:'image/jpeg'});
  }
  async function cropTop(file){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      const url=URL.createObjectURL(file);
      img.onload=()=>{
        const c=document.createElement('canvas');
        const w=img.width, h=Math.max(40,Math.round(img.height*0.48));
        c.width=w; c.height=h;
        const ctx=c.getContext('2d');
        ctx.drawImage(img,0,0,w,h,0,0,w,h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg',0.92));
      };
      img.onerror=reject; img.src=url;
    });
  }
  function fromAnyText(obj){
    const txt=[obj&&obj.raw_text,obj&&obj.text,obj&&obj.full_text,obj&&obj.ocr_text].filter(Boolean).join('\n');
    return txt?parse(txt):{};
  }
  function colorJpeg(file){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      const url=URL.createObjectURL(file);
      img.onload=()=>{
        let w=img.width,h=img.height;
        const max=1800;
        if(Math.max(w,h)>max){ const s=max/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s); }
        const c=document.createElement('canvas'); c.width=Math.max(1,w); c.height=Math.max(1,h);
        c.getContext('2d').drawImage(img,0,0,w,h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg',0.82));
      };
      img.onerror=reject; img.src=url;
    });
  }
  function normalizeCloud(js){
    if(!js || typeof js!=='object') return {};
    const d=js.data||js.result||js.fields||js;
    const get=(...keys)=>{
      for(const k of keys){
        const v=d[k] ?? js[k];
        if(v==null) continue;
        if(typeof v==='string' && v.trim()) return v.trim();
        if(typeof v==='object' && v.value) return String(v.value).trim();
      }
      return '';
    };
    const mapped={
      license_plate: get('license_plate','plate','kennzeichen','A','a'),
      vin: get('vin','fahrzeugidentifizierungsnummer','E','e'),
      brand: get('brand','make','marke','D.1','d1'),
      model: get('model','handelsbezeichnung','D.3','d3'),
      year: get('year','erstzulassung_year'),
      owner_name: get('owner_name','halter','holder','name','C.1.1','c11','c_1_1','given_name'),
      address: get('address','anschrift','C.1.3','c13'),
      engine_displacement_cm3: get('engine_displacement_cm3','hubraum','P.1','p1'),
      engine_power_kw: get('engine_power_kw','kw','P.2','p2'),
      fuel_type: get('fuel_type','kraftstoff','P.3','p3'),
      color: get('color','farbe','R'),
      first_registration: get('first_registration','erstzulassung','B','b'),
      hsn: get('hsn','2.1','hsn_2_1'),
      tsn: get('tsn','2.2','tsn_2_2')
    };
    const given=get('C.1.2','c12','vornamen','first_name');
    if(given && mapped.owner_name && !mapped.owner_name.includes(given)) mapped.owner_name=(given+' '+mapped.owner_name).trim();
    else if(given && !mapped.owner_name) mapped.owner_name=given;
    return merge(mapped, fromAnyText(js));
  }
  async function spaceRead(img){
    try{
      const key=(window.db && db.settings && db.settings.ocrSpaceKey) || 'K81772188988957';
      const body=new URLSearchParams();
      body.set('base64Image', img.indexOf('data:')===0?img:('data:image/jpeg;base64,'+img));
      body.set('language','ger');
      body.set('isOverlayRequired','false');
      body.set('OCREngine','2');
      body.set('scale','true');
      body.set('detectOrientation','true');
      const controller=new AbortController();
      const to=setTimeout(()=>controller.abort(), 12000);
      const res=await fetch('https://api.ocr.space/parse/image',{
        method:'POST', signal:controller.signal,
        headers:{apikey:key,'Content-Type':'application/x-www-form-urlencoded'},
        body:body.toString()
      });
      clearTimeout(to);
      const js=await res.json().catch(()=>({}));
      const text=((js.ParsedResults||[]).map(r=>r.ParsedText||'').join('\n')) || '';
      return text?parse(text):{};
    }catch(e){ console.warn('ocr-space', e); return {}; }
  }
  async function cloudRead(img){
    if(!window.SUPABASE_URL || !window.SUPABASE_KEY) return {};
    const controller=new AbortController();
    const to=setTimeout(()=>controller.abort(), 15000);
    try{
      const response=await fetch(`${window.SUPABASE_URL}/functions/v1/vehicle-ocr`,{
        method:'POST', signal:controller.signal,
        headers:{'Content-Type':'application/json','apikey':window.SUPABASE_KEY,'Authorization':'Bearer '+window.SUPABASE_KEY},
        body:JSON.stringify({
          image:img, country:'DE',
          document:'Zulassungsbescheinigung Teil I',
          fields:['C.1.1','C.1.2','C.1.3','A','B','D.1','D.3','E','2.1','2.2','P.1','P.2']
        })
      });
      clearTimeout(to);
      const js=await response.json().catch(()=>({}));
      if(!response.ok){ console.warn('vehicle-ocr', js); return fromAnyText(js); }
      return normalizeCloud(js);
    }catch(e){ clearTimeout(to); console.warn('ocr-cloud',e); return {}; }
  }
  async function read(file){
    const q=await quality(file);
    if(!q.ok) console.warn('ocr-quality', q.issues);
    const imgColor=await colorJpeg(file);
    const imgA=await preprocess(file,'contrast');
    const [cloud, space, device] = await Promise.all([
      cloudRead(imgColor),
      spaceRead(imgColor),
      deviceText(file)
    ]);
    let local=merge(space, parse(device));
    let out=merge(local, cloud);
    if(!out.owner_name || !(out.vin||out.license_plate)){
      try{
        await (W.loadOcr? W.loadOcr(): Promise.resolve());
        const top=await cropTop(file);
        const text=await Promise.race([
          tess(out.owner_name?imgA:top, 4),
          new Promise((_,rej)=>setTimeout(()=>rej(new Error('tess-timeout')), 10000))
        ]).catch(()=>'');
        local=merge(local, parse(text));
        out=merge(out, local);
      }catch(e){}
    }
    if(!out.year && out.first_registration) out.year=String(out.first_registration).slice(-4);
    out.ocrScore=score(out);
    out.ocrSource='max';
    out.ocrQuality=q;
    if(!out.vin && !out.license_plate) throw new Error(q.ok?'ocr-empty':'ocr-photo-quality');
    return out;
  }
  W.OCR={parse,preprocess,merge,read,score,quality};
})(window.WP=window.WP||{});
window.parseVehicleOCR=function(text){ return WP.OCR.parse(text); };
window.preprocessSchein=function(file){ return WP.OCR.preprocess(file,'contrast'); };
window.mergeSchein=function(a,b){ return WP.OCR.merge(a,b); };
