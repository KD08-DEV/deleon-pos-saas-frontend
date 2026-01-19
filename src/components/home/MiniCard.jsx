import React, { memo, useMemo } from 'react';
import { motion } from "framer-motion";

const MiniCard = memo(({ title, icon, number, footerNum }) => {
    const { footerColor, isEarnings, displayedNumber, cardGradient, iconGradient, borderColor } = useMemo(() => {
        const footerColor = footerNum > 0 ? "text-green-400" : footerNum < 0 ? "text-red-400" : "text-[#ababab]";
        const isEarnings = title === "Total Earnings" || title === "Revenue";
        const isActiveOrders = title === "Ordenes Activas";
        
        const displayedNumber = isEarnings
            ? `$${Number(number).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
            : number;
        
        const cardGradient = isActiveOrders
            ? "from-green-500/10 via-emerald-500/10 to-teal-500/10"
            : "from-yellow-500/10 via-amber-500/10 to-orange-500/10";
        
        const iconGradient = isActiveOrders
            ? "from-green-500 to-emerald-500"
            : "from-yellow-500 to-amber-500";
        
        const borderColor = isActiveOrders
            ? "border-green-500/30"
            : "border-yellow-500/30";
        
        return { footerColor, isEarnings, displayedNumber, cardGradient, iconGradient, borderColor };
    }, [title, number, footerNum]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            whileHover={{ y: -3, scale: 1.01 }}
            className={`relative overflow-hidden bg-gradient-to-br ${cardGradient} py-6 px-6 rounded-xl w-full border ${borderColor} group hover:shadow-lg transition-all duration-300`}
        >

            <div className="relative flex items-start justify-between">
                <div className="flex-1">
                    <h1 className="text-[#ababab] text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 transition-colors duration-300">
                        {title}
                    </h1>
                    
                    <h1 className="text-[#f5f5f5] text-3xl sm:text-4xl font-bold mt-2 transition-colors duration-300">
                        {displayedNumber}
                    </h1>

                    {/* Show these metrics ONLY for earnings, not for active orders */}
                    {isEarnings && (
                        <p className="text-xs sm:text-sm mt-3 flex items-center gap-1">
                            <span className={footerColor}>{footerNum > 0 ? "↑" : footerNum < 0 ? "↓" : "→"}</span>
                            <span className={footerColor}>{Math.abs(footerNum)}%</span>
                            <span className="text-[#ababab] transition-colors duration-300">que ayer</span>
                        </p>
                    )}
                </div>

                <div
                    className={`relative bg-gradient-to-br ${iconGradient} p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-200`}
                >
                    <div className="text-white text-xl sm:text-2xl">
                        {icon}
                    </div>
                </div>
            </div>

            {/* Bottom accent line - simplificado */}
            <div
                className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${iconGradient} rounded-full opacity-50`}
            />
        </motion.div>
    );
});

MiniCard.displayName = 'MiniCard';

export default MiniCard;
