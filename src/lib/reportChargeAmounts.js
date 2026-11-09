export function serviceCharges(bill={}) {
 if(Array.isArray(bill.serviceChargeBreakdown)&&bill.serviceChargeBreakdown.length)
  return bill.serviceChargeBreakdown.filter(c=>c.addToTotal!==false).reduce((n,c)=>n+(Number(c.amount)||0),0);
 return Number(bill.serviceChargeTotal??bill.legalTip??bill.propinaLegal??0)||0;
}
export function manualTip(bill={}) {return Number(bill.tipAmount??bill.tip??0)||0;}
