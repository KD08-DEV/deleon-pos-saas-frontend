// Reglas de presentación de ajustes e-CF.
// La validación fiscal y el cálculo definitivo SIEMPRE ocurren en backend.
export function getAdjustmentCode(type, mode) {
  const normalizedType = String(type);
  const normalizedMode = String(mode);
  if (!['33', '34'].includes(normalizedType) || !['partial', 'total'].includes(normalizedMode)) {
    throw new Error('ECF_ADJUSTMENT_INVALID_UI_MODE');
  }
  return normalizedType === '34' && normalizedMode === 'total' ? '1' : '3';
}

export function getPreviewTaxRate(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return null;
  let previous = null;
  for (const item of items) {
    const snapshot = item?.taxSnapshot;
    if (!snapshot || snapshot.includedInPrice === true) return null;
    const rate = Number(snapshot.ratePercent);
    if (![0,16,18].includes(rate)) return null;
    const code = String(snapshot.code || '').toUpperCase();
    const name = String(snapshot.name || '').toUpperCase();
    if (rate > 0 && !code.includes('ITBIS') && !name.includes('ITBIS')) return null;
    if (rate === 0 && !code.includes('EXENTO') && !name.includes('EXENTO')) return null;
    if (previous !== null && rate !== previous) return null;
    previous = rate;
  }
  return previous;
}

export function getPreviewTaxAmount(base, rate) {
  const b = Number(base);
  if (rate === null || rate === undefined || !Number.isFinite(b) || b < 0) return null;
  if (![0,16,18].includes(rate)) return null;
  return Math.round((b * rate / 100 + Number.EPSILON) * 100) / 100;
}

// DGII: los créditos e34 acumulados no deben superar el original;
// las notas de débito e33 NO incrementan esta cuota de crédito.
export function getAvailableOriginalCredit(originalTotal, acceptedCreditTotal) {
  const original = Number(originalTotal);
  const credited = Number(acceptedCreditTotal);
  if (!Number.isFinite(original) || !Number.isFinite(credited) || original < 0 || credited < 0) return 0;
  return Math.max(0, Math.round(original * 100) - Math.round(credited * 100)) / 100;
}
