    // src/components/invoice/Invoice.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useReactToPrint } from "react-to-print";
import useTenant from "../../hooks/useTenant.js";
import { printWithTenantConfig } from "../../lib/tenantPrint";
import usePrinterOptions from "../../hooks/usePrinterOptions";
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

const safeNum = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const s = String(v).trim();

    // limpia "RD$", comas, espacios
    const normalized = s.replace(/rd\$/gi, "").replace(/,/g, "").trim();
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
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
    const [isPrintingLogic, setIsPrintingLogic] = useState(false);

    const { tenantInfo } = useTenant();

    const receiptRef = useRef(null);

    // ===== Datos negocio =====
    const businessName = tenantInfo?.business?.name || tenantInfo?.name || "";
    const businessAddress = tenantInfo?.business?.address || "";
    const businessRnc = tenantInfo?.business?.rnc || tenantInfo?.fiscal?.rnc || "";
    const businessPhone = tenantInfo?.business?.phone || "";

    // ===== Fiscal =====
    const resolvedFiscalRequested = order?.fiscal?.requested === true;

    const resolvedNcfType =
        order?.fiscal?.ncfType ||
        order?.ncfType ||
        "";

    const resolvedNcfNumber =
        order?.ncfNumber ||
        order?.fiscal?.ncfNumber ||
        order?.fiscal?.ncf ||
        order?.fiscal?.number ||
        order?.fiscal?.documentNumber ||
        order?.fiscal?.ncfCode ||
        order?.fiscal?.comprobante ||
        order?.ncf ||
        "";

    const isFiscal = Boolean(
        resolvedFiscalRequested ||
        (resolvedNcfType && resolvedNcfNumber)
    );

    const tenantPreInvoiceEnabled = !!tenantInfo?.features?.preInvoice?.enabled;

// si existe una prefactura en la orden, tiene prioridad; si no, usa el tenant default
    const isPreInvoice =
        !!order?.fiscal?.preInvoice || tenantPreInvoiceEnabled;

    const ncfType =
        order?.fiscal?.ncfType ||
        order?.ncfType ||
        "";

    const ncfNumber =
        order?.ncfNumber ||
        order?.fiscal?.ncfNumber ||
        order?.fiscal?.ncf ||
        order?.fiscal?.number ||
        order?.fiscal?.documentNumber ||
        order?.fiscal?.ncfCode ||
        order?.fiscal?.comprobante ||
        order?.ncf ||
        "";

    const facturaNoRaw =
        order?.facturaNo ??
        order?.invoiceNumber ??
        order?.invoiceNo ??
        order?.fiscal?.facturaNo ??
        order?.fiscal?.invoiceNumber ??
        order?.fiscal?.invoiceNo ??
        order?.fiscal?.internalNumber ??
        order?.fiscal?.internalSeq ??
        order?.fiscal?.internal ??
        order?.fiscal?.sequence ??
        order?.fiscal?.sequenceNumber ??
        null;

    const facturaNo =
        typeof facturaNoRaw === "string"
            ? facturaNoRaw
            : (facturaNoRaw ? pad(facturaNoRaw, 8) : null);

// ✅ Vence (NCF)
    const expirationDate =
        order?.expirationDate ||
        order?.fiscal?.expirationDate ||
        order?.fiscal?.expiresAt ||
        order?.fiscal?.expiryDate ||
        tenantInfo?.fiscal?.ncfConfig?.[ncfType]?.expiresAt ||
        null;



    // ✅ Sucursal / Punto emisión (defaults)
    const branchName =
        tenantInfo?.fiscal?.branchName ||
        tenantInfo?.business?.branchName ||
        "Principal";

    const emissionPoint =
        order?.fiscal?.emissionPoint ||
        tenantInfo?.fiscal?.emissionPoint ||
        "001";



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
    const clientPhone =
        order?.customerDetails?.phone ||
        order?.customerPhone ||
        "";

    const clientAddress =
        order?.customerDetails?.address ||
        order?.customerAddress ||
        "";
    const tableObj = order?.table && typeof order.table === "object" ? order.table : null;

        // Mesa como texto: "Mesa 1"
    const tableName =
        order?.tableName ||
        order?.table?.name ||
        (tableObj?.tableNo ? `Mesa ${tableObj.tableNo}` : "") ||
        (typeof order?.table === "string" ? order.table : "") ||
        "";

    // Mesero/usuario
    const waiterName =
        order?.waiterName ||
        order?.serverName ||
        order?.mesero ||
        order?.waiter?.name ||
        order?.user?.name ||
        order?.createdBy?.name ||
        "";

// Sala/Área (Terraza suele venir en table.area)
    const salaArea =
        order?.roomName ||
        order?.sala ||
        order?.area ||
        order?.section ||
        tableObj?.area ||
        "";
    // ===== Pago =====
    const paymentMethod = order?.paymentMethod || "Efectivo";

    // ===== Items =====
    const items = itemsOverride ?? (order?.items || []);

    // ===== Totales =====
    const bills = order?.bills || {};

    const subtotal = Number(order?.subTotal ?? bills?.subtotal ?? bills?.total ?? 0);

    const discount = Number(order?.discountAmount ?? bills?.discount ?? 0);
    const taxEnabled =
        typeof (order?.taxEnabled ?? bills?.taxEnabled) === "boolean"
            ? (order?.taxEnabled ?? bills?.taxEnabled)
            : tax > 0;
    const tax = Number(order?.taxAmount ?? bills?.tax ?? 0);
    const tip = Number(order?.tipAmount ?? bills?.tipAmount ?? bills?.tip ?? 0);

    const grandTotal = Number(order?.totalAmount ?? bills?.totalWithTax ?? bills?.total ?? 0);
// ===== Canal / Delivery / Envío =====
    const orderSource = String(order?.orderSource || "").toUpperCase();

// Apps (tienen comisión)
    const isAppDelivery = orderSource === "PEDIDOSYA" || orderSource === "UBEREATS";

// Delivery interno (tiene envío)
    const isInternalDelivery = orderSource === "DELIVERY";

// Comisión (solo apps)
    const commissionRate = Number(order?.commissionRate ?? bills?.commissionRate ?? 0);
    const commissionPct = commissionRate ? Math.round(commissionRate * 100) : 0;
    const commissionAmount = Number(order?.commissionAmount ?? bills?.commissionAmount ?? 0);

// Envío (solo delivery interno)
    const shippingFee = safeNum(
        order?.shippingFee ??
        order?.deliveryFee ??
        bills?.shippingFee ??
        bills?.deliveryFee ??
        0
    );
    const showShipping = shippingFee > 0;
    const treatAsInternalDelivery = isInternalDelivery || showShipping;
    const {
        printers: invoicePrinters,
        defaultPrinter: defaultInvoicePrinter,
        isLoadingPrinters,
    } = usePrinterOptions("invoice");

    const getInvoiceItemName = (item) =>
        item?.dishInfo?.name ||
        item?.dishName ||
        item?.dish?.name ||
        item?.name ||
        "Producto";
    const [selectedPrinterId, setSelectedPrinterId] = useState("");


    useEffect(() => {
        if (!selectedPrinterId && defaultInvoicePrinter?._id) {
            setSelectedPrinterId(defaultInvoicePrinter._id);
        }
    }, [defaultInvoicePrinter, selectedPrinterId]);

    const selectedPrinter = useMemo(
        () => invoicePrinters.find((p) => p._id === selectedPrinterId) || defaultInvoicePrinter || null,
        [invoicePrinters, selectedPrinterId, defaultInvoicePrinter]
    );

    const printingConfig = {
        enabled: true,
        mode: selectedPrinter?.mode || "browser",
    };
    const [printMessage, setPrintMessage] = useState("");

// Si el backend ya incluyó el envío en grandTotal, no lo sumamos doble.
// Recalculamos un “expected” y comparamos.
    const expectedTotalWithShipping =
        (subtotal - discount) +
        (taxEnabled ? tax : 0) +
        tip +
        (treatAsInternalDelivery ? shippingFee : 0);

    const shippingAlreadyIncluded =
        treatAsInternalDelivery && Math.abs(expectedTotalWithShipping - grandTotal) < 0.01;

    const totalToPay = isAppDelivery
        ? (grandTotal + commissionAmount)
        : treatAsInternalDelivery
            ? (shippingAlreadyIncluded ? grandTotal : (grandTotal + shippingFee))
            : grandTotal;



    const headerGridClass = taxEnabled
        ? "grid grid-cols-[2fr_0.5fr_1fr_1fr]"
        : "grid grid-cols-[2fr_0.5fr_1fr]";

    const browserPrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: isFiscal ? "Factura NCF" : (isPreInvoice ? "PreFactura" : "Factura"),
    });

    const handleBrowserPrint = async () => {
        setPrintMessage("Abriendo impresión normal del navegador...");
        await browserPrint?.();
    };

    const handleLogicPrint = async () => {
        if (isPrintingLogic) return;

        try {
            setIsPrintingLogic(true);
            setPrintMessage("Enviando factura a la impresora...");

            console.log("[PRINT][invoice] selectedPrinter =", selectedPrinter);

            const itemsSubtotalSum = (items || []).reduce((sum, item) => {
                const qty = Number(item?.quantity || item?.qty || 1);
                const unitPrice =
                    Number(item?.unitPrice ?? item?.pricePerQuantity ?? 0) ||
                    (Number(item?.price || 0) / Number(qty || 1));

                return sum + unitPrice * qty;
            }, 0);

            const payload = {
                businessName,
                rnc: businessRnc,
                address: businessAddress,
                phone: businessPhone,

                headerTitle,

                isFiscal,
                isPreInvoice,
                ncfType,
                ncfNumber,
                facturaNo,
                branchName,
                emissionPoint,
                expirationDate: expirationDate ? formatDMY(expirationDate) : "N/A",

                orderId: order?._id || "N/A",
                fechaHora: order?.createdAt ? formatDMYTime(order.createdAt) : "N/A",
                mesa: tableName || "N/A",
                mesero: waiterName || "N/A",
                salaArea: salaArea || "N/A",

                clientName,
                clientPhone,
                clientAddress,
                clientRnc,

                taxEnabled,
                paymentMethod,

                items: (items || []).map((item) => {
                    const qty = Number(item?.quantity || item?.qty || 1);
                    const unitPrice =
                        Number(item?.unitPrice ?? item?.pricePerQuantity ?? 0) ||
                        (Number(item?.price || 0) / Number(qty || 1));

                    const lineSubtotal = unitPrice * qty;
                    const lineTax =
                        taxEnabled && tax > 0 && itemsSubtotalSum > 0
                            ? (lineSubtotal / itemsSubtotalSum) * tax
                            : 0;

                    return {
                        name: getInvoiceItemName(item),
                        qty,
                        unitPrice,
                        tax: lineTax,
                    };
                }),

                subtotal,
                discount,
                tip,
                tax,
                isAppDelivery,
                commissionPct,
                commissionAmount,
                showShipping,
                shippingFee,
                totalToPay,
            };

            const result = await printWithTenantConfig({
                config: printingConfig,
                type: "invoice",
                printer: selectedPrinter,
                fallbackPrint: browserPrint,
                payload,
            });

            setPrintMessage(result?.message || "Factura impresa correctamente.");
        } catch (err) {
            console.error("[PRINT][invoice] logic print error:", err);
            setPrintMessage(
                err?.response?.data?.message ||
                err?.message ||
                "No se pudo imprimir la factura."
            );
        } finally {
            setIsPrintingLogic(false);
        }
    };

    const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
    const modalVariants = { hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } };

    const headerTitle =
        invoiceTitle ??
        (isFiscal
            ? "Factura con Comprobante Fiscal"
            : (isPreInvoice ? "PreFactura" : "Factura Consumidor Final"));

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
                    {/* Negocio  <h2 className="text-lg font-bold text-gray-900">{headerTitle}</h2>*/}
                    <div className="text-center text-xs text-gray-700 mb-2">

                        <p className="font-semibold text-sm text-gray-900">{businessName}</p>
                        {businessRnc && <p>RNC: {businessRnc}</p>}
                        {businessAddress && <p>{businessAddress}</p>}
                        {businessPhone && <p>{businessPhone}</p>}
                    </div>

                    {/* Título + tipo */}
                    <div className="text-center mb-1">
                        <h2 className="text-lg font-bold text-center mb-1">
                            {headerTitle}
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
                        {tableName && (
                            <p>
                                <span className="font-semibold">Mesa:</span> {tableName}
                            </p>
                        )}

                        {waiterName && (
                            <p>
                                <span className="font-semibold">Mesero:</span> {waiterName}
                            </p>
                        )}

                        {salaArea && (
                            <p>
                                <span className="font-semibold">Sala/Área:</span> {salaArea}
                            </p>
                        )}
                        {(branchName || emissionPoint) && (
                            <p>
                                <span className="font-semibold">Sucursal:</span> {branchName}{" "}
                                <span className="text-gray-500">·</span>{" "}
                                <span className="font-semibold">Punto de emision:</span> {emissionPoint}
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
                        {clientPhone && (
                            <p>
                                <span className="font-semibold">Teléfono:</span> {clientPhone}
                            </p>
                        )}

                        {clientAddress && (
                            <p>
                                <span className="font-semibold">Dirección:</span> {clientAddress}
                            </p>
                        )}

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
                        {isAppDelivery  && commissionAmount > 0 && (
                            <p>
                                <span className="font-semibold">Comisión ({commissionPct}%):</span> RD${commissionAmount.toFixed(2)}
                            </p>
                        )}
                        {showShipping && (
                            <p>
                                <span className="font-semibold">Envío:</span> RD${shippingFee.toFixed(2)}
                            </p>
                        )}


                        <p className="font-semibold">
                            Total a pagar: RD${totalToPay.toFixed(2)}
                        </p>
                        <p>
                            <span className="font-semibold">Método de pago:</span> {paymentMethod}
                        </p>
                    </div>
                </div>
                <div className="border-t px-4 pt-3 pb-2 bg-gray-50">
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-700">Impresora</div>

                        <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                            value={selectedPrinterId}
                            onChange={(e) => setSelectedPrinterId(e.target.value)}
                            disabled={isLoadingPrinters || invoicePrinters.length === 0}
                        >
                            {invoicePrinters.length === 0 ? (
                                <option value="">No hay impresoras registradas</option>
                            ) : (
                                invoicePrinters.map((p) => (
                                    <option key={p._id} value={p._id}>
                                        {p.alias} {p.isDefault ? "• default" : ""}
                                    </option>
                                ))
                            )}
                        </select>

                        {selectedPrinter ? (
                            <div className="text-[11px] text-gray-500">
                                Modo: {selectedPrinter.mode} · Papel: {selectedPrinter.paperSize}
                                {selectedPrinter.ip ? ` · ${selectedPrinter.ip}:${selectedPrinter.port}` : ""}
                            </div>
                        ) : (
                            <div className="text-[11px] text-gray-400">
                                En modo browser, el navegador mostrará su diálogo de impresión.
                            </div>
                        )}
                        {printMessage && (
                            <div className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-2 py-2">
                                {printMessage}
                            </div>
                        )}
                    </div>
                </div>

                {/* Botones */}
                <div className="flex flex-wrap justify-between items-center gap-2 border-t px-4 py-3 bg-gray-50 text-xs sm:text-sm">
                    <div className="flex gap-2">
                        <button
                            onClick={handleBrowserPrint}
                            className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium"
                        >
                            Otras impresoras
                        </button>

                        <button
                            onClick={handleLogicPrint}
                            disabled={isPrintingLogic}
                            className={`px-3 py-2 rounded-md text-white font-semibold ${
                                isPrintingLogic
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-[#111111] hover:bg-[#2b2b2b]"
                            }`}
                        >
                            {isPrintingLogic ? "Imprimiendo..." : "Impresora de red"}
                        </button>
                    </div>

                    <button onClick={onClose} className="text-red-500 hover:text-red-600 font-medium">
                        Cerrar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Invoice;
