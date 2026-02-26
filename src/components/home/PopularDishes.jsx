import React, { memo, useEffect, useState } from "react";
import api from "../../lib/api";
import { useQuery, } from "@tanstack/react-query";
import { useSelector, } from "react-redux";
import { motion } from "framer-motion";
import { Trophy, ChefHat } from "lucide-react";

const PopularDishItem = memo(({ dish, index }) => {
    const [invCats, setInvCats] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get("/api/admin/inventory/categories");
                const list = res.data?.data ?? [];
                setInvCats(list);
            } catch (e) {
                console.error("Error cargando categorías:", e);
            }
        })();
    }, []);
    const getDishCategoryLabel = (dish) => {
        // Caso 1: viene poblado
        if (dish?.inventoryCategoryId?.name) return dish.inventoryCategoryId.name;

        // Caso 2: viene como string id
        const id = dish?.inventoryCategoryId;
        if (id) {
            const found = invCats?.find((c) => String(c._id) === String(id));
            if (found?.name) return found.name;
        }

        // fallback (por si no tiene inventoryCategoryId)
        return dish?.category || "Sin categoría";
    };
    const rankClass = index === 0
        ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-black"
        : index === 1
        ? "bg-gradient-to-br from-gray-400 to-gray-500 text-black"
        : index === 2
        ? "bg-gradient-to-br from-orange-400 to-orange-600 text-black"
        : "bg-gradient-to-br from-[#2a2a2a] to-[#333] text-[#ababab]";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            whileHover={{ x: 3, scale: 1.01 }}
            className="group relative flex items-center gap-4 bg-gradient-to-r from-[#1f1f1f] to-[#252525] rounded-xl px-4 sm:px-6 py-4 hover:from-[#252525] hover:to-[#2a2a2a] transition-all duration-200 border border-[#2a2a2a]/50 hover:border-yellow-500/30 cursor-pointer"
        >
            <div className="relative flex-shrink-0">
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm ${rankClass} group-hover:scale-110 transition-transform duration-200`}>
                    {index + 1 < 10 ? `0${index + 1}` : index + 1}
                </div>
                {index < 3 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full opacity-75" />
                )}
            </div>

            <img
                src={dish.imageUrl || "/placeholder.jpg"}
                alt={dish.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-[#2a2a2a] group-hover:border-yellow-500/50 transition-all duration-200 group-hover:scale-105"
                onError={(e) => {
                    e.currentTarget.src = "/placeholder.jpg";
                }}
            />

            <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <ChefHat className="text-yellow-400 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <h1 className="text-[#f5f5f5] text-sm sm:text-base font-semibold tracking-wide truncate group-hover:text-yellow-400 transition-colors duration-200">
                        {dish.name}
                    </h1>
                </div>
                <p className="text-[#ababab] text-xs sm:text-sm font-medium truncate">
                    <span className="text-[#666]">Categoria: </span>
                    {getDishCategoryLabel(dish) || "N/A"}
                </p>
                <p className="text-yellow-400 text-xs sm:text-sm font-bold mt-1">
                    ${dish.price}
                </p>
            </div>
        </motion.div>
    );
});

PopularDishItem.displayName = 'PopularDishItem';

const PopularDishes = memo(({ fill = false }) => {

    const { userData } = useSelector((state) => state.user);
    // 🔹 Llamamos a tu API con React Query (ya configurado en App.jsx)
    const { data, isLoading, isError } = useQuery({
        queryKey: ["dishes", userData?.tenantId],
        queryFn: async () => {
            const url = userData?.tenantId
                ? `/api/dishes?tenantId=${userData.tenantId}`
                : "/api/dishes"; // fallback si es SuperAdmin

            const response = await api.get(url);
            return Array.isArray(response.data.data)
                ? response.data.data
                : response.data;
        },
        enabled:true,
    });
    const dishes = Array.isArray(data) ? data : [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`${fill ? "h-full" : ""} w-full`}
        >
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#1a1a1a] w-full rounded-xl shadow-lg flex flex-col h-full min-h-0 border border-[#2a2a2a]/50 overflow-hidden">
                {/* Header mejorado */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 py-4 gap-2 sm:gap-0 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border-b border-yellow-500/10">
                    <div className="flex items-center gap-2">
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                            <Trophy className="text-yellow-400 w-5 h-5" />
                        </motion.div>
                        <h1 className="text-[#f5f5f5] text-base sm:text-lg font-semibold tracking-wide">
                            Platos Populares
                        </h1>
                    </div>
                </div>

                {/* Scroll interno con scrollbar visible */}
                <div
                    className="
            flex-1 min-h-0 overflow-y-auto px-2 sm:px-0 pb-3
            max-h-[55vh] md:max-h-[60vh] xl:max-h-[65vh] 2xl:max-h-[70vh]
          "
                    style={{
                        scrollbarWidth: "thin", // Firefox
                        scrollbarColor: "#3a3a3a #151515", // Firefox
                    }}
                >
                    {/* Estilo inline del scrollbar para Chrome/Edge/Safari */}
                    <style>
                        {`
              div::-webkit-scrollbar {
                width: 10px;
              }
              div::-webkit-scrollbar-track {
                background: #151515;
              }
          div::-webkit-scrollbar-thumb {
                background-color: #3a3a3a;
                border-radius: 10px;
                border: 2px solid #1a1a1a;
              }
              div::-webkit-scrollbar-thumb:hover {
                background-color: #f6b100;
              }
            `}
                    </style>

                    {isLoading ? (
                        <p className="text-[#ababab] text-center py-8 text-sm sm:text-base">
                            Cargando platos...
                        </p>
                    ) : isError ? (
                        <p className="text-red-500 text-center py-8 text-sm sm:text-base">
                            Error cargando platos.
                        </p>
                    ) : dishes.length === 0 ? (
                        <p className="text-[#ababab] text-center py-8 text-sm sm:text-base">
                            Platos no disponibles todavia.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                            {dishes.map((dish, index) => (
                                <PopularDishItem key={dish._id} dish={dish} index={index} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

PopularDishes.displayName = 'PopularDishes';

export default PopularDishes;
