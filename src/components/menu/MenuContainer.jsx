import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ShoppingCart, Minus, Plus, Search, X } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import {
    addItems,
    buildCartItemKey,
    setCart,
} from "../../redux/slices/cartSlice";
import api from "../../lib/api";
import { resolveImageUrl } from "../../lib/imageUrl";
import useTenant from "../../hooks/useTenant";


const LS_KEY = "menu:lastOpenCategory";


const MenuContainer = ({
                           orderId,
                           onAddToCart,
                           editCartItemRequest,
                           onEditCartItemHandled,
                       }) => {
    const userData = useSelector((state) => state.user.userData);
    const tenantId = userData?.tenantId;
    const dispatch = useDispatch();
    const { tenantInfo } = useTenant();

    const productCustomizationEnabled =
        tenantInfo?.features?.productCustomization?.enabled === true;

    const cart = useSelector((s) => s.cart);

    const MENU_LIMIT = 10000;

    const { data, isLoading, isError } = useQuery({
        queryKey: ["dishes", tenantId, MENU_LIMIT],
        enabled: !!tenantId,
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        queryFn: async () => {
            const res = await api.get(`/api/dishes?page=1&limit=${MENU_LIMIT}`);
            const payload = res?.data?.data?.items;
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

    const [customizationDish, setCustomizationDish] = useState(null);
    const [customizationBasePrice, setCustomizationBasePrice] = useState(null);
    const [selectedExtraQty, setSelectedExtraQty] = useState({});
    const [removedIngredientIds, setRemovedIngredientIds] = useState([]);
    const [customizationNote, setCustomizationNote] = useState("");
    const [editingCartEntry, setEditingCartEntry] = useState(null);
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
            const menuCategory = (d?.category || "").trim();

            const k = invName || menuCategory || "Uncategorized";

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
    const [addedFxMap, setAddedFxMap] = useState({});
    const fxTimeoutsRef = useRef({});

    const triggerAddFx = (dishId) => {
        setAddedFxMap((prev) => ({ ...prev, [dishId]: true }));

        if (fxTimeoutsRef.current[dishId]) {
            clearTimeout(fxTimeoutsRef.current[dishId]);
        }

        fxTimeoutsRef.current[dishId] = setTimeout(() => {
            setAddedFxMap((prev) => {
                const next = { ...prev };
                delete next[dishId];
                return next;
            });
            delete fxTimeoutsRef.current[dishId];
        }, 700);
    };

    useEffect(() => {
        return () => {
            Object.values(fxTimeoutsRef.current).forEach(clearTimeout);
        };
    }, []);

    const getWeight = (id) => {
        const v = weightMap[id];
        const n = Number(String(v ?? "1").replace(",", "."));
        return Number.isFinite(n) ? Math.max(0, n) : 0;
    };

    const setWeight = (id, val) => setWeightMap((m) => ({ ...m, [id]: val }));

    const resetWeight = (id) => {
        setWeightMap((m) => ({
            ...m,
            [id]: "1",
        }));
    };

    const getQty = (id) => Math.max(0, qtyMap[id] ?? 1);

    const resetQty = (id) => {
        setQtyMap((m) => ({
            ...m,
            [id]: 1,
        }));
    };

    const inc = (id) => setQtyMap((m) => ({ ...m, [id]: Math.min((m[id] ?? 1) + 1, 99) }));

    const dec = (id) =>
        setQtyMap((m) => ({ ...m, [id]: Math.max((m[id] ?? 1) - 1, 0) }));




    const getActiveExtras = (dish) =>
        (Array.isArray(dish?.customization?.extras)
                ? dish.customization.extras
                : []
        ).filter((extra) => extra?.active !== false && String(extra?.name || "").trim());

    const getActiveRemovableIngredients = (dish) =>
        (Array.isArray(dish?.customization?.removableIngredients)
                ? dish.customization.removableIngredients
                : []
        ).filter(
            (ingredient) =>
                ingredient?.active !== false &&
                String(ingredient?.name || "").trim()
        );

    const dishNeedsCustomization = (dish) => {
        if (!productCustomizationEnabled) return false;
        if (dish?.customization?.enabled !== true) return false;

        return (
            getActiveExtras(dish).length > 0 ||
            getActiveRemovableIngredients(dish).length > 0
        );
    };

    const commitItemToCart = (item) => {
        if (typeof onAddToCart === "function") {
            onAddToCart(item);
            return;
        }

        dispatch(addItems(item));
    };

    const normalizeCustomizationText = (value) =>
        String(value || "")
            .trim()
            .toLowerCase();

    const getOptionId = (option, prefix) =>
        String(
            option?._id ||
            option?.extraDishId?._id ||
            option?.extraDishId ||
            option?.ingredientDishId?._id ||
            option?.ingredientDishId ||
            option?.id ||
            `${prefix}:${option?.name || "option"}`
        );

    const optionMatchesAddon = (extra, addon) => {
        const extraIds = [
            extra?._id,
            extra?.extraDishId?._id,
            extra?.extraDishId,
            getOptionId(extra, "extra"),
        ]
            .filter(Boolean)
            .map(String);

        const addonIds = [
            addon?._id,
            addon?.id,
            addon?.extraId,
            addon?.extraDishId?._id,
            addon?.extraDishId,
        ]
            .filter(Boolean)
            .map(String);

        const matchesId = addonIds.some((id) =>
            extraIds.includes(id)
        );

        const matchesName =
            normalizeCustomizationText(extra?.name) &&
            normalizeCustomizationText(extra?.name) ===
            normalizeCustomizationText(addon?.name);

        return matchesId || matchesName;
    };

    const optionMatchesModifier = (ingredient, modifier) => {
        const ingredientIds = [
            ingredient?._id,
            ingredient?.ingredientDishId?._id,
            ingredient?.ingredientDishId,
            getOptionId(ingredient, "ingredient"),
        ]
            .filter(Boolean)
            .map(String);

        const modifierIds = [
            modifier?._id,
            modifier?.id,
            modifier?.modifierId,
            modifier?.ingredientId,
            modifier?.ingredientDishId?._id,
            modifier?.ingredientDishId,
        ]
            .filter(Boolean)
            .map(String);

        const matchesId = modifierIds.some((id) =>
            ingredientIds.includes(id)
        );

        const matchesName =
            normalizeCustomizationText(ingredient?.name) &&
            normalizeCustomizationText(ingredient?.name) ===
            normalizeCustomizationText(modifier?.name);

        return matchesId || matchesName;
    };

    const openCustomizationModal = (
        dish,
        basePriceOverride = null,
        cartEntry = null
    ) => {
        const currentItem = cartEntry?.item || null;

        setCustomizationDish(dish);
        setEditingCartEntry(cartEntry);

        const existingAddons = Array.isArray(currentItem?.addons)
            ? currentItem.addons
            : [];

        const existingModifiers = Array.isArray(currentItem?.modifiers)
            ? currentItem.modifiers
            : [];

        /*
         * Si estamos editando un producto que ya está en el carrito,
         * calculamos nuevamente el precio base quitando los extras.
         *
         * Esto también permite editar productos que tenían precio manual.
         */
        const existingAddonsUnitTotal = existingAddons.reduce(
            (sum, addon) => {
                const quantity = Math.max(
                    1,
                    Number(
                        addon?.quantity ??
                        addon?.qty ??
                        1
                    ) || 1
                );

                const unitPrice =
                    Number(
                        addon?.unitPrice ??
                        addon?.price ??
                        addon?.amount ??
                        0
                    ) || 0;

                return sum + unitPrice * quantity;
            },
            0
        );

        const itemQuantity = Math.max(
            1,
            Number(
                currentItem?.quantity ??
                currentItem?.qty ??
                1
            ) || 1
        );

        const currentUnitPrice =
            Number(
                currentItem?.unitPrice ??
                currentItem?.pricePerQuantity ??
                (
                    currentItem?.price
                        ? Number(currentItem.price) / itemQuantity
                        : dish?.price
                ) ??
                0
            ) || 0;

        const explicitBasePrice =
            currentItem?.baseUnitPrice !== undefined &&
            currentItem?.baseUnitPrice !== null
                ? Number(currentItem.baseUnitPrice)
                : null;

        const inferredBasePrice = Math.max(
            currentUnitPrice - existingAddonsUnitTotal,
            0
        );

        const resolvedBasePrice =
            basePriceOverride !== null &&
            basePriceOverride !== undefined
                ? Number(basePriceOverride)
                : currentItem
                    ? (
                        Number.isFinite(explicitBasePrice)
                            ? explicitBasePrice
                            : inferredBasePrice
                    )
                    : null;

        setCustomizationBasePrice(resolvedBasePrice);

        /*
         * Precargar los extras que ya tenía seleccionados.
         */
        const nextSelectedExtraQty = {};

        getActiveExtras(dish).forEach((extra) => {
            const extraId = getOptionId(
                extra,
                "extra"
            );

            const existingAddon =
                existingAddons.find((addon) =>
                    optionMatchesAddon(
                        extra,
                        addon
                    )
                );

            if (!existingAddon) {
                return;
            }

            const maximum = Math.max(
                1,
                Number(extra?.maxQuantity || 1)
            );

            const existingQuantity = Math.max(
                1,
                Number(
                    existingAddon?.quantity ??
                    existingAddon?.qty ??
                    1
                ) || 1
            );

            nextSelectedExtraQty[extraId] =
                Math.min(
                    maximum,
                    existingQuantity
                );
        });

        setSelectedExtraQty(
            nextSelectedExtraQty
        );

        /*
         * Precargar ingredientes retirados.
         */
        const nextRemovedIngredientIds =
            getActiveRemovableIngredients(dish)
                .filter((ingredient) =>
                    existingModifiers.some(
                        (modifier) =>
                            optionMatchesModifier(
                                ingredient,
                                modifier
                            )
                    )
                )
                .map((ingredient) =>
                    getOptionId(
                        ingredient,
                        "ingredient"
                    )
                );

        setRemovedIngredientIds(
            nextRemovedIngredientIds
        );

        setCustomizationNote(
            String(
                currentItem?.note || ""
            ).trim()
        );
    };

    const closeCustomizationModal = () => {
        setCustomizationDish(null);
        setCustomizationBasePrice(null);
        setSelectedExtraQty({});
        setRemovedIngredientIds([]);
        setCustomizationNote("");
        setEditingCartEntry(null);
    };

    useEffect(() => {
        if (!editCartItemRequest) {
            return;
        }

        // Esperamos a que el menú termine de cargar.
        if (isLoading) {
            return;
        }

        const item =
            editCartItemRequest?.item;

        const index =
            editCartItemRequest?.index;

        if (!item) {
            onEditCartItemHandled?.();
            return;
        }

        if (!productCustomizationEnabled) {
            enqueueSnackbar(
                "La personalización de productos no está habilitada.",
                {
                    variant: "warning",
                }
            );

            onEditCartItemHandled?.();
            return;
        }

        if (item?.qtyType === "weight") {
            enqueueSnackbar(
                "Los productos por peso no utilizan este editor.",
                {
                    variant: "info",
                }
            );

            onEditCartItemHandled?.();
            return;
        }

        const dishId = String(
            item?.dishId ||
            item?.id ||
            item?._id ||
            ""
        );

        const dish = dishes.find(
            (candidate) =>
                String(candidate?._id) === dishId
        );

        if (!dish) {
            enqueueSnackbar(
                "No pude encontrar la configuración actual de este producto.",
                {
                    variant: "warning",
                }
            );

            onEditCartItemHandled?.();
            return;
        }

        openCustomizationModal(
            dish,
            null,
            {
                item,
                index,
            }
        );

        onEditCartItemHandled?.();
    }, [
        editCartItemRequest,
        isLoading,
        dishes,
        productCustomizationEnabled,
    ]);
    const changeExtraQuantity = (extra, delta) => {
        const extraId = getOptionId(extra, "extra");
        const maximum = Math.max(1, Number(extra?.maxQuantity || 1));

        setSelectedExtraQty((current) => {
            const currentQty = Number(current?.[extraId] || 0);
            const nextQty = Math.max(0, Math.min(maximum, currentQty + delta));

            return {
                ...current,
                [extraId]: nextQty,
            };
        });
    };

    const toggleRemovedIngredient = (ingredient) => {
        const ingredientId = getOptionId(ingredient, "ingredient");

        setRemovedIngredientIds((current) =>
            current.includes(ingredientId)
                ? current.filter((id) => id !== ingredientId)
                : [...current, ingredientId]
        );
    };

    const addCustomizedItem = () => {
        if (!customizationDish) {
            return;
        }

        const currentEditingItem =
            editingCartEntry?.item ||
            null;

        /*
         * Si estamos editando, NO modificamos la cantidad.
         * La cantidad se sigue manejando con los botones del carrito.
         */
        const quantity = currentEditingItem
            ? Math.max(
                1,
                Number(
                    currentEditingItem?.quantity ??
                    currentEditingItem?.qty ??
                    1
                ) || 1
            )
            : getQty(
                customizationDish._id
            );

        if (quantity <= 0) {
            enqueueSnackbar?.(
                "La cantidad debe ser al menos 1.",
                {
                    variant: "warning",
                }
            );
            return;
        }

        const baseUnitPrice = Number(
            customizationBasePrice ??
            customizationDish?.price ??
            0
        );

        const addons =
            getActiveExtras(
                customizationDish
            )
                .map((extra) => {
                    const extraId =
                        getOptionId(
                            extra,
                            "extra"
                        );

                    const extraQuantity =
                        Number(
                            selectedExtraQty?.[
                                extraId
                                ] || 0
                        );

                    const unitPrice =
                        Number(
                            extra?.price || 0
                        );

                    if (
                        extraQuantity <= 0
                    ) {
                        return null;
                    }

                    return {
                        extraId:
                            extra?._id ||
                            extraId,

                        extraDishId:
                            extra
                                ?.extraDishId
                                ?._id ||
                            extra
                                ?.extraDishId ||
                            null,

                        name: String(
                            extra?.name ||
                            "Extra"
                        ).trim(),

                        quantity:
                        extraQuantity,

                        unitPrice,

                        total: Number(
                            (
                                unitPrice *
                                extraQuantity
                            ).toFixed(2)
                        ),

                        type: "extra",
                    };
                })
                .filter(Boolean);

        const modifiers =
            getActiveRemovableIngredients(
                customizationDish
            )
                .filter(
                    (ingredient) =>
                        removedIngredientIds.includes(
                            getOptionId(
                                ingredient,
                                "ingredient"
                            )
                        )
                )
                .map(
                    (ingredient) => ({
                        modifierId:
                            ingredient?._id ||
                            getOptionId(
                                ingredient,
                                "ingredient"
                            ),

                        ingredientDishId:
                            ingredient
                                ?.ingredientDishId
                                ?._id ||
                            ingredient
                                ?.ingredientDishId ||
                            null,

                        name: String(
                            ingredient?.name ||
                            "Ingrediente"
                        ).trim(),

                        type: "remove",
                    })
                );

        const addonsUnitTotal =
            addons.reduce(
                (sum, addon) =>
                    sum +
                    Number(
                        addon?.total || 0
                    ),
                0
            );

        const unitPrice = Number(
            (
                baseUnitPrice +
                addonsUnitTotal
            ).toFixed(2)
        );

        const item = {
            id:
            customizationDish._id,

            dishId:
            customizationDish._id,

            name:
            customizationDish.name,

            qtyType: "unit",

            quantity,

            baseUnitPrice,

            addonsUnitTotal:
                Number(
                    addonsUnitTotal.toFixed(
                        2
                    )
                ),

            unitPrice,

            price: Number(
                (
                    unitPrice *
                    quantity
                ).toFixed(2)
            ),

            imageUrl:
                resolveImageUrl(
                    customizationDish.imageUrl
                ),

            productionArea:
                customizationDish
                    .productionArea ||
                "kitchen",

            allowCustomPrice:
                Boolean(
                    customizationDish
                        .allowCustomPrice
                ),

            addons,

            modifiers,

            note: String(
                customizationNote || ""
            ).trim(),
        };

        /*
         * =============================
         * EDITANDO PRODUCTO EXISTENTE
         * =============================
         */
        if (editingCartEntry) {
            const currentCart =
                Array.isArray(cart)
                    ? cart
                    : Array.isArray(
                        cart?.items
                    )
                        ? cart.items
                        : [];

            const targetIndex =
                Number(
                    editingCartEntry.index
                );

            if (
                !Number.isInteger(
                    targetIndex
                ) ||
                !currentCart[
                    targetIndex
                    ]
            ) {
                enqueueSnackbar(
                    "No pude actualizar este producto.",
                    {
                        variant: "error",
                    }
                );

                closeCustomizationModal();
                return;
            }

            const originalItem =
                currentCart[
                    targetIndex
                    ];

            const nextCartKey =
                buildCartItemKey(
                    item
                );

            item.cartKey =
                nextCartKey;

            /*
             * Conservamos lineId para que siga siendo
             * la misma línea de la orden.
             */
            item.lineId =
                originalItem?.lineId ||
                originalItem?.cartKey ||
                nextCartKey;

            const nextCart = [
                ...currentCart,
            ];

            nextCart[
                targetIndex
                ] = {
                ...originalItem,
                ...item,
            };

            dispatch(
                setCart(
                    nextCart
                )
            );

            enqueueSnackbar?.(
                `${item.name} actualizado`,
                {
                    variant: "success",
                }
            );

            closeCustomizationModal();

            return;
        }

        /*
         * =============================
         * PRODUCTO NUEVO
         * =============================
         */

        item.cartKey =
            buildCartItemKey(
                item
            );

        item.lineId =
            item.cartKey;

        commitItemToCart(
            item
        );

        triggerAddFx(
            customizationDish._id
        );

        resetQty(
            customizationDish._id
        );

        enqueueSnackbar?.(
            `${item.name} x${item.quantity} agregado`,
            {
                variant: "success",
            }
        );

        closeCustomizationModal();
    };

    // Agregar al carrito
    const addToCart = (dish) => {
        const sellMode = String(dish?.sellMode || "unit").toLowerCase();

        if (sellMode !== "weight") {
            const quantity = getQty(dish._id);

            if (quantity <= 0) {
                enqueueSnackbar?.("La cantidad debe ser al menos 1.", {
                    variant: "warning",
                });
                return;
            }

            if (dish?.allowCustomPrice) {
                setCustomPriceDish(dish);
                setCustomPriceValue("");
                return;
            }



            const unitPrice = Number(dish.price) || 0;

            const item = {
                id: dish._id,
                dishId: dish._id,
                name: dish.name,
                qtyType: "unit",
                quantity,
                baseUnitPrice: unitPrice,
                addonsUnitTotal: 0,
                unitPrice,
                price: Number((unitPrice * quantity).toFixed(2)),
                imageUrl: resolveImageUrl(dish.imageUrl),
                productionArea: dish.productionArea || "kitchen",
                addons: [],
                modifiers: [],
                note: "",
            };

            item.cartKey = buildCartItemKey(item);
            item.lineId = item.cartKey;

            commitItemToCart(item);
            triggerAddFx(dish._id);
            resetQty(dish._id);
            return;
        }

        const weight = getWeight(dish._id);

        if (weight <= 0) {
            enqueueSnackbar?.("Las libras deben ser mayor a 0.", {
                variant: "warning",
            });
            return;
        }

        const unitPrice = Number(
            (dish.pricePerLb ?? dish.pricePerLB ?? dish.price) ?? 0
        );
        const lineTotal = Number((unitPrice * weight).toFixed(2));

        const item = {
            id: dish._id,
            dishId: dish._id,
            name: dish.name,
            qtyType: "weight",
            weightUnit: dish.weightUnit || "lb",
            quantity: weight,
            baseUnitPrice: unitPrice,
            addonsUnitTotal: 0,
            unitPrice,
            price: lineTotal,
            imageUrl: resolveImageUrl(dish.imageUrl),
            productionArea: dish.productionArea || "kitchen",
            addons: [],
            modifiers: [],
            note: "",
        };

        item.cartKey = buildCartItemKey(item);
        item.lineId = item.cartKey;

        commitItemToCart(item);
        triggerAddFx(dish._id);
        resetWeight(dish._id);
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
                {customizationDish && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
                        onClick={closeCustomizationModal}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.96 }}
                            className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#151515] to-[#090909] shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f6b100]">
                                        {editingCartEntry
                                            ? "Editar personalización"
                                            : "Personalizar producto"}
                                    </p>
                                    <h3 className="mt-1 text-xl font-bold text-white">
                                        {customizationDish?.name}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-400">
                                        Selecciona los extras y lo que deseas retirar.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeCustomizationModal}
                                    className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"
                                    aria-label="Cerrar"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="modern-scroll flex-1 space-y-6 overflow-y-auto px-5 py-5">
                                {getActiveExtras(customizationDish).length > 0 && (
                                    <section>
                                        <div className="mb-3">
                                            <h4 className="font-semibold text-white">Extras</h4>
                                            <p className="text-xs text-gray-500">
                                                El precio seleccionado se suma a cada unidad del producto.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            {getActiveExtras(customizationDish).map((extra) => {
                                                const extraId = getOptionId(extra, "extra");
                                                const selectedQty = Number(
                                                    selectedExtraQty?.[extraId] || 0
                                                );
                                                const maximum = Math.max(
                                                    1,
                                                    Number(extra?.maxQuantity || 1)
                                                );

                                                return (
                                                    <div
                                                        key={extraId}
                                                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                                                            selectedQty > 0
                                                                ? "border-[#f6b100]/40 bg-[#f6b100]/10"
                                                                : "border-white/10 bg-black/20"
                                                        }`}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-white">
                                                                {extra.name}
                                                            </p>
                                                            <p className="mt-1 text-sm font-bold text-[#f6b100]">
                                                                + RD${Number(extra?.price || 0).toFixed(2)}
                                                            </p>
                                                            <p className="mt-1 text-[11px] text-gray-500">
                                                                Máximo {maximum}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    changeExtraQuantity(extra, -1)
                                                                }
                                                                disabled={selectedQty <= 0}
                                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white disabled:opacity-30"
                                                            >
                                                                <Minus size={16} />
                                                            </button>
                                                            <span className="min-w-6 text-center font-bold text-white">
                                                                {selectedQty}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    changeExtraQuantity(extra, 1)
                                                                }
                                                                disabled={selectedQty >= maximum}
                                                                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f6b100] text-black disabled:opacity-30"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )}

                                {getActiveRemovableIngredients(customizationDish).length > 0 && (
                                    <section>
                                        <div className="mb-3">
                                            <h4 className="font-semibold text-white">
                                                Retirar ingredientes
                                            </h4>
                                            <p className="text-xs text-gray-500">
                                                Marca únicamente lo que no debe incluirse.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {getActiveRemovableIngredients(customizationDish).map(
                                                (ingredient) => {
                                                    const ingredientId = getOptionId(
                                                        ingredient,
                                                        "ingredient"
                                                    );
                                                    const selected = removedIngredientIds.includes(
                                                        ingredientId
                                                    );

                                                    return (
                                                        <button
                                                            key={ingredientId}
                                                            type="button"
                                                            onClick={() =>
                                                                toggleRemovedIngredient(ingredient)
                                                            }
                                                            className={`rounded-xl border px-4 py-3 text-left transition ${
                                                                selected
                                                                    ? "border-red-500/40 bg-red-500/10 text-red-200"
                                                                    : "border-white/10 bg-black/20 text-gray-300"
                                                            }`}
                                                        >
                                                            <span className="text-sm font-semibold">
                                                                {selected ? "✓ " : ""}Sin {ingredient.name}
                                                            </span>
                                                        </button>
                                                    );
                                                }
                                            )}
                                        </div>
                                    </section>
                                )}

                                <section>
                                    <label className="mb-2 block text-sm font-semibold text-white">
                                        Nota para cocina (opcional)
                                    </label>
                                    <textarea
                                        value={customizationNote}
                                        onChange={(event) =>
                                            setCustomizationNote(event.target.value)
                                        }
                                        rows={3}
                                        placeholder="Ej: Salsa aparte, bien cocida..."
                                        className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#f6b100]/50"
                                    />
                                </section>
                            </div>

                            <div className="border-t border-white/10 bg-black/20 px-5 py-4">
                                {(() => {
                                    const baseUnitPrice = Number(
                                        customizationBasePrice ??
                                        customizationDish?.price ??
                                        0
                                    );
                                    const extrasUnitTotal = getActiveExtras(
                                        customizationDish
                                    ).reduce((sum, extra) => {
                                        const extraId = getOptionId(extra, "extra");
                                        const extraQty = Number(
                                            selectedExtraQty?.[extraId] || 0
                                        );
                                        return (
                                            sum +
                                            Number(extra?.price || 0) * extraQty
                                        );
                                    }, 0);
                                    const unitTotal = baseUnitPrice + extrasUnitTotal;
                                    const quantity = editingCartEntry
                                        ? Math.max(
                                            1,
                                            Number(
                                                editingCartEntry?.item?.quantity ??
                                                editingCartEntry?.item?.qty ??
                                                1
                                            ) || 1
                                        )
                                        : getQty(customizationDish._id);
                                    const finalTotal = unitTotal * quantity;

                                    return (
                                        <>
                                            <div className="mb-4 space-y-1 text-sm">
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Precio base</span>
                                                    <span>RD${baseUnitPrice.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Extras por unidad</span>
                                                    <span>RD${extrasUnitTotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-white">
                                                    <span>Total ({quantity} unidad{quantity !== 1 ? "es" : ""})</span>
                                                    <span className="text-[#f6b100]">
                                                        RD${finalTotal.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={closeCustomizationModal}
                                                    className="w-full rounded-xl border border-white/10 bg-[#1f1f1f] px-4 py-3 font-semibold text-gray-300"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={addCustomizedItem}
                                                    className="w-full rounded-xl bg-[#f6b100] px-4 py-3 font-bold text-black hover:bg-[#ffd633]"
                                                >
                                                    {editingCartEntry
                                                        ? "Guardar cambios"
                                                        : "Agregar al pedido"}
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                            baseUnitPrice: unitPrice,
                                            addonsUnitTotal: 0,
                                            unitPrice,
                                            price: Number((unitPrice * quantity).toFixed(2)),
                                            imageUrl: resolveImageUrl(customPriceDish.imageUrl),
                                            allowCustomPrice: true,
                                            productionArea: customPriceDish.productionArea || "kitchen",
                                            addons: [],
                                            modifiers: [],
                                            note: "",
                                        };

                                        item.cartKey = buildCartItemKey(item);
                                        item.lineId = item.cartKey;

                                        commitItemToCart(item);
                                        triggerAddFx(customPriceDish._id);
                                        resetQty(customPriceDish._id);
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
                                                        const justAdded = !!addedFxMap[dish._id];

                                                        return (
                                                            <motion.div
                                                                key={dish._id}
                                                                whileHover={{ y: -3 }}
                                                                className="bg-[#1a1a1a] rounded-xl p-4 border border-[#262626] hover:border-[#3a3a3a] transition-colors"
                                                            >
                                                                <div className="flex flex-col items-center text-center">
                                                                    <img
                                                                        src={resolveImageUrl(dish.imageUrl)}
                                                                        alt={dish.name}
                                                                        className="w-[96px] h-[96px] object-cover rounded-full mb-3 ring-1 ring-[#2b2b2b]"
                                                                        loading="lazy"
                                                                        onError={(e) => {
                                                                            e.currentTarget.onerror = null;
                                                                            e.currentTarget.src = "/placeholder.jpg";
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
                                                                    <div className="relative mt-3 w-full">
                                                                        <AnimatePresence>
                                                                            {justAdded && (
                                                                                <motion.div
                                                                                    initial={{ opacity: 0, y: 8, scale: 0.92 }}
                                                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                                                                    transition={{ duration: 0.25 }}
                                                                                    className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2"
                                                                                >
                                                                                    <span className="rounded-full border border-[#f6b100]/30 bg-[#f6b100]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f6b100]">
                                                                                        Agregado
                                                                                    </span>
                                                                                </motion.div>
                                                                            )}
                                                                        </AnimatePresence>

                                                                        <motion.button
                                                                            onClick={() => addToCart(dish)}
                                                                            disabled={!canAdd}
                                                                            whileTap={canAdd ? { scale: 0.97 } : {}}
                                                                            animate={
                                                                                justAdded
                                                                                    ? {
                                                                                        scale: [1, 1.06, 0.98, 1],
                                                                                        boxShadow: [
                                                                                            "0 0 0 rgba(246,177,0,0)",
                                                                                            "0 0 0 6px rgba(246,177,0,0.10)",
                                                                                            "0 0 0 rgba(246,177,0,0)",
                                                                                        ],
                                                                                    }
                                                                                    : {
                                                                                        scale: 1,
                                                                                        boxShadow: "0 0 0 rgba(246,177,0,0)",
                                                                                    }
                                                                            }
                                                                            transition={{ duration: 0.45, ease: "easeOut" }}
                                                                            className={`w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold transition-colors ${
                                                                                canAdd
                                                                                    ? "bg-[#025cca] hover:bg-[#0b6fe8] text-white"
                                                                                    : "bg-[#2a2a2a] text-[#777] cursor-not-allowed"
                                                                            }`}
                                                                        >
                                                                            <ShoppingCart size={18} />
                                                                            {justAdded ? "Agregado" : "Add"}
                                                                        </motion.button>
                                                                    </div>


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