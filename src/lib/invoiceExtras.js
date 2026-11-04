// Order snapshot is the source of truth for pricing; never use current menu prices.
const round = v => Math.round((Number(v) || 0) * 100) / 100;
export const invoiceExtras = (item = {}) => {
  const candidates = [item.addons, item.addOns, item.extras, item.extraIngredients, item.selectedExtras];
  const selected = candidates.find(x => Array.isArray(x) && x.length > 0) || [];
  const modifiers = Array.isArray(item.modifiers) ? item.modifiers :
    (Array.isArray(item.selectedOptions) ? item.selectedOptions : []);
  const result = [];
  for (const raw of [...selected, ...modifiers]) {
    const label = typeof raw === "string" ? raw : raw?.name ?? raw?.label ?? raw?.title ?? "";
    if (!String(label).trim()) continue;
    const qtyRaw = typeof raw === "object" && raw !== null ? Number(raw.quantity ?? raw.qty ?? 1) : 1;
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
    const rawPrice = typeof raw === "object" && raw !== null
      ? raw.unitPrice ?? raw.price ?? raw.amount ?? (raw.total === undefined ? undefined : Number(raw.total) / qty)
      : undefined;
    const price = rawPrice === undefined || rawPrice === null || rawPrice === "" ? null : Number(rawPrice);
    const unitPrice = Number.isFinite(price) && price >= 0 ? round(price) : null;
    result.push({label: String(label).trim(), qty, unitPrice,
      perDishTotal: unitPrice === null ? null : round(qty * unitPrice), isNote: false});
  }
  const note = item.note || item.comment || item.specialInstructions;
  if (String(note || "").trim()) result.push({label: String(note).trim(), qty:1, unitPrice:null, perDishTotal:null, isNote:true});
  return result;
};
export const invoiceLineBreakdown = (item = {}) => {
  const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
  const priceFromSnapshot = Number(item.unitPrice ?? item.pricePerQuantity ?? (Number(item.price || 0) / qty));
  const unitPrice = Number.isFinite(priceFromSnapshot) ? round(priceFromSnapshot) : 0;
  const extras = invoiceExtras(item);
  const paidUnit = round(extras.reduce((sum, x) => sum + (x.perDishTotal || 0), 0));
  const explicitBase = item.baseUnitPrice === undefined || item.baseUnitPrice === null ? null : Number(item.baseUnitPrice);
  const canSplit = paidUnit <= unitPrice + .009 && (explicitBase === null || Math.abs(explicitBase + paidUnit - unitPrice) <= .011);
  const mainUnitPrice = canSplit ? round(unitPrice - paidUnit) : unitPrice;
  return {qty, unitPrice, mainUnitPrice, canSplit, mainLineTotal:round(mainUnitPrice * qty), originalLineTotal:round(unitPrice * qty),
    extras:extras.map(x=>({...x,totalQty:round(x.qty*qty),lineTotal:x.perDishTotal===null?null:round(x.perDishTotal*qty),included:!canSplit&&!x.isNote}))};
};
export const invoiceExtraText = item => invoiceExtras(item).map(x => `${x.isNote ? "• " : "+ "}${x.label}${x.qty > 1 ? ` ×${x.qty}` : ""}${x.unitPrice !== null && !x.isNote ? ` (${x.unitPrice.toFixed(2)})` : ""}`).join("; ");
