import { useSelector } from "react-redux";
import { NavLink, Outlet } from "react-router-dom";
import SuperAdminSidebar from "./SuperAdminSidebar";
import SuperAdminHeader from "./SuperAdminHeader";

const SuperAdminLayout = () => {
    const { userData } = useSelector((state) => state.user);

    return (
        <div className="min-h-screen bg-[#050505] text-gray-100 flex">
            {/* SIDEBAR */}
            <SuperAdminSidebar />

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 flex flex-col min-h-screen">
                <SuperAdminHeader user={userData} />

                <nav aria-label="Secciones de SuperAdmin" className="md:hidden flex gap-2 overflow-x-auto border-b border-neutral-800 bg-[#0b0b0b] p-3 text-xs">
                    {[
                        ["/superadmin", "Resumen"],
                        ["/superadmin/tenants", "Empresas"],
                        ["/superadmin/ecf-authorizations", "Autorizaciones e-CF"],
                        ["/superadmin/rnc-registry", "Padrón RNC"],
                        ["/superadmin/tenant-usage", "Uso"],
                    ].map(([to, name]) => <NavLink key={to} to={to} end={to === "/superadmin"}
                        className={({isActive}) => `shrink-0 rounded-lg border px-3 py-2 ${isActive ? "border-amber-500 text-amber-300" : "border-neutral-700 text-gray-300"}`}>
                        {name}
                    </NavLink>)}
                </nav>
                <main className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#050505]">
                    <Outlet />   {/* <<--- EL FIX 🔥🔥🔥 */}
                </main>
            </div>
        </div>
    );
};

export default SuperAdminLayout;
