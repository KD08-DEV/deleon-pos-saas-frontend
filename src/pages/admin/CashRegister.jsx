// src/pages/admin/CashRegister.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Search, Filter, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/api";

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
    const role = String(me?.role || getRoleFromToken() || "").trim();
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
                console.log("[merma/batches] falló:", e?.response?.data || e?.message);
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
                alert("No se encontró el lote.");
                return;
            }

            // Si estás en CRUDO, no cierres aquí (se guarda con updateBatchMutation)
            if (mermaEditTab === "raw") {
                alert("Estás en la pestaña Crudo. Usa “Guardar crudo” o cambia a Cocido/Final.");
                return;
            }

            const finalQtyNum = Number(String(finalQtyInput || "").replace(/[^\d.-]/g, ""));
            if (Number.isNaN(finalQtyNum) || finalQtyNum < 0) {
                alert("Cantidad final inválida.");
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
        queryKey: ["admin/cash-session", "modal-range", modalRangeFrom, modalRangeTo, "default"],
        enabled: modalRangeEnabled,
        queryFn: async () => {
            const params = { from: modalRangeFrom, to: modalRangeTo, registerId: "default" };
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
        queryKey: ["admin/cash-session", selectedYMD],

        queryFn: async () => {
            const params = { dateYMD: selectedYMD, registerId: "default" };

            console.log("[GET cash-session] request", {
                url: "/api/admin/cash-session",
                params,
                // opcional: usuario que tienes en localStorage (solo para debug)
                me: { id: me?._id, role },
            });

            const res = await api.get("/api/admin/cash-session", { params });

            console.log("[GET cash-session] response", res?.data);
            return res.data;
        },


        staleTime: 10_000,
        retry: 1,
    });

    const { data: modalCashSessionResp } = useQuery({
        queryKey: ["admin/cash-session", "modal", modalDay || "range"],

        queryFn: async () => {
            const res = await api.get("/api/admin/cash-session/current", {
                params: { dateYMD: modalDay, registerId: "default" },
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


    const isAdmin =
        roleNorm === "admin" ||
        roleNorm === "owner" ||
        roleNorm === "superadmin" ||
        roleNorm.includes("admin");

    const isCashier =
        roleNorm === "cajera" ||
        roleNorm === "cashier" ||
        roleNorm.includes("cajera");

// (Opcional) para que veas rápido si ya lo está leyendo bien:
    console.log("[CashRegister] me/role", { id: me?._id || me?.id, role });

    const session = cashSessionResp?.data ?? cashSessionResp ?? null;
    const [sessionConflict, setSessionConflict] = useState(false);


    const openingInitial = safeNumber(session?.openingFloatInitial);
    const addedTotal = safeNumber(session?.addedFloatTotal);
    const menudoActual = openingInitial + addedTotal; // opening + adds

    const sessionExists = Boolean(session?._id || session?.id || session?.dateYMD);

    // “Fondo inicial” se considera seteado SOLO si openingInitial > 0
    // (no por el hecho de que exista una sesión)
    const openingAlreadySet = Number(openingInitial) > 0;


    // Cajera: no puede editar si ya se guardó opening
    // Admin: puede editar cualquier fecha, pero SOLO cuando active el modo edición
    const disableOpeningInput =
        // Cajera: si ya se guardó el opening, no puede modificarlo
        (isCashier && openingAlreadySet) ||
        // No-admin: solo puede tocar hoy
        (!isAdmin && !isSelectedToday) ||
        // Admin: solo bloquea cuando EXISTE sesión y NO está editando
        (isAdmin && sessionExists && !isEditingOpening);



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

            console.log("[POST add MODAL] response", res?.data);
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
            alert("No se pudo agregar dinero (modal). Revisa consola.");
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
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD] });
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
                alert("Ya existe una sesión de caja para ese día. Usa “Agregar dinero” o (Admin) “Editar fondo inicial”.");
                queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD] });
                return;
            }

            setSessionConflict(false);
            alert("No se pudo guardar el fondo inicial.");
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
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD] });
            setIsEditingOpening(false);
        },
        onError: (err) => {
            console.log("[PATCH adjust] ERROR", {
                status: err?.response?.status,
                data: err?.response?.data,
            });
            alert("No se pudo editar el fondo inicial. Revisa consola.");
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
            queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD] });
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
                alert("No se encontró la sesión (404). El backend no está encontrando la sesión para esa fecha/caja.");
                queryClient.invalidateQueries({ queryKey: ["admin/cash-session", selectedYMD] });
                return;
            }
            alert("No se pudo agregar dinero. Revisa consola.");
        },
    });

    const adjustCashMutation = useMutation({
        mutationFn: async ({ dateYMD, registerId, openingFloat, note }) => {
            console.log("[PATCH adjust] request", { dateYMD, registerId, openingFloat, note });

            const res = await api.patch("/api/admin/cash-session/adjust", {
                dateYMD,
                registerId,
                openingFloat,
                note: note || "",
            });

            console.log("[PATCH adjust] response", res?.data);
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
            alert("No se pudo editar el fondo inicial. Revisa consola.");
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

            if (channel.includes("pedidoya") || channel.includes("pedido") || channel.includes("pedidosya")) key = "pedidoya";
            else if (channel.includes("ubereats") || channel.includes("uber")) key = "ubereats";
            else if (channel.includes("delivery")) key = "delivery";
            else if (pmRaw.includes("efect")) key = "efectivo";
            else if (pmRaw.includes("tarj")) key = "tarjeta";
            else if (pmRaw.includes("transf")) key = "transferencia";

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
                alert("No se pudo obtener la factura");
                return;
            }

            window.open(url, "_blank", "noopener,noreferrer");
        } catch (error) {
            console.error("Error cargando factura:", error);
            alert("Error al cargar la factura");
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
            alert("Error al exportar el archivo. Verifica tu sesión.");
        }
    };

    const [addAmountInput, setAddAmountInput] = useState("");

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
                <button
                    onClick={() => setShowFullView(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all"
                >

                    <Search className="w-4 h-4" />
                    Ver Registros Completos
                </button>
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
                                                registerId: "default",
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
                                            registerId: "default",
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
                                            registerId: "default",
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
                                                        registerId: "default",
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

            {/* Resumen (vista inicial - últimos 10) */}
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

            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5">
                <div className="mt-3 rounded-lg bg-[#111] border border-gray-800/40 p-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                            <div className="text-sm text-white font-semibold">Lotes abiertos</div>
                            <div className="text-sm text-gray-400 mt-1">
                                Abiertos: <span className="text-white font-semibold">{openBatches?.length || 0}</span> ·{" "}
                                Cerrados: <span className="text-white font-semibold">{closedBatches?.length || 0}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setBatchesModalOpen(true)}
                                className="px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold hover:bg-[#262626]"
                            >
                                Ver lotes
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setMermaMode("create");
                                    setBatchToClose(null);
                                    setMermaSelectedDish(null);

                                    setRawQtyInput("");
                                    setFinalQtyInput("");
                                    setUnitCostInput("");
                                    setMermaNote("");
                                    setMermaSearch("");

                                    setMermaModalOpen(true);
                                }}
                                className="px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633]"
                            >
                                Nuevo lote
                            </button>
                        </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-2">
                        {openBatches?.length > 0 && (
                            <div className="space-y-2 mt-2">
                                {openBatches.slice(0, 3).map((b) => (
                                    <div
                                        key={b?._id}
                                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0f0f0f] border border-gray-800/40"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-white font-semibold truncate">
                                                {getBatchProductName(b)}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Crudo: {b?.rawQty} · Costo: {currency(b?.unitCost || 0)}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMermaMode("close");
                                                setBatchToClose(b);
                                                setMermaEditTab("cooked");
                                                setFinalQtyInput("");
                                                setUnitCostInput(String(b?.unitCost ?? ""));
                                                setRawQtyInput(String(b?.rawQty ?? ""));
                                                setMermaNote(b?.note || "");
                                                setMermaModalOpen(true);
                                            }}
                                            className="px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold hover:bg-[#262626]"
                                        >
                                            Registrar cocido
                                        </button>
                                    </div>
                                ))}

                                {openBatches.length > 3 && (
                                    <div className="text-xs text-gray-500">
                                        Hay {openBatches.length - 3} más. Usa “Ver lotes”.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                        <div className="text-xs text-gray-400 mb-1">Merma (cantidad)</div>
                        <div className="text-sm font-semibold text-white">{Number(mermaDay.mermaQty || 0)}</div>
                    </div>

                    <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                        <div className="text-xs text-gray-400 mb-1">Merma (costo)</div>
                        <div className="text-sm font-semibold text-white">{currency(mermaDay.mermaCost)}</div>
                    </div>

                    <div className="rounded-lg bg-[#1a1a1a] border border-gray-800/30 p-3">
                        <div className="text-xs text-gray-400 mb-1">Ventas netas (ventas - merma)</div>
                        <div className="text-sm font-semibold text-[#f6b100]">
                            {currency(safeNumber(initialCashClosure.grandTotal) - safeNumber(mermaDay.mermaCost))}
                        </div>
                    </div>
                </div>
            </div>


            {/* Botón exportar */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => downloadExcel(dayReports, initialCashClosure)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] hover:border-[#f6b100]/50 transition-all"
                >
                    <Download className="w-4 h-4" />
                    Exportar a Excel
                </button>
            </div>

            {/* Tabla (últimos 10) */}
            {isLoading ? (
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
                            {dayReports.length === 0
                                ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-8 text-gray-500">
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

                    {sortedReports.length !== dayReports .length && (
                        <div className="p-4 bg-[#1a1a1a]/50 border-t border-gray-800/50 text-center text-sm text-gray-400">
                            Mostrando {dayReports.length} registros del día {selectedYMD}. Para ver histórico, usa “Ver Registros Completos”.

                        </div>
                    )}

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

            {/* Modal: Merma (Crear lote / Cerrar lote) */}
            {mermaModalOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setMermaModalOpen(false)}
                >
                    <div
                        className="w-full max-w-2xl bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-gray-800/50">
                            <h3 className="text-white font-semibold text-lg">
                                {mermaMode === "create" ? "Nuevo lote (crudo)" : "Cerrar lote (cocido / final)"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setMermaModalOpen(false)}
                                className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* CREATE: seleccionar plato */}
                            {mermaMode === "create" && (
                                <>
                                    <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Buscar plato (materia prima)</label>
                                        <div className="relative">
                                            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                value={mermaSearch}
                                                onChange={(e) => setMermaSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                                placeholder="Ej: chicharrón"
                                            />
                                        </div>

                                        <div className="mt-2 max-h-44 overflow-y-auto border border-gray-800/40 rounded-lg">
                                            {dishesLoading ? (
                                                <div className="p-3 text-sm text-gray-500">Cargando platos...</div>
                                            ) : filteredDishes.length === 0 ? (
                                                <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-white/10">
                                                    {inventoryItemsLoading ? (
                                                        <div className="p-3 text-sm opacity-70">Cargando platos...</div>
                                                    ) : safeList.length === 0 ? (
                                                        <div className="p-3 text-sm opacity-70">No hay platos.</div>
                                                    ) : (
                                                        safeList.map((d) => (
                                                            <button
                                                                key={d._id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setMermaSelectedDish(d);
                                                                    setMermaSearch(d?.name || "");
                                                                }}
                                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 ${
                                                                    mermaSelectedDish?._id === d._id ? "bg-white/10" : ""
                                                                }`}
                                                            >
                                                                <div className="font-medium">{d?.name || "Sin nombre"}</div>
                                                                <div className="text-xs opacity-60">{d?._id}</div>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>

                                            ) : (
                                                filteredDishes.map((d) => (
                                                    <button
                                                        type="button"
                                                        key={d._id}
                                                        onClick={() => setMermaSelectedDish(d)}
                                                        className={`w-full text-left p-3 border-b border-gray-800/40 hover:bg-[#1f1f1f] ${
                                                            mermaSelectedDish?._id === d._id ? "bg-[#1a1a1a]" : ""
                                                        }`}
                                                    >
                                                        <div className="text-sm text-white font-semibold">{d.name}</div>
                                                        <div className="text-xs text-gray-500">{d._id}</div>
                                                    </button>
                                                ))
                                            )}
                                        </div>

                                        {mermaSelectedDish && (
                                            <div className="mt-2 text-xs text-gray-400">
                                                Seleccionado: <span className="text-white font-semibold">{mermaSelectedDish.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Cantidad cruda</label>
                                            <input
                                                value={rawQtyInput}
                                                onChange={(e) => setRawQtyInput(formatThousands(e.target.value))}
                                                inputMode="decimal"
                                                className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm"
                                                placeholder="Ej: 10"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Costo unitario (opcional)</label>
                                            <input
                                                value={unitCostInput}
                                                onChange={(e) => setUnitCostInput(formatThousands(e.target.value))}
                                                inputMode="decimal"
                                                className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm"
                                                placeholder="Ej: 60"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Fecha</label>
                                            <input
                                                value={selectedYMD}
                                                disabled
                                                className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm opacity-70"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Nota (opcional)</label>
                                        <textarea
                                            value={mermaNote}
                                            onChange={(e) => setMermaNote(e.target.value)}
                                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm min-h-[80px]"
                                            placeholder="Ej: Se perderán 6 libras al cocinar."
                                        />
                                    </div>
                                </>
                            )}

                            {/* CLOSE: cerrar lote */}
                            {mermaMode === "close" && batchToClose && (
                                <>
                                    {/* Tabs Crudo / Cocido */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setMermaEditTab("raw")}
                                                className={`px-3 py-2 rounded-lg border font-semibold ${
                                                    mermaEditTab === "raw"
                                                        ? "bg-[#F5B301] text-black border-[#F5B301]"
                                                        : "bg-[#1a1a1a] text-white border-gray-800/50"
                                                }`}
                                            >
                                                Crudo
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setMermaEditTab("cooked")}
                                                className={`px-3 py-2 rounded-lg border font-semibold ${
                                                    mermaEditTab === "cooked"
                                                        ? "bg-[#F5B301] text-black border-[#F5B301]"
                                                        : "bg-[#1a1a1a] text-white border-gray-800/50"
                                                }`}
                                            >
                                                Cocido / Final
                                            </button>
                                        </div>

                                        <div className="text-xs text-gray-400">
                                            Estado:{" "}
                                            <span className={(batchToClose?.status === "closed") ? "text-green-400" : "text-yellow-300"}>
          {batchToClose?.status === "closed" ? "Cerrado" : "Abierto"}
        </span>
                                        </div>
                                    </div>

                                    {/* Info del lote */}
                                    <div className="mb-3 p-3 rounded-xl bg-[#0f0f0f] border border-gray-800/40">
                                        <div className="text-white font-semibold truncate">
                                            Lote: {getBatchProductName(batchToClose)}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            Crudo registrado: {batchToClose?.rawQty ?? 0} · Final: {batchToClose?.finalQty ?? 0} · Merma:{" "}
                                            {(safeNumber(batchToClose?.rawQty) - safeNumber(batchToClose?.finalQty))}
                                        </div>
                                    </div>

                                    {/* FORM CRUDO */}
                                    {mermaEditTab === "raw" && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div>
                                                    <div className="text-xs text-gray-400 mb-1">Cantidad crudo</div>
                                                    <input
                                                        value={rawQtyInput}
                                                        onChange={(e) => setRawQtyInput(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-800/50 text-white"
                                                        placeholder="Ej: 10"
                                                    />
                                                </div>

                                                <div>
                                                    <div className="text-xs text-gray-400 mb-1">Costo unitario (referencia)</div>
                                                    <input
                                                        value={unitCostInput}
                                                        onChange={(e) => setUnitCostInput(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-800/50 text-white"
                                                        placeholder="Ej: 350"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <div className="text-xs text-gray-400 mb-1">Nota (opcional)</div>
                                                <textarea
                                                    value={mermaNote}
                                                    onChange={(e) => setMermaNote(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-800/50 text-white"
                                                    placeholder="Ej: Ajuste de crudo."
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setMermaEditTab("cooked")}
                                                    className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-gray-800/50 text-white font-semibold"
                                                >
                                                    Ir a cocido
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!batchToClose?._id) return;
                                                        updateBatchMutation.mutate({
                                                            id: batchToClose._id,
                                                            body: {
                                                                rawQty: Number(String(rawQtyInput || "0").replace(/[^\d.-]/g, "")),
                                                                unitCost: Number(String(unitCostInput || "0").replace(/[^\d.-]/g, "")),
                                                                note: mermaNote || "",
                                                            },
                                                        });
                                                    }}
                                                    className="px-4 py-2 rounded-lg bg-[#F5B301] text-black font-semibold"
                                                >
                                                    Guardar crudo
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* FORM COCIDO */}
                                    {mermaEditTab === "cooked" && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div>
                                                    <div className="text-xs text-gray-400 mb-1">Cantidad final (cocido)</div>
                                                    <input
                                                        value={finalQtyInput}
                                                        onChange={(e) => setFinalQtyInput(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-800/50 text-white"
                                                        placeholder="Ej: 4"
                                                    />
                                                </div>

                                                <div>
                                                    <div className="text-xs text-gray-400 mb-1">Costo unitario (solo referencia)</div>
                                                    <input
                                                        value={unitCostInput}
                                                        onChange={(e) => setUnitCostInput(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-800/50 text-white"
                                                        placeholder="Ej: 350"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <div className="text-xs text-gray-400 mb-1">Nota (opcional)</div>
                                                <textarea
                                                    value={mermaNote}
                                                    onChange={(e) => setMermaNote(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-800/50 text-white"
                                                    placeholder="Ej: Se perdió X libras al cocinar."
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setMermaEditTab("raw")}
                                                    className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-gray-800/50 text-white font-semibold"
                                                >
                                                    Volver a crudo
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveBatch()} // sigue usando tu función, pero ver cambio abajo
                                                    className="px-4 py-2 rounded-lg bg-[#F5B301] text-black font-semibold"
                                                >
                                                    Guardar cierre
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-800/50">
                            <button
                                type="button"
                                onClick={() => setMermaModalOpen(false)}
                                className="px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold"
                            >
                                Cerrar
                            </button>

                            {mermaMode === "create" && (
                                <button
                                    type="button"
                                    onClick={handleSaveBatch}
                                    disabled={createBatchMutation.isPending}
                                    className="px-4 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] disabled:opacity-60"
                                >
                                    Guardar lote
                                </button>
                            )}
                        </div>
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
                                                            Crudo: {b?.rawQty} {b?.unit || ""} · Costo: {currency(b?.unitCost || 0)}
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
                                                            Registrar cocido
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
