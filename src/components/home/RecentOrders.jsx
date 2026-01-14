import React from "react";
import { FaSearch } from "react-icons/fa";
import OrderList from "./OrderList";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders } from "../../https/index";
import { useSelector } from "react-redux";

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
        <div className="px-4 sm:px-6 lg:px-8 w-full">
            <div className="bg-[#1a1a1a] w-full rounded-lg shadow-md flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center px-4 sm:px-6 py-3">
                    <h1 className="text-[#f5f5f5] text-base sm:text-lg font-semibold tracking-wide">
                        Ordenes Recientes
                    </h1>
                </div>

                <div className="flex items-center gap-3 bg-[#1f1f1f] rounded-[12px] px-4 sm:px-6 py-2 mx-4 sm:mx-6">
                    <FaSearch className="text-[#f5f5f5] text-sm sm:text-base" />
                    <input
                        type="text"
                        placeholder="Busca tus ordenes recientes"
                        className="bg-[#1f1f1f] outline-none text-[#f5f5f5] w-full text-sm sm:text-base placeholder:text-gray-500"
                    />
                </div>

                <div
                    className="
            mt-3 px-4 sm:px-6 pb-4 overflow-y-auto
            max-h-[55vh] md:max-h-[60vh] xl:max-h-[65vh] 2xl:max-h-[70vh]
          "
                >
                    {orders.length ? (
                        orders.map((order) => <OrderList key={order._id} order={order} />)
                    ) : (
                        <p className="text-gray-500 text-sm sm:text-base py-6 text-center">
                            No hay pedidos disponibles
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecentOrders;
