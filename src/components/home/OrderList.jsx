import React from "react";
import { FaCheckDouble, FaLongArrowAltRight } from "react-icons/fa";
import { FaCircle } from "react-icons/fa";
import { getAvatarName } from "../../utils/index";

const OrderList = ({ order }) => {
    const customerName = order.customerDetails.name;

    return (
        <div className="flex items-center gap-4 p-3 rounded-xl bg-[#1c1c1c] hover:bg-[#222] transition-colors">
            {/* Avatar */}
            <div className="bg-[#f6b100] text-black font-bold text-sm md:text-base w-11 h-11 flex items-center justify-center rounded-lg shrink-0">
                {getAvatarName(customerName)}
            </div>

            {/* Content */}
            <div className="flex items-center justify-between w-full min-w-0 gap-3">
                {/* Left info */}
                <div className="flex flex-col min-w-0">
                    <h3
                        className="
              text-[#f5f5f5] font-semibold
              text-sm md:text-base
              truncate
              max-w-[140px] md:max-w-[180px] lg:max-w-[240px]
            "
                        title={customerName}
                    >
                        {customerName}
                    </h3>

                    <span className="text-xs text-[#9a9a9a]">
            {order.items.length} items
          </span>
                </div>

                {/* Table */}
                <div className="hidden sm:flex items-center gap-2 text-xs md:text-sm px-2 py-1 rounded-lg border border-[#f6b100] text-[#f6b100] whitespace-nowrap">
                    Table
                    <FaLongArrowAltRight className="opacity-60" />
                    {order.table?.tableNo ?? (
                        <span className="italic text-[#888]">No Table</span>
                    )}
                </div>

                {/* Status */}
                <div className="shrink-0">
                    {order.orderStatus === "Ready" && (
                        <span className="flex items-center gap-2 px-3 py-1 text-xs md:text-sm rounded-full bg-[#1f3f35] text-green-500">
              <FaCheckDouble />
              Ready
            </span>
                    )}

                    {order.orderStatus === "Completed" && (
                        <span className="flex items-center gap-2 px-3 py-1 text-xs md:text-sm rounded-full bg-[#1f2f3f] text-blue-500">
              <FaCheckDouble />
              Completed
            </span>
                    )}

                    {order.orderStatus === "Cancelled" && (
                        <span className="flex items-center gap-2 px-3 py-1 text-xs md:text-sm rounded-full bg-[#3f1f1f] text-red-500">
              <FaCircle />
              Cancelled
            </span>
                    )}

                    {order.orderStatus !== "Ready" &&
                        order.orderStatus !== "Completed" &&
                        order.orderStatus !== "Cancelled" && (
                            <span className="flex items-center gap-2 px-3 py-1 text-xs md:text-sm rounded-full bg-[#3f3a1f] text-yellow-500">
                <FaCircle />
                                {order.orderStatus}
              </span>
                        )}
                </div>
            </div>
        </div>
    );
};

export default OrderList;
