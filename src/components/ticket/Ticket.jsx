import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useReactToPrint } from "react-to-print";
import useTenant from "../../hooks/useTenant.js";
import { printWithTenantConfig } from "../../lib/tenantPrint";
import usePrinterOptions from "../../hooks/usePrinterOptions";

const safeNum = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const n = Number(String(v).replace(/rd\$/gi, "").replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
};

const formatDMYTime = (dateLike) => {
    if (!dateLike) return "N/A";
    if (typeof dateLike === "object" && dateLike.$date) dateLike = dateLike.$date;
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(d);
};

const getItemName = (it) =>
    it?.name ||
    it?.dishName ||
    it?.title ||
    it?.productName ||
    it?.menuItemName ||
    "Item";

const getQty = (it) => {
    if (it?.qtyType === "weight") return 1;
    const q = safeNum(it?.quantity ?? it?.qty ?? 1);
    return q <= 0 ? 1 : q;
};

const getItemExtras = (it) => {
    const extras = [];
    const note = it?.note || it?.comment || it?.specialInstructions || "";
    if (String(note).trim()) extras.push(String(note).trim());

    const addons = it?.addons || it?.addOns || it?.extras || it?.extraIngredients || it?.selectedExtras || null;
    if (Array.isArray(addons)) {
        addons.forEach((a) => {
            const label = a?.name || a?.label || a?.title || String(a);
            if (label && String(label).trim()) extras.push(String(label).trim());
        });
    }

    const modifiers = it?.modifiers || it?.selectedOptions || it?.options || null;
    if (Array.isArray(modifiers)) {
        modifiers.forEach((m) => {
            const label = m?.name || m?.label || m?.title || String(m);
            if (label && String(label).trim()) extras.push(String(label).trim());
        });
    }

    return extras;
};

const Ticket = ({ order, onClose, printerCategory = "ticket", title = "" }) => {

    const { tenantInfo } = useTenant();
    const receiptRef = useRef(null);
    const [isPrintingLogic, setIsPrintingLogic] = useState(false);

    const businessName = tenantInfo?.business?.name || tenantInfo?.name || "";
    const businessAddress = tenantInfo?.business?.address || "";
    const businessRnc = tenantInfo?.business?.rnc || tenantInfo?.fiscal?.rnc || "";
    const businessPhone = tenantInfo?.business?.phone || "";

    const createdAt = order?.createdAt || order?.updatedAt || order?.date || null;

    const items = useMemo(() => order?.items || order?.orderedItems || [], [order]);
    const orderNote = String(order?.orderNote || "").trim();

    const bills = order?.bills || {};
    const subtotal = safeNum(order?.subTotal ?? bills?.subtotal ?? 0);
    const discount = safeNum(order?.discountAmount ?? bills?.discount ?? 0);
    const tax = safeNum(order?.taxAmount ?? bills?.tax ?? 0);
    const tip = safeNum(order?.tipAmount ?? bills?.tip ?? 0);
    const total = safeNum(order?.totalAmount ?? bills?.totalWithTax ?? bills?.total ?? 0);

    const operation =
        order?.operationNumber ||
        order?.operationNo ||
        order?.operation ||
        order?.orderNumber ||
        order?.internalNumber ||
        order?.fiscal?.internalNumber ||
        (() => {
            // fallback: 9 dígitos basado en timestamp
            const n = Date.now() % 1000000000; // 0..999,999,999
            return String(n).padStart(9, "0");
        })();

    const tableObj = order?.table && typeof order.table === "object" ? order.table : null;

    const tableLabel =
        order?.tableName ||
        order?.table?.name ||
        (tableObj?.tableNo ? `Mesa ${tableObj.tableNo}` : "") ||
        (typeof order?.table === "string" ? order.table : "") ||
        "N/A";

    const roomLabel =
        order?.roomName ||
        order?.sala ||
        order?.area ||
        order?.section ||
        tableObj?.area ||
        "N/A";

    const waiter =
        order?.waiterName ||
        order?.serverName ||
        order?.mesero ||
        order?.waiter?.name ||
        "N/A";


    const paymentMethod = order?.paymentMethod || "Efectivo";

    const {
        printers: primaryPrinters,
        defaultPrinter: primaryDefaultPrinter,
        isLoadingPrinters: isLoadingPrimaryPrinters,
    } = usePrinterOptions(printerCategory);

    const {
        printers: kitchenPrinters,
        defaultPrinter: kitchenDefaultPrinter,
        isLoadingPrinters: isLoadingKitchenPrinters,
    } = usePrinterOptions("kitchen");

    const resolvedPrinters = useMemo(() => {
        if (Array.isArray(primaryPrinters) && primaryPrinters.length > 0) {
            return primaryPrinters;
        }
        return Array.isArray(kitchenPrinters) ? kitchenPrinters : [];
    }, [primaryPrinters, kitchenPrinters]);

    const resolvedDefaultPrinter = useMemo(() => {
        return primaryDefaultPrinter || kitchenDefaultPrinter || null;
    }, [primaryDefaultPrinter, kitchenDefaultPrinter]);

    const isLoadingPrinters = isLoadingPrimaryPrinters || isLoadingKitchenPrinters;

    const [selectedPrinterId, setSelectedPrinterId] = useState("");

    useEffect(() => {
        if (!selectedPrinterId && resolvedDefaultPrinter?._id) {
            setSelectedPrinterId(resolvedDefaultPrinter._id);
        }
    }, [resolvedDefaultPrinter, selectedPrinterId]);

    const selectedPrinter = useMemo(
        () =>
            resolvedPrinters.find((p) => p._id === selectedPrinterId) ||
            resolvedDefaultPrinter ||
            null,
        [resolvedPrinters, selectedPrinterId, resolvedDefaultPrinter]
    );
    const printingConfig = {
        enabled: true,
        mode: selectedPrinter?.mode || "browser",
    };

    const [printMessage, setPrintMessage] = useState("");

    const browserPrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Ticket-${operation}`,
    });

    const handleBrowserPrint = async () => {
        setPrintMessage("Abriendo impresión normal del navegador...");
        await browserPrint?.();
    };

    const handleLogicPrint = async () => {
        if (isPrintingLogic) return;

        try {
            setIsPrintingLogic(true);
            setPrintMessage("Enviando ticket a la impresora...");

            console.log("[PRINT][ticket] selectedPrinter =", selectedPrinter);

            const payload = {
                businessName,
                rnc: businessRnc,
                address: businessAddress,
                phone: businessPhone,
                title: title || "TICKET",
                orderId: String(operation),
                mesa: tableLabel,
                mesero: String(waiter),
                fecha: formatDMYTime(createdAt),
                salaArea: roomLabel,
                orderNote,
                showTotals: false,
                showItemPrices: false,
                items: (items || []).map((it) => ({
                    name: getItemName(it),
                    qty: getQty(it),
                    modifiers: getItemExtras(it).map((label) => ({ name: label })),
                })),
                subtotal: undefined,
                tax: undefined,
                total: undefined,
                paymentMethod: "",
            };

            const result = await printWithTenantConfig({
                config: printingConfig,
                type: "ticket",
                printer: selectedPrinter,
                fallbackPrint: browserPrint,
                payload,
            });

            setPrintMessage(result?.message || "Ticket enviado correctamente.");
        } catch (err) {
            console.error("[PRINT][ticket] logic print error:", err);
            setPrintMessage(
                err?.response?.data?.message ||
                err?.message ||
                "No se pudo imprimir el ticket."
            );
        } finally {
            setIsPrintingLogic(false);
        }
    };

    return (
        <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-2 sm:px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <motion.div
                className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="px-4 pt-4 pb-3 overflow-y-auto">
                    <style>
                        {`
              @media print {
                @page { size: 80mm auto; margin: 0mm; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .no-print { display: none !important; }
                .ticket-root { width: 80mm; margin: 0 auto; padding: 8mm 5mm; }
                .ticket-divider { border-top: 1px dashed #111; margin: 8px 0; }
              }
            `}
                    </style>

                    <div ref={receiptRef} className="ticket-root">
                        <div className="text-center">
                            <div className="text-lg font-extrabold">{businessName}</div>
                            {businessRnc ? <div className="text-xs">RNC: {businessRnc}</div> : null}
                            {businessAddress ? <div className="text-xs">{businessAddress}</div> : null}
                            {businessPhone ? <div className="text-xs">Tel: {businessPhone}</div> : null}
                        </div>

                        <div className="ticket-divider" />

                        <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                                <span>Operacion:</span>
                                <span className="font-semibold">{String(operation)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Mesa:</span>
                                <span className="font-semibold">{tableLabel}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Fecha:</span>
                                <span className="font-semibold">{formatDMYTime(createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Mesero:</span>
                                <span className="font-semibold">{String(waiter)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Sala/Área:</span>
                                <span className="font-semibold">{roomLabel}</span>
                            </div>
                        </div>

                        <div className="ticket-divider" />

                        <div className="ticket-divider" />


                        <div className="text-xs">
                            {items?.length ? (
                                <div className="space-y-2">
                                    {items.map((it, idx) => {
                                        const qty = getQty(it);
                                        const name = getItemName(it);
                                        const extras = getItemExtras(it);

                                        return (
                                            <div
                                                key={`${idx}-${name}`}
                                                className="px-1 py-1"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <div className="min-w-[30px] rounded bg-black px-2 py-1 text-center text-[13px] font-extrabold text-white leading-none">
                                                        x{qty}
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="text-[14px] font-extrabold leading-snug uppercase">
                                                            {name}
                                                        </div>

                                                        {extras?.length ? (
                                                            <div className="mt-1 pl-1">
                                                                {extras.slice(0, 6).map((ex, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="text-[11px] text-gray-700 leading-snug"
                                                                    >
                                                                        • {ex}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500">Sin items</div>
                            )}
                        </div>

                        <div className="ticket-divider" />
                        {orderNote ? (
                            <>
                                <div className="mt-4 mb-4 px-1 py-1">
                                    <div className="text-[13px] font-extrabold uppercase">
                                        Nota del pedido
                                    </div>

                                    <div className="mt-2 pl-2 text-[14px] font-semibold whitespace-pre-wrap break-words leading-snug">
                                        {orderNote}
                                    </div>
                                </div>

                                <div className="ticket-divider my-3" />
                            </>
                        ) : null}



                        <div className="ticket-divider" />
                        <div className="text-center text-xs font-bold">FIN PEDIDO</div>
                        <div className="text-center text-[11px] text-gray-700">Gracias por su compra</div>
                    </div>
                </div>
                <div className="no-print border-t pt-3 px-4 pb-2 bg-white">
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-700">Impresora</div>

                        <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                            value={selectedPrinterId}
                            onChange={(e) => setSelectedPrinterId(e.target.value)}
                            disabled={isLoadingPrinters || resolvedPrinters.length === 0}
                        >
                            {resolvedPrinters.length === 0 ? (
                                <option value="">No hay impresoras registradas</option>
                            ) : (
                                resolvedPrinters.map((p) => (
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
                        {printerCategory !== "kitchen" && primaryPrinters.length === 0 && kitchenPrinters.length > 0 && (
                            <div className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-2">
                                No hay impresora registrada para "{printerCategory}". Se está usando la impresora de cocina.
                            </div>
                        )}

                    </div>
                </div>

                <div className="no-print flex items-center justify-between gap-3 border-t px-4 py-3 bg-white">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleBrowserPrint}
                            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-100"
                        >
                            Otras impresoras
                        </button>

                        <button
                            type="button"
                            onClick={handleLogicPrint}
                            disabled={isPrintingLogic}
                            className={`px-4 py-2 rounded-md text-white font-semibold ${
                                isPrintingLogic
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-[#111111] hover:bg-[#2b2b2b]"
                            }`}
                        >
                            {isPrintingLogic ? "Imprimiendo..." : "Impresora de red"}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-md text-red-600 font-semibold hover:bg-red-50"
                    >
                        Cerrar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Ticket;