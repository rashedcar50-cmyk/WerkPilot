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
const ix=E.index({
  customers:[{id:'c1',companyId:'de',name:'A'},{id:'c2',companyId:'es',name:'B'}],
  vehicles:[{id:'v1',companyId:'de',customerId:'c1'},{id:'v2',companyId:'de',customerId:'c1'}],
  invoices:[{id:'i1',companyId:'de'}]
},'de');
assert(!!ix.customers.c1 && !ix.customers.c2,'index filters company');
assert(ix.vehiclesByCustomer.c1.length===2,'index vehicles by customer');
assert(!!ix.invoices.i1,'index invoice');
assert(typeof E.hashPass==='function','hashPass exists');
assert(E.hashPass('1976R')!=='1976R','hash hides password');
assert(typeof E.publicUser==='function' && !E.publicUser({u:'Rashid',p:'1976R',role:'developer'}).p,'session user has no password');

vm.runInContext(fs.readFileSync(path.join(root,'js/ocr.js'),'utf8'), sandbox);
const OCR=sandbox.window.WP.OCR;
const sample='E WVWZZZ1JZXW000001\nA B-AK 1234\nD.1 VOLKSWAGEN\nD.3 Golf\nB 12.03.2018\n2.1 0603\n2.2 AAX';
const p=OCR.parse(sample);
assert(p.vin==='WVWZZZ1JZXW000001','ocr vin');
assert(/B-AK/.test(p.plate||p.license_plate),'ocr plate');
assert((p.brand||'').indexOf('VOLKSWAGEN')>=0,'ocr make');
assert(p.year==='2018','ocr year from B date');
assert(OCR.parse('I 20.10.2016\nB 30.04.2015\nC.4c 25.06.2018').year==='2015','year only from field B');
assert(p.hsn==='0603','ocr hsn');
assert(p.tsn==='AAX','ocr tsn');
const junk=OCR.parse('THBODGR ETORM 46 21481 LAUENBUR\nOPEL\nDADLC12\nRA-AP 325\nASTRA SPORTS TOURER');
assert(junk.model && junk.model.indexOf('Astra')>=0,'junk model DADLC rejected');
assert(!/Mustermann|KAPLAN/i.test(junk.owner_name||''),'junk owner not demo');
const brief='Amtliches Kennzeichen RZ AF125\nC.3.1 KRUEGER GEB. SCHNEIDER\nC.3.2 GABRIELE\nNummer der Zulassungsbescheinigung WX327209\nD.1 OPEL\nD.3 ASTRA SPORTS TOURER\n(2.1) 0035 (2.2) ASL02025\nE W0LPE8EC2F8054488\nB 30.04.2015';
const br=OCR.parse(brief);
assert(/RZ/.test(br.plate||br.license_plate||'') && !/WX327/.test(br.plate||br.license_plate||''),'brief plate not document nr');
assert((br.vin||'').indexOf('W0LPE8EC2F8054488')>=0 || (br.vin||'').indexOf('W0LPE')>=0,'brief vin field E');
assert(br.hsn==='0035','brief hsn 4 digits');
const cleaned=OCR.cleanFields({license_plate:'WÜX 357206',plate:'WÜX 357206',vin:'12345678901234567',hsn:'1234',tsn:'5678',owner_name:'KAPLAN',address:'Theodor-Storm-Straße 16, 23769 Fehmarn',brand:'Mercedes-Benz',model:'C-Class'},'TABAH FEHMARN OH-RT 803 W0LPE8EC2F8054488');
assert(!/WÜX|WX327|357206/.test(cleaned.plate||cleaned.license_plate||''),'clean drops document plate');
assert((cleaned.vin||'')==='W0LPE8EC2F8054488' || !(cleaned.vin||'').startsWith('1234'),'clean drops fake vin');
assert(/Tabah/i.test(cleaned.owner_name||''),'clean kaplan+fehmarn → Tabah');
assert(/OH-RT 803/.test(cleaned.plate||cleaned.license_plate||''),'clean fehmarn plate OH-RT 803');
const demo=OCR.cleanFields({owner_name:'Max Mustermann',address:'Musterstraße 1, 12345 Musterstadt',license_plate:'AB-CD 123',vin:'1HGBH41JXMN109186'},'');
assert(!/Mustermann/i.test(demo.owner_name||''),'strip Mustermann');
assert(!/Musterstadt/i.test(demo.address||''),'strip Musterstadt');
assert(!/AB-CD/.test(demo.plate||demo.license_plate||''),'strip demo plate');
assert((demo.vin||'')==='','strip demo vin');

const named=OCR.parse('C.1.1 Tabah\nC.1.2 Rashid\nC.1.3 Hans-Koch-Ring 12\nE WVWZZZ1JZXW000001\nA RZ-TB 76');
assert(/Tabah/i.test(named.owner_name||''),'ocr owner family C.1.1');
assert(/Rashid/i.test(named.owner_name||''),'ocr owner given C.1.2');
const full=OCR.parse('BUNDESREPUBLIK DEUTSCHLAND\nZulassungsbescheinigung Teil I\nA RZ-TB 1976\nB 12.03.2018\nC.1.1 Tabah\nC.1.2 Rashid\nC.1.3 Hans-Koch-Ring 12, 21493 Schwarzenbek\nD.1 VOLKSWAGEN\nD.3 Golf\nE WVWZZZ1JZXW000001\nP.1 1395\nP.2 92\n2.1 0603 2.2 AAX');
assert(/Tabah/i.test(full.owner_name||'') && /Rashid/i.test(full.owner_name||''),'ocr full owner');
assert(/21493/.test(full.address||'') && /Schwarzenbek/i.test(full.address||''),'ocr full address');
assert(full.engine_displacement_cm3==='1395','ocr hubraum');
assert(full.engine_power_kw==='92','ocr kW');
const messy='Amtliches Kennzeichen\nRZ FS1802\nC.1.1 Name oder Firmenname\nScholtyßek\nPC.1.2 Vorname(n) °Ca.\nDaniel Boris\nC.1.3 Anschrift\nAlbert-Schweitzer-Allee 4F\n21493 Schwarzenbek\nE VSSZZZ6JZCR007669\nD.1 SEAT\nD.3 IBIZA';
const real=OCR.parse(messy);
assert(/Daniel/i.test(real.owner_name||'') && /Scholty/i.test(real.owner_name||''),'ocr real holder not label');
assert(!/Vorname/i.test(real.owner_name||''),'ocr rejects Vorname label');
assert(/21493/.test(real.address||'') && /Albert/i.test(real.address||''),'ocr real address');
assert((real.plate||real.license_plate||'').indexOf('FS')>=0 && (real.plate||'').indexOf('1802')>=0,'ocr real plate');
assert((real.plate||'').indexOf('RZ-K')<0,'ocr plate not document nr');
const docn=OCR.parse('Nr. RZ-K-0-118/26-00016\nAmtliches Kennzeichen\nRZ FS1802');
assert(/FS 1802|FS1802/.test((docn.plate||docn.license_plate||'').replace('-','')),'ocr prefers Kennzeichen over Nr');

assert(real.vin==='VSSZZZ6JZCR007669','ocr real vin');
assert(/SEAT/i.test(real.brand||real.make||''),'ocr real make');
const kba=OCR.parse('2.1 7593 2.2 AF\nD.1 SEAT\nD.3\nIBIZA');
assert(kba.hsn==='7593','ocr messy kba hsn');
assert(kba.tsn==='AF','ocr messy kba tsn');
assert(/IBIZA/i.test(kba.model||''),'ocr model next line');



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
assert(idx.includes('js/quality.js?v='+ver),'index loads quality.js');
assert(/legalGaps/.test(i18n),'i18n has legalGaps');
assert(sw.includes(ver),'sw cache version matches index');

const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
assert(app.includes('window.supabase &&'),'supabase init is guarded');
assert(app.includes('function openProCamera'),'pro camera exists');
assert(app.includes('function pickWhatsApp'),'whatsapp picker exists');
assert(app.includes('function waBtn'),'whatsapp icon helper exists');
assert(!/confirm\(t\('resetConfirm'\)\)/.test(app),'no native confirm left');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('all tests passed');
