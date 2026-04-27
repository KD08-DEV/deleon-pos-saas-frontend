import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

import { getTotalPrice, removeAllItems } from "../../redux/slices/cartSlice";
import { updateOrder, addOrder } from "../../https";
import Invoice from "../invoice/Invoice";
import Ticket from "../ticket/Ticket";

import useTenant from "../../hooks/useTenant";
import api from "../../lib/api";


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


const Bill = ({ orderId, order, setIsOrderModalOpen }) => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const draft = useSelector((state) => state.customer);
    const draftTable = draft?.table || null;
    const draftOrderSource = draft?.orderSource || "DINE_IN";

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


    const [showInvoice, setShowInvoice] = useState(false);
    const [orderInfo, setOrderInfo] = useState(null);
    const [itemsToPrint, setItemsToPrint] = useState([]);
    const [lastPayloadItems, setLastPayloadItems] = useState([]);

    const [customerName, setCustomerName] = useState("");
    const [customerRnc, setCustomerRnc] = useState("");
    const [guests, setGuests] = useState(0);
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");

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
        if (!fiscalEnabledByTenant) setWantsFiscal(false);
    }, [fiscalEnabledByTenant]);

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

        const tipCalc = tipEnabled ? (baseCalc * num(tipPercent || 0)) / 100 : 0;

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
        taxEnabled,
        tipEnabled,
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


    // Si el usuario activa wantsFiscal pero el tenant no puede, lo apagamos y avisamos
    useEffect(() => {
        if (wantsFiscal && !fiscalCapable) {
            setWantsFiscal(false);
            enqueueSnackbar("Este tenant no tiene NCF habilitado/configurado.", {
                variant: "warning",
            });
        }
    }, [wantsFiscal, fiscalCapable]);

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
    const buildOrderPayload = () => {
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

        const basePayload = {
            orderStatus: "En Progreso",
            items,
            paymentMethod: isAppDelivery
                ? (orderSource === "PEDIDOSYA" ? "Pedido Ya" : "Uber Eats")
                : paymentMethod,
            discount: { type: discountType, value: num(discountValue) || 0 },
            bills,
            orderNote: String(orderNote || "").trim(),
            registerId: getActiveRegisterId(),
            paymentStatus: chargeMode === "AT_INVOICE" ? "Pagado" : "Pendiente",
            markAsPaid: chargeMode === "AT_INVOICE",
        };

        // customerDetails (si hay data)
        const hasCustomerData =
            String(customerName || "").trim() ||
            String(customerRnc || "").trim() ||
            Number(guests || 0) > 0;

        if (hasCustomerData) {
            basePayload.customerDetails = {
                name: String(customerName || "").trim(),
                rnc: String(customerRnc || "").trim(),
                guests: Number(guests || 0),
                phone: String(customerPhone || "").trim(),
                address: String(customerAddress || "").trim(),
            };
        }

        // fiscal (si aplica)
        if (wantsFiscal && fiscalCapable) {
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
            if (chargeMode === "AT_INVOICE") {
                basePayload.paymentStatus = "Pagado";
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
                table: payload?.table ?? draftTable ?? null,
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

            if (!orderId && createdId) {
                navigate(`/menu?orderId=${createdId}`, { replace: true });
            }

            const fallback = buildOrderPayload();

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

            const currentPrintTarget = printTargetRef.current;



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
            setOrderInfo(invoice);

            if (currentPrintTarget !== "ticket") {
                itemsToPrintRef.current = [];
                setItemsToPrint([]);
            }

            if (currentPrintTarget === "update") {
                setIsOrderModalOpen(false);
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

                return;
            }            enqueueSnackbar("Orden actualizada correctamente.", { variant: "success" });
            setShowInvoice(true);
            dispatch(removeAllItems());
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
        if (wantsFiscal && fiscalCapable) {
            const doc = String(customerRnc || "").replace(/[^\d]/g, "");
            if (!doc) {
                enqueueSnackbar("Para factura fiscal, agrega RNC/Cédula del cliente.", {
                    variant: "warning",
                });
                return;
            }
        }

        const payload = buildOrderPayload();
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

        const nextTarget = wantsFiscal && fiscalCapable ? "invoice" : target;

        submitActionRef.current = target;
        printTargetRef.current = nextTarget;

        setPrintTarget(nextTarget);

        orderMutation.mutate(payload);
    };

    const handleInvoiceClose = () => {
        setShowInvoice(false);
        setIsOrderModalOpen(false);
        navigate("/orders");
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



                {/* ✅ PROPINA (siempre visible) */}
                {tipEnabledByTenant && (
                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#ababab]">Propina</span>
                        <input
                            type="checkbox"
                            checked={tipEnabled}
                            onChange={(e) => setTipEnabled(e.target.checked)}
                        />
                    </div>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={tipPercent}
                        disabled={!tipEnabled}
                        onChange={(e) => setTipPercent(Number(e.target.value) || 0)}
                        className="w-20 bg-[#1f1f1f] rounded px-3 py-2 text-[#f5f5f5] outline-none disabled:opacity-40"
                    />
                </div>
                )}

                {/* ✅ ITBIS (solo si el tenant lo permite) */}
                {taxEnabledByTenant && (
                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[#ababab]">Tax (ITBIS)</span>
                            <input
                                type="checkbox"
                                checked={taxEnabled}
                                onChange={(e) => setTaxEnabled(e.target.checked)}
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
                        <span>Propina</span>
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

            <div className="flex items-center justify-between gap-4 px-5 mt-4">
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
                            className={`px-4 py-3 w-full rounded-lg font-semibold ${
                                paymentMethod === "Efectivo"
                                    ? "bg-[#2b2b2b] text-white"
                                    : "bg-[#1f1f1f] text-[#ababab]"
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
                            className={`px-4 py-3 w-full rounded-lg font-semibold ${
                                paymentMethod === "Tarjeta"
                                    ? "bg-[#2b2b2b] text-white"
                                    : "bg-[#1f1f1f] text-[#ababab]"
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
                            className={`px-4 py-3 w-full rounded-lg font-semibold ${
                                paymentMethod === "Transferencia"
                                    ? "bg-[#2b2b2b] text-white"
                                    : "bg-[#1f1f1f] text-[#ababab]"
                            }`}
                        >
                            Transferencia
                        </button>
                    </>
                )}
            </div>


            {/* Datos del cliente + Fiscal */}
            <div className="px-5 mt-4">
                {/* FACTURA FISCAL (solo si el tenant lo permite) */}
                {fiscalEnabledByTenant && (
                    <div className="mt-4 border-t border-[#2b2b2b] pt-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#f5f5f5] font-semibold">Factura fiscal (NCF)</p>
                                <p className="text-xs text-[#ababab]">
                                    Solo si el cliente lo solicita y tu empresa tiene NCF configurado.
                                </p>
                            </div>

                            {/* ✅ Switch estilo Uber Eats */}
                            <Switch
                                checked={wantsFiscal}
                                disabled={!fiscalCapable}
                                onChange={(v) => setWantsFiscal(v)}
                            />
                        </div>

                        {!fiscalCapable && (
                            <p className="text-xs text-red-400 mt-2">
                                Este tenant no tiene NCF habilitado/configurado.
                            </p>
                        )}

                        {/* ✅ SOLO mostrar campos cuando el switch está activo */}
                        {wantsFiscal && fiscalCapable && (
                            <>
                                <div className="mt-3">
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
                    Facturar
                </button>

                {/* 3) Actualizar (solo actualizar y enviar a /orders) */}
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
            </div>
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
