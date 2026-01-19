// src/components/invoice/Invoice.jsx
import React, { useRef } from "react";
import { motion } from "framer-motion";
import { useReactToPrint } from "react-to-print";
import useTenant from "../../hooks/useTenant.js";

const pad = (v, len = 8) => String(v ?? "").padStart(len, "0");

const formatDMY = (dateLike) => {
    if (!dateLike) return "N/A";
    const d = new Date(dateLike);
    if (typeof dateLike === "object" && dateLike.$date) dateLike = dateLike.$date;

    if (Number.isNaN(d.getTime())) return "N/A";
    // dd/mm/aaaa
    return new Intl.DateTimeFormat("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(d);
};

const formatDMYTime = (dateLike) => {
    if (!dateLike) return "N/A";
    if (typeof dateLike === "object" && dateLike.$date) dateLike = dateLike.$date;

    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return "N/A";
    // dd/mm/aaaa, hh:mm a. m.
    return new Intl.DateTimeFormat("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(d);
};

const Invoice = ({ order, onClose, itemsOverride = null, invoiceTitle = null }) => {
    const { tenantInfo } = useTenant();
    const receiptRef = useRef(null);

    // ===== Datos negocio =====
    const businessName = tenantInfo?.business?.name || tenantInfo?.name || "";
    const businessAddress = tenantInfo?.business?.address || "";
    const businessRnc = tenantInfo?.business?.rnc || tenantInfo?.fiscal?.rnc || "";
    const businessPhone = tenantInfo?.business?.phone || "";

    // ===== Fiscal =====
    const isFiscal = Boolean(order?.fiscal?.requested || order?.ncfNumber || order?.fiscal?.ncfNumber);

    const ncfNumber =
        order?.ncfNumber ||
        order?.fiscal?.ncfNumber ||
        order?.fiscal?.ncf ||
        "";

    const ncfType = order?.fiscal?.ncfType || order?.ncfType || "";


    // ✅ Secuencial interno (Factura No.)
    const internalNumberRaw =
        order?.fiscal?.internalNumber ??
        order?.fiscal?.internalSeq ??
        order?.fiscal?.internal ??
        null;

    const facturaNo = internalNumberRaw ? pad(internalNumberRaw, 8) : null;

    // ✅ Sucursal / Punto emisión (defaults)
    const branchName =
        tenantInfo?.fiscal?.branchName ||
        tenantInfo?.business?.branchName ||
        "Principal";

    const emissionPoint =
        order?.fiscal?.emissionPoint ||
        tenantInfo?.fiscal?.emissionPoint ||
        "001";

    // ✅ Vence (NCF)
    const expirationDate =
        order?.fiscal?.expirationDate ||
        order?.fiscal?.expiresAt ||
        tenantInfo?.fiscal?.ncfConfig?.[ncfType]?.expiresAt ||
        null;

    // ===== Cliente =====
    const clientName =
        order?.customerDetails?.name ||
        order?.customerName ||
        "Consumidor Final";

    const clientRnc =
        order?.customerDetails?.rncCedula ||
        order?.customerDetails?.rnc ||
        order?.customerRnc ||
        order?.customerRNC ||
        "";

    const paymentMethod = order?.paymentMethod || "Efectivo";

    // ===== Items =====
    const items = itemsOverride ?? (order?.items || []);

    // ===== Totales =====
    const bills = order?.bills || {};

    const subtotal = Number(order?.subTotal ?? bills?.subtotal ?? bills?.total ?? 0);

    const discount = Number(order?.discountAmount ?? bills?.discount ?? 0);
    const taxEnabled = order?.taxEnabled ?? bills?.taxEnabled ?? true;
    const tax = Number(order?.taxAmount ?? bills?.tax ?? 0);
    const tip = Number(order?.tipAmount ?? bills?.tipAmount ?? bills?.tip ?? 0);

    const grandTotal = Number(order?.totalAmount ?? bills?.totalWithTax ?? bills?.total ?? 0);
    // ===== Comisión Delivery (viene del backend, congelada por orden) =====
    const orderSource = String(order?.orderSource || "").toUpperCase();
    const isDelivery = orderSource === "PEDIDOSYA" || orderSource === "UBEREATS";

    const commissionRate = Number(order?.commissionRate ?? bills?.commissionRate ?? 0);
    const commissionPct = commissionRate ? Math.round(commissionRate * 100) : 0;

    const commissionAmount = Number(order?.commissionAmount ?? bills?.commissionAmount ?? 0);
    const netTotal = Number(order?.netTotal ?? bills?.netTotal ?? 0);

// Fallback por si solo viene rate y no amount (pero ideal es que el backend lo mande)
    const computedNet = netTotal || (grandTotal - commissionAmount);
    const totalToPay = isDelivery ? (grandTotal + commissionAmount) : grandTotal;

    const headerGridClass = taxEnabled
        ? "grid grid-cols-[2fr_0.5fr_1fr_1fr]"
        : "grid grid-cols-[2fr_0.5fr_1fr]";

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: isFiscal ? "Factura NCF" : "Factura",
    });

    const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
    const modalVariants = { hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } };

    const headerTitle = invoiceTitle || "Factura";
    const typeLabel = isFiscal ? "Factura con Comprobante Fiscal" : "Factura para Consumidor Final";

    return (
        <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-2 sm:px-4"
            initial="hidden"
            animate="visible"
            variants={backdropVariants}
        >
            <motion.div
                className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
                initial="hidden"
                animate="visible"
                variants={modalVariants}
            >
                <div ref={receiptRef} className="px-6 pt-6 pb-4 overflow-y-auto">
                    {/* Negocio */}
                    <div className="text-center text-xs text-gray-700 mb-2">
                        <h2 className="text-lg font-bold text-gray-900">{headerTitle}</h2>
                        <p className="font-semibold text-sm text-gray-900">{businessName}</p>
                        {businessRnc && <p>RNC: {businessRnc}</p>}
                        {businessAddress && <p>{businessAddress}</p>}
                        {businessPhone && <p>{businessPhone}</p>}
                    </div>

                    {/* Título + tipo */}
                    <div className="text-center mb-1">
                        <h2 className="text-lg font-bold text-center mb-1">
                            {invoiceTitle ? invoiceTitle : isFiscal ? "Factura con Comprobante Fiscal" : "Factura para Consumidor Final"}
                        </h2>
                    </div>

                    {/* NCF */}
                    {isFiscal && (
                        <div className="text-xs text-center text-gray-700">
                            {ncfType && <p>Tipo NCF: {ncfType}</p>}
                            {ncfNumber && <p className="font-semibold">NCF: {ncfNumber}</p>}
                        </div>
                    )}

                    <p className="text-[11px] text-center text-gray-600">Gracias por su compra</p>

                    {/* Datos orden */}
                    <div className="mt-3 border-t pt-3 text-xs text-gray-800 space-y-1">
                        {/* ✅ Factura No. */}
                        {facturaNo && (
                            <p>
                                <span className="font-semibold">Factura No.:</span> {facturaNo}
                            </p>
                        )}

                        {/* ✅ Sucursal / Punto emisión */}
                        {(branchName || emissionPoint) && (
                            <p>
                                <span className="font-semibold">Sucursal:</span> {branchName}{" "}
                                <span className="text-gray-500">·</span>{" "}
                                <span className="font-semibold">Punto de emisión:</span> {emissionPoint}
                            </p>
                        )}

                        <p>
                            <span className="font-semibold">Order ID:</span> {order?._id}
                        </p>

                        <p>
                            <span className="font-semibold">Fecha/Hora:</span>{" "}
                            {order?.createdAt ? formatDMYTime(order.createdAt) : "N/A"}
                        </p>

                        {/* ✅ Vence (NCF) */}
                        {isFiscal && (
                            <p>
                                <span className="font-semibold">Vence (NCF):</span>{" "}
                                {expirationDate ? formatDMY(expirationDate) : "N/A"}
                            </p>
                        )}

                        <p>
                            <span className="font-semibold">Cliente:</span> {clientName}
                        </p>

                        {clientRnc && (
                            <p>
                                <span className="font-semibold">RNC/Cédula:</span> {clientRnc}
                            </p>
                        )}
                    </div>

                    {/* Items */}
                    <div className="mt-4 text-xs">
                        <h3 className="font-semibold mb-2 text-gray-800">Detalle de consumo</h3>

                        <div className={`${headerGridClass} gap-x-3 border-b pb-1 mb-1 font-semibold text-[11px] text-gray-700`}>
                            <span>Descripción</span>
                            <span className="text-right">Cant.</span>
                            {taxEnabled && <span className="text-right">ITBIS</span>}
                            <span className="text-right">Valor</span>
                        </div>

                        <div className="space-y-0.5">
                            {items?.length === 0 && <p className="text-gray-500">No hay items.</p>}




                            {(items || []).map((item, index) => {
                                const itemsSubtotalSum = (items || []).reduce((sum, item) => {
                                    const qty = item?.quantity || item?.qty || 1;
                                    const unitPrice =
                                        Number(item?.unitPrice ?? item?.pricePerQuantity ?? 0) ||
                                        (Number(item?.price || 0) / Number(qty || 1));
                                    return sum + unitPrice * qty;
                                }, 0);


                                const itemName =
                                    item?.dishInfo?.name ||
                                    item?.dishName ||
                                    item?.dish?.name ||
                                    item?.name ||
                                    "Producto";

                                const qty = item?.quantity || item?.qty || 1;

                                const unitPrice =
                                    Number(item?.unitPrice ?? item?.pricePerQuantity ?? 0) ||
                                    (Number(item?.price || 0) / Number(qty || 1));

                                const lineSubtotal = unitPrice * qty;
                                const lineTax =
                                    taxEnabled && tax > 0 && itemsSubtotalSum > 0
                                        ? (lineSubtotal / itemsSubtotalSum) * tax
                                        : 0;

                                return (
                                    <div key={index} className={`${headerGridClass} gap-x-3 text-[11px] text-gray-800`}>
                    <span className="truncate" title={itemName}>
                      {itemName}
                    </span>
                                        <span className="text-right">{qty}</span>
                                        {taxEnabled && <span className="text-right">RD${lineTax.toFixed(2)}</span>}
                                        <span className="text-right">RD${unitPrice.toFixed(2)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Totales */}
                    <div className="mt-4 border-t pt-3 text-xs space-y-1 text-gray-800">
                        <p>
                            <span className="font-semibold">Subtotal:</span> RD${subtotal.toFixed(2)}
                        </p>

                        {discount > 0 && (
                            <p>
                                <span className="font-semibold">Descuento:</span> -RD${discount.toFixed(2)}
                            </p>
                        )}

                        {tip > 0 && (
                            <p>
                                <span className="font-semibold">Propina Legal:</span> RD${tip.toFixed(2)}
                            </p>
                        )}

                        {taxEnabled && tax > 0 && (
                            <p>
                                <span className="font-semibold">ITBIS:</span> RD${tax.toFixed(2)}
                            </p>
                        )}
                        {isDelivery && commissionAmount > 0 && (
                            <p>
                                <span className="font-semibold">Comisión ({commissionPct}%):</span> RD${commissionAmount.toFixed(2)}
                            </p>
                        )}

                        <p className="font-semibold">
                            Total a pagar: RD${(isDelivery ? (grandTotal + commissionAmount) : grandTotal).toFixed(2)}
                        </p>


                        <p>
                            <span className="font-semibold">Método de pago:</span> {paymentMethod}
                        </p>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex justify-between items-center border-t px-4 py-3 bg-gray-50 text-xs sm:text-sm">
                    <button onClick={handlePrint} className="text-primary-600 hover:text-primary-700 font-medium">
                        Imprimir
                    </button>
                    <button onClick={onClose} className="text-red-500 hover:text-red-600 font-medium">
                        Cerrar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Invoice;
