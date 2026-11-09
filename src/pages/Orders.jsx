import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    keepPreviousData,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    motion,
    AnimatePresence,
} from "framer-motion";

import {
    Filter,
    ListOrdered,
    ChevronDown,
    Check,
    Calendar,
    History,
    RefreshCcw,
} from "lucide-react";

import {
    enqueueSnackbar,
} from "notistack";

import BottomNav from "../components/shared/BottomNav";
import OrderCard from "../components/orders/OrderCard";
import OrderCorrectionGlobalHistory from "../components/orders/OrderCorrectionGlobalHistory";
import BackButton from "../components/shared/BackButton";
import api from "../lib/api";
import useTenant from "../hooks/useTenant";
import { useTranslation } from "react-i18next";


const INITIAL_VISIBLE_ORDERS =
    24;

const LOAD_MORE_STEP =
    12;

const ORDERS_UI_PREFS_KEY =
    "deleonsoft_orders_ui_prefs";


const DATE_FILTERS = [
    {
        key:
            "24h",

        labelKey:
            "ordersPage.dateFilters.last24h",
    },
    {
        key:
            "7d",

        labelKey:
            "ordersPage.dateFilters.last7Days",
    },
    {
        key:
            "all",

        labelKey:
            "ordersPage.dateFilters.all",
    },
];


/*
 * IMPORTANTE:
 *
 * Estos valores siguen normalizando
 * los estados internos del backend.
 *
 * NO deben traducirse.
 */
const STATUS_MAP = {
    "In Progress":
        "En Progreso",

    Ready:
        "Listo",

    Completed:
        "Completado",

    Cancelled:
        "Cancelado",

    Canceled:
        "Cancelado",
};


const STATUS_TABS = [
    {
        key:
            "all",

        labelKey:
            "ordersPage.statusTabs.all",

        icon:
        ListOrdered,
    },
    {
        key:
            "En Progreso",

        labelKey:
            "orderCard.status.inProgress",

        icon:
        Filter,
    },
    {
        key:
            "Completado",

        labelKey:
            "orderCard.status.completed",

        icon:
        Filter,
    },
    {
        key:
            "Cancelado",

        labelKey:
            "orderCard.status.cancelled",

        icon:
        Filter,
    },
];


const VIEW_MODES = [
    {
        key:
            "display",

        labelKey:
            "ordersPage.viewModes.display",
    },
    {
        key:
            "list",

        labelKey:
            "ordersPage.viewModes.list",
    },
    {
        key:
            "comfortable",

        labelKey:
            "ordersPage.viewModes.comfortable",
    },
    {
        key:
            "compact",

        labelKey:
            "ordersPage.viewModes.compact",
    },
];


const VIEW_GRID_CLASSES = {
    display:
        "grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5",

    comfortable:
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",

    compact:
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4",

    list:
        "grid grid-cols-1 gap-4",
};


const extractOrdersResponse = (
    response
) => {
    const payload =
        response?.data ??
        response;


    if (
        Array.isArray(
            payload
        )
    ) {
        return payload;
    }


    if (
        Array.isArray(
            payload?.data
        )
    ) {
        return payload.data;
    }


    if (
        Array.isArray(
            payload?.orders
        )
    ) {
        return payload.orders;
    }


    if (
        Array.isArray(
            payload
                ?.data
                ?.orders
        )
    ) {
        return payload
            .data
            .orders;
    }


    return [];
};


const normalizeOrderStatus = (
    status
) => {
    const value =
        String(
            status ||
            ""
        ).trim();


    return (
        STATUS_MAP[
            value
            ] ||
        value ||
        "En Progreso"
    );
};


const getItemProductType = (
    item
) => {
    const candidates = [
        item?.productType,
        item?.itemType,
        item?.station,
        item?.kitchenStation,
        item?.prepStation,
        item?.preparationType,
        item?.productionType,
        item?.category,
        item?.dishCategory,
        item?.dish?.category,
        item?.dishInfo?.category,
    ];


    const found =
        candidates.find(
            (
                value
            ) =>
                String(
                    value ||
                    ""
                ).trim()
        );


    return found
        ? String(
            found
        ).trim()
        : null;
};


const orderHasProductType = (
    order,
    productType
) => {
    if (
        !productType ||
        productType ===
        "all"
    ) {
        return true;
    }


    return (
        order?.items ||
        []
    ).some(
        (
            item
        ) =>
            getItemProductType(
                item
            ) ===
            productType
    );
};


const sortOrdersOldestTopNewestBottom = (
    orders
) => {
    return [
        ...(
            orders ||
            []
        ),
    ].sort(
        (
            a,
            b
        ) => {
            const aTime =
                new Date(
                    a?.createdAt ||
                    0
                ).getTime();


            const bTime =
                new Date(
                    b?.createdAt ||
                    0
                ).getTime();


            return (
                aTime -
                bTime
            );
        }
    );
};


const orderMatchesDateFilter = (
    order,
    dateFilter
) => {
    if (
        dateFilter ===
        "all"
    ) {
        return true;
    }


    const createdAt =
        order?.createdAt
            ? new Date(
                order.createdAt
            ).getTime()
            : 0;


    if (
        !createdAt ||
        Number.isNaN(
            createdAt
        )
    ) {
        return false;
    }


    const difference =
        Date.now() -
        createdAt;


    /*
     * No mostrar timestamps futuros
     * por datos incorrectos.
     */
    if (
        difference <
        0
    ) {
        return false;
    }


    if (
        dateFilter ===
        "24h"
    ) {
        return (
            difference <=
            24 *
            60 *
            60 *
            1000
        );
    }


    if (
        dateFilter ===
        "7d"
    ) {
        return (
            difference <=
            7 *
            24 *
            60 *
            60 *
            1000
        );
    }


    return true;
};


const getOrdersUiPrefs =
    () => {
        try {
            if (
                typeof window ===
                "undefined"
            ) {
                return {};
            }


            return JSON.parse(
                localStorage.getItem(
                    ORDERS_UI_PREFS_KEY
                ) ||
                "{}"
            );

        } catch {
            return {};
        }
    };


const saveOrdersUiPref = (
    key,
    value
) => {
    try {
        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }


        const current =
            getOrdersUiPrefs();


        localStorage.setItem(
            ORDERS_UI_PREFS_KEY,
            JSON.stringify({
                ...current,

                [
                    key
                    ]:
                value,
            })
        );

    } catch {
        /*
         * No detener la pantalla
         * si localStorage falla.
         */
    }
};


const Orders = () => {
    const {
        t,
    } =
        useTranslation();


    const [showGlobalHistory, setShowGlobalHistory] = useState(false);

    const { data: historyAccess } = useQuery({
        queryKey: ["order-correction-history-access", String(localStorage.getItem("tenantId") || ""), String(localStorage.getItem("clientId") || "default")],
        queryFn: async () => (await api.get("/api/order/correction/access")).data,
        staleTime: 30000,
        retry: false,
    });
    const mayViewHistory = historyAccess?.data?.canEdit === true;

    const queryClient =
        useQueryClient();


    const {
        tenantInfo,
    } =
        useTenant();


    const savedPrefs =
        useMemo(
            () =>
                getOrdersUiPrefs(),
            []
        );


    const [
        visibleCount,
        setVisibleCount,
    ] =
        useState(
            INITIAL_VISIBLE_ORDERS
        );


    const [
        status,
        setStatus,
    ] =
        useState(
            savedPrefs.status === "Listo" ? "all" : (savedPrefs.status || "all")
        );


    const [
        productTypeFilter,
        setProductTypeFilter,
    ] =
        useState(
            savedPrefs
                .productTypeFilter ||
            "all"
        );


    const [
        dateFilter,
        setDateFilter,
    ] =
        useState(
            savedPrefs
                .dateFilter ||
            "24h"
        );


    const [
        viewMode,
        setViewMode,
    ] =
        useState(
            savedPrefs
                .viewMode ||
            "display"
        );


    const [
        isTypeMenuOpen,
        setIsTypeMenuOpen,
    ] =
        useState(
            false
        );


    const [
        currentTime,
        setCurrentTime,
    ] =
        useState(
            Date.now()
        );


    const audioRef =
        useRef(
            null
        );


    const previousOrderIdsRef =
        useRef(
            new Set()
        );


    const firstLoadRef =
        useRef(
            true
        );


    const typeMenuRef =
        useRef(
            null
        );


    const ordersLimit =
        useMemo(
            () => {
                if (
                    dateFilter ===
                    "24h"
                ) {
                    return 120;
                }


                if (
                    dateFilter ===
                    "7d"
                ) {
                    return 300;
                }


                return 500;
            },
            [
                dateFilter,
            ]
        );


    const ordersQueryKey =
        useMemo(
            () => [
                "orders",
                dateFilter,
            ],
            [
                dateFilter,
            ]
        );


    /*
     * ==========================================
     * TÍTULO DEL NAVEGADOR
     * ==========================================
     */

    useEffect(
        () => {
            document.title =
                t(
                    "ordersPage.pageTitle"
                );
        },
        [
            t,
        ]
    );


    /*
     * ==========================================
     * SONIDO DE NUEVA ORDEN
     * ==========================================
     */

    useEffect(
        () => {
            audioRef.current =
                new Audio(
                    "/sounds/new-order.mp3"
                );


            return () => {
                if (
                    audioRef.current
                ) {
                    audioRef
                        .current
                        .pause();


                    audioRef.current =
                        null;
                }
            };
        },
        []
    );


    /*
     * ==========================================
     * RELOJ PARA TIEMPOS DE ESPERA
     * ==========================================
     */

    useEffect(
        () => {
            const interval =
                setInterval(
                    () => {
                        setCurrentTime(
                            Date.now()
                        );
                    },
                    30000
                );


            return () =>
                clearInterval(
                    interval
                );
        },
        []
    );


    /*
     * ==========================================
     * CERRAR FILTRO AL HACER CLICK FUERA
     * ==========================================
     */

    useEffect(
        () => {
            const handleClickOutside =
                (
                    event
                ) => {
                    if (
                        typeMenuRef
                            .current &&
                        !typeMenuRef
                            .current
                            .contains(
                                event.target
                            )
                    ) {
                        setIsTypeMenuOpen(
                            false
                        );
                    }
                };


            document.addEventListener(
                "mousedown",
                handleClickOutside
            );


            return () => {
                document.removeEventListener(
                    "mousedown",
                    handleClickOutside
                );
            };
        },
        []
    );


    /*
     * Evita reproducir sonido
     * al cambiar el filtro.
     */
    useEffect(
        () => {
            firstLoadRef.current =
                true;


            previousOrderIdsRef.current =
                new Set();
        },
        [
            dateFilter,
        ]
    );


    /*
     * ==========================================
     * CONSULTA DE ÓRDENES
     * ==========================================
     */

    const {
        data:
            orders = [],

        isLoading,
        isFetching,
        isFetched,
        isError,
        error,
        refetch,
    } =
        useQuery({
            queryKey:
            ordersQueryKey,

            queryFn:
                async ({
                           signal,
                       }) => {
                    const response =
                        await api.get(
                            "/api/order",
                            {
                                params: {
                                    range:
                                    dateFilter,

                                    limit:
                                    ordersLimit,
                                },

                                signal,
                            }
                        );


                    return extractOrdersResponse(
                        response
                    );
                },

            placeholderData:
            keepPreviousData,

            staleTime:
                1500,

            gcTime:
                5 *
                60 *
                1000,

            refetchInterval:
                () => {
                    if (
                        typeof document !==
                        "undefined" &&
                        document
                            .visibilityState ===
                        "visible"
                    ) {
                        return 5000;
                    }


                    return false;
                },

            refetchIntervalInBackground:
                false,

            refetchOnMount:
                "always",

            refetchOnWindowFocus:
                true,

            refetchOnReconnect:
                true,

            retry:
                1,

            retryDelay:
                1000,
        });


    /*
     * ==========================================
     * DETECTAR ÓRDENES NUEVAS
     * ==========================================
     */

    useEffect(
        () => {
            if (
                !isFetched
            ) {
                return;
            }


            const currentIds =
                new Set(
                    (
                        orders ||
                        []
                    )
                        .map(
                            (
                                order
                            ) =>
                                order?._id
                        )
                        .filter(
                            Boolean
                        )
                );


            if (
                firstLoadRef
                    .current
            ) {
                firstLoadRef.current =
                    false;


                previousOrderIdsRef.current =
                    currentIds;


                return;
            }


            const previousIds =
                previousOrderIdsRef
                    .current;


            const newIds =
                [
                    ...currentIds,
                ].filter(
                    (
                        id
                    ) =>
                        !previousIds
                            .has(
                                id
                            )
                );


            if (
                newIds.length >
                0 &&
                audioRef.current
            ) {
                audioRef
                    .current
                    .play()
                    .catch(
                        () => {}
                    );


                enqueueSnackbar(
                    t(
                        "ordersPage.messages.newOrdersReceived",
                        {
                            count:
                            newIds.length,
                        }
                    ),
                    {
                        variant:
                            "info",
                    }
                );
            }


            previousOrderIdsRef.current =
                currentIds;
        },
        [
            orders,
            isFetched,
            t,
        ]
    );


    /*
     * Reiniciar paginación visual
     * cuando cambia un filtro.
     */
    useEffect(
        () => {
            setVisibleCount(
                INITIAL_VISIBLE_ORDERS
            );
        },
        [
            status,
            productTypeFilter,
            dateFilter,
        ]
    );


    /*
     * ==========================================
     * ERROR DE CARGA
     * ==========================================
     */

    useEffect(
        () => {
            if (
                !isError
            ) {
                return;
            }


            const message =
                error
                    ?.response
                    ?.data
                    ?.message ||
                error?.message ||
                t(
                    "ordersPage.loadError"
                );


            enqueueSnackbar(
                message,
                {
                    variant:
                        "error",
                }
            );
        },
        [
            isError,
            error,
            t,
        ]
    );


    /*
     * ==========================================
     * PREFERENCIAS DE UI
     * ==========================================
     */

    useEffect(
        () => {
            saveOrdersUiPref(
                "status",
                status
            );
        },
        [
            status,
        ]
    );


    useEffect(
        () => {
            saveOrdersUiPref(
                "productTypeFilter",
                productTypeFilter
            );
        },
        [
            productTypeFilter,
        ]
    );


    useEffect(
        () => {
            saveOrdersUiPref(
                "dateFilter",
                dateFilter
            );
        },
        [
            dateFilter,
        ]
    );


    useEffect(
        () => {
            saveOrdersUiPref(
                "viewMode",
                viewMode
            );
        },
        [
            viewMode,
        ]
    );


    /*
     * ==========================================
     * ACTUALIZACIÓN LOCAL DE ESTADO
     * ==========================================
     */

    const handleStatusChanged =
        useCallback(
            (
                updatedOrder
            ) => {
                if (
                    !updatedOrder?._id
                ) {
                    return;
                }


                queryClient
                    .setQueriesData(
                        {
                            queryKey: [
                                "orders",
                            ],
                        },
                        (
                            currentOrders = []
                        ) => {
                            if (
                                !Array.isArray(
                                    currentOrders
                                )
                            ) {
                                return currentOrders;
                            }


                            return currentOrders
                                .map(
                                    (
                                        order
                                    ) =>
                                        order?._id ===
                                        updatedOrder._id
                                            ? updatedOrder
                                            : order
                                );
                        }
                    );
            },
            [
                queryClient,
            ]
        );


    /*
     * ==========================================
     * FILTRO DE FECHA
     * ==========================================
     */

    const dateFilteredOrders =
        useMemo(
            () => {
                return (
                    orders ||
                    []
                ).filter(
                    (
                        order
                    ) =>
                        orderMatchesDateFilter(
                            order,
                            dateFilter
                        )
                );
            },
            [
                orders,
                dateFilter,
            ]
        );


    /*
     * ==========================================
     * FILTRO DE ESTADO
     * ==========================================
     */

    const statusFilteredOrders =
        useMemo(
            () => {
                if (
                    status ===
                    "all"
                ) {
                    return dateFilteredOrders;
                }


                return dateFilteredOrders
                    .filter(
                        (
                            order
                        ) =>
                            normalizeOrderStatus(
                                order
                                    ?.orderStatus
                            ) ===
                            status
                    );
            },
            [
                dateFilteredOrders,
                status,
            ]
        );


    /*
     * ==========================================
     * TIPOS DE PRODUCTO DISPONIBLES
     * ==========================================
     */

    const availableProductTypes =
        useMemo(
            () => {
                const unique =
                    new Set();


                for (
                    const order
                    of statusFilteredOrders
                    ) {
                    for (
                        const item
                        of order?.items ||
                    []
                        ) {
                        const type =
                            getItemProductType(
                                item
                            );


                        if (
                            type
                        ) {
                            unique.add(
                                type
                            );
                        }
                    }
                }


                /*
                 * Los nombres de las categorías
                 * son datos del negocio.
                 *
                 * NO se traducen.
                 */
                return Array
                    .from(
                        unique
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a.localeCompare(
                                b,
                                "es"
                            )
                    );
            },
            [
                statusFilteredOrders,
            ]
        );


    /*
     * ==========================================
     * CANTIDAD DE ÓRDENES POR TIPO
     * ==========================================
     */

    const productTypeCounts =
        useMemo(
            () => {
                const counts =
                    {};


                for (
                    const order
                    of statusFilteredOrders
                    ) {
                    const localTypes =
                        new Set();


                    for (
                        const item
                        of order?.items ||
                    []
                        ) {
                        const type =
                            getItemProductType(
                                item
                            );


                        if (
                            type
                        ) {
                            localTypes.add(
                                type
                            );
                        }
                    }


                    localTypes
                        .forEach(
                            (
                                type
                            ) => {
                                counts[
                                    type
                                    ] =
                                    (
                                        counts[
                                            type
                                            ] ||
                                        0
                                    ) +
                                    1;
                            }
                        );
                }


                return counts;
            },
            [
                statusFilteredOrders,
            ]
        );


    /*
     * ==========================================
     * FILTRO POR TIPO DE PRODUCTO
     * ==========================================
     */

    const filteredOrders =
        useMemo(
            () => {
                const productFiltered =
                    statusFilteredOrders
                        .filter(
                            (
                                order
                            ) =>
                                orderHasProductType(
                                    order,
                                    productTypeFilter
                                )
                        );


                return sortOrdersOldestTopNewestBottom(
                    productFiltered
                );
            },
            [
                statusFilteredOrders,
                productTypeFilter,
            ]
        );


    /*
     * ==========================================
     * PAGINACIÓN VISUAL
     * ==========================================
     */

    const visibleOrders =
        useMemo(
            () => {
                if (
                    filteredOrders.length <=
                    visibleCount
                ) {
                    return filteredOrders;
                }


                return filteredOrders
                    .slice(
                        filteredOrders.length -
                        visibleCount
                    );
            },
            [
                filteredOrders,
                visibleCount,
            ]
        );


    const hasMoreOrders =
        filteredOrders.length >
        visibleCount;


    /*
     * ==========================================
     * LABELS VISIBLES
     * ==========================================
     */

    const selectedTypeLabel =
        productTypeFilter ===
        "all"
            ? t(
                "ordersPage.allTypes"
            )
            : productTypeFilter;


    const selectedDateFilterKey =
        DATE_FILTERS.find(
            (
                item
            ) =>
                item.key ===
                dateFilter
        )?.labelKey ||
        "ordersPage.dateFilters.all";


    const selectedDateFilterLabel =
        t(
            selectedDateFilterKey
        );


    return (
        <section className="relative min-h-screen flex flex-col pb-24 bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f]">

            <div className="relative z-10 px-2 sm:px-3 lg:px-4 max-w-full mx-auto w-full">

                {/* ======================================
                    HEADER / FILTROS
                ====================================== */}

                <motion.div
                    initial={{
                        opacity:
                            0,

                        y:
                            -20,
                    }}

                    animate={{
                        opacity:
                            1,

                        y:
                            0,
                    }}

                    transition={{
                        duration:
                            0.3,
                    }}

                    className="flex flex-col gap-4 px-4 sm:px-6 py-6"
                >

                    <div className="flex flex-col gap-3">

                        <div className="flex items-center gap-4">

                            <BackButton />


                            <div className="flex items-center gap-2">

                                <ListOrdered className="text-blue-400 w-6 h-6" />


                                <h1 className="text-[#f5f5f5] text-2xl sm:text-3xl font-bold tracking-wide">

                                    {t(
                                        "ordersPage.title"
                                    )}

                                </h1>


                                {isFetching &&
                                    !isLoading && (

                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-300">

                                        <RefreshCcw className="h-3 w-3 animate-spin" />


                                            {t(
                                                "ordersPage.updating"
                                            )}

                                    </span>

                                    )}

                            </div>

                        </div>


                        <div className="orders-toolbar flex flex-wrap items-center gap-2 min-w-0">

                            {mayViewHistory && (
                                <button
                                    type="button"
                                    onClick={() => setShowGlobalHistory(true)}
                                    className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/35 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-400/20"
                                >
                                    <History className="h-4 w-4" />
                                    {t("ordersPage.correctionHistoryAll")}
                                </button>
                            )}


                            {/* ==========================
                                FILTRO DE FECHA
                            ========================== */}

                            <div className="flex flex-wrap items-center gap-1 max-w-full rounded-xl border border-[#2a2a2a]/70 bg-[#171717] p-1">

                                <div className="hidden sm:flex items-center gap-1 px-2 text-[#9ca3af] text-xs whitespace-nowrap">

                                    <Calendar className="w-4 h-4 text-blue-400" />


                                    {t(
                                        "ordersPage.date"
                                    )}

                                </div>


                                {DATE_FILTERS.map(
                                    (
                                        item
                                    ) => {
                                        const isActive =
                                            dateFilter ===
                                            item.key;


                                        return (
                                            <button
                                                key={
                                                    item.key
                                                }

                                                type="button"

                                                onClick={() =>
                                                    setDateFilter(
                                                        item.key
                                                    )
                                                }

                                                className={`px-2 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                                    isActive
                                                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                        : "text-[#ababab] hover:bg-[#222] hover:text-white border border-transparent"
                                                }`}
                                            >

                                                {t(
                                                    item.labelKey
                                                )}

                                            </button>
                                        );
                                    }
                                )}

                            </div>


                            {/* ==========================
                                FILTRO POR TIPO
                            ========================== */}

                            <div
                                className="relative"

                                ref={
                                    typeMenuRef
                                }
                            >

                                <button
                                    type="button"

                                    onClick={() =>
                                        setIsTypeMenuOpen(
                                            (
                                                previous
                                            ) =>
                                                !previous
                                        )
                                    }

                                    className="flex items-center justify-between gap-2 min-w-[160px] rounded-xl border border-[#2a2a2a]/70 bg-[#171717] px-3 py-2 text-xs text-[#f5f5f5] hover:border-blue-500/40 transition-all"
                                >

                                    <div className="flex items-center gap-2 min-w-0">

                                        <Filter className="w-4 h-4 text-blue-400 shrink-0" />


                                        <span className="text-[#9ca3af] shrink-0">

                                            {t(
                                                "ordersPage.type"
                                            )}

                                        </span>


                                        <span className="truncate font-medium text-white">

                                            {selectedTypeLabel}

                                        </span>

                                    </div>


                                    <ChevronDown
                                        className={`w-4 h-4 text-[#9ca3af] transition-transform ${
                                            isTypeMenuOpen
                                                ? "rotate-180"
                                                : ""
                                        }`}
                                    />

                                </button>


                                {isTypeMenuOpen && (

                                    <div className="absolute right-0 mt-2 w-[280px] max-h-80 overflow-y-auto rounded-xl border border-[#2a2a2a] bg-[#111111] shadow-2xl z-[9999] p-2">

                                        <button
                                            type="button"

                                            onClick={() => {
                                                setProductTypeFilter(
                                                    "all"
                                                );


                                                setIsTypeMenuOpen(
                                                    false
                                                );
                                            }}

                                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
                                                productTypeFilter ===
                                                "all"
                                                    ? "bg-blue-500/15 text-blue-300"
                                                    : "text-[#e5e7eb] hover:bg-[#1b1b1b]"
                                            }`}
                                        >

                                            <div className="flex items-center gap-2 min-w-0">

                                                <span className="truncate">

                                                    {t(
                                                        "ordersPage.allTypes"
                                                    )}

                                                </span>


                                                <span className="text-xs text-[#888]">

                                                    (
                                                    {statusFilteredOrders.length}
                                                    )

                                                </span>

                                            </div>


                                            {productTypeFilter ===
                                                "all" && (

                                                    <Check className="w-4 h-4" />

                                                )}

                                        </button>


                                        <div className="my-2 border-t border-[#222]" />


                                        {availableProductTypes.length ===
                                        0 ? (

                                            <div className="px-3 py-3 text-sm text-[#888]">

                                                {t(
                                                    "ordersPage.noCategories"
                                                )}

                                            </div>

                                        ) : (

                                            availableProductTypes.map(
                                                (
                                                    type
                                                ) => {
                                                    const isSelected =
                                                        productTypeFilter ===
                                                        type;


                                                    return (
                                                        <button
                                                            key={
                                                                type
                                                            }

                                                            type="button"

                                                            onClick={() => {
                                                                setProductTypeFilter(
                                                                    type
                                                                );


                                                                setIsTypeMenuOpen(
                                                                    false
                                                                );
                                                            }}

                                                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
                                                                isSelected
                                                                    ? "bg-blue-500/15 text-blue-300"
                                                                    : "text-[#e5e7eb] hover:bg-[#1b1b1b]"
                                                            }`}
                                                        >

                                                            <div className="flex items-center gap-2 min-w-0">

                                                                <span className="truncate">

                                                                    {type}

                                                                </span>


                                                                <span className="text-xs text-[#888]">

                                                                    (
                                                                    {productTypeCounts[
                                                                            type
                                                                            ] ||
                                                                        0
                                                                    }
                                                                    )

                                                                </span>

                                                            </div>


                                                            {isSelected && (

                                                                <Check className="w-4 h-4" />

                                                            )}

                                                        </button>
                                                    );
                                                }
                                            )

                                        )}

                                    </div>

                                )}

                            </div>


                            {/* ==========================
                                MODO DE VISTA
                            ========================== */}

                            <div className="flex flex-wrap items-center gap-1 max-w-full rounded-xl border border-[#2a2a2a]/70 bg-[#171717] p-1">

                                {VIEW_MODES.map(
                                    (
                                        mode
                                    ) => {
                                        const isActive =
                                            viewMode ===
                                            mode.key;


                                        return (
                                            <button
                                                key={
                                                    mode.key
                                                }

                                                type="button"

                                                onClick={() =>
                                                    setViewMode(
                                                        mode.key
                                                    )
                                                }

                                                className={`px-2 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                                    isActive
                                                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                                        : "text-[#ababab] hover:bg-[#222] hover:text-white border border-transparent"
                                                }`}
                                            >

                                                {t(
                                                    mode.labelKey
                                                )}

                                            </button>
                                        );
                                    }
                                )}

                            </div>

                        </div>

                    </div>


                    {/* ==============================
                        FILTROS DE ESTADO
                    ============================== */}

                    <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">

                        {STATUS_TABS.map(
                            (
                                tab
                            ) => {
                                const isActive =
                                    status ===
                                    tab.key;


                                const Icon =
                                    tab.icon;


                                return (
                                    <motion.button
                                        key={
                                            tab.key
                                        }

                                        type="button"

                                        onClick={() =>
                                            setStatus(
                                                tab.key
                                            )
                                        }

                                        whileHover={{
                                            scale:
                                                1.05,
                                        }}

                                        whileTap={{
                                            scale:
                                                0.95,
                                        }}

                                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                                            isActive
                                                ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30"
                                                : "bg-gradient-to-r from-[#1f1f1f] to-[#252525] text-[#ababab] border border-[#2a2a2a]/50"
                                        }`}
                                    >

                                        <Icon className="w-4 h-4 relative z-10" />


                                        <span className="relative z-10">

                                            {t(
                                                tab.labelKey
                                            )}

                                        </span>

                                    </motion.button>
                                );
                            }
                        )}

                    </div>

                </motion.div>


                {/* ======================================
                    LISTADO DE ÓRDENES
                ====================================== */}

                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">

                    <AnimatePresence mode="wait">

                        {isLoading ? (

                            <motion.div
                                key="orders-loading"

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

                                className="py-20 text-center text-[#ababab]"
                            >

                                <RefreshCcw className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-400" />


                                {t(
                                    "ordersPage.loading"
                                )}

                            </motion.div>

                        ) : isError ? (

                            <motion.div
                                key="orders-error"

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

                                className="py-20 text-center"
                            >

                                <p className="text-red-400">

                                    {t(
                                        "ordersPage.loadError"
                                    )}

                                </p>


                                <button
                                    type="button"

                                    onClick={() =>
                                        refetch()
                                    }

                                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/25"
                                >

                                    <RefreshCcw className="h-4 w-4" />


                                    {t(
                                        "ordersPage.retry"
                                    )}

                                </button>

                            </motion.div>

                        ) : filteredOrders.length >
                        0 ? (

                            <motion.div
                                key="orders-grid"

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

                                transition={{
                                    duration:
                                        0.3,
                                }}
                            >

                                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">

                                    <p className="text-sm text-[#ababab]">

                                        {t(
                                            "ordersPage.showingOrders",
                                            {
                                                visible:
                                                visibleOrders.length,

                                                total:
                                                filteredOrders.length,

                                                date:
                                                selectedDateFilterLabel,
                                            }
                                        )}

                                    </p>


                                    <p className="text-xs text-[#666]">

                                        {t(
                                            "ordersPage.sortedNewestBottom"
                                        )}

                                    </p>

                                </div>


                                <div
                                    className={
                                        VIEW_GRID_CLASSES[
                                            viewMode
                                            ] ||
                                        VIEW_GRID_CLASSES
                                            .comfortable
                                    }
                                >

                                    {visibleOrders.map(
                                        (
                                            order
                                        ) => (

                                            <OrderCard
                                                key={
                                                    order._id
                                                }

                                                order={
                                                    order
                                                }

                                                onStatusChanged={
                                                    handleStatusChanged
                                                }

                                                currentTime={
                                                    currentTime
                                                }

                                                viewMode={
                                                    viewMode
                                                }

                                                tenantInfo={
                                                    tenantInfo
                                                }
                                            />

                                        )
                                    )}

                                </div>


                                {hasMoreOrders && (

                                    <div className="mt-6 flex justify-center">

                                        <button
                                            type="button"

                                            onClick={() =>
                                                setVisibleCount(
                                                    (
                                                        previous
                                                    ) =>
                                                        previous +
                                                        LOAD_MORE_STEP
                                                )
                                            }

                                            className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                                        >

                                            {t(
                                                "ordersPage.loadMorePrevious"
                                            )}

                                        </button>

                                    </div>

                                )}

                            </motion.div>

                        ) : (

                            <motion.div
                                key="orders-empty"

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

                                className="text-center py-20 text-[#888]"
                            >

                                {t(
                                    "ordersPage.empty"
                                )}

                            </motion.div>

                        )}

                    </AnimatePresence>

                </div>

            </div>


            {showGlobalHistory && (
                <OrderCorrectionGlobalHistory onClose={() => setShowGlobalHistory(false)} />
            )}

            <BottomNav />

        </section>
    );
};


export default Orders;