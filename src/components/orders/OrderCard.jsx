// pos-frontend/src/components/orders/OrderCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import { formatDateAndTime } from "../../utils";
import { updateOrder } from "../../https";
import useTenant from "../../hooks/useTenant";
import api from "../../lib/api";
import Invoice from "../invoice/Invoice";
import SplitBillModal from "./SplitBillModal";
import SplitInvoicesModal from "./SplitInvoicesModal";



const STATUS_FLOW = ["In Progress", "Ready", "Completed"];


const getStatusColorClasses = (status) => {
    switch (status) {
        case "Ready":
            return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
        case "Completed":
            return "bg-blue-500/15 text-blue-300 border-blue-500/40";
        case "Cancelled":
            return "bg-red-500/15 text-red-300 border-red-500/40";
        case "In Progress":
        default:
            return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    }
};

const getAvatarInitial = (name) => {
    if (!name) return "W";
    return name.trim()[0].toUpperCase();
};

const getShortOrderId = (order) => {
    if (!order) return "#—";
    if (order.orderShortId) return `#${order.orderShortId}`;
    if (order.orderId) return `#${order.orderId}`;
    if (order._id) return `#${order._id.slice(-6).toUpperCase()}`;
    return "#—";
};

const getOrderTypeLabel = (orderType) => {
    if (!orderType) return "Dine in";
    return orderType;
};

const isLikelyRnc = (val) => {
    const cleaned = String(val || "").replace(/\D/g, "");
    return /^\d{9}$/.test(cleaned) || /^\d{11}$/.test(cleaned);
};

const OrderCard = ({ order, onStatusChanged }) => {
    const { enqueueSnackbar } = useSnackbar();

    // mantenemos copia local para poder refrescar la tarjeta cuando emitimos NCF
    const [localOrder, setLocalOrder] = useState(order);
    useEffect(() => setLocalOrder(order), [order]);
    const [showSplitInvoices, setShowSplitInvoices] = useState(false);
    const [invoiceTitle, setInvoiceTitle] = useState(null);
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [lastSplitBills, setLastSplitBills] = useState([]);
    const [invoiceOrderOverride, setInvoiceOrderOverride] = useState(null);

    const openSplit = () => {
        if (currentStatus === "Cancelled") return;
        setShowSplitModal(true);
    };
    const [savingSplit, setSavingSplit] = useState(false);

    const handleSaveSplit = async (splitPayload) => {
        try {
            setSavingSplit(true);

            const bills = localOrder?.bills || {};
            const payload = {
                bills: {
                    ...bills,
                    split: {
                        ...(bills.split || {}),
                        enabled: true,
                        accounts: splitPayload?.accounts || [],     // <-- IMPORTANTe para tu label "X cuentas"
                        splitBills: splitPayload?.splitBills || [], // <-- el array real
                    },
                },
            };

            const res = await updateOrder(splitPayload.orderId, payload);

            // Soporta varias formas de respuesta (según tu backend)
            const updatedOrder =
                res?.data?.data ?? res?.data?.order ?? res?.data ?? null;

            if (!updatedOrder) throw new Error("updateOrder no devolvió la orden actualizada");

            setLocalOrder(updatedOrder);
            setShowSplitModal(false);

            // OJO: normalmente esto es splitBills (no bills)
            const billsToUse =
                updatedOrder?.bills?.split?.splitBills ||
                splitPayload?.splitBills ||
                [];

            setLastSplitBills(billsToUse);
            setShowSplitInvoices(true);

            enqueueSnackbar("Split guardado. Selecciona una cuenta para imprimir.", {
                variant: "success",
            });
        } catch (err) {
            console.error("handleSaveSplit error:", err);
            enqueueSnackbar("No se pudo guardar el split.", { variant: "error" });
        } finally {
            setSavingSplit(false);
        }
    };

    const openInvoiceForBill = (bill) => {
          // itemsOverride en el formato que Invoice entiende
              const itemsOverride = (bill?.items || []).map((it) => ({
                name: it.name,
                qty: it.qty,
                unitPrice: it.unitPrice,
                total: it.lineTotal,
              }));

              const subtotal = (bill?.totals?.subtotal ?? bill?.subtotal) ??
                itemsOverride.reduce((sum, it) => sum + (Number(it.total) || 0), 0);

              // Creamos una “orden virtual” solo para imprimir esa cuenta
                  // (para que NO imprima el total completo de la orden)
                      const orderForInvoice = {
                ...localOrder,
                subTotal: subtotal,
                totalAmount: subtotal,
                taxAmount: 0,
                tipAmount: 0,
                discountAmount: 0,
                bills: {
                  ...(localOrder?.bills || {}),
                      subtotal,
                      total: subtotal,
                      totalWithTax: subtotal,
                      taxEnabled: false,
                      tax: 0,
                      tip: 0,
                    },
          };

              setInvoiceOrderOverride(orderForInvoice);
          setInvoiceItemsOverride(itemsOverride);
        setInvoiceTitle(bill?.accountName || bill?.name || "Factura");
        setSelectedBillForInvoice(bill);


          setShowInvoice(true);
        };


    const { tenantInfo } = useTenant();

    // Solo mostramos botón fiscal si el tenant está habilitado y tiene B01/B02 activos
    const fiscalCapable = Boolean(
        tenantInfo?.fiscal?.enabled &&
        (tenantInfo?.fiscal?.ncfConfig?.B01?.active ||
            tenantInfo?.fiscal?.ncfConfig?.B02?.active)
    );

    const allowedNcfTypes = useMemo(() => {
        return [
            tenantInfo?.fiscal?.ncfConfig?.B01?.active ? "B01" : null,
            tenantInfo?.fiscal?.ncfConfig?.B02?.active ? "B02" : null,
        ].filter(Boolean);
    }, [tenantInfo]);

    const currentStatus = localOrder?.orderStatus || "In Progress";

    const createdAtLabel = useMemo(
        () => (localOrder?.createdAt ? formatDateAndTime(localOrder.createdAt) : "N/A"),
        [localOrder?.createdAt]
    );

    const itemsSummary = useMemo(() => {
        if (!localOrder?.items || localOrder.items.length === 0) return ["No items"];

        return localOrder.items.map((item) => {
            const name = item?.dishName || item?.dish?.name || item?.name || "Item";
            const qty = item?.quantity ?? 1;
            return `${name} x${qty}`;
        });
    }, [localOrder?.items]);

    const totalItems = useMemo(() => {
        if (!localOrder?.items || localOrder.items.length === 0) return 0;
        return localOrder.items.reduce((sum, item) => sum + (item?.quantity ?? 1), 0);
    }, [localOrder?.items]);

    // --- Fiscal state (modal) ---
    const existingFiscal = Boolean(localOrder?.fiscal?.requested || localOrder?.ncfNumber);

    const [showFiscalModal, setShowFiscalModal] = useState(false);
    const [showInvoice, setShowInvoice] = useState(false);
    const [invoiceItemsOverride, setInvoiceItemsOverride] = useState(null);
    const [selectedBillForInvoice, setSelectedBillForInvoice] = useState(null); // opcional

    const [fiscalRnc, setFiscalRnc] = useState("");
    const [fiscalName, setFiscalName] = useState("");
    const [fiscalType, setFiscalType] = useState("B02");
    const [dgiiLoading, setDgiiLoading] = useState(false);
    const [savingFiscal, setSavingFiscal] = useState(false);

    // Prefill cuando abres modal
    useEffect(() => {
        if (!showFiscalModal) return;

        const preRnc = localOrder?.customerDetails?.rnc || "";
        const preName = localOrder?.customerDetails?.name || "";
        const preType = localOrder?.fiscal?.ncfType || (allowedNcfTypes.includes("B02") ? "B02" : allowedNcfTypes[0] || "B02");

        setFiscalRnc(preRnc);
        setFiscalName(preName);
        setFiscalType(preType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showFiscalModal]);

    // asegurar tipo permitido
    useEffect(() => {
        if (!allowedNcfTypes.length) return;
        if (!allowedNcfTypes.includes(fiscalType)) setFiscalType(allowedNcfTypes[0]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowedNcfTypes.join("|")]);

    // Autocompletado DGII (solo RNC 9 dígitos)
    useEffect(() => {
        if (!showFiscalModal) return;
        const clean = String(fiscalRnc || "").replace(/\D/g, "");
        if (!isLikelyRnc(clean)) return;
        if (fiscalName?.trim()) return;

        const t = setTimeout(async () => {
            try {
                setDgiiLoading(true);
                const res = await api.get(`/api/dgii/rnc/${clean}`);
                console.log("DGII response:", res?.data);
                const name =
                    res?.data?.data?.name ||
                    res?.data?.name ||
                    res?.data?.data?.nombre ||
                    res?.data?.data?.razonSocial ||
                    "";

                if (name) setFiscalName(name);
            } catch (e) {
                // no rompemos flujo
            } finally {
                setDgiiLoading(false);
            }
        }, 450);

        return () => clearTimeout(t);
    }, [fiscalRnc, fiscalName, showFiscalModal]);

    const handleStatusUpdate = async (targetStatus) => {
        if (!localOrder?._id) return;

        try {
            const bills = localOrder.bills || {};

            const payload = {
                orderStatus: targetStatus,
                items: localOrder?.items || [],
                customerDetails: localOrder?.customerDetails || {},
                bills: {
                    total: bills.total ?? 0,
                    discount: bills.discount ?? 0,
                    taxEnabled:
                        typeof bills.taxEnabled === "boolean"
                            ? bills.taxEnabled
                            : (bills.tax ?? 0) > 0,
                    tax: bills.tax ?? 0,
                    tipAmount: bills.tipAmount ?? bills.tip ?? 0,
                    totalWithTax: bills.totalWithTax ?? bills.total ?? 0,
                },
            };

            const res = await updateOrder(localOrder._id, payload);
            const autoDeleted = res?.data?.autoDeleted;

            if (autoDeleted) {
                enqueueSnackbar("Order removed because it had no items.", { variant: "info" });
                if (onStatusChanged) onStatusChanged(localOrder._id, "__DELETE__");
                return;
            }

            enqueueSnackbar(`Order status updated to "${targetStatus}"`, { variant: "success" });

            // update local
            setLocalOrder((prev) => ({ ...(prev || {}), orderStatus: targetStatus }));

            if (onStatusChanged) onStatusChanged(localOrder._id, targetStatus);
        } catch (error) {
            console.error("Error updating order status", error);
            enqueueSnackbar("Error updating order status", { variant: "error" });
        }
    };

    const handleNext = () => {
        const idx = STATUS_FLOW.indexOf(currentStatus);
        if (idx === -1 || idx === STATUS_FLOW.length - 1) return;
        handleStatusUpdate(STATUS_FLOW[idx + 1]);
    };

    const handleBack = () => {
        const idx = STATUS_FLOW.indexOf(currentStatus);
        if (idx <= 0) return;
        handleStatusUpdate(STATUS_FLOW[idx - 1]);
    };

    const handleCancel = () => {
        if (currentStatus === "Cancelled") return;
        handleStatusUpdate("Cancelled");
    };

    const canGoBack =
        STATUS_FLOW.includes(currentStatus) && STATUS_FLOW.indexOf(currentStatus) > 0;

    const canGoForward =
        STATUS_FLOW.includes(currentStatus) &&
        STATUS_FLOW.indexOf(currentStatus) < STATUS_FLOW.length - 1;

    const primaryButtonLabel =
        currentStatus === "In Progress"
            ? "Marcar as Ready"
            : currentStatus === "Ready"
                ? "Marcar as Completed"
                : "Advance";

    const openFiscal = () => {
        if (currentStatus === "Cancelled") {
            enqueueSnackbar("No puedes emitir NCF en una orden cancelada.", { variant: "warning" });
            return;
        }

        // si ya existe NCF, simplemente mostramos invoice
        if (existingFiscal) {
            setShowInvoice(true);
            return;
        }

        setShowFiscalModal(true);
    };

    const saveFiscal = async () => {
        if (!localOrder?._id) return;

        const rncTrim = String(fiscalRnc || "").trim();
        const nameTrim = String(fiscalName || "").trim();

        if (!rncTrim) {
            enqueueSnackbar("Ingresa RNC o Cédula.", { variant: "warning" });
            return;
        }
        if (!nameTrim) {
            enqueueSnackbar("Ingresa Nombre / Razón Social (o espera autocompletado).", { variant: "warning" });
            return;
        }

        try {
            setSavingFiscal(true);

            const bills = localOrder?.bills || {};
            const ncfTypeToSend = allowedNcfTypes.includes(fiscalType)
                ? fiscalType
                : (allowedNcfTypes[0] || "B02");

            const payload = {
                items: localOrder?.items || [],
                // preservamos bills para evitar sobrescribir con vacío si el backend reemplaza el objeto
                bills: {
                    ...bills,
                    total: bills.total ?? bills.subtotal ?? 0,
                    subtotal: bills.subtotal ?? bills.total ?? 0,
                    discount: bills.discount ?? 0,
                    taxEnabled:
                        typeof bills.taxEnabled === "boolean"
                            ? bills.taxEnabled
                            : (bills.tax ?? 0) > 0,
                    tax: bills.tax ?? 0,
                    tipAmount: bills.tipAmount ?? bills.tip ?? 0,
                    totalWithTax: bills.totalWithTax ?? bills.total ?? 0,
                },

                customerDetails: {
                    ...(localOrder?.customerDetails || {}),
                    name: nameTrim,
                    rnc: rncTrim,
                },

                fiscal: {
                    requested: true,
                    ncfType: ncfTypeToSend,
                },
            };

            const res = await updateOrder(localOrder._id, payload);

            const updated = res?.data?.data || res?.data || null;
            if (!updated) {
                enqueueSnackbar("No se recibió la orden actualizada.", { variant: "warning" });
                setShowFiscalModal(false);
                return;
            }

            setLocalOrder(updated);

            enqueueSnackbar("Comprobante fiscal preparado.", { variant: "success" });
            setShowFiscalModal(false);
            setShowInvoice(true);
        } catch (e) {
            console.error(e);
            enqueueSnackbar("Error emitiendo comprobante fiscal.", { variant: "error" });
        } finally {
            setSavingFiscal(false);
        }
    };

    const cardClasses =
        "flex flex-col justify-between rounded-xl bg-[#1f1f1f] shadow-lg border border-white/5 px-4 py-3 sm:px-5 sm:py-4 h-full min-h-[220px]";

    return (
        <>
            <div className={cardClasses}>
                {/* HEADER */}
                <div className="flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                        {/* AVATAR */}
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-black font-semibold text-lg">
                            {getAvatarInitial(localOrder?.customerDetails?.name || "Walk-in Customer")}
                        </div>

                        <div className="flex flex-col">
                            {/* NAME */}
                            <span className="text-[13px] font-semibold text-white">
                {localOrder?.customerDetails?.name || "Walk-in Customer"}
              </span>

                            {/* GUESTS + TABLE + ORDER TYPE */}
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
                                {/* ORDER ID */}
                                <span className="font-mono">{getShortOrderId(localOrder)}</span>

                                <span className="text-gray-600">/</span>
                                <span>
                  {getOrderTypeLabel(
                      localOrder?.orderType?.label ||
                      localOrder?.orderType?.name ||
                      localOrder?.orderType ||
                      "Dine in"
                  )}
                </span>

                                {/* Guests */}
                                {localOrder?.customerDetails?.guests !== undefined && (
                                    <>
                                        <span className="text-gray-600">/</span>
                                        <span>{localOrder.customerDetails.guests} guests</span>
                                    </>
                                )}

                                {/* Table */}
                                <span className="text-gray-600">/</span>
                                <span>Mesa → {localOrder.table ? `#${localOrder.table.tableNo}` : "—"}</span>
                            </div>

                            {/* NCF mini label si ya existe */}
                            {(localOrder?.ncfNumber || localOrder?.fiscal?.requested) && (
                                <div className="mt-1 text-[11px] text-amber-300">
                                    {localOrder?.ncfNumber ? `NCF: ${localOrder.ncfNumber}` : "NCF solicitado"}
                                </div>
                            )}
                            {localOrder?.bills?.split?.enabled && (
                                                            <div className="mt-1 text-[11px] text-slate-300">
                                                                    Cuenta dividida: {localOrder?.bills?.split?.accounts?.length || 0} cuentas
                                                                </div>
                                                        )}
                        </div>
                    </div>

                    {/* STATUS BADGE */}
                    <span
                        className={[
                            "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium",
                            getStatusColorClasses(currentStatus),
                        ].join(" ")}
                    >
            {currentStatus}
          </span>
                </div>

                {/* BODY */}
                <div className="mt-3 flex flex-col gap-2 text-[13px] text-gray-100">
                    <div className="flex items-center justify-between">
            <span className="uppercase tracking-wide text-[12px] text-gray-400 font-semibold">
              Items
            </span>
                        <span className="text-[12px] text-gray-300">{totalItems} items</span>
                    </div>

                    <ul className="mt-1 space-y-1 text-[25px] text-gray-100">
                        {itemsSummary.map((line, idx) => (
                            <li key={idx} className="truncate">
                                • {line}
                            </li>
                        ))}
                    </ul>

                    <div className="mt-3 flex flex-col text-[12px] text-gray-300">
            <span className="uppercase tracking-wide text-[12px] text-gray-400">
              Created at
            </span>
                        <span className="mt-0.5 text-[13px] text-gray-100">{createdAtLabel}</span>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {/* Back */}
                    <button
                        type="button"
                        onClick={handleBack}
                        disabled={!canGoBack}
                        className={`flex-1 min-w-[90px] rounded-md border px-2 py-1.5 text-[11px] font-medium transition ${
                            canGoBack
                                ? "border-gray-500/70 text-gray-200 hover:bg-gray-700/50"
                                : "border-gray-700/50 text-gray-600 cursor-not-allowed"
                        }`}
                    >
                        Back
                    </button>

                    {/* Next */}
                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={!canGoForward}
                        className={`flex-[1.3] min-w-[110px] rounded-md px-3 py-1.5 text-[11px] font-semibold text-black transition ${
                            canGoForward
                                ? "bg-emerald-400 hover:bg-emerald-300"
                                : "bg-emerald-900/40 text-emerald-300 cursor-not-allowed"
                        }`}
                    >
                        {primaryButtonLabel}
                    </button>

                    {/* NUEVO: Comprobante Fiscal */}
                    {fiscalCapable && (
                        <button
                            type="button"
                            onClick={openFiscal}
                            disabled={currentStatus === "Cancelled"}
                            className={`flex-1 min-w-[140px] rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                                currentStatus === "Cancelled"
                                    ? "bg-amber-900/40 text-amber-300 cursor-not-allowed"
                                    : "bg-amber-400 text-black hover:bg-amber-300"
                            }`}
                            title={
                                existingFiscal
                                    ? "Ver/Imprimir comprobante fiscal"
                                    : "Capturar datos para emitir comprobante fiscal"
                            }
                        >
                            {existingFiscal ? "Ver NCF" : "Comprobante Fiscal"}
                        </button>
                    )}
                    {/* NUEVO: Dividir pago */}
                    <button
                        type="button"
                        onClick={openSplit}
                        disabled={currentStatus === "Cancelled"}
                        className={`flex-1 min-w-[130px] rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                            currentStatus === "Cancelled"
                                ? "bg-slate-900/40 text-slate-300 cursor-not-allowed"
                                : "bg-slate-200 text-black hover:bg-slate-100"
                        }`}
                        title="Dividir el pedido en cuentas para cobrar por separado"
                    >
                        Dividir pago
                    </button>


                    {/* Cancel */}
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={currentStatus === "Cancelled"}
                        className={`flex-1 min-w-[110px] rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                            currentStatus === "Cancelled"
                                ? "bg-red-900/40 text-red-400 cursor-not-allowed"
                                : "bg-red-500 text-white hover:bg-red-400"
                        }`}
                    >
                        Cancel Order
                    </button>
                </div>
            </div>

            {/* MODAL FISCAL */}
            {showFiscalModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-2 sm:px-4">
                    <div className="w-full max-w-md rounded-xl bg-[#1f1f1f] border border-white/10 shadow-xl p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-white font-semibold text-lg">Comprobante Fiscal (NCF)</h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Completa los datos del cliente para generar la factura fiscal.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowFiscalModal(false)}
                                className="text-gray-300 hover:text-white text-sm"
                            >
                                X
                            </button>
                        </div>
                        <div className="mt-4 grid gap-3">
                            <div className="relative">
                                <label className="block text-xs text-gray-400 mb-1">RNC o Cédula</label>
                                <input
                                    value={fiscalRnc}
                                    onChange={(e) => setFiscalRnc(e.target.value)}
                                    className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                                    placeholder="Ej: 101234567 o 001-0000000-0"
                                />
                                {dgiiLoading && (
                                    <span className="absolute right-3 top-8 text-[11px] text-gray-400">
                    Buscando DGII...
                  </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Nombre / Razón social</label>
                                <input
                                    value={fiscalName}
                                    onChange={(e) => setFiscalName(e.target.value)}
                                    className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                                    placeholder="Se autocompleta si es RNC"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Tipo NCF</label>
                                <select
                                    value={fiscalType}
                                    onChange={(e) => setFiscalType(e.target.value)}
                                    className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                                >
                                    {allowedNcfTypes.map((t) => (
                                        <option key={t} value={t}>
                                            {t === "B01" ? "B01 - Crédito Fiscal" : "B02 - Consumidor Final"}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-5 flex gap-2">
                            <button
                                onClick={() => setShowFiscalModal(false)}
                                className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveFiscal}
                                disabled={savingFiscal}
                                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-black ${
                                    savingFiscal ? "bg-amber-900/40 text-amber-300 cursor-not-allowed" : "bg-amber-400 hover:bg-amber-300"
                                }`}
                            >
                                {savingFiscal ? "Guardando..." : "Guardar y generar"}
                            </button>
                        </div>

                        <p className="mt-3 text-[11px] text-gray-500">
                            Nota: Si el RNC no existe en DGII, puedes escribir el nombre manualmente.
                        </p>
                    </div>
                </div>
            )}


            {/* INVOICE */}

             {showInvoice && (
                 <Invoice
                     order={invoiceOrderOverride || localOrder}
                     itemsOverride={invoiceItemsOverride}
                     invoiceTitle={invoiceTitle || "Factura"}
                     onClose={() => {
                         setShowInvoice(false);
                         setInvoiceOrderOverride(null);
                         setInvoiceItemsOverride(null);
                         setInvoiceTitle("Factura");
                         setSelectedBillForInvoice(null);
                     }}
                 />
             )}
            {/* Split Bill Modal (Dividir pago) */}
            {showSplitModal && localOrder && (
                <SplitBillModal
                    onClose={() => setShowSplitModal(false)}
                    order={localOrder}
                    onSave={handleSaveSplit}
                />
            )}
            {showSplitInvoices && (
                  <SplitInvoicesModal
                    open={showSplitInvoices}
                    onClose={() => setShowSplitInvoices(false)}
                    splitBills={lastSplitBills}
                    onPrint={openInvoiceForBill}
                  />
                )}
        </>
    );
};

export default OrderCard;
