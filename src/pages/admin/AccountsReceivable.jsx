import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Search,
    X,
    CheckCircle,
    CreditCard,
    Wallet,
    Banknote,
    AlertTriangle,
    ChevronDown,
} from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import useTenant from "../../hooks/useTenant";

import {
    formatDateTime,
    formatMoney,
    getTenantLocalization,
} from "../../lib/localization";

const REGISTER_STORAGE_KEY = "deleonsoft_active_register_id";

const getActiveRegisterId = () => {
    try {
        return String(
            localStorage.getItem(
                REGISTER_STORAGE_KEY
            ) || ""
        )
            .trim()
            .toUpperCase();
    } catch {
        return "";
    }
};


/*
 * Valores internos. No traducir.
 */
const STATUS_LABEL_KEYS = {
    pending: "accountsReceivable.status.pending",
    partial: "accountsReceivable.status.partial",
    paid: "accountsReceivable.status.paid",
    void: "accountsReceivable.status.void",
};

const STATUS_FILTERS = [
    ["open", "accountsReceivable.filters.open"],
    ["pending", "accountsReceivable.filters.pending"],
    ["partial", "accountsReceivable.filters.partial"],
    ["paid", "accountsReceivable.filters.paid"],
    ["void", "accountsReceivable.filters.void"],
];

/*
 * value se envía al backend tal cual.
 * labelKey es solo para la UI.
 */
const PAYMENT_METHODS = [
    ["Efectivo", "accountsReceivable.paymentMethods.cash", Banknote],
    ["Tarjeta", "accountsReceivable.paymentMethods.card", CreditCard],
    ["Transferencia", "accountsReceivable.paymentMethods.transfer", Wallet],
    ["Otros", "accountsReceivable.paymentMethods.other", AlertTriangle],
];

const statusClass = {
    pending: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    partial: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    paid: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    void: "bg-red-500/10 text-red-300 border-red-500/30",
};

export default function AccountsReceivable() {
    const { t } = useTranslation();

    const queryClient = useQueryClient();

    const { tenantInfo } = useTenant();

    const localization = getTenantLocalization(tenantInfo);

    const money = (value) => formatMoney(value, localization);

    const formatDate = (value) =>
        formatDateTime(value, localization);

    const [status, setStatus] = useState("open");
    const [search, setSearch] = useState("");

    const [
        expandedCustomerKey,
        setExpandedCustomerKey,
    ] = useState("");

    const [paymentModal, setPaymentModal] = useState(null);
    const [amount, setAmount] = useState("");

    /*
     * Valor interno. No traducir.
     */
    const [method, setMethod] = useState("Efectivo");

    const [note, setNote] = useState("");

    const getStatusLabel = (value) => {
        const key = STATUS_LABEL_KEYS[value];

        return key
            ? t(key)
            : value || t("accountsReceivable.status.pending");
    };

    const getCustomerDisplayName = (value) => {
        const raw = String(value || "").trim();
        const normalized = raw.toLowerCase();

        if (
            ["consumidor final", "final consumer"].includes(
                normalized
            )
        ) {
            return t("customerInfo.finalConsumer");
        }

        return raw || t("accountsReceivable.customerFallback");
    };

    const queryParams = useMemo(
        () => ({
            status,
            q: search.trim(),
            limit: 500,
        }),
        [status, search]
    );
    const receivablesQuery = useQuery({
        queryKey: ["accounts-receivable", queryParams],

        queryFn: async () => {
            const res = await api.get(
                "/api/admin/accounts-receivable",
                {
                    params: queryParams,
                }
            );

            return res.data?.data || [];
        },

        staleTime: 10_000,
    });

    const summaryQuery = useQuery({
        queryKey: ["accounts-receivable-summary"],

        queryFn: async () => {
            const res = await api.get(
                "/api/admin/accounts-receivable/summary"
            );

            return res.data?.data || null;
        },

        staleTime: 10_000,
    });

    const rows = receivablesQuery.data || [];
    const summary = summaryQuery.data || {};
    const customerGroups = useMemo(() => {
        const groups = new Map();

        const asNumber = (value) => {
            const number = Number(value);

            return Number.isFinite(number)
                ? number
                : 0;
        };

        const getTimestamp = (row) => {
            const value =
                row?.dueDate ||
                row?.createdAt;

            if (!value) {
                return 0;
            }

            const timestamp =
                new Date(value).getTime();

            return Number.isFinite(timestamp)
                ? timestamp
                : 0;
        };

        for (const row of rows) {
            const populatedCustomer =
                row?.customerId &&
                typeof row.customerId === "object"
                    ? row.customerId
                    : null;

            const customerId = String(
                populatedCustomer?._id ||
                populatedCustomer?.id ||
                (
                    typeof row?.customerId === "string"
                        ? row.customerId
                        : ""
                ) ||
                ""
            ).trim();

            /*
             * Para el nombre fijo del cliente,
             * damos prioridad al Customer actual.
             *
             * Si no está poblado, usamos
             * el snapshot histórico.
             */
            const rawName = String(
                populatedCustomer?.name ||
                row?.customerSnapshot?.name ||
                ""
            ).trim();

            const rawPhone = String(
                populatedCustomer?.phone ||
                row?.customerSnapshot?.phone ||
                ""
            ).trim();

            const rawAddress = String(
                populatedCustomer?.address ||
                row?.customerSnapshot?.address ||
                ""
            ).trim();

            const fallbackKey = [
                rawName.toLowerCase(),
                rawPhone.toLowerCase(),
            ]
                .filter(Boolean)
                .join("|");

            const customerKey =
                customerId
                    ? `customer:${customerId}`
                    : `snapshot:${
                        fallbackKey ||
                        String(row?._id || "")
                    }`;

            if (!groups.has(customerKey)) {
                groups.set(
                    customerKey,
                    {
                        key:
                        customerKey,

                        customerId,

                        name:
                            getCustomerDisplayName(
                                rawName
                            ),

                        phone:
                            rawPhone ||
                            t(
                                "accountsReceivable.noPhone"
                            ),

                        address:
                        rawAddress,

                        accounts:
                            [],

                        originalAmount:
                            0,

                        paidAmount:
                            0,

                        balance:
                            0,

                        pendingCount:
                            0,

                        partialCount:
                            0,

                        paidCount:
                            0,

                        voidCount:
                            0,
                    }
                );
            }

            const group =
                groups.get(
                    customerKey
                );

            group.accounts.push(
                row
            );

            group.originalAmount +=
                asNumber(
                    row?.originalAmount
                );

            group.paidAmount +=
                asNumber(
                    row?.paidAmount
                );

            group.balance +=
                asNumber(
                    row?.balance
                );

            if (
                row?.status ===
                "pending"
            ) {
                group.pendingCount += 1;
            }

            if (
                row?.status ===
                "partial"
            ) {
                group.partialCount += 1;
            }

            if (
                row?.status ===
                "paid"
            ) {
                group.paidCount += 1;
            }

            if (
                row?.status ===
                "void"
            ) {
                group.voidCount += 1;
            }
        }

        return Array.from(
            groups.values()
        )
            .map(
                (group) => ({
                    ...group,

                    originalAmount:
                        Number(
                            group.originalAmount
                                .toFixed(2)
                        ),

                    paidAmount:
                        Number(
                            group.paidAmount
                                .toFixed(2)
                        ),

                    balance:
                        Number(
                            group.balance
                                .toFixed(2)
                        ),

                    /*
                     * Dentro del cliente mostramos
                     * primero las cuentas más recientes.
                     */
                    accounts:
                        [
                            ...group.accounts,
                        ].sort(
                            (
                                a,
                                b
                            ) =>
                                getTimestamp(
                                    b
                                ) -
                                getTimestamp(
                                    a
                                )
                        ),
                })
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.name.localeCompare(
                        b.name,
                        undefined,
                        {
                            sensitivity:
                                "base",
                        }
                    )
            );
    }, [
        rows,
        t,
    ]);

    const toggleCustomer = (
        customerKey
    ) => {
        setExpandedCustomerKey(
            (
                current
            ) =>
                current ===
                customerKey
                    ? ""
                    : customerKey
        );
    };

    const paymentMutation = useMutation({
        mutationFn: async () => {

            if (!paymentModal?._id) {
                throw new Error(
                    t(
                        "accountsReceivable.messages.noAccountSelected"
                    )
                );
            }
            const registerId =
                getActiveRegisterId();

            if (!registerId) {
                throw new Error(
                    t(
                        "accountsReceivable.messages.selectRegisterBeforePayment"
                    )
                );
            }

            const value = Number(
                String(amount || "").replace(/[^\d.-]/g, "")
            );

            if (!Number.isFinite(value) || value <= 0) {
                throw new Error(
                    t(
                        "accountsReceivable.messages.invalidAmount"
                    )
                );
            }
            const currentBalance =
                Number(
                    paymentModal?.balance || 0
                );

            if (
                Number.isFinite(currentBalance) &&
                value > currentBalance
            ) {
                throw new Error(
                    t(
                        "accountsReceivable.messages.paymentExceedsBalance",
                        {
                            amount:
                                money(
                                    currentBalance
                                ),
                        }
                    )
                );
            }

            const res = await api.post(
                `/api/admin/accounts-receivable/${paymentModal._id}/payments`,
                {
                    amount: value,

                    /*
                     * IMPORTANTE:
                     * Se envía:
                     *
                     * Efectivo
                     * Tarjeta
                     * Transferencia
                     * Otros
                     *
                     * NO Cash/Card/etc.
                     */
                    method,

                    registerId,

                    note,
                }
            );

            return res.data;
        },

        onSuccess: () => {
            enqueueSnackbar(
                t(
                    "accountsReceivable.messages.paymentSuccess"
                ),
                {
                    variant: "success",
                }
            );

            setPaymentModal(null);
            setAmount("");
            setMethod("Efectivo");
            setNote("");

            queryClient.invalidateQueries({
                queryKey: [
                    "accounts-receivable",
                ],
            });

            queryClient.invalidateQueries({
                queryKey: [
                    "accounts-receivable-summary",
                ],
            });

            queryClient.invalidateQueries({
                queryKey: [
                    "admin/cash-session",
                ],
            });

            queryClient.invalidateQueries({
                queryKey: [
                    "cash-session",
                ],
            });

            queryClient.invalidateQueries({
                queryKey: [
                    "accounts-receivable",
                    "cash-summary",
                ],
            });

            queryClient.invalidateQueries({
                queryKey: [
                    "admin/orders/reports",
                ],
            });
        },

        onError: (error) => {
            enqueueSnackbar(
                error?.response?.data?.message ||
                error?.message ||
                t(
                    "accountsReceivable.messages.paymentFailed"
                ),
                {
                    variant: "error",
                }
            );
        },
    });

    const openPaymentModal = (
        row,
        fullPayment = false
    ) => {
        setPaymentModal(row);

        setAmount(
            fullPayment
                ? String(
                    Number(
                        row.balance ||
                        0
                    ).toFixed(
                        2
                    )
                )
                : ""
        );

        setMethod("Efectivo");
        setNote("");
    };

    const renderReceivableActions = (
        row,
        mobile = false
    ) => {
        if (
            ![
                "pending",
                "partial",
            ].includes(
                row.status
            )
        ) {
            return (
                <span className="text-gray-500 text-sm">
                    {t(
                        "accountsReceivable.noActions"
                    )}
                </span>
            );
        }

        return (
            <div
                className={`flex gap-2 ${
                    mobile
                        ? "flex-col sm:flex-row"
                        : "justify-end flex-wrap"
                }`}
            >
                <button
                    type="button"

                    onClick={() =>
                        openPaymentModal(
                            row,
                            false
                        )
                    }

                    className={`rounded-lg bg-[#232323] hover:bg-[#2f2f2f] font-semibold transition-colors whitespace-nowrap ${
                        mobile
                            ? "w-full sm:w-auto px-3 py-2.5"
                            : "px-2.5 py-2 text-xs"
                    }`}
                >
                    {t(
                        "accountsReceivable.actions.partialPayment"
                    )}
                </button>

                <button
                    type="button"

                    onClick={() =>
                        openPaymentModal(
                            row,
                            true
                        )
                    }

                    className={`rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold transition-colors whitespace-nowrap ${
                        mobile
                            ? "w-full sm:w-auto px-3 py-2.5"
                            : "px-2.5 py-2 text-xs"
                    }`}
                >
                    {t(
                        "accountsReceivable.actions.fullPayment"
                    )}
                </button>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-6 text-white">

            {/* HEADER */}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

                <div>

                    <h1 className="text-2xl font-bold">
                        {t(
                            "accountsReceivable.title"
                        )}
                    </h1>

                    <p className="text-sm text-gray-400 mt-1">
                        {t(
                            "accountsReceivable.description"
                        )}
                    </p>

                </div>


                <div className="w-full md:w-auto flex items-center gap-2 bg-[#111] border border-[#2b2b2b] rounded-xl px-3 py-2">

                    <Search className="w-4 h-4 text-gray-400 shrink-0" />

                    <input
                        value={
                            search
                        }

                        onChange={(
                            event
                        ) =>
                            setSearch(
                                event.target.value
                            )
                        }

                        placeholder={
                            t(
                                "accountsReceivable.searchPlaceholder"
                            )
                        }

                        className="bg-transparent outline-none text-sm w-full md:w-64 min-w-0"
                    />

                </div>

            </div>


            {/* SUMMARY */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">

                <div className="bg-[#111] border border-[#2b2b2b] rounded-2xl p-4">

                    <p className="text-xs text-gray-400">
                        {t(
                            "accountsReceivable.summary.openBalance"
                        )}
                    </p>

                    <p className="text-xl font-bold mt-1">
                        {money(
                            summary.totalOpenBalance
                        )}
                    </p>

                </div>


                <div className="bg-[#111] border border-[#2b2b2b] rounded-2xl p-4">

                    <p className="text-xs text-gray-400">
                        {t(
                            "accountsReceivable.summary.pending"
                        )}
                    </p>

                    <p className="text-xl font-bold mt-1">
                        {summary.pending?.count || 0}
                    </p>

                </div>


                <div className="bg-[#111] border border-[#2b2b2b] rounded-2xl p-4">

                    <p className="text-xs text-gray-400">
                        {t(
                            "accountsReceivable.summary.partial"
                        )}
                    </p>

                    <p className="text-xl font-bold mt-1">
                        {summary.partial?.count || 0}
                    </p>

                </div>


                <div className="bg-[#111] border border-[#2b2b2b] rounded-2xl p-4">

                    <p className="text-xs text-gray-400">
                        {t(
                            "accountsReceivable.summary.totalPaid"
                        )}
                    </p>

                    <p className="text-xl font-bold mt-1">
                        {money(
                            summary.totalPaid
                        )}
                    </p>

                </div>

            </div>


            {/* FILTERS */}

            <div className="flex flex-wrap gap-2 mb-4">

                {STATUS_FILTERS.map(
                    ([
                         key,
                         labelKey,
                     ]) => (

                        <button
                            key={
                                key
                            }

                            type="button"

                            onClick={() =>
                                setStatus(
                                    key
                                )
                            }

                            className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                                status ===
                                key
                                    ? "bg-white text-black border-white"
                                    : "bg-[#111] text-gray-300 border-[#2b2b2b]"
                            }`}
                        >
                            {t(
                                labelKey
                            )}
                        </button>

                    )
                )}

            </div>


            {/* CONTENT */}

            <div className="bg-[#111] border border-[#2b2b2b] rounded-2xl overflow-hidden max-w-full min-w-0">

                {receivablesQuery.isError ? (

                    <div className="p-6 text-center text-red-400">
                        {receivablesQuery.error?.response?.data?.message ||
                            t(
                                "accountsReceivable.messages.loadFailed"
                            )}
                    </div>

                ) : receivablesQuery.isLoading ? (

                    <div className="p-6 text-gray-400">
                        {t(
                            "accountsReceivable.loading"
                        )}
                    </div>

                ) : customerGroups.length === 0 ? (

                    <div className="p-8 text-center text-gray-400">
                        {t(
                            "accountsReceivable.empty"
                        )}
                    </div>

                ) : (

                    <div>

                        {/* Encabezados escritorio */}

                        <div className="hidden xl:grid xl:grid-cols-[minmax(280px,1.7fr)_140px_160px_160px_170px] gap-3 px-4 py-3 bg-[#181818] border-b border-[#2b2b2b] text-xs text-gray-500 font-semibold uppercase tracking-wide">

                            <div>
                                {t(
                                    "accountsReceivable.table.customer"
                                )}
                            </div>

                            <div>
                                {t(
                                    "accountsReceivable.grouped.accountsLabel"
                                )}
                            </div>

                            <div className="text-right">
                                {t(
                                    "accountsReceivable.grouped.totalCredit"
                                )}
                            </div>

                            <div className="text-right">
                                {t(
                                    "accountsReceivable.table.paid"
                                )}
                            </div>

                            <div className="text-right">
                                {t(
                                    "accountsReceivable.table.balance"
                                )}
                            </div>

                        </div>


                        {/* Clientes */}

                        <div className="divide-y divide-[#2b2b2b]">

                            {customerGroups.map(
                                (
                                    customer
                                ) => {

                                    const expanded =
                                        expandedCustomerKey ===
                                        customer.key;

                                    return (

                                        <div
                                            key={
                                                customer.key
                                            }
                                            className="bg-[#111]"
                                        >

                                            {/* Fila fija del cliente */}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleCustomer(
                                                        customer.key
                                                    )
                                                }
                                                className="w-full px-4 py-4 text-left hover:bg-[#161616] transition-colors"
                                            >

                                                <div className="flex flex-col xl:grid xl:grid-cols-[minmax(280px,1.7fr)_140px_160px_160px_170px] gap-3 xl:items-center">

                                                    {/* CLIENTE */}

                                                    <div className="flex items-center gap-3 min-w-0">

                                                        <div className="w-9 h-9 shrink-0 rounded-lg bg-[#1c1c1c] border border-[#2b2b2b] flex items-center justify-center">

                                                            <ChevronDown
                                                                className={`w-4 h-4 text-gray-400 transition-transform ${
                                                                    expanded
                                                                        ? "rotate-180"
                                                                        : ""
                                                                }`}
                                                            />

                                                        </div>

                                                        <div className="min-w-0">

                                                            <p className="font-semibold text-white truncate">
                                                                {
                                                                    customer.name
                                                                }
                                                            </p>

                                                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                {
                                                                    customer.phone
                                                                }
                                                            </p>

                                                            {customer.address && (
                                                                <p className="text-[11px] text-gray-600 truncate mt-0.5">
                                                                    {
                                                                        customer.address
                                                                    }
                                                                </p>
                                                            )}

                                                            <p className="text-[11px] text-[#38bdf8]/80 mt-1">
                                                                {expanded
                                                                    ? t(
                                                                        "accountsReceivable.grouped.hideDetails"
                                                                    )
                                                                    : t(
                                                                        "accountsReceivable.grouped.showDetails"
                                                                    )}
                                                            </p>

                                                        </div>

                                                    </div>


                                                    {/* Totales cliente */}

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 xl:contents">

                                                        <div>

                                                            <p className="text-[11px] text-gray-500 xl:hidden">
                                                                {t(
                                                                    "accountsReceivable.grouped.accountsLabel"
                                                                )}
                                                            </p>

                                                            <p className="text-sm font-semibold text-white">
                                                                {t(
                                                                    "accountsReceivable.grouped.accounts",
                                                                    {
                                                                        count:
                                                                        customer
                                                                            .accounts
                                                                            .length,
                                                                    }
                                                                )}
                                                            </p>

                                                        </div>


                                                        <div className="xl:text-right">

                                                            <p className="text-[11px] text-gray-500 xl:hidden">
                                                                {t(
                                                                    "accountsReceivable.grouped.totalCredit"
                                                                )}
                                                            </p>

                                                            <p className="text-sm font-semibold text-white">
                                                                {money(
                                                                    customer.originalAmount
                                                                )}
                                                            </p>

                                                        </div>


                                                        <div className="xl:text-right">

                                                            <p className="text-[11px] text-gray-500 xl:hidden">
                                                                {t(
                                                                    "accountsReceivable.table.paid"
                                                                )}
                                                            </p>

                                                            <p className="text-sm font-semibold text-emerald-300">
                                                                {money(
                                                                    customer.paidAmount
                                                                )}
                                                            </p>

                                                        </div>


                                                        <div className="xl:text-right">

                                                            <p className="text-[11px] text-gray-500 xl:hidden">
                                                                {t(
                                                                    "accountsReceivable.table.balance"
                                                                )}
                                                            </p>

                                                            <p className="text-sm font-bold text-sky-300">
                                                                {money(
                                                                    customer.balance
                                                                )}
                                                            </p>

                                                        </div>

                                                    </div>

                                                </div>

                                            </button>


                                            {/* CUENTAS DEL CLIENTE */}

                                            {expanded && (

                                                <div className="border-t border-[#2b2b2b] bg-[#0b0b0b]">

                                                    <div className="px-4 pt-4">

                                                        <p className="text-sm font-semibold text-white">
                                                            {t(
                                                                "accountsReceivable.grouped.creditDetails"
                                                            )}
                                                        </p>

                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {t(
                                                                "accountsReceivable.grouped.creditDetailsDescription",
                                                                {
                                                                    name:
                                                                    customer.name,
                                                                }
                                                            )}
                                                        </p>

                                                    </div>


                                                    <div className="p-4 space-y-3">

                                                        {customer.accounts.map(
                                                            (
                                                                row
                                                            ) => {

                                                                const invoiceNumber =
                                                                    row.invoiceNumber ||
                                                                    row.facturaNo ||
                                                                    row
                                                                        .orderId
                                                                        ?.invoiceNumber ||
                                                                    row
                                                                        .orderId
                                                                        ?.facturaNo ||
                                                                    "N/A";

                                                                const saleDate =
                                                                    row
                                                                        .orderId
                                                                        ?.createdAt ||
                                                                    row.createdAt;

                                                                return (

                                                                    <div
                                                                        key={
                                                                            row._id
                                                                        }
                                                                        className="rounded-xl border border-[#2b2b2b] bg-[#111] p-4"
                                                                    >

                                                                        <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-4">

                                                                            {/* FACTURA */}

                                                                            <div className="min-w-0 2xl:w-[150px] 2xl:shrink-0">

                                                                                <p className="text-[11px] text-gray-500">
                                                                                    {t(
                                                                                        "accountsReceivable.invoice"
                                                                                    )}
                                                                                </p>

                                                                                <p className="text-sm font-bold text-white truncate mt-1">
                                                                                    {
                                                                                        invoiceNumber
                                                                                    }
                                                                                </p>

                                                                            </div>


                                                                            {/* DATOS DE LA CUENTA */}

                                                                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 flex-1 min-w-0">

                                                                                {/* FECHA VENTA */}

                                                                                <div>

                                                                                    <p className="text-[11px] text-gray-500">
                                                                                        {t(
                                                                                            "accountsReceivable.grouped.saleDate"
                                                                                        )}
                                                                                    </p>

                                                                                    <p className="text-xs text-gray-200 mt-1">
                                                                                        {saleDate
                                                                                            ? formatDate(
                                                                                                saleDate
                                                                                            )
                                                                                            : "—"}
                                                                                    </p>

                                                                                </div>


                                                                                {/* VENCIMIENTO */}

                                                                                <div>

                                                                                    <p className="text-[11px] text-gray-500">
                                                                                        {t(
                                                                                            "accountsReceivable.grouped.dueDate"
                                                                                        )}
                                                                                    </p>

                                                                                    <p className="text-xs text-gray-200 mt-1">
                                                                                        {row.dueDate
                                                                                            ? formatDate(
                                                                                                row.dueDate
                                                                                            )
                                                                                            : t(
                                                                                                "accountsReceivable.grouped.noDueDate"
                                                                                            )}
                                                                                    </p>

                                                                                </div>


                                                                                {/* MONTO */}

                                                                                <div>

                                                                                    <p className="text-[11px] text-gray-500">
                                                                                        {t(
                                                                                            "accountsReceivable.amount"
                                                                                        )}
                                                                                    </p>

                                                                                    <p className="text-sm font-semibold text-white mt-1">
                                                                                        {money(
                                                                                            row.originalAmount
                                                                                        )}
                                                                                    </p>

                                                                                </div>


                                                                                {/* ABONADO */}

                                                                                <div>

                                                                                    <p className="text-[11px] text-gray-500">
                                                                                        {t(
                                                                                            "accountsReceivable.paidAmount"
                                                                                        )}
                                                                                    </p>

                                                                                    <p className="text-sm font-semibold text-emerald-300 mt-1">
                                                                                        {money(
                                                                                            row.paidAmount
                                                                                        )}
                                                                                    </p>

                                                                                </div>


                                                                                {/* PENDIENTE */}

                                                                                <div>

                                                                                    <p className="text-[11px] text-gray-500">
                                                                                        {t(
                                                                                            "accountsReceivable.balance"
                                                                                        )}
                                                                                    </p>

                                                                                    <p className="text-sm font-bold text-sky-300 mt-1">
                                                                                        {money(
                                                                                            row.balance
                                                                                        )}
                                                                                    </p>

                                                                                </div>


                                                                                {/* ESTADO */}

                                                                                <div>

                                                                                    <p className="text-[11px] text-gray-500">
                                                                                        {t(
                                                                                            "accountsReceivable.table.status"
                                                                                        )}
                                                                                    </p>

                                                                                    <span
                                                                                        className={`mt-1 inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap ${
                                                                                            statusClass[
                                                                                                row.status
                                                                                                ] ||
                                                                                            statusClass.pending
                                                                                        }`}
                                                                                    >
                                                                            {getStatusLabel(
                                                                                row.status
                                                                            )}
                                                                        </span>

                                                                                </div>

                                                                            </div>


                                                                            {/* ACCIONES */}

                                                                            <div className="2xl:w-[220px] 2xl:shrink-0 2xl:flex 2xl:justify-end">

                                                                                {renderReceivableActions(
                                                                                    row,
                                                                                    true
                                                                                )}

                                                                            </div>

                                                                        </div>

                                                                    </div>

                                                                );

                                                            }
                                                        )}

                                                    </div>

                                                </div>

                                            )}

                                        </div>

                                    );

                                }
                            )}

                        </div>

                    </div>

                )}

            </div>

            {/* PAYMENT MODAL */}

            {paymentModal && (

                <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

                    <div className="w-full max-w-lg bg-[#111] border border-[#2b2b2b] rounded-2xl shadow-2xl">

                        <div className="flex items-center justify-between p-5 border-b border-[#2b2b2b]">

                            <div>

                                <h2 className="text-xl font-bold">
                                    {t(
                                        "accountsReceivable.paymentModal.title"
                                    )}
                                </h2>

                                <p className="text-sm text-gray-400">

                                    {t(
                                        "accountsReceivable.balance"
                                    )}
                                    :{" "}

                                    {money(
                                        paymentModal.balance
                                    )}

                                </p>

                            </div>


                            <button
                                type="button"

                                onClick={() =>
                                    setPaymentModal(
                                        null
                                    )
                                }

                                className="p-2 rounded-lg hover:bg-[#222]"

                                aria-label={
                                    t(
                                        "common.close"
                                    )
                                }
                            >
                                <X className="w-5 h-5" />
                            </button>

                        </div>


                        <div className="p-5 space-y-4">

                            <div>

                                <label className="text-sm text-gray-400">
                                    {t(
                                        "accountsReceivable.paymentModal.amountReceived"
                                    )}
                                </label>

                                <input
                                    value={
                                        amount
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setAmount(
                                            event.target.value
                                        )
                                    }

                                    placeholder="0.00"

                                    className="mt-1 w-full bg-[#181818] border border-[#2b2b2b] rounded-xl px-4 py-3 outline-none"
                                />

                            </div>


                            <div>

                                <label className="text-sm text-gray-400">
                                    {t(
                                        "accountsReceivable.paymentModal.paymentMethod"
                                    )}
                                </label>


                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">

                                    {PAYMENT_METHODS.map(
                                        ([
                                             value,
                                             labelKey,
                                             Icon,
                                         ]) => (

                                            <button
                                                key={
                                                    value
                                                }

                                                type="button"

                                                onClick={() =>
                                                    setMethod(
                                                        value
                                                    )
                                                }

                                                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-3 border ${
                                                    method ===
                                                    value
                                                        ? "bg-white text-black border-white"
                                                        : "bg-[#181818] text-gray-300 border-[#2b2b2b]"
                                                }`}
                                            >

                                                <Icon className="w-4 h-4" />

                                                <span className="text-xs font-semibold">
                                                    {t(
                                                        labelKey
                                                    )}
                                                </span>

                                            </button>

                                        )
                                    )}

                                </div>

                            </div>


                            <div>

                                <label className="text-sm text-gray-400">
                                    {t(
                                        "accountsReceivable.paymentModal.optionalNote"
                                    )}
                                </label>

                                <textarea
                                    value={
                                        note
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setNote(
                                            event.target.value
                                        )
                                    }

                                    placeholder={
                                        t(
                                            "accountsReceivable.paymentModal.notePlaceholder"
                                        )
                                    }

                                    className="mt-1 w-full bg-[#181818] border border-[#2b2b2b] rounded-xl px-4 py-3 outline-none min-h-24"
                                />

                            </div>


                            <button
                                type="button"

                                onClick={() =>
                                    paymentMutation.mutate()
                                }

                                disabled={
                                    paymentMutation.isPending
                                }

                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-xl py-3 font-bold"
                            >

                                <CheckCircle className="w-5 h-5" />

                                {paymentMutation.isPending
                                    ? t(
                                        "accountsReceivable.paymentModal.saving"
                                    )
                                    : t(
                                        "accountsReceivable.paymentModal.registerPayment"
                                    )
                                }

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}