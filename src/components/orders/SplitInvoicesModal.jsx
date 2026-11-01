// SplitInvoicesModal.jsx

import React, {
    useMemo,
} from "react";

import {
    useTranslation,
} from "react-i18next";

import useTenant from "../../hooks/useTenant";

import {
    formatMoney,
    getTenantLocalization,
} from "../../lib/localization";


export default function SplitInvoicesModal({
                                               open,
                                               onClose,
                                               splitBills,
                                               onPrint,
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


    const accounts =
        useMemo(
            () =>
                splitBills ||
                [],
            [
                splitBills,
            ]
        );


    /*
     * Las cuentas generadas internamente siguen
     * guardándose como:
     *
     * Cuenta 1
     * Cuenta 2
     *
     * Solo traducimos su representación visual.
     */
    const getAccountDisplayName = (
        account,
        index
    ) => {
        const rawName =
            String(
                account?.accountName ||
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


    if (
        !open
    ) {
        return null;
    }


    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">

            <div className="w-full max-w-3xl rounded-2xl bg-[#1f1f1f] border border-white/10 shadow-xl p-4">

                {/* HEADER */}

                <div className="flex items-start justify-between gap-4">

                    <div>

                        <h3 className="text-white font-semibold text-lg">

                            {t(
                                "splitBilling.invoices.title"
                            )}

                        </h3>


                        <p className="text-xs text-gray-400 mt-1">

                            {t(
                                "splitBilling.invoices.description"
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


                {/* CUENTAS */}

                <div className="mt-4 grid gap-3">

                    {accounts.map(
                        (
                            bill,
                            index
                        ) => {
                            const name =
                                getAccountDisplayName(
                                    bill,
                                    index
                                );


                            const subtotal =
                                Number(
                                    bill
                                        .subtotal ??
                                    0
                                ) ||
                                (
                                    bill
                                        .items ||
                                    []
                                ).reduce(
                                    (
                                        accumulator,
                                        item
                                    ) =>
                                        accumulator +
                                        Number(
                                            item
                                                .lineTotal ??
                                            item
                                                .total ??
                                            0
                                        ),
                                    0
                                );


                            const remainingItemsCount =
                                Math.max(
                                    0,
                                    (
                                        bill
                                            .items ||
                                        []
                                    ).length -
                                    3
                                );


                            return (
                                <div
                                    key={
                                        bill.accountId ||
                                        bill.id ||
                                        index
                                    }

                                    className="rounded-xl border border-white/10 bg-white/5 p-3"
                                >

                                    <div className="flex items-center justify-between">

                                        <div className="text-sm text-white font-semibold">

                                            {name}

                                        </div>


                                        <div className="text-sm text-white font-semibold">

                                            {money(
                                                subtotal
                                            )}

                                        </div>

                                    </div>


                                    <div className="mt-2 space-y-1">

                                        {(
                                            bill.items ||
                                            []
                                        )
                                            .slice(
                                                0,
                                                3
                                            )
                                            .map(
                                                (
                                                    item,
                                                    itemIndex
                                                ) => (

                                                    <div
                                                        key={
                                                            itemIndex
                                                        }

                                                        className="flex items-center justify-between text-xs text-gray-200"
                                                    >

                                                        <span className="truncate">

                                                            {item.name}{" "}
                                                            x
                                                            {item.qty}

                                                        </span>


                                                        <span>

                                                            {money(
                                                                item
                                                                    .lineTotal ??
                                                                item
                                                                    .total ??
                                                                0
                                                            )}

                                                        </span>

                                                    </div>

                                                )
                                            )}


                                        {remainingItemsCount >
                                            0 && (

                                                <div className="text-xs text-gray-400 mt-1">

                                                    {t(
                                                        "splitBilling.invoices.moreItems",
                                                        {
                                                            count:
                                                            remainingItemsCount,
                                                        }
                                                    )}

                                                </div>

                                            )}

                                    </div>


                                    <div className="mt-3 flex justify-end">

                                        <button
                                            type="button"

                                            className="rounded-lg px-3 py-2 text-xs font-semibold text-black bg-slate-200 hover:bg-slate-100"

                                            onClick={() =>
                                                onPrint(
                                                    bill
                                                )
                                            }
                                        >

                                            {t(
                                                "splitBilling.invoices.viewPrint"
                                            )}

                                        </button>

                                    </div>

                                </div>
                            );
                        }
                    )}

                </div>


                {/* FOOTER */}

                <div className="mt-4 flex justify-end">

                    <button
                        type="button"

                        onClick={
                            onClose
                        }

                        className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
                    >

                        {t(
                            "splitBilling.close"
                        )}

                    </button>

                </div>

            </div>

        </div>
    );
}