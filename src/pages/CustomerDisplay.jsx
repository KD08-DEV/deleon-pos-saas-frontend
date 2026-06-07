import React, { useEffect, useMemo, useState } from "react";
import {
    formatCurrency,
    readCustomerDisplayState,
    subscribeCustomerDisplayState,
} from "../lib/customerDisplaySync";
import "./CustomerDisplay.css";

const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const getScreenParam = () => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("screen") || "";
};

const formatQuantity = (item) => {
    const quantity = toNumber(item?.quantity ?? 1);
    const cleanQuantity = Number.isInteger(quantity)
        ? quantity
        : quantity.toLocaleString("es-DO", {
            maximumFractionDigits: 2,
        });

    if (item?.qtyType === "weight" && item?.weightUnit) {
        return `${cleanQuantity} ${item.weightUnit}`;
    }

    return cleanQuantity;
};

const getLastUpdateLabel = (updatedAt) => {
    if (!updatedAt) return "--";

    return new Date(updatedAt).toLocaleTimeString("es-DO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};

const CustomerDisplay = () => {
    const [state, setState] = useState(() => readCustomerDisplayState());

    const [viewport, setViewport] = useState(() => ({
        width: typeof window !== "undefined" ? window.innerWidth : 1366,
        height: typeof window !== "undefined" ? window.innerHeight : 768,
    }));

    useEffect(() => {
        return subscribeCustomerDisplayState(setState);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const screenParam = getScreenParam();

    const isCompact = useMemo(() => {
        if (screenParam === "7") return true;
        if (screenParam === "11") return false;

        return viewport.width <= 900 || viewport.height <= 620;
    }, [screenParam, viewport.width, viewport.height]);

    const items = useMemo(() => {
        return Array.isArray(state.items) ? state.items : [];
    }, [state.items]);

    const hasItems = items.length > 0;

    const subtotal = toNumber(state.subtotal);
    const discount = toNumber(state.discount);
    const deliveryFee = toNumber(state.deliveryFee);
    const tax = toNumber(state.tax);
    const tip = toNumber(state.tip);
    const total = toNumber(state.total || state.subtotal);

    const paymentMethod = state.paymentMethod || "Pendiente";

    const orderLabel =
        state.tableLabel ||
        (state.orderId ? `#${String(state.orderId).slice(-6).toUpperCase()}` : "N/A");

    const status = state.status || "idle";

    const statusLabel = {
        idle: "Esperando venta",
        active: "Venta activa",
        payment: "En pago",
        paid: "Pago registrado",
    }[status] || "Venta activa";

    const summaryRows = [
        {
            label: "Subtotal",
            value: subtotal,
            show: true,
        },
        {
            label: "Descuento",
            value: discount,
            show: discount > 0,
            negative: true,
        },
        {
            label: "Envío",
            value: deliveryFee,
            show: deliveryFee > 0,
        },
        {
            label: "Propina",
            value: tip,
            show: tip > 0,
        },
        {
            label: "ITBIS",
            value: tax,
            show: tax > 0,
        },
    ].filter((row) => row.show);

    const showCashInfo = paymentMethod === "Efectivo" && toNumber(state.cashReceived) > 0;

    return (
        <main
            className={`customer-display ${isCompact ? "is-compact" : "is-wide"} ${
                hasItems ? "has-items" : "is-empty"
            }`}
        >
            <div className="customer-display__shell">
                <section className="cd-panel cd-order-panel">
                    <header className="cd-header">
                        <div className="cd-title-block">
                            <p className="cd-brand">DELEONSOFT POS</p>
                            <h1 className="cd-title">Pantalla del cliente</h1>

                            {state.customerName && (
                                <p className="cd-customer">
                                    Cliente: <strong>{state.customerName}</strong>
                                </p>
                            )}
                        </div>

                        <div className="cd-order-meta">
                            <span>Mesa / Orden</span>
                            <strong>{orderLabel}</strong>
                            <em className={`cd-status-pill cd-status-${status}`}>
                                {statusLabel}
                            </em>
                        </div>
                    </header>

                    <div className="cd-items-region">
                        {!hasItems ? (
                            <div className="cd-empty-state">
                                <div className="cd-empty-badge">D</div>
                                <h2>Esperando productos…</h2>
                                <p>
                                    Los artículos aparecerán aquí cuando se agreguen a la venta.
                                </p>
                            </div>
                        ) : (
                            <div className="cd-items-list" aria-label="Productos de la venta">
                                {items.map((item, index) => (
                                    <article
                                        className="cd-item-card"
                                        key={`${item.id || item.name || "item"}-${index}`}
                                    >
                                        <div className="cd-item-info">
                                            <h2 className="cd-item-name" title={item.name}>
                                                {item.name || "Producto"}
                                            </h2>

                                            <p className="cd-item-qty">
                                                Cantidad: <strong>{formatQuantity(item)}</strong>
                                            </p>
                                        </div>

                                        <strong className="cd-item-price">
                                            {formatCurrency(item.price)}
                                        </strong>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <aside className="cd-summary-panel">
                    <div className="cd-total-block">
                        <p className="cd-total-label">TOTAL A PAGAR</p>

                        <h2
                            key={`${state.updatedAt}-${total}`}
                            className="cd-total-value"
                            aria-live="polite"
                        >
                            {formatCurrency(total)}
                        </h2>

                        {status === "paid" && (
                            <div className="cd-paid-banner">
                                <strong>Pago registrado</strong>
                                <span>Gracias por su compra.</span>
                            </div>
                        )}
                    </div>

                    <div className="cd-summary-content">
                        <div className="cd-summary-breakdown">
                            {summaryRows.map((row) => (
                                <div
                                    className={`cd-summary-row ${
                                        row.negative ? "is-negative" : ""
                                    }`}
                                    key={row.label}
                                >
                                    <span>{row.label}</span>
                                    <strong>
                                        {row.negative ? "-" : ""}
                                        {formatCurrency(row.value)}
                                    </strong>
                                </div>
                            ))}
                        </div>

                        <div className="cd-payment-box">
                            <div className="cd-payment-row">
                                <span>Método</span>
                                <strong>{paymentMethod}</strong>
                            </div>

                            {showCashInfo && (
                                <div className="cd-cash-grid">
                                    <div>
                                        <span>Recibido</span>
                                        <strong>{formatCurrency(state.cashReceived)}</strong>
                                    </div>

                                    {toNumber(state.cashMissing) > 0 ? (
                                        <div className="is-missing">
                                            <span>Falta</span>
                                            <strong>{formatCurrency(state.cashMissing)}</strong>
                                        </div>
                                    ) : (
                                        <div>
                                            <span>Cambio</span>
                                            <strong>{formatCurrency(state.cashChange)}</strong>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <p className="cd-last-update">
                            Última actualización: {getLastUpdateLabel(state.updatedAt)}
                        </p>
                    </div>
                </aside>
            </div>
        </main>
    );
};

export default CustomerDisplay;