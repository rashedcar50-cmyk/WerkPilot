const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=path.join(__dirname,'..');
let failed=0;
function assert(cond,msg){ if(!cond){ failed++; console.error('FAIL',msg); } else console.log('OK',msg); }

const sandbox={window:{WP:{}}, console, Image:function(){}, document:{createElement(){return {getContext(){return {};}}}}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'js/engine.js'),'utf8'), sandbox);
const E=sandbox.window.WP.Engine;
assert(E.norm('قيد التنفيذ')==='working','status ar → working');
assert(E.norm('In Arbeit')==='working','status de → working');
assert(E.norm('جاري العمل')==='working','status ar alt → working');
assert(E.isOpen('استلام')===true,'intake is open');
assert(E.isOpen('working')===true,'working is open');
assert(E.isOpen('delivered')===false,'delivered closed');
assert(E.isOpen('closed')===false,'closed not open');
assert(E.validateVehicle({vin:'WVWZZZ1JZYW123456'}).length===0,'vin ok');
assert(E.validateVehicle({vin:'123'}).length>0,'vin bad');
assert(E.validateVehicle({vin:'WVWZZZ1JIOW123456'}).length>0,'vin I/O invalid');
assert(E.validateInvoice({total:0,lines:[]}).length>0,'empty invoice');
assert(E.validateInvoice({total:10,lines:[{}]}).length===0,'invoice with total ok');
const migrated=E.migrate({settings:{uiLang:'xx'},repairs:[{status:'استلام'}],appointments:[{status:'مؤكد'}]});
assert(migrated.settings.uiLang==='de','migrate unknown lang → de');
assert(migrated.repairs[0].status==='intake','migrate repair status');
assert(migrated.appointments[0].status==='confirmed','migrate appt status');

vm.runInContext(fs.readFileSync(path.join(root,'js/ocr.js'),'utf8'), sandbox);
const OCR=sandbox.window.WP.OCR;
const sample='E WVWZZZ1JZXW000001\nA B-AK 1234\nD.1 VOLKSWAGEN\nD.3 Golf\nB 12.03.2018\n2.1 0603\n2.2 AAX';
const p=OCR.parse(sample);
assert(p.vin==='WVWZZZ1JZXW000001','ocr vin');
assert(/B-AK/.test(p.plate||p.license_plate),'ocr plate');
assert((p.brand||'').indexOf('VOLKSWAGEN')>=0,'ocr make');
assert(p.year==='2018','ocr year from B date');
assert(p.hsn==='0603','ocr hsn');
assert(p.tsn==='AAX','ocr tsn');

const named=OCR.parse('C.1.1 Tabah\nC.1.2 Rashid\nC.1.3 Hans-Koch-Ring 12\nE WVWZZZ1JZXW000001\nA RZ-TB 76');
assert(/Tabah/i.test(named.owner_name||''),'ocr owner family C.1.1');
assert(/Rashid/i.test(named.owner_name||''),'ocr owner given C.1.2');

const merged=OCR.merge({vin:'WVWZZZ1JZXW000001',owner_name:''},{vin:'',owner_name:'Rashid Tabah',plate:'RZ-TB 76'});
assert(merged.vin==='WVWZZZ1JZXW000001','merge keeps valid vin');
assert(merged.owner_name==='Rashid Tabah','merge fills owner');
assert(OCR.score(merged)>=40,'score vin');

const norm=OCR.merge({owner_name:'Tabah'},{owner_name:''});
assert(norm.owner_name==='Tabah','merge prefers left owner');

const i18n=fs.readFileSync(path.join(root,'i18n.js'),'utf8');
assert(/fromWhatsApp/.test(i18n),'i18n has WhatsApp key');
assert(/loggedInAs/.test(i18n),'i18n has loggedInAs');
assert(/alignSchein/.test(i18n),'i18n has camera hint');

const idx=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const ver=(idx.match(/CUR='([\d.]+)'/)||[])[1];
assert(!!ver,'index has version');
assert(idx.includes('js/app.js?v='+ver),'index cache-busts app.js');
assert(sw.includes(ver),'sw cache version matches index');

const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
assert(app.includes('window.supabase &&'),'supabase init is guarded');
assert(app.includes('function openProCamera'),'pro camera exists');
assert(app.includes('function pickWhatsApp'),'whatsapp picker exists');
assert(app.includes('function waBtn'),'whatsapp icon helper exists');
assert(!/confirm\(t\('resetConfirm'\)\)/.test(app),'no native confirm left');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('all tests passed');
