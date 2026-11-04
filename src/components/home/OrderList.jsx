import React, {
    memo,
    useMemo,
} from "react";

import {
    CheckCircle2,
    ArrowRight,
    Circle,
    X,
} from "lucide-react";

import {
    getAvatarName,
} from "../../utils/index";

import {
    motion,
} from "framer-motion";

import {
    useTranslation,
} from "react-i18next";


/*
 * IMPORTANTE:
 *
 * Aquí solamente normalizamos el estado
 * para decidir qué texto/color mostrar.
 *
 * NO modificamos order.orderStatus.
 */
const STATUS_ALIASES = {
    "en progreso":
        "inProgress",

    "in progress":
        "inProgress",

    listo:
        "ready",

    ready:
        "ready",

    completado:
        "completed",

    completed:
        "completed",

    cancelado:
        "cancelled",

    cancelled:
        "cancelled",

    canceled:
        "cancelled",
};


const STATUS_CONFIGS = {
    ready: {
        icon:
        CheckCircle2,

        bg:
            "from-green-500/20 to-emerald-500/20",

        text:
            "text-green-400",

        border:
            "border-green-500/30",
    },

    completed: {
        icon:
        CheckCircle2,

        bg:
            "from-blue-500/20 to-cyan-500/20",

        text:
            "text-blue-400",

        border:
            "border-blue-500/30",
    },

    cancelled: {
        icon:
        X,

        bg:
            "from-red-500/20 to-rose-500/20",

        text:
            "text-red-400",

        border:
            "border-red-500/30",
    },
};


const DEFAULT_STATUS_CONFIG = {
    icon:
    Circle,

    bg:
        "from-yellow-500/20 to-amber-500/20",

    text:
        "text-yellow-400",

    border:
        "border-yellow-500/30",
};


const normalizeStatusKey = (
    value
) => {
    const normalized =
        String(
            value ||
            ""
        )
            .trim()
            .toLowerCase();


    return (
        STATUS_ALIASES[
            normalized
            ] ||
        null
    );
};


const OrderList = ({
                       order,
                   }) => {
    const {
        t,
    } =
        useTranslation();


    /*
     * ================================
     * CLIENTE
     * ================================
     */

    const rawCustomerName =
        order
            ?.customerDetails
            ?.name ||
        order
            ?.customerName ||
        "";


    const normalizedCustomerName =
        String(
            rawCustomerName
        )
            .trim()
            .toLowerCase();


    /*
     * Si internamente existe:
     *
     * Consumidor Final
     *
     * mostramos:
     *
     * ES -> Consumidor Final
     * EN -> Final Consumer
     *
     * sin cambiar el dato almacenado.
     */
    const customerName =
        [
            "consumidor final",
            "final consumer",
        ].includes(
            normalizedCustomerName
        )
            ? t(
                "customerInfo.finalConsumer"
            )
            : rawCustomerName ||
            t(
                "homeDashboard.orderList.customer"
            );


    const items =
        Array.isArray(
            order?.items
        )
            ? order.items
            : [];


    /*
     * ================================
     * ESTADO
     * ================================
     */

    const statusKey =
        normalizeStatusKey(
            order?.orderStatus
        );


    const statusLabel =
        statusKey
            ? t(
                `homeDashboard.orderStatus.${statusKey}`
            )
            : String(
                order
                    ?.orderStatus ||
                ""
            ).trim() ||
            t(
                "homeDashboard.orderStatus.inProgress"
            );


    const statusConfig =
        useMemo(
            () =>
                statusKey
                    ? STATUS_CONFIGS[
                        statusKey
                        ] ||
                    DEFAULT_STATUS_CONFIG
                    : DEFAULT_STATUS_CONFIG,
            [
                statusKey,
            ]
        );


    const StatusIcon =
        statusConfig.icon;


    return (
        <motion.div
            initial={{
                opacity:
                    0,

                y:
                    5,
            }}

            animate={{
                opacity:
                    1,

                y:
                    0,
            }}

            transition={{
                duration:
                    0.2,
            }}

            whileHover={{
                x:
                    3,

                scale:
                    1.01,
            }}

            className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-[#1c1c1c] to-[#1f1f1f] hover:from-[#222] hover:to-[#252525] transition-all duration-200 border border-[#2a2a2a]/50 hover:border-blue-500/30 cursor-pointer group"
        >

            {/* AVATAR */}

            <div className="relative bg-gradient-to-br from-yellow-400 to-amber-500 text-black font-bold text-sm md:text-base w-12 h-12 flex items-center justify-center rounded-xl shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-200">

                {getAvatarName(
                    customerName
                )}

            </div>


            {/* CONTENIDO */}

            <div className="flex items-center justify-between w-full min-w-0 gap-3 relative z-10">

                {/* CLIENTE */}

                <div className="flex flex-col min-w-0 flex-1">

                    <h3
                        className="text-[#f5f5f5] font-semibold text-sm md:text-base truncate max-w-[140px] md:max-w-[180px] lg:max-w-[240px] group-hover:text-white transition-colors"

                        title={
                            customerName
                        }
                    >

                        {customerName}

                    </h3>


                    <span className="text-xs text-[#9a9a9a] flex items-center gap-1 mt-1">

                        {t(
                            "homeDashboard.orderList.itemCount",
                            {
                                count:
                                items.length,
                            }
                        )}

                    </span>

                </div>


                {/* MESA */}

                {order
                    .table
                    ?.tableNo && (

                    <div className="hidden sm:flex items-center gap-1.5 text-xs md:text-sm px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 text-yellow-400 whitespace-nowrap group-hover:scale-105 transition-transform duration-200">

                        <span>

                            {t(
                                "homeDashboard.orderList.table"
                            )}

                        </span>


                        <ArrowRight className="w-3 h-3 opacity-60" />


                        <span className="font-bold">

                            {order
                                .table
                                .tableNo
                            }

                        </span>

                    </div>

                )}


                {/* ESTADO */}

                <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r ${statusConfig.bg} border ${statusConfig.border} shadow-lg group-hover:scale-105 transition-transform duration-200`}
                >

                    <StatusIcon
                        className={`${statusConfig.text} w-3.5 h-3.5`}
                    />


                    <span
                        className={`text-xs md:text-sm font-semibold ${statusConfig.text}`}
                    >

                        {statusLabel}

                    </span>

                </div>

            </div>

        </motion.div>
    );
};


OrderList.displayName =
    "OrderList";


const areOrderListPropsEqual = (
    previousProps,
    nextProps
) => {
    const previousOrder =
        previousProps
            ?.order ||
        {};


    const nextOrder =
        nextProps
            ?.order ||
        {};


    return (
        previousOrder
            ?._id ===
        nextOrder
            ?._id &&

        previousOrder
            ?.updatedAt ===
        nextOrder
            ?.updatedAt &&

        previousOrder
            ?.orderStatus ===
        nextOrder
            ?.orderStatus &&

        previousOrder
            ?.items
            ?.length ===
        nextOrder
            ?.items
            ?.length
    );
};


export default memo(
    OrderList,
    areOrderListPropsEqual
);