import React, { useEffect, useMemo } from "react";
import BottomNav from "../components/shared/BottomNav";
import Greetings from "../components/home/Greetings";
import { Activity, CheckCircle2 } from "lucide-react";
import MiniCard from "../components/home/MiniCard";
import RecentOrders from "../components/home/RecentOrders";
import PopularDishes from "../components/home/PopularDishes";
import { useQuery } from "@tanstack/react-query";
import { getOrders } from "../https";
import { enqueueSnackbar } from "notistack";

const isSameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

const Home = () => {
    useEffect(() => {
        document.title = "POS | Home";
    }, []);

    const { data: resData, isError } = useQuery({
        queryKey: ["orders"],
        queryFn: getOrders,
    });

    useEffect(() => {
        if (isError) enqueueSnackbar("Failed to load orders!", { variant: "error" });
    }, [isError]);

    // Memoizar todos los cálculos pesados
    const { activeOrdersCount, totalCompleted } = useMemo(() => {
        const orders = resData?.data?.data || [];
        
        const activeOrdersCount = orders.filter(
            (o) =>
                o.orderStatus === "En Progreso" ||
                o.orderStatus === "Listo" ||
                o.orderStatus === "Pendiente"
        ).length;

        const totalCompleted = orders.filter((o) => o.orderStatus === "Completado").length;
        
        return { activeOrdersCount, totalCompleted };
    }, [resData?.data?.data]);



    return (
        // Página con scroll optimizada
        <section className="relative min-h-screen overflow-y-auto pt-4 pb-24 bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] transition-colors duration-300">
            {/* Efectos de fondo simplificados - sin animaciones costosas */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
            </div>
            
            <div className="relative z-10 px-2 sm:px-3 lg:px-4 max-w-full mx-auto">
                {/* Greetings con margen inferior consistente */}
                <div className="mb-6">
                    <Greetings />
                </div>

                {/* Layout simétrico: 2 columnas desde lg con gap consistente */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Columna izquierda: Ordenes Activas + Recent Orders */}
                    <div className="flex flex-col gap-6">
                        <MiniCard
                            title="Ordenes Activas"
                            number={activeOrdersCount}
                            footerNum={0}
                            icon={<Activity className="w-6 h-6" />}
                        />
                        <RecentOrders />
                    </div>

                    {/* Columna derecha: Completado + Popular Dishes */}
                    <div className="flex flex-col gap-6">
                        <MiniCard
                            title="Completado"
                            icon={<CheckCircle2 className="w-6 h-6" />}
                            number={totalCompleted}
                            footerNum={0}
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
