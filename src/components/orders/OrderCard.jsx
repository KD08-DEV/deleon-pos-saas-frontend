
import React, { useEffect, useMemo, useState, memo } from "react";
import { useSnackbar } from "notistack";
import { formatDateAndTime } from "../../utils";
import { updateOrder } from "../../https";
import useTenant from "../../hooks/useTenant";
import api from "../../lib/api";
import Invoice from "../invoice/Invoice";
import SplitBillModal from "./SplitBillModal";
import SplitInvoicesModal from "./SplitInvoicesModal";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, Circle, ArrowLeft, ArrowRight, Receipt, CreditCard, Clock, User, Hash, MoreVertical, Table2, Users, Package, Calendar } from "lucide-react";



const STATUS_FLOW = ["En Progreso", "Listo", "Completado"];


const getStatusConfig = (status) => {
    const configs = {
        "Listo": {
            icon: CheckCircle2,
            bg: "from-green-500/20 to-emerald-500/20",
            text: "text-green-400",
            border: "border-green-500/30",
        },
        "Completado": {
            icon: CheckCircle2,
            bg: "from-blue-500/20 to-cyan-500/20",
            text: "text-blue-400",
            border: "border-blue-500/30",
        },
        "Cancelado": {
            icon: X,
            bg: "from-red-500/20 to-rose-500/20",
            text: "text-red-400",
            border: "border-red-500/30",
        },
    };
    return configs[status] || {
        icon: Clock,
        bg: "from-yellow-500/20 to-amber-500/20",
        text: "text-yellow-400",
        border: "border-yellow-500/30",
    };
};

const getAvatarInitial = (name) => {
    if (!name) return "W";
    return name.trim()[0].toUpperCase();
};
const fetchFreshOrder = async (orderId) => {
    if (!orderId) return null;
    const res = await api.get(`/api/order/${orderId}`);
    return (
        res?.data?.data?.order ??
        res?.data?.order ??
        res?.data?.data ??
        res?.data
    );
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
const unwrapOrder = (res) => res?.data?.data ?? res?.data?.order ?? res?.data;


const OrderCard = ({ order, onStatusChanged, onPrint }) => {
    const { enqueueSnackbar } = useSnackbar();

    // mantenemos copia local para poder refrescar la tarjeta cuando emitimos NCF
    const [localOrder, setLocalOrder] = useState(order);
    useEffect(() => setLocalOrder(order), [order]);
    const [showSplitInvoices, setShowSplitInvoices] = useState(false);
    const [invoiceTitle, setInvoiceTitle] = useState(null);
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [lastSplitBills, setLastSplitBills] = useState([]);
    const [invoiceOrderOverride, setInvoiceOrderOverride] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [invoiceOrderSnapshot, setInvoiceOrderSnapshot] = useState(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);



    const openSplit = () => {
        setShowOrderDetails(false);
        if (currentStatus === "Cancelado") return;
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

    const currentStatus = localOrder?.orderStatus || "En Progreso";

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
    const existingFiscal = Boolean(
        localOrder?.fiscal?.requested ||
        localOrder?.ncfNumber ||
        localOrder?.fiscal?.ncfNumber
    );
    const isFiscalOrder = Boolean(
        localOrder?.fiscal?.requested ||
        localOrder?.ncfNumber ||
        localOrder?.fiscal?.ncfNumber
    );

    const canShowNormalInvoiceBtn =
        !isFiscalOrder && String(localOrder?.orderStatus || "") === "Completado";
    // ✅ Factura normal (NO fiscal): se muestra solo si NO hay NCF solicitado/emitido
    const hasNormalInvoice = Boolean(localOrder?.invoiceUrl || localOrder?.invoicePath) && !existingFiscal;

    const openNormalInvoice = async () => {
        try {
            setShowOrderDetails(false);

            // refrescamos por si el invoiceUrl se generó luego de completar
            const fresh = await fetchFreshOrder(localOrder?._id);
            if (fresh?._id) setLocalOrder(fresh);

            const url = fresh?.invoiceUrl || localOrder?.invoiceUrl;

            if (!url) {
                enqueueSnackbar("Esta orden no tiene factura disponible.", { variant: "warning" });
                return;
            }

            window.open(url, "_blank", "noopener,noreferrer");
        } catch (e) {
            console.error("[OrderCard] openNormalInvoice error:", e);
            enqueueSnackbar("No se pudo abrir la factura.", { variant: "error" });
        }
    };

    const openOrGenerateInvoice = async () => {
        try {
            // 1) Si ya existe, abre
            const existing = localOrder?.invoiceUrl;
            if (existing && String(existing).trim()) {
                window.open(existing, "_blank", "noopener,noreferrer");
                return;
            }

            // 2) Si no existe, generarla on-demand
            // tu invoiceController usa createInvoice con { orderId } y retorna invoiceUrl:contentReference[oaicite:4]{index=4}
            const res = await api.post("/api/invoice", { orderId: localOrder?._id });

            const url = res?.data?.invoiceUrl || res?.data?.url;
            if (!url) {
                enqueueSnackbar("No se pudo generar la factura.", { variant: "error" });
                return;
            }

            // refresca estado local (opcional)
            setLocalOrder((prev) => ({ ...(prev || {}), invoiceUrl: url }));

            window.open(url, "_blank", "noopener,noreferrer");
        } catch (e) {
            console.error("[openOrGenerateInvoice]", e);
            enqueueSnackbar("Error abriendo/generando la factura.", { variant: "error" });
        }
    };

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

        const preRnc =
            localOrder?.customerDetails?.rncCedula ||
            localOrder?.customerDetails?.rnc ||
            "";
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

    const handleStatusUpdate = async (nextStatus) => {
        try {
            setIsUpdating(true);

            const res = await updateOrder(localOrder._id, {
                orderStatus: nextStatus,
                bills: localOrder.bills || [],
                items: localOrder.items || [],
            });

            const updated = unwrapOrder(res);

            // ✅ IMPORTANTÍSIMO: guarda la orden COMPLETA (con fiscal, invoiceUrl, etc.)
            setLocalOrder(updated);
            onStatusChanged?.(updated);

        } catch (err) {
            console.error("Error updating status:", err);
        } finally {
            setIsUpdating(false);
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
        setShowOrderDetails(false);
        if (currentStatus === "Cancelado") return;
        handleStatusUpdate("Cancelado");
    };

    const handleNextFromModal = () => {
        setShowOrderDetails(false);
        handleNext();
    };

    const handleBackFromModal = () => {
        setShowOrderDetails(false);
        handleBack();
    };

    const canGoBack =
        STATUS_FLOW.includes(currentStatus) && STATUS_FLOW.indexOf(currentStatus) > 0;

    const canGoForward =
        STATUS_FLOW.includes(currentStatus) &&
        STATUS_FLOW.indexOf(currentStatus) < STATUS_FLOW.length - 1;

    const primaryButtonLabel =
        currentStatus === "En Progreso"
            ? "Marcar como Listo"
            : currentStatus === "Listo"
                ? "Marcar como Completo"
                : "Siguiente";

    const openFiscal = async () => {
        setShowOrderDetails(false);
        if (currentStatus === "Cancelado") {
            enqueueSnackbar("No puedes emitir NCF en una orden cancelada.", { variant: "warning" });
            return;
        }

        if (existingFiscal) {
            try {
                const fresh = await fetchFreshOrder(localOrder?._id);
                if (fresh?._id) {
                    setLocalOrder(fresh);
                    setInvoiceOrderSnapshot(fresh); // <- CLAVE
                }
            } catch (e) {
                console.log("[OrderCard] No pude refrescar order:", e?.message);
            }
            setInvoiceOrderOverride(null);
            setInvoiceItemsOverride(null);
            setSelectedBillForInvoice(null);
            setInvoiceTitle(null);
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
                    rncCedula: rncTrim,
                },

                fiscal: {
                    requested: true,
                    ncfType: ncfTypeToSend,
                },
            };

            const res = await updateOrder(localOrder._id, payload);

            const updated = unwrapOrder(res);
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

    const statusConfig = getStatusConfig(currentStatus);
    const StatusIcon = statusConfig.icon;

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#1a1a1a] dark:from-[#1a1a1a] dark:via-[#1f1f1f] dark:to-[#1a1a1a] from-white via-gray-50 to-white shadow-lg border border-[#2a2a2a]/50 dark:border-[#2a2a2a]/50 border-gray-200/50 px-4 py-4 sm:px-5 sm:py-5 h-full min-h-[280px] hover:border-[#3a3a3a] dark:hover:border-[#3a3a3a] hover:border-gray-300 transition-all duration-300 group"
            >
                {/* HEADER */}
                <div className="flex items-start gap-3 justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* AVATAR mejorado */}
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-black font-bold text-lg shadow-lg shrink-0"
                        >
                            {getAvatarInitial(localOrder?.customerDetails?.name || "Cliente")}
                        </motion.div>

                        <div className="flex flex-col min-w-0 flex-1">
                            {/* NAME */}
                            <div className="flex items-center gap-2 mb-1">
                                <User className="text-blue-400 w-3.5 h-3.5 shrink-0" />
                                <span className="text-sm font-semibold text-[#f5f5f5] truncate">
                                    {localOrder?.customerDetails?.name || "Cliente"}
                                </span>
                            </div>

                            {/* ORDER INFO - mejorado */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#ababab]">
                                <div className="flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    <span className="font-mono">{getShortOrderId(localOrder)}</span>
                                </div>
                                
                                {localOrder?.table && (
                                    <>
                                        <span className="text-[#666]">•</span>
                                        <span>Mesa #{localOrder.table.tableNo}</span>
                                    </>
                                )}
                                
                                {localOrder?.customerDetails?.guests !== undefined && (
                                    <>
                                        <span className="text-[#666]">•</span>
                                        <span>{localOrder.customerDetails.guests} {localOrder.customerDetails.guests === 1 ? 'invitado' : 'invitados'}</span>
                                    </>
                                )}
                            </div>

                            {/* Badges informativos */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {(localOrder?.ncfNumber || localOrder?.fiscal?.requested) && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-medium">
                                        <Receipt className="w-3 h-3" />
                                        {localOrder?.ncfNumber ? `NCF: ${localOrder.ncfNumber}` : "NCF solicitado"}
                                    </span>
                                )}
                                {localOrder?.bills?.split?.enabled && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-medium">
                                        <CreditCard className="w-3 h-3" />
                                        {localOrder?.bills?.split?.accounts?.length || 0} cuentas
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* STATUS BADGE mejorado */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold bg-gradient-to-r ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} shrink-0 shadow-lg`}
                    >
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{currentStatus}</span>
                    </motion.div>
                </div>

                {/* BODY */}
                <div className="flex flex-col gap-3 flex-1">
                    {/* Items Section */}
                    <div className="bg-gradient-to-r from-[#1f1f1f] to-[#252525] rounded-lg p-3 border border-[#2a2a2a]/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="uppercase tracking-wide text-xs text-[#ababab] font-semibold">
                                Items
                            </span>
                            <span className="text-xs text-[#f5f5f5] font-semibold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                                {totalItems} {totalItems === 1 ? 'item' : 'items'}
                            </span>
                        </div>

                        <div className="space-y-1.5 max-h-24 overflow-y-auto">
                            {itemsSummary.slice(0, 3).map((line, idx) => (
                                <div key={idx} className="text-sm text-[#f5f5f5] truncate flex items-center gap-2">
                                    <span className="text-blue-400 shrink-0">•</span>
                                    <span className="truncate">{line}</span>
                                </div>
                            ))}
                            {itemsSummary.length > 3 && (
                                <div className="text-xs text-[#ababab] italic">
                                    +{itemsSummary.length - 3} más...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Created date */}
                    <div className="flex items-center gap-2 text-xs text-[#ababab]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{createdAtLabel}</span>
                    </div>
                </div>

                {/* ACTIONS mejoradas */}
                <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-[#2a2a2a]/50">
                    {/* Back */}
                    <motion.button
                        type="button"
                        onClick={handleBack}
                        disabled={!canGoBack}
                        whileHover={canGoBack ? { scale: 1.05 } : {}}
                        whileTap={canGoBack ? { scale: 0.95 } : {}}
                        className={`flex items-center justify-center gap-1.5 flex-1 min-w-[80px] rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                            canGoBack
                                ? "border-[#3a3a3a] text-[#f5f5f5] bg-gradient-to-r from-[#1f1f1f] to-[#252525] hover:border-blue-500/50 hover:text-blue-400"
                                : "border-[#2a2a2a] text-[#666] bg-[#1a1a1a] cursor-not-allowed opacity-50"
                        }`}
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Atras</span>
                    </motion.button>

                    {/* Next */}
                    <motion.button
                        type="button"
                        onClick={handleNext}
                        disabled={!canGoForward}
                        whileHover={canGoForward ? { scale: 1.05 } : {}}
                        whileTap={canGoForward ? { scale: 0.95 } : {}}
                        className={`flex items-center justify-center gap-1.5 flex-[1.3] min-w-[120px] rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                            canGoForward
                                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/30"
                                : "bg-emerald-900/40 text-emerald-300 cursor-not-allowed opacity-50"
                        }`}
                    >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>{primaryButtonLabel}</span>
                    </motion.button>

                    {/* Botón de Ver Detalles/Opciones */}
                    <motion.button
                        type="button"
                        onClick={() => setShowOrderDetails(true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center justify-center gap-1.5 flex-1 min-w-[100px] rounded-lg px-3 py-2 text-xs font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200"
                    >
                        <MoreVertical className="w-3.5 h-3.5" />
                        <span>Opciones</span>
                    </motion.button>
                </div>
            </motion.div>

            {/* MODAL DE DETALLES DE ORDEN */}
            <AnimatePresence>
                {showOrderDetails && (
                    <>
                        {/* Backdrop con blur */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowOrderDetails(false)}
                            className="fixed inset-0 z-50 backdrop-blur-md bg-black/60"
                        />
                        
                        {/* Modal centrado */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#1a1a1a] dark:from-[#1a1a1a] dark:via-[#1f1f1f] dark:to-[#1a1a1a] from-white via-gray-50 to-white rounded-2xl border border-[#2a2a2a]/50 dark:border-[#2a2a2a]/50 border-gray-200/50 shadow-2xl pointer-events-auto scrollbar-thin scrollbar-thumb-[#3a3a3a] scrollbar-track-transparent">
                                {/* Header del Modal */}
                                <div className="sticky top-0 bg-gradient-to-r from-[#1f1f1f] to-[#252525] dark:from-[#1f1f1f] dark:to-[#252525] from-gray-100 to-gray-200 border-b border-[#2a2a2a]/50 dark:border-[#2a2a2a]/50 border-gray-300/50 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
                                    <div className="flex items-center gap-3">
                                        <motion.div
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-black font-bold text-lg shadow-lg shrink-0"
                                        >
                                            {getAvatarInitial(localOrder?.customerDetails?.name || "Cliente")}
                                        </motion.div>
                                        <div>
                                            <h2 className="text-lg font-bold text-[#f5f5f5] dark:text-[#f5f5f5] text-gray-900">
                                                Detalles de la Orden
                                            </h2>
                                            <p className="text-sm text-[#ababab] dark:text-[#ababab] text-gray-600">
                                                {getShortOrderId(localOrder)}
                                            </p>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setShowOrderDetails(false)}
                                        className="p-2 rounded-lg bg-[#2a2a2a]/50 dark:bg-[#2a2a2a]/50 bg-gray-200/50 text-[#ababab] dark:text-[#ababab] text-gray-600 hover:bg-red-500/20 hover:text-red-400 transition-colors shrink-0"
                                    >
                                        <X className="w-5 h-5" />
                                    </motion.button>
                                </div>

                                {/* Contenido del Modal */}
                                <div className="p-6 space-y-6">
                                    {/* Información del Cliente */}
                                    <div className="bg-gradient-to-r from-[#1f1f1f] to-[#252525] dark:from-[#1f1f1f] dark:to-[#252525] from-gray-100 to-gray-200 rounded-xl p-4 border border-[#2a2a2a]/50 dark:border-[#2a2a2a]/50 border-gray-300/50">
                                        <h3 className="text-sm font-semibold text-[#ababab] dark:text-[#ababab] text-gray-600 mb-3 uppercase tracking-wide">Cliente</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-blue-400 dark:text-blue-400 text-blue-600" />
                                                <span className="text-sm font-medium text-[#f5f5f5] dark:text-[#f5f5f5] text-gray-900">
                                                    {localOrder?.customerDetails?.name || "Cliente"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {localOrder?.table && (
                                                    <>
                                                        <Table2 className="w-4 h-4 text-blue-400 dark:text-blue-400 text-blue-600" />
                                                        <span className="text-xs text-[#ababab] dark:text-[#ababab] text-gray-600">
                                                            Mesa #{localOrder.table.tableNo}
                                                        </span>
                                                    </>
                                                )}
                                                {localOrder?.customerDetails?.guests !== undefined && (
                                                    <>
                                                        <Users className="w-4 h-4 text-blue-400 dark:text-blue-400 text-blue-600 ml-2" />
                                                        <span className="text-xs text-[#ababab] dark:text-[#ababab] text-gray-600">
                                                            {localOrder.customerDetails.guests} {localOrder.customerDetails.guests === 1 ? 'invitado' : 'invitados'}
                                                        </span>
                                                    </>
                                                )}
                                                <div className="flex items-center gap-1 ml-2">
                                                    <Hash className="w-4 h-4 text-blue-400 dark:text-blue-400 text-blue-600" />
                                                    <span className="text-xs font-mono text-[#ababab] dark:text-[#ababab] text-gray-600">
                                                        {getShortOrderId(localOrder)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Estado */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-[#ababab] dark:text-[#ababab] text-gray-600 uppercase tracking-wide">Estado</span>
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold bg-gradient-to-r ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} shadow-lg`}
                                        >
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            <span>{currentStatus}</span>
                                        </motion.div>
                                    </div>

                                    {/* Items */}
                                    <div className="bg-gradient-to-r from-[#1f1f1f] to-[#252525] dark:from-[#1f1f1f] dark:to-[#252525] from-gray-100 to-gray-200 rounded-xl p-4 border border-[#2a2a2a]/50 dark:border-[#2a2a2a]/50 border-gray-300/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-blue-400 dark:text-blue-400 text-blue-600" />
                                                <h3 className="text-sm font-semibold text-[#ababab] dark:text-[#ababab] text-gray-600 uppercase tracking-wide">Items</h3>
                                            </div>
                                            <span className="text-xs font-semibold bg-blue-500/20 text-blue-400 dark:text-blue-400 text-blue-600 px-2 py-1 rounded border border-blue-500/30">
                                                {totalItems} {totalItems === 1 ? 'item' : 'items'}
                                            </span>
                                        </div>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {itemsSummary.map((line, idx) => (
                                                <div key={idx} className="text-sm text-[#f5f5f5] dark:text-[#f5f5f5] text-gray-900 flex items-center gap-2">
                                                    <span className="text-blue-400 dark:text-blue-400 text-blue-600 shrink-0">•</span>
                                                    <span>{line}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Información Adicional */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-gradient-to-r from-[#1f1f1f] to-[#252525] dark:from-[#1f1f1f] dark:to-[#252525] from-gray-100 to-gray-200 rounded-xl p-4 border border-[#2a2a2a]/50 dark:border-[#2a2a2a]/50 border-gray-300/50">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Calendar className="w-4 h-4 text-blue-400 dark:text-blue-400 text-blue-600" />
                                                <span className="text-xs font-semibold text-[#ababab] dark:text-[#ababab] text-gray-600 uppercase tracking-wide">Creado en</span>
                                            </div>
                                            <p className="text-sm text-[#f5f5f5] dark:text-[#f5f5f5] text-gray-900">{createdAtLabel}</p>
                                        </div>
                                        <div className="bg-gradient-to-r from-[#1f1f1f] to-[#252525] dark:from-[#1f1f1f] dark:to-[#252525] from-gray-100 to-gray-200 rounded-xl p-4 border border-[#2a2a2a]/50 dark:border-[#2a2a2a]/50 border-gray-300/50">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Receipt className="w-4 h-4 text-blue-400 dark:text-blue-400 text-blue-600" />
                                                <span className="text-xs font-semibold text-[#ababab] dark:text-[#ababab] text-gray-600 uppercase tracking-wide">Tipo</span>
                                            </div>
                                            <p className="text-sm text-[#f5f5f5] dark:text-[#f5f5f5] text-gray-900">
                                                {getOrderTypeLabel(
                                                    localOrder?.orderType?.label ||
                                                    localOrder?.orderType?.name ||
                                                    localOrder?.orderType ||
                                                    "Restaurante"
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Badges informativos */}
                                    {(localOrder?.ncfNumber || localOrder?.fiscal?.requested || localOrder?.bills?.split?.enabled) && (
                                        <div className="flex flex-wrap gap-2">
                                            {(localOrder?.ncfNumber || localOrder?.fiscal?.requested) && (
                                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium">
                                                    <Receipt className="w-3.5 h-3.5" />
                                                    {localOrder?.ncfNumber ? `NCF: ${localOrder.ncfNumber}` : "NCF solicitado"}
                                                </span>
                                            )}
                                            {localOrder?.bills?.split?.enabled && (
                                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium">
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    Cuenta dividida: {localOrder?.bills?.split?.accounts?.length || 0} cuentas
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Acciones */}
                                    <div className="pt-4 border-t border-[#2a2a2a]/50 dark:border-[#2a2a2a]/50 border-gray-300/50 space-y-3">
                                        <h3 className="text-sm font-semibold text-[#ababab] dark:text-[#ababab] text-gray-600 uppercase tracking-wide mb-3">Acciones</h3>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Atrás */}
                                            <motion.button
                                                type="button"
                                                onClick={handleBackFromModal}
                                                disabled={!canGoBack}
                                                whileHover={canGoBack ? { scale: 1.02 } : {}}
                                                whileTap={canGoBack ? { scale: 0.98 } : {}}
                                                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                                                    canGoBack
                                                        ? "border-[#3a3a3a] dark:border-[#3a3a3a] border-gray-300 text-[#f5f5f5] dark:text-[#f5f5f5] text-gray-900 bg-gradient-to-r from-[#1f1f1f] to-[#252525] dark:from-[#1f1f1f] dark:to-[#252525] from-gray-100 to-gray-200 hover:border-blue-500/50 hover:text-blue-400"
                                                        : "border-[#2a2a2a] dark:border-[#2a2a2a] border-gray-200 text-[#666] dark:text-[#666] text-gray-400 bg-[#1a1a1a] dark:bg-[#1a1a1a] bg-gray-100 cursor-not-allowed opacity-50"
                                                }`}
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Atrás</span>
                                            </motion.button>

                                            {/* Siguiente */}
                                            <motion.button
                                                type="button"
                                                onClick={handleNextFromModal}
                                                disabled={!canGoForward}
                                                whileHover={canGoForward ? { scale: 1.02 } : {}}
                                                whileTap={canGoForward ? { scale: 0.98 } : {}}
                                                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                                                    canGoForward
                                                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/30"
                                                        : "bg-emerald-900/40 text-emerald-300 cursor-not-allowed opacity-50"
                                                }`}
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                                <span>{primaryButtonLabel}</span>
                                            </motion.button>
                                        </div>

                                        <div className={`grid grid-cols-1 sm:grid-cols-${hasNormalInvoice ? "3" : "2"} gap-3`}>
                                            {/* ✅ Ver factura normal (solo si NO es fiscal) */}

                                                <motion.button
                                                    type="button"
                                                    onClick={openOrGenerateInvoice}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-slate-500/20 to-slate-700/20 text-slate-200 border border-slate-500/30 hover:bg-slate-500/30"
                                                >
                                                    <Receipt className="w-4 h-4" />
                                                    <span>{localOrder?.invoiceUrl ? "Ver factura" : "Generar factura"}</span>
                                                </motion.button>


                                                <motion.button
                                                    type="button"
                                                    onClick={openNormalInvoice}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-slate-500/20 to-slate-700/20 text-slate-200 border border-slate-500/30 hover:bg-slate-500/30"
                                                >
                                                    <Receipt className="w-4 h-4" />
                                                    <span>Ver factura</span>
                                                </motion.button>


                                            {/* Comprobante Fiscal */}
                                            {fiscalCapable && (
                                                <motion.button
                                                    type="button"
                                                    onClick={openFiscal}
                                                    disabled={currentStatus === "Cancelado"}
                                                    whileHover={currentStatus !== "Cancelado" ? { scale: 1.02 } : {}}
                                                    whileTap={currentStatus !== "Cancelado" ? { scale: 0.98 } : {}}
                                                    className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                                                        currentStatus === "Cancelado"
                                                            ? "bg-amber-900/40 text-amber-300 cursor-not-allowed opacity-50"
                                                            : "bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:shadow-lg hover:shadow-yellow-500/30"
                                                    }`}
                                                >
                                                    <Receipt className="w-4 h-4" />
                                                    <span>{existingFiscal ? "Ver NCF" : "Comprobante Fiscal"}</span>
                                                </motion.button>
                                            )}

                                            {/* Dividir pago */}
                                            <motion.button
                                                type="button"
                                                onClick={openSplit}
                                                disabled={currentStatus === "Cancelado"}
                                                whileHover={currentStatus !== "Cancelado" ? { scale: 1.02 } : {}}
                                                whileTap={currentStatus !== "Cancelado" ? { scale: 0.98 } : {}}
                                                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                                                    currentStatus === "Cancelado"
                                                        ? "bg-slate-900/40 text-slate-300 cursor-not-allowed opacity-50"
                                                        : "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                                                }`}
                                            >
                                                <CreditCard className="w-4 h-4" />
                                                <span>Dividir Pago</span>
                                            </motion.button>
                                        </div>

                                        {/* Cancelar */}
                                        <motion.button
                                            type="button"
                                            onClick={handleCancel}
                                            disabled={currentStatus === "Cancelado"}
                                            whileHover={currentStatus !== "Cancelado" ? { scale: 1.02 } : {}}
                                            whileTap={currentStatus !== "Cancelado" ? { scale: 0.98 } : {}}
                                            className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                                                currentStatus === "Cancelado"
                                                    ? "bg-red-900/40 text-red-400 cursor-not-allowed opacity-50"
                                                    : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg hover:shadow-red-500/30"
                                            }`}
                                        >
                                            <X className="w-4 h-4" />
                                            <span>Cancelar Orden</span>
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

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
                     order={invoiceOrderOverride || invoiceOrderSnapshot || localOrder}
                     itemsOverride={invoiceItemsOverride}
                     onClose={() => {
                         setShowInvoice(false);
                         setInvoiceOrderSnapshot(null);
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

export default memo(OrderCard);
