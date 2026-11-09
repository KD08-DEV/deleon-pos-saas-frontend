import React, { useEffect, useMemo, useState } from "react";
import { register } from "../../https";
import api, { getScope } from "../../lib/api";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";


const EMPTY_USER_FORM = {
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
};


const EMPTY_REGISTER_FORM = {
    code: "",
    name: "",
    location: "",
    sortOrder: 0,
    isActive: true,
    defaultCashierUserId: "",
};


const AdminRegister = () => {

    const { t } =
        useTranslation();


    const [
        activeTab,
        setActiveTab,
    ] =
        useState(
            "users"
        );


    const [
        formData,
        setFormData,
    ] =
        useState(
            EMPTY_USER_FORM
        );


    const [
        registerForm,
        setRegisterForm,
    ] =
        useState(
            EMPTY_REGISTER_FORM
        );


    const [
        editingRegisterId,
        setEditingRegisterId,
    ] =
        useState(
            null
        );


    const [
        showInactiveRegisters,
        setShowInactiveRegisters,
    ] =
        useState(
            true
        );


    const user =
        useSelector(
            (
                state
            ) =>
                state.user
        );


    const navigate =
        useNavigate();


    const queryClient =
        useQueryClient();
    const activeBranchId = getScope().clientId || "default";
    const { data: branchResponse } = useQuery({
        queryKey: ["branches", getScope().tenantId],
        queryFn: async () => (await api.get("/api/clients")).data,
        staleTime: 30_000,
    });
    const branches = Array.isArray(branchResponse?.data) ? branchResponse.data : [];
    const activeBranchName = branches.find(b => b.clientId === activeBranchId)?.name || (activeBranchId === "default" ? "Sucursal principal" : activeBranchId);


    // =====================================================
    // ROLES
    // =====================================================

    /*
     * IMPORTANTE:
     *
     * "value" conserva el valor que espera el backend.
     * "label" es únicamente lo que ve el usuario.
     */

    const roleOptions = [
        {
            value:
                "Camarero",

            label:
                t(
                    "adminRegisterPage.roles.waiter"
                ),
        },

        {
            value:
                "Cocina",

            label:
                t(
                    "adminRegisterPage.roles.kitchen"
                ),
        },

        {
            value:
                "Cajera",

            label:
                t(
                    "adminRegisterPage.roles.cashier"
                ),
        },

        {
            value:
                "Admin",

            label:
                t(
                    "adminRegisterPage.roles.admin"
                ),
        },
    ];


    const getRoleLabel =
        (
            role
        ) => {

            const normalized =
                String(
                    role ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (
                normalized ===
                "camarero"
            ) {
                return t(
                    "adminRegisterPage.roles.waiter"
                );
            }


            if (
                normalized ===
                "cocina"
            ) {
                return t(
                    "adminRegisterPage.roles.kitchen"
                );
            }


            if (
                normalized ===
                "cajera"
            ) {
                return t(
                    "adminRegisterPage.roles.cashier"
                );
            }


            if (
                normalized ===
                "admin"
            ) {
                return t(
                    "adminRegisterPage.roles.admin"
                );
            }


            return (
                role ||
                "—"
            );
        };


    // =====================================================
    // CONTROL DE ACCESO
    // =====================================================

    useEffect(
        () => {

            if (
                !user?.userData ||
                user?.userData?.role !==
                "Admin"
            ) {

                enqueueSnackbar(
                    t(
                        "adminRegisterPage.messages.accessDenied"
                    ),
                    {
                        variant:
                            "error",
                    }
                );


                navigate(
                    "/"
                );
            }

        },
        [
            user,
            navigate,
            t,
        ]
    );


    // =====================================================
    // USUARIOS
    // =====================================================

    const handleChange =
        (
            e
        ) => {

            setFormData({
                ...formData,

                [
                    e.target
                        .name
                    ]:
                e.target
                    .value,
            });
        };


    const handleRoleSelection =
        (
            selectedRole
        ) => {

            setFormData({
                ...formData,

                role:
                selectedRole,
            });
        };


    const handleSubmit =
        (
            e
        ) => {

            e.preventDefault();

            registerMutation
                .mutate(
                    formData
                );
        };


    const registerMutation =
        useMutation({

            mutationFn:
                (
                    reqData
                ) =>
                    register(
                        { ...reqData, clientIds: [activeBranchId] }
                    ),


            onSuccess:
                (
                    res
                ) => {

                    const {
                        data,
                    } =
                        res;


                    enqueueSnackbar(
                        data
                            .message ||
                        t(
                            "adminRegisterPage.messages.userCreated"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );


                    setFormData(
                        EMPTY_USER_FORM
                    );


                    queryClient
                        .invalidateQueries({
                            queryKey: [
                                "admin/users",
                            ],
                        });
                },


            onError:
                (
                    error
                ) => {

                    const message =
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "adminRegisterPage.messages.userCreateFailed"
                        );


                    enqueueSnackbar(
                        message,
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


    const {
        data:
            usersResp,

        isLoading:
            usersLoading,

        refetch:
            refetchUsers,
    } =
        useQuery({

            queryKey: [
                "admin/users", activeBranchId,
            ],


            queryFn:
                async () => {

                    const res =
                        await api
                            .get(
                                "/api/admin/users"
                            );


                    return res
                        .data;
                },


            staleTime:
                60_000,
        });


    const users =
        useMemo(
            () => {

                const raw =
                    usersResp
                        ?.data;


                if (
                    Array.isArray(
                        raw
                    )
                ) {
                    return raw;
                }


                if (
                    Array.isArray(
                        usersResp
                    )
                ) {
                    return usersResp;
                }


                return [];
            },
            [
                usersResp,
            ]
        );


    const cashierUsers =
        useMemo(
            () => {

                return users.filter(
                    (
                        u
                    ) =>
                        String(
                            u?.role ||
                            ""
                        )
                            .toLowerCase() ===
                        "cajera" ||
                        String(
                            u?.role ||
                            ""
                        )
                            .toLowerCase() ===
                        "admin"
                );
            },
            [
                users,
            ]
        );


    // =====================================================
    // CAJAS
    // =====================================================

    const {
        data:
            registersResp,

        isLoading:
            registersLoading,

        refetch:
            refetchRegisters,
    } =
        useQuery({

            queryKey: [
                "admin/registers",
                showInactiveRegisters,
            ],


            queryFn:
                async () => {

                    const res =
                        await api
                            .get(
                                "/api/admin/registers",
                                {
                                    params: {
                                        includeInactive:
                                            showInactiveRegisters
                                                ? 1
                                                : 0,
                                    },
                                }
                            );


                    return res
                        .data;
                },


            staleTime:
                30_000,
        });


    const registers =
        useMemo(
            () => {

                const raw =
                    registersResp
                        ?.data;


                if (
                    Array.isArray(
                        raw
                    )
                ) {
                    return raw;
                }


                if (
                    Array.isArray(
                        registersResp
                    )
                ) {
                    return registersResp;
                }


                return [];
            },
            [
                registersResp,
            ]
        );


    // =====================================================
    // CREAR CAJA
    // =====================================================

    const createRegisterMutation =
        useMutation({

            mutationFn:
                async (
                    payload
                ) => {

                    const res =
                        await api
                            .post(
                                "/api/admin/registers",
                                payload
                            );


                    return res
                        .data;
                },


            onSuccess:
                () => {

                    enqueueSnackbar(
                        t(
                            "adminRegisterPage.messages.registerCreated"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );


                    setRegisterForm(
                        EMPTY_REGISTER_FORM
                    );


                    setEditingRegisterId(
                        null
                    );


                    refetchRegisters();
                },


            onError:
                (
                    error
                ) => {

                    const message =
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "adminRegisterPage.messages.registerCreateFailed"
                        );


                    enqueueSnackbar(
                        message,
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


    // =====================================================
    // ACTUALIZAR CAJA
    // =====================================================

    const updateRegisterMutation =
        useMutation({

            mutationFn:
                async ({
                           id,
                           payload,
                       }) => {

                    const res =
                        await api
                            .put(
                                `/api/admin/registers/${id}`,
                                payload
                            );


                    return res
                        .data;
                },


            onSuccess:
                () => {

                    enqueueSnackbar(
                        t(
                            "adminRegisterPage.messages.registerUpdated"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );


                    setRegisterForm(
                        EMPTY_REGISTER_FORM
                    );


                    setEditingRegisterId(
                        null
                    );


                    refetchRegisters();
                },


            onError:
                (
                    error
                ) => {

                    const message =
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "adminRegisterPage.messages.registerUpdateFailed"
                        );


                    enqueueSnackbar(
                        message,
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


    // =====================================================
    // ACTIVAR / DESACTIVAR CAJA
    // =====================================================

    const toggleRegisterMutation =
        useMutation({

            mutationFn:
                async ({
                           id,
                           isActive,
                       }) => {

                    const res =
                        await api
                            .patch(
                                `/api/admin/registers/${id}/toggle`,
                                {
                                    isActive,
                                }
                            );


                    return res
                        .data;
                },


            onSuccess:
                () => {

                    enqueueSnackbar(
                        t(
                            "adminRegisterPage.messages.registerStatusUpdated"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );


                    refetchRegisters();
                },


            onError:
                (
                    error
                ) => {

                    const message =
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "adminRegisterPage.messages.registerStatusUpdateFailed"
                        );


                    enqueueSnackbar(
                        message,
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


    // =====================================================
    // FORMULARIO CAJA
    // =====================================================

    const handleRegisterFormChange =
        (
            e
        ) => {

            const {
                name,
                value,
                type,
                checked,
            } =
                e.target;


            setRegisterForm(
                (
                    prev
                ) => ({
                    ...prev,

                    [name]:
                        type ===
                        "checkbox"
                            ? checked
                            : name ===
                            "sortOrder"
                                ? Number(
                                    value
                                )
                                : value,
                })
            );
        };


    const handleRegisterSubmit =
        (
            e
        ) => {

            e.preventDefault();


            const payload = {

                code:
                    String(
                        registerForm
                            .code ||
                        ""
                    )
                        .trim()
                        .toUpperCase(),


                name:
                    String(
                        registerForm
                            .name ||
                        ""
                    )
                        .trim(),


                location:
                    String(
                        registerForm
                            .location ||
                        ""
                    )
                        .trim(),


                sortOrder:
                    Number(
                        registerForm
                            .sortOrder ||
                        0
                    ),


                isActive:
                    Boolean(
                        registerForm
                            .isActive
                    ),


                defaultCashierUserId:
                    registerForm
                        .defaultCashierUserId ||
                    null,
            };


            if (
                !payload.code
            ) {

                enqueueSnackbar(
                    t(
                        "adminRegisterPage.messages.registerCodeRequired"
                    ),
                    {
                        variant:
                            "warning",
                    }
                );


                return;
            }


            if (
                !payload.name
            ) {

                enqueueSnackbar(
                    t(
                        "adminRegisterPage.messages.registerNameRequired"
                    ),
                    {
                        variant:
                            "warning",
                    }
                );


                return;
            }


            if (
                editingRegisterId
            ) {

                updateRegisterMutation
                    .mutate({
                        id:
                        editingRegisterId,

                        payload,
                    });

            } else {

                createRegisterMutation
                    .mutate(
                        payload
                    );
            }
        };


    const handleEditRegister =
        (
            item
        ) => {

            setActiveTab(
                "registers"
            );


            setEditingRegisterId(
                item._id
            );


            setRegisterForm({

                code:
                    item.code ||
                    "",


                name:
                    item.name ||
                    "",


                location:
                    item.location ||
                    "",


                sortOrder:
                    Number(
                        item.sortOrder ||
                        0
                    ),


                isActive:
                    Boolean(
                        item.isActive
                    ),


                defaultCashierUserId:
                    item
                        ?.defaultCashierUserId
                        ?._id ||
                    item
                        ?.defaultCashierUserId ||
                    "",
            });
        };


    const handleCancelRegisterEdit =
        () => {

            setEditingRegisterId(
                null
            );


            setRegisterForm(
                EMPTY_REGISTER_FORM
            );
        };


    // =====================================================
    // UI
    // =====================================================

    return (

        <section className="bg-[#121212] min-h-screen px-4 py-8">

            <div className="max-w-6xl mx-auto">

                <div className="bg-[#1a1a1a] p-6 sm:p-8 rounded-2xl shadow-lg text-white">

                    {/* HEADER */}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">

                        <div>

                            <h1 className="text-2xl sm:text-3xl font-bold text-[#38bdf8]">

                                {t(
                                    "adminRegisterPage.title"
                                )}

                            </h1>


                            <p className="text-sm text-[#ababab] mt-1">

                                {t(
                                    "adminRegisterPage.subtitle"
                                )}

                            </p>

                        </div>


                        <button
                            type="button"

                            onClick={() =>
                                navigate(
                                    "/admin"
                                )
                            }

                            className="bg-[#38bdf8] text-black px-4 py-2 rounded-lg font-semibold hover:bg-[#7dd3fc] text-sm"
                        >

                            ←{" "}
                            {t(
                                "adminRegisterPage.actions.back"
                            )}

                        </button>

                    </div>


                    {/* TABS */}

                    <div className="flex flex-wrap gap-3 mb-8">

                        <button
                            type="button"

                            onClick={() =>
                                setActiveTab(
                                    "users"
                                )
                            }

                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                                activeTab ===
                                "users"
                                    ? "bg-[#38bdf8] text-black"
                                    : "bg-[#262626] text-[#ababab] hover:bg-[#333]"
                            }`}
                        >

                            {t(
                                "adminRegisterPage.tabs.users"
                            )}

                        </button>


                        <button
                            type="button"

                            onClick={() =>
                                setActiveTab(
                                    "registers"
                                )
                            }

                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                                activeTab ===
                                "registers"
                                    ? "bg-[#38bdf8] text-black"
                                    : "bg-[#262626] text-[#ababab] hover:bg-[#333]"
                            }`}
                        >

                            {t(
                                "adminRegisterPage.tabs.registers"
                            )}

                        </button>

                    </div>


                    {/* =====================================================
                        USUARIOS
                    ===================================================== */}

                    {activeTab ===
                        "users" && (

                            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">

                                {/* FORMULARIO USUARIO */}

                                <div className="bg-[#151515] rounded-2xl p-6 border border-[#2a2a2a]">

                                    <h2 className="text-xl font-bold text-white mb-5">

                                        {t(
                                            "adminRegisterPage.users.formTitle"
                                        )}
                                            <span className="ml-2 text-sky-300 text-xs">({activeBranchName})</span>

                                    </h2>


                                    <form
                                        onSubmit={
                                            handleSubmit
                                        }

                                        className="space-y-4"
                                    >

                                        {/* NOMBRE */}

                                        <div>

                                            <label className="block text-[#ababab] text-sm mb-2">

                                                {t(
                                                    "adminRegisterPage.users.fields.name"
                                                )}

                                            </label>


                                            <input
                                                type="text"

                                                name="name"

                                                value={
                                                    formData.name
                                                }

                                                onChange={
                                                    handleChange
                                                }

                                                placeholder={
                                                    t(
                                                        "adminRegisterPage.users.placeholders.name"
                                                    )
                                                }

                                                className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#38bdf8] outline-none"

                                                required
                                            />

                                        </div>


                                        {/* EMAIL */}

                                        <div>

                                            <label className="block text-[#ababab] text-sm mb-2">

                                                {t(
                                                    "adminRegisterPage.users.fields.email"
                                                )}

                                            </label>


                                            <input
                                                type="email"

                                                name="email"

                                                value={
                                                    formData.email
                                                }

                                                onChange={
                                                    handleChange
                                                }

                                                placeholder={
                                                    t(
                                                        "adminRegisterPage.users.placeholders.email"
                                                    )
                                                }

                                                className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#38bdf8] outline-none"

                                                required
                                            />

                                        </div>


                                        {/* TELÉFONO */}

                                        <div>

                                            <label className="block text-[#ababab] text-sm mb-2">

                                                {t(
                                                    "adminRegisterPage.users.fields.phone"
                                                )}
                                                {" "}

                                                <span className="text-xs text-[#777]">

                                                {t(
                                                    "adminRegisterPage.common.optional"
                                                )}

                                            </span>

                                            </label>


                                            <input
                                                type="tel"

                                                name="phone"

                                                value={
                                                    formData.phone
                                                }

                                                onChange={
                                                    handleChange
                                                }

                                                placeholder={
                                                    t(
                                                        "adminRegisterPage.users.placeholders.phone"
                                                    )
                                                }

                                                className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#38bdf8] outline-none"
                                            />

                                        </div>


                                        {/* PASSWORD */}

                                        <div>

                                            <label className="block text-[#ababab] text-sm mb-2">

                                                {t(
                                                    "adminRegisterPage.users.fields.password"
                                                )}

                                            </label>


                                            <input
                                                type="password"

                                                name="password"

                                                value={
                                                    formData.password
                                                }

                                                onChange={
                                                    handleChange
                                                }

                                                placeholder="••••••••"

                                                className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#38bdf8] outline-none"

                                                required
                                            />

                                        </div>


                                        {/* ROL */}

                                        <div>

                                            <label className="block text-[#ababab] text-sm mb-3">

                                                {t(
                                                    "adminRegisterPage.users.fields.role"
                                                )}

                                            </label>


                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                                                {roleOptions.map(
                                                    (
                                                        roleOption
                                                    ) => (

                                                        <button
                                                            key={
                                                                roleOption.value
                                                            }

                                                            type="button"

                                                            onClick={() =>
                                                                handleRoleSelection(
                                                                    roleOption.value
                                                                )
                                                            }

                                                            className={`px-4 py-3 rounded-lg font-semibold transition text-sm ${
                                                                formData.role ===
                                                                roleOption.value
                                                                    ? "bg-[#38bdf8] text-black"
                                                                    : "bg-[#262626] text-[#ababab] hover:bg-[#333]"
                                                            }`}
                                                        >

                                                            {
                                                                roleOption.label
                                                            }

                                                        </button>

                                                    )
                                                )}

                                            </div>

                                        </div>


                                        <button
                                            type="submit"

                                            disabled={
                                                registerMutation
                                                    .isPending
                                            }

                                            className="w-full mt-6 py-3 bg-[#38bdf8] text-black font-bold rounded-lg text-lg hover:bg-[#7dd3fc] transition disabled:opacity-60"
                                        >

                                            {registerMutation
                                                .isPending
                                                ? t(
                                                    "adminRegisterPage.actions.registering"
                                                )
                                                : t(
                                                    "adminRegisterPage.actions.registerUser"
                                                )
                                            }

                                        </button>

                                    </form>

                                </div>


                                {/* LISTA CAJERAS / ADMIN */}

                                <div className="bg-[#151515] rounded-2xl p-6 border border-[#2a2a2a]">

                                    <div className="flex items-center justify-between mb-4">

                                        <h3 className="text-lg font-bold text-white">

                                            {t(
                                                "adminRegisterPage.users.cashiersTitle"
                                            )}

                                        </h3>


                                        <button
                                            type="button"

                                            onClick={() =>
                                                refetchUsers()
                                            }

                                            className="text-sm bg-[#262626] px-3 py-2 rounded-lg hover:bg-[#333] text-[#38bdf8]"
                                        >

                                            {t(
                                                "adminRegisterPage.actions.reload"
                                            )}

                                        </button>

                                    </div>


                                    <p className="text-xs text-sky-300 mb-2">Personal de: {activeBranchName}. Los límites de usuarios se aplican al negocio completo.</p>
                                    {usersLoading ? (

                                        <div className="text-sm text-[#ababab]">

                                            {t(
                                                "adminRegisterPage.users.loading"
                                            )}

                                        </div>

                                    ) : cashierUsers
                                        .length ===
                                    0 ? (

                                        <div className="text-sm text-[#ababab]">

                                            {t(
                                                "adminRegisterPage.users.emptyCashiers"
                                            )}

                                        </div>

                                    ) : (

                                        <div className="space-y-3">

                                            {cashierUsers.map(
                                                (
                                                    item
                                                ) => (

                                                    <div
                                                        key={
                                                            item._id
                                                        }

                                                        className="bg-[#202020] rounded-xl p-4 border border-[#2e2e2e]"
                                                    >

                                                        <div className="font-semibold text-white">

                                                            {
                                                                item.name
                                                            }

                                                        </div>


                                                        <div className="text-sm text-[#ababab]">

                                                            {
                                                                item.email
                                                            }

                                                        </div>


                                                        <div className="text-xs text-[#38bdf8] mt-2">

                                                            {getRoleLabel(
                                                                item.role
                                                            )}

                                                        </div>

                                                    </div>

                                                )
                                            )}

                                        </div>

                                    )}

                                </div>

                            </div>

                        )}


                    {/* =====================================================
                        CAJAS
                    ===================================================== */}

                    {activeTab ===
                        "registers" && (

                            <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">

                                {/* FORMULARIO */}

                                <div className="bg-[#151515] rounded-2xl p-6 border border-[#2a2a2a]">

                                    <div className="flex items-center justify-between mb-5">

                                        <h2 className="text-xl font-bold text-white">

                                            {editingRegisterId
                                                ? t(
                                                    "adminRegisterPage.registers.editTitle"
                                                )
                                                : t(
                                                    "adminRegisterPage.registers.newTitle"
                                                )
                                            }

                                        </h2>


                                        {editingRegisterId && (

                                            <button
                                                type="button"

                                                onClick={
                                                    handleCancelRegisterEdit
                                                }

                                                className="text-sm bg-[#262626] px-3 py-2 rounded-lg hover:bg-[#333] text-[#38bdf8]"
                                            >

                                                {t(
                                                    "adminRegisterPage.actions.cancel"
                                                )}

                                            </button>

                                        )}

                                    </div>


                                    <form
                                        onSubmit={
                                            handleRegisterSubmit
                                        }

                                        className="space-y-4"
                                    >

                                        {/* CODE */}

                                        <div>

                                            <label className="block text-[#ababab] text-sm mb-2">

                                                {t(
                                                    "adminRegisterPage.registers.fields.code"
                                                )}

                                            </label>


                                            <input
                                                type="text"

                                                name="code"

                                                value={
                                                    registerForm.code
                                                }

                                                onChange={
                                                    handleRegisterFormChange
                                                }

                                                placeholder={
                                                    t(
                                                        "adminRegisterPage.registers.placeholders.code"
                                                    )
                                                }

                                                className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white uppercase focus:ring-2 focus:ring-[#38bdf8] outline-none"

                                                required
                                            />

                                        </div>


                                        {/* NAME */}

                                        <div>

                                            <label className="block text-[#ababab] text-sm mb-2">

                                                {t(
                                                    "adminRegisterPage.registers.fields.name"
                                                )}

                                            </label>


                                            <input
                                                type="text"

                                                name="name"

                                                value={
                                                    registerForm.name
                                                }

                                                onChange={
                                                    handleRegisterFormChange
                                                }

                                                placeholder={
                                                    t(
                                                        "adminRegisterPage.registers.placeholders.name"
                                                    )
                                                }

                                                className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#38bdf8] outline-none"

                                                required
                                            />

                                        </div>


                                        {/* LOCATION */}

                                        <div>

                                            <label className="block text-[#ababab] text-sm mb-2">

                                                {t(
                                                    "adminRegisterPage.registers.fields.location"
                                                )}

                                            </label>


                                            <input
                                                type="text"

                                                name="location"

                                                value={
                                                    registerForm.location
                                                }

                                                onChange={
                                                    handleRegisterFormChange
                                                }

                                                placeholder={
                                                    t(
                                                        "adminRegisterPage.registers.placeholders.location"
                                                    )
                                                }

                                                className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#38bdf8] outline-none"
                                            />

                                        </div>


                                        {/* ORDER */}

                                        <div>

                                            <label className="block text-[#ababab] text-sm mb-2">

                                                {t(
                                                    "adminRegisterPage.registers.fields.sortOrder"
                                                )}

                                            </label>


                                            <input
                                                type="number"

                                                name="sortOrder"

                                                value={
                                                    registerForm.sortOrder
                                                }

                                                onChange={
                                                    handleRegisterFormChange
                                                }

                                                className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#38bdf8] outline-none"
                                            />

                                        </div>


                                        {/* CASHIER */}

                                        <div>

                                            <label className="block text-[#ababab] text-sm mb-2">

                                                {t(
                                                    "adminRegisterPage.registers.fields.defaultCashier"
                                                )}

                                            </label>


                                            <select
                                                name="defaultCashierUserId"

                                                value={
                                                    registerForm
                                                        .defaultCashierUserId
                                                }

                                                onChange={
                                                    handleRegisterFormChange
                                                }

                                                className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#38bdf8] outline-none"
                                            >

                                                <option value="">

                                                    {t(
                                                        "adminRegisterPage.registers.unassigned"
                                                    )}

                                                </option>


                                                {cashierUsers.map(
                                                    (
                                                        cashier
                                                    ) => (

                                                        <option
                                                            key={
                                                                cashier._id
                                                            }

                                                            value={
                                                                cashier._id
                                                            }
                                                        >

                                                            {
                                                                cashier.name
                                                            }
                                                            {" — "}
                                                            {getRoleLabel(
                                                                cashier.role
                                                            )}

                                                        </option>

                                                    )
                                                )}

                                            </select>

                                        </div>


                                        <label className="flex items-center gap-3 text-sm text-[#ababab]">

                                            <input
                                                type="checkbox"

                                                name="isActive"

                                                checked={
                                                    registerForm.isActive
                                                }

                                                onChange={
                                                    handleRegisterFormChange
                                                }

                                                className="accent-[#38bdf8]"
                                            />


                                            {t(
                                                "adminRegisterPage.registers.fields.active"
                                            )}

                                        </label>


                                        <button
                                            type="submit"

                                            disabled={
                                                createRegisterMutation
                                                    .isPending ||
                                                updateRegisterMutation
                                                    .isPending
                                            }

                                            className="w-full mt-4 py-3 bg-[#38bdf8] text-black font-bold rounded-lg text-lg hover:bg-[#7dd3fc] transition disabled:opacity-60"
                                        >

                                            {editingRegisterId

                                                ? updateRegisterMutation
                                                    .isPending

                                                    ? t(
                                                        "adminRegisterPage.actions.saving"
                                                    )

                                                    : t(
                                                        "adminRegisterPage.actions.saveChanges"
                                                    )

                                                : createRegisterMutation
                                                    .isPending

                                                    ? t(
                                                        "adminRegisterPage.actions.creating"
                                                    )

                                                    : t(
                                                        "adminRegisterPage.actions.createRegister"
                                                    )
                                            }

                                        </button>

                                    </form>

                                </div>


                                {/* LISTADO */}

                                <div className="bg-[#151515] rounded-2xl p-6 border border-[#2a2a2a]">

                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">

                                        <div>

                                            <h2 className="text-xl font-bold text-white">

                                                {t(
                                                    "adminRegisterPage.registers.listTitle"
                                                )}

                                            </h2>


                                            <p className="text-sm text-[#ababab] mt-1">

                                                {t(
                                                    "adminRegisterPage.registers.listDescription"
                                                )}

                                            </p>

                                        </div>


                                        <div className="flex items-center gap-3">

                                            <label className="flex items-center gap-2 text-sm text-[#ababab]">

                                                <input
                                                    type="checkbox"

                                                    checked={
                                                        showInactiveRegisters
                                                    }

                                                    onChange={(
                                                        e
                                                    ) =>
                                                        setShowInactiveRegisters(
                                                            e
                                                                .target
                                                                .checked
                                                        )
                                                    }

                                                    className="accent-[#38bdf8]"
                                                />


                                                {t(
                                                    "adminRegisterPage.registers.showInactive"
                                                )}

                                            </label>


                                            <button
                                                type="button"

                                                onClick={() =>
                                                    refetchRegisters()
                                                }

                                                className="text-sm bg-[#262626] px-3 py-2 rounded-lg hover:bg-[#333] text-[#38bdf8]"
                                            >

                                                {t(
                                                    "adminRegisterPage.actions.reload"
                                                )}

                                            </button>

                                        </div>

                                    </div>


                                    {registersLoading ? (

                                        <div className="text-sm text-[#ababab]">

                                            {t(
                                                "adminRegisterPage.registers.loading"
                                            )}

                                        </div>

                                    ) : registers
                                        .length ===
                                    0 ? (

                                        <div className="text-sm text-[#ababab]">

                                            {t(
                                                "adminRegisterPage.registers.empty"
                                            )}

                                        </div>

                                    ) : (

                                        <div className="space-y-3">

                                            {registers.map(
                                                (
                                                    item
                                                ) => (

                                                    <div
                                                        key={
                                                            item._id
                                                        }

                                                        className="bg-[#202020] rounded-xl p-4 border border-[#2e2e2e]"
                                                    >

                                                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">

                                                            <div>

                                                                <div className="flex flex-wrap items-center gap-2">

                                                                    <h3 className="text-white font-semibold text-lg">

                                                                        {
                                                                            item.name
                                                                        }

                                                                    </h3>


                                                                    <span className="text-xs px-2 py-1 rounded-full bg-[#2d2d2d] text-[#38bdf8]">

                                                                    {
                                                                        item.code
                                                                    }

                                                                </span>


                                                                    <span
                                                                        className={`text-xs px-2 py-1 rounded-full ${
                                                                            item.isActive
                                                                                ? "bg-green-500/20 text-green-400"
                                                                                : "bg-red-500/20 text-red-400"
                                                                        }`}
                                                                    >

                                                                    {item.isActive
                                                                        ? t(
                                                                            "adminRegisterPage.registers.status.active"
                                                                        )
                                                                        : t(
                                                                            "adminRegisterPage.registers.status.inactive"
                                                                        )
                                                                    }

                                                                </span>

                                                                </div>


                                                                <div className="text-sm text-[#ababab] mt-2">

                                                                    {t(
                                                                        "adminRegisterPage.registers.fields.location"
                                                                    )}
                                                                    :{" "}

                                                                    {item.location ||
                                                                        t(
                                                                            "adminRegisterPage.registers.noLocation"
                                                                        )
                                                                    }

                                                                </div>


                                                                <div className="text-sm text-[#ababab] mt-1">

                                                                    {t(
                                                                        "adminRegisterPage.registers.fields.defaultCashier"
                                                                    )}
                                                                    :{" "}

                                                                    <span className="text-white">

                                                                    {item
                                                                            ?.defaultCashierUserId
                                                                            ?.name ||
                                                                        t(
                                                                            "adminRegisterPage.registers.unassigned"
                                                                        )
                                                                    }

                                                                </span>

                                                                </div>


                                                                <div className="text-xs text-[#777] mt-2">

                                                                    {t(
                                                                        "adminRegisterPage.registers.fields.sortOrder"
                                                                    )}
                                                                    :{" "}

                                                                    {item.sortOrder ??
                                                                        0
                                                                    }

                                                                </div>

                                                            </div>


                                                            <div className="flex flex-wrap gap-2">

                                                                <button
                                                                    type="button"

                                                                    onClick={() =>
                                                                        handleEditRegister(
                                                                            item
                                                                        )
                                                                    }

                                                                    className="px-3 py-2 rounded-lg bg-[#2b2b2b] text-white hover:bg-[#3a3a3a] text-sm"
                                                                >

                                                                    {t(
                                                                        "adminRegisterPage.actions.edit"
                                                                    )}

                                                                </button>


                                                                <button
                                                                    type="button"

                                                                    onClick={() =>
                                                                        toggleRegisterMutation
                                                                            .mutate({
                                                                                id:
                                                                                item._id,

                                                                                isActive:
                                                                                    !item.isActive,
                                                                            })
                                                                    }

                                                                    className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                                                                        item.isActive
                                                                            ? "bg-red-500/15 text-red-300 hover:bg-red-500/25"
                                                                            : "bg-green-500/15 text-green-300 hover:bg-green-500/25"
                                                                    }`}
                                                                >

                                                                    {item.isActive
                                                                        ? t(
                                                                            "adminRegisterPage.actions.deactivate"
                                                                        )
                                                                        : t(
                                                                            "adminRegisterPage.actions.activate"
                                                                        )
                                                                    }

                                                                </button>

                                                            </div>

                                                        </div>

                                                    </div>

                                                )
                                            )}

                                        </div>

                                    )}

                                </div>

                            </div>

                        )}

                </div>

            </div>

        </section>

    );
};


export default AdminRegister;