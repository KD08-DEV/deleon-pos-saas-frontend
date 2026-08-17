import React, {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    AnimatePresence,
    motion,
} from "framer-motion";

import { RiDeleteBin2Fill } from "react-icons/ri";
import { FaNotesMedical } from "react-icons/fa6";
import { FiEdit3 } from "react-icons/fi";

import {
    useDispatch,
    useSelector,
} from "react-redux";

import { setCart } from "../../redux/slices/cartSlice";

const num = (value) => {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
};

const money = (value) => {
    return `RD$${num(value).toFixed(2)}`;
};

const getItemKey = (item, index) => {
    return String(
        item?.cartKey ||
        item?.lineId ||
        [
            item?.id ||
            item?._id ||
            item?.dishId ||
            item?.dish ||
            item?.name ||
            "item",

            item?.qtyType ||
            "unit",

            item?.weightUnit ||
            "",

            index,
        ].join("__")
    );
};

const getItemSignature = (item) => {
    return JSON.stringify({
        quantity: num(item?.quantity),
        price: num(item?.price),
        unitPrice: num(item?.unitPrice),
        note: String(item?.note || ""),
        addons: item?.addons || [],
        modifiers: item?.modifiers || [],
    });
};

const getUnitPrice = (item) => {
    const quantity = Math.max(
        num(item?.quantity),
        1
    );

    return num(
        item?.unitPrice ??
        item?.pricePerQuantity ??
        item?.pricePerLb ??
        item?.pricePerLB ??
        (
            quantity > 0
                ? num(item?.price) /
                quantity
                : 0
        )
    );
};

const recalcItem = (
    item,
    nextQuantity
) => {
    const quantity =
        Number(nextQuantity);

    const unitPrice =
        getUnitPrice(item);

    return {
        ...item,
        quantity,
        qty: quantity,
        unitPrice,

        price: Number(
            (
                unitPrice *
                quantity
            ).toFixed(2)
        ),
    };
};

const getAddonName = (addon) => {
    return String(
        addon?.name ||
        addon?.label ||
        addon?.title ||
        "Extra"
    ).trim();
};

const getAddonQuantity = (addon) => {
    return Math.max(
        1,
        num(
            addon?.quantity ??
            addon?.qty ??
            1
        )
    );
};

const getAddonUnitPrice = (addon) => {
    return num(
        addon?.unitPrice ??
        addon?.price ??
        addon?.amount ??
        0
    );
};

const getModifierName = (
    modifier
) => {
    return String(
        modifier?.name ||
        modifier?.label ||
        modifier?.title ||
        "Ingrediente"
    ).trim();
};

const normalizeRemoveLabel = (
    value
) => {
    const name = String(
        value || ""
    ).trim();

    if (!name) {
        return "";
    }

    if (/^sin\s+/i.test(name)) {
        return name;
    }

    return `Sin ${name}`;
};

const CartInfo = ({ onEditItem }) => {
    const rawCart = useSelector(
        (state) => state.cart
    );

    const cartData =
        Array.isArray(rawCart)
            ? rawCart
            : [];

    const dispatch = useDispatch();

    const scrollRef = useRef(null);

    const previousSnapshotRef =
        useRef({});

    const highlightTimeoutRef =
        useRef(null);

    const [
        highlightedKey,
        setHighlightedKey,
    ] = useState(null);

    useEffect(() => {
        if (!scrollRef.current) {
            return;
        }

        scrollRef.current.scrollTo({
            top:
            scrollRef.current
                .scrollHeight,

            behavior: "smooth",
        });
    }, [cartData]);

    useEffect(() => {
        const nextSnapshot = {};
        let changedKey = null;

        cartData.forEach(
            (item, index) => {
                const key =
                    getItemKey(
                        item,
                        index
                    );

                const signature =
                    getItemSignature(
                        item
                    );

                nextSnapshot[key] =
                    signature;

                if (
                    !(
                        key in
                        previousSnapshotRef.current
                    ) ||
                    previousSnapshotRef
                        .current[key] !==
                    signature
                ) {
                    changedKey = key;
                }
            }
        );

        previousSnapshotRef.current =
            nextSnapshot;

        if (!changedKey) {
            return;
        }

        setHighlightedKey(
            changedKey
        );

        if (
            highlightTimeoutRef.current
        ) {
            clearTimeout(
                highlightTimeoutRef.current
            );
        }

        highlightTimeoutRef.current =
            setTimeout(() => {
                setHighlightedKey(null);
            }, 900);
    }, [cartData]);

    useEffect(() => {
        return () => {
            if (
                highlightTimeoutRef.current
            ) {
                clearTimeout(
                    highlightTimeoutRef.current
                );
            }
        };
    }, []);

    const updateQuantityAt = (
        index,
        difference
    ) => {
        const item =
            cartData[index];

        if (!item) {
            return;
        }

        const currentQuantity =
            num(
                item?.quantity || 1
            );

        const step =
            item?.qtyType === "weight"
                ? 0.25
                : 1;

        const nextQuantity =
            currentQuantity +
            difference * step;

        const nextCart = [
            ...cartData,
        ];

        if (nextQuantity <= 0) {
            nextCart.splice(
                index,
                1
            );
        } else {
            nextCart[index] =
                recalcItem(
                    item,
                    nextQuantity
                );
        }

        dispatch(
            setCart(nextCart)
        );
    };

    return (
        <div className="px-4 py-2">
            <h1 className="text-lg text-[#e4e4e4] font-semibold tracking-wide">
                Order Details
            </h1>

            <div
                className="mt-4 overflow-y-auto scrollbar-hide"
                ref={scrollRef}
            >
                {cartData.length === 0 ? (
                    <p className="text-[#ababab] text-sm flex justify-center items-center py-12">
                        Tu carrito está vacío. Empieza a añadir.
                    </p>
                ) : (
                    <AnimatePresence
                        initial={false}
                    >
                        {cartData.map(
                            (
                                item,
                                index
                            ) => {
                                const itemKey =
                                    getItemKey(
                                        item,
                                        index
                                    );

                                const isHighlighted =
                                    highlightedKey ===
                                    itemKey;

                                const addons =
                                    Array.isArray(
                                        item?.addons
                                    )
                                        ? item.addons
                                        : [];

                                const modifiers =
                                    Array.isArray(
                                        item?.modifiers
                                    )
                                        ? item.modifiers
                                        : [];

                                const addonsPerUnit =
                                    addons.reduce(
                                        (
                                            total,
                                            addon
                                        ) => {
                                            return (
                                                total +
                                                getAddonUnitPrice(
                                                    addon
                                                ) *
                                                getAddonQuantity(
                                                    addon
                                                )
                                            );
                                        },
                                        0
                                    );

                                const baseUnitPrice =
                                    Math.max(
                                        getUnitPrice(
                                            item
                                        ) -
                                        addonsPerUnit,
                                        0
                                    );

                                return (
                                    <motion.div
                                        key={
                                            itemKey
                                        }
                                        layout
                                        initial={{
                                            opacity: 0,
                                            y: 18,
                                            scale: 0.96,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            scale: 1,

                                            boxShadow:
                                                isHighlighted
                                                    ? "0 0 0 1px rgba(246,177,0,0.35), 0 12px 30px rgba(246,177,0,0.12)"
                                                    : "0 0 0 1px rgba(255,255,255,0.02)",
                                        }}
                                        exit={{
                                            opacity: 0,
                                            x: 24,
                                            scale: 0.96,
                                        }}
                                        transition={{
                                            duration: 0.28,
                                            ease: "easeOut",

                                            layout: {
                                                duration: 0.2,
                                            },
                                        }}
                                        className={`relative rounded-lg px-4 py-4 mb-2 border overflow-hidden ${
                                            isHighlighted
                                                ? "bg-gradient-to-r from-[#1f1f1f] via-[#242018] to-[#1f1f1f] border-[#f6b100]/40"
                                                : "bg-[#1f1f1f] border-white/5"
                                        }`}
                                    >
                                        {isHighlighted && (
                                            <span className="absolute right-3 top-3 rounded-full border border-[#f6b100]/30 bg-[#f6b100]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f6b100]">
                                                Agregado
                                            </span>
                                        )}

                                        <div className="flex items-start justify-between gap-3 pr-16">
                                            <h2 className="text-[#f5f5f5] font-semibold tracking-wide text-md">
                                                {item?.name ||
                                                    "Producto"}
                                            </h2>

                                            <p className="text-[#ababab] font-semibold whitespace-nowrap">
                                                {item?.qtyType ===
                                                "weight"
                                                    ? `${num(
                                                        item?.quantity
                                                    )} ${
                                                        item?.weightUnit ||
                                                        "lb"
                                                    }`
                                                    : `x${num(
                                                        item?.quantity ||
                                                        1
                                                    )}`}
                                            </p>
                                        </div>

                                        {addons.length >
                                            0 && (
                                                <div className="mt-3 space-y-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-2.5">
                                                    {addons.map(
                                                        (
                                                            addon,
                                                            addonIndex
                                                        ) => {
                                                            const quantity =
                                                                getAddonQuantity(
                                                                    addon
                                                                );

                                                            const unitPrice =
                                                                getAddonUnitPrice(
                                                                    addon
                                                                );

                                                            const total =
                                                                unitPrice *
                                                                quantity;

                                                            return (
                                                                <div
                                                                    key={
                                                                        addon?._id ||
                                                                        addon?.extraId ||
                                                                        addon?.extraDishId ||
                                                                        `${getAddonName(
                                                                            addon
                                                                        )}-${addonIndex}`
                                                                    }
                                                                    className="flex items-start justify-between gap-3 text-xs"
                                                                >
                                                                <span className="text-emerald-300">
                                                                    +{" "}
                                                                    {getAddonName(
                                                                        addon
                                                                    )}
                                                                    {quantity >
                                                                    1
                                                                        ? ` x${quantity}`
                                                                        : ""}
                                                                </span>

                                                                    <span className="text-emerald-200 whitespace-nowrap">
                                                                    {money(
                                                                        total
                                                                    )}
                                                                </span>
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            )}

                                        {modifiers.length >
                                            0 && (
                                                <div className="mt-2 space-y-1">
                                                    {modifiers.map(
                                                        (
                                                            modifier,
                                                            modifierIndex
                                                        ) => {
                                                            return (
                                                                <p
                                                                    key={
                                                                        modifier?._id ||
                                                                        modifier?.ingredientId ||
                                                                        modifier?.ingredientDishId ||
                                                                        `${getModifierName(
                                                                            modifier
                                                                        )}-${modifierIndex}`
                                                                    }
                                                                    className="text-xs text-red-300"
                                                                >
                                                                    −{" "}
                                                                    {normalizeRemoveLabel(
                                                                        getModifierName(
                                                                            modifier
                                                                        )
                                                                    )}
                                                                </p>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            )}

                                        {String(
                                            item?.note ||
                                            ""
                                        ).trim() && (
                                            <p className="mt-2 text-xs text-[#f6b100]">
                                                Nota:{" "}
                                                {String(
                                                    item.note
                                                ).trim()}
                                            </p>
                                        )}

                                        {(addons.length >
                                            0 ||
                                            modifiers.length >
                                            0) && (
                                            <div className="mt-3 border-t border-white/5 pt-2 text-[11px] text-[#8e8e8e] space-y-1">
                                                <div className="flex justify-between gap-3">
                                                    <span>
                                                        Precio
                                                        base
                                                    </span>

                                                    <span>
                                                        {money(
                                                            baseUnitPrice
                                                        )}
                                                    </span>
                                                </div>

                                                {addonsPerUnit >
                                                    0 && (
                                                        <div className="flex justify-between gap-3">
                                                        <span>
                                                            Extras
                                                            por
                                                            unidad
                                                        </span>

                                                            <span>
                                                            {money(
                                                                addonsPerUnit
                                                            )}
                                                        </span>
                                                        </div>
                                                    )}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQuantityAt(
                                                            index,
                                                            -1
                                                        )
                                                    }
                                                    className="text-[#ababab] hover:text-red-400 transition-colors"
                                                    title="Quitar una unidad"
                                                >
                                                    <RiDeleteBin2Fill
                                                        size={
                                                            20
                                                        }
                                                    />
                                                </button>
                                                {item?.qtyType !== "weight" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (typeof onEditItem === "function") {
                                                                onEditItem(item, index);
                                                            }
                                                        }}
                                                        className="text-[#ababab] hover:text-[#f6b100] transition-colors"
                                                        title="Editar personalización"
                                                        aria-label={`Editar ${item?.name || "producto"}`}
                                                    >
                                                        <FiEdit3 size={20} />
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQuantityAt(
                                                            index,
                                                            1
                                                        )
                                                    }
                                                    className="text-[#ababab] hover:text-[#f6b100] transition-colors"
                                                    title="Agregar una unidad"
                                                >
                                                    <FaNotesMedical
                                                        size={
                                                            20
                                                        }
                                                    />
                                                </button>
                                            </div>

                                            <p className="text-[#f5f5f5] text-md font-bold">
                                                {money(
                                                    item?.price
                                                )}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            }
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default CartInfo;