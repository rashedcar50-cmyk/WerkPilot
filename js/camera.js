/* Camera + WhatsApp ingest */
async function openCameraForPurchase(onCapture){
  return openProCamera({ onFile:onCapture, title:t('scanPurchase') });
}
async function openProCamera(opts){
  opts=opts||{};
  if(typeof opts==='string') opts={target:opts};
  if(opts.target) window._camInput=opts.target;
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    return toast(t('camUnsupported')||t('openCam'));
  }
  document.querySelectorAll('.procam').forEach(n=>n.remove());
  const box=document.createElement('div');
  box.className='procam';
  box.innerHTML=`
    <div class="procam-stage">
      <video id="pcVideo" autoplay playsinline muted></video>
      <div class="procam-mask"><div class="procam-frame"></div></div>
      <div class="procam-hint">${t('alignSchein')}</div>
    </div>
    <div class="procam-bar">
      <button type="button" class="ico-btn" id="pcClose">✕</button>
      <button type="button" class="ico-btn" id="pcFlash">⚡</button>
      <button type="button" class="procam-shutter" id="pcShot" aria-label="Capture"></button>
      <input type="range" id="pcZoom" min="1" max="3" step="0.1" value="1">
    </div>
    <div class="procam-review hidden" id="pcReview">
      <img id="pcPrev" alt="">
      <div class="procam-bar">
        <button type="button" class="btn" id="pcRetake">${t('retake')}</button>
        <button type="button" class="btn primary" id="pcUse">${t('usePhoto')}</button>
      </div>
    </div>`;
  document.body.appendChild(box);
  const video=box.querySelector('#pcVideo');
  if(video){
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    video.muted=true;
    video.setAttribute('muted','');
    video.autoplay=true;
  }
  let stream=null, track=null, blobFile=null;
  const stop=()=>{ try{ if(stream) stream.getTracks().forEach(tr=>tr.stop()); }catch(e){} };
  const close=()=>{ stop(); box.remove(); };
  try{
    stream=await navigator.mediaDevices.getUserMedia({
      audio:false,
      video:{ facingMode:{ideal:'environment'}, width:{ideal:1920}, height:{ideal:1080} }
    }).catch(()=>navigator.mediaDevices.getUserMedia({ audio:false, video:{ facingMode:'environment' } }));
    video.srcObject=stream;
    await new Promise(res=>{
      if(video.readyState>=2) return res();
      video.onloadedmetadata=()=>res();
      setTimeout(res, 800);
    });
    try{ await video.play(); }catch(e){}
    track=stream.getVideoTracks()[0];
    const caps=track.getCapabilities ? track.getCapabilities() : {};
    if(caps.zoom){
      const z=box.querySelector('#pcZoom');
      z.min=caps.zoom.min||1; z.max=Math.min(caps.zoom.max||3,4); z.value=caps.zoom.min||1;
      z.oninput=()=>{ try{ track.applyConstraints({advanced:[{zoom:Number(z.value)}]}); }catch(e){} };
    } else box.querySelector('#pcZoom').style.display='none';
    const flash=box.querySelector('#pcFlash');
    if(!(caps.torch)) flash.style.opacity='.35';
    let torch=false;
    flash.onclick=async()=>{
      if(!(caps.torch)) return toast(t('noFlash'));
      torch=!torch;
      try{ await track.applyConstraints({advanced:[{torch}]}); flash.classList.toggle('on',torch); }catch(e){}
    };
    box.querySelector('#pcClose').onclick=close;
    const captureStill=async()=>{
      let blob=null;
      try{
        if(window.ImageCapture && track){
          const ic=new ImageCapture(track);
          blob=await ic.takePhoto();
        }
      }catch(e){}
      if(!blob){
        const c=document.createElement('canvas');
        c.width=video.videoWidth||1920; c.height=video.videoHeight||1080;
        c.getContext('2d').drawImage(video,0,0);
        blob=await new Promise(res=>c.toBlob(res,'image/jpeg',0.92));
      }
      blobFile=new File([blob],'fahrzeugschein.jpg',{type:blob.type||'image/jpeg'});
      box.querySelector('#pcPrev').src=URL.createObjectURL(blobFile);
      box.querySelector('#pcReview').classList.remove('hidden');
    };
    box.querySelector('#pcShot').onclick=captureStill;
    box.querySelector('#pcRetake').onclick=()=>{
      blobFile=null;
      box.querySelector('#pcReview').classList.add('hidden');
    };
    box.querySelector('#pcUse').onclick=()=>{
      if(!blobFile) return;
      if(typeof opts.onFile==='function'){ opts.onFile(blobFile); close(); toast(t('shotOk')); return; }
      const dt=new DataTransfer(); dt.items.add(blobFile);
      const input=document.querySelector(window._camInput||opts.target||'#doc') || document.querySelector('#vphoto,#scanInvFile,#purchaseFile,#phBefore');
      if(input){ input.files=dt.files; input.dispatchEvent(new Event('change',{bubbles:true})); }
      close(); toast(t('shotOk'));
    };
  }catch(e){
    close();
    toast(t('camDenied'));
    console.error(e);
  }
}
window.openProCamera=openProCamera;
window.openCamera=function(target){ return openProCamera({target:typeof target==='string'?target:'#doc'}); };
async function ingestScheinFile(file){
  if(!file) return;
  if(window._scheinBusy) return;
  window._scheinBusy=true;
  if(/heic|heif/i.test(file.type||file.name||'')) toast(t('ocrHint')||'HEIC');
  if($('#ocrStatus')) $('#ocrStatus').textContent=t('readingSchein')||t('readingAI');
  toast(t('readingSchein')||t('readingAI'));
  try{
    let ai=await (window.WP&&WP.OCR&&WP.OCR.read? WP.OCR.read(file): readScheinAI(file));
    if(WP.OCR && WP.OCR.stripDemo) ai=WP.OCR.stripDemo(ai||{});
    if($('#n')||$('#vplate')) applyScheinToCustomerForm(ai);
    if($('#pl')&&$('#vin')){
      if(ai.license_plate||ai.plate) $('#pl').value=ai.license_plate||ai.plate;
      if(ai.vin) $('#vin').value=ai.vin;
      if($('#hsn')&&ai.hsn) $('#hsn').value=ai.hsn;
      if($('#tsn')&&ai.tsn) $('#tsn').value=ai.tsn;
      if($('#mk')&&(ai.brand||ai.make)) $('#mk').value=ai.brand||ai.make;
      if($('#mo')&&ai.model) $('#mo').value=ai.model;
      if($('#yr')&&ai.year) $('#yr').value=ai.year;
      if($('#cc')&&ai.engine_displacement_cm3) $('#cc').value=ai.engine_displacement_cm3;
      if($('#kw')&&ai.engine_power_kw) $('#kw').value=ai.engine_power_kw;
      if($('#fuel')&&ai.fuel_type) $('#fuel').value=ai.fuel_type;
      if($('#pa')&&(ai.color||ai.paint)) $('#pa').value=ai.color||ai.paint;
      if($('#en')&&(ai.engine||ai.engine_code)) $('#en').value=ai.engine||ai.engine_code;
      if($('#vmaxw')&&ai.maxWeight) $('#vmaxw').value=ai.maxWeight;
      if($('#vseats')&&ai.seats) $('#vseats').value=ai.seats;
      if($('#vklass')&&ai.vehicleClass) $('#vklass').value=ai.vehicleClass;
    }
    if(!$('#n') && !($('#pl')&&$('#vin'))){
      const {c,v}=findOrCreateFromSchein(ai);
      vehicleModal(Object.assign({},v,{customerId:c&&c.id}));
    }
    const src=ai.ocrSource==='server'?'Server':(ai.ocrSource==='openai'?'OpenAI GPT-4o-mini':(ai.ocrSource||'OCR'));
    toast((t('scheinFilled')||t('saved'))+' · '+src);
    if($('#ocrStatus')) $('#ocrStatus').textContent=(t('scheinFilled')||'')+' · '+src;
  }catch(e){ console.warn(e); toast(t('readFailClear')||t('ocrFailSchein')); }
  finally{ window._scheinBusy=false; }
}
window.ingestScheinFile=ingestScheinFile;
function pickWhatsApp(sel){
  window._camInput=sel||'#doc';
  try{ sessionStorage.setItem('waTarget', window._camInput); }catch(e){}
  let inp=document.getElementById('waPickInput');
  if(!inp){
    inp=document.createElement('input');
    inp.id='waPickInput';
    inp.type='file';
    inp.accept='image/*';
    inp.className='hidden';
    document.body.appendChild(inp);
    inp.addEventListener('change', async function(){
      const f=this.files&&this.files[0];
      if(!f) return;
      const target=document.querySelector(window._camInput||'#doc');
      let forwarded=false;
      if(target){
        try{ const dt=new DataTransfer(); dt.items.add(f); target.files=dt.files; target.dispatchEvent(new Event('change',{bubbles:true})); forwarded=true; }catch(e){}
      }
      if(!forwarded && !window._scheinBusy) await ingestScheinFile(f);
      this.value='';
    });
  }
  toast(t('waPickHint')||t('fromWhatsApp'));
  inp.click();
}
window.pickWhatsApp=pickWhatsApp;
function applySharedFileTo(sel){
  const file=window._sharedWaFile; if(!file) return false;
  try{ sel=sel||sessionStorage.getItem('waTarget')||'#doc'; }catch(e){ sel=sel||'#doc'; }
  const input=document.querySelector(sel||'#doc');
  if(!input) return false;
  const dt=new DataTransfer(); dt.items.add(file);
  input.files=dt.files;
  input.dispatchEvent(new Event('change',{bubbles:true}));
  window._sharedWaFile=null;
  return true;
}
window.applySharedFileTo=applySharedFileTo;
async function consumeSharedWhatsApp(){
  try{
    const cache=await caches.open('share-inbox');
    const res=await cache.match('latest');
    if(!res) return false;
    const blob=await res.blob();
    await cache.delete('latest');
    window._sharedWaFile=new File([blob],'whatsapp.jpg',{type:blob.type||'image/jpeg'});
    return true;
  }catch(e){ return false; }
}
window.consumeSharedWhatsApp=consumeSharedWhatsApp;

