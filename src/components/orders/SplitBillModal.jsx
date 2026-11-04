import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useTranslation,
} from "react-i18next";

import useTenant from "../../hooks/useTenant";

import {
    formatMoney,
    getTenantLocalization,
} from "../../lib/localization";


/*
 * Intenta detectar estructura típica:
 * item.price
 * item.qty
 * item.quantity
 * item.total
 * etc.
 */

function getItemQty(
    item
) {
    return Number(
        item.qty ??
        item.quantity ??
        1
    );
}


function getItemPrice(
    item
) {
    const price =
        item.unitPrice ??
        item.price ??
        item
            ?.dish
            ?.price;


    if (
        price !=
        null
    ) {
        return Number(
            price
        );
    }


    const quantity =
        getItemQty(
            item
        );


    const total =
        item.total ??
        item.amount;


    if (
        total !=
        null &&
        quantity
    ) {
        return (
            Number(
                total
            ) /
            Number(
                quantity
            )
        );
    }


    return 0;
}


function getItemName(
    item
) {
    return (
        item.dishName ??
        item
            ?.dish
            ?.name ??
        item.name ??
        item.title ??
        item.productName ??
        "Item"
    );
}


function getItemId(
    item,
    index
) {
    /*
     * Prioriza IDs estables para que
     * allocations no se rompa.
     */
    return (
        item._id ??
        item.id ??
        item.dishId ??
        item
            ?.dish
            ?._id ??
        item.sku ??
        `${index}`
    );
}


/*
 * IMPORTANTE:
 *
 * Los nombres internos siguen siendo
 * "Cuenta 1", "Cuenta 2".
 *
 * No dependen del idioma seleccionado.
 */
const DEFAULT_ACCOUNTS = [
    {
        id:
            "acc1",

        name:
            "Cuenta 1",
    },

    {
        id:
            "acc2",

        name:
            "Cuenta 2",
    },
];


export default function SplitBillModal({
                                           open = true,
                                           order,
                                           onClose,
                                           onSave,
                                       }) {
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


    /*
     * ==========================================
     * ITEMS
     * ==========================================
     */

    const items =
        useMemo(
            () => {
                const raw =
                    order?.items ||
                    order?.orderItems ||
                    [];


                return raw.map(
                    (
                        item,
                        index
                    ) => {
                        const id =
                            getItemId(
                                item,
                                index
                            );


                        const qty =
                            getItemQty(
                                item
                            );


                        const price =
                            getItemPrice(
                                item
                            );


                        return {
                            _raw:
                            item,

                            id,

                            name:
                                getItemName(
                                    item
                                ),

                            qty,

                            price,
                        };
                    }
                );
            },
            [
                order,
            ]
        );


    /*
     * ==========================================
     * CUENTAS
     * ==========================================
     */

    const [
        accounts,
        setAccounts,
    ] =
        useState(
            DEFAULT_ACCOUNTS
        );


    const [
        activeAccId,
        setActiveAccId,
    ] =
        useState(
            "acc1"
        );


    /*
     * allocations[itemId][accId]
     * =
     * cantidad asignada
     */
    const [
        allocations,
        setAllocations,
    ] =
        useState(
            {}
        );


    /*
     * Inicialmente todo va a Cuenta 1.
     */
    useEffect(
        () => {
            const initial =
                {};


            for (
                const item
                of items
                ) {
                initial[
                    item.id
                    ] = {
                    acc1:
                    item.qty,
                };
            }


            setAllocations(
                initial
            );
        },
        [
            items,
        ]
    );


    /*
     * Cantidad restante por producto.
     */
    const remainingByItem =
        useMemo(
            () => {
                const remaining =
                    {};


                for (
                    const item
                    of items
                    ) {
                    const map =
                        allocations[
                            item.id
                            ] ||
                        {};


                    const used =
                        Object
                            .values(
                                map
                            )
                            .reduce(
                                (
                                    accumulator,
                                    value
                                ) =>
                                    accumulator +
                                    Number(
                                        value ||
                                        0
                                    ),
                                0
                            );


                    remaining[
                        item.id
                        ] =
                        Math.max(
                            0,
                            item.qty -
                            used
                        );
                }


                return remaining;
            },
            [
                items,
                allocations,
            ]
        );


    /*
     * Totales por cuenta.
     */
    const totalsByAcc =
        useMemo(
            () => {
                const totals =
                    {};


                for (
                    const account
                    of accounts
                    ) {
                    totals[
                        account.id
                        ] =
                        0;
                }


                for (
                    const item
                    of items
                    ) {
                    const map =
                        allocations[
                            item.id
                            ] ||
                        {};


                    for (
                        const accountId
                        of Object.keys(
                        map
                    )
                        ) {
                        const quantity =
                            Number(
                                map[
                                    accountId
                                    ] ||
                                0
                            );


                        if (
                            !quantity
                        ) {
                            continue;
                        }


                        totals[
                            accountId
                            ] =
                            (
                                totals[
                                    accountId
                                    ] ||
                                0
                            ) +
                            item.price *
                            quantity;
                    }
                }


                return totals;
            },
            [
                items,
                accounts,
                allocations,
            ]
        );


    const grandTotal =
        useMemo(
            () =>
                Object
                    .values(
                        totalsByAcc
                    )
                    .reduce(
                        (
                            accumulator,
                            value
                        ) =>
                            accumulator +
                            Number(
                                value ||
                                0
                            ),
                        0
                    ),
            [
                totalsByAcc,
            ]
        );


    /*
     * ==========================================
     * DISPLAY NAME DE CUENTAS
     * ==========================================
     *
     * Internamente:
     * Cuenta 1
     *
     * UI EN:
     * Account 1
     *
     * UI ES:
     * Cuenta 1
     */

    const getAccountDisplayName = (
        account,
        index = 0
    ) => {
        const rawName =
            String(
                account?.name ||
                ""
            ).trim();


        const generatedMatch =
            rawName.match(
                /^(?:cuenta|account)\s+(\d+)$/i
            );


        if (
            generatedMatch
        ) {
            return t(
                "splitBilling.accountNumber",
                {
                    number:
                        Number(
                            generatedMatch[1]
                        ),
                }
            );
        }


        if (
            rawName
        ) {
            return rawName;
        }


        return t(
            "splitBilling.accountNumber",
            {
                number:
                    index +
                    1,
            }
        );
    };


    /*
     * Todos los hooks ya fueron ejecutados.
     * Ahora sí podemos retornar null.
     */
    if (
        !open
    ) {
        return null;
    }


    /*
     * ==========================================
     * AÑADIR CUENTA
     * ==========================================
     */

    const addAccount =
        () => {
            const next =
                accounts.length +
                1;


            const id =
                `acc${next}`;


            /*
             * El nombre interno continúa en español
             * para mantener compatibilidad.
             */
            setAccounts(
                (
                    previous
                ) => [
                    ...previous,

                    {
                        id,

                        name:
                            `Cuenta ${next}`,
                    },
                ]
            );


            setActiveAccId(
                id
            );
        };


    /*
     * ==========================================
     * ASIGNACIONES
     * ==========================================
     */

    const setAlloc = (
        itemId,
        accountId,
        value
    ) => {
        const numericValue =
            Math.max(
                0,
                Math.floor(
                    Number(
                        value ||
                        0
                    )
                )
            );


        setAllocations(
            (
                previous
            ) => {
                const current =
                    previous[
                        itemId
                        ] ||
                    {};


                const item =
                    items.find(
                        (
                            candidate
                        ) =>
                            candidate.id ===
                            itemId
                    );


                const maxQty =
                    item?.qty ??
                    0;


                const others =
                    Object
                        .keys(
                            current
                        )
                        .filter(
                            (
                                key
                            ) =>
                                key !==
                                accountId
                        )
                        .reduce(
                            (
                                accumulator,
                                key
                            ) =>
                                accumulator +
                                Number(
                                    current[
                                        key
                                        ] ||
                                    0
                                ),
                            0
                        );


                const allowed =
                    Math.max(
                        0,
                        maxQty -
                        others
                    );


                const finalValue =
                    Math.min(
                        numericValue,
                        allowed
                    );


                const updated = {
                    ...current,

                    [
                        accountId
                        ]:
                    finalValue,
                };


                Object
                    .keys(
                        updated
                    )
                    .forEach(
                        (
                            key
                        ) => {
                            if (
                                !updated[
                                    key
                                    ]
                            ) {
                                delete updated[
                                    key
                                    ];
                            }
                        }
                    );


                return {
                    ...previous,

                    [
                        itemId
                        ]:
                    updated,
                };
            }
        );
    };


    /*
     * ==========================================
     * DIVIDIR IGUAL
     * ==========================================
     */

    const splitEqualSimple =
        () => {
            setAllocations(
                () => {
                    const result =
                        {};


                    const accountCount =
                        accounts.length;


                    for (
                        const item
                        of items
                        ) {
                        const base =
                            Math.floor(
                                item.qty /
                                accountCount
                            );


                        let remainder =
                            item.qty %
                            accountCount;


                        const map =
                            {};


                        accounts.forEach(
                            (
                                account
                            ) => {
                                map[
                                    account.id
                                    ] =
                                    base +
                                    (
                                        remainder >
                                        0
                                            ? 1
                                            : 0
                                    );


                                if (
                                    remainder >
                                    0
                                ) {
                                    remainder--;
                                }
                            }
                        );


                        Object
                            .keys(
                                map
                            )
                            .forEach(
                                (
                                    key
                                ) => {
                                    if (
                                        !map[
                                            key
                                            ]
                                    ) {
                                        delete map[
                                            key
                                            ];
                                    }
                                }
                            );


                        result[
                            item.id
                            ] =
                            map;
                    }


                    return result;
                }
            );
        };


    /*
     * ==========================================
     * VALIDAR
     * ==========================================
     */

    const validateAllAllocated =
        () => {
            for (
                const item
                of items
                ) {
                const map =
                    allocations[
                        item.id
                        ] ||
                    {};


                const used =
                    Object
                        .values(
                            map
                        )
                        .reduce(
                            (
                                accumulator,
                                value
                            ) =>
                                accumulator +
                                Number(
                                    value ||
                                    0
                                ),
                            0
                        );


                if (
                    used !==
                    item.qty
                ) {
                    return false;
                }
            }


            return true;
        };


    /*
     * ==========================================
     * GUARDAR
     * ==========================================
     */

    const handleSave =
        () => {
            if (
                !validateAllAllocated()
            ) {
                window.alert(
                    t(
                        "splitBilling.validation.allocateAll"
                    )
                );

                return;
            }


            /*
             * Construye splitBills
             * manteniendo exactamente
             * la estructura esperada.
             */
            const splitBills =
                accounts.map(
                    (
                        account
                    ) => {
                        const lineItems =
                            [];


                        for (
                            const item
                            of items
                            ) {
                            const quantity =
                                Number(
                                    (
                                        allocations[
                                            item.id
                                            ] ||
                                        {}
                                    )[
                                        account.id
                                        ] ||
                                    0
                                );


                            if (
                                !quantity
                            ) {
                                continue;
                            }


                            lineItems.push({
                                itemId:
                                item.id,

                                name:
                                item.name,

                                qty:
                                quantity,

                                unitPrice:
                                item.price,

                                lineTotal:
                                    item.price *
                                    quantity,
                            });
                        }


                        const subtotal =
                            lineItems.reduce(
                                (
                                    accumulator,
                                    line
                                ) =>
                                    accumulator +
                                    Number(
                                        line
                                            .lineTotal ||
                                        0
                                    ),
                                0
                            );


                        return {
                            accountId:
                            account.id,

                            /*
                             * Se conserva el nombre interno.
                             */
                            accountName:
                            account.name,

                            items:
                            lineItems,

                            subtotal,

                            tax:
                                0,

                            tip:
                                0,

                            total:
                            subtotal,

                            paid:
                                false,
                        };
                    }
                );


            onSave?.({
                orderId:
                order?._id,

                accounts,

                allocations,

                totals: {
                    byAccount:
                    totalsByAcc,

                    grandTotal,
                },

                splitBills,
            });
        };


    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">

            <div className="w-full max-w-5xl rounded-2xl bg-[#1f1f1f] border border-white/10 shadow-xl p-4">

                {/* ======================================
                    HEADER
                ====================================== */}

                <div className="flex items-start justify-between gap-4">

                    <div>

                        <h3 className="text-white font-semibold text-lg">

                            {t(
                                "splitBilling.title"
                            )}

                        </h3>


                        <p className="text-xs text-gray-400 mt-1">

                            {t(
                                "splitBilling.description"
                            )}

                        </p>

                    </div>


                    <button
                        type="button"

                        onClick={
                            onClose
                        }

                        className="text-gray-300 hover:text-white text-sm"

                        aria-label={
                            t(
                                "splitBilling.close"
                            )
                        }
                    >
                        X
                    </button>

                </div>


                {/* ======================================
                    ACCIONES RÁPIDAS
                ====================================== */}

                <div className="mt-4 flex flex-wrap gap-2">

                    <button
                        type="button"

                        onClick={
                            splitEqualSimple
                        }

                        className="rounded-lg bg-white/10 hover:bg-white/15 text-gray-100 text-xs px-3 py-2"
                    >

                        {t(
                            "splitBilling.splitEqually"
                        )}

                    </button>


                    <button
                        type="button"

                        disabled

                        className="rounded-lg bg-white/5 text-gray-500 text-xs px-3 py-2 cursor-not-allowed"

                        title={
                            t(
                                "splitBilling.splitByAmountTooltip"
                            )
                        }
                    >

                        {t(
                            "splitBilling.splitByAmountComingSoon"
                        )}

                    </button>

                </div>


                {/* ======================================
                    BODY
                ====================================== */}

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* ==================================
                        ITEMS DEL PEDIDO
                    ================================== */}

                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">

                        <div className="flex items-center justify-between">

                            <h4 className="text-sm font-semibold text-white">

                                {t(
                                    "splitBilling.orderItems"
                                )}

                            </h4>


                            <div className="text-xs text-gray-400">

                                {t(
                                    "splitBilling.totalAllocated"
                                )}:{" "}

                                {money(
                                    grandTotal
                                )}

                            </div>

                        </div>


                        <div className="mt-3 space-y-2 max-h-[420px] overflow-auto pr-1">

                            {items.map(
                                (
                                    item
                                ) => (

                                    <div
                                        key={
                                            item.id
                                        }

                                        className="rounded-lg border border-white/10 bg-white/5 p-3"
                                    >

                                        <div className="flex items-start justify-between gap-3">

                                            <div>

                                                <div className="text-sm text-white font-medium">

                                                    {item.name}

                                                </div>


                                                <div className="text-xs text-gray-400 mt-1">

                                                    {t(
                                                        "splitBilling.quantity"
                                                    )}:{" "}

                                                    {item.qty}

                                                    {" • "}

                                                    {t(
                                                        "splitBilling.unitPrice"
                                                    )}:{" "}

                                                    {money(
                                                        item.price
                                                    )}

                                                </div>

                                            </div>


                                            <div className="text-xs text-gray-400">

                                                {t(
                                                    "splitBilling.remaining"
                                                )}:{" "}

                                                {remainingByItem[
                                                        item.id
                                                        ] ??
                                                    0
                                                }

                                            </div>

                                        </div>


                                        {/* ASIGNACIONES */}

                                        <div className="mt-3 grid grid-cols-2 gap-2">

                                            {accounts.map(
                                                (
                                                    account,
                                                    accountIndex
                                                ) => {
                                                    const value =
                                                        (
                                                            allocations[
                                                                item.id
                                                                ] ||
                                                            {}
                                                        )[
                                                            account.id
                                                            ] ||
                                                        0;


                                                    return (
                                                        <label
                                                            key={
                                                                account.id
                                                            }

                                                            className="text-xs text-gray-300"
                                                        >

                                                            {getAccountDisplayName(
                                                                account,
                                                                accountIndex
                                                            )}


                                                            <input
                                                                type="number"

                                                                min="0"

                                                                step="1"

                                                                value={
                                                                    value
                                                                }

                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setAlloc(
                                                                        item.id,
                                                                        account.id,
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                }

                                                                className="mt-1 w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                                                            />

                                                        </label>
                                                    );
                                                }
                                            )}

                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    </div>


                    {/* ==================================
                        CUENTAS
                    ================================== */}

                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">

                        <div className="flex items-center justify-between gap-2">

                            <h4 className="text-sm font-semibold text-white">

                                {t(
                                    "splitBilling.accounts"
                                )}

                            </h4>


                            <button
                                type="button"

                                onClick={
                                    addAccount
                                }

                                className="rounded-lg bg-white/10 hover:bg-white/15 text-gray-100 text-xs px-3 py-2"
                            >

                                +{" "}

                                {t(
                                    "splitBilling.add"
                                )}

                            </button>

                        </div>


                        {/* TABS */}

                        <div className="mt-3 flex flex-wrap gap-2">

                            {accounts.map(
                                (
                                    account,
                                    accountIndex
                                ) => (

                                    <button
                                        key={
                                            account.id
                                        }

                                        type="button"

                                        onClick={() =>
                                            setActiveAccId(
                                                account.id
                                            )
                                        }

                                        className={`rounded-lg px-3 py-2 text-xs border transition ${
                                            activeAccId ===
                                            account.id
                                                ? "bg-white/15 border-white/20 text-white"
                                                : "bg-transparent border-white/10 text-gray-300 hover:bg-white/10"
                                        }`}
                                    >

                                        {getAccountDisplayName(
                                            account,
                                            accountIndex
                                        )}

                                    </button>

                                )
                            )}

                        </div>


                        {/* DETALLE CUENTA ACTIVA */}

                        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">

                            <div className="flex items-center justify-between">

                                <div className="text-sm text-white font-semibold">

                                    {(() => {
                                        const activeIndex =
                                            accounts.findIndex(
                                                (
                                                    account
                                                ) =>
                                                    account.id ===
                                                    activeAccId
                                            );


                                        const activeAccount =
                                            accounts[
                                                activeIndex
                                                ];


                                        return activeAccount
                                            ? getAccountDisplayName(
                                                activeAccount,
                                                activeIndex
                                            )
                                            : "";
                                    })()}

                                </div>


                                <div className="text-sm text-white">

                                    {money(
                                        totalsByAcc[
                                            activeAccId
                                            ] ||
                                        0
                                    )}

                                </div>

                            </div>


                            <div className="mt-3 space-y-2 max-h-[320px] overflow-auto pr-1">

                                {items
                                    .map(
                                        (
                                            item
                                        ) => {
                                            const quantity =
                                                Number(
                                                    (
                                                        allocations[
                                                            item.id
                                                            ] ||
                                                        {}
                                                    )[
                                                        activeAccId
                                                        ] ||
                                                    0
                                                );


                                            if (
                                                !quantity
                                            ) {
                                                return null;
                                            }


                                            return (
                                                <div
                                                    key={
                                                        item.id
                                                    }

                                                    className="flex items-center justify-between text-xs text-gray-200"
                                                >

                                                    <div className="truncate">

                                                        {item.name}{" "}

                                                        <span className="text-gray-400">

                                                            x
                                                            {quantity}

                                                        </span>

                                                    </div>


                                                    <div>

                                                        {money(
                                                            item.price *
                                                            quantity
                                                        )}

                                                    </div>

                                                </div>
                                            );
                                        }
                                    )
                                    .filter(
                                        Boolean
                                    )}


                                {!items.some(
                                    (
                                        item
                                    ) =>
                                        Number(
                                            (
                                                allocations[
                                                    item.id
                                                    ] ||
                                                {}
                                            )[
                                                activeAccId
                                                ] ||
                                            0
                                        ) >
                                        0
                                ) && (

                                    <div className="text-xs text-gray-400">

                                        {t(
                                            "splitBilling.noItemsAssigned"
                                        )}

                                    </div>

                                )}

                            </div>


                            <div className="mt-4 border-t border-white/10 pt-3 flex items-center justify-between">

                                <div className="text-xs text-gray-400">

                                    {t(
                                        "splitBilling.subtotal"
                                    )}

                                </div>


                                <div className="text-sm text-white">

                                    {money(
                                        totalsByAcc[
                                            activeAccId
                                            ] ||
                                        0
                                    )}

                                </div>

                            </div>

                        </div>


                        <p className="mt-3 text-[11px] text-gray-500">

                            {t(
                                "splitBilling.versionNote"
                            )}

                        </p>

                    </div>

                </div>


                {/* ======================================
                    FOOTER
                ====================================== */}

                <div className="mt-4 flex gap-2">

                    <button
                        type="button"

                        onClick={
                            onClose
                        }

                        className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
                    >

                        {t(
                            "common.cancel"
                        )}

                    </button>


                    <button
                        type="button"

                        onClick={
                            handleSave
                        }

                        className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-black bg-slate-200 hover:bg-slate-100"
                    >

                        {t(
                            "common.save"
                        )}

                    </button>

                </div>

            </div>

        </div>
    );
}