import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useTranslation,
} from "react-i18next";

import {
    listPayrollRuns,
    createPayrollRun,
    postPayrollRun,
} from "../../lib/adminFinanceApi";

import useTenant from "../../hooks/useTenant";

import {
    formatMoney,
    getTenantLocalization,
    getTodayYMD,
} from "../../lib/localization";


function toNumber(value) {
    const number =
        Number(
            String(
                value ??
                ""
            )
                .replace(
                    /,/g,
                    ""
                )
                .trim()
        );

    return Number.isFinite(
        number
    )
        ? number
        : 0;
}


export default function PayrollRuns() {
    const {
        t,
    } =
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


    const todayYMD =
        () =>
            getTodayYMD(
                localization
            );


    const [
        rows,
        setRows,
    ] =
        useState(
            []
        );


    const [
        err,
        setErr,
    ] =
        useState(
            ""
        );


    const [
        busy,
        setBusy,
    ] =
        useState(
            false
        );


    const [
        periodFromYMD,
        setPeriodFromYMD,
    ] =
        useState(
            () =>
                todayYMD()
        );


    const [
        periodToYMD,
        setPeriodToYMD,
    ] =
        useState(
            () =>
                todayYMD()
        );


    const [
        payDateYMD,
        setPayDateYMD,
    ] =
        useState(
            () =>
                todayYMD()
        );


    const [
        items,
        setItems,
    ] =
        useState([
            {
                employeeName:
                    "",

                roleName:
                    "",

                gross:
                    "",

                deductions:
                    "",

                note:
                    "",
            },
        ]);


    /*
     * ==========================================
     * CARGAR CORRIDAS
     * ==========================================
     */

    async function refresh() {
        setErr(
            ""
        );


        const response =
            await listPayrollRuns({
                from:
                periodFromYMD,

                to:
                periodToYMD,
            });


        setRows(
            response.data ||
            []
        );
    }


    useEffect(
        () => {
            refresh()
                .catch(
                    (
                        error
                    ) =>
                        setErr(
                            error.message
                        )
                );

            // eslint-disable-next-line react-hooks/exhaustive-deps
        },
        []
    );


    /*
     * ==========================================
     * TOTALES
     * ==========================================
     */

    const totals =
        useMemo(
            () => {
                let gross =
                    0;

                let deductions =
                    0;

                let net =
                    0;


                for (
                    const item
                    of items
                    ) {
                    const itemGross =
                        toNumber(
                            item.gross
                        );


                    const itemDeductions =
                        toNumber(
                            item.deductions
                        );


                    gross +=
                        itemGross;


                    deductions +=
                        itemDeductions;


                    net +=
                        Math.max(
                            0,
                            itemGross -
                            itemDeductions
                        );
                }


                return {
                    gross,
                    deductions,
                    net,
                };
            },
            [
                items,
            ]
        );


    /*
     * ==========================================
     * EMPLEADOS
     * ==========================================
     */

    function updateItem(
        index,
        patch
    ) {
        setItems(
            (
                previous
            ) =>
                previous.map(
                    (
                        item,
                        itemIndex
                    ) =>
                        itemIndex ===
                        index
                            ? {
                                ...item,

                                ...patch,
                            }
                            : item
                )
        );
    }


    function addRow() {
        setItems(
            (
                previous
            ) => [
                ...previous,

                {
                    employeeName:
                        "",

                    roleName:
                        "",

                    gross:
                        "",

                    deductions:
                        "",

                    note:
                        "",
                },
            ]
        );
    }


    function removeRow(
        index
    ) {
        setItems(
            (
                previous
            ) =>
                previous.filter(
                    (
                        _,
                        itemIndex
                    ) =>
                        itemIndex !==
                        index
                )
        );
    }


    /*
     * ==========================================
     * CREAR CORRIDA
     * ==========================================
     */

    async function onCreate(
        event
    ) {
        event.preventDefault();


        setBusy(
            true
        );


        setErr(
            ""
        );


        try {
            const payloadItems =
                items
                    .filter(
                        (
                            item
                        ) =>
                            String(
                                item.employeeName
                            ).trim()
                    )
                    .map(
                        (
                            item
                        ) => ({
                            employeeName:
                                String(
                                    item.employeeName
                                ).trim(),

                            roleName:
                                String(
                                    item.roleName ||
                                    ""
                                ).trim(),

                            gross:
                                String(
                                    item.gross ||
                                    ""
                                ).replace(
                                    /,/g,
                                    ""
                                ),

                            deductions:
                                String(
                                    item.deductions ||
                                    ""
                                ).replace(
                                    /,/g,
                                    ""
                                ),

                            note:
                                String(
                                    item.note ||
                                    ""
                                ).trim(),
                        })
                    );


            if (
                !payloadItems.length
            ) {
                setErr(
                    t(
                        "payrollRuns.messages.employeeRequired"
                    )
                );

                return;
            }


            await createPayrollRun({
                periodFromYMD,
                periodToYMD,
                payDateYMD,

                items:
                payloadItems,
            });


            setItems([
                {
                    employeeName:
                        "",

                    roleName:
                        "",

                    gross:
                        "",

                    deductions:
                        "",

                    note:
                        "",
                },
            ]);


            await refresh();

        } catch (
            error
            ) {
            setErr(
                error.message
            );

        } finally {
            setBusy(
                false
            );
        }
    }


    /*
     * ==========================================
     * POSTEAR CORRIDA
     * ==========================================
     */

    async function onPost(
        runId
    ) {
        if (
            !window.confirm(
                t(
                    "payrollRuns.confirmPost"
                )
            )
        ) {
            return;
        }


        setBusy(
            true
        );


        setErr(
            ""
        );


        try {
            await postPayrollRun(
                runId
            );


            await refresh();

        } catch (
            error
            ) {
            setErr(
                error.message
            );

        } finally {
            setBusy(
                false
            );
        }
    }


    /*
     * ==========================================
     * STATUS
     * ==========================================
     *
     * "posted" es un valor interno.
     * NO traducir.
     */

    const getStatusLabel = (
        status
    ) => {
        if (
            status ===
            "posted"
        ) {
            return t(
                "payrollRuns.status.posted"
            );
        }


        return t(
            "payrollRuns.status.draft"
        );
    };


    return (
        <section className="p-4 text-white">

            <h1 className="text-xl font-semibold">

                {t(
                    "payrollRuns.title"
                )}

            </h1>


            {err ? (

                <div className="mt-3 text-red-400">

                    {err}

                </div>

            ) : null}


            {/* ======================================
                NUEVA CORRIDA
            ====================================== */}

            <form
                onSubmit={
                    onCreate
                }

                className="mt-4 border border-white/10 rounded-xl p-3"
            >

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">

                    {/* DESDE */}

                    <div className="md:col-span-3">

                        <div className="text-xs text-white/70">

                            {t(
                                "payrollRuns.fields.from"
                            )}

                        </div>


                        <input
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2"

                            type="date"

                            value={
                                periodFromYMD
                            }

                            onChange={(
                                event
                            ) =>
                                setPeriodFromYMD(
                                    event
                                        .target
                                        .value
                                )
                            }
                        />

                    </div>


                    {/* HASTA */}

                    <div className="md:col-span-3">

                        <div className="text-xs text-white/70">

                            {t(
                                "payrollRuns.fields.to"
                            )}

                        </div>


                        <input
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2"

                            type="date"

                            value={
                                periodToYMD
                            }

                            onChange={(
                                event
                            ) =>
                                setPeriodToYMD(
                                    event
                                        .target
                                        .value
                                )
                            }
                        />

                    </div>


                    {/* FECHA DE PAGO */}

                    <div className="md:col-span-3">

                        <div className="text-xs text-white/70">

                            {t(
                                "payrollRuns.fields.payDate"
                            )}

                        </div>


                        <input
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2"

                            type="date"

                            value={
                                payDateYMD
                            }

                            onChange={(
                                event
                            ) =>
                                setPayDateYMD(
                                    event
                                        .target
                                        .value
                                )
                            }
                        />

                    </div>


                    {/* NETO */}

                    <div className="md:col-span-3 flex items-end justify-end">

                        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">

                            {t(
                                "payrollRuns.summary.net"
                            )}
                            :{" "}


                            <span className="ml-2 font-semibold text-white">

                                {money(
                                    totals.net
                                )}

                            </span>

                        </div>

                    </div>

                </div>


                {/* ======================================
                    EMPLEADOS
                ====================================== */}

                <div className="mt-4 border border-white/10 rounded-xl overflow-hidden">

                    <div className="grid grid-cols-12 gap-2 bg-white/5 px-3 py-2 text-sm text-white/80">

                        <div className="col-span-3 whitespace-nowrap">

                            {t(
                                "payrollRuns.table.employee"
                            )}

                        </div>


                        <div className="col-span-2 whitespace-nowrap">

                            {t(
                                "payrollRuns.table.role"
                            )}

                        </div>


                        <div className="col-span-2 text-right whitespace-nowrap">

                            {t(
                                "payrollRuns.table.gross"
                            )}

                        </div>


                        <div className="col-span-2 text-right whitespace-nowrap">

                            {t(
                                "payrollRuns.table.deductions"
                            )}

                        </div>


                        <div className="col-span-2 whitespace-nowrap">

                            {t(
                                "payrollRuns.table.note"
                            )}

                        </div>


                        <div className="col-span-1 text-right whitespace-nowrap">

                            {t(
                                "payrollRuns.table.action"
                            )}

                        </div>

                    </div>


                    {items.map(
                        (
                            item,
                            index
                        ) => (

                            <div
                                key={
                                    index
                                }

                                className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-white/10 items-center"
                            >

                                <input
                                    className="col-span-3 bg-black/40 border border-white/10 rounded-lg px-2 py-2"

                                    placeholder={
                                        t(
                                            "payrollRuns.placeholders.employeeName"
                                        )
                                    }

                                    value={
                                        item.employeeName
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        updateItem(
                                            index,
                                            {
                                                employeeName:
                                                event
                                                    .target
                                                    .value,
                                            }
                                        )
                                    }
                                />


                                <input
                                    className="col-span-2 bg-black/40 border border-white/10 rounded-lg px-2 py-2"

                                    placeholder={
                                        t(
                                            "payrollRuns.placeholders.role"
                                        )
                                    }

                                    value={
                                        item.roleName
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        updateItem(
                                            index,
                                            {
                                                roleName:
                                                event
                                                    .target
                                                    .value,
                                            }
                                        )
                                    }
                                />


                                <input
                                    className="col-span-2 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-right"

                                    placeholder="0.00"

                                    value={
                                        item.gross
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        updateItem(
                                            index,
                                            {
                                                gross:
                                                event
                                                    .target
                                                    .value,
                                            }
                                        )
                                    }
                                />


                                <input
                                    className="col-span-2 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-right"

                                    placeholder="0.00"

                                    value={
                                        item.deductions
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        updateItem(
                                            index,
                                            {
                                                deductions:
                                                event
                                                    .target
                                                    .value,
                                            }
                                        )
                                    }
                                />


                                <input
                                    className="col-span-2 bg-black/40 border border-white/10 rounded-lg px-2 py-2"

                                    placeholder={
                                        t(
                                            "payrollRuns.placeholders.optional"
                                        )
                                    }

                                    value={
                                        item.note
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        updateItem(
                                            index,
                                            {
                                                note:
                                                event
                                                    .target
                                                    .value,
                                            }
                                        )
                                    }
                                />


                                <div className="col-span-1 flex justify-end">

                                    <button
                                        type="button"

                                        className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"

                                        onClick={() =>
                                            removeRow(
                                                index
                                            )
                                        }

                                        disabled={
                                            items.length ===
                                            1
                                        }

                                        aria-label={
                                            t(
                                                "payrollRuns.actions.removeEmployee"
                                            )
                                        }

                                        title={
                                            t(
                                                "payrollRuns.actions.removeEmployee"
                                            )
                                        }
                                    >

                                        X

                                    </button>

                                </div>

                            </div>

                        )
                    )}

                </div>


                {/* ACCIONES */}

                <div className="mt-3 flex gap-2">

                    <button
                        type="button"

                        className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2"

                        onClick={
                            addRow
                        }
                    >

                        {t(
                            "payrollRuns.actions.addEmployee"
                        )}

                    </button>


                    <button
                        disabled={
                            busy
                        }

                        className="ml-auto bg-sky-500 text-black rounded-lg px-3 py-2 font-medium disabled:opacity-60"
                    >

                        {busy
                            ? t(
                                "payrollRuns.actions.saving"
                            )
                            : t(
                                "payrollRuns.actions.createRun"
                            )
                        }

                    </button>

                </div>

            </form>


            {/* ======================================
                CORRIDAS
            ====================================== */}

            <h2 className="mt-6 text-lg font-semibold">

                {t(
                    "payrollRuns.runs.title"
                )}

            </h2>


            <div className="mt-2 border border-white/10 rounded-xl overflow-hidden">

                <div className="grid grid-cols-12 gap-2 bg-white/5 px-3 py-2 text-sm text-white/80">

                    <div className="col-span-2 whitespace-nowrap">

                        {t(
                            "payrollRuns.runs.payDate"
                        )}

                    </div>


                    <div className="col-span-4 whitespace-nowrap">

                        {t(
                            "payrollRuns.runs.period"
                        )}

                    </div>


                    <div className="col-span-1 text-center whitespace-nowrap">

                        {t(
                            "payrollRuns.runs.employees"
                        )}

                    </div>


                    <div className="col-span-2 text-right whitespace-nowrap">

                        {t(
                            "payrollRuns.runs.net"
                        )}

                    </div>


                    <div className="col-span-2 whitespace-nowrap">

                        {t(
                            "payrollRuns.runs.status"
                        )}

                    </div>


                    <div className="col-span-1 text-right whitespace-nowrap">

                        {t(
                            "payrollRuns.runs.action"
                        )}

                    </div>

                </div>


                {rows.map(
                    (
                        run
                    ) => (

                        <div
                            key={
                                run._id
                            }

                            className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-white/10 items-center"
                        >

                            <div className="col-span-2">

                                {run.payDateYMD}

                            </div>


                            <div className="col-span-4">

                                {run.periodFromYMD}{" "}

                                {t(
                                    "payrollRuns.runs.periodSeparator"
                                )}{" "}

                                {run.periodToYMD}

                            </div>


                            <div className="col-span-1 text-center">

                                {run.items?.length || 0}

                            </div>


                            <div className="col-span-2 text-right">

                                {money(
                                    run
                                        .totals
                                        ?.net ||
                                    0
                                )}

                            </div>


                            <div className="col-span-2">

                                <span
                                    className={`px-2 py-1 rounded text-xs ${
                                        run.status ===
                                        "posted"
                                            ? "bg-green-500/20 text-green-300"
                                            : "bg-sky-500/20 text-sky-300"
                                    }`}
                                >

                                    {getStatusLabel(
                                        run.status
                                    )}

                                </span>

                            </div>


                            <div className="col-span-1 flex justify-end">

                                {run.status !==
                                "posted" ? (

                                    <button
                                        type="button"

                                        className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-60"

                                        onClick={() =>
                                            onPost(
                                                run._id
                                            )
                                        }

                                        disabled={
                                            busy
                                        }
                                    >

                                        {t(
                                            "payrollRuns.actions.post"
                                        )}

                                    </button>

                                ) : (

                                    <span className="text-white/50">
                                        OK
                                    </span>

                                )}

                            </div>

                        </div>

                    )
                )}


                {!rows.length ? (

                    <div className="px-3 py-4 text-white/60">

                        {t(
                            "payrollRuns.runs.empty"
                        )}

                    </div>

                ) : null}

            </div>

        </section>
    );
}