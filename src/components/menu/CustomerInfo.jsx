import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { FiEdit3, FiPhone, FiUser, FiX } from "react-icons/fi";

import { setCustomer } from "../../redux/slices/customerSlice";
import { updateOrder } from "../../https";
import { formatDate, getAvatarName } from "../../utils";


const getTableLabel = (table) => {
    if (!table) return "N/A";

    if (typeof table === "string") {
        return "Mesa seleccionada";
    }

    return (
        table?.tableNo ||
        table?.tableNumber ||
        table?.name ||
        table?.label ||
        table?.areaName ||
        "Mesa seleccionada"
    );
};


const safeDateForFormat = (value, fallback) => {
    if (!value) return fallback;

    if (value instanceof Date) {
        return value;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return fallback;
    }

    return parsed;
};


const CustomerInfo = ({ order }) => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();

    const draft = useSelector(
        (state) => state.customer || {}
    );

    const [dateTime] = useState(
        new Date()
    );

    const [
        isEditOpen,
        setIsEditOpen,
    ] = useState(false);

    const [
        editName,
        setEditName,
    ] = useState("");

    const [
        editPhone,
        setEditPhone,
    ] = useState("");


    /* =====================================================
       DATOS DEL CLIENTE
    ===================================================== */

    const customerName = useMemo(() => {
        return (
            order?.customerDetails?.name ||
            order?.customerName ||
            draft?.customerName ||
            draft?.name ||
            "Consumidor Final"
        );
    }, [
        order?.customerDetails?.name,
        order?.customerName,
        draft?.customerName,
        draft?.name,
    ]);


    const customerPhone = useMemo(() => {
        return (
            order?.customerDetails?.phone ||
            draft?.customerPhone ||
            draft?.phone ||
            ""
        );
    }, [
        order?.customerDetails?.phone,
        draft?.customerPhone,
        draft?.phone,
    ]);


    const tableLabel = useMemo(() => {
        return getTableLabel(
            order?.table ||
            draft?.table
        );
    }, [
        order?.table,
        draft?.table,
    ]);


    const displayDate = useMemo(() => {
        return safeDateForFormat(
            order?.createdAt,
            dateTime
        );
    }, [
        order?.createdAt,
        dateTime,
    ]);


    /* =====================================================
       ABRIR EDITOR
    ===================================================== */

    const openCustomerEditor = () => {
        setEditName(
            customerName === "Consumidor Final"
                ? ""
                : customerName
        );

        setEditPhone(
            customerPhone || ""
        );

        setIsEditOpen(true);
    };


    /* =====================================================
       GUARDAR CLIENTE
    ===================================================== */

    const updateCustomerMutation =
        useMutation({
            mutationFn: async () => {
                const cleanName =
                    String(
                        editName || ""
                    ).trim();

                const cleanPhone =
                    String(
                        editPhone || ""
                    ).trim();

                const finalName =
                    cleanName ||
                    "Consumidor Final";


                const customerId =
                    order?.customerId?._id ||
                    order?.customerId ||
                    draft?.customerId ||
                    null;


                const address =
                    order?.customerDetails?.address ||
                    draft?.customerAddress ||
                    draft?.address ||
                    "";


                const guests =
                    Number(
                        order?.customerDetails
                            ?.guests ??
                        draft?.guests ??
                        0
                    );


                const customerPayload = {
                    customerId,
                    name: finalName,
                    phone: cleanPhone,
                    address,
                    guests,
                };


                /*
                 * Primero actualizamos Redux.
                 *
                 * Esto permite que funcione aunque
                 * todavía no exista una orden en BD.
                 */
                dispatch(
                    setCustomer(
                        customerPayload
                    )
                );


                /*
                 * Si todavía NO existe una orden,
                 * no necesitamos llamar al backend.
                 */
                if (!order?._id) {
                    return {
                        localOnly: true,
                        customerPayload,
                    };
                }


                /*
                 * Si la orden YA existe,
                 * actualizamos customerDetails.
                 */
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

                                rnc:
                                    order
                                        ?.customerDetails
                                        ?.rnc ||
                                    "",

                                rncCedula:
                                    order
                                        ?.customerDetails
                                        ?.rncCedula ||
                                    "",
                            },

                            submitAction:
                                "update_customer",
                        }
                    );


                return response;
            },


            onSuccess: () => {
                setIsEditOpen(false);

                /*
                 * Actualizar cache de la orden
                 */
                if (order?._id) {
                    queryClient.invalidateQueries({
                        queryKey: [
                            "order",
                            order._id,
                        ],
                    });
                }


                queryClient.invalidateQueries({
                    queryKey: ["orders"],
                });


                enqueueSnackbar(
                    "Datos del cliente actualizados.",
                    {
                        variant:
                            "success",
                    }
                );
            },


            onError: (error) => {
                console.error(
                    "[CUSTOMER INFO] Error actualizando cliente:",
                    error?.response
                        ?.data ||
                    error
                );


                enqueueSnackbar(
                    error?.response?.data
                        ?.message ||
                    "No se pudieron actualizar los datos del cliente.",
                    {
                        variant:
                            "error",
                    }
                );
            },
        });


    /* =====================================================
       GUARDAR
    ===================================================== */

    const handleSaveCustomer = () => {
        if (
            updateCustomerMutation
                .isPending
        ) {
            return;
        }

        updateCustomerMutation.mutate();
    };


    return (
        <>
            {/* =====================================================
                INFORMACIÓN SUPERIOR
            ===================================================== */}

            <div className="flex items-center justify-between px-4 py-3">

                <div className="flex flex-col items-start">

                    {/* CLIENTE EDITABLE */}

                    <button
                        type="button"
                        onClick={
                            openCustomerEditor
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
                        title="Editar nombre y teléfono"
                    >

                        <div className="flex items-center gap-2">

                            <h1 className="text-md text-[#f5f5f5] font-semibold tracking-wide">
                                {customerName}
                            </h1>

                            <FiEdit3
                                size={14}
                                className="
                                    text-[#777]
                                    transition-colors
                                    group-hover:text-[#f6b100]
                                "
                            />

                        </div>


                        <p className="text-xs text-[#ababab] font-medium mt-1">
                            {customerPhone
                                ? customerPhone
                                : "Sin teléfono"}
                        </p>

                    </button>


                    {/* MESA */}

                    <p className="text-xs text-[#ababab] font-medium mt-1">
                        Mesa:{" "}
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
                        openCustomerEditor
                    }
                    title="Editar cliente"
                    className="
                        bg-[#f6b100]
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
                    ) || "CF"}
                </button>

            </div>


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
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        {/* HEADER */}

                        <div className="flex items-start justify-between border-b border-white/10 p-5">

                            <div>

                                <h3 className="text-xl font-bold text-white">
                                    Datos del cliente
                                </h3>

                                <p className="mt-1 text-xs text-white/50">
                                    Estos datos aparecerán en la factura.
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
                                    size={18}
                                />
                            </button>

                        </div>


                        {/* CAMPOS */}

                        <div className="p-5">

                            <div className="space-y-4">

                                {/* NOMBRE */}

                                <div>

                                    <label className="mb-2 block text-xs font-semibold text-[#ababab]">
                                        Nombre del cliente
                                    </label>


                                    <div className="relative">

                                        <FiUser
                                            size={17}
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
                                            placeholder="Ej: Juan Pérez"
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
                                                focus:border-[#f6b100]/70
                                                focus:ring-1
                                                focus:ring-[#f6b100]/30
                                            "
                                        />

                                    </div>

                                </div>


                                {/* TELÉFONO */}

                                <div>

                                    <label className="mb-2 block text-xs font-semibold text-[#ababab]">
                                        Teléfono
                                    </label>


                                    <div className="relative">

                                        <FiPhone
                                            size={17}
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
                                            placeholder="Ej: 809-555-5555"
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
                                                focus:border-[#f6b100]/70
                                                focus:ring-1
                                                focus:ring-[#f6b100]/30
                                            "
                                        />

                                    </div>

                                </div>

                            </div>


                            {/* INFORMACIÓN */}

                            <div className="mt-4 rounded-xl border border-[#f6b100]/10 bg-[#f6b100]/5 px-4 py-3">

                                <p className="text-xs leading-5 text-[#c8c8c8]">
                                    Puedes dejar el nombre vacío y la factura utilizará{" "}
                                    <span className="font-semibold text-[#f6b100]">
                                        Consumidor Final
                                    </span>
                                    .
                                </p>

                            </div>


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
                                    Cancelar
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
                                        bg-[#f6b100]
                                        px-4
                                        py-3
                                        font-bold
                                        text-black
                                        transition
                                        hover:bg-[#ffc526]
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                >
                                    {updateCustomerMutation
                                        .isPending
                                        ? "Guardando..."
                                        : "Guardar"}
                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            )}

        </>
    );
};


export default CustomerInfo;