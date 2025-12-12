// pos-frontend/src/pages/Orders.jsx
import React, { useState, useEffect, useRef } from "react";
import BottomNav from "../components/shared/BottomNav";
import OrderCard from "../components/orders/OrderCard";
import BackButton from "../components/shared/BackButton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getOrders } from "../https/index";
import { enqueueSnackbar } from "notistack";

const Orders = () => {
    const [status, setStatus] = useState("all");
    const [orders, setOrders] = useState([]);

    // 🔔 referencia al audio y a las órdenes previas
    const audioRef = useRef(null);
    const prevOrderIdsRef = useRef(new Set());
    const firstLoadRef = useRef(true);

    useEffect(() => {
        document.title = "POS | Orders";
        // Carga el sonido de nueva orden
        audioRef.current = new Audio("/sounds/new-order.mp3");
    }, []);

    const { data: resData, isError } = useQuery({
        queryKey: ["orders"],
        queryFn: getOrders,
        placeholderData: keepPreviousData,
        // 🔁 refrescar automáticamente cada 2 segundos
        refetchInterval: 2000,
        refetchIntervalInBackground: true,
    });

    // Cuando vienen datos nuevos del servidor
    useEffect(() => {
        const serverOrders = resData?.data?.data ?? [];

        // ---- DETECTAR ÓRDENES NUEVAS ----
        const currentIds = new Set(serverOrders.map((o) => o._id));
        const prevIds = prevOrderIdsRef.current;

        // En la primera carga solo guardamos el estado, no sonamos nada
        if (firstLoadRef.current) {
            firstLoadRef.current = false;
        } else {
            // Buscar ids que antes no existían
            const newIds = [...currentIds].filter((id) => !prevIds.has(id));

            if (newIds.length > 0 && audioRef.current) {
                // Sonar la campana (ignoramos errores del navegador)
                audioRef.current
                    .play()
                    .catch(() => {
                        // por si el navegador bloquea autoplay, no rompemos nada
                    });

                enqueueSnackbar(
                    `${newIds.length} nueva(s) orden(es) recibida(s)`,
                    { variant: "info" }
                );
            }
        }

        // Actualizar referencia de ids previos
        prevOrderIdsRef.current = currentIds;

        // Guardar órdenes en el estado local
        setOrders(serverOrders);
    }, [resData]);

    if (isError) {
        enqueueSnackbar("Failed to load orders", { variant: "error" });
    }

    // Callback que recibe OrderCard cuando cambia el status
    const handleStatusChanged = (orderId, newStatus) => {
        setOrders((prev) => {
            // Si el backend indicó que la orden se borró, la quitamos del array
            if (newStatus === "__DELETE__") {
                return prev.filter((order) => order._id !== orderId);
            }

            // Si no, solo actualizamos el estado
            return prev.map((order) =>
                order._id === orderId ? { ...order, orderStatus: newStatus } : order
            );
        });
    };

    const filteredOrders =
        orders.filter((order) => {
            if (status === "all") return true;
            return order.orderStatus?.toLowerCase() === status;
        }) ?? [];

    return (
        <section className="bg-[#1f1f1f] min-h-screen flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-[#2b2b2b]">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <h1 className="text-[#f5f5f5] text-2xl font-bold">Orders</h1>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                    {["all", "in progress", "ready", "completed", "cancelled"].map(
                        (key) => (
                            <button
                                key={key}
                                onClick={() => setStatus(key)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                                    status === key
                                        ? "bg-[#383838] text-white"
                                        : "text-gray-400 hover:bg-[#2b2b2b]"
                                }`}
                            >
                                {key === "all"
                                    ? "All"
                                    : key === "in progress"
                                        ? "In Progress"
                                        : key.charAt(0).toUpperCase() + key.slice(1)}
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Orders Grid */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-6 py-5 pb-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                        <OrderCard
                            key={order._id}
                            order={order}
                            onStatusChanged={handleStatusChanged}
                        />
                    ))
                ) : (
                    <p className="text-center text-gray-400 col-span-full py-10">
                        No orders available
                    </p>
                )}
            </div>

            <BottomNav />
        </section>
    );
};

export default Orders;
