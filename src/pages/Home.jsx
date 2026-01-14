import React, { useEffect } from "react";
import BottomNav from "../components/shared/BottomNav";
import Greetings from "../components/home/Greetings";
import { BsCashCoin } from "react-icons/bs";
import { GrCheckmark } from "react-icons/gr";
import MiniCard from "../components/home/MiniCard";
import RecentOrders from "../components/home/RecentOrders";
import PopularDishes from "../components/home/PopularDishes";
import { useQuery } from "@tanstack/react-query";
import { getOrders } from "../https";
import { enqueueSnackbar } from "notistack";
import { BsActivity } from "react-icons/bs";
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


    const orders = resData?.data?.data || [];
    const activeOrdersCount = orders.filter(
        (o) =>
            o.orderStatus === "En Progreso" ||
            o.orderStatus === "Listo" ||
            o.orderStatus === "Pendiente"
    ).length;

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (d1, d2) =>
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();

    const validOrders = orders.filter((o) => o.orderStatus !== "Cancelado");
    const totalEarnings = validOrders.reduce(
        (acc, o) => acc + (o.bills?.totalWithTax || 0),
        0
    );

    const earningsToday = orders
        .filter((o) => isSameDay(new Date(o?.orderDate || o?.createdAt), today))
        .reduce((s, o) => s + (o?.bills?.totalWithTax || 0), 0);

    const earningsYesterday = orders
        .filter((o) => isSameDay(new Date(o?.orderDate || o?.createdAt), yesterday))
        .reduce((s, o) => s + (o?.bills?.totalWithTax || 0), 0);

    const totalCompleted = orders.filter((o) => o.orderStatus === "Completado").length;


    const calculatePercentage = (today, yesterday) => {
        if (yesterday > 0) return ((today - yesterday) / yesterday) * 100;
        return today > 0 ? 100 : 0;
    };



    return (
        // Página con scroll (no scroll interno en los paneles)
        <section className="bg-[#1f1f1f] min-h-screen overflow-y-auto px-4 sm:px-6 md:px-8 py-4">
            <Greetings />

            {/* Layout simétrico: 2 columnas desde md */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Columna izquierda: Total Earnings + Recent Orders */}
                <div className="flex flex-col gap-6">
                    <MiniCard
                        title="Ordenes Activas"
                        number={activeOrdersCount}
                        footerNum={0}
                        icon={<BsActivity />}
                    />
                    {/* Sin 'fill' para que el scroll sea de la página */}
                    <RecentOrders />
                </div>

                {/* Columna derecha: Completed + Popular Dishes */}
                <div className="flex flex-col gap-6">
                    <MiniCard
                        title="Completado"
                        icon={<GrCheckmark />}
                        number={totalCompleted}
                        footerNum={0}
                    />
                    {/* Sin 'fill' para que el scroll sea de la página */}
                    <PopularDishes />
                </div>
            </div>

            <BottomNav />
        </section>
    );
};


export default Home;
