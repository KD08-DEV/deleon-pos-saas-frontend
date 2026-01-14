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
import { useSelector } from "react-redux";
import useLoadData from "./hooks/useLoadData";
import FullScreenLoader from "./components/shared/FullScreenLoader";
import BottomNav from "./components/shared/BottomNav";
import AdminRegister from "@components/auth/AdminRegister.jsx";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import Admin from "./pages/admin/Admin";
import SuperAdminDashboard from "./pages/superAdmin/SuperAdminDashboard";
import SuperAdminTenants from "./pages/superAdmin/SuperAdminTenants";
import SuperAdminCreateTenant from "./pages/superAdmin/SuperAdminCreateTenant";
import SuperAdminLayout from "./components/superAdmin/SuperAdminLayout";
import SuperAdminTenantUsage from "@pages/superAdmin/SuperAdminTenantUsage.jsx";
import { connectSocket, disconnectSocket } from "./realtime/socket.js";
import { useDispatch } from "react-redux";
import { setTenant } from "./redux/slices/storeSlice";
import { getTenant } from "./https";
import { QK } from "./queryKeys";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";



function RealtimeTenantConfig() {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const userState = useSelector((s) => s.user);
    const socketRef = useRef(null);

    // soporta varios shapes: {userData}, {user}, o user directo
    const isAuth = !!userState?.isAuth;
    const currentUser = userState?.userData || userState?.user || userState;
    const tenantId = currentUser?.tenantId;

    useEffect(() => {
        if (!isAuth || !tenantId) return;

        if (!socketRef.current) {
            socketRef.current = connectSocket({
                baseUrl: SOCKET_URL,
                tenantId,
            });
        }

        const s = socketRef.current;
        if (!s) return;

        const onConfigUpdated = async (payload) => {
            if (payload?.tenantId && payload.tenantId !== tenantId) return;

            const res = await getTenant(tenantId);
            dispatch(setTenant(res.data.data));

            queryClient.invalidateQueries({ queryKey: QK.ADMIN_FISCAL_CONFIG, exact: true });
            queryClient.invalidateQueries({ queryKey: QK.ORDERS, exact: true });
        };

        const onTablesUpdated = (payload) => {
            if (payload?.tenantId && payload.tenantId !== tenantId) return;

            // 1) marcar stale
            queryClient.invalidateQueries({ queryKey: QK.TABLES, exact: true });
            queryClient.invalidateQueries({ queryKey: QK.ORDERS, exact: true });

            // 2) forzar fetch inmediato si la vista está abierta
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

    const isSuperAdminRoute = location.pathname.startsWith("/superadmin");
    const shouldShowPosChrome =
        !hideHeaderRoutes.includes(location.pathname) && !isSuperAdminRoute;

    // 🚀 Redirección automática si es SuperAdmin
    useEffect(() => {
        if (userData?.role === "SuperAdmin") {
            if (!location.pathname.startsWith("/superadmin")) {
                navigate("/superadmin");
            }
        }
    }, [userData, location.pathname, navigate]);

    if (isLoading) return <FullScreenLoader />;

    return (
        <>
            <RealtimeTenantConfig />
            {shouldShowPosChrome && <Header />}

            <Routes>
                {/* POS / TENANT RUTAS */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoutes>
                            <Home />
                        </ProtectedRoutes>
                    }
                />
                <Route
                    path="/auth"
                    element={isAuth ? <Navigate to="/" /> : <Auth />}
                />
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
                        <ProtectedRoutes allowedRoles={["Admin"]}>
                            <Admin />
                        </ProtectedRoutes>
                    }
                />
                {/* SUPERADMIN RUTAS (con layout propio) */}
                <Route
                    path="/superadmin"
                    element={
                        <ProtectedRoutes allowedRoles={["SuperAdmin"]}>
                            <SuperAdminLayout />
                        </ProtectedRoutes>
                    }
                >
                    {/* Páginas dentro del layout */}
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


    console.log("userData:", userData);

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
