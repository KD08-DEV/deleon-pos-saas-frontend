import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

import { getTotalPrice, removeAllItems } from "../../redux/slices/cartSlice";
import { clearDraftContext } from "../../redux/slices/customerSlice";
import { updateOrder, addOrder, updateTable } from "../../https";
import Invoice from "../invoice/Invoice";
import Ticket from "../ticket/Ticket";

import useTenant from "../../hooks/useTenant";
import api from "../../lib/api";

import {
    buildDisplayItems,
    publishCustomerDisplayPatch,
} from "../../lib/customerDisplaySync";


const num = (v) => {
    if (v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
};
const isLikelyRncOrCedula = (value) => {
    const cleaned = String(value || "").replace(/[^\d]/g, "");
    return cleaned.length === 9 || cleaned.length === 11; // RNC (9) o Cédula (11)
};
function Switch({ checked, onChange, disabled }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={[
                "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                checked ? "bg-[#f6b100]" : "bg-gray-700",
            ].join(" ")}
            aria-pressed={checked}
        >
            <span
                className={[
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200",
                    checked ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
            />
        </button>
    );
}
const normalizeText = (v) => String(v || "").trim().toLowerCase();

const stableArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
        .map((x) => {
            if (typeof x === "string") return x.trim().toLowerCase();
            return (
                x?.name ||
                x?.label ||
                x?.title ||
                x?.value ||
                JSON.stringify(x)
            )
                .trim?.()
                ?.toLowerCase?.() ?? String(x).trim().toLowerCase();
        })
        .sort();
};

const buildComparableKey = (item) => {
    const productId =
        item?.dishId ??
        item?.dish ??
        item?.productId ??
        item?.menuItemId ??
        item?.itemId ??
        item?.id ??
        "";

    const name =
        item?.name ??
        item?.dishName ??
        item?.itemName ??
        item?.dishInfo?.name ??
        "";

    const qtyType = item?.qtyType || "unit";

    // MUY IMPORTANTE:
    // Para productos unitarios NO tomes weightUnit en cuenta,
    // aunque el item viejo venga contaminado con "lb".
    const normalizedWeightUnit =
        qtyType === "weight"
            ? (item?.weightUnit || "lb")
            : "";

    const note =
        item?.note ||
        item?.comment ||
        item?.specialInstructions ||
        "";

    const addons = stableArray(
        item?.addons ||
        item?.addOns ||
        item?.extras ||
        item?.extraIngredients ||
        item?.selectedExtras
    );

    const modifiers = stableArray(
        item?.modifiers ||
        item?.selectedOptions ||
        item?.options
    );

    return JSON.stringify({
        productRef: productId ? String(productId) : `name:${normalizeText(name)}`,
        name: normalizeText(name),
        qtyType,
        weightUnit: normalizedWeightUnit,
        note: normalizeText(note),
        addons,
        modifiers,
    });
};

const getComparableQty = (item) => {
    const q = Number(item?.quantity ?? item?.qty ?? 1);
    return Number.isFinite(q) ? q : 1;
};

const normalizeForPrint = (item, forcedQty = null) => {
    const quantity = forcedQty ?? getComparableQty(item);
    return {
        ...item,
        quantity,
        qty: quantity,
    };
};

const getOnlyNewItemsForPrint = (prevItems = [], currentItems = []) => {
    const prevMap = new Map();
    const currentMap = new Map();
    const sampleCurrentItemMap = new Map();

    for (const item of prevItems || []) {
        const key = buildComparableKey(item);
        const qty = getComparableQty(item);
        prevMap.set(key, (prevMap.get(key) || 0) + qty);
    }

    for (const item of currentItems || []) {
        const key = buildComparableKey(item);
        const qty = getComparableQty(item);

        currentMap.set(key, (currentMap.get(key) || 0) + qty);

        if (!sampleCurrentItemMap.has(key)) {
            sampleCurrentItemMap.set(key, item);
        }
    }

    const result = [];

    for (const [key, currentQty] of currentMap.entries()) {
        const prevQty = prevMap.get(key) || 0;
        const diff = currentQty - prevQty;

        if (diff > 0) {
            const sampleItem = sampleCurrentItemMap.get(key);
            result.push(normalizeForPrint(sampleItem, diff));
        }
    }

    return result;
};
const inferNcfTypeFromNumber = (value) => {
    const ncf = String(value || "").trim().toUpperCase();
    if (ncf.startsWith("B01")) return "B01";
    if (ncf.startsWith("B02")) return "B02";
    return null;
};
const REGISTER_STORAGE_KEY = "deleonsoft_active_register_id";

const getActiveRegisterId = () => {
    try {
        return String(localStorage.getItem(REGISTER_STORAGE_KEY) || "MAIN")
            .trim()
            .toUpperCase();
    } catch {
        return "MAIN";
    }
};


const getTableIdFromAny = (value) => {
    if (!value) return null;

    if (typeof value === "string") return value;

    return (
        value?._id ||
        value?.id ||
        value?.tableId ||
        null
    );
};

const Bill = ({ orderId, order, setIsOrderModalOpen }) => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    useEffect(() => {
        if (!orderId || !order?._id) return;

        const status = String(order?.orderStatus || "").trim();

        // IMPORTANTE:
        // No considerar "Pagado" ni "invoiceNumber" como cerrado.
        // En tu flujo, Facturar puede generar factura y pago,
        // pero la mesa debe seguir ocupada hasta presionar "Desocupar mesa".
        const isReallyClosedOrder =
            status === "Cancelado";

        if (!isReallyClosedOrder) return;

        dispatch(removeAllItems());
        dispatch(clearDraftContext());

        enqueueSnackbar("La orden ya estaba cerrada. Se limpió el carrito para iniciar una nueva venta.", {
            variant: "info",
        });

        navigate("/menu", { replace: true });
    }, [
        orderId,
        order?._id,
        order?.orderStatus,
        dispatch,
        navigate,
    ]);
    const draft = useSelector((state) => state.customer);
    const selectedCustomerId =
        order?.customerId?._id ||
        order?.customerId ||
        draft?.customerId ||
        null;
    const draftTable = draft?.table || null;
    const draftOrderSource = draft?.orderSource || "DINE_IN";
    const effectiveOrderSource = String(
        order?.orderSource ||
        draftOrderSource ||
        draft?.virtualType ||
        ""
    ).toUpperCase();

    const isQuickChannel =
        effectiveOrderSource === "QUICK" ||
        effectiveOrderSource === "CANAL_RAPIDO" ||
        effectiveOrderSource === "RAPIDO";

    const cart = useSelector((state) => state.cart);
    const subtotalFromStore = useSelector(getTotalPrice);
    const orderSource = String(order?.orderSource || "").toUpperCase();

    const isAppDelivery = orderSource === "PEDIDOSYA" || orderSource === "UBEREATS";
    const isInternalDelivery = orderSource === "DELIVERY";

    useEffect(() => {
        if (!isAppDelivery) return;

        // Fuerza el método de pago por canal
        if (orderSource === "PEDIDOSYA") setPaymentMethod("Pedido Ya");
        if (orderSource === "UBEREATS") setPaymentMethod("Uber Eats");
    }, [isAppDelivery, orderSource]);

    const commissionRate = num(order?.commissionRate);
    const commissionAmountFromServer = num(order?.commissionAmount);
    const netTotalFromServer = num(order?.netTotal);

// Comisión calculada en front como fallback (SIN TIP)
// Base para comisión: base + tax (sin propina)


    const commissionPct = commissionRate ? Math.round(commissionRate * 100) : 0;


    // Total del carrito (tu helper)

    const subtotal = useMemo(() => num(subtotalFromStore), [subtotalFromStore]);

    // Items fallback
    const itemsArray = useMemo(() => {
        const raw = Array.isArray(cart) ? cart : cart?.items;
        return Array.isArray(raw) ? raw : [];
    }, [cart]);

    const itemsCount = useMemo(() => {
        return itemsArray.reduce((acc, it) => {
            const isWeight = it?.qtyType === "weight";
            return acc + (isWeight ? 1 : num(it?.quantity ?? 1));
        }, 0);
    }, [itemsArray]);


    // Tenant Info
    const { tenantInfo } = useTenant();
    const tenantFeatures = tenantInfo?.features || {};
    const { data: usageSummary } = useQuery({
        queryKey: ["checkout-plan-usage"],
        queryFn: async () => {
            const res = await api.get("/api/admin/usage");
            return res.data?.data || res.data;
        },
        staleTime: 60_000,
    });

    const rawPlan = String(
        usageSummary?.plan ||
        tenantInfo?.plan ||
        tenantInfo?.subscriptionPlan ||
        tenantInfo?.subscription?.plan ||
        ""
    )
        .trim()
        .toLowerCase();

    const canUseCreditSales = rawPlan ? rawPlan !== "emprendedor" : false;

    const discountEnabledByTenant = tenantFeatures?.discount?.enabled === true;
    const taxEnabledByTenant = tenantFeatures?.tax?.enabled === true;
    const tipEnabledByTenant = tenantFeatures?.tip?.enabled === true;
    const fiscalEnabledByTenant = !!tenantInfo?.fiscal?.enabled;
    const chargeMode = tenantInfo?.features?.checkout?.chargeMode || "AT_COMPLETE";

    useEffect(() => {

    }, [tenantInfo, tipEnabledByTenant, discountEnabledByTenant, taxEnabledByTenant]);

    useEffect(() => {

    }, [tenantInfo]);
    // Fiscal capability (nuevo modelo)
    useEffect(() => {

        if (!tipEnabledByTenant) {
            setTipEnabled(false);
            setTipPercent(0);
        }
    }, [tipEnabledByTenant]);

    const fiscalEnabled = !!tenantInfo?.fiscal?.enabled;

    const fiscalCapable = useMemo(() => {
        if (!fiscalEnabledByTenant) return false;
        if (!fiscalEnabled) return false;

        const b01 = !!tenantInfo?.fiscal?.ncfConfig?.B01?.active;
        const b02 = !!tenantInfo?.fiscal?.ncfConfig?.B02?.active;

        return b01 || b02;
    }, [tenantInfo, fiscalEnabled, fiscalEnabledByTenant]);

    const allowedNcfTypes = useMemo(() => {
        const list = [
            tenantInfo?.fiscal?.ncfConfig?.B01?.active ? "B01" : null,
            tenantInfo?.fiscal?.ncfConfig?.B02?.active ? "B02" : null,
        ].filter(Boolean);
        return list;
    }, [tenantInfo]);

    const [printTarget, setPrintTarget] = useState("invoice"); // "invoice" | "ticket" | "update"
    const [submitAction, setSubmitAction] = useState("invoice");
    const [showTicket, setShowTicket] = useState(false);
    const [showProductionFallback, setShowProductionFallback] = useState(false);
    const [productionFallbackTickets, setProductionFallbackTickets] = useState([]);
    const itemsToPrintRef = useRef([]);

    const committedItemsRef = useRef(Array.isArray(order?.items) ? order.items : []);
    useEffect(() => {
        committedItemsRef.current = Array.isArray(order?.items) ? order.items : [];
    }, [order?._id, order?.items]);

    const submitActionRef = useRef("invoice");
    const printTargetRef = useRef("invoice");
    // UI states
    const [paymentMethod, setPaymentMethod] = useState("Efectivo");
    useEffect(() => {
        if (!canUseCreditSales && paymentMethod === "Credito") {
            setPaymentMethod("Efectivo");
        }
    }, [canUseCreditSales, paymentMethod]);
    const [cashReceived, setCashReceived] = useState("");
    useEffect(() => {
        if (isAppDelivery) return; // PedidoYa/UberEats se fuerzan
        if (!order?._id) return;
        setPaymentMethod(order?.paymentMethod || "Efectivo");
    }, [order?._id]);
    useEffect(() => {
        if (paymentMethod !== "Efectivo") {
            setCashReceived("");
        }
    }, [paymentMethod]);

    const [discountType, setDiscountType] = useState("flat"); // flat | percent
    const [discountValue, setDiscountValue] = useState(0);
    const [deliveryFee, setDeliveryFee] = useState(num(order?.bills?.deliveryFee ?? 0));
    useEffect(() => {
        setDeliveryFee(num(order?.bills?.deliveryFee ?? 0));
    }, [order?._id]); // cuando cambias de orden



    const [orderNote, setOrderNote] = useState("");
    useEffect(() => {
        setOrderNote(String(order?.orderNote || ""));
    }, [order?._id, order?.orderNote]);
    const [draftOrderNote, setDraftOrderNote] = useState("");
    const [isNoteOpen, setIsNoteOpen] = useState(false);

    const [leaveTableModal, setLeaveTableModal] = useState({
        open: false,
        loading: false,
    });

    const leaveAfterSaveRef = useRef(false);
    const customerDisplayPaidUntilRef = useRef(0);

    const [showInvoice, setShowInvoice] = useState(false);
    const [orderInfo, setOrderInfo] = useState(null);

    const [itemsToPrint, setItemsToPrint] = useState([]);
    const [lastPayloadItems, setLastPayloadItems] = useState([]);

    const [customerName, setCustomerName] = useState("");
    const [customerRnc, setCustomerRnc] = useState("");
    const [guests, setGuests] = useState(0);
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    useEffect(() => {
        const details = order?.customerDetails || {};

        const nextName =
            details?.name ||
            draft?.name ||
            "";

        const nextPhone =
            details?.phone ||
            draft?.phone ||
            "";

        const nextAddress =
            details?.address ||
            draft?.address ||
            "";

        const nextGuests =
            details?.guests ??
            draft?.guests ??
            0;

        if (nextName) setCustomerName(String(nextName));
        if (nextPhone) setCustomerPhone(String(nextPhone));
        if (nextAddress) setCustomerAddress(String(nextAddress));
        if (Number(nextGuests || 0) > 0) setGuests(Number(nextGuests || 0));
    }, [
        order?._id,
        order?.customerDetails?.name,
        order?.customerDetails?.phone,
        order?.customerDetails?.address,
        order?.customerDetails?.guests,
        draft?.customerId,
        draft?.customerName || draft?.name,
        draft?.customerPhone || draft?.phone,
        draft?.customerAddress || draft?.address,
        draft?.guests,
    ]);

    // Fiscal (NCF) opcional
    const [wantsFiscal, setWantsFiscal] = useState(false);
    const [ncfType, setNcfType] = useState("B02"); // B01/B02
    const [dgiiLoading, setDgiiLoading] = useState(false);
    const [dgiiStatus, setDgiiStatus] = useState(""); // "", "FOUND", "NOT_FOUND", "ERROR"
    const [dgiiFound, setDgiiFound] = useState(null);

    // Propina + ITBIS
    const [tipEnabled, setTipEnabled] = useState(true);
    const [tipPercent, setTipPercent] = useState(10);
    const [taxEnabled, setTaxEnabled] = useState(true);
    const effectiveOrderId = orderId || order?._id || null;

    const {
        data: ecfTenantStatus,
        isLoading: isLoadingEcfTenantStatus,
    } = useQuery({
        queryKey: ["tenant-ecf-status"],
        queryFn: async () => {
            const res = await api.get("/api/order/ecf/status");
            return res.data?.data || null;
        },
        staleTime: 30_000,
        refetchOnMount: true,
    });

    const ecfFeatureEnabled = ecfTenantStatus?.enabled === true;
    const ecfCanIssueByTenant = ecfTenantStatus?.canIssue === true;
    const isEcfMode = ecfFeatureEnabled === true;

    const e31Enabled = ecfTenantStatus?.documentTypes?.e31?.enabled === true;
    const e32Enabled = ecfTenantStatus?.documentTypes?.e32?.enabled === true;

    const electronicFiscalCapable =
        isEcfMode && ecfCanIssueByTenant && (e31Enabled || e32Enabled);

    const fiscalUiEnabled = isEcfMode
        ? electronicFiscalCapable
        : fiscalEnabledByTenant;

    const fiscalUiCapable = isEcfMode
        ? electronicFiscalCapable
        : fiscalCapable;

    const {
        data: orderEcfStatus,
        isLoading: isLoadingOrderEcfStatus,
        refetch: refetchOrderEcfStatus,
    } = useQuery({
        queryKey: ["order-ecf-status", effectiveOrderId],
        enabled: Boolean(effectiveOrderId && ecfFeatureEnabled),
        queryFn: async () => {
            const res = await api.get(`/api/order/${effectiveOrderId}/ecf`);
            return res.data || null;
        },
        staleTime: 10_000,
        refetchOnMount: true,
    });

    const existingEcf = orderEcfStatus?.exists === true ? orderEcfStatus?.data : null;
    const hasExistingEcf = Boolean(existingEcf?.eNCF);
    const [ecfDocType, setEcfDocType] = useState("e32");

    useEffect(() => {
        if (!order?._id) return;

        const bills = order?.bills || {};
        const savedTax = bills?.taxEnabled;
        const savedTipAmount = num(bills?.tipAmount ?? bills?.tip ?? 0);
        const savedTipEnabled =
            typeof bills?.tipEnabled === "boolean"
                ? bills.tipEnabled
                : savedTipAmount > 0;

        if (typeof savedTax === "boolean") {
            setTaxEnabled(savedTax);
        } else {
            setTaxEnabled(taxEnabledByTenant);
        }

        setTipEnabled(savedTipEnabled);

        if (savedTipAmount > 0 && subtotal > 0) {
            const discountAmt = num(bills?.discount ?? 0);
            const base = Math.max(subtotal - discountAmt, 0);
            const pct = base > 0 ? (savedTipAmount / base) * 100 : 0;
            setTipPercent(Number(pct.toFixed(2)));
        } else {
            setTipPercent(0);
        }
    }, [order?._id, order?.bills, subtotal, taxEnabledByTenant]);


    const TAX_RATE = 18;
    const LEGAL_TIP_RATE = 10;
    useEffect(() => {
        if (!order?._id) return;

        const existingNcfNumber =
            order?.fiscal?.ncfNumber ||
            order?.ncfNumber ||
            "";

        const inferredType = inferNcfTypeFromNumber(existingNcfNumber);

        const existingType =
            order?.fiscal?.ncfType ||
            order?.ncfType ||
            inferredType ||
            null;

        const existingRequested = Boolean(
            order?.fiscal?.requested ||
            existingNcfNumber
        );

        setWantsFiscal(existingRequested);

        if (existingType) {
            setNcfType(existingType);
        }
    }, [
        order?._id,
        order?.fiscal?.requested,
        order?.fiscal?.ncfType,
        order?.fiscal?.ncfNumber,
        order?.ncfType,
        order?.ncfNumber,
    ]);
    useEffect(() => {
        if (!discountEnabledByTenant) setDiscountValue(0);
    }, [discountEnabledByTenant]);

    useEffect(() => {
        if (!taxEnabledByTenant) setTaxEnabled(false);
    }, [taxEnabledByTenant]);

    useEffect(() => {
        if (!fiscalUiEnabled) setWantsFiscal(false);
    }, [fiscalUiEnabled]);
    // Totales
    const { discount, base, deliveryFeeCalc, tax, tip, total } = useMemo(() => {
        const discountCalc =
            discountType === "percent"
                ? (subtotal * num(discountValue || 0)) / 100
                : num(discountValue || 0);

        const baseCalc = Math.max(subtotal - discountCalc, 0);

        const ship = isInternalDelivery ? Math.max(num(deliveryFee || 0), 0) : 0;

        const effectiveTaxRate = taxEnabled ? TAX_RATE : 0;

        const taxableBase = baseCalc + ship;
        const taxCalc = (taxableBase * effectiveTaxRate) / 100;

        const tipCalc = tipEnabledByTenant ? (baseCalc * LEGAL_TIP_RATE) / 100 : 0;

        return {
            discount: discountCalc,
            base: baseCalc,
            deliveryFeeCalc: ship,
            tax: taxCalc,
            tip: tipCalc,
            total: taxableBase + taxCalc + tipCalc,
        };
    }, [
        subtotal,
        discountType,
        discountValue,
        tipEnabledByTenant,
        tipPercent,
        isInternalDelivery,
        deliveryFee,
    ]);

    const computedCommission = useMemo(() => {
        if (!isAppDelivery) return 0;
        const rate = num(commissionRate);
        if (!rate) return 0;

        // comisión SIN tip: (base + tax) * rate
        const baseNoTip = num(base) + num(tax);
        const val = baseNoTip * rate;

        return Number(val.toFixed(2));
    }, [isAppDelivery, commissionRate, base, tax]);

    const commissionAmountEffective = useMemo(() => {
        const serverVal = num(commissionAmountFromServer);
        return serverVal > 0 ? serverVal : computedCommission;
    }, [commissionAmountFromServer, computedCommission]);

    const totalToPay = useMemo(() => {
        return isAppDelivery ? num(total) + num(commissionAmountEffective) : num(total);
    }, [isAppDelivery, total, commissionAmountEffective]);
    const cashReceivedAmount = useMemo(() => num(cashReceived), [cashReceived]);

    const cashChange = useMemo(() => {
        return Number(Math.max(cashReceivedAmount - num(totalToPay), 0).toFixed(2));
    }, [cashReceivedAmount, totalToPay]);

    const cashMissing = useMemo(() => {
        return Number(Math.max(num(totalToPay) - cashReceivedAmount, 0).toFixed(2));
    }, [cashReceivedAmount, totalToPay]);

    const showCashChangeBox = !isAppDelivery && paymentMethod === "Efectivo";
    useEffect(() => {
        if (Date.now() < customerDisplayPaidUntilRef.current) return;

        publishCustomerDisplayPatch({
            status: itemsArray.length ? "payment" : "idle",
            items: buildDisplayItems(itemsArray),
            subtotal: Number(num(subtotal).toFixed(2)),
            discount: Number(num(discount).toFixed(2)),
            deliveryFee: Number(num(deliveryFeeCalc).toFixed(2)),
            tax: Number(num(tax).toFixed(2)),
            tip: Number(num(tip).toFixed(2)),
            commission: Number(num(commissionAmountEffective).toFixed(2)),
            total: Number(num(totalToPay).toFixed(2)),
            paymentMethod,
            cashReceived: paymentMethod === "Efectivo"
                ? Number(num(cashReceivedAmount).toFixed(2))
                : 0,
            cashChange: paymentMethod === "Efectivo"
                ? Number(num(cashChange).toFixed(2))
                : 0,
            cashMissing: paymentMethod === "Efectivo"
                ? Number(num(cashMissing).toFixed(2))
                : 0,
            message: itemsArray.length
                ? "Revise su pedido antes de pagar."
                : "Su orden aparecerá aquí.",
        });
    }, [
        itemsArray,
        subtotal,
        discount,
        deliveryFeeCalc,
        tax,
        tip,
        commissionAmountEffective,
        totalToPay,
        paymentMethod,
        cashReceivedAmount,
        cashChange,
        cashMissing,
    ]);


    // Si el usuario activa wantsFiscal pero el tenant no puede, lo apagamos y avisamos
    useEffect(() => {
        if (wantsFiscal && !fiscalUiCapable) {
            setWantsFiscal(false);
            enqueueSnackbar(
                isEcfMode
                    ? "Este tenant no tiene e-CF listo para emitir."
                    : "Este tenant no tiene NCF habilitado/configurado.",
                { variant: "warning" }
            );
        }
    }, [wantsFiscal, fiscalUiCapable, isEcfMode]);
    useEffect(() => {
        if (!isEcfMode) return;

        if (ecfDocType === "e32" && !e32Enabled && e31Enabled) {
            setEcfDocType("e31");
        }

        if (ecfDocType === "e31" && !e31Enabled && e32Enabled) {
            setEcfDocType("e32");
        }
    }, [isEcfMode, ecfDocType, e31Enabled, e32Enabled]);
    // Mantener ncfType válido según allowed types
    useEffect(() => {
        if (!allowedNcfTypes?.length) return;
        if (!allowedNcfTypes.includes(ncfType)) {
            setNcfType(allowedNcfTypes[0]);
        }
    }, [allowedNcfTypes, ncfType]);

    // DGII lookup (solo si el cliente pide fiscal y escribe RNC/Cédula)
    const lookupDgii = async (doc) => {
        const cleaned = String(doc || "").replace(/[^\d]/g, "");

        // solo buscar si parece RNC/Cédula
        if (!isLikelyRncOrCedula(cleaned)) {
            setDgiiStatus("");
            setDgiiFound(null);
            return;
        }

        try {
            setDgiiLoading(true);
            setDgiiStatus("");
            setDgiiFound(null);

            const res = await api.get(`/api/dgii/rnc/${cleaned}`);

            // soporta varias respuestas posibles:
            // 1) { ok:true, data:{...} }
            // 2) { data:{ ok:true, data:{...} } }
            // 3) { data:{ data:{...} } }
            const payload = res?.data;
            const data =
                payload?.data?.data ??
                payload?.data ??
                payload ??
                null;

            const foundName =
                data?.name ||
                data?.nombre ||
                data?.razonSocial ||
                data?.razon_social ||
                "";

            if (foundName) {
                setCustomerName(foundName);
                setDgiiStatus("FOUND");
                setDgiiFound(data);
            } else {
                setDgiiStatus("NOT_FOUND");
                setDgiiFound(null);

                // ✅ Aviso claro si no se autocompleta
                if (wantsFiscal && fiscalCapable && !String(customerName || "").trim()) {
                    enqueueSnackbar("No se pudo autocompletar, introduzca el nombre manualmente.", {
                        variant: "warning",
                    });
                }
            }
        } catch (e) {
            setDgiiStatus("ERROR");
            setDgiiFound(null);

            if (wantsFiscal && fiscalCapable && !String(customerName || "").trim()) {
                enqueueSnackbar("No se pudo autocompletar, introduzca el nombre manualmente.", {
                    variant: "warning",
                });
            }
        } finally {
            setDgiiLoading(false);
        }
    };


    // Construye payload multi-tenant seguro (backend debe validar tenantId)
    const buildOrderPayload = (target = submitActionRef.current || "invoice") => {
        // Items desde el carrito
        const raw = Array.isArray(cart) ? cart : cart?.items;
        const itemsArray = Array.isArray(raw) ? raw : [];

        const items = itemsArray.map((item) => {
            const quantity = num(item.quantity ?? 1);

            const dishId = item.dishId ?? item.id ?? item.dish ?? item._id;

            const qtyType = item.qtyType || "unit";
            const weightUnit = qtyType === "weight" ? (item.weightUnit || "lb") : "";
            // IMPORTANTE:
            // - Para weight: unitPrice debe venir de item.unitPrice (600), NO de item.price (1200)
            // - Para unit: unitPrice puede venir de unitPrice/pricePerQuantity/price
            const unitPrice =
                qtyType === "weight"
                    ? num(item.unitPrice ?? item.pricePerQuantity ?? 0)
                    : num(item.unitPrice ?? item.pricePerQuantity ?? item.price ?? 0);

            // Line total:
            // - Para weight: ya viene en item.price (1200). Si no viene, lo calculas.
            // - Para unit: unitPrice * quantity
            const lineTotal =
                qtyType === "weight"
                    ? num(item.price ?? (unitPrice * quantity))
                    : Number((unitPrice * quantity).toFixed(2));

            return {
                dishId,
                dish: dishId,
                name: item.name ?? "Producto",
                qtyType,
                weightUnit,
                quantity,
                unitPrice,
                price: Number(lineTotal.toFixed(2)),
                productionArea: item.productionArea || "kitchen",

                note: String(item?.note || item?.comment || item?.specialInstructions || "").trim(),
                addons: Array.isArray(item?.addons)
                    ? item.addons
                    : Array.isArray(item?.addOns)
                        ? item.addOns
                        : Array.isArray(item?.extras)
                            ? item.extras
                            : Array.isArray(item?.extraIngredients)
                                ? item.extraIngredients
                                : Array.isArray(item?.selectedExtras)
                                    ? item.selectedExtras
                                    : [],
                modifiers: Array.isArray(item?.modifiers)
                    ? item.modifiers
                    : Array.isArray(item?.selectedOptions)
                        ? item.selectedOptions
                        : Array.isArray(item?.options)
                            ? item.options
                            : [],
            };

        });

        // Bills consistentes
        const bills = {
            subtotal: num(subtotal),
            discount: num(discount),
            tax: num(tax),
            tip: num(tip),

            totalWithTax: num(total),
            taxEnabled,
            tipEnabled,
            deliveryFee: num(deliveryFeeCalc),

            cashReceived: paymentMethod === "Efectivo" ? num(cashReceivedAmount) : 0,
            cashChange: paymentMethod === "Efectivo" ? num(cashChange) : 0,
        };

        const action = String(target || "").trim().toLowerCase();
        const isInvoiceSubmit = action === "invoice";
        const shouldGenerateInternalInvoiceNumber =
            action === "ticket" || action === "invoice";

        const resolvedTableId =
            (typeof draftTable === "string" ? draftTable : null) ||
            draftTable?._id ||
            draftTable?.id ||
            (typeof order?.table === "string" ? order.table : null) ||
            order?.table?._id ||
            order?.table?.id ||
            null;
        const basePayload = {
            // Facturar genera la factura, pero la orden debe seguir En Progreso.
            // La mesa NO se libera automáticamente por facturar.
            orderStatus: "En Progreso",
            items,
            customerId: selectedCustomerId || null,

            // IMPORTANTE: enviar siempre el ID de la mesa
            table: resolvedTableId,

            paymentMethod: isAppDelivery
                ? (orderSource === "PEDIDOSYA" ? "Pedido Ya" : "Uber Eats")
                : paymentMethod,

            discount: { type: discountType, value: num(discountValue) || 0 },
            bills,
            orderNote: String(orderNote || "").trim(),
            registerId: getActiveRegisterId(),

            // IMPORTANTE:
            // Solo marcar como pagado cuando realmente se presiona FACTURAR.
            // Ticket y Actualizar deben quedar Pendiente.
            paymentStatus:
                chargeMode === "AT_INVOICE" && isInvoiceSubmit
                    ? "Pagado"
                    : "Pendiente",

// IMPORTANTE:
// Ticket también debe generar número interno de factura,
// pero NO debe cerrar la orden ni marcarla como pagada.
            markAsPaid: shouldGenerateInternalInvoiceNumber,
        };

        // customerDetails (si hay data)
        const finalCustomerName =
            String(customerName || draft?.name || order?.customerDetails?.name || "").trim();

        const finalCustomerPhone =
            String(customerPhone || draft?.phone || order?.customerDetails?.phone || "").trim();

        const finalCustomerAddress =
            String(customerAddress || draft?.address || order?.customerDetails?.address || "").trim();

        const finalGuests =
            Number(guests || draft?.guests || order?.customerDetails?.guests || 0);

        const hasCustomerData =
            selectedCustomerId ||
            finalCustomerName ||
            finalCustomerPhone ||
            finalCustomerAddress ||
            String(customerRnc || "").trim() ||
            finalGuests > 0;

        if (hasCustomerData) {
            basePayload.customerDetails = {
                name: finalCustomerName || "Consumidor Final",
                rnc: String(customerRnc || order?.customerDetails?.rnc || "").trim(),
                rncCedula: String(order?.customerDetails?.rncCedula || customerRnc || "").trim(),
                guests: finalGuests,
                phone: finalCustomerPhone,
                address: finalCustomerAddress,
            };
        }

        // fiscal (si aplica)
        if (wantsFiscal && fiscalUiCapable) {
            if (isEcfMode) {
                const selectedEcfType = String(ecfDocType || "e32").toLowerCase();

                if (selectedEcfType === "e31") {
                    basePayload.fiscal = {
                        requested: true,
                        ncfType: "B01",
                        ecfDocumentType: "31",
                    };
                } else {
                    basePayload.fiscal = {
                        requested: false,
                        ncfType: "B02",
                        ecfDocumentType: "32",
                    };
                }
            } else {
                const existingNcfNumber =
                    order?.fiscal?.ncfNumber ||
                    order?.ncfNumber ||
                    "";

                const inferredExistingType = inferNcfTypeFromNumber(existingNcfNumber);

                const safeNcfType =
                    inferredExistingType ||
                    order?.fiscal?.ncfType ||
                    order?.ncfType ||
                    (allowedNcfTypes.includes(ncfType) ? ncfType : null) ||
                    allowedNcfTypes[0] ||
                    "B02";

                basePayload.fiscal = {
                    requested: true,
                    ncfType: safeNcfType,
                };
            }

            if (chargeMode === "AT_INVOICE" && isInvoiceSubmit) {
                basePayload.paymentStatus = "Pagado";
                basePayload.markAsPaid = true;
            }
        }
        return basePayload;
    };


    const groupItemsByProductionArea = (items = []) => {
        const groups = {};

        for (const item of items || []) {
            let area = String(item?.productionArea || "kitchen").trim().toLowerCase();

            // Todo lo que no sea bar se va a cocina por defecto
            if (area !== "bar" && area !== "kitchen") {
                area = "kitchen";
            }

            if (!groups[area]) groups[area] = [];
            groups[area].push({
                ...item,
                productionArea: area,
            });
        }

        return groups;
    };


    const orderMutation = useMutation({
        mutationFn: async (payload) => {
            const registerId = getActiveRegisterId();

            if (orderId) {
                return updateOrder(orderId, {
                    ...payload,
                    registerId,
                });
            }

            return addOrder({
                ...payload,
                registerId,
                table:
                    payload?.table ||
                    (typeof draftTable === "string" ? draftTable : null) ||
                    draftTable?._id ||
                    draftTable?.id ||
                    null,
                orderSource: payload?.orderSource ?? draftOrderSource,
            });
        },
        onSuccess: async (res) => {
            const createdId =
                res?.data?.data?._id ||
                res?.data?.data?.order?._id ||
                res?.data?._id ||
                res?.data?.order?._id ||
                null;

            let server =
                res?.data?.data?.order ??
                res?.data?.order ??
                res?.data?.data ??
                res?.data ??
                {};

            const effectiveId = orderId || createdId;

            try {
                if (effectiveId) {
                    const fresh = await api.get(`/api/order/${effectiveId}`);
                    const freshOrder =
                        fresh?.data?.data?.order ??
                        fresh?.data?.order ??
                        fresh?.data?.data ??
                        fresh?.data ??
                        null;

                    if (freshOrder && freshOrder._id) {
                        server = freshOrder;
                    }
                }
            } catch (e) {
                console.log("[BILL] No pude refrescar el order por GET:", e?.message);
            }

            const currentPrintTarget = printTargetRef.current;


            // Solo dejamos /menu?orderId=... cuando NO es factura final.
            // Para factura final, no queremos que el POS se quede pegado a esa orden cerrada.
            if (!orderId && createdId && currentPrintTarget !== "invoice") {
                navigate(`/menu?orderId=${createdId}`, { replace: true });
            }

            // Si es factura final, NO pegamos la pantalla a /menu?orderId=...
// porque esa orden ya quedó cerrada y la mesa debe quedar libre.

            const fallback = buildOrderPayload(submitActionRef.current);
            const tableIdToSync =
                getTableIdFromAny(server?.table) ||
                getTableIdFromAny(fallback?.table) ||
                getTableIdFromAny(draftTable) ||
                getTableIdFromAny(order?.table);

            const serverStatus = String(server?.orderStatus || "").trim();

// Facturar NO debe liberar la mesa.
// La mesa solo se libera cuando se presiona "Desocupar mesa"
// o cuando la orden se cancela.
            const shouldReleaseTable =
                tableIdToSync &&
                serverStatus === "Cancelado";

            const shouldOccupyTable =
                tableIdToSync &&
                effectiveId &&
                !shouldReleaseTable;

            try {
                if (shouldReleaseTable) {
                    await updateTable(tableIdToSync, {
                        status: "Disponible",
                        orderId: null,
                    });
                } else if (shouldOccupyTable) {
                    await updateTable(tableIdToSync, {
                        status: "Ocupada",
                        orderId: effectiveId,
                    });
                }
            } catch (e) {
                console.error("[BILL] No pude sincronizar la mesa:", e?.response?.data || e);
            }

            try {
                if (effectiveId) {
                    queryClient.invalidateQueries(["order", effectiveId]);
                }
            } catch (_) {}

            const srcItems =
                Array.isArray(server.items) && server.items.length
                    ? server.items
                    : (fallback.items || []);
            committedItemsRef.current = srcItems;

            const normalizedItems = (srcItems ?? []).map((it) => {
                const q = num(it.quantity ?? it.qty ?? 1);
                const unit = num(
                    it.pricePerQuantity ??
                    it.unitPrice ??
                    (it.price && q ? it.price / q : 0)
                );
                const line = num(it.price ?? unit * q);

                return {
                    ...it,
                    name: it.name || it.dishName || it.itemName || it?.dishInfo?.name || "Producto",
                    quantity: q,
                    qty: q,
                    unitPrice: unit,
                    price: line,
                    tax: num(it.taxAmount ?? 0),
                };
            });

            const bills = {
                subtotal: server.bills?.subtotal ?? server.bills?.total ?? fallback.bills?.subtotal ?? 0,
                discount: server.bills?.discount ?? fallback.bills?.discount ?? 0,
                tax: server.bills?.tax ?? fallback.bills?.tax ?? 0,
                tip: server.bills?.tip ?? server.bills?.tipAmount ?? fallback.bills?.tip ?? 0,
                totalWithTax: server.bills?.totalWithTax ?? fallback.bills?.totalWithTax ?? 0,
                taxEnabled: server.bills?.taxEnabled ?? fallback.bills?.taxEnabled ?? true,
                tipEnabled: server.bills?.tipEnabled ?? fallback.bills?.tipEnabled ?? true,
                deliveryFee: server.bills?.deliveryFee ?? fallback.bills?.deliveryFee ?? 0,
                cashReceived: server.bills?.cashReceived ?? fallback.bills?.cashReceived ?? 0,
                cashChange: server.bills?.cashChange ?? fallback.bills?.cashChange ?? 0,
            };

            const fallbackFiscal = fallback?.fiscal ?? null;

            const fiscal = {
                ...(server.fiscal || {}),
                ...(fallbackFiscal || {}),
                requested:
                    server?.fiscal?.requested ??
                    fallbackFiscal?.requested ??
                    false,
                ncfType:
                    server?.fiscal?.ncfType ??
                    server?.ncfType ??
                    fallbackFiscal?.ncfType ??
                    null,
                ncfNumber:
                    server?.fiscal?.ncfNumber ??
                    server?.fiscal?.ncf ??
                    server?.ncfNumber ??
                    fallbackFiscal?.ncfNumber ??
                    null,
            };

            const resolvedNcfType =
                fiscal?.ncfType ||
                server?.ncfType ||
                fallbackFiscal?.ncfType ||
                null;

            const resolvedNcfNumber =
                fiscal?.ncfNumber ||
                server?.ncfNumber ||
                server?.fiscal?.ncfNumber ||
                server?.fiscal?.ncf ||
                server?.fiscal?.number ||
                server?.fiscal?.documentNumber ||
                server?.fiscal?.ncfCode ||
                server?.fiscal?.comprobante ||
                "";

            const resolvedExpirationDate =
                server?.fiscal?.expirationDate ||
                server?.fiscal?.expiresAt ||
                tenantInfo?.fiscal?.ncfConfig?.[resolvedNcfType]?.expiresAt ||
                null;

            const resolvedFacturaNo =
                server?.fiscal?.invoiceNumber ||
                server?.invoiceNumber ||
                server?.fiscal?.facturaNo ||
                server?.facturaNo ||
                server?.fiscal?.internalNumber ||
                server?.fiscal?.internalSeq ||
                server?.fiscal?.internal ||
                null;




            const ticketItemsSource =
                currentPrintTarget === "ticket"
                    ? (itemsToPrintRef.current || [])
                    : normalizedItems;


            const normalizedTicketItems = (ticketItemsSource ?? []).map((it) => {
                const q = num(it.quantity ?? it.qty ?? 1);
                const unit = num(
                    it.pricePerQuantity ??
                    it.unitPrice ??
                    (it.price && q ? it.price / q : 0)
                );
                const line = num(it.price ?? unit * q);

                return {
                    ...it,
                    name: it.name || it.dishName || it.itemName || it?.dishInfo?.name || "Producto",
                    quantity: q,
                    qty: q,
                    unitPrice: unit,
                    price: line,
                    tax: Number((line * 0.18).toFixed(2)),
                };
            });

            const invoice = {
                _id: server._id ?? effectiveId,
                createdAt: server.createdAt ?? order?.createdAt ?? null,
                table: server.table ?? order?.table ?? draftTable ?? null,
                orderNote: server.orderNote ?? fallback.orderNote ?? "",
                items: normalizedTicketItems,
                orderedItems: normalizedTicketItems,
                tableName:
                    server.table?.name ??
                    server.tableName ??
                    order?.table?.name ??
                    order?.tableName ??
                    draftTable?.name ??
                    "",
                roomName:
                    server.roomName ??
                    server.sala ??
                    server.area ??
                    server.section ??
                    order?.roomName ??
                    order?.sala ??
                    order?.area ??
                    draftTable?.areaName ??
                    draftTable?.section ??
                    "",
                waiterName:
                    server.waiterName ??
                    server.serverName ??
                    server.mesero ??
                    server.user?.name ??
                    server.createdBy?.name ??
                    "",
                orderSource: server.orderSource,
                commissionRate: server.commissionRate,
                commissionAmount: server.commissionAmount,
                netTotal: server.netTotal,
                customerDetails: {
                    name: server.customerDetails?.name ?? fallback.customerDetails?.name ?? "",
                    rnc: server.customerDetails?.rnc ?? fallback.customerDetails?.rnc ?? "",
                    guests: server.customerDetails?.guests ?? fallback.customerDetails?.guests ?? 0,
                    phone: server.customerDetails?.phone ?? fallback.customerDetails?.phone ?? "",
                    address: server.customerDetails?.address ?? fallback.customerDetails?.address ?? "",
                },
                customerName: server.customerDetails?.name ?? fallback.customerDetails?.name ?? "",
                customerRnc: server.customerDetails?.rnc ?? fallback.customerDetails?.rnc ?? "",
                paymentMethod: server.paymentMethod ?? fallback.paymentMethod ?? "Efectivo",
                subTotal: bills.subtotal,
                discountAmount: bills.discount,
                taxAmount: bills.tax,
                tipAmount: bills.tip,
                totalAmount: bills.totalWithTax,
                bills,
                fiscal: {
                    ...(fiscal || {}),
                    expirationDate: resolvedExpirationDate,
                },
                cashReceived: bills.cashReceived,
                cashChange: bills.cashChange,
                ncfType: resolvedNcfType,
                ncfNumber: resolvedNcfNumber,
                facturaNo: resolvedFacturaNo,
                expirationDate: resolvedExpirationDate,
            };

            console.log("[BILL][invoice payload final]", invoice);
            console.log("[BILL][server order final]", server);
            console.log("[BILL][fallbackFiscal]", fallbackFiscal);
            console.log("[BILL][fiscal armado]", fiscal);
            console.log("[BILL][resolvedNcfType]", resolvedNcfType);
            console.log("[BILL][resolvedNcfNumber]", resolvedNcfNumber);


            if (currentPrintTarget !== "ticket") {
                itemsToPrintRef.current = [];
                setItemsToPrint([]);
            }
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["tables"] });

            if (effectiveId) {
                queryClient.invalidateQueries({ queryKey: ["order", effectiveId] });
            }

            if (currentPrintTarget === "update") {
                dispatch(removeAllItems());
                dispatch(clearDraftContext());

                setIsOrderModalOpen(false);

                if (leaveAfterSaveRef.current) {
                    leaveAfterSaveRef.current = false;

                    setLeaveTableModal({
                        open: false,
                        loading: false,
                    });

                    navigate("/mesas", { replace: true });
                    return;
                }

                navigate("/orders");
                return;
            }

            if (currentPrintTarget === "ticket") {
                const sourceItems =
                    Array.isArray(itemsToPrintRef.current) && itemsToPrintRef.current.length
                        ? itemsToPrintRef.current
                        : normalizedItems;

                const grouped = groupItemsByProductionArea(sourceItems);

                const fallbackTickets = Object.entries(grouped).map(([area, items]) => ({
                    area,
                    title:
                        area === "bar"
                            ? "BAR"
                            : area === "kitchen"
                                ? "COCINA"
                                : "PRODUCCION",
                    printerCategory: area,
                    order: {
                        ...invoice,
                        items,
                        orderedItems: items,
                    },
                }));

                if (fallbackTickets.length) {
                    setProductionFallbackTickets(fallbackTickets);
                    setShowProductionFallback(true);
                } else {
                    enqueueSnackbar("No hay platos nuevos para imprimir.", {
                        variant: "info",
                    });
                }

                // La orden ya quedó guardada en la mesa.
                // Limpiamos el carrito local para que no se copie a otra mesa.
                dispatch(removeAllItems());
                dispatch(clearDraftContext());

                return;
            }
            const ecfFromBackend = server?.ecf || res?.data?.data?.ecf || null;

            if (ecfFromBackend?.error) {
                enqueueSnackbar(
                    ecfFromBackend.message === "E32_OVER_250K_REQUIRES_BUYER_DOCUMENT"
                        ? "Para facturar e32 por RD$250,000 o más debes agregar RNC/Cédula válido del comprador."
                        : ecfFromBackend.message || "No se pudo emitir el e-CF. La factura no debe imprimirse.",
                    { variant: "error" }
                );

                return;
            }

            enqueueSnackbar("Factura generada correctamente.", { variant: "success" });

            if (ecfFromBackend?.exists) {
                invoice.ecf = {
                    exists: true,
                    documentId: ecfFromBackend.documentId || null,
                    documentType: ecfFromBackend.documentType || null,
                    sequenceNumber: ecfFromBackend.sequenceNumber || null,
                    eNCF: ecfFromBackend.eNCF || null,
                    status: ecfFromBackend.status || null,
                    trackId: ecfFromBackend.trackId || null,
                    securityCode: ecfFromBackend.securityCode || null,
                    qrUrl: ecfFromBackend.qrUrl || null,
                    fechaHoraFirma: ecfFromBackend.fechaHoraFirma || null,
                };

                enqueueSnackbar("e-CF emitido correctamente.", { variant: "success" });
            } else if (ecfFromBackend?.error) {
                invoice.ecf = {
                    exists: false,
                    error: true,
                    message: ecfFromBackend.message || "No se pudo emitir el e-CF.",
                    errors: ecfFromBackend.errors || [],
                };

                enqueueSnackbar(
                    ecfFromBackend.message || "La factura fue generada, pero no se pudo emitir el e-CF.",
                    { variant: "warning" }
                );
            }

            setOrderInfo(invoice);
            setShowInvoice(true);
            customerDisplayPaidUntilRef.current = Date.now() + 6000;

            publishCustomerDisplayPatch({
                status: "paid",
                items: buildDisplayItems(normalizedTicketItems),
                subtotal: Number(num(bills.subtotal).toFixed(2)),
                discount: Number(num(bills.discount).toFixed(2)),
                deliveryFee: Number(num(bills.deliveryFee).toFixed(2)),
                tax: Number(num(bills.tax).toFixed(2)),
                tip: Number(num(bills.tip).toFixed(2)),
                total: Number(num(bills.totalWithTax).toFixed(2)),
                paymentMethod: invoice.paymentMethod || paymentMethod,
                cashReceived: Number(num(bills.cashReceived).toFixed(2)),
                cashChange: Number(num(bills.cashChange).toFixed(2)),
                cashMissing: 0,
                message: "Factura generada. Gracias por su compra.",
            });

// La factura ya cerró la orden. Limpiamos el contexto local para que
// al volver a mesas no se reutilicen los productos de esta mesa.
            dispatch(removeAllItems());
            dispatch(clearDraftContext());

            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["tables"] });
            queryClient.invalidateQueries({ queryKey: ["cash-session"] });
        },
    });
    const paymentMethodMutation = useMutation({
        mutationFn: async (method) => {
            // IMPORTANTE: usar api.patch para no pasar items, bills, etc.
            const res = await api.patch(`/api/order/${orderId}/payment-method`, { paymentMethod: method });
            return res.data;
        },
        onSuccess: (_data, method) => {
            // actualiza el cache de la orden SIN refetch
            queryClient.setQueryData(["order", orderId], (prev) => {
                if (!prev) return prev;

                // según tu backend, a veces es { success, data } o la orden directa
                if (prev.data) {
                    return {
                        ...prev,
                        data: { ...prev.data, paymentMethod: method },
                    };
                }

                return { ...prev, paymentMethod: method };
            });

            enqueueSnackbar("Método de pago actualizado.", { variant: "success" });
        },

    });



    const handlePlaceOrder = (target = "invoice") => {
        if (!canUseCreditSales && paymentMethod === "Credito") {
            setPaymentMethod("Efectivo");

            enqueueSnackbar("Tu plan actual no permite ventas a crédito.", {
                variant: "warning",
            });

            return;
        }
        if (paymentMethod === "Credito" && !selectedCustomerId) {
            enqueueSnackbar("Para vender fiado debes seleccionar o crear un cliente guardado.", {
                variant: "warning",
            });
            return;
        }
        const targetAction = String(target || "").trim().toLowerCase();
        const buyerDocForEcf = String(
            customerRnc ||
            order?.customerDetails?.rnc ||
            order?.customerDetails?.rncCedula ||
            ""
        ).replace(/[^\d]/g, "");

        if (
            targetAction === "invoice" &&
            isEcfMode &&
            num(total) >= 250000 &&
            ![9, 11].includes(buyerDocForEcf.length)
        ) {
            enqueueSnackbar(
                "Para facturar e32 por RD$250,000 o más debes agregar RNC/Cédula válido del comprador.",
                { variant: "warning" }
            );
            return;
        }
        if (wantsFiscal && fiscalUiCapable) {
            const doc = String(customerRnc || "").replace(/[^\d]/g, "");

            if (isEcfMode && ecfDocType === "e31") {
                if (![9, 11].includes(doc.length)) {
                    enqueueSnackbar(
                        "Para e31 crédito fiscal electrónico, debes agregar un RNC/Cédula válido de 9 u 11 dígitos.",
                        { variant: "warning" }
                    );
                    return;
                }
            }

            if (!isEcfMode && ncfType === "B01" && doc.length !== 9) {
                if(![9, 11].includes(doc.length)){
                    enqueueSnackbar("Para B01 crédito fiscal, debes agregar un RNC válido de 9 u 11 dígitos.", {
                        variant: "warning",
                    });
                    return;

                }

            }
        }

        const payload = buildOrderPayload(target);
        payload.submitAction = target;

        if (!payload.items?.length) {
            enqueueSnackbar("No hay items en el carrito para guardar la orden.", {
                variant: "warning",
            });
            return;
        }


        const previousItems = committedItemsRef.current || [];
        const currentItems = payload.items || [];
        const deltaItems = getOnlyNewItemsForPrint(previousItems, currentItems);



        itemsToPrintRef.current = deltaItems;
        setItemsToPrint(deltaItems);



        setSubmitAction(target);
        setLastPayloadItems(payload.items || []);

        const normalizedTarget = String(target || "").toLowerCase();

// Ticket siempre debe ser ticket.
// Facturar siempre debe ser invoice.
// Esto evita que Ticket se comporte como factura sin número.
        const nextTarget = normalizedTarget === "invoice" ? "invoice" : normalizedTarget;

        submitActionRef.current = normalizedTarget;
        printTargetRef.current = nextTarget;

        setPrintTarget(nextTarget);

        orderMutation.mutate(payload);
    };


    const handleInvoiceClose = () => {
        setShowInvoice(false);
        setIsOrderModalOpen(false);

// La factura ya fue generada.
// La mesa debe seguir ocupada hasta presionar "Desocupar mesa".
// Limpiamos solo el carrito/draft local para evitar reutilizar productos.
        dispatch(removeAllItems());
        dispatch(clearDraftContext());

        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["tables"] });
        queryClient.invalidateQueries({ queryKey: ["cash-session"] });

        navigate("/mesas", { replace: true });
    };
    const handleFinishAndReleaseTable = async () => {
        const invoiceOrderId =
            orderInfo?._id ||
            orderId ||
            null;

        const tableIdToRelease =
            getTableIdFromAny(orderInfo?.table) ||
            getTableIdFromAny(draftTable) ||
            getTableIdFromAny(order?.table);

        try {
            if (invoiceOrderId) {
                await updateOrder(invoiceOrderId, {
                    orderStatus: "Completado",
                    submitAction: "invoice",
                });
            }

            if (tableIdToRelease) {
                await updateTable(tableIdToRelease, {
                    status: "Disponible",
                    orderId: null,
                });
            }

            dispatch(removeAllItems());
            dispatch(clearDraftContext());

            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["tables"] });
            queryClient.invalidateQueries({ queryKey: ["cash-session"] });

            navigate("/orders", { replace: true });
        } catch (e) {
            console.error("[BILL] No pude cerrar/liberar mesa:", e?.response?.data || e);
            enqueueSnackbar("No se pudo cerrar y liberar la mesa.", { variant: "error" });
        }
    };

    const closeLeaveTableModal = () => {
        if (leaveTableModal.loading) return;

        setLeaveTableModal({
            open: false,
            loading: false,
        });
    };

    const handleBackFromTableOrder = () => {
        const tableId =
            getTableIdFromAny(draftTable) ||
            getTableIdFromAny(order?.table);

        const hasItems = Number(itemsCount || 0) > 0;

        // Si no es una mesa o no hay productos, salimos normal.
        if (!tableId || !hasItems) {
            dispatch(removeAllItems());
            dispatch(clearDraftContext());
            navigate("/mesas", { replace: true });
            return;
        }

        setLeaveTableModal({
            open: true,
            loading: false,
        });
    };

    const handleSaveItemsAndLeave = () => {
        setLeaveTableModal((prev) => ({
            ...prev,
            loading: true,
        }));

        leaveAfterSaveRef.current = true;

        setSubmitAction("update");
        handlePlaceOrder("update");
    };

    const handleDiscardItemsAndLeave = async () => {
        const currentOrderId =
            orderId ||
            order?._id ||
            null;

        const tableId =
            getTableIdFromAny(draftTable) ||
            getTableIdFromAny(order?.table);

        try {
            setLeaveTableModal((prev) => ({
                ...prev,
                loading: true,
            }));

            // Si ya existe una orden, limpiamos sus items.
            // Tu backend ya tiene lógica para borrar/liberar si items viene vacío.
            if (currentOrderId) {
                await updateOrder(currentOrderId, {
                    items: [],
                    orderStatus: "En Progreso",
                    submitAction: "clear_table_items",
                });
            } else if (tableId) {
                await updateTable(tableId, {
                    status: "Disponible",
                    orderId: null,
                });
            }

            dispatch(removeAllItems());
            dispatch(clearDraftContext());

            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["tables"] });
            queryClient.invalidateQueries({ queryKey: ["cash-session"] });

            setLeaveTableModal({
                open: false,
                loading: false,
            });

            navigate("/mesas", { replace: true });
        } catch (e) {
            console.error("[BILL] No pude borrar los items de la mesa:", e?.response?.data || e);

            setLeaveTableModal((prev) => ({
                ...prev,
                loading: false,
            }));

            enqueueSnackbar(
                e?.response?.data?.message || "No se pudieron borrar los items de la mesa.",
                { variant: "error" }
            );
        }
    };


    return (
        <>
            <div className="flex items-center justify-between px-5 mt-2">
                <p className="text-xs text-[#ababab] font-medium mt-2">
                    Items({itemsCount})
                </p>
                <h1 className="text-[#f5f5f5] text-md font-bold">
                    ${num(subtotal).toFixed(2)}
                </h1>
            </div>
            {/* Nota de la orden */}
            <div className="mt-3 rounded-lg border border-gray-800/50 bg-[#111111] p-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Nota</span>

                    <button
                        type="button"
                        onClick={() => {
                            setDraftOrderNote(orderNote || "");
                            setIsNoteOpen(true);
                        }}
                        className="px-3 py-2 rounded-lg font-semibold bg-[#1f1f1f] text-[#ababab] hover:bg-[#2b2b2b] hover:text-white"
                    >
                        {orderNote?.trim() ? "Editar" : "Agregar"}
                    </button>
                </div>

                {orderNote?.trim() ? (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">{orderNote}</p>
                ) : (
                    <p className="text-xs text-gray-500 mt-2">Sin nota</p>
                )}
            </div>
            <AnimatePresence>
                {isNoteOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
                        onClick={() => setIsNoteOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-white text-lg font-semibold">Nota de la orden</h3>

                            <textarea
                                value={draftOrderNote}
                                onChange={(e) => setDraftOrderNote(e.target.value)}
                                rows={4}
                                className="mt-4 w-full p-3 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                placeholder="Ej: Sin cebolla, poco picante, entregar en recepción..."
                                autoFocus
                            />

                            <div className="flex gap-3 mt-5">
                                <button
                                    type="button"
                                    onClick={() => setIsNoteOpen(false)}
                                    className="px-4 py-3 w-full rounded-lg font-semibold bg-[#1f1f1f] text-[#ababab]"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setOrderNote(draftOrderNote);
                                        setIsNoteOpen(false);
                                    }}
                                    className="px-4 py-3 w-full rounded-lg font-semibold bg-[#2b2b2b] text-white"
                                >
                                    Guardar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Descuento + Propina */}
            <div className="px-5 mt-3">
                {/* ✅ DESCUENTO (solo si el tenant lo permite) */}
                {discountEnabledByTenant && (
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[#ababab]">Descuento</span>
                            <button
                                type="button"
                                className={`text-xs px-2 py-1 rounded ${
                                    discountType === "flat"
                                        ? "bg-[#2b2b2b] text-white"
                                        : "bg-transparent text-[#ababab]"
                                }`}
                                onClick={() => setDiscountType("flat")}
                            >
                                $
                            </button>
                            <button
                                type="button"
                                className={`text-xs px-2 py-1 rounded ${
                                    discountType === "percent"
                                        ? "bg-[#2b2b2b] text-white"
                                        : "bg-transparent text-[#ababab]"
                                }`}
                                onClick={() => setDiscountType("percent")}
                            >
                                %
                            </button>
                        </div>

                        <input
                            type="text"
                            inputMode="decimal"
                            value={discountValue === 0 ? "" : discountValue}
                            onChange={(e) => {
                                const val = e.target.value.trim();
                                setDiscountValue(val === "" ? 0 : Number(val));
                            }}
                            className="bg-[#1f1f1f] rounded px-3 py-2 text-[#f5f5f5] outline-none placeholder-[#555] focus:ring-1 focus:ring-[#facc15]"
                            placeholder="0.00"
                        />
                    </div>
                )}



                {/* ✅ PROPINA LEGAL FIJA */}
                {tipEnabledByTenant && (
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-[#ababab]">Propina legal</span>

                        <span className="text-xs text-[#f5f5f5] font-semibold">
            {LEGAL_TIP_RATE}%
        </span>
                    </div>
                )}

                {/* ✅ ITBIS (solo si el tenant lo permite) */}
                {taxEnabledByTenant && (
                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-[#ababab]">Tax (ITBIS)</span>

                            <Switch
                                checked={taxEnabled}
                                onChange={setTaxEnabled}
                            />
                        </div>

                        <span className="text-xs text-[#ababab]">{TAX_RATE}%</span>
                    </div>
                )}
                {isInternalDelivery && (
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-[#ababab]">Envío</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={deliveryFee === 0 ? "" : deliveryFee}
                            onChange={(e) => {
                                const val = e.target.value.trim();
                                setDeliveryFee(val === "" ? 0 : Number(val));
                            }}
                            className="w-28 bg-[#1f1f1f] rounded px-3 py-2 text-[#f5f5f5] outline-none placeholder-[#555] focus:ring-1 focus:ring-[#facc15]"
                            placeholder="0.00"
                        />
                    </div>
                )}


                {/* ✅ RESUMEN */}
                {isAppDelivery  && num(commissionAmountEffective) > 0 && (
                    <div className="mt-3 text-xs text-[#ababab] space-y-1">
                        <div className="flex justify-between">
                            <span>Comisión ({commissionPct}%)</span>
                            <span>${num(commissionAmountEffective).toFixed(2)}</span>
                        </div>
                    </div>
                )}



                <div className="mt-3 text-xs text-[#ababab] space-y-1">

                    {discountEnabledByTenant && (
                        <div className="flex justify-between">
                            <span>Descuento</span>
                            <span>${num(discount).toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <span>Propina legal 10%</span>
                        <span>${num(tip).toFixed(2)}</span>
                    </div>

                    {taxEnabledByTenant && (
                        <div className="flex justify-between">
                            <span>Tax (ITBIS)</span>
                            <span>${num(tax).toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-[#f5f5f5] font-semibold">
                        <span>Total</span>
                        <span>${num(totalToPay).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Método de pago */}

            <div
                className={`grid gap-3 px-5 mt-4 ${
                    isAppDelivery
                        ? "grid-cols-1"
                        : canUseCreditSales
                            ? "grid-cols-2"
                            : "grid-cols-1 sm:grid-cols-3"
                }`}
            >
                {isAppDelivery  ? (
                    <button
                        type="button"
                        disabled
                        className="px-4 py-3 w-full rounded-lg font-semibold bg-[#2b2b2b] text-white opacity-90 cursor-not-allowed"
                        title="El método de pago se asigna automáticamente por el canal"
                    >
                        {orderSource === "PEDIDOSYA" ? "Pedido Ya" : "Uber Eats"}
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setPaymentMethod("Efectivo");

                                if (!orderId) {
                                    enqueueSnackbar("Guarda la orden primero para cambiar el método de pago.", {
                                        variant: "warning",
                                    });
                                    return;
                                }

                                paymentMethodMutation.mutate("Efectivo");
                            }}
                            className={`min-h-[52px] px-3 py-3 w-full rounded-xl font-semibold text-sm sm:text-base leading-tight text-center transition-all ${
                                paymentMethod === "Efectivo"
                                    ? "bg-[#2b2b2b] text-white border border-[#3a3a3a]"
                                    : "bg-[#1f1f1f] text-[#ababab] border border-transparent hover:bg-[#252525]"
                            }`}
                        >
                            Efectivo
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                // ✅ siempre cambia en UI (draft o orden real)
                                setPaymentMethod("Tarjeta");

                                // ✅ solo persiste si ya existe orderId
                                if (orderId) {
                                    paymentMethodMutation.mutate("Tarjeta");
                                }
                            }}
                            className={`min-h-[52px] px-3 py-3 w-full rounded-xl font-semibold text-sm sm:text-base leading-tight text-center transition-all ${
                                paymentMethod === "Tarjeta"
                                    ? "bg-[#2b2b2b] text-white border border-[#3a3a3a]"
                                    : "bg-[#1f1f1f] text-[#ababab] border border-transparent hover:bg-[#252525]"
                            }`}
                        >
                            Tarjeta
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                // ✅ siempre cambia en UI (draft o orden real)
                                setPaymentMethod("Transferencia");

                                // ✅ solo persiste si ya existe orderId
                                if (orderId) {
                                    paymentMethodMutation.mutate("Transferencia");
                                }
                            }}
                            className={`min-h-[52px] px-3 py-3 w-full rounded-xl font-semibold text-sm sm:text-base leading-tight text-center transition-all ${
                                paymentMethod === "Transferencia"
                                    ? "bg-[#2b2b2b] text-white border border-[#3a3a3a]"
                                    : "bg-[#1f1f1f] text-[#ababab] border border-transparent hover:bg-[#252525]"
                            }`}
                        >
                            Transferencia
                        </button>
                        {canUseCreditSales && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPaymentMethod("Credito");

                                    if (orderId) {
                                        paymentMethodMutation.mutate("Credito");
                                    }
                                }}
                                className={`min-h-[52px] px-3 py-3 w-full rounded-xl font-semibold text-sm sm:text-base leading-tight text-center transition-all ${
                                    paymentMethod === "Credito"
                                        ? "bg-[#2b2b2b] text-white border border-[#3a3a3a]"
                                        : "bg-[#1f1f1f] text-[#ababab] border border-transparent hover:bg-[#252525]"
                                }`}
                            >
                                Crédito
                            </button>
                        )}
                    </>
                )}
            </div>
            

            {/* Datos del cliente + Fiscal */}
            <div className="px-5 mt-4">
                {/* FACTURA FISCAL (solo si el tenant lo permite) */}
                {fiscalUiEnabled && (
                    <div className="mt-4 border-t border-[#2b2b2b] pt-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#f5f5f5] font-semibold">
                                    {isEcfMode ? "Factura electrónica e-CF" : "Factura fiscal (NCF)"}
                                </p>
                                <p className="text-xs text-[#ababab]">
                                    {isEcfMode
                                        ? "Selecciona si será consumo electrónico o crédito fiscal electrónico."
                                        : "Solo si el cliente lo solicita y tu empresa tiene NCF configurado."}
                                </p>
                            </div>

                            {/* ✅ Switch estilo Uber Eats */}
                            <Switch
                                checked={wantsFiscal}
                                disabled={!fiscalUiCapable}
                                onChange={(v) => setWantsFiscal(v)}
                            />
                        </div>

                        {!fiscalUiCapable && (
                            <p className="text-xs text-red-400 mt-2">
                                {isEcfMode
                                    ? "Este tenant no tiene e-CF listo para emitir."
                                    : "Este tenant no tiene NCF habilitado/configurado."}
                            </p>
                        )}

                        {/* ✅ SOLO mostrar campos cuando el switch está activo */}
                        {wantsFiscal && fiscalUiCapable && (
                            <>
                                <div className="mt-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-[#ababab]">Tipo NCF</span>
                                        {isEcfMode ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-[#ababab]">Tipo e-CF</span>
                                                <select
                                                    value={ecfDocType}
                                                    onChange={(e) => setEcfDocType(e.target.value)}
                                                    className="bg-[#1f1f1f] rounded px-3 py-2 text-[#f5f5f5] outline-none"
                                                >
                                                    {e32Enabled && (
                                                        <option value="e32">e32 - Factura de consumo electrónica</option>
                                                    )}
                                                    {e31Enabled && (
                                                        <option value="e31">e31 - Crédito fiscal electrónico</option>
                                                    )}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-[#ababab]">Tipo NCF</span>
                                                <select
                                                    value={ncfType}
                                                    onChange={(e) => setNcfType(e.target.value)}
                                                    className="bg-[#1f1f1f] rounded px-3 py-2 text-[#f5f5f5] outline-none"
                                                >
                                                    {allowedNcfTypes.map((t) => (
                                                        <option key={t} value={t}>
                                                            {t === "B01" ? "B01 - Crédito Fiscal" : "B02 - Consumidor Final"}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <p className="text-xs text-[#ababab] mt-2">
                                            {isEcfMode
                                                ? ecfDocType === "e31"
                                                    ? "Para e31 debes agregar el RNC y razón social del cliente."
                                                    : "Para e32 los datos del cliente son opcionales, salvo casos especiales."
                                                : "Recomendación: agrega RNC/Cédula para completar los datos."}
                                            {dgiiLoading ? " Buscando en DGII..." : ""}
                                            {!dgiiLoading && dgiiStatus === "FOUND" ? " Encontrado." : ""}
                                            {!dgiiLoading && dgiiStatus === "NOT_FOUND" ? " No encontrado." : ""}
                                            {!dgiiLoading && dgiiStatus === "ERROR" ? " Error consultando." : ""}
                                        </p>
                                    </div>

                                    <p className="text-xs text-[#ababab] mt-2">
                                        Recomendación: agrega RNC/Cédula para completar los datos.
                                        {dgiiLoading ? " Buscando en DGII..." : ""}
                                        {!dgiiLoading && dgiiStatus === "FOUND" ? " Encontrado." : ""}
                                        {!dgiiLoading && dgiiStatus === "NOT_FOUND" ? " No encontrado." : ""}
                                        {!dgiiLoading && dgiiStatus === "ERROR" ? " Error consultando." : ""}
                                    </p>

                                    {/* ✅ Mensaje claro cuando no autocompleta */}
                                    {!dgiiLoading && (dgiiStatus === "NOT_FOUND" || dgiiStatus === "ERROR") && (
                                        <p className="text-xs text-yellow-300 mt-1">
                                            No se pudo autocompletar, introduzca el nombre manualmente.
                                        </p>
                                    )}
                                </div>

                                <p className="text-xs text-[#ababab] mb-2 mt-3">Datos del cliente</p>

                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={customerRnc}
                                        onChange={(e) => setCustomerRnc(e.target.value)}
                                        onBlur={() => lookupDgii(customerRnc)}
                                        className="w-full bg-[#1f1f1f] rounded px-3 py-2 text-[#f5f5f5] outline-none"
                                        placeholder="RNC / Cédula"
                                    />
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full bg-[#1f1f1f] rounded px-3 py-2 text-[#f5f5f5] outline-none"
                                        placeholder="Nombre / Razón Social"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 px-5 mt-4">
                {/* 1) Ticket (NO tocar lógica; solo setear submitAction antes) */}
                <button
                    type="button"
                    onClick={() => {
                        setSubmitAction("ticket");
                        handlePlaceOrder("ticket");
                    }}
                    disabled={orderMutation.isPending || (wantsFiscal && fiscalCapable)}
                    className={`px-4 py-3 w-full rounded-lg font-semibold text-lg border border-gray-800/50
      ${
                        wantsFiscal && fiscalCapable
                            ? "bg-[#1f1f1f] text-[#666] cursor-not-allowed"
                            : "bg-[#1f1f1f] text-white hover:bg-[#2b2b2b]"
                    }`}
                    title={wantsFiscal && fiscalCapable ? "Con NCF se imprime factura, no ticket." : "Imprimir ticket"}
                >
                    Ticket
                </button>

                {/* 2) Facturar (abre invoice sí o sí) */}
                <button
                    type="button"
                    onClick={() => {
                        setSubmitAction("invoice");
                        handlePlaceOrder("invoice");
                    }}
                    disabled={orderMutation.isPending}
                    className="px-4 py-3 w-full rounded-lg bg-[#f6b100] text-[#1f1f1f] font-semibold text-lg"
                >
                    {ecfFeatureEnabled ? "Facturar" : "Facturar"}
                </button>

                {/* 3) Actualizar: oculto en canal rápido */}
                {!isQuickChannel && (
                    <button
                        type="button"
                        onClick={() => {
                            setSubmitAction("update");
                            handlePlaceOrder("update");
                        }}
                        disabled={orderMutation.isPending}
                        className="px-4 py-3 w-full rounded-lg bg-[#1f1f1f] text-white font-semibold text-lg border border-gray-800/50 hover:bg-[#2b2b2b]"
                    >
                        Actualizar
                    </button>
                )}
            </div>
            <AnimatePresence>
                {leaveTableModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={closeLeaveTableModal}
                    >
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 16 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#151515] via-[#101010] to-[#070707] shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-white/10">
                                <h3 className="text-xl font-bold text-white">
                                    ¿Qué deseas hacer con esta mesa?
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-white/60">
                                    Tienes productos agregados. Puedes guardarlos en la mesa para continuar luego o borrarlos antes de salir.
                                </p>
                            </div>

                            <div className="p-6">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 mb-5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-white/50">Productos</span>
                                        <span className="font-semibold text-white">
                                {itemsCount}
                            </span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm mt-3">
                                        <span className="text-white/50">Total actual</span>
                                        <span className="font-semibold text-[#f6b100]">
                                RD${num(subtotal).toFixed(2)}
                            </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSaveItemsAndLeave}
                                        disabled={leaveTableModal.loading || orderMutation.isPending}
                                        className="w-full px-4 py-3 rounded-2xl bg-[#f6b100] text-black font-bold hover:bg-[#ffd633] transition-all disabled:opacity-50"
                                    >
                                        {leaveTableModal.loading ? "Guardando..." : "Guardar en la mesa"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDiscardItemsAndLeave}
                                        disabled={leaveTableModal.loading || orderMutation.isPending}
                                        className="w-full px-4 py-3 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                    >
                                        Borrar y salir
                                    </button>

                                    <button
                                        type="button"
                                        onClick={closeLeaveTableModal}
                                        disabled={leaveTableModal.loading || orderMutation.isPending}
                                        className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-[#1a1a1a] text-white font-semibold hover:bg-[#242424] transition-all disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {showCashChangeBox && (
                <div className="px-5 mt-4">
                    <div className="rounded-2xl border border-[#2b2b2b] bg-gradient-to-br from-[#151515] to-[#0f0f0f] p-4 shadow-lg">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div>
                                <p className="text-sm text-[#f5f5f5] font-semibold">Cambio en efectivo</p>
                                <p className="text-xs text-[#ababab]">
                                    Ingresa cuánto entregó el cliente para calcular la devolución.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setCashReceived(num(totalToPay).toFixed(2))}
                                className="px-3 py-2 rounded-lg bg-[#f6b100] text-[#111] text-xs font-bold hover:opacity-90"
                            >
                                Exacto
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-[#ababab] mb-1">Monto recibido</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={cashReceived}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^\d.]/g, "");
                                        setCashReceived(val);
                                    }}
                                    className="w-full bg-[#1f1f1f] border border-[#2b2b2b] rounded-xl px-4 py-3 text-[#f5f5f5] outline-none focus:ring-1 focus:ring-[#f6b100]"
                                    placeholder="Ej: 1000"
                                />
                            </div>

                            <div className="rounded-xl bg-[#1f1f1f] border border-[#2b2b2b] px-4 py-3">
                                <p className="text-xs text-[#ababab]">A devolver</p>
                                <p className="text-2xl font-bold text-[#f6b100]">
                                    RD${cashChange.toFixed(2)}
                                </p>

                                {cashReceivedAmount > 0 && cashMissing > 0 && (
                                    <p className="text-xs text-red-400 mt-1">
                                        Falta RD${cashMissing.toFixed(2)}
                                    </p>
                                )}

                                {cashReceivedAmount > 0 && cashMissing <= 0 && (
                                    <p className="text-xs text-green-400 mt-1">
                                        Monto suficiente para facturar.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showTicket && orderInfo && (
                <Ticket
                    order={orderInfo}
                    onClose={() => {
                        itemsToPrintRef.current = [];
                        setItemsToPrint([]);
                        setShowTicket(false);
                    }}
                />
            )}
            {showProductionFallback && productionFallbackTickets.length > 0 && (
                <Ticket
                    order={productionFallbackTickets[0].order}
                    title={productionFallbackTickets[0].title}
                    printerCategory={productionFallbackTickets[0].printerCategory}
                    onClose={() => {
                        setProductionFallbackTickets((prev) => {
                            const next = prev.slice(1);

                            if (!next.length) {
                                setShowProductionFallback(false);
                                itemsToPrintRef.current = [];
                                setItemsToPrint([]);
                                setIsOrderModalOpen(false);
                                navigate("/orders"); // o cambia por "/tables" / "/mesas" si ese es tu route real
                            }

                            return next;
                        });
                    }}
                />
            )}

            {showInvoice && orderInfo && (
                <Invoice
                    order={orderInfo}
                    setShowInvoice={setShowInvoice}
                    onClose={handleInvoiceClose}
                />
            )}
        </>
    );
};

    export default Bill;
