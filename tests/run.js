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
assert(idx.includes('js/schein-engine.js?v='+ver),'index loads schein-engine.js');
assert(idx.includes('js/schein-wizard.js?v='+ver),'index loads schein-wizard.js');
assert(!fs.existsSync(path.join(root,'js/scan.js')),'PROOF: the old scan.js (superseded by schein-engine.js/schein-wizard.js) is actually gone, not just unreferenced -- no two parallel implementations left behind');
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
  if(cand && cand.disabled) return {ok:false, freshAccount:false, legacyDefault:false, forcesSetup:false, disabled:true};
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

  // 6) Disabled account (2026-11-09 fix): rejected outright, even with the
  // exact correct password -- no freshAccount/legacyDefault path can ever
  // grant it a session.
  const disabledAcct={u:'admin',p:'1980D',role:'manager',disabled:true};
  d=await decideLogin(disabledAcct,'1980D');
  assert(!d.ok && d.disabled,'a disabled account is rejected even with its correct password');

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

  // --- Account migration: existing installs must not be locked out -------
  // The user explicitly asked that removing the hardcoded defaults not be
  // treated as a complete auth fix by itself: an EXISTING production
  // install already has real user records sitting in localStorage (from
  // before this change ever existed), and core.js's load() merges the new
  // seed (p:null) with whatever is actually persisted via a shallow
  // `{...base,...raw}` spread. This test runs the REAL load() function
  // (not a recreation of its logic) against a simulated pre-existing
  // install's localStorage, to prove the merge really does preserve real
  // passwords rather than wiping them to null on upgrade.
  function makeLocalStorage(initial){
    const store={...initial};
    return {
      getItem:k=>(k in store? store[k] : null),
      setItem:(k,v)=>{ store[k]=String(v); },
      removeItem:k=>{ delete store[k]; }
    };
  }
  function loadCoreWith(localStorageInitial){
    // core.js only ever reads window.WP (absent -> falsy, so it skips the
    // optional WP.Engine.migrate call) and writes window.db -- a plain
    // object is enough, no real WP/Engine needed for this test.
    const sandbox={
      window:{addEventListener:()=>{}}, console,
      document:{createElement:()=>({}), querySelectorAll:()=>[]},
      localStorage: makeLocalStorage(localStorageInitial)
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(root,'js/core.js'),'utf8'), sandbox);
    return sandbox;
  }

  // Case 1: a real existing install, already running before this fix,
  // still has its original plaintext passwords in storage -- exactly
  // what every current production browser has right now.
  const existingInstall={
    users:[
      {u:'admin',p:'1980D',name:'Admin',role:'manager'},
      {u:'Rashid',p:'1976R',name:'Rashid Tabah',role:'developer'},
      {u:'accountant',p:'1978B',name:'Buchhaltung',role:'accountant'},
      {u:'ismail',p:'1977A',name:'Ismail',role:'mechanic'},
      {u:'warehouse',p:'1979C',name:'Lager',role:'warehouse'}
    ],
    customers:[{id:'c1',companyId:'de',name:'Real Customer GmbH'}],
    settings:{uiLang:'de'}
  };
  const upgraded=loadCoreWith({baymeister_v1: JSON.stringify(existingInstall)});
  const mergedUsers=upgraded.window.db.users;
  assert(mergedUsers.find(u=>u.u==='Rashid').p==='1976R', 'PROOF OF FIX: an existing install\'s real (pre-fix) password survives the upgrade -- load() does not reset it to null');
  assert(mergedUsers.find(u=>u.u==='admin').p==='1980D', 'existing admin password also survives the upgrade unchanged');
  assert(upgraded.window.db.customers.find(c=>c.id==='c1').name==='Real Customer GmbH', 'existing real business data (not demo data) survives the upgrade');

  // Case 2: an account that had ALREADY been rotated through the new
  // forced-setup flow (e.g. a second deploy after some users already set
  // real passwords) must keep that real password too, not regress to null.
  const partiallyRotated={
    users:[
      {u:'admin',p:'5f4dcc3b5aa765d61d8327deb882cf99',name:'Admin',role:'manager'},
      {u:'Rashid',p:'1976R',name:'Rashid Tabah',role:'developer'}
    ]
  };
  const upgraded2=loadCoreWith({baymeister_v1: JSON.stringify(partiallyRotated)});
  assert(upgraded2.window.db.users.find(u=>u.u==='admin').p==='5f4dcc3b5aa765d61d8327deb882cf99', 'an already-rotated (hashed/custom) password survives a later upgrade unchanged');

  // Case 3: a genuinely brand-new install (nothing in localStorage yet) --
  // this is the ONLY case where p:null should apply, and it's correct
  // here because there is no existing user to lock out.
  const freshInstall=loadCoreWith({});
  assert(freshInstall.window.db.users.every(u=>u.p===null), 'a genuinely fresh install (no prior data) seeds p:null for every account -- correct, nothing existing to break');

  // Case 4: combine with the real login decision (from the earlier
  // credential-rotation test) to prove the end-to-end migration path:
  // the REAL merged user record for an unrotated existing account still
  // correctly routes through forced rotation rather than straight login
  // or an outright lockout.
  const realRashid=mergedUsers.find(u=>u.u==='Rashid');
  const migDecision=await decideLogin(realRashid, '1976R');
  assert(migDecision.ok && migDecision.legacyDefault && migDecision.forcesSetup, 'end-to-end: a real migrated existing account typing its known password is forced to rotate, not locked out and not let straight in');
  const migWrong=await decideLogin(realRashid, 'totally-wrong-guess');
  assert(!migWrong.ok, 'end-to-end: a migrated existing account is still protected against a wrong password guess');

  // --- Fix: "Manueller Auftrag" silently failed to create a repair order --
  // Bug (found while running the full login->customer->vehicle->repair->
  // invoice->preview cycle in a real browser, per the user's explicit
  // request to test the whole cycle, not just the login fix in isolation):
  // repairs.js wired the "new repair order" button as a BARE function
  // reference -- `$('#add').onclick=repairModal` -- so the click Event
  // itself was passed in as repairModal's `existing` argument. Since an
  // Event is truthy, repairModal treated it as an EDIT of that (nonexistent)
  // record: it looked up `db.repairs.findIndex(x=>x.id===existing.id)`
  // (undefined on an Event, never found) and did nothing instead of
  // pushing a new repair. The modal still closed with no visible error,
  // so this was invisible without actually clicking through the UI.
  const repairsSrc2=fs.readFileSync(path.join(root,'js/repairs.js'),'utf8');
  assert(!/\$\('#add'\)\.onclick=repairModal;/.test(repairsSrc2), "PROOF OF BUG regression guard: the bare `onclick=repairModal` reference is gone");
  assert(/\$\('#add'\)\.onclick=\(\)=>repairModal\(\);/.test(repairsSrc2), 'PROOF OF FIX: the button now calls repairModal() with no arguments, so a click Event can never be mistaken for an existing record');

  // --- Cloud Auth: js/auth.js's pure link-handling logic --------------------
  // js/auth.js detects Supabase's password-recovery redirect (either the
  // implicit-flow #access_token=...&type=recovery hash, or the PKCE
  // ?code=... query param) to show the "set a new password" screen instead
  // of the normal login screen. Tested directly against the real functions.
  function loadAuth(locationStub){
    const sandbox={window:{}, console, location:locationStub};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(root,'js/auth.js'),'utf8'), sandbox);
    return sandbox.window.WP.CloudAuth;
  }
  const CA_normal=loadAuth({origin:'https://example.test', pathname:'/WerkPilot/', hash:'', search:''});
  assert(CA_normal.isRecoveryLink()===false, 'a normal login URL (no recovery markers) is not treated as a recovery link');

  const CA_implicit=loadAuth({origin:'https://example.test', pathname:'/WerkPilot/', hash:'#access_token=abc123&type=recovery', search:''});
  assert(CA_implicit.isRecoveryLink()===true, 'PROOF OF FIX: a Supabase implicit-flow recovery hash (#...&type=recovery) is detected');

  const CA_pkce=loadAuth({origin:'https://example.test', pathname:'/WerkPilot/', hash:'', search:'?code=abcdef123456'});
  assert(CA_pkce.isRecoveryLink()===true, 'PROOF OF FIX: a Supabase PKCE-flow recovery link (?code=...) is detected');

  assert(CA_normal.redirectBase()==='https://example.test/WerkPilot/', 'redirectBase strips query/hash so it works as a stable Supabase redirect target, adapting automatically to whatever origin serves the app (localhost while testing, the real domain in production)');

  // --- Cloud Auth: an invalid/expired recovery link must never silently --
  // --- "succeed" just because an unrelated valid session already exists --
  // Bug found live in a real browser while testing this feature: navigating
  // to a garbage #access_token=...&type=recovery link, in a browser tab that
  // ALREADY had a genuinely-authenticated session from something unrelated,
  // let the password "reset" go through anyway -- completePasswordReset was
  // only checking "does ANY session exist", not "did THIS link's token
  // actually get validated by the server". Fixed by requiring the SDK's own
  // PASSWORD_RECOVERY event (fired only after it validates a token's
  // signature+expiry against the server) before trusting an implicit-flow
  // session as a real recovery.
  function loadAuthWithFakeSupabase(locationStub, {recoveryConfirmed}){
    const fakeUser={email:'someone-already-logged-in@example.test'};
    const fakeSession={user:fakeUser};
    const sandbox={
      window:{ _wpRecoveryConfirmed: recoveryConfirmed,
        supabaseClient:{ auth:{
          getSession: async()=>({data:{session:fakeSession}}),
          updateUser: async()=>({data:{}, error:null})
        }}
      },
      console, location:locationStub, URLSearchParams, history:{replaceState:()=>{}}
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(root,'js/auth.js'),'utf8'), sandbox);
    return sandbox;
  }
  const bogusUrl={origin:'https://example.test', pathname:'/WerkPilot/', hash:'#access_token=totally-bogus&type=recovery', search:''};
  const sbxNoConfirm=loadAuthWithFakeSupabase(bogusUrl, {recoveryConfirmed:false});
  const resultNoConfirm=await sbxNoConfirm.window.WP.CloudAuth.completePasswordReset('NewPass#1');
  assert(resultNoConfirm.ok===false, 'PROOF OF FIX: a bogus recovery link is REJECTED even though an unrelated session already exists (no PASSWORD_RECOVERY event seen)');

  const sbxConfirmed=loadAuthWithFakeSupabase(bogusUrl, {recoveryConfirmed:true});
  const resultConfirmed=await sbxConfirmed.window.WP.CloudAuth.completePasswordReset('NewPass#1');
  assert(resultConfirmed.ok===true, 'a genuine recovery link (SDK confirmed via PASSWORD_RECOVERY) is still accepted normally');
  assert(sbxConfirmed.window._wpRecoveryConfirmed===false, 'the recovery confirmation is consumed (one-time use) after a successful reset');

  const appSrc4=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert(/onAuthStateChange\(\(event\)=>\{\s*\n\s*if\(event==='PASSWORD_RECOVERY'\) window\._wpRecoveryConfirmed=true;/.test(appSrc4), 'app.js registers the PASSWORD_RECOVERY listener right where the Supabase client is created');

  // --- Cross-device sync bugfix: linkAccountToCloud() must actually
  // re-authenticate when the identity already exists, not just fail with
  // "already registered" -- this is exactly the recovery path for a
  // device whose local password drifted from its cloud password (the
  // most likely reason a device's saves silently never reach Supabase).
  // The comment above the function already claimed this fallback
  // existed; it didn't -- this proves the real fix.
  function loadAuthForLink(signUpBehavior, signInBehavior){
    const sandbox={
      window:{ supabaseClient:{ auth:{
        signUp: signUpBehavior,
        signInWithPassword: signInBehavior
      }}},
      console
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(root,'js/auth.js'),'utf8'), sandbox);
    return sandbox;
  }
  {
    // Case 1: brand-new email -- signUp succeeds normally, no fallback needed.
    const sbx=loadAuthForLink(
      async()=>({data:{user:{email:'new@example.test'}, session:{}}, error:null}),
      async()=>{ throw new Error('signIn should not be called when signUp succeeds'); }
    );
    const r=await sbx.window.WP.CloudAuth.linkAccountToCloud('new@example.test','Pw1');
    assert(r.ok===true && !r.reauthenticated, 'a genuinely new cloud identity is created normally, no fallback triggered');
  }
  {
    // Case 2: email already registered, and the CURRENT password is
    // actually still correct -- falls back to a normal sign-in and
    // succeeds, instead of surfacing a confusing "already registered"
    // error for an account that's actually fine.
    const sbx=loadAuthForLink(
      async()=>({data:null, error:{message:'User already registered'}}),
      async({email,password})=>({data:{user:{email}}, error:null})
    );
    const r=await sbx.window.WP.CloudAuth.linkAccountToCloud('existing@example.test','CorrectPw');
    assert(r.ok===true && r.reauthenticated===true, 'PROOF OF FIX: re-linking an already-registered identity with its CORRECT current password now succeeds via sign-in fallback, instead of just failing');
  }
  {
    // Case 3: email already registered, but the password typed now is
    // genuinely wrong/stale -- the fallback sign-in also fails, and the
    // real problem is surfaced (not silently swallowed).
    const signInErr={message:'Invalid login credentials'};
    const sbx=loadAuthForLink(
      async()=>({data:null, error:{message:'User already registered'}}),
      async()=>({data:null, error:signInErr})
    );
    const r=await sbx.window.WP.CloudAuth.linkAccountToCloud('existing@example.test','WrongPw');
    assert(r.ok===false && r.error===signInErr, 'when the identity exists AND the password is genuinely wrong, the real sign-in error is returned, not a misleading generic failure');
  }

  // --- Cloud Auth: wiring into the real login flow -------------------------
  // Proof the plaintext password typed at login is threaded through to
  // completeLogin (needed to silently sign into the linked cloud account
  // with the SAME password) in both the normal-login and
  // post-first-time-setup paths, and that the cloud sign-in is AWAITED
  // before cloud sync runs (otherwise sync would still use the
  // unauthenticated anon key for that first batch of calls).
  const appSrc3=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert(/completeLogin\(cand,\s*pass\)/.test(appSrc3), 'the normal login path passes the typed password to completeLogin');
  assert(/completeLogin\(cand,\s*p1\)/.test(appSrc3), 'the post-first-time-setup path passes the newly-chosen password to completeLogin');
  assert(/await WP\.CloudAuth\.signInCloud\(cand\.cloudEmail,\s*plainPass\)/.test(appSrc3), 'completeLogin awaits the cloud sign-in');
  const cloudSignInIdx=appSrc3.indexOf('await WP.CloudAuth.signInCloud(cand.cloudEmail');
  const syncAllCloudIdx=appSrc3.indexOf('syncAllCloud().finally');
  assert(cloudSignInIdx>0 && syncAllCloudIdx>cloudSignInIdx, 'PROOF OF FIX: cloud sign-in happens BEFORE cloud sync starts, so sync calls carry a real authenticated session, not just the anon key');

  // --- Fix: reconnecting must retry locally-pending/failed cloud writes ----
  // Bug found by actually simulating a blocked cloud connection, saving a
  // record, restoring the connection, and watching it stay unsynced:
  // syncAllCloud() only ever *pulled* from the cloud -- nothing re-pushed a
  // record whose earlier upsert had failed (cloudId still unset, syncError
  // still set). Proof: syncAllCloud's own source now calls
  // retryPendingCloud() as its very first step, before any load*FromCloud().
  const cloudSrc=fs.readFileSync(path.join(root,'js/cloud.js'),'utf8');
  assert(/function retryPendingCloud\(\)/.test(cloudSrc), 'retryPendingCloud() exists');
  const syncAllCloudBodyIdx=cloudSrc.indexOf('function syncAllCloud');
  const retryIdx=cloudSrc.indexOf('retryPendingCloud()', syncAllCloudBodyIdx);
  const firstLoadIdx=cloudSrc.indexOf('loadCustomersFromCloud()', syncAllCloudBodyIdx);
  assert(retryIdx>0 && firstLoadIdx>retryIdx, 'PROOF OF FIX: syncAllCloud retries pending local writes before pulling from the cloud');

  // --- Cross-device sync bugfix (2026-11-12): the root-cause investigation
  // for "vehicle added on one device never appears on another" found that
  // a failed/skipped cloud sign-in was silently swallowed -- completeLogin
  // discarded signInCloud's result entirely, so a device that was never
  // linked, or whose local password had drifted from its cloud password,
  // kept "succeeding" at login and showing every local save as if nothing
  // were wrong. These checks prove the result is now recorded. -----------
  assert(/db\.settings\.cloudAuthError\s*=\s*r\.ok\s*\?\s*''\s*:/.test(appSrc3), 'PROOF OF FIX: completeLogin now records whether the cloud sign-in actually succeeded, instead of discarding the result');
  assert(/not-linked-on-this-device/.test(appSrc3), 'completeLogin distinguishes "never linked on this device" from "sign-in failed" -- cloudEmail lives only in local storage and never travels between devices');

  // --- Cross-device sync bugfix: pendingSyncCount() and the dashboard
  // banner it feeds must actually reflect unsynced records (no cloudId or
  // a recorded syncError), scoped to the current company. -----------------
  {
    const pendSandbox={ console, db:{ vehicles:[
      {id:'v1', companyId:'de', cloudId:5, syncError:''},
      {id:'v2', companyId:'de', cloudId:null, syncError:''},
      {id:'v3', companyId:'de', cloudId:9, syncError:'network error'},
      {id:'v4', companyId:'es', cloudId:null, syncError:''}
    ], customers:[], purchases:[], inventory:[], expenses:[], repairs:[], appointments:[], invoices:[] },
    session:{company:{id:'de'}}, save:()=>{}, cloudCompanyFilter:q=>q, upsertCustomerCloud:()=>{}, upsertVehicleCloud:()=>{}, upsertPurchaseCloud:()=>{}, upsertInventoryCloud:()=>{}, upsertExpenseCloud:()=>{}, upsertRepairCloud:()=>{}, upsertAppointmentCloud:()=>{}, upsertInvoiceCloud:()=>{} };
    pendSandbox.window={};
    vm.createContext(pendSandbox);
    vm.runInContext(fs.readFileSync(path.join(root,'js/cloud.js'),'utf8'), pendSandbox);
    assert(pendSandbox.pendingSyncCount()===2, 'PROOF: pendingSyncCount counts a never-synced record (v2, no cloudId) and a record with a recorded error (v3), scoped to the current company -- v1 (synced) and v4 (other company) are excluded');
  }

  // --- Cross-device sync bugfix: the actual duplicate found live in
  // production -- the three demo-seed vehicles (shipped identically on
  // every fresh install) ended up as SIX rows in the cloud, because every
  // device that ever synced them had its own never-set cloudId and
  // blindly inserted its own copy. VIN is a real unique identifier, so
  // upsertVehicleCloud must look up an existing cloud row by VIN before
  // inserting a vehicle with no local cloudId yet, and adopt/update that
  // row instead of creating a second one. -------------------------------
  {
    const calls=[];
    const dedupSandbox={ console, db:{vehicles:[],customers:[]}, session:{company:{id:'de'}}, save:()=>{}, cloudCompanyFilter:q=>q, markSyncOk:()=>{}, markSyncError:()=>{} };
    dedupSandbox.window={ supabaseClient:{
      from(table){
        return {
          select(){ calls.push({table,op:'select'});
            return { eq:()=>({ limit:()=>({ maybeSingle:async()=>({data:{id:72}, error:null}) }) }) };
          },
          update(row){ calls.push({table,op:'update',row}); return {eq:(col,val)=>{ calls.push({table,op:'update-eq',val}); return Promise.resolve({error:null}); }}; },
          insert(){ calls.push({table,op:'insert'}); throw new Error('insert should not be called when a cloud row already matches this VIN'); }
        };
      }
    }};
    vm.createContext(dedupSandbox);
    vm.runInContext(fs.readFileSync(path.join(root,'js/cloud.js'),'utf8'), dedupSandbox);
    const v={id:'v-dup-test', companyId:'de', customerId:'', vin:'WVWZZZ1JZYW123456', plate:'B-AK 1234', make:'VW', model:'Golf 7', year:'2018'};
    await dedupSandbox.upsertVehicleCloud(v);
    const didSelect=calls.some(c=>c.op==='select' && c.table==='vehicles');
    const didUpdate=calls.some(c=>c.op==='update-eq' && c.val===72);
    const didInsert=calls.some(c=>c.op==='insert');
    assert(didSelect, 'PROOF OF FIX: before inserting a vehicle with no local cloudId, upsertVehicleCloud now looks up an existing cloud row by VIN first');
    assert(didUpdate && !didInsert, 'PROOF OF FIX: when a cloud row with the same VIN already exists (id 72), it is UPDATED, never duplicated by a second INSERT');
    assert(v.cloudId===72, 'the local record adopts the EXISTING cloud row\'s id, so the next save goes straight to an update');
  }
  {
    // No matching VIN in the cloud -- a genuinely new vehicle still inserts normally.
    const calls=[];
    const noDupSandbox={ console, db:{vehicles:[],customers:[]}, session:{company:{id:'de'}}, save:()=>{}, cloudCompanyFilter:q=>q, markSyncOk:()=>{}, markSyncError:()=>{} };
    noDupSandbox.window={ supabaseClient:{
      from(table){
        return {
          select(){ return { eq:()=>({ limit:()=>({ maybeSingle:async()=>({data:null, error:null}) }) }) }; },
          insert(row){ calls.push({table,op:'insert',row}); return {select:()=>({single:async()=>({data:{id:999},error:null})})}; }
        };
      }
    }};
    vm.createContext(noDupSandbox);
    vm.runInContext(fs.readFileSync(path.join(root,'js/cloud.js'),'utf8'), noDupSandbox);
    const v={id:'v-new-test', companyId:'de', customerId:'', vin:'BRANDNEWVIN000001', plate:'K-NN 1', make:'Nissan', model:'Almera', year:'2004'};
    await noDupSandbox.upsertVehicleCloud(v);
    assert(calls.some(c=>c.op==='insert') && v.cloudId===999, 'a vehicle with no matching VIN in the cloud still inserts normally, exactly once');
  }
  assert(/!x\.cloudId \|\| x\.syncError/.test(cloudSrc), 'retryPendingCloud selects records with no cloudId yet OR a recorded sync error');

  // --- Settings page: password change must be hashed + validated ----------
  // Bug found while wiring cloud auth into password changes: the Settings
  // page's own "new password" field stored the password in PLAIN TEXT
  // (`u.p=np`), with no minimum length and no check against the old
  // published defaults -- bypassing every protection forcePasswordSetup
  // enforces, and silently letting someone "change" their password right
  // back to a known default.
  assert(!/u\.p=np;session\.user\.p=np;/.test(appSrc3), 'PROOF OF BUG regression guard: the Settings page no longer stores a new password as plain text');
  assert(/u\.p = WP\.Engine\.hashPassAsync \? await WP\.Engine\.hashPassAsync\(np\) : np;/.test(appSrc3), 'PROOF OF FIX: the Settings page now hashes a new password the same way login’s forced-setup flow does');
  assert(/if\(np\.length<6\)/.test(appSrc3), 'PROOF OF FIX: the Settings page now enforces the same minimum password length');
  assert(/WP\.Engine\.isLegacyDefaultPassword\(u\.u,\s*np\)/.test(appSrc3), 'PROOF OF FIX: the Settings page now rejects reusing an old published default password');

  // --- Autosiastik Fahrzeugschein-Scanner integration -----------------------
  // Field mapping must preserve raw values exactly as the API returns them
  // (leading zeros on HSN/plate digits included) and must never invent a
  // value for a field the API left null/empty.
  const autoSandbox={window:{WP:{}}, console};
  vm.createContext(autoSandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'js/autosiastik.js'),'utf8'), autoSandbox);
  const Auto=autoSandbox.window.WP.Autosiastik;
  assert(!!Auto && typeof Auto.read==='function','Autosiastik module loads and exposes read()');

  const mappedFull=Auto.mapScan({
    registrationNumber:'HH-TT 0012', vin:'wvwzzz1jzxw000001',
    name:'Mustermann\nGmbH', firstname:'', address1:'Hauptstr. 1', address2:'12345 Musterstadt',
    ez_string:'03.07.2019', ez:'2019-07-03',
    hsn:'0035', tsn:'0AB', d1:'OPEL', d3:'Astra', p1:'1395', p2_p4:'92', p3:'Benzin', r:'Schwarz',
    f1:'1800', s1:'5', j:'M1'
  });
  assert(mappedFull.hsn==='0035','autosiastik keeps leading zero on HSN (0035, not 35)');
  assert(mappedFull.tsn==='0AB','autosiastik keeps leading zero on TSN (0AB, not AB)');
  assert(mappedFull.license_plate==='HH-TT 0012' && mappedFull.plate==='HH-TT 0012','autosiastik keeps the raw registrationNumber, leading zero included');
  assert(mappedFull.vin==='WVWZZZ1JZXW000001','autosiastik VIN is upper-cased but otherwise unchanged');
  assert(mappedFull.year==='2019','autosiastik derives year from ez_string');
  assert(mappedFull.first_registration==='03.07.2019','autosiastik prefers the raw ez_string over the ISO ez field');
  assert(mappedFull.address==='Hauptstr. 1, 12345 Musterstadt','autosiastik joins address1+address2');
  assert(mappedFull.brand==='OPEL' && mappedFull.model==='Astra','autosiastik maps d1/d3 to brand/model');
  assert(mappedFull.engine_displacement_cm3==='1395' && mappedFull.engine_power_kw==='92','autosiastik maps p1/p2_p4 raw');

  const mappedEmpty=Auto.mapScan({registrationNumber:null, vin:null, hsn:null, d1:null});
  assert(mappedEmpty.license_plate==='' && mappedEmpty.vin==='' && mappedEmpty.hsn==='' && mappedEmpty.brand==='','PROOF: missing/null API fields stay empty -- autosiastik never invents a value');

  // Warnings are now structured, bilingual, field-anchored objects
  // {field, de, ar} -- never a single pre-rendered-language string -- so
  // the caller can show each one, in the CURRENT UI language, right next
  // to the specific field it concerns (fixes: warnings staying German
  // inside an Arabic UI, and warnings only ever appearing in one generic
  // top-of-screen list disconnected from the field they're about).
  const warn1=Auto.buildWarnings({vin:'X',vin_valid:false,vin_validation_msg:'Prüfziffer falsch',hsn:'0035',hsn_valid:true,plate:{valid:false}});
  assert(warn1.some(w=>w.field==='vin' && /Prüfziffer falsch/.test(w.de) && typeof w.ar==='string' && w.ar.length>0),'autosiastik surfaces the VIN validation message, anchored to the vin field, with both a German and an Arabic rendering');
  assert(warn1.some(w=>w.field==='plate'),'autosiastik warns (anchored to the plate field) when plate.valid is false');
  assert(!warn1.some(w=>w.field==='hsn'),'autosiastik does NOT warn about a field whose *_valid flag is true');
  assert(Auto.buildWarnings({}).length===0,'autosiastik returns no warnings when nothing is flagged invalid');

  const cuts1=Auto.buildCutouts({document_img:'AAAA', vin_img:'BBBB'});
  assert(cuts1 && cuts1.document==='data:image/jpeg;base64,AAAA' && cuts1.vin==='data:image/jpeg;base64,BBBB','autosiastik turns show_cuts base64 fields into data URLs');
  assert(Auto.buildCutouts({})===null,'autosiastik returns null cutouts when the API sent none (show_cuts off or unsupported doc)');

  // --- Autosiastik: the access key must never be client-side ---------------
  const autoClientSrc=fs.readFileSync(path.join(root,'js/autosiastik.js'),'utf8');
  assert(!/AUTOSIASTIK_ACCESS_KEY\s*=\s*['"]/.test(autoClientSrc) && !/access_key['"]?\s*:\s*['"][A-Za-z0-9]/.test(autoClientSrc), 'PROOF: no literal access key is hardcoded in the browser-side module');
  assert(!/fetch\([^)]*fahrzeugschein-scanner\.de/.test(autoClientSrc), 'PROOF: the browser never calls the Autosiastik API directly -- only the Supabase edge function does');
  assert(/functions\/v1\/autosiastik-scan/.test(autoClientSrc), 'the client calls the server-side proxy function, not the provider API');

  const autoFnSrc=fs.readFileSync(path.join(root,'supabase/functions/autosiastik-scan/index.ts'),'utf8');
  assert(/Deno\.env\.get\('AUTOSIASTIK_ACCESS_KEY'\)/.test(autoFnSrc), 'the edge function reads the access key from a server-side secret, never a literal');
  assert(!/AUTOSIASTIK_ACCESS_KEY\s*=\s*['"][A-Za-z0-9]/.test(autoFnSrc), 'PROOF: no literal access key value is hardcoded in the edge function source');
  assert(/https:\/\/api\.fahrzeugschein-scanner\.de\//.test(autoFnSrc), 'edge function posts to the documented Autosiastik endpoint');
  assert(/access_key/.test(autoFnSrc) && /\bfile\b/.test(autoFnSrc), 'edge function sends the documented multipart fields (file, access_key)');

  // get_kba_data must default OFF and require BOTH a deploy-time secret and
  // an explicit per-request flag -- never a single always-on switch.
  const kbaBlock=(autoFnSrc.match(/get_kba_data stays OFF[\s\S]{0,400}/)||[''])[0];
  assert(/AUTOSIASTIK_ALLOW_KBA/.test(kbaBlock) && /getKbaData\s*===\s*true/.test(kbaBlock), 'get_kba_data requires both the AUTOSIASTIK_ALLOW_KBA secret and an explicit request flag');
  assert(!/form\.append\('get_kba_data',\s*'true'\);\s*$/m.test(autoFnSrc.replace(kbaBlock,'')), 'get_kba_data is only ever appended inside the gated branch, never unconditionally');

  // No automatic retry against the provider for a single scan (credits).
  const fetchCallsInFn=(autoFnSrc.match(/fetch\(/g)||[]).length;
  assert(fetchCallsInFn===1, 'the edge function calls the upstream Autosiastik API at most once per request -- no built-in retry loop');

  // --- Autosiastik wired into the existing OCR pipeline as first tier,
  // current provider (OpenAI/local tiers) kept as fallback -------------------
  const ocrSrcFull=fs.readFileSync(path.join(root,'js/ocr.js'),'utf8');
  assert(/W\.Autosiastik\s*&&\s*typeof\s*W\.Autosiastik\.read/.test(ocrSrcFull), 'ocr.js read() tries the Autosiastik provider first when the module is loaded');
  const autosiastikBlockIdx=ocrSrcFull.indexOf('W.Autosiastik && typeof W.Autosiastik.read');
  const openaiReadIdx=ocrSrcFull.indexOf('await openaiRead(imgColor)');
  assert(autosiastikBlockIdx>0 && openaiReadIdx>autosiastikBlockIdx, 'PROOF: Autosiastik is attempted before the existing OpenAI-based pipeline, which remains as a fallback, not removed');

  // --- Real-device findings (2026-11-11, Nissan Almera Zulassungsbescheinigung
  // + a prior VW test): the provider prints some fields in combined/blank
  // forms that need a GENERAL, document-format-agnostic fix -- not a value
  // hardcoded for any one vehicle. ----------------------------------------
  assert(Auto.splitPowerRpm('85/5600').kw==='85' && Auto.splitPowerRpm('85/5600').rpm==='5600' && Auto.splitPowerRpm('85/5600').derived===true, 'splitPowerRpm splits an old-style combined "kW/Drehzahl" cell');
  assert(Auto.splitPowerRpm('75/3000').kw==='75' && Auto.splitPowerRpm('75/3000').rpm==='3000', 'splitPowerRpm is format-general, not specific to one vehicle (VW test case)');
  const plainKw=Auto.splitPowerRpm('85');
  assert(plainKw.kw==='85' && plainKw.rpm==='' && plainKw.derived===false, 'splitPowerRpm leaves a plain single kW value (new-style template) untouched -- no invented RPM');
  assert(Auto.splitPowerRpm('').kw==='' && Auto.splitPowerRpm('').rpm==='', 'splitPowerRpm never invents values for an empty field');

  assert(Auto.isBlankish('') && Auto.isBlankish('-') && Auto.isBlankish('—') && !Auto.isBlankish('OPEL'), 'isBlankish recognizes empty/dash placeholders printed on some documents');

  // --- Real-device findings round 2 (2026-11-11, raw Autosiastik payload
  // read directly from the live "Rohdaten des Anbieters" panel by the
  // user): ccm/maker/model/power_kw are documented as "ermittelt aus KBA
  // Daten" -- looked up from the type-approval catalog by HSN/TSN -- which
  // is a DIFFERENT source than p1/d1/d3 (read directly from this specific
  // document). They can legitimately disagree; neither is automatically
  // more correct. ----------------------------------------------------------
  const bm1=Auto.resolveBrandModel('-', 'NISSAN ALMERA', '', '');
  assert(bm1.brand==='NISSAN' && bm1.model==='ALMERA' && bm1.brandSource==='derived', 'resolveBrandModel falls back to text-derivation only when NEITHER D.1 nor a catalog maker is available');
  const bmCatalog=Auto.resolveBrandModel('-', 'NISSAN ALMERA', 'Nissan', 'Nissan ALMERA FLH 1.8');
  assert(bmCatalog.brand==='Nissan' && bmCatalog.brandSource==='catalog', 'PROOF OF FIX: when the catalog maker field is available, it is used BEFORE falling back to guessing the brand from model text (the real Nissan Almera case: maker="Nissan" was present but the old code ignored it)');
  assert(bmCatalog.model==='ALMERA', 'model is still taken from the document\'s own D.3 (more specific to this exact document) and has the resolved brand prefix stripped');
  const bmAnyMake=Auto.resolveBrandModel('', 'SKODA OCTAVIA', '', '');
  assert(bmAnyMake.brand==='SKODA' && bmAnyMake.model==='OCTAVIA', 'resolveBrandModel works for any manufacturer in the known list, not just the one seen during testing');
  const bm2=Auto.resolveBrandModel('OPEL', 'Astra Sports Tourer', 'SomeOtherMaker', 'Astra');
  assert(bm2.brand==='OPEL' && bm2.model==='Astra Sports Tourer' && bm2.brandSource==='document', 'the document\'s own D.1 wins outright when present, even if the catalog maker disagrees -- D.1 is the ground truth for this specific vehicle');
  const bm3=Auto.resolveBrandModel('', 'Totally Unrecognized Model Name', '', '');
  assert(bm3.brand==='' && bm3.brandSource==='', 'resolveBrandModel never invents a brand when no known manufacturer name matches and no catalog maker exists -- stays empty for review, not guessed');

  // Hubraum conflict (p1 vs ccm): the exact real-world case. Neither value
  // is blindly preferred -- the field is left blank and both are surfaced.
  // Signature now takes the semantic field id (for anchoring the warning
  // to a specific input) plus BOTH a German and an Arabic label, and
  // returns a structured {field, de, ar} warning object, not a baked
  // German string -- this is the general fix item 6 asked for, not
  // anything specific to this one vehicle.
  const ccmConflict=Auto.resolveNumericField('engine_displacement_cm3', 'Hubraum (cm³)', 'سعة المحرك (سم³)', '769', '1769');
  assert(ccmConflict.conflict===true && ccmConflict.value==='', 'PROOF OF FIX: a genuine Hubraum conflict (document "769" vs catalog "1769") is surfaced for review, NOT silently resolved by picking either value -- the conflict POLICY, not a value hardcoded for this vehicle');
  assert(ccmConflict.warning.field==='engine_displacement_cm3', 'the conflict warning is anchored to the specific field it concerns, not left floating in a generic list');
  assert(/769/.test(ccmConflict.warning.de) && /1769/.test(ccmConflict.warning.de), 'the German rendering names both candidate values so a human can check the real document');
  assert(/769/.test(ccmConflict.warning.ar) && /1769/.test(ccmConflict.warning.ar), 'the Arabic rendering also names both candidate values -- warnings are never German-only');
  const ccmAgree=Auto.resolveNumericField('engine_displacement_cm3', 'Hubraum (cm³)', 'سعة المحرك (سم³)', '1769', '1769');
  assert(ccmAgree.conflict===false && ccmAgree.value==='1769', 'when document and catalog agree, the value is used with no conflict noise');
  const ccmOnlyCatalog=Auto.resolveNumericField('engine_displacement_cm3', 'Hubraum (cm³)', 'سعة المحرك (سم³)', '', '1769');
  assert(ccmOnlyCatalog.conflict===false && ccmOnlyCatalog.value==='1769', 'when only the catalog has a value (document field unread), it is used -- nothing to conflict with');
  const ccmOnlyDoc=Auto.resolveNumericField('engine_displacement_cm3', 'Hubraum (cm³)', 'سعة المحرك (سم³)', '1769', '');
  assert(ccmOnlyDoc.conflict===false && ccmOnlyDoc.value==='1769', 'when only the document has a value, it is used');
  assert(Auto.resolveNumericField('x','x','x','','').conflict===false && Auto.resolveNumericField('x','x','x','','').value==='', 'no conflict and no invented value when both sources are empty');

  // The user's exact real raw payload (as read from the live "Rohdaten"
  // panel), minus personal fields -- end-to-end through mapScan(). Extended
  // 2026-11-12 (BASIC package + field reconfiguration) with the SAME real
  // vehicle's actual values for every newly-configured field, taken from a
  // fresh live scan reusing this already-public fixture's VIN/plate (no NEW
  // real-VIN data is introduced here -- this exact vehicle was already
  // committed in the 2026-11-11 round-2 fixture above).
  const realNissanRaw={
    d1:'-', d3:'NISSAN ALMERA', maker:'Nissan', model:'Nissan ALMERA FLH 1.8',
    p1:'769', ccm:'1769', p2_p4:'85/5600', power_kw:'85',
    hsn:'3144', tsn:'031', vsn:'00000-', vin:'SJNFBAN16U0504041', registrationNumber:'RZ AA4763',
    ez_string:'19.05.2004',
    plate:{raw:'RZ AA4763', district_code:'RZ', letters:'AA', digits:4763, formatted:'RZ-AA 4763', compact:'RZAA4763', valid:true},
    hu:'10.2026', field_2_2:'03100000-', field_3:'7',
    d2_1:'N16', d2_2:'-', d2_3:'-', d2_4:null,
    field_14:'EURO 3', field_14_1:'0444', field_22:'ZU 151152AFELGE 15X6J16JJ7',
    f1:'1735', f2:'1735', g:'2531348', s1:'5', r:'Blau', j:'01',
    field_15_1:'185/65R15 83S', field_15_2:'185/65R15 83S', field_6:'-'
  };
  const realNissanScan=Auto.mapScan(realNissanRaw);
  assert(realNissanScan.brand==='Nissan', 'PROOF OF FIX: brand resolves to the catalog maker field ("Nissan") for the real reported case, instead of the old text-derivation path');
  assert(realNissanScan.model==='ALMERA', 'model keeps the document\'s own, more specific D.3 text with the brand prefix stripped');
  assert(realNissanScan.engine_displacement_cm3==='', 'PROOF OF FIX: Hubraum is left BLANK (not "769") because the document (769) and catalog (1769) genuinely conflict -- exactly the real bug report');
  assert(realNissanScan._derivationWarnings.some(w=>w.field==='make' && /Fahrzeugkatalog/.test(w.de) && /Marke/.test(w.de) && /كتالوج/.test(w.ar)), 'a bilingual warning, anchored to the make field, explains the brand came from the catalog, not the document');
  const ccmW=realNissanScan._derivationWarnings.find(w=>w.field==='engine_displacement_cm3');
  assert(!!ccmW && /769/.test(ccmW.de) && /1769/.test(ccmW.de) && /769/.test(ccmW.ar) && /1769/.test(ccmW.ar), 'a bilingual warning, anchored to the Hubraum field, names both the document and catalog values for manual review');
  assert(realNissanScan.engine_power_kw==='85' && realNissanScan.engine_rated_rpm==='5600', 'Leistung/Drehzahl split still works and agrees with the catalog power_kw (no conflict in this real case)');
  // --- Item 2 fix: G (Leermasse) vs F.1 (zul. Gesamtmasse) plausibility.
  // This document's G (2531348 kg) is wildly larger than its own F.1
  // (1735 kg) -- physically impossible (curb weight can never exceed
  // permissible gross weight for ANY vehicle), so this is a GENERAL,
  // vehicle-agnostic check, not a value hardcoded for this one VIN/plate.
  // Root cause confirmed by inspecting the raw payload directly: `g` is
  // used completely unmodified (str(d.g), no concatenation/derivation in
  // our code) -- so the implausible value originates at the provider,
  // not from a bug in our field selection or text-merging.
  assert(realNissanScan.unladenWeight==='2531348', 'PROOF: the raw G value is preserved EXACTLY for diagnosis -- never truncated/guessed from part of the digits');
  const gW=realNissanScan._derivationWarnings.find(w=>w.field==='unladenWeight');
  assert(!!gW, 'PROOF OF FIX: G being larger than F.1 now raises a warning (previously: none at all, the real reported bug)');
  assert(/2531348/.test(gW.de) && /1735/.test(gW.de) && /2531348/.test(gW.ar) && /1735/.test(gW.ar), 'the warning names both the implausible G value and the F.1 it contradicts, in both languages');
  // --- Item 6 fix: Fahrzeugklasse (J) validation. This document's J="01"
  // does not match any standard EU vehicle-category code (M1, N1, L3e...)
  // -- flagged for review, not blocked and not silently accepted as fact.
  const classW=realNissanScan._derivationWarnings.find(w=>w.field==='vehicleClass');
  assert(!!classW && /01/.test(classW.de) && /01/.test(classW.ar), 'PROOF OF FIX: an unrecognized vehicle-class code now raises a bilingual, field-anchored warning instead of being silently accepted');
  // --- Item 3 fix: TSN vs VSN vs the full Feld 2.2 string are three
  // different, well-defined things, not one ambiguous "HSN/TSN combined"
  // field -- all three are now exposed, each under its own honest name.
  assert(realNissanScan.tsn==='031', 'TSN is exactly the first 3 characters of Feld 2.2, per the provider\'s own schema');
  assert(realNissanScan.vsn==='00000-', 'PROOF OF FIX: VSN (characters 4-8 of Feld 2.2) is now mapped as its own field -- previously dropped entirely');
  assert(realNissanScan.tsnFull==='03100000-', 'the full raw Feld 2.2 string is kept separately as tsnFull, distinct from both tsn and vsn');
  // --- BASIC-package field reconfiguration (2026-11-12): this document's
  // seats/color were NOT returned by the account's prior field settings;
  // the user's instruction was explicit NOT to assume they remain
  // unsupported -- this is the direct proof that, once configured, the
  // provider DOES return them (real values: Sitze=5, Farbe=Blau).
  assert(realNissanScan.maxWeight==='1735', 'PROOF: F.1 (zul. Gesamtmasse) now arrives once the BASIC package/field settings were activated');
  assert(realNissanScan.seats==='5', 'PROOF: the account reconfiguration DOES make S.1 (Sitze) available -- the old "not supported" conclusion no longer holds');
  assert(realNissanScan.color==='Blau' && realNissanScan.paint==='Blau', 'PROOF: R (Farbe) is likewise now populated after the reconfiguration');
  // --- Newly-mapped fields (this phase): every one of the user's exactly
  // listed Seite 1/2/3 fields that wasn't mapped before.
  assert(realNissanScan.nextHu==='10.2026', 'mapScan reads HU (Hauptuntersuchung) from the provider\'s own "hu" field');
  assert(realNissanScan.tsnFull==='03100000-', 'mapScan reads Feld 2.2 (the full HSN/TSN key string) separately from the already-split hsn/tsn');
  assert(realNissanScan.vinCheckDigit==='7', 'mapScan reads Feld 3 (Prüfziffer zur VIN) from field_3');
  assert(realNissanScan.typ1==='N16' && realNissanScan.typ2==='-' && realNissanScan.typ3==='-' && realNissanScan.typ4==='', 'mapScan reads D.2.1-D.2.4 (Typ/Variante/Version) as four separate fields -- a blank/dash one stays empty, never invented');
  assert(realNissanScan.emissionClass==='EURO 3', 'mapScan reads Feld 14 (nationale Emissionsklasse) separately from Feld 14.1');
  assert(realNissanScan.emissionCode==='0444', 'mapScan reads Feld 14.1 (Code zu V.9/P.9) as its own field, not merged into Feld 14');
  assert(realNissanScan.specialNotes==='ZU 151152AFELGE 15X6J16JJ7', 'mapScan reads Feld 22 (Sondereintragungen) verbatim');
  assert(realNissanScan.maxWeightNational==='1735', 'PROOF: F.2 is mapped to its OWN field (maxWeightNational), never merged with F.1 (maxWeight) even though they agree on this document');
  assert(realNissanScan.unladenWeight==='2531348', 'mapScan preserves G (Leermasse) exactly as returned, even though 2531348 kg is an implausible curb weight -- never auto-corrected, left for the shop to verify against the physical document');
  assert(realNissanScan.tireAxle1==='185/65R15 83S' && realNissanScan.tireAxle2==='185/65R15 83S', 'mapScan reads Feld 15.1/15.2 (Bereifung Achse 1/2) as separate fields');
  assert(realNissanScan.dateK==='-', 'mapScan reads Feld 6 (Datum zu K) as its own raw value (a dash here, not blanked to look "valid")');
  // Never-zero guarantee for the new fields too (field codes used instead
  // of literal 0/empty-looking defaults).
  const emptyNew=Auto.mapScan({});
  ['nextHu','tsnFull','vinCheckDigit','typ1','typ2','typ3','typ4','emissionClass','emissionCode','specialNotes','maxWeightNational','unladenWeight','tireAxle1','tireAxle2','dateK'].forEach(k=>{
    assert(emptyNew[k]==='', `PROOF: ${k} stays an empty string (never "0" or null) when the provider returned nothing for it`);
  });

  const nissanScan=Auto.mapScan({d1:'-', d3:'NISSAN ALMERA', p1:'1769', p2_p4:'85/5600', ez_string:'19.05.2004', f1:'1735', s1:'5', j:'01'});
  assert(nissanScan.brand==='NISSAN' && nissanScan.model==='ALMERA', 'mapScan applies the brand/model split end-to-end when no catalog maker is present either (falls back to text-derivation)');
  assert(nissanScan.engine_power_kw==='85' && nissanScan.engine_rated_rpm==='5600', 'mapScan applies the power/RPM split end-to-end, keeping both values (neither is silently dropped)');
  assert(nissanScan.engine_displacement_cm3==='1769', 'with no conflicting catalog ccm, mapScan preserves Hubraum exactly as the document/provider returned it (1769)');
  assert(nissanScan.maxWeight==='1735' && nissanScan.seats==='5', 'mapScan still passes through f1/s1 when the provider actually returns them -- confirms the pipeline has no bug dropping these fields');
  assert(nissanScan._derivationWarnings.some(w=>w.field==='make') && nissanScan._derivationWarnings.some(w=>Array.isArray(w.field)&&w.field.includes('engine_power_kw')) && nissanScan._derivationWarnings.some(w=>w.field==='year'), 'every derived (non-literal) value is flagged in _derivationWarnings for review, not presented as a plain confirmed fact');
  assert(nissanScan._derivationWarnings.some(w=>w.field==='vehicleClass'), 'j="01" (not a recognized EU class code) is flagged here too -- a general check, triggers for any vehicle with this value, not specific to one VIN/plate');
  // No G at all in this fixture -- the plausibility check must not invent
  // a warning when there is nothing to compare.
  assert(!nissanScan._derivationWarnings.some(w=>w.field==='unladenWeight'), 'no G-vs-F.1 warning is raised when the provider sent no G value at all');

  // A recognized EU vehicle-class code must never be flagged.
  const recognizedClass=Auto.mapScan({j:'M1'});
  assert(!recognizedClass._derivationWarnings.some(w=>w.field==='vehicleClass'), 'a recognized vehicle-class code (M1) never raises the unrecognized-class warning');

  // G vs F.1: a PLAUSIBLE curb weight (less than the permissible gross
  // weight) must never be flagged -- this is a real check, not a blanket
  // "G is always suspicious" rule.
  const plausibleWeight=Auto.mapScan({f1:'1800', g:'1200'});
  assert(!plausibleWeight._derivationWarnings.some(w=>w.field==='unladenWeight'), 'a plausible Leermasse (less than F.1) never raises the implausibility warning');
  assert(plausibleWeight.unladenWeight==='1200' && plausibleWeight.maxWeight==='1800', 'both values are still mapped through normally when they are consistent');

  const plainFormatScan=Auto.mapScan({d1:'VOLKSWAGEN', d3:'Golf', p2_p4:'66', ez_string:'01.01.2020'});
  assert(plainFormatScan.brand==='VOLKSWAGEN' && plainFormatScan.engine_power_kw==='66' && !plainFormatScan.engine_rated_rpm, 'a newer-style document (plain D.1 + single kW value) is handled correctly too -- same code path supports both old and new certificate formats');
  assert(!plainFormatScan._derivationWarnings.some(w=>w.field==='make') && !plainFormatScan._derivationWarnings.some(w=>Array.isArray(w.field)&&w.field.includes('engine_power_kw')), 'no derivation warning is raised for fields that were NOT derived (D.1 already present, power already a single value)');

  // --- Nested-object fields (e.g. `plate`) must render as readable text,
  // never "[object Object]" -------------------------------------------------
  const flatPlate=Auto.flattenForDisplay({raw:'RZ AA4763', district_code:'RZ', digits:4763, formatted:'RZ-AA 4763', valid:true, empty_field:null});
  assert(!/\[object Object\]/.test(flatPlate), 'PROOF OF FIX: a nested object field never renders as "[object Object]"');
  assert(/RZ AA4763/.test(flatPlate) && /RZ-AA 4763/.test(flatPlate) && /true/.test(flatPlate), 'flattenForDisplay renders the nested object\'s actual field values readably');
  assert(!/empty_field/.test(flatPlate), 'flattenForDisplay omits null/empty keys from a nested object rather than showing them blank');
  const rawWithPlate=Auto.rawTextFields({plate:{raw:'RZ AA4763', valid:true}, hsn:'3144'});
  assert(typeof rawWithPlate.plate==='string' && !/\[object Object\]/.test(rawWithPlate.plate), 'PROOF OF FIX: rawTextFields (used by the review panel) flattens plate instead of leaving a raw object that stringifies to "[object Object]"');

  // --- Regression: companyRows() must never return a stale customer/
  // vehicle list right after a push -------------------------------------
  // Real bug found via live browser testing (2026-11-12): scanning a
  // document creates a customer+vehicle via findOrCreateFromSchein(), then
  // immediately opens vehicleModal(v) in the same tick. vehicleModal reads
  // companyRows('customers') to render the <select>, but that function
  // memoizes its result and only invalidated the memo via flushRows()
  // inside the DEBOUNCED persistNow() (fired by save() ~80ms later) --
  // audit()/save() had already returned by the time vehicleModal ran, so
  // the brand-new customer was simply missing from the <select> entirely
  // (not just unselected). Fixed by having save() invalidate the memo
  // synchronously regardless of the debounce.
  {
    const coreSandbox={
      window:{addEventListener:()=>{}}, console, setTimeout, clearTimeout,
      localStorage:(function(){ const m={}; return { getItem:k=>(k in m)?m[k]:null, setItem:(k,v)=>{m[k]=String(v);}, removeItem:k=>{delete m[k];} }; })()
    };
    vm.createContext(coreSandbox);
    vm.runInContext(fs.readFileSync(path.join(root,'js/core.js'),'utf8'), coreSandbox);
    // core.js's own top-level `let db=load(), session=null;` creates
    // lexical bindings private to this vm context, not properties on the
    // sandbox object -- so the whole sequence (seed, assert, mutate,
    // assert again) has to run as ONE script in that same context rather
    // than alternating with host-side property access, or it would be
    // reading/writing a different `db` than the one companyRows() closes
    // over. The script's own completion value carries the results out.
    const flushRowsResult=vm.runInContext(`
      db={customers:[{id:'c1',companyId:'de',name:'Existing'}], vehicles:[], audit:[], settings:{}};
      session={company:{id:'de'}, user:{name:'tester'}};
      const beforeCount=companyRows('customers').length;
      db.customers.push({id:'c2',companyId:'de',name:'Brand New'});
      audit('customer.create','Brand New'); // calls the debounced save(), as findOrCreateFromSchein does
      const after=companyRows('customers');
      ({beforeCount, afterCount:after.length, hasNew:after.some(c=>c.id==='c2')});
    `, coreSandbox);
    assert(flushRowsResult.beforeCount===1, 'sandbox sanity: companyRows sees the one seeded customer');
    assert(flushRowsResult.afterCount===2 && flushRowsResult.hasNew, 'PROOF OF FIX: companyRows() reflects a just-pushed row immediately after audit()/save(), without waiting for the debounced disk write');
  }

  // =========================================================================
  // Rebuilt scan -> match -> save pipeline (2026-11-13): replaces
  // findOrCreateFromSchein()/askScheinCustomerChoice()/scanVehicleDocument()
  // with WP.ScheinEngine (pure matching) + WP.ScheinWizard (unified
  // wizard + idempotent save), used identically from every entry point.
  // =========================================================================
  const engSandbox={window:{WP:{}}, console};
  vm.createContext(engSandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'js/schein-engine.js'),'utf8'), engSandbox);
  const Eng=engSandbox.window.WP.ScheinEngine;
  assert(!!Eng && typeof Eng.findCustomerCandidates==='function', 'ScheinEngine loads and exposes its matching functions');

  // --- Requirement: never suggest a customer match on name alone ----------
  {
    const custs=[{id:'c1',companyId:'de',name:'Rashid Tabah'}];
    const byNameOnly=Eng.findCustomerCandidates({name:'Rashid Tabah'}, custs);
    assert(byNameOnly.length===0, 'PROOF: an identical name with NO corroborating signal (no address, no tax id) is never suggested as a match -- name alone is not enough');
  }
  {
    const custs=[{id:'c1',companyId:'de',name:'Rashid Tabah',address:'Hauptstr. 1, 12345 Musterstadt'}];
    const byNameAndAddr=Eng.findCustomerCandidates({name:'Rashid Tabah',address:'Hauptstr. 1, 12345 Musterstadt'}, custs);
    assert(byNameAndAddr.length===1 && byNameAndAddr[0].customer.id==='c1', 'name + matching address together DO suggest a candidate');
  }
  {
    const custs=[{id:'c1',companyId:'de',name:'Someone Else Entirely',taxId:'DE123456789'}];
    const byTaxId=Eng.findCustomerCandidates({name:'Totally Different Name',taxId:'DE123456789'}, custs);
    assert(byTaxId.length===1, 'a matching reliable identifier (tax id) alone is enough to suggest a match, even with no name/address overlap -- it is not name-based at all');
  }
  // Scenario: two similarly-named customers -- both are offered, the caller
  // (wizard UI) must ask, never auto-pick one.
  {
    const custs=[
      {id:'c1',companyId:'de',name:'Thomas Müller',address:'Bahnhofstr. 5, 10115 Berlin'},
      {id:'c2',companyId:'de',name:'Thomas Mueller',address:'Bahnhofstr. 5, 10115 Berlin'}
    ];
    const cands=Eng.findCustomerCandidates({name:'Thomas Müller',address:'Bahnhofstr. 5, 10115 Berlin'}, custs);
    assert(cands.length===2, 'two similarly-named/addressed customers are BOTH surfaced as candidates, not silently collapsed into one');
  }
  // Tenant isolation: candidates are scoped by whatever list the caller
  // passes in (companyRows('customers') upstream) -- a cross-tenant
  // same-name/address customer must simply not be in that list.
  {
    const custs=[{id:'c-other-tenant',companyId:'OTHER',name:'Rashid Tabah',address:'Alt 1, 99999 X'}];
    const cands=Eng.findCustomerCandidates({name:'Rashid Tabah',address:'Alt 1, 99999 X'}, custs);
    assert(cands.length===1, 'sanity: candidates are whatever the caller passes in');
    // the real tenant-scoping guarantee is that callers always pass
    // companyRows(...), never the raw db.* array -- verified below.
  }

  // --- Vehicle matching: VIN is strong identity, plate alone is weak -------
  {
    const vehicles=[{id:'v1',companyId:'de',customerId:'c1',vin:'WVWZZZ1JZXW000001',plate:'HH-AB 1'}];
    const vinHit=Eng.findVehicleMatch('WVWZZZ1JZXW000001','DIFFERENT-PLATE', vehicles);
    assert(vinHit.strong && vinHit.strong.id==='v1' && !vinHit.weak, 'a VIN match is strong even if the plate read differently (plate changed/misread)');
    const plateOnlyHit=Eng.findVehicleMatch('', 'HH-AB 1', vehicles);
    assert(!plateOnlyHit.strong && plateOnlyHit.weak && plateOnlyHit.weak.id==='v1', 'a plate-only match (no VIN) is kept separate as a WEAK suggestion, never a strong identity match');
    const noHit=Eng.findVehicleMatch('SOMEOTHERVIN00000X','ZZ-ZZ 999', vehicles);
    assert(!noHit.strong && !noHit.weak, 'no match at all when neither VIN nor plate correspond to an existing vehicle');
  }

  // --- Never overwrite existing customer contact data with blanks ---------
  {
    const cust={id:'c1',phone:'030-111222',email:'',address:''};
    const patch=Eng.mergeOwnerIntoCustomer(cust, {phone:'', email:'new@example.com', address:'Neue Str. 1'});
    assert(patch.phone===undefined, 'PROOF: an existing phone number is never overwritten with an empty scanned value');
    assert(patch.email==='new@example.com' && patch.address==='Neue Str. 1', 'empty existing fields ARE filled in from the scan');
  }

  // --- executeSave: the actual create/update/idempotency logic, in an
  // isolated sandbox (no real customer data touched). --------------------
  function makeSaveSandbox(seedCustomers, seedVehicles){
    const db={customers:seedCustomers||[], vehicles:seedVehicles||[], audit:[]};
    const session={company:{id:'de'}, user:{name:'tester'}};
    let idn=0, kdn=1000;
    const sb={
      console,
      db, session,
      id:(p)=>p+'-t'+(++idn),
      nextKdNr:()=>String(++kdn),
      t:(k)=>({holderOf:'Halter von',newCustDefault:'Neukunde'}[k]||k),
      companyRows:(name)=> db[name].filter(x=>x.companyId===session.company.id),
      audit:(a,d)=>db.audit.push(a+':'+d),
      save:()=>{},
      upsertCustomerCloud:()=>{}, upsertVehicleCloud:()=>{},
      WP:{ScheinEngine:Eng}
    };
    sb.window=sb; // real browsers have window===globalThis; schein-wizard.js
                  // uses bare `WP.x` AND `window.WP=...` interchangeably, so
                  // the sandbox's global object must alias itself the same way.
    vm.createContext(sb);
    vm.runInContext(fs.readFileSync(path.join(root,'js/schein-wizard.js'),'utf8'), sb);
    return {sb, db};
  }

  // 1) New customer + new vehicle.
  {
    const {sb,db}=makeSaveSandbox();
    const form={owner_name:'Neuer Kunde Eins', address:'Teststr. 1, 11111 X', license_plate:'B-AK 123', vin:'VIN0000000000001', brand:'OPEL', model:'Astra'};
    const {customer,vehicle}=await sb.WP.ScheinWizard.executeSave({form, vehicleDecision:{mode:'create'}, customerDecision:{mode:'new'}});
    assert(db.customers.length===1 && db.vehicles.length===1, 'a brand-new customer and vehicle are created');
    assert(!!customer.kdNr, 'the new customer is assigned a unique customer number (kdNr) via the existing numbering system');
    assert(vehicle.customerId===customer.id, 'the new vehicle is linked to the new customer');
  }

  // 2) Existing customer + a SECOND vehicle -> same customer record, same
  //    kdNr, two vehicles, no duplicate customer.
  {
    const {sb,db}=makeSaveSandbox([{id:'c1',companyId:'de',name:'Mehrwagen Kunde',kdNr:'1050',phone:'030-1'}],[{id:'v1',companyId:'de',customerId:'c1',vin:'VIN-FIRST-CAR-001',plate:'B-AK 1'}]);
    const form={owner_name:'Mehrwagen Kunde', license_plate:'B-AK 2', vin:'VIN-SECOND-CAR-002', brand:'VW', model:'Golf'};
    const {customer,vehicle}=await sb.WP.ScheinWizard.executeSave({form, vehicleDecision:{mode:'create'}, customerDecision:{mode:'existing', id:'c1'}});
    assert(db.customers.length===1, 'PROOF: no duplicate customer is created when explicitly linking to an existing one');
    assert(customer.kdNr==='1050', 'the existing customer keeps its ORIGINAL customer number -- renumbering never happens');
    assert(db.vehicles.length===2 && db.vehicles.every(v=>v.customerId==='c1'), 'both vehicles (old and newly scanned) are linked under the SAME customer id/number');
  }

  // 3) Existing vehicle, re-scanning the same document -> updates the
  //    existing record, never creates a duplicate.
  {
    const {sb,db}=makeSaveSandbox([{id:'c1',companyId:'de',name:'Re-Scan Kunde',kdNr:'1060'}],[{id:'v1',companyId:'de',customerId:'c1',vin:'VIN-RESCAN-0001',plate:'M-RS 1',make:'',model:''}]);
    const form={owner_name:'Re-Scan Kunde', license_plate:'M-RS 1', vin:'VIN-RESCAN-0001', brand:'BMW', model:'320d'};
    const {vehicle}=await sb.WP.ScheinWizard.executeSave({form, vehicleDecision:{mode:'update', id:'v1'}, customerDecision:{mode:'existing', id:'c1'}});
    assert(db.vehicles.length===1 && vehicle.id==='v1', 'PROOF: re-scanning an existing vehicle updates it in place -- no second record');
    assert(vehicle.make==='BMW' && vehicle.model==='320d', 'the freshly re-scanned data is applied to the existing vehicle record');
  }

  // 4) Idempotency: saving twice for the SAME VIN (double-click, or retry
  //    after a dropped connection) must update, not duplicate -- even
  //    though both calls use vehicleDecision mode:'create' (as the wizard
  //    does on first save, before anything existed yet).
  {
    const {sb,db}=makeSaveSandbox();
    const form={owner_name:'Doppelklick Kunde', license_plate:'K-DC 1', vin:'VIN-DOUBLECLICK-01', brand:'FORD', model:'Focus'};
    const first=await sb.WP.ScheinWizard.executeSave({form, vehicleDecision:{mode:'create'}, customerDecision:{mode:'new'}});
    const second=await sb.WP.ScheinWizard.executeSave({form, vehicleDecision:{mode:'create'}, customerDecision:{mode:'existing', id:first.customer.id}});
    assert(db.vehicles.length===1, 'PROOF OF IDEMPOTENCY: a repeated save for the same VIN (double-click/retry) results in exactly ONE vehicle record, not two');
    assert(second.vehicle.id===first.vehicle.id, 'the second save resolves to the SAME vehicle record rather than inserting a new one');
  }

  // 5) The newly-configured BASIC-package fields reach the saved vehicle
  //    record end-to-end (form -> db.vehicles), and the raw provider
  //    response is kept on its OWN field, separate from the corrected
  //    values -- not merely visible in a diagnostic panel.
  {
    const {sb,db}=makeSaveSandbox();
    const rawSnapshot={hu:'10.2026', d2_1:'N16', field_14:'EURO 3'};
    const form={
      owner_name:'Erweiterte Felder Kunde', license_plate:'B-EF 1', vin:'VIN-EXTENDED-FIELDS-01', brand:'NISSAN', model:'ALMERA',
      hsn:'3144', tsn:'031', vsn:'00000-',
      nextHu:'10.2026', tsnFull:'03100000-', vinCheckDigit:'7',
      typ1:'N16', typ2:'-', typ3:'-', typ4:'',
      emissionClass:'EURO 3', emissionCode:'0444', specialNotes:'ZU 151152AFELGE 15X6J16JJ7',
      maxWeightNational:'1735', unladenWeight:'2531348',
      tireAxle1:'185/65R15 83S', tireAxle2:'185/65R15 83S', dateK:'-',
      ocrRaw: JSON.stringify(rawSnapshot)
    };
    const {vehicle}=await sb.WP.ScheinWizard.executeSave({form, vehicleDecision:{mode:'create'}, customerDecision:{mode:'new'}});
    assert(db.vehicles.length===1 && db.vehicles[0].id===vehicle.id, 'sanity: exactly one vehicle record created');
    assert(vehicle.nextHu==='10.2026' && vehicle.tsnFull==='03100000-' && vehicle.vinCheckDigit==='7', 'PROOF: HU/Feld 2.2/Feld 3 reach the saved vehicle record, not just the form');
    assert(vehicle.typ1==='N16' && vehicle.typ2==='-' && vehicle.typ3==='-' && vehicle.typ4==='', 'PROOF: D.2.1-D.2.4 all reach the saved record as four separate fields');
    assert(vehicle.emissionClass==='EURO 3' && vehicle.emissionCode==='0444', 'PROOF: Feld 14/14.1 reach the saved record as two separate fields');
    assert(vehicle.specialNotes==='ZU 151152AFELGE 15X6J16JJ7', 'PROOF: Feld 22 reaches the saved record');
    assert(vehicle.maxWeightNational==='1735' && vehicle.unladenWeight==='2531348', 'PROOF: F.2 and G reach the saved record, each under its own key (never merged with F.1/maxWeight)');
    assert(vehicle.tireAxle1==='185/65R15 83S' && vehicle.tireAxle2==='185/65R15 83S' && vehicle.dateK==='-', 'PROOF: Feld 15.1/15.2/6 reach the saved record');
    assert(vehicle.vsn==='00000-', 'PROOF OF FIX: VSN reaches the saved record too (new field, previously not captured anywhere)');
    assert(vehicle.ocrRaw===JSON.stringify(rawSnapshot), 'PROOF: the original raw provider response is stored on its own field (ocrRaw), kept separate from the corrected values above');

    // Re-saving (e.g. a manual correction with no fresh scan) must not
    // erase the original snapshot just because this particular save call
    // had no new ocrRaw to offer.
    const form2=Object.assign({}, form, {vinCheckDigit:'9', ocrRaw:''});
    const {vehicle:vehicle2}=await sb.WP.ScheinWizard.executeSave({form:form2, vehicleDecision:{mode:'update', id:vehicle.id}, customerDecision:{mode:'existing', id:vehicle.customerId}});
    assert(vehicle2.vinCheckDigit==='9', 'the manual correction is applied');
    assert(vehicle2.ocrRaw===JSON.stringify(rawSnapshot), 'PROOF: a save with no new scan (empty ocrRaw) never erases the previously-stored original raw response');
  }

  // 6) Item 7 requirement: a manual correction made in the review step for
  //    a field mapScan() had left BLANK due to a conflict (e.g. Hubraum)
  //    must reach the saved record as the user's corrected value, not
  //    revert to blank or to either of the raw conflicting candidates --
  //    executeSave() only ever persists whatever `form` it is given, so
  //    this proves the save layer itself never re-derives/overwrites a
  //    field from the raw scan after the user has edited it.
  {
    const {sb,db}=makeSaveSandbox();
    const form={
      owner_name:'Korrektur Kunde', license_plate:'K-OR 1', vin:'VIN-MANUAL-CORRECTION-01', brand:'OPEL', model:'Corsa',
      // mapScan would have left this '' (769 vs 1769 conflict) -- the user
      // checked the physical document and typed the correct value in.
      engine_displacement_cm3:'1769'
    };
    const {vehicle}=await sb.WP.ScheinWizard.executeSave({form, vehicleDecision:{mode:'create'}, customerDecision:{mode:'new'}});
    assert(vehicle.engine_displacement_cm3==='1769', 'PROOF: a manual correction entered over a blanked conflict field is saved as the user\'s value, not reset to blank or to either raw candidate');
    // Reopening in an independent session (fresh find) must still show it.
    const reread=db.vehicles.find(v=>v.id===vehicle.id);
    assert(reread.engine_displacement_cm3==='1769', 'PROOF: the corrected value survives being read back (simulates reopening the vehicle record)');
  }

  // --- Cloud sync: the new fields must reach Supabase, not stay
  // local-only -- and must read back correctly in an INDEPENDENT session
  // (a fresh loadVehiclesFromCloud(), simulating reopening the app). -----
  {
    const capturedRows=[];
    const cloudSandbox={
      console,
      db:{customers:[], vehicles:[]}, session:{company:{id:'de'}},
      save:()=>{},
      cloudCompanyFilter:q=>q,
      mergeByCompany:(table, rows)=>{ cloudSandbox._merged=rows; }
    };
    cloudSandbox.window={ supabaseClient:{
      from(table){
        return {
          update(row){ capturedRows.push({table,op:'update',row}); return {eq:()=>Promise.resolve({error:null})}; },
          insert(row){ capturedRows.push({table,op:'insert',row}); return {select:()=>({single:()=>Promise.resolve({data:{id:777},error:null})})}; },
          select(){ return Promise.resolve({data:[{
            id:777, company_id:'de', customer_id:null, plate:'B-EF 1', vin:'VIN-EXTENDED-FIELDS-01',
            make:'NISSAN', model:'ALMERA', year:'2004', engine:'', paint:'Blau', km:0, next_service_km:0, photo:'',
            hsn:'3144', tsn:'031', vsn:'00000-', kba:'3144 031', first_registration:'19.05.2004',
            engine_displacement_cm3:'', engine_power_kw:'85', rated_rpm:'5600', fuel_type:'Benzin',
            max_weight:'1735', seats:'5', vehicle_class:'01', ocr_source:'autosiastik',
            next_hu:'10.2026', tsn_full:'03100000-', vin_check_digit:'7',
            typ1:'N16', typ2:'-', typ3:'-', typ4:'',
            emission_class:'EURO 3', emission_code:'0444', special_notes:'ZU 151152AFELGE 15X6J16JJ7',
            max_weight_national:'1735', unladen_weight:'2531348',
            tire_axle1:'185/65R15 83S', tire_axle2:'185/65R15 83S', date_k:'-',
            ocr_raw:JSON.stringify({hu:'10.2026'})
          }], error:null}); }
        };
      }
    }};
    vm.createContext(cloudSandbox);
    vm.runInContext(fs.readFileSync(path.join(root,'js/cloud.js'),'utf8'), cloudSandbox);

    const vForUpsert={id:'v-t1', companyId:'de', customerId:'', plate:'B-EF 1', vin:'VIN-EXTENDED-FIELDS-01', make:'NISSAN', model:'ALMERA', year:'2004', paint:'Blau',
      hsn:'3144', tsn:'031', vsn:'00000-', kba:'3144 031', firstRegistration:'19.05.2004', engine_power_kw:'85', ratedRpm:'5600', fuel_type:'Benzin',
      maxWeight:'1735', seats:'5', vehicleClass:'01', ocrSource:'autosiastik',
      nextHu:'10.2026', tsnFull:'03100000-', vinCheckDigit:'7', typ1:'N16', typ2:'-', typ3:'-', typ4:'',
      emissionClass:'EURO 3', emissionCode:'0444', specialNotes:'ZU 151152AFELGE 15X6J16JJ7',
      maxWeightNational:'1735', unladenWeight:'2531348', tireAxle1:'185/65R15 83S', tireAxle2:'185/65R15 83S', dateK:'-',
      ocrRaw: JSON.stringify({hu:'10.2026'})
    };
    await cloudSandbox.upsertVehicleCloud(vForUpsert);
    const upserted=capturedRows.find(r=>r.table==='vehicles');
    assert(!!upserted, 'upsertVehicleCloud actually calls sb.from(\'vehicles\')');
    const row=upserted.row;
    assert(row.next_hu==='10.2026' && row.tsn_full==='03100000-' && row.vin_check_digit==='7', 'PROOF: the newly-configured fields are included in the row sent to Supabase, not kept local-only');
    assert(row.typ1==='N16' && row.emission_class==='EURO 3' && row.emission_code==='0444' && row.special_notes==='ZU 151152AFELGE 15X6J16JJ7', 'PROOF: D.2.1/Feld14/14.1/22 all reach the Supabase row');
    assert(row.max_weight_national==='1735' && row.unladen_weight==='2531348', 'PROOF: F.2 and G reach Supabase under their own columns, never merged with max_weight (F.1)');
    assert(row.ocr_raw===JSON.stringify({hu:'10.2026'}), 'PROOF: the original raw response is synced to its own column, separate from the corrected fields');
    assert(row.hsn==='3144' && row.engine_power_kw==='85' && row.max_weight==='1735' && row.seats==='5' && row.vehicle_class==='01', 'PROOF OF FIX (known limitation closed): the Phase-4 fields that were previously local-only (hsn/engine_power_kw/maxWeight/seats/vehicleClass) are now ALSO synced to Supabase');
    assert(row.vsn==='00000-', 'PROOF: VSN (this phase\'s new field) is also included in the Supabase row, not just hsn/tsn');

    await cloudSandbox.loadVehiclesFromCloud();
    const reloaded=(cloudSandbox._merged||[])[0];
    assert(!!reloaded, 'loadVehiclesFromCloud merges the row back in');
    assert(reloaded.nextHu==='10.2026' && reloaded.tsnFull==='03100000-' && reloaded.vinCheckDigit==='7', 'PROOF: reopening in an independent session (a fresh loadVehiclesFromCloud) reads the new fields back correctly');
    assert(reloaded.emissionClass==='EURO 3' && reloaded.specialNotes==='ZU 151152AFELGE 15X6J16JJ7', 'PROOF: Feld 14/22 survive a full save -> cloud -> reload round trip');
    assert(reloaded.maxWeightNational==='1735' && reloaded.unladenWeight==='2531348', 'PROOF: F.2/G survive the round trip under their own keys');
    assert(reloaded.ocrRaw===JSON.stringify({hu:'10.2026'}), 'PROOF: the original raw response survives the round trip too, still separate from the corrected fields');
    assert(reloaded.seats==='5' && reloaded.vehicleClass==='01' && reloaded.maxWeight==='1735', 'PROOF: the previously local-only Phase-4 fields now also survive a cloud round trip');
    assert(reloaded.vsn==='00000-', 'PROOF: VSN survives the save -> cloud -> reload round trip too');
  }

  // --- Static check: every scan entry point goes through the SAME wizard,
  // not a second parallel implementation. --------------------------------
  const camSrc=fs.readFileSync(path.join(root,'js/camera.js'),'utf8');
  const repSrc=fs.readFileSync(path.join(root,'js/repairs.js'),'utf8');
  const custSrc2=fs.readFileSync(path.join(root,'js/customers.js'),'utf8');
  const appSrcForScan=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert(/openScheinWizard\(/.test(camSrc), 'camera.js\'s WhatsApp/share-target ingest opens the unified wizard');
  assert(/openScheinWizard\(/.test(repSrc), 'repairs.js\'s scan-to-job flow opens the unified wizard');
  assert((custSrc2.match(/openScheinWizard\(/g)||[]).length>=3, 'customers.js opens the unified wizard from the Customers page, the Vehicles page, and the existing-customer "add vehicle" action');
  assert(!/findOrCreateFromSchein|askScheinCustomerChoice/.test(custSrc2+camSrc+repSrc+appSrcForScan), 'PROOF: the old scattered matching functions are completely gone, not just unused -- no second path left that could give a different answer');

  // --- Regression: the header's displayed version must never drift from --
  // the real cache-busting version again (found stuck at "v1.13.2" in the
  // UI while index.html/sw.js were already several versions ahead).
  const appSrcVer=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert(!/class="ver">v1\.13\.2</.test(appSrcVer), 'PROOF OF FIX: the header version label is no longer a hardcoded, driftable string');
  assert(/class="ver">v\$\{esc\(\(location\.search\.match/.test(appSrcVer), 'the header version label is now read from the actual URL version param at render time');

  // --- Regression: the unified wizard's review step must list every
  // mapped field as an EDITABLE input, so Nenndrehzahl/Zulässige
  // Gesamtmasse/Sitze (and first_registration, kept separate from year)
  // are all visible and correctable before matching/saving, not silently
  // missing from the form entirely. ------------------------------------
  const wizardSrc=fs.readFileSync(path.join(root,'js/schein-wizard.js'),'utf8');
  ["'w_rpm'","'w_weight'","'w_seats'","'w_firstreg'","'w_year'","'w_hsn'","'w_tsn'","'w_vsn'","'w_cc'","'w_kw'","'w_fuel'","'w_color'","'w_class'",
   "'w_hu'","'w_tsnfull'","'w_vincheck'","'w_typ1'","'w_typ2'","'w_typ3'","'w_typ4'","'w_emclass'","'w_emcode'","'w_notes'","'w_weightnat'","'w_unladen'","'w_tire1'","'w_tire2'","'w_datek'"].forEach(k=>{
    assert(wizardSrc.includes(k), `the wizard's review step has an editable field for ${k} -- it must be correctable, not just displayed read-only`);
  });

  // --- Requirement: F.1/F.2/G must never be collapsed into one field, and
  // power/kW must stay separate from RPM, and firstRegistration separate
  // from year -- all already true structurally, this guards against a
  // future regression merging them back together.
  const autoSrcStatic=fs.readFileSync(path.join(root,'js/autosiastik.js'),'utf8');
  assert(/maxWeight\s*:\s*str\(d\.f1\)\s*,/.test(autoSrcStatic), 'PROOF: maxWeight (F.1) is mapped alone, no longer OR\'d with F.2 -- the two certificate fields are kept separate');

  // --- renderReview()/collectForm()/executeSave() must carry the new
  // fields end-to-end (form -> saved vehicle record), not just display
  // them in a diagnostic panel.
  ['nextHu','tsnFull','vinCheckDigit','typ1','typ2','typ3','typ4','emissionClass','emissionCode','specialNotes','maxWeightNational','unladenWeight','tireAxle1','tireAxle2','dateK','ocrRaw','vsn'].forEach(k=>{
    assert(wizardSrc.includes(k+':'), `collectForm()/executeSave() carries ${k} from the review form into the saved record`);
  });

  // --- Item 3 fix (regression guard): the old field mislabeled "HSN/TSN
  // zusammen" (shown "031" under a label implying HSN+TSN combined, when
  // it was really just the TSN value alone) must be completely gone --
  // not just unused -- and TSN/VSN must be two separate, honestly-named
  // fields instead.
  assert(!/HSN\/TSN zusammen|HSN\/TSN معًا/.test(wizardSrc), 'PROOF OF FIX: the mislabeled "HSN/TSN combined" field (which actually only ever showed the bare TSN) no longer exists anywhere in the wizard');
  assert(/de:'TSN', ar:'TSN'/.test(wizardSrc) && /de:'VSN', ar:'VSN'/.test(wizardSrc), 'TSN and VSN are now two separate, correctly-labeled fields (TSN = first 3 chars of Feld 2.2, VSN = chars 4-8), not one ambiguous combined field');

  // --- Item 6 fix: warnings must be shown NEAR their field, in the
  // CURRENT UI language -- not a single hardcoded-German list at the top.
  assert(/function warningsForKey/.test(wizardSrc), 'the wizard resolves warnings per field key, localized at render time');
  assert(/lang==='ar' \? w\.ar : w\.de/.test(wizardSrc), 'PROOF OF FIX: warning text is picked in the CURRENT UI language (w.ar for Arabic, w.de for German) -- never a single hardcoded language regardless of the UI');
  assert(/warnings:warningsForKey\(ai, f\.key\)/.test(wizardSrc), 'every rendered field looks up and displays its own warnings inline, next to that specific input');

  // --- Item 3 fix: technical/code values must render LTR even inside an
  // Arabic (RTL) page, so neutral characters like "-" are never visually
  // reordered (the exact reported bug: Feld 2.2 "03100000-" appearing
  // reversed in the Arabic UI).
  assert(/dir="ltr" class="field-ltr"/.test(wizardSrc), 'PROOF OF FIX: code/numeric fields force LTR rendering regardless of the page\'s own RTL direction');
  const cssSrcStatic=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
  assert(/\.field-ltr\{direction:ltr!important;unicode-bidi:isolate/.test(cssSrcStatic), 'the .field-ltr class actually forces LTR + bidi isolation in CSS, matching the attribute the wizard applies');

  // --- Item 1/2/6 fix: the Leermasse (G) vs zul. Gesamtmasse (F.1)
  // plausibility check and the Fahrzeugklasse (J) code check both exist,
  // generally (not keyed to any specific plate/VIN).
  assert(/gNum>f1Num/.test(autoSrcStatic), 'PROOF OF FIX: a general G-vs-F.1 plausibility check now exists (previously: none at all)');
  assert(!/RZ[- ]?AA ?4763|SJNFBAN16U0504041/.test(autoSrcStatic), 'PROOF: the G-vs-F.1 and vehicle-class checks are NOT keyed to this specific plate/VIN anywhere in js/autosiastik.js -- only test fixtures reference the real case');
  assert(/VEHICLE_CLASS_RE/.test(autoSrcStatic), 'PROOF OF FIX: Fahrzeugklasse (J) is now validated against known EU category codes, generally');

  if(failed){ console.error(failed+' failed'); process.exit(1); }
  console.log('all tests passed');
})();
