import React from "react";
import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders, updateOrder  } from "../../https/index";
import { formatDateAndTime } from "../../utils";

const RecentOrders = () => {
    const queryClient = useQueryClient();

    const handleStatusChange = ({ orderId, orderStatus }) => {

        orderStatusUpdateMutation.mutate({ orderId, orderStatus });

    };
    const normalizeStatusUI = (s) => {
        const v = String(s || "").trim();
        const map = {
            "In Progress": "En Progreso",
            "Ready": "Listo",
            "Completed": "Completado",
            "Cancelled": "Cancelado",
            "Canceled": "Cancelado",
        };
        return map[v] || v || "En Progreso";
    };


    const orderStatusUpdateMutation = useMutation({
        mutationFn: ({ orderId, orderStatus }) =>
            updateOrder(orderId, { orderStatus }),
        onSuccess: () => {
            enqueueSnackbar("Order status updated successfully!", {
                variant: "success",
            });
            queryClient.invalidateQueries(["orders"]);
        },
        onError: () => {
            enqueueSnackbar("Failed to update order status!", { variant: "error" });
        },
    });

    const { data: resData, isError } = useQuery({
        queryKey: ["orders"],
        queryFn: async () => await getOrders(),
        placeholderData: keepPreviousData,
    });

    if (isError) {
        enqueueSnackbar("Something went wrong!", { variant: "error" });
    }

    const orders = (resData?.data?.data || []).slice().sort((a, b) => {
        const aDate = new Date(a?.orderDate || a?.createdAt || a?._id);
        const bDate = new Date(b?.orderDate || b?.createdAt || b?._id);
        return bDate - aDate;
    });

    return (
        <div className="container mx-auto bg-[#262626] rounded-lg p-4 sm:p-6 min-h-[calc(100vh-5rem)] flex flex-col overflow-hidden">
            <h2 className="text-[#f5f5f5] text-lg sm:text-xl font-semibold mb-4">
                Ordenes Recientes
            </h2>

            {/* 🌐 Vista tabla (solo visible en pantallas grandes) */}
            <div
                className="hidden md:block flex-1 overflow-auto rounded-md"
                style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#3a3a3a #151515",
                }}
            >
                <style>
                    {`
            div::-webkit-scrollbar {
              height: 10px;
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

                <table className="min-w-[900px] w-full text-left text-[#f5f5f5] border-collapse">
                    <thead className="bg-[#333] text-[#ababab] text-sm sm:text-base">
                    <tr>
                        <th className="p-3 whitespace-nowrap">Order ID</th>
                        <th className="p-3 whitespace-nowrap">Cliente</th>
                        <th className="p-3 whitespace-nowrap">Status</th>
                        <th className="p-3 whitespace-nowrap">Hora & Fecha</th>
                        <th className="p-3 whitespace-nowrap">Articulos</th>
                        <th className="p-3 whitespace-nowrap">No Mesa</th>
                        <th className="p-3 whitespace-nowrap">Total</th>
                        <th className="p-3 text-center whitespace-nowrap">
                            Metodo de pago
                        </th>
                    </tr>
                    </thead>

                    <tbody>
                    {orders.map((order) => {
                        const shortId = order?._id
                            ? `#${String(order._id).slice(-6).toUpperCase()}`
                            : "#N/A";

                        const itemsCount = Array.isArray(order?.items)
                            ? order.items.reduce((sum, it) => sum + (it.quantity || 1), 0)
                            : 0;

                        const status = normalizeStatusUI(order?.orderStatus);

                        const dateText = order?.orderDate
                            ? formatDateAndTime(order?.orderDate)
                            : "N/A";
                        const tableNo =
                            order?.table?.tableNo ??
                            order?.tableNo ??
                            (typeof order?.table === "number" ? order.table : "N/A");

                        const total = order?.bills?.totalWithTax ?? 0;
                        const payment = order?.paymentMethod ?? "N/A";

                        return (
                            <tr
                                key={order._id || shortId}
                                className="border-b border-gray-600 hover:bg-[#333] transition"
                            >
                                <td className="p-3 text-sm sm:text-base">{shortId}</td>
                                <td className="p-3 text-sm sm:text-base">
                                    {order?.customerDetails?.name || "N/A"}
                                </td>
                                <td className="p-3">
                                    <select
                                        className={`bg-[#1a1a1a] text-[#f5f5f5] border border-gray-500 p-1 sm:p-2 rounded-lg focus:outline-none text-sm sm:text-base ${
                                            status === "Listo"
                                                ? "text-green-500"
                                                : status === "Completado"
                                                    ? "text-blue-600"
                                                    : status === "Cancelado"
                                                        ? "text-red-500"
                                                        : "text-yellow-500"
                                        }`}
                                        value={status}
                                        onChange={(e) =>
                                            handleStatusChange({
                                                orderId: order._id,
                                                orderStatus: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="En Progreso">En Progreso</option>
                                        <option value="Listo">Listo</option>
                                        <option value="Completado">Completado</option>
                                        <option value="Cancelado">Cancelado</option>
                                    </select>
                                </td>
                                <td className="p-3 text-sm sm:text-base">{dateText}</td>
                                <td className="p-3 text-sm sm:text-base">
                                    {itemsCount} Items
                                </td>
                                <td className="p-3 text-sm sm:text-base">Table {tableNo}</td>
                                <td className="p-3 text-sm sm:text-base">
                                    ${Number(total).toFixed(2)}
                                </td>
                                <td className="p-3 text-center text-sm sm:text-base">
                                    {payment}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* 📱 Vista tarjetas (visible solo en pantallas pequeñas) */}
            <div className="block md:hidden space-y-4 overflow-y-auto flex-1 pb-4">
                {orders.map((order) => {
                    const shortId = order?._id
                        ? `#${String(order._id).slice(-6).toUpperCase()}`
                        : "#N/A";

                    const itemsCount = Array.isArray(order?.items)
                        ? order.items.reduce((sum, it) => sum + (it.quantity || 1), 0)
                        : 0;

                    const status = normalizeStatusUI(order?.orderStatus);
                    const dateText = order?.orderDate
                        ? formatDateAndTime(order?.orderDate)
                        : "N/A";
                    const total = order?.bills?.totalWithTax ?? 0;

                    return (
                        <div
                            key={order._id || shortId}
                            className="bg-[#1f1f1f] rounded-lg p-4 shadow-md border border-[#333]"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-[#f5f5f5] font-semibold text-sm">
                                    {shortId}
                                </h3>
                                <select
                                    className={`bg-[#1a1a1a] border border-gray-500 p-1 rounded-lg focus:outline-none text-xs ${
                                        status === "Listo"
                                            ? "text-green-500"
                                            : status === "Completado"
                                                ? "text-blue-600"
                                                : status === "Cancelado"
                                                    ? "text-red-500"
                                                    : "text-yellow-500"
                                    }`}
                                    value={status}
                                    onChange={(e) =>
                                        handleStatusChange({
                                            orderId: order._id,
                                            orderStatus: e.target.value,
                                        })
                                    }
                                >
                                    <option value="En Progreso">En Progreso</option>
                                    <option value="Listo">Listo</option>
                                    <option value="Completado">Completado</option>
                                    <option value="Cancelado">Cancelado</option>
                                </select>
                            </div>
                            <p className="text-[#f5f5f5] text-sm font-medium">
                                {order?.customerDetails?.name || "N/A"}
                            </p>
                            <p className="text-[#ababab] text-xs mt-1">{dateText}</p>
                            <p className="text-[#ababab] text-xs mt-1">
                                {itemsCount} Items · ${Number(total).toFixed(2)}
                            </p>
                        </div>
                    );
                })}

            </div>
        </div>

    );

};

export default RecentOrders;
