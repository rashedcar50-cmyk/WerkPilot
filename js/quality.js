(function(W){
  function workshopLegalGaps(){
    const w=(typeof workshopInfo==='function'?workshopInfo():(typeof workshop==='function'?workshop():{}))||{};
    const gaps=[];
    if(!(w.name||w.workshopName)) gaps.push('Firma');
    if(!(w.address||w.workshopAddress)) gaps.push('Anschrift');
    if(!(w.steuerNr||w.workshopSteuerNr)) gaps.push('Steuernummer');
    if(!(w.taxId||w.workshopTaxId)) gaps.push('USt-IdNr.');
    if(!(w.iban||w.workshopIban)) gaps.push('IBAN');
    if(!(w.bic||w.workshopBic)) gaps.push('BIC');
    if(!(w.email||w.workshopEmail)) gaps.push('E-Mail');
    if(!(w.owner||w.workshopOwner)) gaps.push('Geschäftsführer');
    return gaps;
  }
  function legalToast(){
    const g=workshopLegalGaps();
    if(!g.length) return false;
    if(typeof toast==='function') toast((typeof t==='function'?t('legalGaps'):'Fehlt')+': '+g.join(', '));
    return true;
  }
  W.Quality={workshopLegalGaps,legalToast};
})(window.WP=window.WP||{});
window.workshopLegalGaps=function(){ return WP.Quality.workshopLegalGaps(); };
