/* Invoice lifecycle (added 2026-11-24).
 *
 * An issued invoice is never overwritten. A change is only possible as a
 * cancellation document of its own (Stornorechnung, own number series
 * "ST-") that mirrors the original's amounts with negative quantities and
 * refers to it; the original stays in the list and in the archive.
 *
 * The data of customer, vehicle and workshop that the invoice was issued
 * with is frozen into the invoice (snapshot), so a later edit of the
 * customer card does not change an invoice that already left the house.
 *
 * Everything in the first half is pure (no DOM, no globals) so that it can
 * be tested in Node. The second half is the glue to the app.
 */
(function(W){
  var WP = W.WP = W.WP || {};

  function round2(n){ return Math.round(Number(n||0)*100)/100; }
  function neg(n){ var v=round2(-Number(n||0)); return v===0 ? 0 : v; }

  function isStornoDoc(inv){ return !!inv && (inv.type==='Stornorechnung' || !!inv.stornoOf); }
  function isCancelled(inv){ return !!inv && inv.status==='storno'; }
  // Every invoice that carries a number has been issued. (A draft state
  // without a number comes with server-side numbering.)
  function isIssued(inv){ return !!inv && !!inv.number && inv.lifecycle!=='draft'; }
  function canCancel(inv){ return isIssued(inv) && !isStornoDoc(inv) && !isCancelled(inv); }

  var CUSTOMER_KEYS=['id','kdNr','name','companyName','address','street','zip','city','country','email','phone','vatId'];
  var VEHICLE_KEYS=['id','plate','vin','make','model','year','firstRegistration','kba','hsn','tsn','km','nextHu'];
  function pick(src, keys){ var o={}; if(!src) return o; keys.forEach(function(k){ if(src[k]!==undefined && src[k]!==null && src[k]!=='') o[k]=src[k]; }); return o; }

  // Copy of the parties as they were when the invoice was issued.
  function buildSnapshot(customer, vehicle, company, nowIso){
    return {
      frozenAt: nowIso || new Date().toISOString(),
      customer: pick(customer, CUSTOMER_KEYS),
      vehicle: pick(vehicle, VEHICLE_KEYS),
      company: company ? JSON.parse(JSON.stringify(company)) : {}
    };
  }

  // The cancellation document for one issued invoice. It mirrors the
  // ORIGINAL's stored lines and amounts (never today's prices or tax
  // rates) with the sign reversed.
  function buildStornoDoc(inv, number, nowIso, newId){
    if(!canCancel(inv)) return null;
    var lines=(inv.lines||[]).map(function(l){
      var c={}; for(var k in l) c[k]=l[k];
      c.qty = neg(Number(l.qty===undefined||l.qty===''?1:l.qty));
      return c;
    });
    return {
      id: newId, companyId: inv.companyId,
      type: 'Stornorechnung', number: number,
      stornoOf: inv.id, stornoOfNumber: inv.number, stornoOfDate: inv.date||'',
      vehicleId: inv.vehicleId||'', customerId: inv.customerId||'', km: inv.km||'',
      repairId: inv.repairId||'', auftrag: inv.auftrag||'',
      lines: lines, tax: inv.tax, discount: neg(inv.discount),
      parts: neg(inv.parts), labor: neg(inv.labor), net: neg(inv.net), total: neg(inv.total),
      // Nothing is owed on a cancellation document. Whether money that was
      // already received is paid back is a separate matter.
      payment: inv.payment||'', paid: true,
      date: nowIso, serviceDate: inv.serviceDate||inv.date||'',
      snapshot: inv.snapshot ? JSON.parse(JSON.stringify(inv.snapshot)) : undefined,
      updatedAt: nowIso
    };
  }

  // What has to change on the original when it is cancelled.
  function cancelMarks(stornoDoc, nowIso){
    return { status:'storno', stornoAt: nowIso, stornoBy: stornoDoc.number, stornoById: stornoDoc.id };
  }

  // Fields that travel in the cloud row's metadata, so a second device
  // sees the same lifecycle state.
  function toMeta(inv){
    var m={};
    if(inv.status) m.lifecycleStatus=inv.status;
    ['stornoAt','stornoBy','stornoById','stornoOf','stornoOfNumber','stornoOfDate','serviceDate','km','auftrag'].forEach(function(k){ if(inv[k]) m[k]=inv[k]; });
    if(inv.snapshot) m.snapshot=inv.snapshot;
    return m;
  }
  function fromMeta(meta){
    var o={}; meta=meta||{};
    if(meta.lifecycleStatus) o.status=meta.lifecycleStatus;
    ['stornoAt','stornoBy','stornoById','stornoOf','stornoOfNumber','stornoOfDate','serviceDate','km','auftrag'].forEach(function(k){ if(meta[k]) o[k]=meta[k]; });
    if(meta.snapshot) o.snapshot=meta.snapshot;
    return o;
  }

  /* ---- repair order -> invoice ---- */

  // A job line may be plain text, or "Text|hours|amount" (amount = price of
  // the whole job). Returns {name, hours, price} with price per hour.
  function parseJob(job, hourlyRate){
    var s=String(job==null?'':job).trim(); if(!s) return null;
    var p=s.split('|').map(function(x){ return x.trim(); });
    if(p.length>=3 && p[0]){
      var h=Number(String(p[1]).replace(',','.')), amount=Number(String(p[2]).replace(',','.'));
      if(h>0 && amount>=0) return {name:p[0], hours:h, price:round2(amount/h), priced:true};
    }
    return {name:s, hours:0, price:Number(hourlyRate||0), priced:false};
  }
  function formatJob(job){
    var j=parseJob(job, 0); if(!j) return '';
    if(!j.priced) return j.name;
    var de=function(n){ return Number(n).toFixed(2).replace('.',','); };
    return j.name+' · '+String(j.hours).replace('.',',')+' Std. · '+de(j.hours*j.price)+' €';
  }
  // Invoice lines for a repair order: the parts issued to it, the priced
  // jobs one by one, and the remaining hours as one labour line that names
  // the unpriced jobs.
  function repairToLines(r, hourlyRate){
    r=r||{}; var rate=Number(hourlyRate||0), lines=[];
    (r.parts||[]).forEach(function(p){
      if(!p || !(p.name||p.sku)) return;
      lines.push({sku:String(p.sku||''), name:String(p.name||''), qty:Number(p.qty||1)||1, price:Number(p.price||0), tax:19, kind:'parts'});
    });
    var plain=[], pricedHours=0;
    (r.jobs||[]).forEach(function(job){
      var j=parseJob(job, rate); if(!j) return;
      if(j.priced){ pricedHours+=j.hours; lines.push({sku:'', name:j.name, qty:j.hours, price:j.price, tax:19, kind:'labor'}); }
      else plain.push(j.name);
    });
    var rest=round2(Number(r.hours||0)-pricedHours);
    if(rest>0 || (plain.length && !pricedHours)){
      var name=plain.length ? plain.join('; ') : (String(r.description||r.complaint||'').trim() || 'Arbeitswert');
      lines.push({sku:'', name:name.slice(0,240), qty:rest>0?rest:1, price:rate, tax:19, kind:'labor'});
    }
    return lines;
  }
  // The invoice that currently bills a repair order: issued, not cancelled,
  // not itself a cancellation document.
  function activeInvoiceForRepair(invoices, repairId){
    if(!repairId) return null;
    return (invoices||[]).find(function(x){ return x && x.repairId===repairId && isIssued(x) && !isCancelled(x) && !isStornoDoc(x); }) || null;
  }
  var NO_INVOICE_REASONS=['warranty','goodwill','collective','later'];
  // Handed over, not billed, and not settled by warranty or goodwill.
  function needsBilling(r, invoices){
    if(!r || r.status!=='delivered') return false;
    if(activeInvoiceForRepair(invoices, r.id)) return false;
    return !(r.noInvoiceReason==='warranty' || r.noInvoiceReason==='goodwill');
  }

  WP.InvoiceLifecycle={ parseJob:parseJob, formatJob:formatJob, repairToLines:repairToLines, activeInvoiceForRepair:activeInvoiceForRepair,
    needsBilling:needsBilling, NO_INVOICE_REASONS:NO_INVOICE_REASONS, isStornoDoc:isStornoDoc, isCancelled:isCancelled, isIssued:isIssued, canCancel:canCancel,
    buildSnapshot:buildSnapshot, buildStornoDoc:buildStornoDoc, cancelMarks:cancelMarks, toMeta:toMeta, fromMeta:fromMeta };

  /* ---------------- glue to the app (browser only) ---------------- */

  // Own number series for cancellation documents: ST-<company>-<year>-0001.
  W.nextStornoNumber=function(){
    var y=new Date().getFullYear();
    var w=workshop();
    w.stornoSeq=Number(w.stornoSeq||0)+1;
    save();
    var prefix=((W.session&&session.company&&session.company.id)||(typeof session!=='undefined'&&session&&session.company&&session.company.id)||'ST').toString().slice(0,4).toUpperCase();
    return 'ST-'+prefix+'-'+y+'-'+String(w.stornoSeq).padStart(4,'0');
  };

  // Freeze the parties into a freshly issued invoice (no-op if present).
  W.freezeInvoiceParties=function(inv){
    if(!inv || inv.snapshot) return inv;
    var veh=(typeof vehicleOf==='function' && vehicleOf(inv.vehicleId)) || null;
    var cust=(db.customers||[]).find(function(c){ return c.id===inv.customerId; }) || (veh && (db.customers||[]).find(function(c){ return c.id===veh.customerId; })) || null;
    var company=(typeof workshopInfo==='function') ? workshopInfo() : {};
    inv.snapshot=buildSnapshot(cust, veh, company, new Date().toISOString());
    return inv;
  };

  // Cancels one issued invoice. Returns the cancellation document, or
  // null when the invoice cannot be cancelled (already cancelled, is
  // itself a cancellation document, or has no number).
  W.stornoInvoice=function(iid){
    var inv=(db.invoices||[]).find(function(x){ return x.id===iid; });
    if(!canCancel(inv)) return null;
    // Guard against a second click / a second device: one cancellation
    // document per original.
    var already=(db.invoices||[]).find(function(x){ return x.stornoOf===inv.id; });
    if(already) return null;
    var now=new Date().toISOString();
    var doc=buildStornoDoc(inv, W.nextStornoNumber(), now, id("i"));
    if(!doc) return null;
    db.invoices.push(doc);
    var marks=cancelMarks(doc, now);
    for(var k in marks) inv[k]=marks[k];
    if(WP.Engine && WP.Engine.touch) WP.Engine.touch(inv);
    db.journal=db.journal||[];
    db.journal.push({id:id('j'),companyId:inv.companyId,date:todayISO(),account:t('sales'),debit:Math.abs(Number(inv.total||0)),credit:0,note:doc.number+' → '+inv.number});
    audit('invoice.storno', inv.number+' → '+doc.number);
    if(typeof archiveBeleg==='function') archiveBeleg(doc);
    save();
    if(typeof upsertInvoiceCloud==='function'){
      try{ upsertInvoiceCloud(inv); }catch(e){}
      try{ upsertInvoiceCloud(doc); }catch(e){}
    }
    return doc;
  };
})(typeof window!=='undefined' ? window : this);
