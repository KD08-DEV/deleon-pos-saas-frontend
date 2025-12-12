import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    userData: null,    // <-- Aquí vive TODO el usuario
    isAuth: false,
};

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.userData = action.payload; // guardamos todo el objeto
            state.isAuth = true;
        },

        removeUser: (state) => {
            state.userData = null;
            state.isAuth = false;
        },
    },
});

export const { setUser, removeUser } = userSlice.actions;
export default userSlice.reducer;
