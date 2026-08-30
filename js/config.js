/* BayMeister module config — add features here without touching pages */
window.WP = window.WP || {};
WP.version = '1.3.0';
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
WP.hooks = WP.hooks || { beforeRender: [], afterRender: [], afterLogin: [] };
WP.registerPage = function(id, fn){ WP.pages[id] = fn; };
WP.hook = function(name, fn){ (WP.hooks[name] = WP.hooks[name] || []).push(fn); };
WP.run = function(name, ctx){
  (WP.hooks[name] || []).forEach(function(fn){ try{ fn(ctx); }catch(e){ console.warn('WP hook', name, e); } });
};
WP.has = function(flag){ return !!WP.features[flag]; };
