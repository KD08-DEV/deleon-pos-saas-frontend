import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { FiTrendingUp } from "react-icons/fi";
import { MdUpgrade } from "react-icons/md";

const PlanUsageWidget = () => {
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin-usage"],
        queryFn: async () => {
            const res = await api.get("/api/admin/usage");
            return res.data?.data;
        },
    });

    if (isLoading) {
        return (
            <div className="p-4 bg-gray-900 rounded-xl">
                <p className="text-sm text-gray-400">Loading plan usage…</p>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="p-4 bg-red-900/40 border border-red-500/40 rounded-xl">
                <p className="text-sm text-red-200">
                    Error loading plan usage. Please try again later.
                </p>
            </div>
        );
    }

    const { plan, limits, usage, remaining } = data;

    const planLabel = plan?.toUpperCase() || "BASIC";

    const progress = (used, max) => {
        if (max === null || max === undefined) return 0;
        if (max === 0) return 0;
        return Math.min(100, Math.round((used / max) * 100));
    };

    const isNearLimit = (used, max) => {
        if (max === null || max === undefined) return false;
        return used / max >= 0.8;
    };

    const rows = [
        {
            label: "Total users",
            used: usage.users,
            max: limits.maxUsers,
            remaining: remaining.users,
        },
        {
            label: "Admins (Owner + Admin)",
            used: usage.admins,
            max: limits.maxAdmins,
            remaining: remaining.admins,
        },
        {
            label: "Cashiers",
            used: usage.cashiers,
            max: limits.maxCashiers,
            remaining: remaining.cashiers,
        },
        {
            label: "Waiters",
            used: usage.waiters,
            max: limits.maxWaiters,
            remaining: remaining.waiters,
        },
        {
            label: "Dishes",
            used: usage.dishes,
            max: limits.maxDishes,
            remaining: remaining.dishes,
        },
        {
            label: "Tables",
            used: usage.tables,
            max: limits.maxTables,
            remaining: remaining.tables,
        },
    ];

    return (
        <>
            <div className="p-5 bg-gray-900 rounded-2xl border border-gray-800 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                            Subscription
                        </p>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            Current plan:{" "}
                            <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-xs border border-yellow-500/40">
                {planLabel}
              </span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <FiTrendingUp className="text-yellow-400" />
                            Usage based on your tenant resources.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowUpgradeModal(true)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500 text-black text-xs font-semibold hover:bg-yellow-400 transition"
                    >
                        <MdUpgrade size={16} />
                        Upgrade plan
                    </button>
                </div>

                <div className="space-y-3">
                    {rows.map((row) => {
                        const pct = progress(row.used, row.max);
                        const danger = isNearLimit(row.used, row.max);

                        return (
                            <div key={row.label}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-300">{row.label}</span>
                                    <span className="text-gray-400">
                    {row.max === null || row.max === undefined
                        ? `${row.used} / ∞`
                        : `${row.used} / ${row.max}`}
                                        {row.max !== null &&
                                            row.max !== undefined &&
                                            row.remaining !== null &&
                                            row.remaining !== undefined && (
                                                <span className="ml-2 text-[10px] text-gray-500">
                          ({row.remaining} left)
                        </span>
                                            )}
                  </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            danger ? "bg-red-500" : "bg-yellow-500"
                                        }`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {plan !== "enterprise" && (
                    <p className="mt-3 text-[11px] text-gray-500">
                        Reached the limits? Upgrade to PRO or ENTERPRISE for more users,
                        tables and dishes.
                    </p>
                )}
            </div>

            {showUpgradeModal && (
                <UpgradePlanModal onClose={() => setShowUpgradeModal(false)} plan={plan} />
            )}
        </>
    );
};

const UpgradePlanModal = ({ onClose, plan }) => {
    const currentPlan = plan?.toUpperCase() || "BASIC";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-md bg-[#0b0b0b] rounded-2xl border border-gray-800 p-6">
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                    <MdUpgrade className="text-yellow-400" />
                    Upgrade your plan
                </h3>
                <p className="text-sm text-gray-300 mb-4">
                    Your current plan is{" "}
                    <span className="font-semibold text-yellow-400">{currentPlan}</span>.
                    To unlock higher limits (more users, dishes and tables), please contact
                    support or your account manager.
                </p>

                <ul className="text-xs text-gray-400 mb-4 list-disc pl-4 space-y-1">
                    <li>More employees (admins, cashiers, waiters).</li>
                    <li>More tables and dishes for your restaurant.</li>
                    <li>Multi-branch support on higher tiers.</li>
                </ul>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg text-xs text-gray-300 border border-gray-700 hover:bg-gray-800"
                    >
                        Close
                    </button>
                    {/* Aquí luego puedes conectar un endpoint real de upgrade request */}
                    <a
                        href="https://wa.link/vzbps9"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-500 text-black hover:bg-yellow-400"
                    >
                        WhatsApp
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PlanUsageWidget;
