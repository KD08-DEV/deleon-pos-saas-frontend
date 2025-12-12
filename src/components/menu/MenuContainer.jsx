import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ShoppingCart, Minus, Plus } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { useDispatch ,useSelector } from "react-redux";
import { setCart } from "../../redux/slices/cartSlice";
import { addItems } from "../../redux/slices/cartSlice";
import api from "../../lib/api"



const LS_KEY = "menu:lastOpenCategory";


const MenuContainer = ({ orderId, onAddToCart }) => {
    const userData = useSelector((state) => state.user.userData);
    const tenantId = userData?.tenantId;
    const dispatch = useDispatch();

    const cart = useSelector((s) => s.cart);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["dishes", tenantId],
        queryFn: async () => {
            const res = await api.get(`/api/dishes?tenantId=${tenantId}`);
            const payload = Array.isArray(res.data?.data) ? res.data.data : res.data;
            return Array.isArray(payload) ? payload : [];
        },
    });

    const dishes = Array.isArray(data) ? data : [];

    // Agrupar por categoría (ordenadas alfabéticamente)
    const categories = useMemo(() => {
        const grouped = dishes.reduce((acc, d) => {
            const k = d.category || "Uncategorized";
            if (!acc[k]) acc[k] = [];
            acc[k].push(d);
            return acc;
        }, {});
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [dishes]);

    // Acordeón: recordar última categoría abierta
    const [openCategory, setOpenCategory] = useState(() => {
        try {
            return localStorage.getItem(LS_KEY) || "";
        } catch {
            return "";
        }
    });
    const catRefs = useRef({});

    useEffect(() => {
        if (!categories.length) return;
        const names = categories.map(([name]) => name);
        if (!openCategory || !names.includes(openCategory)) {
            const stored = localStorage.getItem(LS_KEY) || "";
            const fallback = names.includes(stored) ? stored : names[0];
            setOpenCategory(fallback);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories.length]);

    useEffect(() => {
        if (openCategory) {
            try {
                localStorage.setItem(LS_KEY, openCategory);
            } catch {}
            const el = catRefs.current[openCategory];
            if (el) {
                setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
            }
        }
    }, [openCategory]);

    const toggle = (categoryName) => {
        setOpenCategory((prev) => (prev === categoryName ? "" : categoryName));
    };

    // Cantidades por plato (por id)
    const [qtyMap, setQtyMap] = useState({});
    const getQty = (id) => Math.max(0, qtyMap[id] ?? 1);
    const inc = (id) => setQtyMap((m) => ({ ...m, [id]: Math.min((m[id] ?? 1) + 1, 99) }));
    const dec = (id) =>
        setQtyMap((m) => ({ ...m, [id]: Math.max((m[id] ?? 1) - 1, 0) }));

    // Agregar al carrito
    const addToCart = (dish) => {
        const quantity = getQty(dish._id);
        if (quantity <= 0) {
            enqueueSnackbar?.("Quantity must be at least 1", { variant: "warning" });
            return;
        }

        const item = {
            id: dish._id,
            name: dish.name,
            price: Number(dish.price) || 0,
            quantity,
            imageUrl: dish.imageUrl ? `http://localhost:8000${dish.imageUrl}` : "",
        };

        if (typeof onAddToCart === "function") {
            onAddToCart(item);
            enqueueSnackbar?.(`${item.name} x${item.quantity} added to cart`, { variant: "success" });
            return;
        }

        // ✅ Usar Redux directamente si no nos pasan handler
        dispatch(addItems(item));



        // ✅ Fallback: guardar en localStorage (cart)
        try {
            const raw = localStorage.getItem("cart");
            const cart = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
            const idx = cart.findIndex((i) => i.id === item.id);
            if (idx >= 0) {
                cart[idx].quantity = Math.min(99, (cart[idx].quantity || 0) + quantity);
            } else {
                cart.push(item);
            }
            localStorage.setItem("cart", JSON.stringify(cart));
            enqueueSnackbar?.(`${item.name} x${item.quantity} added to cart`, { variant: "success" });
        } catch {
            enqueueSnackbar?.("Unable to store cart locally", { variant: "error" });
        }
    };

    return (
        <div className="overflow-y-scroll h-[calc(100vh-9rem)] scrollbar-hide px-10 pb-6">
            <h2 className="text-[#f5f5f5] text-xl font-semibold mb-6">Available Dishes</h2>

            {isLoading && (
                <p className="text-[#ababab] text-center py-10">Loading menu...</p>
            )}
            {isError && (
                <p className="text-red-500 text-center py-10">Error loading menu.</p>
            )}
            {!isLoading && !isError && categories.length === 0 && (
                <p className="text-[#ababab] text-center py-10">No dishes available.</p>
            )}

            {!isLoading && !isError && categories.length > 0 && (
                <div className="flex flex-col gap-5">
                    {categories.map(([categoryName, items]) => {
                        const isOpen = openCategory === categoryName;
                        return (
                            <div
                                key={categoryName}
                                ref={(el) => (catRefs.current[categoryName] = el)}
                                className={`rounded-2xl border transition-all duration-300 ${
                                    isOpen ? "border-[#3a3a3a] bg-[#141414]" : "border-[#222] bg-[#121212]"
                                } hover:border-[#343434] shadow-[0_8px_20px_rgba(0,0,0,0.25)]`}
                            >
                                {/* Header categoría */}
                                <button
                                    onClick={() => toggle(categoryName)}
                                    className="w-full px-5 py-4 flex items-center justify-between group"
                                    aria-expanded={isOpen}
                                    aria-controls={`panel-${categoryName}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#f6b100] shadow-[0_0_12px_rgba(246,177,0,0.5)]" />
                                        <h3
                                            className={`text-lg tracking-wide font-semibold transition-colors ${
                                                isOpen ? "text-[#f6b100]" : "text-[#f5f5f5] group-hover:text-[#f6b100]"
                                            }`}
                                        >
                                            {categoryName}
                                        </h3>
                                        <span
                                            className={`ml-2 text-xs px-2 py-1 rounded-full border ${
                                                isOpen
                                                    ? "border-[#474747] bg-[#1b1b1b] text-[#f5f5f5]"
                                                    : "border-[#323232] bg-[#171717] text-[#cfcfcf]"
                                            }`}
                                        >
                      {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                                    </div>
                                    <motion.span
                                        animate={{ rotate: isOpen ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-[#d7d7d7] group-hover:text-white"
                                    >
                                        <ChevronDown size={20} />
                                    </motion.span>
                                </button>

                                {/* Panel con animación */}
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            id={`panel-${categoryName}`}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.28, ease: "easeOut" }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-5 pb-5">
                                                <div className="grid grid-cols-3 gap-6 pt-1">
                                                    {items.map((dish) => {
                                                        const qty = getQty(dish._id);
                                                        return (
                                                            <motion.div
                                                                key={dish._id}
                                                                whileHover={{ y: -3 }}
                                                                className="bg-[#1a1a1a] rounded-xl p-4 border border-[#262626] hover:border-[#3a3a3a] transition-colors"
                                                            >
                                                                <div className="flex flex-col items-center text-center">
                                                                    <img
                                                                        src={dish.imageUrl || "/placeholder.jpg"}
                                                                        alt={dish.name}
                                                                        className="w-[96px] h-[96px] object-cover rounded-full mb-3 ring-1 ring-[#2b2b2b]"
                                                                        loading="lazy"
                                                                    />
                                                                    <h4 className="text-[#f5f5f5] font-semibold line-clamp-2">
                                                                        {dish.name}
                                                                    </h4>
                                                                    <p className="text-[#f6b100] font-semibold mt-2">
                                                                        ${Number(dish.price) || 0}
                                                                    </p>

                                                                    {/* Controles + / − */}
                                                                    <div className="flex items-center gap-3 mt-4">
                                                                        <button
                                                                            onClick={() => dec(dish._id)}
                                                                            className="p-2 rounded-full border border-[#2f2f2f] hover:bg-[#222] text-[#eaeaea]"
                                                                            aria-label={`Decrease ${dish.name}`}
                                                                        >
                                                                            <Minus size={16} />
                                                                        </button>
                                                                        <span className="min-w-[28px] text-[#f5f5f5] font-semibold">
                                      {qty}
                                    </span>
                                                                        <button
                                                                            onClick={() => inc(dish._id)}
                                                                            className="p-2 rounded-full border border-[#2f2f2f] hover:bg-[#222] text-[#eaeaea]"
                                                                            aria-label={`Increase ${dish.name}`}
                                                                        >
                                                                            <Plus size={16} />
                                                                        </button>
                                                                    </div>

                                                                    {/* Botón Agregar */}
                                                                    <button
                                                                        onClick={() => addToCart(dish, qty)}
                                                                        disabled={qty <= 0}
                                                                        className={`mt-3 w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold transition-colors ${
                                                                            qty > 0
                                                                                ? "bg-[#025cca] hover:bg-[#0b6fe8] text-white"
                                                                                : "bg-[#2a2a2a] text-[#777] cursor-not-allowed"
                                                                        }`}
                                                                    >
                                                                        <ShoppingCart size={18} />
                                                                        Add
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MenuContainer;
