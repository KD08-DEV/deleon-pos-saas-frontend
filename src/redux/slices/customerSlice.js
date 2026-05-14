import { createSlice } from "@reduxjs/toolkit";
const initialState = {
    // Draft context
    draftOrderId: "",
    orderId: "",

    customerId: null,

    // Nombre principal correcto
    customerName: "",
    customerPhone: "",
    customerAddress: "",

    // Alias para compatibilidad con componentes viejos
    name: "",
    phone: "",
    address: "",

    guests: 0,

    table: null,
    isVirtual: false,
    virtualType: null,
    orderSource: "DINE_IN",
};


const customerSlice = createSlice({
    name: "customer",
    initialState,
    reducers: {
        setCustomer: (state, action) => {
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
            state.customerId = action.payload?.customerId ?? null;

            state.customerName = String(name).trim();
            state.customerPhone = String(phone).trim();
            state.customerAddress = String(address).trim();

            // Alias para que draft?.name, draft?.phone y draft?.address funcionen
            state.name = state.customerName;
            state.phone = state.customerPhone;
            state.address = state.customerAddress;

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
            state.customerId = null;

            state.customerName = "";
            state.customerPhone = "";
            state.customerAddress = "";

            state.name = "";
            state.phone = "";
            state.address = "";

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