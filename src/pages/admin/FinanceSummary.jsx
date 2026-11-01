// src/pages/admin/FinanceSummary.jsx
import React, {
    useEffect,
    useMemo,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import { getSummary } from "../../lib/adminFinanceApi";
import api from "../../lib/api";
import useTenant from "../../hooks/useTenant";

import {
    formatMoney,
    getTenantLocalization,
    getTodayYMD,
} from "../../lib/localization";

const REGISTER_ID = "MAIN";

function getNum(obj, keyA, pathB) {
    const direct = obj?.[keyA];

    if (direct != null) {
        return Number(direct || 0);
    }

    const parts =
        String(pathB || "").split(".");

    let cur = obj;

    for (const p of parts) {
        cur = cur?.[p];
    }

    return Number(cur || 0);
}

function SectionTitle({
                          title,
                          subtitle,
                          right,
                      }) {
    return (
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-4">
            <div>
                <h2 className="text-lg md:text-xl font-semibold text-white">
                    {title}
                </h2>

                {subtitle ? (
                    <p className="text-sm text-white/50 mt-1">
                        {subtitle}
                    </p>
                ) : null}
            </div>

            {right ? (
                <div>
                    {right}
                </div>
            ) : null}
        </div>
    );
}

function FeaturedCard({
                          title,
                          value,
                          sub,
                          tone = "yellow",
                      }) {
    const toneMap = {
        yellow:
            "from-yellow-500/20 via-yellow-400/10 to-transparent border-yellow-500/20",

        green:
            "from-emerald-500/20 via-emerald-400/10 to-transparent border-emerald-500/20",

        blue:
            "from-sky-500/20 via-sky-400/10 to-transparent border-sky-500/20",

        red:
            "from-red-500/20 via-red-400/10 to-transparent border-red-500/20",
    };

    return (
        <div
            className={`rounded-2xl border bg-gradient-to-br ${toneMap[tone]} bg-[#0d1117] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]`}
        >
            <div className="text-sm text-white/60">
                {title}
            </div>

            <div className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-white">
                {value}
            </div>

            {sub ? (
                <div className="mt-2 text-sm text-white/45">
                    {sub}
                </div>
            ) : null}
        </div>
    );
}

function StatCard({
                      title,
                      value,
                      sub,
                      accent = "default",
                  }) {
    const accentMap = {
        default:
            "border-white/10",

        yellow:
            "border-yellow-500/20",

        green:
            "border-emerald-500/20",

        red:
            "border-red-500/20",

        blue:
            "border-sky-500/20",
    };

    return (
        <div
            className={`rounded-2xl border ${accentMap[accent]} bg-[#11161d] p-4 hover:bg-[#141b23] transition-colors`}
        >
            <div className="text-sm text-white/60">
                {title}
            </div>

            <div className="mt-2 text-2xl font-semibold text-white">
                {value}
            </div>

            {sub ? (
                <div className="mt-2 text-xs text-white/40 leading-relaxed">
                    {sub}
                </div>
            ) : null}
        </div>
    );
}

function MiniPill({
                      label,
                      value,
                  }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-white/45">
                {label}
            </div>

            <div className="text-sm font-medium text-white mt-1">
                {value}
            </div>
        </div>
    );
}

export default function FinanceSummary() {
    const { t } =
        useTranslation();

    const {
        tenantInfo,
    } =
        useTenant();

    const localization =
        getTenantLocalization(
            tenantInfo
        );

    const money = (
        value
    ) =>
        formatMoney(
            value,
            localization
        );

    const [
        from,
        setFrom,
    ] =
        useState(
            () =>
                getTodayYMD(
                    localization
                )
        );

    const [
        to,
        setTo,
    ] =
        useState(
            () =>
                getTodayYMD(
                    localization
                )
        );

    useEffect(
        () => {
            const today =
                getTodayYMD(
                    localization
                );

            setFrom(
                today
            );

            setTo(
                today
            );
        },
        [
            localization.timezone,
        ]
    );

    const [
        busy,
        setBusy,
    ] =
        useState(false);

    const [
        err,
        setErr,
    ] =
        useState("");

    const [
        data,
        setData,
    ] =
        useState(null);

    async function run() {
        setBusy(
            true
        );

        setErr(
            ""
        );

        try {
            const [
                summaryRes,
                cashSessionRes,
            ] =
                await Promise.all([
                    getSummary({
                        from,
                        to,
                    }),

                    api.get(
                        "/api/admin/cash-session",
                        {
                            params: {
                                dateYMD:
                                from,

                                registerId:
                                REGISTER_ID,
                            },
                        }
                    ),
                ]);

            const summaryData =
                summaryRes?.data ||
                {};

            const session =
                cashSessionRes
                    ?.data
                    ?.data ??
                cashSessionRes
                    ?.data ??
                null;

            const openingInitial =
                Number(
                    session
                        ?.openingFloatInitial ||
                    0
                );

            setData({
                ...summaryData,

                openingInitial,
            });

        } catch (
            error
            ) {
            setErr(
                error?.message ||
                t(
                    "financeSummary.messages.loadFailed"
                )
            );

        } finally {
            setBusy(
                false
            );
        }
    }

    const values =
        useMemo(
            () => {
                const salesTotal =
                    data
                        ? getNum(
                            data,
                            "salesTotal",
                            "sales.total"
                        )
                        : 0;

                const cogsTotal =
                    data
                        ? getNum(
                            data,
                            "cogsTotal",
                            "cogs.total"
                        )
                        : 0;

                const grossProfit =
                    data
                        ? (
                            getNum(
                                data,
                                "grossProfit",
                                "grossProfit"
                            ) ||
                            salesTotal -
                            cogsTotal
                        )
                        : 0;

                const purchasesTotal =
                    data
                        ? getNum(
                            data,
                            "purchasesTotal",
                            "purchases.total"
                        )
                        : 0;

                const mermaTotal =
                    data
                        ? getNum(
                            data,
                            "mermaTotal",
                            "merma.total"
                        )
                        : 0;

                const expensesTotal =
                    data
                        ? getNum(
                            data,
                            "expensesTotal",
                            "expenses.total"
                        )
                        : 0;

                const payrollTotal =
                    data
                        ? getNum(
                            data,
                            "payrollTotal",
                            "payroll.total"
                        )
                        : 0;

                const netTotal =
                    data
                        ? (
                            getNum(
                                data,
                                "netTotal",
                                "totals.net"
                            ) ||
                            (
                                grossProfit -
                                expensesTotal -
                                payrollTotal
                            )
                        )
                        : 0;

                const openingInitial =
                    data
                        ? getNum(
                            data,
                            "openingInitial",
                            "openingInitial"
                        )
                        : 0;

                return {
                    salesTotal,
                    cogsTotal,
                    grossProfit,
                    purchasesTotal,
                    mermaTotal,
                    expensesTotal,
                    payrollTotal,
                    netTotal,
                    openingInitial,
                };
            },
            [
                data,
            ]
        );

    const {
        salesTotal,
        cogsTotal,
        grossProfit,
        purchasesTotal,
        mermaTotal,
        expensesTotal,
        payrollTotal,
        netTotal,
        openingInitial,
    } =
        values;

    return (
        <section className="p-4 md:p-6 text-white">

            <div className="rounded-3xl border border-white/10 bg-[#0b0f14] p-5 md:p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">

                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

                    <div>

                        <p className="text-xs uppercase tracking-[0.18em] text-yellow-400/80 mb-2">

                            {t(
                                "financeSummary.header.eyebrow"
                            )}

                        </p>

                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">

                            {t(
                                "financeSummary.header.title"
                            )}

                        </h1>

                        <p className="text-sm text-white/50 mt-2 max-w-2xl">

                            {t(
                                "financeSummary.header.description"
                            )}

                        </p>

                    </div>

                    <div className="w-full xl:w-auto">

                        <div className="grid grid-cols-1 md:grid-cols-[minmax(210px,1fr)_minmax(210px,1fr)_auto] gap-4 items-end">

                            <div className="min-w-0">

                                <label className="block text-xs text-white/50 mb-1.5">

                                    {t(
                                        "financeSummary.filters.from"
                                    )}

                                </label>

                                <input
                                    type="date"
                                    value={
                                        from
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setFrom(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    className="w-full min-w-[210px] rounded-xl border border-white/10 bg-[#11161d] px-4 pr-10 py-3 text-white outline-none focus:border-yellow-500/40"
                                />

                            </div>

                            <div className="min-w-0">

                                <label className="block text-xs text-white/50 mb-1.5">

                                    {t(
                                        "financeSummary.filters.to"
                                    )}

                                </label>

                                <input
                                    type="date"
                                    value={
                                        to
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setTo(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    className="w-full min-w-[210px] rounded-xl border border-white/10 bg-[#11161d] px-4 pr-10 py-3 text-white outline-none focus:border-yellow-500/40"
                                />

                            </div>

                            <div className="md:min-w-[150px]">

                                <button
                                    type="button"
                                    onClick={
                                        run
                                    }
                                    disabled={
                                        busy
                                    }
                                    className="w-full rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-black hover:bg-yellow-400 transition disabled:opacity-60"
                                >

                                    {busy
                                        ? t(
                                            "financeSummary.actions.loading"
                                        )
                                        : t(
                                            "financeSummary.actions.run"
                                        )
                                    }

                                </button>

                            </div>

                        </div>

                    </div>

                </div>

                {err ? (

                    <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">

                        {err}

                    </div>

                ) : null}

                {!data ? (

                    <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-white/50">

                        {t(
                            "financeSummary.empty.prefix"
                        )}{" "}

                        <span className="text-white font-medium">

                            {t(
                                "financeSummary.actions.run"
                            )}

                        </span>

                        {t(
                            "financeSummary.empty.suffix"
                        )}

                    </div>

                ) : (

                    <>

                        {/* RESUMEN EJECUTIVO */}

                        <div className="mt-8">

                            <SectionTitle
                                title={
                                    t(
                                        "financeSummary.executive.title"
                                    )
                                }
                                subtitle={
                                    t(
                                        "financeSummary.executive.subtitle"
                                    )
                                }
                                right={
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                                        <MiniPill
                                            label={
                                                t(
                                                    "financeSummary.executive.range"
                                                )
                                            }
                                            value={`${from} → ${to}`}
                                        />

                                        <MiniPill
                                            label={
                                                t(
                                                    "financeSummary.executive.status"
                                                )
                                            }
                                            value={
                                                t(
                                                    "financeSummary.executive.updated"
                                                )
                                            }
                                        />

                                    </div>
                                }
                            />

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                                <FeaturedCard
                                    title={
                                        t(
                                            "financeSummary.featured.netResult.title"
                                        )
                                    }
                                    value={
                                        money(
                                            netTotal
                                        )
                                    }
                                    sub={
                                        t(
                                            "financeSummary.featured.netResult.description"
                                        )
                                    }
                                    tone={
                                        netTotal >=
                                        0
                                            ? "green"
                                            : "red"
                                    }
                                />

                                <FeaturedCard
                                    title={
                                        t(
                                            "financeSummary.featured.openingFloat.title"
                                        )
                                    }
                                    value={
                                        money(
                                            openingInitial
                                        )
                                    }
                                    sub={
                                        t(
                                            "financeSummary.featured.openingFloat.description"
                                        )
                                    }
                                    tone="yellow"
                                />

                            </div>

                        </div>

                        {/* RENDIMIENTO FINANCIERO */}

                        <div className="mt-8 grid grid-cols-1 2xl:grid-cols-[1.4fr_1fr] gap-6">

                            <div className="rounded-2xl border border-white/10 bg-[#0f141a] p-5">

                                <SectionTitle
                                    title={
                                        t(
                                            "financeSummary.performance.title"
                                        )
                                    }
                                    subtitle={
                                        t(
                                            "financeSummary.performance.subtitle"
                                        )
                                    }
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                    <StatCard
                                        title={
                                            t(
                                                "financeSummary.cards.sales.title"
                                            )
                                        }
                                        value={
                                            money(
                                                salesTotal
                                            )
                                        }
                                        sub={
                                            t(
                                                "financeSummary.cards.sales.description"
                                            )
                                        }
                                        accent="yellow"
                                    />

                                    <StatCard
                                        title={
                                            t(
                                                "financeSummary.cards.cogs.title"
                                            )
                                        }
                                        value={
                                            money(
                                                cogsTotal
                                            )
                                        }
                                        sub={
                                            t(
                                                "financeSummary.cards.cogs.description"
                                            )
                                        }
                                        accent="default"
                                    />

                                    <StatCard
                                        title={
                                            t(
                                                "financeSummary.cards.grossProfit.title"
                                            )
                                        }
                                        value={
                                            money(
                                                grossProfit
                                            )
                                        }
                                        sub={
                                            t(
                                                "financeSummary.cards.grossProfit.description"
                                            )
                                        }
                                        accent="green"
                                    />

                                    <StatCard
                                        title={
                                            t(
                                                "financeSummary.cards.expenses.title"
                                            )
                                        }
                                        value={
                                            money(
                                                expensesTotal
                                            )
                                        }
                                        sub={
                                            t(
                                                "financeSummary.cards.expenses.description"
                                            )
                                        }
                                        accent="red"
                                    />

                                    <StatCard
                                        title={
                                            t(
                                                "financeSummary.cards.payroll.title"
                                            )
                                        }
                                        value={
                                            money(
                                                payrollTotal
                                            )
                                        }
                                        sub={
                                            t(
                                                "financeSummary.cards.payroll.description"
                                            )
                                        }
                                        accent="default"
                                    />

                                    <StatCard
                                        title={
                                            t(
                                                "financeSummary.cards.purchases.title"
                                            )
                                        }
                                        value={
                                            money(
                                                purchasesTotal
                                            )
                                        }
                                        sub={
                                            t(
                                                "financeSummary.cards.purchases.description"
                                            )
                                        }
                                        accent="blue"
                                    />

                                    <StatCard
                                        title={
                                            t(
                                                "financeSummary.cards.waste.title"
                                            )
                                        }
                                        value={
                                            money(
                                                mermaTotal
                                            )
                                        }
                                        sub={
                                            t(
                                                "financeSummary.cards.waste.description"
                                            )
                                        }
                                        accent="default"
                                    />

                                </div>

                            </div>

                        </div>

                    </>

                )}

            </div>

        </section>
    );
}