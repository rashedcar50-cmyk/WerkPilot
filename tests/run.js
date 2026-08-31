const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=path.join(__dirname,'..');
let failed=0;
function assert(cond,msg){ if(!cond){ failed++; console.error('FAIL',msg); } else console.log('OK',msg); }

const window={WP:{}};
vm.createContext({window,console});
vm.runInContext(fs.readFileSync(path.join(root,'js/engine.js'),'utf8'), {window,console});
const E=window.WP.Engine;
assert(E.norm('قيد التنفيذ')==='working','status ar → working');
assert(E.norm('In Arbeit')==='working','status de → working');
assert(E.isOpen('استلام')===true,'intake is open');
assert(E.isOpen('delivered')===false,'delivered closed');
assert(E.validateVehicle({vin:'WVWZZZ1JZYW123456'}).length===0,'vin ok');
assert(E.validateVehicle({vin:'123'}).length>0,'vin bad');
assert(E.validateInvoice({total:0,lines:[]}).length>0,'empty invoice');

vm.runInContext(fs.readFileSync(path.join(root,'js/ocr.js'),'utf8'), {window,console,Image:function(){},document:{createElement(){return {getContext(){return {};}}}}});
const sample='E WVWZZZ1JZXW000001\nA B-AK 1234\nD.1 VOLKSWAGEN\nD.3 Golf\nB 12.03.2018\n2.1 0603\n2.2 AAX';
const p=window.WP.OCR.parse(sample);
assert(p.vin==='WVWZZZ1JZXW000001','ocr vin');
assert(/B-AK/.test(p.plate||p.license_plate),'ocr plate');
assert(p.brand.indexOf('VOLKSWAGEN')>=0,'ocr make');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('all tests passed');
