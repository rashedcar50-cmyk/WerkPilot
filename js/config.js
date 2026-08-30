/* BayMeister kernel — flags, hooks, safe errors */
window.WP = window.WP || {};
WP.version = '1.4.0';
WP.build = '2026-08-31';
WP.features = {
  cloud: true,
  vin: true,
  kba: true,
  ocr: true,
  distriAuto: true,
  multiWorkshop: true
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
window.addEventListener('error', function(ev){
  console.error(ev.error || ev.message);
  WP.run('onError', ev.error || ev.message);
});
window.addEventListener('unhandledrejection', function(ev){
  console.error(ev.reason);
  WP.run('onError', ev.reason);
});
