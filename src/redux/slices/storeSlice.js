import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    tenant: null
};

const storeSlice = createSlice({
    name: "store",
    initialState,
    reducers: {
        setTenant: (state, action) => {
            state.tenant = action.payload;
        },
        clearTenant: (state) => {
            state.tenant = null;
        }
    }
});

export const { setTenant, clearTenant } = storeSlice.actions;
export default storeSlice.reducer;
