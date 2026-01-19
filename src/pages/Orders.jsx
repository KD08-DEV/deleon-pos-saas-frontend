// pos-frontend/src/pages/Orders.jsx
import React, { useState, useEffect, useRef, memo } from "react";
import BottomNav from "../components/shared/BottomNav";
import OrderCard from "../components/orders/OrderCard";
import BackButton from "../components/shared/BackButton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getOrders } from "../https/index";
import { enqueueSnackbar } from "notistack";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Filter, ListOrdered } from "lucide-react";

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
    const handleStatusChanged = (updatedOrder) => {
        if (!updatedOrder?._id) return;
        setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
    };

    const filteredOrders = (orders || []).filter((order) => {
        if (status === "all") return true;
        return order.orderStatus === status;
    });

    const STATUS_TABS = [
        { key: "all", label: "Todo", icon: ListOrdered },
        { key: "En Progreso", label: "En Progreso", icon: Filter },
        { key: "Listo", label: "Listo", icon: Filter },
        { key: "Completado", label: "Completado", icon: Filter },
        { key: "Cancelado", label: "Cancelado", icon: Filter },
    ];

    return (
        <section className="relative min-h-screen flex flex-col pb-24 bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] dark:from-[#0f0f0f] dark:via-[#1a1a1a] dark:to-[#0f0f0f] from-gray-50 via-white to-gray-50 transition-colors duration-300">
            {/* Efectos de fondo simplificados */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-30 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/5 bg-blue-400/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/5 bg-purple-400/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 px-2 sm:px-3 lg:px-4 max-w-full mx-auto w-full">
                {/* Header mejorado */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col md:flex-row md:items-center justify-between px-4 sm:px-6 py-6 gap-4"
                >
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div className="flex items-center gap-2">
                            <ListOrdered className="text-blue-400 dark:text-blue-400 text-blue-600 w-6 h-6" />
                            <h1 className="text-[#f5f5f5] dark:text-[#f5f5f5] text-gray-900 text-2xl sm:text-3xl font-bold tracking-wide">Ordenes</h1>
                        </div>
                    </div>

                    {/* Tabs mejorados */}
                    <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {STATUS_TABS.map((tab) => {
                            const isActive = status === tab.key;
                            const Icon = tab.icon;
                            return (
                                <motion.button
                                    key={tab.key}
                                    onClick={() => setStatus(tab.key)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                                        isActive
                                            ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 dark:from-blue-500/20 dark:to-cyan-500/20 from-blue-500/30 to-cyan-500/30 text-blue-400 dark:text-blue-400 text-blue-600 border border-blue-500/30 dark:border-blue-500/30 border-blue-400/40 shadow-lg shadow-blue-500/10 dark:shadow-blue-500/10 shadow-blue-400/20"
                                            : "bg-gradient-to-r from-[#1f1f1f] to-[#252525] dark:from-[#1f1f1f] dark:to-[#252525] from-gray-100 to-gray-200 text-[#ababab] dark:text-[#ababab] text-gray-600 border border-[#2a2a2a]/50 dark:border-[#2a2a2a]/50 border-gray-300/50 hover:border-[#3a3a3a] dark:hover:border-[#3a3a3a] hover:border-gray-400 hover:text-white dark:hover:text-white hover:text-gray-900"
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeOrderTab"
                                            className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl"
                                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                        />
                                    )}
                                    <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-blue-400 dark:text-blue-400 text-blue-600' : ''}`} />
                                    <span className="relative z-10">{tab.label}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Orders Grid mejorado */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
                    <AnimatePresence mode="wait">
                        {filteredOrders.length > 0 ? (
                            <motion.div
                                key="orders-grid"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                            >
                                {filteredOrders.map((order, index) => (
                                    <motion.div
                                        key={order._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05, duration: 0.3 }}
                                    >
                                        <OrderCard
                                            order={order}
                                            onStatusChanged={handleStatusChanged}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty-state"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center justify-center py-20"
                            >
                                <ListOrdered className="text-[#ababab] dark:text-[#ababab] text-gray-400 w-16 h-16 mb-4 opacity-50" />
                                <p className="text-center text-[#ababab] dark:text-[#ababab] text-gray-600 text-base font-medium">
                                    No hay pedidos disponibles
                                </p>
                                <p className="text-center text-[#666] dark:text-[#666] text-gray-500 text-sm mt-2">
                                    {status !== "all" ? `Intenta con otro filtro` : "Las ordenes aparecerán aquí"}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <BottomNav />
        </section>
    );
};

export default Orders;
