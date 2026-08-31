/* Werkivo engine: status codes, validation, migration */
(function(W){
  const ALIAS={
    intake:['intake','استلام','Annahme','Check-in'],
    diag:['diag','تشخيص','Diagnose','Diagnosis'],
    wait_parts:['wait_parts','انتظار قطع','Wartet auf Teile','Waiting for parts'],
    working:['working','قيد التنفيذ','جاري العمل','In Arbeit','In progress'],
    ready:['ready','جاهز للتسليم','fertig','Ready'],
    delivered:['delivered','مسلَّم','مسلم','geliefert','Delivered'],
    done:['done','منجز','Fertig','Completed'],
    closed:['closed','مغلق','Abgeschlossen','Closed'],
    confirmed:['confirmed','مؤكد','Bestätigt','Confirmed'],
    converted:['converted','تم التحويل']
  };
  const OPEN=['intake','diag','wait_parts','working'];
  function norm(s){
    const x=String(s||'').trim();
    if(!x) return '';
    for(const [code,list] of Object.entries(ALIAS)){
      if(code===x || list.includes(x)) return code;
    }
    return x;
  }
  function is(s, code){ return norm(s)===code; }
  function isOpen(s){ return OPEN.includes(norm(s)); }
  function flow(){ return ['intake','diag','wait_parts','working','ready','delivered']; }
  function validateVehicle(v){
    const e=[];
    if(!v) return ['no vehicle'];
    const vin=String(v.vin||'').replace(/\s/g,'').toUpperCase();
    if(vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) e.push('vin');
    return e;
  }
  function validateInvoice(x){
    const e=[];
    if(!x) return ['no invoice'];
    if(!(Number(x.total)>0) && !(x.lines&&x.lines.length)) e.push('empty');
    return e;
  }
  function migrate(store){
    if(!store) return store;
    ['repairs','appointments'].forEach(k=>{
      (store[k]||[]).forEach(row=>{
        if(row && row.status) row.status=norm(row.status);
      });
    });
    if(store.settings && !['de','ar','en','tr','sr','ru','pl','es'].includes(store.settings.uiLang)){
      store.settings.uiLang='de';
    }
    store.settings=store.settings||{};
    store.settings.schema=2;
    return store;
  }
  function touch(row){
    if(!row) return row;
    row.updatedAt=new Date().toISOString();
    return row;
  }
  W.Engine={norm,is,isOpen,flow,validateVehicle,validateInvoice,migrate,touch,ALIAS,OPEN};
})(window.WP=window.WP||{});
window.normStatus=function(s){ return (WP.Engine&&WP.Engine.norm(s))||s; };
window.isOpenStatus=function(s){ return !!(WP.Engine&&WP.Engine.isOpen(s)); };
