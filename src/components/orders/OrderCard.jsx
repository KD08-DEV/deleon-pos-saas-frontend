// pos-frontend/src/components/orders/OrderCard.jsx
import React, { useMemo } from "react";
import { useSnackbar } from "notistack";
import { formatDateAndTime } from "../../utils";
import { updateOrder } from "../../https";

const STATUS_FLOW = ["In Progress", "Ready", "Completed"];

const getStatusColorClasses = (status) => {
    switch (status) {
        case "Ready":
            return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
        case "Completed":
            return "bg-blue-500/15 text-blue-300 border-blue-500/40";
        case "Cancelled":
            return "bg-red-500/15 text-red-300 border-red-500/40";
        case "In Progress":
        default:
            return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    }
};

const getAvatarInitial = (name) => {
    if (!name) return "W";
    return name.trim()[0].toUpperCase();
};

const getShortOrderId = (order) => {
    if (!order) return "#—";
    if (order.orderShortId) return `#${order.orderShortId}`;
    if (order.orderId) return `#${order.orderId}`;
    if (order._id) return `#${order._id.slice(-6).toUpperCase()}`;
    return "#—";
};

const getOrderTypeLabel = (orderType) => {
    if (!orderType) return "Dine in";
    return orderType;
};

const getTableLabel = (tableNo) => {
    if (!tableNo) return "— —";
    return tableNo;
};

const OrderCard = ({ order, onStatusChanged }) => {
    const { enqueueSnackbar } = useSnackbar();

    const currentStatus = order?.orderStatus || "In Progress";

    // Card más compacta, pero completa
    const cardClasses =
        "flex flex-col justify-between rounded-xl bg-[#1f1f1f] shadow-lg border border-white/5 px-4 py-3 sm:px-5 sm:py-4 h-full min-h-[220px]";

    const createdAtLabel = useMemo(
        () => (order?.createdAt ? formatDateAndTime(order.createdAt) : "N/A"),
        [order?.createdAt]
    );

    const itemsSummary = useMemo(() => {
        if (!order?.items || order.items.length === 0) {
            return ["No items"];
        }

        return order.items.map((item, index) => {
            const name =
                item?.dishName || item?.dish?.name || item?.name || "Item";

            const qty = item?.quantity ?? 1;
            return `${name} x${qty}`;
        });
    }, [order?.items]);

    const totalItems = useMemo(() => {
        if (!order?.items || order.items.length === 0) return 0;
        return order.items.reduce((sum, item) => sum + (item?.quantity ?? 1), 0);
    }, [order?.items]);

    const handleStatusUpdate = async (targetStatus) => {
        if (!order?._id) return;

        try {
            console.log("Order ID:", order._id);
            console.log("New Status:", targetStatus);

            const bills = order.bills || {};

            const payload = {
                orderStatus: targetStatus,
                bills: {
                    // siempre preservamos lo que ya tiene la orden
                    total: bills.total ?? 0,
                    discount: bills.discount ?? 0,

                    // inferimos taxEnabled a partir del tax guardado
                    taxEnabled:
                        typeof bills.taxEnabled === "boolean"
                            ? bills.taxEnabled
                            : (bills.tax ?? 0) > 0,

                    tax: bills.tax ?? 0,

                    // si en DB solo existe "tip", lo usamos como tipAmount
                    tipAmount:
                        bills.tipAmount ??
                        bills.tip ??
                        0,

                    totalWithTax: bills.totalWithTax ?? bills.total ?? 0,
                },
            };



            const res = await updateOrder(order._id, payload);
            const autoDeleted = res?.data?.autoDeleted;

            if (autoDeleted) {
                enqueueSnackbar("Order removed because it had no items.", { variant: "info" });

                if (onStatusChanged) {
                    onStatusChanged(order._id, "__DELETE__");
                }
                return;
            }

            enqueueSnackbar(`Order status updated to "${targetStatus}"`, {
                variant: "success",
            });

            if (onStatusChanged) {
                onStatusChanged(order._id, targetStatus);
            }
        } catch (error) {
            console.error("Error updating order status", error);
            enqueueSnackbar("Error updating order status", { variant: "error" });
        }
    };


    const handleNext = () => {
        const idx = STATUS_FLOW.indexOf(currentStatus);
        if (idx === -1 || idx === STATUS_FLOW.length - 1) return;
        const nextStatus = STATUS_FLOW[idx + 1];
        handleStatusUpdate(nextStatus);
    };

    const handleBack = () => {
        const idx = STATUS_FLOW.indexOf(currentStatus);
        if (idx <= 0) return;
        const prevStatus = STATUS_FLOW[idx - 1];
        handleStatusUpdate(prevStatus);
    };

    const handleCancel = () => {
        if (currentStatus === "Cancelled") return;
        handleStatusUpdate("Cancelled");
    };

    const canGoBack =
        STATUS_FLOW.includes(currentStatus) &&
        STATUS_FLOW.indexOf(currentStatus) > 0;

    const canGoForward =
        STATUS_FLOW.includes(currentStatus) &&
        STATUS_FLOW.indexOf(currentStatus) < STATUS_FLOW.length - 1;

    const primaryButtonLabel =
        currentStatus === "In Progress"
            ? "Mark as Ready"
            : currentStatus === "Ready"
                ? "Mark as Completed"
                : "Advance";

    return (
        <div className={cardClasses}>
            {/* HEADER */}
            <div className="flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">

                    {/* AVATAR */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-black font-semibold text-lg">
                        {getAvatarInitial(order?.customerDetails?.name || "Walk-in Customer")}
                    </div>

                    <div className="flex flex-col">
                        {/* NAME */}
                        <span className="text-[13px] font-semibold text-white">
                {order?.customerDetails?.name || "Walk-in Customer"}
            </span>

                        {/* GUESTS + TABLE + ORDER TYPE */}
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">

                            {/* ORDER ID */}
                            <span className="font-mono">
                    {getShortOrderId(order)}
                </span>

                            <span className="text-gray-600">/</span>
                            <span>{getOrderTypeLabel(order?.orderType?.label || order?.orderType?.name || order?.orderType || "Dine in")}</span>

                            {/* Guests */}
                            {order?.customerDetails?.guests !== undefined && (
                                <>
                                    <span className="text-gray-600">/</span>
                                    <span>{order.customerDetails.guests} guests</span>
                                </>
                            )}

                            {/* Table */}
                            <span className="text-gray-600">/</span>
                            <span>Mesa → {order.table ? `#${order.table.tableNo}` : "—"}</span>
                        </div>
                    </div>
                </div>

                {/* STATUS BADGE */}
                <span
                    className={[
                        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium",
                        getStatusColorClasses(currentStatus),
                    ].join(" ")}
                >
        {currentStatus}
    </span>
    </div>

            {/* BODY */}
            <div className="mt-3 flex flex-col gap-2 text-[13px] text-gray-100">
                <div className="flex items-center justify-between">
          <span className="uppercase tracking-wide text-[12px] text-gray-400 font-semibold">
            Items
          </span>
                    <span className="text-[12px] text-gray-300">
            {totalItems} items
          </span>
                </div>

                <ul className="mt-1 space-y-1 text-[25px] text-gray-100">
                    {itemsSummary.map((line, idx) => (
                        <li key={idx} className="truncate">
                            • {line}
                        </li>
                    ))}
                </ul>

                <div className="mt-3 flex flex-col text-[12px] text-gray-300">
          <span className="uppercase tracking-wide text-[12px] text-gray-400">
            Created at
          </span>
                    <span className="mt-0.5 text-[13px] text-gray-100">
            {createdAtLabel}
          </span>
                </div>
            </div>

            {/* ACTIONS */}
            <div className="mt-4 flex flex-wrap gap-2">
                {/* Back */}
                <button
                    type="button"
                    onClick={handleBack}
                    disabled={!canGoBack}
                    className={`flex-1 min-w-[90px] rounded-md border px-2 py-1.5 text-[11px] font-medium transition ${
                        canGoBack
                            ? "border-gray-500/70 text-gray-200 hover:bg-gray-700/50"
                            : "border-gray-700/50 text-gray-600 cursor-not-allowed"
                    }`}
                >
                    Back
                </button>

                {/* Next */}
                <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canGoForward}
                    className={`flex-[1.3] min-w-[110px] rounded-md px-3 py-1.5 text-[11px] font-semibold text-black transition ${
                        canGoForward
                            ? "bg-emerald-400 hover:bg-emerald-300"
                            : "bg-emerald-900/40 text-emerald-300 cursor-not-allowed"
                    }`}
                >
                    {primaryButtonLabel}
                </button>

                {/* Cancel */}
                <button
                    type="button"
                    onClick={handleCancel}
                    disabled={currentStatus === "Cancelled"}
                    className={`flex-1 min-w-[110px] rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                        currentStatus === "Cancelled"
                            ? "bg-red-900/40 text-red-400 cursor-not-allowed"
                            : "bg-red-500 text-white hover:bg-red-400"
                    }`}
                >
                    Cancel Order
                </button>
            </div>
        </div>
    );
};

export default OrderCard;
