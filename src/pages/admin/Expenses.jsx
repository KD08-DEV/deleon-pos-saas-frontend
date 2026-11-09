import { financeErrorMessage } from "../../lib/financeErrorMessage";
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
    listExpenseCategories,
    listExpenses,
    createExpense,
    voidExpense,
} from "../../lib/adminFinanceApi";
import MermaPanel from "./MermaPanel";
import useTenant from "../../hooks/useTenant";

import {
    formatMoney,
    getTenantLocalization,
    getTodayYMD,
} from "../../lib/localization";

export default function Expenses() {
    const { t } = useTranslation();

    const { tenantInfo } =
        useTenant();

    const localization =
        getTenantLocalization(
            tenantInfo
        );

    const money = (value) =>
        formatMoney(
            value,
            localization
        );

    const businessTodayYMD =
        getTodayYMD(
            localization
        );

    const [sourceType, setSourceType] = useState("all");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [reference, setReference] = useState("");
    const [cats, setCats] = useState([]);
    const [rows, setRows] = useState([]);
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const [from, setFrom] =
        useState(
            () => businessTodayYMD
        );

    const [to, setTo] =
        useState(
            () => businessTodayYMD
        );

    const [dateYMD, setDateYMD] =
        useState(
            () => businessTodayYMD
        );

    const [amount, setAmount] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [note, setNote] = useState("");

    const [confirmVoid, setConfirmVoid] = useState({
        open: false,
        row: null,
    });

    useEffect(() => {
        const today =
            getTodayYMD(
                localization
            );

        setFrom(today);
        setTo(today);
        setDateYMD(today);
    }, [
        localization.timezone,
    ]);

    const getPaymentMethodLabel = (value) => {
        switch (value) {
            case "cash":
                return t(
                    "expensesPage.paymentMethods.cash"
                );

            case "transfer":
                return t(
                    "expensesPage.paymentMethods.transfer"
                );

            case "card":
                return t(
                    "expensesPage.paymentMethods.card"
                );

            case "other":
                return t(
                    "expensesPage.paymentMethods.other"
                );

            default:
                return value || "-";
        }
    };

    async function loadCats() {
        const r =
            await listExpenseCategories();

        const active = (r.data || []).filter(category => category.status !== "inactive");
        setCats(active);

        if (
            !categoryId &&
            active[0]?._id
        ) {
            setCategoryId(
                active[0]._id
            );
        }
    }

    async function refresh() {
        setErr("");

        const params = {
            from,
            to,
        };

        if (
            sourceType !==
            "all"
        ) {
            params.sourceType =
                sourceType;
        }

        const r =
            await listExpenses(
                params
            );

        setRows(
            r.data || []
        );
    }

    useEffect(() => {
        Promise.all([
            loadCats(),
            refresh(),
        ]).catch(
            (error) =>
                setErr(
                    financeErrorMessage(error, t("expensesPage.messages.loadFailed"))
                )
        );

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const total =
        useMemo(
            () => {
                return (
                    rows ||
                    []
                ).reduce(
                    (
                        accumulator,
                        row
                    ) =>
                        accumulator +
                        Number(
                            row.amount ||
                            0
                        ),
                    0
                );
            },
            [
                rows,
            ]
        );

    const totals =
        useMemo(
            () => {
                const all =
                    rows ||
                    [];

                const payroll =
                    all
                        .filter(
                            (
                                row
                            ) =>
                                row
                                    ?.source
                                    ?.type ===
                                "payroll"
                        )
                        .reduce(
                            (
                                accumulator,
                                row
                            ) =>
                                accumulator +
                                Number(
                                    row.amount ||
                                    0
                                ),
                            0
                        );

                const manual =
                    all
                        .filter(
                            (
                                row
                            ) =>
                                row
                                    ?.source
                                    ?.type !==
                                "payroll"
                        )
                        .reduce(
                            (
                                accumulator,
                                row
                            ) =>
                                accumulator +
                                Number(
                                    row.amount ||
                                    0
                                ),
                            0
                        );

                return {
                    all:
                        manual +
                        payroll,

                    manual,

                    payroll,

                    count:
                    all.length,
                };
            },
            [
                rows,
            ]
        );

    async function onCreate(event) {
        event.preventDefault();

        setBusy(true);
        setErr("");

        try {
            const cleanAmount =
                String(
                    amount
                ).replace(
                    /,/g,
                    ""
                );

            await createExpense({
                dateYMD,

                amount:
                cleanAmount,

                categoryId,

                note,

                paymentMethod,

                reference,
            });

            setAmount("");
            setNote("");
            setReference("");

            setPaymentMethod(
                "cash"
            );

            await refresh();

        } catch (
            error
            ) {
            setErr(
                financeErrorMessage(error, t("expensesPage.messages.createFailed"))
            );

        } finally {
            setBusy(false);
        }
    }

    function openVoidModal(row) {
        setConfirmVoid({
            open:
                true,

            row,
        });
    }

    function closeVoidModal() {
        setConfirmVoid({
            open:
                false,

            row:
                null,
        });
    }

    async function confirmVoidExpense() {
        const id =
            confirmVoid
                ?.row
                ?._id;

        if (
            !id
        ) {
            return;
        }

        setBusy(true);
        setErr("");

        try {
            await voidExpense(
                id
            );

            await refresh();

            closeVoidModal();

        } catch (
            error
            ) {
            setErr(
                financeErrorMessage(error, t("expensesPage.messages.voidFailed"))
            );

        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="finance-workspace min-w-0 space-y-5 text-white">

            <h1 className="text-2xl font-bold">
                {t(
                    "expensesPage.title"
                )}
            </h1>
            <p className="text-sm text-white/60">Registra y consulta los gastos de la sucursal. La nómina se identifica por separado.</p>

            {err ? (
                <div className="mt-3 text-red-400">
                    {err}
                </div>
            ) : null}

            {/* FILTROS */}

            <div className="expense-filters rounded-2xl border border-gray-800/50 bg-[#101010] p-4 flex flex-wrap gap-3 items-end">

                <div>

                    <div className="text-xs text-white/70">
                        {t(
                            "expensesPage.filters.from"
                        )}
                    </div>

                    <input
                        className="bg-[#151515] border border-white/15 rounded-xl px-3 py-2"
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
                    />

                </div>

                <div>

                    <div className="text-xs text-white/70">
                        {t(
                            "expensesPage.filters.to"
                        )}
                    </div>

                    <input
                        className="bg-[#151515] border border-white/15 rounded-xl px-3 py-2"
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
                    />

                </div>

                <div>

                    <div className="text-xs text-white/70">
                        {t(
                            "expensesPage.filters.type"
                        )}
                    </div>

                    <select
                        className="bg-[#151515] border border-white/15 rounded-xl px-3 py-2"
                        value={
                            sourceType
                        }
                        onChange={(
                            event
                        ) =>
                            setSourceType(
                                event
                                    .target
                                    .value
                            )
                        }
                    >

                        <option value="all">
                            {t(
                                "expensesPage.sourceTypes.all"
                            )}
                        </option>

                        <option value="manual">
                            {t(
                                "expensesPage.sourceTypes.manualPlural"
                            )}
                        </option>

                        <option value="payroll">
                            {t(
                                "expensesPage.sourceTypes.payroll"
                            )}
                        </option>

                    </select>

                </div>

                <button
                    type="button"
                    className="bg-[#38bdf8] hover:bg-[#7dd3fc] text-black font-semibold rounded-xl px-4 py-2"
                    onClick={() =>
                        refresh().catch(
                            (
                                error
                            ) =>
                                setErr(
                                    financeErrorMessage(error, t("expensesPage.messages.loadFailed"))
                                )
                        )
                    }
                    disabled={
                        busy
                    }
                >
                    {t(
                        "expensesPage.actions.filter"
                    )}
                </button>

                <div className="ml-auto text-white/80">

                    {t(
                        "expensesPage.summary.rangeTotal"
                    )}
                    :{" "}

                    <span className="font-semibold">
                        {money(
                            total
                        )}
                    </span>

                </div>

            </div>

            {/* RESUMEN */}

            <div className="finance-metrics grid gap-3">

                <div className="rounded-2xl border border-gray-800/50 bg-[#101010] p-4 sm:p-5">

                    <div className="text-xs text-white/60">
                        {t(
                            "expensesPage.summary.totalExpenses"
                        )}
                    </div>

                    <div className="text-2xl font-bold">
                        {money(
                            totals.all
                        )}
                    </div>

                </div>

                <div className="rounded-2xl border border-gray-800/50 bg-[#101010] p-4 sm:p-5">

                    <div className="text-xs text-white/60">
                        {t(
                            "expensesPage.summary.manualExpenses"
                        )}
                    </div>

                    <div className="text-2xl font-bold">
                        {money(
                            totals.manual
                        )}
                    </div>

                </div>

                <div className="rounded-2xl border border-gray-800/50 bg-[#101010] p-4 sm:p-5">

                    <div className="text-xs text-white/60">
                        {t(
                            "expensesPage.summary.payroll"
                        )}
                    </div>

                    <div className="text-2xl font-bold">
                        {money(
                            totals.payroll
                        )}
                    </div>

                </div>

                <div className="rounded-2xl border border-gray-800/50 bg-[#101010] p-4 sm:p-5">

                    <div className="text-xs text-white/60">
                        {t(
                            "expensesPage.summary.records"
                        )}
                    </div>

                    <div className="text-2xl font-bold">
                        {
                            totals.count
                        }
                    </div>

                </div>

            </div>

            {/* NUEVO GASTO */}

            <form
                onSubmit={
                    onCreate
                }
                className="expense-create rounded-2xl border border-gray-800/50 bg-[#101010] p-4 sm:p-5"
            >
                <div className="expense-form-heading"><h2 className="text-lg font-semibold">Nuevo gasto</h2><p className="mt-1 text-xs text-white/60">Completa el monto y la categoría. La referencia y la nota son opcionales.</p></div>

                <div className="min-w-0">

                    <div className="text-xs text-white/70">
                        {t(
                            "expensesPage.fields.date"
                        )}
                    </div>

                    <input
                        className="w-full bg-[#151515] border border-white/15 rounded-xl px-3 py-2"
                        type="date"
                        value={
                            dateYMD
                        }
                        onChange={(
                            event
                        ) =>
                            setDateYMD(
                                event
                                    .target
                                    .value
                            )
                        }
                    />

                </div>

                <div className="min-w-0">

                    <div className="text-xs text-white/70">
                        {t(
                            "expensesPage.fields.amount"
                        )}
                    </div>

                    <input
                        className="w-full bg-[#151515] border border-white/15 rounded-xl px-3 py-2"
                        placeholder="0.00"
                        value={
                            amount
                        }
                        onChange={(
                            event
                        ) =>
                            setAmount(
                                event
                                    .target
                                    .value
                            )
                        }
                    />

                </div>

                <div className="min-w-0">

                    <div className="text-xs text-white/70">
                        {t(
                            "expensesPage.fields.category"
                        )}
                    </div>

                    <select
                        className="w-full bg-[#151515] border border-white/15 rounded-xl px-3 py-2"
                        value={
                            categoryId
                        }
                        onChange={(
                            event
                        ) =>
                            setCategoryId(
                                event
                                    .target
                                    .value
                            )
                        }
                    >

                        {cats.map(
                            (
                                category
                            ) => (

                                <option
                                    key={
                                        category._id
                                    }
                                    value={
                                        category._id
                                    }
                                >
                                    {
                                        category.name
                                    }
                                </option>

                            )
                        )}

                    </select>

                </div>

                <div className="min-w-0">

                    <div className="text-xs text-white/70">
                        {t(
                            "expensesPage.fields.method"
                        )}
                    </div>

                    <select
                        className="w-full bg-[#151515] border border-white/15 rounded-xl px-3 py-2"
                        value={
                            paymentMethod
                        }
                        onChange={(
                            event
                        ) =>
                            setPaymentMethod(
                                event
                                    .target
                                    .value
                            )
                        }
                    >

                        <option value="cash">
                            {t(
                                "expensesPage.paymentMethods.cash"
                            )}
                        </option>

                        <option value="transfer">
                            {t(
                                "expensesPage.paymentMethods.transfer"
                            )}
                        </option>

                        <option value="card">
                            {t(
                                "expensesPage.paymentMethods.card"
                            )}
                        </option>

                        <option value="other">
                            {t(
                                "expensesPage.paymentMethods.other"
                            )}
                        </option>

                    </select>

                </div>

                <div className="min-w-0">

                    <div className="text-xs text-white/70">
                        {t(
                            "expensesPage.fields.reference"
                        )}
                    </div>

                    <input
                        className="w-full bg-[#151515] border border-white/15 rounded-xl px-3 py-2"
                        placeholder={
                            t(
                                "expensesPage.placeholders.reference"
                            )
                        }
                        value={
                            reference
                        }
                        onChange={(
                            event
                        ) =>
                            setReference(
                                event
                                    .target
                                    .value
                            )
                        }
                    />

                </div>

                <div className="expense-note min-w-0">

                    <div className="text-xs text-white/70">
                        {t(
                            "expensesPage.fields.note"
                        )}
                    </div>

                    <input
                        className="w-full bg-[#151515] border border-white/15 rounded-xl px-3 py-2"
                        placeholder={
                            t(
                                "expensesPage.placeholders.note"
                            )
                        }
                        value={
                            note
                        }
                        onChange={(
                            event
                        ) =>
                            setNote(
                                event
                                    .target
                                    .value
                            )
                        }
                    />

                </div>

                <div className="expense-save flex items-end">

                    <button
                        type="submit"
                        disabled={
                            busy ||
                            !amount ||
                            !categoryId
                        }
                        className="w-full bg-[#38bdf8] text-black rounded-xl px-4 py-3 font-semibold disabled:opacity-60"
                    >

                        {busy
                            ? t(
                                "expensesPage.actions.saving"
                            )
                            : t(
                                "expensesPage.actions.save"
                            )
                        }

                    </button>

                </div>

            </form>

            {/* TABLA */}
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Historial de gastos</h2><span className="text-xs text-white/60">{rows.length} registros en el período consultado</span></div>

            <div className="expense-list border border-gray-800/50 rounded-2xl overflow-x-auto">

                <div className="expense-list-header grid grid-cols-12 bg-white/5 px-4 py-3 text-xs font-semibold text-white/80">

                    <div className="col-span-2">
                        {t(
                            "expensesPage.table.date"
                        )}
                    </div>

                    <div className="col-span-2">
                        {t(
                            "expensesPage.table.type"
                        )}
                    </div>

                    <div className="col-span-2">
                        {t(
                            "expensesPage.table.category"
                        )}
                    </div>

                    <div className="col-span-2">
                        {t(
                            "expensesPage.table.note"
                        )}
                    </div>

                    <div className="col-span-1">
                        {t(
                            "expensesPage.table.reference"
                        )}
                    </div>

                    <div className="col-span-1">
                        {t(
                            "expensesPage.table.method"
                        )}
                    </div>

                    <div className="col-span-1 text-right">
                        {t(
                            "expensesPage.table.amount"
                        )}
                    </div>

                    <div className="col-span-1 text-right">
                        {t(
                            "expensesPage.table.action"
                        )}
                    </div>

                </div>

                {rows.map(
                    (
                        row
                    ) => {
                        const isPayroll =
                            row
                                ?.source
                                ?.type ===
                            "payroll";

                        return (
                            <div
                                key={
                                    row._id
                                }
                                className="expense-list-row grid grid-cols-12 gap-2 px-4 py-4 border-t border-white/10 items-center text-sm"
                            >

                                <div className="col-span-2">
                                    {
                                        row.dateYMD
                                    }
                                </div>

                                <div className="col-span-2">

                                    <span
                                        className={`px-2 py-1 rounded text-xs ${
                                            isPayroll
                                                ? "bg-blue-500/20 text-blue-300"
                                                : "bg-white/10 text-white/80"
                                        }`}
                                    >

                                        {isPayroll
                                            ? t(
                                                "expensesPage.sourceTypes.payroll"
                                            )
                                            : t(
                                                "expensesPage.sourceTypes.manual"
                                            )
                                        }

                                    </span>

                                </div>

                                <div className="col-span-2">
                                    {
                                        row
                                            .categoryId
                                            ?.name ||
                                        "-"
                                    }
                                </div>

                                <div className="col-span-2 text-white/70 break-words">
                                    {
                                        row.note ||
                                        "-"
                                    }
                                </div>

                                <div className="col-span-1 text-white/60 break-words">
                                    {
                                        row.reference ||
                                        "-"
                                    }
                                </div>

                                <div className="col-span-1 text-white/60">
                                    {getPaymentMethodLabel(
                                        row.paymentMethod
                                    )}
                                </div>

                                <div className="col-span-1 text-right font-medium">
                                    {money(
                                        row.amount
                                    )}
                                </div>

                                <div className="col-span-1 flex justify-end">

                                    {!isPayroll ? (

                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/20 text-red-300 hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                                            onClick={() =>
                                                openVoidModal(
                                                    row
                                                )
                                            }
                                            disabled={
                                                busy
                                            }
                                        >
                                            {t(
                                                "expensesPage.actions.void"
                                            )}
                                        </button>

                                    ) : (

                                        <span className="text-white/40 text-xs">
                                            {t(
                                                "expensesPage.table.fromPayroll"
                                            )}
                                        </span>

                                    )}

                                </div>

                            </div>
                        );
                    }
                )}

                {!rows.length ? (

                    <div className="px-3 py-4 text-white/60">
                        {t(
                            "expensesPage.empty"
                        )}
                    </div>

                ) : null}

            </div>

            {/* MODAL ANULAR */}

            <AnimatePresence>

                {confirmVoid.open && (

                    <motion.div
                        initial={{
                            opacity:
                                0,
                        }}
                        animate={{
                            opacity:
                                1,
                        }}
                        exit={{
                            opacity:
                                0,
                        }}
                        className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={
                            closeVoidModal
                        }
                    >

                        <motion.div
                            initial={{
                                scale:
                                    0.96,

                                opacity:
                                    0,

                                y:
                                    12,
                            }}
                            animate={{
                                scale:
                                    1,

                                opacity:
                                    1,

                                y:
                                    0,
                            }}
                            exit={{
                                scale:
                                    0.96,

                                opacity:
                                    0,

                                y:
                                    12,
                            }}
                            transition={{
                                duration:
                                    0.2,

                                ease:
                                    "easeOut",
                            }}
                            className="w-full max-w-md rounded-2xl border border-red-500/20 bg-gradient-to-br from-[#111111] to-[#0a0a0a] shadow-2xl overflow-hidden"
                            onClick={(
                                event
                            ) =>
                                event.stopPropagation()
                            }
                        >

                            <div className="p-5 border-b border-white/10">

                                <div className="flex items-start justify-between gap-3">

                                    <div className="flex items-center gap-3">

                                        <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-red-400" />
                                        </div>

                                        <div>

                                            <h3 className="text-lg font-semibold text-white">
                                                {t(
                                                    "expensesPage.voidModal.title"
                                                )}
                                            </h3>

                                            <p className="text-sm text-white/60 mt-1">
                                                {t(
                                                    "expensesPage.voidModal.description"
                                                )}
                                            </p>

                                        </div>

                                    </div>

                                    <button
                                        type="button"
                                        onClick={
                                            closeVoidModal
                                        }
                                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                                        aria-label={
                                            t(
                                                "common.close"
                                            )
                                        }
                                    >
                                        <X className="w-5 h-5 text-white/60" />
                                    </button>

                                </div>

                            </div>

                            <div className="p-5">

                                <div className="rounded-2xl border border-gray-800/50 bg-[#101010] p-4 sm:p-5 space-y-2">

                                    <div className="flex items-center justify-between gap-4">

                                        <span className="text-sm text-white/60">
                                            {t(
                                                "expensesPage.fields.date"
                                            )}
                                        </span>

                                        <span className="text-sm font-medium text-white">
                                            {
                                                confirmVoid
                                                    .row
                                                    ?.dateYMD ||
                                                "-"
                                            }
                                        </span>

                                    </div>

                                    <div className="flex items-center justify-between gap-4">

                                        <span className="text-sm text-white/60">
                                            {t(
                                                "expensesPage.fields.amount"
                                            )}
                                        </span>

                                        <span className="text-sm font-medium text-white">
                                            {money(
                                                confirmVoid
                                                    .row
                                                    ?.amount
                                            )}
                                        </span>

                                    </div>

                                    <div className="flex items-center justify-between gap-4">

                                        <span className="text-sm text-white/60">
                                            {t(
                                                "expensesPage.fields.category"
                                            )}
                                        </span>

                                        <span className="text-sm font-medium text-white text-right">
                                            {
                                                confirmVoid
                                                    .row
                                                    ?.categoryId
                                                    ?.name ||
                                                "-"
                                            }
                                        </span>

                                    </div>

                                    <div className="flex items-start justify-between gap-4">

                                        <span className="text-sm text-white/60">
                                            {t(
                                                "expensesPage.fields.note"
                                            )}
                                        </span>

                                        <span className="text-sm font-medium text-white text-right">
                                            {
                                                confirmVoid
                                                    .row
                                                    ?.note ||
                                                "-"
                                            }
                                        </span>

                                    </div>

                                </div>

                                <p className="text-sm text-red-300/90 mt-4">
                                    {t(
                                        "expensesPage.voidModal.warning"
                                    )}
                                </p>

                                <div className="flex gap-3 mt-6">

                                    <button
                                        type="button"
                                        onClick={
                                            closeVoidModal
                                        }
                                        className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all"
                                    >
                                        {t(
                                            "common.cancel"
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={
                                            confirmVoidExpense
                                        }
                                        disabled={
                                            busy
                                        }
                                        className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all disabled:opacity-60"
                                    >

                                        {busy
                                            ? t(
                                                "expensesPage.actions.voiding"
                                            )
                                            : t(
                                                "expensesPage.actions.confirmVoid"
                                            )
                                        }

                                    </button>

                                </div>

                            </div>

                        </motion.div>

                    </motion.div>

                )}

            </AnimatePresence>

        </section>
    );
}