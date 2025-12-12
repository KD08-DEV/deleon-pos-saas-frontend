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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SnackbarProvider } from "notistack";
import BottomNav from "./components/shared/BottomNav";
import AdminRegister from "@components/auth/AdminRegister.jsx";
import { useEffect } from "react";

import Admin from "./pages/admin/Admin";
import SuperAdminDashboard from "./pages/superAdmin/SuperAdminDashboard";
import SuperAdminTenants from "./pages/superAdmin/SuperAdminTenants";
import SuperAdminCreateTenant from "./pages/superAdmin/SuperAdminCreateTenant";
import SuperAdminLayout from "./components/superAdmin/SuperAdminLayout";
import SuperAdminTenantUsage from "@pages/superAdmin/SuperAdminTenantUsage.jsx";

const queryClient = new QueryClient();

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

    console.log("🔍 ProtectedRoutes - Estado actual:");
    console.log("userData:", userData);

    if (!isAuth) {
        console.log("⛔ Usuario no autenticado → /auth");
        return <Navigate to="/auth" />;
    }

    if (!userData?.role) {
        console.log("⌛ Usuario sin rol… cargando");
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
        console.log(`🚫 Acceso denegado: rol ${userData.role} no permitido`);
        return <Navigate to="/" replace />;
    }

    console.log("✅ Acceso permitido");
    return <>{children}</>;
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
                <Router>
                    <Layout />
                </Router>
            </SnackbarProvider>
        </QueryClientProvider>
    );
}

export default App;
