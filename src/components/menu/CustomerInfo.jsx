import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { formatDate, getAvatarName } from "../../utils";

const getTableLabel = (table) => {
    if (!table) return "N/A";

    if (typeof table === "string") {
        return "Mesa seleccionada";
    }

    return (
        table?.tableNo ||
        table?.tableNumber ||
        table?.name ||
        table?.label ||
        table?.areaName ||
        "Mesa seleccionada"
    );
};

const safeDateForFormat = (value, fallback) => {
    if (!value) return fallback;

    if (value instanceof Date) return value;

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return fallback;
    }

    return parsed;
};

const CustomerInfo = ({ order }) => {
    const [dateTime] = useState(new Date());
    const draft = useSelector((state) => state.customer || {});

    const customerName = useMemo(() => {
        return (
            order?.customerDetails?.name ||
            order?.customerName ||
            draft?.customerName ||
            draft?.name ||
            "Customer Name"
        );
    }, [
        order?.customerDetails?.name,
        order?.customerName,
        draft?.customerName,
        draft?.name,
    ]);

    const customerPhone = useMemo(() => {
        return (
            order?.customerDetails?.phone ||
            draft?.customerPhone ||
            draft?.phone ||
            "No phone"
        );
    }, [
        order?.customerDetails?.phone,
        draft?.customerPhone,
        draft?.phone,
    ]);

    const tableLabel = useMemo(() => {
        return getTableLabel(order?.table || draft?.table);
    }, [order?.table, draft?.table]);

    const displayDate = useMemo(() => {
        return safeDateForFormat(order?.createdAt, dateTime);
    }, [order?.createdAt, dateTime]);

    return (
        <div className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col items-start">
                <h1 className="text-md text-[#f5f5f5] font-semibold tracking-wide">
                    {customerName}
                </h1>

                <p className="text-xs text-[#ababab] font-medium mt-1">
                    {customerPhone}
                </p>

                <p className="text-xs text-[#ababab] font-medium mt-1">
                    Mesa: {tableLabel}
                </p>

                <p className="text-xs text-[#ababab] font-medium mt-2">
                    {formatDate(displayDate)}
                </p>
            </div>

            <div className="bg-[#f6b100] p-3 text-xl font-bold rounded-lg">
                {getAvatarName(customerName) || "CN"}
            </div>
        </div>
    );
};

export default CustomerInfo;