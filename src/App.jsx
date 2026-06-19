import {
    BrowserRouter as Router,
    Routes,
    Route,
    useLocation,
    Navigate,
    useNavigate,

} from "react-router-dom";

import { Home, Auth, Orders, Tables, Menu, Dashboard } from "./pages";
import Header from "./components/shared/Header";
import { useSelector, useDispatch } from "react-redux";
import useLoadData from "./hooks/useLoadData";
import FullScreenLoader from "./components/shared/FullScreenLoader";
import BottomNav from "./components/shared/BottomNav";
import AdminRegister from "@components/auth/AdminRegister.jsx";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import CustomerDisplay from "./pages/CustomerDisplay";
import Admin from "./pages/admin/Admin";

import SuperAdminDashboard from "./pages/superAdmin/SuperAdminDashboard";
import SuperAdminTenants from "./pages/superAdmin/SuperAdminTenants";
import SuperAdminCreateTenant from "./pages/superAdmin/SuperAdminCreateTenant";
import SuperAdminLayout from "./components/superAdmin/SuperAdminLayout";
import SuperAdminTenantUsage from "@pages/superAdmin/SuperAdminTenantUsage.jsx";
import { connectSocket, disconnectSocket } from "./realtime/socket.js";
import { setTenant } from "./redux/slices/storeSlice";
import { getTenant } from "./https";
import { removeUser } from "./redux/slices/userSlice"; // ajusta ruta si es distinta
import { getUserData } from "./https"; // ajusta si tu export está en otra ruta


import { QK } from "./queryKeys";
import api, { getScope, setScope } from "./lib/api";
const REGISTER_ID = "MAIN";


const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function SessionHeartbeat() {
    const dispatch = useDispatch();
    const { isAuth, userData } = useSelector((s) => s.user);

    // 1) escuchar evento global emitido por api.js cuando llega 401 por otra sesión
    useEffect(() => {
        const handler = (e) => {
            // limpiar estado redux => te saca de ProtectedRoutes
            dispatch(removeUser());

            // limpiar storage (por si guardas token/scope)
            localStorage.removeItem("token");

            // redirigir al login
            if (window.location.pathname !== "/auth") {
                window.location.href = "/auth";
            }
        };

        window.addEventListener("auth:forceLogout", handler);
        return () => window.removeEventListener("auth:forceLogout", handler);
    }, [dispatch]);

    // 2) ping cada 30 segundos usando el MISMO endpoint real (getUserData)
    useEffect(() => {
        if (!isAuth || !userData?._id) return;

        let cancelled = false;

        const ping = async () => {
            try {
                await getUserData(); // <- ESTE debe ser el real en tu proyecto
            } catch (err) {
                // si por alguna razón no entró por el interceptor, fuerza logout aquí también
                if (err?.response?.status === 401) {
                    dispatch(removeUser());
                    localStorage.removeItem("token");
                    if (window.location.pathname !== "/auth") {
                        window.location.href = "/auth";
                    }
                }
            }
        };

        ping();
        const id = setInterval(() => {
            if (!cancelled) ping();
        }, 30_000);

        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [isAuth, userData?._id, dispatch]);

    return null;
}

function RealtimeTenantConfig() {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const userState = useSelector((s) => s.user);
    const socketRef = useRef(null);

    const tenantState = useSelector((s) => s.store || s.tenant || {});
    const tenant = tenantState?.tenant || tenantState?.data || tenantState;
    const hasTenant = !!tenant?._id;

    const isAuth = !!userState?.isAuth;
    const currentUser = userState?.userData || userState?.user || userState;
    const tenantId = currentUser?.tenantId;

    // 1) Carga inicial del tenant (para que no dependa del refresh)
    useEffect(() => {
        if (!isAuth || !tenantId) return;

        if (!hasTenant) {
            (async () => {
                try {
                    const res = await getTenant(tenantId);
                    dispatch(setTenant(res.data.data));
                } catch (e) {
                    console.error("Initial getTenant failed", e);
                }
            })();
        }
    }, [isAuth, tenantId, hasTenant, dispatch]);

    // 2) Socket + handlers
    useEffect(() => {
        if (!isAuth || !tenantId) {
            disconnectSocket();
            socketRef.current = null;
            return;
        }

        // si cambia tenantId, desconecta y resetea
        if (socketRef.current && socketRef.current.__tenantId !== tenantId) {
            disconnectSocket();
            socketRef.current = null;
        }

        if (!socketRef.current) {
            socketRef.current = connectSocket({ baseUrl: SOCKET_URL, tenantId });
            socketRef.current.__tenantId = tenantId;
        }

        const s = socketRef.current;
        if (!s) return;

        const onConfigUpdated = async (payload) => {
            try {
                if (payload?.tenantId && payload.tenantId !== tenantId) return;

                const res = await getTenant(tenantId);
                dispatch(setTenant(res.data.data));

                queryClient.invalidateQueries({ queryKey: QK.ADMIN_FISCAL_CONFIG, exact: true });
                queryClient.invalidateQueries({ queryKey: QK.ORDERS, exact: true });

                queryClient.refetchQueries({ queryKey: QK.ADMIN_FISCAL_CONFIG, exact: true, type: "active" });
                queryClient.refetchQueries({ queryKey: QK.ORDERS, exact: true, type: "active" });
            } catch (e) {
                console.error("tenant:configUpdated handler error", e);

                queryClient.invalidateQueries({ queryKey: QK.ADMIN_FISCAL_CONFIG, exact: true });
                queryClient.refetchQueries({ queryKey: QK.ADMIN_FISCAL_CONFIG, exact: true, type: "active" });
            }
        };

        const onTablesUpdated = (payload) => {
            if (payload?.tenantId && payload.tenantId !== tenantId) return;

            queryClient.invalidateQueries({ queryKey: QK.TABLES, exact: true });
            queryClient.invalidateQueries({ queryKey: QK.ORDERS, exact: true });

            queryClient.refetchQueries({ queryKey: QK.TABLES, exact: true, type: "active" });
            queryClient.refetchQueries({ queryKey: QK.ORDERS, exact: true, type: "active" });
        };

        s.off("tenant:configUpdated", onConfigUpdated);
        s.on("tenant:configUpdated", onConfigUpdated);

        s.off("tenant:tablesUpdated", onTablesUpdated);
        s.on("tenant:tablesUpdated", onTablesUpdated);

        return () => {
            s.off("tenant:configUpdated", onConfigUpdated);
            s.off("tenant:tablesUpdated", onTablesUpdated);
        };
    }, [isAuth, tenantId, queryClient, dispatch]);

    return null;
}



function Layout() {
    const isLoading = useLoadData();
    const location = useLocation();
    const navigate = useNavigate(); // 👈 NUEVO
    const hideHeaderRoutes = ["/auth"];
    const { userData, isAuth } = useSelector((state) => state.user);
    const tenantState = useSelector((s) => s.store || s.tenant || {});
    const tenant = tenantState?.tenant || tenantState?.data || tenantState;


    const isSuperAdminRoute = location.pathname.startsWith("/superadmin");

    const isCustomerDisplayRoute =
        location.pathname === "/customer-display" ||
        location.pathname.startsWith("/customer-display/");

    const shouldShowPosChrome =
        !hideHeaderRoutes.includes(location.pathname) &&
        !isSuperAdminRoute &&
        !isCustomerDisplayRoute;
    // ====== CASH SESSION GATE (solo Cajera) ======
    const isCajera = userData?.role === "Cajera";
    const [cashGateLoading, setCashGateLoading] = useState(false);
    const [cashSession, setCashSession] = useState(null);
    const [pendingCashSession, setPendingCashSession] = useState(null);
    const [cashGateMode, setCashGateMode] = useState("open"); // "open" | "pending-close"
    const [openModal, setOpenModal] = useState(false);
    const [openingAmount, setOpeningAmount] = useState("");
    const [cashGateError, setCashGateError] = useState("");

    const getLocalYMD = () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const todayYMD = getLocalYMD();

    const REGISTER_STORAGE_PREFIX = "deleonsoft_active_register_id";
    const LEGACY_REGISTER_STORAGE_KEY = "deleonsoft_active_register_id";

    const getCashRegisterStorageScope = () => {
        const tenantId =
            userData?.tenantId ||
            userData?.tenant?.tenantId ||
            userData?.tenant?._id ||
            tenant?.tenantId ||
            tenant?._id ||
            getScope()?.tenantId ||
            localStorage.getItem("tenantId") ||
            "noTenant";

        const clientId =
            userData?.clientId ||
            userData?.client?.clientId ||
            userData?.client?._id ||
            getScope()?.clientId ||
            localStorage.getItem("clientId") ||
            "default";

        const userId =
            userData?._id ||
            userData?.id ||
            userData?.user?._id ||
            userData?.user?.id ||
            "noUser";

        const host = typeof window !== "undefined" ? window.location.host : "app";

        return {
            tenantId: String(tenantId || "noTenant"),
            clientId: String(clientId || "default"),
            userId: String(userId || "noUser"),
            host,
        };
    };

    const getScopedRegisterStorageKey = () => {
        const scope = getCashRegisterStorageScope();

        return [
            REGISTER_STORAGE_PREFIX,
            scope.host,
            scope.tenantId,
            scope.clientId,
            scope.userId,
        ].join(":");
    };

    const getActiveRegisterId = () => {
        try {
            return String(localStorage.getItem(getScopedRegisterStorageKey()) || "")
                .trim()
                .toUpperCase();
        } catch {
            return "";
        }
    };

    const saveActiveRegisterId = (value) => {
        try {
            const cleanValue = String(value || "").trim().toUpperCase();

            if (!cleanValue) return;

            localStorage.setItem(getScopedRegisterStorageKey(), cleanValue);
            localStorage.removeItem(LEGACY_REGISTER_STORAGE_KEY);
        } catch {
            // ignore
        }
    };
    const ensureCashScope = () => {
        const stored = getScope();

        const tenantId =
            stored?.tenantId ||
            userData?.tenantId ||
            tenant?.tenantId ||
            "";

        const clientId =
            stored?.clientId ||
            userData?.clientId ||
            userData?.client?._id ||
            userData?.client?.clientId ||
            "default";

        if (tenantId) {
            setScope({
                tenantId,
                clientId: clientId || "default",
            });
        }

        return {
            tenantId,
            clientId: clientId || "default",
        };
    };

    const fetchCashSession = async () => {
        setCashGateLoading(true);
        setCashGateError("");

        try {
            const activeRegisterId = getActiveRegisterId();
            const cashScope = ensureCashScope();
            if (!activeRegisterId) {
                setOpenModal(false);
                return;
            }
            const cashHeaders = {
                "x-client-id": cashScope.clientId || "default",
            };

            if (cashScope.tenantId) {
                cashHeaders["x-tenant-id"] = cashScope.tenantId;
            }

            const role = String(userData?.role || "").trim();
            const isAdminLike = ["Admin", "Owner", "SuperAdmin"].includes(role);

            if (isAdminLike) {
                setOpenModal(false);
                return;
            }

            let pending = null;

            try {
                const pendingRes = await api.get("/api/admin/cash-session/pending-close", {
                    params: {
                        dateYMD: todayYMD,
                        registerId: activeRegisterId,
                        clientId: cashScope.clientId || "default",
                    },
                    headers: cashHeaders,
                });

                const pendingPayload = pendingRes?.data ?? null;

                pending =
                    pendingPayload?.data ??
                    pendingPayload?.session ??
                    pendingPayload?.cashSession ??
                    (pendingPayload?._id ? pendingPayload : null) ??
                    null;
            } catch (pendingErr) {
                console.log("[cash-session/pending-close] ERROR", {
                    status: pendingErr?.response?.status,
                    data: pendingErr?.response?.data,
                    message: pendingErr?.message,
                    url: pendingErr?.config?.url,
                    params: pendingErr?.config?.params,
                });

                const isConnectionRefused =
                    String(pendingErr?.message || "").includes("Network Error") ||
                    String(pendingErr?.code || "").includes("ERR_NETWORK");

                setCashGateError(
                    pendingErr?.response?.data?.message ||
                    pendingErr?.message ||
                    (isConnectionRefused
                        ? "No se pudo conectar con el backend. Verifica que el servidor esté corriendo."
                        : "No se pudo validar si hay una caja pendiente de cierre.")
                );

                setCashGateMode("open");
                setOpenModal(true);
                return;
            }

            if (isCajera && pending) {
                setPendingCashSession(pending);
                setCashGateMode("pending-close");
                setOpenModal(true);
                return;
            }

            setPendingCashSession(null);

            const res = await api.get("/api/admin/cash-session/current", {
                params: {
                    dateYMD: todayYMD,
                    registerId: activeRegisterId,
                    clientId: cashScope.clientId || "default",
                },
                headers: cashHeaders,
            });

            const payload = res?.data ?? null;

            const session =
                payload?.data ??
                payload?.session ??
                payload?.cashSession ??
                (payload?._id ? payload : null) ??
                null;

            setCashSession(session);

            if (String(session?.status || "").toUpperCase() === "CLOSED" || session?.closedAt) {
                setOpenModal(false);
                return;
            }

            const hasOpenMovement =
                Array.isArray(session?.movements) &&
                session.movements.some((m) => String(m?.type || "").toUpperCase() === "OPEN");

            const opening = Number(session?.openingFloatInitial ?? 0);

            const mustOpen =
                isCajera &&
                (
                    !session ||
                    (
                        String(session?.status || "").toUpperCase() === "OPEN" &&
                        !hasOpenMovement &&
                        opening <= 0
                    )
                );

            setCashGateMode("open");
            setOpenModal(mustOpen);
        } catch (e) {
            console.log("[fetchCashSession] ERROR", {
                status: e?.response?.status,
                data: e?.response?.data,
                url: e?.config?.url,
                params: e?.config?.params,
            });

            setCashGateError(
                e?.response?.data?.message ||
                e?.message ||
                "No se pudo validar la caja. Revisa la conexión o el backend."
            );

            setCashGateMode("open");
            setOpenModal(true);
        } finally {
            setCashGateLoading(false);
        }
    };

    useEffect(() => {
        if (isCustomerDisplayRoute) return;
        if (!isCajera) return;

        fetchCashSession();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCajera, isCustomerDisplayRoute]);
    useEffect(() => {
        if (isCustomerDisplayRoute) return;
        if (!isCajera) return;

        const handleCashSessionClosed = async (event) => {
            const closedRegisterId = String(event?.detail?.registerId || "")
                .trim()
                .toUpperCase();

            // Si cerraste una caja pendiente, mantenemos esa misma caja activa
            // para abrir la caja de hoy en la caja correcta.
            if (closedRegisterId) {
                saveActiveRegisterId(closedRegisterId);
            }

            localStorage.removeItem("deleonsoft_pending_cash_date");
            localStorage.removeItem("deleonsoft_pending_cash_register");

            setPendingCashSession(null);
            setCashGateError("");
            setCashGateMode("open");

            // Pequeño delay para que React Query/backend terminen de actualizar estado visual.
            setTimeout(() => {
                fetchCashSession();
            }, 250);
        };

        window.addEventListener("cash-session:closed", handleCashSessionClosed);

        return () => {
            window.removeEventListener("cash-session:closed", handleCashSessionClosed);
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCajera, isCustomerDisplayRoute]);

    const handleOpenCash = async () => {
        setCashGateError("");
        const amount = Number(openingAmount || 0);
        if (!amount || amount <= 0) {
            setCashGateError("Introduce un monto válido para la apertura.");
            return;
        }

        try {
            setCashGateLoading(true);
            const activeRegisterId = getActiveRegisterId();
            const cashScope = ensureCashScope();

            const cashHeaders = {
                "x-client-id": cashScope.clientId || "default",
            };

            if (cashScope.tenantId) {
                cashHeaders["x-tenant-id"] = cashScope.tenantId;
            }

            await api.post(
                "/api/admin/cash-session/open",
                {
                    dateYMD: todayYMD,
                    registerId: activeRegisterId,
                    clientId: cashScope.clientId || "default",
                    openingFloat: amount,
                    note: "Apertura por Cajera",
                },
                {
                    headers: cashHeaders,
                }
            );
            await fetchCashSession();
        } catch (e) {
            const status = e?.response?.status;
            const msg = e?.response?.data?.message;
            const pending = e?.response?.data?.data;

            if (status === 409 && msg === "PENDING_CASH_SESSION_CLOSE") {
                setPendingCashSession(pending || null);
                setCashGateMode("pending-close");
                setCashGateError("Tienes una caja anterior pendiente de cierre. Debes cerrarla antes de abrir la caja de hoy.");
                setOpenModal(true);
                return;
            }

            if (status === 409 && msg === "CASH_SESSION_ALREADY_CLOSED") {
                setCashGateError("La caja de hoy ya fue cerrada. No puedes abrirla otra vez.");
                return;
            }

            setCashGateError(
                e?.response?.data?.message ||
                "No se pudo abrir la caja. Verifica permisos y endpoint /cash-session/open."
            );
        } finally {
            setCashGateLoading(false);
        }
    };


    // 🚀 Redirección automática si es SuperAdmin
    useEffect(() => {
        if (userData?.role === "SuperAdmin") {
            if (!location.pathname.startsWith("/superadmin")) {
                navigate("/superadmin");
            }
        }
    }, [userData, location.pathname, navigate]);

    if (isLoading) return <FullScreenLoader />;
    const isTenantReady = !!tenant?.features?.orderSources;


    if (
        isAuth &&
        !isTenantReady &&
        !hideHeaderRoutes.includes(location.pathname) &&
        !isSuperAdminRoute &&
        !isCustomerDisplayRoute
    ) {

        return (
            <section className="bg-[#111] min-h-screen px-6 pt-6 pb-24">
                <div className="text-gray-400">Cargando configuración…</div>
            </section>
        );
    }


    const mustBlock =
        !isCustomerDisplayRoute &&
        isCajera &&
        (openModal || cashGateLoading);

    return (
        <>
            <RealtimeTenantConfig />
            <SessionHeartbeat />

            {/* Modal Apertura de Caja / Cierre pendiente (solo Cajera) */}
            {!isCustomerDisplayRoute && isCajera && openModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md rounded-2xl bg-[#0b0b0c] border border-white/10 shadow-2xl p-6">
                        {cashGateMode === "pending-close" ? (
                            <>
                                <h2 className="text-xl font-semibold text-white">Cierre pendiente</h2>

                                <p className="text-sm text-white/70 mt-1">
                                    Hay una caja anterior abierta. Debes cerrarla antes de abrir la caja de hoy.
                                </p>

                                <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-4">
                                    <div className="text-sm text-white/60">Fecha pendiente</div>
                                    <div className="text-lg font-semibold text-white">
                                        {pendingCashSession?.dateYMD || "N/A"}
                                    </div>

                                    <div className="text-sm text-white/60 mt-3">Caja</div>
                                    <div className="text-lg font-semibold text-white">
                                        {pendingCashSession?.registerId || "MAIN"}
                                    </div>

                                    <div className="text-sm text-white/60 mt-3">Fondo inicial</div>
                                    <div className="text-lg font-semibold text-yellow-400">
                                        RD${Number(pendingCashSession?.openingFloatInitial || 0).toFixed(2)}
                                    </div>
                                </div>

                                {cashGateError && (
                                    <div className="mt-3 text-sm text-red-400">
                                        {cashGateError}
                                    </div>
                                )}

                                <div className="mt-5 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const pendingDate = pendingCashSession?.dateYMD || "";
                                            const pendingRegisterId = String(
                                                pendingCashSession?.registerId || "MAIN"
                                            ).trim().toUpperCase();

                                            if (pendingDate) {
                                                localStorage.setItem("deleonsoft_pending_cash_date", pendingDate);
                                            }

                                            if (pendingRegisterId) {
                                                localStorage.setItem("deleonsoft_pending_cash_register", pendingRegisterId);
                                                saveActiveRegisterId(pendingRegisterId);
                                            }

                                            setOpenModal(false);

                                            navigate(
                                                `/admin?tab=cash-register${
                                                    pendingDate
                                                        ? `&cashDate=${encodeURIComponent(pendingDate)}&registerId=${encodeURIComponent(pendingRegisterId)}`
                                                        : ""
                                                }`
                                            );
                                        }}
                                        className="w-full rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-3"
                                    >
                                        Ir a cerrar caja
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-xl font-semibold text-white">Apertura de caja</h2>

                                <p className="text-sm text-white/70 mt-1">
                                    Debes registrar el fondo inicial antes de usar el sistema.
                                </p>

                                <div className="mt-4">
                                    <label className="text-sm text-white/70">
                                        Monto de apertura
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        value={openingAmount}
                                        onChange={(e) => setOpeningAmount(e.target.value)}
                                        className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white outline-none focus:border-white/20"
                                        placeholder="Ej: 2000"
                                    />
                                </div>

                                {cashGateError && (
                                    <div className="mt-3 text-sm text-red-400">
                                        {cashGateError}
                                    </div>
                                )}

                                <div className="mt-5 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={handleOpenCash}
                                        disabled={cashGateLoading}
                                        className="w-full rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-3 disabled:opacity-60"
                                    >
                                        {cashGateLoading ? "Guardando..." : "Guardar apertura"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Bloqueo de clicks detrás (opcional) */}
            {mustBlock && <div className="fixed inset-0 z-[9998]" />}

            {shouldShowPosChrome && <Header />}

            <Routes>
                <Route
                    path="/"
                    element={
                        <ProtectedRoutes>
                            <Home />
                        </ProtectedRoutes>
                    }
                />
                <Route path="/auth" element={isAuth ? <Navigate to="/" /> : <Auth />} />
                <Route
                    path="/orders"
                    element={
                        <ProtectedRoutes>
                            <Orders />
                        </ProtectedRoutes>
                    }
                />
                <Route
                    path="/tables"
                    element={
                        <ProtectedRoutes>
                            <Tables />
                        </ProtectedRoutes>
                    }
                />
                <Route
                    path="/menu"
                    element={
                        <ProtectedRoutes>
                            <Menu />
                        </ProtectedRoutes>
                    }
                />
                <Route
                    path="/customer-display"
                    element={
                        <ProtectedRoutes>
                            <CustomerDisplay />
                        </ProtectedRoutes>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoutes>
                            <Dashboard />
                        </ProtectedRoutes>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <ProtectedRoutes allowedRoles={["Admin"]}>
                            <AdminRegister />
                        </ProtectedRoutes>
                    }
                />

                <Route
                    path="/admin"
                    element={
                        <ProtectedRoutes allowedRoles={["Admin", "Cajera"]}>
                            <Admin />
                        </ProtectedRoutes>
                    }
                />

                {/* SUPERADMIN */}
                <Route
                    path="/superadmin"
                    element={
                        <ProtectedRoutes allowedRoles={["SuperAdmin"]}>
                            <SuperAdminLayout />
                        </ProtectedRoutes>
                    }
                >
                    <Route index element={<SuperAdminDashboard />} />
                    <Route path="tenants" element={<SuperAdminTenants />} />
                    <Route path="create-tenant" element={<SuperAdminCreateTenant />} />
                    <Route path="tenant-usage" element={<SuperAdminTenantUsage />} />
                </Route>

                <Route path="/index.html" element={<Navigate to="/" replace />} />
                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {shouldShowPosChrome && <BottomNav />}
        </>
    );
}

function ProtectedRoutes({ children, allowedRoles }) {
    const { userData, isAuth } = useSelector((state) => state.user);




    if (!isAuth) {

        return <Navigate to="/auth" />;
    }

    if (!userData?.role) {

        return (
            <div className="flex items-center justify-center h-screen text-white">
                Cargando usuario...
            </div>
        );
    }

    if (
        allowedRoles &&
        Array.isArray(allowedRoles) &&
        !allowedRoles.includes(userData.role)
    ) {

        return <Navigate to="/" replace />;
    }


    return <>{children}</>;
}

function App() {
    return (

                <Router>
                    <Layout />
                </Router>
    );
}

export default App;
