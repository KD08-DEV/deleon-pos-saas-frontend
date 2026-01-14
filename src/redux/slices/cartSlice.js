import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const toNum = (v, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
};

// step por tipo
const stepFor = (qtyType) => (qtyType === "weight" ? 0.25 : 1);

const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        addItems: (state, action) => {
            const incoming = action.payload;
            // { id, name, price, quantity, imageUrl, qtyType, weightUnit }

            const id = incoming.id;
            const qtyType = incoming.qtyType || "unit";
            const qty = toNum(incoming.quantity, 1);

            // misma lógica, pero separa por qtyType por si acaso
            const idx = state.findIndex((it) => it.id === id && (it.qtyType || "unit") === qtyType);

            if (idx >= 0) {
                state[idx].quantity = clamp(toNum(state[idx].quantity, 0) + qty, 0, 9999);
            } else {
                state.push({
                    ...incoming,
                    qtyType,
                    quantity: clamp(qty, 0, 9999),
                    price: toNum(incoming.price, 0), // unitPrice o pricePerLb (funciona igual)
                });
            }
        },

        removeItem: (state, action) => state.filter((item) => item.id !== action.payload),

        removeAllItems: () => [],

        setCart: (_state, action) => (Array.isArray(action.payload) ? action.payload : []),

        setQuantity: (state, action) => {
            const { id, quantity } = action.payload;
            const idx = state.findIndex((it) => it.id === id);
            if (idx >= 0) {
                state[idx].quantity = clamp(toNum(quantity, 0), 0, 9999);
            }
            return state.filter((it) => toNum(it.quantity, 0) > 0);
        },

        decrementItem: (state, action) => {
            const id = action.payload;
            const idx = state.findIndex((it) => it.id === id);
            if (idx >= 0) {
                const step = stepFor(state[idx].qtyType || "unit");
                state[idx].quantity = clamp(toNum(state[idx].quantity, 0) - step, 0, 9999);
            }
            return state.filter((it) => toNum(it.quantity, 0) > 0);
        },
    },
});

export const getTotalPrice = (state) =>
    state.cart.reduce(
        (total, item) => total + toNum(item.price, 0) * toNum(item.quantity, 0),
        0
    );

export const getTotalItems = (state) =>
    state.cart.reduce((total, item) => total + toNum(item.quantity, 0), 0);

export const { addItems, removeItem, removeAllItems, setCart, setQuantity, decrementItem } =
    cartSlice.actions;

export default cartSlice.reducer;
