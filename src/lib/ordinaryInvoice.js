const id = value => String(value?._id || value || "");
const amount = value => Math.round((Number(value) || 0) * 100) / 100;
const sorted = list => [...list].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
export function hasOrdinaryInvoice(order) {
    // Solo una orden COBRADA requiere la correccion auditada (igual que guardPaidOrderFinancialChanges en el backend).
    // Una mesa abierta con pre-factura (invoicedAt/invoiceNumber) pero pendiente de pago se edita normalmente.
    return Boolean(order && order.paymentStatus === "Pagado");
}
export function invoiceFinancialView(order) {
    const bills = order.bills || {};
    return {
        items: sorted((order.items || []).map(item => ({
            dishId: id(item.dishId), quantity: Number(item.quantity || 0),
            unitPrice: amount(item.unitPrice ?? (Number(item.price || 0) / Number(item.quantity || 1))),
            addons: sorted((item.addons || []).map(extra => ({
                name: String(extra.name || ""), ref: id(extra.extraDishId),
                quantity: Number(extra.quantity ?? extra.extraQuantity ?? 1),
                price: amount(extra.price ?? extra.unitPrice ?? (Number(extra.total || 0) / (Number(extra.quantity ?? extra.extraQuantity ?? 1) || 1))),
            }))),
            modifiers: sorted((item.modifiers || []).map(m => ({name: m.name || "",type:m.type || "remove"}))),
            note: String(item.note || ""), presentation: String(item.presentation || "Regular"),
        }))),
        discount: amount(bills.discount), tip: amount(bills.tipAmount ?? bills.tip),
        deliveryFee: amount(bills.deliveryFee), taxEnabled: bills.taxEnabled !== false,
        legalTipEnabled: bills.legalTipEnabled !== false,
        paymentMethod: order.paymentMethod || "Efectivo", orderNote: String(order.orderNote || ""),
    };
}
export function invoiceHasChanges(original, draft) {
    return JSON.stringify(invoiceFinancialView(original)) !== JSON.stringify(invoiceFinancialView(draft));
}
export function invoiceHasOnlyPaymentChange(original, draft) {
    const methods = ["Efectivo", "Tarjeta", "Transferencia", "Otros", "Credito"];
    if (!(methods.includes(original?.paymentMethod) || original?.paymentMethod === "Credito") || !methods.includes(draft?.paymentMethod) || original.paymentMethod === draft.paymentMethod) return false;
    return !invoiceHasChanges(original, {...draft, paymentMethod: original.paymentMethod});
}
export function invoicePreview(order) {
    return {...order,subTotal:order.bills?.subtotal,taxAmount:order.bills?.tax,
        discountAmount:order.bills?.discount,tipAmount:order.bills?.tipAmount ?? order.bills?.tip,
        totalAmount:order.bills?.totalWithTax,
        facturaNo:order.fiscal?.invoiceNumber || order.invoiceNumber || order.facturaNo};
}
