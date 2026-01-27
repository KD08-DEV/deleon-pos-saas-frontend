import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    orderId: "",
    customerId: null,        // NUEVO
    customerName: "",
    customerPhone: "",
    customerAddress: "",     // NUEVO
    guests: 0,
    table: null
}


const customerSlice = createSlice({
    name: "customer",
    initialState,
    reducers: {
        setCustomer: (state, action) => {
            // Compatibilidad: soporta name/phone y customerName/customerPhone
            const name =
                action.payload?.name ??
                action.payload?.customerName ??
                "";

            const phone =
                action.payload?.phone ??
                action.payload?.customerPhone ??
                "";

            const address =
                action.payload?.address ??
                action.payload?.customerAddress ??
                "";

            const guests = Number(action.payload?.guests ?? 0);

            state.orderId = `${Date.now()}`;
            state.customerId = action.payload?.customerId ?? null; // NUEVO
            state.customerName = String(name).trim();
            state.customerPhone = String(phone).trim();
            state.customerAddress = String(address).trim();        // NUEVO
            state.guests = guests;
        },

        removeCustomer: (state) => {
            state.orderId = "";
            state.customerId = null;       // NUEVO
            state.customerName = "";
            state.customerPhone = "";
            state.customerAddress = "";    // NUEVO
            state.guests = 0;
            state.table = null;
        },

        updateTable: (state, action) => {
            state.table = action.payload.table;
        },
    },
});

export const { setCustomer, removeCustomer, updateTable } = customerSlice.actions;
export default customerSlice.reducer;