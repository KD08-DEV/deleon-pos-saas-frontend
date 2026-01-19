import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { MdUpgrade } from "react-icons/md";

const SuperAdminTenantUsage = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["superadmin-usage"],
        queryFn: async () => {
            const res = await api.get("/api/superadmin/tenant-usage");
            return res.data?.data;
        },
    });

    if (isLoading)
        return <p className="p-6 text-gray-400">Loading usage...</p>;

    if (isError || !data)
        return <p className="p-6 text-red-400">Error loading data</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Tenant Usage Overview</h1>

            {data.map((tenant) => (
                <TenantUsageCard key={tenant.tenantId} tenant={tenant} />
            ))}
        </div>
    );
};

const TenantUsageCard = ({ tenant }) => {
    const { plan, limits, usage, remaining } = tenant;

    const progress = (used, max) => {
        if (!max) return 0;
        return Math.round((used / max) * 100);
    };

    const rows = [
        { label: "Users", used: usage.users, max: limits.maxUsers, left: remaining.users },
        { label: "Admins", used: usage.admins, max: limits.maxAdmins, left: remaining.admins },
        { label: "Cajeras", used: usage.cajeras, max: limits.maxCashiers, left: remaining.cajeras },
        { label: "Camareros", used: usage.camareros, max: limits.maxWaiters, left: remaining.camareros },
        { label: "Dishes", used: usage.dishes, max: limits.maxDishes, left: remaining.dishes },
        { label: "Tables", used: usage.tables, max: limits.maxTables, left: remaining.tables },
    ];

    return (
        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
            <div className="flex justify-between mb-4">
                <div>
                    <h2 className="text-xl font-semibold text-white">{tenant.name}</h2>
                    <span className="text-xs px-2 py-1 bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 rounded">
                        {plan.toUpperCase()}
                    </span>
                </div>

                <a
                    href="https://wa.link/vzbps9"
                    target="_blank"
                    className="bg-yellow-500 text-black px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <MdUpgrade /> Upgrade
                </a>
            </div>

            <div className="space-y-3">
                {rows.map((r) => (
                    <div key={r.label}>
                        <div className="flex justify-between">
                            <span className="text-gray-300">{r.label}</span>
                            <span className="text-gray-400 text-xs">
                                {r.used} / {r.max} ({r.left} left)
                            </span>
                        </div>

                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-2 bg-yellow-500"
                                style={{ width: `${progress(r.used, r.max)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SuperAdminTenantUsage;
