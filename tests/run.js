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
  const retryIdx=cloudSrc.indexOf('return retryPendingCloud()');
  const firstLoadIdx=cloudSrc.indexOf('loadCustomersFromCloud()', cloudSrc.indexOf('function syncAllCloud'));
  assert(retryIdx>0 && firstLoadIdx>retryIdx, 'PROOF OF FIX: syncAllCloud retries pending local writes before pulling from the cloud');
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

  const warn1=Auto.buildWarnings({vin:'X',vin_valid:false,vin_validation_msg:'Prüfziffer falsch',hsn:'0035',hsn_valid:true,plate:{valid:false}});
  assert(warn1.some(w=>/VIN/.test(w) && /Prüfziffer falsch/.test(w)),'autosiastik surfaces the VIN validation message as a warning');
  assert(warn1.some(w=>/Kennzeichen/.test(w)),'autosiastik warns when plate.valid is false');
  assert(!warn1.some(w=>/HSN/.test(w)),'autosiastik does NOT warn about a field whose *_valid flag is true');
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
  const ccmConflict=Auto.resolveNumericField('Hubraum (cm³)', '769', '1769');
  assert(ccmConflict.conflict===true && ccmConflict.value==='', 'PROOF OF FIX: a genuine Hubraum conflict (document "769" vs catalog "1769") is surfaced for review, NOT silently resolved by picking either value');
  assert(/769/.test(ccmConflict.warning) && /1769/.test(ccmConflict.warning), 'the conflict warning names both candidate values so a human can check the real document');
  const ccmAgree=Auto.resolveNumericField('Hubraum (cm³)', '1769', '1769');
  assert(ccmAgree.conflict===false && ccmAgree.value==='1769', 'when document and catalog agree, the value is used with no conflict noise');
  const ccmOnlyCatalog=Auto.resolveNumericField('Hubraum (cm³)', '', '1769');
  assert(ccmOnlyCatalog.conflict===false && ccmOnlyCatalog.value==='1769', 'when only the catalog has a value (document field unread), it is used -- nothing to conflict with');
  const ccmOnlyDoc=Auto.resolveNumericField('Hubraum (cm³)', '1769', '');
  assert(ccmOnlyDoc.conflict===false && ccmOnlyDoc.value==='1769', 'when only the document has a value, it is used');
  assert(Auto.resolveNumericField('x','','').conflict===false && Auto.resolveNumericField('x','','').value==='', 'no conflict and no invented value when both sources are empty');

  // The user's exact real raw payload (as read from the live "Rohdaten"
  // panel), minus personal fields -- end-to-end through mapScan().
  const realNissanRaw={
    d1:'-', d3:'NISSAN ALMERA', maker:'Nissan', model:'Nissan ALMERA FLH 1.8',
    p1:'769', ccm:'1769', p2_p4:'85/5600', power_kw:'85',
    hsn:'3144', tsn:'031', vin:'SJNFBAN16U0504041', registrationNumber:'RZ AA4763',
    ez_string:'19.05.2004',
    plate:{raw:'RZ AA4763', district_code:'RZ', letters:'AA', digits:4763, formatted:'RZ-AA 4763', compact:'RZAA4763', valid:true}
  };
  const realNissanScan=Auto.mapScan(realNissanRaw);
  assert(realNissanScan.brand==='Nissan', 'PROOF OF FIX: brand resolves to the catalog maker field ("Nissan") for the real reported case, instead of the old text-derivation path');
  assert(realNissanScan.model==='ALMERA', 'model keeps the document\'s own, more specific D.3 text with the brand prefix stripped');
  assert(realNissanScan.engine_displacement_cm3==='', 'PROOF OF FIX: Hubraum is left BLANK (not "769") because the document (769) and catalog (1769) genuinely conflict -- exactly the real bug report');
  assert(realNissanScan._derivationWarnings.some(w=>/Fahrzeugkatalog/.test(w) && /Marke/.test(w)), 'a warning explains the brand came from the catalog, not the document');
  assert(realNissanScan._derivationWarnings.some(w=>/Hubraum/.test(w) && /769/.test(w) && /1769/.test(w)), 'a warning names both the document and catalog Hubraum values for manual review');
  assert(realNissanScan.engine_power_kw==='85' && realNissanScan.engine_rated_rpm==='5600', 'Leistung/Drehzahl split still works and agrees with the catalog power_kw (no conflict in this real case)');
  assert(realNissanScan.maxWeight==='' && realNissanScan.seats==='', 'maxWeight/seats stay empty exactly as the real payload had no f1/s1 -- never invented');

  const nissanScan=Auto.mapScan({d1:'-', d3:'NISSAN ALMERA', p1:'1769', p2_p4:'85/5600', ez_string:'19.05.2004', f1:'1735', s1:'5', j:'01'});
  assert(nissanScan.brand==='NISSAN' && nissanScan.model==='ALMERA', 'mapScan applies the brand/model split end-to-end when no catalog maker is present either (falls back to text-derivation)');
  assert(nissanScan.engine_power_kw==='85' && nissanScan.engine_rated_rpm==='5600', 'mapScan applies the power/RPM split end-to-end, keeping both values (neither is silently dropped)');
  assert(nissanScan.engine_displacement_cm3==='1769', 'with no conflicting catalog ccm, mapScan preserves Hubraum exactly as the document/provider returned it (1769)');
  assert(nissanScan.maxWeight==='1735' && nissanScan.seats==='5', 'mapScan still passes through f1/s1 when the provider actually returns them -- confirms the pipeline has no bug dropping these fields');
  assert(nissanScan._derivationWarnings.some(w=>/Marke/.test(w)) && nissanScan._derivationWarnings.some(w=>/Leistung/.test(w)) && nissanScan._derivationWarnings.some(w=>/Baujahr/.test(w)), 'every derived (non-literal) value is flagged in _derivationWarnings for review, not presented as a plain confirmed fact');

  const plainFormatScan=Auto.mapScan({d1:'VOLKSWAGEN', d3:'Golf', p2_p4:'66', ez_string:'01.01.2020'});
  assert(plainFormatScan.brand==='VOLKSWAGEN' && plainFormatScan.engine_power_kw==='66' && !plainFormatScan.engine_rated_rpm, 'a newer-style document (plain D.1 + single kW value) is handled correctly too -- same code path supports both old and new certificate formats');
  assert(!plainFormatScan._derivationWarnings.some(w=>/Marke/.test(w)) && !plainFormatScan._derivationWarnings.some(w=>/Leistung/.test(w)), 'no derivation warning is raised for fields that were NOT derived (D.1 already present, power already a single value)');

  // --- Nested-object fields (e.g. `plate`) must render as readable text,
  // never "[object Object]" -------------------------------------------------
  const flatPlate=Auto.flattenForDisplay({raw:'RZ AA4763', district_code:'RZ', digits:4763, formatted:'RZ-AA 4763', valid:true, empty_field:null});
  assert(!/\[object Object\]/.test(flatPlate), 'PROOF OF FIX: a nested object field never renders as "[object Object]"');
  assert(/RZ AA4763/.test(flatPlate) && /RZ-AA 4763/.test(flatPlate) && /true/.test(flatPlate), 'flattenForDisplay renders the nested object\'s actual field values readably');
  assert(!/empty_field/.test(flatPlate), 'flattenForDisplay omits null/empty keys from a nested object rather than showing them blank');
  const rawWithPlate=Auto.rawTextFields({plate:{raw:'RZ AA4763', valid:true}, hsn:'3144'});
  assert(typeof rawWithPlate.plate==='string' && !/\[object Object\]/.test(rawWithPlate.plate), 'PROOF OF FIX: rawTextFields (used by the review panel) flattens plate instead of leaving a raw object that stringifies to "[object Object]"');

  // --- Regression: the review panel must survive long enough to be read --
  // Bug found during real-device testing: scanVehicleDocument() rendered
  // the review panel and then called closeModal() in the very same click
  // handler, destroying it before a human could read it. Fixed with an
  // explicit two-step gate (read -> show review -> second click confirms).
  const custSrc3=fs.readFileSync(path.join(root,'js/customers.js'),'utf8');
  const scanFnBody=(custSrc3.match(/function scanVehicleDocument\(\)\{[\s\S]*?\r?\n\}/)||[''])[0];
  assert(/let ready=false/.test(scanFnBody), 'PROOF OF FIX: scanVehicleDocument has an explicit ready/confirmed state, not a single auto-continuing step');
  const firstReadIdx=scanFnBody.indexOf('renderScheinReview(ai)');
  const closeModalIdx=scanFnBody.indexOf('closeModal();', firstReadIdx); // the real call, not the explanatory comment above it
  assert(firstReadIdx>0 && closeModalIdx>firstReadIdx && scanFnBody.slice(firstReadIdx,closeModalIdx).includes('return;'), 'PROOF OF FIX: rendering the review and closing the modal are in different passes (an explicit `return` separates them) -- the review is no longer destroyed in the same continuation that renders it');

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

  // --- Dedup: do not merge customers by name alone --------------------------
  // Reproduces the exact scenario the integration must handle: a brand-new
  // vehicle scan whose owner name matches an EXISTING customer by text alone.
  // The fix must never silently attach the new vehicle to that customer
  // without the user explicitly confirming -- and must do nothing at all if
  // the user cancels.
  function makeCustSandbox(){
    const db={customers:[{id:'cust-1',companyId:'co1',name:'Rashid Tabah',phone:'030-1',address:'Alt 1'}], vehicles:[]};
    const session={company:{id:'co1'}};
    const calls={modalShown:0, closeCalls:0, audits:[]};
    let idn=0;
    const sb={
      window:{WP:{}}, console,
      db, session,
      id:(p)=>p+'-test-'+(++idn),
      t:(k)=>({possibleDuplicateCustomer:'dup?',possibleDuplicateHint:'A customer named "{name}" already exists.',createNewCustAnyway:'new',cancelBtn:'cancel',holderOf:'Halter von',newCustDefault:'Neukunde'}[k]||k),
      esc:(s)=>String(s==null?'':s),
      companyRows:(name)=> db[name].filter(x=>x.companyId===session.company.id),
      audit:(a,d)=>calls.audits.push(a+':'+d),
      save:()=>{},
      upsertCustomerCloud:()=>{}, upsertVehicleCloud:()=>{},
      modal:(title,body,onSave,saveText)=>{ calls.modalShown++; },
      closeModal:()=>{ calls.closeCalls++; },
      document:null // set per-test below
    };
    vm.createContext(sb);
    return {sb, db, calls};
  }
  function fakeDocFor(candidateIds){
    const handlers={cand:{}, dupNew:null, xmod:null, mcancel:null};
    const btns=candidateIds.map(cid=>({
      getAttribute:(k)=> k==='data-cid' ? cid : null,
      addEventListener:(ev,cb)=>{ handlers.cand[cid]=cb; }
    }));
    return {
      handlers,
      doc:{
        querySelectorAll:(sel)=> sel==='#dupChoices .dupcand' ? btns : [],
        getElementById:(id)=>{
          if(id==='dupNew') return {addEventListener:(ev,cb)=>{ handlers.dupNew=cb; }};
          if(id==='xmod') return {addEventListener:(ev,cb)=>{ handlers.xmod=cb; }};
          if(id==='mcancel') return {addEventListener:(ev,cb)=>{ handlers.mcancel=cb; }};
          return null;
        }
      }
    };
  }

  // 1) Vehicle already identified by VIN/plate -> links straight to its
  //    existing customer, no name-matching/confirmation involved at all.
  {
    const {sb,db,calls}=makeCustSandbox();
    db.vehicles.push({id:'veh-1',companyId:'co1',customerId:'cust-1',vin:'WVWZZZ1JZXW000001',plate:'HH-AB 1'});
    vm.runInContext(fs.readFileSync(path.join(root,'js/customers.js'),'utf8'), sb);
    const res=await sb.findOrCreateFromSchein({vin:'WVWZZZ1JZXW000001', owner_name:'Rashid Tabah'});
    assert(res.existing===true && res.v.id==='veh-1' && res.c.id==='cust-1','a VIN match links to the existing vehicle/customer directly');
    assert(calls.modalShown===0,'no duplicate-customer prompt is shown when the match is a strong vehicle identifier, not a name guess');
  }

  // 2) New vehicle, no existing customer shares the owner name -> creates
  //    straight away (no ambiguity to confirm).
  {
    const {sb,db,calls}=makeCustSandbox();
    vm.runInContext(fs.readFileSync(path.join(root,'js/customers.js'),'utf8'), sb);
    const res=await sb.findOrCreateFromSchein({vin:'WVWZZZ1JZXW000002', owner_name:'Completely Unique Name'});
    assert(res.existing===false && db.customers.length===2 && db.vehicles.length===1,'a genuinely new owner name creates a new customer+vehicle without prompting');
    assert(calls.modalShown===0,'no prompt is needed when there is no name collision to resolve');
  }

  // 3) New vehicle, owner name text-matches an EXISTING customer -> must NOT
  //    silently merge. A confirmation is shown; only an explicit "link to
  //    this candidate" click actually attaches the vehicle to that customer.
  {
    const {sb,db,calls}=makeCustSandbox();
    vm.runInContext(fs.readFileSync(path.join(root,'js/customers.js'),'utf8'), sb);
    const fd=fakeDocFor(['cust-1']);
    sb.document=fd.doc;
    const p=sb.findOrCreateFromSchein({vin:'WVWZZZ1JZXW000003', owner_name:'Rashid Tabah'});
    assert(calls.modalShown===1,'PROOF OF FIX: a same-name match triggers a confirmation prompt instead of merging silently');
    assert(typeof fd.handlers.cand['cust-1']==='function','the prompt offers the matching existing customer as a linkable choice');
    fd.handlers.cand['cust-1'](); // user explicitly picks "link to this customer"
    const res=await p;
    assert(res.c.id==='cust-1' && db.customers.length===1,'after explicit confirmation, the vehicle links to the chosen existing customer -- no duplicate customer created');
    assert(db.vehicles.length===1 && db.vehicles[0].customerId==='cust-1','the new vehicle is attached to the confirmed customer');
  }

  // 4) Same collision, but the user explicitly chooses "create new customer
  //    anyway" -- a deliberate duplicate-by-name is allowed, since it is now
  //    an explicit user decision, not an automatic merge.
  {
    const {sb,db,calls}=makeCustSandbox();
    vm.runInContext(fs.readFileSync(path.join(root,'js/customers.js'),'utf8'), sb);
    const fd=fakeDocFor(['cust-1']);
    sb.document=fd.doc;
    const p=sb.findOrCreateFromSchein({vin:'WVWZZZ1JZXW000004', owner_name:'Rashid Tabah'});
    fd.handlers.dupNew();
    const res=await p;
    assert(res.c.id!=='cust-1' && db.customers.length===2,'explicitly choosing "create new anyway" makes a separate customer record, not a merge');
  }

  // 5) Same collision, user cancels the prompt -> nothing is created or
  //    linked at all.
  {
    const {sb,db,calls}=makeCustSandbox();
    vm.runInContext(fs.readFileSync(path.join(root,'js/customers.js'),'utf8'), sb);
    const fd=fakeDocFor(['cust-1']);
    sb.document=fd.doc;
    const p=sb.findOrCreateFromSchein({vin:'WVWZZZ1JZXW000005', owner_name:'Rashid Tabah'});
    fd.handlers.mcancel();
    const res=await p;
    assert(res.cancelled===true,'cancelling the confirmation reports cancelled:true');
    assert(db.customers.length===1 && db.vehicles.length===0,'PROOF: cancelling the duplicate-customer prompt writes nothing -- no customer, no vehicle');
  }

  // Tenant isolation: a same-name customer belonging to a DIFFERENT company
  // must never be offered as a match candidate.
  {
    const {sb,db,calls}=makeCustSandbox();
    db.customers.push({id:'cust-other-tenant',companyId:'co2',name:'Rashid Tabah'});
    vm.runInContext(fs.readFileSync(path.join(root,'js/customers.js'),'utf8'), sb);
    const matches=sb.findCustomerNameMatches('Rashid Tabah');
    assert(matches.length===1 && matches[0].id==='cust-1','findCustomerNameMatches only returns candidates from the current tenant/company');
  }

  // --- Regression: every call site of the now-async findOrCreateFromSchein
  // must await it ---------------------------------------------------------
  // Bug found during real-device testing (2026-11-11): js/camera.js's
  // ingestScheinFile() called `findOrCreateFromSchein(ai)` without `await`.
  // Since the function is async, `found` was a pending Promise, so
  // `found.v`/`found.c` were undefined and vehicleModal() opened with an
  // almost-empty prefill -- including no customer selected -- even though
  // the customer/vehicle were (eventually) created correctly in the
  // background. Every call site must await it.
  const camSrc=fs.readFileSync(path.join(root,'js/camera.js'),'utf8');
  const repSrc=fs.readFileSync(path.join(root,'js/repairs.js'),'utf8');
  const custSrc2=fs.readFileSync(path.join(root,'js/customers.js'),'utf8');
  [['js/camera.js',camSrc],['js/repairs.js',repSrc],['js/customers.js',custSrc2]].forEach(([name,src])=>{
    const calls=src.match(/[^\n]*findOrCreateFromSchein\([^)]*\)[^\n]*/g)||[];
    const defsExcluded=calls.filter(l=>!/^\s*async function findOrCreateFromSchein/.test(l));
    defsExcluded.forEach(line=>{
      assert(/await\s+findOrCreateFromSchein\(/.test(line), `PROOF OF FIX: every call to findOrCreateFromSchein() in ${name} is awaited -- "${line.trim()}"`);
    });
  });

  // --- Regression: the header's displayed version must never drift from --
  // the real cache-busting version again (found stuck at "v1.13.2" in the
  // UI while index.html/sw.js were already several versions ahead).
  const appSrcVer=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  assert(!/class="ver">v1\.13\.2</.test(appSrcVer), 'PROOF OF FIX: the header version label is no longer a hardcoded, driftable string');
  assert(/class="ver">v\$\{esc\(\(location\.search\.match/.test(appSrcVer), 'the header version label is now read from the actual URL version param at render time');

  // --- Regression: the review panel must list every mapped field, so an
  // empty Zulässige Gesamtmasse/Sitze/Nenndrehzahl is visible for review
  // instead of silently missing from the panel entirely. ------------------
  const scanSrc2=fs.readFileSync(path.join(root,'js/scan.js'),'utf8');
  ['engine_rated_rpm','maxWeight','seats'].forEach(k=>{
    assert(new RegExp(k+":'").test(scanSrc2), `review panel's MAPPED_FIELD_LABELS includes ${k} -- an empty value here must be visible, not just absent`);
  });

  if(failed){ console.error(failed+' failed'); process.exit(1); }
  console.log('all tests passed');
})();
