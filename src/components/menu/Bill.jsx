import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { getTotalPrice, removeAllItems } from "../../redux/slices/cartSlice";
import { updateOrder } from "../../https";
import Invoice from "../invoice/Invoice";

import useTenant from "../../hooks/useTenant";
import api from "../../lib/api";

const num = (v) => {
    if (v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
};
const isLikelyRncOrCedula = (value) => {
    const cleaned = String(value || "").replace(/[^\d]/g, "");
    return cleaned.length === 9 || cleaned.length === 11; // RNC (9) o Cédula (11)
};



const Bill = ({ orderId, setIsOrderModalOpen }) => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const cart = useSelector((state) => state.cart);

    // Total del carrito (tu helper)
    const subtotalFromStore = useSelector(getTotalPrice);
    const subtotal = useMemo(() => num(subtotalFromStore), [subtotalFromStore]);

    // Items fallback
    const itemsArray = useMemo(() => {
        const raw = Array.isArray(cart) ? cart : cart?.items;
        return Array.isArray(raw) ? raw : [];
    }, [cart]);

    const itemsCount = useMemo(
        () =>
            itemsArray.reduce((acc, it) => acc + num(it?.quantity ?? 1), 0),
        [itemsArray]
    );

    // Tenant Info
    const { tenantInfo } = useTenant();
    const tenantFeatures = tenantInfo?.features || {};

    const discountEnabledByTenant = tenantFeatures?.discount?.enabled !== false;
    const taxEnabledByTenant = tenantFeatures?.tax?.enabled !== false;
    const fiscalEnabledByTenant = !!tenantInfo?.fiscal?.enabled;

    useEffect(() => {
        console.log("TENANT INFO EN BILL:", tenantInfo);
        console.log("FISCAL EN BILL:", tenantInfo?.fiscal);
    }, [tenantInfo]);
    // Fiscal capability (nuevo modelo)
    const fiscalEnabled = !!tenantInfo?.fiscal?.enabled;

    const fiscalCapable = useMemo(() => {
        if (!fiscalEnabledByTenant) return false;
        if (!fiscalEnabled) return false;

        const b01 = !!tenantInfo?.fiscal?.ncfConfig?.B01?.active;
        const b02 = !!tenantInfo?.fiscal?.ncfConfig?.B02?.active;

        return b01 || b02;
    }, [tenantInfo, fiscalEnabled, fiscalEnabledByTenant]);

    const allowedNcfTypes = useMemo(() => {
        const list = [
            tenantInfo?.fiscal?.ncfConfig?.B01?.active ? "B01" : null,
            tenantInfo?.fiscal?.ncfConfig?.B02?.active ? "B02" : null,
        ].filter(Boolean);
        return list;
    }, [tenantInfo]);

    // UI states
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [discountType, setDiscountType] = useState("flat"); // flat | percent
    const [discountValue, setDiscountValue] = useState(0);

    const [showInvoice, setShowInvoice] = useState(false);
    const [orderInfo, setOrderInfo] = useState(null);

    const [customerName, setCustomerName] = useState("");
    const [customerRnc, setCustomerRnc] = useState("");
    const [guests, setGuests] = useState(0);

    // Fiscal (NCF) opcional
    const [wantsFiscal, setWantsFiscal] = useState(false);
    const [ncfType, setNcfType] = useState("B02"); // B01/B02
    const [dgiiLoading, setDgiiLoading] = useState(false);
    const [dgiiStatus, setDgiiStatus] = useState(""); // "", "FOUND", "NOT_FOUND", "ERROR"
    const [dgiiFound, setDgiiFound] = useState(null);

    // Propina + ITBIS
    const [tipEnabled, setTipEnabled] = useState(true);
    const [tipPercent, setTipPercent] = useState(10);

    const TAX_RATE = 18;
    const [taxEnabled, setTaxEnabled] = useState(true);
    useEffect(() => {
        if (!discountEnabledByTenant) setDiscountValue(0);
    }, [discountEnabledByTenant]);

    useEffect(() => {
        if (!taxEnabledByTenant) setTaxEnabled(false);
    }, [taxEnabledByTenant]);

    useEffect(() => {
        if (!fiscalEnabledByTenant) setWantsFiscal(false);
    }, [fiscalEnabledByTenant]);

    // Totales
    const { discount, base, tax, tip, total } = useMemo(() => {
        const discountCalc =
            discountType === "percent"
                ? (subtotal * num(discountValue || 0)) / 100
                : num(discountValue || 0);

        const baseCalc = Math.max(subtotal - discountCalc, 0);

        const effectiveTaxRate = taxEnabled ? TAX_RATE : 0;
        const taxCalc = (baseCalc * effectiveTaxRate) / 100;

        const tipCalc = tipEnabled ? (baseCalc * num(tipPercent || 0)) / 100 : 0;

        return {
            discount: discountCalc,
            base: baseCalc,
            tax: taxCalc,
            tip: tipCalc,
            total: baseCalc + taxCalc + tipCalc,
        };
    }, [subtotal, discountType, discountValue, taxEnabled, tipEnabled, tipPercent]);

    // Si el usuario activa wantsFiscal pero el tenant no puede, lo apagamos y avisamos
    useEffect(() => {
        if (wantsFiscal && !fiscalCapable) {
            setWantsFiscal(false);
            enqueueSnackbar("Este tenant no tiene NCF habilitado/configurado.", {
                variant: "warning",
            });
        }
    }, [wantsFiscal, fiscalCapable]);

    // Mantener ncfType válido según allowed types
    useEffect(() => {
        if (!allowedNcfTypes?.length) return;
        if (!allowedNcfTypes.includes(ncfType)) {
            setNcfType(allowedNcfTypes[0]);
        }
    }, [allowedNcfTypes, ncfType]);

    // DGII lookup (solo si el cliente pide fiscal y escribe RNC/Cédula)
    const lookupDgii = async (doc) => {
        const cleaned = String(doc || "").replace(/[^\d]/g, "");

        // solo buscar si parece RNC/Cédula
        if (!isLikelyRncOrCedula(cleaned)) {
            setDgiiStatus("");
            setDgiiFound(null);
            return;
        }

        try {
            setDgiiLoading(true);
            setDgiiStatus("");
            setDgiiFound(null);

            const res = await api.get(`/api/dgii/rnc/${cleaned}`);

            // soporta varias respuestas posibles:
            // 1) { ok:true, data:{...} }
            // 2) { data:{ ok:true, data:{...} } }
            // 3) { data:{ data:{...} } }
            const payload = res?.data;
            const data =
                payload?.data?.data ??
                payload?.data ??
                payload ??
                null;

            const foundName =
                data?.name ||
                data?.nombre ||
                data?.razonSocial ||
                data?.razon_social ||
                "";

            if (foundName) {
                setCustomerName(foundName);
                setDgiiStatus("FOUND");
                setDgiiFound(data);
            } else {
                setDgiiStatus("NOT_FOUND");
                setDgiiFound(null);
            }
        } catch (e) {
            setDgiiStatus("ERROR");
            setDgiiFound(null);
        } finally {
            setDgiiLoading(false);
        }
    };


    // Construye payload multi-tenant seguro (backend debe validar tenantId)
    const buildOrderPayload = () => {
        // Items desde el carrito
        const raw = Array.isArray(cart) ? cart : cart?.items;
        const itemsArray = Array.isArray(raw) ? raw : [];

        const items = itemsArray.map((item) => {
            const quantity = num(item.quantity ?? 1);
            const unitPrice = num(item.price ?? item.unitPrice ?? item.pricePerQuantity);
            return {
                dish: item.id ?? item.dish ?? item._id,
                name: item.name ?? item.dishName ?? item.title ?? item.label ?? "Producto",
                quantity,
                unitPrice,
                price: unitPrice * quantity,
            };
        });

        // Bills consistentes
        const bills = {
            subtotal: num(subtotal),
            discount: num(discount),      // usa tu cálculo actual
            tax: num(tax),
            tip: num(tip),
            totalWithTax: num(total),
            taxEnabled,
            tipEnabled,
        };

        const basePayload = {
            orderStatus: "In Progress",
            items,
            paymentMethod,
            discount: { type: discountType, value: num(discountValue) || 0 },
            bills,
        };

        // customerDetails (si hay data)
        const hasCustomerData =
            String(customerName || "").trim() ||
            String(customerRnc || "").trim() ||
            Number(guests || 0) > 0;

        if (hasCustomerData) {
            basePayload.customerDetails = {
                name: String(customerName || "").trim(),
                rnc: String(customerRnc || "").trim(),
                guests: Number(guests || 0),
            };
        }

        // fiscal (si aplica)
        if (wantsFiscal && fiscalCapable) {
            basePayload.fiscal = {
                requested: true,
                ncfType: allowedNcfTypes.includes(ncfType) ? ncfType : (allowedNcfTypes[0] || "B02"),
            };
        }

        return basePayload;
    };


    const orderMutation = useMutation({
        mutationFn: (payload) => updateOrder(orderId, payload),
        onSuccess: (res) => {
            const server =
                res?.data?.data?.order ??
                res?.data?.order ??
                res?.data?.data ??
                res?.data ??
                {};
            const fallback = buildOrderPayload();

            try {
                queryClient.invalidateQueries(["order", orderId]);
            } catch (_) {}

            // 1) Items para Invoice (si server no trae items, usamos fallback)
            const srcItems = Array.isArray(server.items) && server.items.length
                ? server.items
                : (fallback.items || []);

            const normalizedItems = (srcItems ?? []).map((it) => {
                const q = num(it.quantity ?? it.qty ?? 1);
                const unit = num(
                    it.pricePerQuantity ??
                    it.unitPrice ??
                    (it.price && q ? it.price / q : 0)
                );
                const line = num(it.price ?? unit * q);

                return {
                    name: it.name || it.dishName || it.itemName || it?.dishInfo?.name || "Producto",
                    quantity: q,
                    unitPrice: unit,
                    price: line,
                    tax: Number((line * 0.18).toFixed(2)),
                };
            });

            // 2) Bills (server si viene; si no, fallback)
            const bills = {
                subtotal: server.bills?.subtotal ?? server.bills?.total ?? fallback.bills?.subtotal ?? 0,
                discount: server.bills?.discount ?? fallback.bills?.discount ?? 0,
                tax: server.bills?.tax ?? fallback.bills?.tax ?? 0,
                tip: server.bills?.tip ?? server.bills?.tipAmount ?? fallback.bills?.tip ?? 0,
                totalWithTax: server.bills?.totalWithTax ?? fallback.bills?.totalWithTax ?? 0,

                taxEnabled: server.bills?.taxEnabled ?? fallback.bills?.taxEnabled ?? true,
                tipEnabled: server.bills?.tipEnabled ?? fallback.bills?.tipEnabled ?? true,
            };

            // 3) Fiscal (si el backend NO lo devuelve todavía, al menos mostramos lo seleccionado)
            const fiscal = server.fiscal ?? fallback.fiscal;
            const ncfNumber = server.ncfNumber ?? server.fiscal?.ncfNumber ?? server.fiscal?.ncf ?? "";

            // 4) Construimos el objeto que Invoice.jsx espera
            const invoice = {
                _id: server._id ?? orderId,
                createdAt: server.createdAt ?? new Date().toISOString(),

                customerName: server.customerDetails?.name ?? fallback.customerDetails?.name ?? "",
                customerRnc: server.customerDetails?.rnc ?? fallback.customerDetails?.rnc ?? "",

                items: normalizedItems,         // <- lo que Invoice.jsx espera
                orderedItems: normalizedItems,

                paymentMethod: server.paymentMethod ?? fallback.paymentMethod ?? "Cash",

                subTotal: bills.subtotal,
                discountAmount: bills.discount,
                taxAmount: bills.tax,
                tipAmount: bills.tip,
                totalAmount: bills.totalWithTax,

                bills,
                fiscal,
                ncfNumber,
            };

            setOrderInfo(invoice);
            enqueueSnackbar("Orden actualizada correctamente.", { variant: "success" });

            // OJO: ahora sí puedes limpiar el carrito sin romper la factura
            dispatch(removeAllItems());
            setShowInvoice(true);
        },
        onError: (err) => {
            enqueueSnackbar(
                err?.response?.data?.message || "Error actualizando la orden.",
                { variant: "error" }
            );
        },
    });

    const handlePlaceOrder = () => {
        if (!orderId) {
            enqueueSnackbar("No hay orden seleccionada.", { variant: "warning" });
            return;
        }

        // si quiere fiscal, recomendamos RNC/Cédula
        if (wantsFiscal && fiscalCapable) {
            const doc = String(customerRnc || "").replace(/[^\d]/g, "");
            if (!doc) {
                enqueueSnackbar("Para factura fiscal, agrega RNC/Cédula del cliente.", {
                    variant: "warning",
                });
                return;
            }
        }

        const payload = buildOrderPayload();
        if (!payload.items?.length) {
            enqueueSnackbar("No hay items en el carrito para actualizar la orden.", { variant: "warning" });
            return;
        }
        orderMutation.mutate(payload);
    };

    const handleInvoiceClose = () => {
        setShowInvoice(false);
        setIsOrderModalOpen(false);
        navigate("/orders");
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
                {/* ✅ DESCUENTO (solo si el tenant lo permite) */}
                {discountEnabledByTenant && (
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[#ababab]">Descuento</span>
                            <button
                                type="button"
                                className={`text-xs px-2 py-1 rounded ${
                                    discountType === "flat"
                                        ? "bg-[#2b2b2b] text-white"
                                        : "bg-transparent text-[#ababab]"
                                }`}
                                onClick={() => setDiscountType("flat")}
                            >
                                $
                            </button>
                            <button
                                type="button"
                                className={`text-xs px-2 py-1 rounded ${
                                    discountType === "percent"
                                        ? "bg-[#2b2b2b] text-white"
                                        : "bg-transparent text-[#ababab]"
                                }`}
                                onClick={() => setDiscountType("percent")}
                            >
                                %
                            </button>
                        </div>

                        <input
                            type="text"
                            inputMode="decimal"
                            value={discountValue === 0 ? "" : discountValue}
                            onChange={(e) => {
                                const val = e.target.value.trim();
                                setDiscountValue(val === "" ? 0 : Number(val));
                            }}
                            className="bg-[#1f1f1f] rounded px-3 py-2 text-[#f5f5f5] outline-none placeholder-[#555] focus:ring-1 focus:ring-[#facc15]"
                            placeholder="0.00"
                        />
                    </div>
                )}

                {/* ✅ PROPINA (siempre visible) */}
                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#ababab]">Propina</span>
                        <input
                            type="checkbox"
                            checked={tipEnabled}
                            onChange={(e) => setTipEnabled(e.target.checked)}
                        />
                    </div>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={tipPercent}
                        disabled={!tipEnabled}
                        onChange={(e) => setTipPercent(Number(e.target.value) || 0)}
                        className="w-20 bg-[#1f1f1f] rounded px-3 py-2 text-[#f5f5f5] outline-none disabled:opacity-40"
                    />
                </div>

                {/* ✅ ITBIS (solo si el tenant lo permite) */}
                {taxEnabledByTenant && (
                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[#ababab]">Tax (ITBIS)</span>
                            <input
                                type="checkbox"
                                checked={taxEnabled}
                                onChange={(e) => setTaxEnabled(e.target.checked)}
                            />
                        </div>
                        <span className="text-xs text-[#ababab]">{TAX_RATE}%</span>
                    </div>
                )}

                {/* ✅ RESUMEN */}
                <div className="mt-3 text-xs text-[#ababab] space-y-1">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${num(subtotal).toFixed(2)}</span>
                    </div>

                    {discountEnabledByTenant && (
                        <div className="flex justify-between">
                            <span>Descuento</span>
                            <span>-${num(discount).toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <span>Propina</span>
                        <span>${num(tip).toFixed(2)}</span>
                    </div>

                    {taxEnabledByTenant && (
                        <div className="flex justify-between">
                            <span>Tax (ITBIS)</span>
                            <span>${num(tax).toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-[#f5f5f5] font-semibold">
                        <span>Total</span>
                        <span>${num(total).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Método de pago */}
            <div className="flex items-center justify-between gap-4 px-5 mt-4">
                <button
                    onClick={() => setPaymentMethod("Cash")}
                    className={`px-4 py-3 w-full rounded-lg font-semibold ${
                        paymentMethod === "Cash"
                            ? "bg-[#2b2b2b] text-white"
                            : "bg-[#1f1f1f] text-[#ababab]"
                    }`}
                >
                    Cash
                </button>

                <button
                    onClick={() => setPaymentMethod("Online")}
                    className={`px-4 py-3 w-full rounded-lg font-semibold ${
                        paymentMethod === "Online"
                            ? "bg-[#2b2b2b] text-white"
                            : "bg-[#1f1f1f] text-[#ababab]"
                    }`}
                >
                    Online
                </button>
            </div>

            {/* Datos del cliente + Fiscal */}
            <div className="px-5 mt-4">
                <p className="text-xs text-[#ababab] mb-2">Datos del cliente (opcional)</p>

                <div className="space-y-2">
                    <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-[#1f1f1f] rounded px-3 py-2 text-[#f5f5f5] outline-none"
                        placeholder="Nombre / Razón Social"
                    />

                    <input
                        type="text"
                        value={customerRnc}
                        onChange={(e) => setCustomerRnc(e.target.value)}
                        onBlur={() => {
                            if (wantsFiscal && fiscalCapable) lookupDgii(customerRnc);
                        }}
                        className="w-full bg-[#1f1f1f] rounded px-3 py-2 text-[#f5f5f5] outline-none"
                        placeholder="RNC / Cédula (opcional)"
                    />
                </div>

                {/* ✅ FACTURA FISCAL (solo si el tenant lo permite) */}
                {fiscalEnabledByTenant && (
                    <div className="mt-4 border-t border-[#2b2b2b] pt-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#f5f5f5] font-semibold">
                                    Factura fiscal (NCF)
                                </p>
                                <p className="text-xs text-[#ababab]">
                                    Solo si el cliente lo solicita y tu empresa tiene NCF configurado.
                                </p>
                            </div>

                            <input
                                type="checkbox"
                                checked={wantsFiscal}
                                disabled={!fiscalCapable}
                                onChange={(e) => setWantsFiscal(e.target.checked)}
                            />
                        </div>

                        {!fiscalCapable && (
                            <p className="text-xs text-red-400 mt-2">
                                Este tenant no tiene NCF habilitado/configurado.
                            </p>
                        )}

                        {wantsFiscal && fiscalCapable && (
                            <div className="mt-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-[#ababab]">Tipo NCF</span>
                                    <select
                                        value={ncfType}
                                        onChange={(e) => setNcfType(e.target.value)}
                                        className="bg-[#1f1f1f] rounded px-3 py-2 text-[#f5f5f5] outline-none"
                                    >
                                        {allowedNcfTypes.map((t) => (
                                            <option key={t} value={t}>
                                                {t === "B01"
                                                    ? "B01 - Crédito Fiscal"
                                                    : "B02 - Consumidor Final"}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <p className="text-xs text-[#ababab] mt-2">
                                    Recomendación: para factura fiscal, agrega RNC/Cédula para completar los datos.
                                    {dgiiLoading ? " Buscando en DGII..." : ""}
                                    {!dgiiLoading && dgiiStatus === "FOUND" ? " Encontrado." : ""}
                                    {!dgiiLoading && dgiiStatus === "NOT_FOUND" ? " No encontrado." : ""}
                                    {!dgiiLoading && dgiiStatus === "ERROR" ? " Error consultando." : ""}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Botón actualizar */}
            <div className="flex items-center gap-3 px-5 mt-4">
                <button
                    onClick={handlePlaceOrder}
                    className="px-4 py-3 w-full rounded-lg bg-[#f6b100] text-[#1f1f1f] font-semibold text-lg"
                >
                    Actualizar Orden
                </button>
            </div>

            {showInvoice && orderInfo && (
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
