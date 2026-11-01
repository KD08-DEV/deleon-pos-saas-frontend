// src/pages/admin/CashRegister.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Search, Filter, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api, { getScope } from "../../lib/api";
const DEFAULT_REGISTER_ID = "MAIN";
const ALL_REGISTERS_ID = "__ALL_REGISTERS__";
import useTenant from "../../hooks/useTenant";
import { useTranslation } from "react-i18next";
import { getAdjustmentCode, getPreviewTaxRate, getPreviewTaxAmount, getAvailableOriginalCredit } from "../../lib/ecfAdjustmentUiRules.mjs";
import {
    formatDate,
    formatDateTime,
    formatMoney,
    getTenantLocalization,
    getTodayYMD,
    getYMDInTimezone,
} from "../../lib/localization";
import Invoice from "../../components/invoice/Invoice.jsx";
import CashCloseDocumentsModal from "../../components/cash/CashCloseDocumentsModal.jsx";
import EcfIncidentsModal from "../../components/cash/EcfIncidentsModal.jsx";
import { resolveClosingViewerRole, canViewClosingDocumentsForRole } from "../../lib/cashCloseViewerRole.mjs";
const REGISTER_STORAGE_PREFIX = "deleonsoft_active_register_id";
const LEGACY_REGISTER_STORAGE_KEY = "deleonsoft_active_register_id";

const getCashStorageUser = () => {
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

const getCashRegisterStorageScope = () => {
    const u = getCashStorageUser();

    const tenantId =
        u?.tenantId ||
        u?.tenant?.tenantId ||
        u?.tenant?._id ||
        u?.tenant?.id ||
        localStorage.getItem("tenantId") ||
        "noTenant";

    const clientId =
        u?.clientId ||
        u?.client?.clientId ||
        u?.client?._id ||
        localStorage.getItem("clientId") ||
        "default";

    const userId =
        u?._id ||
        u?.id ||
        u?.user?._id ||
        u?.user?.id ||
        "noUser";

    const host = typeof window !== "undefined" ? window.location.host : "app";

    return {
        tenantId: String(tenantId || "noTenant"),
        clientId: String(clientId || "default"),
        userId: String(userId || "noUser"),
        host,
    };
};

const getRegisterStorageKey = () => {
    const scope = getCashRegisterStorageScope();

    return [
        REGISTER_STORAGE_PREFIX,
        scope.host,
        scope.tenantId,
        scope.clientId,
        scope.userId,
    ].join(":");
};

const getSavedRegisterId = () => {
    try {
        const scopedValue = localStorage.getItem(getRegisterStorageKey());

        if (scopedValue) {
            return String(scopedValue).trim().toUpperCase();
        }

        return "";
    } catch {
        return "";
    }
};

const saveRegisterId = (value) => {
    try {
        const cleanValue = String(value || "").trim().toUpperCase();

        if (!cleanValue) return;

        // Llave nueva por tenant/client/user
        localStorage.setItem(getRegisterStorageKey(), cleanValue);

        // Compatibilidad con Bill.jsx / OrderCard.jsx / otros componentes viejos
        localStorage.setItem(LEGACY_REGISTER_STORAGE_KEY, cleanValue);

        window.dispatchEvent(
            new CustomEvent("deleonsoft:register-changed", {
                detail: { registerId: cleanValue },
            })
        );
    } catch {
        // ignore
    }
};
import { useSelector } from "react-redux";
import { listExpenses } from "../../lib/adminFinanceApi";

// Formatea números con coma de miles mientras escribes (1,000 / 12,345.67)
const formatThousands = (value) => {
    let s = String(value ?? "");

    // deja solo dígitos, punto y guion
    s = s.replace(/[^\d.-]/g, "");
    if (!s) return "";

    // manejar negativo
    const isNeg = s.startsWith("-");
    s = s.replace(/-/g, ""); // quita todos los guiones internos

    // si hay más de un ".", conserva el primero
    const firstDot = s.indexOf(".");
    if (firstDot !== -1) {
        s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
    }

    let [intPart, decPart] = s.split(".");

    // si el usuario escribe ".": intPart queda "", lo tratamos como "0"
    const intDigits = (intPart || "0").replace(/\D/g, "");
    const formattedInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
        Number(intDigits || 0)
    );

    const sign = isNeg ? "-" : "";
    if (decPart !== undefined) {
        decPart = String(decPart).replace(/\D/g, "").slice(0, 2); // máx 2 decimales
        // si el usuario dejó el punto al final, lo respetamos
        return decPart.length ? `${sign}${formattedInt}.${decPart}` : `${sign}${formattedInt}.`;
    }

    return `${sign}${formattedInt}`;
};


const normalize = (v) => String(v || "").trim().toLowerCase();

const safeNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};
const isTicketBreakdownItem = (item = {}) => {
    const searchable = [
        item?.kind,
        item?.type,
        item?.category,
        item?.label,
        item?.name,
        item?.method,
        item?.paymentMethod,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    return searchable.includes("ticket");
};
const parseMoneyInput = (value) => {
    const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

const parseCountInput = (value) => {
    const n = Number(String(value ?? "").replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : 0;
};

const CLOSING_INPUT_MODE_TOTAL = "total";
const CLOSING_INPUT_MODE_BREAKDOWN = "breakdown";

const CASH_DENOMINATIONS_RD = [
    { label: "RD$ 2,000", value: 2000, type: "Billete" },
    { label: "RD$ 1,000", value: 1000, type: "Billete" },
    { label: "RD$ 500", value: 500, type: "Billete" },
    { label: "RD$ 200", value: 200, type: "Billete" },
    { label: "RD$ 100", value: 100, type: "Billete" },
    { label: "RD$ 50", value: 50, type: "Billete" },
    { label: "RD$ 25", value: 25, type: "Moneda" },
    { label: "RD$ 10", value: 10, type: "Moneda" },
    { label: "RD$ 5", value: 5, type: "Moneda" },
    { label: "RD$ 1", value: 1, type: "Moneda" },
];

const createEmptyDenominationCounts = () =>
    CASH_DENOMINATIONS_RD.reduce((acc, item) => {
        acc[String(item.value)] = "";
        return acc;
    }, {});

const buildCashBreakdownPayload = (counts = {}) =>
    CASH_DENOMINATIONS_RD.map((item) => {
        const count = Number(String(counts[String(item.value)] ?? "").replace(/[^\d]/g, ""));
        return {
            label: item.label,
            value: item.value,
            count: Number.isFinite(count) ? count : 0,
            kind: "cash",
        };
    }).filter((item) => item.count > 0);

const calculateCashBreakdownTotal = (counts = {}) =>
    buildCashBreakdownPayload(counts).reduce(
        (sum, item) => sum + Number(item.value || 0) * Number(item.count || 0),
        0
    );

const buildCountsFromSavedBreakdown = (breakdown = []) => {
    const next = createEmptyDenominationCounts();

    if (!Array.isArray(breakdown)) return next;

    breakdown.forEach((item) => {
        if (isTicketBreakdownItem(item)) {
            return;
        }

        const kind = String(item?.kind || "cash").toLowerCase();
        // Importante:
        // Los tickets también vienen en breakdown, pero NO deben precargar billetes.
        if (kind !== "cash" && kind !== "denomination" && kind !== "bill" && kind !== "coin") {
            return;
        }

        const valueKey = String(Number(item?.value || 0));

        if (valueKey in next) {
            next[valueKey] = String(Number(item?.count || 0) || "");
        }
    });

    return next;
};
const getInvoiceNumber = (r) => {
    const raw =
        // Factura real
        r?.facturaNo ??
        r?.invoiceNumber ??
        r?.invoiceNo ??
        r?.fiscal?.facturaNo ??
        r?.fiscal?.invoiceNumber ??
        r?.fiscal?.invoiceNo ??
        r?.fiscal?.internalNumber ??
        r?.fiscal?.internalSeq ??
        r?.fiscal?.internal ??

        // Orden / ticket / actualizar
        r?.operationNumber ??
        r?.operationSeq ??
        null;

    if (raw === null || raw === undefined || raw === "") return "—";

    if (typeof raw === "number") {
        return String(raw).padStart(8, "0");
    }

    const value = String(raw).trim();

    if (/^\d+$/.test(value)) {
        return value.padStart(8, "0");
    }

    return value;
};



function getUserFromStorage() {
    // Probamos varias llaves comunes porque en tu app veo que logueas "userData" en App.jsx
    const keys = ["user", "userData", "authUser", "currentUser"];

    for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;

        try {
            const parsed = JSON.parse(raw);

            // casos típicos: {user:{...}} o {userData:{...}}
            if (parsed?.user && typeof parsed.user === "object") return parsed.user;
            if (parsed?.userData && typeof parsed.userData === "object") return parsed.userData;

            // o el objeto directo
            if (parsed && typeof parsed === "object") return parsed;
        } catch {
            // si no es JSON, ignoramos
        }
    }

    return {};
}


function getRoleFromToken() {
    // Fallback: si el rol no está en localStorage (userData), lo sacamos del JWT.
    const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt") ||
        "";

    if (!token || typeof token !== "string") return "";

    const parts = token.split(".");
    if (parts.length < 2) return "";

    try {
        // base64url -> base64
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = decodeURIComponent(
            atob(b64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        const payload = JSON.parse(jsonStr);
        return String(payload?.role || payload?.user?.role || payload?.userData?.role || "").trim();
    } catch {
        return "";
    }
}


const CashRegister = () => {
    const { t, i18n } = useTranslation();

    const { tenantInfo } =
        useTenant();

    const localization =
        getTenantLocalization(
            tenantInfo
        );

    const currency = (value) =>
        formatMoney(
            value,
            localization
        );
    const paymentMethodLabel = (value) => {
        const raw = String(value || "").trim();

        const normalized = raw
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        if (!normalized) {
            return t("cashRegisterPage.paymentMethods.cash");
        }

        if (normalized.includes("efect") || normalized === "cash") {
            return t("cashRegisterPage.paymentMethods.cash");
        }

        if (normalized.includes("tarj") || normalized.includes("card")) {
            return t("cashRegisterPage.paymentMethods.card");
        }

        if (normalized.includes("transf")) {
            return t("cashRegisterPage.paymentMethods.transfer");
        }

        if (normalized.includes("credit")) {
            return t("cashRegisterPage.paymentMethods.credit");
        }

        if (normalized.includes("ticket")) {
            return t("cashRegisterPage.paymentMethods.ticket");
        }

        if (
            normalized.includes("pedidoya") ||
            normalized.includes("pedido ya")
        ) {
            return "Pedido Ya";
        }

        if (
            normalized.includes("ubereats") ||
            normalized.includes("uber eats")
        ) {
            return "Uber Eats";
        }

        if (normalized.includes("delivery")) {
            return "Delivery";
        }

        if (normalized.includes("otro")) {
            return t("cashRegisterPage.paymentMethods.other");
        }

        return raw;
    };

    const denominationTypeLabel = (type) => {
        return String(type || "").toLowerCase() === "billete"
            ? t("cashRegisterPage.closing.bill")
            : t("cashRegisterPage.closing.coin");
    };

    const paymentStatusLabel = (value, fallback = "pending") => {
        const raw = String(value || "").trim();

        const normalized = raw
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        if (
            normalized === "paid" ||
            normalized === "pagado"
        ) {
            return t("cashRegisterPage.status.paid");
        }

        if (
            normalized === "pending" ||
            normalized === "pendiente"
        ) {
            return t("cashRegisterPage.status.pending");
        }

        if (
            normalized === "partial" ||
            normalized === "parcial"
        ) {
            return t("cashRegisterPage.status.partial");
        }

        if (raw) {
            return raw;
        }

        return t(`cashRegisterPage.status.${fallback}`);
    };

    const supportsCashDenominations =
        localization.currency === "DOP";

    const supportsDominicanFiscal =
        String(tenantInfo?.localization?.countryCode || "").toUpperCase() === "DO";
    const [adminCloseTargetSession, setAdminCloseTargetSession] = useState(null);
    const [hideAdminSelectedSession, setHideAdminSelectedSession] = useState(false);
    const closeFormRef = useRef(null);
    const [selectedRegisterId, setSelectedRegisterId] = useState(() => {
        const saved = getSavedRegisterId();
        return saved || "";
    });
    const [
        todayYMD,
        setTodayYMD,
    ] =
        useState(
            () =>
                getTodayYMD(
                    localization
                )
        );

    useEffect(() => {
        const updateToday =
            () => {
                setTodayYMD(
                    getTodayYMD(
                        localization
                    )
                );
            };

        updateToday();

        const interval =
            window.setInterval(
                updateToday,
                60_000
            );

        return () =>
            window.clearInterval(
                interval
            );
    }, [
        localization.timezone,
    ]);


    const [selectedYMD, setSelectedYMD] = useState(todayYMD);
    const isSelectedToday = selectedYMD === todayYMD;
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        const dateFromUrl = params.get("cashDate");
        const dateFromStorage = localStorage.getItem("deleonsoft_pending_cash_date");

        const registerFromUrl = params.get("registerId");
        const registerFromStorage = localStorage.getItem("deleonsoft_pending_cash_register");

        const pendingDate = dateFromUrl || dateFromStorage;
        const pendingRegisterId = String(registerFromUrl || registerFromStorage || "")
            .trim()
            .toUpperCase();

        if (pendingDate && /^\d{4}-\d{2}-\d{2}$/.test(pendingDate)) {
            setSelectedYMD(pendingDate);
        }

        if (pendingRegisterId) {
            setSelectedRegisterId(pendingRegisterId);
            saveRegisterId(pendingRegisterId);
        }

        localStorage.removeItem("deleonsoft_pending_cash_date");
        localStorage.removeItem("deleonsoft_pending_cash_register");
    }, []);




    const [modalFilters, setModalFilters] = useState({
        from: "",
        to: "",
        method: "",
        fiscal: "",
        registerId: "",
        user: "",
        client: "",
    });

    const [showFullView, setShowFullView] = useState(false);
    const [showFiltersMenu, setShowFiltersMenu] = useState(false);
    const [isEditingOpening, setIsEditingOpening] = useState(false);
    // Modal: edición del fondo inicial (para NO usar prompt)
    const [modalIsEditingOpening, setModalIsEditingOpening] = useState(false);
    const [modalOpeningInput, setModalOpeningInput] = useState("");
    const [closingCountedInput, setClosingCountedInput] = useState("");
    const [closingNote, setClosingNote] = useState("");
    const [closingInputMode, setClosingInputMode] = useState(CLOSING_INPUT_MODE_TOTAL);
    const [closingDenominationCounts, setClosingDenominationCounts] = useState(() =>
        createEmptyDenominationCounts()
    );
    const [ticketAmountInput, setTicketAmountInput] = useState("");
    const [ticketCountInput, setTicketCountInput] = useState("");
    const [transferCountedInput, setTransferCountedInput] = useState("");
    const [otherCountedInput, setOtherCountedInput] = useState("");
    const [showClosingBreakdownDetail, setShowClosingBreakdownDetail] = useState(false);

    const [adjustCloseOpen, setAdjustCloseOpen] = useState(false);
    const [adjustCountedInput, setAdjustCountedInput] = useState("");
    const [adjustNote, setAdjustNote] = useState("");
    const [adjustManagerCode, setAdjustManagerCode] = useState("");

    const [adjustInputMode, setAdjustInputMode] = useState(CLOSING_INPUT_MODE_TOTAL);
    const [adjustDenominationCounts, setAdjustDenominationCounts] = useState(() =>
        createEmptyDenominationCounts()
    );
    const [adjustTicketAmountInput, setAdjustTicketAmountInput] = useState("");
    const [adjustTicketCountInput, setAdjustTicketCountInput] = useState("");
    const [adjustTransferCountedInput, setAdjustTransferCountedInput] = useState("");
    const [adjustOtherCountedInput, setAdjustOtherCountedInput] = useState("");

    const [managerCodeModalOpen, setManagerCodeModalOpen] = useState(false);
    const [managerCodeInput, setManagerCodeInput] = useState("");
    const [closeManagerCode, setCloseManagerCode] = useState("");
    const [openingManagerCode, setOpeningManagerCode] = useState("");
    const closingBreakdownPayload = useMemo(
        () => buildCashBreakdownPayload(closingDenominationCounts),
        [closingDenominationCounts]
    );

    const closingBreakdownTotal = useMemo(
        () => calculateCashBreakdownTotal(closingDenominationCounts),
        [closingDenominationCounts]
    );

    const ticketAmount = useMemo(
        () => parseMoneyInput(ticketAmountInput),
        [ticketAmountInput]
    );

    const ticketCount = useMemo(
        () => parseCountInput(ticketCountInput),
        [ticketCountInput]
    );

    const closingTicketTotal = useMemo(
        () => Number((ticketAmount * ticketCount).toFixed(2)),
        [ticketAmount, ticketCount]
    );

    const transferCountedTotal = useMemo(
        () => parseMoneyInput(transferCountedInput),
        [transferCountedInput]
    );

    const otherCountedTotal = useMemo(
        () => parseMoneyInput(otherCountedInput),
        [otherCountedInput]
    );

    const ticketBreakdownPayload = useMemo(() => {
        if (ticketAmount <= 0 || ticketCount <= 0) return [];

        return [
            {
                label: t(
                    "cashRegisterPage.closing.ticketValue",
                    {
                        amount: currency(ticketAmount),
                    }
                ),
                value: ticketAmount,
                count: ticketCount,
                kind: "ticket",
            },
        ];
    }, [
        ticketAmount,
        ticketCount,
        i18n.resolvedLanguage,
    ]);

    const cashEquivalentCountedTotal = useMemo(
        () => Number((closingBreakdownTotal + closingTicketTotal).toFixed(2)),
        [closingBreakdownTotal, closingTicketTotal]
    );

    const totalDeclaredAtClose = useMemo(
        () =>
            Number(
                (
                    cashEquivalentCountedTotal +
                    transferCountedTotal +
                    otherCountedTotal
                ).toFixed(2)
            ),
        [cashEquivalentCountedTotal, transferCountedTotal, otherCountedTotal]
    );
    const adjustBreakdownPayload = useMemo(
        () => buildCashBreakdownPayload(adjustDenominationCounts),
        [adjustDenominationCounts]
    );

    const adjustBreakdownTotal = useMemo(
        () => calculateCashBreakdownTotal(adjustDenominationCounts),
        [adjustDenominationCounts]
    );

    const adjustTicketAmount = useMemo(
        () => parseMoneyInput(adjustTicketAmountInput),
        [adjustTicketAmountInput]
    );

    const adjustTicketCount = useMemo(
        () => parseCountInput(adjustTicketCountInput),
        [adjustTicketCountInput]
    );

    const adjustTicketTotal = useMemo(
        () => Number((adjustTicketAmount * adjustTicketCount).toFixed(2)),
        [adjustTicketAmount, adjustTicketCount]
    );

    const adjustTicketBreakdownPayload = useMemo(() => {
        if (adjustTicketAmount <= 0 || adjustTicketCount <= 0) return [];

        return [
            {
                label: t(
                    "cashRegisterPage.closing.ticketValue",
                    {
                        amount: currency(adjustTicketAmount),
                    }
                ),
                value: adjustTicketAmount,
                count: adjustTicketCount,
                kind: "ticket",
            },
        ];
    }, [
        adjustTicketAmount,
        adjustTicketCount,
        i18n.resolvedLanguage,
    ]);

    const adjustCombinedBreakdownPayload = useMemo(
        () => [...adjustBreakdownPayload, ...adjustTicketBreakdownPayload],
        [adjustBreakdownPayload, adjustTicketBreakdownPayload]
    );

    const adjustTransferCountedTotal = useMemo(
        () => parseMoneyInput(adjustTransferCountedInput),
        [adjustTransferCountedInput]
    );

    const adjustOtherCountedTotal = useMemo(
        () => parseMoneyInput(adjustOtherCountedInput),
        [adjustOtherCountedInput]
    );

    const adjustCashEquivalentCountedTotal = useMemo(
        () => Number((adjustBreakdownTotal + adjustTicketTotal).toFixed(2)),
        [adjustBreakdownTotal, adjustTicketTotal]
    );

    const adjustTotalDeclaredAtClose = useMemo(
        () =>
            Number(
                (
                    adjustCashEquivalentCountedTotal +
                    adjustTransferCountedTotal +
                    adjustOtherCountedTotal
                ).toFixed(2)
            ),
        [
            adjustCashEquivalentCountedTotal,
            adjustTransferCountedTotal,
            adjustOtherCountedTotal,
        ]
    );

    const me = getUserFromStorage();
    const userData = useSelector(
        (state) => state.user?.userData || state.auth?.userData || null
    );

    const role = String(
        me?.role ||
        userData?.role ||
        userData?.user?.role ||
        getRoleFromToken() ||
        ""
    ).trim();
    const [confirmedFullCredit, setConfirmedFullCredit] = useState(false);
    const [ecfAdjustmentModal, setEcfAdjustmentModal] = useState({
        open: false,
        order: null,
        documentType: "34",
        originalEcf: null,
    });

    const [ecfAdjustmentForm, setEcfAdjustmentForm] = useState({
        adjustmentMode: "partial",
        amount: "",
        tax: "",
        reason: "",
        modificationCode: "3",
    });
    const [confirmedFullDebit, setConfirmedFullDebit] = useState(false);

    const [lastEcfAdjustmentResult, setLastEcfAdjustmentResult] = useState(null);
    const [selectedAdjustmentInvoice, setSelectedAdjustmentInvoice] = useState(null);
    const [selectedOrderInvoice, setSelectedOrderInvoice] = useState(null);
    const [showClosingDocuments, setShowClosingDocuments] = useState(false);
    const [showEcfIncidents, setShowEcfIncidents] = useState(false);

    const roleNorm = role.toLowerCase();


    const roleUpper = String(me?.role || role || "").trim().toUpperCase();




    const isCajera = roleUpper === "CAJERA";

    const isAdmin =
        roleNorm === "admin" ||
        roleNorm === "owner" ||
        roleNorm === "superadmin" ||
        roleNorm.includes("admin");

    const isCashier =
        roleNorm === "cajera" ||
        roleNorm === "cashier" ||
        roleNorm.includes("cajera");
    // Sesión de caja (menudo / fondo inicial) guardada en MongoDB

    const ADMIN_ROLES = new Set([
        "SUPER_ADMIN",
        "ADMIN",
        "OWNER",
        "MANAGER",
        "GERENTE",
        "ADMINISTRADOR",
    ]);
    const currentUserId =
        me?._id ||
        me?.id ||
        me?.user?._id ||
        me?.user?.id ||
        userData?._id ||
        userData?.id ||
        userData?.user?._id ||
        userData?.user?.id ||
        getUserIdFromToken?.() ||
        "";
    // Mismo scope firmado que envia el interceptor de la API, no un objeto
    // de usuario que puede pertenecer a la sucursal seleccionada previamente.
    const activeApiScope = getScope();
    const currentTenantId =
        activeApiScope?.tenantId ||
        me?.tenantId ||
        me?.tenant?.tenantId ||
        me?.tenant?._id ||
        userData?.tenantId ||
        userData?.tenant?.tenantId ||
        userData?.tenant?._id ||
        localStorage.getItem("tenantId") ||
        "NO_TENANT";

    const currentClientId =
        activeApiScope?.clientId ||
        me?.clientId ||
        me?.client?.clientId ||
        me?.client?._id ||
        userData?.clientId ||
        userData?.client?.clientId ||
        userData?.client?._id ||
        localStorage.getItem("clientId") ||
        "default";

    const cashScopeKey = [
        currentTenantId || "NO_TENANT",
        currentClientId || "default",
        currentUserId || "NO_USER",
    ].join(":");
    const { data: registersResp, isLoading: registersLoading } = useQuery({
        queryKey: ["admin/registers", cashScopeKey],
        queryFn: async () => {
            const res = await api.get("/api/admin/registers");
            return res.data;
        },
        staleTime: 60_000,
        retry: 1,
    });
    const registers = useMemo(() => {
        return Array.isArray(registersResp?.data) ? registersResp.data : [];
    }, [registersResp]);
    const isAdminLike = ADMIN_ROLES.has(roleUpper);
    const normalizeId = (value) => {
        if (!value) return "";

        if (typeof value === "string") return value;

        return String(
            value?._id ||
            value?.id ||
            value?.value ||
            ""
        );
    };

    const getRegisterDefaultCashierId = (register) => {
        return normalizeId(register?.defaultCashierUserId);
    };

    const cashierAssignedRegisters = useMemo(() => {
        if (isAdminLike) return [];

        const userId = String(currentUserId || "").trim();

        if (!userId) return [];

        return registers.filter((register) => {
            const defaultCashierId = getRegisterDefaultCashierId(register);
            return defaultCashierId && String(defaultCashierId) === userId;
        });
    }, [registers, currentUserId, isAdminLike]);

    const getCashierPreferredRegisterCode = () => {
        if (isAdminLike) return "";

        const userId = String(currentUserId || "").trim();

        if (!userId) return "";

        const selectedRegister = registers.find((register) => register.code === selectedRegisterId);

        // Si la cajera tiene cajas asignadas, solo puede usar esas como default automático.
        if (cashierAssignedRegisters.length > 0) {
            const selectedBelongsToCashier =
                selectedRegister &&
                String(getRegisterDefaultCashierId(selectedRegister)) === userId;

            if (selectedBelongsToCashier) {
                return selectedRegister.code;
            }

            return cashierAssignedRegisters[0]?.code || "";
        }

        // Compatibilidad: si no tiene ninguna caja asignada, usa la seleccionada si existe.
        if (selectedRegister) {
            return selectedRegister.code;
        }

        // Último fallback: primera caja activa.
        return registers[0]?.code || "";
    };
    const activeRegisterId = useMemo(() => {
        if (registersLoading) return "";

        if (isAdminLike) {
            if (!registers.length) return ALL_REGISTERS_ID;

            if (!selectedRegisterId || selectedRegisterId === ALL_REGISTERS_ID) {
                return ALL_REGISTERS_ID;
            }

            if (registers.some((r) => r.code === selectedRegisterId)) {
                return selectedRegisterId;
            }

            return ALL_REGISTERS_ID;
        }

        const preferredRegisterCode = getCashierPreferredRegisterCode();

        return preferredRegisterCode || "";
    }, [
        selectedRegisterId,
        registers,
        registersLoading,
        isAdminLike,
        currentUserId,
        cashierAssignedRegisters,
    ]);



    const isViewingAllRegisters = isAdminLike && activeRegisterId === ALL_REGISTERS_ID;


    const activeRegisterLabel =
        isViewingAllRegisters || (isAdminLike && !registers.length)
            ? t("cashRegisterPage.registers.allRegisters")
            : activeRegisterId;




    const hasUsableRegister =
        Boolean(activeRegisterId) &&
        activeRegisterId !== ALL_REGISTERS_ID &&
        registers.some((r) => r.code === activeRegisterId);

    const registerFilterValue =
        isViewingAllRegisters || !hasUsableRegister
            ? undefined
            : activeRegisterId;


    const { data: adminSessionsResp } = useQuery({
        queryKey: [
            "admin/cash-session",
            "admin-sessions",
            cashScopeKey,
            selectedYMD,
            activeRegisterId,
        ],
        queryFn: async () => {
            const res = await api.get("/api/admin/cash-session/range", {
                params: {
                    from: selectedYMD,
                    to: selectedYMD,
                    registerId: activeRegisterId,
                },
            });

            return res.data;
        },
        enabled: Boolean(
            isAdminLike &&
            selectedYMD &&
            activeRegisterId &&
            activeRegisterId !== ALL_REGISTERS_ID &&
            hasUsableRegister
        ),
        staleTime: 5_000,
        retry: 1,
    });

    const adminSessions = Array.isArray(adminSessionsResp?.data?.sessions)
        ? adminSessionsResp.data.sessions
        : [];

    const adminOpenSessions = adminSessions.filter(
        (s) => String(s?.status || "").toUpperCase() === "OPEN" && !s?.closedAt
    );
    const adminVisibleOpenSessions =
        hideAdminSelectedSession && adminCloseTargetSession
            ? adminOpenSessions.filter((s) => s._id !== adminCloseTargetSession._id)
            : adminOpenSessions;
    const defaultModalRegisterId = useMemo(() => {
        if (isAdminLike) return activeRegisterId || ALL_REGISTERS_ID;
        return activeRegisterId || DEFAULT_REGISTER_ID;
    }, [isAdminLike, activeRegisterId]);

    const modalRegisterId = useMemo(() => {
        return String(modalFilters.registerId || defaultModalRegisterId || "").trim();
    }, [modalFilters.registerId, defaultModalRegisterId]);

    const {
        data: cashSessionResp,
        isLoading: cashSessionLoading,
        isError: cashSessionIsError,
    } = useQuery({
        queryKey: [
            "admin/cash-session",
            cashScopeKey,
            selectedYMD,
            registerFilterValue || "ALL",
        ],
        enabled: Boolean(selectedYMD && !isViewingAllRegisters && hasUsableRegister),
        queryFn: async () => {
            const params = { dateYMD: selectedYMD, registerId: registerFilterValue };



            const res = await api.get("/api/admin/cash-session", { params });
            return res.data;
        },
        staleTime: 10_000,
        retry: 1,
    });

    const cashPayload = cashSessionResp?.data ?? cashSessionResp ?? null;
    const cashSession = cashSessionResp?.data ?? null;
    const session =
        cashPayload?.data ??
        cashPayload?.session ??
        cashPayload?.cashSession ??
        cashPayload?.result ??
        (cashPayload?._id ? cashPayload : null) ??
        null;


    const adminCanSeeSummary = Boolean(isAdminLike);

// IMPORTANTE:
// Si admin está en "ver todas las ventas" O en "todas las cajas",
// debe usar SIEMPRE el resumen consolidado
    const useConsolidatedSummary =
        adminCanSeeSummary && (showFullView || isViewingAllRegisters);

    const summaryRegisterId = useConsolidatedSummary
        ? ALL_REGISTERS_ID
        : activeRegisterId;

    const { data: summaryRangeResp } = useQuery({
        queryKey: [
            "admin/cash-session",
            "summary-range",
            cashScopeKey,
            selectedYMD,
            summaryRegisterId,
        ],
        queryFn: async () => {
            const res = await api.get("/api/admin/cash-session/range", {
                params: {
                    from: selectedYMD,
                    to: selectedYMD,
                    registerId: summaryRegisterId,
                },
            });
            return res.data;
        },
        enabled: Boolean(selectedYMD && useConsolidatedSummary),
        staleTime: 10_000,
        retry: 1,
    });

    const summaryRangeData = summaryRangeResp?.data ?? summaryRangeResp ?? null;

// Usa los totales consolidados que YA devuelve el backend
    const rangeOpeningTotal = safeNumber(summaryRangeData?.openingTotal);
    const rangeAddedTotal = safeNumber(summaryRangeData?.addedTotal);
    const rangeCountedTotal = safeNumber(summaryRangeData?.countedTotal);
    const rangeExpectedTotal = safeNumber(summaryRangeData?.expectedInRegisterTotal);
    const rangeDifferenceTotal = safeNumber(summaryRangeData?.differenceTotal);

    const openingInitial = useConsolidatedSummary
        ? rangeOpeningTotal
        : safeNumber(session?.openingFloatInitial);

    const addedTotal = useConsolidatedSummary
        ? rangeAddedTotal
        : safeNumber(session?.addedFloatTotal);

    const closingCountedSaved = useConsolidatedSummary
        ? rangeCountedTotal
        : safeNumber(session?.closing?.countedTotal);

    const expectedInRegisterShown = useConsolidatedSummary
        ? rangeExpectedTotal
        : safeNumber(session?.closing?.expectedInRegister);

    const differenceShown = useConsolidatedSummary
        ? rangeDifferenceTotal
        : safeNumber(session?.closing?.difference);

    const closingAlreadySet = Boolean(session?.closedAt) || closingCountedSaved > 0;
    const sessionExists = !!session;

// ✅ Session closed: acepta status o closedAt
    const sessionClosed =
        String(session?.status || cashSession?.status || "").toUpperCase() === "CLOSED" ||
        Boolean(session?.closedAt) ||
        Boolean(session?.closing?.countedTotal);

    const buildClosingDeclaredSummary = (closing = {}, source = {}) => {
        const breakdown = Array.isArray(closing?.breakdown) ? closing.breakdown : [];

        const normalizedBreakdown = breakdown.map((item, index) => {
            const isTicket = isTicketBreakdownItem(item);

            return {
                ...item,
                kind: isTicket ? "ticket" : item?.kind || "cash",
                _sourceRegisterId: source?.registerId || source?.code || "",
                _sourceIndex: index,
            };
        });

        const getLineTotal = (item) =>
            Number((safeNumber(item?.value) * safeNumber(item?.count)).toFixed(2));

        const cashFromBreakdown = normalizedBreakdown
            .filter((item) => !isTicketBreakdownItem(item))
            .reduce((sum, item) => sum + getLineTotal(item), 0);

        const ticketTotal = normalizedBreakdown
            .filter((item) => isTicketBreakdownItem(item))
            .reduce((sum, item) => sum + getLineTotal(item), 0);

        const countedTotal = safeNumber(closing?.countedTotal);

        const cashTotal =
            normalizedBreakdown.length === 0 && countedTotal > 0
                ? countedTotal
                : cashFromBreakdown;

        const transferTotal = safeNumber(closing?.transferCountedTotal);
        const otherTotal = safeNumber(closing?.otherCountedTotal);

        const countedCashEquivalent = Number((cashTotal + ticketTotal).toFixed(2));

        const calculatedTotal = Number(
            (cashTotal + ticketTotal + transferTotal + otherTotal).toFixed(2)
        );

        const savedDeclaredTotal = safeNumber(closing?.totalDeclaredAtClose);

        const total =
            savedDeclaredTotal > 0 && calculatedTotal <= 0
                ? savedDeclaredTotal
                : calculatedTotal;

        const hasData =
            cashTotal > 0 ||
            ticketTotal > 0 ||
            transferTotal > 0 ||
            otherTotal > 0 ||
            savedDeclaredTotal > 0 ||
            countedTotal > 0;

        return {
            hasData,
            cashTotal,
            ticketTotal,
            transferTotal,
            otherTotal,
            countedCashEquivalent,
            total,
            breakdown: normalizedBreakdown,
        };
    };

    const mergeClosingDeclaredSummaries = (summaries = []) => {
        const merged = summaries.reduce(
            (acc, item) => {
                acc.cashTotal += safeNumber(item?.cashTotal);
                acc.ticketTotal += safeNumber(item?.ticketTotal);
                acc.transferTotal += safeNumber(item?.transferTotal);
                acc.otherTotal += safeNumber(item?.otherTotal);
                acc.countedCashEquivalent += safeNumber(item?.countedCashEquivalent);
                acc.total += safeNumber(item?.total);

                if (Array.isArray(item?.breakdown)) {
                    acc.breakdown.push(...item.breakdown);
                }

                return acc;
            },
            {
                cashTotal: 0,
                ticketTotal: 0,
                transferTotal: 0,
                otherTotal: 0,
                countedCashEquivalent: 0,
                total: 0,
                breakdown: [],
            }
        );

        const rounded = {
            cashTotal: Number(merged.cashTotal.toFixed(2)),
            ticketTotal: Number(merged.ticketTotal.toFixed(2)),
            transferTotal: Number(merged.transferTotal.toFixed(2)),
            otherTotal: Number(merged.otherTotal.toFixed(2)),
            countedCashEquivalent: Number(merged.countedCashEquivalent.toFixed(2)),
            total: Number(merged.total.toFixed(2)),
            breakdown: merged.breakdown,
        };

        return {
            ...rounded,
            hasData:
                rounded.cashTotal > 0 ||
                rounded.ticketTotal > 0 ||
                rounded.transferTotal > 0 ||
                rounded.otherTotal > 0 ||
                rounded.total > 0 ||
                rounded.breakdown.length > 0,
        };
    };

    const closingDeclaredSummary = useMemo(() => {
        if (useConsolidatedSummary) {
            const rangeSessions =
                [
                    summaryRangeData?.sessions,
                    summaryRangeData?.cashSessions,
                    summaryRangeData?.items,
                    summaryRangeData?.rows,
                    summaryRangeData?.data?.sessions,
                ].find(Array.isArray) || [];

            if (rangeSessions.length > 0) {
                return mergeClosingDeclaredSummaries(
                    rangeSessions.map((item) =>
                        buildClosingDeclaredSummary(item?.closing || {}, {
                            registerId: item?.registerId || item?.code || item?.register?.code || "",
                        })
                    )
                );
            }

            // Fallback si el backend todavía no devuelve las sesiones.
            const fallbackCountedTotal = safeNumber(summaryRangeData?.countedTotal);
            const fallbackTicketTotal = safeNumber(
                summaryRangeData?.ticketCountedTotal ??
                summaryRangeData?.ticketsCountedTotal ??
                summaryRangeData?.ticketTotal
            );

            const cashTotal = Math.max(0, fallbackCountedTotal - fallbackTicketTotal);
            const countedCashEquivalent = Number((cashTotal + fallbackTicketTotal).toFixed(2));

            return {
                hasData: countedCashEquivalent > 0,
                cashTotal,
                ticketTotal: fallbackTicketTotal,
                transferTotal: 0,
                otherTotal: 0,
                countedCashEquivalent,
                total: countedCashEquivalent,
                breakdown: [],
            };
        }

        return buildClosingDeclaredSummary(session?.closing || {}, {
            registerId: session?.registerId || activeRegisterId,
        });
    }, [
        useConsolidatedSummary,
        summaryRangeData,
        session?.closing,
        session?.registerId,
        activeRegisterId,
    ]);
    const closingCountedForComparison = useMemo(() => {
        const countedWithTickets = safeNumber(closingDeclaredSummary?.countedCashEquivalent);

        return countedWithTickets > 0
            ? countedWithTickets
            : safeNumber(closingCountedSaved);
    }, [closingDeclaredSummary, closingCountedSaved]);
// ✅ ClosedBy: soporta varias estructuras
    const closedById =
        session?.closing?.closedBy?._id ??
        session?.closing?.closedBy ??
        session?.closedBy?._id ??
        session?.closedBy ??
        null;

// ✅ My user id: usa storage/redux primero (más confiable que token)
    const myUserId =
        me?._id ||
        me?.id ||
        userData?._id ||
        userData?.id ||
        userData?.user?._id ||
        userData?.user?.id ||
        getUserIdFromToken();

    const closedByMe = closedById && myUserId ? String(closedById) === String(myUserId) : false;
    // “Fondo inicial” se considera seteado SOLO si openingInitial > 0
    // (no por el hecho de que exista una sesión)
    const hasOpenMovement =
        Array.isArray(session?.movements) &&
        session.movements.some(
            (m) =>
                String(m?.type || "").toUpperCase() === "OPEN" &&
                Number(m?.amount || 0) > 0
        );

    const openingAlreadySet =
        Number(session?.openingFloatInitial || 0) > 0 ||
        hasOpenMovement;

// ✅ Regla final
    const showSummary =
        adminCanSeeSummary ||
        (sessionClosed && (isCajera || isCashier));
    const closeTargetSession = isAdminLike ? adminCloseTargetSession : session;

    const closeTargetClosed =
        String(closeTargetSession?.status || "").toUpperCase() === "CLOSED" ||
        Boolean(closeTargetSession?.closedAt);

    const closeTargetOpeningSet =
        Number(closeTargetSession?.openingFloatInitial || 0) > 0 ||
        (
            Array.isArray(closeTargetSession?.movements) &&
            closeTargetSession.movements.some(
                (m) =>
                    String(m?.type || "").toUpperCase() === "OPEN" &&
                    Number(m?.amount || 0) > 0
            )
        );
    const canCloseSelectedSession =
        Boolean(closeTargetSession) &&
        !closeTargetClosed &&
        closeTargetOpeningSet &&
        !isViewingAllRegisters &&
        (isAdminLike || isCashier || isCajera);

    const showCashSessionControls =
        !useConsolidatedSummary &&
        !isViewingAllRegisters &&
        (isAdminLike || isCashier || isCajera);
    const queryClient = useQueryClient();
    useEffect(() => {
        queryClient.removeQueries({ queryKey: ["admin/cash-session"] });
        queryClient.removeQueries({ queryKey: ["admin/registers"] });
        queryClient.removeQueries({ queryKey: ["admin/reports"] });
        queryClient.removeQueries({ queryKey: ["admin/expenses"] });
        queryClient.removeQueries({ queryKey: ["accounts-receivable"] });

        const scopedSavedRegister = getSavedRegisterId();

        setSelectedRegisterId(scopedSavedRegister || "");
        setIsEditingOpening(false);
        setClosingCountedInput("");
        setClosingNote("");
        setCloseManagerCode("");
        setOpeningManagerCode("");
    }, [cashScopeKey, queryClient]);


// Usa todas las fuentes posibles (storage, redux, token)


    // Día único seleccionado en el modal (solo si from está y to está vacío o igual a from)
    const modalDay =
        modalFilters.from && (!modalFilters.to || modalFilters.to === modalFilters.from)
            ? modalFilters.from
            : null;
    // Modal: totales de cash-session por RANGO (para sumar menudo en fechas desde/hasta)
    const modalFrom = modalFilters.from || "";
    const modalTo = modalFilters.to || "";

    useEffect(() => {
        const a = (modalFrom || "").trim();
        const b = (modalTo || "").trim();
        if (!a || !b) return;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return;

        // Si el rango queda invertido, ajustamos "hasta" para que sea igual a "desde"
        if (a > b) {
            setModalFilters((f) => ({ ...f, to: a }));
        }
    }, [modalFrom, modalTo]);


    // Solo cuando estás en “Registros Completos”, NO es un solo día, y hay from/to válidos
    const isValidYMD = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);




    const { data: usageResp } = useQuery({
        queryKey: ["admin/usage", cashScopeKey],
        queryFn: async () => {
            const res = await api.get("/api/admin/usage");
            return res.data;
        },
        staleTime: 60_000,
        retry: 0,
    });
    const { data: tenantEcfStatusResp } = useQuery({
        queryKey: ["tenant-ecf-status-for-adjustments", currentTenantId, currentClientId, currentUserId, localization.countryCode],
        enabled: supportsDominicanFiscal && Boolean(usageResp?.data?.features?.fiscal),
        queryFn: async () => {
            const res = await api.get("/api/order/ecf/status");
            return res.data;
        },
        staleTime: 30_000,
        retry: 0,
    });

    // Autorización efectiva de notas fiscales por usuario y sucursal.
    const { data: ecfPermissionsResp } = useQuery({
        queryKey: ["order-ecf-permissions", currentTenantId, currentClientId, currentUserId],
        enabled: supportsDominicanFiscal && Boolean(usageResp?.data?.features?.fiscal),
        queryFn: async () => (await api.get("/api/order/ecf/permissions")).data,
        retry: 0,
        staleTime: 30_000,
    });
    const ecfPermissions = ecfPermissionsResp?.data || {};
    const tenantEcfStatus = tenantEcfStatusResp?.data || {};

    const ecfAdjustmentsEnabled =
        tenantEcfStatus?.enabled === true &&
        tenantEcfStatus?.canIssue === true;

    const e33Enabled =
        ecfAdjustmentsEnabled &&
        ecfPermissions.debit === true &&
        tenantEcfStatus?.documentTypes?.e33?.enabled === true;

    const e34Enabled =
        ecfAdjustmentsEnabled &&
        ecfPermissions.credit === true &&
        tenantEcfStatus?.documentTypes?.e34?.enabled === true;

    const planFeatures = usageResp?.data?.features || {};

    // Consulta de facturas y notas: usar el rol de la membresía ACTUAL (API/Redux).
    // El rol guardado localmente puede pertenecer a una sesión anterior; NO usarlo
    // como primera opción ni depender de los permisos para EMITIR E33/E34.
    // La autorización real vuelve a comprobarse en /api/admin/cash-close/fiscal-documents.
    const closingViewerRole = resolveClosingViewerRole({
        membershipRole: usageResp?.data?.currentUser?.role,
        reduxRole: userData?.role || userData?.user?.role,
        storageRole: me?.role || me?.user?.role,
        tokenRole: getRoleFromToken(),
    });
    const canConsultClosingDocuments = canViewClosingDocumentsForRole(closingViewerRole);
    // La consulta de incidentes es HISTÓRICA, solo lectura y acotada por sede.
    // No ocultarla al desactivar e-CF ni durante un problema de certificado,
    // perfil o conexión. El backend vuelve a validar rol, tenant y sucursal.
    const canManageFiscalIncidents =
        supportsDominicanFiscal &&
        planFeatures.fiscal === true &&
        ["owner", "admin"].includes(String(closingViewerRole || "").toLowerCase().trim());

    // Evitar reabrir un modal anterior si se desactiva e-CF o cambia la sesion.
    useEffect(() => {
        if (!canManageFiscalIncidents) setShowEcfIncidents(false);
    }, [canManageFiscalIncidents]);


    const canUseExpenses = Boolean(planFeatures.expenses);
    const canUseAccountsReceivable = Boolean(planFeatures.accountsReceivable) &&
        (isAdminLike || Boolean(userData?.permissions?.accountsReceivable?.view));



    const { data: expensesRows = [], refetch: refetchExpenses } = useQuery({
        queryKey: ["admin/expenses/day", selectedYMD, registerFilterValue || "ALL"],
        queryFn: async () => {
            if (!canUseExpenses) return [];

            const params = { from: selectedYMD, to: selectedYMD };
            if (registerFilterValue) {
                params.registerId = registerFilterValue;
            }

            const r = await listExpenses(params);
            return r.data || [];
        },
        enabled: Boolean(selectedYMD && canUseExpenses),
        staleTime: 10000,
        retry: 0,
    });

    const expensesSummary = useMemo(() => {
        const rows = Array.isArray(expensesRows) ? expensesRows : [];

        const totalExpenses = rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);

        const cashExpenses = rows
            .filter((r) => String(r.paymentMethod || "").toLowerCase() === "cash")
            .reduce((acc, r) => acc + Number(r.amount || 0), 0);

        const nonCashExpenses = totalExpenses - cashExpenses;

        return {
            totalExpenses: Number(totalExpenses.toFixed(2)),
            cashExpenses: Number(cashExpenses.toFixed(2)),
            nonCashExpenses: Number(nonCashExpenses.toFixed(2)),
            count: rows.length,
        };
    }, [expensesRows]);
    const { data: receivableCashSummaryResp } = useQuery({
        queryKey: [
            "accounts-receivable",
            "cash-summary",
            selectedYMD,
            registerFilterValue || "ALL",
        ],
        queryFn: async () => {
            const params = {
                from: selectedYMD,
                to: selectedYMD,
            };

            if (registerFilterValue && registerFilterValue !== ALL_REGISTERS_ID) {
                params.registerId = registerFilterValue;
            }

            const res = await api.get("/api/admin/accounts-receivable/cash-summary", {
                params,
            });

            return res.data;
        },
        enabled: Boolean(selectedYMD && canUseAccountsReceivable),
        staleTime: 10_000,
        retry: 0,
    });

    const receivableCashSummary =
        receivableCashSummaryResp?.data ||
        receivableCashSummaryResp ||
        {};
    // Fondo inicial (menudo)
    const [openingCashInput, setOpeningCashInput] = useState("");
    const openingEditedRef = useRef(false);

    const adjustCloseCashSessionMutation = useMutation({
        mutationFn: async ({
                               dateYMD,
                               registerId,
                               countedTotal,
                               note,
                               managerCode,
                               breakdown,
                               transferCountedTotal,
                               otherCountedTotal,
                               totalDeclaredAtClose,
                           }) => {
            const res = await api.patch("/api/admin/cash-session/close-adjust", {
                dateYMD,
                registerId,
                countedTotal,
                note,
                managerCode,
                breakdown,
                transferCountedTotal,
                otherCountedTotal,
                totalDeclaredAtClose,
            });
            return res.data;
        },
        onSuccess: async (payload) => {
            const sessionDoc = payload?.data ?? null;

            if (sessionDoc?._id) {
                queryClient.setQueryData(
                    ["admin/cash-session", selectedYMD, activeRegisterId],
                    { success: true, data: sessionDoc }
                );
            }

            await queryClient.invalidateQueries({
                queryKey: ["admin/cash-session", selectedYMD, activeRegisterId],
            });

            await queryClient.invalidateQueries({
                queryKey: ["admin/orders/reports", selectedYMD],
            });

            setAdjustCloseOpen(false);

            setAdjustManagerCode("");
            setAdjustInputMode(CLOSING_INPUT_MODE_TOTAL);
            setAdjustDenominationCounts(createEmptyDenominationCounts());
            setAdjustTicketAmountInput("");
            setAdjustTicketCountInput("");
            setAdjustTransferCountedInput("");
            setAdjustOtherCountedInput("");

            showToast(
                t("cashRegisterPage.messages.closeAdjustmentSaved"),
                "success"
            );

            setTimeout(() => {
                window.location.reload();
            }, 700);
        },
        onError: (err) => {

            alert(err?.response?.data?.message || JSON.stringify(err?.response?.data) || t("cashRegisterPage.messages.closeAdjustmentError"));
        },
    });

    const closeCashSessionMutation = useMutation({
        mutationFn: async ({
                               fid,
                               dateYMD,
                               registerId,
                               countedTotal,
                               note,
                               breakdown,
                               managerCode,
                               transferCountedTotal,
                               otherCountedTotal,
                               totalDeclaredAtClose,
                           }) => {
            const res = await api.post("/api/admin/cash-session/close", {
                fid,
                dateYMD,
                registerId,
                countedTotal,
                note,
                breakdown,
                managerCode,
                transferCountedTotal,
                otherCountedTotal,
                totalDeclaredAtClose,
            });
            return res.data;
        },
        onSuccess: (payload) => {
            setAdminCloseTargetSession(null);
            setHideAdminSelectedSession(false);

            const sessionDoc = payload?.data ?? null;

            queryClient.invalidateQueries({ queryKey: ["admin/cash-session"] });
            if (sessionDoc?._id) {
                queryClient.setQueryData(
                    [
                        "admin/cash-session",
                        currentUserId || "NO_USER",
                        selectedYMD,
                        registerFilterValue || "ALL",
                    ],
                    { success: true, data: sessionDoc }
                );
            }

            queryClient.invalidateQueries({ queryKey: ["admin/cash-session"] });
            queryClient.invalidateQueries({ queryKey: ["admin/orders/reports", selectedYMD] });
            // ✅ UX: limpiar campos
            setClosingCountedInput("");
            setClosingNote("");
            setClosingInputMode(CLOSING_INPUT_MODE_TOTAL);
            setClosingDenominationCounts(createEmptyDenominationCounts());
            setCloseManagerCode("");

            setTicketAmountInput("");
            setTicketCountInput("");
            setTransferCountedInput("");
            setOtherCountedInput("");
            // ✅ UX: feedback
            showToast(
                t("cashRegisterPage.messages.closeSuccess"),
                "success"
            );
            // ✅ Avisar al Layout/App que una caja fue cerrada.
// Esto permite que, si era un cierre pendiente viejo,
// App.jsx vuelva a validar y muestre la apertura de hoy sin refrescar.
            try {
                window.dispatchEvent(
                    new CustomEvent("cash-session:closed", {
                        detail: {
                            dateYMD: selectedYMD,
                            registerId: activeRegisterId,
                            closedSessionId: sessionDoc?._id || null,
                        },
                    })
                );
            } catch {
                // ignore
            }

            // ✅ UX: llevar al usuario al resumen (opcional pero recomendado)
            setTimeout(() => {
                document.getElementById("cash-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 150);
        },

        onError: (err) => {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                t("cashRegisterPage.messages.closeError")

            // Mensaje amigable si el manager code está mal
            if (msg === "INVALID_MANAGER_CODE" || msg === "MISSING_MANAGER_CODE") {
                showToast(
                    t("cashRegisterPage.messages.invalidManagerCode"),
                    "error"
                );
                return;
            }

            showToast(msg, "error");
        },

    });

    useEffect(() => {
        if (registersLoading) return;

        if (isAdminLike) {
            if (!registers.length) {
                setSelectedRegisterId(ALL_REGISTERS_ID);
                saveRegisterId(ALL_REGISTERS_ID);
                return;
            }

            if (!selectedRegisterId || selectedRegisterId === ALL_REGISTERS_ID) {
                setSelectedRegisterId(ALL_REGISTERS_ID);
                saveRegisterId(ALL_REGISTERS_ID);
                return;
            }

            const exists = registers.some((r) => r.code === selectedRegisterId);

            if (!exists) {
                setSelectedRegisterId(ALL_REGISTERS_ID);
                saveRegisterId(ALL_REGISTERS_ID);
                return;
            }

            saveRegisterId(selectedRegisterId);
            return;
        }

        if (!registers.length) return;

        const preferredRegisterCode = getCashierPreferredRegisterCode();

        if (!preferredRegisterCode) return;

        if (selectedRegisterId !== preferredRegisterCode) {
            setSelectedRegisterId(preferredRegisterCode);
            saveRegisterId(preferredRegisterCode);
            return;
        }

        saveRegisterId(preferredRegisterCode);
    }, [
        registersLoading,
        registers,
        selectedRegisterId,
        isAdminLike,
        currentUserId,
        cashierAssignedRegisters,
    ]);


    const modalRangeFrom = (modalFrom || "").trim();
    const modalRangeTo = (modalTo || "").trim();

    const modalRangeEnabled =
        showFullView &&
        isValidYMD(modalRangeFrom) &&
        isValidYMD(modalRangeTo) &&
        modalRangeFrom <= modalRangeTo;


    const { data: modalRangeSessionResp } = useQuery({
        queryKey: [
            "admin/cash-session",
            "modal-range",
            modalRangeFrom,
            modalRangeTo,
            modalRegisterId || ALL_REGISTERS_ID,
        ],

        enabled: modalRangeEnabled,
        queryFn: async () => {
            const params = {
                from: modalRangeFrom,
                to: modalRangeTo,
                registerId: modalRegisterId || ALL_REGISTERS_ID,
            };

            const res = await api.get("/api/admin/cash-session/range", { params });
            return res.data;
        },
        staleTime: 10_000,
        retry: 1,
    });


    const { data: modalCashSessionResp } = useQuery({
        queryKey: ["admin/cash-session", "modal", modalDay || "range"],

        queryFn: async () => {
            const params = { dateYMD: modalDay };
            if (registerFilterValue) params.registerId = registerFilterValue;

            const res = await api.get("/api/admin/cash-session/current", { params });
            return res.data;
        },
        enabled: Boolean(modalDay) && !isViewingAllRegisters,// solo corre si hay un día único
        staleTime: 30_000,
        retry: 1,
    });


    // Menudo del día del modal (si hay modalDay)
    const modalSession = modalCashSessionResp?.data ?? modalCashSessionResp ?? null;
    const modalSessionExists = Boolean(modalSession?._id || modalSession?.id || modalSession?.dateYMD);

    // Sync del input del modal cuando cambias de día (o cuando llega data)
    useEffect(() => {
        if (!modalDay) {
            setModalIsEditingOpening(false);
            setModalOpeningInput("");
            return;
        }

        // Cuando cambias modalDay o cambia el opening, resetea input a lo que hay en BD
        setModalIsEditingOpening(false);
        setModalOpeningInput(String(safeNumber(modalSession?.openingFloatInitial) || 0));
    }, [modalDay, modalSession?.openingFloatInitial]);


    const modalOpeningInitial = modalRangeEnabled
        ? safeNumber(modalRangeSessionResp?.data?.openingTotal)
        : safeNumber(modalSession?.openingFloatInitial);

    const modalAddedTotal = modalRangeEnabled
        ? safeNumber(modalRangeSessionResp?.data?.addedTotal)
        : safeNumber(modalSession?.addedFloatTotal);







    function getUserIdFromToken() {
        try {
            const token = localStorage.getItem("token"); // o como lo guardes
            if (!token) return null;
            const payload = JSON.parse(atob(token.split(".")[1]));

            // Usa el campo que tú tengas en tu JWT (revisa console.log(payload))
            return payload.userId || payload._id || payload.id || payload.sub || null;
        } catch {
            return null;
        }
    }




// soporta: { success:true, data:{...} }  | { found:true, session:{...} } | { session:{...} } | documento directo


    // Solo mostrar resumen si ya cerró (o si es admin)





    const menudoActual = openingInitial + addedTotal; // opening + adds





    const { data: managerCodeStatus } = useQuery({
        queryKey: ["admin/manager-code/status"],
        enabled: isAdminLike,
        queryFn: async () => {
            const res = await api.get("/api/admin/manager-code");
            return res.data;
        },
        staleTime: 10_000,
    });


    const setManagerCodeMutation = useMutation({
        mutationFn: async ({ managerCode }) => {
            const res = await api.patch("/api/admin/manager-code", { managerCode });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin/manager-code/status"] });
            setManagerCodeModalOpen(false);
            setManagerCodeInput("");
        },
        onError: (err) => {
            showToast(
                err?.response?.data?.message ||
                t("cashRegisterPage.messages.managerCodeSaveError")
            );
            },
    });

    // Cajera: no puede editar si ya se guardó opening
    // Admin: puede editar cualquier fecha, pero SOLO cuando active el modo edición
    const cashierEditingOpeningWithManager =
        isCashier &&
        isEditingOpening &&
        openingAlreadySet &&
        !sessionClosed;

    const disableOpeningInput =
        // Cajera: si ya se guardó el fondo, solo puede editar entrando al modo con código manager.
        (isCashier && openingAlreadySet && !isEditingOpening) ||

        // Cajera: si NO está editando con manager code, no puede modificar fechas viejas.
        (!isAdmin && !isSelectedToday && !cashierEditingOpeningWithManager) ||

        // Admin: si existe sesión, solo edita cuando active el modo edición.
        (isAdmin && sessionExists && !isEditingOpening);

    useEffect(() => {
        if (closingAlreadySet) {
            setClosingCountedInput(formatThousands(closingCountedSaved));
            setClosingInputMode(CLOSING_INPUT_MODE_TOTAL);
            setClosingDenominationCounts(
                buildCountsFromSavedBreakdown(session?.closing?.breakdown || [])
            );
        } else {
            setClosingCountedInput("");
            setClosingNote("");
            setClosingInputMode(CLOSING_INPUT_MODE_TOTAL);
            setClosingDenominationCounts(createEmptyDenominationCounts());
        }
    }, [selectedYMD, closingAlreadySet, closingCountedSaved, session?.closing?.breakdown]);

    useEffect(() => {
        setIsEditingOpening(false);
        setClosingCountedInput("");
        setClosingNote("");
        setClosingInputMode(CLOSING_INPUT_MODE_TOTAL);
        setClosingDenominationCounts(createEmptyDenominationCounts());
        setTicketAmountInput("");
        setTicketCountInput("");
        setTransferCountedInput("");
        setOtherCountedInput("");
        setAddAmountInput?.("");
    }, [activeRegisterId]);

    useEffect(() => {
        // Si estoy editando, no sobrescribas el input
        if (isEditingOpening) return;

        // Cuando cambia la fecha, el input debe reflejar el opening del día seleccionado (si existe)
        if (sessionExists) {
            setOpeningCashInput(String(openingInitial || 0));
        } else {
            // Si no hay sesión ese día, limpia el input
            setOpeningCashInput("");
        }

        // al cambiar de fecha, sal del modo edición
        setIsEditingOpening(false);
    }, [selectedYMD, sessionExists, openingInitial, isEditingOpening]);

    const openCashSessionModalMutation = useMutation({
        mutationFn: async ({ dateYMD, registerId, openingFloat }) => {
            const cleanRegisterId = String(registerId || "").trim().toUpperCase();

            const res = await api.post(
                "/api/admin/cash-session/open",
                {
                    dateYMD,
                    registerId: cleanRegisterId,
                    openingFloat,
                },
                {
                    params: {
                        dateYMD,
                        registerId: cleanRegisterId,
                    },
                }
            );

            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", "modal", modalDay || "range"] });
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", "modal-range"] });
        },
    });


    const adjustCashModalMutation = useMutation({
        mutationFn: async ({ dateYMD, registerId, openingFloat, note }) => {
            const cleanRegisterId = String(registerId || "").trim().toUpperCase();

            const res = await api.patch(
                "/api/admin/cash-session/adjust",
                {
                    dateYMD,
                    registerId: cleanRegisterId,
                    openingFloat,
                    note: note || "",
                },
                {
                    params: {
                        dateYMD,
                        registerId: cleanRegisterId,
                    },
                }
            );

            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", "modal", modalDay || "range"] });
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", "modal-range"] });
        },

    });

    const openCashSessionMutation = useMutation({
        mutationFn: async ({ dateYMD, registerId, openingFloat }) => {
            const cleanRegisterId = String(registerId || "").trim().toUpperCase();

            console.log("[OPEN CASH SESSION REQUEST]", {
                dateYMD,
                registerId: cleanRegisterId,
                openingFloat,
                activeRegisterId,
                selectedRegisterId,
                registersLoading,
            });

            const res = await api.post(
                "/api/admin/cash-session/open",
                {
                    dateYMD,
                    registerId: cleanRegisterId,
                    openingFloat,
                },
                {
                    params: {
                        dateYMD,
                        registerId: cleanRegisterId,
                    },
                }
            );

            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session"] });
            queryClient.invalidateQueries({ queryKey: ["admin/reports"] });
        },
        onError: (err) => {
            const status = err?.response?.status;

            console.log("[POST add] ERROR", {
                status,
                url: err?.config?.url,
                payload: err?.config?.data,
                data: err?.response?.data,
            });

            if (status === 404) {
                showToast(
                    t("cashRegisterPage.messages.sessionNotFound")
                );
                queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD, activeRegisterId] });
                return;
            }

            if (status === 409) {
                const message = err?.response?.data?.message;

                if (message === "PENDING_CASH_SESSION_CLOSE") {
                    const pendingSession = err?.response?.data?.data;

                    const pendingDate =
                        pendingSession?.dateYMD ||
                        pendingSession?.createdAt?.slice(0, 10) ||
                        "—";

                    const register =
                        pendingSession?.registerId ||
                        activeRegisterId ||
                        "";

                    showToast(
                        t(
                            "cashRegisterPage.messages.pendingPreviousSession",
                            {
                                date:
                                pendingDate,

                                register:
                                    register
                                        ? t(
                                            "cashRegisterPage.messages.registerSuffix",
                                            {
                                                register,
                                            }
                                        )
                                        : "",
                            }
                        ),
                        "error"
                    );

                    return;
                } else if (message === "CASH_SESSION_ALREADY_CLOSED") {
                    showToast(
                        t("cashRegisterPage.messages.registerAlreadyClosed"),
                        "error"
                    );
                } else if (message === "SESSION_ALREADY_EXISTS") {
                    showToast(
                        t("cashRegisterPage.messages.sessionAlreadyExists"),
                        "error"
                    );                } else {
                    showToast(
                        t("cashRegisterPage.messages.openRegisterError"),
                        "error"
                    );
                }

                queryClient.invalidateQueries({ queryKey: ["admin/cash-session"] });
                return;
            }

            showToast(
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                t("cashRegisterPage.messages.saveOpeningError")
            );
        },

    });
    const adjustOpeningMutation = useMutation({
        mutationFn: async ({ dateYMD, registerId, openingFloat, note, managerCode }) => {
            const cleanRegisterId = String(registerId || "").trim().toUpperCase();

            console.log("[PATCH adjust] request", {
                dateYMD,
                registerId: cleanRegisterId,
                openingFloat,
                note,
            });

            const res = await api.patch(
                "/api/admin/cash-session/adjust",
                {
                    dateYMD,
                    registerId: cleanRegisterId,
                    openingFloat,
                    note,
                    managerCode,
                },
                {
                    params: {
                        dateYMD,
                        registerId: cleanRegisterId,
                    },
                }
            );

            console.log("[PATCH adjust] response", res?.data);
            return res.data;
        },
        onSuccess: () => {
            // refrescar sesión del día
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session"] });
            queryClient.invalidateQueries({ queryKey: ["admin/orders/reports", selectedYMD] });
            setIsEditingOpening(false);
            setOpeningManagerCode("");
        },
        onError: (err) => {
            console.log("[PATCH adjust] ERROR", {
                status: err?.response?.status,
                data: err?.response?.data,
            });

            const message =
                err?.response?.data?.message ||
                err?.response?.data?.error;

            if (message === "MISSING_MANAGER_CODE") {
                showToast(
                    t("cashRegisterPage.messages.managerCodeRequired"),
                    "error"
                );

                return;
            }

            if (message === "INVALID_MANAGER_CODE") {
                showToast(
                    t("cashRegisterPage.messages.invalidManagerCode"),
                    "error"
                );

                return;
            }

            if (message === "SESSION_NOT_FOUND") {
                showToast(
                    t("cashRegisterPage.messages.cashierSessionNotFound"),
                    "error"
                );

                return;
            }

            if (message === "SESSION_CLOSED") {
                showToast(
                    t("cashRegisterPage.messages.closedOpeningEditForbidden"),
                    "error"
                );

                return;
            }

            showToast(
                t("cashRegisterPage.messages.editOpeningError"),
                "error"
            );
        },
    });

    const addCashMutation = useMutation({
        mutationFn: async ({ dateYMD, registerId, amount }) => {
            console.log("[POST add] request", { dateYMD, registerId, amount });

            const res = await api.post("/api/admin/cash-session/add", {
                dateYMD,
                registerId,
                amount,
            });

            console.log("[POST add] response", res?.data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD, activeRegisterId] });
        },
        onError: (err) => {
            const status = err?.response?.status;
            const msg = err?.response?.data?.message || err?.response?.data?.error || "";

            console.log("[POST add] ERROR", {
                status,
                url: err?.config?.url,
                payload: err?.config?.data,
                data: err?.response?.data,
            });

            if (status === 404) {
                showToast("No se encontró la sesión para esa fecha/caja.");
                queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD, activeRegisterId] });
                return;
            }

            if (status === 409 && msg === "SESSION_CLOSED") {
                showToast(
                    t("cashRegisterPage.messages.adminOnlyAddAfterClose")
                );
                return;
            }

            if (status === 403) {
                showToast(
                    t("cashRegisterPage.messages.adminOnlyAddCash")
                );
                return;
            }

            showToast(
                msg ||
                t("cashRegisterPage.messages.addCashError")
            );
        },
    });



    // Limpia filtros vacíos antes de enviar (para la query inicial)
// Limpia filtros vacíos antes de enviar.
// Importante:
// - Vista normal: carga solo selectedYMD.
// - Modal "Registros Completos": si hay rango, carga ese rango desde backend.
    const cleanedParams = useMemo(() => {
        const modalFromValue =
            String(
                modalFilters.from || ""
            ).trim();

        const modalToValue =
            String(
                modalFilters.to || ""
            ).trim();

        const useModalRange =
            showFullView &&
            isValidYMD(
                modalFromValue
            );

        const from =
            useModalRange
                ? modalFromValue
                : selectedYMD;

        const to =
            useModalRange
                ? (
                    isValidYMD(
                        modalToValue
                    )
                        ? modalToValue
                        : modalFromValue
                )
                : selectedYMD;

        const params = {
            from,
            to,
        };

        const registerForQuery =
            showFullView
                ? modalRegisterId
                : registerFilterValue;

        if (
            registerForQuery &&
            registerForQuery !==
            ALL_REGISTERS_ID
        ) {
            params.registerId =
                registerForQuery;
        }

        return params;
    }, [
        selectedYMD,
        registerFilterValue,
        showFullView,
        modalFilters.from,
        modalFilters.to,
        modalRegisterId,
    ]);

    /*
     * Devuelve B01/B02 solamente cuando existe un NCF tradicional REAL.
     * No usa ncfType, "Consumidor Final" ni etiquetas descriptivas.
     */
    const getRealTraditionalNcfType = (r) => {
        const candidates = [
            r?.fiscal?.ncfNumber,
            r?.fiscal?.ncf,
            r?.fiscal?.number,
            r?.fiscal?.documentNumber,
            r?.fiscal?.ncfCode,
            r?.fiscal?.comprobante,

            r?.ncfNumber,
            r?.ncf,

            r?.bills?.ncfNumber,
            r?.bills?.ncf,

            r?.invoice?.fiscal?.ncfNumber,
            r?.invoice?.fiscal?.ncf,
            r?.invoice?.fiscal?.number,
            r?.invoice?.fiscal?.documentNumber,
            r?.invoice?.fiscal?.ncfCode,
            r?.invoice?.fiscal?.comprobante,

            r?.invoice?.ncfNumber,
            r?.invoice?.ncf,
        ];

        for (const candidate of candidates) {
            const value = String(candidate ?? "")
                .trim()
                .toUpperCase()
                .replace(/[\s-]+/g, "");

            // Exige un NCF completo, no solamente el texto "B01" o "B02".
            if (/^B01\d{8}$/.test(value)) return "b01";
            if (/^B02\d{8}$/.test(value)) return "b02";
        }

        return "";
    };
    const getFiscalType = (r) => {
        const clean = (value) =>
            String(value ?? "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[\s_-]+/g, "");

        const collect = (...values) =>
            values
                .flat(Infinity)
                .map(clean)
                .filter(Boolean);

        /*
         * 1. COMPROBANTES ELECTRÓNICOS
         * E31, E32, E33 y E34 tienen prioridad.
         */
        const ecfTypes = collect(
            r?.ecf?.documentType,
            r?.ecf?.tipoeCF,
            r?.ecf?.tipoEcf,
            r?.ecfDocumentType,

            r?.fiscal?.ecfDocumentType,
            r?.fiscal?.tipoeCF,
            r?.fiscal?.tipoEcf,

            r?.invoice?.ecf?.documentType,
            r?.invoice?.fiscal?.ecfDocumentType
        );

        const ecfNumbers = collect(
            r?.ecf?.eNCF,
            r?.ecf?.encf,
            r?.ecf?.documentNumber,

            r?.eNCF,
            r?.encf,

            r?.fiscal?.eNCF,
            r?.fiscal?.encf,

            r?.invoice?.ecf?.eNCF,
            r?.invoice?.fiscal?.eNCF
        );

        const hasEcf = (code) =>
            ecfTypes.some(
                (value) =>
                    value === code ||
                    value === `e${code}` ||
                    value.startsWith(`e${code}`)
            ) ||
            ecfNumbers.some(
                (value) =>
                    value.startsWith(`e${code}`) ||
                    value.startsWith(code)
            );

        if (hasEcf("31")) return "e31";
        if (hasEcf("32")) return "e32";
        if (hasEcf("33")) return "e33";
        if (hasEcf("34")) return "e34";

        /*
         * 2. NÚMERO REAL DEL NCF
         */
        const ncfNumbers = collect(
            r?.fiscal?.ncfNumber,
            r?.fiscal?.ncf,
            r?.fiscal?.number,
            r?.fiscal?.documentNumber,
            r?.fiscal?.ncfCode,
            r?.fiscal?.comprobante,

            r?.ncfNumber,
            r?.ncf,

            r?.bills?.ncfNumber,
            r?.bills?.ncf,

            r?.invoice?.fiscal?.ncfNumber,
            r?.invoice?.fiscal?.ncf,
            r?.invoice?.fiscal?.number,
            r?.invoice?.fiscal?.documentNumber,
            r?.invoice?.fiscal?.ncfCode,
            r?.invoice?.fiscal?.comprobante,

            r?.invoice?.ncfNumber,
            r?.invoice?.ncf
        );

        if (
            ncfNumbers.some(
                (value) =>
                    value.startsWith("b01") ||
                    value.includes("b01")
            )
        ) {
            return "b01";
        }

        if (
            ncfNumbers.some(
                (value) =>
                    value.startsWith("b02") ||
                    value.includes("b02")
            )
        ) {
            return "b02";
        }

        /*
         * 3. TIPO EXPLÍCITO DEL COMPROBANTE
         *
         * Esta validación debe estar ANTES de hasFiscalEvidence.
         * Los B02 antiguos pueden tener ncfType, pero no requested/issued.
         */
        const ncfTypes = collect(
            r?.fiscal?.ncfType,
            r?.fiscal?.type,
            r?.fiscal?.documentType,
            r?.fiscal?.comprobanteType,
            r?.fiscal?.tipoComprobante,
            r?.fiscal?.fiscalType,

            r?.ncfType,
            r?.fiscalType,
            r?.comprobanteType,
            r?.tipoComprobante,

            r?.bills?.ncfType,
            r?.bills?.documentType,
            r?.bills?.comprobanteType,
            r?.bills?.tipoComprobante,

            r?.invoice?.fiscal?.ncfType,
            r?.invoice?.fiscal?.type,
            r?.invoice?.fiscal?.documentType,
            r?.invoice?.fiscal?.comprobanteType,
            r?.invoice?.fiscal?.tipoComprobante,

            r?.invoice?.ncfType,
            r?.invoice?.fiscalType
        );

        const isB01 = ncfTypes.some(
            (value) =>
                value === "01" ||
                value === "b01" ||
                value.startsWith("b01") ||
                value.includes("creditofiscal") ||
                value.includes("facturacreditofiscal")
        );

        if (isB01) {
            return "b01";
        }

        const isB02 = ncfTypes.some(
            (value) =>
                value === "02" ||
                value === "b02" ||
                value.startsWith("b02") ||
                value.includes("consumidorfinal") ||
                value.includes("facturaconsumidorfinal")
        );

        if (isB02) {
            return "b02";
        }

        /*
         * 4. FALLBACK PARA REGISTROS ANTIGUOS
         *
         * No se utiliza fiscal.name porque normalmente contiene el
         * nombre del cliente o "Consumidor Final" como valor general.
         */
        const descriptiveText = collect(
            r?.fiscal?.label,
            r?.fiscal?.description,
            r?.fiscal?.documentName,

            r?.documentName,
            r?.documentLabel,

            r?.invoice?.fiscal?.label,
            r?.invoice?.fiscal?.description,
            r?.invoice?.fiscal?.documentName
        ).join(" ");

        if (
            descriptiveText.includes("creditofiscal") ||
            descriptiveText.includes("facturacreditofiscal")
        ) {
            return "b01";
        }

        if (
            descriptiveText.includes("consumidorfinal") ||
            descriptiveText.includes("facturaconsumidorfinal")
        ) {
            return "b02";
        }

        return "";
    };

    const getClientName = (r) => {
        return (
            r?.customerDetails?.name ||
            r?.customerDetails?.nombre ||
            r?.customerDetails?.clientName ||
            r?.customerDetails?.customerName ||
            r?.client?.name ||
            r?.clientName ||
            r?.customerName ||
            r?.customer?.name ||
            r?.bills?.fiscalName ||
            r?.fiscalName ||
            r?.fiscal?.name ||
            r?.fiscal?.razonSocial ||
            "—"
        );
    };

    const { data, isLoading, isError, error } = useQuery({

        queryKey: ["admin/reports", cleanedParams],
        queryFn: async () => {
            const res = await api.get("/api/admin/reports", { params: cleanedParams });
            return res.data;
        },
        keepPreviousData: true,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    const reports =
        Array.isArray(
            data?.data
        )
            ? data.data
            : [];

    const creditReports =
        Array.isArray(
            data?.creditData
        )
            ? data.creditData
            : [];

    /*
     * Lista completa para tablas:
     *
     * reports       = cobradas
     * creditReports = ventas a crédito
     *
     * NO significa que Crédito se sume
     * al dinero cobrado.
     */
    const allReports =
        useMemo(() => {
            const map =
                new Map();

            [
                ...reports,
                ...creditReports,
            ].forEach(
                (report) => {
                    const id =
                        String(
                            report?._id ||
                            ""
                        );

                    if (!id) {
                        return;
                    }

                    map.set(
                        id,
                        report
                    );
                }
            );

            return Array.from(
                map.values()
            );
        }, [
            reports,
            creditReports,
        ]);

    const getReportReferenceDate =
        (report) => {
            const method =
                normalize(
                    report
                        ?.paymentMethod ||
                    ""
                );

            const credit =
                method === "credito" ||
                method === "crédito" ||
                method === "credit" ||
                method.includes(
                    "credito"
                ) ||
                method.includes(
                    "crédito"
                );

            /*
             * Crédito pertenece al día
             * en que fue facturado.
             *
             * Una venta normal pertenece
             * al día en que fue cobrada.
             */
            return credit
                ? (
                    report
                        ?.invoicedAt ||
                    report
                        ?.createdAt
                )
                : (
                    report
                        ?.paidAt ||
                    report
                        ?.invoicedAt ||
                    report
                        ?.createdAt
                );
        };

// Ordenar por la fecha financiera correcta.
    const sortedReports =
        useMemo(() => {
            return [
                ...allReports,
            ].sort(
                (a, b) => {
                    const dateA =
                        new Date(
                            getReportReferenceDate(
                                a
                            ) || 0
                        ).getTime();

                    const dateB =
                        new Date(
                            getReportReferenceDate(
                                b
                            ) || 0
                        ).getTime();

                    return (
                        dateB -
                        dateA
                    );
                }
            );
        }, [
            allReports,
        ]);





// Solo registros del día de HOY (fecha local)


    const toBusinessYMD =
        (value) =>
            getYMDInTimezone(
                value,
                localization
            );

    const isCreditOrder = (r) => {
        const method = normalize(r?.paymentMethod || "");
        return (
            method === "credito" ||
            method === "crédito" ||
            method === "credit" ||
            method.includes("credito") ||
            method.includes("crédito")
        );
    };

// Todas las órdenes del día, incluyendo crédito.
// Esto sirve para que buildCashClosure pueda detectar crédito como fallback.
    const rawDayReports =
        useMemo(() => {
            return sortedReports.filter(
                (r) =>
                    toBusinessYMD(
                        getReportReferenceDate(
                            r
                        )
                    ) ===
                    selectedYMD
            );
        }, [
            sortedReports,
            selectedYMD,
            localization.timezone,
        ]);

// Solo ventas realmente cobradas.
// Se usa para cálculos financieros que NO deben incluir Crédito.
    const dayReports = useMemo(() => {
        return rawDayReports.filter(
            (r) =>
                !isCreditOrder(r)
        );
    }, [
        rawDayReports,
    ]);

// Registros visibles en pantalla:
// cobradas + ventas realizadas a crédito.
    const dayVisibleReports =
        useMemo(
            () =>
                rawDayReports,
            [
                rawDayReports,
            ]
        );


    // Filtro para el modal (todos los registros con filtros)
    const modalFilteredReports = useMemo(() => {
        const fromYMD =
            String(
                modalFilters.from || ""
            ).trim();

        const toYMD =
            String(
                modalFilters.to || ""
            ).trim();

        const method =
            normalize(
                modalFilters.method
            );
        const fiscal = supportsDominicanFiscal
            ? normalize(modalFilters.fiscal)
            : "";

        const user = normalize(modalFilters.user);
        const client = normalize(modalFilters.client);
        const selectedRegister = String(modalRegisterId || "").trim().toUpperCase();

        return sortedReports.filter((r) => {
            if (selectedRegister && selectedRegister !== ALL_REGISTERS_ID) {
                const orderRegister = String(r?.registerId || DEFAULT_REGISTER_ID).trim().toUpperCase();

                const isLegacyMain =
                    selectedRegister === DEFAULT_REGISTER_ID &&
                    (!r?.registerId || ["MAIN", "DEFAULT", ""].includes(orderRegister));

                if (!isLegacyMain && orderRegister !== selectedRegister) {
                    return false;
                }
            }
            const recordYMD =
                getYMDInTimezone(
                    getReportReferenceDate(
                        r
                    ),
                    localization
                );

            if (
                (fromYMD ||
                    toYMD) &&
                !recordYMD
            ) {
                return false;
            }

            if (
                fromYMD &&
                recordYMD <
                fromYMD
            ) {
                return false;
            }

            if (
                toYMD &&
                recordYMD >
                toYMD
            ) {
                return false;
            }

            if (method) {
                const pm = normalize(r?.paymentMethod || "Efectivo");
                if (!pm.includes(method)) return false;
            }
            if (fiscal) {
                const fiscalType = getFiscalType(r);
                const realTraditionalNcfType = getRealTraditionalNcfType(r);

                const fiscalMatchMap = {
                    fiscal: ["b01", "b02", "e31", "e32", "e33", "e34"].includes(
                        fiscalType
                    ),

                    credito_fiscal: ["b01", "e31"].includes(fiscalType),

                    consumidor_final: ["b02", "e32"].includes(fiscalType),

                    debito_fiscal: fiscalType === "e33",

                    nota_credito: fiscalType === "e34",

// Estos dos filtros exigen un número NCF real.
                    b01: realTraditionalNcfType === "b01",
                    b02: realTraditionalNcfType === "b02",
                    e31: fiscalType === "e31",
                    e32: fiscalType === "e32",
                    e33: fiscalType === "e33",
                    e34: fiscalType === "e34",

                    nofiscal: fiscalType === "",
                };

                if (fiscalMatchMap[fiscal] !== true) {
                    return false;
                }
            }

            if (user) {
                const u = normalize(r?.user?.name || r?.user?.email || "");
                if (!u.includes(user)) return false;
            }

            if (client) {
                const c = normalize(getClientName(r));
                if (!c.includes(client)) return false;
            }

            return true;
        });
    }, [
        sortedReports,
        modalFilters,
        modalRegisterId,
        localization.timezone,
        supportsDominicanFiscal,
    ]);

    const buildCashClosure = (
        rows,
        openingInitial,
        addedTotal,
        expensesSummary = { totalExpenses: 0, cashExpenses: 0 },
        receivableSummary = {}
    ) => {
        const buckets = {
            efectivo: {
                label: t("cashRegisterPage.paymentMethods.cash"),
                total: 0,
                count: 0,
            },

            tarjeta: {
                label: t("cashRegisterPage.paymentMethods.card"),
                total: 0,
                count: 0,
            },

            transferencia: {
                label: t("cashRegisterPage.paymentMethods.transfer"),
                total: 0,
                count: 0,
            },

            delivery: {
                label: "Delivery",
                total: 0,
                count: 0,
            },

            pedidoya: {
                label: "Pedido Ya",
                total: 0,
                count: 0,
            },

            ubereats: {
                label: "Uber Eats",
                total: 0,
                count: 0,
            },

            otros: {
                label: t("cashRegisterPage.paymentMethods.other"),
                total: 0,
                count: 0,
            },

            ticket: {
                label: t("cashRegisterPage.paymentMethods.ticket"),
                total: 0,
                count: 0,
            },
        };

        let grandTotal = 0;
        let totalCount = 0;

        let creditSalesFromOrders = 0;
        let creditSalesCountFromOrders = 0;

        const normalizeText = (v) =>
            String(v || "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

        const normalizeMethod = (v) => normalizeText(v);

        const normalizeChannel = (r) => {
            const os = normalizeText(r?.orderSource || r?.source || r?.channel);
            if (os) return os;

            const t = r?.table || r?.tableId || r?.tableInfo || null;
            const vt = normalizeText(t?.virtualType || t?.type || r?.virtualType);
            return vt;
        };

        for (const r of rows) {
            const total = safeNumber(
                r?.bills?.totalWithTax ??
                r?.totalWithTax ??
                r?.total ??
                0
            );

            const pmRaw = normalizeMethod(r?.paymentMethod);

            /*
             * IMPORTANTE:
             * Crédito / Fiado NO suma como venta cobrada.
             * Se muestra aparte como CxC negativa / pendiente.
             */
            if (pmRaw.includes("credito") || pmRaw.includes("credit")) {
                creditSalesFromOrders += total;
                creditSalesCountFromOrders += 1;
                continue;
            }

            let key = "otros";
            const channel = normalizeChannel(r);

            if (pmRaw.includes("efect")) key = "efectivo";
            else if (pmRaw.includes("tarj")) key = "tarjeta";
            else if (pmRaw.includes("transf")) key = "transferencia";
            else if (
                channel.includes("pedidoya") ||
                channel.includes("pedido") ||
                channel.includes("pedidosya")
            ) {
                key = "pedidoya";
            } else if (channel.includes("ubereats") || channel.includes("uber")) {
                key = "ubereats";
            } else if (channel.includes("delivery")) {
                key = "delivery";
            }
            else if (pmRaw.includes("ticket")) key = "ticket";

            buckets[key].total += total;
            buckets[key].count += 1;

            grandTotal += total;
            totalCount += 1;
        }

        const receivablePaymentsCash = safeNumber(receivableSummary?.paymentsCash);
        const receivablePaymentsCard = safeNumber(receivableSummary?.paymentsCard);
        const receivablePaymentsTransfer = safeNumber(receivableSummary?.paymentsTransfer);
        const receivablePaymentsOther = safeNumber(receivableSummary?.paymentsOther);
        const receivablePaymentsTotal = safeNumber(receivableSummary?.paymentsTotal);

        const creditSales = safeNumber(
            receivableSummary?.creditSales || creditSalesFromOrders
        );

        const creditSalesCount = safeNumber(
            receivableSummary?.creditSalesCount || creditSalesCountFromOrders
        );

        /*
         * Los abonos o pagos de cuentas por cobrar SÍ son dinero cobrado.
         * Se suman al método correspondiente.
         */
        buckets.efectivo.total += receivablePaymentsCash;
        buckets.tarjeta.total += receivablePaymentsCard;
        buckets.transferencia.total += receivablePaymentsTransfer;
        buckets.otros.total += receivablePaymentsOther;

        grandTotal += receivablePaymentsTotal;

        const openingVal = safeNumber(openingInitial);
        const addedVal = safeNumber(addedTotal);

        const cashSales = safeNumber(buckets.efectivo.total) + safeNumber(buckets.ticket.total);

        const totalExpenses = safeNumber(expensesSummary?.totalExpenses);
        const cashExpenses = safeNumber(expensesSummary?.cashExpenses);

        /*
         * Efectivo en caja:
         * fondo inicial + agregado + efectivo cobrado - gastos en efectivo.
         * Si un abono CxC fue en efectivo, ya está dentro de buckets.efectivo.total.
         */
        const cashInRegister = openingVal + cashSales + addedVal - cashExpenses;

        /*
         * Total cobrado NO debe incluir fondo inicial.
         * totalWithMenudo queda solo como referencia, no como venta.
         */
        const totalWithMenudo = openingVal + grandTotal;
        const netSales = grandTotal - totalExpenses;

        return {
            buckets,

            // Total cobrado real: NO incluye crédito, SÍ incluye abonos CxC.
            grandTotal,
            netSales,
            totalWithMenudo,
            totalCount,

            openingInitial: openingVal,
            addedTotal: addedVal,
            cashSales,
            totalExpenses,
            cashExpenses,
            cashInRegister,

            // Cuentas por cobrar
            creditSales,
            creditSalesNegative: creditSales * -1,
            creditSalesCount,

            receivablePaymentsCash,
            receivablePaymentsCard,
            receivablePaymentsTransfer,
            receivablePaymentsOther,
            receivablePaymentsTotal,

            receivableNetImpact: receivablePaymentsTotal - creditSales,
        };
    };
    // Resumen basado en los últimos 10 registros
// Resumen basado en los registros de HOY
    const initialCashClosure = useMemo(
        () =>
            buildCashClosure(
                rawDayReports,
                openingInitial,
                addedTotal,
                expensesSummary,
                receivableCashSummary
            ),
        [
            rawDayReports,
            openingInitial,
            addedTotal,
            expensesSummary,
            i18n.resolvedLanguage,
            receivableCashSummary,
        ]
    );
// Resumen de ventas:
// Solo debe salir de órdenes, abonos CxC y métodos reales de pago.
// NO debe mezclar dinero declarado en el cierre.
    const summaryCashClosure = initialCashClosure;

// Resumen de cierre de caja:
// Sale del conteo declarado por la cajera/admin al cerrar.

    const systemExpectedInRegisterShown = useMemo(() => {
        /*
         * Efectivo que físicamente debe existir en la caja:
         *
         * fondo inicial
         * + dinero agregado
         * + ventas cobradas en efectivo
         * + abonos CxC cobrados en efectivo
         * - gastos pagados en efectivo
         *
         * initialCashClosure.cashInRegister ya contiene esta fórmula.
         */
        return Number(
            safeNumber(initialCashClosure?.cashInRegister).toFixed(2)
        );
    }, [
        initialCashClosure?.cashInRegister,
    ]);





    const modalCashClosure = useMemo(
        () =>
            buildCashClosure(
                modalFilteredReports,
                modalOpeningInitial,
                modalAddedTotal
            ),
        [
            modalFilteredReports,
            modalOpeningInitial,
            modalAddedTotal,
            i18n.resolvedLanguage,
        ]
    );




    // La fuente de verdad es la orden guardada, no un PDF persistido en Storage.
    const verFactura = async (orderId) => {
        try {
            const res = await api.get(`/api/order/${orderId}`);
            const fresh = res?.data?.data?.order ?? res?.data?.order ?? res?.data?.data ?? res?.data;
            if (!fresh?._id) throw new Error("ORDER_NOT_FOUND");
            setSelectedOrderInvoice(fresh);
        } catch (error) {
            console.error("Error cargando orden para factura:", error);
            showToast(t("cashRegisterPage.messages.invoiceLoadError"));
        }
    };


    const downloadExcel = async (
        reportsToExport = dayReports,
        summary = initialCashClosure
    ) => {
        try {
            const columns = {
                invoice:
                    t(
                        "cashRegisterPage.excel.columns.invoice"
                    ),

                date:
                    t(
                        "cashRegisterPage.excel.columns.date"
                    ),

                user:
                    t(
                        "cashRegisterPage.excel.columns.user"
                    ),

                customer:
                    t(
                        "cashRegisterPage.excel.columns.customer"
                    ),

                method:
                    t(
                        "cashRegisterPage.excel.columns.method"
                    ),

                total:
                    t(
                        "cashRegisterPage.excel.columns.total"
                    ),

                status:
                    t(
                        "cashRegisterPage.excel.columns.status"
                    ),

                orderId:
                    t(
                        "cashRegisterPage.excel.columns.orderId"
                    ),
            };

            const rows =
                reportsToExport.map(
                    (r) => ({
                        [columns.invoice]:
                            getInvoiceNumber(
                                r
                            ),

                        [columns.date]:
                            getReportReferenceDate(
                                r
                            )
                                ? formatDate(
                                    getReportReferenceDate(
                                        r
                                    ),
                                    localization
                                )
                                : "",

                        [columns.user]:
                            r?.user?.name ||
                            "—",

                        [columns.customer]:
                            getClientName(
                                r
                            ),

                        [columns.method]:
                            paymentMethodLabel(
                                r?.paymentMethod ||
                                "Efectivo"
                            ),

                        [columns.total]:
                            Number(
                                r?.bills
                                    ?.totalWithTax ??
                                r?.totalWithTax ??
                                r?.total ??
                                0
                            ),

                        [columns.status]:
                            isCreditOrder(
                                r
                            )
                                ? paymentStatusLabel(
                                    r?.creditStatus ||
                                    r?.paymentStatus,
                                    "pending"
                                )
                                : paymentStatusLabel(
                                    r?.paymentStatus,
                                    "paid"
                                ),

                        [columns.orderId]:
                            r?._id ||
                            "",
                    })
                );

            const ws =
                XLSX.utils
                    .json_to_sheet(
                        rows
                    );

            const wb =
                XLSX.utils
                    .book_new();

            XLSX.utils
                .book_append_sheet(
                    wb,
                    ws,
                    t(
                        "cashRegisterPage.excel.salesSheet"
                    )
                );

            const fieldColumn =
                t(
                    "cashRegisterPage.excel.columns.field"
                );

            const valueColumn =
                t(
                    "cashRegisterPage.excel.columns.value"
                );

            const summaryRow = (
                field,
                value
            ) => ({
                [fieldColumn]:
                field,

                [valueColumn]:
                value,
            });

            const summaryRows = [
                summaryRow(
                    t(
                        "cashRegisterPage.excel.summary.opening"
                    ),
                    Number(
                        summary?.openingInitial ||
                        0
                    )
                ),

                summaryRow(
                    t(
                        "cashRegisterPage.excel.summary.creditSales"
                    ),
                    Number(
                        (
                            summary?.creditSales ||
                            0
                        ) *
                        -1
                    )
                ),

                summaryRow(
                    t(
                        "cashRegisterPage.excel.summary.receivablePayments"
                    ),
                    Number(
                        summary
                            ?.receivablePaymentsTotal ||
                        0
                    )
                ),

                summaryRow(
                    t(
                        "cashRegisterPage.excel.summary.receivableCash"
                    ),
                    Number(
                        summary
                            ?.receivablePaymentsCash ||
                        0
                    )
                ),

                summaryRow(
                    t(
                        "cashRegisterPage.excel.summary.receivableCard"
                    ),
                    Number(
                        summary
                            ?.receivablePaymentsCard ||
                        0
                    )
                ),

                summaryRow(
                    t(
                        "cashRegisterPage.excel.summary.receivableTransfer"
                    ),
                    Number(
                        summary
                            ?.receivablePaymentsTransfer ||
                        0
                    )
                ),

                summaryRow(
                    t(
                        "cashRegisterPage.excel.summary.cashSales"
                    ),
                    Number(
                        summary?.cashSales ||
                        0
                    )
                ),

                summaryRow(
                    t(
                        "cashRegisterPage.excel.summary.cashInRegister"
                    ),
                    Number(
                        summary
                            ?.cashInRegister ||
                        0
                    )
                ),

                summaryRow(
                    t(
                        "cashRegisterPage.excel.summary.grandTotal"
                    ),
                    Number(
                        summary?.grandTotal ||
                        0
                    )
                ),

                summaryRow(
                    t(
                        "cashRegisterPage.excel.summary.orders"
                    ),
                    Number(
                        summary?.totalCount ||
                        0
                    )
                ),

                summaryRow(
                    t(
                        "cashRegisterPage.excel.summary.totalWithOpening"
                    ),
                    Number(
                        summary
                            ?.totalWithMenudo ||
                        0
                    )
                ),

                summaryRow(
                    t(
                        "cashRegisterPage.excel.summary.addedCash"
                    ),
                    Number(
                        summary?.addedTotal ||
                        0
                    )
                ),

            ];

            const ws2 =
                XLSX.utils
                    .json_to_sheet(
                        summaryRows
                    );

            XLSX.utils
                .book_append_sheet(
                    wb,
                    ws2,
                    t(
                        "cashRegisterPage.excel.summarySheet"
                    )
                );

            const arrayBuffer =
                XLSX.write(
                    wb,
                    {
                        bookType:
                            "xlsx",

                        type:
                            "array",
                    }
                );

            const blob =
                new Blob(
                    [
                        arrayBuffer,
                    ],
                    {
                        type:
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    }
                );

            saveAs(
                blob,
                `${t(
                    "cashRegisterPage.excel.filePrefix"
                )}_${getTodayYMD(
                    localization
                )}.xlsx`
            );
        } catch (error) {
            console.error(
                "Error exportando Excel:",
                error
            );

            showToast(
                t(
                    "cashRegisterPage.messages.exportError"
                )
            );
        }
    };

    const [addAmountInput, setAddAmountInput] = useState("");
    const [toast, setToast] = useState({ open: false, message: "", type: "error" });


    const showToast = (message, type = "error") => {
        setToast({ open: true, message, type });
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3500);
    };
    const resetEcfAdjustmentForm = (documentType = "34") => {
        setConfirmedFullDebit(false);
        setConfirmedFullCredit(false);
        setEcfAdjustmentForm({
            adjustmentMode: "partial",
            amount: "",
            tax: "",
            reason:
                documentType === "34"
                    ? t(
                        "cashRegisterPage.ecf.defaultCreditReason"
                    )
                    : t(
                        "cashRegisterPage.ecf.defaultDebitReason"
                    ),
            modificationCode: getAdjustmentCode(documentType, "partial"),
        });
        setLastEcfAdjustmentResult(null);
    };

    const openEcfAdjustmentModal = async (order, documentType = "34") => {
        try {
            if (!ecfAdjustmentsEnabled) {
                showToast(
                    t("cashRegisterPage.ecf.disabled")
                );
                return;
            }

            if (documentType === "33" && !e33Enabled) {
                showToast(
                    t("cashRegisterPage.ecf.debitDisabled")
                );
                return;
            }

            if (documentType === "34" && !e34Enabled) {
                showToast(
                    t("cashRegisterPage.ecf.creditDisabled")
                );
                return;
            }
            if (!order?._id) {
                showToast(
                    t("cashRegisterPage.ecf.orderUnavailable")
                );
                return;
            }

            const res = await api.get(`/api/order/${order._id}/ecf`);
            const ecfData = res?.data?.data || {};

            const isAccepted =
                res?.data?.exists === true &&
                ["accepted", "accepted_with_observation"].includes(
                    String(ecfData?.status || "").trim()
                );

            if (!isAccepted || !ecfData?.eNCF) {
                showToast(
                    t("cashRegisterPage.ecf.acceptedOnly")
                );
                return;
            }

            setEcfAdjustmentModal({
                open: true,
                order,
                documentType,
                originalEcf: ecfData,
            });

            resetEcfAdjustmentForm(documentType);
        } catch (error) {
            console.error("[openEcfAdjustmentModal] error:", error);
            showToast(
                error?.response?.data?.message ||
                t("cashRegisterPage.ecf.validationError")
            );
        }
    };

    const closeEcfAdjustmentModal = () => {
        setEcfAdjustmentModal({
            open: false,
            order: null,
            documentType: "34",
            originalEcf: null,
        });
        resetEcfAdjustmentForm("34");
    };

    // Preview is advisory only. The backend derives and validates taxes from
    // the persisted original fiscal snapshot before reserving an e-NCF.
    const previewTaxRate = getPreviewTaxRate(ecfAdjustmentModal?.order);
    const previewBase = parseMoneyInput(ecfAdjustmentForm.amount);
    const previewTaxAmount = getPreviewTaxAmount(previewBase, previewTaxRate);

    const {
        data: ecfAdjustmentsResponse,
        isLoading: ecfAdjustmentsLoading,
        isError: ecfAdjustmentsFailed,
    } = useQuery({
        queryKey: ["order-ecf-adjustments", ecfAdjustmentModal?.order?._id],
        queryFn: async () => {
            const orderId = ecfAdjustmentModal?.order?._id;
            if (!orderId) return { success: true, data: [] };

            const res = await api.get(`/api/order/${orderId}/ecf/adjustments`);
            return res.data;
        },
        enabled: ecfAdjustmentModal.open && Boolean(ecfAdjustmentModal?.order?._id),
        retry: 0,
    });

    const ecfAdjustments = useMemo(() => {
        const rows = Array.isArray(ecfAdjustmentsResponse?.data)
            ? ecfAdjustmentsResponse.data
            : [];

        const map = new Map();

        for (const doc of rows) {
            const key = doc?.documentId || doc?.eNCF;
            if (!key) continue;
            map.set(key, doc);
        }

        return Array.from(map.values());
    }, [ecfAdjustmentsResponse]);

    const roundMoney = (value) =>
        Math.round((Number(value) || 0) * 100) / 100;

    const acceptedAdjustmentStatuses = ["accepted", "accepted_with_observation"];

    const originalEcfTotal = roundMoney(
        ecfAdjustmentModal?.originalEcf?.totals?.total || 0
    );

    const acceptedDebitNotesTotal = useMemo(() => {
        return roundMoney(
            ecfAdjustments
                .filter((doc) => {
                    const type = String(doc?.documentType || "").trim();
                    const status = String(doc?.status || "").trim();

                    return (
                        type === "33" &&
                        acceptedAdjustmentStatuses.includes(status)
                    );
                })
                .reduce((sum, doc) => {
                    return sum + Number(doc?.totals?.total || 0);
                }, 0)
        );
    }, [ecfAdjustments]);

    const acceptedCreditNotesTotal = useMemo(() => {
        return roundMoney(
            ecfAdjustments
                .filter((doc) => {
                    const type = String(doc?.documentType || "").trim();
                    const status = String(doc?.status || "").trim();

                    return (
                        type === "34" &&
                        acceptedAdjustmentStatuses.includes(status)
                    );
                })
                .reduce((sum, doc) => {
                    return sum + Number(doc?.totals?.total || 0);
                }, 0)
        );
    }, [ecfAdjustments]);

    const availableCreditTotal = getAvailableOriginalCredit(
        originalEcfTotal,
        acceptedCreditNotesTotal
    );

    // Identificador estable ante reintentos de red; se renueva tras una emisión confirmada.
    const ecfAdjustmentRequestIdRef = useRef(null);
    const issueEcfAdjustmentMutation = useMutation({
        mutationFn: async () => {
            const orderId = ecfAdjustmentModal?.order?._id;
            const documentType = ecfAdjustmentModal?.documentType;

            if (!orderId) {
                throw new Error("ORDER_ID_REQUIRED");
            }

            const adjustmentMode = String(ecfAdjustmentForm.adjustmentMode || "partial");
            const amount = Number(String(ecfAdjustmentForm.amount || "").replace(/[^\d.-]/g, ""));
            const reason = String(ecfAdjustmentForm.reason || "").trim();
            const modificationCode = getAdjustmentCode(documentType, adjustmentMode);

            if (ecfAdjustmentsLoading || ecfAdjustmentsFailed) {
                throw new Error("Es necesario consultar las notas fiscales existentes antes de emitir otra.");
            }
            if (documentType === "34" && adjustmentMode === "total" && !confirmedFullCredit) {
                throw new Error("Confirma expresamente la anulación del saldo pendiente del comprobante.");
            }
            if (documentType === "33" && adjustmentMode === "total" && !confirmedFullDebit) {
                throw new Error("Confirma que deseas aumentar la factura por un importe igual a su total original.");
            }

            if (!reason) {
                throw new Error(
                    t("cashRegisterPage.ecf.reasonRequired")
                );
            }

            if (!ecfAdjustmentRequestIdRef.current) {
                ecfAdjustmentRequestIdRef.current =
                    (typeof crypto !== "undefined" && crypto.randomUUID)
                        ? crypto.randomUUID()
                        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            }
            const payload = {
                requestId: ecfAdjustmentRequestIdRef.current,
                documentType,
                adjustmentMode,
                reason,
                modificationCode,
                ...(documentType === "34" && adjustmentMode === "total"
                    ? { confirmFullCancellation: true } : {}),
            };

            if (adjustmentMode !== "total") {
                if (!Number.isFinite(amount) || amount <= 0) {
                    throw new Error(
                        t("cashRegisterPage.ecf.validAmountRequired")
                    );
                }

                payload.amount = amount;
                // No enviar ITBIS arbitrario: el backend calcula el impuesto
                // a partir del desglose fiscal verificado del e-CF original.
            }

            if (documentType === "34") {
                const requestedCreditTotal =
                    adjustmentMode === "total"
                        ? availableCreditTotal
                        : (previewTaxAmount === null ? amount : roundMoney(amount + previewTaxAmount));

                if (availableCreditTotal <= 0) {
                    throw new Error(
                        t("cashRegisterPage.ecf.noCreditBalance")
                    );
                }

                if (requestedCreditTotal > availableCreditTotal + 0.01) {
                    throw new Error(
                        t(
                            "cashRegisterPage.ecf.creditExceedsBalance",
                            {
                                available:
                                    currency(
                                        availableCreditTotal
                                    ),

                                requested:
                                    currency(
                                        requestedCreditTotal
                                    ),
                            }
                        )
                    );
                }
            }

            const res = await api.post(`/api/order/${orderId}/ecf/adjustment`, payload);
            return res.data;
        },
        onMutate: () => {
            setLastEcfAdjustmentResult(null);
        },
        onSuccess: (res) => {
            ecfAdjustmentRequestIdRef.current = null;
            const data = res?.data || {};
            setLastEcfAdjustmentResult(data);

            showToast(
                t(
                    "cashRegisterPage.ecf.noteIssued",
                    {
                        type:
                            data?.documentType === "33"
                                ? t("cashRegisterPage.ecf.debitNote")
                                : t("cashRegisterPage.ecf.creditNote"),

                        number:
                            data?.eNCF || "",
                    }
                ),
                "success"
            );

            queryClient.invalidateQueries({
                queryKey: ["order-ecf-adjustments", ecfAdjustmentModal?.order?._id],
            });
        },
        onError: (error) => {
            console.error("[issueEcfAdjustmentMutation] error:", error);
            const code = String(error?.response?.data?.code || error?.response?.data?.message || error?.message || "");
            const friendlyErrors = {
                E34_PARTIAL_REQUIRES_CODE_3: "Las notas de crédito parciales deben utilizar el código 3 (corrección de montos).",
                E34_TOTAL_REQUIRES_CODE_1: "La anulación total de una factura utiliza el código 1.",
                E33_REQUIRES_AMOUNT_CORRECTION_CODE_3: "La nota de débito utiliza el código 3 (corrección de montos).",
                ECF_ADJUSTMENT_TAX_RATE_MISMATCH: "El ITBIS no coincide con el tratamiento fiscal de la factura original.",
                ECF_ADJUSTMENT_ITEMIZED_TAX_REQUIRED: "La factura original combina tratamientos fiscales. Se necesita una nota desglosada por artículos, aún no disponible.",
                ECF_ADJUSTMENT_ORIGINAL_TAX_SNAPSHOT_REQUIRED: "La factura original no tiene un desglose fiscal verificable. No se puede emitir la nota automáticamente.",
                ECF_TEXT_ONLY_ADJUSTMENT_NOT_IMPLEMENTED: "La corrección solamente de texto todavía no está disponible.",
            };
            showToast(friendlyErrors[code] || error?.response?.data?.message || error?.message || t("cashRegisterPage.ecf.issueError"));
        },
    });
    const getAdjustmentTitle = (documentType) => {
        const type =
            String(
                documentType || ""
            ).trim();

        if (type === "33") {
            return t(
                "cashRegisterPage.ecf.debitNoteElectronic"
            );
        }

        if (type === "34") {
            return t(
                "cashRegisterPage.ecf.creditNoteElectronic"
            );
        }

        return t(
            "cashRegisterPage.ecf.electronicNote"
        );
    };

    const buildAdjustmentInvoiceOrder = (doc = {}) => {
        const documentType = String(doc.documentType || doc?.ecf?.documentType || "").trim();

        const subtotal = Number(doc?.totals?.subtotal || 0);
        const tax = Number(doc?.totals?.tax || 0);
        const discount = Number(doc?.totals?.discount || 0);
        const total = Number(doc?.totals?.total || 0);

        const reference = doc.reference || {};
        const originalEcf = ecfAdjustmentModal?.originalEcf || {};

        const fallbackItemName =
            documentType === "33"
                ? `Nota de débito - ${reference?.reason || "Ajuste"}`
                : `Nota de crédito - ${reference?.reason || "Ajuste"}`;

        const noteItems =
            Array.isArray(doc.items) && doc.items.length
                ? doc.items
                : [
                    {
                        name: fallbackItemName,
                        quantity: 1,
                        unitPrice: subtotal || total,
                        price: subtotal || total,
                        note: reference?.reason || "",
                    },
                ];

        return {
            _id: doc.documentId,
            createdAt: doc.createdAt || new Date().toISOString(),

            facturaNo: doc.eNCF,
            invoiceNumber: doc.eNCF,

            fiscal: {
                requested: documentType === "33",
                ecfDocumentType: documentType,
                ncfType: `E${documentType}`,
                internalNumber: doc.eNCF,
                issuedAt: doc.createdAt || new Date().toISOString(),
            },

            customerDetails: {
                name: doc?.customer?.name || originalEcf?.customer?.name || "Consumidor Final",
                rnc: doc?.customer?.document || originalEcf?.customer?.document || "",
                rncCedula: doc?.customer?.document || originalEcf?.customer?.document || "",
                phone: "",
                address: "",
            },

            paymentMethod: "Ajuste e-CF",

            bills: {
                subtotal,
                total: subtotal,
                discount,
                taxEnabled: tax > 0,
                tax,
                tipEnabled: false,
                tip: 0,
                tipAmount: 0,
                deliveryFee: 0,
                totalWithTax: total,
            },

            items: noteItems,

            ecf: {
                exists: true,
                documentType,
                eNCF: doc.eNCF,
                status: doc.status,
                trackId: doc.trackId,
                securityCode: doc.securityCode,
                qrUrl: doc.qrUrl,
                fechaHoraFirma: doc.fechaHoraFirma,
                reference,
            },
        };
    };

    const openAdjustmentInvoicePreview = (doc) => {
        const invoiceData = {
            title: getAdjustmentTitle(doc?.documentType),
            order: buildAdjustmentInvoiceOrder(doc),
        };

        // Cerrar el modal de creación/listado de notas para que Invoice no quede detrás
        setEcfAdjustmentModal({
            open: false,
            order: null,
            documentType: "34",
            originalEcf: null,
        });

        // Abrir la vista imprimible de la nota
        setSelectedAdjustmentInvoice(invoiceData);
    };

    const renderInvoiceActions = (r) => {
        if (!r?._id) {
            return (
                <span className="text-xs text-gray-500">
                    {t("cashRegisterPage.common.unavailable")}
                </span>
            );
        }

        return (
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => verFactura(r._id)}
                    className="text-blue-400 hover:text-blue-300 hover:underline text-sm transition-colors"
                >
                    {t("cashRegisterPage.actions.view")}
                </button>

                {e34Enabled && (
                    <button
                        type="button"
                        onClick={() => openEcfAdjustmentModal(r, "34")}
                        className="px-2 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                    >
                        {t("cashRegisterPage.ecf.creditNote")}
                    </button>
                )}

                {e33Enabled && (
                    <button
                        type="button"
                        onClick={() => openEcfAdjustmentModal(r, "33")}
                        className="px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                    >
                        {t("cashRegisterPage.ecf.debitNote")}
                    </button>
                )}
            </div>
        );
    };

    const resetModalFilters = () => {
        setModalFilters({
            from: "",
            to: "",
            method: "",
            fiscal: "",
            registerId: "",
            user: "",
            client: "",
        });
    };


    const closeModal = () => {
        setShowFullView(false);
        setShowFiltersMenu(false);
        resetModalFilters();
    };

    const handleSelectAdminSessionToClose = (s) => {
        setAdminCloseTargetSession(s);
        setHideAdminSelectedSession(true);

        setClosingCountedInput("");
        setClosingNote("");
        setCloseManagerCode("");
        setClosingInputMode(CLOSING_INPUT_MODE_TOTAL);
        setClosingDenominationCounts(createEmptyDenominationCounts());
        setTicketAmountInput("");
        setTicketCountInput("");
        setTransferCountedInput("");
        setOtherCountedInput("");
        setTimeout(() => {
            closeFormRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 80);
    };
    useEffect(() => {
        setAdminCloseTargetSession(null);
        setHideAdminSelectedSession(false);
    }, [selectedYMD, activeRegisterId]);
    return (
        <>

            {/* Contenido normal (fondo). Se bloquea cuando el modal está abierto */}
            <div className={showFullView ? "pointer-events-none select-none" : ""}>
                {/* TODO tu contenido actual de la página (header, cards, tabla, etc.) */}
        <div className={showFullView ? "pointer-events-none select-none" : ""}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-bold text-white">
                            {t("cashRegisterPage.title")}
                        </h2>
                        {canConsultClosingDocuments && (
                            <button type="button" onClick={() => setShowClosingDocuments(true)}
                                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20">
                                {String(i18n.resolvedLanguage || "es").startsWith("en")
                                    ? "View invoices and notes" : "Ver facturas y notas"}
                            </button>
                        )}
                        {canManageFiscalIncidents && (
                            <button type="button" onClick={() => setShowEcfIncidents(true)}
                                className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/20">
                                Incidentes e-CF
                            </button>
                        )}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                        {t("cashRegisterPage.registers.active")}:{" "}
                        <span className="text-white font-medium">
                            {activeRegisterLabel}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                       <span className="text-sm text-gray-400 whitespace-nowrap">
                            {t("cashRegisterPage.common.date")}:
                        </span>
                        <input
                            type="date"
                            value={selectedYMD}
                            onChange={(e) => setSelectedYMD(e.target.value)}
                            className="w-full sm:w-auto bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-[#f6b100]/50"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm text-gray-400 whitespace-nowrap">
                            {t("cashRegisterPage.common.register")}:
                        </span>
                        {isAdminLike ? (
                            <select
                                value={activeRegisterId}
                                onChange={(e) => setSelectedRegisterId(e.target.value)}
                                className="w-full sm:w-auto min-w-[220px] bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-[#f6b100]/50"
                                disabled={registersLoading}
                            >
                                <option value={ALL_REGISTERS_ID}>
                                    {t("cashRegisterPage.registers.allSales")}
                                </option>

                                {registers.length > 0 &&
                                    registers.map((r) => (
                                        <option key={r._id || r.code} value={r.code}>
                                            {r.name}{r.location ? ` — ${r.location}` : ""}
                                        </option>
                                    ))
                                }
                            </select>
                        ) : (
                            <div className="w-full sm:w-auto min-w-[220px] bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm px-3 py-2">
                                {activeRegisterLabel}
                            </div>
                        )}
                    </div>

                    {isAdmin && showSummary && (
                        <button
                            onClick={() => setShowFullView(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all"
                        >
                            <Search className="w-4 h-4" />
                            {t("cashRegisterPage.actions.viewFullRecords")}
                        </button>
                    )}
                </div>
            </div>

            {/* Fondo inicial */}

            {showCashSessionControls && (
                <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Columna izquierda: texto + cards (esto elimina el espacio vacío) */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-white font-semibold text-lg">
                                {t("cashRegisterPage.opening.title")}
                            </h3>

                            <p className="text-sm text-gray-400 mt-1">
                                {t("cashRegisterPage.opening.description")}
                            </p>
                        </div>

                        {/* Cards pasan aquí */}
                        {(isAdminLike || sessionClosed) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                <div className="text-xs text-gray-400 mb-1">{t("cashRegisterPage.opening.currentFloat")}</div>
                                <div className="text-sm font-semibold text-white">{currency(menudoActual)}</div>
                                <div className="text-[11px] text-gray-500 mt-1">
                                    {t(
                                        "cashRegisterPage.opening.initialAdded",
                                        {
                                            initial:
                                                currency(openingInitial),

                                            added:
                                                currency(addedTotal),
                                        }
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                <div className="text-xs text-gray-400 mb-1">{t("cashRegisterPage.opening.cashSales")}</div>
                                <div className="text-sm font-semibold text-white">{currency(initialCashClosure.cashSales)}</div>
                            </div>

                            <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                <div className="text-xs text-gray-400 mb-1">{t("cashRegisterPage.opening.dayExpenses")}</div>
                                <div className="text-sm font-semibold text-red-400">
                                    {currency(initialCashClosure.totalExpenses)}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">
                                    {t(
                                        "cashRegisterPage.opening.cashExpenses",
                                        {
                                            amount:
                                                currency(
                                                    initialCashClosure.cashExpenses
                                                ),
                                        }
                                    )}
                                </div>
                            </div>
                            <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3 hover:border-[#f6b100]/30 transition-colors">
                                <div className="text-xs text-gray-400 mb-1">{t("cashRegisterPage.opening.cashInRegister")}</div>
                                <div className="text-sm font-semibold text-[#f6b100]">{currency(initialCashClosure.cashInRegister)}</div>
                            </div>
                            <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                <div className="text-xs text-gray-400 mb-1">{t("cashRegisterPage.opening.netSales")}</div>
                                <div className="text-sm font-semibold text-white">
                                    {currency(initialCashClosure.netSales)}
                                </div>
                            </div>
                        </div>
                        )}
                    </div>


                    {/* Columna derecha: formulario */}
                    <div className="w-full max-w-sm justify-self-end">
                        <label className="text-xs text-gray-400 mb-1 block">{t("cashRegisterPage.opening.amountExample")}</label>
                        <input
                            value={openingCashInput}
                            disabled={disableOpeningInput}
                            onChange={(e) => {
                                if (disableOpeningInput) return;
                                openingEditedRef.current = true;
                                setOpeningCashInput(formatThousands(e.target.value));
                            }}
                            inputMode="decimal"
                            className={`w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#f6b100]/50 ${
                                disableOpeningInput ? "opacity-60 cursor-not-allowed" : ""
                            }`}
                            placeholder="0"
                        />

                        {isAdminLike && sessionExists && (isSelectedToday || isAdmin) && (
                            <div className="mt-3">
                                <label className="text-xs text-gray-400 mb-1 block">{t("cashRegisterPage.opening.addMoney")}</label>
                                <div className="flex gap-2">
                                    <input
                                        value={addAmountInput}
                                        onChange={(e) => setAddAmountInput(e.target.value)}
                                        inputMode="decimal"
                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm"
                                        placeholder="0"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!isAdminLike) {
                                                showToast(
                                                    t("cashRegisterPage.messages.adminOnlyAddCash")
                                                );
                                                return;
                                            }

                                            if (!sessionExists) {
                                                showToast(
                                                    t("cashRegisterPage.messages.sessionNotFound")
                                                );
                                                return;
                                            }

                                            if (sessionClosed && !isAdminLike) {
                                                showToast(
                                                    t("cashRegisterPage.messages.cannotAddToClosedRegister")
                                                );
                                                return;
                                            }

                                            const cleaned = String(addAmountInput ?? "").replace(/[^\d.-]/g, "");
                                            const amount = Number(cleaned);

                                            if (!Number.isFinite(amount) || amount <= 0) {
                                                showToast(
                                                    t("cashRegisterPage.messages.invalidAmount")
                                                );
                                                return;
                                            }

                                            addCashMutation.mutate({
                                                dateYMD: selectedYMD,
                                                registerId: activeRegisterId,
                                                amount,
                                            });

                                            setAddAmountInput("");
                                        }}
                                        className="px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold"
                                    >
                                        {t("cashRegisterPage.actions.add")}
                                    </button>
                                </div>

                                <div className="text-xs text-gray-500 mt-1">
                                    {t("cashRegisterPage.opening.adminOnlyHint")}
                                </div>
                            </div>
                        )}

                        {/* Acciones */}
                        <div className="mt-2">
                            {/* CAJERA: solo puede guardar 1 vez el fondo inicial, solo HOY y solo si no existe opening */}
                            {isCashier && isSelectedToday && !openingAlreadySet && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const cleaned = String(openingCashInput ?? "").replace(/[^\d.-]/g, "");
                                        const openingFloat = Number(cleaned);
                                        if (!Number.isFinite(openingFloat) || openingFloat <= 0) return;

                                        const cleanRegisterId = String(activeRegisterId || "").trim().toUpperCase();

                                        if (!cleanRegisterId || cleanRegisterId === ALL_REGISTERS_ID) {
                                            showToast(
                                                t(
                                                    "cashRegisterPage.messages.selectSpecificRegisterBeforeOpening"
                                                ),
                                                "error"
                                            );
                                            return;
                                        }

                                        openCashSessionMutation.mutate({
                                            dateYMD: selectedYMD,
                                            registerId: cleanRegisterId,
                                            openingFloat,
                                        });
                                    }}
                                    className="w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold"
                                >
                                    {t("cashRegisterPage.opening.saveInitial")}
                                </button>
                            )}
                            {isCashier && openingAlreadySet && !sessionClosed && !isEditingOpening && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditingOpening(true);
                                        setOpeningCashInput(formatThousands(openingInitial || 0));
                                    }}
                                    className="mt-2 w-full px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold"
                                >
                                    {t("cashRegisterPage.opening.editWithManager")}
                                </button>
                            )}
                            {isCashier && isEditingOpening && openingAlreadySet && !sessionClosed && (
                                <div className="mt-3 space-y-2">
                                    <label className="text-xs text-gray-400">{t("cashRegisterPage.manager.code")}</label>
                                    <input
                                        type="password"
                                        value={openingManagerCode}
                                        onChange={(e) => setOpeningManagerCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm"
                                        placeholder={t(
                                            "cashRegisterPage.manager.codePlaceholder"
                                        )}
                                        inputMode="numeric"
                                        autoComplete="new-password"
                                    />

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const cleaned = String(openingCashInput ?? "").replace(/[^\d.-]/g, "");
                                                const openingFloat = Number(cleaned);

                                                if (!Number.isFinite(openingFloat) || openingFloat <= 0) {
                                                    showToast("Monto inválido.");
                                                    return;
                                                }

                                                if (!openingManagerCode.trim()) {
                                                    showToast(
                                                        t("cashRegisterPage.messages.managerCodeRequired")
                                                    );
                                                    return;
                                                }

                                                const cleanRegisterId = String(activeRegisterId || "").trim().toUpperCase();

                                                if (!cleanRegisterId || cleanRegisterId === ALL_REGISTERS_ID) {
                                                    showToast(
                                                        t(
                                                            "cashRegisterPage.messages.selectSpecificRegisterBeforeEditingOpening"
                                                        ),
                                                        "error"
                                                    );
                                                    return;
                                                }

                                                adjustOpeningMutation.mutate({
                                                    dateYMD: selectedYMD,
                                                    registerId: cleanRegisterId,
                                                    openingFloat,
                                                    managerCode: openingManagerCode.trim(),
                                                    note: `Fondo inicial ajustado por cajera con autorización manager (${selectedYMD})`,
                                                });
                                            }}
                                            disabled={adjustOpeningMutation.isPending}
                                            className="w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold disabled:opacity-60"
                                        >
                                            {adjustOpeningMutation.isPending
                                                ? t("cashRegisterPage.actions.saving")
                                                : t("cashRegisterPage.actions.saveChange")}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditingOpening(false);
                                                setOpeningManagerCode("");
                                                setOpeningCashInput(formatThousands(openingInitial || 0));
                                            }}
                                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold"
                                        >
                                            {t("cashRegisterPage.actions.cancel")}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ADMIN: puede crear fondo inicial HOY si aún no existe */}
                            {isAdmin && !sessionExists && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const cleaned = String(openingCashInput ?? "").replace(/[^\d.-]/g, "");
                                        const openingFloat = Number(cleaned);
                                        if (!Number.isFinite(openingFloat) || openingFloat < 0) return;

                                        const cleanRegisterId = String(activeRegisterId || "").trim().toUpperCase();

                                        if (!cleanRegisterId || cleanRegisterId === ALL_REGISTERS_ID) {
                                            showToast(
                                                t(
                                                    "cashRegisterPage.messages.selectSpecificRegisterBeforeEditingOpening"
                                                ),
                                                "error"
                                            );
                                            return;
                                        }

                                        if (registers.length > 0 && !registers.some((r) => r.code === cleanRegisterId)) {
                                            showToast(
                                                t(
                                                    "cashRegisterPage.messages.selectedRegisterUnavailable"
                                                ),
                                                "error"
                                            );
                                            return;
                                        }

                                        openCashSessionMutation.mutate({
                                            dateYMD: selectedYMD,
                                            registerId: cleanRegisterId,
                                            openingFloat,
                                        });
                                    }}
                                    className="w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold"
                                >
                                    {t(
                                        "cashRegisterPage.opening.saveInitialAdmin",
                                        {
                                            date:
                                            selectedYMD,
                                        }
                                    )}
                                </button>
                            )}


                            {/* ADMIN: puede editar el fondo inicial EN CUALQUIER FECHA si existe sesión */}
                            {isAdmin && sessionExists && (
                                <div className="mt-2 flex gap-2">
                                    {!isEditingOpening ? (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingOpening(true)}
                                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold"
                                        >
                                            {t("cashRegisterPage.opening.editInitial")}
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const cleaned = String(openingCashInput ?? "").replace(/[^\d.-]/g, "");
                                                    const openingFloat = Number(cleaned);
                                                    if (!Number.isFinite(openingFloat) || openingFloat < 0) return;

                                                    const cleanRegisterId = String(activeRegisterId || "").trim().toUpperCase();

                                                    if (!cleanRegisterId || cleanRegisterId === ALL_REGISTERS_ID) {
                                                        showToast(
                                                            t(
                                                                "cashRegisterPage.messages.selectSpecificRegisterBeforeEditingOpening"
                                                            ),
                                                            "error"
                                                        );
                                                        return;
                                                    }

                                                    adjustOpeningMutation.mutate({
                                                        dateYMD: selectedYMD,
                                                        registerId: cleanRegisterId,
                                                        openingFloat,
                                                        note: `Ajuste de fondo inicial por admin (${selectedYMD})`,
                                                    });
                                                }}
                                                className="w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold"
                                            >
                                                {t("cashRegisterPage.actions.saveChanges")}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditingOpening(false);
                                                    setOpeningCashInput(formatThousands(openingInitial || 0));
                                                }}
                                                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold"
                                            >
                                                {t("cashRegisterPage.actions.cancel")}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}


                            {/* Mensajes */}
                            <div className="text-xs text-gray-500 mt-2">
                                {isSelectedToday
                                    ? (
                                        openingAlreadySet
                                            ? t(
                                                "cashRegisterPage.opening.savedToday"
                                            )
                                            : t(
                                                "cashRegisterPage.opening.notSavedToday"
                                            )
                                    )
                                    : t(
                                        "cashRegisterPage.opening.showingHistory"
                                    )}
                            </div>
                        </div>

                        {sessionClosed && (
                            <div className="mb-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const closing = session?.closing || {};
                                        const savedBreakdown = Array.isArray(closing?.breakdown) ? closing.breakdown : [];

                                        const savedTicket = savedBreakdown.find((item) => isTicketBreakdownItem(item));

                                        const hasDetailedClose =
                                            savedBreakdown.length > 0 ||
                                            safeNumber(closing?.transferCountedTotal) > 0 ||
                                            safeNumber(closing?.otherCountedTotal) > 0 ||
                                            safeNumber(closing?.totalDeclaredAtClose) > 0;

                                        setAdjustCountedInput(formatThousands(closing?.countedTotal ?? ""));
                                        setAdjustNote(closing?.note || session?.notes || "");
                                        setAdjustManagerCode("");

                                        setAdjustInputMode(
                                            hasDetailedClose ? CLOSING_INPUT_MODE_BREAKDOWN : CLOSING_INPUT_MODE_TOTAL
                                        );

                                        setAdjustDenominationCounts(buildCountsFromSavedBreakdown(savedBreakdown));

                                        setAdjustTicketAmountInput(
                                            savedTicket?.value ? formatThousands(savedTicket.value) : ""
                                        );

                                        setAdjustTicketCountInput(
                                            savedTicket?.count ? String(Number(savedTicket.count || 0)) : ""
                                        );

                                        setAdjustTransferCountedInput(
                                            closing?.transferCountedTotal ? formatThousands(closing.transferCountedTotal) : ""
                                        );

                                        setAdjustOtherCountedInput(
                                            closing?.otherCountedTotal ? formatThousands(closing.otherCountedTotal) : ""
                                        );

                                        setAdjustCloseOpen(true);
                                    }}
                                    className="w-full px-3 py-2 bg-[#262626] border border-gray-800/50 rounded-lg text-white font-semibold"
                                >
                                    {t("cashRegisterPage.adjustClose.title")}
                                </button>
                            </div>
                        )}
                        {isAdminLike && (
                            <button
                                type="button"
                                onClick={() => setManagerCodeModalOpen(true)}
                                className="w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633]"
                            >
                                {t("cashRegisterPage.manager.title")}
                            </button>
                        )}

                    </div>
                </div>
            </div>
            )}

            {showSummary && (
                <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                    <h3 className="text-white font-semibold text-lg">
                        {t("cashRegisterPage.closing.comparisonTitle")}
                    </h3>

                    {(() => {


                        const counted = safeNumber(closingCountedForComparison);



// Si receivablePaymentsCash ya está incluido dentro de cashSales, no lo sumamos otra vez.
                        const expected = safeNumber(systemExpectedInRegisterShown);

                        const diff = Number((counted - expected).toFixed(2));
                        return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                    <div className="text-xs text-gray-400 mb-1">{t("cashRegisterPage.closing.systemExpected")}</div>
                                    <div className="text-sm font-semibold text-white">{currency(expected)}</div>
                                </div>

                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                    <div className="text-xs text-gray-400 mb-1">{t("cashRegisterPage.closing.countedCash")}</div>
                                    <div className="text-sm font-semibold text-white">{currency(counted)}</div>
                                </div>

                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                    <div className="text-xs text-gray-400 mb-1">{t("cashRegisterPage.closing.difference")}</div>
                                    <div className={`text-sm font-semibold ${diff === 0 ? "text-white" : diff < 0 ? "text-red-400" : "text-green-400"}`}>
                                        {currency(diff)}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                    {(session?.closing?.note || session?.notes) && (
                        <div className="mt-3 rounded-lg bg-[#111] border border-gray-800/40 p-3">
                            <div className="text-xs text-gray-400">{t("cashRegisterPage.closing.closeNote")}</div>
                            <div className="text-sm text-white mt-1">{session?.closing?.note || session?.notes}</div>
                        </div>
                    )}
                    {closingDeclaredSummary?.hasData &&
                        (() => {
                            const closingBreakdown = Array.isArray(closingDeclaredSummary?.breakdown)
                                ? closingDeclaredSummary.breakdown
                                : [];

                            const cashBreakdown = closingBreakdown.filter(
                                (item) => !isTicketBreakdownItem(item)
                            );

                            const ticketBreakdown = closingBreakdown.filter(
                                (item) => isTicketBreakdownItem(item)
                            );
                            const hasBreakdownDetail = cashBreakdown.length > 0 || ticketBreakdown.length > 0;

                            const breakdownDetailTotal = Number(
                                (
                                    cashBreakdown.reduce(
                                        (sum, item) => sum + Number(item.value || 0) * Number(item.count || 0),
                                        0
                                    ) +
                                    ticketBreakdown.reduce(
                                        (sum, item) => sum + Number(item.value || 0) * Number(item.count || 0),
                                        0
                                    )
                                ).toFixed(2)
                            );

                            return (
                                <div className="mt-3 rounded-lg bg-[#111] border border-gray-800/40 p-3">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <div>
                                            <div className="text-xs text-gray-400">
                                                {t("cashRegisterPage.closing.breakdownTitle")}
                                            </div>
                                            <div className="text-[11px] text-gray-500">
                                                {t("cashRegisterPage.closing.breakdownDescription")}
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-gray-500">
                                            {useConsolidatedSummary
                                                ? t("cashRegisterPage.closing.consolidatedCounted")
                                                : t("cashRegisterPage.closing.registerCounted")}
                                        </div>
                                        <div className="text-sm font-bold text-[#f6b100]">
                                            {currency(closingDeclaredSummary.countedCashEquivalent)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
                                        <div className="rounded-lg bg-[#0b0b0b] border border-gray-800/40 px-3 py-2">
                                            <div className="text-[11px] text-gray-500">{t("cashRegisterPage.closing.billsCoins")}</div>
                                            <div className="text-sm text-white font-semibold">
                                                {currency(closingDeclaredSummary.cashTotal)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg bg-[#0b0b0b] border border-gray-800/40 px-3 py-2">
                                            <div className="text-[11px] text-gray-500">{t("cashRegisterPage.paymentMethods.ticket")}</div>
                                            <div className="text-sm text-white font-semibold">
                                                {currency(closingDeclaredSummary.ticketTotal)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg bg-[#0b0b0b] border border-gray-800/40 px-3 py-2">
                                            <div className="text-[11px] text-gray-500">{t("cashRegisterPage.paymentMethods.transfer")}</div>
                                            <div className="text-sm text-white font-semibold">
                                                {currency(closingDeclaredSummary.transferTotal)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg bg-[#0b0b0b] border border-gray-800/40 px-3 py-2">
                                            <div className="text-[11px] text-gray-500">{t("cashRegisterPage.paymentMethods.other")}</div>
                                            <div className="text-sm text-white font-semibold">
                                                {currency(closingDeclaredSummary.otherTotal)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg bg-[#0b0b0b] border border-[#f6b100]/30 px-3 py-2">
                                            <div className="text-[11px] text-gray-500">{t("cashRegisterPage.closing.registerCounted")}</div>
                                            <div className="text-sm text-[#f6b100] font-bold">
                                                {currency(closingDeclaredSummary.countedCashEquivalent)}
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-[#0b0b0b] border border-[#f6b100]/30 px-3 py-2">
                                            <div className="text-[11px] text-gray-500">{t("cashRegisterPage.closing.totalClose")}</div>
                                            <div className="text-sm text-[#f6b100] font-bold">
                                                {currency(closingDeclaredSummary.total)}
                                            </div>
                                        </div>
                                    </div>

                                    {hasBreakdownDetail && (
                                        <div className="mt-3 rounded-lg border border-gray-800/50 bg-[#0b0b0b]">
                                            <button
                                                type="button"
                                                onClick={() => setShowClosingBreakdownDetail((prev) => !prev)}
                                                className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left hover:bg-white/5 transition-colors rounded-lg"
                                            >
                                                <div>
                                                    <div className="text-sm font-semibold text-white">
                                                        {showClosingBreakdownDetail
                                                            ? t("cashRegisterPage.closing.hideBreakdown")
                                                            : t("cashRegisterPage.closing.showBreakdown")}
                                                    </div>

                                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                                        {t("cashRegisterPage.closing.breakdownHint")}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-[#f6b100]">
                    {currency(breakdownDetailTotal)}
                </span>

                                                    <span className="text-white/70 text-lg leading-none">
                    {showClosingBreakdownDetail ? "▲" : "▼"}
                </span>
                                                </div>
                                            </button>

                                            {showClosingBreakdownDetail && (
                                                <div className="px-3 pb-3">
                                                    {cashBreakdown.length > 0 && (
                                                        <div className="mt-2">
                                                            <div className="text-[11px] text-gray-500 mb-2">
                                                                {t("cashRegisterPage.closing.billsCoinsDetail")}
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {cashBreakdown.map((item, index) => (
                                                                    <div
                                                                        key={`${item.value}-${index}`}
                                                                        className="flex items-center justify-between rounded-lg bg-[#111] border border-gray-800/40 px-3 py-2"
                                                                    >
                                                                        <div>
                                                                            <div className="text-sm text-white font-semibold">
                                                                                {currency(item.value)}
                                                                            </div>

                                                                            <div className="text-[11px] text-gray-500">
                                                                                {t(
                                                                                    "cashRegisterPage.common.quantityValue",
                                                                                    {
                                                                                        count:
                                                                                            Number(
                                                                                                item.count || 0
                                                                                            ),
                                                                                    }
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="text-sm text-gray-200 font-semibold">
                                                                            {currency(
                                                                                Number(item.value || 0) * Number(item.count || 0)
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {ticketBreakdown.length > 0 && (
                                                        <div className="mt-3">
                                                            <div className="text-[11px] text-gray-500 mb-2">
                                                                {t("cashRegisterPage.closing.ticketsDetail")}
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {ticketBreakdown.map((item, index) => (
                                                                    <div
                                                                        key={`ticket-${item.value}-${index}`}
                                                                        className="flex items-center justify-between rounded-lg bg-[#111] border border-gray-800/40 px-3 py-2"
                                                                    >
                                                                        <div>
                                                                            <div className="text-sm text-white font-semibold">
                                                                                {t(
                                                                                    "cashRegisterPage.closing.ticketValue",
                                                                                    {
                                                                                        amount:
                                                                                            currency(
                                                                                                item.value
                                                                                            ),
                                                                                    }
                                                                                )}
                                                                            </div>

                                                                            <div className="text-[11px] text-gray-500">
                                                                                {t(
                                                                                    "cashRegisterPage.common.quantityValue",
                                                                                    {
                                                                                        count:
                                                                                            Number(
                                                                                                item.count || 0
                                                                                            ),
                                                                                    }
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="text-sm text-gray-200 font-semibold">
                                                                            {currency(
                                                                                Number(item.value || 0) * Number(item.count || 0)
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                </div>

            )}
            {isAdminLike && adminVisibleOpenSessions.length > 0 && (
                <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                    <h3 className="text-white font-semibold text-lg">
                        {t("cashRegisterPage.sessions.openTitle")}
                    </h3>

                    <p className="text-sm text-gray-400 mt-1">
                        {t("cashRegisterPage.sessions.openDescription")}
                    </p>

                    <div className="mt-4 space-y-3">
                        {adminVisibleOpenSessions.map((s) => (
                            <div
                                key={s._id}
                                className={`rounded-xl border p-4 ${
                                    adminCloseTargetSession?._id === s._id
                                        ? "border-[#f6b100] bg-[#f6b100]/10"
                                        : "border-gray-800/50 bg-[#151515]"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-white font-semibold">
                                            {s?.openedBy?.name ||
                                                t("cashRegisterPage.sessions.unnamedCashier")}
                                        </div>

                                        <div className="text-xs text-gray-400 mt-1">
                                            {t(
                                                "cashRegisterPage.sessions.registerAndOpening",
                                                {
                                                    register:
                                                    s.registerId,

                                                    amount:
                                                        currency(
                                                            s.openingFloatInitial ||
                                                            0
                                                        ),
                                                }
                                            )}
                                        </div>

                                        <div className="text-xs text-gray-500 mt-1">
                                            {t("cashRegisterPage.sessions.openedAt")}:{" "} {
                                            s.openedAt
                                                ? formatDateTime(
                                                    s.openedAt,
                                                    localization
                                                )
                                                : "—"
                                        }
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleSelectAdminSessionToClose(s)}
                                        className="px-4 py-2 rounded-lg bg-[#f6b100] text-black font-semibold"
                                    >
                                        {t("cashRegisterPage.sessions.closeThis")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {canCloseSelectedSession && (
                <div
                    ref={closeFormRef}
                    className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5"
                >
                    <h3 className="text-white font-semibold text-lg">{t("cashRegisterPage.closing.finalTitle")}</h3>
                    {isAdminLike && closeTargetSession && (
                        <div className="mt-3 mb-4 rounded-xl border border-[#f6b100]/30 bg-[#f6b100]/10 p-4">
                            <div className="text-sm text-[#f6b100] font-semibold">
                                {t("cashRegisterPage.closing.selectedSession")}
                            </div>

                            <div className="mt-1 text-white font-semibold">
                                {closeTargetSession?.openedBy?.name ||
                                    t("cashRegisterPage.sessions.unnamedCashier")}
                            </div>

                            <div className="mt-1 text-xs text-gray-400">
                                {t(
                                    "cashRegisterPage.sessions.registerAndOpening",
                                    {
                                        register:
                                        closeTargetSession?.registerId,

                                        amount:
                                            currency(
                                                closeTargetSession
                                                    ?.openingFloatInitial ||
                                                0
                                            ),
                                    }
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setAdminCloseTargetSession(null);
                                    setHideAdminSelectedSession(false);
                                    setClosingCountedInput("");
                                    setClosingNote("");
                                    setCloseManagerCode("");
                                }}
                                className="mt-3 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-gray-700 text-white text-sm font-semibold hover:bg-[#222]"
                            >
                                {t("cashRegisterPage.actions.hideSession")}
                            </button>
                        </div>
                    )}
                    <p className="text-sm text-gray-400 mt-1">
                        {t("cashRegisterPage.closing.instruction")}
                    </p>

                    <div className="mt-4">
                        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#0f0f0f] border border-gray-800/50 p-1">
                            <button
                                type="button"
                                onClick={() => setClosingInputMode(CLOSING_INPUT_MODE_TOTAL)}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                    closingInputMode === CLOSING_INPUT_MODE_TOTAL
                                        ? "bg-[#f6b100] text-black"
                                        : "text-gray-300 hover:bg-white/5"
                                }`}
                            >
                                {t("cashRegisterPage.closing.totalCounted")}
                            </button>

                            {supportsCashDenominations && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setClosingInputMode(
                                            CLOSING_INPUT_MODE_BREAKDOWN
                                        )
                                    }
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                        closingInputMode ===
                                        CLOSING_INPUT_MODE_BREAKDOWN
                                            ? "bg-[#f6b100] text-black"
                                            : "text-gray-300 hover:bg-white/5"
                                    }`}
                                >
                                    {t("cashRegisterPage.closing.billsAndCoins")}
                                </button>
                            )}
                        </div>
                    </div>

                    {closingInputMode === CLOSING_INPUT_MODE_TOTAL && (
                        <div className="mt-4">
                            <label className="text-xs text-gray-400">
                                {t("cashRegisterPage.closing.countedLabel")}
                            </label>
                            <input
                                value={closingCountedInput}
                                onChange={(e) => setClosingCountedInput(formatThousands(e.target.value))}
                                className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                placeholder="2,000"
                            />
                        </div>
                    )}

                    {closingInputMode === CLOSING_INPUT_MODE_BREAKDOWN && (
                        <div className="mt-4 rounded-xl bg-[#0f0f0f] border border-gray-800/50 p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                    <div className="text-sm font-semibold text-white">
                                        {t("cashRegisterPage.closing.denominationTitle")}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {t("cashRegisterPage.closing.denominationDescription")}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-xs text-gray-500">
                                        {t("cashRegisterPage.closing.totalCounted")}
                                    </div>
                                    <div className="text-lg font-bold text-[#f6b100]">
                                        {currency(closingBreakdownTotal)}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {CASH_DENOMINATIONS_RD.map((item) => {
                                    const countValue = closingDenominationCounts[String(item.value)] || "";
                                    const lineTotal = Number(item.value || 0) * Number(countValue || 0);

                                    return (
                                        <div
                                            key={item.value}
                                            className="rounded-lg bg-[#151515] border border-gray-800/40 p-3"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div>
                                                    <div className="text-sm font-semibold text-white">
                                                        {item.label}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500">
                                                        {denominationTypeLabel(
                                                            item.type
                                                        )}
                                                    </div>
                                                </div>

                                                <input
                                                    value={countValue}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^\d]/g, "").slice(0, 6);
                                                        setClosingDenominationCounts((prev) => ({
                                                            ...prev,
                                                            [String(item.value)]: value,
                                                        }));
                                                    }}
                                                    inputMode="numeric"
                                                    className="w-20 px-2 py-2 bg-[#0b0b0b] border border-gray-800/50 rounded-lg text-white text-right"
                                                    placeholder="0"
                                                />
                                            </div>

                                            <div className="mt-2 text-xs text-gray-500 text-right">
                                                {t("cashRegisterPage.common.subtotal")}:{" "}
                                                <span className="text-gray-300 font-semibold">
                                {currency(lineTotal)}
                            </span>
                                            </div>
                                        </div>
                                    );

                                })}

                        </div>

                        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-lg bg-[#151515] border border-gray-700/60 p-4">
                        <div className="text-base md:text-lg font-semibold text-white">{t("cashRegisterPage.paymentMethods.tickets")}</div>

                        <div className="text-sm text-white/75 mb-4">
                        Crédito físico contado como efectivo.
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                        <div>
                        <label className="block text-sm font-medium text-white/90 mb-1">
                            {t("cashRegisterPage.closing.ticketAmount")}
                        </label>

                        <input
                        value={ticketAmountInput}
                    onChange={(e) => setTicketAmountInput(formatThousands(e.target.value))}
                    inputMode="decimal"
                    className="mt-1 w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
                    placeholder=" 100"
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-white/90 mb-1">
                    {t("cashRegisterPage.common.quantity")}
                </label>

                <input
                value={ticketCountInput}
            onChange={(e) =>
                setTicketCountInput(
                    e.target.value.replace(/[^\d]/g, "").slice(0, 6)
                )
            }
            inputMode="numeric"
            className="mt-1 w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
            placeholder="0"
        />
            </div>
        </div>

    <div className="mt-3 text-sm text-white/85 text-right">
        {t("cashRegisterPage.closing.ticketSubtotal")}:{" "}
        <span className="text-white font-bold text-base">
                {currency(closingTicketTotal)}
            </span>
    </div>
</div>

    <div className="rounded-lg bg-[#151515] border border-gray-700/60 p-4">
        <div className="text-base md:text-lg font-semibold text-white">
            {t("cashRegisterPage.paymentMethods.transfers")}
        </div>

        <div className="text-sm text-white/75 mb-4">
            {t("cashRegisterPage.closing.transferDescription")}
        </div>

        <label className="block text-sm font-medium text-white/90 mb-1">
            {t("cashRegisterPage.closing.transferAmount")}
        </label>

        <input
            value={transferCountedInput}
            onChange={(e) => setTransferCountedInput(formatThousands(e.target.value))}
            inputMode="decimal"
            className="w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
            placeholder=" 1,500"
        />

        <div className="mt-3 text-sm text-white/85 text-right">
            {t("cashRegisterPage.closing.transferTotal")}:{" "}
            <span className="text-white font-bold text-base">
                {currency(transferCountedTotal)}
            </span>
        </div>
    </div>

    <div className="rounded-lg bg-[#151515] border border-gray-700/60 p-4">
        <div className="text-base md:text-lg font-semibold text-white">{t("cashRegisterPage.paymentMethods.other")}</div>

        <div className="text-sm text-white/75 mb-4">
            {t("cashRegisterPage.closing.otherDescription")}
        </div>

        <label className="block text-sm font-medium text-white/90 mb-1">
            {t("cashRegisterPage.closing.otherAmount")}
        </label>

        <input
            value={otherCountedInput}
            onChange={(e) => setOtherCountedInput(formatThousands(e.target.value))}
            inputMode="decimal"
            className="w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
            placeholder=" 500"
        />

        <div className="mt-3 text-sm text-white/85 text-right">
            {t("cashRegisterPage.closing.otherTotal")}:{" "}
            <span className="text-white font-bold text-base">
                {currency(otherCountedTotal)}
            </span>
        </div>
    </div>
</div>

    <div className="mt-5 rounded-lg border border-[#f6b100]/30 bg-[#f6b100]/10 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
                <div className="text-sm text-white/80">{t("cashRegisterPage.closing.billsCoins")}</div>
                <div className="text-lg font-bold text-white">
                    {currency(closingBreakdownTotal)}
                </div>
            </div>

            <div>
                <div className="text-sm text-white/80">{t("cashRegisterPage.paymentMethods.tickets")}</div>
                <div className="text-lg font-bold text-white">
                    {currency(closingTicketTotal)}
                </div>
            </div>

            <div>
                <div className="text-sm text-white/80">{t("cashRegisterPage.closing.transferAndOther")}</div>
                <div className="text-lg font-bold text-white">
                    {currency(transferCountedTotal + otherCountedTotal)}
                </div>
            </div>

            <div>
                <div className="text-sm text-white/90 font-medium">
                    {t("cashRegisterPage.closing.totalDeclared")}
                </div>
                <div className="text-xl font-extrabold text-white">
                    {currency(totalDeclaredAtClose)}
                </div>
            </div>
        </div>
    </div>
                        </div>

                    )}


                    <div className="mt-4">
                        <label className="text-xs text-gray-400">{t("cashRegisterPage.closing.optionalNote")}</label>
                        <textarea
                            value={closingNote}
                            onChange={(e) => setClosingNote(e.target.value)}
                            className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white min-h-[90px] resize-none"
                            placeholder={t(
                                "cashRegisterPage.closing.notePlaceholder"
                            )}                        />
                    </div>

                    <div className="mt-4">
                        <label className="text-xs text-gray-400">{t("cashRegisterPage.manager.code")}</label>
                        <input
                            type="password"
                            value={closeManagerCode}
                            onChange={(e) => setCloseManagerCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                            className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                            placeholder={t(
                                "cashRegisterPage.manager.codePlaceholder"
                            )}
                            inputMode="numeric"
                            autoComplete="new-password"
                        />
                    </div>


                    <button
                        type="button"
                        onClick={() => {
                            if (!sessionExists) {
                                showToast(
                                    t("cashRegisterPage.messages.noOpenRegisterForDate")
                                );
                                return;
                            }

                            if (isViewingAllRegisters) {
                                showToast(
                                    t("cashRegisterPage.messages.selectSpecificRegisterToClose"),
                                    "error"
                                );
                                return;
                            }

                            if (!openingAlreadySet) {
                                showToast(
                                    t("cashRegisterPage.messages.openingRequiredBeforeClose")
                                );
                                return;
                            }

                            if (!closeManagerCode.trim()) {
                                showToast(
                                    t("cashRegisterPage.messages.managerCodeRequired"),
                                    "error"
                                );
                                return;
                            }

                            const breakdown =
                                closingInputMode === CLOSING_INPUT_MODE_BREAKDOWN
                                    ? [...closingBreakdownPayload, ...ticketBreakdownPayload]
                                    : [];

                            const countedTotal =
                                closingInputMode === CLOSING_INPUT_MODE_BREAKDOWN
                                    ? cashEquivalentCountedTotal
                                    : Number(String(closingCountedInput ?? "").replace(/[^\d.-]/g, ""));

                            const manualTransferTotal =
                                closingInputMode === CLOSING_INPUT_MODE_BREAKDOWN
                                    ? transferCountedTotal
                                    : 0;

                            const manualOtherTotal =
                                closingInputMode === CLOSING_INPUT_MODE_BREAKDOWN
                                    ? otherCountedTotal
                                    : 0;

                            if (!Number.isFinite(countedTotal) || countedTotal < 0) {
                                showToast(
                                    t("cashRegisterPage.messages.invalidAmount"),
                                    "error"
                                );
                                return;
                            }

                            if (
                                closingInputMode === CLOSING_INPUT_MODE_BREAKDOWN &&
                                breakdown.length === 0 &&
                                manualTransferTotal <= 0 &&
                                manualOtherTotal <= 0
                            ) {
                                showToast(
                                    t("cashRegisterPage.messages.closingBreakdownRequired"),
                                    "error"
                                );
                                return;
                            }

                            const fid = closeTargetSession?._id || closeTargetSession?.id;
                            if (!fid) {
                                showToast(
                                    t("cashRegisterPage.messages.sessionIdNotFound")
                                );
                                return;
                            }

                            const cleanRegisterId = String(
                                closeTargetSession?.registerId || activeRegisterId || ""
                            )
                                .trim()
                                .toUpperCase();

                            if (!cleanRegisterId || cleanRegisterId === ALL_REGISTERS_ID) {
                                showToast(
                                    t("cashRegisterPage.messages.selectSpecificRegisterBeforeClose"),
                                    "error"
                                );
                                return;
                            }

                            closeCashSessionMutation.mutate({
                                fid,
                                dateYMD: selectedYMD,
                                registerId: cleanRegisterId,
                                countedTotal,
                                breakdown,
                                transferCountedTotal: manualTransferTotal,
                                otherCountedTotal: manualOtherTotal,
                                totalDeclaredAtClose:
                                    closingInputMode === CLOSING_INPUT_MODE_BREAKDOWN
                                        ? totalDeclaredAtClose
                                        : countedTotal,
                                note: closingNote,
                                managerCode: closeManagerCode.trim(),
                            });
                        }}
                        disabled={closeCashSessionMutation.isPending}
                        className="mt-4 w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold disabled:opacity-60"
                    >
                        {closeCashSessionMutation.isPending
                            ? t("cashRegisterPage.closing.closing")
                            : t("cashRegisterPage.closing.registerClose")}
                    </button>
                </div>
            )}


            {/* Resumen (vista inicial - últimos 10) */}
            {showSummary  &&  (

                <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 id="cash-summary" className="text-white font-semibold text-lg">
                        {t("cashRegisterPage.salesSummary.title")}
                    </h3>
                    <div className="text-sm text-gray-300">
                        {t("cashRegisterPage.salesSummary.totalCollected")}:{" "}
                        <span className="font-semibold text-[#f6b100] text-lg">
                            {currency(summaryCashClosure.grandTotal)}
                        </span>

                        <span className="text-gray-500 ml-2">
                            (
                            {t(
                                "cashRegisterPage.salesSummary.paidOrders",
                                {
                                    count:
                                    summaryCashClosure.totalCount,
                                }
                            )}
                            )
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                        ["efectivo", summaryCashClosure.buckets.efectivo],
                        ["ticket", summaryCashClosure.buckets.ticket],

                        ["tarjeta", summaryCashClosure.buckets.tarjeta],
                        ["transferencia", summaryCashClosure.buckets.transferencia],

                        ["cxc-abonos", {
                            label:
                                t(
                                    "cashRegisterPage.salesSummary.receivablePayments"
                                ),
                            total: summaryCashClosure.receivablePaymentsTotal,
                            count: 0,
                        }],

                        ["cxc-credito", {
                            label:
                                t(
                                    "cashRegisterPage.salesSummary.creditSales"
                                ),
                            total: summaryCashClosure.creditSales * -1,
                            count: summaryCashClosure.creditSalesCount,
                        }],

                        ["pedidoya", summaryCashClosure.buckets.pedidoya],
                        ["ubereats", summaryCashClosure.buckets.ubereats],



                        // (Opcional) si “Otros” tiene algo, lo mostramos al final
                        ...(safeNumber(summaryCashClosure.buckets?.otros?.total) > 0 || safeNumber(summaryCashClosure.buckets?.otros?.count) > 0
                            ? [["otros", summaryCashClosure.buckets.otros]]
                            : []),
                    ].map(([k, v]) => (
                        <div
                            key={k}
                            className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3 hover:border-[#f6b100]/30 transition-colors"
                        >
                            <div className="text-xs text-gray-400 mb-1">{v.label}</div>
                            <div
                                className={`font-semibold ${
                                    Number(v.total || 0) < 0 ? "text-red-400" : "text-white"
                                }`}
                            >
                                {currency(v.total)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{t(
                                "cashRegisterPage.common.orderCount",
                                {
                                    count:
                                    v.count,
                                }
                            )}</div>
                        </div>
                    ))}

                </div>

            </div>
            )}

            {/* Botón exportar */}
            {adminCanSeeSummary && (
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() =>
                        downloadExcel(
                            dayVisibleReports,
                            summaryCashClosure
                        )
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] hover:border-[#f6b100]/50 transition-all"
                >
                    <Download className="w-4 h-4" />
                    {t("cashRegisterPage.actions.exportExcel")}
                </button>
            </div>
        )}

            {/* Vista móvil (cards) - últimos 10 */}
            <div className="sm:hidden">
                <div className="space-y-3">
                    {(dayVisibleReports?.length ?? 0) === 0 ? (
                        <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-6 text-center text-gray-500">
                            {t("cashRegisterPage.table.noRecords")}
                        </div>
                    ) : (
                        dayVisibleReports.map((r) => (
                            <div
                                key={r._id}
                                className="rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm text-gray-400">{t("cashRegisterPage.common.user")}</div>
                                        <div className="text-white font-semibold truncate">
                                            {r?.user?.name || "—"}
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-sm text-gray-400">{t("cashRegisterPage.common.date")}</div>
                                        <div className="text-white text-sm">
                                            {getReportReferenceDate(r)
                                                ? formatDate(
                                                    getReportReferenceDate(r),
                                                    localization
                                                )
                                                : "—"}
                                        </div>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <div className="text-xs text-gray-400">{t("cashRegisterPage.common.customer")}</div>
                                        <div className="text-sm text-white truncate">{getClientName(r)}</div>
                                    </div>

                                    <div className="min-w-0">
                                        <div className="text-xs text-gray-400">{t("cashRegisterPage.common.method")}</div>
                                        <div className="text-sm text-white truncate">
                                            {paymentMethodLabel(
                                                r?.paymentMethod ||
                                                "Efectivo"
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <div className="text-xs text-gray-400">{t("cashRegisterPage.common.total")}</div>
                                        <div className="text-lg font-bold text-[#f6b100]">
                                            {currency(r?.bills?.totalWithTax)}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="text-xs text-gray-500">
                                        {r?._id ? `ID: ${String(r._id).slice(-6)}` : "—"}
                                    </div>

                                    <div className="flex justify-end">
                                        {renderInvoiceActions(r)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {Array.isArray(sortedReports) &&
                    sortedReports.length >
                    (dayVisibleReports?.length ?? 0) && (
                    <div className="mt-3 rounded-lg border border-gray-800/50 bg-[#1a1a1a]/50 p-3 text-center text-xs text-gray-400">
                        {t(
                            "cashRegisterPage.fullRecords.showingDayHistory",
                            {
                                count:
                                dayVisibleReports.length,

                                date:
                                selectedYMD,
                            }
                        )}
                    </div>
                )}
            </div>
            {/* Tabla (últimos 10) */}
            {isAdmin ? (
                isLoading ? (
                    <div className="text-center py-8 text-gray-400">{t("cashRegisterPage.common.loading")}</div>
                ) : isError ? (
                    <div className="text-center py-8 text-red-400">
                        {t("cashRegisterPage.messages.recordsLoadError")}
                        {error?.response?.status
                            ? ` (HTTP ${error.response.status})`
                            : ""}
                        .
                    </div>
                ) : (


                    <div className="hidden sm:block">
                        <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] overflow-hidden">
                            <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-[#1a1a1a] border-b border-gray-800/50">
                                    <tr>
                                        <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.table.invoiceNumber")}
                                        </th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.common.date")}</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.common.user")}
                                        </th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.common.customer")}
                                        </th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.common.method")}
                                        </th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.common.total")}
                                        </th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.common.invoice")}</th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {(dayVisibleReports?.length ?? 0) === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7} className="text-center py-8 text-gray-500">
                                                {t("cashRegisterPage.table.noRecords")}
                                            </td>
                                        </tr>
                                    ) : (
                                        dayVisibleReports.map((r) => (
                                            <tr
                                                key={r._id}
                                                className="border-b border-gray-800/30 hover:bg-[#1a1a1a]/50 transition-colors"
                                            >
                                                <td className="p-3 text-sm font-semibold text-[#f6b100] whitespace-nowrap">
                                                    {getInvoiceNumber(r)}
                                                </td>
                                                <td className="p-3 text-sm text-gray-300">
                                                    {getReportReferenceDate(r)
                                                        ? formatDate(
                                                            getReportReferenceDate(r),
                                                            localization
                                                        )
                                                        : "—"}
                                                </td>
                                                <td className="p-3 text-sm text-gray-300">{r?.user?.name || "—"}</td>
                                                <td className="p-3 text-sm text-gray-300">{getClientName(r)}</td>
                                                <td className="p-3 text-sm">
                                                    {isCreditOrder(r) ? (
                                                        <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs font-semibold text-orange-300">
                                                    {t("cashRegisterPage.paymentMethods.credit")}
                                                </span>
                                                    ) : (<span className="text-gray-300">
                                                    {paymentMethodLabel(
                                                        r?.paymentMethod ||
                                                        "Efectivo"
                                                    )}
                                                </span>
                                                                                            )}
                                                                                        </td>
                                                <td className="p-3 text-sm font-bold text-[#f6b100]">
                                                    {currency(r?.bills?.totalWithTax)}
                                                </td>
                                                <td className="p-3">
                                                    {renderInvoiceActions(r)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>

                            {Array.isArray(sortedReports) &&
                                sortedReports.length >
                                (dayVisibleReports?.length ?? 0) && (
                                <div className="p-4 bg-[#1a1a1a]/50 border-t border-gray-800/50 text-center text-sm text-gray-400">
                                    {t(
                                        "cashRegisterPage.fullRecords.showingDayHistory",
                                        {
                                            count:
                                            dayVisibleReports.length,

                                            date:
                                            selectedYMD,
                                        }
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                )
            ) : (
                <div className="mt-4 text-sm text-white/60">
                    {t("cashRegisterPage.fullRecords.adminOnly")}
                </div>
            )}



            {/* Modal flotante */}
            {showFullView && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pb-24 pointer-events-auto"
                    onClick={closeModal}
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    style={{ touchAction: "none" }}
                >
                    <div
                        className="w-full max-w-7xl h-[calc(100vh-6rem)] bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"                        onClick={(e) => e.stopPropagation()}
                        onWheel={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
                            <h2 className="text-2xl font-bold text-white">Registros Completos</h2>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <button
                                        onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 text-white rounded-lg font-semibold hover:bg-[#262626] hover:border-[#f6b100]/50 transition-all"
                                    >
                                        <Filter className="w-4 h-4" />
                                        {t("cashRegisterPage.actions.filters")}
                                    </button>

                                    {showFiltersMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-80 bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg shadow-xl z-50 p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-sm font-semibold text-white">{t("cashRegisterPage.filters.title")}</h4>
                                                <button
                                                    onClick={() => setShowFiltersMenu(false)}
                                                    className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
                                                >
                                                    <X className="w-4 h-4 text-gray-400" />
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">{t("cashRegisterPage.filters.from")}</label>
                                                    <input
                                                        type="date"
                                                        value={modalFilters.from}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, from: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">{t("cashRegisterPage.filters.to")}</label>
                                                    <input
                                                        type="date"
                                                        value={modalFilters.to}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, to: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">{t("cashRegisterPage.filters.paymentMethod")}</label>
                                                    <select
                                                        value={modalFilters.method}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, method: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                    >
                                                        <option value="">
                                                            {t("cashRegisterPage.filters.allMethods")}
                                                        </option>

                                                        <option value="Efectivo">
                                                            {t("cashRegisterPage.paymentMethods.cash")}
                                                        </option>

                                                        <option value="Tarjeta">
                                                            {t("cashRegisterPage.paymentMethods.card")}
                                                        </option>

                                                        <option value="Transferencia">
                                                            {t("cashRegisterPage.paymentMethods.transfer")}
                                                        </option>

                                                        <option value="Pedido Ya">
                                                            Pedido Ya
                                                        </option>

                                                        <option value="Uber Eats">
                                                            Uber Eats
                                                        </option>

                                                        <option value="Delivery">
                                                            Delivery
                                                        </option>

                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">{t("cashRegisterPage.common.register")}</label>

                                                    {isAdminLike ? (
                                                        <select
                                                            value={modalRegisterId}
                                                            onChange={(e) =>
                                                                setModalFilters((f) => ({
                                                                    ...f,
                                                                    registerId: e.target.value,
                                                                }))
                                                            }
                                                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                            disabled={registersLoading}
                                                        >
                                                            <option value={ALL_REGISTERS_ID}>
                                                                {t("cashRegisterPage.registers.allSales")}
                                                            </option>

                                                            {registers.map((r) => (
                                                                <option key={r._id || r.code} value={r.code}>
                                                                    {r.name}{r.location ? ` — ${r.location}` : ""}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm">
                                                            {activeRegisterLabel}
                                                        </div>
                                                    )}
                                                </div>
                                                {supportsDominicanFiscal && (
                                                    <div>
                                                        <label className="text-xs text-gray-400 mb-1 block">
                                                            {t("cashRegisterPage.filters.fiscalDocument")}
                                                        </label>

                                                        <select
                                                            value={modalFilters.fiscal}
                                                            onChange={(e) =>
                                                                setModalFilters((f) => ({
                                                                    ...f,
                                                                    fiscal: e.target.value,
                                                                }))
                                                            }
                                                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                        >
                                                            <option value="">
                                                                {t("cashRegisterPage.filters.all")}
                                                            </option>

                                                            <option value="fiscal">
                                                                {t("cashRegisterPage.filters.withFiscal")}
                                                            </option>

                                                            <option value="credito_fiscal">
                                                                {t("cashRegisterPage.filters.fiscalCredit")}
                                                            </option>

                                                            <option value="consumidor_final">
                                                                {t("cashRegisterPage.filters.finalConsumer")}
                                                            </option>

                                                            <option value="debito_fiscal">
                                                                {t("cashRegisterPage.filters.fiscalDebit")}
                                                            </option>

                                                            <option value="nota_credito">
                                                                {t("cashRegisterPage.filters.creditNote")}
                                                            </option>

                                                            <option value="b01">
                                                                {t("cashRegisterPage.filters.onlyB01")}
                                                            </option>

                                                            <option value="b02">
                                                                {t("cashRegisterPage.filters.onlyB02")}
                                                            </option>

                                                            <option value="e31">
                                                                {t("cashRegisterPage.filters.onlyE31")}
                                                            </option>

                                                            <option value="e32">
                                                                {t("cashRegisterPage.filters.onlyE32")}
                                                            </option>

                                                            <option value="e33">
                                                                {t("cashRegisterPage.filters.onlyE33")}
                                                            </option>

                                                            <option value="e34">
                                                                {t("cashRegisterPage.filters.onlyE34")}
                                                            </option>

                                                            <option value="nofiscal">
                                                                {t("cashRegisterPage.filters.withoutFiscal")}
                                                            </option>
                                                        </select>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">{t("cashRegisterPage.filters.userSearch")}</label>
                                                    <input
                                                        placeholder={t(
                                                            "cashRegisterPage.filters.userPlaceholder"
                                                        )}
                                                        value={modalFilters.user}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, user: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#f6b100]/50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">{t("cashRegisterPage.filters.customerSearch")}</label>
                                                    <input
                                                        placeholder={t(
                                                            "cashRegisterPage.filters.customerPlaceholder"
                                                        )}
                                                        value={modalFilters.client}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, client: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#f6b100]/50"
                                                    />
                                                </div>

                                                {(modalFilters.from ||
                                                    modalFilters.to ||
                                                    modalFilters.method ||
                                                    (supportsDominicanFiscal && modalFilters.fiscal) ||
                                                    (modalFilters.registerId && modalFilters.registerId !== defaultModalRegisterId) ||
                                                    modalFilters.user ||
                                                    modalFilters.client) && (
                                                    <button
                                                        onClick={resetModalFilters}
                                                        className="w-full text-xs text-gray-400 hover:text-white transition-colors py-1"
                                                    >
                                                        {t("cashRegisterPage.actions.clearFilters")}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={closeModal}
                                    className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                                    title="Cerrar"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* Resumen modal */}
                        <div className="px-6 py-4 border-b border-gray-800/50 bg-[#111111]/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-semibold">{t("cashRegisterPage.fullRecords.summary")}</h3>
                                <div className="text-sm text-gray-300">
                                    {t("cashRegisterPage.common.total")}:{" "}
                                    <span className="font-semibold text-[#f6b100]">{currency(modalCashClosure.totalWithMenudo)}</span>
                                    <span className="text-gray-500 ml-2">(
                                        {t(
                                            "cashRegisterPage.common.orderCount",
                                            {
                                                count:
                                                modalCashClosure.totalCount,
                                            }
                                        )}
                                        )
                                    </span>
                                </div>
                            </div>


                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-2">
                                    <div className="text-xs text-gray-400 mb-1">{t("cashRegisterPage.opening.title")}</div>
                                    {modalDay && (
                                        <div className="mt-3 rounded-lg bg-[#0f0f0f] border border-gray-800/40 p-3">
                                            <div className="text-xs text-gray-400 mb-2">
                                                Menudo del día: <span className="text-white font-semibold">{modalDay}</span>
                                            </div>

                                            {isAdmin && (
                                                <div className="space-y-2">
                                                    <label className="text-xs text-gray-400 mb-1 block">Fondo inicial (menudo)</label>

                                                    <input
                                                        value={modalOpeningInput}
                                                        disabled={!modalIsEditingOpening}
                                                        onChange={(e) => setModalOpeningInput(formatThousands(e.target.value))}
                                                        inputMode="decimal"
                                                        className={`w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50 ${
                                                            !modalIsEditingOpening ? "opacity-60 cursor-not-allowed" : ""
                                                        }`}
                                                        placeholder="0"
                                                    />

                                                    {!modalIsEditingOpening ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setModalIsEditingOpening(true)}
                                                            className="w-full px-3 py-2 bg-[#262626] border border-gray-800/50 rounded-lg text-white font-semibold"
                                                        >
                                                            {t(
                                                                "cashRegisterPage.opening.editInitialAdmin",
                                                                {
                                                                    date:
                                                                    modalDay,
                                                                }
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const cleaned = String(modalOpeningInput ?? "").replace(/[^\d.-]/g, "");
                                                                    const openingFloat = Number(cleaned);
                                                                    if (!Number.isFinite(openingFloat) || openingFloat < 0) return;

                                                                    // Si existe sesión ese día, ajusta; si no existe, crea (open)
                                                                    const cleanRegisterId = String(activeRegisterId || "").trim().toUpperCase();

                                                                    if (!cleanRegisterId || cleanRegisterId === ALL_REGISTERS_ID) {
                                                                        showToast("Selecciona una caja específica antes de editar el fondo inicial.", "error");
                                                                        return;
                                                                    }

                                                                        // Si existe sesión ese día, ajusta; si no existe, crea apertura.
                                                                    if (modalSessionExists) {
                                                                        adjustCashModalMutation.mutate({
                                                                            dateYMD: modalDay,
                                                                            registerId: cleanRegisterId,
                                                                            openingFloat,
                                                                            note: `Ajuste de fondo inicial por admin (modal) — ${modalDay}`,
                                                                        });
                                                                    } else {
                                                                        openCashSessionModalMutation.mutate({
                                                                            dateYMD: modalDay,
                                                                            registerId: cleanRegisterId,
                                                                            openingFloat,
                                                                        });
                                                                    }

                                                                    setModalIsEditingOpening(false);
                                                                }}
                                                                className="w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold"
                                                            >
                                                                {t("cashRegisterPage.actions.saveChanges")}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setModalIsEditingOpening(false);
                                                                    setModalOpeningInput(String(safeNumber(modalSession?.openingFloatInitial) || 0));
                                                                }}
                                                                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold"
                                                            >
                                                                {t("cashRegisterPage.actions.cancel")}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}



                                <div className="text-sm font-semibold text-white">{currency(modalCashClosure.openingInitial)}</div>
                                </div>
                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-2">
                                    <div className="text-xs text-gray-400 mb-1">{t("cashRegisterPage.opening.cashSales")}</div>
                                    <div className="text-sm font-semibold text-white">{currency(modalCashClosure.cashSales)}</div>
                                </div>
                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-2 hover:border-[#f6b100]/30 transition-colors">
                                    <div className="text-xs text-gray-400 mb-1">{t("cashRegisterPage.opening.cashInRegister")}</div>
                                    <div className="text-sm font-semibold text-[#f6b100]">{currency(modalCashClosure.cashInRegister)}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-3">
                                {[
                                    ["efectivo", modalCashClosure.buckets.efectivo],
                                    ["tarjeta", modalCashClosure.buckets.tarjeta],
                                    ["transferencia", modalCashClosure.buckets.transferencia],

                                    ["pedidoya", modalCashClosure.buckets.pedidoya],
                                    ["ubereats", modalCashClosure.buckets.ubereats],

                                    ["menudo", { label:
                                            t(
                                                "cashRegisterPage.opening.currentFloat"
                                            ), total: (modalCashClosure.openingInitial + modalCashClosure.addedTotal), count: 0 }],

                                    ...(safeNumber(modalCashClosure.buckets?.otros?.total) > 0 || safeNumber(modalCashClosure.buckets?.otros?.count) > 0
                                        ? [["otros", modalCashClosure.buckets.otros]]
                                        : []),
                                ].map(([k, v]) => (
                                    <div key={k} className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-2">
                                        <div className="text-xs text-gray-400 mb-1">{v.label}</div>
                                        <div className="text-sm font-semibold text-white">{currency(v.total)}</div>
                                        <div className="text-xs text-gray-500 mt-1">{t(
                                            "cashRegisterPage.common.orderCount",
                                            {
                                                count:
                                                v.count,
                                            }
                                        )}</div>
                                    </div>

                                ))}

                            </div>
                        </div>

                        {/* Contenido scrollable */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={() => downloadExcel(modalFilteredReports, modalCashClosure)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] hover:border-[#f6b100]/50 transition-all"
                                >
                                    <Download className="w-4 h-4" />
                                    {t("cashRegisterPage.actions.exportExcel")}
                                </button>
                            </div>

                            <div className="rounded-lg border border-gray-800/50 bg-[#111111]/30 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-[#1a1a1a] border-b border-gray-800/50">
                                        <tr>
                                            <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.table.invoiceNumber")}
                                            </th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.common.date")}</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.common.user")}</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.common.customer")}</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.common.method")}</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.common.total")}</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">{t("cashRegisterPage.common.invoice")}</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {modalFilteredReports.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center py-8 text-gray-500">             {t("cashRegisterPage.table.noRecords")}
                                                </td>
                                            </tr>
                                        ) : (
                                            modalFilteredReports.map((r) => (
                                                <tr
                                                    key={r._id}
                                                    className="border-b border-gray-800/30 hover:bg-[#1a1a1a]/50 transition-colors"
                                                >
                                                    <td className="p-3 text-sm font-semibold text-[#f6b100] whitespace-nowrap">
                                                        {getInvoiceNumber(r)}
                                                    </td>

                                                    <td className="p-3 text-sm text-gray-300">
                                                        {getReportReferenceDate(r)
                                                            ? formatDate(
                                                                getReportReferenceDate(r),
                                                                localization
                                                            )
                                                            : "—"}
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-300">{r?.user?.name || "—"}</td>
                                                    <td className="p-3 text-sm text-gray-300">{getClientName(r)}</td>
                                                    <td className="p-3 text-sm text-gray-300">{paymentMethodLabel(
                                                        r?.paymentMethod ||
                                                        "Efectivo"
                                                    )}</td>
                                                    <td className="p-3 text-sm font-bold text-[#f6b100]">
                                                        {currency(r?.bills?.totalWithTax)}
                                                    </td>
                                                    <td className="p-3">
                                                        {r?._id ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => verFactura(r._id)}
                                                                className="text-blue-400 hover:text-blue-300 hover:underline text-sm transition-colors"
                                                            >
                                                                {t("cashRegisterPage.actions.view")}
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">{t("cashRegisterPage.common.unavailable")}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="text-xs text-gray-500 mt-3">

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>

            {adjustCloseOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0b0b0c] border border-white/10 shadow-2xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-white">{t("cashRegisterPage.adjustClose.title")}</h2>
                                <p className="text-sm text-white/60 mt-1">
                                    Puedes corregir el cierre como total directo o por billetes, tickets y transferencia.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setAdjustCloseOpen(false)}
                                className="text-white/70 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-4">
                            <label className="text-xs text-gray-400">{t("cashRegisterPage.manager.code")}</label>
                            <input
                                type="password"
                                value={adjustManagerCode}
                                onChange={(e) =>
                                    setAdjustManagerCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                                }
                                className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                placeholder={t(
                                    "cashRegisterPage.manager.codePlaceholder"
                                )}
                                inputMode="numeric"
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="mt-4">
                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#0f0f0f] border border-gray-800/50 p-1">
                                <button
                                    type="button"
                                    onClick={() => setAdjustInputMode(CLOSING_INPUT_MODE_TOTAL)}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                        adjustInputMode === CLOSING_INPUT_MODE_TOTAL
                                            ? "bg-[#f6b100] text-black"
                                            : "text-gray-300 hover:bg-white/5"
                                    }`}
                                >
                                    {t("cashRegisterPage.closing.totalCounted")}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAdjustInputMode(CLOSING_INPUT_MODE_BREAKDOWN)}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                        adjustInputMode === CLOSING_INPUT_MODE_BREAKDOWN
                                            ? "bg-[#f6b100] text-black"
                                            : "text-gray-300 hover:bg-white/5"
                                    }`}
                                >
                                    {t("cashRegisterPage.closing.billsAndCoins")}
                                </button>
                            </div>
                        </div>

                        {adjustInputMode === CLOSING_INPUT_MODE_TOTAL && (
                            <div className="mt-4">
                                <label className="text-xs text-gray-400">
                                    {t("cashRegisterPage.adjustClose.adjustedCash")}
                                </label>
                                <input
                                    value={adjustCountedInput}
                                    onChange={(e) => setAdjustCountedInput(formatThousands(e.target.value))}
                                    className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                    placeholder=" 2,050"
                                    inputMode="decimal"
                                />
                            </div>
                        )}

                        {supportsCashDenominations &&
                            adjustInputMode ===
                            CLOSING_INPUT_MODE_BREAKDOWN && (
                            <div className="mt-4 rounded-xl bg-[#0f0f0f] border border-gray-800/50 p-4">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div>
                                        <div className="text-sm font-semibold text-white">
                                            {t("cashRegisterPage.closing.denominationTitle")}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {t("cashRegisterPage.adjustClose.denominationDescription")}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">{t("cashRegisterPage.closing.billsCoins")}</div>
                                        <div className="text-lg font-bold text-[#f6b100]">
                                            {currency(adjustBreakdownTotal)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {CASH_DENOMINATIONS_RD.map((item) => {
                                        const countValue = adjustDenominationCounts[String(item.value)] || "";
                                        const lineTotal = Number(item.value || 0) * Number(countValue || 0);

                                        return (
                                            <div
                                                key={item.value}
                                                className="rounded-lg bg-[#151515] border border-gray-800/40 p-3"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div>
                                                        <div className="text-sm font-semibold text-white">
                                                            {item.label}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500">
                                                            {denominationTypeLabel(
                                                                item.type
                                                            )}
                                                        </div>
                                                    </div>

                                                    <input
                                                        value={countValue}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^\d]/g, "").slice(0, 6);
                                                            setAdjustDenominationCounts((prev) => ({
                                                                ...prev,
                                                                [String(item.value)]: value,
                                                            }));
                                                        }}
                                                        inputMode="numeric"
                                                        className="w-20 px-2 py-2 bg-[#0b0b0b] border border-gray-800/50 rounded-lg text-white text-right"
                                                        placeholder="0"
                                                    />
                                                </div>

                                                <div className="mt-2 text-xs text-gray-500 text-right">
                                                    {t("cashRegisterPage.common.subtotal")}:{" "}
                                                    <span className="text-gray-300 font-semibold">
                                            {currency(lineTotal)}
                                        </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="rounded-lg bg-[#151515] border border-gray-700/60 p-4">
                                        <div className="text-base md:text-lg font-semibold text-white">
                                            {t("cashRegisterPage.paymentMethods.tickets")}
                                        </div>

                                        <div className="text-sm text-white/75 mb-4">
                                            {t("cashRegisterPage.closing.ticketDescription")}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-white/90 mb-1">
                                                    {t("cashRegisterPage.closing.ticketAmount")}
                                                </label>
                                                <input
                                                    value={adjustTicketAmountInput}
                                                    onChange={(e) =>
                                                        setAdjustTicketAmountInput(formatThousands(e.target.value))
                                                    }
                                                    inputMode="decimal"
                                                    className="mt-1 w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
                                                    placeholder=" 100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-white/90 mb-1">
                                                    {t("cashRegisterPage.common.quantity")}
                                                </label>
                                                <input
                                                    value={adjustTicketCountInput}
                                                    onChange={(e) =>
                                                        setAdjustTicketCountInput(
                                                            e.target.value.replace(/[^\d]/g, "").slice(0, 6)
                                                        )
                                                    }
                                                    inputMode="numeric"
                                                    className="mt-1 w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-3 text-sm text-white/85 text-right">
                                            Subtotal tickets:{" "}
                                            <span className="text-white font-bold text-base">
                                    {currency(adjustTicketTotal)}
                                </span>
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-[#151515] border border-gray-700/60 p-4">
                                        <div className="text-base md:text-lg font-semibold text-white">
                                            Transferencias
                                        </div>

                                        <div className="text-sm text-white/75 mb-4">
                                            Monto confirmado por transferencia.
                                        </div>

                                        <label className="block text-sm font-medium text-white/90 mb-1">
                                            Monto transferencia
                                        </label>

                                        <input
                                            value={adjustTransferCountedInput}
                                            onChange={(e) =>
                                                setAdjustTransferCountedInput(formatThousands(e.target.value))
                                            }
                                            inputMode="decimal"
                                            className="w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
                                            placeholder=" 1,500"
                                        />

                                        <div className="mt-3 text-sm text-white/85 text-right">
                                            Total transferencia:{" "}
                                            <span className="text-white font-bold text-base">
                                    {currency(adjustTransferCountedTotal)}
                                </span>
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-[#151515] border border-gray-700/60 p-4">
                                        <div className="text-base md:text-lg font-semibold text-white">
                                            {t("cashRegisterPage.paymentMethods.other")}
                                        </div>

                                        <div className="text-sm text-white/75 mb-4">
                                            {t("cashRegisterPage.paymentMethods.other")}
                                        </div>

                                        <label className="block text-sm font-medium text-white/90 mb-1">
                                            {t("cashRegisterPage.closing.otherAmount")}
                                        </label>

                                        <input
                                            value={adjustOtherCountedInput}
                                            onChange={(e) =>
                                                setAdjustOtherCountedInput(formatThousands(e.target.value))
                                            }
                                            inputMode="decimal"
                                            className="w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
                                            placeholder=" 500"
                                        />

                                        <div className="mt-3 text-sm text-white/85 text-right">
                                            {t("cashRegisterPage.closing.otherTotal")}:{" "}
                                            <span className="text-white font-bold text-base">
                                    {currency(adjustOtherCountedTotal)}
                                </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-lg border border-[#f6b100]/30 bg-[#f6b100]/10 p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                        <div>
                                            <div className="text-sm text-white/80">{t("cashRegisterPage.closing.billsCoins")}</div>
                                            <div className="text-lg font-bold text-white">
                                                {currency(adjustBreakdownTotal)}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-sm text-white/80">{t("cashRegisterPage.paymentMethods.tickets")}</div>
                                            <div className="text-lg font-bold text-white">
                                                {currency(adjustTicketTotal)}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-sm text-white/80">{t("cashRegisterPage.closing.transferAndOther")}</div>
                                            <div className="text-lg font-bold text-white">
                                                {currency(adjustTransferCountedTotal + adjustOtherCountedTotal)}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-sm text-white/90 font-medium">
                                                {t("cashRegisterPage.closing.totalDeclared")}                                            </div>
                                            <div className="text-xl font-extrabold text-white">
                                                {currency(adjustTotalDeclaredAtClose)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="text-xs text-gray-400">{t("cashRegisterPage.common.note")}</label>
                            <input
                                value={adjustNote}
                                onChange={(e) => setAdjustNote(e.target.value)}
                                className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                placeholder="Motivo del ajuste"
                            />
                        </div>

                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setAdjustCloseOpen(false)}
                                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold"
                            >
                                {t("cashRegisterPage.actions.cancel")}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    const isBreakdown = adjustInputMode === CLOSING_INPUT_MODE_BREAKDOWN;

                                    const breakdown = isBreakdown ? adjustCombinedBreakdownPayload : [];

                                    const countedTotal = isBreakdown
                                        ? adjustCashEquivalentCountedTotal
                                        : Number(String(adjustCountedInput ?? "").replace(/[^\d.-]/g, ""));

                                    const manualTransferTotal = isBreakdown ? adjustTransferCountedTotal : 0;
                                    const manualOtherTotal = isBreakdown ? adjustOtherCountedTotal : 0;

                                    if (!Number.isFinite(countedTotal) || countedTotal < 0) {
                                        showToast("Monto inválido.", "error");
                                        return;
                                    }

                                    if (!adjustManagerCode.trim()) {
                                        showToast("Código del manager requerido.", "error");
                                        return;
                                    }

                                    if (
                                        isBreakdown &&
                                        breakdown.length === 0 &&
                                        manualTransferTotal <= 0 &&
                                        manualOtherTotal <= 0
                                    ) {
                                        showToast("Debes ingresar billetes, tickets, transferencia u otros.", "error");
                                        return;
                                    }

                                    const cleanRegisterId = String(session?.registerId || activeRegisterId || "")
                                        .trim()
                                        .toUpperCase();

                                    if (!cleanRegisterId || cleanRegisterId === ALL_REGISTERS_ID) {
                                        showToast("Selecciona una caja específica antes de ajustar el cierre.", "error");
                                        return;
                                    }

                                    adjustCloseCashSessionMutation.mutate({
                                        dateYMD: selectedYMD,
                                        registerId: cleanRegisterId,
                                        countedTotal,
                                        breakdown,
                                        transferCountedTotal: manualTransferTotal,
                                        otherCountedTotal: manualOtherTotal,
                                        totalDeclaredAtClose: isBreakdown
                                            ? adjustTotalDeclaredAtClose
                                            : countedTotal,
                                        note: adjustNote,
                                        managerCode: adjustManagerCode.trim(),
                                    });
                                }}
                                className="w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold disabled:opacity-60"
                                disabled={adjustCloseCashSessionMutation.isPending}
                            >
                                {adjustCloseCashSessionMutation.isPending ? "Guardando ajuste..." : "Guardar ajuste"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {ecfAdjustmentModal.open && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-[#0b0b0c] border border-white/10 shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {ecfAdjustmentModal.documentType === "34"
                                        ? t("cashRegisterPage.ecf.createCreditNote")
                                        : t("cashRegisterPage.ecf.createDebitNote")}
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    {t("cashRegisterPage.ecf.affectedInvoice")}:{" "}
                                    <span className="text-[#f6b100] font-semibold">
                            {ecfAdjustmentModal.originalEcf?.eNCF || "—"}
                        </span>
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeEcfAdjustmentModal}
                                className="p-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[75vh] overflow-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-xl bg-[#111] border border-gray-800/50 p-3">
                                    <div className="text-xs text-gray-500">{t("cashRegisterPage.ecf.type")}</div>
                                    <div className="text-white font-semibold mt-1">
                                        {ecfAdjustmentModal.documentType === "34"
                                            ? t("cashRegisterPage.ecf.e34Credit")
                                            : t("cashRegisterPage.ecf.e33Debit")}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-[#111] border border-gray-800/50 p-3">
                                    <div className="text-xs text-gray-500">{t("cashRegisterPage.ecf.originalInvoice")}</div>
                                    <div className="text-white font-semibold mt-1">
                                        {ecfAdjustmentModal.originalEcf?.eNCF || "—"}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-[#111] border border-gray-800/50 p-3">
                                    <div className="text-xs text-gray-500">{t("cashRegisterPage.ecf.originalTotal")}</div>
                                    <div className="text-[#f6b100] font-bold mt-1">
                                        {currency(ecfAdjustmentModal.originalEcf?.totals?.total)}
                                    </div>
                                </div>
                            </div>
                            {ecfAdjustmentModal.documentType === "34" && (
                                <div className="rounded-xl border border-[#f6b100]/20 bg-[#f6b100]/10 p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-semibold text-white">{t("cashRegisterPage.ecf.availableCreditBalance")}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Original: {currency(originalEcfTotal)} · Créditos emitidos: {currency(acceptedCreditNotesTotal)}
                                            </div>
                                        </div>

                                        <div className="text-[#f6b100] font-bold text-lg">
                                            {currency(availableCreditTotal)}
                                        </div>
                                    </div>

                                    {acceptedDebitNotesTotal > 0 && (
                                        <div className="mt-2 text-xs text-amber-200">
                                            Las notas de débito ({currency(acceptedDebitNotesTotal)}) no aumentan el límite de notas de crédito contra el comprobante original.
                                        </div>
                                    )}
                                    {availableCreditTotal <= 0 && (
                                        <div className="mt-3 text-xs text-red-300">
                                            Esta factura ya fue cubierta por notas de crédito aceptadas. No se puede emitir otra E34.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="text-xs text-gray-400">Modo de ajuste</label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEcfAdjustmentForm((f) => ({
                                                ...f,
                                                adjustmentMode: "partial",
                                                modificationCode: getAdjustmentCode(ecfAdjustmentModal.documentType, "partial"),
                                            }));
                                            setConfirmedFullDebit(false);
                                            setConfirmedFullCredit(false);
                                            setLastEcfAdjustmentResult(null);
                                        }}
                                        className={`px-3 py-2 rounded-xl border text-sm font-semibold ${
                                            ecfAdjustmentForm.adjustmentMode === "partial"
                                                ? "bg-[#f6b100] text-black border-[#f6b100]"
                                                : "bg-[#111] text-white border-gray-800/50"
                                        }`}
                                    >
                                        {ecfAdjustmentModal.documentType === "33" ? "Aumento parcial" : "Crédito parcial"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEcfAdjustmentForm((f) => ({
                                                ...f,
                                                adjustmentMode: "total",
                                                amount: "",
                                                tax: "",
                                                modificationCode: getAdjustmentCode(ecfAdjustmentModal.documentType, "total"),
                                            }));
                                            setConfirmedFullDebit(false);
                                            setConfirmedFullCredit(false);
                                            setLastEcfAdjustmentResult(null);
                                        }}
                                        className={`px-3 py-2 rounded-xl border text-sm font-semibold ${
                                            ecfAdjustmentForm.adjustmentMode === "total"
                                                ? "bg-[#f6b100] text-black border-[#f6b100]"
                                                : "bg-[#111] text-white border-gray-800/50"
                                        }`}
                                    >
                                        {ecfAdjustmentModal.documentType === "33" ? "Importe igual al original" : "Anulación total"}
                                    </button>
                                </div>
                            </div>

                            {ecfAdjustmentModal.documentType === "33" && ecfAdjustmentForm.adjustmentMode === "total" && (
                                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                                    <p className="font-semibold">Atención: nota de débito por el total original</p>
                                    <p className="mt-1">Esto <strong>aumentará</strong> el importe de la factura en {currency(originalEcfTotal)}. No cancela ni sustituye el comprobante original.</p>
                                    <label className="mt-3 flex items-start gap-3 cursor-pointer rounded-lg border border-white/10 px-3 py-2">
                                        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#f6b100]" checked={confirmedFullDebit} onChange={(e) => setConfirmedFullDebit(e.target.checked)} />
                                        <span>Confirmo que el aumento por ese importe es intencional.</span>
                                    </label>
                                </div>
                            )}
                            {ecfAdjustmentForm.adjustmentMode !== "total" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400">Monto base</label>
                                        <input
                                            value={ecfAdjustmentForm.amount}
                                            onChange={(e) => {
                                                const value = formatThousands(e.target.value);
                                                setEcfAdjustmentForm((f) => ({
                                                    ...f,
                                                    amount: value,
                                                }));
                                            }}
                                            className="mt-1 w-full px-3 py-3 bg-[#111] border border-gray-800/50 rounded-xl text-white outline-none focus:border-[#f6b100]/60"
                                            placeholder=" 50.00"
                                            inputMode="decimal"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-400">ITBIS estimado (según factura original)</label>
                                        <div className="mt-1 w-full px-3 py-3 bg-[#111] border border-gray-800/50 rounded-xl text-white/90 text-sm min-h-[46px]">
                                            {previewTaxAmount === null ? "Se validará al emitir" : currency(previewTaxAmount)}
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-1">
                                            {previewTaxRate === null
                                                ? "No se puede confirmar la tasa desde esta vista. El servidor rechazará originales sin desglose fiscal verificable."
                                                : `Tasa registrada: ${previewTaxRate} %. El cálculo final siempre se verifica en el servidor.`}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {ecfAdjustmentModal.documentType === "34" && ecfAdjustmentForm.adjustmentMode === "total" && (
                                <p className="text-xs text-amber-200 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                                    {acceptedCreditNotesTotal > 0
                                        ? `La anulación aplicará un crédito por ${currency(availableCreditTotal)}, que es el saldo original aún no acreditado. Las notas de débito se concilian por separado.`
                                        : `Se intentará anular el saldo original de ${currency(availableCreditTotal)}. Confirma que esta operación corresponde a una anulación.`}
                                </p>
                            )}
                            {ecfAdjustmentModal.documentType === "34" && ecfAdjustmentForm.adjustmentMode === "total" && (
                                <label className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-white cursor-pointer">
                                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#f6b100]" checked={confirmedFullCredit} onChange={(e) => setConfirmedFullCredit(e.target.checked)} />
                                    <span>Confirmo la anulación del saldo original pendiente de {currency(availableCreditTotal)}. He comprobado las notas emitidas anteriormente.</span>
                                </label>
                            )}
                            <div>
                                <label className="text-xs text-gray-400">Código de modificación</label>
                                <div className="mt-1 w-full px-3 py-3 bg-[#111] border border-gray-800/50 rounded-xl text-white text-sm">
                                    {getAdjustmentCode(ecfAdjustmentModal.documentType, ecfAdjustmentForm.adjustmentMode) === "1"
                                        ? "1 — Anula el comprobante modificado"
                                        : "3 — Corrige montos del comprobante modificado"}
                                </div>
                                <p className="mt-1 text-[11px] text-gray-400">
                                    Seleccionado automáticamente según la nota y el tipo de operación. La corrección de texto (código 2) aún no está implementada.
                                </p>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400">Motivo</label>
                                <textarea
                                    value={ecfAdjustmentForm.reason}
                                    onChange={(e) =>
                                        setEcfAdjustmentForm((f) => ({
                                            ...f,
                                            reason: e.target.value,
                                        }))
                                    }
                                    className="mt-1 w-full min-h-[90px] px-3 py-3 bg-[#111] border border-gray-800/50 rounded-xl text-white outline-none focus:border-[#f6b100]/60 resize-none"
                                    placeholder="Describe el motivo de la nota..."
                                />
                            </div>

                            {lastEcfAdjustmentResult && (
                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                                    <div className="text-emerald-200 font-semibold">
                                        Nota emitida correctamente
                                    </div>
                                    <div className="text-xs text-emerald-100/80 mt-2 space-y-1">
                                        <div>eNCF: {lastEcfAdjustmentResult.eNCF}</div>
                                        <div>Estado: {lastEcfAdjustmentResult.status}</div>
                                        <div>TrackId: {lastEcfAdjustmentResult.trackId}</div>
                                        <div>Total: {currency(lastEcfAdjustmentResult?.totals?.total)}</div>
                                    </div>
                                </div>
                            )}

                            <div className="rounded-xl bg-[#111] border border-gray-800/50 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-sm font-semibold text-white">
                                        Notas existentes de esta factura
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {ecfAdjustments.length} nota(s)
                                    </div>
                                </div>

                                {ecfAdjustmentsLoading ? (
                                    <div className="text-sm text-gray-400">Cargando notas...</div>
                                ) : ecfAdjustments.length === 0 ? (
                                    <div className="text-sm text-gray-500">
                                        Esta factura todavía no tiene notas.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {ecfAdjustments.map((doc) => (
                                            <div
                                                key={doc.documentId}
                                                className="rounded-lg border border-gray-800/50 bg-[#0b0b0c] p-3"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="text-white font-semibold text-sm">
                                                            {doc.documentType === "33"
                                                                ? "Nota de Débito"
                                                                : "Nota de Crédito"}{" "}
                                                            - {doc.eNCF}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Motivo: {doc?.reference?.reason || "—"}
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="text-[#f6b100] font-bold">
                                                            {currency(doc?.totals?.total)}
                                                        </div>

                                                        <div className="text-xs text-gray-500">
                                                            {doc.status || "—"}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => openAdjustmentInvoicePreview(doc)}
                                                            className="mt-2 px-3 py-1 rounded-lg border border-[#f6b100]/40 bg-[#f6b100]/10 text-[#f6b100] text-xs font-semibold hover:bg-[#f6b100]/20 transition-colors"
                                                        >
                                                            Ver / Imprimir
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 p-5 border-t border-gray-800/50 bg-[#080808]">
                            <button
                                type="button"
                                onClick={closeEcfAdjustmentModal}
                                className="px-4 py-3 rounded-xl bg-[#1a1a1a] border border-gray-800/50 text-white font-semibold hover:bg-[#262626]"
                            >
                                {t("cashRegisterPage.actions.close")}
                            </button>

                            <button
                                type="button"
                                onClick={() => issueEcfAdjustmentMutation.mutate()}
                                disabled={
                                    issueEcfAdjustmentMutation.isPending ||
                                    ecfAdjustmentsLoading || ecfAdjustmentsFailed ||
                                    (ecfAdjustmentModal.documentType === "34" && ecfAdjustmentForm.adjustmentMode === "total" && !confirmedFullCredit) ||
                                    (ecfAdjustmentModal.documentType === "33" && ecfAdjustmentForm.adjustmentMode === "total" && !confirmedFullDebit) ||
                                    (
                                        ecfAdjustmentModal.documentType === "34" &&
                                        availableCreditTotal <= 0
                                    )
                                }                                className="px-4 py-3 rounded-xl bg-[#f6b100] text-black font-bold hover:bg-[#ffd633] disabled:opacity-60"
                            >
                                {issueEcfAdjustmentMutation.isPending
                                    ? "Emitiendo..."
                                    : "Emitir nota"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {toast.open && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999]">
                    <div
                        className={`px-4 py-3 rounded-xl shadow-2xl border backdrop-blur
                    ${toast.type === "error"
                            ? "bg-red-500/15 border-red-500/30 text-red-200"
                            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-medium">{toast.message}</div>
                            <button
                                type="button"
                                className="ml-2 text-white/70 hover:text-white"
                                onClick={() => setToast((t) => ({ ...t, open: false }))}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {managerCodeModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md rounded-2xl bg-[#0b0b0c] border border-white/10 shadow-2xl p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">{t("cashRegisterPage.manager.title")}</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setManagerCodeModalOpen(false);
                                    setManagerCodeInput("");
                                }}
                                className="text-white/70 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-3 rounded-lg bg-[#111] border border-gray-800/40 p-3">
                            <div className="text-xs text-gray-400">{t("cashRegisterPage.common.status")}</div>

                            <div className="text-sm text-white mt-1">
                                {managerCodeStatus?.data?.enabled ? "Activado" : "Desactivado"}
                                {managerCodeStatus?.data?.hint ? ` (${managerCodeStatus.data.hint})` : ""}
                            </div>

                            {managerCodeStatus?.data?.updatedAt && (
                                <div className="text-[11px] text-gray-500 mt-1">
                                    {t("cashRegisterPage.manager.lastUpdated")}:{" "} {
                                    formatDateTime(
                                        managerCodeStatus.data.updatedAt,
                                        localization
                                    )
                                }
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <label className="text-xs text-gray-400">
                                {t("cashRegisterPage.manager.newCode")}
                            </label>
                            <input
                                value={managerCodeInput}
                                onChange={(e) => setManagerCodeInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
                                className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                placeholder={t(
                                    "cashRegisterPage.manager.codePlaceholder"
                                )}

                                inputMode="numeric"
                            />
                            <div className="text-[11px] text-gray-500 mt-1">
                                {t("cashRegisterPage.manager.securityHint")}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const code = managerCodeInput.trim();
                                if (!/^\d{4,8}$/.test(code)) {
                                    showToast(
                                        t(
                                            "cashRegisterPage.messages.managerCodeInvalidFormat"
                                        )
                                    );
                                    return;
                                }
                                setManagerCodeMutation.mutate({ managerCode: code });
                            }}
                            disabled={setManagerCodeMutation.isPending}
                            className="mt-4 w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] disabled:opacity-60"
                        >
                            {t("cashRegisterPage.manager.saveUpdate")}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                // Desactivar: backend acepta managerCode = ""
                                setManagerCodeMutation.mutate({ managerCode: "" });
                            }}
                            disabled={setManagerCodeMutation.isPending}
                            className="mt-2 w-full px-3 py-2 bg-[#262626] border border-gray-800/50 text-white rounded-lg font-semibold disabled:opacity-60"
                        >
                            {t("cashRegisterPage.manager.disableCode")}
                        </button>
                    </div>
                </div>
            )}





            {showEcfIncidents && canManageFiscalIncidents && (
                <EcfIncidentsModal
                    key={`${currentTenantId || "NO_TENANT"}:${currentClientId || "default"}`}
                    tenantId={currentTenantId}
                    clientId={currentClientId}
                    onClose={() => setShowEcfIncidents(false)}
                />
            )}
            {showClosingDocuments && (
                <CashCloseDocumentsModal
                    key={`${currentTenantId || "NO_TENANT"}:${currentClientId || "default"}`}
                    tenantId={currentTenantId}
                    clientId={currentClientId}
                    onClose={() => setShowClosingDocuments(false)}
                    dateYMD={selectedYMD}
                    registerId={activeRegisterId}
                    orders={dayVisibleReports}
                    money={currency}
                    supportsDominicanFiscal={supportsDominicanFiscal && Boolean(planFeatures.fiscal)}
                    onOpenOrder={(orderId) => { setShowClosingDocuments(false); verFactura(orderId); }}
                    onOpenFiscal={(doc) => {
                        setShowClosingDocuments(false);
                        if (doc.documentType === "33" || doc.documentType === "34") {
                            openAdjustmentInvoicePreview(doc);
                        } else if (doc.orderId) {
                            verFactura(doc.orderId);
                        }
                    }}
                />
            )}
            {selectedOrderInvoice?._id && (
                <Invoice
                    order={selectedOrderInvoice}
                    onClose={() => setSelectedOrderInvoice(null)}
                />
            )}
            {selectedAdjustmentInvoice?.order && (
                <Invoice
                    order={selectedAdjustmentInvoice.order}
                    invoiceTitle={selectedAdjustmentInvoice.title}
                    onClose={() => setSelectedAdjustmentInvoice(null)}
                />
            )}
        </>
    );
};

export default CashRegister;
