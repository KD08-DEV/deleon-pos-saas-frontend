import React, { useState } from "react";
import { formatDate, getAvatarName } from "../../utils";

const CustomerInfo = ({ order }) => {
    const [dateTime] = useState(new Date());

    const customerName =
        order?.customerDetails?.name || "Customer Name";

    const customerPhone =
        order?.customerDetails?.phone || "No phone";

    return (
        <div className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col items-start">
                <h1 className="text-md text-[#f5f5f5] font-semibold tracking-wide">
                    {customerName}
                </h1>

                <p className="text-xs text-[#ababab] font-medium mt-1">
                    {customerPhone}
                </p>

                <p className="text-xs text-[#ababab] font-medium mt-2">
                    {formatDate(dateTime)}
                </p>
            </div>

            <div className="bg-[#f6b100] p-3 text-xl font-bold rounded-lg">
                {getAvatarName(customerName) || "CN"}
            </div>
        </div>
    );
};

export default CustomerInfo;
