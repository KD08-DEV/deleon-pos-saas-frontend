import useRncLookup from "../../hooks/useRncLookup";
import OrderCorrectionEditor from "../orders/OrderCorrectionEditor";
import { hasOrdinaryInvoice, invoiceHasChanges, invoicePreview } from "../../lib/ordinaryInvoice";
import { refreshSalesViews } from "../../lib/refreshSalesViews";
import { refreshTableViews } from "../../lib/tableOperations";
import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

import { getTotalPrice, removeAllItems } from "../../redux/slices/cartSlice";
import {
    clearDraftContext,
    removeCustomer,
} from "../../redux/slices/customerSlice";
import { updateOrder, addOrder, updateTable } from "../../https";
import Invoice from "../invoice/Invoice";
import Ticket from "../ticket/Ticket";

import useTenant from "../../hooks/useTenant";
import {
    formatMoney,
    getCurrencySymbol,
    getTenantLocalization,
} from "../../lib/localization";
import api, { getScope } from "../../lib/api";
import {
    useTranslation,
} from "react-i18next";

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
function Switch({ checked, onChange, disabled, label }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            role="switch"
            aria-checked={checked}
            aria-label={label}
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
Switch.propTypes = { checked: PropTypes.bool, onChange: PropTypes.func, disabled: PropTypes.bool, label: PropTypes.string };
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
const REGISTER_STORAGE_PREFIX = "deleonsoft_active_register_id";
const LEGACY_REGISTER_STORAGE_KEY = "deleonsoft_active_register_id";

const getRegisterStorageUser = () => {
    try {
        const keys = ["user", "userData", "authUser", "currentUser"];

        for (const key of keys) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;

            const parsed = JSON.parse(raw);

            if (parsed?.user && typeof parsed.user === "object") return parsed.user;
            if (parsed?.userData && typeof parsed.userData === "object") return parsed.userData;
            if (parsed && typeof parsed === "object") return parsed;
        }
    } catch {
        // ignore
    }

    return {};
};

const getRegisterStorageKey = () => {
    const u = getRegisterStorageUser();

    const tenantId =
        u?.tenantId ||
        u?.tenant?.tenantId ||
        u?.tenant?._id ||
        u?.tenant?.id ||
        localStorage.getItem("tenantId") ||
        "noTenant";

    const clientId =
        // Same source the API interceptor uses, not stale user data.
        getScope()?.clientId ||
        localStorage.getItem("clientId") ||
        u?.clientId ||
        u?.client?.clientId ||
        u?.client?._id ||
        "default";

    const userId =
        u?._id ||
        u?.id ||
        u?.user?._id ||
        u?.user?.id ||
        "noUser";

    const host = typeof window !== "undefined" ? window.location.host : "app";

    return [
        REGISTER_STORAGE_PREFIX,
        host,
        String(tenantId || "noTenant"),
        String(clientId || "default"),
        String(userId || "noUser"),
    ].join(":");
};

const getActiveRegisterId = () => {
    try {
        const scopedValue = localStorage.getItem(getRegisterStorageKey());
        const legacyValue = localStorage.getItem(LEGACY_REGISTER_STORAGE_KEY);

        return String(scopedValue || legacyValue || "MAIN")
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
    const [ordinaryCorrection, setOrdinaryCorrection] = useState(null);
    const ordinaryInvoiceLock = useRef(false);
    const [ordinaryInvoiceBusy, setOrdinaryInvoiceBusy] = useState(false);
    const {
        t,
    } =
        useTranslation();
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
        dispatch(removeCustomer());
        enqueueSnackbar(
            t("bill.messages.orderAlreadyClosed"),
            {
                variant: "info",
            }
        );

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
    const orderSource =
        effectiveOrderSource;

    const isAppDelivery = orderSource === "PEDIDOSYA" || orderSource === "UBEREATS";
    const isInternalDelivery = orderSource === "DELIVERY";

    useEffect(() => {
        if (!isAppDelivery) return;

        // Fuerza el método de pago por canal
        if (orderSource === "PEDIDOSYA") setPaymentMethod("Pedido Ya");
        if (orderSource === "UBEREATS") setPaymentMethod("Uber Eats");
    }, [isAppDelivery, orderSource]);




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

    const tenantFeatures =
        tenantInfo?.features ||
        {};

    const localization =
        getTenantLocalization(
            tenantInfo
        );
    const isDominicanTenant =
        String(
            localization
                ?.countryCode ||
            tenantInfo
                ?.localization
                ?.countryCode ||
            "DO"
        )
            .trim()
            .toUpperCase() ===
        "DO";

    const money = (value) =>
        formatMoney(
            value,
            localization
        );

    const currencySymbol =
        getCurrencySymbol(
            localization
        );

    const configuredCommissionRate =
        orderSource === "PEDIDOSYA"
            ? num(
                tenantFeatures
                    ?.orderSources
                    ?.pedidosYa
                    ?.commissionRate ??
                0
            )
            : orderSource === "UBEREATS"
                ? num(
                    tenantFeatures
                        ?.orderSources
                        ?.uberEats
                        ?.commissionRate ??
                    0
                )
                : 0;

    const commissionRate =
        num(
            order?.commissionRate ??
            configuredCommissionRate
        );
    const commissionAmountFromServer = num(order?.commissionAmount);
    const netTotalFromServer = num(order?.netTotal);



    const commissionPct = commissionRate ? Math.round(commissionRate * 100) : 0;
    const creditAccess=useQuery({queryKey:['credit-sale-access',tenantInfo?.tenantId,getScope().clientId],queryFn:async()=>(await api.get('/api/order/credit-access')).data,staleTime:0,refetchInterval:15000,refetchOnWindowFocus:'always',retry:false});
    const canUseCreditSales=creditAccess.data?.canCreateCredit===true&&!creditAccess.isError;

    const discountEnabledByTenant = tenantFeatures?.discount?.enabled === true;
    const tipEnabledByTenant =
        tenantFeatures
            ?.tip
            ?.enabled !==
        false;
    const taxEnabledByTenant =
        typeof tenantInfo
            ?.taxConfig
            ?.enabled ===
        "boolean"
            ? tenantInfo
                .taxConfig
                .enabled
            : tenantFeatures
                ?.tax
                ?.enabled ===
            true;

    const fiscalEnabledByTenant =
        isDominicanTenant &&
        tenantInfo
            ?.fiscal
            ?.enabled === true;

    const chargeMode = tenantInfo?.features?.checkout?.chargeMode || "AT_COMPLETE";

    useEffect(() => {

    }, [tenantInfo, discountEnabledByTenant, taxEnabledByTenant]);

    useEffect(() => {

    }, [tenantInfo]);
    // Fiscal capability (nuevo modelo)


    const fiscalEnabled =
        isDominicanTenant &&
        tenantInfo
            ?.fiscal
            ?.enabled === true;

    const fiscalCapable = useMemo(() => {
        if (!fiscalEnabledByTenant) return false;
        if (!fiscalEnabled) return false;

        const b01 = !!tenantInfo?.fiscal?.ncfConfig?.B01?.active;
        const b02 = !!tenantInfo?.fiscal?.ncfConfig?.B02?.active;

        return b01 || b02;
    }, [tenantInfo, fiscalEnabled, fiscalEnabledByTenant]);

    const tenantAllowedNcfTypes = useMemo(() => {
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
    const ecfRecoveryOrderIdRef = useRef(null); // Previene refacturación por un intento sin confirmar.
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
    const [releaseFromInvoiceLoading, setReleaseFromInvoiceLoading] = useState(false);
    const [confirmReleaseInvoice, setConfirmReleaseInvoice] = useState(false);

    const [itemsToPrint, setItemsToPrint] = useState([]);
    const [lastPayloadItems, setLastPayloadItems] = useState([]);

    const [customerName, setCustomerName] = useState("");
    const [customerRnc, setCustomerRnc] = useState("");
    const [guests, setGuests] = useState(0);
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const clearLocalCheckoutState = () => {
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setManualTip("");
        setCustomerRnc("");
        setGuests(0);

        setOrderNote("");
        setDraftOrderNote("");

        setCashReceived("");

        setDiscountValue(0);

        setWantsFiscal(false);
        setDgiiStatus("");
        setDgiiFound(null);
    };
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



// ======================================================
// TIP MANUAL + IMPUESTOS
// ======================================================

    const [manualTip, setManualTip] =
        useState("");

    const [legalTipEnabled, setLegalTipEnabled] = useState(true);
    const [taxEnabled, setTaxEnabled] =
        useState(true);

    const effectiveOrderId =
        orderId ||
        order?._id ||
        null;
    const {
        data: ecfTenantStatus,
        isLoading: isLoadingEcfTenantStatus,
    } = useQuery({
        // Avoid serving the cached e-CF status of a different branch/user.
        queryKey: ["tenant-ecf-status", getRegisterStorageKey()],
        queryFn: async () => {
            const res = await api.get("/api/order/ecf/status");
            return res.data?.data || null;
        },
        enabled:
        isDominicanTenant,
        staleTime: 30_000,
        refetchOnMount: true,
    });

    const { data: ecfPermissionsResponse } = useQuery({
        queryKey: ["order-ecf-permissions", getRegisterStorageKey()],
        queryFn: async () => (await api.get("/api/order/ecf/permissions")).data,
        enabled: isDominicanTenant && ecfTenantStatus?.enabled === true &&
            ecfTenantStatus?.branch?.prepared === true,
        retry: 0,
        staleTime: 30_000,
    });
    const canIssueEcf = ecfPermissionsResponse?.data?.issue === true;

    // NCF B01/B02: la sede consume los rangos del RNC compartido, pero el
    // backend devuelve solo flags de disponibilidad. Es necesario para Cajera,
    // a quien /api/tenant no expone por diseño los detalles fiscales privados.
    const readonlyNcf = ecfTenantStatus?.legacyNcf;
    const allowedNcfTypes = Array.isArray(readonlyNcf?.availableTypes)
        ? readonlyNcf.availableTypes.filter((t) => t === "B01" || t === "B02")
        : tenantAllowedNcfTypes;
    const effectiveLegacyNcfCapable = readonlyNcf
        ? readonlyNcf.available === true && readonlyNcf.enabled === true && allowedNcfTypes.length > 0
        : fiscalCapable;

    const ecfFeatureEnabled =
        isDominicanTenant && ecfTenantStatus?.enabled === true;
    const ecfCanIssueByTenant =
        isDominicanTenant &&
        ecfTenantStatus
            ?.canIssue === true;
    // El perfil es global pero la ELECCIÓN de usar e-CF pertenece a cada sede.
    // Si la sede lo desactiva, el POS vuelve a NCF B01/B02 configurados.
    const isEcfMode = isDominicanTenant &&
        ecfTenantStatus?.sharedProfileEnabled === true &&
        ecfTenantStatus?.branch?.prepared === true;

    const e31Enabled = ecfTenantStatus?.documentTypes?.e31?.enabled === true;
    const e32Enabled = ecfTenantStatus?.documentTypes?.e32?.enabled === true;

    const electronicFiscalCapable =
        isEcfMode && ecfCanIssueByTenant && canIssueEcf && (e31Enabled || e32Enabled);

    const fiscalUiEnabled = isDominicanTenant && (isLoadingEcfTenantStatus ||
        (isEcfMode ? true : (readonlyNcf ? readonlyNcf.enabled : fiscalEnabledByTenant)));

    const fiscalUiCapable = !isLoadingEcfTenantStatus && ecfTenantStatus != null &&
        (isEcfMode ? electronicFiscalCapable : effectiveLegacyNcfCapable);
    const ecfBlockers = isEcfMode
        ? [
            ...((ecfTenantStatus?.errors || []).map(String)),
            ...(ecfTenantStatus?.branch?.prepared === false ? ["Esta sucursal tiene e-CF desactivado"] : []),
            ...(!canIssueEcf && ecfTenantStatus?.canIssue === true ? ["Tu usuario no tiene permiso para emitir e-CF"] : []),
        ]
        : [];


    const {
        data: orderEcfStatus,
        isLoading: isLoadingOrderEcfStatus,
        refetch: refetchOrderEcfStatus,
    } = useQuery({
        queryKey: ["order-ecf-status", getRegisterStorageKey(), effectiveOrderId],
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
    const fiscalBranchContext = getRegisterStorageKey();
    useEffect(() => {
        // Never carry a checked e-CF/NCF toggle into a different branch.
        setWantsFiscal(false);
        ecfRecoveryOrderIdRef.current = null;
    }, [fiscalBranchContext]);


    useEffect(() => {
        if (!order?._id) {
            setManualTip("");
            return;
        }

        const bills =
            order?.bills ||
            {};

        setLegalTipEnabled(bills.legalTipEnabled !== false);
        const savedTax =
            bills?.taxEnabled;

        const savedTipAmount =
            num(
                bills?.tipAmount ??
                bills?.tip ??
                0
            );

        if (
            typeof savedTax ===
            "boolean"
        ) {
            setTaxEnabled(
                savedTax
            );
        } else {
            setTaxEnabled(
                taxEnabledByTenant
            );
        }

        setManualTip(
            savedTipAmount > 0
                ? String(
                    savedTipAmount
                )
                : ""
        );
    }, [
        order?._id,
        order?.bills,
        taxEnabledByTenant,
    ]);



    useEffect(() => {
        if (!order?._id) return;

        const existingNcfNumber =
            order?.fiscal?.ncfNumber ||
            order?.ncfNumber ||
            "";

        const inferredType =
            inferNcfTypeFromNumber(existingNcfNumber);

        const existingRequested = Boolean(
            order?.fiscal?.requested === true ||
            existingNcfNumber
        );

        setWantsFiscal(existingRequested);

        // Si ya tiene un número NCF, el prefijo del número manda.
        if (inferredType) {
            setNcfType(inferredType);
            return;
        }

        // Solo restaurar el tipo guardado si realmente se había solicitado fiscal.
        // Esto evita cargar el B02 predeterminado de una orden normal.
        if (existingRequested) {
            const savedType = String(
                order?.fiscal?.ncfType ||
                order?.ncfType ||
                ""
            )
                .trim()
                .toUpperCase();

            if (allowedNcfTypes.includes(savedType)) {
                setNcfType(savedType);
            }
        }
    }, [
        order?._id,
        order?.fiscal?.requested,
        order?.fiscal?.ncfType,
        order?.fiscal?.ncfNumber,
        order?.ncfType,
        order?.ncfNumber,
        allowedNcfTypes,
    ]);
    useEffect(() => {
        if (!discountEnabledByTenant) setDiscountValue(0);
    }, [discountEnabledByTenant]);
    useEffect(() => {
        if (
            !tipEnabledByTenant
        ) {
            setManualTip("");
        }
    }, [
        tipEnabledByTenant,
    ]);

    useEffect(() => {
        if (!taxEnabledByTenant) setTaxEnabled(false);
    }, [taxEnabledByTenant]);

    useEffect(() => {
        if (!fiscalUiEnabled) setWantsFiscal(false);
    }, [fiscalUiEnabled]);
    // Totales
    const discountPreview =
        useMemo(() => {
            const value =
                discountType ===
                "percent"
                    ? (
                        subtotal *
                        num(
                            discountValue ||
                            0
                        )
                    ) /
                    100
                    : num(
                        discountValue ||
                        0
                    );

            return Number(
                Math.min(
                    Math.max(
                        value,
                        0
                    ),
                    subtotal
                ).toFixed(2)
            );
        }, [
            subtotal,
            discountType,
            discountValue,
        ]);

    const deliveryFeePreview =
        useMemo(
            () =>
                isInternalDelivery
                    ? Number(
                        Math.max(
                            num(
                                deliveryFee ||
                                0
                            ),
                            0
                        ).toFixed(2)
                    )
                    : 0,
            [
                isInternalDelivery,
                deliveryFee,
            ]
        );
    const taxPreviewItems =
        useMemo(
            () =>
                itemsArray.map(
                    (item) => {
                        const quantity =
                            num(
                                item
                                    .quantity ??
                                1
                            );

                        const dishId =
                            item.dishId ??
                            item.id ??
                            item.dish ??
                            item._id;

                        const qtyType =
                            item.qtyType ||
                            "unit";

                        const weightUnit =
                            qtyType ===
                            "weight"
                                ? (
                                    item
                                        .weightUnit ||
                                    "lb"
                                )
                                : "";

                        const unitPrice =
                            qtyType ===
                            "weight"
                                ? num(
                                    item
                                        .unitPrice ??
                                    item
                                        .pricePerQuantity ??
                                    0
                                )
                                : num(
                                    item
                                        .unitPrice ??
                                    item
                                        .pricePerQuantity ??
                                    item.price ??
                                    0
                                );

                        const lineTotal =
                            qtyType ===
                            "weight"
                                ? num(
                                    item.price ??
                                    (
                                        unitPrice *
                                        quantity
                                    )
                                )
                                : Number(
                                    (
                                        unitPrice *
                                        quantity
                                    ).toFixed(
                                        2
                                    )
                                );

                        return {
                            dishId,

                            dish:
                            dishId,

                            name:
                                item.name ||
                                "Producto",

                            qtyType,

                            weightUnit,

                            quantity,

                            unitPrice,

                            price:
                                Number(
                                    lineTotal.toFixed(
                                        2
                                    )
                                ),

                            productionArea:
                                item
                                    .productionArea ||
                                "kitchen",

                            note:
                                String(
                                    item?.note ||
                                    ""
                                ).trim(),

                            addons:
                                Array.isArray(
                                    item
                                        ?.addons
                                )
                                    ? item.addons
                                    : [],

                            modifiers:
                                Array.isArray(
                                    item
                                        ?.modifiers
                                )
                                    ? item.modifiers
                                    : [],
                        };
                    }
                ),
            [
                itemsArray,
            ]
        );
    const taxPreviewPayload =
        useMemo(
            () => ({
                items:
                taxPreviewItems,

                discountAmount:
                discountPreview,

                deliveryFee:
                deliveryFeePreview,

                legalTipEnabled,
                taxEnabled:
                taxEnabled,

                orderSource:
                orderSource,
            }),
            [
                taxPreviewItems,
                discountPreview,
                deliveryFeePreview,
                taxEnabled,
                legalTipEnabled,
                orderSource,
            ]
        );
    const {
        data: taxPreview,
        isFetching:
            taxPreviewLoading,
    } = useQuery({
        queryKey: [
            "order-tax-preview",
            effectiveOrderId ||
            "draft",
            taxPreviewPayload,
        ],

        queryFn: async () => {
            const res =
                await api.post(
                    "/api/order/tax-preview",
                    taxPreviewPayload
                );

            return (
                res.data?.data ||
                null
            );
        },

        enabled:
            itemsArray.length >
            0,

        staleTime:
            0,

        retry:
            false,
    });
    const discount =
        discountPreview;

    const deliveryFeeCalc =
        deliveryFeePreview;

    const base =
        Number(
            (
                taxPreview
                    ?.subtotalAfterDiscount ??
                Math.max(
                    subtotal -
                    discount,
                    0
                )
            ).toFixed(2)
        );

    const tax =
        Number(
            (
                taxPreview
                    ?.taxTotal ??
                0
            ).toFixed(2)
        );

    const taxBreakdown =
        Array.isArray(
            taxPreview
                ?.taxBreakdown
        )
            ? taxPreview.taxBreakdown
            : [];

    const serviceChargeBreakdown =
        Array.isArray(
            taxPreview
                ?.serviceChargeBreakdown
        )
            ? taxPreview
                .serviceChargeBreakdown
            : [];

    const serviceChargeTotal =
        num(
            taxPreview
                ?.serviceChargeTotal
        );
    const totalBeforeTip =
        Number(
            (
                taxPreview
                    ?.totalBeforeTip ??
                (
                    base +
                    deliveryFeeCalc
                )
            ).toFixed(2)
        );

// Propina RD temporal.
// La sacaremos de aquí en Fase 2C.
// ======================================================
// TIP MANUAL
// ======================================================

    const tip =
        tipEnabledByTenant
            ? Number(
                Math.max(
                    num(
                        manualTip
                    ),
                    0
                ).toFixed(2)
            )
            : 0;
    const total =
        Number(
            (
                totalBeforeTip +
                tip
            ).toFixed(2)
        );
    // ======================================================
// BASE REAL PARA COMISION
// ======================================================
//
// Debe coincidir con backend:
//
// taxResult.itemsTotalWithTax
//
// No incluye propina.
// No incluye delivery.
// Funciona con impuestos incluidos y no incluidos.
// ======================================================

    const commissionBasePreview =
        num(
            taxPreview
                ?.itemsTotalWithTax ??
            Math.max(
                totalBeforeTip -
                deliveryFeeCalc,
                0
            )
        );

    const computedCommission =
        useMemo(() => {
            if (!isAppDelivery) {
                return 0;
            }

            const rate =
                num(
                    commissionRate
                );

            if (!rate) {
                return 0;
            }

            const val =
                commissionBasePreview *
                rate;

            return Number(
                val.toFixed(2)
            );
        }, [
            isAppDelivery,
            commissionRate,
            commissionBasePreview,
        ]);

    const commissionAmountEffective = useMemo(() => {
        const serverVal = num(commissionAmountFromServer);
        return serverVal > 0 ? serverVal : computedCommission;
    }, [commissionAmountFromServer, computedCommission]);

    const totalToPay =
        useMemo(
            () =>
                num(total),
            [total]
        );
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
                ? t("bill.customerDisplay.review")
                : t("bill.customerDisplay.empty"),
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
                    ? "Esta sucursal no tiene e-CF habilitado o el perfil fiscal aún no está listo."
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

    const rncLookup=useRncLookup({value:customerRnc,name:customerName,onName:setCustomerName,enabled:isDominicanTenant});
    useEffect(()=>{setDgiiLoading(rncLookup.loading);setDgiiStatus(rncLookup.status);setDgiiFound(rncLookup.record);},[rncLookup.loading,rncLookup.status,rncLookup.record]);

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
            subtotal:
                num(
                    subtotal
                ),

            discount:
                num(
                    discount
                ),

            tax:
                num(
                    tax
                ),

            serviceChargeTotal:
                num(
                    serviceChargeTotal
                ),

            serviceChargeBreakdown:
            serviceChargeBreakdown,
            // ==========================================
            // TIP MANUAL
            // ==========================================

            tipEnabled:
                tip > 0,

            tip:
                num(
                    tip
                ),

            tipAmount:
                num(
                    tip
                ),


            // ==========================================

            totalWithTax:
                num(
                    total
                ),

            taxEnabled,
            legalTipEnabled,

            deliveryFee:
                num(
                    deliveryFeeCalc
                ),

            cashReceived:
                paymentMethod ===
                "Efectivo"
                    ? num(
                        cashReceivedAmount
                    )
                    : 0,

            cashChange:
                paymentMethod ===
                "Efectivo"
                    ? num(
                        cashChange
                    )
                    : 0,
        };

        const action = String(target || "").trim().toLowerCase();
        const isInvoiceSubmit = action === "invoice";
        const shouldGenerateInternalInvoiceNumber = action === "invoice";

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
// Solo Facturar genera número de factura real.
// Ticket y Actualizar usan operationNumber desde el backend.
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
        const rawCustomerTaxIdentity =
            draft
                ?.customerTaxIdentity ||
            draft
                ?.taxIdentity ||
            order
                ?.customerDetails
                ?.taxIdentity ||
            null;


        const finalCustomerTaxIdentity =
            rawCustomerTaxIdentity &&
            String(
                rawCustomerTaxIdentity
                    ?.value ||
                ""
            ).trim()
                ? {
                    countryCode:
                        String(
                            rawCustomerTaxIdentity
                                ?.countryCode ||
                            localization
                                ?.countryCode ||
                            ""
                        )
                            .trim()
                            .toUpperCase(),

                    type:
                        String(
                            rawCustomerTaxIdentity
                                ?.type ||
                            "TAX_ID"
                        )
                            .trim()
                            .toUpperCase(),

                    label:
                        String(
                            rawCustomerTaxIdentity
                                ?.label ||
                            rawCustomerTaxIdentity
                                ?.type ||
                            "Tax ID"
                        ).trim(),

                    value:
                        String(
                            rawCustomerTaxIdentity
                                ?.value ||
                            ""
                        ).trim(),
                }
                : (
                    isDominicanTenant &&
                    String(
                        customerRnc ||
                        ""
                    ).trim()
                        ? {
                            countryCode:
                                "DO",

                            type:
                                String(
                                    customerRnc ||
                                    ""
                                )
                                    .replace(
                                        /\D/g,
                                        ""
                                    )
                                    .length ===
                                11
                                    ? "CEDULA"
                                    : "RNC",

                            label:
                                String(
                                    customerRnc ||
                                    ""
                                )
                                    .replace(
                                        /\D/g,
                                        ""
                                    )
                                    .length ===
                                11
                                    ? "Cédula"
                                    : "RNC",

                            value:
                                String(
                                    customerRnc ||
                                    ""
                                ).trim(),
                        }
                        : null
                );


        const legacyCustomerTaxValue =
            finalCustomerTaxIdentity
                ?.countryCode === "DO"
                ? String(
                    finalCustomerTaxIdentity
                        ?.value ||
                    ""
                ).trim()
                : "";
        const hasCustomerData =
            selectedCustomerId ||
            finalCustomerName ||
            finalCustomerPhone ||
            finalCustomerAddress ||
            finalCustomerTaxIdentity
                ?.value ||
            finalGuests > 0;


        if (
            hasCustomerData
        ) {
            basePayload.customerDetails = {
                name:
                    finalCustomerName ||
                    "Consumidor Final",

                phone:
                finalCustomerPhone,

                address:
                finalCustomerAddress,

                guests:
                finalGuests,


                // ==========================================
                // IDENTIFICACIÓN INTERNACIONAL
                // ==========================================

                taxIdentity:
                finalCustomerTaxIdentity,


                // ==========================================
                // DGII LEGACY - SOLO RD
                // ==========================================

                rnc:
                legacyCustomerTaxValue,

                rncCedula:
                legacyCustomerTaxValue,
            };
        }

        // Explicitly tell backend the cashier did NOT request a fiscal NCF
        // (or an e-CF) for this invoice; don't inherit an old draft toggle.
        if (isInvoiceSubmit && isDominicanTenant) {
            basePayload.fiscal = { requested: false, ecfDocumentType: null, ncfType: null };
        }
        // fiscal (si aplica)
        if (
            isDominicanTenant &&
            target === "invoice" &&
            (isEcfMode || (wantsFiscal && fiscalUiCapable))
        ) {
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

                const selectedNcfType = String(ncfType || "")
                    .trim()
                    .toUpperCase();

                const safeNcfType =
                    // Si ya existe un NCF real, no permitimos cambiar su tipo.
                    inferredExistingType ||

                    // Si todavía no existe NCF, respetamos lo seleccionado en pantalla.
                    (allowedNcfTypes.includes(selectedNcfType)
                        ? selectedNcfType
                        : null) ||

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
                // ==========================================
                // CAMPOS LEGACY / COMPATIBILIDAD
                // ==========================================

                subtotal:
                    server.bills?.subtotal ??
                    server.bills?.total ??
                    fallback.bills?.subtotal ??
                    0,

                discount:
                    server.bills?.discount ??
                    fallback.bills?.discount ??
                    0,

                tax:
                    server.bills?.tax ??
                    fallback.bills?.tax ??
                    0,

                tip:
                    server.bills?.tip ??
                    server.bills?.tipAmount ??
                    fallback.bills?.tip ??
                    0,

                totalWithTax:
                    server.bills?.totalWithTax ??
                    fallback.bills?.totalWithTax ??
                    0,

                legalTipEnabled: server.bills?.legalTipEnabled ?? fallback.bills?.legalTipEnabled ?? true,
                taxEnabled:
                    server.bills?.taxEnabled ??
                    fallback.bills?.taxEnabled ??
                    true,

                tipEnabled:
                    server.bills
                        ?.tipEnabled ??
                    fallback.bills
                        ?.tipEnabled ??
                    false,

                tipAmount:
                    server.bills
                        ?.tipAmount ??
                    server.bills
                        ?.tip ??
                    fallback.bills
                        ?.tipAmount ??
                    fallback.bills
                        ?.tip ??
                    0,

                deliveryFee:
                    server.bills?.deliveryFee ??
                    fallback.bills?.deliveryFee ??
                    0,

                cashReceived:
                    server.bills?.cashReceived ??
                    fallback.bills?.cashReceived ??
                    0,

                cashChange:
                    server.bills?.cashChange ??
                    fallback.bills?.cashChange ??
                    0,


                // ==========================================
                // MOTOR DE IMPUESTOS NUEVO
                // ==========================================

                taxEngineVersion:
                    server.bills
                        ?.taxEngineVersion ??
                    taxPreview
                        ?.engineVersion ??
                    1,

                subtotalAfterDiscount:
                    server.bills
                        ?.subtotalAfterDiscount ??
                    taxPreview
                        ?.subtotalAfterDiscount ??
                    0,

                netAmount:
                    server.bills
                        ?.netAmount ??
                    taxPreview
                        ?.netAmount ??
                    0,

                deliveryTaxAmount:
                    server.bills
                        ?.deliveryTaxAmount ??
                    taxPreview
                        ?.deliveryTaxAmount ??
                    0,

                taxBreakdown:
                    Array.isArray(
                        server.bills
                            ?.taxBreakdown
                    )
                        ? server.bills
                            .taxBreakdown
                        : (
                            Array.isArray(
                                taxPreview
                                    ?.taxBreakdown
                            )
                                ? taxPreview
                                    .taxBreakdown
                                : []
                        ),
                serviceChargeTotal:
                    server.bills
                        ?.serviceChargeTotal ??
                    taxPreview
                        ?.serviceChargeTotal ??
                    fallback.bills
                        ?.serviceChargeTotal ??
                    0,

                serviceChargeBreakdown:
                    Array.isArray(
                        server.bills
                            ?.serviceChargeBreakdown
                    )
                        ? server.bills
                            .serviceChargeBreakdown
                        : (
                            Array.isArray(
                                taxPreview
                                    ?.serviceChargeBreakdown
                            )
                                ? taxPreview
                                    .serviceChargeBreakdown
                                : (
                                    fallback.bills
                                        ?.serviceChargeBreakdown ||
                                    []
                                )
                        ),
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
                    tax:
                        num(
                            it?.taxAmount ??
                            it
                                ?.taxSnapshot
                                ?.amount ??
                            0
                        ),

                    taxAmount:
                        num(
                            it?.taxAmount ??
                            it
                                ?.taxSnapshot
                                ?.amount ??
                            0
                        ),

                    taxSnapshot:
                        it
                            ?.taxSnapshot ||
                        null,
                };
            });

            const invoice = {
                _id: server._id ?? effectiveId,

                operationSeq:
                    server.operationSeq ??
                    order?.operationSeq ??
                    null,

                operationNumber:
                    server.operationNumber ??
                    order?.operationNumber ??
                    null,

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
                    name:
                        server
                            ?.customerDetails
                            ?.name ??
                        fallback
                            ?.customerDetails
                            ?.name ??
                        "",

                    phone:
                        server
                            ?.customerDetails
                            ?.phone ??
                        fallback
                            ?.customerDetails
                            ?.phone ??
                        "",

                    address:
                        server
                            ?.customerDetails
                            ?.address ??
                        fallback
                            ?.customerDetails
                            ?.address ??
                        "",

                    guests:
                        server
                            ?.customerDetails
                            ?.guests ??
                        fallback
                            ?.customerDetails
                            ?.guests ??
                        0,


                    taxIdentity:
                        server
                            ?.customerDetails
                            ?.taxIdentity ??
                        fallback
                            ?.customerDetails
                            ?.taxIdentity ??
                        null,


                    rnc:
                        server
                            ?.customerDetails
                            ?.rnc ??
                        fallback
                            ?.customerDetails
                            ?.rnc ??
                        "",

                    rncCedula:
                        server
                            ?.customerDetails
                            ?.rncCedula ??
                        fallback
                            ?.customerDetails
                            ?.rncCedula ??
                        "",
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
                dispatch(removeCustomer());

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
                            ? t("bill.production.bar")
                            : area === "kitchen"
                                ? t("bill.production.kitchen")
                                : t("bill.production.production"),
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
                    enqueueSnackbar(t("bill.messages.noNewItems"), {
                        variant: "info",
                    });
                }

                // La orden ya quedó guardada en la mesa.
                // Limpiamos el carrito local para que no se copie a otra mesa.
                dispatch(removeAllItems());
                dispatch(clearDraftContext());
                dispatch(removeCustomer());

                return;
            }
            const checkoutRequestedEcf = currentPrintTarget === "invoice" &&
                ["31", "32"].includes(String(fallback?.fiscal?.ecfDocumentType || "").replace(/^e/i, ""));
            // A fresh GET of the order does not populate the separate ECF document.
            // Resolve the authoritative order ECF record before printing a QR.
            let ecfFromBackend = res?.data?.data?.ecf || server?.ecf || null;
            if (checkoutRequestedEcf && effectiveId) {
                try {
                    const status = (await api.get(`/api/order/${encodeURIComponent(String(effectiveId))}/ecf`)).data;
                    if (status?.exists === true && status?.data?.eNCF) {
                        ecfFromBackend = { exists:true, ...status.data };
                    }
                } catch (statusError) {
                    // Never fabricate an ECF. The original issue response may still
                    // contain a complete document; otherwise the guard below blocks it.
                    console.warn("[BILL] No fue posible consultar el e-CF emitido:", statusError?.message);
                }
            }
            if (checkoutRequestedEcf && (!ecfFromBackend?.exists || !ecfFromBackend?.eNCF || !ecfFromBackend?.qrUrl)) {
                ecfRecoveryOrderIdRef.current = effectiveId || "revisar orden";
                enqueueSnackbar(`No se confirmó el e-CF de la orden ${ecfRecoveryOrderIdRef.current}. Consulta su estado antes de reintentar; NO factures nuevamente.`, { variant: "error", autoHideDuration: 12000 });
                return;
            }
            if (ecfFromBackend?.error) {
                enqueueSnackbar(
                    ecfFromBackend.message === "E32_OVER_250K_REQUIRES_BUYER_DOCUMENT"
                        ? "Para facturar e32 por RD$250,000 o más debes agregar RNC/Cédula válido del comprador."
                        : ecfFromBackend.message || "No se pudo emitir el e-CF. La factura no debe imprimirse.",
                    { variant: "error" }
                );

                return;
            }

            enqueueSnackbar(t("bill.messages.invoiceGenerated"), { variant: "success" });

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
                message: t(
                    "bill.customerDisplay.paid"
                ),
            });

// La factura ya cerró la orden. Limpiamos el contexto local para que
// al volver a mesas no se reutilicen los productos de esta mesa.
            dispatch(removeAllItems());
            dispatch(clearDraftContext());
            dispatch(removeCustomer());
            clearLocalCheckoutState();

            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["tables"] });
            queryClient.invalidateQueries({ queryKey: ["cash-session"] });
        },
        onError: (error) => {
            const detail = error?.response?.data || {};
            if (detail.code === "ECF_DOCUMENT_EXISTS" && isEcfMode) {
                void openIssuedEcfForPrint();
                return;
            }
            if (detail.code === "ECF_ISSUE_REQUIRES_RECOVERY") {
                ecfRecoveryOrderIdRef.current = detail.orderId || "pendiente";
                enqueueSnackbar(`Orden ${detail.orderId || "pendiente"}: el e-CF requiere recuperación. Consulta su estado; NO vuelvas a cobrar ni facturar. ${detail.message || ""}`, {variant:"error",autoHideDuration:16000});
                return;
            }
            enqueueSnackbar(detail.code || detail.message || error?.message || "No fue posible procesar la factura", {variant:"error"});
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

            enqueueSnackbar(
                t(
                    "bill.messages.paymentUpdated"
                ),
                {
                    variant: "success",
                }
            );
        },

    });




    // 12.8.4.1: reimpresión NO realiza POST/PUT, no cambia pago ni consume e-NCF.
    const openIssuedEcfForPrint = async () => {
        const id = effectiveOrderId;
        if (!id) { enqueueSnackbar("No se encontró la orden original.", {variant:"warning"}); return; }
        try {
            const [orderResponse, statusResponse] = await Promise.all([
                api.get(`/api/order/${encodeURIComponent(String(id))}`),
                api.get(`/api/order/${encodeURIComponent(String(id))}/ecf`),
            ]);
            const original = orderResponse?.data?.data;
            const result = statusResponse?.data;
            const ecf = result?.data;
            if (!original || result?.exists !== true || !ecf?.eNCF ||
                !["accepted", "accepted_with_observation"].includes(String(ecf.status||"").toLowerCase())) {
                enqueueSnackbar("El e-CF todavía no está aceptado. Revisa su estado antes de imprimir.", {variant:"warning"});return;
            }
            setOrderInfo({ ...original,
                ecf:{...(original?.ecf||{}),...ecf,exists:true},
                subTotal:original?.bills?.subtotal, taxAmount:original?.bills?.tax,
                discountAmount:original?.bills?.discount,tipAmount:original?.bills?.tipAmount,
                totalAmount:original?.bills?.totalWithTax,
                facturaNo:original?.fiscal?.invoiceNumber||original?.invoiceNumber||original?.facturaNo,
            });
            setShowInvoice(true);
        } catch(e) {enqueueSnackbar(e?.response?.data?.code||e?.message||"No se pudo recuperar la factura original", {variant:"error"});}
    };

    const openOrdinaryInvoice = async () => {
        if (ordinaryInvoiceLock.current) return;
        ordinaryInvoiceLock.current = true;
        setOrdinaryInvoiceBusy(true);
        try {
            const response = await api.get(`/api/order/${encodeURIComponent(String(effectiveOrderId))}`);
            const original = response?.data?.data;
            if (!original?._id) throw Error("No se encontró la factura original.");
            const draft = buildOrderPayload("invoice");
            if (invoiceHasChanges(original, draft)) {
                setOrdinaryCorrection({order:original,initialValues:draft});
            } else {
                setOrderInfo(invoicePreview(original));
                setShowInvoice(true);
            }
        } catch (error) {
            enqueueSnackbar(error?.response?.data?.message || "No se pudo recuperar la factura.", {variant:"error"});
        } finally { ordinaryInvoiceLock.current = false; setOrdinaryInvoiceBusy(false); }
    };

    const handlePlaceOrder = (target = "invoice") => {
        if (target === "invoice" && !isEcfMode && !hasExistingEcf && effectiveOrderId && hasOrdinaryInvoice(order)) {
            void openOrdinaryInvoice();
            return;
        }
        if (target === "invoice" && hasExistingEcf) {
            void openIssuedEcfForPrint(); // mismo e-NCF + mismo QR, nunca emisión nueva
            return;
        }
        // Every Invoice from an e-CF enabled branch MUST be electronic. Do not
        // send an ordinary invoice if the profile/permissions are incomplete.
        if (target === "invoice" && isEcfMode && !fiscalUiCapable) {
            enqueueSnackbar(`No se puede generar e-CF en esta sucursal: ${ecfBlockers.join("; ") || "emisor, tipos e-CF o permiso sin configurar"}. Revisa Configuración fiscal en la sucursal principal.`,
                {variant:"error",autoHideDuration:12000});
            return;
        }
        if (target === "invoice" && isLoadingEcfTenantStatus) {
            enqueueSnackbar("Consultando el estado fiscal de la sucursal. Intenta de nuevo después de cargarlo.", {variant:"warning"});
            return;
        }
        if (target === "invoice" && ecfRecoveryOrderIdRef.current) {
            enqueueSnackbar(`La orden ${ecfRecoveryOrderIdRef.current} necesita revisión de e-CF. No repitas el cobro: consulta la orden original.`, {variant:"error",autoHideDuration:12000});
            return;
        }
        if (!canUseCreditSales && paymentMethod === "Credito") {
            setPaymentMethod("Efectivo");

            enqueueSnackbar(t(
                "bill.messages.creditNotAllowed"
            ), {
                variant: "warning",
            });

            return;
        }
        if (paymentMethod === "Credito" && !selectedCustomerId) {
            enqueueSnackbar(t(
                "bill.messages.creditNotAllowed"
            ), {
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
            isDominicanTenant &&
            targetAction ===
            "invoice" &&
            isEcfMode &&
            num(total) >=
            250000 &&
            ![
                9,
                11,
            ].includes(
                buyerDocForEcf
                    .length
            )
        ) {
            enqueueSnackbar(
                "Para facturar e32 por RD$250,000 o más debes agregar RNC/Cédula válido del comprador.",
                {
                    variant:
                        "warning",
                }
            );

            return;
        }
        if (
            isDominicanTenant &&
            (isEcfMode || wantsFiscal) &&
            fiscalUiCapable
        ) {
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
            enqueueSnackbar(
                t(
                    "bill.messages.noItems"
                ),
                {
                    variant: "warning",
                }
            );
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
        setConfirmReleaseInvoice(false);
        setShowInvoice(false);
        setIsOrderModalOpen(false);

// La factura ya fue generada.
// La mesa debe seguir ocupada hasta presionar "Desocupar mesa".
// Limpiamos solo el carrito/draft local para evitar reutilizar productos.
        dispatch(removeAllItems());
        dispatch(removeCustomer());
        dispatch(clearDraftContext());
        clearLocalCheckoutState();

        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["tables"] });
        queryClient.invalidateQueries({ queryKey: ["cash-session"] });

        navigate("/mesas", { replace: true });
    };

    const handleFinishAndReleaseTable = () => {
        if (releaseFromInvoiceLoading) return;
        setConfirmReleaseInvoice(true);
    };

    const releaseInvoiceLock = useRef(false);
    const confirmFinishAndReleaseTable = async () => {
        if (releaseInvoiceLock.current || releaseFromInvoiceLoading) return;
        const invoiceOrderId = orderInfo?._id || orderId || order?._id || null;
        if (!invoiceOrderId) {
            enqueueSnackbar("No se pudo identificar la orden facturada.", { variant: "error" });
            return;
        }
        releaseInvoiceLock.current = true;
        try {
            setReleaseFromInvoiceLoading(true);
            // Endpoint dedicado: NO vuelve a facturar ni modifica XML, NCF,
            // pagos o detalles. La mesa se libera en servidor con scope.
            await api.post(`/api/order/${encodeURIComponent(String(invoiceOrderId))}/close-and-vacate`);
            await refreshTableViews(queryClient);
            setConfirmReleaseInvoice(false);
            handleInvoiceClose();
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["orders"] }),
                queryClient.invalidateQueries({ queryKey: ["tables"] }),
                queryClient.invalidateQueries({ queryKey: ["cash-session"] }),
                queryClient.invalidateQueries({ queryKey: ["home-summary"] }),
            ]);
            enqueueSnackbar(t("bill.messages.closeTableSuccess", "Orden cerrada y mesa desocupada."), { variant: "success" });
        } catch (e) {
            const code = e?.response?.data?.code;
            const messages = {
                ORDER_NOT_INVOICED: "Esta orden aún no está facturada o pagada.",
                ORDER_NOT_ELIGIBLE_TO_RELEASE: "No se puede desocupar una orden borrador o cancelada.",
                TABLE_LINKED_TO_ANOTHER_ORDER: "La mesa pertenece a otra orden. Actualiza la lista antes de continuar.",
                TABLE_RELEASE_CONFLICT: "La mesa cambió durante el cierre. Vuelve a intentarlo.",
                TABLE_NOT_FOUND: "La mesa de esta orden ya no está disponible.",
                TABLE_RELEASE_PERMISSION_DENIED: "No tienes autorización para cerrar esta mesa.",
            };
            console.error("[BILL] Cerrar y desocupar:", code || e?.response?.data || e);
            enqueueSnackbar(messages[code] || t("bill.messages.closeTableError", "No se pudo cerrar y desocupar la mesa."), { variant: "error" });
        } finally {
            releaseInvoiceLock.current = false;
            setReleaseFromInvoiceLoading(false);
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
            dispatch(removeCustomer());
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
            dispatch(removeCustomer());
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
                e?.response?.data?.message || t("bill.messages.deleteTableItemsError"),
                { variant: "error" }
            );
        }
    };


    return (
        <>
            <div className="flex items-center justify-between px-5 mt-2">
                <p className="text-xs text-[#ababab] font-medium mt-2">
                    {t("bill.items")}({itemsCount})
                </p>
                <h1 className="text-[#f5f5f5] text-md font-bold">
                    {money(subtotal)}
                </h1>
            </div>
            {/* Nota de la orden */}
            <div className="mt-3 rounded-lg border border-gray-800/50 bg-[#111111] p-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                        {t("bill.note")}
                    </span>

                    <button
                        type="button"
                        onClick={() => {
                            setDraftOrderNote(orderNote || "");
                            setIsNoteOpen(true);
                        }}
                        className="px-3 py-2 rounded-lg font-semibold bg-[#1f1f1f] text-[#ababab] hover:bg-[#2b2b2b] hover:text-white"
                    >
                        {orderNote?.trim()
                            ? t("bill.edit")
                            : t("bill.add")
                        }
                    </button>
                </div>

                {orderNote?.trim() ? (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                        {orderNote}
                    </p>
                ) : (
                    <p className="text-xs text-gray-500 mt-2">{t("bill.noNote")}</p>
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
                            <h3 className="text-white text-lg font-semibold">
                                {t("bill.orderNote")}
                            </h3>

                            <textarea
                                value={draftOrderNote}
                                onChange={(e) => setDraftOrderNote(e.target.value)}
                                rows={4}
                                className="mt-4 w-full p-3 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                placeholder={
                                    t(
                                        "bill.notePlaceholder"
                                    )
                                }
                                autoFocus
                            />

                            <div className="flex gap-3 mt-5">
                                <button
                                    type="button"
                                    onClick={() => setIsNoteOpen(false)}
                                    className="px-4 py-3 w-full rounded-lg font-semibold bg-[#1f1f1f] text-[#ababab]"
                                >
                                    {t("common.cancel")}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setOrderNote(draftOrderNote);
                                        setIsNoteOpen(false);
                                    }}
                                    className="px-4 py-3 w-full rounded-lg font-semibold bg-[#2b2b2b] text-white"
                                >
                                    {t("common.save")}
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
                            <span className="text-xs text-[#ababab]">{t("bill.discount")}</span>
                            <button
                                type="button"
                                className={`text-xs px-2 py-1 rounded ${
                                    discountType === "flat"
                                        ? "bg-[#2b2b2b] text-white"
                                        : "bg-transparent text-[#ababab]"
                                }`}
                                onClick={() => setDiscountType("flat")}
                            >
                                {currencySymbol}
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


                {/* TIP MANUAL */}
                {tipEnabledByTenant && (
                <div className="mt-3">
                    <div className="flex items-center justify-between gap-3">

                        <div>
                    <span className="text-xs text-[#ababab]">
                        {t("bill.tip")}
                    </span>

                            <p className="text-[10px] text-[#666] mt-0.5">
                                {t("bill.tipHelp")}
                            </p>
                        </div>

                        <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#777]">
               {currencySymbol}
            </span>

                            <input
                                type="text"
                                inputMode="decimal"
                                value={manualTip}
                                onChange={(e) => {
                                    const value =
                                        e.target.value
                                            .replace(
                                                /[^\d.]/g,
                                                ""
                                            );

                                    setManualTip(
                                        value
                                    );
                                }}
                                onBlur={() => {
                                    if (
                                        !manualTip
                                    ) {
                                        return;
                                    }

                                    setManualTip(
                                        num(
                                            manualTip
                                        ).toFixed(2)
                                    );
                                }}
                                placeholder="0.00"
                                className="w-full bg-[#1f1f1f] rounded px-3 py-2 pl-7 text-[#f5f5f5] text-right outline-none focus:ring-1 focus:ring-[#facc15]"
                            />
                        </div>

                    </div>
                </div>
                )}


                {/* IMPUESTOS */}
                {taxEnabledByTenant && (
                    <div className="flex items-center justify-between mt-3">
                        <div>
            <span className="text-xs text-[#ababab]">
                {isDominicanTenant ? "ITBIS" : t("bill.taxes")}
            </span>

                            <p className="text-[10px] text-[#666] mt-0.5">
                                {t("bill.taxesHelp")}
                            </p>
                        </div>

                        <Switch
                            checked={taxEnabled}
                            label={isDominicanTenant ? "ITBIS" : "Impuestos"}
                            onChange={
                                setTaxEnabled
                            }
                        />
                    </div>
                )}
                {tenantInfo?.features?.serviceCharges?.enabled && tenantInfo.features.serviceCharges.charges?.some(charge => charge.active !== false && charge.code === "LEGAL_TIP") && (
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-[#ababab]">Propina legal</span>
                        <Switch checked={legalTipEnabled} onChange={setLegalTipEnabled} label="Propina legal" />
                    </div>
                )}
                {isInternalDelivery && (
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-[#ababab]">{t("bill.shipping")}</span>
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


                {isAppDelivery &&
                    commissionAmountEffective > 0 && (
                        <div className="flex justify-between">
            <span>
                {t("bill.commission")}{" "}
                {commissionPct > 0
                    ? `(${commissionPct}%)`
                    : ""}
            </span>

                            <span>
                                {money(
                                    commissionAmountEffective
                                )}
                            </span>
                        </div>
                    )}



                <div className="mt-3 text-xs text-[#ababab] space-y-1">

                    {discountEnabledByTenant && (
                        <div className="flex justify-between">
                            <span>{t("bill.discount")}</span>
                            <span>{num(discount).toFixed(2)}</span>
                        </div>
                    )}


                    {taxEnabledByTenant &&
                        taxEnabled && (
                            <>
                                {taxBreakdown.map(
                                    (
                                        row,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                `${row.taxId || "tax"}-${row.includedInPrice}-${index}`
                                            }
                                            className="flex justify-between gap-3"
                                        >
                        <span>
                            {row.name || t("bill.tax")}{" "}

                            {Number(
                                row.ratePercent ||
                                0
                            )}
                            %

                            {row.includedInPrice
                                ? ` (${t("bill.included")})`
                                : ""
                            }
                        </span>

                                            <span>
                                                <span>
                                                {money(
                                                    row.amount
                                                )}
                                            </span>
                        </span>
                                        </div>
                                    )
                                )}


                                {taxPreviewLoading && (
                                    <div className="flex justify-between">
                    <span className="text-[#666]">
{t("bill.recalculatingTaxes")}
                    </span>
                                    </div>
                                )}
                            </>
                        )}

                    {serviceChargeBreakdown.map(
                        (
                            charge,
                            index
                        ) => (
                            <div
                                key={
                                    `${charge.chargeId || "charge"}-${index}`
                                }
                                className="flex justify-between gap-3"
                            >
            <span>
                {charge.name || t("bill.charge")}

                {Number(
                    charge.ratePercent ||
                    0
                )}
                %
            </span>

                                <span>
                                    {money(
                                        charge.amount
                                    )}
                                </span>
                            </div>
                        )
                    )}
                    {tip > 0 && (
                        <div className="flex justify-between">
        <span>
            {t("bill.tip")}
        </span>

                            <span>
                                {money(tip)}
                            </span>
                        </div>
                    )}

                    <div className="flex justify-between text-[#f5f5f5] font-semibold">
                        <span>
                            {t("bill.total")}
                        </span>

                        <span>
                            {currencySymbol}
                            {num(
                                totalToPay
                            ).toFixed(2)}
                        </span>
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
                        title={t("bill.automaticPaymentByChannel")}
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
                                    enqueueSnackbar(
                                        t(
                                            "bill.messages.saveOrderFirst"
                                        ),
                                        {
                                            variant:
                                                "warning",
                                        }
                                    );
                                    return;
                                }

                                if (!hasOrdinaryInvoice(order)) paymentMethodMutation.mutate("Efectivo");
                            }}
                            className={`min-h-[52px] px-3 py-3 w-full rounded-xl font-semibold text-sm sm:text-base leading-tight text-center transition-all ${
                                paymentMethod === "Efectivo"
                                    ? "bg-[#2b2b2b] text-white border border-[#3a3a3a]"
                                    : "bg-[#1f1f1f] text-[#ababab] border border-transparent hover:bg-[#252525]"
                            }`}
                        >
                            {t(
                                "bill.paymentMethods.cash"
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                // ✅ siempre cambia en UI (draft o orden real)
                                setPaymentMethod("Tarjeta");

                                // ✅ solo persiste si ya existe orderId
                                if (orderId) {
                                    if (!hasOrdinaryInvoice(order)) paymentMethodMutation.mutate("Tarjeta");
                                }
                            }}
                            className={`min-h-[52px] px-3 py-3 w-full rounded-xl font-semibold text-sm sm:text-base leading-tight text-center transition-all ${
                                paymentMethod === "Tarjeta"
                                    ? "bg-[#2b2b2b] text-white border border-[#3a3a3a]"
                                    : "bg-[#1f1f1f] text-[#ababab] border border-transparent hover:bg-[#252525]"
                            }`}
                        >
                            {t(
                                "bill.paymentMethods.card"
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                // ✅ siempre cambia en UI (draft o orden real)
                                setPaymentMethod("Transferencia");

                                // ✅ solo persiste si ya existe orderId
                                if (orderId) {
                                    if (!hasOrdinaryInvoice(order)) paymentMethodMutation.mutate("Transferencia");
                                }
                            }}
                            className={`min-h-[52px] px-3 py-3 w-full rounded-xl font-semibold text-sm sm:text-base leading-tight text-center transition-all ${
                                paymentMethod === "Transferencia"
                                    ? "bg-[#2b2b2b] text-white border border-[#3a3a3a]"
                                    : "bg-[#1f1f1f] text-[#ababab] border border-transparent hover:bg-[#252525]"
                            }`}
                        >
                            {t(
                                "bill.paymentMethods.transfer"
                            )}
                        </button>
                        {canUseCreditSales && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPaymentMethod("Credito");

                                    if (orderId) {
                                        if (!hasOrdinaryInvoice(order)) paymentMethodMutation.mutate("Credito");
                                    }
                                }}
                                className={`min-h-[52px] px-3 py-3 w-full rounded-xl font-semibold text-sm sm:text-base leading-tight text-center transition-all ${
                                    paymentMethod === "Credito"
                                        ? "bg-[#2b2b2b] text-white border border-[#3a3a3a]"
                                        : "bg-[#1f1f1f] text-[#ababab] border border-transparent hover:bg-[#252525]"
                                }`}
                            >
                                {t(
                                    "bill.paymentMethods.credit"
                                )}
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
                                        ? "e-CF está activo para esta sucursal: Facturar genera E32 por defecto (o E31 si lo seleccionas)."
                                        : "Solo si el cliente lo solicita y tu empresa tiene NCF configurado."}
                                </p>
                            </div>

                            {/* ✅ Switch estilo Uber Eats */}
                            <Switch
                                checked={isEcfMode || wantsFiscal}
                                disabled={isEcfMode || !fiscalUiCapable}
                                onChange={(v) => setWantsFiscal(v)}
                            />
                        </div>

                        {!fiscalUiCapable && (
                            <p className="text-xs text-red-400 mt-2">
                                {isEcfMode
                                    ? `No se puede emitir e-CF: ${ecfBlockers.join("; ") || "faltan permisos, tipos E31/E32 o configuración del perfil del emisor"}. Configura el emisor desde la principal.`
                                    : "NCF no disponible: comprueba que el RNC y los rangos B01/B02 estén configurados y habilitados."}
                            </p>
                        )}

                        {/* ✅ SOLO mostrar campos cuando el switch está activo */}
                        {(isEcfMode || wantsFiscal) && fiscalUiCapable && (
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
                    disabled={orderMutation.isPending || (wantsFiscal && effectiveLegacyNcfCapable && !isEcfMode)}
                    className={`px-4 py-3 w-full rounded-lg font-semibold text-lg border border-gray-800/50
      ${
                        wantsFiscal && effectiveLegacyNcfCapable
                            ? "bg-[#1f1f1f] text-[#666] cursor-not-allowed"
                            : "bg-[#1f1f1f] text-white hover:bg-[#2b2b2b]"
                    }`}
                    title={wantsFiscal && effectiveLegacyNcfCapable ? "Con NCF se imprime factura, no ticket." : t("bill.ticketTitle")}
                >
                    {t("bill.ticket")}
                </button>

                {/* 2) Facturar (abre invoice sí o sí) */}
                <button
                    type="button"
                    onClick={() => {
                        setSubmitAction("invoice");
                        handlePlaceOrder("invoice");
                    }}
                    disabled={orderMutation.isPending || ordinaryInvoiceBusy}
                    className="px-4 py-3 w-full rounded-lg bg-[#f6b100] text-[#1f1f1f] font-semibold text-lg"
                >
                    {ordinaryInvoiceBusy ? "Procesando..." : t("bill.invoice")}
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
                        {t("bill.update")}
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
                                    {t("bill.leaveTable.title")}
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-white/60">
                                    {t("bill.leaveTable.description")}                                </p>
                            </div>

                            <div className="p-6">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 mb-5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-white/50">{t("bill.leaveTable.products")}</span>
                                        <span className="font-semibold text-white">
                                {itemsCount}
                            </span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm mt-3">
                                        <span className="text-white/50">{t("bill.leaveTable.currentTotal")}</span>
                                        <span className="font-semibold text-[#f6b100]">
                             {money(subtotal)}
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
                                        {leaveTableModal.loading
                                            ? t("bill.leaveTable.saving")
                                            : t("bill.leaveTable.save")
                                        }
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDiscardItemsAndLeave}
                                        disabled={leaveTableModal.loading || orderMutation.isPending}
                                        className="w-full px-4 py-3 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                    >
                                        {t("bill.leaveTable.discard")}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={closeLeaveTableModal}
                                        disabled={leaveTableModal.loading || orderMutation.isPending}
                                        className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-[#1a1a1a] text-white font-semibold hover:bg-[#242424] transition-all disabled:opacity-50"
                                    >
                                        {t("bill.leaveTable.cancel")}
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
                                <p className="text-sm text-[#f5f5f5] font-semibold">{t("bill.cash.title")}</p>
                                <p className="text-xs text-[#ababab]">
                                    {t("bill.cash.description")}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setCashReceived(num(totalToPay).toFixed(2))}
                                className="px-3 py-2 rounded-lg bg-[#f6b100] text-[#111] text-xs font-bold hover:opacity-90"
                            >
                                {t("bill.cash.exact")}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-[#ababab] mb-1">{t("bill.cash.received")}</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={cashReceived}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^\d.]/g, "");
                                        setCashReceived(val);
                                    }}
                                    className="w-full bg-[#1f1f1f] border border-[#2b2b2b] rounded-xl px-4 py-3 text-[#f5f5f5] outline-none focus:ring-1 focus:ring-[#f6b100]"
                                    placeholder={t("bill.cash.placeholder")}                                />
                            </div>

                            <div className="rounded-xl bg-[#1f1f1f] border border-[#2b2b2b] px-4 py-3">
                                <p className="text-xs text-[#ababab]">
                                    {t(
                                        "bill.cash.change"
                                    )}
                                </p>
                                <p className="text-2xl font-bold text-[#f6b100]">
                                    {money(cashChange)}
                                </p>

                                {cashReceivedAmount > 0 && cashMissing > 0 && (
                                    <p className="text-xs text-red-400 mt-1">
                                        {t(
                                            "bill.cash.missing",
                                            {
                                                amount:
                                                    money(
                                                        cashMissing
                                                    ),
                                            }
                                        )}
                                    </p>
                                )}

                                {cashReceivedAmount > 0 && cashMissing <= 0 && (
                                    <p className="text-xs text-green-400 mt-1">
                                        {t("bill.cash.sufficient")}
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

            {confirmReleaseInvoice && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-[4px]"
                    role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !releaseFromInvoiceLoading) setConfirmReleaseInvoice(false); }}>
                    <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-release-title"
                        aria-describedby="confirm-release-description"
                        className="w-full max-w-md rounded-2xl border border-amber-500/25 bg-[#171719] p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,0.65)] sm:p-6"
                        style={{ maxHeight: "calc(100dvh - 7rem)", overflowY: "auto" }}>
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                                <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 id="confirm-release-title" className="text-lg font-semibold leading-snug">¿Cerrar y desocupar mesa?</h2>
                                <p id="confirm-release-description" className="mt-2 text-sm leading-relaxed text-gray-300">Se marcará la orden como completada y la mesa quedará disponible para nuevos clientes.</p>
                            </div>
                        </div>
                        <div className="mt-4 rounded-xl border border-emerald-700/35 bg-emerald-950/25 p-3 text-sm text-emerald-200">
                            La factura ya emitida se conservará. No se generará otro e-NCF ni se volverá a cobrar.
                        </div>
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" disabled={releaseFromInvoiceLoading}
                                onClick={() => setConfirmReleaseInvoice(false)}
                                className="rounded-xl border border-gray-600 bg-[#2a2a2d] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#38383d] disabled:opacity-50">Cancelar</button>
                            <button type="button" disabled={releaseFromInvoiceLoading}
                                onClick={confirmFinishAndReleaseTable}
                                className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">
                                {releaseFromInvoiceLoading ? "Cerrando mesa…" : "Sí, cerrar y desocupar"}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {ordinaryCorrection && <OrderCorrectionEditor
                order={ordinaryCorrection.order} initialValues={ordinaryCorrection.initialValues}
                onClose={() => setOrdinaryCorrection(null)}
                onSaved={async corrected => {
                    setOrdinaryCorrection(null);
                    setOrderInfo(invoicePreview(corrected));
                    setShowInvoice(true);
                    await refreshSalesViews(queryClient);
                }} />}
            {showInvoice && orderInfo && (
                <Invoice
                    order={orderInfo}
                    setShowInvoice={setShowInvoice}
                    onClose={handleInvoiceClose}
                    canReleaseTable={Boolean(
                        getTableIdFromAny(orderInfo?.table) ||
                        getTableIdFromAny(draftTable) ||
                        getTableIdFromAny(order?.table)
                    )}
                    onCloseAndRelease={handleFinishAndReleaseTable}
                    isReleaseLoading={releaseFromInvoiceLoading}
                />
            )}
        </>
    );
};

    export default Bill;
