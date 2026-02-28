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
        enabled: !!tenantId,
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        queryFn: async () => {
            const res = await api.get(`/api/dishes?tenantId=${tenantId}`);
            const payload = Array.isArray(res.data?.data) ? res.data.data : res.data;
            return Array.isArray(payload) ? payload : [];
        },
    });
    const { data: invCatsData } = useQuery({
        queryKey: ["inventoryCategories", tenantId],
        enabled: !!tenantId,
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        queryFn: async () => {
            // OJO: si este endpoint es admin-only y el menú lo ven meseros/cajeros,
            // conviene crear uno público por tenant en backend.
            const res = await api.get(`/api/admin/inventory/categories?tenantId=${tenantId}`);
            const payload = Array.isArray(res.data?.data) ? res.data.data : res.data;
            return Array.isArray(payload) ? payload : [];
        },
    });



    const dishes = Array.isArray(data) ? data : [];
    const [search, setSearch] = useState("");
    const [customPriceDish, setCustomPriceDish] = useState(null);
    const [customPriceValue, setCustomPriceValue] = useState("");
    const searchTrim = search.trim().toLowerCase();
    const invCategories = Array.isArray(invCatsData) ? invCatsData : [];

    const invCatNameById = useMemo(() => {
        const m = {};
        for (const c of invCategories) {
            if (c?._id) m[String(c._id)] = (c?.name || "").trim();
        }
        return m;
    }, [invCategories]);



    // Agrupar por categoría (ordenadas alfabéticamente)
    const getInvCatName = (d) => {
        // Caso 1: backend populó inventoryCategory { _id, name }
        if (d?.inventoryCategory && typeof d.inventoryCategory === "object") {
            const n = (d.inventoryCategory.name || "").trim();
            if (n) return n;
        }

        // Caso 2: backend manda inventoryCategoryName explícito
        if (typeof d?.inventoryCategoryName === "string") {
            const n = d.inventoryCategoryName.trim();
            if (n) return n;
        }

        // Caso 3: backend manda inventoryCategoryId (lo normal ahora)
        const id =
            d?.inventoryCategoryId ||
            d?.inventoryCategory?._id ||
            (typeof d?.inventoryCategory === "string" ? d.inventoryCategory : null);

        if (id) {
            const name = invCatNameById[String(id)];
            if (name) return name;
        }

        return "";
    };


    const categories = useMemo(() => {
        const grouped = dishes.reduce((acc, d) => {
            const invName = getInvCatName(d);

            // 👇 Importante: aquí eliminamos el fallback a d.category,
            // porque tú quieres que sea LA MISMA de inventario siempre.
            const k = invName || "Uncategorized";

            if (!acc[k]) acc[k] = [];
            acc[k].push(d);
            return acc;
        }, {});
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [dishes, invCatNameById]);

    const filteredCategories = useMemo(() => {
        if (!searchTrim) return categories;

        return categories
            .map(([categoryName, items]) => {
                const filtered = items.filter((d) =>
                    (d.name || "").toLowerCase().includes(searchTrim)
                );
                return [categoryName, filtered];
            })
            .filter(([, items]) => items.length > 0);
    }, [categories, searchTrim]);


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
    },  [categories]);

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
    // Pesos por plato (por id) - para sellMode === "weight"
    const [weightMap, setWeightMap] = useState({});
    const getWeight = (id) => {
        const v = weightMap[id];
        const n = Number(String(v ?? "1").replace(",", "."));
        return Number.isFinite(n) ? Math.max(0, n) : 0;
    };
    const setWeight = (id, val) => setWeightMap((m) => ({ ...m, [id]: val }));

    const getQty = (id) => Math.max(0, qtyMap[id] ?? 1);
    const inc = (id) => setQtyMap((m) => ({ ...m, [id]: Math.min((m[id] ?? 1) + 1, 99) }));
    const dec = (id) =>
        setQtyMap((m) => ({ ...m, [id]: Math.max((m[id] ?? 1) - 1, 0) }));




    // Agregar al carrito
    const addToCart = (dish) => {
        const sellMode = String(dish?.sellMode || "unit").toLowerCase();

        // UNIT
        if (sellMode !== "weight") {
            const quantity = getQty(dish._id);
            if (quantity <= 0) {
                enqueueSnackbar?.("Quantity must be at least 1", { variant: "warning" });
                return;
            }

            // Si es precio manual, abre modal y no agregues aún
            if (dish?.allowCustomPrice) {
                setCustomPriceDish(dish);
                setCustomPriceValue(""); // limpio
                return;
            }

            const unitPrice = Number(dish.price) || 0;

            const item = {
                id: dish._id,
                dishId: dish._id,
                name: dish.name,
                qtyType: "unit",
                quantity,
                unitPrice,
                price: unitPrice * quantity,
                imageUrl: dish.imageUrl ? `http://localhost:8000${dish.imageUrl}` : "",
            };

            if (typeof onAddToCart === "function") {
                onAddToCart(item);
                enqueueSnackbar?.(`${item.name} x${item.quantity} added to cart`, { variant: "success" });
                return;
            }

            dispatch(addItems(item));
            return;
        }

        // WEIGHT (lb)
        const weight = getWeight(dish._id);
        if (weight <= 0) {
            enqueueSnackbar?.("Las libras deben ser mayor a 0.", { variant: "warning" });
            return;
        }

        const unitPrice = Number((dish.pricePerLb ?? dish.pricePerLB ?? dish.price) ?? 0);
        const lineTotal = Number((unitPrice * weight).toFixed(2));

        const item = {
            id: dish._id,
            dishId: dish._id,
            name: dish.name,
            qtyType: "weight",
            weightUnit: dish.weightUnit || "lb",
            quantity: weight,
            unitPrice,
            price: lineTotal,
            imageUrl: dish.imageUrl ? `http://localhost:8000${dish.imageUrl}` : "",
        };

        if (typeof onAddToCart === "function") {
            onAddToCart(item);
            enqueueSnackbar?.(`${item.name} (${weight} ${item.weightUnit}) added to cart`, { variant: "success" });
            return;
        }

        dispatch(addItems(item));
    };


    return (
        <div className="h-full overflow-y-auto scrollbar-hide px-10 pb-6">
            <h2 className="text-[#f5f5f5] text-xl font-semibold mb-6">Platos Disponibles</h2>
            <div className="mb-4">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar platos..."
                    className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]
               text-[#f5f5f5] outline-none
               focus:ring-1 focus:ring-[#f6b100] focus:border-[#f6b100]"
                />
            </div>
            <AnimatePresence>
                {customPriceDish && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
                        onClick={() => setCustomPriceDish(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-white text-lg font-semibold">
                                Precio manual
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">
                                {customPriceDish?.name}
                            </p>

                            <div className="mt-4">
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Escribe el precio
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={customPriceValue}
                                    onChange={(e) => setCustomPriceValue(e.target.value)}
                                    className="w-full p-3 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    placeholder="Ej: 350"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3 mt-5">
                                <button
                                    type="button"
                                    onClick={() => setCustomPriceDish(null)}
                                    className="px-4 py-3 w-full rounded-lg font-semibold bg-[#1f1f1f] text-[#ababab]"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const quantity = getQty(customPriceDish._id);
                                        const manual = Number(String(customPriceValue ?? "").replace(",", "."));

                                        if (!Number.isFinite(manual) || manual < 0) {
                                            enqueueSnackbar?.("Precio manual inválido.", { variant: "warning" });
                                            return;
                                        }

                                        const unitPrice = manual;
                                        const item = {
                                            id: customPriceDish._id,
                                            dishId: customPriceDish._id,
                                            name: customPriceDish.name,
                                            qtyType: "unit",
                                            quantity,
                                            unitPrice,
                                            price: unitPrice * quantity,
                                            imageUrl: customPriceDish.imageUrl ? `http://localhost:8000${customPriceDish.imageUrl}` : "",
                                            allowCustomPrice: true,
                                        };

                                        if (typeof onAddToCart === "function") {
                                            onAddToCart(item);
                                        } else {
                                            dispatch(addItems(item));
                                        }

                                        enqueueSnackbar?.(`${item.name} x${item.quantity} agregado`, { variant: "success" });
                                        setCustomPriceDish(null);
                                    }}
                                    className="px-4 py-3 w-full rounded-lg font-semibold bg-[#2b2b2b] text-white"
                                >
                                    Agregar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isLoading && (
                <p className="text-[#ababab] text-center py-10">Loading menu...</p>
            )}
            {isError && (
                <p className="text-red-500 text-center py-10">Error loading menu.</p>
            )}
            {!isLoading && !isError && categories.length === 0 && (
                <p className="text-[#ababab] text-center py-10">Platos no disponibles</p>
            )}

            {!isLoading && !isError && categories.length > 0 && (
                <div className="flex flex-col gap-5">
                    {!isLoading && !isError && filteredCategories.length === 0 && (
                        <p className="text-[#ababab] text-center py-10">
                            No dishes found for “{search}”.
                        </p>
                    )}
                    {filteredCategories.map(([categoryName, items])=> {
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
                                                        const isWeight = String(dish?.sellMode || "unit").toLowerCase() === "weight";
                                                        const canAdd = isWeight ? getWeight(dish._id) > 0 : qty > 0;

                                                        return (
                                                            <motion.div
                                                                key={dish._id}
                                                                whileHover={{ y: -3 }}
                                                                className="bg-[#1a1a1a] rounded-xl p-4 border border-[#262626] hover:border-[#3a3a3a] transition-colors"
                                                            >
                                                                <div className="flex flex-col items-center text-center">
                                                                    <img
                                                                        src={dish.imageUrl || " /placeholder.jpg"}
                                                                        alt={dish.name}
                                                                        className="w-[96px] h-[96px] object-cover rounded-full mb-3 ring-1 ring-[#2b2b2b]"
                                                                        loading="lazy"
                                                                        onError={(e) => {
                                                                            e.currentTarget.src = " /placeholder.jpg";
                                                                        }}
                                                                    />
                                                                    <h4 className="text-[#f5f5f5] font-semibold line-clamp-2">
                                                                        {dish.name}
                                                                    </h4>
                                                                    <p className="text-[#f6b100] font-semibold mt-2">
                                                                        ${Number(dish.price) || 0}
                                                                    </p>

                                                                    {String(dish?.sellMode || "unit").toLowerCase() === "weight" ? (
                                                                        <div className="w-full mt-4">
                                                                            <div className="flex items-center justify-between text-xs text-[#ababab]">
                                                                                <span>Libras</span>
                                                                                <span>
                                                                              ${Number((dish.pricePerLb ?? dish.pricePerLB ?? dish.price) ?? 0)} / {dish.weightUnit || "lb"}
                                                                                </span>
                                                                            </div>

                                                                            <input
                                                                                type="text"
                                                                                inputMode="decimal"
                                                                                value={weightMap[dish._id] ?? "1"}
                                                                                onChange={(e) => setWeight(dish._id, e.target.value)}
                                                                                className="mt-2 w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#2a2a2a]
                                                                            text-[#f5f5f5] outline-none focus:ring-1 focus:ring-[#f6b100] focus:border-[#f6b100]"
                                                                                placeholder="Ej: 0.5"
                                                                            />

                                                                            <p className="mt-2 text-sm font-semibold text-[#f6b100]">
                                                                                Total: ${Number((Number((dish.pricePerLb ?? dish.pricePerLB ?? dish.price) ?? 0) * getWeight(dish._id))).toFixed(2)}
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-3 mt-4">
                                                                            <button
                                                                                onClick={() => dec(dish._id)}
                                                                                className="p-2 rounded-full border border-[#2f2f2f] hover:bg-[#222] text-[#eaeaea]"
                                                                                aria-label={`Decrease ${dish.name}`}
                                                                            >
                                                                                <Minus size={16} />
                                                                            </button>
                                                                            <span className="min-w-[28px] text-[#f5f5f5] font-semibold">{qty}</span>
                                                                            <button
                                                                                onClick={() => inc(dish._id)}
                                                                                className="p-2 rounded-full border border-[#2f2f2f] hover:bg-[#222] text-[#eaeaea]"
                                                                                aria-label={`Increase ${dish.name}`}
                                                                            >
                                                                                <Plus size={16} />
                                                                            </button>
                                                                        </div>
                                                                    )}


                                                                    {/* Botón Agregar */}
                                                                    <button
                                                                        onClick={() => addToCart(dish)}
                                                                        disabled={!canAdd}
                                                                        className={`mt-3 w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold transition-colors ${
                                                                            canAdd
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
