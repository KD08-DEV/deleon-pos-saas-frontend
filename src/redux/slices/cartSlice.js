import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        addItems: (state, action) => {
            const incoming = action.payload; // { id, name, price, quantity, imageUrl }
            const idx = state.findIndex((it) => it.id === incoming.id);
            if (idx >= 0) {
                const qty = Number(incoming.quantity || 1);
                state[idx].quantity = Math.min(99, Number(state[idx].quantity || 0) + qty);
            } else {
                state.push({
                    ...incoming,
                    quantity: Number(incoming.quantity || 1),
                    price: Number(incoming.price || 0),
                });
            }
        },

        removeItem: (state, action) => {
            return state.filter((item) => item.id !== action.payload);
        },

        removeAllItems: () => {
            return [];
        },

        setCart: (_state, action) => {
            return Array.isArray(action.payload) ? action.payload : [];
        },

        // Opcionales por si los necesitas
        setQuantity: (state, action) => {
            const { id, quantity } = action.payload;
            const idx = state.findIndex((it) => it.id === id);
            if (idx >= 0) {
                state[idx].quantity = Math.max(0, Math.min(99, Number(quantity || 0)));
            }
            return state.filter((it) => it.quantity > 0);
        },
        decrementItem: (state, action) => {
            const id = action.payload;
            const idx = state.findIndex((it) => it.id === id);
            if (idx >= 0) {
                state[idx].quantity = Math.max(0, (Number(state[idx].quantity || 0) - 1));
            }
            return state.filter((it) => it.quantity > 0);
        },
    },
});

// ✅ Selectores
export const getTotalPrice = (state) =>
    state.cart.reduce((total, item) => total + (Number(item.price || 0) * Number(item.quantity || 0)), 0);

export const getTotalItems = (state) =>
    state.cart.reduce((total, item) => total + Number(item.quantity || 0), 0);

export const { addItems, removeItem, removeAllItems, setCart, setQuantity, decrementItem } =
    cartSlice.actions;

export default cartSlice.reducer;
