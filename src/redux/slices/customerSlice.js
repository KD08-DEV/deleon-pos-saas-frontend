import {
    createSlice,
} from "@reduxjs/toolkit";


// ======================================================
// NORMALIZAR TAX IDENTITY PARA REDUX
// ======================================================

const normalizeTaxIdentity = (
    raw,
    legacyValue = ""
) => {

    // ==============================================
    // FORMATO NUEVO
    // ==============================================

    if (
        raw &&
        typeof raw ===
        "object"
    ) {
        const value =
            String(
                raw?.value ||
                ""
            ).trim();

        if (value) {
            const type =
                String(
                    raw?.type ||
                    "TAX_ID"
                )
                    .trim()
                    .toUpperCase();

            return {
                countryCode:
                    String(
                        raw?.countryCode ||
                        ""
                    )
                        .trim()
                        .toUpperCase(),

                type,

                label:
                    String(
                        raw?.label ||
                        type
                    ).trim(),

                value,
            };
        }
    }


    // ==============================================
    // COMPATIBILIDAD RNC LEGACY
    // ==============================================

    const legacy =
        String(
            legacyValue || ""
        ).trim();

    if (legacy) {
        return {
            countryCode:
                "DO",

            type:
                "RNC",

            label:
                "RNC",

            value:
            legacy,
        };
    }


    return null;
};


// ======================================================
// INITIAL STATE
// ======================================================

const initialState = {

    // Draft context
    draftOrderId:
        "",

    orderId:
        "",

    customerId:
        null,


    // ==============================================
    // DATOS PRINCIPALES
    // ==============================================

    customerName:
        "",

    customerPhone:
        "",

    customerAddress:
        "",


    // ==============================================
    // IDENTIDAD FISCAL NUEVA
    // ==============================================

    customerTaxIdentity:
        null,


    // ==============================================
    // ALIASES DE COMPATIBILIDAD
    // ==============================================

    name:
        "",

    phone:
        "",

    address:
        "",

    taxIdentity:
        null,


    /*
     * Legacy RD temporal.
     *
     * Se mantienen porque Menu.jsx y posiblemente
     * otros componentes todavía los utilizan.
     */
    rnc:
        "",

    rncCedula:
        "",


    guests:
        0,

    table:
        null,

    isVirtual:
        false,

    virtualType:
        null,

    orderSource:
        "DINE_IN",
};


// ======================================================
// SLICE
// ======================================================

const customerSlice =
    createSlice({
        name:
            "customer",

        initialState,

        reducers: {

            // ==========================================
            // SET CUSTOMER
            // ==========================================

            setCustomer: (
                state,
                action
            ) => {

                const payload =
                    action.payload ||
                    {};


                const name =
                    payload?.name ??
                    payload?.customerName ??
                    "";


                const phone =
                    payload?.phone ??
                    payload?.customerPhone ??
                    "";


                const address =
                    payload?.address ??
                    payload?.customerAddress ??
                    "";


                const guests =
                    Number(
                        payload?.guests ??
                        0
                    );


                // ======================================
                // LEGACY
                // ======================================

                const legacyTaxValue =
                    payload?.rncCedula ||
                    payload?.rnc ||
                    "";


                // ======================================
                // TAX IDENTITY
                // ======================================

                const taxIdentity =
                    normalizeTaxIdentity(
                        payload
                            ?.taxIdentity ??
                        payload
                            ?.customerTaxIdentity,

                        legacyTaxValue
                    );


                state.orderId =
                    `${Date.now()}`;


                state.customerId =
                    payload
                        ?.customerId ??
                    null;


                // ======================================
                // DATOS
                // ======================================

                state.customerName =
                    String(
                        name
                    ).trim();


                state.customerPhone =
                    String(
                        phone
                    ).trim();


                state.customerAddress =
                    String(
                        address
                    ).trim();


                state.customerTaxIdentity =
                    taxIdentity;


                // ======================================
                // ALIASES
                // ======================================

                state.name =
                    state.customerName;

                state.phone =
                    state.customerPhone;

                state.address =
                    state.customerAddress;

                state.taxIdentity =
                    taxIdentity;


                // ======================================
                // COMPATIBILIDAD RNC
                // ======================================

                const isDominicanRnc =
                    taxIdentity
                        ?.countryCode ===
                    "DO" &&

                    taxIdentity
                        ?.type ===
                    "RNC";


                const legacyRnc =
                    isDominicanRnc
                        ? String(
                            taxIdentity
                                ?.value ||
                            ""
                        ).trim()
                        : "";


                state.rnc =
                    legacyRnc;

                state.rncCedula =
                    legacyRnc;


                state.guests =
                    guests;
            },


            // ==========================================
            // DRAFT CONTEXT
            // ==========================================

            setDraftContext: (
                state,
                action
            ) => {
                state.table =
                    action.payload
                        ?.table ??
                    null;

                state.isVirtual =
                    !!action.payload
                        ?.isVirtual;

                state.virtualType =
                    action.payload
                        ?.virtualType ??
                    null;

                state.orderSource =
                    action.payload
                        ?.orderSource ??
                    "DINE_IN";
            },


            // ==========================================
            // CLEAR DRAFT CONTEXT
            // ==========================================

            clearDraftContext: (
                state
            ) => {
                state.draftOrderId =
                    "";

                state.table =
                    null;

                state.isVirtual =
                    false;

                state.virtualType =
                    null;

                state.orderSource =
                    "DINE_IN";
            },


            // ==========================================
            // REMOVE CUSTOMER
            // ==========================================

            removeCustomer: (
                state
            ) => {
                state.orderId =
                    "";

                state.customerId =
                    null;


                state.customerName =
                    "";

                state.customerPhone =
                    "";

                state.customerAddress =
                    "";

                state.customerTaxIdentity =
                    null;


                state.name =
                    "";

                state.phone =
                    "";

                state.address =
                    "";

                state.taxIdentity =
                    null;


                state.rnc =
                    "";

                state.rncCedula =
                    "";


                state.guests =
                    0;

                state.table =
                    null;
            },


            // ==========================================
            // TABLE
            // ==========================================

            updateTable: (
                state,
                action
            ) => {
                state.table =
                    action
                        .payload
                        .table;
            },
        },
    });


// ======================================================
// EXPORTS
// ======================================================

export const {
    setCustomer,
    removeCustomer,
    updateTable,
    setDraftContext,
    clearDraftContext,
} =
    customerSlice.actions;


export default
customerSlice.reducer;