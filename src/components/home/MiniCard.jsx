import React, {
    memo,
    useMemo,
} from "react";

import {
    motion,
} from "framer-motion";

import {
    useTranslation,
} from "react-i18next";

import useTenant from "../../hooks/useTenant";

import {
    formatMoney,
    getTenantLocalization,
} from "../../lib/localization";


const normalizeTitle = (
    value
) =>
    String(
        value ||
        ""
    )
        .trim()
        .toLowerCase()
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );


const getMetricMeta = (
    title,
    metricType
) => {
    /*
     * metricType es opcional.
     *
     * Permite que en el futuro el componente
     * no dependa absolutamente del texto
     * recibido en title.
     */
    if (
        metricType
    ) {
        return {
            type:
            metricType,

            titleKey:
                metricType ===
                "activeOrders"
                    ? "homeDashboard.miniCard.activeOrders"
                    : metricType ===
                    "revenue"
                        ? "homeDashboard.miniCard.revenue"
                        : metricType ===
                        "totalEarnings"
                            ? "homeDashboard.miniCard.totalEarnings"
                            : null,
        };
    }


    const normalized =
        normalizeTitle(
            title
        );


    /*
     * SOPORTAMOS AMBOS IDIOMAS
     * SIN CAMBIAR EL COMPONENTE PADRE.
     */
    if (
        [
            "ordenes activas",
            "active orders",
        ].includes(
            normalized
        )
    ) {
        return {
            type:
                "activeOrders",

            titleKey:
                "homeDashboard.miniCard.activeOrders",
        };
    }


    if (
        [
            "revenue",
            "ingresos",
        ].includes(
            normalized
        )
    ) {
        return {
            type:
                "revenue",

            titleKey:
                "homeDashboard.miniCard.revenue",
        };
    }


    if (
        [
            "total earnings",
            "ganancias totales",
        ].includes(
            normalized
        )
    ) {
        return {
            type:
                "totalEarnings",

            titleKey:
                "homeDashboard.miniCard.totalEarnings",
        };
    }


    /*
     * Para cualquier tarjeta desconocida
     * conservamos el título recibido.
     */
    return {
        type:
            "generic",

        titleKey:
            null,
    };
};


const MiniCard = memo(
    ({
         title,
         icon,
         number,
         footerNum,
         metricType,
     }) => {
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


        const metricMeta =
            useMemo(
                () =>
                    getMetricMeta(
                        title,
                        metricType
                    ),
                [
                    title,
                    metricType,
                ]
            );


        const displayTitle =
            metricMeta.titleKey
                ? t(
                    metricMeta.titleKey
                )
                : title;


        const {
            footerColor,
            isEarnings,
            displayedNumber,
            cardGradient,
            iconGradient,
            borderColor,
        } =
            useMemo(
                () => {
                    const footerColor =
                        footerNum >
                        0
                            ? "text-green-400"
                            : footerNum <
                            0
                                ? "text-red-400"
                                : "text-[#ababab]";


                    const isEarnings =
                        metricMeta.type ===
                        "totalEarnings" ||
                        metricMeta.type ===
                        "revenue";


                    const isActiveOrders =
                        metricMeta.type ===
                        "activeOrders";


                    const displayedNumber =
                        isEarnings
                            ? formatMoney(
                                number,
                                localization
                            )
                            : number;


                    const cardGradient =
                        isActiveOrders
                            ? "from-green-500/10 via-emerald-500/10 to-teal-500/10"
                            : "from-yellow-500/10 via-amber-500/10 to-orange-500/10";


                    const iconGradient =
                        isActiveOrders
                            ? "from-green-500 to-emerald-500"
                            : "from-yellow-500 to-amber-500";


                    const borderColor =
                        isActiveOrders
                            ? "border-green-500/30"
                            : "border-yellow-500/30";


                    return {
                        footerColor,
                        isEarnings,
                        displayedNumber,
                        cardGradient,
                        iconGradient,
                        borderColor,
                    };
                },
                [
                    number,
                    footerNum,
                    metricMeta.type,
                    localization.locale,
                    localization.currency,
                ]
            );


        return (
            <motion.div
                initial={{
                    opacity:
                        0,

                    y:
                        20,
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

                    ease:
                        "easeOut",
                }}

                whileHover={{
                    y:
                        -3,

                    scale:
                        1.01,
                }}

                className={`relative overflow-hidden bg-gradient-to-br ${cardGradient} py-6 px-6 rounded-xl w-full border ${borderColor} group hover:shadow-lg transition-all duration-300`}
            >

                <div className="relative flex items-start justify-between">

                    <div className="flex-1">

                        <h1 className="text-[#ababab] text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 transition-colors duration-300">

                            {displayTitle}

                        </h1>


                        <h1 className="text-[#f5f5f5] text-3xl sm:text-4xl font-bold mt-2 transition-colors duration-300">

                            {displayedNumber}

                        </h1>


                        {isEarnings && (

                            <p className="text-xs sm:text-sm mt-3 flex items-center gap-1">

                                <span
                                    className={
                                        footerColor
                                    }
                                >

                                    {footerNum >
                                    0
                                        ? "↑"
                                        : footerNum <
                                        0
                                            ? "↓"
                                            : "→"
                                    }

                                </span>


                                <span
                                    className={
                                        footerColor
                                    }
                                >

                                    {Math.abs(
                                        footerNum
                                    )}%

                                </span>


                                <span className="text-[#ababab] transition-colors duration-300">

                                    {t(
                                        "homeDashboard.miniCard.comparedToYesterday"
                                    )}

                                </span>

                            </p>

                        )}

                    </div>


                    <div
                        className={`relative bg-gradient-to-br ${iconGradient} p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-200`}
                    >

                        <div className="text-white text-xl sm:text-2xl">

                            {icon}

                        </div>

                    </div>

                </div>


                <div
                    className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${iconGradient} rounded-full opacity-50`}
                />

            </motion.div>
        );
    }
);


MiniCard.displayName =
    "MiniCard";


export default MiniCard;