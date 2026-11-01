import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomNav from "../components/shared/BottomNav";
import { MdRestaurantMenu } from "react-icons/md";
import MenuContainer from "../components/menu/MenuContainer";
import CustomerInfo from "../components/menu/CustomerInfo";
import CartInfo from "../components/menu/CartInfo";
import Bill from "../components/menu/Bill";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrderById, updateOrder, addOrder, updateTable } from "@https";
import { setCart, removeAllItems } from "../redux/slices/cartSlice";
import { useDispatch, useSelector } from "react-redux";
import { clearDraftContext } from "../redux/slices/customerSlice";
import { AnimatePresence, motion } from "framer-motion";
import { enqueueSnackbar } from "notistack";
import { useTranslation } from "react-i18next";

import {
    buildDisplayItems,
    clearCustomerDisplay,
    openCustomerDisplayWindow,
    publishCustomerDisplayPatch,
} from "../lib/customerDisplaySync";

import useTenant from "../hooks/useTenant";

import {
    formatMoney,
    getDefaultWeightUnit,
    getTenantLocalization,
} from "../lib/localization";


const TABLES_ROUTE = "/tables";


const num = (value) => {
    if (
        value === null ||
        value === undefined
    ) {
        return 0;
    }

    const n =
        Number(
            String(value).replace(
                /[^\d.-]/g,
                ""
            )
        );

    return Number.isFinite(n)
        ? n
        : 0;
};


// ======================================================
// TAX IDENTITY DEL CLIENTE
// ======================================================

const normalizeOrderCustomerTaxIdentity = (
    raw,
    legacyValue = ""
) => {
    if (
        raw &&
        typeof raw === "object"
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


    const legacy =
        String(
            legacyValue ||
            ""
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
// COMPATIBILIDAD DGII
// ======================================================

const getOrderLegacyTaxValue = (
    taxIdentity
) => {
    if (
        !taxIdentity ||
        String(
            taxIdentity
                ?.countryCode ||
            ""
        ).toUpperCase() !==
        "DO"
    ) {
        return "";
    }


    const type =
        String(
            taxIdentity?.type ||
            ""
        ).toUpperCase();


    if (
        ![
            "RNC",
            "CEDULA",
            "CÉDULA",
            "RNC_CEDULA",
        ].includes(
            type
        )
    ) {
        return "";
    }


    return String(
        taxIdentity
            ?.value ||
        ""
    ).trim();
};


const getTableIdFromAny = (
    value
) => {
    if (!value) {
        return null;
    }

    if (
        typeof value ===
        "string"
    ) {
        return value;
    }

    return (
        value?._id ||
        value?.id ||
        value?.tableId ||
        null
    );
};


const getCartItemsArray = (
    cart
) => {
    if (
        Array.isArray(
            cart
        )
    ) {
        return cart;
    }

    if (
        Array.isArray(
            cart?.items
        )
    ) {
        return cart.items;
    }

    return [];
};


const normalizeItemsForOrder = (
    items = [],
    defaultWeightUnit = "lb"
) => {
    return items
        .map(
            (
                it
            ) => {
                const quantity =
                    num(
                        it?.quantity ??
                        it?.qty ??
                        1
                    );


                const unitPrice =
                    num(
                        it?.unitPrice ??
                        it?.pricePerQuantity ??
                        it?.pricePerLb ??
                        it?.price ??
                        0
                    );


                const lineTotal =
                    num(
                        it?.price ??
                        unitPrice *
                        quantity
                    );


                const dishId =
                    it?.dishId ||
                    it?.dish?._id ||
                    it?.dish ||
                    it?.id ||
                    it?._id ||
                    null;


                return {
                    dishId,

                    lineId:
                        it?.lineId ||
                        null,

                    /*
                     * Fallback interno.
                     * No lo usamos como texto general de UI.
                     */
                    name:
                        String(
                            it?.name ||
                            it?.dishName ||
                            it?.itemName ||
                            "Producto"
                        ).trim(),

                    qtyType:
                        it?.qtyType ||
                        "unit",

                    weightUnit:
                        it?.qtyType ===
                        "weight"
                            ? (
                                it?.weightUnit ||
                                defaultWeightUnit
                            )
                            : "",

                    quantity,

                    unitPrice,

                    price:
                        Number(
                            lineTotal.toFixed(
                                2
                            )
                        ),

                    productionArea:
                        it?.productionArea ||
                        "kitchen",

                    note:
                        it?.note ||
                        "",

                    addons:
                        Array.isArray(
                            it?.addons
                        )
                            ? it.addons
                            : [],

                    modifiers:
                        Array.isArray(
                            it?.modifiers
                        )
                            ? it.modifiers
                            : [],

                    presentation:
                        it?.presentation ||
                        "Regular",
                };
            }
        )
        .filter(
            (
                it
            ) =>
                it.name &&
                it.quantity >
                0 &&
                it.unitPrice >=
                0
        );
};


const Menu = () => {
    const {
        t,
    } =
        useTranslation();


    const {
        tenantInfo,
    } =
        useTenant();


    const localization =
        getTenantLocalization(
            tenantInfo
        );


    const defaultWeightUnit =
        getDefaultWeightUnit(
            localization
        );


    const money = (
        value
    ) =>
        formatMoney(
            value,
            localization
        );


    const [
        isOrderOpen,
        setIsOrderModalOpen,
    ] =
        useState(
            true
        );


    const [
        editCartItemRequest,
        setEditCartItemRequest,
    ] =
        useState(
            null
        );


    const [
        leaveTableModal,
        setLeaveTableModal,
    ] =
        useState({
            open:
                false,

            loading:
                false,
        });


    const navigate =
        useNavigate();


    const queryClient =
        useQueryClient();


    const [
        searchParams,
    ] =
        useSearchParams();


    const orderId =
        searchParams.get(
            "orderId"
        );


    const dispatch =
        useDispatch();


    const draft =
        useSelector(
            (
                state
            ) =>
                state.customer
        );


    const cart =
        useSelector(
            (
                state
            ) =>
                state.cart
        );


    const cartItems =
        useMemo(
            () =>
                getCartItemsArray(
                    cart
                ),
            [
                cart,
            ]
        );


    const itemsCount =
        useMemo(
            () => {
                return cartItems
                    .reduce(
                        (
                            acc,
                            it
                        ) => {
                            const isWeight =
                                it
                                    ?.qtyType ===
                                "weight";


                            return (
                                acc +
                                (
                                    isWeight
                                        ? 1
                                        : num(
                                            it
                                                ?.quantity ??
                                            it
                                                ?.qty ??
                                            1
                                        )
                                )
                            );
                        },
                        0
                    );
            },
            [
                cartItems,
            ]
        );


    const totalAmount =
        useMemo(
            () => {
                return cartItems
                    .reduce(
                        (
                            acc,
                            it
                        ) => {
                            const lineTotal =
                                num(
                                    it
                                        ?.price ??
                                    num(
                                        it
                                            ?.unitPrice ??
                                        0
                                    ) *
                                    num(
                                        it
                                            ?.quantity ??
                                        it
                                            ?.qty ??
                                        1
                                    )
                                );


                            return (
                                acc +
                                lineTotal
                            );
                        },
                        0
                    );
            },
            [
                cartItems,
            ]
        );


    const hasDraftContext =
        !!draft?.table ||
        !!draft?.isVirtual ||
        !!draft?.orderSource;


    const draftKey =
        `${
            draft?.table ||
            "no-table"
        }|${
            draft?.isVirtual
                ? "virtual"
                : "real"
        }|${
            draft?.orderSource ||
            "DINE_IN"
        }`;


    const lastDraftKeyRef =
        useRef(
            null
        );


    const {
        data:
            orderRes,
    } =
        useQuery({
            queryKey: [
                "order",
                orderId,
            ],

            queryFn:
                () =>
                    getOrderById(
                        orderId
                    ),

            enabled:
                !!orderId,
        });


    const order =
        orderRes
            ?.data
            ?.data;


    const getTableLabel = (
        table
    ) => {
        if (!table) {
            return "N/A";
        }


        if (
            typeof table ===
            "string"
        ) {
            return t(
                "menuPage.selectedTable"
            );
        }


        return (
            table?.tableNo ||
            table?.tableNumber ||
            table?.name ||
            table?.label ||
            t(
                "menuPage.selectedTable"
            )
        );
    };


    const rawDisplayCustomerName =
        order
            ?.customerDetails
            ?.name ||
        draft
            ?.customerName ||
        draft
            ?.name ||
        "";


    const normalizedDisplayCustomerName =
        String(
            rawDisplayCustomerName ||
            ""
        )
            .trim()
            .toLowerCase();


    const isFinalConsumerName =
        [
            "consumidor final",
            "final consumer",
        ].includes(
            normalizedDisplayCustomerName
        );


    /*
     * Internamente podemos seguir teniendo
     * "Consumidor Final".
     *
     * En pantalla se traduce según el idioma.
     */
    const displayCustomerName =
        rawDisplayCustomerName
            ? (
                isFinalConsumerName
                    ? t(
                        "customerInfo.finalConsumer"
                    )
                    : rawDisplayCustomerName
            )
            : t(
                "menuPage.customerName"
            );


    const customerNameForDisplay =
        rawDisplayCustomerName
            ? (
                isFinalConsumerName
                    ? t(
                        "customerInfo.finalConsumer"
                    )
                    : rawDisplayCustomerName
            )
            : "";


    const displayTableLabel =
        order
            ?.table
            ?.tableNo ||
        order
            ?.table
            ?.tableNumber ||
        getTableLabel(
            draft?.table
        );


    const tableId =
        getTableIdFromAny(
            order?.table
        ) ||
        getTableIdFromAny(
            draft?.table
        );


    const currentOrderId =
        orderId ||
        order?._id ||
        null;


    /*
     * ============================================
     * CUSTOMER DISPLAY
     * ============================================
     */

    useEffect(
        () => {
            publishCustomerDisplayPatch({
                status:
                    cartItems.length
                        ? "active"
                        : "idle",

                orderId:
                currentOrderId,

                customerName:
                customerNameForDisplay,

                tableLabel:
                    displayTableLabel ||
                    "",

                orderSource:
                    order
                        ?.orderSource ||
                    draft
                        ?.orderSource ||
                    "DINE_IN",

                items:
                    buildDisplayItems(
                        cartItems
                    ),

                subtotal:
                    Number(
                        totalAmount
                            .toFixed(
                                2
                            )
                    ),

                total:
                    Number(
                        totalAmount
                            .toFixed(
                                2
                            )
                    ),

                message:
                    cartItems.length
                        ? t(
                            "menuPage.customerDisplay.review"
                        )
                        : t(
                            "menuPage.customerDisplay.empty"
                        ),
            });
        },
        [
            cartItems,
            currentOrderId,
            customerNameForDisplay,
            displayTableLabel,
            order?.orderSource,
            draft?.orderSource,
            totalAmount,
            t,
        ]
    );


    useEffect(
        () => {
            return () => {
                clearCustomerDisplay();
            };
        },
        []
    );


    /*
     * Título de la pestaña del navegador.
     */
    useEffect(
        () => {
            document.title =
                t(
                    "menuPage.documentTitle"
                );
        },
        [
            t,
        ]
    );


    /*
     * Si entramos a una orden nueva sin orderId,
     * limpiamos el carrito anterior.
     */
    useEffect(
        () => {
            if (
                orderId
            ) {
                return;
            }

            if (
                !hasDraftContext
            ) {
                return;
            }


            if (
                lastDraftKeyRef
                    .current ===
                draftKey
            ) {
                return;
            }


            dispatch(
                removeAllItems()
            );


            lastDraftKeyRef.current =
                draftKey;
        },
        [
            orderId,
            hasDraftContext,
            draftKey,
            dispatch,
        ]
    );


    useEffect(
        () => {
            if (
                !isOrderOpen
            ) {
                dispatch(
                    removeAllItems()
                );

                dispatch(
                    clearDraftContext()
                );

                navigate(
                    TABLES_ROUTE
                );
            }
        },
        [
            isOrderOpen,
            dispatch,
            navigate,
        ]
    );


    /*
     * ============================================
     * CARGAR ORDEN EXISTENTE AL CARRITO
     * ============================================
     */

    useEffect(
        () => {
            if (
                !orderId
            ) {
                return;
            }


            dispatch(
                removeAllItems()
            );


            const items =
                order?.items ||
                [];


            if (
                items.length ===
                0
            ) {
                return;
            }


            const mapped =
                items.map(
                    (
                        it
                    ) => {
                        const quantity =
                            Number(
                                it.quantity ??
                                it.qty ??
                                it.count ??
                                1
                            );


                        const dishId =
                            it.dishId ??
                            it.dish?._id ??
                            it.dish ??
                            it.id ??
                            it._id;


                        /*
                         * Fallback interno.
                         * No cambia nombres reales de productos.
                         */
                        const name =
                            it.name ||
                            it.dishName ||
                            it.itemName ||
                            it
                                ?.dishInfo
                                ?.name ||
                            it
                                ?.dish
                                ?.name ||
                            "Producto";


                        const qtyType =
                            it.qtyType ||
                            (
                                it
                                    ?.dish
                                    ?.sellMode ===
                                "weight"
                                    ? "weight"
                                    : "unit"
                            ) ||
                            "unit";


                        const weightUnit =
                            it.weightUnit ||
                            it
                                ?.dish
                                ?.weightUnit ||
                            "lb";


                        const safeUnitPrice =
                            Number(
                                it.unitPrice ??
                                it.pricePerQuantity ??
                                it.pricePerLb ??
                                it
                                    ?.dish
                                    ?.pricePerLb ??
                                it
                                    ?.dish
                                    ?.price ??
                                0
                            );


                        const lineTotal =
                            Number(
                                it.price ??
                                safeUnitPrice *
                                quantity
                            );


                        return {
                            id:
                                String(
                                    dishId
                                ),

                            dishId:
                                String(
                                    dishId
                                ),

                            lineId:
                                it.lineId ||
                                null,

                            name,

                            qtyType,

                            weightUnit,

                            quantity,

                            unitPrice:
                            safeUnitPrice,

                            price:
                                Number(
                                    lineTotal
                                        .toFixed(
                                            2
                                        )
                                ),

                            productionArea:
                                it.productionArea ||
                                "kitchen",

                            note:
                                it.note ||
                                "",

                            addons:
                                Array.isArray(
                                    it.addons
                                )
                                    ? it.addons
                                    : [],

                            modifiers:
                                Array.isArray(
                                    it.modifiers
                                )
                                    ? it.modifiers
                                    : [],
                        };
                    }
                );


            dispatch(
                setCart(
                    mapped
                )
            );
        },
        [
            orderId,
            order,
            dispatch,
        ]
    );


    /*
     * Si no hay orderId ni contexto,
     * regresar a mesas.
     */
    useEffect(
        () => {
            if (
                !orderId &&
                !hasDraftContext
            ) {
                navigate(
                    TABLES_ROUTE,
                    {
                        replace:
                            true,
                    }
                );
            }
        },
        [
            orderId,
            hasDraftContext,
            navigate,
        ]
    );


    const closeLeaveTableModal =
        () => {
            if (
                leaveTableModal
                    .loading
            ) {
                return;
            }


            setLeaveTableModal({
                open:
                    false,

                loading:
                    false,
            });
        };


    const goBackClean =
        () => {
            dispatch(
                removeAllItems()
            );

            dispatch(
                clearDraftContext()
            );

            navigate(
                TABLES_ROUTE,
                {
                    replace:
                        true,
                }
            );
        };


    const handleBackFromMenu =
        () => {
            const hasItems =
                itemsCount >
                0;


            if (
                !hasItems
            ) {
                goBackClean();

                return;
            }


            if (
                !tableId &&
                !currentOrderId
            ) {
                goBackClean();

                return;
            }


            setLeaveTableModal({
                open:
                    true,

                loading:
                    false,
            });
        };


    /*
     * ============================================
     * GUARDAR PRODUCTOS Y SALIR
     * ============================================
     */

    const handleSaveItemsAndLeave =
        async () => {
            try {
                setLeaveTableModal(
                    (
                        previous
                    ) => ({
                        ...previous,

                        loading:
                            true,
                    })
                );


                const normalizedItems =
                    normalizeItemsForOrder(
                        cartItems,
                        defaultWeightUnit
                    );


                if (
                    !normalizedItems
                        .length
                ) {
                    goBackClean();

                    return;
                }


                // ==========================================
                // IDENTIDAD FISCAL DEL CLIENTE
                // ==========================================

                const rawCustomerTaxIdentity =
                    order
                        ?.customerDetails
                        ?.taxIdentity ||
                    draft
                        ?.customerTaxIdentity ||
                    draft
                        ?.taxIdentity ||
                    null;


                const legacyCustomerTaxValue =
                    rawCustomerTaxIdentity
                        ? ""
                        : (
                            order
                                ?.customerDetails
                                ?.rncCedula ||
                            order
                                ?.customerDetails
                                ?.rnc ||
                            draft
                                ?.rncCedula ||
                            draft
                                ?.rnc ||
                            ""
                        );


                const customerTaxIdentity =
                    normalizeOrderCustomerTaxIdentity(
                        rawCustomerTaxIdentity,
                        legacyCustomerTaxValue
                    );


                const legacyTaxValue =
                    getOrderLegacyTaxValue(
                        customerTaxIdentity
                    );


                /*
                 * IMPORTANTE:
                 * Estos valores siguen usando los enums
                 * internos existentes del backend.
                 */
                const payload = {
                    orderStatus:
                        "En Progreso",

                    submitAction:
                        "update",

                    items:
                    normalizedItems,

                    table:
                        tableId ||
                        undefined,

                    paymentMethod:
                        order
                            ?.paymentMethod ||
                        "Efectivo",

                    orderSource:
                        order
                            ?.orderSource ||
                        draft
                            ?.orderSource ||
                        "DINE_IN",

                    customerId:
                        order
                            ?.customerId
                            ?._id ||
                        order
                            ?.customerId ||
                        draft
                            ?.customerId ||
                        null,

                    customerDetails: {
                        name:
                            order
                                ?.customerDetails
                                ?.name ||
                            draft
                                ?.customerName ||
                            draft
                                ?.name ||
                            "",

                        phone:
                            order
                                ?.customerDetails
                                ?.phone ||
                            draft
                                ?.customerPhone ||
                            draft
                                ?.phone ||
                            "",

                        address:
                            order
                                ?.customerDetails
                                ?.address ||
                            draft
                                ?.customerAddress ||
                            draft
                                ?.address ||
                            "",

                        guests:
                            order
                                ?.customerDetails
                                ?.guests ??
                            draft
                                ?.guests ??
                            0,

                        taxIdentity:
                        customerTaxIdentity,

                        // LEGACY DGII
                        rnc:
                        legacyTaxValue,

                        rncCedula:
                        legacyTaxValue,
                    },
                };


                let savedOrderId =
                    currentOrderId;


                if (
                    currentOrderId
                ) {
                    const response =
                        await updateOrder(
                            currentOrderId,
                            payload
                        );


                    savedOrderId =
                        response
                            ?.data
                            ?.data
                            ?._id ||
                        currentOrderId;

                } else {

                    const response =
                        await addOrder(
                            payload
                        );


                    savedOrderId =
                        response
                            ?.data
                            ?.data
                            ?._id ||
                        null;
                }


                if (
                    tableId &&
                    savedOrderId
                ) {
                    await updateTable(
                        tableId,
                        {
                            status:
                                "Ocupada",

                            orderId:
                            savedOrderId,
                        }
                    );
                }


                dispatch(
                    removeAllItems()
                );


                dispatch(
                    clearDraftContext()
                );


                queryClient
                    .invalidateQueries({
                        queryKey: [
                            "orders",
                        ],
                    });


                queryClient
                    .invalidateQueries({
                        queryKey: [
                            "tables",
                        ],
                    });


                queryClient
                    .invalidateQueries({
                        queryKey: [
                            "order",
                            currentOrderId,
                        ],
                    });


                queryClient
                    .invalidateQueries({
                        queryKey: [
                            "cash-session",
                        ],
                    });


                setLeaveTableModal({
                    open:
                        false,

                    loading:
                        false,
                });


                enqueueSnackbar(
                    t(
                        "menuPage.messages.itemsSaved"
                    ),
                    {
                        variant:
                            "success",
                    }
                );


                navigate(
                    TABLES_ROUTE,
                    {
                        replace:
                            true,
                    }
                );

            } catch (
                error
                ) {
                console.error(
                    "[MENU] No pude guardar la mesa:",
                    error
                        ?.response
                        ?.data ||
                    error
                );


                setLeaveTableModal(
                    (
                        previous
                    ) => ({
                        ...previous,

                        loading:
                            false,
                    })
                );


                enqueueSnackbar(
                    error
                        ?.response
                        ?.data
                        ?.message ||
                    t(
                        "menuPage.messages.saveFailed"
                    ),
                    {
                        variant:
                            "error",
                    }
                );
            }
        };


    /*
     * ============================================
     * BORRAR PRODUCTOS Y SALIR
     * ============================================
     */

    const handleDiscardItemsAndLeave =
        async () => {
            try {
                setLeaveTableModal(
                    (
                        previous
                    ) => ({
                        ...previous,

                        loading:
                            true,
                    })
                );


                if (
                    currentOrderId
                ) {
                    await updateOrder(
                        currentOrderId,
                        {
                            orderStatus:
                                "Cancelado",

                            submitAction:
                                "discard_table_items",
                        }
                    );
                }


                if (
                    tableId
                ) {
                    await updateTable(
                        tableId,
                        {
                            status:
                                "Disponible",

                            orderId:
                                null,
                        }
                    );
                }


                dispatch(
                    removeAllItems()
                );


                dispatch(
                    clearDraftContext()
                );


                queryClient
                    .invalidateQueries({
                        queryKey: [
                            "orders",
                        ],
                    });


                queryClient
                    .invalidateQueries({
                        queryKey: [
                            "tables",
                        ],
                    });


                queryClient
                    .invalidateQueries({
                        queryKey: [
                            "order",
                            currentOrderId,
                        ],
                    });


                queryClient
                    .invalidateQueries({
                        queryKey: [
                            "cash-session",
                        ],
                    });


                setLeaveTableModal({
                    open:
                        false,

                    loading:
                        false,
                });


                enqueueSnackbar(
                    t(
                        "menuPage.messages.itemsRemoved"
                    ),
                    {
                        variant:
                            "success",
                    }
                );


                navigate(
                    TABLES_ROUTE,
                    {
                        replace:
                            true,
                    }
                );

            } catch (
                error
                ) {
                console.error(
                    "[MENU] No pude borrar los productos de la mesa:",
                    error
                        ?.response
                        ?.data ||
                    error
                );


                setLeaveTableModal(
                    (
                        previous
                    ) => ({
                        ...previous,

                        loading:
                            false,
                    })
                );


                enqueueSnackbar(
                    error
                        ?.response
                        ?.data
                        ?.message ||
                    t(
                        "menuPage.messages.removeFailed"
                    ),
                    {
                        variant:
                            "error",
                    }
                );
            }
        };


    return (
        <div className="bg-[#1f1f1f] min-h-[100dvh] flex flex-col pb-24 relative">

            {/* CUSTOMER DISPLAY */}

            <div className="hidden md:block fixed right-5 top-[82px] z-40 group">

                <button
                    type="button"

                    className="
                        flex
                        items-center
                        gap-2
                        px-3
                        py-2
                        rounded-full
                        bg-[#121212]/80
                        border
                        border-white/10
                        text-[#b8b8b8]
                        text-[11px]
                        font-bold
                        shadow-lg
                        backdrop-blur-md
                        hover:text-white
                        hover:border-[#f6b100]/40
                        hover:bg-[#1b1b1b]
                        transition-all
                    "

                    title={
                        t(
                            "menuPage.customerDisplay.open"
                        )
                    }
                >

                    <span className="w-2 h-2 rounded-full bg-[#f6b100]" />

                    {t(
                        "menuPage.customerDisplay.title"
                    )}

                </button>


                <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-white/10 bg-[#111111]/95 shadow-2xl backdrop-blur-md p-2 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all">

                    <button
                        type="button"

                        onClick={() =>
                            openCustomerDisplayWindow(
                                "7"
                            )
                        }

                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:bg-white/10 hover:text-white transition-all"
                    >

                        {t(
                            "menuPage.customerDisplay.open7"
                        )}

                    </button>


                    <button
                        type="button"

                        onClick={() =>
                            openCustomerDisplayWindow(
                                "11"
                            )
                        }

                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#f6b100] hover:bg-[#f6b100]/10 transition-all"
                    >

                        {t(
                            "menuPage.customerDisplay.open116"
                        )}

                    </button>

                </div>

            </div>


            <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row gap-3">

                <div className="flex-1 lg:flex-[3] min-w-0 flex flex-col overflow-hidden">

                    <div className="flex items-center justify-center gap-4 relative">

                        <div className="flex items-center gap-3 cursor-pointer">

                            <MdRestaurantMenu className="text-[#f5f5f5] text-4xl" />


                            <div className="flex flex-col items-start">

                                <h1 className="text-md text-[#f5f5f5] font-semibold tracking-wide">

                                    {displayCustomerName}

                                </h1>


                                <p className="text-xs text-[#ababab] font-medium">

                                    {t(
                                        "menuPage.table"
                                    )}{" "}
                                    :{" "}
                                    {displayTableLabel}

                                </p>

                            </div>

                        </div>

                    </div>


                    <div className="flex-1 min-h-0 overflow-hidden">

                        <MenuContainer
                            orderId={
                                orderId
                            }

                            editCartItemRequest={
                                editCartItemRequest
                            }

                            onEditCartItemHandled={() =>
                                setEditCartItemRequest(
                                    null
                                )
                            }
                        />

                    </div>

                </div>


                <aside className="w-full lg:w-[420px] lg:shrink-0 bg-[#1a1a1a] mt-0 lg:mt-4 lg:mr-3 rounded-lg flex flex-col min-h-0 overflow-hidden">

                    {isOrderOpen && (

                        <>

                            <CustomerInfo
                                order={
                                    order
                                }
                            />


                            <hr className="border-[#2a2a2a] border-t-2" />


                            <div className="flex-1 min-h-0 overflow-y-auto pb-24">

                                <CartInfo
                                    orderId={
                                        orderId
                                    }

                                    onEditItem={(
                                        item,
                                        index
                                    ) => {

                                        setEditCartItemRequest({
                                            item,

                                            index,

                                            requestId:
                                                `${Date.now()}-${index}`,
                                        });

                                    }}
                                />


                                <hr className="border-[#2a2a2a] border-t-2" />


                                <Bill
                                    orderId={
                                        orderId
                                    }

                                    order={
                                        order
                                    }

                                    setIsOrderModalOpen={
                                        setIsOrderModalOpen
                                    }
                                />

                            </div>

                        </>

                    )}

                </aside>

            </div>


            {/* MODAL AL SALIR DE LA MESA */}

            <AnimatePresence>

                {leaveTableModal.open && (

                    <motion.div
                        initial={{
                            opacity:
                                0,
                        }}

                        animate={{
                            opacity:
                                1,
                        }}

                        exit={{
                            opacity:
                                0,
                        }}

                        className="
                            fixed
                            inset-0
                            z-[10000]
                            bg-black/75
                            backdrop-blur-sm
                            flex
                            items-center
                            justify-center
                            p-4
                        "

                        onClick={
                            closeLeaveTableModal
                        }
                    >

                        <motion.div
                            initial={{
                                scale:
                                    0.94,

                                opacity:
                                    0,

                                y:
                                    16,
                            }}

                            animate={{
                                scale:
                                    1,

                                opacity:
                                    1,

                                y:
                                    0,
                            }}

                            exit={{
                                scale:
                                    0.94,

                                opacity:
                                    0,

                                y:
                                    16,
                            }}

                            transition={{
                                duration:
                                    0.2,

                                ease:
                                    "easeOut",
                            }}

                            className="
                                w-full
                                max-w-lg
                                overflow-hidden
                                rounded-3xl
                                border
                                border-white/10
                                bg-gradient-to-br
                                from-[#151515]
                                via-[#101010]
                                to-[#070707]
                                shadow-2xl
                            "

                            onClick={(
                                event
                            ) =>
                                event.stopPropagation()
                            }
                        >

                            <div className="p-6 border-b border-white/10">

                                <div className="flex items-start gap-4">

                                    <div className="h-12 w-12 rounded-2xl bg-[#f6b100]/10 border border-[#f6b100]/30 flex items-center justify-center">

                                        <span className="text-2xl">
                                            !
                                        </span>

                                    </div>


                                    <div className="flex-1">

                                        <h3 className="text-xl font-bold text-white">

                                            {t(
                                                "menuPage.leaveTable.title"
                                            )}

                                        </h3>


                                        <p className="mt-2 text-sm leading-6 text-white/60">

                                            {t(
                                                "menuPage.leaveTable.description"
                                            )}

                                        </p>

                                    </div>

                                </div>

                            </div>


                            <div className="p-6">

                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 mb-5">

                                    <div className="flex items-center justify-between text-sm">

                                        <span className="text-white/50">

                                            {t(
                                                "menuPage.table"
                                            )}

                                        </span>


                                        <span className="font-semibold text-white">

                                            {displayTableLabel
                                                ? `${
                                                    t(
                                                        "menuPage.table"
                                                    )
                                                } ${displayTableLabel}`
                                                : t(
                                                    "menuPage.selectedTable"
                                                )
                                            }

                                        </span>

                                    </div>


                                    <div className="flex items-center justify-between text-sm mt-3">

                                        <span className="text-white/50">

                                            {t(
                                                "menuPage.leaveTable.products"
                                            )}

                                        </span>


                                        <span className="font-semibold text-white">

                                            {itemsCount}

                                        </span>

                                    </div>


                                    <div className="flex items-center justify-between text-sm mt-3">

                                        <span className="text-white/50">

                                            {t(
                                                "menuPage.leaveTable.currentTotal"
                                            )}

                                        </span>


                                        <span className="font-semibold text-[#f6b100]">

                                            {money(
                                                totalAmount
                                            )}

                                        </span>

                                    </div>

                                </div>


                                <div className="grid grid-cols-1 gap-3">

                                    <button
                                        type="button"

                                        onClick={
                                            handleSaveItemsAndLeave
                                        }

                                        disabled={
                                            leaveTableModal
                                                .loading
                                        }

                                        className="
                                            w-full
                                            px-4
                                            py-3
                                            rounded-2xl
                                            bg-[#f6b100]
                                            text-black
                                            font-bold
                                            hover:bg-[#ffd633]
                                            transition-all
                                            disabled:opacity-50
                                            disabled:cursor-not-allowed
                                        "
                                    >

                                        {leaveTableModal
                                            .loading
                                            ? t(
                                                "menuPage.leaveTable.processing"
                                            )
                                            : t(
                                                "menuPage.leaveTable.save"
                                            )
                                        }

                                    </button>


                                    <button
                                        type="button"

                                        onClick={
                                            handleDiscardItemsAndLeave
                                        }

                                        disabled={
                                            leaveTableModal
                                                .loading
                                        }

                                        className="
                                            w-full
                                            px-4
                                            py-3
                                            rounded-2xl
                                            border
                                            border-red-500/20
                                            bg-red-500/10
                                            text-red-300
                                            font-bold
                                            hover:bg-red-500/20
                                            transition-all
                                            disabled:opacity-50
                                            disabled:cursor-not-allowed
                                        "
                                    >

                                        {t(
                                            "menuPage.leaveTable.discard"
                                        )}

                                    </button>


                                    <button
                                        type="button"

                                        onClick={
                                            closeLeaveTableModal
                                        }

                                        disabled={
                                            leaveTableModal
                                                .loading
                                        }

                                        className="
                                            w-full
                                            px-4
                                            py-3
                                            rounded-2xl
                                            border
                                            border-white/10
                                            bg-[#1a1a1a]
                                            text-white
                                            font-semibold
                                            hover:bg-[#242424]
                                            transition-all
                                            disabled:opacity-50
                                            disabled:cursor-not-allowed
                                        "
                                    >

                                        {t(
                                            "common.cancel"
                                        )}

                                    </button>

                                </div>

                            </div>

                        </motion.div>

                    </motion.div>

                )}

            </AnimatePresence>


            <BottomNav />

        </div>
    );
};


export default Menu;