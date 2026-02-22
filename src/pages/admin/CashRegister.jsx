// src/pages/admin/CashRegister.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Search, Filter, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/api";
const REGISTER_ID = "MAIN";
import { useSelector } from "react-redux";




const currency = (n) =>
    new Intl.NumberFormat("en-IN", {
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
    const [adjustCloseOpen, setAdjustCloseOpen] = useState(false);
    const [adjustCountedInput, setAdjustCountedInput] = useState("");
    const [adjustNote, setAdjustNote] = useState("");
    const [adjustManagerCode, setAdjustManagerCode] = useState("");
    const [managerCodeModalOpen, setManagerCodeModalOpen] = useState(false);
    const [managerCodeInput, setManagerCodeInput] = useState("");
    const [closeManagerCode, setCloseManagerCode] = useState("");





    const userData = useSelector((state) => state.auth?.userData);


    const queryClient = useQueryClient();
    const getLocalYMD = () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    // Sesión de caja (menudo / fondo inicial) guardada en MongoDB
    const todayYMD = getLocalYMD();


    const addDaysYMD = (ymd, days) => {
        const d = new Date(`${ymd}T00:00:00`);
        d.setDate(d.getDate() + days);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };


    const [selectedYMD, setSelectedYMD] = useState(todayYMD);
    const isSelectedToday = selectedYMD === todayYMD;

    const [modalFilters, setModalFilters] = useState({
        from: "",
        to: "",
        method: "",
        user: "",
        client: "",
    });
    const me = getUserFromStorage();


// Usa todas las fuentes posibles (storage, redux, token)
    const role = String(
        me?.role ||
        userData?.role ||
        userData?.user?.role ||
        getRoleFromToken() ||
        ""
    ).trim();

    const roleNorm = role.toLowerCase();



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





    // Fondo inicial (menudo)
    const [openingCashInput, setOpeningCashInput] = useState("");
    const openingEditedRef = useRef(false);

    const { data: mermaBatchesResp, refetch: refetchMermaBatches } = useQuery({
        queryKey: ["merma/batches", selectedYMD],
        enabled: !!selectedYMD,
        queryFn: async () => {
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
        mutationFn: async ({ dateYMD, registerId, countedTotal, note, managerCode }) => {
            const res = await api.patch("/api/admin/cash-session/close-adjust", {
                dateYMD,
                registerId,
                countedTotal,
                note,
                managerCode,
            });
            return res.data;
        },
        onSuccess: (payload) => {
            const sessionDoc = payload?.data ?? null;

            if (sessionDoc?._id) {
                queryClient.setQueryData(
                    ["admin/cash-session", selectedYMD, REGISTER_ID],
                    { success: true, data: sessionDoc }
                );
            }

            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD, REGISTER_ID] });
            queryClient.invalidateQueries({ queryKey: ["admin/orders/reports", selectedYMD] });

            setAdjustCloseOpen(false);
            setAdjustManagerCode("");
        },
        onError: (err) => {

            alert(err?.response?.data?.message || JSON.stringify(err?.response?.data) || "Error ajustando cierre");
        },
    });

    const closeCashSessionMutation = useMutation({
        mutationFn: async ({ fid, dateYMD, registerId, countedTotal, note }) => {
            const res = await api.post("/api/admin/cash-session/close", {
                fid,
                dateYMD,
                registerId,
                countedTotal,
                note,
                managerCode: closeManagerCode.trim(),

            });
            return res.data;

        },
        onSuccess: (payload) => {
            // backend devuelve { success: true, data: session }
            const sessionDoc = payload?.data ?? null;

            // 1) Actualiza cache inmediato
            if (sessionDoc?._id) {
                queryClient.setQueryData(
                    ["admin/cash-session", selectedYMD, REGISTER_ID],
                    { success: true, data: sessionDoc }
                );
            }

            // 2) Refetch por seguridad
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD, REGISTER_ID] });
            queryClient.invalidateQueries({ queryKey: ["admin/orders/reports", selectedYMD] });

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
        !modalDay &&
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
        enabled: mermaModalOpen || batchesModalOpen, // <- IMPORTANTE
        queryFn: async () => {
            const res = await api.get("/api/dishes");
            return res.data;
        },
        staleTime: 30_000,
        retry: 1,
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
        queryKey: ["admin/cash-session", "modal-range", modalRangeFrom, modalRangeTo, REGISTER_ID],
        enabled: modalRangeEnabled,
        queryFn: async () => {
            const params = { from: modalRangeFrom, to: modalRangeTo, registerId: REGISTER_ID };
            console.log("[GET cash-session/range] request", params);

            const res = await api.get("/api/admin/cash-session/range", { params });

            console.log("[GET cash-session/range] response", res?.data);
            return res.data; // { success, data: { openingTotal, addedTotal, ... } }
        },
        staleTime: 10_000,
        retry: 1,
    });

    const { data: mermaRes } = useQuery({
        queryKey: ["inventory/merma/summary", selectedYMD],
        queryFn: async () => {
            try {
                const res = await api.get("/api/inventory/merma/summary", {
                    params: { dateYMD: selectedYMD },
                });
                return res.data;
            } catch (e) {
                // Si no tienes plan/permiso o falla, no rompas el cierre
                return { success: false, data: { mermaQty: 0, mermaCost: 0 } };
            }
        },
        enabled: !!selectedYMD,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    const mermaQty = Number(mermaRes?.data?.mermaQty || 0);
    const mermaCost = Number(mermaRes?.data?.mermaCost || 0);



    const {
        data: cashSessionResp,
        isLoading: cashSessionLoading,
        isError: cashSessionIsError,
    } = useQuery({
        queryKey: ["admin/cash-session", selectedYMD, REGISTER_ID],

        queryFn: async () => {
            const params = { dateYMD: selectedYMD, registerId: REGISTER_ID };

            console.log("[GET cash-session] request", {
                url: "/api/admin/cash-session",
                params,
                // opcional: usuario que tienes en localStorage (solo para debug)
                me: { id: me?._id, role },
            });

            const res = await api.get("/api/admin/cash-session", { params });


            return res.data;
        },


        staleTime: 10_000,
        retry: 1,
    });

    const { data: modalCashSessionResp } = useQuery({
        queryKey: ["admin/cash-session", "modal", modalDay || "range"],

        queryFn: async () => {
            const res = await api.get("/api/admin/cash-session/current", {
                params: { dateYMD: modalDay, registerId: REGISTER_ID },
            });
            return res.data;
        },
        enabled: Boolean(modalDay), // solo corre si hay un día único
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


    const modalOpeningInitial = modalDay
        ? safeNumber(modalSession?.openingFloatInitial)
        : safeNumber(modalRangeSessionResp?.data?.openingTotal);

    const modalAddedTotal = modalDay
        ? safeNumber(modalSession?.addedFloatTotal)
        : safeNumber(modalRangeSessionResp?.data?.addedTotal);

    const modalMenudoActual = modalOpeningInitial + modalAddedTotal;

    const cashSession = cashSessionResp?.data ?? null; // <-- ESTO ES LO QUE TE FALTA

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
    const roleRaw =
        me?.role ||
        me?.user?.role ||
        me?.profile?.role ||
        me?.account?.role ||
        "";

    const roleUpper = String(me?.role || role || "").trim().toUpperCase();

    const ADMIN_ROLES = new Set([
        "SUPER_ADMIN",
        "ADMIN",
        "OWNER",
        "MANAGER",
        "GERENTE",
        "ADMINISTRADOR",
    ]);

    const isAdminLike = ADMIN_ROLES.has(roleUpper);
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

    const cashPayload = cashSessionResp?.data ?? cashSessionResp ?? null;



// soporta: { success:true, data:{...} }  | { found:true, session:{...} } | { session:{...} } | documento directo
    const session =
        cashPayload?.data ??
        cashPayload?.session ??
        cashPayload?.cashSession ??
        cashPayload?.result ??
        (cashPayload?._id ? cashPayload : null) ??
        null;




    const closingCountedSaved = safeNumber(session?.closing?.countedTotal);
    const closingAlreadySet = Boolean(session?.closedAt) || closingCountedSaved > 0;

    const sessionExists = !!session;

    // Solo mostrar resumen si ya cerró (o si es admin)
    const sessionClosed = cashSession?.status === "CLOSED";

    const closedById = session?.closedBy?._id ?? session?.closedBy ?? null;

// tu ID puede venir de redux o de storage
    const myUserId = getUserIdFromToken();
    const closedByMe = String(closedById) === String(myUserId);




// Esta es la regla final:

    const adminCanSeeSummary =  isAdminLike;

    const cashierCanSeeSummary = isCajera && sessionClosed && closedByMe;

    const isCashierLike = isCashier || isCajera || !!me?.fid; // fallback temporal
    const showSummary = isAdminLike || (sessionClosed && (isCajera || isCashier) && closedByMe);




    const [sessionConflict, setSessionConflict] = useState(false);


    const openingInitial = safeNumber(session?.openingFloatInitial);
    const addedTotal = safeNumber(session?.addedFloatTotal);
    const menudoActual = openingInitial + addedTotal; // opening + adds


    // “Fondo inicial” se considera seteado SOLO si openingInitial > 0
    // (no por el hecho de que exista una sesión)
    const openingAlreadySet = Number(session?.openingFloatInitial || 0) > 0;


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
    const disableOpeningInput =
        // Cajera: si ya se guardó el opening, no puede modificarlo
        (isCashier && openingAlreadySet) ||
        // No-admin: solo puede tocar hoy
        (!isAdmin && !isSelectedToday) ||
        // Admin: solo bloquea cuando EXISTE sesión y NO está editando
        (isAdmin && sessionExists && !isEditingOpening);


    useEffect(() => {
        if (closingAlreadySet) {
            setClosingCountedInput(formatThousands(closingCountedSaved));
        } else {
            setClosingCountedInput("");
            setClosingNote("");
        }
    }, [selectedYMD, closingAlreadySet, closingCountedSaved]);


    // Cajera solo puede guardar fondo inicial si:
    // - es hoy
    // - NO hay fondo inicial aún
    // - NO hay dinero agregado aún (opcional, pero recomendado para evitar inconsistencias)
    const cashierCanSetOpening = isSelectedToday && !openingAlreadySet && addedTotal <= 0;

    // Admin puede “Guardar” si aún no hay opening, o “Editar” si ya existe
    const adminCanSetOpening = isSelectedToday && !openingAlreadySet;
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
            const res = await api.post("/api/admin/cash-session/open", {
                dateYMD,
                registerId,
                openingFloat,
            });
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
            showToast("No se pudo agregar dinero (modal). Revisa consola.");
        },
    });


    const adjustCashModalMutation = useMutation({
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
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", "modal", modalDay || "range"] });
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", "modal-range"] });
        },

    });

    const openCashSessionMutation = useMutation({
        mutationFn: async ({ dateYMD, registerId, openingFloat }) => {
            const res = await api.post("/api/admin/cash-session/open", {
                dateYMD,
                registerId,
                openingFloat,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD, REGISTER_ID] });
        },
        onError: (err) => {
            const status = err?.response?.status;
            console.log("[POST open] ERROR", {
                status,
                url: err?.config?.url,
                payload: err?.config?.data,
                data: err?.response?.data,
            });

            if (status === 409) {
                setSessionConflict(true);
                showToast("Ya existe una sesión de caja para ese día. Usa “Agregar dinero” o (Admin) “Editar fondo inicial”.");
                queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD, REGISTER_ID] });
                return;
            }

            setSessionConflict(false);
            showToast("No se pudo guardar el fondo inicial.");
        },

    });
    const adjustOpeningMutation = useMutation({
        mutationFn: async ({ dateYMD, registerId, openingFloat, note }) => {
            console.log("[PATCH adjust] request", { dateYMD, registerId, openingFloat, note });

            const res = await api.patch("/api/admin/cash-session/adjust", {
                dateYMD,
                registerId,
                openingFloat,
                note,
            });

            console.log("[PATCH adjust] response", res?.data);
            return res.data;
        },
        onSuccess: () => {
            // refrescar sesión del día
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD, REGISTER_ID] });
            setIsEditingOpening(false);
        },
        onError: (err) => {
            console.log("[PATCH adjust] ERROR", {
                status: err?.response?.status,
                data: err?.response?.data,
            });
            showToast("No se pudo editar el fondo inicial. Revisa consola.");
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
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD, REGISTER_ID] });
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
                showToast("No se encontró la sesión (404). El backend no está encontrando la sesión para esa fecha/caja.");
                queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD, REGISTER_ID] });
                return;
            }
            showToast("No se pudo agregar dinero. Revisa consola.");
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
    const cleanedParams = useMemo(() => {
        return {};
    }, []);

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
            const dateA = new Date(a?.createdAt || 0);
            const dateB = new Date(b?.createdAt || 0);
            return dateB - dateA;
        });
    }, [reports]);

    const { data: mermaDayResp } = useQuery({
        queryKey: ["inventory/merma-summary", selectedYMD],
        queryFn: async () => {
            const res = await api.get("/api/inventory/merma/summary", { params: { dateYMD: selectedYMD } });
            return res.data;
        },
        staleTime: 10_000,
        retry: 1,
    });

    const mermaDay = mermaDayResp?.data || { mermaQty: 0, mermaCost: 0 };

// Para el modal (si hay rango válido)
    const { data: mermaRangeResp } = useQuery({
        queryKey: ["inventory/merma-summary", "range", modalRangeFrom, modalRangeTo],
        enabled: modalRangeEnabled,
        queryFn: async () => {
            const res = await api.get("/api/inventory/merma/summary", {
                params: { from: modalRangeFrom, to: modalRangeTo },
            });
            return res.data;
        },
        staleTime: 10_000,
        retry: 1,
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

    const dayReports = useMemo(() => {
        return sortedReports.filter((r) => toLocalYMD(r?.createdAt) === selectedYMD);
    }, [sortedReports, selectedYMD]);


    // Filtro para el modal (todos los registros con filtros)
    const modalFilteredReports = useMemo(() => {
        const from = modalFilters.from ? new Date(`${modalFilters.from}T00:00:00`) : null;
        const to = modalFilters.to ? new Date(`${modalFilters.to}T23:59:59`) : null;
        const method = normalize(modalFilters.method);
        const user = normalize(modalFilters.user);
        const client = normalize(modalFilters.client);

        return sortedReports.filter((r) => {
            const createdAt = r?.createdAt ? new Date(r.createdAt) : null;
            if (from && createdAt && createdAt < from) return false;
            if (to && createdAt && createdAt > to) return false;

            if (method) {
                const pm = normalize(r?.paymentMethod || "Efectivo");
                if (!pm.includes(method)) return false;
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
    }, [sortedReports, modalFilters]);

    const buildCashClosure = (rows, openingInitial, addedTotal) => {
        const normalizeMethod = (m) => String(m || "Efectivo").trim().toLowerCase();

        const buckets = {
            efectivo: { label: "Efectivo", total: 0, count: 0 },
            tarjeta: { label: "Tarjeta", total: 0, count: 0 },
            transferencia: { label: "Transferencia", total: 0, count: 0 },
            delivery: { label: "Delivery", total: 0, count: 0 },
            pedidoya: { label: "Pedido Ya", total: 0, count: 0 },
            ubereats: { label: "Uber Eats", total: 0, count: 0 },
            otros: { label: "Otros", total: 0, count: 0 },
        };

        let grandTotal = 0;
        let totalCount = 0;

        const normalizeText = (v) => String(v || "").trim().toLowerCase();
        const normalizeChannel = (r) => {
            const os = normalizeText(r?.orderSource || r?.source || r?.channel);
            if (os) return os;
            const t = r?.table || r?.tableId || r?.tableInfo || null;
            const vt = normalizeText(t?.virtualType || t?.type || r?.virtualType);
            return vt;
        };

        for (const r of rows) {
            const total = safeNumber(r?.bills?.totalWithTax ?? r?.totalWithTax ?? r?.total ?? 0);

            let key = "otros";
            const channel = normalizeChannel(r);
            const pmRaw = normalizeMethod(r?.paymentMethod);

            // 1) Método de pago REAL primero (esto decide si entra a efectivo del cierre)
            if (pmRaw.includes("efect")) key = "efectivo";
            else if (pmRaw.includes("tarj")) key = "tarjeta";
            else if (pmRaw.includes("transf")) key = "transferencia";

            // 2) Si no se detecta método (casos especiales), cae por canal/origen
            else if (channel.includes("pedidoya") || channel.includes("pedido") || channel.includes("pedidosya")) key = "pedidoya";
            else if (channel.includes("ubereats") || channel.includes("uber")) key = "ubereats";
            else if (channel.includes("delivery")) key = "delivery";


            buckets[key].total += total;
            buckets[key].count += 1;

            grandTotal += total;
            totalCount += 1;
        }

        const openingVal = safeNumber(openingInitial);
        const addedVal = safeNumber(addedTotal);

        const cashSales = safeNumber(buckets.efectivo.total);

        // En caja realmente: fondo inicial + efectivo ventas + agregado
        const cashInRegister = openingVal + cashSales + addedVal;

        // Total ventas + fondo inicial (agregado NO es venta)
        const totalWithMenudo = openingVal + grandTotal;

        return {
            buckets,
            grandTotal,
            totalWithMenudo,
            totalCount,
            openingInitial: openingVal,
            addedTotal: addedVal,
            cashSales,
            cashInRegister,
        };
    };

    // Resumen basado en los últimos 10 registros
// Resumen basado en los registros de HOY

    const initialCashClosure = useMemo(
        () => buildCashClosure(dayReports, openingInitial, addedTotal),
        [dayReports, openingInitial, addedTotal]
    );

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
            const rows = reportsToExport.map((r) => ({
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

    const resetModalFilters = () => {
        setModalFilters({
            from: "",
            to: "",
            method: "",
            user: "",
            client: "",
        });
    };

    const closeModal = () => {
        setShowFullView(false);
        setShowFiltersMenu(false);
        resetModalFilters();
    };

    return (
        <>
            {/* Contenido normal (fondo). Se bloquea cuando el modal está abierto */}
            <div className={showFullView ? "pointer-events-none select-none" : ""}>
                {/* TODO tu contenido actual de la página (header, cards, tabla, etc.) */}
        <div className={showFullView ? "pointer-events-none select-none" : ""}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Cierre de Caja </h2>
                {isAdmin && showSummary && (
                    <button
                        onClick={() => setShowFullView(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all"
                    >
                        <Search className="w-4 h-4" />
                        Ver Registros Completos
                    </button>
                )}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Fecha:</span>
                    <input
                        type="date"
                        value={selectedYMD}
                        onChange={(e) => setSelectedYMD(e.target.value)}
                        className="bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:border-[#f6b100]/50"
                    />
                </div>
            </div>

            {/* Fondo inicial */}
            {showSummary && (
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-white font-semibold text-lg">Fondo inicial de caja (menudo)</h3>

                        <p className="text-sm text-gray-400 mt-1">
                            Este monto no es venta: es el efectivo con el que se inicia la caja para dar cambio.
                        </p>
                    </div>

                    <div className="w-full max-w-sm">
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

                        {sessionExists && (isSelectedToday || isAdmin) && (
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
                                            const cleaned = String(addAmountInput ?? "").replace(/[^\d.-]/g, "");
                                            const amount = Number(cleaned);
                                            if (!Number.isFinite(amount) || amount <= 0) return;

                                            addCashMutation.mutate({
                                                dateYMD: selectedYMD,
                                                registerId: "MAIN",
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
                                    {isCashier
                                        ? "La cajera solo puede agregar dinero. El fondo inicial solo se guarda una vez."
                                        : "Puedes agregar dinero a la caja. (El admin también puede ajustar el fondo inicial)."}
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

                                        openCashSessionMutation.mutate({
                                            dateYMD: selectedYMD,
                                            registerId: REGISTER_ID,
                                            openingFloat,
                                        });
                                    }}
                                    className="w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold"
                                >
                                    Guardar fondo inicial
                                </button>
                            )}

                            {/* ADMIN: puede crear fondo inicial HOY si aún no existe */}
                            {isAdmin && !sessionExists && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const cleaned = String(openingCashInput ?? "").replace(/[^\d.-]/g, "");
                                        const openingFloat = Number(cleaned);
                                        if (!Number.isFinite(openingFloat) || openingFloat < 0) return;

                                        openCashSessionMutation.mutate({
                                            dateYMD: selectedYMD,
                                            registerId: REGISTER_ID,
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

                                                    adjustOpeningMutation.mutate({
                                                        dateYMD: selectedYMD,
                                                        registerId: REGISTER_ID,
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

                        {isAdminLike && sessionClosed && (
                            <div className="mb-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        // precargar valores actuales
                                        setAdjustCountedInput(formatThousands(session?.closing?.countedTotal ?? ""));
                                        setAdjustNote(session?.closing?.note || session?.notes || "");
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


                        <div className="text-xs text-gray-500 mt-1">
                            {cashSessionLoading
                                ? "Cargando..."
                                : openingAlreadySet
                                    ? "Fondo inicial guardado "
                                    : "Aún no se ha guardado el fondo inicial de hoy."}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                        <div className="text-xs text-gray-400 mb-1">Menudo (fondo inicial + agregado)</div>
                        <div className="text-sm font-semibold text-white">{currency(menudoActual)}</div>

                        {/* opcional: desglose */}
                        <div className="text-[11px] text-gray-500 mt-1">
                            Inicial: {currency(openingInitial)} · Agregado: {currency(addedTotal)}
                        </div>

                    </div>
                    <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                        <div className="text-xs text-gray-400 mb-1">Efectivo (ventas)</div>
                        <div className="text-sm font-semibold text-white">{currency(initialCashClosure.cashSales)}</div>
                    </div>
                    <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3 hover:border-[#f6b100]/30 transition-colors">
                        <div className="text-xs text-gray-400 mb-1">Efectivo en caja (fondo + ventas)</div>
                        <div className="text-sm font-semibold text-[#f6b100]">{currency(initialCashClosure.cashInRegister)}</div>
                    </div>
                </div>
            </div>
            )}

            {showSummary && (
                <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                    <h3 className="text-white font-semibold text-lg">Comparación</h3>

                    {(() => {
                        const counted = safeNumber(session?.closing?.countedTotal);
                        const expected = safeNumber(initialCashClosure.cashInRegister);
                        const diff = Number((counted - expected).toFixed(2));

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                    <div className="text-xs text-gray-400 mb-1">Sistema (esperado en caja)</div>
                                    <div className="text-sm font-semibold text-white">{currency(expected)}</div>
                                </div>

                                <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                                    <div className="text-xs text-gray-400 mb-1">Contado (tú)</div>
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
                    {session?.closing?.adjustedAt && (
                        <div className="mt-2 text-xs text-gray-500">
                            Ajustado: {new Date(session.closing.adjustedAt).toLocaleString()} por {session?.closing?.adjustedBy?.name || "Admin"}
                            {session?.closing?.managerCodeHint ? ` (${session.closing.managerCodeHint})` : ""}
                        </div>
                    )}
                </div>

            )}


            {!showSummary && (
                <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                    <h3 className="text-white font-semibold text-lg">Cierre final de caja</h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Para ver el resumen, primero registra el efectivo contado al cierre.
                    </p>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-400">Efectivo contado (lo que tú tienes en caja)</label>
                            <input
                                value={closingCountedInput}
                                onChange={(e) => setClosingCountedInput(formatThousands(e.target.value))}
                                className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                placeholder="Ej: 2,000"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-gray-400">Nota (opcional)</label>
                            <input
                                value={closingNote}
                                onChange={(e) => setClosingNote(e.target.value)}
                                className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                placeholder="Ej: faltó cambio, etc."
                            />
                        </div>
                    </div>
                    <div>
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
                            const cleaned = String(closingCountedInput ?? "").replace(/[^\d.-]/g, "");
                            const countedTotal = Number(cleaned);
                            if (!sessionExists) {
                                showToast("No hay una caja abierta para esta fecha.");
                                return;
                            }

                            if (!openingAlreadySet) {
                                showToast("Primero debe existir un fondo inicial para poder cerrar la caja.");
                                return;
                            }

                            if (!Number.isFinite(countedTotal) || countedTotal < 0) return;

                            const fid = session?._id || session?.id;
                            if (!fid) {
                                showToast("No se encontró el ID de la sesión (fid). Verifica que el GET cash-session esté devolviendo data con _id.");
                                return;
                            }
                            closeCashSessionMutation.mutate({
                                fid,
                                dateYMD: selectedYMD,
                                registerId: REGISTER_ID,
                                countedTotal,
                                note: closingNote,
                            });
                        }}
                        className="mt-4 w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold"
                    >
                        Registrar cierre
                    </button>
                </div>
            )}


            {/* Resumen (vista inicial - últimos 10) */}
            {adminCanSeeSummary  && (


                <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-lg">Resumen</h3>
                    <div className="text-sm text-gray-300">
                        Total:{" "}
                        <span className="font-semibold text-[#f6b100] text-lg">
                        {currency(initialCashClosure.totalWithMenudo)}
                        </span>

                        <span className="text-gray-500 ml-2">({initialCashClosure.totalCount} órdenes)</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                        ["efectivo", initialCashClosure.buckets.efectivo],
                        ["tarjeta", initialCashClosure.buckets.tarjeta],
                        ["transferencia", initialCashClosure.buckets.transferencia],
                        ["delivery", initialCashClosure.buckets.delivery],
                        ["pedidoya", initialCashClosure.buckets.pedidoya],
                        ["ubereats", initialCashClosure.buckets.ubereats],

                        // 👇 Sustituye "Otros" por "Menudo"
                        ["menudo", { label: "Menudo (fondo inicial + agregado)", total: (initialCashClosure.openingInitial + initialCashClosure.addedTotal), count: 0 }],
                        ["merma", { label: "Merma (inventario)", total: -mermaCost, count: 0 }],
                        ["netSales", { label: "Ventas netas (ventas - merma)", total: netSales, count: 0 }],

                        // (Opcional) si “Otros” tiene algo, lo mostramos al final
                        ...(safeNumber(initialCashClosure.buckets?.otros?.total) > 0 || safeNumber(initialCashClosure.buckets?.otros?.count) > 0
                            ? [["otros", initialCashClosure.buckets.otros]]
                            : []),
                    ].map(([k, v]) => (
                        <div
                            key={k}
                            className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3 hover:border-[#f6b100]/30 transition-colors"
                        >
                            <div className="text-xs text-gray-400 mb-1">{v.label}</div>
                            <div className="text-sm font-semibold text-white">{currency(v.total)}</div>
                            <div className="text-xs text-gray-500 mt-1">{v.count} órdenes</div>
                        </div>
                    ))}

                </div>

            </div>
            )}

            {/* Botón exportar */}
            {showSummary && (
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => downloadExcel(dayReports, initialCashClosure)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] hover:border-[#f6b100]/50 transition-all"
                >
                    <Download className="w-4 h-4" />
                    Exportar a Excel
                </button>
            </div>
        )}

            {/* Tabla (últimos 10) */}
            {isAdmin ? (
                isLoading ? (
                    <div className="text-center py-8 text-gray-400">Cargando...</div>
                ) : isError ? (
                    <div className="text-center py-8 text-red-400">
                        Error al cargar registros{error?.response?.status ? ` (HTTP ${error.response.status})` : ""}.
                    </div>
                ) : (
                    <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#1a1a1a] border-b border-gray-800/50">
                                <tr>
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

                        {Array.isArray(sortedReports) && sortedReports.length > (dayReports?.length ?? 0) && (
                            <div className="p-4 bg-[#1a1a1a]/50 border-t border-gray-800/50 text-center text-sm text-gray-400">
                                Mostrando {dayReports.length} registros del día {selectedYMD}. Para ver histórico, usa “Ver Registros Completos”.
                            </div>
                        )}
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
                                                                    if (modalSessionExists) {
                                                                        adjustCashModalMutation.mutate({
                                                                            dateYMD: modalDay,
                                                                            registerId: "default",
                                                                            openingFloat,
                                                                            note: `Ajuste de fondo inicial por admin (modal) — ${modalDay}`,
                                                                        });
                                                                    } else {
                                                                        openCashSessionModalMutation.mutate({
                                                                            dateYMD: modalDay,
                                                                            registerId: "default",
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
                                    ["delivery", modalCashClosure.buckets.delivery],
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
                                                <td colSpan="6" className="text-center py-8 text-gray-500">
                                                    No hay registros disponibles
                                                </td>
                                            </tr>
                                        ) : (
                                            modalFilteredReports.map((r) => (
                                                <tr
                                                    key={r._id}
                                                    className="border-b border-gray-800/30 hover:bg-[#1a1a1a]/50 transition-colors"
                                                >
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
                    <div className="w-full max-w-md rounded-2xl bg-[#0b0b0c] border border-white/10 shadow-2xl p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">Editar cierre final</h2>
                            <button onClick={() => setAdjustCloseOpen(false)} className="text-white/70 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-sm text-white/60 mt-1">
                            Requiere código de manager.
                        </p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="text-xs text-gray-400">Código del manager</label>
                                <input
                                    value={adjustManagerCode}
                                    onChange={(e) => setAdjustManagerCode(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                    placeholder="Ej: 1234"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400">Efectivo contado (ajuste)</label>
                                <input
                                    value={adjustCountedInput}
                                    onChange={(e) => setAdjustCountedInput(formatThousands(e.target.value))}
                                    className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                    placeholder="Ej: 2,050"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400">Nota</label>
                                <input
                                    value={adjustNote}
                                    onChange={(e) => setAdjustNote(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 bg-[#0f0f0f] border border-gray-800/50 rounded-lg text-white"
                                    placeholder="Motivo del ajuste"
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const cleaned = String(adjustCountedInput ?? "").replace(/[^\d.-]/g, "");
                                const countedTotal = Number(cleaned);

                                if (!Number.isFinite(countedTotal) || countedTotal < 0) {
                                    showToast("Monto inválido.");
                                    return;
                                }
                                if (!adjustManagerCode.trim()) {
                                    showToast("Código del manager requerido.");
                                    return;
                                }

                                adjustCloseCashSessionMutation.mutate({
                                    dateYMD: selectedYMD,
                                    registerId: REGISTER_ID,
                                    countedTotal,
                                    note: adjustNote,
                                    managerCode: adjustManagerCode.trim(),
                                });
                            }}
                            className="mt-5 w-full px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold disabled:opacity-60"
                            disabled={adjustCloseCashSessionMutation.isPending}
                        >
                            Guardar ajuste
                        </button>
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






        </>
    );
};

export default CashRegister;
