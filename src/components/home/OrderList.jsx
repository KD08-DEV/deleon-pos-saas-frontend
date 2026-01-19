import React, { memo, useMemo } from "react";
import { CheckCircle2, ArrowRight, Circle, X } from "lucide-react";
import { getAvatarName } from "../../utils/index";
import { motion } from "framer-motion";

const STATUS_MAP = {
    "In Progress": "En Progreso",
    "Ready": "Listo",
    "Completed": "Completado",
    "Cancelled": "Cancelado",
    "Canceled": "Cancelado",
};

const STATUS_CONFIGS = {
    "Listo": {
        icon: CheckCircle2,
        bg: "from-green-500/20 to-emerald-500/20",
        text: "text-green-400",
        border: "border-green-500/30",
    },
    "Completado": {
        icon: CheckCircle2,
        bg: "from-blue-500/20 to-cyan-500/20",
        text: "text-blue-400",
        border: "border-blue-500/30",
    },
    "Cancelado": {
        icon: X,
        bg: "from-red-500/20 to-rose-500/20",
        text: "text-red-400",
        border: "border-red-500/30",
    }
};

const DEFAULT_STATUS_CONFIG = {
    icon: Circle,
    bg: "from-yellow-500/20 to-amber-500/20",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
};

const normalizeStatusUI = (s) => {
    const v = String(s || "").trim();
    return STATUS_MAP[v] || v || "En Progreso";
};

const OrderList = memo(({ order }) => {
    const customerName = order.customerDetails.name;
    const status = normalizeStatusUI(order.orderStatus);
    
    const statusConfig = useMemo(() => {
        return STATUS_CONFIGS[status] || DEFAULT_STATUS_CONFIG;
    }, [status]);

    const StatusIcon = statusConfig.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            whileHover={{ x: 3, scale: 1.01 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-[#1c1c1c] to-[#1f1f1f] hover:from-[#222] hover:to-[#252525] transition-all duration-200 border border-[#2a2a2a]/50 hover:border-blue-500/30 cursor-pointer group"
        >

            {/* Avatar */}
            <div className="relative bg-gradient-to-br from-yellow-400 to-amber-500 text-black font-bold text-sm md:text-base w-12 h-12 flex items-center justify-center rounded-xl shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-200">
                {getAvatarName(customerName)}
            </div>

            {/* Content */}
            <div className="flex items-center justify-between w-full min-w-0 gap-3 relative z-10">
                {/* Left info */}
                <div className="flex flex-col min-w-0 flex-1">
                    <h3
                        className="text-[#f5f5f5] font-semibold text-sm md:text-base truncate max-w-[140px] md:max-w-[180px] lg:max-w-[240px] group-hover:text-white transition-colors"
                        title={customerName}
                    >
                        {customerName}
                    </h3>
                    <span className="text-xs text-[#9a9a9a] flex items-center gap-1 mt-1">
                        <span>{order.items.length}</span>
                        <span>{order.items.length === 1 ? "item" : "items"}</span>
                    </span>
                </div>

                {/* Table badge */}
                {order.table?.tableNo && (
                    <div className="hidden sm:flex items-center gap-1.5 text-xs md:text-sm px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 text-yellow-400 whitespace-nowrap group-hover:scale-105 transition-transform duration-200">
                        <span>Mesa</span>
                        <ArrowRight className="w-3 h-3 opacity-60" />
                        <span className="font-bold">{order.table.tableNo}</span>
                    </div>
                )}

                {/* Status badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r ${statusConfig.bg} border ${statusConfig.border} shadow-lg group-hover:scale-105 transition-transform duration-200`}>
                    <StatusIcon className={`${statusConfig.text} w-3.5 h-3.5`} />
                    <span className={`text-xs md:text-sm font-semibold ${statusConfig.text}`}>
                        {status}
                    </span>
                </div>
            </div>
        </motion.div>
    );
});

OrderList.displayName = 'OrderList';

export default OrderList;
