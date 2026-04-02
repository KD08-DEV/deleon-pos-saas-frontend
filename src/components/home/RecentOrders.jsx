import React, { useMemo, useState } from "react";
import { Search, Clock } from "lucide-react";
import OrderList from "./OrderList";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders } from "../../https/index";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";

const INITIAL_LIMIT = 10;
const LOAD_MORE_STEP = 10;

const RecentOrders = ({ fill = false }) => {
    const { userData } = useSelector((state) => state.user);
    const tenantId = userData?.tenantId;

    const [search, setSearch] = useState("");
    const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT);

    const { data: resData, isError } = useQuery({
        queryKey: ["orders", tenantId],
        enabled: !!tenantId,
        queryFn: async () => await getOrders(tenantId),
        placeholderData: keepPreviousData,
    });

    if (isError) {
        enqueueSnackbar("Something went wrong!", { variant: "error" });
    }

    const orders = useMemo(() => {
        const raw = resData?.data?.data ?? [];

        return [...raw].sort((a, b) => {
            const aDate = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
            const bDate = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
            return bDate - aDate;
        });
    }, [resData]);

    const filteredOrders = useMemo(() => {
        const term = String(search || "").trim().toLowerCase();
        if (!term) return orders;

        return orders.filter((order) => {
            const customerName = String(order?.customerDetails?.name || "").toLowerCase();
            const orderId = String(order?._id || "").toLowerCase();
            const tableNo = String(order?.table?.tableNo || "").toLowerCase();
            const status = String(order?.orderStatus || "").toLowerCase();

            return (
                customerName.includes(term) ||
                orderId.includes(term) ||
                tableNo.includes(term) ||
                status.includes(term)
            );
        });
    }, [orders, search]);

    const visibleOrders = useMemo(() => {
        return filteredOrders.slice(0, visibleCount);
    }, [filteredOrders, visibleCount]);

    const hasMore = visibleCount < filteredOrders.length;
    const canShowLess = visibleCount > INITIAL_LIMIT;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full"
        >
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#1a1a1a] w-full rounded-xl shadow-lg flex flex-col border border-[#2a2a2a]/50 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center px-4 sm:px-6 py-4 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border-b border-blue-500/10">
                    <div className="flex items-center gap-2">
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                            <Clock className="text-blue-400 w-5 h-5" />
                        </motion.div>
                        <h1 className="text-[#f5f5f5] text-base sm:text-lg font-semibold tracking-wide">
                            Órdenes Recientes
                        </h1>
                    </div>
                </div>

                <motion.div
                    whileFocus={{ scale: 1.02 }}
                    className="flex items-center gap-3 bg-gradient-to-r from-[#1f1f1f] to-[#252525] rounded-xl px-4 sm:px-6 py-3 mx-4 sm:mx-6 mt-4 border border-[#2a2a2a]/50 focus-within:border-blue-500/50 transition-all"
                >
                    <Search className="text-[#ababab] text-sm sm:text-base" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setVisibleCount(INITIAL_LIMIT);
                        }}
                        placeholder="Busca tus órdenes recientes..."
                        className="bg-transparent outline-none text-[#f5f5f5] w-full text-sm sm:text-base placeholder:text-gray-500"
                    />
                </motion.div>

                <div
                    className="recent-orders-scroll mt-3 px-4 sm:px-6 pb-4 overflow-y-auto space-y-2 max-h-[55vh] md:max-h-[60vh] xl:max-h-[65vh] 2xl:max-h-[70vh]"
                    style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "#3a3a3a #1a1a1a",
                    }}
                >
                    {visibleOrders.length ? (
                        <>
                            {visibleOrders.map((order) => (
                                <OrderList key={order._id} order={order} />
                            ))}

                            <div className="pt-3 flex flex-wrap gap-3 justify-center">
                                {hasMore && (
                                    <button
                                        type="button"
                                        onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_STEP)}
                                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
                                    >
                                        Ver más
                                    </button>
                                )}

                                {canShowLess && (
                                    <button
                                        type="button"
                                        onClick={() => setVisibleCount(INITIAL_LIMIT)}
                                        className="px-4 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#353535] text-white font-medium transition-all"
                                    >
                                        Ver menos
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-gray-500 text-sm sm:text-base py-8 text-center"
                        >
                            No hay pedidos disponibles
                        </motion.p>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default RecentOrders;