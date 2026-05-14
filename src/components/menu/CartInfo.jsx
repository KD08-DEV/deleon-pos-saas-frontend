import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { RiDeleteBin2Fill } from "react-icons/ri";
import { FaNotesMedical } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { setCart } from "../../redux/slices/cartSlice";

const getItemKey = (item, index) => {
    return [
        item?.id || item?._id || item?.dishId || item?.dish || item?.name || "item",
        item?.qtyType || "unit",
        item?.weightUnit || "",
        index,
    ].join("__");
};

const getItemSignature = (item) => {
    return JSON.stringify({
        quantity: Number(item?.quantity || 0),
        price: Number(item?.price || 0),
        qtyType: item?.qtyType || "unit",
        weightUnit: item?.weightUnit || "",
    });
};

const num = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const getUnitPrice = (item) => {
    const quantity = num(item?.quantity || 1);

    return num(
        item?.unitPrice ??
        item?.pricePerQuantity ??
        item?.pricePerLb ??
        item?.pricePerLB ??
        (quantity > 0 ? num(item?.price) / quantity : 0)
    );
};

const recalcItem = (item, nextQty) => {
    const unitPrice = getUnitPrice(item);
    const quantity = Number(nextQty);

    return {
        ...item,
        quantity,
        qty: quantity,
        unitPrice,
        price: Number((unitPrice * quantity).toFixed(2)),
    };
};

const CartInfo = () => {
    const cartDataRaw = useSelector((state) => state.cart);
    const cartData = Array.isArray(cartDataRaw) ? cartDataRaw : [];
    const scrollRef = useRef(null);
    const prevSnapshotRef = useRef({});
    const highlightTimeoutRef = useRef(null);
    const dispatch = useDispatch();

    const [highlightedKey, setHighlightedKey] = useState(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [cartData]);

    useEffect(() => {
        const nextSnapshot = {};
        let changedKey = null;

        cartData.forEach((item, index) => {
            const key = getItemKey(item, index);
            const signature = getItemSignature(item);

            nextSnapshot[key] = signature;

            if (!(key in prevSnapshotRef.current)) {
                changedKey = key;
                return;
            }

            if (prevSnapshotRef.current[key] !== signature) {
                changedKey = key;
            }
        });

        prevSnapshotRef.current = nextSnapshot;

        if (!changedKey) return;

        setHighlightedKey(changedKey);

        if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
        }

        highlightTimeoutRef.current = setTimeout(() => {
            setHighlightedKey(null);
        }, 900);
    }, [cartData]);

    useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current);
            }
        };
    }, []);

    const handleRemoveOne = (index) => {
        const item = cartData[index];
        if (!item) return;

        const currentQty = num(item.quantity || 1);
        const nextCart = [...cartData];

        // Si solo queda 1, se elimina la línea completa.
        if (currentQty <= 1) {
            nextCart.splice(index, 1);
            dispatch(setCart(nextCart));
            return;
        }

        // Si hay más de 1, solo resta 1.
        const nextQty = currentQty - 1;
        nextCart[index] = recalcItem(item, nextQty);

        dispatch(setCart(nextCart));
    };

    const handleAddOne = (index) => {
        const item = cartData[index];
        if (!item) return;

        const currentQty = num(item.quantity || 1);
        const nextQty = currentQty + 1;

        const nextCart = [...cartData];
        nextCart[index] = recalcItem(item, nextQty);

        dispatch(setCart(nextCart));
    };

    return (
        <div className="px-4 py-2">
            <h1 className="text-lg text-[#e4e4e4] font-semibold tracking-wide">
                Order Details
            </h1>

            <div className="mt-4 overflow-y-auto scrollbar-hide" ref={scrollRef}>
                {cartData.length === 0 ? (
                    <p className="text-[#ababab] text-sm flex justify-center items-center py-12">
                        Tu carrito está vacío. Empieza a añadir.
                    </p>
                ) : (
                    <AnimatePresence initial={false}>
                        {cartData.map((item, index) => {
                            const itemKey = getItemKey(item, index);
                            const isHighlighted = highlightedKey === itemKey;

                            return (
                                <motion.div
                                    key={itemKey}
                                    layout
                                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        boxShadow: isHighlighted
                                            ? "0 0 0 1px rgba(246,177,0,0.35), 0 12px 30px rgba(246,177,0,0.12)"
                                            : "0 0 0 1px rgba(255,255,255,0.02)",
                                    }}
                                    exit={{ opacity: 0, x: 24, scale: 0.96 }}
                                    transition={{
                                        duration: 0.28,
                                        ease: "easeOut",
                                        layout: { duration: 0.2 },
                                    }}
                                    className={`relative rounded-lg px-4 py-4 mb-2 border overflow-hidden ${
                                        isHighlighted
                                            ? "bg-gradient-to-r from-[#1f1f1f] via-[#242018] to-[#1f1f1f] border-[#f6b100]/40"
                                            : "bg-[#1f1f1f] border-white/5"
                                    }`}
                                >
                                    <AnimatePresence>
                                        {isHighlighted && (
                                            <>
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(246,177,0,0.16),transparent_35%)]"
                                                />

                                                <motion.span
                                                    initial={{ opacity: 0, y: 8, scale: 0.92 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -8, scale: 0.92 }}
                                                    className="absolute right-3 top-3 rounded-full border border-[#f6b100]/30 bg-[#f6b100]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f6b100]"
                                                >
                                                    Agregado
                                                </motion.span>
                                            </>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex items-center justify-between">
                                        <h1 className="text-[#ababab] font-semibold tracking-wide text-md pr-3">
                                            {item.name}
                                        </h1>

                                        <p className="text-[#ababab] font-semibold">
                                            {item.qtyType === "weight"
                                                ? `${Number(item.quantity || 0)} ${item.weightUnit || "lb"}`
                                                : `x${item.quantity}`}
                                        </p>
                                    </div>

                                    {item.note && (
                                        <p className="mt-2 text-xs text-[#f6b100]">
                                            Nota: {item.note}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOne(index)}
                                                className="text-[#ababab] hover:text-red-400 transition-colors"
                                                title="Quitar 1"
                                            >
                                                <RiDeleteBin2Fill size={20} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleAddOne(index)}
                                                className="text-[#ababab] hover:text-[#f6b100] transition-colors"
                                                title="Agregar 1"
                                            >
                                                <FaNotesMedical size={20} />
                                            </button>
                                        </div>

                                        <p className="text-[#f5f5f5] text-md font-bold">
                                            ${Number(item.price || 0).toFixed(2)}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default CartInfo;