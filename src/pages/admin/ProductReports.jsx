// src/pages/admin/ProductReports.jsx
import React, {
    useEffect,
    useMemo,
    useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Download,
    TrendingUp,
    Package,
    Award,
    Tag,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import useTenant from "../../hooks/useTenant";

import {
    formatMoney,
    getTenantLocalization,
    getTodayYMD,
} from "../../lib/localization";


const ProductReports = () => {
    const { t } =
        useTranslation();


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


    const [
        filters,
        setFilters,
    ] =
        useState(
            () => {
                const today =
                    getTodayYMD(
                        localization
                    );


                return {
                    from:
                    today,

                    to:
                    today,

                    category:
                        "",
                };
            }
        );


    useEffect(
        () => {
            const today =
                getTodayYMD(
                    localization
                );


            setFilters(
                (
                    previous
                ) => ({
                    ...previous,

                    from:
                    today,

                    to:
                    today,
                })
            );
        },
        [
            localization.timezone,
        ]
    );


    const [
        productSearch,
        setProductSearch,
    ] =
        useState(
            ""
        );


    const [
        productSort,
        setProductSort,
    ] =
        useState({
            key:
                "totalQuantity",

            direction:
                "desc",
        });


    const [
        toast,
        setToast,
    ] =
        useState({
            open:
                false,

            message:
                "",

            type:
                "error",
        });


    const showToast = (
        message,
        type = "error"
    ) => {
        setToast({
            open:
                true,

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
                        (
                            current
                        ) => ({
                            ...current,

                            open:
                                false,
                        })
                    ),
                3500
            );
    };


    const toNumber = (
        value
    ) => {
        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ? number
            : 0;
    };


    const normalizeText = (
        value
    ) =>
        (
            value ??
            ""
        )
            .toString()
            .trim()
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase();


    const isEmptyCategory = (
        value
    ) => {
        const text =
            normalizeText(
                value
            );


        return (
            !text ||
            text ===
            "sin categoria" ||
            text ===
            "sin category" ||
            text ===
            "uncategorized"
        );
    };


    const pickFirstText = (
        ...values
    ) => {
        for (
            const value
            of values
            ) {
            const text =
                (
                    value ??
                    ""
                )
                    .toString()
                    .trim();


            if (
                text
            ) {
                return text;
            }
        }


        return "";
    };


    /*
     * ==========================================
     * FALLBACKS INTERNOS
     * ==========================================
     *
     * NO traducir estos valores internos.
     *
     * El idioma solo cambia su representación
     * visual mediante los helpers de display.
     */

    const UNKNOWN_PRODUCT =
        "Producto Desconocido";


    const UNCATEGORIZED =
        "Sin Categoría";


    const getInventoryCategoryFromRow = (
        row
    ) => {
        const candidates = [
            row
                ?.inventoryCategoryName,

            row
                ?.inventoryCategory
                ?.name,

            row
                ?.inventoryCategory
                ?.title,

            row
                ?.inventoryCategory,

            row
                ?.categoryName,

            row
                ?.category
                ?.name,

            row
                ?.category
                ?.title,

            row
                ?.category,
        ];


        for (
            const value
            of candidates
            ) {
            const text =
                (
                    value ??
                    ""
                )
                    .toString()
                    .trim();


            if (
                text &&
                !isEmptyCategory(
                    text
                )
            ) {
                return text;
            }
        }


        return UNCATEGORIZED;
    };


    const getProductDisplayName = (
        value
    ) => {
        const raw =
            String(
                value ||
                ""
            ).trim();


        if (
            raw ===
            UNKNOWN_PRODUCT ||
            normalizeText(
                raw
            ) ===
            "unknown product"
        ) {
            return t(
                "productReports.fallbacks.unknownProduct"
            );
        }


        return raw;
    };


    const getCategoryDisplayName = (
        value
    ) => {
        const raw =
            String(
                value ||
                ""
            ).trim();


        if (
            isEmptyCategory(
                raw
            ) ||
            raw ===
            UNCATEGORIZED
        ) {
            return t(
                "productReports.fallbacks.uncategorized"
            );
        }


        return raw;
    };


    /*
     * ==========================================
     * RANGO DE FECHAS
     * ==========================================
     */

    const productDateParams =
        useMemo(
            () => {
                let from =
                    filters.from ||
                    filters.to ||
                    "";


                let to =
                    filters.to ||
                    filters.from ||
                    "";


                if (
                    from &&
                    to &&
                    to <
                    from
                ) {
                    const temp =
                        from;


                    from =
                        to;


                    to =
                        temp;
                }


                const params =
                    {};


                if (
                    from
                ) {
                    params.from =
                        from;
                }


                if (
                    to
                ) {
                    params.to =
                        to;
                }


                return params;
            },
            [
                filters.from,
                filters.to,
            ]
        );


    /*
     * ==========================================
     * API
     * ==========================================
     */

    async function fetchProductDetail(
        params
    ) {
        const res =
            await api.get(
                "/api/order/report/sales-by-product",
                {
                    params,
                }
            );


        const payload =
            res.data
                ?.data ??
            res.data;


        if (
            Array.isArray(
                payload
            )
        ) {
            return payload;
        }


        if (
            Array.isArray(
                payload
                    ?.products
            )
        ) {
            return payload
                .products;
        }


        if (
            Array.isArray(
                payload
                    ?.rows
            )
        ) {
            return payload
                .rows;
        }


        if (
            Array.isArray(
                payload
                    ?.items
            )
        ) {
            return payload
                .items;
        }


        return [];
    }


    const productReportQuery =
        useQuery({
            queryKey: [
                "sales-by-product-report",

                productDateParams,
            ],

            queryFn:
                async () =>
                    fetchProductDetail(
                        productDateParams
                    ),

            enabled:
                true,

            keepPreviousData:
                true,

            staleTime:
                30_000,
        });


    const detailRows =
        productReportQuery
            .data ||
        [];


    const isLoading =
        productReportQuery
            .isLoading;


    const isError =
        productReportQuery
            .isError;


    const error =
        productReportQuery
            .error;


    /*
     * ==========================================
     * ANÁLISIS
     * ==========================================
     */

    const productAnalysis =
        useMemo(
            () => {
                const productStats =
                    {};


                const categoryStats =
                    {};


                detailRows.forEach(
                    (
                        row
                    ) => {
                        const productName =
                            pickFirstText(
                                row
                                    ?.product,

                                row
                                    ?.name,

                                row
                                    ?.productName,

                                row
                                    ?.itemName,

                                row
                                    ?.dishName,

                                row
                                    ?.description
                            ) ||
                            UNKNOWN_PRODUCT;


                        const category =
                            getInventoryCategoryFromRow(
                                row
                            );


                        const quantity =
                            toNumber(
                                row
                                    ?.totalQuantity ??

                                row
                                    ?.quantity ??

                                row
                                    ?.qty ??

                                row
                                    ?.cantidad ??

                                row
                                    ?.cantidadVendida ??

                                row
                                    ?.totalQty
                            );


                        const revenue =
                            toNumber(
                                row
                                    ?.grossRevenue ??

                                row
                                    ?.totalWithTax ??

                                row
                                    ?.totalRevenue ??

                                row
                                    ?.revenue ??

                                row
                                    ?.ingresos ??

                                row
                                    ?.amount ??

                                row
                                    ?.totalAmount ??

                                row
                                    ?.total
                            );


                        const orderCountRaw =
                            row
                                ?.orderCount ??

                            row
                                ?.ordersCount ??

                            row
                                ?.totalOrders ??

                            row
                                ?.ordenes ??

                            row
                                ?.orders;


                        const orderCount =
                            Array.isArray(
                                orderCountRaw
                            )
                                ? orderCountRaw
                                    .length
                                : toNumber(
                                    orderCountRaw
                                );


                        if (
                            !productStats[
                                productName
                                ]
                        ) {
                            productStats[
                                productName
                                ] = {
                                name:
                                productName,

                                category,

                                totalQuantity:
                                    0,

                                totalRevenue:
                                    0,

                                orderCount:
                                    0,

                                avgPrice:
                                    0,
                            };
                        }


                        productStats[
                            productName
                            ].totalQuantity +=
                            quantity;


                        productStats[
                            productName
                            ].totalRevenue +=
                            revenue;


                        productStats[
                            productName
                            ].orderCount +=
                            orderCount;


                        if (
                            productStats[
                                productName
                                ].category ===
                            UNCATEGORIZED &&
                            category !==
                            UNCATEGORIZED
                        ) {
                            productStats[
                                productName
                                ].category =
                                category;
                        }


                        if (
                            !categoryStats[
                                category
                                ]
                        ) {
                            categoryStats[
                                category
                                ] = {
                                name:
                                category,

                                totalQuantity:
                                    0,

                                totalRevenue:
                                    0,

                                productCount:
                                    0,

                                orderCount:
                                    0,

                                products:
                                    new Set(),
                            };
                        }


                        categoryStats[
                            category
                            ].totalQuantity +=
                            quantity;


                        categoryStats[
                            category
                            ].totalRevenue +=
                            revenue;


                        categoryStats[
                            category
                            ].orderCount +=
                            orderCount;


                        categoryStats[
                            category
                            ].products.add(
                            productName
                        );
                    }
                );


                Object.keys(
                    productStats
                ).forEach(
                    (
                        productName
                    ) => {
                        const stats =
                            productStats[
                                productName
                                ];


                        stats.avgPrice =
                            stats.totalQuantity >
                            0
                                ? stats.totalRevenue /
                                stats.totalQuantity
                                : 0;
                    }
                );


                Object.keys(
                    categoryStats
                ).forEach(
                    (
                        category
                    ) => {
                        categoryStats[
                            category
                            ].productCount =
                            categoryStats[
                                category
                                ].products.size;


                        delete categoryStats[
                            category
                            ].products;
                    }
                );


                const topProductsByQuantity =
                    Object.values(
                        productStats
                    )
                        .sort(
                            (
                                a,
                                b
                            ) =>
                                b.totalQuantity -
                                a.totalQuantity
                        )
                        .slice(
                            0,
                            10
                        );


                const topProductsByRevenue =
                    Object.values(
                        productStats
                    )
                        .sort(
                            (
                                a,
                                b
                            ) =>
                                b.totalRevenue -
                                a.totalRevenue
                        )
                        .slice(
                            0,
                            10
                        );


                return {
                    productStats,

                    categoryStats,

                    topProductsByQuantity,

                    topProductsByRevenue,

                    totalProducts:
                    Object.keys(
                        productStats
                    ).length,
                };
            },
            [
                detailRows,
            ]
        );


    /*
     * ==========================================
     * TODOS LOS PRODUCTOS / BÚSQUEDA / ORDEN
     * ==========================================
     */

    const allProducts =
        useMemo(
            () => {
                const products =
                    Object.values(
                        productAnalysis
                            .productStats ||
                        {}
                    );


                const search =
                    productSearch
                        .trim()
                        .toLowerCase();


                const filtered =
                    search
                        ? products.filter(
                            (
                                product
                            ) =>
                                getProductDisplayName(
                                    product.name
                                )
                                    .toLowerCase()
                                    .includes(
                                        search
                                    )
                        )
                        : products;


                const sorted = [
                    ...filtered,
                ].sort(
                    (
                        a,
                        b
                    ) => {
                        const direction =
                            productSort.direction ===
                            "asc"
                                ? 1
                                : -1;


                        const difference =
                            (
                                a[
                                    productSort.key
                                    ] ||
                                0
                            ) -
                            (
                                b[
                                    productSort.key
                                    ] ||
                                0
                            );


                        return (
                            difference *
                            direction
                        );
                    }
                );


                return sorted;
            },
            [
                productAnalysis,
                productSearch,
                productSort,
                t,
            ]
        );


    const toggleSort = (
        key
    ) => {
        setProductSort(
            (
                previous
            ) =>
                previous.key ===
                key
                    ? {
                        key,

                        direction:
                            previous.direction ===
                            "asc"
                                ? "desc"
                                : "asc",
                    }
                    : {
                        key,

                        direction:
                            "desc",
                    }
        );
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
                    Object.values(
                        productAnalysis
                            .productStats
                    ).map(
                        (
                            product
                        ) => ({
                            [t(
                                "productReports.export.columns.product"
                            )]:
                                getProductDisplayName(
                                    product.name
                                ),


                            [t(
                                "productReports.export.columns.category"
                            )]:
                                getCategoryDisplayName(
                                    product.category
                                ),


                            [t(
                                "productReports.export.columns.quantitySold"
                            )]:
                            product.totalQuantity,


                            [t(
                                "productReports.export.columns.totalRevenue"
                            )]:
                            product.totalRevenue,


                            [t(
                                "productReports.export.columns.orders"
                            )]:
                            product.orderCount,


                            [t(
                                "productReports.export.columns.averagePrice"
                            )]:
                            product.avgPrice,
                        })
                    );


                const worksheet =
                    XLSX.utils
                        .json_to_sheet(
                            rows
                        );


                const workbook =
                    XLSX.utils
                        .book_new();


                XLSX.utils
                    .book_append_sheet(
                        workbook,
                        worksheet,

                        t(
                            "productReports.export.sheetName"
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

                    `${t(
                        "productReports.export.filePrefix"
                    )}_${getTodayYMD(
                        localization
                    )}.xlsx`
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
                        "productReports.messages.exportFailed"
                    )
                );
            }
        };


    /*
     * ==========================================
     * LOADING
     * ==========================================
     */

    if (
        isLoading
    ) {
        return (
            <div className="text-center py-8 text-gray-400">

                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38bdf8] mx-auto" />


                <p className="mt-2">

                    {t(
                        "productReports.loading"
                    )}

                </p>

            </div>
        );
    }


    /*
     * ==========================================
     * ERROR
     * ==========================================
     */

    if (
        isError
    ) {
        return (
            <div className="text-center py-8 text-red-400">

                {t(
                    "productReports.loadError"
                )}


                {error
                    ?.response
                    ?.status
                    ? ` (HTTP ${error.response.status})`
                    : ""
                }
                .

            </div>
        );
    }


    return (
        <div>

            {/* ======================================
                HEADER
            ====================================== */}

            <div className="flex items-center justify-between mb-6">

                <div>

                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">

                        <Package className="w-6 h-6 text-[#38bdf8]" />


                        {t(
                            "productReports.title"
                        )}

                    </h2>


                    <p className="text-sm text-gray-400 mt-1">

                        {t(
                            "productReports.description"
                        )}

                    </p>

                </div>


                <button
                    type="button"

                    onClick={
                        downloadExcel
                    }

                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] hover:border-[#38bdf8]/50 transition-all"
                >

                    <Download className="w-4 h-4" />


                    {t(
                        "productReports.actions.exportExcel"
                    )}

                </button>

            </div>


            {/* ======================================
                FILTROS
            ====================================== */}

            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>

                        <label className="text-xs text-gray-400 mb-1 block">

                            {t(
                                "productReports.filters.from"
                            )}

                        </label>


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

                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                        />

                    </div>


                    <div>

                        <label className="text-xs text-gray-400 mb-1 block">

                            {t(
                                "productReports.filters.to"
                            )}

                        </label>


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

                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                        />

                    </div>

                </div>

            </div>


            {/* ======================================
                RESUMEN
            ====================================== */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">

                    <div className="flex items-center justify-between mb-2">

                        <p className="text-xs text-gray-400 uppercase tracking-wide">

                            {t(
                                "productReports.summary.totalProducts"
                            )}

                        </p>


                        <Package className="w-4 h-4 text-[#38bdf8]" />

                    </div>


                    <p className="text-2xl font-bold text-white">

                        {productAnalysis.totalProducts}

                    </p>


                    <p className="text-xs text-gray-500 mt-1">

                        {t(
                            "productReports.summary.uniqueProductsSold"
                        )}

                    </p>

                </div>


                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">

                    <div className="flex items-center justify-between mb-2">

                        <p className="text-xs text-gray-400 uppercase tracking-wide">

                            {t(
                                "productReports.summary.totalCategories"
                            )}

                        </p>


                        <Tag className="w-4 h-4 text-green-400" />

                    </div>


                    <p className="text-2xl font-bold text-white">

                        {Object.keys(
                            productAnalysis
                                .categoryStats
                        ).length}

                    </p>


                    <p className="text-xs text-gray-500 mt-1">

                        {t(
                            "productReports.summary.activeCategories"
                        )}

                    </p>

                </div>


                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">

                    <div className="flex items-center justify-between mb-2">

                        <p className="text-xs text-gray-400 uppercase tracking-wide">

                            {t(
                                "productReports.summary.totalRevenue"
                            )}

                        </p>


                        <TrendingUp className="w-4 h-4 text-blue-400" />

                    </div>


                    <p className="text-2xl font-bold text-white">

                        {currency(
                            Object.values(
                                productAnalysis
                                    .productStats
                            ).reduce(
                                (
                                    sum,
                                    product
                                ) =>
                                    sum +
                                    product
                                        .totalRevenue,
                                0
                            )
                        )}

                    </p>


                    <p className="text-xs text-gray-500 mt-1">

                        {t(
                            "productReports.summary.fromProducts"
                        )}

                    </p>

                </div>

            </div>


            {/* ======================================
                TOP 10 POR CANTIDAD
            ====================================== */}

            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">

                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">

                    <Award className="w-5 h-5 text-[#38bdf8]" />


                    {t(
                        "productReports.topByQuantity"
                    )}

                </h3>


                <div className="space-y-3">

                    {productAnalysis
                        .topProductsByQuantity
                        .map(
                            (
                                product,
                                index
                            ) => {
                                const maxQuantity =
                                    productAnalysis
                                        .topProductsByQuantity[
                                        0
                                        ]
                                        ?.totalQuantity ||
                                    1;


                                const percentage =
                                    (
                                        product
                                            .totalQuantity /
                                        maxQuantity
                                    ) *
                                    100;


                                return (
                                    <div
                                        key={
                                            product.name
                                        }

                                        className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-3"
                                    >

                                        <div className="flex items-center justify-between mb-2">

                                            <div className="flex items-center gap-3">

                                                <div className="w-8 h-8 rounded-full bg-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8] font-bold text-sm">

                                                    {index + 1}

                                                </div>


                                                <div>

                                                    <p className="text-sm font-medium text-white">

                                                        {getProductDisplayName(
                                                            product.name
                                                        )}

                                                    </p>


                                                    <p className="text-xs text-gray-400">

                                                        {getCategoryDisplayName(
                                                            product.category
                                                        )}

                                                    </p>

                                                </div>

                                            </div>


                                            <div className="text-right">

                                                <p className="text-sm font-bold text-[#38bdf8]">

                                                    {product
                                                        .totalQuantity
                                                        .toFixed(
                                                            2
                                                        )}{" "}

                                                    {t(
                                                        "productReports.units"
                                                    )}

                                                </p>


                                                <p className="text-xs text-gray-400">

                                                    {currency(
                                                        product
                                                            .totalRevenue
                                                    )}

                                                </p>

                                            </div>

                                        </div>


                                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">

                                            <div
                                                className="h-2 bg-gradient-to-r from-[#38bdf8] to-[#7dd3fc] rounded-full transition-all"

                                                style={{
                                                    width:
                                                        `${percentage}%`,
                                                }}
                                            />

                                        </div>

                                    </div>
                                );
                            }
                        )}

                </div>

            </div>


            {/* ======================================
                TOP 10 POR INGRESOS
            ====================================== */}

            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">

                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">

                    <TrendingUp className="w-5 h-5 text-[#38bdf8]" />


                    {t(
                        "productReports.topByRevenue"
                    )}

                </h3>


                <div className="space-y-3">

                    {productAnalysis
                        .topProductsByRevenue
                        .map(
                            (
                                product,
                                index
                            ) => {
                                const maxRevenue =
                                    productAnalysis
                                        .topProductsByRevenue[
                                        0
                                        ]
                                        ?.totalRevenue ||
                                    1;


                                const percentage =
                                    (
                                        product
                                            .totalRevenue /
                                        maxRevenue
                                    ) *
                                    100;


                                return (
                                    <div
                                        key={
                                            product.name
                                        }

                                        className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-3"
                                    >

                                        <div className="flex items-center justify-between mb-2">

                                            <div className="flex items-center gap-3">

                                                <div className="w-8 h-8 rounded-full bg-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8] font-bold text-sm">

                                                    {index + 1}

                                                </div>


                                                <div>

                                                    <p className="text-sm font-medium text-white">

                                                        {getProductDisplayName(
                                                            product.name
                                                        )}

                                                    </p>


                                                    <p className="text-xs text-gray-400">

                                                        {getCategoryDisplayName(
                                                            product.category
                                                        )}

                                                    </p>

                                                </div>

                                            </div>


                                            <div className="text-right">

                                                <p className="text-sm font-bold text-[#38bdf8]">

                                                    {currency(
                                                        product
                                                            .totalRevenue
                                                    )}

                                                </p>


                                                <p className="text-xs text-gray-400">

                                                    {product
                                                        .totalQuantity
                                                        .toFixed(
                                                            2
                                                        )}{" "}

                                                    {t(
                                                        "productReports.units"
                                                    )}

                                                </p>

                                            </div>

                                        </div>


                                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">

                                            <div
                                                className="h-2 bg-gradient-to-r from-[#38bdf8] to-[#7dd3fc] rounded-full transition-all"

                                                style={{
                                                    width:
                                                        `${percentage}%`,
                                                }}
                                            />

                                        </div>

                                    </div>
                                );
                            }
                        )}

                </div>

            </div>


            {/* ======================================
                TODOS LOS PRODUCTOS
            ====================================== */}

            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">

                    <h3 className="text-lg font-semibold text-white">

                        {t(
                            "productReports.allProducts.title"
                        )}

                    </h3>


                    <input
                        type="text"

                        value={
                            productSearch
                        }

                        onChange={(
                            event
                        ) =>
                            setProductSearch(
                                event
                                    .target
                                    .value
                            )
                        }

                        placeholder={
                            t(
                                "productReports.allProducts.searchPlaceholder"
                            )
                        }

                        className="w-full md:w-64 px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8]/50"
                    />

                </div>


                <div className="overflow-x-auto">

                    <table className="min-w-full text-sm text-left text-gray-300">

                        <thead className="text-xs uppercase text-gray-400 bg-[#0f0f0f]">

                        <tr>

                            <th className="px-4 py-3 font-medium">

                                {t(
                                    "productReports.table.product"
                                )}

                            </th>


                            <th className="px-4 py-3 font-medium">

                                {t(
                                    "productReports.table.category"
                                )}

                            </th>


                            <th className="px-4 py-3 font-medium">

                                <button
                                    type="button"

                                    onClick={() =>
                                        toggleSort(
                                            "totalQuantity"
                                        )
                                    }

                                    className="flex items-center gap-1"
                                >

                                    {t(
                                        "productReports.table.totalQuantity"
                                    )}


                                    <span className="text-[10px] text-[#38bdf8]">

                                            {productSort.key ===
                                            "totalQuantity"
                                                ? productSort.direction ===
                                                "asc"
                                                    ? "▲"
                                                    : "▼"
                                                : ""
                                            }

                                        </span>

                                </button>

                            </th>


                            <th className="px-4 py-3 font-medium">

                                <button
                                    type="button"

                                    onClick={() =>
                                        toggleSort(
                                            "totalRevenue"
                                        )
                                    }

                                    className="flex items-center gap-1"
                                >

                                    {t(
                                        "productReports.table.totalRevenue"
                                    )}


                                    <span className="text-[10px] text-[#38bdf8]">

                                            {productSort.key ===
                                            "totalRevenue"
                                                ? productSort.direction ===
                                                "asc"
                                                    ? "▲"
                                                    : "▼"
                                                : ""
                                            }

                                        </span>

                                </button>

                            </th>


                            <th className="px-4 py-3 font-medium">

                                {t(
                                    "productReports.table.averagePrice"
                                )}

                            </th>


                            <th className="px-4 py-3 font-medium">

                                {t(
                                    "productReports.table.orders"
                                )}

                            </th>

                        </tr>

                        </thead>


                        <tbody>

                        {allProducts.length ===
                        0 ? (

                            <tr>

                                <td
                                    className="px-4 py-6 text-center text-gray-500"

                                    colSpan={
                                        6
                                    }
                                >

                                    {t(
                                        "productReports.allProducts.empty"
                                    )}

                                </td>

                            </tr>

                        ) : (

                            allProducts.map(
                                (
                                    product
                                ) => (

                                    <tr
                                        key={
                                            product.name
                                        }

                                        className="border-b border-gray-800/40 hover:bg-[#141414] transition-colors"
                                    >

                                        <td className="px-4 py-3 text-white font-medium">

                                            {getProductDisplayName(
                                                product.name
                                            )}

                                        </td>


                                        <td className="px-4 py-3">

                                            {getCategoryDisplayName(
                                                product.category
                                            )}

                                        </td>


                                        <td className="px-4 py-3">

                                            {product
                                                .totalQuantity
                                                .toFixed(
                                                    2
                                                )}

                                        </td>


                                        <td className="px-4 py-3">

                                            {currency(
                                                product
                                                    .totalRevenue
                                            )}

                                        </td>


                                        <td className="px-4 py-3">

                                            {currency(
                                                product
                                                    .avgPrice
                                            )}

                                        </td>


                                        <td className="px-4 py-3">

                                            {product.orderCount}

                                        </td>

                                    </tr>

                                )
                            )

                        )}

                        </tbody>

                    </table>

                </div>

            </div>


            {/* ======================================
                VENTAS POR CATEGORÍA
            ====================================== */}

            <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">

                <h3 className="text-lg font-semibold text-white mb-4">

                    {t(
                        "productReports.categories.title"
                    )}

                </h3>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {Object.entries(
                        productAnalysis
                            .categoryStats
                    )
                        .sort(
                            (
                                a,
                                b
                            ) =>
                                b[1]
                                    .totalRevenue -
                                a[1]
                                    .totalRevenue
                        )
                        .map(
                            ([
                                 category,
                                 stats,
                             ]) => (

                                <div
                                    key={
                                        category
                                    }

                                    className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-4"
                                >

                                    <div className="flex items-center justify-between mb-3">

                                        <h4 className="text-sm font-semibold text-white">

                                            {getCategoryDisplayName(
                                                category
                                            )}

                                        </h4>


                                        <p className="text-sm font-bold text-[#38bdf8]">

                                            {currency(
                                                stats
                                                    .totalRevenue
                                            )}

                                        </p>

                                    </div>


                                    <div className="space-y-2">

                                        <div className="flex justify-between text-xs text-gray-400">

                                            <span>

                                                {t(
                                                    "productReports.categories.quantitySold"
                                                )}
                                                :

                                            </span>


                                            <span className="text-white font-medium">

                                                {stats
                                                    .totalQuantity
                                                    .toFixed(
                                                        2
                                                    )}

                                            </span>

                                        </div>


                                        <div className="flex justify-between text-xs text-gray-400">

                                            <span>

                                                {t(
                                                    "productReports.categories.orders"
                                                )}
                                                :

                                            </span>


                                            <span className="text-white font-medium">

                                                {stats.orderCount}

                                            </span>

                                        </div>

                                    </div>

                                </div>

                            )
                        )}

                </div>

            </div>


            {/* ======================================
                TOAST
            ====================================== */}

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

                                            open:
                                                false,
                                        })
                                    )
                                }

                                aria-label={
                                    t(
                                        "common.close"
                                    )
                                }
                            >
                                ✕
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
};


export default ProductReports;