import React, {
    useState,
    useEffect,
    useMemo,
    memo,
} from "react";

import {
    useSelector,
} from "react-redux";

import {
    motion,
} from "framer-motion";

import {
    Clock,
} from "lucide-react";

import {
    useTranslation,
} from "react-i18next";

import useTenant from "../../hooks/useTenant";

import {
    formatDate,
    getTenantLocalization,
} from "../../lib/localization";


const getHourInTimezone = (
    value,
    localization = {}
) => {
    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return 0;
    }


    try {
        const parts =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    timeZone:
                        localization.timezone ||
                        "America/Santo_Domingo",

                    hour:
                        "2-digit",

                    hourCycle:
                        "h23",
                }
            ).formatToParts(
                date
            );


        const hour =
            Number(
                parts.find(
                    (
                        part
                    ) =>
                        part.type ===
                        "hour"
                )?.value
            );


        return Number.isFinite(
            hour
        )
            ? hour
            : 0;

    } catch {
        return 0;
    }
};


const formatClockTime = (
    value,
    localization = {}
) => {
    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "--:--:--";
    }


    const locale =
        localization.locale ||
        "es-DO";


    const timezone =
        localization.timezone ||
        "America/Santo_Domingo";


    const hour12 =
        localization.timeFormat !==
        "24h";


    try {
        return new Intl.DateTimeFormat(
            locale,
            {
                timeZone:
                timezone,

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit",

                hour12,
            }
        ).format(
            date
        );

    } catch {
        return "--:--:--";
    }
};


const Greetings = memo(
    () => {
        const {
            t,
        } =
            useTranslation();


        const {
            userData,
        } =
            useSelector(
                (
                    state
                ) =>
                    state.user
            );


        const {
            tenantInfo,
        } =
            useTenant();


        const localization =
            useMemo(
                () =>
                    getTenantLocalization(
                        tenantInfo
                    ),
                [
                    tenantInfo,
                ]
            );


        /*
         * dateTime representa el instante actual.
         *
         * NO lo convertimos manualmente.
         * Intl se encarga de mostrar ese mismo
         * instante en el timezone del tenant.
         */
        const [
            dateTime,
            setDateTime,
        ] =
            useState(
                () =>
                    new Date()
            );


        useEffect(
            () => {
                const timer =
                    window.setInterval(
                        () => {
                            setDateTime(
                                new Date()
                            );
                        },
                        1000
                    );


                return () =>
                    window.clearInterval(
                        timer
                    );
            },
            []
        );


        const {
            formattedDate,
            formattedTime,
            greeting,
            firstName,
            professionalMessage,
        } =
            useMemo(
                () => {
                    const hour =
                        getHourInTimezone(
                            dateTime,
                            localization
                        );


                    let greeting =
                        t(
                            "homeGreeting.morning"
                        );


                    let professionalMessage =
                        t(
                            "homeGreeting.messages.morning"
                        );


                    if (
                        hour >=
                        18
                    ) {
                        greeting =
                            t(
                                "homeGreeting.evening"
                            );


                        professionalMessage =
                            t(
                                "homeGreeting.messages.evening"
                            );

                    } else if (
                        hour >=
                        12
                    ) {
                        greeting =
                            t(
                                "homeGreeting.afternoon"
                            );


                        professionalMessage =
                            t(
                                "homeGreeting.messages.afternoon"
                            );
                    }


                    return {
                        formattedDate:
                            formatDate(
                                dateTime,
                                localization
                            ),

                        formattedTime:
                            formatClockTime(
                                dateTime,
                                localization
                            ),

                        greeting,

                        firstName:
                            userData
                                ?.name
                                ?.split(
                                    " "
                                )[0] ||
                            t(
                                "homeGreeting.user"
                            ),

                        professionalMessage,
                    };
                },
                [
                    dateTime,
                    localization,
                    userData?.name,
                    t,
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
                        0.4,

                    ease:
                        "easeOut",
                }}

                className="
                    relative
                    overflow-hidden
                    bg-gradient-to-br
                    from-[#1a1a1a]
                    via-[#1f1f1f]
                    to-[#1a1a1a]
                    rounded-2xl
                    p-6
                    sm:p-8
                    border
                    border-[#2a2a2a]/50
                    transition-colors
                    duration-300
                "
            >

                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 opacity-50 dark:opacity-50" />


                <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">

                    <div className="text-left w-full sm:w-auto flex-1">

                        <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-[#f5f5f5] mb-2 transition-colors duration-300">

                            {greeting},{" "}

                            {firstName}

                        </h1>


                        <p className="text-[#ababab] text-sm sm:text-base font-medium transition-colors duration-300">

                            {professionalMessage}

                        </p>

                    </div>


                    <div className="text-left sm:text-right w-full sm:w-auto">

                        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20 transition-colors duration-300">

                            <div className="flex items-center gap-2 sm:justify-end mb-1">

                                <Clock className="text-blue-400 w-4 h-4 transition-colors duration-300" />


                                <p className="text-[#ababab] text-xs font-medium transition-colors duration-300">

                                    {formattedDate}

                                </p>

                            </div>


                            <motion.div
                                key={
                                    formattedTime
                                }

                                initial={{
                                    opacity:
                                        0.8,
                                }}

                                animate={{
                                    opacity:
                                        1,
                                }}

                                transition={{
                                    duration:
                                        0.2,
                                }}

                                className="text-3xl sm:text-4xl font-bold tracking-wide bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent transition-colors duration-300"
                            >

                                {formattedTime}

                            </motion.div>

                        </div>

                    </div>

                </div>

            </motion.div>
        );
    }
);


Greetings.displayName =
    "Greetings";


export default Greetings;