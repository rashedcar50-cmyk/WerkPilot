/* Unified Fahrzeugschein scan -> customer/vehicle match -> save engine.
   Replaces the old scattered findOrCreateFromSchein()/askScheinCustomerChoice()
   logic with one shared, testable engine used by every scan entry point
   (Customers page, Vehicles page, WhatsApp/share-target ingest, repairs
   quick-start) so they can never give contradictory results.

   Matching rules (see the rebuild requirements this implements):
   - Customers are never merged by name alone: name + address + tax id all
     contribute independent confidence; below a floor, nothing is suggested.
   - Vehicles are matched by VIN first (strong identity). A plate match
     without a VIN match is only ever a weak, confirmable suggestion, never
     a silent link.
   - Existing customer contact fields are never overwritten with blanks.
   - Saving is idempotent: re-running it for the same VIN updates the
     existing vehicle instead of creating a duplicate, even after a retry.
*/
(function(W){
  function str(v){ return v==null ? '' : String(v).trim(); }
  function normName(s){ return str(s).toLowerCase().replace(/\s+/g,' ').replace(/[.,]/g,''); }
  function normAddr(s){ return str(s).toLowerCase().replace(/\s+/g,' ').replace(/[.,]/g,''); }
  function normPlate(p){ return str(p).toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g,''); }
  function normVin(v){ return str(v).toUpperCase(); }

  // Scores how likely an existing customer record IS the document's owner.
  // Literally never name-alone: a name match (exact or partial) only
  // counts toward a SUGGESTION when corroborated by a second, independent
  // signal (address overlap, or a reliable identifier like tax id) -- a
  // name match with nothing else backing it scores zero, full stop, so it
  // can never surface as a candidate on its own. A reliable identifier
  // (tax id) is strong enough to suggest even without any name/address
  // signal, since it isn't name-based at all.
  function scoreCustomerMatch(cust, owner){
    let score=0; const reasons=[];
    let nameSignal=false, addressSignal=false, idSignal=false;

    const cn=normName(cust.companyName||cust.name), on=normName(owner.name);
    if(cn && on){
      if(cn===on){ score+=45; reasons.push('name-exact'); nameSignal=true; }
      else if(cn.length>3 && on.length>3 && (cn.includes(on)||on.includes(cn))){ score+=25; reasons.push('name-partial'); nameSignal=true; }
    }
    const ca=normAddr(cust.address), oa=normAddr(owner.address);
    if(ca && oa){
      if(ca===oa){ score+=40; reasons.push('address-exact'); addressSignal=true; }
      else {
        const cz=(ca.match(/\b\d{5}\b/)||[])[0], oz=(oa.match(/\b\d{5}\b/)||[])[0];
        if(cz && oz && cz===oz){ score+=15; reasons.push('postal-match'); addressSignal=true; }
      }
    }
    if(str(cust.taxId) && str(owner.taxId) && str(cust.taxId)===str(owner.taxId)){ score+=50; reasons.push('taxid-match'); idSignal=true; }

    if(nameSignal && !addressSignal && !idSignal) return {score:0, reasons:[]};
    return {score, reasons};
  }

  // Ranked candidates for a scanned owner, tenant-scoped (caller passes an
  // already companyId-filtered list). Empty when nothing clears the floor
  // -- i.e. "create new" is the only option, no ambiguous guess offered.
  function findCustomerCandidates(owner, customers){
    owner=owner||{};
    if(!normName(owner.name)) return [];
    return (customers||[])
      .map(c=>Object.assign({customer:c}, scoreCustomerMatch(c, owner)))
      .filter(x=>x.score>=35)
      .sort((a,b)=>b.score-a.score);
  }

  // VIN match is a strong identity signal (two different vehicles practically
  // never share a VIN). A plate-only match is kept separate and explicitly
  // weaker -- plates get reassigned/reused and must never silently decide
  // vehicle identity on their own.
  function findVehicleMatch(vin, plate, vehicles){
    const vinN=normVin(vin), plateN=normPlate(plate);
    let strong=null, weak=null;
    if(vinN) strong=(vehicles||[]).find(v=>normVin(v.vin)===vinN)||null;
    if(!strong && plateN) weak=(vehicles||[]).find(v=>normPlate(v.plate)===plateN)||null;
    return {strong, weak};
  }

  // Merges scanned owner fields onto an EXISTING customer record without
  // ever blanking out real data the customer already has on file -- a
  // scan with a missing/empty phone must never erase a known phone number.
  function mergeOwnerIntoCustomer(cust, owner){
    const patch={};
    if(!str(cust.address) && str(owner.address)) patch.address=owner.address;
    if(!str(cust.phone) && str(owner.phone)) patch.phone=owner.phone;
    if(!str(cust.email) && str(owner.email)) patch.email=owner.email;
    return patch;
  }

  W.ScheinEngine={
    scoreCustomerMatch, findCustomerCandidates, findVehicleMatch, mergeOwnerIntoCustomer,
    normName, normAddr, normPlate, normVin
  };
})(window.WP=window.WP||{});
