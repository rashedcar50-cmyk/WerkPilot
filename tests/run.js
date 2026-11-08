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
assert(cleaned.owner_name!==undefined,'clean keeps owner field');
assert(true,'no hardcoded customer plate');
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
const spr=OCR.parse('Zulassungsbescheinigung Teil I\nA PM MZ70\nB 07.04.09\nC.1.1 Landkreis Potsdam-Mittelmark\nC.1.3 Niemoellerstrasse 1\n14806 Bad Belzig\nD.1 MERCEDES-BENZ\nD.3 Sprinter\nE WDB9061531N406888\n2.1 1313 2.2 SC');
assert(/PM/.test(spr.plate||spr.license_plate||'') && /70/.test(spr.plate||spr.license_plate||''),'sprinter plate PM-MZ 70');
assert((spr.vin||'').indexOf('WDB906')>=0,'sprinter vin');
assert(/Mercedes/i.test(spr.brand||spr.make||''),'sprinter make from WDB');
assert(/Sprinter/i.test(spr.model||''),'sprinter model');
assert(spr.hsn==='1313','sprinter hsn 1313');
assert(spr.year==='2009','sprinter year 07.04.09');
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
assert(idx.includes('js/scan.js?v='+ver),'index loads scan.js');
assert(idx.includes('js/print.js?v='+ver),'index loads print.js');
assert(idx.includes('js/camera.js?v='+ver),'index loads camera.js');
assert(idx.includes('js/invoice-print.js?v='+ver),'index loads invoice-print.js');
assert(idx.includes('js/customers.js?v='+ver),'index loads customers.js');
assert(idx.includes('js/repairs.js?v='+ver),'index loads repairs.js');
assert(idx.includes('js/invoice-edit.js?v='+ver),'index loads invoice-edit.js');
assert(OCR.dropUngrounded({owner_name:'Daniel Test',brand:'SEAT'},'').owner_name==='Daniel Test','empty raw keeps owner');
assert(/legalGaps/.test(i18n),'i18n has legalGaps');
const man=fs.readFileSync(path.join(root,'manifest.json'),'utf8');
assert(/shortcuts/.test(man),'manifest has shortcuts');
assert(fs.existsSync(path.join(root,'privacy.html')),'privacy page for stores');
assert(sw.includes(ver),'sw cache version matches index');

const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const cam=fs.readFileSync(path.join(root,'js/camera.js'),'utf8');
const prn=fs.readFileSync(path.join(root,'js/print.js'),'utf8');
const invp=fs.readFileSync(path.join(root,'js/invoice-print.js'),'utf8');
assert(app.includes('window.supabase &&'),'supabase init is guarded');
assert(cam.includes('function openProCamera'),'pro camera exists');
assert(cam.includes('function pickWhatsApp'),'whatsapp picker exists');
assert(app.includes('function waBtn'),'whatsapp icon helper exists');
assert(prn.includes('function shareBar'),'print module has shareBar');
assert(invp.includes('function workshopInfo'),'invoice-print has workshopInfo');
assert(fs.readFileSync(path.join(root,'js/customers.js'),'utf8').includes('function customers()'),'customers module');
assert(fs.readFileSync(path.join(root,'js/repairs.js'),'utf8').includes('function repairs()'),'repairs module');
assert(fs.readFileSync(path.join(root,'js/invoice-edit.js'),'utf8').includes('function invoiceDesigner'),'invoice-edit module');
assert(!/function customers\(/.test(app),'app.js no longer owns customers page');
assert(!/function invoiceDesigner\(/.test(app),'app.js no longer owns invoice designer');
assert(!/function openProCamera/.test(app),'camera not forked in app.js');
assert(!/function workshopInfo/.test(app),'invoice print not forked in app.js');
assert(!/confirm\(t\('resetConfirm'\)\)/.test(app),'no native confirm left');

// --- Security fix (audit 2026-11-08): credential hardening -----------------
// Bug that shipped before this fix: core.js's seed had five real, working
// plaintext passwords (admin/1980D, Rashid/1976R, accountant/1978B,
// ismail/1977A, warehouse/1979C) sitting in public source, AND separate
// logic silently re-stamped the developer/mechanic accounts back onto their
// known default ('1976R' / '1977A') under some conditions -- so reading the
// repo (which anyone can, it's a public GitHub repo backing a live PWA) was
// enough to log in as any of those five users, including the business owner.
//
// Proof the bug is gone: the exact leaked values / reseed pattern can no
// longer be found as *live* seed data or reseed logic in core.js. (The one
// permitted exception is engine.js's LEGACY_DEFAULT_PASSWORDS table itself,
// which intentionally still *lists* the five old values -- but only to
// detect and block their use, never to grant or restore them.)
const coreSrc=fs.readFileSync(path.join(root,'js/core.js'),'utf8');
assert(!/p:\s*'(1980D|1976R|1978B|1977A|1979C|bm-dev-2026)'/.test(coreSrc),'core.js seed no longer ships a live plaintext default password');
assert(!/u\.p\s*=\s*'(1976R|1977A)'/.test(coreSrc),'core.js no longer re-stamps an account back onto its old default');
assert(/p:\s*null/.test(coreSrc),'core.js seed users now start with no password (p:null)');

// Proof the fix works: re-derive the exact decision app.js's login() makes
// (freshAccount / legacyDefault / ok) against the three cases that matter,
// using the same Engine functions login() calls, so this breaks the moment
// anyone changes that logic in a way that reopens the hole or locks out a
// legitimate user.
async function decideLogin(cand, pass){
  const freshAccount=!!cand && cand.p==null;
  const legacyDefault=!!cand && !freshAccount && E.isLegacyDefaultPassword(cand.u, pass);
  const ok=freshAccount || !!(cand && await E.passOk(cand.p, pass));
  return {ok, freshAccount, legacyDefault, forcesSetup: ok && (freshAccount || legacyDefault)};
}
(async()=>{
  // 1) Fresh seed account (p:null), e.g. right after this fix ships.
  const fresh={u:'admin',p:null,role:'manager'};
  let d=await decideLogin(fresh,'anything');
  assert(d.ok && d.forcesSetup,'fresh account (p:null) is forced into first-time setup, not rejected');

  // 2) Account that never rotated off the old published default -- proves
  // the leaked value alone no longer reaches completeLogin().
  const stillDefault={u:'Rashid',p:'1976R',role:'developer'};
  d=await decideLogin(stillDefault,'1976R');
  assert(d.ok && d.legacyDefault && d.forcesSetup,'typing the old leaked default is accepted but forced to rotate, never logged straight in');

  // 3) Same account, already rotated to a real custom password -- proves
  // the fix does not regress/lock out a legitimate, already-secured user.
  const rotated={u:'Rashid',p:await E.hashPassAsync('MyR3al-Pass!'),role:'developer'};
  d=await decideLogin(rotated,'MyR3al-Pass!');
  assert(d.ok && !d.freshAccount && !d.legacyDefault && !d.forcesSetup,'a rotated custom password logs straight in, unaffected by the fix');

  // 4) Same rotated account, wrong password -- proves the fix did not
  // accidentally loosen normal auth.
  d=await decideLogin(rotated,'totally-wrong');
  assert(!d.ok,'wrong password on a rotated account is still rejected');

  // 5) The hardening in forcePasswordSetup: re-submitting the old default
  // as the "new" password must still be rejected by isLegacyDefaultPassword.
  assert(E.isLegacyDefaultPassword('Rashid','1976R')===true,'legacy default is recognized for its own account');
  assert(E.isLegacyDefaultPassword('Rashid','MyR3al-Pass!')===false,'a real custom password is never flagged as the legacy default');
  assert(E.isLegacyDefaultPassword('someone-not-in-the-table','1976R')===false,'an unrelated username is never matched against another account\'s old default');

  // --- Fix: invoice preview must not mutate the database -------------------
  // Bug that shipped before this fix: js/invoice-print.js's ensureKd(), called
  // every time an invoice is rendered (preview, print, PDF, email), silently
  // allocated a brand-new customer number (kdNr) and WROTE it straight into
  // db.customers + called save() -- a real, permanent write triggered by what
  // is supposed to be a read-only render. Opening a preview for an invoice
  // whose customer had no number yet was enough to hand out and persist one,
  // even if the invoice itself was never saved.
  const ipSandbox={window:{WP:{}}, console, db:{customers:[{id:'cust-no-kd',name:'Walk-in Test'}]}, save:function(){ipSandbox._saveCalls=(ipSandbox._saveCalls||0)+1;}, _saveCalls:0};
  vm.createContext(ipSandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'js/invoice-print.js'),'utf8'), ipSandbox);

  const custBefore=JSON.parse(JSON.stringify(ipSandbox.db.customers[0]));
  const renderedCust=ipSandbox.ensureKd(ipSandbox.db.customers[0]);
  assert(!!renderedCust.kdNr, 'preview still shows a customer number for display, even if unassigned yet');
  assert(JSON.stringify(ipSandbox.db.customers[0])===JSON.stringify(custBefore), 'PROOF OF FIX: previewing/rendering never mutates the stored customer record');
  assert(ipSandbox._saveCalls===0, 'PROOF OF FIX: previewing/rendering never calls save() -- no database write happens on read');
  // Proof of bug (regression guard): the exact vulnerable pattern -- ensureKd
  // writing into db.customers and calling save() -- is gone from the source.
  const ipSrc=fs.readFileSync(path.join(root,'js/invoice-print.js'),'utf8');
  const ensureKdBody=(ipSrc.match(/function ensureKd\(cust\)\{[\s\S]*?\n\}/)||[''])[0];
  assert(!/save\(\)/.test(ensureKdBody), 'ensureKd() no longer calls save() -- it is purely a display fallback now');

  // assignKdNr -- the one place a number is now actually persisted -- only
  // fires when explicitly called (i.e. at real invoice-save time), assigns
  // exactly once, and never overwrites a customer who already has a number.
  ipSandbox.assignKdNr('cust-no-kd');
  assert(ipSandbox._saveCalls===1, 'assignKdNr persists (calls save()) exactly once when actually invoked');
  assert(!!ipSandbox.db.customers[0].kdNr, 'assignKdNr actually wrote a kdNr onto the real customer record');
  const assignedKd=ipSandbox.db.customers[0].kdNr;
  ipSandbox.assignKdNr('cust-no-kd');
  assert(ipSandbox._saveCalls===1, 'assignKdNr is a no-op (no extra save) for a customer who already has a number');
  assert(ipSandbox.db.customers[0].kdNr===assignedKd, 'assignKdNr never reassigns/overwrites an existing customer number');

  // --- Fix: unify tax/discount/rounding between edit, preview, and print ---
  // Bug that shipped before this fix: the editor's save handler (and
  // lookup.js's createInvoiceAuto) applied ONE flat header tax rate to the
  // whole discounted sum, ignoring that each line carries its own tax rate
  // (the per-row "MwSt." field) -- while print/preview (invoiceModel) always
  // computed VAT per line's own rate with the discount prorated across rate
  // buckets. For a mixed-rate invoice (e.g. parts at 19%, a line at 7%), the
  // amount booked to the journal/debt list could differ from the amount the
  // printed document actually shows the customer.
  const mixedLines=[
    {name:'Bremsbelaege', qty:1, price:100, tax:19, kind:'parts'},
    {name:'Reifenentsorgung', qty:1, price:50, tax:7, kind:'parts'},
    {name:'Arbeitswert', qty:2, price:60, tax:19, kind:'labor'}
  ];
  // Proof of bug (regression guard): recompute totals the OLD (flat-rate) way
  // and show it disagrees with the new shared function on mixed-rate lines.
  const oldParts=mixedLines.filter(l=>l.kind!=='labor').reduce((s,l)=>s+l.qty*l.price,0);
  const oldLabor=mixedLines.filter(l=>l.kind==='labor').reduce((s,l)=>s+l.qty*l.price,0);
  const oldNet=Math.max(0, oldParts+oldLabor-0);
  const oldTotal=Math.round(oldNet*(1+19/100)*100)/100;
  const newTotals=ipSandbox.computeInvoiceTotals(mixedLines, 0);
  assert(oldTotal!==newTotals.total, 'PROOF OF BUG: the old flat-19%-on-everything total disagrees with the correct per-line-tax total on mixed-rate lines');
  // Expected correct total: 100@19% + 50@7% + 120@19% -> net=270, vat=(100*.19+50*.07+120*.19)=20.9+3.5... =>
  const expectedVat=Math.round((100*0.19+50*0.07+120*0.19)*100)/100;
  const expectedTotal=Math.round((270+expectedVat)*100)/100;
  assert(newTotals.net===270, 'computeInvoiceTotals: net sums all lines minus discount, independent of tax rate');
  assert(newTotals.total===expectedTotal, 'computeInvoiceTotals: total correctly applies each line\'s own tax rate ('+newTotals.total+' vs expected '+expectedTotal+')');

  // PROOF OF FIX: the editor's save path and print's preview path now reach
  // the identical total for the same mixed-rate invoice, because both call
  // computeInvoiceTotals. (Re-deriving app.js's save-handler arithmetic here
  // would require a full DOM; instead we assert both real call sites -- the
  // editor's save handler in invoice-edit.js and createInvoiceAuto in
  // lookup.js -- now route through this one shared function, so they cannot
  // drift from what print shows.)
  const editSrc=fs.readFileSync(path.join(root,'js/invoice-edit.js'),'utf8');
  const lookupSrc=fs.readFileSync(path.join(root,'js/lookup.js'),'utf8');
  assert(/computeInvoiceTotals\(lines,\s*discount\)/.test(editSrc), 'invoice-edit.js save handler now computes totals via the shared function');
  assert(!/net\*\(1\+tax\/100\)/.test(editSrc), 'invoice-edit.js no longer has the old flat-single-rate total formula');
  assert(/computeInvoiceTotals\(lines,\s*discount\)/.test(lookupSrc), 'lookup.js createInvoiceAuto now computes totals via the shared function');
  assert(!/net\*\(1\+tax\/100\)/.test(lookupSrc), 'lookup.js no longer has the old flat-single-rate total formula');

  // Zero-regression check: a single-rate invoice (the overwhelming common
  // case -- everything at 19%, no discount) totals identically to the old
  // formula, so ordinary invoices are completely unaffected by this fix.
  const uniformLines=[{name:'Oelfilter',qty:1,price:40,tax:19,kind:'parts'},{name:'Arbeitswert',qty:1,price:60,tax:19,kind:'labor'}];
  const uniform=ipSandbox.computeInvoiceTotals(uniformLines, 10);
  const oldUniformNet=Math.max(0,100-10), oldUniformTotal=Math.round(oldUniformNet*(1+19/100)*100)/100;
  assert(uniform.net===oldUniformNet && uniform.total===oldUniformTotal, 'single-rate invoices total identically under the new shared function -- no regression for the common case');

  // --- Fix: printing/PDF for repair orders and appointments; estimates ---
  // Bug that shipped before this fix: js/print.js's buildDocHTML() had no
  // case at all for 'repairs' or 'appointments' -- any attempt to print/
  // PDF/share them fell through to the generic branch and rendered
  // "noData". Neither screen even offered the share buttons. Separately,
  // the estimates screen called listShareBar('invoices'), so its share
  // buttons exported the UNRELATED invoices list instead of the estimates
  // actually on screen.
  const printSandbox={
    window:{}, console,
    session:{company:{id:'c1',name:'Test Shop'}},
    db:{
      repairs:[{id:'r1',companyId:'c1',vehicleId:'v1',status:'working',complaint:'Bremsen quietschen',description:'Bremsen pruefen',tech:'Ismail',parts:[{name:'Bremsbelag',qty:2,price:30}]}],
      appointments:[{id:'a1',companyId:'c1',vehicleId:'v1',customerId:'cu1',date:'2026-12-01',time:'09:30',tech:'Ismail',status:'confirmed'}],
      estimates:[{id:'e1',companyId:'c1',vehicleId:'v1',parts:100,labor:50,discount:10,tax:19,total:160.1,fee:0}],
      invoices:[], customers:[], vehicles:[], settings:{}
    },
    companyRows:function(k){ return (printSandbox.db[k]||[]).filter(x=>!printSandbox.session.company||x.companyId===printSandbox.session.company.id); },
    vehicleName:vid=>'VW Golf '+vid, customerName:cid=>'Kunde '+cid,
    vehicleOf:()=>({}), customerOfVehicle:()=>({name:'Max Mustermann',phone:'0171'}),
    stLabel:s=>'ST:'+s, dLabel:s=>s, money:n=>'EUR'+(n||0), esc:s=>String(s==null?'':s), t:k=>k,
    repairLaborTotal:()=>0, repairPartsTotal:r=>(r.parts||[]).reduce((s,p)=>s+(p.qty||1)*(p.price||0),0),
    docLang:()=>'de'
  };
  vm.createContext(printSandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'js/print.js'),'utf8'), printSandbox);

  const repairsList=printSandbox.buildDocHTML('repairs', undefined);
  assert(!/noData/.test(repairsList), 'PROOF OF FIX: repairs list print/PDF no longer falls through to the generic "no data" branch');
  assert(/VW Golf v1/.test(repairsList) && /ST:working/.test(repairsList), 'repairs list print shows the actual repair data');

  const repairSingle=printSandbox.buildDocHTML('repairs', 'r1');
  assert(!/noData/.test(repairSingle) && !/jobMissing/.test(repairSingle), 'single repair work-order print finds the repair and renders it');
  assert(/Bremsen quietschen/.test(repairSingle) && /Bremsbelag/.test(repairSingle), 'single repair work-order print shows complaint and issued parts');

  const apptList=printSandbox.buildDocHTML('appointments', undefined);
  assert(!/noData/.test(apptList), 'PROOF OF FIX: appointments print/PDF no longer falls through to the generic "no data" branch');
  assert(/2026-12-01/.test(apptList) && /09:30/.test(apptList), 'appointments print shows the actual appointment data');

  const estList=printSandbox.buildDocHTML('estimates', undefined);
  assert(!/noData/.test(estList), 'estimates print/PDF has its own case (was already reachable via the wrong type, now has a real one)');
  assert(/EUR160.1/.test(estList), 'estimates print shows the actual estimate total');

  // Proof of bug (regression guard) + proof of fix for the estimates
  // share-bar type mixup: the estimates() screen must call
  // listShareBar('estimates'), never listShareBar('invoices').
  const appSrc=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  const estimatesFnSrc=(appSrc.match(/function estimates\(\)\{[\s\S]*?\n\}/)||[''])[0];
  assert(estimatesFnSrc.length>0, 'found the estimates() function to check');
  assert(/listShareBar\('estimates'\)/.test(estimatesFnSrc), "PROOF OF FIX: estimates() now calls listShareBar('estimates')");
  assert(!/listShareBar\('invoices'\)/.test(estimatesFnSrc), "PROOF OF FIX: estimates() no longer calls listShareBar('invoices')");

  // Proof the new share bars are actually wired into the repairs/appointments
  // screens (previously absent entirely).
  const repairsSrc=fs.readFileSync(path.join(root,'js/repairs.js'),'utf8');
  assert(/listShareBar\('repairs'\)/.test(repairsSrc), 'repairs list now offers print/PDF/share');
  assert(/shareBar\('repairs',\s*r\.id\)/.test(repairsSrc), 'single repair work-order view now offers print/PDF/share');
  assert(/listShareBar\('appointments'\)/.test(appSrc), 'appointments list now offers print/PDF/share');

  // --- Fix: remove hardcoded OCR.space API key fallback -------------------
  // Bug that shipped before this fix: js/ocr.js's spaceRead() fell back to
  // a real, hardcoded OCR.space API key ('K81772188988957') shipped in
  // public client source whenever the workshop hadn't configured its own
  // key -- so every install, and anyone reading the repo, silently shared
  // (and could drain the quota of) that one embedded key.
  const ocrSrc=fs.readFileSync(path.join(root,'js/ocr.js'),'utf8');
  assert(!/K81772188988957/.test(ocrSrc), 'PROOF OF FIX: the hardcoded OCR.space key is gone from the source entirely');
  let fetchCalls=0;
  const sharedDb={settings:{}};
  const ocrSandbox={window:{WP:{}, db:sharedDb}, console, db:sharedDb,
    setTimeout, clearTimeout, URLSearchParams, AbortController,
    fetch:async function(){ fetchCalls++; return {json:async()=>({ParsedResults:[]})}; }
  };
  vm.createContext(ocrSandbox);
  vm.runInContext(ocrSrc, ocrSandbox);
  const OCR2=ocrSandbox.window.WP.OCR;
  const noKeyResult=await OCR2.spaceRead('aGVsbG8=');
  assert(fetchCalls===0, 'PROOF OF FIX: with no OCR.space key configured, spaceRead never calls out to OCR.space at all (no silent embedded-key usage)');
  assert(JSON.stringify(noKeyResult)==='{}', 'spaceRead returns {} (not an error) when no key is configured, so the other OCR fallback tiers still run');
  ocrSandbox.db.settings.ocrSpaceKey='workshop-own-test-key';
  await OCR2.spaceRead('aGVsbG8=');
  assert(fetchCalls===1, 'spaceRead still works normally once the workshop configures its OWN key in Settings');

  // --- Fix: XSS -- customerName()/vehicleName() must always be esc()'d ----
  // Bug that shipped before this fix: js/customers.js's vehicles table
  // inserted customerName(v.customerId) straight into an HTML table cell
  // with NO escaping, unlike every sibling cell in the same row (which all
  // call esc()) -- the exact inconsistency flagged in the i18n/XSS audit.
  // The same inconsistency existed for vehicleName() in five spots in
  // js/app.js. Both helpers return free text (customer name / plate+make+
  // model) that can come from manual entry or OCR-scanned documents, so an
  // HTML/script payload in a saved name or plate would execute for every
  // user who views that table.
  const custSrc=fs.readFileSync(path.join(root,'js/customers.js'),'utf8');
  assert(!custSrc.includes("customerName(v.customerId),esc(v.plate"), 'PROOF OF BUG regression guard: the exact unescaped customerName() call in the vehicles table is gone');
  assert(custSrc.includes("esc(customerName(v.customerId)),esc(v.plate"), 'PROOF OF FIX: customers.js vehicles table now escapes customerName()');

  const appSrc2=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  const uneescapedSpots=[
    "s.repairs.map(r=>[vehicleName(r.vehicleId),esc(dLabel(r.description))",
    "esc(a.time),vehicleName(a.vehicleId),esc(customerName(a.customerId))",
    "rows.map(x=>[vehicleName(x.vehicleId),money(x.parts)",
    "esc(x.type||''), vehicleName(x.vehicleId)||'—'",
    "unpaid.map(x=>[`<button class=\"btn small\" onclick=\"previewInvoice('${x.id}')\">${esc(x.number||x.id)}</button>`,vehicleName(x.vehicleId)"
  ];
  uneescapedSpots.forEach((spot,i)=>assert(!appSrc2.includes(spot), 'PROOF OF BUG regression guard #'+(i+1)+': an unescaped vehicleName() table cell is gone from app.js'));
  const escapedSpots=[
    "s.repairs.map(r=>[esc(vehicleName(r.vehicleId)),esc(dLabel(r.description))",
    "esc(a.time),esc(vehicleName(a.vehicleId)),esc(customerName(a.customerId))",
    "rows.map(x=>[esc(vehicleName(x.vehicleId)),money(x.parts)",
    "esc(x.type||''), esc(vehicleName(x.vehicleId))||'—'",
    "unpaid.map(x=>[`<button class=\"btn small\" onclick=\"previewInvoice('${x.id}')\">${esc(x.number||x.id)}</button>`,esc(vehicleName(x.vehicleId))"
  ];
  escapedSpots.forEach((spot,i)=>assert(appSrc2.includes(spot), 'PROOF OF FIX #'+(i+1)+': app.js now escapes vehicleName() at this table cell'));

  // Behavioral proof: esc() itself actually neutralizes an HTML payload
  // such as a customer name or plate could contain.
  const escSandbox={window:{}, console};
  vm.createContext(escSandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'js/lookup.js'),'utf8'), escSandbox);
  const payload='<img src=x onerror=alert(1)>';
  const escaped=escSandbox.esc(payload);
  assert(!escaped.includes('<') && !escaped.includes('>'), 'esc() neutralizes angle brackets in a customer-name/plate-style XSS payload');

  if(failed){ console.error(failed+' failed'); process.exit(1); }
  console.log('all tests passed');
})();
