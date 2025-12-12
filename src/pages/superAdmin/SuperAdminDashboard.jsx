import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState({
        totalTenants: 0,
        activeTenants: 0,
        suspendedTenants: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const res = await api.get("/api/superadmin/tenants");
                const tenants = res.data?.data || [];

                const totalTenants = tenants.length;
                const activeTenants = tenants.filter(
                    (t) => t.status && t.status.toLowerCase() === "active"
                ).length;
                const suspendedTenants = tenants.filter(
                    (t) => t.status && t.status.toLowerCase() === "suspended"
                ).length;

                setMetrics({ totalTenants, activeTenants, suspendedTenants });
            } catch (error) {
                console.error("Error loading tenants metrics", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">SuperAdmin Dashboard</h1>

            {/* MÉTRICAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <MetricCard
                    title="Total tenants"
                    value={metrics.totalTenants}
                    subtitle="Empresas registradas"
                    loading={loading}
                />
                <MetricCard
                    title="Active tenants"
                    value={metrics.activeTenants}
                    subtitle="Con acceso al sistema"
                    loading={loading}
                />
                <MetricCard
                    title="Suspended tenants"
                    value={metrics.suspendedTenants}
                    subtitle="Acceso bloqueado"
                    loading={loading}
                />
            </div>

            {/* ACCIONES PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                    type="button"
                    onClick={() => navigate("/superadmin/tenants")}
                    className="p-6 bg-gray-900 rounded-xl text-left cursor-pointer hover:bg-gray-800 transition"
                >
                    <h2 className="text-xl font-bold mb-2">Manage Tenants</h2>
                    <p className="text-sm text-gray-300">
                        View, suspend and upgrade plans.
                    </p>
                </button>

                <button
                    type="button"
                    onClick={() => navigate("/superadmin/create-tenant")}
                    className="p-6 bg-yellow-500 rounded-xl text-left cursor-pointer hover:bg-yellow-400 transition text-black"
                >
                    <h2 className="text-xl font-bold mb-2">Create New Tenant</h2>
                    <p className="text-sm">
                        Create a company and assign an Admin.
                    </p>
                </button>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, subtitle, loading }) => (
    <div className="p-4 bg-gray-900 rounded-xl">
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
            {title}
        </p>
        <p className="text-3xl font-semibold">
            {loading ? "…" : value}
        </p>
        {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        )}
    </div>
);

export default SuperAdminDashboard;
