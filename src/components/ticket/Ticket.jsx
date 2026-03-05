import React, { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useReactToPrint } from "react-to-print";
import useTenant from "../../hooks/useTenant.js";

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

const Ticket = ({ order, onClose }) => {
    const { tenantInfo } = useTenant();
    const receiptRef = useRef(null);

    const businessName = tenantInfo?.business?.name || tenantInfo?.name || "";
    const businessAddress = tenantInfo?.business?.address || "";
    const businessRnc = tenantInfo?.business?.rnc || tenantInfo?.fiscal?.rnc || "";
    const businessPhone = tenantInfo?.business?.phone || "";

    const createdAt = order?.createdAt || order?.updatedAt || order?.date || null;

    const items = useMemo(() => order?.items || order?.orderedItems || [], [order]);

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


    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Ticket-${operation}`,
    });

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
                                <span>Operación:</span>
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
                                items.map((it, idx) => {
                                    const qty = getQty(it);
                                    const name = getItemName(it);
                                    const extras = getItemExtras(it);

                                    return (
                                        <div key={`${idx}-${name}`} className="mb-2">
                                            <div className="flex justify-between gap-2">
                                                <div className="font-semibold">
                                                    ({qty}) {name}
                                                </div>
                                            </div>

                                            {extras?.length ? (
                                                <div className="mt-1 pl-3 text-[11px] text-gray-700">
                                                    {extras.slice(0, 6).map((ex, i) => (
                                                        <div key={i}>- {ex}</div>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center text-gray-500">Sin items</div>
                            )}
                        </div>

                        <div className="ticket-divider" />



                        <div className="ticket-divider" />
                        <div className="text-center text-xs font-bold">FIN PEDIDO</div>
                        <div className="text-center text-[11px] text-gray-700">Gracias por su compra</div>
                    </div>
                </div>

                <div className="no-print flex items-center justify-between gap-3 border-t px-4 py-3 bg-white">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="px-4 py-2 rounded-md bg-[#111111] text-white font-semibold hover:bg-[#2b2b2b]"
                    >
                        Imprimir
                    </button>

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