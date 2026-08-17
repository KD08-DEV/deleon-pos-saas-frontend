import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const toNum = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const stepFor = (qtyType) => {
    return qtyType === "weight" ? 0.25 : 1;
};

const normalizeText = (value) => {
    return String(value ?? "")
        .trim()
        .toLowerCase();
};

const getProductId = (item) => {
    return (
        item?.dishId ??
        item?.dish ??
        item?.productId ??
        item?.menuItemId ??
        item?.itemId ??
        item?.id ??
        item?._id ??
        ""
    );
};

const normalizeAddon = (addon = {}) => {
    return {
        id: String(
            addon?.extraId ??
            addon?.extraDishId ??
            addon?.dishId ??
            addon?._id ??
            ""
        ),

        name: normalizeText(
            addon?.name ??
            addon?.label ??
            addon?.title ??
            ""
        ),

        quantity: Math.max(
            1,
            toNum(addon?.quantity ?? addon?.qty, 1)
        ),

        unitPrice: Number(
            toNum(
                addon?.unitPrice ??
                addon?.price ??
                addon?.amount,
                0
            ).toFixed(2)
        ),

        type: normalizeText(addon?.type || "extra"),
    };
};

const normalizeModifier = (modifier = {}) => {
    return {
        id: String(
            modifier?.ingredientId ??
            modifier?.ingredientDishId ??
            modifier?.dishId ??
            modifier?._id ??
            ""
        ),

        name: normalizeText(
            modifier?.name ??
            modifier?.label ??
            modifier?.title ??
            ""
        ),

        type: normalizeText(modifier?.type || "remove"),
    };
};

const stableSort = (items = []) => {
    return [...items].sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b))
    );
};

export const buildCustomizationSignature = (item = {}) => {
    const addonsSource =
        item?.addons ??
        item?.addOns ??
        item?.extras ??
        item?.extraIngredients ??
        item?.selectedExtras ??
        [];

    const modifiersSource =
        item?.modifiers ??
        item?.selectedOptions ??
        item?.options ??
        [];

    const addons = Array.isArray(addonsSource)
        ? stableSort(addonsSource.map(normalizeAddon))
        : [];

    const modifiers = Array.isArray(modifiersSource)
        ? stableSort(modifiersSource.map(normalizeModifier))
        : [];

    return JSON.stringify({
        note: normalizeText(
            item?.note ??
            item?.comment ??
            item?.specialInstructions ??
            ""
        ),

        addons,
        modifiers,
    });
};

export const buildCartKey = (item = {}) => {
    if (item?.cartKey) {
        return String(item.cartKey);
    }

    if (item?.lineId) {
        return String(item.lineId);
    }

    const productId = getProductId(item);
    const qtyType = String(item?.qtyType || "unit");

    const weightUnit =
        qtyType === "weight"
            ? String(item?.weightUnit || "lb")
            : "";

    return [
        String(
            productId ||
            normalizeText(item?.name || "item")
        ),
        qtyType,
        weightUnit,
        buildCustomizationSignature(item),
    ].join("::");
};
export const buildCartItemKey = buildCartKey;
const getItemKey = (item) => {
    return String(
        item?.cartKey ||
        item?.lineId ||
        buildCartKey(item)
    );
};

const calculateLineTotal = (item) => {
    const quantity = clamp(
        toNum(item?.quantity, 0),
        0,
        9999
    );

    const unitPrice = toNum(item?.unitPrice, 0);

    item.quantity = quantity;
    item.qty = quantity;
    item.unitPrice = Number(unitPrice.toFixed(2));

    item.price = Number(
        (unitPrice * quantity).toFixed(2)
    );
};

const resolveActionKey = (payload) => {
    if (payload && typeof payload === "object") {
        return String(
            payload?.cartKey ??
            payload?.lineId ??
            payload?.key ??
            ""
        );
    }

    return String(payload ?? "");
};

const resolveActionId = (payload) => {
    if (payload && typeof payload === "object") {
        return String(
            payload?.id ??
            payload?.dishId ??
            payload?.dish ??
            ""
        );
    }

    return String(payload ?? "");
};

const findItemIndex = (state, payload) => {
    const actionKey = resolveActionKey(payload);

    if (actionKey) {
        const keyIndex = state.findIndex(
            (item) => getItemKey(item) === actionKey
        );

        if (keyIndex >= 0) {
            return keyIndex;
        }
    }

    const actionId = resolveActionId(payload);

    return state.findIndex((item) => {
        const itemId = String(
            item?.id ??
            item?.dishId ??
            item?.dish ??
            ""
        );

        return itemId === actionId;
    });
};

const cartSlice = createSlice({
    name: "cart",
    initialState,

    reducers: {
        addItems: (state, action) => {
            const incomingRaw = action.payload || {};

            const qtyType =
                incomingRaw.qtyType || "unit";

            const quantity = clamp(
                toNum(incomingRaw.quantity, 1),
                0,
                9999
            );

            const cartKey = buildCartKey({
                ...incomingRaw,
                qtyType,
            });

            const incoming = {
                ...incomingRaw,

                cartKey,
                lineId:
                    incomingRaw.lineId ||
                    cartKey,

                qtyType,
                quantity,
                qty: quantity,

                unitPrice: Number(
                    toNum(
                        incomingRaw.unitPrice,
                        0
                    ).toFixed(2)
                ),

                addons: Array.isArray(
                    incomingRaw.addons
                )
                    ? incomingRaw.addons
                    : [],

                modifiers: Array.isArray(
                    incomingRaw.modifiers
                )
                    ? incomingRaw.modifiers
                    : [],

                note: String(
                    incomingRaw.note || ""
                ).trim(),
            };

            const index = state.findIndex(
                (item) =>
                    getItemKey(item) === cartKey
            );

            // Misma preparación: aumentar cantidad.
            if (index >= 0) {
                state[index].quantity = clamp(
                    toNum(
                        state[index].quantity,
                        0
                    ) + quantity,
                    0,
                    9999
                );

                state[index].qty =
                    state[index].quantity;

                state[index].unitPrice =
                    incoming.unitPrice;

                state[index].weightUnit =
                    incoming.weightUnit ??
                    state[index].weightUnit;

                state[index].addons =
                    incoming.addons;

                state[index].modifiers =
                    incoming.modifiers;

                state[index].note =
                    incoming.note;

                state[index].cartKey =
                    cartKey;

                state[index].lineId =
                    cartKey;

                calculateLineTotal(
                    state[index]
                );

                return;
            }

            // Preparación diferente: crear otra línea.
            calculateLineTotal(incoming);
            state.push(incoming);
        },

        removeItem: (state, action) => {
            const payload = action.payload;
            const actionKey =
                resolveActionKey(payload);

            if (actionKey) {
                return state.filter(
                    (item) =>
                        getItemKey(item) !==
                        actionKey
                );
            }

            const actionId =
                resolveActionId(payload);

            // Compatibilidad con código antiguo.
            return state.filter((item) => {
                const itemId = String(
                    item?.id ??
                    item?.dishId ??
                    item?.dish ??
                    ""
                );

                return itemId !== actionId;
            });
        },

        removeAllItems: () => {
            return [];
        },

        setCart: (_state, action) => {
            if (!Array.isArray(action.payload)) {
                return [];
            }

            return action.payload.map((item) => {
                const cartKey =
                    getItemKey(item);

                const normalized = {
                    ...item,

                    cartKey,

                    lineId:
                        item?.lineId ||
                        cartKey,

                    addons: Array.isArray(
                        item?.addons
                    )
                        ? item.addons
                        : [],

                    modifiers: Array.isArray(
                        item?.modifiers
                    )
                        ? item.modifiers
                        : [],

                    note: String(
                        item?.note || ""
                    ).trim(),
                };

                calculateLineTotal(normalized);

                return normalized;
            });
        },

        setQuantity: (state, action) => {
            const payload =
                action.payload || {};

            const index =
                findItemIndex(
                    state,
                    payload
                );

            if (index >= 0) {
                state[index].quantity = clamp(
                    toNum(
                        payload.quantity,
                        0
                    ),
                    0,
                    9999
                );

                calculateLineTotal(
                    state[index]
                );
            }

            return state.filter(
                (item) =>
                    toNum(
                        item.quantity,
                        0
                    ) > 0
            );
        },

        decrementItem: (state, action) => {
            const index =
                findItemIndex(
                    state,
                    action.payload
                );

            if (index >= 0) {
                const step = stepFor(
                    state[index].qtyType ||
                    "unit"
                );

                state[index].quantity =
                    clamp(
                        toNum(
                            state[index]
                                .quantity,
                            0
                        ) - step,
                        0,
                        9999
                    );

                calculateLineTotal(
                    state[index]
                );
            }

            return state.filter(
                (item) =>
                    toNum(
                        item.quantity,
                        0
                    ) > 0
            );
        },

        incrementItem: (state, action) => {
            const index =
                findItemIndex(
                    state,
                    action.payload
                );

            if (index >= 0) {
                const step = stepFor(
                    state[index].qtyType ||
                    "unit"
                );

                state[index].quantity =
                    clamp(
                        toNum(
                            state[index]
                                .quantity,
                            0
                        ) + step,
                        0,
                        9999
                    );

                calculateLineTotal(
                    state[index]
                );
            }
        },
    },
});

export const getTotalPrice = (state) => {
    return state.cart.reduce(
        (total, item) =>
            total +
            toNum(item.price, 0),
        0
    );
};

export const getTotalItems = (state) => {
    return state.cart.reduce(
        (total, item) =>
            total +
            toNum(item.quantity, 0),
        0
    );
};

export const {
    addItems,
    removeItem,
    removeAllItems,
    setCart,
    setQuantity,
    decrementItem,
    incrementItem,
} = cartSlice.actions;

export default cartSlice.reducer;