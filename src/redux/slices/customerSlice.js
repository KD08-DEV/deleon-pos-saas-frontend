import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // Draft context (NO es el orderId de backend)
    draftOrderId: "",
    customerId: null,
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    guests: 0,

    table: null,
    isVirtual: false,
    virtualType: null,      // QUICK / PEDIDOSYA / UBEREATS / DELIVERY
    orderSource: "DINE_IN", // DINE_IN / TAKEOUT / PEDIDOSYA / UBEREATS / DELIVERY / QUICK
};


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
        setDraftContext: (state, action) => {
            state.table = action.payload?.table ?? null;
            state.isVirtual = !!action.payload?.isVirtual;
            state.virtualType = action.payload?.virtualType ?? null;
            state.orderSource = action.payload?.orderSource ?? "DINE_IN";
        },

        clearDraftContext: (state) => {
            state.draftOrderId = "";
            state.table = null;
            state.isVirtual = false;
            state.virtualType = null;
            state.orderSource = "DINE_IN";
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

export const { setCustomer, removeCustomer, updateTable, setDraftContext, clearDraftContext } = customerSlice.actions;
export default customerSlice.reducer;