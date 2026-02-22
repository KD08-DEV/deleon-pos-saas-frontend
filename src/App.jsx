import {
    BrowserRouter as Router,
    Routes,
    Route,
    useLocation,
    Navigate,
    useNavigate,
    Outlet,
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
import api from "./lib/api";
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
    const shouldShowPosChrome =
        !hideHeaderRoutes.includes(location.pathname) && !isSuperAdminRoute;
    // ====== CASH SESSION GATE (solo Cajera) ======
    const isCajera = userData?.role === "Cajera";
    const [cashGateLoading, setCashGateLoading] = useState(false);
    const [cashSession, setCashSession] = useState(null);
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

    const registerId = "MAIN";

    const fetchCashSession = async () => {
        setCashGateLoading(true);
        setCashGateError("");
        try {
            const res = await api.get("/api/admin/cash-session/current", {
                params: { dateYMD: todayYMD, registerId: REGISTER_ID },
            });
            const payload = res?.data ?? null;
            const session =
                payload?.data ??
                payload?.session ??
                payload?.cashSession ??
                (payload?._id ? payload : null) ??
                null;            setCashSession(session);

            const isAdminLike = ["Admin", "SuperAdmin"].includes(userData?.role);


            // Si no hay sesión o no está OPEN => exigir apertura
            // ADMIN: nunca debe ver este modal
            if (isAdminLike) {
                setOpenModal(false);
                return;
            }

                // CAJERA:
                // - Si no hay sesión => exigir apertura
                // - Si está OPEN pero sin monto => exigir apertura
                // - Si está CLOSED => NO exigir apertura (debe ver resumen / vista cerrada)
            const opening = Number(session?.openingFloatInitial ?? 0);

            const mustOpen =
                isCajera && (!session || (session.status === "OPEN" && opening <= 0));

            setOpenModal(mustOpen);

        } catch (e) {
            setCashGateError("No se pudo validar la caja. Revisa la conexión o el backend.");
            setOpenModal(true);
        } finally {
            setCashGateLoading(false);
        }
    };

    useEffect(() => {
        if (!isCajera) return;
        fetchCashSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCajera]);

    const handleOpenCash = async () => {
        setCashGateError("");
        const amount = Number(openingAmount || 0);
        if (!amount || amount <= 0) {
            setCashGateError("Introduce un monto válido para la apertura.");
            return;
        }

        try {
            setCashGateLoading(true);
            await api.post("/api/admin/cash-session/open", {
                dateYMD: todayYMD,
                registerId,
                openingFloat: amount,
                note: "Apertura por Cajera",
            });
            await fetchCashSession();
        } catch (e) {
            setCashGateError("No se pudo abrir la caja. Verifica permisos y endpoint /cash-session/open.");
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
        !isSuperAdminRoute
    ) {

        return (
            <section className="bg-[#111] min-h-screen px-6 pt-6 pb-24">
                <div className="text-gray-400">Cargando configuración…</div>
            </section>
        );
    }


    const mustBlock = isCajera && (openModal || cashGateLoading);

    return (
        <>
            <RealtimeTenantConfig />
            <SessionHeartbeat />

            {/* Modal Apertura de Caja (solo Cajera) */}
            {isCajera && openModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md rounded-2xl bg-[#0b0b0c] border border-white/10 shadow-2xl p-6">
                        <h2 className="text-xl font-semibold text-white">Apertura de caja</h2>
                        <p className="text-sm text-white/70 mt-1">
                            Debes registrar el fondo inicial antes de usar el sistema.
                        </p>

                        <div className="mt-4">
                            <label className="text-sm text-white/70">Monto de apertura</label>
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
                            <div className="mt-3 text-sm text-red-400">{cashGateError}</div>
                        )}

                        <div className="mt-5 flex gap-3">
                            <button
                                onClick={handleOpenCash}
                                disabled={cashGateLoading}
                                className="w-full rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-3 disabled:opacity-60"
                            >
                                {cashGateLoading ? "Guardando..." : "Guardar apertura"}
                            </button>
                        </div>
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

                <Route path="*" element={<div>Not Found</div>} />
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
