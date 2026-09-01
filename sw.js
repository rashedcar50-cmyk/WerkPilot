const CACHE='baymeister-v1.11.8';
const PRECACHE=[
  './','./index.html','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png',
  './css/app.css?v=1.11.8','./i18n.js?v=1.11.8','./supabase-config.js',
  './js/config.js?v=1.11.8','./js/engine.js?v=1.11.8','./js/core.js?v=1.11.8','./js/ocr.js?v=1.11.8','./js/cloud.js?v=1.11.8',
  './js/lookup.js?v=1.11.8','./js/app.js?v=1.11.8'
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
  if(req.method!=='GET') return;
  const url=new URL(req.url);
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
