import React, {
    useEffect,
    useMemo,
} from "react";

import BottomNav from "../components/shared/BottomNav";
import Greetings from "../components/home/Greetings";
import MiniCard from "../components/home/MiniCard";
import RecentOrders from "../components/home/RecentOrders";
import PopularDishes from "../components/home/PopularDishes";

import {
    Activity,
    CheckCircle2,
} from "lucide-react";

import {
    useQuery,
} from "@tanstack/react-query";

import {
    getOrders,
} from "../https";
import api, { getScope } from "../lib/api";

import {
    enqueueSnackbar,
} from "notistack";

import {
    useTranslation,
} from "react-i18next";


const Home = () => {
    const {
        t,
    } =
        useTranslation();


    /*
     * ==========================================
     * TÍTULO DEL NAVEGADOR
     * ==========================================
     */

    useEffect(
        () => {
            document.title =
                t(
                    "homeDashboard.pageTitle"
                );
        },
        [
            t,
        ]
    );


    /*
     * ==========================================
     * ÓRDENES
     * ==========================================
     */

    const {
        data:
            resData,

        isError,
    } =
        useQuery({
            queryKey: [
                "orders", getScope().tenantId, getScope().clientId,
            ],

            // React Query envía QueryFunctionContext como argumento al queryFn;
            // nunca convertirlo en tenantId ni enviarlo a la URL.
            queryFn: () => getOrders(),
        });


    /*
     * Mensaje de error traducido.
     */
    useEffect(
        () => {
            if (
                !isError
            ) {
                return;
            }


            enqueueSnackbar(
                t(
                    "messages.loadOrdersFailed"
                ),
                {
                    variant:
                        "error",
                }
            );
        },
        [
            isError,
            t,
        ]
    );


    /*
     * ==========================================
     * MÉTRICAS DEL HOME
     * ==========================================
     *
     * IMPORTANTE:
     *
     * Los valores internos de orderStatus
     * NO se traducen.
     *
     * Seguimos comparando exactamente:
     *
     * En Progreso
     * Listo
     * Pendiente
     * Completado
     *
     * porque son valores del sistema/backend.
     */

    const { data: homeSummary } = useQuery({
        queryKey: ["home-summary", getScope().tenantId, getScope().clientId],
        queryFn: async () => (await api.get("/api/order/summary/home")).data.data,
        staleTime: 10_000,
        refetchInterval: 15_000,
    });

    // Si la estadística todavía carga, las tarjetas muestran 0 temporalmente.
    const activeOrdersCount = Number(homeSummary?.activeOrdersCount ?? 0);
    const totalCompleted = Number(homeSummary?.totalCompleted ?? 0);

    return (
        <section className="relative min-h-screen overflow-y-auto pt-4 pb-24 bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] transition-colors duration-300">

            {/* ==========================================
                EFECTOS DE FONDO
            ========================================== */}

            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">

                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

            </div>


            <div className="relative z-10 px-2 sm:px-3 lg:px-4 max-w-full mx-auto">

                {/* ==========================================
                    SALUDO
                ========================================== */}

                <div className="mb-6">

                    <Greetings />

                </div>


                {/* ==========================================
                    DASHBOARD
                ========================================== */}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* ======================================
                        COLUMNA IZQUIERDA
                        ÓRDENES ACTIVAS + ÓRDENES RECIENTES
                    ====================================== */}

                    <div className="flex flex-col gap-6">

                        <MiniCard
                            /*
                             * metricType permite que MiniCard
                             * sepa qué tipo de métrica es,
                             * independientemente del idioma.
                             */
                            metricType="activeOrders"

                            title={
                                t(
                                    "homeDashboard.miniCard.activeOrders"
                                )
                            }

                            number={
                                activeOrdersCount
                            }

                            footerNum={
                                0
                            }

                            icon={
                                <Activity className="w-6 h-6" />
                            }
                        />


                        <RecentOrders />

                    </div>


                    {/* ======================================
                        COLUMNA DERECHA
                        COMPLETADAS + PLATOS POPULARES
                    ====================================== */}

                    <div className="flex flex-col gap-6">

                        <MiniCard
                            title={
                                t(
                                    "homeDashboard.miniCard.completedOrders"
                                )
                            }

                            icon={
                                <CheckCircle2 className="w-6 h-6" />
                            }

                            number={
                                totalCompleted
                            }

                            footerNum={
                                0
                            }
                        />


                        <PopularDishes />

                    </div>

                </div>

            </div>


            <BottomNav />

        </section>
    );
};


export default Home;