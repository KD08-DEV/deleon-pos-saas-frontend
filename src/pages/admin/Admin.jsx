import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

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
    X
} from "lucide-react";
import ExpenseCategories from "./ExpenseCategories";
import Expenses from "./Expenses";
import PayrollRuns from "./PayrollRuns";
import FinanceSummary from "./FinanceSummary";


import Reports from "./Reports";
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


const Admin = () => {
    const [tab, setTab] = useState("cash-register");
    const location = useLocation();
    const [expandedMenu, setExpandedMenu] = useState("reportes"); // Menú expandido por defecto
    const [showPlanDetails, setShowPlanDetails] = useState(false);
    const navigate = useNavigate();
    const { userData, isAuth } = useSelector((state) => state.user);
    const role = userData?.role;
    const isCashier = role === "Cajera";
    const isOwnerOrAdmin = ["Owner", "Admin"].includes(role);


    // 🔐 Redirección segura
    useEffect(() => {
        if (!isAuth) {
            navigate("/");
            return;
        }
        const role = userData?.role;

        const canEnterAdminPanel = ["Owner", "Admin", "Cajera"].includes(role);
        if (!canEnterAdminPanel) {
            navigate("/");
            return;
        }

        // Si es Cajera, mándala directo a reportes (evita tabs de gestión)
        if (role === "Cajera") {
            setTab("cash-register"); // o "sales-reports" si prefieres
            setExpandedMenu("reportes");
        }
    }, [userData, isAuth, navigate]);
    useEffect(() => {
        const nextTab = location.state?.tab;
        if (nextTab) {
            setTab(nextTab);
            // opcional: limpia el state para que no se re-aplique en refresh
            navigate("/admin", { replace: true, state: {} });
        }
    }, [location.state, navigate]);


    // ⏳ Evitar pantalla en blanco mientras carga el usuario
    if (!userData) {
        return (
            <div className="bg-[#060606] min-h-screen flex items-center justify-center text-white">
                Loading...
            </div>
        );
    }


    // 📊 Traer resumen de uso del plan
    const { data: usageData } = useQuery({
        queryKey: ["admin-usage-summary"],
        queryFn: async () => {
            const res = await api.get("/api/admin/usage");
            return res.data?.data; // { plan, limits, usage, remaining }
        },
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnReconnect: true,
    });

    const plan = usageData?.plan?.toUpperCase() || "Emprendedor";
    const limits = usageData?.limits || {};
    const usage = usageData?.usage || {};
    const remaining = usageData?.remaining || {};
    const rawPlan = (usageData?.plan || "emprendedor").toLowerCase();
    const canInventory = ["premium", "vip"].includes(rawPlan);

    const totalUsersLimit =
        limits.maxUsers === null || limits.maxUsers === undefined
            ? "∞"
            : limits.maxUsers;

    const dishesLimit =
        limits.maxDishes === null || limits.maxDishes === undefined
            ? "∞"
            : limits.maxDishes;

    const tablesLimit =
        limits.maxTables === null || limits.maxTables === undefined
            ? "∞"
            : limits.maxTables;

    // Calcular progreso y colores para el modal
    const progress = (used, max) => {
        if (max === null || max === undefined || max === "∞") return 0;
        if (max === 0) return 0;
        return Math.min(100, Math.round((used / max) * 100));
    };

    const isNearLimit = (used, max) => {
        if (max === null || max === undefined || max === "∞") return false;
        return used / max >= 0.8;
    };

    // Configuración de menú con submenús organizados
    const menuSectionsBase  = [
        {
            id: "reportes",
            label: "Reportes y Análisis",
            icon: BarChart3,
            color: "text-blue-400",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20",
            items: [
                {
                    id: "cash-register",
                    label: "Cierre de Caja",
                    icon: Wallet,
                    description: "Control de cierre de caja diario"
                },
                {
                    id: "sales-reports",
                    label: "Reportes de Ventas",
                    icon: DollarSign,
                    description: "Análisis de ventas y facturación"
                },
                {
                    id: "product-reports",
                    label: "Reportes de Productos",
                    icon: PieChart,
                    description: "Productos más vendidos"
                },
                {
                    id: "financial-analysis",
                    label: "Análisis Financiero",
                    icon: TrendingUp,
                    description: "Análisis detallado de finanzas"
                },
            ]
        },
        {
            id: "personal",
            label: "Gestión de Personal",
            icon: Users,
            color: "text-green-400",
            bgColor: "bg-green-500/10",
            borderColor: "border-green-500/20",
            items: [
                {
                    id: "employees",
                    label: "Empleados",
                    icon: Users,
                    description: "Gestionar empleados"
                },
                {
                    id: "payroll",
                    label: "Nómina",
                    icon: Users,
                    description: "Crear corridas y postear gasto"
                },

                {
                    id: "schedules",
                    label: "Horarios y Turnos",
                    icon: Calendar,
                    description: "Gestionar horarios de trabajo",
                    comingSoon: true
                },
                {
                    id: "attendance",
                    label: "Asistencia",
                    icon: Clock,
                    description: "Control de asistencia",
                    comingSoon: true
                }
            ]
        },
        {
            id: "restaurante",
            label: "Restaurante",
            icon: UtensilsCrossed,
            color: "text-purple-400",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/20",
            items: [
                {
                    id: "menu-management",
                    label: "Gestión de Menú",
                    icon: ShoppingBag,
                    description: "Administrar platos y categorías"
                },
                {
                    id: "tables-management",
                    label: "Gestión de Mesas",
                    icon: Table2,
                    description: "Administrar mesas del restaurante"
                },
                {
                    id: "categories-inv",
                    label: "Categorías",
                    icon: ShoppingBag,
                    description: "Organizar categorías"
                },
            ]
        },
        {
            id: "fiscal",
            label: "Configuración Fiscal",
            icon: Receipt,
            color: "text-orange-400",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/20",
            items: [
                {
                    id: "fiscal",
                    label: "NCF / Fiscal",
                    icon: Receipt,
                    description: "Configuración de comprobantes fiscales"
                },
                {
                    id: "tax-config",
                    label: "Configuración de Impuestos",
                    icon: CreditCard,
                    description: "Gestionar impuestos y tasas",
                    comingSoon: true
                }
            ]
        },
        ...(canInventory
            ? [
                {
                    id: "inventario",
                    label: "Inventario",
                    icon: Package,
                    color: "text-cyan-400",
                    bgColor: "bg-cyan-500/10",
                    borderColor: "border-cyan-500/20",
                    items: [
                        {
                            id: "suppliers",
                            label: "Proveedores",
                            icon: Store,
                            description: "Gestionar proveedores",
                        },
                        {
                            id: "inventory-stock", // <-- id único
                            label: "Control de Stock",
                            icon: Package,
                            description: "Inventario y stock de ingredientes"
                        },

                    ],
                },
            ]
            : []),

        ...(canInventory ? [] : []),
        {
            id: "gestion-financiera",
            label: "Gestión Financiera",
            icon: Wallet,
            color: "text-emerald-400",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
            items: [
                {
                    id: "expense-categories",
                    label: "Categorías de gasto",
                    icon: FileText,
                    description: "Crear/editar categorías de gasto"
                },
                {
                    id: "expenses",
                    label: "Registro de gastos",
                    icon: Receipt,
                    description: "Registrar gastos operativos"
                },
                {
                    id: "expenses-summary",
                    label: "Reporte de gastos",
                    icon: TrendingUp,
                    description: "Resumen y análisis de gastos"
                },
            ]
        },
        {
            id: "configuracion",
            label: "Configuración",
            icon: Settings,
            color: "text-gray-400",
            bgColor: "bg-gray-500/10",
            borderColor: "border-gray-500/20",
            items: [
                {
                    id: "notifications",
                    label: "Notificaciones",
                    icon: Bell,
                    description: "Configurar notificaciones"
                },
                {
                    id: "help",
                    label: "Ayuda y Soporte",
                    icon: HelpCircle,
                    description: "Documentación y ayuda"
                }
            ]
        }
    ];

    const menuSections = useMemo(() => {
        // Cajera: solo puede ver Reportes y Análisis → Cierre de Caja
        if (isCashier) {
            const reportes = menuSectionsBase.find((s) => s.id === "reportes");
            if (!reportes) return [];
            return [
                {
                    ...reportes,
                    items: (reportes.items || []).filter((i) => i.id === "cash-register"),
                },
            ];
        }

        // Owner/Admin: todo normal
        return menuSectionsBase;
    }, [isCashier, menuSectionsBase]);



    const toggleMenu = (menuId) => {
        setExpandedMenu(expandedMenu === menuId ? null : menuId);
    };
    const allowedTabIds = useMemo(() => {
        return new Set(
            (menuSections || [])
                .flatMap((s) => s.items || [])
                .filter((i) => !i.comingSoon && !i.action)
                .map((i) => i.id)
        );
    }, [menuSections]);


    const handleTabClick = (item) => {
        if (item.action) {
            item.action();
            return;
        }
        if (item.comingSoon) return;

        // 🔒 Si no está permitido para el rol, no lo dejes cambiar
        if (!allowedTabIds.has(item.id)) return;

        setTab(item.id);
    };


    return (
        <div className="bg-gradient-to-br from-[#060606] via-[#0a0a0a] to-[#060606] min-h-screen py-10 pb-24 px-4 md:px-8 text-white">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* HEADER MEJORADO */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#f6b100]/10 rounded-lg border border-[#f6b100]/20">
                                <Shield className="w-5 h-5 text-[#f6b100]" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
                                    Admin Dashboard
                                </p>
                                <h1 className="text-3xl md:text-4xl font-bold mt-0.5">
                                    Panel de Administración
                                </h1>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 ml-[52px]">
                            Gestiona tu equipo, revisa reportes y controla el uso de tu plan.
                        </p>
                    </div>
                    {isOwnerOrAdmin && (

                    <button
                        onClick={() => navigate("/register")}
                        className="self-start md:self-auto group relative bg-[#f6b100] text-black px-6 py-3 rounded-xl font-semibold hover:bg-[#ffd633] transition-all duration-300 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 hover:scale-105 flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Registrar Usuario</span>
                    </button>
                    )}
                </div>

                {/* MÉTRICAS RÁPIDAS MEJORADAS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => setShowPlanDetails(true)}
                        className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 hover:border-[#f6b100]/30 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10 group text-left cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-gray-400 uppercase tracking-[0.18em]">
                                Plan actual
                            </p>
                            <TrendingUp className="w-4 h-4 text-[#f6b100] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-lg font-semibold flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-yellow-500/10 text-yellow-400 text-xs font-bold border border-yellow-500/40">
                                {plan}
                            </span>
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
                            <p className="text-xs text-gray-400">Usuarios:</p>
                            <span className="font-semibold text-gray-100">
                                {usage.users || 0} / {totalUsersLimit}
                            </span>
                        </div>
                    </button>

                    <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 hover:border-[#f6b100]/30 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10 group">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-gray-400 uppercase tracking-[0.18em]">
                                Equipo
                            </p>
                            <Users className="w-4 h-4 text-[#f6b100] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-lg font-semibold mb-3">
                            <span className="text-gray-300">{usage.admins || 0}</span>
                            <span className="text-gray-500 mx-2">·</span>
                            <span className="text-gray-300">{usage.cajeras || 0}</span>
                            <span className="text-gray-500 mx-2">·</span>
                            <span className="text-gray-300">{usage.camareros || 0}</span>
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
                            <p className="text-xs text-gray-400">Total activos:</p>
                            <span className="font-semibold text-gray-100">
                                {(usage.admins || 0) +
                                    (usage.cajeras || 0) +
                                    (usage.camareros || 0)}
                            </span>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-2xl p-5 hover:border-[#f6b100]/30 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10 group">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-gray-400 uppercase tracking-[0.18em]">
                                Mesas & Platos
                            </p>
                            <Package className="w-4 h-4 text-[#f6b100] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-lg font-semibold mb-3">
                            <span className="text-gray-300">{usage.tables || 0}</span>
                            <span className="text-gray-500 mx-2">mesas</span>
                            <span className="text-gray-500 mx-2">·</span>
                            <span className="text-gray-300">{usage.dishes || 0}</span>
                            <span className="text-gray-500 mx-2">platos</span>
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
                            <p className="text-xs text-gray-400">Límite:</p>
                            <span className="font-semibold text-gray-100 text-xs">
                                {tablesLimit} / {dishesLimit}
                            </span>
                        </div>
                    </div>
                </div>


                {/* CONTENIDO PRINCIPAL CON MENÚ LATERAL Y CONTENIDO */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-4">
                    {/* MENÚ LATERAL CON SUBMENÚS */}
                    <div className="lg:col-span-1">
                        <div className="bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl p-4 shadow-xl sticky top-4">
                            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-800/50">
                                <LayoutDashboard className="w-5 h-5 text-[#f6b100]" />
                                <h3 className="text-sm font-semibold text-white">Navegación</h3>
                            </div>

                            <nav className="space-y-2">
                                {menuSections.map((section) => {
                                    const SectionIcon = section.icon;
                                    const isExpanded = expandedMenu === section.id;
                                    const hasActiveItem = section.items.some(item => tab === item.id);

                                    return (
                                        <div key={section.id} className="space-y-1">
                                            {/* Botón de categoría */}
                                            <button
                                                onClick={() => toggleMenu(section.id)}
                                                className={`
                                                    w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                                    ${hasActiveItem 
                                                        ? `${section.bgColor} ${section.borderColor} border text-white` 
                                                        : 'hover:bg-[#1a1a1a] text-gray-400 hover:text-white'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <SectionIcon className={`w-4 h-4 ${section.color}`} />
                                                    <span>{section.label}</span>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                                )}
                                            </button>

                                            {/* Submenú items */}
                                            {isExpanded && (
                                                <div className="ml-4 space-y-1 border-l border-gray-800/50 pl-3 py-1">
                                                    {section.items.map((item) => {
                                                        const ItemIcon = item.icon;
                                                        const isActive = tab === item.id && !item.action;
                                                        const isComingSoon = item.comingSoon;

                                                        return (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => handleTabClick(item)}
                                                                disabled={isComingSoon}
                                                                className={`
                                                                    w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                                                                    ${
                                                                        isActive
                                                                            ? "bg-[#f6b100]/20 text-[#f6b100] border border-[#f6b100]/30"
                                                                            : isComingSoon
                                                                            ? "text-gray-600 cursor-not-allowed opacity-50"
                                                                            : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
                                                                    }
                                                                `}
                                                                title={item.description}
                                                            >
                                                                <ItemIcon className="w-3.5 h-3.5" />
                                                                <span className="flex-1 text-left">{item.label}</span>
                                                                {isComingSoon && (
                                                                    <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-800/50 rounded">
                                                                        Próximamente
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                            </nav>
                        </div>
                    </div>

                    {/* CONTENIDO PRINCIPAL */}
                    <div className="lg:col-span-3">
                        <div className="bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl p-6 shadow-xl">
                            {/* TABS VISIBLES EN MÓVIL (ocultos en desktop) */}
                            <div className="lg:hidden flex flex-wrap gap-2 mb-6 border-b border-gray-800/50 pb-4">
                                {menuSections.flatMap(section => section.items)
                                    .filter(item => !item.comingSoon && !item.action)
                                    .map((item) => {
                                        const ItemIcon = item.icon;
                                        const isActive = tab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setTab(item.id)}
                                                className={`
                                                    px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300
                                                    flex items-center gap-2
                                                    ${
                                                        isActive
                                                            ? "bg-gradient-to-r from-[#f6b100] to-[#ffd633] text-black"
                                                            : "bg-[#1a1a1a] text-[#ababab] hover:bg-[#262626]"
                                                    }
                                                `}
                                            >
                                                <ItemIcon className="w-3.5 h-3.5" />
                                                <span>{item.label}</span>
                                            </button>
                                        );
                                    })}
                            </div>

                            {/* CONTENIDO DINÁMICO CON ANIMACIÓN */}
                            <div className="transition-opacity duration-300">
                                {tab === "cash-register" && <CashRegister />}
                                {tab === "inventory-stock" && <Inventory plan={rawPlan} />}
                                {tab === "reports" && <Reports />}
                                {tab === "employees" && <Employees />}
                                {tab === "fiscal" && <FiscalConfig />}
                                {tab === "sales-reports" && <SalesReports />}
                                {tab === "product-reports" && <ProductReports />}
                                {tab === "financial-analysis" && <FinancialAnalysis />}
                                {tab === "expenses-summary" && <FinanceSummary />}
                                {tab === "expense-categories" && <ExpenseCategories />}
                                {tab === "expenses" && <Expenses />}
                                {tab === "payroll" && <PayrollRuns />}

                                {tab === "menu-management" && <MenuManagement />}
                                {tab === "tables-management" && <TablesManagement />}
                                {tab === "suppliers" && <Suppliers />}
                                {tab === "categories-inv" && <InventoryCategories />}
                                {tab === "notifications" && <Notifications />}
                                {tab === "help" && <HelpAndSupport />}
                                {(tab === "schedules" || tab === "attendance" || tab === "tax-config") && (
                                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                                        <div className="p-4 bg-[#f6b100]/10 rounded-full mb-4">
                                            {tab === "sales-reports" && <DollarSign className="w-12 h-12 text-[#f6b100]" />}
                                            {tab === "product-reports" && <PieChart className="w-12 h-12 text-[#f6b100]" />}
                                            {tab === "financial-analysis" && <TrendingUp className="w-12 h-12 text-[#f6b100]" />}
                                            {tab === "schedules" && <Calendar className="w-12 h-12 text-[#f6b100]" />}
                                            {tab === "attendance" && <Clock className="w-12 h-12 text-[#f6b100]" />}
                                            {tab === "tax-config" && <CreditCard className="w-12 h-12 text-[#f6b100]" />}
                                            {tab === "suppliers" && <Store className="w-12 h-12 text-[#f6b100]" />}
                                            {tab === "categories-inv" && <ShoppingBag className="w-12 h-12 text-[#f6b100]" />}
                                            {tab === "notifications" && <Bell className="w-12 h-12 text-[#f6b100]" />}
                                            {tab === "help" && <HelpCircle className="w-12 h-12 text-[#f6b100]" />}
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">
                                            {menuSections.flatMap(s => s.items).find(i => i.id === tab)?.label || "Próximamente"}
                                        </h3>
                                        <p className="text-gray-400 max-w-md">
                                            {menuSections.flatMap(s => s.items).find(i => i.id === tab)?.description ||
                                             "Esta funcionalidad estará disponible próximamente."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de detalles del plan */}
            {showPlanDetails && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setShowPlanDetails(false)}
                >
                    <div
                        className="w-full max-w-lg bg-gradient-to-br from-[#101010] to-[#0a0a0a] rounded-2xl border border-gray-800/50 p-6 shadow-2xl mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-1">
                                    Suscripción
                                </p>
                                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                    Plan Actual:{" "}
                                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-yellow-500/10 text-yellow-400 text-sm font-bold border border-yellow-500/40">
                                        {plan}
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-400 mt-2">
                                    Uso basado en los recursos de su inquilino.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowPlanDetails(false)}
                                className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Botón Mejorar plan */}
                        <button
                            onClick={() => {
                                window.open("https://wa.link/vzbps9", "_blank", "noopener,noreferrer");
                            }}
                            className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#f6b100] text-black font-semibold hover:bg-[#ffd633] transition-all duration-300 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40"
                        >
                            <TrendingUp className="w-4 h-4" />
                            Mejorar plan
                        </button>

                        {/* Detalles del uso */}
                        <div className="space-y-4">
                            {/* Usuarios totales */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-300 font-medium">Usuarios totales</span>
                                    <span className="text-gray-400">
                                        {usage.users || 0} / {totalUsersLimit}
                                        {remaining.users !== null && remaining.users !== undefined && (
                                            <span className="ml-2 text-xs text-gray-500">
                                                ({remaining.users} left)
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-gray-800/50 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            isNearLimit(usage.users || 0, limits.maxUsers) ? "bg-red-500" : "bg-[#f6b100]"
                                        }`}
                                        style={{ width: `${progress(usage.users || 0, limits.maxUsers)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Admins */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-300 font-medium">Admins</span>
                                    <span className="text-gray-400">
                                        {usage.admins || 0} / {limits.maxAdmins ?? "∞"}
                                        {remaining.admins !== null && remaining.admins !== undefined && (
                                            <span className="ml-2 text-xs text-gray-500">
                                                ({remaining.admins} left)
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-gray-800/50 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            isNearLimit(usage.admins || 0, limits.maxAdmins) ? "bg-red-500" : "bg-[#f6b100]"
                                        }`}
                                        style={{ width: `${progress(usage.admins || 0, limits.maxAdmins)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Cajeras */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-300 font-medium">Cajeras</span>
                                    <span className="text-gray-400">
                                        {usage.cajeras || 0} / {limits.maxCashiers ?? "∞"}
                                        {remaining.cajeras !== null && remaining.cajeras !== undefined && (
                                            <span className="ml-2 text-xs text-gray-500">
                                                ({remaining.cajeras} left)
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-gray-800/50 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            isNearLimit(usage.cajeras || 0, limits.maxCashiers) ? "bg-red-500" : "bg-[#f6b100]"
                                        }`}
                                        style={{ width: `${progress(usage.cajeras || 0, limits.maxCashiers)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Camareros */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-300 font-medium">Camareros</span>
                                    <span className="text-gray-400">
                                        {usage.camareros || 0} / {limits.maxWaiters ?? "∞"}
                                        {remaining.camareros !== null && remaining.camareros !== undefined && (
                                            <span className="ml-2 text-xs text-gray-500">
                                                ({remaining.camareros} left)
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-gray-800/50 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            isNearLimit(usage.camareros || 0, limits.maxWaiters) ? "bg-red-500" : "bg-[#f6b100]"
                                        }`}
                                        style={{ width: `${progress(usage.camareros || 0, limits.maxWaiters)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Platos */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-300 font-medium">Platos</span>
                                    <span className="text-gray-400">
                                        {usage.dishes || 0} / {dishesLimit}
                                        {remaining.dishes !== null && remaining.dishes !== undefined && (
                                            <span className="ml-2 text-xs text-gray-500">
                                                ({remaining.dishes} left)
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-gray-800/50 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            isNearLimit(usage.dishes || 0, limits.maxDishes) ? "bg-red-500" : "bg-[#f6b100]"
                                        }`}
                                        style={{ width: `${progress(usage.dishes || 0, limits.maxDishes)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Mesas */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-300 font-medium">Mesas</span>
                                    <span className="text-gray-400">
                                        {usage.tables || 0} / {tablesLimit}
                                        {remaining.tables !== null && remaining.tables !== undefined && (
                                            <span className="ml-2 text-xs text-gray-500">
                                                ({remaining.tables} left)
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-gray-800/50 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            isNearLimit(usage.tables || 0, limits.maxTables) ? "bg-red-500" : "bg-[#f6b100]"
                                        }`}
                                        style={{ width: `${progress(usage.tables || 0, limits.maxTables)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Mensaje de mejora */}
                        {rawPlan !== "vip" && (
                            <div className="mt-6 p-4 bg-[#1a1a1a] border border-gray-800/50 rounded-lg">
                                <p className="text-xs text-gray-400 text-center">
                                    ¿Has llegado al límite? Pásate a PRO o VIP para obtener más usuarios, mesas y platos.
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
