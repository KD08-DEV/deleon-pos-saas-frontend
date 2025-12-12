import React from "react";
import { FaCheckDouble, FaLongArrowAltRight } from "react-icons/fa";
import { FaCircle } from "react-icons/fa";
import { getAvatarName } from "../../utils/index";

const OrderList = ({ order }) => {
    return (
        <div className="flex items-start md:items-center gap-3 md:gap-5 mb-3">
            <button className="bg-[#f6b100] p-3 text-lg md:text-xl font-bold rounded-lg shrink-0">
                {getAvatarName(order.customerDetails.name)}
            </button>

            {/* min-w-0 permite que truncate funcione dentro de flex */}
            <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-2 md:gap-4 min-w-0">
                <div className="flex flex-col items-start gap-0.5 min-w-0">
                    <h1 className="text-[#f5f5f5] text-sm md:text-lg font-semibold tracking-wide truncate">
                        {order.customerDetails.name}
                    </h1>
                    <p className="text-[#ababab] text-xs md:text-sm">{order.items.length} Items</p>
                </div>

                {/* En pantallas pequeñas, quepa sin romper layout */}
                <h1 className="text-[#f6b100] font-semibold border border-[#f6b100] rounded-lg px-2 py-1 flex items-center whitespace-nowrap text-xs md:text-sm self-start md:self-auto">
                    Table <FaLongArrowAltRight className="text-[#ababab] mx-2 inline" />
                    {order.table && order.table.tableNo ? (
                        order.table.tableNo
                    ) : (
                        <span className="text-[#888] italic">No Table</span>
                    )}
                </h1>

                <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-2 self-stretch md:self-auto">
                    {order.orderStatus === "Ready" ? (
                        <p className="text-green-600 bg-[#2e4a40] px-2 py-1 rounded-lg text-xs md:text-sm">
                            <FaCheckDouble className="inline mr-2" /> {order.orderStatus}
                        </p>
                    ) : order.orderStatus === "Completed" ? (
                        <p className="text-blue-600 bg-[#2e3e4a] px-2 py-1 rounded-lg text-xs md:text-sm">
                            <FaCheckDouble className="inline mr-2" /> {order.orderStatus}
                        </p>
                    ) : order.orderStatus === "Cancelled" ? (
                        <p className="text-red-600 bg-[#4a2e2e] px-2 py-1 rounded-lg text-xs md:text-sm">
                            <FaCircle className="inline mr-2 text-red-600" /> {order.orderStatus}
                        </p>
                    ) : (
                        <p className="text-yellow-600 bg-[#4a452e] px-2 py-1 rounded-lg text-xs md:text-sm">
                            <FaCircle className="inline mr-2 text-yellow-600" /> {order.orderStatus}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderList;
