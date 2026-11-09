import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { FiTrendingUp } from "react-icons/fi";
import { MdUpgrade } from "react-icons/md";

const PlanUsageWidget = () => {
    const { t } = useTranslation();
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
                <p className="text-sm text-gray-400">
                    {t("planUsageWidget.loading")}
                </p>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="p-4 bg-red-900/40 border border-red-500/40 rounded-xl">
                <p className="text-sm text-red-200">
                    {t("planUsageWidget.loadError")}
                </p>
            </div>
        );
    }

    const { plan, limits, usage, remaining } = data;

    /*
     * El valor interno del plan NO se traduce.
     * Solo se muestra en mayúsculas.
     */
    const planLabel = plan?.toUpperCase();

    const progress = (used, max) => {
        if (max === null || max === undefined) return 0;
        if (max === 0) return 0;

        return Math.min(
            100,
            Math.round((used / max) * 100)
        );
    };

    const isNearLimit = (used, max) => {
        if (max === null || max === undefined) return false;

        return used / max >= 0.8;
    };

    const rows = [
        {
            key: "users",
            labelKey: "planUsageWidget.resources.totalUsers",
            used: usage.users,
            max: limits.maxUsers,
            remaining: remaining.users,
        },
        {
            key: "admins",
            labelKey: "planUsageWidget.resources.admins",
            used: usage.admins,
            max: limits.maxAdmins,
            remaining: remaining.admins,
        },
        {
            key: "cashiers",
            labelKey: "planUsageWidget.resources.cashiers",
            used: usage.cajeras,
            max: limits.maxCashiers,
            remaining: remaining.cajeras,
        },
        {
            key: "waiters",
            labelKey: "planUsageWidget.resources.waiters",
            used: usage.camareros,
            max: limits.maxWaiters,
            remaining: remaining.camareros,
        },
        {
            key: "dishes",
            labelKey: "planUsageWidget.resources.dishes",
            used: usage.dishes,
            max: limits.maxDishes,
            remaining: remaining.dishes,
        },
        {
            key: "tables",
            labelKey: "planUsageWidget.resources.tables",
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
                            {t("planUsageWidget.subscription")}
                        </p>

                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            {t("planUsageWidget.currentPlan")}:{" "}

                            <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-xs border border-sky-500/40">
                                {planLabel}
                            </span>
                        </h2>

                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <FiTrendingUp className="text-sky-400" />

                            {t("planUsageWidget.usageDescription")}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setShowUpgradeModal(true)
                        }
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500 text-black text-xs font-semibold hover:bg-sky-400 transition"
                    >
                        <MdUpgrade size={16} />

                        {t("planUsageWidget.actions.upgradePlan")}
                    </button>
                </div>

                <div className="space-y-3">
                    {rows.map((row) => {
                        const pct = progress(
                            row.used,
                            row.max
                        );

                        const danger = isNearLimit(
                            row.used,
                            row.max
                        );

                        return (
                            <div key={row.key}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-300">
                                        {t(row.labelKey)}
                                    </span>

                                    <span className="text-gray-400">
                                        {row.max === null ||
                                        row.max === undefined
                                            ? `${row.used} / ∞`
                                            : `${row.used} / ${row.max}`}

                                        {row.max !== null &&
                                            row.max !== undefined &&
                                            row.remaining !== null &&
                                            row.remaining !== undefined && (
                                                <span className="ml-2 text-[10px] text-gray-500">
                                                    (
                                                    {t(
                                                        "planUsageWidget.remaining",
                                                        {
                                                            count:
                                                            row.remaining,
                                                        }
                                                    )}
                                                    )
                                                </span>
                                            )}
                                    </span>
                                </div>

                                <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            danger
                                                ? "bg-red-500"
                                                : "bg-sky-500"
                                        }`}
                                        style={{
                                            width: `${pct}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {plan !== "estandar" && (
                    <p className="mt-3 text-[11px] text-gray-500">
                        {t("planUsageWidget.limitHint")}
                    </p>
                )}
            </div>

            {showUpgradeModal && (
                <UpgradePlanModal
                    onClose={() =>
                        setShowUpgradeModal(false)
                    }
                    plan={plan}
                />
            )}
        </>
    );
};

const UpgradePlanModal = ({
                              onClose,
                              plan,
                          }) => {
    const { t } = useTranslation();

    /*
     * Se conserva el valor interno del plan.
     */
    const currentPlan =
        plan?.toUpperCase() ||
        "EMPRENDEDOR";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-md bg-[#0b0b0b] rounded-2xl border border-gray-800 p-6">
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                    <MdUpgrade className="text-sky-400" />

                    {t("planUsageWidget.modal.title")}
                </h3>

                <p className="text-sm text-gray-300 mb-4">
                    {t(
                        "planUsageWidget.modal.currentPlanPrefix"
                    )}{" "}

                    <span className="font-semibold text-sky-400">
                        {currentPlan}
                    </span>
                    .{" "}

                    {t(
                        "planUsageWidget.modal.description"
                    )}
                </p>

                <ul className="text-xs text-gray-400 mb-4 list-disc pl-4 space-y-1">
                    <li>
                        {t(
                            "planUsageWidget.modal.benefits.employees"
                        )}
                    </li>

                    <li>
                        {t(
                            "planUsageWidget.modal.benefits.tablesAndDishes"
                        )}
                    </li>

                    <li>
                        {t(
                            "planUsageWidget.modal.benefits.multiBranch"
                        )}
                    </li>
                </ul>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg text-xs text-gray-300 border border-gray-700 hover:bg-gray-800"
                    >
                        {t("common.close")}
                    </button>

                    <a
                        href="https://wa.link/vzbps9"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 text-black hover:bg-sky-400"
                    >
                        WhatsApp
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PlanUsageWidget;