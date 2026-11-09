import DeleteCustomerAction from "./DeleteCustomerAction";
import {customerErrorMessage} from "../../lib/customerErrors";
import CustomerManager from "./CustomerManager";
import useRncLookup from "../../hooks/useRncLookup";
import React, {
    useMemo,
    useEffect,
    useState,
} from "react";

import {
    useTranslation,
} from "react-i18next";

import {
    useDispatch,
    useSelector,
} from "react-redux";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    enqueueSnackbar,
} from "notistack";

import {
    FiEdit3,
    FiPhone,
    FiUser,
    FiX,
} from "react-icons/fi";

import {
    setCustomer,
} from "../../redux/slices/customerSlice";

import {
    createCustomer,
    getCustomers,
    updateOrder,
} from "../../https";
import {
    formatDate,
    getAvatarName,
} from "../../utils";

import api from "../../lib/api";

import useTenant from "../../hooks/useTenant";

import {
    getTenantLocalization,
} from "../../lib/localization";

import {
    COUNTRY_OPTIONS,
} from "../../data/countryConfig.js";

import {
    getTaxIdentityPreset,
} from "../../data/taxIdentityPresets.js";


const getTableLabel = (
    table,
    selectedTableLabel = "Selected table"
) => {
    if (!table) return "N/A";

    if (typeof table === "string") {
        return selectedTableLabel;
    }

    return (
        table?.tableNo ||
        table?.tableNumber ||
        table?.name ||
        table?.label ||
        table?.areaName ||
        selectedTableLabel
    );
};


const safeDateForFormat = (
    value,
    fallback
) => {
    if (!value) {
        return fallback;
    }

    if (value instanceof Date) {
        return value;
    }

    const parsed =
        new Date(
            value
        );

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return fallback;
    }

    return parsed;
};


// ======================================================
// NORMALIZAR IDENTIDAD FISCAL DEL CLIENTE
// ======================================================

const normalizeCustomerTaxIdentity = (
    raw,
    legacyValue = "",
    fallbackCountryCode = "DO"
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
                        fallbackCountryCode ||
                        "DO"
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
    // COMPATIBILIDAD LEGACY RD
    // ==============================================

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
// VALOR LEGACY PARA DGII
// ======================================================

const getDominicanLegacyTaxValue = (
    taxIdentity
) => {
    if (!taxIdentity) {
        return "";
    }

    if (
        String(
            taxIdentity.countryCode ||
            ""
        ).toUpperCase() !==
        "DO"
    ) {
        return "";
    }

    const type =
        String(
            taxIdentity.type ||
            ""
        ).toUpperCase();

    /*
     * rncCedula ya era un campo ambiguo.
     *
     * Mientras mantenemos compatibilidad DGII,
     * aceptamos RNC y CEDULA.
     */
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
        taxIdentity.value ||
        ""
    ).trim();
};


const CustomerInfo = ({
                          order,
                      }) => {
    const {
        t,
        i18n,
    } =
        useTranslation();


    const dispatch =
        useDispatch();


    const queryClient =
        useQueryClient();


    const {
        tenantInfo,
    } =
        useTenant();


    const localization =
        getTenantLocalization(
            tenantInfo
        );


    /*
     * Traducimos automáticamente los nombres de países.
     *
     * Ej:
     * Estados Unidos -> United States
     * República Dominicana -> Dominican Republic
     */
    const regionDisplayNames =
        useMemo(
            () => {
                try {
                    return new Intl.DisplayNames(
                        [
                            i18n.resolvedLanguage ||
                            i18n.language ||
                            "es",
                        ],
                        {
                            type:
                                "region",
                        }
                    );
                } catch {
                    return null;
                }
            },
            [
                i18n.resolvedLanguage,
                i18n.language,
            ]
        );


    const defaultCountryCode =
        String(
            localization
                ?.countryCode ||
            tenantInfo
                ?.localization
                ?.countryCode ||
            "DO"
        )
            .trim()
            .toUpperCase();


    const draft =
        useSelector(
            (
                state
            ) =>
                state.customer ||
                {}
        );


    const [
        dateTime,
    ] =
        useState(
            new Date()
        );


    const [
        isEditOpen,
        setIsEditOpen,
    ] =
        useState(
            false
        );

    const [
        isCustomerPickerOpen,
        setIsCustomerPickerOpen,
    ] =
        useState(
            false
        );


    const [
        customerSearch,
        setCustomerSearch,
    ] =
        useState(
            ""
        );

    const [
        editName,
        setEditName,
    ] =
        useState(
            ""
        );


    const [
        editPhone,
        setEditPhone,
    ] =
        useState(
            ""
        );


    const [
        editTaxCountryCode,
        setEditTaxCountryCode,
    ] =
        useState(
            ""
        );


    const [
        editTaxType,
        setEditTaxType,
    ] =
        useState(
            ""
        );


    const [
        editTaxLabel,
        setEditTaxLabel,
    ] =
        useState(
            ""
        );


    const [
        editTaxValue,
        setEditTaxValue,
    ] =
        useState(
            ""
        );


    // =====================================================
    // DATOS DEL CLIENTE
    // =====================================================

    const [managerOpen,setManagerOpen]=useState(false),[managerCustomer,setManagerCustomer]=useState(null);
    const [editNeedsConfirmation,setEditNeedsConfirmation]=useState(false),[editDistinctConfirmed,setEditDistinctConfirmed]=useState(false),[editCustomerError,setEditCustomerError]=useState('');
    useEffect(()=>{setEditDistinctConfirmed(false);setEditNeedsConfirmation(false);setEditCustomerError('');},[editName,editPhone,editTaxValue,editTaxCountryCode,editTaxType,isEditOpen]);
    const editorLookup=useRncLookup({value:editTaxValue,name:editName,onName:setEditName,enabled:isEditOpen&&editTaxCountryCode==='DO'&&['RNC','CEDULA'].includes(editTaxType)});

    const rawCustomerName =
        useMemo(
            () => {
                return (
                    order
                        ?.customerDetails
                        ?.name ||
                    order
                        ?.customerName ||
                    draft
                        ?.customerName ||
                    draft
                        ?.name ||
                    ""
                );
            },
            [
                order
                    ?.customerDetails
                    ?.name,

                order
                    ?.customerName,

                draft
                    ?.customerName,

                draft
                    ?.name,
            ]
        );


    /*
     * IMPORTANTE:
     *
     * Internamente seguimos soportando
     * "Consumidor Final".
     *
     * Solo traducimos el texto mostrado.
     */
    const normalizedCustomerName =
        String(
            rawCustomerName ||
            ""
        )
            .trim()
            .toLowerCase();


    const isFinalConsumer =
        !normalizedCustomerName ||
        [
            "consumidor final",
            "final consumer",
        ].includes(
            normalizedCustomerName
        );


    const customerName =
        isFinalConsumer
            ? t(
                "customerInfo.finalConsumer"
            )
            : rawCustomerName;


    const customerPhone =
        useMemo(
            () => {
                return (
                    order
                        ?.customerDetails
                        ?.phone ||
                    draft
                        ?.customerPhone ||
                    draft
                        ?.phone ||
                    ""
                );
            },
            [
                order
                    ?.customerDetails
                    ?.phone,

                draft
                    ?.customerPhone,

                draft
                    ?.phone,
            ]
        );


    const customerTaxIdentity =
        useMemo(
            () => {
                const raw =
                    order
                        ?.customerDetails
                        ?.taxIdentity ||
                    draft
                        ?.customerTaxIdentity ||
                    draft
                        ?.taxIdentity ||
                    null;


                const legacy =
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
                    "";


                return normalizeCustomerTaxIdentity(
                    raw,
                    legacy,
                    defaultCountryCode
                );
            },
            [
                order
                    ?.customerDetails
                    ?.taxIdentity,

                order
                    ?.customerDetails
                    ?.rncCedula,

                order
                    ?.customerDetails
                    ?.rnc,

                draft
                    ?.customerTaxIdentity,

                draft
                    ?.taxIdentity,

                draft
                    ?.rncCedula,

                draft
                    ?.rnc,

                defaultCountryCode,
            ]
        );

    // =====================================================
// CLIENTES GUARDADOS
// =====================================================

    const currentCustomerId =
        String(
            order
                ?.customerId
                ?._id ||
            order
                ?.customerId ||
            draft
                ?.customerId ||
            ""
        ).trim();


    const customersQuery =
        useQuery({
            queryKey: [
                "customers",
                "customer-info-picker",
                customerSearch,
            ],

            queryFn:
                async () => {

                    const query =
                        String(
                            customerSearch ||
                            ""
                        ).trim();


                    const response =
                        await getCustomers(
                            query,
                            50
                        );


                    return (
                        response
                            ?.data
                            ?.data ||
                        []
                    );
                },

            enabled:
            isCustomerPickerOpen,

            staleTime:
                10_000,
        });


    const openCustomerPicker =
        () => {

            setCustomerSearch(
                ""
            );

            setIsCustomerPickerOpen(
                true
            );
        };


    const tableLabel =
        useMemo(
            () => {
                return getTableLabel(
                    order?.table ||
                    draft?.table,

                    t(
                        "customerInfo.selectedTable"
                    )
                );
            },
            [
                order?.table,
                draft?.table,
                t,
            ]
        );


    const displayDate =
        useMemo(
            () => {
                return safeDateForFormat(
                    order?.createdAt,
                    dateTime
                );
            },
            [
                order?.createdAt,
                dateTime,
            ]
        );

// =====================================================
// SELECCIONAR CLIENTE GUARDADO
// =====================================================

    const selectSavedCustomerMutation =
        useMutation({

            mutationFn:
                async (
                    customer
                ) => {

                    const customerId =
                        customer
                            ?._id ||
                        null;


                    if (
                        !customerId
                    ) {
                        throw new Error(
                            t(
                                "customerInfo.messages.invalidSavedCustomer"
                            )
                        );
                    }


                    const taxIdentity =
                        normalizeCustomerTaxIdentity(
                            customer
                                ?.taxIdentity,

                            customer
                                ?.rncCedula ||
                            customer
                                ?.rnc ||
                            "",

                            defaultCountryCode
                        );


                    const legacyTaxValue =
                        getDominicanLegacyTaxValue(
                            taxIdentity
                        );


                    /*
                     * Las personas/invitados pertenecen
                     * a la orden actual, no al cliente
                     * guardado.
                     */
                    const guests =
                        Number(
                            order
                                ?.customerDetails
                                ?.guests ??
                            draft
                                ?.guests ??
                            0
                        );


                    const customerPayload = {
                        customerId,

                        name:
                            customer
                                ?.name ||
                            "Consumidor Final",

                        phone:
                            customer
                                ?.phone ||
                            "",

                        address:
                            customer
                                ?.address ||
                            "",

                        guests,

                        taxIdentity,

                        rnc:
                        legacyTaxValue,

                        rncCedula:
                        legacyTaxValue,
                    };


                    /*
                     * Si todavía no existe una orden,
                     * solamente actualizamos Redux.
                     */
                    if (
                        !order?._id
                    ) {
                        return {
                            customerPayload,
                        };
                    }


                    /*
                     * Si la orden ya existe,
                     * cambiamos el customerId y su
                     * snapshot.
                     *
                     * NO hacemos PATCH al Customer.
                     */
                    await updateOrder(
                        order._id,
                        {
                            customerId,

                            customerDetails: {
                                name:
                                customerPayload
                                    .name,

                                phone:
                                customerPayload
                                    .phone,

                                address:
                                customerPayload
                                    .address,

                                guests,

                                taxIdentity,

                                rnc:
                                legacyTaxValue,

                                rncCedula:
                                legacyTaxValue,
                            },

                            submitAction:
                                "update_customer",
                        }
                    );


                    return {
                        customerPayload,
                    };
                },


            onSuccess:
                (
                    data
                ) => {

                    if (
                        data
                            ?.customerPayload
                    ) {
                        dispatch(
                            setCustomer(
                                data.customerPayload
                            )
                        );
                    }


                    setIsCustomerPickerOpen(
                        false
                    );

                    setCustomerSearch(
                        ""
                    );


                    if (
                        order?._id
                    ) {
                        queryClient
                            .invalidateQueries({
                                queryKey: [
                                    "order",
                                    order._id,
                                ],
                            });
                    }


                    queryClient
                        .invalidateQueries({
                            queryKey: [
                                "orders",
                            ],
                        });


                    enqueueSnackbar(
                        t(
                            "customerInfo.messages.customerSelected"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );
                },


            onError:
                (
                    error
                ) => {

                    console.error(
                        "[CUSTOMER INFO] Error seleccionando cliente:",
                        error
                            ?.response
                            ?.data ||
                        error
                    );


                    enqueueSnackbar(
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        error
                            ?.message ||
                        t(
                            "customerInfo.messages.customerSelectFailed"
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });
    // =====================================================
    // ABRIR EDITOR
    // =====================================================

    const openCustomerEditor =
        () => {

            setEditName(
                isFinalConsumer
                    ? ""
                    : rawCustomerName
            );


            setEditPhone(
                customerPhone ||
                ""
            );


            // ======================================
            // IDENTIFICACIÓN FISCAL
            // ======================================

            const countryCode =
                String(
                    customerTaxIdentity
                        ?.countryCode ||
                    defaultCountryCode ||
                    "DO"
                )
                    .trim()
                    .toUpperCase();


            const preset =
                getTaxIdentityPreset(
                    countryCode
                );


            setEditTaxCountryCode(
                countryCode
            );


            setEditTaxType(
                customerTaxIdentity
                    ?.type ||
                preset
                    .primaryTaxId
                    .type
            );


            setEditTaxLabel(
                customerTaxIdentity
                    ?.label ||
                preset
                    .primaryTaxId
                    .shortLabel ||
                preset
                    .primaryTaxId
                    .label
            );


            setEditTaxValue(
                customerTaxIdentity
                    ?.value ||
                ""
            );


            setIsEditOpen(
                true
            );
        };


    const handleTaxCountryChange =
        (
            countryCode
        ) => {

            const code =
                String(
                    countryCode ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            const preset =
                getTaxIdentityPreset(
                    code
                );


            setEditTaxCountryCode(
                code
            );


            setEditTaxType(
                preset
                    .primaryTaxId
                    .type
            );


            setEditTaxLabel(
                preset
                    .primaryTaxId
                    .shortLabel ||
                preset
                    .primaryTaxId
                    .label
            );


            /*
             * Si cambia el país no reutilizamos
             * el número fiscal anterior.
             */
            setEditTaxValue(
                ""
            );
        };


    // =====================================================
    // GUARDAR CLIENTE
    // =====================================================

    const updateCustomerMutation =
        useMutation({

            mutationFn:
                async () => {

                    const cleanName =
                        String(
                            editName ||
                            ""
                        ).trim();


                    const cleanPhone =
                        String(
                            editPhone ||
                            ""
                        ).trim();


                    /*
                     * IMPORTANTE:
                     *
                     * Este valor interno permanece
                     * en español por compatibilidad
                     * con datos existentes.
                     *
                     * La UI lo traduce al mostrarlo.
                     */
                    const finalName =
                        cleanName ||
                        "Consumidor Final";


                    const customerId =
                        order
                            ?.customerId
                            ?._id ||
                        order
                            ?.customerId ||
                        draft
                            ?.customerId ||
                        null;


                    const address =
                        order
                            ?.customerDetails
                            ?.address ||
                        draft
                            ?.customerAddress ||
                        draft
                            ?.address ||
                        "";


                    const guests =
                        Number(
                            order
                                ?.customerDetails
                                ?.guests ??
                            draft
                                ?.guests ??
                            0
                        );


                    // ==================================
                    // TAX IDENTITY
                    // ==================================

                    const taxValue =
                        String(
                            editTaxValue ||
                            ""
                        ).trim();


                    const taxType =
                        String(
                            editTaxType ||
                            "TAX_ID"
                        )
                            .trim()
                            .toUpperCase();


                    const taxLabel =
                        String(
                            editTaxLabel ||
                            taxType ||
                            "Tax ID"
                        ).trim();


                    const taxCountryCode =
                        String(
                            editTaxCountryCode ||
                            defaultCountryCode ||
                            "DO"
                        )
                            .trim()
                            .toUpperCase();


                    const taxIdentity =
                        taxValue
                            ? {
                                countryCode:
                                taxCountryCode,

                                type:
                                taxType,

                                label:
                                taxLabel,

                                value:
                                taxValue,
                            }
                            : null;


                    // ==================================
                    // LEGACY DGII
                    // ==================================

                    const legacyTaxValue =
                        getDominicanLegacyTaxValue(
                            taxIdentity
                        );


                    // ==================================
                    // REDUX
                    // ==================================

                    const customerPayload = {
                        customerId,

                        name:
                        finalName,

                        phone:
                        cleanPhone,

                        address,

                        guests,

                        taxIdentity,

                        rnc:
                        legacyTaxValue,

                        rncCedula:
                        legacyTaxValue,
                    };





                    // ==================================
                    // CUSTOMER REAL
                    // ==================================

                    if (
                        customerId
                    ) {
                        await api.patch(
                            `/api/customer/${customerId}`,

                            {
                                name:
                                finalName,

                                phone:
                                cleanPhone,

                                address,

                                taxIdentity,
                                confirmDistinctPerson:editDistinctConfirmed,
                            }
                        );
                    }


                    // ==================================
                    dispatch(setCustomer(customerPayload));

                    // SIN ORDEN AÚN
                    // ==================================

                    if (
                        !order?._id
                    ) {
                        return {
                            localOnly:
                                true,

                            customerPayload,
                        };
                    }


                    // ==================================
                    // SNAPSHOT EN LA ORDEN
                    // ==================================

                    const response =
                        await updateOrder(
                            order._id,

                            {
                                customerId:
                                    customerId ||
                                    null,

                                customerDetails: {
                                    name:
                                    finalName,

                                    phone:
                                    cleanPhone,

                                    address,

                                    guests,

                                    taxIdentity,

                                    /*
                                     * Legacy DGII temporal.
                                     */
                                    rnc:
                                    legacyTaxValue,

                                    rncCedula:
                                    legacyTaxValue,
                                },

                                submitAction:
                                    "update_customer",
                            }
                        );


                    return response;
                },


            onSuccess:
                () => {

                    setIsEditOpen(
                        false
                    );


                    if (
                        order?._id
                    ) {
                        queryClient
                            .invalidateQueries({
                                queryKey: [
                                    "order",
                                    order._id,
                                ],
                            });
                    }


                    queryClient
                        .invalidateQueries({
                            queryKey: [
                                "orders",
                            ],
                        });


                    queryClient
                        .invalidateQueries({
                            queryKey: [
                                "customers",
                            ],
                        });


                    queryClient
                        .invalidateQueries({
                            queryKey: [
                                "customer",
                            ],
                        });


                    enqueueSnackbar(
                        t(
                            "customerInfo.messages.updated"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );
                },


            onError:
                (
                    error
                ) => {

                    setEditCustomerError(customerErrorMessage(error?.response?.data?.code));
                    setEditNeedsConfirmation(error?.response?.data?.code==='HOMONYM_CONFIRMATION_REQUIRED');setEditDistinctConfirmed(false);
                    console.error(
                        "[CUSTOMER INFO] Error actualizando cliente:",
                        error
                            ?.response
                            ?.data ||
                        error
                    );


                    enqueueSnackbar(
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "customerInfo.messages.updateFailed"
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


    // =====================================================
    // GUARDAR
    // =====================================================

    const handleSaveCustomer =
        () => {

            if (
                updateCustomerMutation
                    .isPending
            ) {
                return;
            }


            updateCustomerMutation
                .mutate();
        };


    return (
        <>

            {/* =====================================================
                INFORMACIÓN SUPERIOR
            ===================================================== */}

            <div className="flex items-center justify-between px-4 py-3">

                <div className="flex flex-col items-start">
                    {/* CLIENTE */}

                    <div className="flex items-start gap-2">

                        {/* SELECCIONAR CLIENTE GUARDADO */}

                        <button
                            type="button"

                            onClick={
                                openCustomerPicker
                            }

                            className="
            group
            flex
            flex-col
            items-start
            text-left
            rounded-lg
            px-2
            py-1
            -ml-2
            transition-colors
            hover:bg-white/5
        "

                            title={
                                t(
                                    "customerInfo.selectSavedCustomer"
                                )
                            }
                        >

                            <h1 className="text-md text-[#f5f5f5] font-semibold tracking-wide group-hover:text-[#38bdf8] transition-colors">

                                {customerName}

                            </h1>


                            <p className="text-xs text-[#ababab] font-medium mt-1">

                                {customerPhone
                                    ? customerPhone
                                    : t(
                                        "customerInfo.noPhone"
                                    )
                                }

                            </p>


                            <p className="text-[11px] text-white/35 mt-1">

                                {t(
                                    "customerInfo.changeCustomer"
                                )}

                            </p>

                        </button>


                        {/* EDITAR CLIENTE ACTUAL */}

                        <button
                            type="button"

                            onClick={
                                openCustomerEditor
                            }

                            title={
                                t(
                                    "customerInfo.editCustomer"
                                )
                            }

                            className="
            mt-1
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            text-[#777]
            transition
            hover:bg-white/5
            hover:text-[#38bdf8]
        "
                        >

                            <FiEdit3
                                size={
                                    15
                                }
                            />

                        </button>

                    </div>


                    {/* MESA */}

                    <p className="text-xs text-[#ababab] font-medium mt-1">

                        {t(
                            "customerInfo.table"
                        )}:{" "}

                        {tableLabel}

                    </p>


                    {/* FECHA */}

                    <p className="text-xs text-[#ababab] font-medium mt-2">

                        {formatDate(
                            displayDate
                        )}

                    </p>

                </div>


                {/* AVATAR */}

                <button
                    type="button"

                    onClick={
                        openCustomerPicker
                    }

                    title={
                        t(
                            "customerInfo.selectSavedCustomer"
                        )
                    }

                    className="
                        bg-[#38bdf8]
                        p-3
                        text-xl
                        font-bold
                        rounded-lg
                        transition-transform
                        hover:scale-105
                        active:scale-95
                    "
                >

                    {getAvatarName(
                            customerName
                        ) ||
                        t(
                            "customerInfo.finalConsumerInitials"
                        )
                    }

                </button>

            </div>

            {/* =====================================================
    MODAL CLIENTES GUARDADOS
===================================================== */}

            {isCustomerPickerOpen && (

                <div
                    className="
            fixed
            inset-0
            z-[10000]
            flex
            items-center
            justify-center
            bg-black/75
            backdrop-blur-sm
            p-4
        "

                    onClick={() => {

                        if (
                            !selectSavedCustomerMutation
                                .isPending
                        ) {
                            setIsCustomerPickerOpen(
                                false
                            );
                        }

                    }}
                >

                    <div
                        className="
                w-full
                max-w-lg
                overflow-hidden
                rounded-3xl
                border
                border-white/10
                bg-gradient-to-br
                from-[#171717]
                via-[#111111]
                to-[#080808]
                shadow-2xl
            "

                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >

                        {/* HEADER */}

                        <div className="flex items-start justify-between border-b border-white/10 p-5">

                            <div>

                                <h3 className="text-xl font-bold text-white">

                                    {t(
                                        "customerInfo.savedCustomers.title"
                                    )}

                                </h3>


                                <p className="mt-1 text-xs text-white/50">

                                    {t(
                                        "customerInfo.savedCustomers.description"
                                    )}

                                </p>

                            </div>


                            <button
                                type="button"

                                disabled={
                                    selectSavedCustomerMutation
                                        .isPending
                                }

                                onClick={() =>
                                    setIsCustomerPickerOpen(
                                        false
                                    )
                                }

                                className="
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-full
                        bg-white/5
                        text-white/60
                        transition
                        hover:bg-white/10
                        hover:text-white
                        disabled:opacity-50
                    "
                            >

                                <FiX
                                    size={
                                        18
                                    }
                                />

                            </button>

                        </div>


                        <button type="button" className="m-5 text-sky-300" onClick={()=>{setManagerCustomer(null);setManagerOpen(true);}}>Administrar clientes</button>
                        {/* BUSCADOR */}

                        <div className="p-5 border-b border-white/10">

                            <input
                                type="text"

                                value={
                                    customerSearch
                                }

                                onChange={(
                                    event
                                ) =>
                                    setCustomerSearch(
                                        event
                                            .target
                                            .value
                                    )
                                }

                                autoFocus

                                placeholder={
                                    t(
                                        "customerInfo.savedCustomers.searchPlaceholder"
                                    )
                                }

                                className="
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        bg-[#1b1b1b]
                        px-4
                        py-3
                        text-sm
                        text-white
                        outline-none
                        transition
                        placeholder:text-white/20
                        focus:border-[#38bdf8]/70
                        focus:ring-1
                        focus:ring-[#38bdf8]/30
                    "
                            />

                        </div>


                        {/* LISTA */}

                        <div className="max-h-[420px] overflow-y-auto p-3">

                            {customersQuery
                                .isLoading && (

                                <div className="px-4 py-8 text-center text-sm text-white/50">

                                    {t(
                                        "customerInfo.savedCustomers.loading"
                                    )}

                                </div>

                            )}


                            {customersQuery
                                .isError && (

                                <div className="px-4 py-8 text-center text-sm text-red-300">

                                    {t(
                                        "customerInfo.messages.customersLoadFailed"
                                    )}

                                </div>

                            )}


                            {!customersQuery
                                    .isLoading &&
                                !customersQuery
                                    .isError &&
                                (
                                    customersQuery
                                        .data
                                        ?.length ||
                                    0
                                ) ===
                                0 && (

                                    <div className="px-4 py-8 text-center text-sm text-white/50">

                                        {t(
                                            "customerInfo.savedCustomers.empty"
                                        )}

                                    </div>

                                )}


                            {(
                                customersQuery
                                    .data ||
                                []
                            ).map(
                                (
                                    customer
                                ) => {

                                    const isCurrent =
                                        String(
                                            customer
                                                ?._id ||
                                            ""
                                        ) ===
                                        currentCustomerId;


                                    return (

                                        <div key={customer._id}><button

                                            type="button"

                                            disabled={
                                                selectSavedCustomerMutation
                                                    .isPending
                                            }

                                            onClick={() =>
                                                selectSavedCustomerMutation
                                                    .mutate(
                                                        customer
                                                    )
                                            }

                                            className={`
                                    w-full
                                    rounded-xl
                                    border
                                    px-4
                                    py-3
                                    mb-2
                                    text-left
                                    transition
                                    disabled:opacity-50
                                    ${
                                                isCurrent
                                                    ? "border-[#38bdf8]/50 bg-[#38bdf8]/10"
                                                    : "border-white/5 bg-white/[0.025] hover:border-white/10 hover:bg-white/5"
                                            }
                                `}
                                        >

                                            <div className="flex items-start justify-between gap-3">

                                                <div className="min-w-0">

                                                    <p className="truncate font-semibold text-white">

                                                        {customer
                                                                ?.name ||
                                                            t(
                                                                "customerInfo.finalConsumer"
                                                            )
                                                        }

                                                    </p>


                                                    <p className="mt-1 truncate text-xs text-white/50">

                                                        {customer
                                                                ?.phone ||
                                                            t(
                                                                "customerInfo.noPhone"
                                                            )
                                                        }

                                                    </p>


                                                    {customer
                                                        ?.address && (

                                                        <p className="mt-1 truncate text-[11px] text-white/35">

                                                            {
                                                                customer.address
                                                            }

                                                        </p>

                                                    )}

                                                </div>


                                                {isCurrent && (

                                                    <span className="shrink-0 rounded-full border border-[#38bdf8]/30 bg-[#38bdf8]/10 px-2 py-1 text-[10px] font-semibold text-[#38bdf8]">

                                            {t(
                                                "customerInfo.savedCustomers.current"
                                            )}

                                        </span>

                                                )}

                                            </div>

                                        </button><div className="flex justify-end gap-3 mb-2"><button type="button" className="text-xs text-blue-300 px-2 py-2" onClick={()=>{setManagerCustomer(customer);setManagerOpen(true);}}>Editar</button><DeleteCustomerAction customer={customer}/></div></div>

                                    );

                                }
                            )}

                        </div>


                        {/* FOOTER */}

                        <div className="border-t border-white/10 p-4">

                            <button
                                type="button"

                                disabled={
                                    selectSavedCustomerMutation
                                        .isPending
                                }

                                onClick={() =>
                                    setIsCustomerPickerOpen(
                                        false
                                    )
                                }

                                className="
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        bg-[#1f1f1f]
                        px-4
                        py-3
                        font-semibold
                        text-[#ababab]
                        transition
                        hover:bg-[#292929]
                        hover:text-white
                        disabled:opacity-50
                    "
                            >

                                {selectSavedCustomerMutation
                                    .isPending
                                    ? t(
                                        "customerInfo.savedCustomers.selecting"
                                    )
                                    : t(
                                        "common.close"
                                    )
                                }

                            </button>

                        </div>

                    </div>

                </div>

            )}

            {/* =====================================================
                MODAL EDITAR CLIENTE
            ===================================================== */}

            {isEditOpen && (

                <div
                    className="
                        fixed
                        inset-0
                        z-[10000]
                        flex
                        items-center
                        justify-center
                        bg-black/75
                        backdrop-blur-sm
                        p-4
                    "

                    onClick={() => {

                        if (
                            !updateCustomerMutation
                                .isPending
                        ) {
                            setIsEditOpen(
                                false
                            );
                        }

                    }}
                >

                    <div
                        className="
                            w-full
                            max-w-md
                            overflow-hidden
                            rounded-3xl
                            border
                            border-white/10
                            bg-gradient-to-br
                            from-[#171717]
                            via-[#111111]
                            to-[#080808]
                            shadow-2xl
                        "

                        onClick={(
                            e
                        ) =>
                            e.stopPropagation()
                        }
                    >

                        {/* HEADER */}

                        <div className="flex items-start justify-between border-b border-white/10 p-5">

                            <div>

                                <h3 className="text-xl font-bold text-white">

                                    {t(
                                        "customerInfo.title"
                                    )}

                                </h3>


                                <p className="mt-1 text-xs text-white/50">

                                    {t(
                                        "customerInfo.description"
                                    )}

                                </p>

                            </div>


                            <button
                                type="button"

                                disabled={
                                    updateCustomerMutation
                                        .isPending
                                }

                                onClick={() =>
                                    setIsEditOpen(
                                        false
                                    )
                                }

                                className="
                                    flex
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-white/5
                                    text-white/60
                                    transition
                                    hover:bg-white/10
                                    hover:text-white
                                "
                            >

                                <FiX
                                    size={
                                        18
                                    }
                                />

                            </button>

                        </div>


                        {/* CAMPOS */}

                        <div className="p-5">

                            <div className="space-y-4">

                                {/* NOMBRE */}

                                <div>

                                    <label className="mb-2 block text-xs font-semibold text-[#ababab]">

                                        {t(
                                            "customerInfo.customerName"
                                        )}

                                    </label>


                                    <div className="relative">

                                        <FiUser
                                            size={
                                                17
                                            }

                                            className="
                                                absolute
                                                left-4
                                                top-1/2
                                                -translate-y-1/2
                                                text-[#777]
                                            "
                                        />


                                        <input
                                            type="text"

                                            value={
                                                editName
                                            }

                                            onChange={(
                                                e
                                            ) =>
                                                setEditName(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }

                                            placeholder={
                                                t(
                                                    "customerInfo.namePlaceholder"
                                                )
                                            }

                                            autoFocus

                                            className="
                                                w-full
                                                rounded-xl
                                                border
                                                border-white/10
                                                bg-[#1b1b1b]
                                                py-3
                                                pl-11
                                                pr-4
                                                text-sm
                                                text-white
                                                outline-none
                                                transition
                                                placeholder:text-white/20
                                                focus:border-[#38bdf8]/70
                                                focus:ring-1
                                                focus:ring-[#38bdf8]/30
                                            "
                                        />

                                    </div>

                                </div>


                                {/* TELÉFONO */}

                                <div>

                                    <label className="mb-2 block text-xs font-semibold text-[#ababab]">

                                        {t(
                                            "customerInfo.phone"
                                        )}

                                    </label>


                                    <div className="relative">

                                        <FiPhone
                                            size={
                                                17
                                            }

                                            className="
                                                absolute
                                                left-4
                                                top-1/2
                                                -translate-y-1/2
                                                text-[#777]
                                            "
                                        />


                                        <input
                                            type="tel"

                                            value={
                                                editPhone
                                            }

                                            onChange={(
                                                e
                                            ) =>
                                                setEditPhone(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }

                                            placeholder={
                                                t(
                                                    "customerInfo.phonePlaceholder"
                                                )
                                            }

                                            className="
                                                w-full
                                                rounded-xl
                                                border
                                                border-white/10
                                                bg-[#1b1b1b]
                                                py-3
                                                pl-11
                                                pr-4
                                                text-sm
                                                text-white
                                                outline-none
                                                transition
                                                placeholder:text-white/20
                                                focus:border-[#38bdf8]/70
                                                focus:ring-1
                                                focus:ring-[#38bdf8]/30
                                            "
                                        />

                                    </div>

                                </div>


                                {/* =================================
                                    IDENTIFICACIÓN FISCAL
                                ================================= */}

                                <div className="border-t border-white/10 pt-4 mt-5">

                                    <div className="mb-4">

                                        <p className="text-sm font-semibold text-white">

                                            {t(
                                                "customerInfo.taxIdentity"
                                            )}

                                        </p>


                                        <p className="mt-1 text-xs text-white/40">

                                            {t(
                                                "customerInfo.taxIdentityDescription"
                                            )}

                                        </p>

                                    </div>


                                    <div className="space-y-4">

                                        {/* PAÍS */}

                                        <div>

                                            <label className="mb-2 block text-xs font-semibold text-[#ababab]">

                                                {t(
                                                    "customerInfo.country"
                                                )}

                                            </label>


                                            <select
                                                value={
                                                    editTaxCountryCode
                                                }

                                                onChange={(
                                                    e
                                                ) =>
                                                    handleTaxCountryChange(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }

                                                className="
                                                    w-full
                                                    rounded-xl
                                                    border
                                                    border-white/10
                                                    bg-[#1b1b1b]
                                                    px-4
                                                    py-3
                                                    text-sm
                                                    text-white
                                                    outline-none
                                                    transition
                                                    focus:border-[#38bdf8]/70
                                                    focus:ring-1
                                                    focus:ring-[#38bdf8]/30
                                                "
                                            >

                                                {COUNTRY_OPTIONS.map(
                                                    (
                                                        country
                                                    ) => (

                                                        <option
                                                            key={
                                                                country
                                                                    .code
                                                            }

                                                            value={
                                                                country
                                                                    .code
                                                            }
                                                        >

                                                            {country.flag
                                                                ? `${country.flag} `
                                                                : ""
                                                            }

                                                            {regionDisplayNames
                                                                    ?.of(
                                                                        country.code
                                                                    ) ||
                                                                country.name
                                                            }

                                                        </option>

                                                    )
                                                )}

                                            </select>

                                        </div>


                                        {/* TIPO + ETIQUETA */}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                            <div>

                                                <label className="mb-2 block text-xs font-semibold text-[#ababab]">

                                                    {t(
                                                        "customerInfo.type"
                                                    )}

                                                </label>


                                                <input
                                                    type="text"

                                                    value={
                                                        editTaxType
                                                    }

                                                    onChange={(
                                                        e
                                                    ) =>
                                                        setEditTaxType(
                                                            e
                                                                .target
                                                                .value
                                                                .toUpperCase()
                                                        )
                                                    }

                                                    placeholder="RNC, CEDULA, EIN, VAT..."

                                                    maxLength={
                                                        40
                                                    }

                                                    className="
                                                        w-full
                                                        rounded-xl
                                                        border
                                                        border-white/10
                                                        bg-[#1b1b1b]
                                                        px-4
                                                        py-3
                                                        text-sm
                                                        text-white
                                                        outline-none
                                                        transition
                                                        placeholder:text-white/20
                                                        focus:border-[#38bdf8]/70
                                                        focus:ring-1
                                                        focus:ring-[#38bdf8]/30
                                                    "
                                                />

                                            </div>


                                            <div>

                                                <label className="mb-2 block text-xs font-semibold text-[#ababab]">

                                                    {t(
                                                        "customerInfo.label"
                                                    )}

                                                </label>


                                                <input
                                                    type="text"

                                                    value={
                                                        editTaxLabel
                                                    }

                                                    onChange={(
                                                        e
                                                    ) =>
                                                        setEditTaxLabel(
                                                            e
                                                                .target
                                                                .value
                                                        )
                                                    }

                                                    placeholder={
                                                        t(
                                                            "customerInfo.visibleNamePlaceholder"
                                                        )
                                                    }

                                                    maxLength={
                                                        80
                                                    }

                                                    className="
                                                        w-full
                                                        rounded-xl
                                                        border
                                                        border-white/10
                                                        bg-[#1b1b1b]
                                                        px-4
                                                        py-3
                                                        text-sm
                                                        text-white
                                                        outline-none
                                                        transition
                                                        placeholder:text-white/20
                                                        focus:border-[#38bdf8]/70
                                                        focus:ring-1
                                                        focus:ring-[#38bdf8]/30
                                                    "
                                                />

                                            </div>

                                        </div>


                                        {/* VALOR */}

                                        <div>

                                            <label className="mb-2 block text-xs font-semibold text-[#ababab]">

                                                {editTaxLabel ||
                                                    editTaxType ||
                                                    t(
                                                        "customerInfo.taxNumber"
                                                    )
                                                }

                                            </label>


                                            <input
                                                type="text"

                                                value={
                                                    editTaxValue
                                                }

                                                onChange={(
                                                    e
                                                ) =>
                                                    setEditTaxValue(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }

                                                placeholder={
                                                    t(
                                                        "customerInfo.taxNumberPlaceholder"
                                                    )
                                                }

                                                maxLength={
                                                    120
                                                }

                                                className="
                                                    w-full
                                                    rounded-xl
                                                    border
                                                    border-white/10
                                                    bg-[#1b1b1b]
                                                    px-4
                                                    py-3
                                                    text-sm
                                                    text-white
                                                    outline-none
                                                    transition
                                                    placeholder:text-white/20
                                                    focus:border-[#38bdf8]/70
                                                    focus:ring-1
                                                    focus:ring-[#38bdf8]/30
                                                "
                                            />

                                        </div>


                                        {editTaxCountryCode ===
                                            "DO" && (

                                                <p className="text-[11px] leading-5 text-white/40">
                                                    Para personas físicas puedes cambiar el tipo manualmente de RNC a CEDULA.
                                                </p>

                                            )}

                                    </div>

                                </div>

                            </div>


                            {/* INFORMACIÓN */}

                            <div className="mt-4 rounded-xl border border-[#38bdf8]/10 bg-[#38bdf8]/5 px-4 py-3">

                                <p className="text-xs leading-5 text-[#c8c8c8]">

                                    {t(
                                        "customerInfo.emptyNameInfo"
                                    )}{" "}

                                    <span className="font-semibold text-[#38bdf8]">

                                        {t(
                                            "customerInfo.finalConsumer"
                                        )}

                                    </span>

                                    .

                                </p>

                            </div>


                            <p role="status" className="text-xs text-sky-200">{{LOADING:'Consultando RNC…',FOUND:'Encontrado; se conserva el nombre manual.',NOT_FOUND:'No encontrado. Completa el nombre manualmente.',ERROR:'Error consultando RNC.'}[editorLookup.status]}</p>
                            {editCustomerError&&<p role="alert" className="mt-3 text-sm text-red-300">{editCustomerError}</p>}
                            {editNeedsConfirmation&&<label className="flex gap-2 mt-3 text-sm text-sky-200"><input type="checkbox" checked={editDistinctConfirmed} onChange={e=>setEditDistinctConfirmed(e.target.checked)}/>Confirmo que es otra persona con una identificación fiscal distinta.</label>}
                            {currentCustomerId&&<div className="mt-3"><DeleteCustomerAction customer={{_id:currentCustomerId,name:editName}} onDeleted={()=>setIsEditOpen(false)}/></div>}
                            {/* BOTONES */}

                            <div className="mt-6 grid grid-cols-2 gap-3">

                                <button
                                    type="button"

                                    disabled={
                                        updateCustomerMutation
                                            .isPending
                                    }

                                    onClick={() =>
                                        setIsEditOpen(
                                            false
                                        )
                                    }

                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-white/10
                                        bg-[#1f1f1f]
                                        px-4
                                        py-3
                                        font-semibold
                                        text-[#ababab]
                                        transition
                                        hover:bg-[#292929]
                                        hover:text-white
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                >

                                    {t(
                                        "common.cancel"
                                    )}

                                </button>


                                <button
                                    type="button"

                                    disabled={
                                        updateCustomerMutation
                                            .isPending
                                    }

                                    onClick={
                                        handleSaveCustomer
                                    }

                                    className="
                                        w-full
                                        rounded-xl
                                        bg-[#38bdf8]
                                        px-4
                                        py-3
                                        font-bold
                                        text-black
                                        transition
                                        hover:bg-[#26baff]
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                >

                                    {updateCustomerMutation
                                        .isPending
                                        ? t(
                                            "customerInfo.saving"
                                        )
                                        : t(
                                            "common.save"
                                        )
                                    }

                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            )}

        {managerOpen&&<CustomerManager key={managerCustomer?._id||'list'} initialCustomer={managerCustomer} onClose={()=>setManagerOpen(false)}/>}
            </>
    );
};


export default CustomerInfo;