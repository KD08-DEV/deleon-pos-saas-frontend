import React, { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "../components/shared/BottomNav";
import OrderCard from "../components/orders/OrderCard";
import BackButton from "../components/shared/BackButton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getOrders } from "../https/index";
import { enqueueSnackbar } from "notistack";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, ListOrdered, ChevronDown, Check } from "lucide-react";

const INITIAL_VISIBLE_ORDERS = 24;
const LOAD_MORE_STEP = 12;

const getItemProductType = (item) => {
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

    const found = candidates.find((value) => String(value || "").trim());
    return found ? String(found).trim() : null;
};

const orderHasProductType = (order, productType) => {
    if (!productType || productType === "all") return true;
    return (order?.items || []).some((item) => getItemProductType(item) === productType);
};

const sortOrdersOldestTopNewestBottom = (orders) => {
    return [...(orders || [])].sort((a, b) => {
        const aTime = new Date(a?.createdAt || 0).getTime();
        const bTime = new Date(b?.createdAt || 0).getTime();
        return aTime - bTime;
    });
};

const Orders = () => {
    const [status, setStatus] = useState("all");
    const [orders, setOrders] = useState([]);
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ORDERS);
    const [productTypeFilter, setProductTypeFilter] = useState("all");
    const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);

    const audioRef = useRef(null);
    const prevOrderIdsRef = useRef(new Set());
    const firstLoadRef = useRef(true);
    const typeMenuRef = useRef(null);

    useEffect(() => {
        document.title = "POS | Orders";
        audioRef.current = new Audio("/sounds/new-order.mp3");
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (typeMenuRef.current && !typeMenuRef.current.contains(event.target)) {
                setIsTypeMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const { data: resData, isError } = useQuery({
        queryKey: ["orders"],
        queryFn: getOrders,
        placeholderData: keepPreviousData,
        refetchInterval: 2000,
        refetchIntervalInBackground: true,
    });

    useEffect(() => {
        const serverOrders = resData?.data?.data ?? [];

        const currentIds = new Set(serverOrders.map((o) => o._id));
        const prevIds = prevOrderIdsRef.current;

        if (firstLoadRef.current) {
            firstLoadRef.current = false;
        } else {
            const newIds = [...currentIds].filter((id) => !prevIds.has(id));

            if (newIds.length > 0 && audioRef.current) {
                audioRef.current.play().catch(() => {});
                enqueueSnackbar(`${newIds.length} nueva(s) orden(es) recibida(s)`, {
                    variant: "info",
                });
            }
        }

        prevOrderIdsRef.current = currentIds;
        setOrders(serverOrders);
    }, [resData]);

    useEffect(() => {
        setVisibleCount(INITIAL_VISIBLE_ORDERS);
    }, [status, productTypeFilter]);

    useEffect(() => {
        if (isError) {
            enqueueSnackbar("Failed to load orders", { variant: "error" });
        }
    }, [isError]);

    const handleStatusChanged = (updatedOrder) => {
        if (!updatedOrder?._id) return;
        setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
    };

    const statusFilteredOrders = useMemo(() => {
        if (status === "all") return orders || [];
        return (orders || []).filter((order) => order.orderStatus === status);
    }, [orders, status]);

    const availableProductTypes = useMemo(() => {
        const unique = new Set();

        for (const order of statusFilteredOrders || []) {
            for (const item of order?.items || []) {
                const type = getItemProductType(item);
                if (type) unique.add(type);
            }
        }

        return Array.from(unique).sort((a, b) => a.localeCompare(b, "es"));
    }, [statusFilteredOrders]);

    const productTypeCounts = useMemo(() => {
        const counts = {};

        for (const order of statusFilteredOrders || []) {
            const localTypes = new Set();

            for (const item of order?.items || []) {
                const type = getItemProductType(item);
                if (type) localTypes.add(type);
            }

            localTypes.forEach((type) => {
                counts[type] = (counts[type] || 0) + 1;
            });
        }

        return counts;
    }, [statusFilteredOrders]);

    const filteredOrders = useMemo(() => {
        const statusFiltered = (orders || []).filter((order) => {
            if (status !== "all" && order.orderStatus !== status) return false;
            return orderHasProductType(order, productTypeFilter);
        });

        return sortOrdersOldestTopNewestBottom(statusFiltered);
    }, [orders, status, productTypeFilter]);

    const visibleOrders = useMemo(() => {
        if (filteredOrders.length <= visibleCount) return filteredOrders;
        return filteredOrders.slice(filteredOrders.length - visibleCount);
    }, [filteredOrders, visibleCount]);

    const hasMoreOrders = filteredOrders.length > visibleCount;

    const STATUS_TABS = [
        { key: "all", label: "Todo", icon: ListOrdered },
        { key: "En Progreso", label: "En Progreso", icon: Filter },
        { key: "Listo", label: "Listo", icon: Filter },
        { key: "Completado", label: "Completado", icon: Filter },
        { key: "Cancelado", label: "Cancelado", icon: Filter },
    ];

    const selectedTypeLabel =
        productTypeFilter === "all" ? "Todos" : productTypeFilter;

    return (
        <section className="relative min-h-screen flex flex-col pb-24 bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f]">
            <div className="relative z-10 px-2 sm:px-3 lg:px-4 max-w-full mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-4 px-4 sm:px-6 py-6"
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <BackButton />
                            <div className="flex items-center gap-2">
                                <ListOrdered className="text-blue-400 w-6 h-6" />
                                <h1 className="text-[#f5f5f5] text-2xl sm:text-3xl font-bold tracking-wide">
                                    Ordenes
                                </h1>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                            <div className="relative" ref={typeMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsTypeMenuOpen((prev) => !prev)}
                                    className="flex items-center justify-between gap-3 min-w-[220px] rounded-xl border border-[#2a2a2a]/70 bg-[#171717] px-3 py-2.5 text-sm text-[#f5f5f5] shadow-lg hover:border-blue-500/40 transition-all"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Filter className="w-4 h-4 text-blue-400 shrink-0" />
                                        <span className="text-[#9ca3af] shrink-0">Tipo</span>
                                        <span className="truncate font-medium text-white">
                                            {selectedTypeLabel}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={`w-4 h-4 text-[#9ca3af] transition-transform ${
                                            isTypeMenuOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>

                                {isTypeMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-[280px] max-h-80 overflow-y-auto rounded-xl border border-[#2a2a2a] bg-[#111111] shadow-2xl z-[9999] p-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProductTypeFilter("all");
                                                setIsTypeMenuOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
                                                productTypeFilter === "all"
                                                    ? "bg-blue-500/15 text-blue-300"
                                                    : "text-[#e5e7eb] hover:bg-[#1b1b1b]"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="truncate">Todos</span>
                                                <span className="text-xs text-[#888]">
                                                    ({statusFilteredOrders.length})
                                                </span>
                                            </div>
                                            {productTypeFilter === "all" && (
                                                <Check className="w-4 h-4" />
                                            )}
                                        </button>

                                        <div className="my-2 border-t border-[#222]" />

                                        {availableProductTypes.length === 0 ? (
                                            <div className="px-3 py-3 text-sm text-[#888]">
                                                No hay categorías disponibles.
                                            </div>
                                        ) : (
                                            availableProductTypes.map((type) => {
                                                const isSelected = productTypeFilter === type;
                                                return (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => {
                                                            setProductTypeFilter(type);
                                                            setIsTypeMenuOpen(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
                                                            isSelected
                                                                ? "bg-blue-500/15 text-blue-300"
                                                                : "text-[#e5e7eb] hover:bg-[#1b1b1b]"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="truncate">{type}</span>
                                                            <span className="text-xs text-[#888]">
                                                                ({productTypeCounts[type] || 0})
                                                            </span>
                                                        </div>
                                                        {isSelected && <Check className="w-4 h-4" />}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

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
                                            ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30"
                                            : "bg-gradient-to-r from-[#1f1f1f] to-[#252525] text-[#ababab] border border-[#2a2a2a]/50"
                                    }`}
                                >
                                    <Icon className="w-4 h-4 relative z-10" />
                                    <span className="relative z-10">{tab.label}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
                    <AnimatePresence mode="wait">
                        {filteredOrders.length > 0 ? (
                            <motion.div
                                key="orders-grid"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm text-[#ababab]">
                                        Mostrando {visibleOrders.length} de {filteredOrders.length} órdenes.
                                    </p>
                                    <p className="text-xs text-[#666]">
                                        Ordenadas con las más recientes abajo.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {visibleOrders.map((order) => (
                                        <OrderCard
                                            key={order._id}
                                            order={order}
                                            onStatusChanged={handleStatusChanged}
                                        />
                                    ))}
                                </div>

                                {hasMoreOrders && (
                                    <div className="mt-6 flex justify-center">
                                        <button
                                            onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_STEP)}
                                            className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                        >
                                            Cargar más anteriores
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="orders-empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-20 text-[#888]"
                            >
                                No hay órdenes para mostrar.
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