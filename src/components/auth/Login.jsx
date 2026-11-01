import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../../https/index";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api, { getScope, setScope } from "@/lib/api";
import { scopeForAuthenticatedUser } from "@/lib/sessionScope.mjs";
import { clearTenant } from "../../redux/slices/storeSlice";
import { removeUser } from "../../redux/slices/userSlice";
import { removeAllItems } from "../../redux/slices/cartSlice";
import { removeCustomer, clearDraftContext } from "../../redux/slices/customerSlice";
import { clearAppCache } from "@/utils/clearAppCache";


const Login = () => {

    const { t } =
        useTranslation();


    const navigate =
        useNavigate();


    const dispatch =
        useDispatch();
    const queryClient = useQueryClient();


    const [
        formData,
        setFormData,
    ] =
        useState({
            email: "",
            password: "",
        });


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


    const getDeviceId =
        () => {

            let id =
                localStorage.getItem(
                    "deviceId"
                );


            if (!id) {

                id =
                    crypto.randomUUID();


                localStorage.setItem(
                    "deviceId",
                    id
                );
            }


            return id;
        };


    const handleSubmit =
        (
            e
        ) => {

            e.preventDefault();


            const deviceId =
                getDeviceId();


            loginMutation
                .mutate({
                    ...formData,
                    deviceId,
                });
        };


    const loginMutation =
        useMutation({

            mutationFn:
                (
                    reqData
                ) =>
                    login(
                        reqData
                    ),


            onSuccess:
                async (
                    res
                ) => {

                    const priorScope = getScope();
                    // Eliminar consultas del usuario anterior ANTES de publicar la
                    // nueva identidad. Separa la caché de cuentas y sucursales.
                    await queryClient.cancelQueries();
                    queryClient.clear();
                    dispatch(removeUser());
                    dispatch(clearTenant());
                    dispatch(removeAllItems());
                    dispatch(clearDraftContext());
                    dispatch(removeCustomer());
                    try {

                        await clearAppCache();


                        localStorage.removeItem(
                            "scope"
                        );

                        localStorage.removeItem(
                            "tenantId"
                        );

                        localStorage.removeItem(
                            "clientId"
                        );

                    } catch (
                        e
                        ) {

                        console.warn(
                            "No se pudo limpiar cache/SW:",
                            e
                        );
                    }


                    const {
                        data,
                    } =
                        res;


                    const token =
                        res.data
                            ?.token;


                    if (
                        token
                    ) {

                        localStorage.setItem(
                            "token",
                            token
                        );
                    }


                    const userData =
                        data
                            ?.data
                            ?.user ||
                        data
                            ?.user ||
                        data
                            ?.data;


                    if (
                        !userData
                    ) {

                        enqueueSnackbar(
                            t(
                                "loginPage.messages.noUserData"
                            ),
                            {
                                variant:
                                    "error",
                            }
                        );


                        return;
                    }


                    // ========================================================
                    // SUPERADMIN — flujo especial SIN tenant, SIN scope
                    // ========================================================

                    if (
                        userData.role ===
                        "SuperAdmin"
                    ) {

                        dispatch(
                            setUser({
                                _id:
                                    null,

                                name:
                                userData
                                    .name,

                                email:
                                userData
                                    .email,

                                phone:
                                    null,

                                role:
                                    "SuperAdmin",

                                tenantId:
                                    null,
                            })
                        );


                        localStorage.removeItem(
                            "scope"
                        );


                        navigate(
                            "/superadmin"
                        );


                        return;
                    }


                    // ========================================================
                    // FLUJO NORMAL
                    // ========================================================

                    const tenantId =
                        userData
                            ?.tenantId ||
                        data
                            ?.tenantId ||
                        data
                            ?.data
                            ?.tenantId;


                    if (
                        !tenantId
                    ) {

                        enqueueSnackbar(
                            t(
                                "loginPage.messages.noTenant"
                            ),
                            {
                                variant:
                                    "error",
                            }
                        );


                        return;
                    }


                    // Guardar token

                    localStorage.setItem(
                        "token",
                        token
                    );


                    // Guardar scope completo para api.js

                    const assignedScope = scopeForAuthenticatedUser({
                        ...userData,
                        tenantId,
                    }, priorScope);
                    setScope(assignedScope);


                    // Guardado redundante para compatibilidad

                    localStorage.setItem(
                        "tenantId",
                        tenantId
                    );


                    localStorage.setItem(
                        "clientId",
                        assignedScope.clientId
                    );


                    // Nunca registrar el JWT en consola (riesgo de fuga de sesión).


                    const {
                        _id,
                        name,
                        email,
                        phone,
                        role,
                    } =
                        userData;


                    dispatch(
                        setUser({
                            _id,
                            name,
                            email,
                            phone,
                            role,
                            membershipRole: userData.membershipRole || role,
                            clientIds: userData.clientIds || ["default"],
                            permissions: userData.permissions,
                            tenantId,
                        })
                    );


                    navigate(
                        "/mesas",
                        {
                            replace:
                                true,
                        }
                    );
                },


            onError:
                (
                    error
                ) => {

                    const msg =
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "loginPage.messages.loginFailed"
                        );


                    enqueueSnackbar(
                        msg,
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


    return (

        <div>

            <form
                onSubmit={
                    handleSubmit
                }
            >

                {/* EMAIL */}

                <div>

                    <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">

                        {t(
                            "loginPage.fields.email"
                        )}

                    </label>


                    <div className="flex items-center rounded-lg p-5 px-4 bg-[#1f1f1f]">

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
                                    "loginPage.placeholders.email"
                                )
                            }

                            className="bg-transparent flex-1 text-white focus:outline-none"

                            required
                        />

                    </div>

                </div>


                {/* PASSWORD */}

                <div>

                    <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">

                        {t(
                            "loginPage.fields.password"
                        )}

                    </label>


                    <div className="flex items-center rounded-lg p-5 px-4 bg-[#1f1f1f]">

                        <input
                            type="password"

                            name="password"

                            value={
                                formData.password
                            }

                            onChange={
                                handleChange
                            }

                            placeholder={
                                t(
                                    "loginPage.placeholders.password"
                                )
                            }

                            className="bg-transparent flex-1 text-white focus:outline-none"

                            required
                        />

                    </div>

                </div>


                {/* SUBMIT */}

                <button
                    type="submit"

                    disabled={
                        loginMutation
                            .isPending
                    }

                    className="w-full rounded-lg mt-6 py-3 text-lg bg-yellow-400 text-gray-900 font-bold transition disabled:opacity-60 disabled:cursor-not-allowed"
                >

                    {loginMutation
                        .isPending
                        ? t(
                            "loginPage.actions.signingIn"
                        )
                        : t(
                            "loginPage.actions.signIn"
                        )
                    }

                </button>

            </form>

        </div>
    );
};


export default Login;