import React from "react";
import { Search, Clock } from "lucide-react";
import OrderList from "./OrderList";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders } from "../../https/index";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";

const RecentOrders = ({ fill = false }) => {
    const { userData } = useSelector((state) => state.user);

    const tenantId = userData?.tenantId;

    const { data: resData, isError } = useQuery({
        queryKey: ["orders", tenantId],
        enabled: !!tenantId, // 👈 importante
        queryFn: async () => await getOrders(tenantId), // 👈 ya enviamos el tenantId correcto
        placeholderData: keepPreviousData,
    });

    if (isError) {
        enqueueSnackbar("Something went wrong!", { variant: "error" });
    }

    const orders = resData?.data?.data ?? [];

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
                            Ordenes Recientes
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
                        placeholder="Busca tus ordenes recientes..."
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
                    {orders.length ? (
                        orders.map((order) => (
                            <OrderList key={order._id} order={order} />
                        ))
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
