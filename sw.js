const CACHE='baymeister-v1.12.85';
const PRECACHE=[
  './','./index.html','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png',
  './css/app.css?v=1.12.85','./i18n.js?v=1.12.85','./supabase-config.js',
  './js/config.js?v=1.12.85','./js/engine.js?v=1.12.85','./js/core.js?v=1.12.85','./js/ocr.js?v=1.12.85','./js/cloud.js?v=1.12.85',
  './js/lookup.js?v=1.12.85','./js/quality.js?v=1.12.85','./js/scan.js?v=1.12.85','./js/invoice-print.js?v=1.12.85','./js/print.js?v=1.12.85','./js/camera.js?v=1.12.85','./js/customers.js?v=1.12.85','./js/repairs.js?v=1.12.85','./js/invoice-edit.js?v=1.12.85','./js/app.js?v=1.12.85'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const req=e.request;
  const url=new URL(req.url);
  if(req.method==='POST' && /share-target/i.test(url.pathname)){
    e.respondWith((async()=>{
      try{
        const data=await req.formData();
        const file=data.get('image')||data.get('file')||[...data.values()].find(v=>v&&v.type&&String(v.type).startsWith('image/'));
        if(file && file.size){
          const cache=await caches.open('share-inbox');
          await cache.put('latest', new Response(file,{headers:{'content-type':file.type||'image/jpeg','x-filename':file.name||'whatsapp.jpg'}}));
        }
      }catch(err){}
      return Response.redirect('./index.html?share=1', 303);
    })());
    return;
  }
  if(req.method!=='GET') return;
  if(url.origin!==location.origin) return;
  if(/tesseract|jspdf|html2canvas|supabase\.co/i.test(url.href)) return;
  e.respondWith((async()=>{
    try{
      const net=await fetch(req);
      const copy=net.clone();
      caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
      return net;
    }catch{
      const hit=await caches.match(req) || await caches.match('./index.html');
      return hit || new Response('offline', {status:503});
    }
  })());
});
