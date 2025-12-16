import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getTotalPrice, removeAllItems } from "../../redux/slices/cartSlice";
import { updateOrder } from "../../https";
import Invoice from "../invoice/Invoice";

const num = (v) => {
    if (v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
};

const Bill = ({ orderId, setIsOrderModalOpen }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const cart = useSelector((s) => s.cart);
    const subtotal = useSelector(getTotalPrice);

    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [discountType, setDiscountType] = useState("flat"); // flat | percent
    const [discountValue, setDiscountValue] = useState(0);
    const [showInvoice, setShowInvoice] = useState(false);
    const [orderInfo, setOrderInfo] = useState(null);

    // Propina opcional
    const [tipEnabled, setTipEnabled] = useState(true);
    const [tipPercent, setTipPercent] = useState(10);

    // ITBIS en RD = 18%
    const TAX_RATE = 18;
    const [taxEnabled, setTaxEnabled] = useState(true);


    // Items del carrito (fallback seguro)
    const itemsArray = useMemo(() => {
        const raw = Array.isArray(cart) ? cart : cart?.items;
        return Array.isArray(raw) ? raw : [];
    }, [cart]);

    const itemsCount = itemsArray.length;

    const {
        previewDiscount,
        previewTax,
        previewTip,
        previewTotal,
    } = useMemo(() => {
        // DESCUENTO
        const discount =
            discountType === "percent"
                ? (subtotal * num(discountValue || 0)) / 100
                : num(discountValue || 0);

        const base = Math.max(subtotal - discount, 0);

        // TAX (ITBIS)
        const effectiveTaxRate = taxEnabled ? TAX_RATE : 0;
        const tax = (base * effectiveTaxRate) / 100;

        // PROPINA
        const tip = tipEnabled ? (base * tipPercent) / 100 : 0;

        // TOTAL FINAL
        const total = base + tax + tip;

        return {
            previewDiscount: discount,
            previewTax: tax,
            previewTip: tip,
            previewTotal: total,
        };
    }, [subtotal, discountType, discountValue, tipEnabled, tipPercent, taxEnabled]);

    // Payload que mandamos y también usamos como fallback
    const buildOrderPayload = () => {

        const items = itemsArray.map((item) => {
            const quantity = num(item.quantity ?? 1);
            const unitPrice = num(
                item.price ?? item.unitPrice ?? item.pricePerQuantity
            );
            return {
                dish: item.id ?? item.dish ?? item._id,
                name: item.name ?? item.dishName ?? item.title ?? item.label ?? "Producto",
                quantity,
                unitPrice,
                price: unitPrice * quantity,
            };
        });

        return {
            orderStatus: "In Progress",
            items,
            paymentMethod,
            discount: {
                type: discountType,
                value: num(discountValue) || 0,
            },
            bills: {
                subtotal: num(subtotal),
                discount: num(previewDiscount),
                tax: num(previewTax),
                tipAmount: num(previewTip),
                totalWithTax: num(previewTotal),
                taxEnabled,
                tipEnabled,
            },
        };
    };

    // --- MUTATION: UPDATE ORDER ---
    const orderMutation = useMutation({
        mutationFn: (payload) => updateOrder(orderId, payload),
        onSuccess: (res) => {
            const server = res?.data?.data ?? {};
            const fallback = buildOrderPayload();

            // Invalidar cache si existe
            try {
                queryClient.invalidateQueries(["order", orderId]);
            } catch (_) {}

            // Mapa para fusionar items (por dish o name)
            const fbMap = new Map(
                (fallback.items ?? []).map((i) => [
                    (i.dish ?? i.name) || Math.random(),
                    i,
                ])
            );

            const srcItems =
                Array.isArray(server.items) && server.items.length
                    ? server.items
                    : fallback.items;

            const normalizedItems = (srcItems ?? []).map((it) => {
                const key = (it.dish ?? it.name) || Math.random();
                const fb = fbMap.get(key) || {};
                const q = num(it.quantity ?? it.qty ?? fb.quantity ?? 1);

                const unit = num(
                    it.pricePerQuantity ??
                    it.unitPrice ??
                    fb.unitPrice ??
                    (it.price && q ? it.price / q : 0)
                );

                const line = num(it.price ?? fb.price ?? unit * q);

                return {
                    name: it.name || it.dishName || it.itemName || it?.dishInfo?.name || "Producto",
                    quantity: q,
                    unitPrice: unit,
                    price: line,
                    tax: Number((line * 0.18).toFixed(2)),
                };
            });

            const fallbackTotal = normalizedItems.reduce(
                (a, i) => a + num(i.price ?? i.unitPrice * i.quantity),
                0
            );

            const bills = {
                subtotal: server.bills?.subtotal ?? fallback.bills.subtotal,
                discount: server.bills?.discount ?? fallback.bills.discount,
                tax: server.bills?.tax ?? fallback.bills.tax,
                tip: server.bills?.tip ?? fallback.bills.tip,
                totalWithTax: server.bills?.totalWithTax ?? fallback.bills.totalWithTax,
            };
            const invoice = {
                // === IDENTIFICADORES ===
                _id: server._id ?? orderId,
                createdAt: server.createdAt ?? new Date().toISOString(),

                // === DATOS DEL CLIENTE (formato que Invoice.jsx necesita) ===
                customerName: server.customerDetails?.name ?? "Consumidor Final",
                customerRnc: server.customerDetails?.rnc ?? "",
                guests: server.customerDetails?.guests ?? 0,

                // === ITEMS (Invoice.jsx busca orderedItems primero) ===
                orderedItems: normalizedItems,
                discountAmount: bills.discount,
                tipAmount: bills.tip,

                // === TOTALES (Invoice.jsx usa estos nombres EXACTOS) ===
                subTotal: bills.subtotal,
                taxAmount: bills.tax,
                totalAmount: bills.totalWithTax,

                taxEnabled,

                // === MÉTODO DE PAGO ===
                paymentMethod: server.paymentMethod ?? fallback.paymentMethod ?? "Cash",

                // === Extra sin tocar ===
                paymentData: server.paymentData ?? null,
                tipPercent: tipEnabled ? tipPercent : 0,
            };

            setOrderInfo(invoice);
            setTimeout(() => setShowInvoice(true), 30);
            setTimeout(() => dispatch(removeAllItems()), 800);

            enqueueSnackbar("Order updated successfully!", {
                variant: "success",
            });
        },
        onError: (err) => {
            console.error(err);
            enqueueSnackbar("Error updating order", { variant: "error" });
        },
    });

    const handlePlaceOrder = () => {
        if (!orderId) {
            enqueueSnackbar("Invalid order. Please try again.", {
                variant: "error",
            });
            navigate("/tables");
            return;
        }

        if (itemsCount === 0) {
            enqueueSnackbar("Add at least one item.", { variant: "warning" });
            return;
        }

        const payload = buildOrderPayload();
        orderMutation.mutate(payload);
    };

    const handleInvoiceClose = () => {
        setShowInvoice(false);
        setIsOrderModalOpen(false);
    };

    return (
        <>
            <div className="flex items-center justify-between px-5 mt-2">
                <p className="text-xs text-[#ababab] font-medium mt-2">
                    Items({itemsCount})
                </p>
                <h1 className="text-[#f5f5f5] text-md font-bold">
                    ${num(subtotal).toFixed(2)}
                </h1>
            </div>

            {/* Descuento + Propina */}
            <div className="px-5 mt-3">
                <div className="flex items-center justify-between gap-3">
                    {/* Tipo de descuento */}
                    <div className="flex items-center gap-2">
            <span className="text-xs text-[#ababab] font-medium">
              Discount
            </span>
                        <div className="flex gap-1">
                            <button
                                className={`px-2 py-[2px] rounded text-xs ${
                                    discountType === "flat"
                                        ? "bg-[#383737] text-white"
                                        : "bg-[#1f1f1f] text-[#ababab]"
                                }`}
                                onClick={() => setDiscountType("flat")}
                            >
                                $
                            </button>
                            <button
                                className={`px-2 py-[2px] rounded text-xs ${
                                    discountType === "percent"
                                        ? "bg-[#383737] text-white"
                                        : "bg-[#1f1f1f] text-[#ababab]"
                                }`}
                                onClick={() => setDiscountType("percent")}
                            >
                                %
                            </button>
                        </div>
                    </div>

                    {/* Valor del descuento */}
                    <input
                        type="text"
                        inputMode="decimal"
                        value={discountValue === 0 ? "" : discountValue}
                        onChange={(e) => {
                            const val = e.target.value.trim();
                            setDiscountValue(val === "" ? 0 : Number(val));
                        }}
                        className="bg-[#1f1f1f] rounded px-3 py-1 text-right text-[#f5f5f5] w-24 outline-none placeholder-[#555] focus:ring-1 focus:ring-[#facc15]"
                        placeholder="0.00"
                    />
                </div>

                {/* Propina */}
                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#ababab]">Tip</span>
                        <label className="flex items-center gap-1 text-xs text-[#ababab]">
                            <input
                                type="checkbox"
                                checked={tipEnabled}
                                onChange={(e) => setTipEnabled(e.target.checked)}
                                className="accent-[#f6b100]"
                            />
                            <span>{tipPercent}%</span>
                        </label>
                    </div>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={tipPercent}
                        onChange={(e) => setTipPercent(Number(e.target.value) || 0)}
                        className="bg-[#1f1f1f] rounded px-3 py-1 text-right text-[#f5f5f5] w-20 outline-none"
                    />
                </div>
            </div>

            {/* ITBIS (opcional) */}
            <div className="flex items-center justify-between px-5 mt-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[#ababab]">Tax (ITBIS)</span>
                    <label className="flex items-center gap-1 text-xs text-[#ababab]">
                        <input
                            type="checkbox"
                            checked={taxEnabled}
                            onChange={(e) => setTaxEnabled(e.target.checked)}
                            className="accent-[#f6b100]"
                        />
                        <span>{TAX_RATE}%</span>
                    </label>
                </div>
                <h1 className="text-[#f5f5f5] text-md font-bold">
                    ${num(previewTax).toFixed(2)}
                </h1>
            </div>

            {/* Total con ITBIS y propina */}
            <div className="flex items-center justify-between px-5 mt-2">
                <p className="text-xs text-[#ababab]">Total With Tax</p>
                <h1 className="text-[#f5f5f5] text-md font-bold">
                    ${num(previewTotal).toFixed(2)}
                </h1>
            </div>

            {/* Metodo de pago */}
            <div className="flex items-center gap-3 px-5 mt-4">
                <button
                    onClick={() => setPaymentMethod("Cash")}
                    className={`bg-[#1f1f1f] px-4 py-3 w-full rounded-lg text-[#ababab] font-semibold ${
                        paymentMethod === "Cash" ? "bg-[#383737]" : ""
                    }`}
                >
                    Cash
                </button>
                <button
                    onClick={() => setPaymentMethod("Online")}
                    className={`bg-[#1f1f1f] px-4 py-3 w-full rounded-lg text-[#ababab] font-semibold ${
                        paymentMethod === "Online" ? "bg-[#383737]" : ""
                    }`}
                >
                    Online
                </button>
            </div>

            {/* Botón actualizar */}
            <div className="flex items-center gap-3 px-5 mt-4">
                <button
                    onClick={handlePlaceOrder}
                    className="px-4 py-3 w-full rounded-lg bg-[#f6b100] text-[#1f1f1f] font-semibold text-lg"
                >
                    Update Order
                </button>
            </div>

            {showInvoice && orderInfo &&(
                <Invoice
                    order={orderInfo}
                    setShowInvoice={setShowInvoice}
                    onClose={handleInvoiceClose}
                />
            )}
        </>
    );
};

export default Bill;
