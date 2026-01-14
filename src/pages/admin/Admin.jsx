import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";

import Reports from "./Reports";
import Employees from "./Employees";
import PlanUsageWidget from "./PlanUsageWidget";
import api from "../../lib/api";
import Inventory from "./Inventory";
import FiscalConfig from "./FiscalConfig";


const Admin = () => {
    const [tab, setTab] = useState("reports");
    const navigate = useNavigate();
    const { userData, isAuth } = useSelector((state) => state.user);

    // 🔐 Redirección segura
    useEffect(() => {
        if (!isAuth) {
            navigate("/");
            return;
        }

        if (userData?.role !== "Admin") {
            navigate("/");
        }
    }, [userData, isAuth, navigate]);

    // ⏳ Evitar pantalla en blanco mientras carga el usuario
    if (!userData) {
        return (
            <div className="bg-[#060606] min-h-screen flex items-center justify-center text-white">
                Loading...
            </div>
        );
    }

    // 📊 Traer resumen de uso del plan
    const { data: usageData } = useQuery({
        queryKey: ["admin-usage-summary"],
        queryFn: async () => {
            const res = await api.get("/api/admin/usage");
            return res.data?.data; // { plan, limits, usage, remaining }
        },
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnReconnect: true,
    });

    const plan = usageData?.plan?.toUpperCase() || "Emprendedor";
    const limits = usageData?.limits || {};
    const usage = usageData?.usage || {};
    const rawPlan = (usageData?.plan || "emprendedor").toLowerCase();
    const canInventory = ["pro", "vip"].includes(rawPlan);

    const totalUsersLimit =
        limits.maxUsers === null || limits.maxUsers === undefined
            ? "∞"
            : limits.maxUsers;

    const dishesLimit =
        limits.maxDishes === null || limits.maxDishes === undefined
            ? "∞"
            : limits.maxDishes;

    const tablesLimit =
        limits.maxTables === null || limits.maxTables === undefined
            ? "∞"
            : limits.maxTables;

    return (
        <div className="bg-[#060606] min-h-screen py-10 px-4 md:px-8 text-white">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
                            Admin Dashboard
                        </p>
                        <h1 className="text-3xl md:text-4xl font-bold mt-1">
                            Panel de Administración
                        </h1>
                        <p className="text-sm text-gray-400 mt-2">
                            Gestiona tu equipo, revisa reportes y controla el uso de tu plan.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate("/register")}
                        className="self-start md:self-auto bg-[#f6b100] text-black px-6 py-3 rounded-xl font-semibold hover:bg-[#ffd633] transition shadow-lg shadow-yellow-500/20"
                    >
                        Registrar Usuario
                    </button>
                </div>

                {/* MÉTRICAS RÁPIDAS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#111111] border border-gray-800 rounded-2xl p-4">
                        <p className="text-xs text-gray-400 uppercase tracking-[0.18em] mb-1">
                            Plan actual
                        </p>
                        <p className="text-lg font-semibold flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-xs border border-yellow-500/40">
                {plan}
              </span>
                        </p>
                        <p className="mt-3 text-xs text-gray-400">
                            Usuarios:{" "}
                            <span className="font-semibold text-gray-100">
                {usage.users || 0} / {totalUsersLimit}
              </span>
                        </p>
                    </div>

                    <div className="bg-[#111111] border border-gray-800 rounded-2xl p-4">
                        <p className="text-xs text-gray-400 uppercase tracking-[0.18em] mb-1">
                            Equipo
                        </p>
                        <p className="text-lg font-semibold">
                            {usage.admins || 0} Admins · {usage.cashiers || 0} Cajeras ·{" "}
                            {usage.waiters || 0} Meseros
                        </p>
                        <p className="mt-3 text-xs text-gray-400">
                            Total empleados activos:{" "}
                            <span className="font-semibold text-gray-100">
                {(usage.admins || 0) +
                    (usage.cashiers || 0) +
                    (usage.waiters || 0)}
              </span>
                        </p>
                    </div>

                    <div className="bg-[#111111] border border-gray-800 rounded-2xl p-4">
                        <p className="text-xs text-gray-400 uppercase tracking-[0.18em] mb-1">
                            Mesas & Platos
                        </p>
                        <p className="text-lg font-semibold">
                            {usage.tables || 0} mesas · {usage.dishes || 0} platos
                        </p>
                        <p className="mt-3 text-xs text-gray-400">
                            Límite:{" "}
                            <span className="font-semibold text-gray-100">
                {tablesLimit} mesas / {dishesLimit} platos
              </span>
                        </p>
                    </div>
                </div>

                {/* WIDGET USO DEL PLAN */}
                <div>
                    <PlanUsageWidget />
                </div>

                {/* CONTENIDO PRINCIPAL */}
                <div className="bg-[#101010] border border-gray-800 rounded-2xl p-6 mt-4">
                    {/* TABS */}
                    <div className="flex flex-wrap gap-4 mb-6 border-b border-gray-800 pb-4">
                        <button
                            onClick={() => setTab("reports")}
                            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                                tab === "reports"
                                    ? "bg-[#f6b100] text-black shadow shadow-yellow-500/30"
                                    : "bg-[#1f1f1f] text-[#ababab] hover:bg-[#262626]"
                            }`}
                        >
                            Reportes
                        </button>
                        <button
                            onClick={() => setTab("employees")}
                            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                                tab === "employees"
                                    ? "bg-[#f6b100] text-black shadow shadow-yellow-500/30"
                                    : "bg-[#1f1f1f] text-[#ababab] hover:bg-[#262626]"
                            }`}
                        >

                            Empleados
                        </button>
                        <button
                            onClick={() => setTab("fiscal")}
                            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                                tab === "fiscal"
                                    ? "bg-[#f6b100] text-black shadow shadow-yellow-500/30"
                                    : "bg-[#1f1f1f] text-[#ababab] hover:bg-[#262626]"
                            }`}
                        >
                            NCF / Fiscal
                        </button>

                        {canInventory && (
                            <button
                                onClick={() => setTab("inventory")}
                                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                                    tab === "inventory"
                                        ? "bg-[#f6b100] text-black shadow shadow-yellow-500/30"
                                        : "bg-[#1f1f1f] text-[#ababab] hover:bg-[#262626]"
                                }`}
                            >
                                Inventario
                            </button>
                        )}
                    </div>
                    {/* CONTENIDO DINÁMICO */}
                    <div className="mt-2">
                        {tab === "inventory" && <Inventory plan={rawPlan} />}
                        {tab === "reports" && <Reports />}
                        {tab === "employees" && <Employees />}
                        {tab === "fiscal" && <FiscalConfig />}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;
