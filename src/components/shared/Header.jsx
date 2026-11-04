import React, {
    memo,
    useCallback,
    useState,
    useRef,
    useEffect,
} from "react";

import {
    User,
    Bell,
    LogOut,
    LayoutDashboard,
    Sun,
    Moon,
    ChevronDown,
    Package,
} from "lucide-react";

import logoApp from "../../assets/images/logo-mark.png";

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
    logout,
} from "../../https";

import {
    removeUser,
} from "../../redux/slices/userSlice";
import { clearTenant } from "../../redux/slices/storeSlice";
import { removeAllItems } from "../../redux/slices/cartSlice";
import { removeCustomer, clearDraftContext } from "../../redux/slices/customerSlice";

import {
    useNavigate,
} from "react-router-dom";

import {
    motion,
    AnimatePresence,
} from "framer-motion";

import {
    useTranslation,
} from "react-i18next";

import {
    useTheme,
} from "../../contexts/ThemeContext";

import api, { getScope, setScope } from "../../lib/api";
import { canAdministrateBranches } from "../../lib/sessionScope.mjs";


function BranchSwitcher() {
    const { i18n } = useTranslation();
    const user = useSelector(state => state.user?.userData);
    const clientId = getScope()?.clientId || "default";
    const tenantId = user?.tenantId;
    const canSwitch = canAdministrateBranches(user);
    const { data } = useQuery({
        queryKey: ["header-branches", tenantId, user?._id],
        queryFn: async () => (await api.get("/api/clients")).data,
        enabled: Boolean(tenantId && user?._id && canSwitch),
        retry: false,
        staleTime: 30000,
    });
    const branches = (Array.isArray(data?.data) ? data.data : []).filter(b => b.isActive);
    if (!canSwitch || branches.length < 2) return null;
    return (
        <select aria-label={i18n.resolvedLanguage?.startsWith("en") ? "Current branch" : "Sucursal actual"}
            value={branches.some(b => b.clientId === clientId) ? clientId : "default"}
            className="bg-[#292929] text-white max-w-36 sm:max-w-48 rounded-lg px-2 py-2 text-xs border border-gray-700"
            onChange={event => {
                const next = event.target.value;
                if (!branches.some(b => b.clientId === next)) return;
                setScope({ tenantId, clientId: next, userId: user._id });
                localStorage.setItem("clientId", next);
                window.location.assign("/");
            }}>
            {branches.map(b => <option key={b.clientId} value={b.clientId}>{b.name}</option>)}
        </select>
    );
}

const Header = memo(
    () => {
        const {
            t,
        } =
            useTranslation();


        const {
            userData,
        } =
            useSelector(
                (
                    state
                ) =>
                    state.user
            );


        const dispatch =
            useDispatch();

        const queryClient = useQueryClient();


        const navigate =
            useNavigate();


        const {
            theme,
            setDarkTheme,
            setLightTheme,
        } =
            useTheme();


        /*
         * ==========================================
         * ROLE DISPLAY
         * ==========================================
         *
         * El rol interno NO cambia.
         *
         * Ejemplo:
         *
         * "Cajera" sigue siendo "Cajera"
         * para permisos.
         *
         * Solo mostramos "Cashier" en inglés.
         */

        const getRoleDisplayLabel = (
            roleValue
        ) => {
            const normalized =
                String(
                    roleValue ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            const roleKeyMap = {
                cajera:
                    "cashier",

                cashier:
                    "cashier",

                camarero:
                    "waiter",

                mesero:
                    "waiter",

                waiter:
                    "waiter",

                owner:
                    "owner",

                admin:
                    "admin",

                superadmin:
                    "superAdmin",
            };


            const key =
                roleKeyMap[
                    normalized
                    ];


            return key
                ? t(
                    `header.roles.${key}`
                )
                : roleValue ||
                t(
                    "header.roleFallback"
                );
        };


        const [
            isUserMenuOpen,
            setIsUserMenuOpen,
        ] =
            useState(
                false
            );


        const [
            isNotifOpen,
            setIsNotifOpen,
        ] =
            useState(
                false
            );


        const menuRef =
            useRef(
                null
            );


        const notifRef =
            useRef(
                null
            );


        /*
         * ==========================================
         * PLAN GATING
         * ==========================================
         *
         * Los nombres internos del plan
         * permanecen intactos.
         */

        const rawPlan =
            (
                userData
                    ?.tenant
                    ?.plan ||
                userData
                    ?.plan ||
                userData
                    ?.subscription
                    ?.plan ||
                ""
            ) +
            "";


        const plan =
            rawPlan
                .toLowerCase();


        const canInventory =
            [
                "premium",
                "estandar",
            ].includes(
                plan
            );


        /*
         * ==========================================
         * LOGOUT
         * ==========================================
         */

        const logoutMutation =
            useMutation({
                mutationFn:
                    () =>
                        logout(),

                // Aun si el servidor devuelve 401, no dejar la cuenta anterior
                // visible ni reciclar datos de otro usuario.
                onSettled: async () => {
                    await queryClient.cancelQueries();
                    queryClient.clear();
                    dispatch(removeUser());
                    dispatch(clearTenant());
                    dispatch(removeAllItems());
                    dispatch(clearDraftContext());
                    dispatch(removeCustomer());
                    ["token", "scope", "tenantId", "clientId",
                     "deleonsoft_pending_cash_date", "deleonsoft_pending_cash_register"].forEach(k => localStorage.removeItem(k));
                    navigate("/auth", { replace: true });
                },
            });


        const handleLogout =
            useCallback(
                () => {
                    logoutMutation
                        .mutate();


                    setIsUserMenuOpen(
                        false
                    );
                },
                [
                    logoutMutation,
                ]
            );


        const handleHome =
            useCallback(
                () =>
                    navigate(
                        "/"
                    ),
                [
                    navigate,
                ]
            );


        const handleDashboard =
            useCallback(
                () =>
                    navigate(
                        "/dashboard"
                    ),
                [
                    navigate,
                ]
            );


        /*
         * ==========================================
         * NOTIFICACIONES DE INVENTARIO
         * ==========================================
         */

        const lowStockQuery =
            useQuery({
                queryKey: [
                    "inventory",
                    "low-stock",
                ],

                enabled:
                    canInventory &&
                    isNotifOpen,

                queryFn:
                    async () => {
                        const response =
                            await api.get(
                                "/api/inventory/low-stock"
                            );


                        return (
                            response
                                .data
                                ?.items ||
                            response
                                .data
                                ?.data
                                ?.items ||
                            []
                        );
                    },

                staleTime:
                    30_000,

                refetchOnWindowFocus:
                    false,
            });


        const lowStockItems =
            lowStockQuery
                .data ||
            [];


        const lowStockCount =
            lowStockItems.length;


        /*
         * ==========================================
         * CERRAR MENÚS AL HACER CLICK FUERA
         * ==========================================
         */

        useEffect(
            () => {
                const handleClickOutside =
                    (
                        event
                    ) => {
                        if (
                            menuRef
                                .current &&
                            !menuRef
                                .current
                                .contains(
                                    event.target
                                )
                        ) {
                            setIsUserMenuOpen(
                                false
                            );
                        }


                        if (
                            notifRef
                                .current &&
                            !notifRef
                                .current
                                .contains(
                                    event.target
                                )
                        ) {
                            setIsNotifOpen(
                                false
                            );
                        }
                    };


                document
                    .addEventListener(
                        "mousedown",
                        handleClickOutside
                    );


                return () =>
                    document
                        .removeEventListener(
                            "mousedown",
                            handleClickOutside
                        );
            },
            []
        );


        const openInventoryFromNotif = (
            itemId
        ) => {
            navigate(
                "/admin",
                {
                    state: {
                        tab:
                            "inventory",

                        focusItemId:
                        itemId,
                    },
                }
            );


            setIsNotifOpen(
                false
            );
        };


        return (
            <motion.header
                initial={{
                    y:
                        -100,

                    opacity:
                        0,
                }}

                animate={{
                    y:
                        0,

                    opacity:
                        1,
                }}

                transition={{
                    duration:
                        0.3,

                    ease:
                        "easeOut",
                }}

                className="flex justify-between items-center h-20 px-6 lg:px-8 bg-gradient-to-r from-[#1a1a1a] via-[#1f1f1f] to-[#1a1a1a] border-b border-[#2a2a2a]/50 transition-colors duration-300"
            >

                {/* LOGO */}

                <div
                    onClick={
                        handleHome
                    }

                    className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
                >

                    <img
                        src={
                            logoApp
                        }

                        alt="DeLeonSoft"

                        className="h-12 object-contain"
                    />


                    <div>

                        <h1 className="text-xl tracking-wide">

                            <span className="font-semibold text-[#f5f5f5] group-hover:text-white transition-colors">
                                DeLeon{" "}
                            </span>


                            <span className="font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                                Soft
                            </span>

                        </h1>

                    </div>

                </div>


                <div className="flex items-center gap-3">
                    <BranchSwitcher />

                    {/* ======================================
                        NOTIFICACIONES
                    ====================================== */}

                    <div
                        className="relative"

                        ref={
                            notifRef
                        }
                    >

                        <button
                            type="button"

                            onClick={() =>
                                setIsNotifOpen(
                                    (
                                        current
                                    ) =>
                                        !current
                                )
                            }

                            className={`relative bg-gradient-to-br from-[#1f1f1f] to-[#252525] rounded-xl p-3 cursor-pointer border transition-all duration-200 group ${
                                canInventory
                                    ? "border-[#2a2a2a]/50 hover:border-yellow-500/50 hover:scale-105 active:scale-95"
                                    : "border-[#2a2a2a]/30 opacity-60 cursor-not-allowed"
                            }`}

                            disabled={
                                !canInventory
                            }

                            title={
                                canInventory
                                    ? t(
                                        "header.inventoryNotifications"
                                    )
                                    : t(
                                        "header.inventoryPlanRequired"
                                    )
                            }
                        >

                            <Bell className="text-[#f5f5f5] text-xl group-hover:text-yellow-400 transition-colors" />


                            {canInventory &&
                                lowStockCount >
                                0 && (

                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-yellow-500 text-black text-[11px] font-bold flex items-center justify-center border border-black/40">

                                    {lowStockCount >
                                    99
                                        ? "99+"
                                        : lowStockCount
                                    }

                                </span>

                                )}

                        </button>


                        <AnimatePresence>

                            {isNotifOpen &&
                                canInventory && (

                                    <motion.div
                                        initial={{
                                            opacity:
                                                0,

                                            y:
                                                -10,

                                            scale:
                                                0.98,
                                        }}

                                        animate={{
                                            opacity:
                                                1,

                                            y:
                                                0,

                                            scale:
                                                1,
                                        }}

                                        exit={{
                                            opacity:
                                                0,

                                            y:
                                                -10,

                                            scale:
                                                0.98,
                                        }}

                                        transition={{
                                            duration:
                                                0.18,
                                        }}

                                        className="absolute right-0 mt-2 w-80 bg-gradient-to-br from-[#1f1f1f] to-[#252525] rounded-xl shadow-2xl border border-[#2a2a2a]/50 overflow-hidden z-50"
                                    >

                                        {/* HEADER NOTIFICACIONES */}

                                        <div className="px-4 py-3 border-b border-[#2a2a2a]/50 flex items-center justify-between">

                                            <div className="flex items-center gap-2">

                                                <Package className="w-4 h-4 text-yellow-400" />


                                                <p className="text-sm font-semibold text-[#f5f5f5]">

                                                    {t(
                                                        "header.inventory"
                                                    )}

                                                </p>

                                            </div>


                                            <p className="text-xs text-[#ababab]">

                                                {t(
                                                    "header.lowStockCount",
                                                    {
                                                        count:
                                                        lowStockCount,
                                                    }
                                                )}

                                            </p>

                                        </div>


                                        {/* LISTA */}

                                        <div className="max-h-80 overflow-auto">

                                            {lowStockQuery
                                                .isLoading
                                                ? (

                                                    <div className="px-4 py-4 text-sm text-[#ababab]">

                                                        {t(
                                                            "header.loading"
                                                        )}

                                                    </div>

                                                )
                                                : lowStockItems
                                                    .length ===
                                                0
                                                    ? (

                                                        <div className="px-4 py-4 text-sm text-[#ababab]">

                                                            {t(
                                                                "header.noLowStockAlerts"
                                                            )}

                                                        </div>

                                                    )
                                                    : (

                                                        lowStockItems
                                                            .slice(
                                                                0,
                                                                10
                                                            )
                                                            .map(
                                                                (
                                                                    item
                                                                ) => (

                                                                    <button
                                                                        key={
                                                                            item._id
                                                                        }

                                                                        onClick={() =>
                                                                            openInventoryFromNotif(
                                                                                item._id
                                                                            )
                                                                        }

                                                                        className="w-full text-left px-4 py-3 hover:bg-yellow-500/10 transition-colors border-b border-[#2a2a2a]/30"
                                                                    >

                                                                        <div className="flex items-center justify-between gap-3">

                                                                            <div className="min-w-0">

                                                                                <p className="text-sm text-[#f5f5f5] font-semibold truncate">

                                                                                    {item.name}

                                                                                </p>


                                                                                <p className="text-xs text-[#ababab]">

                                                                                    {t(
                                                                                        "header.stock"
                                                                                    )}:{" "}

                                                                                    {item.stockCurrent}

                                                                                    {" / "}

                                                                                    {t(
                                                                                        "header.minimum"
                                                                                    )}:{" "}

                                                                                    {item.stockMin}

                                                                                    {" "}

                                                                                    {item.unit
                                                                                        ? `(${item.unit})`
                                                                                        : ""
                                                                                    }

                                                                                </p>

                                                                            </div>


                                                                            <span className="text-xs font-semibold text-yellow-400 whitespace-nowrap">

                                                                            {t(
                                                                                "header.lowStock"
                                                                            )}

                                                                        </span>

                                                                        </div>

                                                                    </button>

                                                                )
                                                            )

                                                    )
                                            }

                                        </div>


                                        {/* FOOTER */}

                                        <div className="px-4 py-3 flex items-center justify-between">

                                            <button
                                                onClick={() =>
                                                    openInventoryFromNotif(
                                                        null
                                                    )
                                                }

                                                className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
                                            >

                                                {t(
                                                    "header.viewInventory"
                                                )}

                                            </button>


                                            <button
                                                onClick={() =>
                                                    setIsNotifOpen(
                                                        false
                                                    )
                                                }

                                                className="text-sm text-[#ababab] hover:text-white transition-colors"
                                            >

                                                {t(
                                                    "header.close"
                                                )}

                                            </button>

                                        </div>

                                    </motion.div>

                                )}

                        </AnimatePresence>

                    </div>


                    {/* ======================================
                        MENÚ DE USUARIO
                    ====================================== */}

                    <div
                        className="relative"

                        ref={
                            menuRef
                        }
                    >

                        <button
                            onClick={() =>
                                setIsUserMenuOpen(
                                    !isUserMenuOpen
                                )
                            }

                            className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
                        >

                            <div
                                className={`relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full p-2 border border-blue-500/30 group-hover:scale-110 transition-transform duration-200 ${
                                    isUserMenuOpen
                                        ? "ring-2 ring-blue-500"
                                        : ""
                                }`}
                            >

                                <User className="text-blue-400 text-2xl" />

                            </div>


                            <div className="flex flex-col items-start">

                                <div className="flex items-center gap-1">

                                    <h1 className="text-sm text-[#f5f5f5] font-semibold tracking-wide group-hover:text-white transition-colors">

                                        {userData
                                                ?.name ||
                                            t(
                                                "header.testUser"
                                            )
                                        }

                                    </h1>


                                    <ChevronDown
                                        className={`text-[#ababab] w-4 h-4 transition-all duration-200 ${
                                            isUserMenuOpen
                                                ? "rotate-180"
                                                : ""
                                        }`}
                                    />

                                </div>


                                <p className="text-xs text-[#ababab] font-medium group-hover:text-blue-400 transition-colors">

                                    {getRoleDisplayLabel(
                                        userData?.role
                                    )}

                                </p>

                            </div>

                        </button>


                        <AnimatePresence>

                            {isUserMenuOpen && (

                                <motion.div
                                    initial={{
                                        opacity:
                                            0,

                                        y:
                                            -10,

                                        scale:
                                            0.95,
                                    }}

                                    animate={{
                                        opacity:
                                            1,

                                        y:
                                            0,

                                        scale:
                                            1,
                                    }}

                                    exit={{
                                        opacity:
                                            0,

                                        y:
                                            -10,

                                        scale:
                                            0.95,
                                    }}

                                    transition={{
                                        duration:
                                            0.2,
                                    }}

                                    className="absolute right-0 mt-2 w-64 bg-gradient-to-br from-[#1f1f1f] to-[#252525] rounded-xl shadow-2xl border border-[#2a2a2a]/50 overflow-hidden z-50 transition-colors duration-300"
                                >

                                    {/* USER INFO */}

                                    <div className="px-4 py-3 border-b border-[#2a2a2a]/50 transition-colors duration-300">

                                        <p className="text-sm font-semibold text-[#f5f5f5] transition-colors duration-300">

                                            {userData
                                                    ?.name ||
                                                t(
                                                    "header.userFallback"
                                                )
                                            }

                                        </p>


                                        <p className="text-xs text-[#ababab] mt-1 transition-colors duration-300">

                                            {getRoleDisplayLabel(
                                                userData?.role
                                            )}

                                        </p>

                                    </div>


                                    <div className="py-2">

                                        {/* TEMA */}

                                        <div className="px-4 py-2 border-b border-[#2a2a2a]/30 transition-colors duration-300">

                                            <p className="text-xs font-semibold text-[#ababab] uppercase mb-2 transition-colors duration-300">

                                                {t(
                                                    "header.theme"
                                                )}

                                            </p>


                                            <div className="flex gap-2">

                                                <button
                                                    onClick={() => {
                                                        setDarkTheme();

                                                        setIsUserMenuOpen(
                                                            false
                                                        );
                                                    }}

                                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
                                                        theme ===
                                                        "dark"
                                                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                                                            : "bg-[#2a2a2a]/50 border-[#2a2a2a]/50 text-[#ababab] hover:bg-[#2a2a2a] hover:text-white"
                                                    }`}
                                                >

                                                    <Moon className="w-4 h-4" />


                                                    <span className="text-sm font-medium">

                                                        {t(
                                                            "header.dark"
                                                        )}

                                                    </span>

                                                </button>


                                                <button
                                                    onClick={() => {
                                                        setLightTheme();

                                                        setIsUserMenuOpen(
                                                            false
                                                        );
                                                    }}

                                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
                                                        theme ===
                                                        "light"
                                                            ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                                                            : "bg-[#2a2a2a]/50 border-[#2a2a2a]/50 text-[#ababab] hover:bg-[#2a2a2a] hover:text-white"
                                                    }`}
                                                >

                                                    <Sun className="w-4 h-4" />


                                                    <span className="text-sm font-medium">

                                                        {t(
                                                            "header.light"
                                                        )}

                                                    </span>

                                                </button>

                                            </div>

                                        </div>


                                        {/* LOGOUT */}

                                        <button
                                            onClick={
                                                handleLogout
                                            }

                                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-500/10 transition-colors duration-200 text-red-400"
                                        >

                                            <LogOut className="w-5 h-5" />


                                            <span className="text-sm font-medium">

                                                {t(
                                                    "header.logout"
                                                )}

                                            </span>

                                        </button>

                                    </div>

                                </motion.div>

                            )}

                        </AnimatePresence>

                    </div>

                </div>

            </motion.header>
        );
    }
);


Header.displayName =
    "Header";


export default Header;