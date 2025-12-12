import React from "react";
import api from "../../lib/api";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";

const PopularDishes = ({ fill = false }) => {

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
        <div className={`${fill ? "h-full" : "mt-6"} px-4 sm:px-6 lg:pr-6 w-full`}>
            <div className="bg-[#1a1a1a] w-full rounded-lg shadow-md flex flex-col h-full min-h-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 py-3 gap-2 sm:gap-0">
                    <h1 className="text-[#f5f5f5] text-base sm:text-lg font-semibold tracking-wide">
                        Popular Dishes
                    </h1>
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
                            Loading dishes...
                        </p>
                    ) : isError ? (
                        <p className="text-red-500 text-center py-8 text-sm sm:text-base">
                            Error loading dishes
                        </p>
                    ) : dishes.length === 0 ? (
                        <p className="text-[#ababab] text-center py-8 text-sm sm:text-base">
                            No dishes available yet.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                            {dishes.map((dish, index) => (
                                <div
                                    key={dish._id}
                                    className="flex items-center gap-4 bg-[#1f1f1f] rounded-[12px] px-4 sm:px-6 py-3 hover:bg-[#252525] transition"
                                >
                                    <h1 className="text-[#f5f5f5] font-bold text-lg sm:text-xl mr-2 sm:mr-4">
                                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                                    </h1>
                                    <img
                                        src={dish.imageUrl || "/placeholder.jpg"}
                                        alt={dish.name}
                                        className="w-12 h-12 sm:w-[50px] sm:h-[50px] rounded-full object-cover"
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <h1 className="text-[#f5f5f5] text-sm sm:text-base font-semibold tracking-wide truncate">
                                            {dish.name}
                                        </h1>
                                        <p className="text-[#f5f5f5] text-xs sm:text-sm font-semibold mt-1">
                                            <span className="text-[#ababab]">Category: </span>
                                            {dish.category || "N/A"}
                                        </p>
                                        <p className="text-[#f5f5f5] text-xs sm:text-sm font-semibold mt-1">
                                            <span className="text-[#ababab]">Price: </span>$
                                            {dish.price}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PopularDishes;
