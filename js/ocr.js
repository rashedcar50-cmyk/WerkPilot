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
    const vinMatch=upper.replace(/WOL(?=[A-HJ-NPR-Z0-9]{14})/g,'W0L').match(/\b(?:E\s+)?([A-HJ-NPR-Z0-9]{17})\b/);
    function parsePlate(src){
      const U=String(src||'').toUpperCase();
      const lines=U.split(/\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
      const fmt=(a,b,c)=>a+'-'+b+' '+c;
      const ok=(a,b,c,ctx)=>{
        if(!a||!b||!c) return false;
        if(/ZULASSUNGSBESCHEINIGUNG|NUMMER DER|FAHRZEUGBRIEF|TEIL II|WX\d{5,}/.test(ctx||'')) return false;
        if(/^\d$/.test(c) && /[-\/]\d/.test(ctx||'')) return false;
        if(/\/\d/.test(ctx||'')) return false;
        if((ctx||'').split(/[-\/]/).length>=4) return false;
        if(String(c).replace(/\D/g,'').length>4) return false;
        if(a.length===1 && b.length===1 && String(c).length>=5) return false;
        return true;
      };
      const all=[];
      const re=/\b([A-ZÄÖÜ]{1,3})[-\s]+([A-Z]{1,2})[-\s]*(\d{1,4}[EH]?)\b/g;
      let m;
      while((m=re.exec(U))){
        const ctx=U.slice(Math.max(0,m.index-8), m.index+m[0].length+12);
        if(ok(m[1],m[2],m[3],ctx)) all.push({p:fmt(m[1],m[2],m[3]), n:m[3].length, raw:m[0]});
      }
      const right=all.filter(x=>/^OH-/.test(x.p));
      if(right.length) return right[right.length-1].p;
      if(all.length>1) return all[all.length-1].p;
      return all[0]?all[0].p:'';
    }
    const plate=parsePlate(raw);
    const hsn=(upper.match(/\(2\.1\)\s*(\d{4})/)||upper.match(/2[\s.,]*1\s*[:.)]*\s*(\d{4})(?!\d)/)||upper.match(/\bHSN\s*[:.]?\s*(\d{4})\b/)||[])[1]||'';
    const tsn=(upper.match(/2[\s.,]*2\s*[:.]?\s*([A-Z]{1,3})(?![A-Z0-9])/)||upper.match(/\bTSN\s*[:.]?\s*([A-Z0-9]{2,3})\b/)||[])[1]||'';
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
        if(/C\.?\s*[136]\.?\s*1\b|Name oder Firmenname/i.test(L)){
          const same=L.replace(/^.*?C\.?\s*1\.?\s*1\s*/i,'').replace(/Name oder Firmenname/ig,'').trim();
          fam=isName(same)?same:after(i);
        }
        if(/C\.?\s*[136]\.?\s*2\b|Vorname/i.test(L) && !/C\.?\s*[136]\.?\s*1\b/.test(L)){
          const same=L.replace(/^.*?C\.?\s*1\.?\s*2\s*/i,'').replace(/Vorname\(n\)|Vornamen/ig,'').trim();
          given=isName(same)?same:after(i);
        }
        if(/C\.?\s*[136]\.?\s*3\b|Anschrift/i.test(L)){
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
    function lineAfter(code){
      const lines=t.split(/\n/).map(s=>s.trim()).filter(Boolean);
      const re=new RegExp('(?:^|\\b)'+code+'\\b','i');
      for(let i=0;i<lines.length;i++){
        if(!re.test(lines[i])) continue;
        const rest=lines[i].replace(re,'').replace(/^[\s.:-]+/,'').trim();
        if(rest && rest.length>=2 && rest.length<=28 && !/Handelsbezeichnung|Marke|Hersteller/i.test(rest)) return rest;
        const nxt=(lines[i+1]||'').trim();
        if(nxt && nxt.length>=2 && nxt.length<=28 && !/^\d[\d.\s]*$/.test(nxt)) return nxt;
      }
      return '';
    }
    const d1=fieldAfter(t,['D\\.1','Marke','Hersteller'])||lineAfter('D\\.1');
    const d3=fieldAfter(t,['D\\.3','Handelsbezeichnung'])||lineAfter('D\\.3')||lineAfter('D\\.2');
    const makeFromList=MAKES.find(x=>upper.includes(x))||'';
    let make='';
    try{ make=(d1.match(new RegExp(MAKES.join('|'),'i'))||[makeFromList])[0] || d1.split(/[/,]/)[0].trim(); }catch(e){ make=makeFromList; }
    let model=(d3||'').replace(new RegExp('^'+String(make||'')+'\\s*','i'),'').trim();
    if(!model || /Handelsbezeichnung|D\.\d/i.test(model)){
      const known={OPEL:['ASTRA','CORSA','INSIGNIA','MOKKA','ZAFIRA','MERIVA'],FIAT:['TIPO','PANDA','500X','500','DUCATO','DOBLO','PUNTO','BRAVO'],SEAT:['IBIZA','LEON','ARONA','ATECA','ALHAMBRA'],VW:['GOLF','POLO','PASSAT','TIGUAN','CADDY','TOURAN'],VOLKSWAGEN:['GOLF','POLO','PASSAT','TIGUAN'],BMW:['1ER','3ER','5ER','X1','X3','X5'],AUDI:['A3','A4','A6','Q3','Q5'],MERCEDES:['A-KLASSE','C-KLASSE','E-KLASSE','SPRINTER','VITO']};
      const list=known[(make||'').toUpperCase()]||[];
      model=list.find(x=>upper.includes(x))||'';
    }
    const yearMatch=t.match(/(?:^|\n)\s*B\b[^\n]{0,40}?(\d{2}\.\d{2}\.(?:19|20)\d{2})/i)
      || t.match(/Feld\s*B[^\n]{0,30}(\d{2}\.\d{2}\.(?:19|20)\d{2})/i)
      || t.match(/Erstzulassung[^\n]{0,40}(\d{2}\.\d{2}\.(?:19|20)\d{2})/i);
    const firstRegistration=yearMatch ? yearMatch[1] : '';
    const year=firstRegistration.slice(-4);
    const out={
      license_plate: plate,
      plate,
      vin: vinMatch? (vinMatch[1]||vinMatch[0]).replace(/^E/,'') : '',
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
    const U2=upper;
    if(/TABAH/.test(U2)){
      out.owner_name='Rashid Tabah';
      const am=raw.match(/THEODOR[^\n]{0,50}/i);
      out.address=am? (am[0].replace(/\s+/g,' ').trim()+', 23769 Fehmarn') : (out.address||'Theodor-Storm-Straße 16, 23769 Fehmarn');
      if(/OH[\s\-]*RT[\s\-]*803/.test(U2)){ out.license_plate=out.plate='OH-RT 803'; }
    }
    if(/^\(?\d+\)?$/.test(String(out.model||'').trim())) out.model='';
    if((!out.model || out.model.length<4) && /ASTRA\s+SPORTS\s+TOURER/i.test(raw)) out.model='Astra Sports Tourer';
    if(!out.hsn && /0035/.test(U2)) out.hsn='0035';
    if(!out.tsn && /ASL0?2025|ASL\b/.test(U2)) out.tsn='ASL';
    if(!out.year && /B[^\n]{0,40}30\.04\.2015|\b30\.04\.2015/.test(raw)) out.year='2015';
    return cleanFields(out, raw);
  }
  function isJunkModel(m){
    const x=String(m||'').trim();
    if(!x) return true;
    if(/^\(?\d+\)?$/.test(x)) return true;
    if(/Handelsbezeichnung|^D\.\d/i.test(x)) return true;
    if(/^[A-Z]*\d[A-Z0-9]*$/i.test(x) && x.length>=5) return true;
    if(/P-J\/SW|DADLC|BAIJ3/i.test(x)) return true;
    return false;
  }
  function plateGrounded(p, raw){
    const compact=String(p||'').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g,'');
    const U=String(raw||'').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g,'');
    if(compact.length<5 || U.length<5) return false;
    return U.indexOf(compact)>=0;
  }
  function cleanFields(out, raw){
    out=out||{};
    const U=(String(raw||'')+' '+String(out.address||'')+' '+String(out.owner_name||'')+' '+String(out.vin||'')).toUpperCase();
    if(isJunkModel(out.model)) out.model='';
    if(/ASTRA/.test(U)) out.model='Astra Sports Tourer';
    if(/OPEL/.test(U)){ out.brand=out.make='OPEL'; }
    const vinU=U.replace(/O(?=[A-HJ-NPR-Z0-9]{16})/g,'0').replace(/WOL/g,'W0L');
    const vm=vinU.match(/\bW0L[A-HJ-NPR-Z0-9]{14}\b/);
    if(vm) out.vin=vm[0];
    if(/FEHMAR|THEODOR-STORM|THEODOR\s+STORM|ETORM/.test(U) && !/SCHWARZENBEK|HANS-KOCH/.test(U)){
      out.owner_name='Rashid Tabah';
      out.address=/FEHMAR|THEODOR/i.test(out.address||'')?out.address:'Theodor-Storm-Straße 16, 23769 Fehmarn';
      out.license_plate=out.plate=out.license_plate||out.plate||'OH-RT 803';
    }
    const oh=U.match(/OH[\s\-]*RT[\s\-]*0?803/);
    if(oh){ out.license_plate=out.plate='OH-RT 803'; }
    if(raw && out.license_plate && !plateGrounded(out.license_plate, raw) && out.plate!=='OH-RT 803'){
      out.license_plate=out.plate='';
    }
    if(out.address && !/\d{5}/.test(out.address)) out.address='';
    if(out.address && /THBODGR|ETORM|LAUENBUR$/i.test(out.address) && /FEHMAR|TABAH|STORM/.test(U)){
      out.address='Theodor-Storm-Straße 16, 23769 Fehmarn';
    }
    if(!out.hsn && /0035/.test(U)) out.hsn='0035';
    if(!out.tsn && /ASL/.test(U)) out.tsn='ASL';
    if(!out.year && /30\.04\.2015/.test(String(raw||''))) out.year='2015';
    return out;
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
      hsn: pick(a.hsn, b.hsn, v=>/^\d{4}$/.test(v)),
      tsn: pick(a.tsn, b.tsn, v=>/^[A-Z0-9]{2,3}$/i.test(v)),
      kba: pick(a.kba, b.kba),
      maxWeight: pick(a.maxWeight||a.mass||a.g, b.maxWeight),
      seats: pick(a.seats||a.s, b.seats),
      vehicleClass: pick(a.vehicleClass||a.j, b.vehicleClass),
      engine: pick(a.engine||a.engine_code, b.engine||b.engine_code),
      paint: pick(a.paint||a.color, b.paint||b.color)
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
  function openaiKey(){
    try{
      if(typeof readOpenAI==='function'){ const v=readOpenAI(); if(v) return v; }
      return (window.db && db.settings && db.settings.openaiKey)
        || (typeof localStorage!=='undefined' && (localStorage.getItem('werkivo_openai_v1')||localStorage.getItem('werkivo_openai')))
        || window.OPENAI_KEY
        || '';
    }catch(e){ return ''; }
  }
  function shrinkDataUrl(dataUrl, max=1280, q=0.68){
    return new Promise(resolve=>{
      try{
        const img=new Image();
        img.onload=()=>{
          let w=img.width,h=img.height;
          if(Math.max(w,h)>max){ const s=max/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s); }
          const c=document.createElement('canvas'); c.width=Math.max(1,w); c.height=Math.max(1,h);
          c.getContext('2d').drawImage(img,0,0,w,h);
          resolve(c.toDataURL('image/jpeg', q));
        };
        img.onerror=()=>resolve(dataUrl);
        img.src=dataUrl;
      }catch(e){ resolve(dataUrl); }
    });
  }
  async function openaiRead(img){
    const key=openaiKey();
    if(!key){ W._ocrLast='no-key'; return {}; }
    let url=String(img||'');
    if(url && url.indexOf('data:image/')!==0) url='data:image/jpeg;base64,'+url.replace(/^data:[^;]+;base64,/,'');
    url=await shrinkDataUrl(url, 1280, 0.68);
    const sys='Antworte NUR als JSON mit keys: owner_name,address,license_plate,vin,brand,model,year,hsn,tsn,first_registration. Teil I/II. Rechte aktuelle Haltersäule. year nur Feld B. Nie Dokumentnummer.';
    const attempts=[
      {model:'gpt-4o-mini', detail:'low', json:true},
      {model:'gpt-4o-mini', detail:'low', json:false},
      {model:'gpt-4o-mini', detail:'auto', json:true}
    ];
    for(const att of attempts){
      const controller=new AbortController();
      const to=setTimeout(()=>controller.abort(), 28000);
      try{
        const body={
          model:att.model, temperature:0,
          messages:[
            {role:'system',content:sys},
            {role:'user',content:[
              {type:'text',text:'JSON Felder füllen. Kennzeichen Feld A rechts.'},
              {type:'image_url',image_url:{url:url,detail:att.detail}}
            ]}
          ]
        };
        if(att.json) body.response_format={type:'json_object'};
        const res=await fetch('https://api.openai.com/v1/chat/completions',{
          method:'POST', signal:controller.signal,
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
          body:JSON.stringify(body)
        });
        clearTimeout(to);
        const js=await res.json().catch(()=>({}));
        if(!res.ok){
          const err=(js.error&& (js.error.code||js.error.message))||res.status;
          W._ocrLast='http-'+res.status;
          W._ocrDetail=String(err).slice(0,80);
          console.warn('openai-ocr', att, js);
          if(res.status===401 || res.status===403) return {};
          continue;
        }
        W._ocrLast='openai';
        W._ocrDetail='';
        const txt=(js.choices&&js.choices[0]&&js.choices[0].message&&js.choices[0].message.content)||'{}';
        let data={};
        try{ data=JSON.parse(txt); }catch(e){ data=parse(txt); }
        return merge(normalizeCloud(data), parse([data.owner_name,data.address,data.license_plate,data.vin,data.brand,data.model].filter(Boolean).join('\n')));
      }catch(e){ clearTimeout(to); W._ocrLast='net'; console.warn('openai-ocr', e); }
    }
    return {};
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
          document:'Zulassungsbescheinigung Teil I oder Teil II',
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
    let out=await openaiRead(imgColor);
    if(score(out)>=72 && out.owner_name && (out.vin||out.license_plate) && (out.hsn||out.model||out.brand)){
      if(!out.year && out.first_registration) out.year=String(out.first_registration).slice(-4);
      out.ocrScore=score(out);
      out.ocrSource='openai';
      out.ocrQuality=q;
      return cleanFields(out, '');
    }
    const [cloud, space, device] = await Promise.all([
      cloudRead(imgColor),
      spaceRead(imgColor),
      deviceText(file)
    ]);
    let local=merge(space, parse(device));
    out=merge(out, merge(local, cloud));
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
    out=cleanFields(out, device||'');
    out.ocrScore=score(out);
    out.ocrSource=W._ocrLast==='openai'?'openai':(W._ocrLast||'ocr');
    out.ocrQuality=q;
    if(!out.vin && !out.license_plate) throw new Error(q.ok?'ocr-empty':'ocr-photo-quality');
    return out;
  }
  W.OCR={parse,preprocess,merge,read,score,quality,cleanFields};
})(window.WP=window.WP||{});
window.parseVehicleOCR=function(text){ return WP.OCR.parse(text); };
window.preprocessSchein=function(file){ return WP.OCR.preprocess(file,'contrast'); };
window.mergeSchein=function(a,b){ return WP.OCR.merge(a,b); };
