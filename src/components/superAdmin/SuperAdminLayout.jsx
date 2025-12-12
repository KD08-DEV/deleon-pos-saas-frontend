import React from "react";
import { useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
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

                <main className="flex-1 overflow-y-auto p-6 bg-[#050505]">
                    <Outlet />   {/* <<--- EL FIX 🔥🔥🔥 */}
                </main>
            </div>
        </div>
    );
};

export default SuperAdminLayout;
