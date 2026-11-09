import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import AccountsReceivable from "./AccountsReceivable";
import BranchesManagement from "./BranchesManagement";
import {
    FileText,
    Users,
    Receipt,
    Package,
    UserPlus,
    TrendingUp,
    Shield,
    ChevronDown,
    ChevronRight,
    BarChart3,
    DollarSign,
    Percent,
    ShoppingBag,
    Settings,
    UtensilsCrossed,
    Table2,
    PieChart,
    Calendar,
    Clock,
    Store,
    CreditCard,
    Bell,
    HelpCircle,
    LayoutDashboard,
    Wallet,
    Globe2,
    X,
} from "lucide-react";

import ExpenseCategories from "./ExpenseCategories";
import Expenses from "./Expenses";
import PayrollRuns from "./PayrollRuns";
import FinanceSummary from "./FinanceSummary";
import PrintersConfig from "./PrintersConfig.jsx";
import useTenant from "../../hooks/useTenant";
import { useTranslation } from "react-i18next";
import TaxIdentityConfig from "./TaxIdentityConfig";

import Employees from "./Employees";
import api from "../../lib/api";
import Inventory from "./Inventory";
import FiscalConfig from "./FiscalConfig";
import CashRegister from "./CashRegister";
import SalesReports from "./SalesReports";
import ProductReports from "./ProductReports";
import FinancialAnalysis from "./FinancialAnalysis";
import MenuManagement from "./MenuManagement";
import TablesManagement from "./TablesManagement";
import Suppliers from "./Suppliers";
import InventoryCategories from "./InventoryCategories";
import Notifications from "./Notifications";
import HelpAndSupport from "./HelpAndSupport";


const LEGACY_ADMIN_TAB_MAP = {
    fiscal: "billing-config",
};


const BILLING_CONFIG_TAB_IDS =
    new Set([
        "regional-config",
        "tax-config",
        "service-charge-config",
        "billing-config",
        "delivery-config",
        "tax-identity-config",
        "ncf-config",
        "ecf-config",
        "printersconfig",
    ]);


const normalizeAdminTab = (
    value
) => {
    const tab =
        String(
            value ||
            ""
        ).trim();


    return (
        LEGACY_ADMIN_TAB_MAP[
            tab
            ] ||
        tab
    );
};


const Admin = () => {
    const {
        t,
    } =
        useTranslation();


    const [
        searchParams,
    ] =
        useSearchParams();


    const tabFromUrl =
        searchParams.get(
            "tab"
        );


    const [
        tab,
        setTab,
    ] =
        useState(
            "cash-register"
        );


    const location =
        useLocation();


    const [
        expandedMenu,
        setExpandedMenu,
    ] =
        useState(
            "reportes"
        );


    const [
        showPlanDetails,
        setShowPlanDetails,
    ] =
        useState(
            false
        );


    const navigate =
        useNavigate();


    const {
        userData,
        isAuth,
    } =
        useSelector(
            (
                state
            ) =>
                state.user
        );


    const {
        tenantInfo,
    } =
        useTenant();


    const tenantCountryCode =
        String(
            tenantInfo
                ?.localization
                ?.countryCode ||
            ""
        )
            .trim()
            .toUpperCase();


    const isDominicanTenant =
        tenantCountryCode ===
        "DO";


    /*
     * ==========================================
     * TAB DESDE URL
     * ==========================================
     */

    useEffect(
        () => {
            if (
                !tabFromUrl
            ) {
                return;
            }


            const nextTab =
                normalizeAdminTab(
                    tabFromUrl
                );


            setTab(
                nextTab
            );


            if (
                BILLING_CONFIG_TAB_IDS.has(
                    nextTab
                )
            ) {
                setExpandedMenu(
                    "facturacion-config"
                );
            }
        },
        [
            tabFromUrl,
        ]
    );


    /*
     * ==========================================
     * USO DEL PLAN + PERMISOS
     * ==========================================
     */

    const {
        data:
            usageData,
    } =
        useQuery({
            queryKey: [
                "admin-usage-summary",
            ],

            queryFn:
                async () => {
                    const res =
                        await api.get(
                            "/api/admin/usage"
                        );


                    return res
                        .data
                        ?.data;
                },

            enabled:
                Boolean(
                    isAuth &&
                    userData
                ),

            staleTime:
                0,

            refetchOnMount:
                "always",

            refetchOnReconnect:
                true,
        });


    /*
     * Valores internos del plan.
     * NO traducir.
     */
    const normalizePlanKey = (
        value
    ) => {
        const normalized =
            String(
                value ||
                "emprendedor"
            )
                .trim()
                .toLowerCase()
                .normalize(
                    "NFD"
                )
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                );


        if (
            normalized ===
            "standard"
        ) {
            return "estandar";
        }


        if (
            normalized ===
            "premium"
        ) {
            return "premium";
        }


        if (
            normalized ===
            "pro"
        ) {
            return "pro";
        }


        if (
            normalized ===
            "emprendedor"
        ) {
            return "emprendedor";
        }


        return normalized;
    };


    const rawPlan =
        normalizePlanKey(
            usageData?.plan
        );


    /*
     * Se conserva la forma actual
     * de mostrar el nombre del plan.
     */
    const plan =
        rawPlan.toUpperCase();


    const limits =
        usageData?.limits ||
        {};


    const usage =
        usageData?.usage ||
        {};


    const remaining =
        usageData?.remaining ||
        {};


    const currentUserFromUsage =
        usageData
            ?.currentUser ||
        {};


    /*
     * ==========================================
     * ROLES / PERMISOS
     * ==========================================
     *
     * Estos son valores internos.
     * NO traducir.
     */

    const role =
        currentUserFromUsage
            ?.role ||
        userData?.role ||
        "";


    const isCashier =
        role ===
        "Cajera";


    const isOwnerOrAdmin =
        [
            "Owner",
            "Admin",
        ].includes(
            role
        );


    const userPermissions =
        currentUserFromUsage
            ?.permissions ||
        userData
            ?.permissions ||
        {};


    const hasUserPermission = (
        permissionPath
    ) => {
        return String(
                permissionPath ||
                ""
            )
                .split(
                    "."
                )
                .reduce(
                    (
                        acc,
                        key
                    ) =>
                        acc &&
                        acc[
                            key
                            ] !==
                        undefined
                            ? acc[
                                key
                                ]
                            : undefined,
                    userPermissions
                ) ===
            true;
    };


    const hasAccountsReceivablePermission =
        hasUserPermission(
            "accountsReceivable.view"
        );


    const canCreateProductsByPermission =
        isOwnerOrAdmin ||
        hasUserPermission(
            "products.create"
        );


    const canInventoryEntryByPermission =
        isOwnerOrAdmin ||
        hasUserPermission(
            "inventory.entry"
        );


    const effectiveUser = {
        ...(
            userData ||
            {}
        ),

        role,

        permissions:
        userPermissions,
    };


    /*
     * ==========================================
     * REDIRECCIÓN SEGURA
     * ==========================================
     */

    useEffect(
        () => {
            if (
                !isAuth
            ) {
                navigate(
                    "/"
                );

                return;
            }


            if (
                !userData
            ) {
                return;
            }


            const canEnterAdminPanel =
                isOwnerOrAdmin ||
                isCashier ||
                canCreateProductsByPermission ||
                canInventoryEntryByPermission ||
                hasAccountsReceivablePermission;


            if (
                !canEnterAdminPanel
            ) {
                navigate(
                    "/"
                );

                return;
            }


            if (
                role ===
                "Cajera"
            ) {
                if (
                    canCreateProductsByPermission
                ) {
                    if (
                        tabFromUrl ===
                        "cash-register"
                    ) {
                        setTab(
                            "cash-register"
                        );

                        return;
                    }


                    setTab(
                        "menu-management"
                    );

                    setExpandedMenu(
                        "restaurante"
                    );

                } else if (
                    canInventoryEntryByPermission
                ) {
                    setTab(
                        "inventory-stock"
                    );

                    setExpandedMenu(
                        "inventario"
                    );

                } else {
                    setTab(
                        "cash-register"
                    );

                    setExpandedMenu(
                        "reportes"
                    );
                }
            }
        },
        [
            userData,
            isAuth,
            navigate,
            role,
            isOwnerOrAdmin,
            isCashier,
            canCreateProductsByPermission,
            canInventoryEntryByPermission,
            hasAccountsReceivablePermission,
            tabFromUrl,
        ]
    );


    /*
     * ==========================================
     * TAB DESDE LOCATION.STATE
     * ==========================================
     */

    useEffect(
        () => {
            const requestedTab =
                location
                    .state
                    ?.tab;


            if (
                !requestedTab
            ) {
                return;
            }


            const nextTab =
                normalizeAdminTab(
                    requestedTab
                );


            setTab(
                nextTab
            );


            if (
                BILLING_CONFIG_TAB_IDS.has(
                    nextTab
                )
            ) {
                setExpandedMenu(
                    "facturacion-config"
                );
            }


            navigate(
                "/admin",
                {
                    replace:
                        true,

                    state:
                        {},
                }
            );
        },
        [
            location.state,
            navigate,
        ]
    );


    /*
     * ==========================================
     * FEATURES POR PLAN
     * ==========================================
     */

    const PLAN_FEATURES_FALLBACK = {
        emprendedor: {
            basicReports:
                true,

            advancedReports:
                false,

            productReports:
                false,

            financialAnalysis:
                false,

            employees:
                true,

            payroll:
                false,

            menu:
                true,

            tables:
                true,

            fiscal:
                false,

            printers:
                true,

            inventory:
                false,

            suppliers:
                false,

            inventoryCategories:
                false,

            expenses:
                false,

            financeSummary:
                false,

            notifications:
                false,

            accountsReceivable:
                false,
        },

        estandar: {
            basicReports:
                true,

            advancedReports:
                true,

            productReports:
                true,

            financialAnalysis:
                false,

            employees:
                true,

            payroll:
                false,

            menu:
                true,

            tables:
                true,

            fiscal:
                false,

            printers:
                true,

            inventory:
                true,

            suppliers:
                true,

            inventoryCategories:
                true,

            expenses:
                false,

            financeSummary:
                false,

            notifications:
                false,

            accountsReceivable:
                true,
        },

        premium: {
            basicReports:
                true,

            advancedReports:
                true,

            productReports:
                true,

            financialAnalysis:
                true,

            employees:
                true,

            payroll:
                false,

            menu:
                true,

            tables:
                true,

            fiscal:
                true,

            printers:
                true,

            inventory:
                true,

            suppliers:
                true,

            inventoryCategories:
                true,

            expenses:
                true,

            financeSummary:
                true,

            notifications:
                false,

            accountsReceivable:
                true,
        },

        pro: {
            basicReports:
                true,

            advancedReports:
                true,

            productReports:
                true,

            financialAnalysis:
                true,

            employees:
                true,

            payroll:
                true,

            menu:
                true,

            tables:
                true,

            fiscal:
                true,

            printers:
                true,

            inventory:
                true,

            suppliers:
                true,

            inventoryCategories:
                true,

            expenses:
                true,

            financeSummary:
                true,

            notifications:
                true,

            accountsReceivable:
                true,
        },
    };


    const fallbackFeatures =
        PLAN_FEATURES_FALLBACK[
            rawPlan
            ] ||
        PLAN_FEATURES_FALLBACK
            .emprendedor;


    const planFeatures = {
        ...fallbackFeatures,

        ...(
            usageData
                ?.features ||
            {}
        ),

        /*
         * Seguridad visual:
         * Premium debe tener Registro de gastos
         * y Reporte de gastos.
         */
        ...(
            rawPlan ===
            "premium"
                ? {
                    expenses:
                        true,

                    financeSummary:
                        true,
                }
                : {}
        ),
    };


    const canUseFeature = (
        feature
    ) =>
        Boolean(
            planFeatures?.[
                feature
                ]
        );


    const canInventory =
        canUseFeature(
            "inventory"
        );


    const canAccessCashRegister =
        isOwnerOrAdmin ||
        isCashier;


    const canAccountsReceivable =
        canUseFeature(
            "accountsReceivable"
        ) &&
        (
            isOwnerOrAdmin ||
            hasAccountsReceivablePermission
        );


    /*
     * ==========================================
     * MENSAJE DE UPGRADE
     * ==========================================
     */

    const planUpgradeMessage = {
            emprendedor:
                t(
                    "admin.plan.upgradeMessages.emprendedor"
                ),

            estandar:
                t(
                    "admin.plan.upgradeMessages.estandar"
                ),

            premium:
                t(
                    "admin.plan.upgradeMessages.premium"
                ),

            pro:
                "",
        }[
            rawPlan
            ] ||
        "";


    const totalUsersLimit =
        limits.maxUsers ===
        null ||
        limits.maxUsers ===
        undefined
            ? "∞"
            : limits.maxUsers;


    const dishesLimit =
        limits.maxDishes ===
        null ||
        limits.maxDishes ===
        undefined
            ? "∞"
            : limits.maxDishes;


    const tablesLimit =
        limits.maxTables ===
        null ||
        limits.maxTables ===
        undefined
            ? "∞"
            : limits.maxTables;


    const progress = (
        used,
        max
    ) => {
        if (
            max ===
            null ||
            max ===
            undefined ||
            max ===
            "∞"
        ) {
            return 0;
        }


        if (
            max ===
            0
        ) {
            return 0;
        }


        return Math.min(
            100,
            Math.round(
                (
                    used /
                    max
                ) *
                100
            )
        );
    };


    const isNearLimit = (
        used,
        max
    ) => {
        if (
            max ===
            null ||
            max ===
            undefined ||
            max ===
            "∞"
        ) {
            return false;
        }


        return (
            used /
            max >=
            0.8
        );
    };


    /*
     * ==========================================
     * CONFIGURACIÓN DEL MENÚ
     * ==========================================
     */

    const menuSectionsBase = [
        {
            id:
                "reportes",

            label:
                t(
                    "admin.menu.sections.reportsAnalysis"
                ),

            icon:
            BarChart3,

            color:
                "text-blue-400",

            bgColor:
                "bg-blue-500/10",

            borderColor:
                "border-blue-500/20",

            items: [
                ...(
                    canAccessCashRegister
                        ? [
                            {
                                id:
                                    "cash-register",

                                label:
                                    t(
                                        "admin.menu.items.cashRegister.label"
                                    ),

                                icon:
                                Wallet,

                                description:
                                    t(
                                        "admin.menu.items.cashRegister.description"
                                    ),
                            },
                        ]
                        : []
                ),

                ...(
                    canAccountsReceivable
                        ? [
                            {
                                id:
                                    "accounts-receivable",

                                label:
                                    t(
                                        "admin.menu.items.accountsReceivable.label"
                                    ),

                                icon:
                                CreditCard,

                                description:
                                    t(
                                        "admin.menu.items.accountsReceivable.description"
                                    ),
                            },
                        ]
                        : []
                ),

                {
                    id:
                        "sales-reports",

                    label:
                        t(
                            "admin.menu.items.salesReports.label"
                        ),

                    icon:
                    DollarSign,

                    description:
                        t(
                            "admin.menu.items.salesReports.description"
                        ),
                },

                ...(
                    canUseFeature(
                        "productReports"
                    )
                        ? [
                            {
                                id:
                                    "product-reports",

                                label:
                                    t(
                                        "admin.menu.items.productReports.label"
                                    ),

                                icon:
                                PieChart,

                                description:
                                    t(
                                        "admin.menu.items.productReports.description"
                                    ),
                            },
                        ]
                        : []
                ),

                ...(
                    canUseFeature(
                        "financialAnalysis"
                    )
                        ? [
                            {
                                id:
                                    "financial-analysis",

                                label:
                                    t(
                                        "admin.menu.items.financialAnalysis.label"
                                    ),

                                icon:
                                TrendingUp,

                                description:
                                    t(
                                        "admin.menu.items.financialAnalysis.description"
                                    ),
                            },
                        ]
                        : []
                ),
            ],
        },

        {
            id:
                "personal",

            label:
                t(
                    "admin.menu.sections.staffManagement"
                ),

            icon:
            Users,

            color:
                "text-green-400",

            bgColor:
                "bg-green-500/10",

            borderColor:
                "border-green-500/20",

            items: [
                {
                    id:
                        "employees",

                    label:
                        t(
                            "admin.menu.items.employees.label"
                        ),

                    icon:
                    Users,

                    description:
                        t(
                            "admin.menu.items.employees.description"
                        ),
                },

                ...(
                    canUseFeature(
                        "payroll"
                    )
                        ? [
                            {
                                id:
                                    "payroll",

                                label:
                                    t(
                                        "admin.menu.items.payroll.label"
                                    ),

                                icon:
                                Users,

                                description:
                                    t(
                                        "admin.menu.items.payroll.description"
                                    ),
                            },
                        ]
                        : []
                ),

                {
                    id:
                        "schedules",

                    label:
                        t(
                            "admin.menu.items.schedules.label"
                        ),

                    icon:
                    Calendar,

                    description:
                        t(
                            "admin.menu.items.schedules.description"
                        ),

                    comingSoon:
                        true,
                },

                {
                    id:
                        "attendance",

                    label:
                        t(
                            "admin.menu.items.attendance.label"
                        ),

                    icon:
                    Clock,

                    description:
                        t(
                            "admin.menu.items.attendance.description"
                        ),

                    comingSoon:
                        true,
                },
            ],
        },

        {
            id:
                "restaurante",

            label:
                t(
                    "admin.menu.sections.restaurant"
                ),

            icon:
            UtensilsCrossed,

            color:
                "text-purple-400",

            bgColor:
                "bg-purple-500/10",

            borderColor:
                "border-purple-500/20",

            items: [
                ...(isOwnerOrAdmin ? [{
                    id: "branches",
                    label: t("admin.menu.items.branches.label"),
                    icon: Store,
                    description: t("admin.menu.items.branches.description"),
                }] : []),
                {
                    id:
                        "menu-management",

                    label:
                        t(
                            "admin.menu.items.menuManagement.label"
                        ),

                    icon:
                    ShoppingBag,

                    description:
                        t(
                            "admin.menu.items.menuManagement.description"
                        ),
                },

                {
                    id:
                        "tables-management",

                    label:
                        t(
                            "admin.menu.items.tablesManagement.label"
                        ),

                    icon:
                    Table2,

                    description:
                        t(
                            "admin.menu.items.tablesManagement.description"
                        ),
                },

                ...(
                    canUseFeature(
                        "inventoryCategories"
                    )
                        ? [
                            {
                                id:
                                    "categories-inv",

                                label:
                                    t(
                                        "admin.menu.items.inventoryCategories.label"
                                    ),

                                icon:
                                ShoppingBag,

                                description:
                                    t(
                                        "admin.menu.items.inventoryCategories.description"
                                    ),
                            },
                        ]
                        : []
                ),
            ],
        },

        {
            id:
                "facturacion-config",

            label:
                t(
                    "admin.menu.sections.billingConfiguration"
                ),

            icon:
            Receipt,

            color:
                "text-orange-400",

            bgColor:
                "bg-orange-500/10",

            borderColor:
                "border-orange-500/20",

            items: [
                {
                    id:
                        "regional-config",

                    label:
                        t(
                            "admin.menu.items.regionalConfig.label"
                        ),

                    icon:
                    Globe2,

                    description:
                        t(
                            "admin.menu.items.regionalConfig.description"
                        ),
                },

                {
                    id:
                        "tax-config",

                    label:
                        t(
                            "admin.menu.items.taxConfig.label"
                        ),

                    icon:
                    Percent,

                    description:
                        t(
                            "admin.menu.items.taxConfig.description"
                        ),
                },

                {
                    id:
                        "service-charge-config",

                    label:
                        t(
                            "admin.menu.items.serviceCharges.label"
                        ),

                    icon:
                    DollarSign,

                    description:
                        t(
                            "admin.menu.items.serviceCharges.description"
                        ),
                },

                {
                    id:
                        "billing-config",

                    label:
                        t(
                            "admin.menu.items.billingGeneral.label"
                        ),

                    icon:
                    Receipt,

                    description:
                        t(
                            "admin.menu.items.billingGeneral.description"
                        ),
                },

                {
                    id:
                        "delivery-config",

                    label:
                        t(
                            "admin.menu.items.deliveryChannels.label"
                        ),

                    icon:
                    Store,

                    description:
                        t(
                            "admin.menu.items.deliveryChannels.description"
                        ),
                },

                {
                    id:
                        "tax-identity-config",

                    label:
                        t(
                            "admin.menu.items.taxIdentity.label"
                        ),

                    icon:
                    FileText,

                    description:
                        t(
                            "admin.menu.items.taxIdentity.description"
                        ),
                },

                /*
                 * ======================================
                 * FISCAL RD
                 * ======================================
                 *
                 * Se mantiene en español.
                 */

                ...(
                    isDominicanTenant &&
                    canUseFeature(
                        "fiscal"
                    )
                        ? [
                            {
                                id:
                                    "ncf-config",

                                label:
                                    "NCF / Comprobantes RD",

                                icon:
                                Receipt,

                                description:
                                    "Configuración de NCF B01 y B02",
                            },

                            {
                                id:
                                    "ecf-config",

                                label:
                                    "e-CF / DGII",

                                icon:
                                Shield,

                                description:
                                    "Facturación electrónica, certificado y DGII",
                            },
                        ]
                        : []
                ),

                ...(
                    canUseFeature(
                        "printers"
                    )
                        ? [
                            {
                                id:
                                    "printersconfig",

                                label:
                                    t(
                                        "admin.menu.items.printers.label"
                                    ),

                                icon:
                                Receipt,

                                description:
                                    t(
                                        "admin.menu.items.printers.description"
                                    ),
                            },
                        ]
                        : []
                ),
            ],
        },

        ...(
            canInventory
                ? [
                    {
                        id:
                            "inventario",

                        label:
                            t(
                                "admin.menu.sections.inventory"
                            ),

                        icon:
                        Package,

                        color:
                            "text-cyan-400",

                        bgColor:
                            "bg-cyan-500/10",

                        borderColor:
                            "border-cyan-500/20",

                        items: [
                            ...(
                                canUseFeature(
                                    "suppliers"
                                )
                                    ? [
                                        {
                                            id:
                                                "suppliers",

                                            label:
                                                t(
                                                    "admin.menu.items.suppliers.label"
                                                ),

                                            icon:
                                            Store,

                                            description:
                                                t(
                                                    "admin.menu.items.suppliers.description"
                                                ),
                                        },
                                    ]
                                    : []
                            ),

                            {
                                id:
                                    "inventory-stock",

                                label:
                                    t(
                                        "admin.menu.items.stockControl.label"
                                    ),

                                icon:
                                Package,

                                description:
                                    t(
                                        "admin.menu.items.stockControl.description"
                                    ),
                            },
                        ],
                    },
                ]
                : []
        ),

        ...(
            canUseFeature(
                "expenses"
            ) ||
            canUseFeature(
                "financeSummary"
            )
                ? [
                    {
                        id:
                            "gestion-financiera",

                        label:
                            t(
                                "admin.menu.sections.financialManagement"
                            ),

                        icon:
                        Wallet,

                        color:
                            "text-emerald-400",

                        bgColor:
                            "bg-emerald-500/10",

                        borderColor:
                            "border-emerald-500/20",

                        items: [
                            ...(
                                canUseFeature(
                                    "expenses"
                                )
                                    ? [
                                        {
                                            id:
                                                "expense-categories",

                                            label:
                                                t(
                                                    "admin.menu.items.expenseCategories.label"
                                                ),

                                            icon:
                                            FileText,

                                            description:
                                                t(
                                                    "admin.menu.items.expenseCategories.description"
                                                ),
                                        },

                                        {
                                            id:
                                                "expenses",

                                            label:
                                                t(
                                                    "admin.menu.items.expenses.label"
                                                ),

                                            icon:
                                            Receipt,

                                            description:
                                                t(
                                                    "admin.menu.items.expenses.description"
                                                ),
                                        },
                                    ]
                                    : []
                            ),

                            ...(
                                canUseFeature(
                                    "financeSummary"
                                )
                                    ? [
                                        {
                                            id:
                                                "expenses-summary",

                                            label:
                                                t(
                                                    "admin.menu.items.expenseSummary.label"
                                                ),

                                            icon:
                                            TrendingUp,

                                            description:
                                                t(
                                                    "admin.menu.items.expenseSummary.description"
                                                ),
                                        },
                                    ]
                                    : []
                            ),
                        ],
                    },
                ]
                : []
        ),

        {
            id:
                "configuracion",

            label:
                t(
                    "admin.menu.sections.settings"
                ),

            icon:
            Settings,

            color:
                "text-gray-400",

            bgColor:
                "bg-gray-500/10",

            borderColor:
                "border-gray-500/20",

            items: [
                ...(
                    canUseFeature(
                        "notifications"
                    )
                        ? [
                            {
                                id:
                                    "notifications",

                                label:
                                    t(
                                        "admin.menu.items.notifications.label"
                                    ),

                                icon:
                                Bell,

                                description:
                                    t(
                                        "admin.menu.items.notifications.description"
                                    ),
                            },
                        ]
                        : []
                ),

                {
                    id:
                        "help",

                    label:
                        t(
                            "admin.menu.items.help.label"
                        ),

                    icon:
                    HelpCircle,

                    description:
                        t(
                            "admin.menu.items.help.description"
                        ),
                },
            ],
        },
    ].filter(
        (
            section
        ) =>
            Array.isArray(
                section.items
            ) &&
            section.items.length >
            0
    );


    /*
     * ==========================================
     * MENÚ SEGÚN PERMISOS
     * ==========================================
     */

    const menuSections =
        useMemo(
            () => {
                if (
                    isOwnerOrAdmin
                ) {
                    return menuSectionsBase;
                }


                const sections =
                    [];


                const reportes =
                    menuSectionsBase.find(
                        (
                            section
                        ) =>
                            section.id ===
                            "reportes"
                    );


                if (
                    reportes
                ) {
                    const allowedReportItems = [
                        ...(
                            canAccessCashRegister
                                ? [
                                    "cash-register",
                                ]
                                : []
                        ),

                        ...(
                            canAccountsReceivable
                                ? [
                                    "accounts-receivable",
                                ]
                                : []
                        ),
                    ];


                    const reportItems =
                        (
                            reportes.items ||
                            []
                        ).filter(
                            (
                                item
                            ) =>
                                allowedReportItems.includes(
                                    item.id
                                )
                        );


                    if (
                        reportItems.length >
                        0
                    ) {
                        sections.push({
                            ...reportes,

                            items:
                            reportItems,
                        });
                    }
                }


                if (
                    canCreateProductsByPermission
                ) {
                    const restaurante =
                        menuSectionsBase.find(
                            (
                                section
                            ) =>
                                section.id ===
                                "restaurante"
                        );


                    if (
                        restaurante
                    ) {
                        sections.push({
                            ...restaurante,

                            items:
                                (
                                    restaurante.items ||
                                    []
                                ).filter(
                                    (
                                        item
                                    ) =>
                                        item.id ===
                                        "menu-management"
                                ),
                        });
                    }
                }


                if (
                    canInventory &&
                    canInventoryEntryByPermission
                ) {
                    const inventario =
                        menuSectionsBase.find(
                            (
                                section
                            ) =>
                                section.id ===
                                "inventario"
                        );


                    if (
                        inventario
                    ) {
                        sections.push({
                            ...inventario,

                            items:
                                (
                                    inventario.items ||
                                    []
                                ).filter(
                                    (
                                        item
                                    ) =>
                                        item.id ===
                                        "inventory-stock"
                                ),
                        });
                    }
                }


                return sections.filter(
                    (
                        section
                    ) =>
                        Array.isArray(
                            section.items
                        ) &&
                        section.items.length >
                        0
                );
            },
            [
                isOwnerOrAdmin,
                menuSectionsBase,
                canAccessCashRegister,
                canInventory,
                canCreateProductsByPermission,
                canInventoryEntryByPermission,
                canAccountsReceivable,
            ]
        );


    const toggleMenu = (
        menuId
    ) => {
        setExpandedMenu(
            expandedMenu ===
            menuId
                ? null
                : menuId
        );
    };


    const allowedTabIds =
        useMemo(
            () => {
                return new Set(
                    (
                        menuSections ||
                        []
                    )
                        .flatMap(
                            (
                                section
                            ) =>
                                section.items ||
                                []
                        )
                        .filter(
                            (
                                item
                            ) =>
                                !item.comingSoon &&
                                !item.action
                        )
                        .map(
                            (
                                item
                            ) =>
                                item.id
                        )
                );
            },
            [
                menuSections,
            ]
        );


    useEffect(
        () => {
            if (
                !allowedTabIds.size
            ) {
                return;
            }


            if (
                !allowedTabIds.has(
                    tab
                )
            ) {
                const fallbackTab =
                    allowedTabIds.has(
                        "cash-register"
                    )
                        ? "cash-register"
                        : [
                            ...allowedTabIds,
                        ][0];


                setTab(
                    fallbackTab
                );
            }
        },
        [
            allowedTabIds,
            tab,
        ]
    );


    const handleTabClick = (
        item
    ) => {
        if (
            item.action
        ) {
            item.action();

            return;
        }


        if (
            item.comingSoon
        ) {
            return;
        }


        if (
            !allowedTabIds.has(
                item.id
            )
        ) {
            return;
        }


        setTab(
            item.id
        );
    };


    /*
     * IMPORTANTE:
     * Este retorno queda después de todos los hooks.
     */
    if (
        !userData
    ) {
        return (
            <div className="bg-[#060606] min-h-screen flex items-center justify-center text-white">
                {t(
                    "admin.loading"
                )}
            </div>
        );
    }


    return (
        <div className="bg-gradient-to-br from-[#060606] via-[#0a0a0a] to-[#060606] min-h-screen py-10 pb-24 px-4 md:px-8 text-white">

            <div className="max-w-[1600px] mx-auto space-y-8">
                {/* ======================================
                    HEADER
                ====================================== */}

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                    <div className="space-y-2">

                        <div className="flex items-center gap-3">

                            <div className="p-2 bg-[#38bdf8]/10 rounded-lg border border-[#38bdf8]/20">

                                <Shield className="w-5 h-5 text-[#38bdf8]" />

                            </div>


                            <div>

                                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
                                    {t(
                                        "admin.header.eyebrow"
                                    )}
                                </p>


                                <h1 className="text-3xl md:text-4xl font-bold mt-0.5">
                                    {t(
                                        "admin.header.title"
                                    )}
                                </h1>

                            </div>

                        </div>


                        <p className="text-sm text-gray-400 ml-[52px]">
                            {t(
                                "admin.header.description"
                            )}
                        </p>

                    </div>


                    {isOwnerOrAdmin && (

                        <button
                            type="button"

                            onClick={() =>
                                navigate(
                                    "/register"
                                )
                            }

                            className="self-start md:self-auto group relative bg-[#38bdf8] text-black px-6 py-3 rounded-xl font-semibold hover:bg-[#7dd3fc] transition-all duration-300 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 hover:scale-105 flex items-center gap-2"
                        >

                            <UserPlus className="w-4 h-4" />


                            <span>
                                {t(
                                    "admin.header.registerUser"
                                )}
                            </span>

                        </button>

                    )}

                </div>


                {/* ======================================
                    MÉTRICAS
                ====================================== */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <button
                        type="button"

                        onClick={() =>
                            setShowPlanDetails(
                                true
                            )
                        }

                        className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 hover:border-[#38bdf8]/30 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/10 group text-left cursor-pointer"
                    >

                        <div className="flex items-center justify-between mb-3">

                            <p className="text-xs text-gray-400 uppercase tracking-[0.18em]">
                                {t(
                                    "admin.metrics.currentPlan"
                                )}
                            </p>


                            <TrendingUp className="w-4 h-4 text-[#38bdf8] opacity-0 group-hover:opacity-100 transition-opacity" />

                        </div>


                        <p className="text-lg font-semibold flex items-center gap-2 mb-3">

                            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/20 to-sky-500/10 text-sky-400 text-xs font-bold border border-sky-500/40">
                                {plan}
                            </span>

                        </p>


                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">

                            <p className="text-xs text-gray-400">
                                {t(
                                    "admin.metrics.users"
                                )}
                                :
                            </p>


                            <span className="font-semibold text-gray-100">
                                {usage.users || 0} / {totalUsersLimit}
                            </span>

                        </div>

                    </button>


                    <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 hover:border-[#38bdf8]/30 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/10 group">

                        <div className="flex items-center justify-between mb-3">

                            <p className="text-xs text-gray-400 uppercase tracking-[0.18em]">
                                {t(
                                    "admin.metrics.team"
                                )}
                            </p>


                            <Users className="w-4 h-4 text-[#38bdf8] opacity-0 group-hover:opacity-100 transition-opacity" />

                        </div>


                        <p className="text-lg font-semibold mb-3">

                            <span className="text-gray-300">
                                {usage.admins || 0}
                            </span>

                            <span className="text-gray-500 mx-2">
                                ·
                            </span>

                            <span className="text-gray-300">
                                {usage.cajeras || 0}
                            </span>

                            <span className="text-gray-500 mx-2">
                                ·
                            </span>

                            <span className="text-gray-300">
                                {usage.camareros || 0}
                            </span>

                        </p>


                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">

                            <p className="text-xs text-gray-400">
                                {t(
                                    "admin.metrics.totalActive"
                                )}
                                :
                            </p>


                            <span className="font-semibold text-gray-100">
                                {(usage.admins || 0) +
                                    (usage.cajeras || 0) +
                                    (usage.camareros || 0)}
                            </span>

                        </div>

                    </div>


                    <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 hover:border-[#38bdf8]/30 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/10 group">

                        <div className="flex items-center justify-between mb-3">

                            <p className="text-xs text-gray-400 uppercase tracking-[0.18em]">
                                {t(
                                    "admin.metrics.tablesAndDishes"
                                )}
                            </p>


                            <Package className="w-4 h-4 text-[#38bdf8] opacity-0 group-hover:opacity-100 transition-opacity" />

                        </div>


                        <p className="text-lg font-semibold mb-3">

                            <span className="text-gray-300">
                                {usage.tables || 0}
                            </span>

                            <span className="text-gray-500 mx-2">
                                {t(
                                    "admin.metrics.tables"
                                )}
                            </span>

                            <span className="text-gray-500 mx-2">
                                ·
                            </span>

                            <span className="text-gray-300">
                                {usage.dishes || 0}
                            </span>

                            <span className="text-gray-500 mx-2">
                                {t(
                                    "admin.metrics.dishes"
                                )}
                            </span>

                        </p>


                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">

                            <p className="text-xs text-gray-400">
                                {t(
                                    "admin.metrics.limit"
                                )}
                                :
                            </p>


                            <span className="font-semibold text-gray-100 text-xs">
                                {tablesLimit} / {dishesLimit}
                            </span>

                        </div>

                    </div>

                </div>


                {/* ======================================
                    CONTENIDO PRINCIPAL
                ====================================== */}

                <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6 mt-4">

                    {/* MENÚ LATERAL */}

                    <div className="hidden lg:block">

                        <div className="bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl p-4 shadow-xl sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto modern-scroll">

                            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-800/50">

                                <LayoutDashboard className="w-5 h-5 text-[#38bdf8]" />


                                <h3 className="text-sm font-semibold text-white">
                                    {t(
                                        "admin.navigation"
                                    )}
                                </h3>

                            </div>


                            <nav className="space-y-2">

                                {menuSections.map(
                                    (
                                        section
                                    ) => {
                                        const SectionIcon =
                                            section.icon;


                                        const isExpanded =
                                            expandedMenu ===
                                            section.id;


                                        const hasActiveItem =
                                            section.items.some(
                                                (
                                                    item
                                                ) =>
                                                    tab ===
                                                    item.id
                                            );


                                        return (
                                            <div
                                                key={
                                                    section.id
                                                }

                                                className="space-y-1"
                                            >

                                                <button
                                                    type="button"

                                                    onClick={() =>
                                                        toggleMenu(
                                                            section.id
                                                        )
                                                    }

                                                    className={`
                                                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                                        ${
                                                        hasActiveItem
                                                            ? `${section.bgColor} ${section.borderColor} border text-white`
                                                            : "hover:bg-[#1a1a1a] text-gray-400 hover:text-white"
                                                    }
                                                    `}
                                                >

                                                    <div className="flex items-center gap-2.5">

                                                        <SectionIcon
                                                            className={`w-4 h-4 ${section.color}`}
                                                        />


                                                        <span>
                                                            {section.label}
                                                        </span>

                                                    </div>


                                                    {isExpanded ? (

                                                        <ChevronDown className="w-4 h-4 text-gray-500" />

                                                    ) : (

                                                        <ChevronRight className="w-4 h-4 text-gray-500" />

                                                    )}

                                                </button>


                                                {isExpanded && (

                                                    <div className="ml-4 space-y-1 border-l border-gray-800/50 pl-3 py-1">

                                                        {section.items.map(
                                                            (
                                                                item
                                                            ) => {
                                                                const ItemIcon =
                                                                    item.icon;


                                                                const isActive =
                                                                    tab ===
                                                                    item.id &&
                                                                    !item.action;


                                                                const isComingSoon =
                                                                    item.comingSoon;


                                                                return (
                                                                    <button
                                                                        key={
                                                                            item.id
                                                                        }

                                                                        type="button"

                                                                        onClick={() =>
                                                                            handleTabClick(
                                                                                item
                                                                            )
                                                                        }

                                                                        disabled={
                                                                            isComingSoon
                                                                        }

                                                                        className={`
                                                                            w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                                                                            ${
                                                                            isActive
                                                                                ? "bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30"
                                                                                : isComingSoon
                                                                                    ? "text-gray-600 cursor-not-allowed opacity-50"
                                                                                    : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
                                                                        }
                                                                        `}

                                                                        title={
                                                                            item.description
                                                                        }
                                                                    >

                                                                        <ItemIcon className="w-3.5 h-3.5" />


                                                                        <span className="flex-1 text-left">
                                                                            {item.label}
                                                                        </span>


                                                                        {isComingSoon && (

                                                                            <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-800/50 rounded">
                                                                                {t(
                                                                                    "admin.comingSoon"
                                                                                )}
                                                                            </span>

                                                                        )}

                                                                    </button>
                                                                );
                                                            }
                                                        )}

                                                    </div>

                                                )}

                                            </div>
                                        );
                                    }
                                )}

                            </nav>

                        </div>

                    </div>


                    {/* CONTENIDO */}

                    <div className="min-w-0">

                        <div className="bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl p-3 sm:p-4 shadow-xl">

                            {/* TABS MÓVILES */}

                            <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-gray-800/50">

                                {menuSections
                                    .flatMap(
                                        (
                                            section
                                        ) =>
                                            section.items
                                    )
                                    .filter(
                                        (
                                            item
                                        ) =>
                                            !item.comingSoon &&
                                            !item.action
                                    )
                                    .map(
                                        (
                                            item
                                        ) => {
                                            const ItemIcon =
                                                item.icon;


                                            const isActive =
                                                tab ===
                                                item.id;


                                            return (
                                                <button
                                                    key={
                                                        item.id
                                                    }

                                                    type="button"

                                                    onClick={() =>
                                                        handleTabClick(
                                                            item
                                                        )
                                                    }

                                                    className={`
                                                        shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300
                                                        flex items-center gap-2
                                                        ${
                                                        isActive
                                                            ? "bg-gradient-to-r from-[#38bdf8] to-[#7dd3fc] text-black"
                                                            : "bg-[#1a1a1a] text-[#ababab] hover:bg-[#262626]"
                                                    }
                                                    `}
                                                >

                                                    <ItemIcon className="w-3.5 h-3.5" />


                                                    <span>
                                                        {item.label}
                                                    </span>

                                                </button>
                                            );
                                        }
                                    )}

                            </div>


                            {/* CONTENIDO DINÁMICO */}

                            <div className="transition-opacity duration-300">

                                {allowedTabIds.has(
                                    tab
                                ) && (

                                    <>

                                        {tab ===
                                            "cash-register" &&
                                            canAccessCashRegister && (

                                                <CashRegister />

                                            )}


                                        {tab ===
                                            "inventory-stock" && (

                                                <Inventory
                                                    plan={
                                                        rawPlan
                                                    }

                                                    currentUser={
                                                        effectiveUser
                                                    }
                                                />

                                            )}


                                        {tab ===
                                            "accounts-receivable" &&
                                            canAccountsReceivable && (

                                                <AccountsReceivable />

                                            )}


                                        {tab === "branches" && isOwnerOrAdmin && (
                                            <BranchesManagement isOwner={role === "Owner"} />
                                        )}

                                        {tab ===
                                            "employees" && (

                                                <Employees />

                                            )}


                                        {tab ===
                                            "regional-config" && (

                                                <FiscalConfig
                                                    view="regional"
                                                />

                                            )}


                                        {tab ===
                                            "tax-config" && (

                                                <FiscalConfig
                                                    view="taxes"
                                                />

                                            )}


                                        {tab ===
                                            "service-charge-config" && (

                                                <FiscalConfig
                                                    view="service-charges"
                                                />

                                            )}


                                        {tab ===
                                            "billing-config" && (

                                                <FiscalConfig
                                                    view="billing"
                                                />

                                            )}


                                        {tab ===
                                            "delivery-config" && (

                                                <FiscalConfig
                                                    view="delivery"
                                                />

                                            )}


                                        {tab ===
                                            "tax-identity-config" && (

                                                <TaxIdentityConfig />

                                            )}


                                        {tab ===
                                            "ncf-config" &&
                                            isDominicanTenant &&
                                            canUseFeature(
                                                "fiscal"
                                            ) && (

                                                <FiscalConfig
                                                    view="ncf"
                                                />

                                            )}


                                        {tab ===
                                            "ecf-config" &&
                                            isDominicanTenant &&
                                            canUseFeature(
                                                "fiscal"
                                            ) && (

                                                <FiscalConfig
                                                    view="ecf"
                                                />

                                            )}


                                        {tab ===
                                            "sales-reports" && (

                                                <SalesReports />

                                            )}


                                        {tab ===
                                            "product-reports" && (

                                                <ProductReports />

                                            )}


                                        {tab ===
                                            "financial-analysis" && (

                                                <FinancialAnalysis />

                                            )}


                                        {tab ===
                                            "expenses-summary" && (

                                                <FinanceSummary />

                                            )}


                                        {tab ===
                                            "expense-categories" && (

                                                <ExpenseCategories />

                                            )}


                                        {tab ===
                                            "expenses" && (

                                                <Expenses />

                                            )}


                                        {tab ===
                                            "payroll" && (

                                                <PayrollRuns />

                                            )}


                                        {tab ===
                                            "printersconfig" && (

                                                <PrintersConfig />

                                            )}


                                        {tab ===
                                            "menu-management" && (

                                                <MenuManagement
                                                    currentUser={
                                                        effectiveUser
                                                    }
                                                />

                                            )}


                                        {tab ===
                                            "tables-management" && (

                                                <TablesManagement />

                                            )}


                                        {tab ===
                                            "suppliers" && (

                                                <Suppliers />

                                            )}


                                        {tab ===
                                            "categories-inv" && (

                                                <InventoryCategories />

                                            )}


                                        {tab ===
                                            "notifications" && (

                                                <Notifications />

                                            )}


                                        {tab ===
                                            "help" && (

                                                <HelpAndSupport />

                                            )}


                                        {(
                                            tab ===
                                            "schedules" ||
                                            tab ===
                                            "attendance"
                                        ) && (

                                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">

                                                <div className="p-4 bg-[#38bdf8]/10 rounded-full mb-4">

                                                    {tab ===
                                                        "schedules" && (

                                                            <Calendar className="w-12 h-12 text-[#38bdf8]" />

                                                        )}


                                                    {tab ===
                                                        "attendance" && (

                                                            <Clock className="w-12 h-12 text-[#38bdf8]" />

                                                        )}

                                                </div>


                                                <h3 className="text-xl font-bold text-white mb-2">

                                                    {menuSections
                                                            .flatMap(
                                                                (
                                                                    section
                                                                ) =>
                                                                    section.items
                                                            )
                                                            .find(
                                                                (
                                                                    item
                                                                ) =>
                                                                    item.id ===
                                                                    tab
                                                            )
                                                            ?.label ||
                                                        t(
                                                            "admin.comingSoon"
                                                        )
                                                    }

                                                </h3>


                                                <p className="text-gray-400 max-w-md">

                                                    {menuSections
                                                            .flatMap(
                                                                (
                                                                    section
                                                                ) =>
                                                                    section.items
                                                            )
                                                            .find(
                                                                (
                                                                    item
                                                                ) =>
                                                                    item.id ===
                                                                    tab
                                                            )
                                                            ?.description ||
                                                        t(
                                                            "admin.comingSoonDescription"
                                                        )
                                                    }

                                                </p>

                                            </div>

                                        )}

                                    </>

                                )}

                            </div>

                        </div>

                    </div>

                </div>

            </div>


            {/* ======================================
                MODAL DEL PLAN
            ====================================== */}

            {showPlanDetails && (

                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"

                    onClick={() =>
                        setShowPlanDetails(
                            false
                        )
                    }
                >

                    <div
                        className="w-full max-w-lg bg-gradient-to-br from-[#101010] to-[#0a0a0a] rounded-2xl border border-gray-800/50 p-6 shadow-2xl mx-4"

                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="flex items-center justify-between mb-6">

                            <div>

                                <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-1">
                                    {t(
                                        "admin.plan.subscription"
                                    )}
                                </p>


                                <h3 className="text-xl font-semibold text-white flex items-center gap-2">

                                    {t(
                                        "admin.plan.currentPlan"
                                    )}
                                    :{" "}

                                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/20 to-sky-500/10 text-sky-400 text-sm font-bold border border-sky-500/40">
                                        {plan}
                                    </span>

                                </h3>


                                <p className="text-xs text-gray-400 mt-2">
                                    {t(
                                        "admin.plan.usageDescription"
                                    )}
                                </p>

                            </div>


                            <button
                                type="button"

                                onClick={() =>
                                    setShowPlanDetails(
                                        false
                                    )
                                }

                                className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"

                                aria-label={
                                    t(
                                        "common.close"
                                    )
                                }
                            >

                                <X className="w-5 h-5 text-gray-400" />

                            </button>

                        </div>


                        {rawPlan !==
                            "pro" && (

                                <button
                                    type="button"

                                    onClick={() => {
                                        window.open(
                                            "https://wa.link/vzbps9",
                                            "_blank",
                                            "noopener,noreferrer"
                                        );
                                    }}

                                    className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#38bdf8] text-black font-semibold hover:bg-[#7dd3fc] transition-all duration-300 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40"
                                >

                                    <TrendingUp className="w-4 h-4" />


                                    {t(
                                        "admin.plan.upgrade"
                                    )}

                                </button>

                            )}


                        <div className="space-y-4">

                            {/* USUARIOS */}

                            <div>

                                <div className="flex justify-between text-sm mb-2">

                                    <span className="text-gray-300 font-medium">
                                        {t(
                                            "admin.plan.totalUsers"
                                        )}
                                    </span>


                                    <span className="text-gray-400">

                                        {usage.users || 0} / {totalUsersLimit}


                                        {remaining.users !==
                                            null &&
                                            remaining.users !==
                                            undefined && (

                                                <span className="ml-2 text-xs text-gray-500">

                                                (
                                                    {t(
                                                        "admin.plan.remaining",
                                                        {
                                                            count:
                                                            remaining.users,
                                                        }
                                                    )}
                                                    )

                                            </span>

                                            )}

                                    </span>

                                </div>


                                <div className="w-full h-2 rounded-full bg-gray-800/50 overflow-hidden">

                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            isNearLimit(
                                                usage.users ||
                                                0,
                                                limits.maxUsers
                                            )
                                                ? "bg-red-500"
                                                : "bg-[#38bdf8]"
                                        }`}

                                        style={{
                                            width:
                                                `${progress(
                                                    usage.users ||
                                                    0,
                                                    limits.maxUsers
                                                )}%`,
                                        }}
                                    />

                                </div>

                            </div>


                            {/* ADMINS */}

                            <div>

                                <div className="flex justify-between text-sm mb-2">

                                    <span className="text-gray-300 font-medium">
                                        {t(
                                            "admin.plan.admins"
                                        )}
                                    </span>


                                    <span className="text-gray-400">

                                        {usage.admins || 0} / {limits.maxAdmins ?? "∞"}


                                        {remaining.admins !==
                                            null &&
                                            remaining.admins !==
                                            undefined && (

                                                <span className="ml-2 text-xs text-gray-500">

                                                (
                                                    {t(
                                                        "admin.plan.remaining",
                                                        {
                                                            count:
                                                            remaining.admins,
                                                        }
                                                    )}
                                                    )

                                            </span>

                                            )}

                                    </span>

                                </div>


                                <div className="w-full h-2 rounded-full bg-gray-800/50 overflow-hidden">

                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            isNearLimit(
                                                usage.admins ||
                                                0,
                                                limits.maxAdmins
                                            )
                                                ? "bg-red-500"
                                                : "bg-[#38bdf8]"
                                        }`}

                                        style={{
                                            width:
                                                `${progress(
                                                    usage.admins ||
                                                    0,
                                                    limits.maxAdmins
                                                )}%`,
                                        }}
                                    />

                                </div>

                            </div>


                            {/* CAJERAS */}

                            <div>

                                <div className="flex justify-between text-sm mb-2">

                                    <span className="text-gray-300 font-medium">
                                        {t(
                                            "admin.plan.cashiers"
                                        )}
                                    </span>


                                    <span className="text-gray-400">

                                        {usage.cajeras || 0} / {limits.maxCashiers ?? "∞"}


                                        {remaining.cajeras !==
                                            null &&
                                            remaining.cajeras !==
                                            undefined && (

                                                <span className="ml-2 text-xs text-gray-500">

                                                (
                                                    {t(
                                                        "admin.plan.remaining",
                                                        {
                                                            count:
                                                            remaining.cajeras,
                                                        }
                                                    )}
                                                    )

                                            </span>

                                            )}

                                    </span>

                                </div>


                                <div className="w-full h-2 rounded-full bg-gray-800/50 overflow-hidden">

                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            isNearLimit(
                                                usage.cajeras ||
                                                0,
                                                limits.maxCashiers
                                            )
                                                ? "bg-red-500"
                                                : "bg-[#38bdf8]"
                                        }`}

                                        style={{
                                            width:
                                                `${progress(
                                                    usage.cajeras ||
                                                    0,
                                                    limits.maxCashiers
                                                )}%`,
                                        }}
                                    />

                                </div>

                            </div>


                            {/* CAMAREROS */}

                            <div>

                                <div className="flex justify-between text-sm mb-2">

                                    <span className="text-gray-300 font-medium">
                                        {t(
                                            "admin.plan.waiters"
                                        )}
                                    </span>


                                    <span className="text-gray-400">

                                        {usage.camareros || 0} / {limits.maxWaiters ?? "∞"}


                                        {remaining.camareros !==
                                            null &&
                                            remaining.camareros !==
                                            undefined && (

                                                <span className="ml-2 text-xs text-gray-500">

                                                (
                                                    {t(
                                                        "admin.plan.remaining",
                                                        {
                                                            count:
                                                            remaining.camareros,
                                                        }
                                                    )}
                                                    )

                                            </span>

                                            )}

                                    </span>

                                </div>


                                <div className="w-full h-2 rounded-full bg-gray-800/50 overflow-hidden">

                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            isNearLimit(
                                                usage.camareros ||
                                                0,
                                                limits.maxWaiters
                                            )
                                                ? "bg-red-500"
                                                : "bg-[#38bdf8]"
                                        }`}

                                        style={{
                                            width:
                                                `${progress(
                                                    usage.camareros ||
                                                    0,
                                                    limits.maxWaiters
                                                )}%`,
                                        }}
                                    />

                                </div>

                            </div>


                            {/* PLATOS */}

                            <div>

                                <div className="flex justify-between text-sm mb-2">

                                    <span className="text-gray-300 font-medium">
                                        {t(
                                            "admin.plan.dishes"
                                        )}
                                    </span>


                                    <span className="text-gray-400">

                                        {usage.dishes || 0} / {dishesLimit}


                                        {remaining.dishes !==
                                            null &&
                                            remaining.dishes !==
                                            undefined && (

                                                <span className="ml-2 text-xs text-gray-500">

                                                (
                                                    {t(
                                                        "admin.plan.remaining",
                                                        {
                                                            count:
                                                            remaining.dishes,
                                                        }
                                                    )}
                                                    )

                                            </span>

                                            )}

                                    </span>

                                </div>


                                <div className="w-full h-2 rounded-full bg-gray-800/50 overflow-hidden">

                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            isNearLimit(
                                                usage.dishes ||
                                                0,
                                                limits.maxDishes
                                            )
                                                ? "bg-red-500"
                                                : "bg-[#38bdf8]"
                                        }`}

                                        style={{
                                            width:
                                                `${progress(
                                                    usage.dishes ||
                                                    0,
                                                    limits.maxDishes
                                                )}%`,
                                        }}
                                    />

                                </div>

                            </div>


                            {/* MESAS */}

                            <div>

                                <div className="flex justify-between text-sm mb-2">

                                    <span className="text-gray-300 font-medium">
                                        {t(
                                            "admin.plan.tables"
                                        )}
                                    </span>


                                    <span className="text-gray-400">

                                        {usage.tables || 0} / {tablesLimit}


                                        {remaining.tables !==
                                            null &&
                                            remaining.tables !==
                                            undefined && (

                                                <span className="ml-2 text-xs text-gray-500">

                                                (
                                                    {t(
                                                        "admin.plan.remaining",
                                                        {
                                                            count:
                                                            remaining.tables,
                                                        }
                                                    )}
                                                    )

                                            </span>

                                            )}

                                    </span>

                                </div>


                                <div className="w-full h-2 rounded-full bg-gray-800/50 overflow-hidden">

                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            isNearLimit(
                                                usage.tables ||
                                                0,
                                                limits.maxTables
                                            )
                                                ? "bg-red-500"
                                                : "bg-[#38bdf8]"
                                        }`}

                                        style={{
                                            width:
                                                `${progress(
                                                    usage.tables ||
                                                    0,
                                                    limits.maxTables
                                                )}%`,
                                        }}
                                    />

                                </div>

                            </div>

                        </div>


                        {planUpgradeMessage && (

                            <div className="mt-6 p-4 bg-[#1a1a1a] border border-gray-800/50 rounded-lg">

                                <p className="text-xs text-gray-400 text-center">
                                    {planUpgradeMessage}
                                </p>

                            </div>

                        )}

                    </div>

                </div>

            )}

        </div>
    );
};


export default Admin;