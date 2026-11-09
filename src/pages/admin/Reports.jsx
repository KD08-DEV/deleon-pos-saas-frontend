// src/pages/Admin/Reports.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/api";
import useTenant from "../../hooks/useTenant";
import Invoice from "../../components/invoice/Invoice.jsx";
import { useTranslation } from "react-i18next";

import {
    formatDate,
    formatMoney,
    getTenantLocalization,
    getTodayYMD,
    getYMDInTimezone,
} from "../../lib/localization";

import {
    getCustomerTaxIdentity,
} from "../../lib/taxIdentityDisplay.js";


const Reports = () => {
    const { t } = useTranslation();

    const todayYMD =
        () =>
            getTodayYMD(
                localization
            );

    const { tenantInfo } =
        useTenant();

    const localization =
        getTenantLocalization(
            tenantInfo
        );

    const currency = (value) =>
        formatMoney(
            value,
            localization
        );


    const [selectedOrderInvoice, setSelectedOrderInvoice] = useState(null);
    const [toast, setToast] =
        useState({
            open: false,
            message: "",
            type: "error",
        });


    const showToast = (
        message,
        type = "error"
    ) => {
        setToast({
            open: true,
            message,
            type,
        });

        window.clearTimeout(
            showToast._t
        );

        showToast._t =
            window.setTimeout(
                () =>
                    setToast(
                        (current) => ({
                            ...current,
                            open: false,
                        })
                    ),
                3500
            );
    };


    /*
     * ==========================================
     * FILTROS
     * ==========================================
     */

    const [filters, setFilters] =
        useState(
            () => {
                const today =
                    todayYMD();

                return {
                    from: today,
                    to: today,
                    method: "",
                    user: "",
                    client: "",
                };
            }
        );


    /*
     * Mantener hoy como filtro por defecto.
     *
     * Si cambia el día mientras esta pantalla
     * sigue abierta y el usuario todavía estaba
     * usando el día anterior, actualizamos a hoy.
     */

    const lastAutoDayRef =
        useRef(
            todayYMD()
        );


    useEffect(
        () => {
            const forceTodayOnLoad =
                () => {
                    const today =
                        todayYMD();

                    lastAutoDayRef.current =
                        today;

                    setFilters(
                        (current) => ({
                            ...current,
                            from: today,
                            to: today,
                        })
                    );
                };


            forceTodayOnLoad();


            const id =
                setInterval(
                    () => {
                        const today =
                            todayYMD();

                        if (
                            today !==
                            lastAutoDayRef.current
                        ) {
                            const previousDay =
                                lastAutoDayRef.current;


                            setFilters(
                                (current) => {
                                    if (
                                        current.from ===
                                        previousDay &&
                                        current.to ===
                                        previousDay
                                    ) {
                                        return {
                                            ...current,
                                            from: today,
                                            to: today,
                                        };
                                    }

                                    return current;
                                }
                            );


                            lastAutoDayRef.current =
                                today;
                        }
                    },
                    60_000
                );


            return () =>
                clearInterval(
                    id
                );
        },
        []
    );


    /*
     * ==========================================
     * DEBOUNCE
     * ==========================================
     */

    const [
        debounced,
        setDebounced,
    ] =
        useState(
            filters
        );


    useEffect(
        () => {
            const id =
                setTimeout(
                    () =>
                        setDebounced(
                            filters
                        ),
                    400
                );

            return () =>
                clearTimeout(
                    id
                );
        },
        [
            filters,
        ]
    );


    const addDaysISOStart = (
        ymd,
        days
    ) => {
        const date =
            new Date(
                `${ymd}T00:00:00`
            );

        date.setDate(
            date.getDate() +
            days
        );

        const yyyy =
            date.getFullYear();

        const mm =
            String(
                date.getMonth() +
                1
            ).padStart(
                2,
                "0"
            );

        const dd =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );

        return `${yyyy}-${mm}-${dd}T00:00:00.000`;
    };


    const cleanedParams =
        useMemo(
            () => {
                const obj = {
                    ...filters,
                };

                const today =
                    todayYMD();

                const hasFrom =
                    Boolean(
                        obj.from
                    );

                const hasTo =
                    Boolean(
                        obj.to
                    );


                if (
                    !hasFrom &&
                    !hasTo
                ) {
                    obj.from =
                        today;

                    obj.to =
                        today;

                } else if (
                    hasFrom &&
                    !hasTo
                ) {
                    obj.to =
                        obj.from;

                } else if (
                    !hasFrom &&
                    hasTo
                ) {
                    obj.from =
                        obj.to;
                }


                Object.keys(
                    obj
                ).forEach(
                    (key) => {
                        if (
                            obj[key] ===
                            "" ||
                            obj[key] ==
                            null
                        ) {
                            delete obj[
                                key
                                ];
                        }
                    }
                );


                return obj;
            },
            [
                filters,
            ]
        );


    const normalize = (
        value
    ) =>
        String(
            value ||
            ""
        )
            .trim()
            .toLowerCase();


    /*
     * ==========================================
     * CLIENTE
     * ==========================================
     */

    const getClientName = (
        report
    ) => {
        return (
            report
                ?.customerDetails
                ?.name ||
            report
                ?.customerDetails
                ?.nombre ||
            report
                ?.customerDetails
                ?.clientName ||
            report
                ?.customerDetails
                ?.customerName ||
            report
                ?.client
                ?.name ||
            report
                ?.clientName ||
            report
                ?.customerName ||
            report
                ?.customer
                ?.name ||
            report
                ?.bills
                ?.fiscalName ||
            report
                ?.fiscalName ||
            report
                ?.fiscal
                ?.name ||
            report
                ?.fiscal
                ?.razonSocial ||
            "—"
        );
    };


    const getClientDisplayName = (
        report
    ) => {
        const raw =
            String(
                getClientName(
                    report
                ) ||
                ""
            ).trim();


        if (
            [
                "consumidor final",
                "final consumer",
            ].includes(
                raw.toLowerCase()
            )
        ) {
            return t(
                "reportsPage.finalConsumer"
            );
        }


        return (
            raw ||
            "—"
        );
    };


    /*
     * ==========================================
     * MÉTODOS DE PAGO - SOLO DISPLAY
     * ==========================================
     *
     * Los valores internos siguen siendo:
     *
     * Efectivo
     * Tarjeta
     * Transferencia
     * Pedido Ya
     * Uber Eats
     * Delivery
     */

    const getPaymentMethodDisplayLabel = (
        value
    ) => {
        const raw =
            String(
                value ||
                "Efectivo"
            ).trim();

        const normalized =
            raw.toLowerCase();


        if (
            normalized ===
            "efectivo" ||
            normalized ===
            "cash"
        ) {
            return t(
                "reportsPage.paymentMethods.cash"
            );
        }


        if (
            normalized ===
            "tarjeta" ||
            normalized ===
            "card"
        ) {
            return t(
                "reportsPage.paymentMethods.card"
            );
        }


        if (
            normalized ===
            "transferencia" ||
            normalized ===
            "bank transfer" ||
            normalized ===
            "transfer"
        ) {
            return t(
                "reportsPage.paymentMethods.transfer"
            );
        }


        if (
            normalized.includes(
                "pedido"
            )
        ) {
            return t(
                "reportsPage.paymentMethods.pedidosYa"
            );
        }


        if (
            normalized.includes(
                "uber"
            )
        ) {
            return t(
                "reportsPage.paymentMethods.uberEats"
            );
        }


        if (
            normalized.includes(
                "delivery"
            )
        ) {
            return t(
                "reportsPage.paymentMethods.delivery"
            );
        }


        if (
            normalized ===
            "otros" ||
            normalized ===
            "other"
        ) {
            return t(
                "reportsPage.paymentMethods.other"
            );
        }


        return raw;
    };


    /*
     * ==========================================
     * DETALLE DE IMPUESTOS
     * ==========================================
     */

    const getTaxBreakdownText = (
        report
    ) => {
        const breakdown =
            Array.isArray(
                report
                    ?.bills
                    ?.taxBreakdown
            )
                ? report
                    .bills
                    .taxBreakdown
                : [];


        if (
            breakdown.length ===
            0
        ) {
            return "";
        }


        return breakdown
            .map(
                (
                    tax
                ) => {
                    const name =
                        String(
                            tax?.name ||
                            tax?.label ||
                            tax?.code ||
                            t(
                                "reportsPage.taxFallback"
                            )
                        ).trim();


                    const rate =
                        Number(
                            tax
                                ?.ratePercent ||
                            0
                        );


                    const amount =
                        Number(
                            tax?.amount ||
                            0
                        );


                    return `${
                        name
                    }${
                        rate >
                        0
                            ? ` ${rate}%`
                            : ""
                    }: ${amount}`;
                }
            )
            .join(
                " | "
            );
    };


    /*
     * ==========================================
     * CONSULTA
     * ==========================================
     */

    const {
        data,
        isLoading,
        isError,
        error,
    } =
        useQuery({
            queryKey: [
                "admin/reports",
                cleanedParams,
            ],

            queryFn:
                async () => {
                    const res =
                        await api.get(
                            "/api/admin/reports",
                            {
                                params:
                                cleanedParams,
                            }
                        );

                    return res.data;
                },

            keepPreviousData:
                true,

            staleTime:
                30_000,

            refetchOnWindowFocus:
                false,
        });


    const reports =
        data?.data ||
        [];


    /*
     * ==========================================
     * FILTRO FRONTEND
     * ==========================================
     */

    const filteredReports =
        useMemo(
            () => {
                const today =
                    todayYMD();


                const onlyYMD = (
                    value
                ) =>
                    String(
                        value ||
                        ""
                    ).split(
                        "T"
                    )[0];


                let fromYMD =
                    onlyYMD(
                        debounced.from
                    );

                let toYMD =
                    onlyYMD(
                        debounced.to
                    );


                const hasFrom =
                    Boolean(
                        fromYMD
                    );

                const hasTo =
                    Boolean(
                        toYMD
                    );


                if (
                    !hasFrom &&
                    !hasTo
                ) {
                    fromYMD =
                        today;

                    toYMD =
                        today;

                } else if (
                    hasFrom &&
                    !hasTo
                ) {
                    toYMD =
                        fromYMD;

                } else if (
                    !hasFrom &&
                    hasTo
                ) {
                    fromYMD =
                        toYMD;
                }


                const toBusinessYMD =
                    (
                        value
                    ) =>
                        getYMDInTimezone(
                            value,
                            localization
                        );


                return reports.filter(
                    (
                        report
                    ) => {
                        if (
                            report?.createdAt
                        ) {
                            const createdYMD =
                                toBusinessYMD(
                                    report
                                        .createdAt
                                );


                            if (
                                fromYMD &&
                                createdYMD <
                                fromYMD
                            ) {
                                return false;
                            }


                            if (
                                toYMD &&
                                createdYMD >
                                toYMD
                            ) {
                                return false;
                            }
                        }


                        const client =
                            normalize(
                                debounced.client
                            );

                        const method =
                            normalize(
                                debounced.method
                            );

                        const user =
                            normalize(
                                debounced.user
                            );


                        if (
                            method
                        ) {
                            const paymentMethod =
                                normalize(
                                    report
                                        ?.paymentMethod ||
                                    "Efectivo"
                                );

                            const orderSource =
                                normalize(
                                    report
                                        ?.orderSource ||
                                    ""
                                );


                            if (
                                method.includes(
                                    "delivery"
                                ) ||
                                method.includes(
                                    "pedido"
                                ) ||
                                method.includes(
                                    "uber"
                                )
                            ) {
                                if (
                                    !paymentMethod.includes(
                                        method
                                    ) &&
                                    !orderSource.includes(
                                        method
                                    )
                                ) {
                                    return false;
                                }

                            } else if (
                                !paymentMethod.includes(
                                    method
                                )
                            ) {
                                return false;
                            }
                        }


                        if (
                            user
                        ) {
                            const currentUser =
                                normalize(
                                    report
                                        ?.user
                                        ?.name ||
                                    report
                                        ?.user
                                        ?.email ||
                                    ""
                                );


                            if (
                                !currentUser.includes(
                                    user
                                )
                            ) {
                                return false;
                            }
                        }


                        if (
                            client
                        ) {
                            const currentClient =
                                normalize(
                                    getClientDisplayName(
                                        report
                                    )
                                );


                            if (
                                !currentClient.includes(
                                    client
                                )
                            ) {
                                return false;
                            }
                        }


                        return true;
                    }
                );
            },
            [
                reports,
                debounced,
                localization,
                t,
            ]
        );


    /*
     * ==========================================
     * RESUMEN / CIERRE DE CAJA
     * ==========================================
     */

    const cashClosure =
        useMemo(
            () => {
                const normalizeText = (
                    value
                ) =>
                    String(
                        value ||
                        ""
                    )
                        .trim()
                        .toLowerCase();


                const normalizeChannel = (
                    report
                ) => {
                    const orderSource =
                        normalizeText(
                            report
                                ?.orderSource ||
                            report
                                ?.source ||
                            report
                                ?.channel
                        );


                    if (
                        orderSource
                    ) {
                        return orderSource;
                    }


                    const table =
                        report?.table ||
                        report?.tableId ||
                        report?.tableInfo ||
                        null;


                    return normalizeText(
                        table
                            ?.virtualType ||
                        table?.type ||
                        report
                            ?.virtualType
                    );
                };


                const normalizeMethod = (
                    method
                ) =>
                    normalizeText(
                        method ||
                        "Efectivo"
                    );


                const buckets = {
                    efectivo: {
                        labelKey:
                            "reportsPage.paymentMethods.cash",

                        total:
                            0,

                        count:
                            0,
                    },

                    tarjeta: {
                        labelKey:
                            "reportsPage.paymentMethods.card",

                        total:
                            0,

                        count:
                            0,
                    },

                    transferencia: {
                        labelKey:
                            "reportsPage.paymentMethods.transfer",

                        total:
                            0,

                        count:
                            0,
                    },

                    pedidoya: {
                        labelKey:
                            "reportsPage.paymentMethods.pedidosYa",

                        total:
                            0,

                        count:
                            0,
                    },

                    ubereats: {
                        labelKey:
                            "reportsPage.paymentMethods.uberEats",

                        total:
                            0,

                        count:
                            0,
                    },

                    otros: {
                        labelKey:
                            "reportsPage.paymentMethods.other",

                        total:
                            0,

                        count:
                            0,
                    },

                    delivery: {
                        labelKey:
                            "reportsPage.paymentMethods.delivery",

                        total:
                            0,

                        count:
                            0,
                    },
                };


                let grandTotal =
                    0;

                let totalCount =
                    0;


                for (
                    const report
                    of filteredReports
                    ) {
                    const total =
                        Number(
                            report
                                ?.bills
                                ?.totalWithTax ||
                            0
                        );


                    let key =
                        "otros";


                    const channel =
                        normalizeChannel(
                            report
                        );


                    const paymentMethod =
                        normalizeMethod(
                            report
                                ?.paymentMethod
                        );


                    if (
                        channel.includes(
                            "pedidoya"
                        ) ||
                        channel.includes(
                            "pedido"
                        ) ||
                        channel.includes(
                            "pedidosya"
                        )
                    ) {
                        key =
                            "pedidoya";

                    } else if (
                        channel.includes(
                            "ubereats"
                        ) ||
                        channel.includes(
                            "uber"
                        )
                    ) {
                        key =
                            "ubereats";

                    } else if (
                        paymentMethod.includes(
                            "efect"
                        )
                    ) {
                        key =
                            "efectivo";

                    } else if (
                        paymentMethod.includes(
                            "tarj"
                        )
                    ) {
                        key =
                            "tarjeta";

                    } else if (
                        paymentMethod.includes(
                            "transf"
                        )
                    ) {
                        key =
                            "transferencia";

                    } else if (
                        paymentMethod.includes(
                            "pedido"
                        )
                    ) {
                        key =
                            "pedidoya";

                    } else if (
                        paymentMethod.includes(
                            "uber"
                        )
                    ) {
                        key =
                            "ubereats";

                    } else if (
                        channel.includes(
                            "delivery"
                        )
                    ) {
                        key =
                            "delivery";
                    }


                    buckets[
                        key
                        ].total +=
                        total;


                    buckets[
                        key
                        ].count +=
                        1;


                    grandTotal +=
                        total;


                    totalCount +=
                        1;
                }


                return {
                    buckets,
                    grandTotal,
                    totalCount,
                };
            },
            [
                filteredReports,
            ]
        );


    /*
     * ==========================================
     * FACTURA
     * ==========================================
     */

    // Renderizar la factura desde la orden guardada sin crear PDF persistido.
    const verFactura = async (orderId) => {
        try {
            const res = await api.get(`/api/order/${orderId}`);
            const order = res?.data?.data?.order ?? res?.data?.order ?? res?.data?.data ?? res?.data;
            if (!order?._id) throw new Error("ORDER_NOT_FOUND");
            setSelectedOrderInvoice(order);
        } catch (error) {
            console.error("Error cargando factura:", error);
            showToast(t("reportsPage.messages.invoiceLoadFailed"));
        }
    };

    /*
     * ==========================================
     * EXPORTAR EXCEL
     * ==========================================
     */

    const downloadExcel =
        async () => {
            try {
                const rows =
                    filteredReports.map(
                        (
                            report
                        ) => {
                            const taxIdentity =
                                getCustomerTaxIdentity(
                                    report
                                );


                            const taxCountry =
                                taxIdentity
                                    ?.countryCode ||
                                "";


                            const taxType =
                                taxIdentity
                                    ?.type ||
                                "";


                            const taxLabel =
                                taxIdentity
                                    ?.label ||
                                "";


                            const taxValue =
                                taxIdentity
                                    ?.value ||
                                "";


                            const taxTotal =
                                Number(
                                    report
                                        ?.bills
                                        ?.tax ||
                                    0
                                );


                            const taxBreakdownText =
                                getTaxBreakdownText(
                                    report
                                );


                            const subtotal =
                                Number(
                                    report
                                        ?.bills
                                        ?.subtotal ??
                                    report
                                        ?.bills
                                        ?.total ??
                                    0
                                );


                            const discount =
                                Number(
                                    report
                                        ?.bills
                                        ?.discount ||
                                    0
                                );


                            const tip =
                                Number(
                                    report
                                        ?.bills
                                        ?.tipAmount ??
                                    report
                                        ?.bills
                                        ?.tip ??
                                    0
                                );


                            const serviceCharge =
                                Number(
                                    report
                                        ?.bills
                                        ?.serviceChargeTotal ||
                                    0
                                );


                            const shipping =
                                Number(
                                    report
                                        ?.shippingFee ??
                                    report
                                        ?.deliveryFee ??
                                    report
                                        ?.bills
                                        ?.shippingFee ??
                                    report
                                        ?.bills
                                        ?.deliveryFee ??
                                    0
                                );


                            const total =
                                Number(
                                    report
                                        ?.bills
                                        ?.totalWithTax ||
                                    0
                                );


                            /*
                             * DGII permanece separado
                             * y con nomenclatura fiscal RD.
                             */
                            const ncfNumber =
                                report
                                    ?.fiscal
                                    ?.ncfNumber ||
                                report
                                    ?.ncfNumber ||
                                "";


                            const ecfNumber =
                                report
                                    ?.ecf
                                    ?.eNCF ||
                                report
                                    ?.ecf
                                    ?.encf ||
                                "";


                            return {
                                [t(
                                    "reportsPage.export.columns.date"
                                )]:
                                    report?.createdAt
                                        ? new Intl.DateTimeFormat(
                                            localization.locale,
                                            {
                                                timeZone:
                                                localization.timezone,

                                                year:
                                                    "numeric",

                                                month:
                                                    "2-digit",

                                                day:
                                                    "2-digit",
                                            }
                                        ).format(
                                            new Date(
                                                report.createdAt
                                            )
                                        )
                                        : "",


                                [t(
                                    "reportsPage.export.columns.user"
                                )]:
                                    report
                                        ?.user
                                        ?.name ||
                                    "—",


                                [t(
                                    "reportsPage.export.columns.customer"
                                )]:
                                    getClientDisplayName(
                                        report
                                    ),


                                [t(
                                    "reportsPage.export.columns.customerTaxCountry"
                                )]:
                                taxCountry,


                                [t(
                                    "reportsPage.export.columns.taxIdType"
                                )]:
                                taxType,


                                [t(
                                    "reportsPage.export.columns.taxIdLabel"
                                )]:
                                taxLabel,


                                [t(
                                    "reportsPage.export.columns.taxIdNumber"
                                )]:
                                taxValue,


                                [t(
                                    "reportsPage.export.columns.method"
                                )]:
                                    getPaymentMethodDisplayLabel(
                                        report
                                            ?.paymentMethod ||
                                        "Efectivo"
                                    ),


                                [t(
                                    "reportsPage.export.columns.channel"
                                )]:
                                    report
                                        ?.orderSource ||
                                    "—",


                                [t(
                                    "reportsPage.export.columns.subtotal"
                                )]:
                                subtotal,


                                [t(
                                    "reportsPage.export.columns.discount"
                                )]:
                                discount,


                                [t(
                                    "reportsPage.export.columns.taxTotal"
                                )]:
                                taxTotal,


                                [t(
                                    "reportsPage.export.columns.taxBreakdown"
                                )]:
                                taxBreakdownText,


                                [t(
                                    "reportsPage.export.columns.tip"
                                )]:
                                tip,


                                [t(
                                    "reportsPage.export.columns.serviceCharge"
                                )]:
                                serviceCharge,


                                [t(
                                    "reportsPage.export.columns.shipping"
                                )]:
                                shipping,


                                [t(
                                    "reportsPage.export.columns.total"
                                )]:
                                total,


                                [t(
                                    "reportsPage.export.columns.currency"
                                )]:
                                    localization.currency ||
                                    "",


                                "NCF RD":
                                ncfNumber,


                                "eNCF RD":
                                ecfNumber,


                                "Order ID":
                                    report?._id ||
                                    "",
                            };
                        }
                    );


                const worksheet =
                    XLSX.utils
                        .json_to_sheet(
                            rows
                        );


                worksheet[
                    "!cols"
                    ] = [
                    { wch: 14 },
                    { wch: 20 },
                    { wch: 28 },
                    { wch: 12 },
                    { wch: 20 },
                    { wch: 24 },
                    { wch: 26 },
                    { wch: 18 },
                    { wch: 16 },
                    { wch: 14 },
                    { wch: 14 },
                    { wch: 16 },
                    { wch: 40 },
                    { wch: 14 },
                    { wch: 20 },
                    { wch: 14 },
                    { wch: 16 },
                    { wch: 12 },
                    { wch: 20 },
                    { wch: 20 },
                    { wch: 28 },
                ];


                const workbook =
                    XLSX.utils
                        .book_new();


                XLSX.utils
                    .book_append_sheet(
                        workbook,
                        worksheet,
                        t(
                            "reportsPage.export.sheetName"
                        )
                    );


                const arrayBuffer =
                    XLSX.write(
                        workbook,
                        {
                            bookType:
                                "xlsx",

                            type:
                                "array",
                        }
                    );


                const blob =
                    new Blob(
                        [
                            arrayBuffer,
                        ],
                        {
                            type:
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        }
                    );


                saveAs(
                    blob,
                    t(
                        "reportsPage.export.fileName"
                    )
                );

            } catch (
                error
                ) {
                console.error(
                    "Error exporting Excel:",
                    error
                );


                showToast(
                    t(
                        "reportsPage.messages.exportFailed"
                    )
                );
            }
        };


    return (
        <div>

            <h2 className="text-2xl font-bold mb-4">
                {t(
                    "reportsPage.title"
                )}
            </h2>


            {/* FILTROS */}

            <div className="grid grid-cols-5 gap-4 mb-6">

                <input
                    type="date"

                    value={
                        filters.from
                    }

                    onChange={(
                        event
                    ) =>
                        setFilters(
                            (
                                current
                            ) => ({
                                ...current,

                                from:
                                event
                                    .target
                                    .value,
                            })
                        )
                    }

                    className="p-2 bg-[#1f1f1f] rounded text-white"
                />


                <input
                    type="date"

                    value={
                        filters.to
                    }

                    onChange={(
                        event
                    ) =>
                        setFilters(
                            (
                                current
                            ) => ({
                                ...current,

                                to:
                                event
                                    .target
                                    .value,
                            })
                        )
                    }

                    className="p-2 bg-[#1f1f1f] rounded text-white"
                />


                <select
                    value={
                        filters.method
                    }

                    onChange={(
                        event
                    ) =>
                        setFilters(
                            (
                                current
                            ) => ({
                                ...current,

                                /*
                                 * Se conserva el valor
                                 * interno original.
                                 */
                                method:
                                event
                                    .target
                                    .value,
                            })
                        )
                    }

                    className="p-2 bg-[#1f1f1f] rounded text-white"
                >

                    <option value="">
                        {t(
                            "reportsPage.filters.allMethods"
                        )}
                    </option>


                    <option value="Efectivo">
                        {t(
                            "reportsPage.paymentMethods.cash"
                        )}
                    </option>


                    <option value="Tarjeta">
                        {t(
                            "reportsPage.paymentMethods.card"
                        )}
                    </option>


                    <option value="Transferencia">
                        {t(
                            "reportsPage.paymentMethods.transfer"
                        )}
                    </option>


                    <option value="Pedido Ya">
                        {t(
                            "reportsPage.paymentMethods.pedidosYa"
                        )}
                    </option>


                    <option value="Uber Eats">
                        {t(
                            "reportsPage.paymentMethods.uberEats"
                        )}
                    </option>


                    <option value="Delivery">
                        {t(
                            "reportsPage.paymentMethods.delivery"
                        )}
                    </option>

                </select>


                <input
                    placeholder={
                        t(
                            "reportsPage.filters.userPlaceholder"
                        )
                    }

                    value={
                        filters.user
                    }

                    onChange={(
                        event
                    ) =>
                        setFilters(
                            (
                                current
                            ) => ({
                                ...current,

                                user:
                                event
                                    .target
                                    .value,
                            })
                        )
                    }

                    className="p-2 bg-[#1f1f1f] rounded text-white"
                />


                <input
                    placeholder={
                        t(
                            "reportsPage.filters.customerPlaceholder"
                        )
                    }

                    value={
                        filters.client
                    }

                    onChange={(
                        event
                    ) =>
                        setFilters(
                            (
                                current
                            ) => ({
                                ...current,

                                client:
                                event
                                    .target
                                    .value,
                            })
                        )
                    }

                    className="p-2 bg-[#1f1f1f] rounded text-white"
                />

            </div>


            {/* CIERRE DE CAJA */}

            <div className="mb-6 rounded-lg border border-[#2a2a2a] bg-[#171717] p-4">

                <div className="flex items-center justify-between">

                    <h3 className="text-white font-semibold">
                        {t(
                            "reportsPage.cashClosure.title"
                        )}
                    </h3>


                    <div className="text-sm text-gray-300">

                        {t(
                            "reportsPage.cashClosure.total"
                        )}
                        :{" "}

                        <span className="font-semibold text-white">
                            {currency(
                                cashClosure.grandTotal
                            )}
                        </span>


                        <span className="text-gray-500">

                            {" "}
                            (
                            {t(
                                "reportsPage.orderCount",
                                {
                                    count:
                                    cashClosure.totalCount,
                                }
                            )}
                            )

                        </span>

                    </div>

                </div>


                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

                    {Object.entries(
                        cashClosure.buckets
                    ).map(
                        ([
                             key,
                             value,
                         ]) => (

                            <div
                                key={
                                    key
                                }

                                className="rounded-md bg-[#1f1f1f] border border-[#2a2a2a] p-3"
                            >

                                <div className="text-xs text-gray-400">

                                    {t(
                                        value.labelKey
                                    )}

                                </div>


                                <div className="mt-1 text-sm font-semibold text-white">

                                    {currency(
                                        value.total
                                    )}

                                </div>


                                <div className="mt-1 text-xs text-gray-500">

                                    {t(
                                        "reportsPage.orderCount",
                                        {
                                            count:
                                            value.count,
                                        }
                                    )}

                                </div>

                            </div>

                        )
                    )}

                </div>

            </div>


            {/* EXPORTAR */}

            <div className="flex gap-3 mb-6">

                <button
                    type="button"

                    onClick={
                        downloadExcel
                    }

                    className="bg-[#171717] px-4 py-2 rounded text-white hover:bg-[#333] transition"
                >

                    {t(
                        "reportsPage.actions.exportExcel"
                    )}

                </button>

            </div>


            {/* TABLA */}

            {isLoading ? (

                <p>
                    {t(
                        "reportsPage.loading"
                    )}
                </p>

            ) : isError ? (

                <p className="text-red-500">

                    {t(
                        "reportsPage.loadError"
                    )}

                    {error
                        ?.response
                        ?.status
                        ? ` (HTTP ${error.response.status})`
                        : ""
                    }
                    .

                </p>

            ) : (

                <table className="w-full text-left border-collapse border border-[#2a2a2a]">

                    <thead className="bg-[#1f1f1f]">

                    <tr>

                        <th className="p-3">
                            {t(
                                "reportsPage.table.date"
                            )}
                        </th>

                        <th className="p-3">
                            {t(
                                "reportsPage.table.user"
                            )}
                        </th>

                        <th className="p-3">
                            {t(
                                "reportsPage.table.customer"
                            )}
                        </th>

                        <th className="p-3">
                            {t(
                                "reportsPage.table.method"
                            )}
                        </th>

                        <th className="p-3">
                            {t(
                                "reportsPage.table.total"
                            )}
                        </th>

                        <th className="p-3">
                            {t(
                                "reportsPage.table.invoice"
                            )}
                        </th>

                    </tr>

                    </thead>


                    <tbody>

                    {filteredReports.length ===
                    0 ? (

                        <tr>

                            <td
                                colSpan="6"

                                className="text-center py-4 text-[#888]"
                            >

                                {t(
                                    "reportsPage.empty"
                                )}

                            </td>

                        </tr>

                    ) : (

                        filteredReports.map(
                            (
                                report
                            ) => (

                                <tr
                                    key={
                                        report._id
                                    }

                                    className="border-t border-[#2a2a2a]"
                                >

                                    <td className="p-3">

                                        {formatDate(
                                            report.createdAt,
                                            localization
                                        )}

                                    </td>


                                    <td className="p-3">

                                        {report
                                                .user
                                                ?.name ||
                                            "—"
                                        }

                                    </td>


                                    <td className="p-3">

                                        {getClientDisplayName(
                                            report
                                        )}

                                    </td>


                                    <td className="p-3">

                                        {getPaymentMethodDisplayLabel(
                                            report
                                                .paymentMethod ||
                                            "Efectivo"
                                        )}

                                    </td>


                                    <td className="p-3 font-bold text-[#38bdf8]">

                                        {currency(
                                            report
                                                .bills
                                                ?.totalWithTax
                                        )}

                                    </td>


                                    <td className="p-3">

                                        {report._id ? (

                                            <>

                                                <button
                                                    type="button"

                                                    onClick={() =>
                                                        verFactura(
                                                            report._id
                                                        )
                                                    }

                                                    className="text-blue-400 hover:underline"
                                                >

                                                    {t(
                                                        "reportsPage.actions.viewInvoice"
                                                    )}

                                                </button>


                                                <button
                                                    type="button"

                                                    onClick={() =>
                                                        verFactura(
                                                            report._id
                                                        )
                                                    }

                                                    className="text-green-400 hover:underline ml-3"
                                                >

                                                    {t(
                                                        "reportsPage.actions.download"
                                                    )}

                                                </button>

                                            </>

                                        ) : (

                                            <span className="text-xs text-gray-500">

                                                    {t(
                                                        "reportsPage.notAvailable"
                                                    )}

                                                </span>

                                        )}

                                    </td>

                                </tr>

                            )
                        )

                    )}

                    </tbody>

                </table>

            )}


            {/* TOAST */}

            {toast.open && (

                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999]">

                    <div
                        className={`px-4 py-3 rounded-xl shadow-2xl border backdrop-blur ${
                            toast.type ===
                            "error"
                                ? "bg-red-500/15 border-red-500/30 text-red-200"
                                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                        }`}
                    >

                        <div className="flex items-center gap-3">

                            <div className="text-sm font-medium">
                                {toast.message}
                            </div>


                            <button
                                type="button"

                                className="ml-2 text-white/70 hover:text-white"

                                onClick={() =>
                                    setToast(
                                        (
                                            current
                                        ) => ({
                                            ...current,
                                            open: false,
                                        })
                                    )
                                }
                            >
                                ✕
                            </button>

                        </div>

                    </div>

                </div>

            )}

          {selectedOrderInvoice?._id && (
              <Invoice order={selectedOrderInvoice} onClose={() => setSelectedOrderInvoice(null)} />
          )}
        </div>
    );
};


export default Reports;