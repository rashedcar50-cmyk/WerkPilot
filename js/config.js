/* BayMeister kernel — flags, hooks, safe errors */
window.WP = window.WP || {};
WP.version = '1.12.84';
WP.build = '2026-09-01';
WP.features = {
  cloud: true,
  vin: true,
  kba: true,
  ocr: true,
  distriAuto: true,
  multiWorkshop: true,
  mergeSync: true
};
WP.pages = WP.pages || {};
WP.hooks = WP.hooks || {
  beforeRender: [], afterRender: [], afterLogin: [], afterSave: [], onError: []
};
WP.registerPage = function(id, fn){ WP.pages[id] = fn; };
WP.hook = function(name, fn){ (WP.hooks[name] = WP.hooks[name] || []).push(fn); };
WP.run = function(name, ctx){
  (WP.hooks[name] || []).forEach(function(fn){
    try{ fn(ctx); }catch(e){ console.warn('WP hook', name, e); }
  });
};
WP.has = function(flag){ return !!WP.features[flag]; };
WP.emit = WP.run;
WP._loading = {};
WP.loadScript = function(src){
  if(WP._loading[src]) return WP._loading[src];
  WP._loading[src] = new Promise(function(resolve, reject){
    const s=document.createElement('script');
    s.src=src; s.async=true;
    s.onload=function(){ resolve(true); };
    s.onerror=function(){ reject(new Error('load '+src)); };
    document.head.appendChild(s);
  });
  return WP._loading[src];
};
WP.loadPdf = function(){
  return Promise.all([
    WP.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
    WP.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
  ]);
};
WP.loadOcr = function(){
  return WP.loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
};
window.t = window.t || function(k){ return k; };
window.applyUiLang = window.applyUiLang || function(){
  try{
    const lang=(window.db&&db.settings&&db.settings.uiLang)||'de';
    document.documentElement.lang=lang;
    document.documentElement.dir=(window.WP_RTL&&WP_RTL.includes(lang))?'rtl':'ltr';
  }catch(e){}
};
window.langOptions = window.langOptions || function(sel){
  const langs=(window.WP_LANGS&&WP_LANGS.length)?WP_LANGS:[['de','Deutsch'],['ar','العربية'],['en','English']];
  return langs.map(function(pair){
    const c=pair[0], label=pair[1]||c;
    return `<option value="${c}" ${c===(sel||'de')?'selected':''}>${label}</option>`;
  }).join('');
};
window.docLang = window.docLang || function(){ return 'de'; };
window.WP_RTL = window.WP_RTL || ['ar','fa','ur','he'];
window.addEventListener('error', function(ev){
  console.error(ev.error || ev.message);
  WP.run('onError', ev.error || ev.message);
});
window.addEventListener('unhandledrejection', function(ev){
  console.error(ev.reason);
  WP.run('onError', ev.reason);
});
