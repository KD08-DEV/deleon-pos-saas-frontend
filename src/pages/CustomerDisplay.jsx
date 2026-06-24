import React, { useEffect, useMemo, useRef, useState } from "react";
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

const CustomerDisplay = () => {
    const [state, setState] = useState(() => readCustomerDisplayState());
    const [hasOverflow, setHasOverflow] = useState(false);
    const itemsListRef = useRef(null);

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

    const itemScrollKey = useMemo(() => {
        return items
            .map((item, index) => {
                return [
                    item?.id || index,
                    item?.name || "",
                    item?.quantity || "",
                    item?.price || "",
                ].join(":");
            })
            .join("|");
    }, [items]);

    const round2 = (value) => {
        return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
    };

    const itemsSubtotal = useMemo(() => {
        return items.reduce((sum, item) => {
            return sum + toNumber(item?.price);
        }, 0);
    }, [items]);

    const subtotal = round2(toNumber(state.subtotal) || itemsSubtotal);
    const discount = round2(state.discount);
    const deliveryFee = round2(state.deliveryFee);
    const tax = round2(state.tax);
    const tip = round2(state.tip);
    const commission = round2(state.commission);

    const calculatedTotal = round2(
        Math.max(subtotal - discount, 0) +
        deliveryFee +
        tax +
        tip +
        commission
    );

    const rawTotal = round2(state.total);

    const totalLooksLikeSubtotal =
        rawTotal > 0 &&
        Math.abs(rawTotal - subtotal) < 0.01 &&
        (tax > 0 || tip > 0 || deliveryFee > 0 || commission > 0 || discount > 0);

    const total = rawTotal > 0 && !totalLooksLikeSubtotal
        ? rawTotal
        : calculatedTotal;

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

    useEffect(() => {
        const list = itemsListRef.current;

        if (!list || !hasItems) {
            setHasOverflow(false);
            return undefined;
        }

        let rafId = 0;
        let intervalId = 0;

        const checkOverflow = () => {
            const maxScroll = list.scrollHeight - list.clientHeight;
            const overflow = maxScroll > 10;

            setHasOverflow(overflow);

            if (!overflow) {
                list.scrollTo({
                    top: 0,
                    behavior: "auto",
                });
            }

            return overflow;
        };

        rafId = window.requestAnimationFrame(() => {
            list.scrollTo({
                top: 0,
                behavior: "auto",
            });

            checkOverflow();
        });

        intervalId = window.setInterval(() => {
            const maxScroll = list.scrollHeight - list.clientHeight;

            if (maxScroll <= 10) {
                setHasOverflow(false);
                return;
            }

            setHasOverflow(true);

            const nearBottom = list.scrollTop >= maxScroll - 14;

            const nextTop = nearBottom
                ? 0
                : Math.min(
                    maxScroll,
                    list.scrollTop + Math.max(list.clientHeight * 0.82, 160)
                );

            list.scrollTo({
                top: nextTop,
                behavior: "smooth",
            });
        }, 4200);

        const handleResize = () => {
            checkOverflow();
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.clearInterval(intervalId);
            window.removeEventListener("resize", handleResize);
        };
    }, [hasItems, itemScrollKey, isCompact]);

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
                            <div className="cd-items-shell">
                                <div
                                    ref={itemsListRef}
                                    className={`cd-items-list ${
                                        hasOverflow ? "has-auto-scroll" : ""
                                    }`}
                                    aria-label="Productos de la venta"
                                >
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
                                                    Cantidad:{" "}
                                                    <strong>{formatQuantity(item)}</strong>
                                                </p>
                                            </div>

                                            <strong className="cd-item-price">
                                                {formatCurrency(item.price)}
                                            </strong>
                                        </article>
                                    ))}
                                </div>

                                {hasOverflow && (
                                    <div className="cd-scroll-hint">
                                        Mostrando todos los productos automáticamente
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                <aside className="cd-summary-panel" aria-label="Resumen de pago">
                    <div className="cd-total-block">
                        <p className="cd-total-label">TOTAL A PAGAR</p>

                        <h2
                            key={`${state.updatedAt}-${total}`}
                            className="cd-total-value"
                            aria-live="polite"
                        >
                            {formatCurrency(total)}
                        </h2>
                    </div>

                    <div className="cd-mini-summary">
                        <div className="cd-mini-card">
                            <span>Propina legal</span>
                            <strong>{formatCurrency(tip)}</strong>
                        </div>

                        <div className="cd-mini-card">
                            <span>ITBIS</span>
                            <strong>{formatCurrency(tax)}</strong>
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
};

export default CustomerDisplay;