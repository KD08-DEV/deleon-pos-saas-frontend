// src/pages/admin/CashRegister.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Search, Filter, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/api";
const DEFAULT_REGISTER_ID = "MAIN";
const ALL_REGISTERS_ID = "__ALL_REGISTERS__";

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





const currency = (n) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(Number(n || 0));
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

const getTodayKey = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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



const getOpeningCashStorageKey = () => {
    // Intento: tenantId + userId + fecha. Si no existen, cae a host + fecha.
    const u = getUserFromStorage();
    const tenantId = u?.tenantId || u?.tenant?._id || u?.tenant?.id || "";
    const userId = u?._id || u?.id || u?.user?._id || "";
    const host = typeof window !== "undefined" ? window.location.host : "app";
    const day = getTodayKey();

    return `cash_opening_${host}_${tenantId || "noTenant"}_${userId || "noUser"}_${day}`;
};

const CashRegister = () => {
    const [batchesModalOpen, setBatchesModalOpen] = useState(false);
    const [adminCloseTargetSession, setAdminCloseTargetSession] = useState(null);
    const [hideAdminSelectedSession, setHideAdminSelectedSession] = useState(false);
    const closeFormRef = useRef(null);
    const [selectedRegisterId, setSelectedRegisterId] = useState(() => {
        const saved = getSavedRegisterId();
        return saved || "";
    });
    const getLocalYMD = () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };
    const todayYMD = getLocalYMD();


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
    const [mermaModalOpen, setMermaModalOpen] = useState(false);
    const [mermaSearch, setMermaSearch] = useState("");
    const [mermaQtyInput, setMermaQtyInput] = useState("");
    const [mermaCostInput, setMermaCostInput] = useState("");
    const [mermaNote, setMermaNote] = useState("");
    const [mermaMode, setMermaMode] = useState("create");
    const [batchToClose, setBatchToClose] = useState(null);
    const [mermaSelectedDish, setMermaSelectedDish] = useState(null);
    const [unitCostInput, setUnitCostInput] = useState("");
    const [finalQtyInput, setFinalQtyInput] = useState("");
    const [rawQtyInput, setRawQtyInput] = useState("");
    const [mermaEditTab, setMermaEditTab] = useState("cooked"); // "cooked" | "raw"
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
                label: `Ticket RD$ ${ticketAmount}`,
                value: ticketAmount,
                count: ticketCount,
                kind: "ticket",
            },
        ];
    }, [ticketAmount, ticketCount]);

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
                label: `Ticket RD$ ${adjustTicketAmount}`,
                value: adjustTicketAmount,
                count: adjustTicketCount,
                kind: "ticket",
            },
        ];
    }, [adjustTicketAmount, adjustTicketCount]);

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
        modificationCode: "1",
    });

    const [lastEcfAdjustmentResult, setLastEcfAdjustmentResult] = useState(null);
    const [selectedAdjustmentInvoice, setSelectedAdjustmentInvoice] = useState(null);

    const roleNorm = role.toLowerCase();

    const roleRaw =
        me?.role ||
        me?.user?.role ||
        me?.profile?.role ||
        me?.account?.role ||
        "";
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
    const currentTenantId =
        me?.tenantId ||
        me?.tenant?.tenantId ||
        me?.tenant?._id ||
        userData?.tenantId ||
        userData?.tenant?.tenantId ||
        userData?.tenant?._id ||
        localStorage.getItem("tenantId") ||
        "NO_TENANT";

    const currentClientId =
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
            ? "TODAS LAS CAJAS"
            : activeRegisterId;


    const addDaysYMD = (ymd, days) => {
        const d = new Date(`${ymd}T00:00:00`);
        d.setDate(d.getDate() + days);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const [forceSummary, setForceSummary] = useState(false);
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

    const [sessionConflict, setSessionConflict] = useState(false);

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
        setForceSummary(false);
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
        queryKey: ["admin/usage"],
        queryFn: async () => {
            const res = await api.get("/api/admin/usage");
            return res.data;
        },
        staleTime: 60_000,
        retry: 0,
    });
    const { data: tenantEcfStatusResp } = useQuery({
        queryKey: ["tenant-ecf-status-for-adjustments"],
        queryFn: async () => {
            const res = await api.get("/api/order/ecf/status");
            return res.data;
        },
        staleTime: 30_000,
        retry: 0,
    });

    const tenantEcfStatus = tenantEcfStatusResp?.data || {};

    const ecfAdjustmentsEnabled =
        tenantEcfStatus?.enabled === true &&
        tenantEcfStatus?.canIssue === true;

    const e33Enabled =
        ecfAdjustmentsEnabled &&
        tenantEcfStatus?.documentTypes?.e33?.enabled === true;

    const e34Enabled =
        ecfAdjustmentsEnabled &&
        tenantEcfStatus?.documentTypes?.e34?.enabled === true;

    const planFeatures = usageResp?.data?.features || {};

    const canUseExpenses = Boolean(planFeatures.expenses);

// Merma pertenece al módulo avanzado de inventario.
// En nuestra distribución, merma debe estar en Premium / Pro.
    const canUseMerma = Boolean(planFeatures.waste);

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
        enabled: Boolean(selectedYMD),
        staleTime: 10_000,
        retry: 1,
    });

    const receivableCashSummary =
        receivableCashSummaryResp?.data ||
        receivableCashSummaryResp ||
        {};
    // Fondo inicial (menudo)
    const [openingCashInput, setOpeningCashInput] = useState("");
    const openingEditedRef = useRef(false);

    const { data: mermaBatchesResp, refetch: refetchMermaBatches } = useQuery({
        queryKey: ["merma/batches", selectedYMD],
        enabled: Boolean(selectedYMD && canUseMerma),
        queryFn: async () => {
            if (!canUseMerma) {
                return { success: false, batches: [] };
            }

            try {
                const res = await api.get("/api/inventory/merma/batches", {
                    params: { dateYMD: selectedYMD },
                });
                return res.data;
            } catch (e) {
                return { success: false, batches: [] };
            }
        },
        staleTime: 15_000,
        retry: 0,
    });




    const mermaBatches = useMemo(() => {
        const raw = mermaBatchesResp;
        if (Array.isArray(raw?.batches)) return raw.batches;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
    }, [mermaBatchesResp]);


    const openBatches = useMemo(
        () => mermaBatches.filter((b) => (b?.status || "open") === "open"),
        [mermaBatches]
    );

    const closedBatches = useMemo(
        () => mermaBatches.filter((b) => (b?.status || "") === "closed"),
        [mermaBatches]
    );
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

            showToast("Ajuste guardado correctamente.", "success");

            setTimeout(() => {
                window.location.reload();
            }, 700);
        },
        onError: (err) => {

            alert(err?.response?.data?.message || JSON.stringify(err?.response?.data) || "Error ajustando cierre");
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
            showToast("Cierre registrado correctamente.", "success");
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
                "No se pudo cerrar la caja.";

            // Mensaje amigable si el manager code está mal
            if (msg === "INVALID_MANAGER_CODE" || msg === "MISSING_MANAGER_CODE") {
                showToast("Código del manager incorrecto.", "error");
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


    const [batchesTab, setBatchesTab] = useState("open"); // "open" | "closed" | "all"

    const createBatchMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/api/inventory/merma/batches", payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["merma/batches"] });
            queryClient.invalidateQueries({ queryKey: ["merma/summary"] });
        },
    });

    const closeBatchMutation = useMutation({
        mutationFn: async ({ batchId, finalQty, note, dateYMD }) => {
            const res = await api.patch(
                `/api/inventory/merma/batches/${encodeURIComponent(batchId)}/close`,
                { finalQty, note, dateYMD }
            );
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["merma/batches"] });
            queryClient.invalidateQueries({ queryKey: ["merma/summary"] });
        },
    });

    const updateBatchMutation = useMutation({
        mutationFn: async ({ id, body }) => {
            const { data } = await api.patch(`/api/inventory/merma/batches/${id}`, body);
            return data;
        },
        onSuccess: async () => {
            // 1) refresca la lista del día (esto reemplaza refetchOpenBatches/refetchClosedBatches/refetchBatches)
            await refetchMermaBatches();

            // 2) refresca el summary (tarjetas de merma)
            queryClient.invalidateQueries({ queryKey: ["inventory/merma/summary", selectedYMD] });
            queryClient.invalidateQueries({ queryKey: ["merma/summary"] });

            // 3) refresca el lote seleccionado en pantalla (asegurando formato correcto del response)
            const res = await api.get("/api/inventory/merma/batches", { params: { dateYMD: selectedYMD } });
            const list = res?.data?.batches || res?.data?.data || [];
            if (batchToClose?._id && Array.isArray(list)) {
                const found = list.find((x) => x?._id === batchToClose._id);
                if (found) setBatchToClose(found);
            }
        },
    });



    const handleSaveBatch = () => {
        if (mermaMode === "create") {
            const dishId = mermaSelectedDish?._id;
            const rawQty = Number(String(rawQtyInput).replace(/[^\d.-]/g, ""));
            if (!dishId) return alert("Selecciona un plato.");
            if (!Number.isFinite(rawQty) || rawQty <= 0) return alert("Cantidad cruda inválida.");

            const unitCost = unitCostInput
                ? Number(String(unitCostInput).replace(/[^\d.-]/g, ""))
                : undefined;

            createBatchMutation.mutate({
                rawItemId: dishId,
                rawQty,
                unitCost,
                note: mermaNote,
                dateYMD: selectedYMD,
            });

            setMermaModalOpen(false);
            return;
        }

        const id = batchToClose?._id;
        const finalQty = Number(String(finalQtyInput).replace(/[^\d.-]/g, ""));
        const rawQty = Number(batchToClose?.rawQty || 0);

        if (!id) return alert("Lote inválido.");
        if (!Number.isFinite(finalQty) || finalQty < 0) return alert("Cantidad final inválida.");
        if (finalQty > rawQty) return alert("La cantidad final no puede ser mayor que la cruda.");

        if (mermaMode === "close") {
            if (!batchToClose?._id) {
                showToast("No se encontró el lote.");
                return;
            }

            // Si estás en Entrada, no cierres aquí (se guarda con updateBatchMutation)
            if (mermaEditTab === "raw") {
                showToast("Estás en la pestaña Entrada. Usa “Guardar Entrada” o cambia a Salida.");
                return;
            }

            const finalQtyNum = Number(String(finalQtyInput || "").replace(/[^\d.-]/g, ""));
            if (Number.isNaN(finalQtyNum) || finalQtyNum < 0) {
                showToast("Cantidad final inválida.");
                return;
            }

            closeBatchMutation.mutate({
                batchId: batchToClose._id,
                finalQty: finalQtyNum,
                note: mermaNote || "",
                dateYMD: selectedYMD,
            });
        }


        setMermaModalOpen(false);
    };

    const modalRangeFrom = (modalFrom || "").trim();
    const modalRangeTo = (modalTo || "").trim();

    const modalRangeEnabled =
        showFullView &&
        isValidYMD(modalRangeFrom) &&
        isValidYMD(modalRangeTo) &&
        modalRangeFrom <= modalRangeTo;

    const getTenantIdSafe = () => {
        const u = getUserFromStorage?.() || {};
        return (
            u?.tenantId ||
            u?.tenant?._id ||
            u?.tenant?.id ||
            localStorage.getItem("tenantId") ||
            ""
        );
    };

    const { data: dishesResp, isLoading: dishesLoading } = useQuery({
        queryKey: ["dishes-for-merma"],
        enabled: Boolean(canUseMerma && (mermaModalOpen || batchesModalOpen)),
        queryFn: async () => {
            const res = await api.get("/api/dishes");
            return res.data;
        },
        staleTime: 30_000,
        retry: 0,
    });


    const inventoryItemsLoading = dishesLoading;










    const dishesList = useMemo(() => {
        const raw = dishesResp;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.dishes)) return raw.dishes;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
    }, [dishesResp]);
    const dishById = useMemo(() => {
        const m = new Map();
        for (const d of (Array.isArray(dishesList) ? dishesList : [])) {
            const id = String(d?._id || d?.id || "");
            if (id) m.set(id, d);
        }
        return m;
    }, [dishesList]);

    const getBatchProductName = (b) => {
        if (!b) return "Producto";
        if (b?.rawItemName) return b.rawItemName;
        if (b?.rawItem?.name) return b.rawItem.name;

        const rawItemId =
            typeof b?.rawItemId === "object"
                ? String(b?.rawItemId?._id || b?.rawItemId?.id || "")
                : String(b?.rawItemId || "");

        const dish = rawItemId ? dishById.get(rawItemId) : null;
        return dish?.name || "Producto";
    };

    const filteredDishes = useMemo(() => {
        const list = Array.isArray(dishesList) ? dishesList : [];
        const q = normalize(mermaSearch);
        if (!q) return list;

        return list.filter((d) => {
            const name = normalize(d?.name);
            const code = normalize(d?.code || d?.sku);
            return name.includes(q) || code.includes(q);
        });
    }, [dishesList, mermaSearch]);

    const filteredInventoryItems = filteredDishes;


    const safeList = Array.isArray(filteredInventoryItems) ? filteredInventoryItems : [];

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



    const { data: mermaRes } = useQuery({
        queryKey: ["inventory/merma/summary", selectedYMD],
        queryFn: async () => {
            if (!canUseMerma) {
                return {
                    success: false,
                    data: {
                        mermaQty: 0,
                        mermaCost: 0,
                    },
                };
            }

            try {
                const res = await api.get("/api/inventory/merma/summary", {
                    params: { dateYMD: selectedYMD },
                });
                return res.data;
            } catch (e) {
                return {
                    success: false,
                    data: {
                        mermaQty: 0,
                        mermaCost: 0,
                    },
                };
            }
        },
        enabled: Boolean(selectedYMD && canUseMerma),
        staleTime: 10_000,
        retry: 0,
    });

    const mermaQty = Number(mermaRes?.data?.mermaQty || 0);
    const mermaCost = Number(mermaRes?.data?.mermaCost || 0);





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


    const modalMenudoActual = modalOpeningInitial + modalAddedTotal;





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
            showToast(err?.response?.data?.message || "Error guardando manager code");
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

    // Cajera solo puede guardar fondo inicial si:
    // - es hoy
    // - NO hay fondo inicial aún
    // - NO hay dinero agregado aún (opcional, pero recomendado para evitar inconsistencias)
    const cashierCanSetOpening =
        isSelectedToday &&
        !sessionClosed &&
        !openingAlreadySet &&
        addedTotal <= 0;

    // Admin puede “Guardar” si aún no hay opening, o “Editar” si ya existe
    const adminCanSetOpening =
        isSelectedToday &&
        !sessionClosed &&
        !openingAlreadySet;
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

    const addCashModalMutation = useMutation({
        mutationFn: async ({ dateYMD, registerId, amount }) => {
            console.log("[POST add MODAL] request", { dateYMD, registerId, amount });

            const res = await api.post("/api/admin/cash-session/add", {
                dateYMD,
                registerId,
                amount,
            });

            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["admin/cash-session", "modal", modalDay || "range"],
            });
        },
        onError: (err) => {
            console.log("[POST add MODAL] ERROR", {
                status: err?.response?.status,
                url: err?.config?.url,
                payload: err?.config?.data,
                data: err?.response?.data,
            });
            showToast("No se pudo agregar dinero.");
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
                showToast("No se encontró la sesión para esa fecha/caja.");
                queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD, activeRegisterId] });
                return;
            }

            if (status === 409) {
                const message = err?.response?.data?.message;

                if (message === "PENDING_CASH_SESSION_CLOSE") {
                    showToast("Tienes una caja anterior pendiente de cierre.", "error");
                } else if (message === "CASH_SESSION_ALREADY_CLOSED") {
                    showToast("Esta caja ya fue cerrada para esta fecha.", "error");
                } else if (message === "SESSION_ALREADY_EXISTS") {
                    showToast("Ya existe una apertura para esta caja y esta cajera.", "error");
                } else {
                    showToast("No se pudo abrir la caja. Revisa si ya existe una sesión.", "error");
                }

                queryClient.invalidateQueries({ queryKey: ["admin/cash-session"] });
                return;
            }

            showToast(
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                "No se pudo guardar el fondo inicial."
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
                showToast("Debes ingresar el código del manager.", "error");
                return;
            }

            if (message === "INVALID_MANAGER_CODE") {
                showToast("Código del manager incorrecto.", "error");
                return;
            }

            if (message === "SESSION_NOT_FOUND") {
                showToast("No se encontró la sesión de caja para esta cajera y caja.", "error");
                return;
            }

            if (message === "SESSION_CLOSED") {
                showToast("La caja ya está cerrada. No se puede editar el fondo inicial.", "error");
                return;
            }

            showToast("No se pudo editar el fondo inicial.", "error");
        },
    });

    useEffect(() => {
        if (sessionExists) setSessionConflict(false);
    }, [sessionExists]);
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
                showToast("Solo admin puede agregar dinero después del cierre.");
                return;
            }

            if (status === 403) {
                showToast("Solo administración puede agregar dinero.");
                return;
            }

            showToast(msg || "No se pudo agregar dinero.");
        },
    });

    const adjustCashMutation = useMutation({
        mutationFn: async ({ dateYMD, registerId, openingFloat, note }) => {

            const res = await api.patch("/api/admin/cash-session/adjust", {
                dateYMD,
                registerId,
                openingFloat,
                note: note || "",
            });

            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD] });
        },
        onError: (err) => {
            console.log("[PATCH adjust] ERROR", {
                status: err?.response?.status,
                url: err?.config?.url,
                payload: err?.config?.data,
                data: err?.response?.data,
            });
            showToast("No se pudo editar el fondo inicial. Revisa consola.");
        },
    });


    // Limpia filtros vacíos antes de enviar (para la query inicial)
// Limpia filtros vacíos antes de enviar.
// Importante:
// - Vista normal: carga solo selectedYMD.
// - Modal "Registros Completos": si hay rango, carga ese rango desde backend.
    const cleanedParams = useMemo(() => {
        const modalFromValue = String(modalFilters.from || "").trim();
        const modalToValue = String(modalFilters.to || "").trim();

        const useModalRange =
            showFullView &&
            isValidYMD(modalFromValue);

        const from = useModalRange ? modalFromValue : selectedYMD;
        const to = useModalRange
            ? (isValidYMD(modalToValue) ? modalToValue : modalFromValue)
            : selectedYMD;

        const params = {
            from,
            to,
        };

        const registerForQuery = showFullView
            ? modalRegisterId
            : registerFilterValue;

        if (registerForQuery && registerForQuery !== ALL_REGISTERS_ID) {
            params.registerId = registerForQuery;
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


    const getFiscalType = (r) => {
        const clean = (v) =>
            String(v || "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[\s_-]+/g, "");

        // 1. Primero revisamos e-CF porque E31/E32/E33/E34 deben ganar sobre B01/B02
        const ecfType = clean(
            r?.ecf?.documentType ||
            r?.ecf?.tipoeCF ||
            r?.ecf?.tipoEcf ||
            r?.ecfDocumentType ||
            r?.fiscal?.ecfDocumentType ||
            r?.invoice?.ecf?.documentType ||
            r?.invoice?.fiscal?.ecfDocumentType ||
            ""
        );

        const ecfNumber = clean(
            r?.ecf?.eNCF ||
            r?.ecf?.encf ||
            r?.eNCF ||
            r?.encf ||
            r?.fiscal?.eNCF ||
            r?.fiscal?.encf ||
            r?.invoice?.ecf?.eNCF ||
            r?.invoice?.fiscal?.eNCF ||
            ""
        );

        const ecfValue = `${ecfType} ${ecfNumber}`;

        if (["31", "e31"].includes(ecfType) || ecfValue.includes("e31")) return "e31";
        if (["32", "e32"].includes(ecfType) || ecfValue.includes("e32")) return "e32";
        if (["33", "e33"].includes(ecfType) || ecfValue.includes("e33")) return "e33";
        if (["34", "e34"].includes(ecfType) || ecfValue.includes("e34")) return "e34";

        // 2. Luego revisamos comprobantes fiscales normales B01/B02
        const ncfType = clean(
            r?.fiscal?.ncfType ||
            r?.fiscal?.type ||
            r?.fiscal?.documentType ||
            r?.documentType ||
            r?.ncfType ||
            r?.bills?.ncfType ||
            r?.bills?.documentType ||
            r?.invoice?.fiscal?.ncfType ||
            r?.invoice?.fiscal?.documentType ||
            r?.invoice?.ncfType ||
            ""
        );

        const ncfNumber = clean(
            r?.fiscal?.ncfNumber ||
            r?.fiscal?.ncf ||
            r?.ncfNumber ||
            r?.ncf ||
            r?.invoice?.fiscal?.ncfNumber ||
            r?.invoice?.fiscal?.ncf ||
            r?.invoice?.ncfNumber ||
            ""
        );

        const ncfValue = `${ncfType} ${ncfNumber}`;

        if (ncfType === "b01" || ncfValue.includes("b01")) return "b01";
        if (ncfType === "b02" || ncfValue.includes("b02")) return "b02";

        // 3. Fallback por nombres descriptivos
        const textValue = clean(
            [
                r?.fiscal?.name,
                r?.fiscal?.label,
                r?.fiscal?.description,
                r?.documentName,
                r?.documentLabel,
                r?.invoice?.fiscal?.name,
                r?.invoice?.fiscal?.label,
            ].filter(Boolean).join(" ")
        );

        if (textValue.includes("creditofiscal") || textValue.includes("facturacreditofiscal")) {
            return "credito_fiscal";
        }

        if (textValue.includes("consumidorfinal") || textValue.includes("facturaconsumidorfinal")) {
            return "consumidor_final";
        }

        if (textValue.includes("debitofiscal") || textValue.includes("notadebito")) {
            return "debito_fiscal";
        }

        if (textValue.includes("notacredito")) {
            return "nota_credito";
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

    const reports = data?.data || [];

    // Ordenar por fecha más reciente
    const sortedReports = useMemo(() => {
        return [...reports].sort((a, b) => {
            const dateA = new Date(a?.paidAt || a?.createdAt || 0);
            const dateB = new Date(b?.paidAt || b?.createdAt || 0);
            return dateB - dateA;
        });
    }, [reports]);

    const { data: mermaDayResp } = useQuery({
        queryKey: ["inventory/merma-summary", selectedYMD],
        queryFn: async () => {
            if (!canUseMerma) {
                return {
                    success: false,
                    data: {
                        mermaQty: 0,
                        mermaCost: 0,
                    },
                };
            }

            const res = await api.get("/api/inventory/merma/summary", {
                params: { dateYMD: selectedYMD },
            });

            return res.data;
        },
        enabled: Boolean(selectedYMD && canUseMerma),
        staleTime: 10_000,
        retry: 0,
    });

    const mermaDay = mermaDayResp?.data || { mermaQty: 0, mermaCost: 0 };

// Para el modal (si hay rango válido)
    const { data: mermaRangeResp } = useQuery({
        queryKey: ["inventory/merma-summary", "range", modalRangeFrom, modalRangeTo],
        enabled: Boolean(modalRangeEnabled && canUseMerma),
        queryFn: async () => {
            if (!canUseMerma) {
                return {
                    success: false,
                    data: {
                        mermaQty: 0,
                        mermaCost: 0,
                    },
                };
            }

            const res = await api.get("/api/inventory/merma/summary", {
                params: { from: modalRangeFrom, to: modalRangeTo },
            });

            return res.data;
        },
        staleTime: 10_000,
        retry: 0,
    });


    const mermaRange = mermaRangeResp?.data || { mermaQty: 0, mermaCost: 0 };

// Solo registros del día de HOY (fecha local)


    const toLocalYMD = (value) => {
        const dt = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(dt.getTime())) return null;
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

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
    const rawDayReports = useMemo(() => {
        return sortedReports.filter((r) =>
            toLocalYMD(r?.paidAt || r?.createdAt) === selectedYMD
        );
    }, [sortedReports, selectedYMD]);

// Órdenes visibles como ventas cobradas.
// Crédito NO aparece en la tabla ni cuenta como venta normal.
    const dayReports = useMemo(() => {
        return rawDayReports.filter((r) => !isCreditOrder(r));
    }, [rawDayReports]);


    // Filtro para el modal (todos los registros con filtros)
    const modalFilteredReports = useMemo(() => {
        const from = modalFilters.from ? new Date(`${modalFilters.from}T00:00:00`) : null;
        const to = modalFilters.to ? new Date(`${modalFilters.to}T23:59:59`) : null;
        const method = normalize(modalFilters.method);
        const fiscal = normalize(modalFilters.fiscal);
        const user = normalize(modalFilters.user);
        const client = normalize(modalFilters.client);
        const selectedRegister = String(modalRegisterId || "").trim().toUpperCase();

        return sortedReports.filter((r) => {
            if (isCreditOrder(r)) {
                return false;
            }
            if (selectedRegister && selectedRegister !== ALL_REGISTERS_ID) {
                const orderRegister = String(r?.registerId || DEFAULT_REGISTER_ID).trim().toUpperCase();

                const isLegacyMain =
                    selectedRegister === DEFAULT_REGISTER_ID &&
                    (!r?.registerId || ["MAIN", "DEFAULT", ""].includes(orderRegister));

                if (!isLegacyMain && orderRegister !== selectedRegister) {
                    return false;
                }
            }
            const createdAt = r?.paidAt ? new Date(r.paidAt) : (r?.createdAt ? new Date(r.createdAt) : null);
            if (from && createdAt && createdAt < from) return false;
            if (to && createdAt && createdAt > to) return false;

            if (method) {
                const pm = normalize(r?.paymentMethod || "Efectivo");
                if (!pm.includes(method)) return false;
            }
            if (fiscal) {
                const fiscalType = getFiscalType(r);

                const fiscalTypes = [
                    "b01",
                    "b02",
                    "e31",
                    "e32",
                    "e33",
                    "e34",
                    "credito_fiscal",
                    "consumidor_final",
                    "debito_fiscal",
                    "nota_credito",
                ];

                const hasFiscal = fiscalTypes.includes(fiscalType);

                const isCreditoFiscal = ["b01", "e31", "credito_fiscal"].includes(fiscalType);
                const isConsumidorFinal = ["b02", "e32", "consumidor_final"].includes(fiscalType);
                const isDebitoFiscal = ["e33", "debito_fiscal"].includes(fiscalType);
                const isNotaCredito = ["e34", "nota_credito"].includes(fiscalType);

                if (fiscal === "fiscal" && !hasFiscal) {
                    return false;
                }

                if (fiscal === "credito_fiscal" && !isCreditoFiscal) {
                    return false;
                }

                if (fiscal === "consumidor_final" && !isConsumidorFinal) {
                    return false;
                }

                if (fiscal === "debito_fiscal" && !isDebitoFiscal) {
                    return false;
                }

                if (fiscal === "nota_credito" && !isNotaCredito) {
                    return false;
                }

                if (["b01", "b02", "e31", "e32", "e33", "e34"].includes(fiscal) && fiscalType !== fiscal) {
                    return false;
                }

                if (fiscal === "nofiscal" && hasFiscal) {
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
    }, [sortedReports, modalFilters, modalRegisterId]);

    const buildCashClosure = (
        rows,
        openingInitial,
        addedTotal,
        expensesSummary = { totalExpenses: 0, cashExpenses: 0 },
        receivableSummary = {}
    ) => {
        const buckets = {
            efectivo: { label: "Efectivo", total: 0, count: 0 },
            tarjeta: { label: "Tarjeta", total: 0, count: 0 },
            transferencia: { label: "Transferencia", total: 0, count: 0 },
            delivery: { label: "Delivery", total: 0, count: 0 },
            pedidoya: { label: "Pedido Ya", total: 0, count: 0 },
            ubereats: { label: "Uber Eats", total: 0, count: 0 },
            otros: { label: "Otros", total: 0, count: 0 },
            ticket: { label: "Ticket", total: 0, count: 0 },
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
            receivableCashSummary,
        ]
    );
// Resumen de ventas:
// Solo debe salir de órdenes, abonos CxC y métodos reales de pago.
// NO debe mezclar dinero declarado en el cierre.
    const summaryCashClosure = initialCashClosure;

// Resumen de cierre de caja:
// Sale del conteo declarado por la cajera/admin al cerrar.
    const closingBoxSummary = useMemo(() => {
        const billsCoinsTotal = safeNumber(closingDeclaredSummary?.cashTotal);
        const ticketTotal = safeNumber(closingDeclaredSummary?.ticketTotal);
        const transferTotal = safeNumber(closingDeclaredSummary?.transferTotal);
        const otherTotal = safeNumber(closingDeclaredSummary?.otherTotal);

        const openingTotal = safeNumber(openingInitial) + safeNumber(addedTotal);
        const cashExpenses = safeNumber(initialCashClosure?.cashExpenses);

        const declaredTotal = Number(
            (billsCoinsTotal + ticketTotal + transferTotal + otherTotal).toFixed(2)
        );

        const countedCashEquivalent = Number(
            (billsCoinsTotal + ticketTotal).toFixed(2)
        );

        const hasData =
            closingDeclaredSummary?.hasData ||
            declaredTotal > 0 ||
            openingTotal > 0 ||
            cashExpenses > 0 ||
            safeNumber(closingCountedSaved) > 0;

        return {
            hasData,
            openingTotal,
            billsCoinsTotal,
            ticketTotal,
            transferTotal,
            otherTotal,
            cashExpenses,
            countedCashEquivalent,
            declaredTotal,
        };
    }, [
        closingDeclaredSummary,
        openingInitial,
        addedTotal,
        initialCashClosure?.cashExpenses,
        closingCountedSaved,
    ]);
    const systemExpectedInRegisterShown = useMemo(() => {
        /*
         * Para cierre de caja, el sistema esperado debe incluir:
         * fondo inicial + dinero agregado + ventas efectivo + abonos efectivo - gastos efectivo.
         *
         * Si la caja ya está cerrada, usamos el valor guardado por backend.
         * Si está abierta o no hay cierre guardado, usamos el cálculo local.
         */
        const savedExpected = safeNumber(expectedInRegisterShown);

        if (
            sessionClosed ||
            closingAlreadySet ||
            savedExpected > 0
        ) {
            return Number(savedExpected.toFixed(2));
        }

        return Number(safeNumber(initialCashClosure?.cashInRegister).toFixed(2));
    }, [
        expectedInRegisterShown,
        sessionClosed,
        closingAlreadySet,
        initialCashClosure?.cashInRegister,
    ]);

// Ventas netas (ventas - merma). OJO: esto es para reporte, NO afecta el efectivo real en caja.
    const netSales = useMemo(() => {
        return Number((safeNumber(initialCashClosure.grandTotal) - mermaCost).toFixed(2));
    }, [initialCashClosure.grandTotal, mermaCost]);




    const modalOpeningForSummary = modalDay ? modalMenudoActual : 0;

    const modalCashClosure = useMemo(
        () => buildCashClosure(modalFilteredReports, modalOpeningInitial, modalAddedTotal),
        [modalFilteredReports, modalOpeningInitial, modalAddedTotal]
    );





    const verFactura = async (orderId) => {
        try {
            const res = await api.get(`/api/invoice/${orderId}`);
            const url = res.data?.url || res.data?.invoiceUrl;

            if (!res.data?.success || !url) {
                showToast("No se pudo obtener la factura");
                return;
            }

            window.open(url, "_blank", "noopener,noreferrer");
        } catch (error) {
            console.error("Error cargando factura:", error);
            showToast("Error al cargar la factura");
        }
    };


    const downloadExcel = async (reportsToExport = dayReports, summary = initialCashClosure) => {
        try {
            const cleanReportsToExport = reportsToExport.filter((r) => {
                const method = String(r?.paymentMethod || "").trim().toLowerCase();
                return method !== "credito" && method !== "credit";
            });

            const rows = cleanReportsToExport.map((r) => ({
                Factura: getInvoiceNumber(r),
                Fecha: r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
                Usuario: r?.user?.name || "—",
                Cliente: getClientName(r),
                Metodo: r?.paymentMethod || "Efectivo",
                Total: Number(r?.bills?.totalWithTax ?? r?.totalWithTax ?? r?.total ?? 0),
                OrderId: r?._id || "",
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Cierre de Caja");

            const summaryRows = [
                { Campo: "Fondo inicial (menudo)", Valor: Number(summary?.openingInitial || 0) },
                { Campo: "Ventas a crédito / CxC", Valor: Number((summary?.creditSales || 0) * -1) },
                { Campo: "Abonos CxC cobrados", Valor: Number(summary?.receivablePaymentsTotal || 0) },
                { Campo: "Abonos CxC efectivo", Valor: Number(summary?.receivablePaymentsCash || 0) },
                { Campo: "Abonos CxC tarjeta", Valor: Number(summary?.receivablePaymentsCard || 0) },
                { Campo: "Abonos CxC transferencia", Valor: Number(summary?.receivablePaymentsTransfer || 0) },
                { Campo: "Efectivo (ventas)", Valor: Number(summary?.cashSales || 0) },
                { Campo: "Efectivo en caja (fondo + ventas)", Valor: Number(summary?.cashInRegister || 0) },
                { Campo: "Total general (todas las ventas)", Valor: Number(summary?.grandTotal || 0) },
                { Campo: "Órdenes", Valor: Number(summary?.totalCount || 0) },
                { Campo: "Total (ventas + menudo)", Valor: Number(summary?.totalWithMenudo || 0) },
                { Campo: "Dinero agregado", Valor: Number(summary?.addedTotal || 0) },
                { Campo: "Merma (costo)", Valor: Number(mermaDay.mermaCost || 0) },
                { Campo: "Ventas netas (ventas - merma)", Valor: Number((summary?.grandTotal || 0) - (mermaDay.mermaCost || 0)) },
            ];
            const ws2 = XLSX.utils.json_to_sheet(summaryRows);
            XLSX.utils.book_append_sheet(wb, ws2, "Resumen");

            const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([arrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            saveAs(blob, `cierre_caja_${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Error exportando Excel:", error);
            showToast("Error al exportar el archivo. Verifica tu sesión.");
        }
    };

    const opening = Number(session?.openingFloatInitial || 0);
    const added = Number(session?.addedFloatTotal || 0);

    const expectedCashSales = Number(
        (dayReports || [])
            .filter((r) => (r?.paymentMethod || "").toUpperCase() === "EFECTIVO")
            .reduce((sum, r) => sum + (Number(r?.bills?.totalWithTax) || 0), 0)
            .toFixed(2)
    );

    const expectedInRegister = Number((opening + added + expectedCashSales).toFixed(2));

    const [addAmountInput, setAddAmountInput] = useState("");
    const [toast, setToast] = useState({ open: false, message: "", type: "error" });


    const showToast = (message, type = "error") => {
        setToast({ open: true, message, type });
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3500);
    };
    const resetEcfAdjustmentForm = (documentType = "34") => {
        setEcfAdjustmentForm({
            adjustmentMode: "partial",
            amount: "",
            tax: "",
            reason:
                documentType === "34"
                    ? "Devolución parcial de producto"
                    : "Monto adicional pendiente de facturar",
            modificationCode: "1",
        });
        setLastEcfAdjustmentResult(null);
    };

    const openEcfAdjustmentModal = async (order, documentType = "34") => {
        try {
            if (!ecfAdjustmentsEnabled) {
                showToast("El e-CF está desactivado para este tenant.");
                return;
            }

            if (documentType === "33" && !e33Enabled) {
                showToast("La Nota de Débito e33 no está habilitada.");
                return;
            }

            if (documentType === "34" && !e34Enabled) {
                showToast("La Nota de Crédito e34 no está habilitada.");
                return;
            }
            if (!order?._id) {
                showToast("Orden no disponible.");
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
                showToast("Solo puedes crear notas sobre facturas e-CF aceptadas.");
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
                "No se pudo validar el e-CF de esta factura."
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

    const calculateSuggestedTax = (amount) => {
        const value = Number(String(amount || "").replace(/[^\d.-]/g, ""));
        if (!Number.isFinite(value) || value <= 0) return "";
        return String(Number((value * 0.18).toFixed(2)));
    };

    const {
        data: ecfAdjustmentsResponse,
        isLoading: ecfAdjustmentsLoading,
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

    const availableCreditTotal = roundMoney(
        Math.max(
            originalEcfTotal + acceptedDebitNotesTotal - acceptedCreditNotesTotal,
            0
        )
    );

    const issueEcfAdjustmentMutation = useMutation({
        mutationFn: async () => {
            const orderId = ecfAdjustmentModal?.order?._id;
            const documentType = ecfAdjustmentModal?.documentType;

            if (!orderId) {
                throw new Error("ORDER_ID_REQUIRED");
            }

            const adjustmentMode = String(ecfAdjustmentForm.adjustmentMode || "partial");
            const amount = Number(String(ecfAdjustmentForm.amount || "").replace(/[^\d.-]/g, ""));
            const tax = Number(String(ecfAdjustmentForm.tax || "").replace(/[^\d.-]/g, ""));
            const reason = String(ecfAdjustmentForm.reason || "").trim();
            const modificationCode = String(ecfAdjustmentForm.modificationCode || "1").trim();

            if (!reason) {
                throw new Error("Debes escribir el motivo de la nota.");
            }

            const payload = {
                documentType,
                adjustmentMode,
                reason,
                modificationCode,
            };

            if (adjustmentMode !== "total") {
                if (!Number.isFinite(amount) || amount <= 0) {
                    throw new Error("Debes colocar un monto válido.");
                }

                payload.amount = amount;
                payload.tax = Number.isFinite(tax) && tax >= 0 ? tax : 0;
            }

            if (documentType === "34") {
                const requestedCreditTotal =
                    adjustmentMode === "total"
                        ? originalEcfTotal
                        : roundMoney(
                            amount + (Number.isFinite(tax) && tax >= 0 ? tax : 0)
                        );

                if (availableCreditTotal <= 0) {
                    throw new Error("Esta factura ya no tiene balance disponible para nota de crédito.");
                }

                if (requestedCreditTotal > availableCreditTotal + 0.01) {
                    throw new Error(
                        `La nota de crédito excede el balance disponible. Disponible: ${currency(availableCreditTotal)}. Solicitado: ${currency(requestedCreditTotal)}.`
                    );
                }
            }

            const res = await api.post(`/api/order/${orderId}/ecf/adjustment`, payload);
            return res.data;
        },
        onSuccess: (res) => {
            const data = res?.data || {};
            setLastEcfAdjustmentResult(data);

            showToast(
                `${data?.documentType === "33" ? "Nota de débito" : "Nota de crédito"} emitida: ${data?.eNCF || ""}`,
                "success"
            );

            queryClient.invalidateQueries({
                queryKey: ["order-ecf-adjustments", ecfAdjustmentModal?.order?._id],
            });
        },
        onError: (error) => {
            console.error("[issueEcfAdjustmentMutation] error:", error);
            showToast(
                error?.response?.data?.message ||
                error?.message ||
                "No se pudo emitir la nota."
            );
        },
    });
    const getAdjustmentTitle = (documentType) => {
        const type = String(documentType || "").trim();

        if (type === "33") return "Nota de Débito Electrónica e-CF";
        if (type === "34") return "Nota de Crédito Electrónica e-CF";

        return "Nota Electrónica e-CF";
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
                name: originalEcf?.customer?.name || "Consumidor Final",
                rnc: originalEcf?.customer?.document || "",
                rncCedula: originalEcf?.customer?.document || "",
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
            return <span className="text-xs text-gray-500">No disponible</span>;
        }

        return (
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => verFactura(r._id)}
                    className="text-blue-400 hover:text-blue-300 hover:underline text-sm transition-colors"
                >
                    Ver
                </button>

                {e34Enabled && (
                    <button
                        type="button"
                        onClick={() => openEcfAdjustmentModal(r, "34")}
                        className="px-2 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                    >
                        Nota crédito
                    </button>
                )}

                {e33Enabled && (
                    <button
                        type="button"
                        onClick={() => openEcfAdjustmentModal(r, "33")}
                        className="px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                    >
                        Nota débito
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
                    <h2 className="text-2xl font-bold text-white">Cierre de Caja</h2>
                    <div className="text-sm text-gray-400 mt-1">
                        Caja activa: <span className="text-white font-medium">{activeRegisterLabel}</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm text-gray-400 whitespace-nowrap">Fecha:</span>
                        <input
                            type="date"
                            value={selectedYMD}
                            onChange={(e) => setSelectedYMD(e.target.value)}
                            className="w-full sm:w-auto bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-[#f6b100]/50"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm text-gray-400 whitespace-nowrap">Caja:</span>

                        {isAdminLike ? (
                            <select
                                value={activeRegisterId}
                                onChange={(e) => setSelectedRegisterId(e.target.value)}
                                className="w-full sm:w-auto min-w-[220px] bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-[#f6b100]/50"
                                disabled={registersLoading}
                            >
                                <option value={ALL_REGISTERS_ID}>ADMIN — Ver todas las ventas</option>

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
                            Ver Registros Completos
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
                            <h3 className="text-white font-semibold text-lg">Fondo inicial de caja (menudo)</h3>
                            <p className="text-sm text-gray-400 mt-1">
                                Este monto no es venta: es el efectivo con el que se inicia la caja para dar cambio.
                            </p>
                        </div>

                        {/* Cards pasan aquí */}
                        {(isAdminLike || sessionClosed) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                <div className="text-xs text-gray-400 mb-1">Menudo (fondo inicial + agregado)</div>
                                <div className="text-sm font-semibold text-white">{currency(menudoActual)}</div>
                                <div className="text-[11px] text-gray-500 mt-1">
                                    Inicial: {currency(openingInitial)} · Agregado: {currency(addedTotal)}
                                </div>
                            </div>

                            <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                <div className="text-xs text-gray-400 mb-1">Efectivo (ventas)</div>
                                <div className="text-sm font-semibold text-white">{currency(initialCashClosure.cashSales)}</div>
                            </div>

                            <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                <div className="text-xs text-gray-400 mb-1">Gastos del día</div>
                                <div className="text-sm font-semibold text-red-400">
                                    {currency(initialCashClosure.totalExpenses)}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">
                                    En efectivo: {currency(initialCashClosure.cashExpenses)}
                                </div>
                            </div>
                            <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3 hover:border-[#f6b100]/30 transition-colors">
                                <div className="text-xs text-gray-400 mb-1">Efectivo en caja (fondo + ventas)</div>
                                <div className="text-sm font-semibold text-[#f6b100]">{currency(initialCashClosure.cashInRegister)}</div>
                            </div>
                            <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                <div className="text-xs text-gray-400 mb-1">Ventas netas</div>
                                <div className="text-sm font-semibold text-white">
                                    {currency(initialCashClosure.netSales)}
                                </div>
                            </div>
                        </div>
                        )}
                    </div>


                    {/* Columna derecha: formulario */}
                    <div className="w-full max-w-sm justify-self-end">
                        <label className="text-xs text-gray-400 mb-1 block">Monto (ej. 2000)</label>
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
                                <label className="text-xs text-gray-400 mb-1 block">Agregar dinero</label>
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
                                                showToast("Solo administración puede agregar dinero.");
                                                return;
                                            }

                                            if (!sessionExists) {
                                                showToast("No existe una sesión de caja para esta fecha.");
                                                return;
                                            }

                                            if (sessionClosed && !isAdminLike) {
                                                showToast("La caja ya está cerrada. No se puede agregar dinero.");
                                                return;
                                            }

                                            const cleaned = String(addAmountInput ?? "").replace(/[^\d.-]/g, "");
                                            const amount = Number(cleaned);

                                            if (!Number.isFinite(amount) || amount <= 0) {
                                                showToast("Monto inválido.");
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
                                        Agregar
                                    </button>
                                </div>

                                <div className="text-xs text-gray-500 mt-1">
                                    Solo administración puede agregar dinero o ajustar el fondo inicial.
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
                                            showToast("Selecciona una caja específica antes de guardar el fondo inicial.", "error");
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
                                    Guardar fondo inicial
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
                                    Editar fondo inicial con código manager
                                </button>
                            )}
                            {isCashier && isEditingOpening && openingAlreadySet && !sessionClosed && (
                                <div className="mt-3 space-y-2">
                                    <label className="text-xs text-gray-400">Código del manager</label>
                                    <input
                                        type="password"
                                        value={openingManagerCode}
                                        onChange={(e) => setOpeningManagerCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm"
                                        placeholder="Ej: 1234"
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
                                                    showToast("Código del manager requerido.");
                                                    return;
                                                }

                                                const cleanRegisterId = String(activeRegisterId || "").trim().toUpperCase();

                                                if (!cleanRegisterId || cleanRegisterId === ALL_REGISTERS_ID) {
                                                    showToast("Selecciona una caja específica antes de editar el fondo inicial.", "error");
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
                                            {adjustOpeningMutation.isPending ? "Guardando..." : "Guardar cambio"}
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
                                            Cancelar
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
                                            showToast("Selecciona una caja específica antes de guardar el fondo inicial.", "error");
                                            return;
                                        }

                                        if (registers.length > 0 && !registers.some((r) => r.code === cleanRegisterId)) {
                                            showToast("La caja seleccionada no existe o no está activa.", "error");
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
                                    Guardar fondo inicial (Admin) — {selectedYMD}
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
                                            Editar fondo inicial
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
                                                        showToast("Selecciona una caja específica antes de editar el fondo inicial.", "error");
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
                                                Guardar cambios
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditingOpening(false);
                                                    setOpeningCashInput(formatThousands(openingInitial || 0));
                                                }}
                                                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold"
                                            >
                                                Cancelar
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}


                            {/* Mensajes */}
                            <div className="text-xs text-gray-500 mt-2">
                                {isSelectedToday
                                    ? (openingAlreadySet ? "Fondo inicial guardado para hoy." : "Aún no se ha guardado el fondo inicial de hoy.")
                                    : "Mostrando histórico del día seleccionado."}
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
                                    Editar cierre final
                                </button>
                            </div>
                        )}
                        {isAdminLike && (
                            <button
                                type="button"
                                onClick={() => setManagerCodeModalOpen(true)}
                                className="w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633]"
                            >
                                Configurar código manager
                            </button>
                        )}

                    </div>
                </div>
            </div>
            )}

            {showSummary && (
                <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                    <h3 className="text-white font-semibold text-lg">Comparación (Reporte de Cierre de Caja)</h3>

                    {(() => {
                        const counted = safeNumber(closingCountedForComparison);
                        const expected = safeNumber(systemExpectedInRegisterShown);
                        const diff = Number((counted - expected).toFixed(2));

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                    <div className="text-xs text-gray-400 mb-1">Sistema (efectivo esperado)</div>
                                    <div className="text-sm font-semibold text-white">{currency(expected)}</div>
                                </div>

                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                    <div className="text-xs text-gray-400 mb-1">Contado (efectivo en caja)</div>
                                    <div className="text-sm font-semibold text-white">{currency(counted)}</div>
                                </div>

                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                    <div className="text-xs text-gray-400 mb-1">Diferencia</div>
                                    <div className={`text-sm font-semibold ${diff === 0 ? "text-white" : diff < 0 ? "text-red-400" : "text-green-400"}`}>
                                        {currency(diff)}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                    {(session?.closing?.note || session?.notes) && (
                        <div className="mt-3 rounded-lg bg-[#111] border border-gray-800/40 p-3">
                            <div className="text-xs text-gray-400">Nota del cierre</div>
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
                                                Desglose del efectivo contado
                                            </div>
                                            <div className="text-[11px] text-gray-500">
                                                Billetes, monedas, tickets, transferencias y otros montos declarados al cierre.
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-gray-500">
                                            {useConsolidatedSummary ? "Contado consolidado" : "Contado caja"}
                                        </div>
                                        <div className="text-sm font-bold text-[#f6b100]">
                                            {currency(closingDeclaredSummary.countedCashEquivalent)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">                                        <div className="rounded-lg bg-[#0b0b0b] border border-gray-800/40 px-3 py-2">
                                            <div className="text-[11px] text-gray-500">Billetes/monedas</div>
                                            <div className="text-sm text-white font-semibold">
                                                {currency(closingDeclaredSummary.cashTotal)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg bg-[#0b0b0b] border border-gray-800/40 px-3 py-2">
                                            <div className="text-[11px] text-gray-500">Ticket</div>
                                            <div className="text-sm text-white font-semibold">
                                                {currency(closingDeclaredSummary.ticketTotal)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg bg-[#0b0b0b] border border-gray-800/40 px-3 py-2">
                                            <div className="text-[11px] text-gray-500">Transferencia</div>
                                            <div className="text-sm text-white font-semibold">
                                                {currency(closingDeclaredSummary.transferTotal)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg bg-[#0b0b0b] border border-gray-800/40 px-3 py-2">
                                            <div className="text-[11px] text-gray-500">Otros</div>
                                            <div className="text-sm text-white font-semibold">
                                                {currency(closingDeclaredSummary.otherTotal)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg bg-[#0b0b0b] border border-[#f6b100]/30 px-3 py-2">
                                            <div className="text-[11px] text-gray-500">Contado caja</div>
                                            <div className="text-sm text-[#f6b100] font-bold">
                                                {currency(closingDeclaredSummary.countedCashEquivalent)}
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-[#0b0b0b] border border-[#f6b100]/30 px-3 py-2">
                                            <div className="text-[11px] text-gray-500">Total cierre</div>
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
                                                            ? "Ocultar billetes y monedas registrados"
                                                            : "Ver billetes y monedas registrados"}
                                                    </div>

                                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                                        Haz click para ver el detalle exacto contado al cierre.
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
                                                                Detalle de billetes y monedas
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {cashBreakdown.map((item, index) => (
                                                                    <div
                                                                        key={`${item.value}-${index}`}
                                                                        className="flex items-center justify-between rounded-lg bg-[#111] border border-gray-800/40 px-3 py-2"
                                                                    >
                                                                        <div>
                                                                            <div className="text-sm text-white font-semibold">
                                                                                {item.label || `RD$ ${item.value}`}
                                                                            </div>

                                                                            <div className="text-[11px] text-gray-500">
                                                                                Cantidad: {Number(item.count || 0)}
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
                                                                Detalle de tickets
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {ticketBreakdown.map((item, index) => (
                                                                    <div
                                                                        key={`ticket-${item.value}-${index}`}
                                                                        className="flex items-center justify-between rounded-lg bg-[#111] border border-gray-800/40 px-3 py-2"
                                                                    >
                                                                        <div>
                                                                            <div className="text-sm text-white font-semibold">
                                                                                {item.label || `Ticket RD$ ${item.value}`}
                                                                            </div>

                                                                            <div className="text-[11px] text-gray-500">
                                                                                Cantidad: {Number(item.count || 0)}
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
                        Sesiones abiertas de esta caja
                    </h3>

                    <p className="text-sm text-gray-400 mt-1">
                        Selecciona la sesión de la cajera que deseas cerrar.
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
                                            {s?.openedBy?.name || "Cajera sin nombre"}
                                        </div>

                                        <div className="text-xs text-gray-400 mt-1">
                                            Caja: {s.registerId} · Fondo inicial: {currency(s.openingFloatInitial || 0)}
                                        </div>

                                        <div className="text-xs text-gray-500 mt-1">
                                            Abierta: {s.openedAt ? new Date(s.openedAt).toLocaleString() : "—"}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleSelectAdminSessionToClose(s)}
                                        className="px-4 py-2 rounded-lg bg-[#f6b100] text-black font-semibold"
                                    >
                                        Cerrar esta sesión
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
                    <h3 className="text-white font-semibold text-lg">Cierre final de caja</h3>
                    {isAdminLike && closeTargetSession && (
                        <div className="mt-3 mb-4 rounded-xl border border-[#f6b100]/30 bg-[#f6b100]/10 p-4">
                            <div className="text-sm text-[#f6b100] font-semibold">
                                Sesión seleccionada para cierre
                            </div>

                            <div className="mt-1 text-white font-semibold">
                                {closeTargetSession?.openedBy?.name || "Cajera sin nombre"}
                            </div>

                            <div className="mt-1 text-xs text-gray-400">
                                Caja: {closeTargetSession?.registerId} · Fondo inicial:{" "}
                                {currency(closeTargetSession?.openingFloatInitial || 0)}
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
                                Ocultar sesion
                            </button>
                        </div>
                    )}
                    <p className="text-sm text-gray-400 mt-1">
                        Para ver el resumen, primero registra el efectivo contado al cierre.
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
                                Total contado
                            </button>

                            <button
                                type="button"
                                onClick={() => setClosingInputMode(CLOSING_INPUT_MODE_BREAKDOWN)}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                    closingInputMode === CLOSING_INPUT_MODE_BREAKDOWN
                                        ? "bg-[#f6b100] text-black"
                                        : "text-gray-300 hover:bg-white/5"
                                }`}
                            >
                                Billetes y monedas
                            </button>
                        </div>
                    </div>

                    {closingInputMode === CLOSING_INPUT_MODE_TOTAL && (
                        <div className="mt-4">
                            <label className="text-xs text-gray-400">
                                Efectivo contado (lo que tienes en caja)
                            </label>
                            <input
                                value={closingCountedInput}
                                onChange={(e) => setClosingCountedInput(formatThousands(e.target.value))}
                                className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                placeholder="Ej: 2,000"
                            />
                        </div>
                    )}

                    {closingInputMode === CLOSING_INPUT_MODE_BREAKDOWN && (
                        <div className="mt-4 rounded-xl bg-[#0f0f0f] border border-gray-800/50 p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                    <div className="text-sm font-semibold text-white">
                                        Conteo por denominación
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Ingresa la cantidad de cada billete o moneda.
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-xs text-gray-500">Total contado</div>
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
                                                        {item.type}
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
                                                Subtotal:{" "}
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
                        <div className="text-base md:text-lg font-semibold text-white">Tickets</div>

                        <div className="text-sm text-white/75 mb-4">
                        Crédito físico contado como efectivo.
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                        <div>
                        <label className="block text-sm font-medium text-white/90 mb-1">
                        Monto ticket
                        </label>

                        <input
                        value={ticketAmountInput}
                    onChange={(e) => setTicketAmountInput(formatThousands(e.target.value))}
                    inputMode="decimal"
                    className="mt-1 w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
                    placeholder="Ej: 100"
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-white/90 mb-1">
                Cantidad
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
        Subtotal tickets:{" "}
        <span className="text-white font-bold text-base">
                {currency(closingTicketTotal)}
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
            value={transferCountedInput}
            onChange={(e) => setTransferCountedInput(formatThousands(e.target.value))}
            inputMode="decimal"
            className="w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
            placeholder="Ej: 1,500"
        />

        <div className="mt-3 text-sm text-white/85 text-right">
            Total transferencia:{" "}
            <span className="text-white font-bold text-base">
                {currency(transferCountedTotal)}
            </span>
        </div>
    </div>

    <div className="rounded-lg bg-[#151515] border border-gray-700/60 p-4">
        <div className="text-base md:text-lg font-semibold text-white">Otros</div>

        <div className="text-sm text-white/75 mb-4">
            Otro método o ajuste contado.
        </div>

        <label className="block text-sm font-medium text-white/90 mb-1">
            Monto otros
        </label>

        <input
            value={otherCountedInput}
            onChange={(e) => setOtherCountedInput(formatThousands(e.target.value))}
            inputMode="decimal"
            className="w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
            placeholder="Ej: 500"
        />

        <div className="mt-3 text-sm text-white/85 text-right">
            Total otros:{" "}
            <span className="text-white font-bold text-base">
                {currency(otherCountedTotal)}
            </span>
        </div>
    </div>
</div>

    <div className="mt-5 rounded-lg border border-[#f6b100]/30 bg-[#f6b100]/10 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
                <div className="text-sm text-white/80">Billetes/monedas</div>
                <div className="text-lg font-bold text-white">
                    {currency(closingBreakdownTotal)}
                </div>
            </div>

            <div>
                <div className="text-sm text-white/80">Tickets</div>
                <div className="text-lg font-bold text-white">
                    {currency(closingTicketTotal)}
                </div>
            </div>

            <div>
                <div className="text-sm text-white/80">Transferencia + otros</div>
                <div className="text-lg font-bold text-white">
                    {currency(transferCountedTotal + otherCountedTotal)}
                </div>
            </div>

            <div>
                <div className="text-sm text-white/90 font-medium">
                    Total declarado
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
                        <label className="text-xs text-gray-400">Nota del cierre (opcional)</label>
                        <textarea
                            value={closingNote}
                            onChange={(e) => setClosingNote(e.target.value)}
                            className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white min-h-[90px] resize-none"
                            placeholder="Ej: faltó cambio, sobrante, observación de la cajera, etc."
                        />
                    </div>

                    <div className="mt-4">
                        <label className="text-xs text-gray-400">Código del manager</label>
                        <input
                            type="password"
                            value={closeManagerCode}
                            onChange={(e) => setCloseManagerCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                            className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                            placeholder="Ej: 1234"
                            inputMode="numeric"
                            autoComplete="new-password"
                        />
                    </div>


                    <button
                        type="button"
                        onClick={() => {
                            if (!sessionExists) {
                                showToast("No hay una caja abierta para esta fecha.");
                                return;
                            }

                            if (isViewingAllRegisters) {
                                showToast("Selecciona una caja específica para poder cerrarla.", "error");
                                return;
                            }

                            if (!openingAlreadySet) {
                                showToast("Primero debe existir un fondo inicial para poder cerrar la caja.");
                                return;
                            }

                            if (!closeManagerCode.trim()) {
                                showToast("Código del manager requerido.", "error");
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
                                showToast("Monto inválido.", "error");
                                return;
                            }

                            if (
                                closingInputMode === CLOSING_INPUT_MODE_BREAKDOWN &&
                                breakdown.length === 0 &&
                                manualTransferTotal <= 0 &&
                                manualOtherTotal <= 0
                            ) {
                                showToast("Debes ingresar billetes, tickets, transferencia u otros.", "error");
                                return;
                            }

                            const fid = closeTargetSession?._id || closeTargetSession?.id;
                            if (!fid) {
                                showToast("No se encontró el ID de la sesión.");
                                return;
                            }

                            const cleanRegisterId = String(
                                closeTargetSession?.registerId || activeRegisterId || ""
                            )
                                .trim()
                                .toUpperCase();

                            if (!cleanRegisterId || cleanRegisterId === ALL_REGISTERS_ID) {
                                showToast("Selecciona una caja específica antes de cerrar.", "error");
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
                        {closeCashSessionMutation.isPending ? "Cerrando caja..." : "Registrar cierre"}
                    </button>
                </div>
            )}


            {/* Resumen (vista inicial - últimos 10) */}
            {showSummary  &&  (

                <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 id="cash-summary" className="text-white font-semibold text-lg">
                        Resumen de ventas
                    </h3>
                    <div className="text-sm text-gray-300">
                        Total cobrado:{" "}
                        <span className="font-semibold text-[#f6b100] text-lg">
                            {currency(summaryCashClosure.grandTotal)}
                        </span>

                        <span className="text-gray-500 ml-2">
                            ({summaryCashClosure.totalCount} órdenes cobradas)
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
                            label: "Abonos CxC",
                            total: summaryCashClosure.receivablePaymentsTotal,
                            count: 0,
                        }],

                        ["cxc-credito", {
                            label: "Ventas a crédito (CxC)",
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
                            <div className="text-xs text-gray-500 mt-1">{v.count} órdenes</div>
                        </div>
                    ))}

                </div>

            </div>
            )}

            {/* Botón exportar */}
            {adminCanSeeSummary && (
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => downloadExcel(dayReports, summaryCashClosure)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] hover:border-[#f6b100]/50 transition-all"
                >
                    <Download className="w-4 h-4" />
                    Exportar a Excel
                </button>
            </div>
        )}

            {/* Vista móvil (cards) - últimos 10 */}
            <div className="sm:hidden">
                <div className="space-y-3">
                    {(dayReports?.length ?? 0) === 0 ? (
                        <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-6 text-center text-gray-500">
                            No hay registros disponibles
                        </div>
                    ) : (
                        dayReports.map((r) => (
                            <div
                                key={r._id}
                                className="rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm text-gray-400">Usuario</div>
                                        <div className="text-white font-semibold truncate">
                                            {r?.user?.name || "—"}
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-sm text-gray-400">Fecha</div>
                                        <div className="text-white text-sm">
                                            {r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                                        </div>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <div className="text-xs text-gray-400">Cliente</div>
                                        <div className="text-sm text-white truncate">{getClientName(r)}</div>
                                    </div>

                                    <div className="min-w-0">
                                        <div className="text-xs text-gray-400">Método</div>
                                        <div className="text-sm text-white truncate">
                                            {r?.paymentMethod || "Efectivo"}
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <div className="text-xs text-gray-400">Total</div>
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

                {Array.isArray(sortedReports) && sortedReports.length > (dayReports?.length ?? 0) && (
                    <div className="mt-3 rounded-lg border border-gray-800/50 bg-[#1a1a1a]/50 p-3 text-center text-xs text-gray-400">
                        Mostrando {dayReports.length} registros del día {selectedYMD}. Para ver histórico, usa “Ver Registros Completos”.
                    </div>
                )}
            </div>
            {/* Tabla (últimos 10) */}
            {isAdmin ? (
                isLoading ? (
                    <div className="text-center py-8 text-gray-400">Cargando...</div>
                ) : isError ? (
                    <div className="text-center py-8 text-red-400">
                        Error al cargar registros{error?.response?.status ? ` (HTTP ${error.response.status})` : ""}.
                    </div>
                ) : (


                    <div className="hidden sm:block">
                        <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-[#1a1a1a] border-b border-gray-800/50">
                                    <tr>
                                        <th className="p-3 text-sm font-semibold text-gray-300">No. Factura</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">Fecha</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">Usuario</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">Cliente</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">Método</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">Total</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">Factura</th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {(dayReports?.length ?? 0) === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-gray-500">
                                                No hay registros disponibles
                                            </td>
                                        </tr>
                                    ) : (
                                        dayReports.map((r) => (
                                            <tr
                                                key={r._id}
                                                className="border-b border-gray-800/30 hover:bg-[#1a1a1a]/50 transition-colors"
                                            >
                                                <td className="p-3 text-sm font-semibold text-[#f6b100] whitespace-nowrap">
                                                    {getInvoiceNumber(r)}
                                                </td>
                                                <td className="p-3 text-sm text-gray-300">
                                                    {r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                                                </td>
                                                <td className="p-3 text-sm text-gray-300">{r?.user?.name || "—"}</td>
                                                <td className="p-3 text-sm text-gray-300">{getClientName(r)}</td>
                                                <td className="p-3 text-sm text-gray-300">{r?.paymentMethod || "Efectivo"}</td>
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

                            {Array.isArray(sortedReports) && sortedReports.length > (dayReports?.length ?? 0) && (
                                <div className="p-4 bg-[#1a1a1a]/50 border-t border-gray-800/50 text-center text-sm text-gray-400">
                                    Mostrando {dayReports.length} registros del día {selectedYMD}. Para ver histórico, usa “Ver Registros Completos”.
                                </div>
                            )}
                        </div>
                    </div>

                )
            ) : (
                <div className="mt-4 text-sm text-white/60">
                    Los registros del día solo están disponibles para administración.
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
                        className="w-full max-w-7xl max-h-[calc(100vh-8rem)] bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
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
                                        Filtros
                                    </button>

                                    {showFiltersMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-80 bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg shadow-xl z-50 p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-sm font-semibold text-white">Filtros de Búsqueda</h4>
                                                <button
                                                    onClick={() => setShowFiltersMenu(false)}
                                                    className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
                                                >
                                                    <X className="w-4 h-4 text-gray-400" />
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Fecha desde</label>
                                                    <input
                                                        type="date"
                                                        value={modalFilters.from}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, from: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Fecha hasta</label>
                                                    <input
                                                        type="date"
                                                        value={modalFilters.to}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, to: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Método de pago</label>
                                                    <select
                                                        value={modalFilters.method}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, method: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                    >
                                                        <option value="">Todos los métodos</option>
                                                        <option value="Efectivo">Efectivo</option>
                                                        <option value="Tarjeta">Tarjeta</option>
                                                        <option value="Transferencia">Transferencia</option>
                                                        <option value="Pedido Ya">Pedido Ya</option>
                                                        <option value="Uber Eats">Uber Eats</option>
                                                        <option value="Delivery">Delivery</option>

                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Caja</label>

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
                                                            <option value={ALL_REGISTERS_ID}>ADMIN — Ver todas las ventas</option>

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
                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Comprobante fiscal</label>
                                                    <select
                                                        value={modalFilters.fiscal}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, fiscal: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                    >
                                                        <option value="">Todos</option>

                                                        <option value="fiscal">Con comprobante fiscal / e-CF</option>

                                                        <option value="credito_fiscal">Crédito fiscal (B01 / E31)</option>
                                                        <option value="consumidor_final">Consumidor final (B02 / E32)</option>
                                                        <option value="debito_fiscal">Débito fiscal / Nota de débito (E33)</option>
                                                        <option value="nota_credito">Nota de crédito (E34)</option>

                                                        <option value="b01">Solo B01</option>
                                                        <option value="b02">Solo B02</option>
                                                        <option value="e31">Solo E31</option>
                                                        <option value="e32">Solo E32</option>
                                                        <option value="e33">Solo E33</option>
                                                        <option value="e34">Solo E34</option>

                                                        <option value="nofiscal">Sin comprobante fiscal / e-CF</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Buscar por usuario</label>
                                                    <input
                                                        placeholder="Nombre del usuario..."
                                                        value={modalFilters.user}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, user: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#f6b100]/50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Buscar por cliente</label>
                                                    <input
                                                        placeholder="Nombre del cliente..."
                                                        value={modalFilters.client}
                                                        onChange={(e) => setModalFilters((f) => ({ ...f, client: e.target.value }))}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#f6b100]/50"
                                                    />
                                                </div>

                                                {(modalFilters.from ||
                                                    modalFilters.to ||
                                                    modalFilters.method ||
                                                    modalFilters.fiscal ||
                                                    (modalFilters.registerId && modalFilters.registerId !== defaultModalRegisterId) ||
                                                    modalFilters.user ||
                                                    modalFilters.client) && (
                                                    <button
                                                        onClick={resetModalFilters}
                                                        className="w-full text-xs text-gray-400 hover:text-white transition-colors py-1"
                                                    >
                                                        Limpiar filtros
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
                                <h3 className="text-white font-semibold">Resumen</h3>
                                <div className="text-sm text-gray-300">
                                    Total:{" "}
                                    <span className="font-semibold text-[#f6b100]">{currency(modalCashClosure.totalWithMenudo)}</span>
                                    <span className="text-gray-500 ml-2">({modalCashClosure.totalCount} órdenes)</span>
                                </div>
                            </div>


                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-2">
                                    <div className="text-xs text-gray-400 mb-1">Fondo inicial</div>
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
                                                            Editar fondo inicial (admin) — {modalDay}
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
                                                                Guardar cambios
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setModalIsEditingOpening(false);
                                                                    setModalOpeningInput(String(safeNumber(modalSession?.openingFloatInitial) || 0));
                                                                }}
                                                                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold"
                                                            >
                                                                Cancelar
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
                                    <div className="text-xs text-gray-400 mb-1">Efectivo (ventas)</div>
                                    <div className="text-sm font-semibold text-white">{currency(modalCashClosure.cashSales)}</div>
                                </div>
                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-2 hover:border-[#f6b100]/30 transition-colors">
                                    <div className="text-xs text-gray-400 mb-1">Efectivo en caja</div>
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

                                    ["menudo", { label: "Menudo (fondo inicial + agregado)", total: (modalCashClosure.openingInitial + modalCashClosure.addedTotal), count: 0 }],

                                    ...(safeNumber(modalCashClosure.buckets?.otros?.total) > 0 || safeNumber(modalCashClosure.buckets?.otros?.count) > 0
                                        ? [["otros", modalCashClosure.buckets.otros]]
                                        : []),
                                ].map(([k, v]) => (
                                    <div key={k} className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-2">
                                        <div className="text-xs text-gray-400 mb-1">{v.label}</div>
                                        <div className="text-sm font-semibold text-white">{currency(v.total)}</div>
                                        <div className="text-xs text-gray-500 mt-1">{v.count} órdenes</div>
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
                                    Exportar a Excel
                                </button>
                            </div>

                            <div className="rounded-lg border border-gray-800/50 bg-[#111111]/30 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-[#1a1a1a] border-b border-gray-800/50">
                                        <tr>
                                            <th className="p-3 text-sm font-semibold text-gray-300">No.Factura</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">Fecha</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">Usuario</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">Cliente</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">Método</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">Total</th>
                                            <th className="p-3 text-sm font-semibold text-gray-300">Factura</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {modalFilteredReports.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center py-8 text-gray-500">                                                    No hay registros disponibles
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
                                                        {r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-300">{r?.user?.name || "—"}</td>
                                                    <td className="p-3 text-sm text-gray-300">{getClientName(r)}</td>
                                                    <td className="p-3 text-sm text-gray-300">{r?.paymentMethod || "Efectivo"}</td>
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
                                                                Ver
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">No disponible</span>
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
                                Nota: el “Fondo inicial” se guarda localmente para hoy. Si quieres que quede guardado en la base de datos por
                                turno/caja, lo ideal es crear un modelo de “CashRegisterSession”.
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
                                <h2 className="text-xl font-semibold text-white">Editar cierre final</h2>
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
                            <label className="text-xs text-gray-400">Código del manager</label>
                            <input
                                type="password"
                                value={adjustManagerCode}
                                onChange={(e) =>
                                    setAdjustManagerCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                                }
                                className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                placeholder="Ej: 1234"
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
                                    Total contado
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
                                    Billetes y monedas
                                </button>
                            </div>
                        </div>

                        {adjustInputMode === CLOSING_INPUT_MODE_TOTAL && (
                            <div className="mt-4">
                                <label className="text-xs text-gray-400">
                                    Efectivo contado ajustado
                                </label>
                                <input
                                    value={adjustCountedInput}
                                    onChange={(e) => setAdjustCountedInput(formatThousands(e.target.value))}
                                    className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                    placeholder="Ej: 2,050"
                                    inputMode="decimal"
                                />
                            </div>
                        )}

                        {adjustInputMode === CLOSING_INPUT_MODE_BREAKDOWN && (
                            <div className="mt-4 rounded-xl bg-[#0f0f0f] border border-gray-800/50 p-4">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div>
                                        <div className="text-sm font-semibold text-white">
                                            Conteo por denominación
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Corrige billetes, monedas, tickets, transferencias u otros.
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">Billetes/monedas</div>
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
                                                            {item.type}
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
                                                    Subtotal:{" "}
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
                                            Tickets
                                        </div>

                                        <div className="text-sm text-white/75 mb-4">
                                            Crédito físico contado como efectivo.
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-white/90 mb-1">
                                                    Monto ticket
                                                </label>
                                                <input
                                                    value={adjustTicketAmountInput}
                                                    onChange={(e) =>
                                                        setAdjustTicketAmountInput(formatThousands(e.target.value))
                                                    }
                                                    inputMode="decimal"
                                                    className="mt-1 w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
                                                    placeholder="Ej: 100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-white/90 mb-1">
                                                    Cantidad
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
                                            placeholder="Ej: 1,500"
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
                                            Otros
                                        </div>

                                        <div className="text-sm text-white/75 mb-4">
                                            Otro método o ajuste contado.
                                        </div>

                                        <label className="block text-sm font-medium text-white/90 mb-1">
                                            Monto otros
                                        </label>

                                        <input
                                            value={adjustOtherCountedInput}
                                            onChange={(e) =>
                                                setAdjustOtherCountedInput(formatThousands(e.target.value))
                                            }
                                            inputMode="decimal"
                                            className="w-full px-3 py-2.5 bg-[#0b0b0b] border border-gray-700 rounded-lg text-white text-base font-semibold text-right placeholder:text-white/35"
                                            placeholder="Ej: 500"
                                        />

                                        <div className="mt-3 text-sm text-white/85 text-right">
                                            Total otros:{" "}
                                            <span className="text-white font-bold text-base">
                                    {currency(adjustOtherCountedTotal)}
                                </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-lg border border-[#f6b100]/30 bg-[#f6b100]/10 p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                        <div>
                                            <div className="text-sm text-white/80">Billetes/monedas</div>
                                            <div className="text-lg font-bold text-white">
                                                {currency(adjustBreakdownTotal)}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-sm text-white/80">Tickets</div>
                                            <div className="text-lg font-bold text-white">
                                                {currency(adjustTicketTotal)}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-sm text-white/80">Transferencia + otros</div>
                                            <div className="text-lg font-bold text-white">
                                                {currency(adjustTransferCountedTotal + adjustOtherCountedTotal)}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-sm text-white/90 font-medium">
                                                Total declarado
                                            </div>
                                            <div className="text-xl font-extrabold text-white">
                                                {currency(adjustTotalDeclaredAtClose)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="text-xs text-gray-400">Nota</label>
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
                                Cancelar
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
                                        ? "Crear Nota de Crédito e34"
                                        : "Crear Nota de Débito e33"}
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    Factura afectada:{" "}
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
                                    <div className="text-xs text-gray-500">Tipo</div>
                                    <div className="text-white font-semibold mt-1">
                                        {ecfAdjustmentModal.documentType === "34"
                                            ? "e34 - Nota de Crédito"
                                            : "e33 - Nota de Débito"}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-[#111] border border-gray-800/50 p-3">
                                    <div className="text-xs text-gray-500">Factura original</div>
                                    <div className="text-white font-semibold mt-1">
                                        {ecfAdjustmentModal.originalEcf?.eNCF || "—"}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-[#111] border border-gray-800/50 p-3">
                                    <div className="text-xs text-gray-500">Total original</div>
                                    <div className="text-[#f6b100] font-bold mt-1">
                                        {currency(ecfAdjustmentModal.originalEcf?.totals?.total)}
                                    </div>
                                </div>
                            </div>
                            {ecfAdjustmentModal.documentType === "34" && (
                                <div className="rounded-xl border border-[#f6b100]/20 bg-[#f6b100]/10 p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-semibold text-white">
                                                Balance disponible para nota de crédito
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Total original: {currency(originalEcfTotal)} · Débito aplicado: {currency(acceptedDebitNotesTotal)} · Crédito aplicado: {currency(acceptedCreditNotesTotal)}
                                            </div>
                                        </div>

                                        <div className="text-[#f6b100] font-bold text-lg">
                                            {currency(availableCreditTotal)}
                                        </div>
                                    </div>

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
                                        onClick={() =>
                                            setEcfAdjustmentForm((f) => ({
                                                ...f,
                                                adjustmentMode: "partial",
                                            }))
                                        }
                                        className={`px-3 py-2 rounded-xl border text-sm font-semibold ${
                                            ecfAdjustmentForm.adjustmentMode === "partial"
                                                ? "bg-[#f6b100] text-black border-[#f6b100]"
                                                : "bg-[#111] text-white border-gray-800/50"
                                        }`}
                                    >
                                        Parcial
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEcfAdjustmentForm((f) => ({
                                                ...f,
                                                adjustmentMode: "total",
                                                amount: "",
                                                tax: "",
                                            }))
                                        }
                                        className={`px-3 py-2 rounded-xl border text-sm font-semibold ${
                                            ecfAdjustmentForm.adjustmentMode === "total"
                                                ? "bg-[#f6b100] text-black border-[#f6b100]"
                                                : "bg-[#111] text-white border-gray-800/50"
                                        }`}
                                    >
                                        Total
                                    </button>
                                </div>
                            </div>

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
                                                    tax: f.tax ? f.tax : calculateSuggestedTax(value),
                                                }));
                                            }}
                                            className="mt-1 w-full px-3 py-3 bg-[#111] border border-gray-800/50 rounded-xl text-white outline-none focus:border-[#f6b100]/60"
                                            placeholder="Ej: 50.00"
                                            inputMode="decimal"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-400">ITBIS</label>
                                        <input
                                            value={ecfAdjustmentForm.tax}
                                            onChange={(e) =>
                                                setEcfAdjustmentForm((f) => ({
                                                    ...f,
                                                    tax: formatThousands(e.target.value),
                                                }))
                                            }
                                            className="mt-1 w-full px-3 py-3 bg-[#111] border border-gray-800/50 rounded-xl text-white outline-none focus:border-[#f6b100]/60"
                                            placeholder="Ej: 9.00"
                                            inputMode="decimal"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs text-gray-400">Código de modificación</label>
                                <select
                                    value={ecfAdjustmentForm.modificationCode}
                                    onChange={(e) =>
                                        setEcfAdjustmentForm((f) => ({
                                            ...f,
                                            modificationCode: e.target.value,
                                        }))
                                    }
                                    className="mt-1 w-full px-3 py-3 bg-[#111] border border-gray-800/50 rounded-xl text-white outline-none focus:border-[#f6b100]/60"
                                >
                                    <option value="1">1 - Anula o modifica comprobante</option>
                                    <option value="2">2 - Corrige texto</option>
                                    <option value="3">3 - Corrige monto</option>
                                </select>
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
                                Cerrar
                            </button>

                            <button
                                type="button"
                                onClick={() => issueEcfAdjustmentMutation.mutate()}
                                disabled={
                                    issueEcfAdjustmentMutation.isPending ||
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
                            <h2 className="text-xl font-semibold text-white">Configurar código manager</h2>
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
                            <div className="text-xs text-gray-400">Estado</div>

                            <div className="text-sm text-white mt-1">
                                {managerCodeStatus?.data?.enabled ? "Activado" : "Desactivado"}
                                {managerCodeStatus?.data?.hint ? ` (${managerCodeStatus.data.hint})` : ""}
                            </div>

                            {managerCodeStatus?.data?.updatedAt && (
                                <div className="text-[11px] text-gray-500 mt-1">
                                    Última actualización: {new Date(managerCodeStatus.data.updatedAt).toLocaleString()}
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <label className="text-xs text-gray-400">
                                Nuevo código (4–8 dígitos)
                            </label>
                            <input
                                value={managerCodeInput}
                                onChange={(e) => setManagerCodeInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
                                className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                placeholder="Ej: 1234"
                                inputMode="numeric"
                            />
                            <div className="text-[11px] text-gray-500 mt-1">
                                Solo se guarda el hash en el servidor. El sistema muestra un hint tipo ***12.
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const code = managerCodeInput.trim();
                                if (!/^\d{4,8}$/.test(code)) {
                                    showToast("Código inválido. Debe tener 4 a 8 dígitos.");
                                    return;
                                }
                                setManagerCodeMutation.mutate({ managerCode: code });
                            }}
                            disabled={setManagerCodeMutation.isPending}
                            className="mt-4 w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] disabled:opacity-60"
                        >
                            Guardar / Actualizar
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
                            Desactivar código
                        </button>
                    </div>
                </div>
            )}


            {batchesModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-[#0b0b0b] border border-gray-800/50 shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
                            <div className="text-white font-bold text-lg">Lotes del día</div>
                            <button
                                onClick={() => setBatchesModalOpen(false)}
                                className="p-2 rounded-lg hover:bg-white/5"
                            >
                                <X className="w-5 h-5 text-gray-300" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-5 pt-4">
                            <div className="inline-flex rounded-xl overflow-hidden border border-gray-800/60">
                                <button
                                    type="button"
                                    onClick={() => setBatchesTab("open")}
                                    className={`px-3 py-2 text-sm font-semibold ${
                                        batchesTab === "open" ? "bg-[#f6b100] text-black" : "bg-[#121212] text-white"
                                    }`}
                                >
                                    Abiertos ({openBatches.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBatchesTab("closed")}
                                    className={`px-3 py-2 text-sm font-semibold ${
                                        batchesTab === "closed" ? "bg-[#f6b100] text-black" : "bg-[#121212] text-white"
                                    }`}
                                >
                                    Cerrados ({closedBatches.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBatchesTab("all")}
                                    className={`px-3 py-2 text-sm font-semibold ${
                                        batchesTab === "all" ? "bg-[#f6b100] text-black" : "bg-[#121212] text-white"
                                    }`}
                                >
                                    Todos ({mermaBatches.length})
                                </button>
                            </div>

                            <div className="text-xs text-gray-500 mt-2">
                                Fecha: <span className="text-gray-300 font-semibold">{selectedYMD}</span>
                            </div>
                        </div>

                        <div className="p-4 max-h-[70vh] overflow-auto">
                            {(() => {
                                const list =
                                    batchesTab === "open"
                                        ? openBatches
                                        : batchesTab === "closed"
                                            ? closedBatches
                                            : mermaBatches;

                                if (!list || list.length === 0) {
                                    return <div className="text-sm text-gray-400">No hay lotes en esta vista.</div>;
                                }

                                return (
                                    <div className="space-y-2">
                                        {list.map((b) => {
                                            const isClosed = (b?.status || "") === "closed";
                                            return (
                                                <div
                                                    key={b?._id}
                                                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0f0f0f] border border-gray-800/40"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="text-white font-semibold truncate">
                                                            {getBatchProductName(b)}
                                                        </div>


                                                        <div className="text-xs text-gray-400 mt-1">
                                                            Entrada: {b?.rawQty} {b?.unit || ""} · Costo: {currency(b?.unitCost || 0)}
                                                        </div>

                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Estado:{" "}
                                                            <span className={isClosed ? "text-green-400" : "text-yellow-300"}>
                                                              {isClosed ? "Cerrado" : "Abierto"}
                                                            </span>
                                                            {isClosed ? (
                                                                <>
                                                                    {" "}
                                                                    · Final: <span className="text-gray-300">{b?.finalQty ?? 0}</span>
                                                                    {" "}
                                                                    · Merma:{" "}
                                                                    <span className="text-gray-300">
                                                                      {safeNumber(b?.rawQty) - safeNumber(b?.finalQty)}
                                                                    </span>
                                                                </>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    {/* Acciones */}
                                                    {!isClosed ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setBatchesModalOpen(false);
                                                                setMermaMode("close");
                                                                setBatchToClose(b);
                                                                setFinalQtyInput("");
                                                                setMermaNote(b?.note || "");
                                                                setMermaModalOpen(true);
                                                            }}
                                                            className="px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold hover:bg-[#262626]"
                                                        >
                                                            Registrar salida
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                // Editar un lote cerrado reutilizando el mismo modal de cierre
                                                                setBatchesModalOpen(false);
                                                                setMermaMode("close");
                                                                setBatchToClose(b);
                                                                setFinalQtyInput(String(b?.finalQty ?? ""));
                                                                setUnitCostInput(String(b?.unitCost ?? ""));
                                                                setMermaNote(b?.note || "");
                                                                setMermaModalOpen(true);
                                                            }}
                                                            className="px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold hover:bg-[#262626]"
                                                        >
                                                            Editar cierre
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-800/50">
                            <button
                                onClick={() => setBatchesModalOpen(false)}
                                className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-gray-800/50 text-white font-semibold"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
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
