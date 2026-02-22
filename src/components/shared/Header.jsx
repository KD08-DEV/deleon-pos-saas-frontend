import React, { memo, useCallback, useState, useRef, useEffect } from "react";
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
import { useDispatch, useSelector } from "react-redux";
import { useMutation, useQuery } from "@tanstack/react-query";
import { logout } from "../../https";
import { removeUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../contexts/ThemeContext";
import api from "../../lib/api";

const Header = memo(() => {
    const { userData } = useSelector((state) => state.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { theme, setDarkTheme, setLightTheme } = useTheme();

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    const menuRef = useRef(null);
    const notifRef = useRef(null);

    // Plan gating (Premium/VIP)
    const rawPlan =
        (userData?.tenant?.plan ||
            userData?.plan ||
            userData?.subscription?.plan ||
            "") + "";
    const plan = rawPlan.toLowerCase();
    const canInventory = ["premium", "vip"].includes(plan);

    const logoutMutation = useMutation({
        mutationFn: () => logout(),
        onSuccess: () => {
            dispatch(removeUser());
            navigate("/auth");
        },
    });

    const handleLogout = useCallback(() => {
        logoutMutation.mutate();
        setIsUserMenuOpen(false);
    }, [logoutMutation]);

    const handleHome = useCallback(() => navigate("/"), [navigate]);
    const handleDashboard = useCallback(() => navigate("/dashboard"), [navigate]);

    // Notificaciones: low stock
    const lowStockQuery = useQuery({
        queryKey: ["inventory", "low-stock"],
        enabled: canInventory && isNotifOpen, // solo cuando abra la campana
        queryFn: async () => {
            const res = await api.get("/api/inventory/low-stock");
            return res.data?.items || res.data?.data?.items || [];
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    const lowStockItems = lowStockQuery.data || [];
    const lowStockCount = lowStockItems.length;

    // Cerrar menús al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const openInventoryFromNotif = (itemId) => {
        // abrimos /admin y mandamos state.tab para que Admin pueda setear el tab (ver patch abajo)
        navigate("/admin", { state: { tab: "inventory", focusItemId: itemId } });
        setIsNotifOpen(false);
    };

    return (
        <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex justify-between items-center h-20 px-6 lg:px-8 bg-gradient-to-r from-[#1a1a1a] via-[#1f1f1f] to-[#1a1a1a] border-b border-[#2a2a2a]/50 transition-colors duration-300"
        >
            <div
                onClick={handleHome}
                className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
            >
                <img src={logoApp} alt="Logo" className="h-12 object-contain" />
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
                {userData?.role === "Admin" && (
                    <button
                        onClick={handleDashboard}
                        className="relative bg-gradient-to-br from-[#1f1f1f] to-[#252525] rounded-xl p-3 cursor-pointer border border-[#2a2a2a]/50 hover:border-blue-500/50 hover:scale-105 active:scale-95 transition-all duration-200 group"
                        title="Dashboard"
                    >
                        <LayoutDashboard className="text-[#f5f5f5] text-xl group-hover:text-blue-400 transition-colors" />
                    </button>
                )}

                {/* Campana */}
                <div className="relative" ref={notifRef}>
                    <button
                        type="button"
                        onClick={() => setIsNotifOpen((v) => !v)}
                        className={`relative bg-gradient-to-br from-[#1f1f1f] to-[#252525] rounded-xl p-3 cursor-pointer border transition-all duration-200 group
              ${
                            canInventory
                                ? "border-[#2a2a2a]/50 hover:border-yellow-500/50 hover:scale-105 active:scale-95"
                                : "border-[#2a2a2a]/30 opacity-60 cursor-not-allowed"
                        }`}
                        disabled={!canInventory}
                        title={
                            canInventory
                                ? "Notificaciones de inventario"
                                : "Inventario disponible solo en Premium/VIP"
                        }
                    >
                        <Bell className="text-[#f5f5f5] text-xl group-hover:text-yellow-400 transition-colors" />

                        {/* Badge count */}
                        {canInventory && lowStockCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-yellow-500 text-black text-[11px] font-bold flex items-center justify-center border border-black/40">
                {lowStockCount > 99 ? "99+" : lowStockCount}
              </span>
                        )}
                    </button>

                    <AnimatePresence>
                        {isNotifOpen && canInventory && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                transition={{ duration: 0.18 }}
                                className="absolute right-0 mt-2 w-80 bg-gradient-to-br from-[#1f1f1f] to-[#252525] rounded-xl shadow-2xl border border-[#2a2a2a]/50 overflow-hidden z-50"
                            >
                                <div className="px-4 py-3 border-b border-[#2a2a2a]/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-yellow-400" />
                                        <p className="text-sm font-semibold text-[#f5f5f5]">
                                            Inventario
                                        </p>
                                    </div>
                                    <p className="text-xs text-[#ababab]">
                                        Bajo stock: {lowStockCount}
                                    </p>
                                </div>

                                <div className="max-h-80 overflow-auto">
                                    {lowStockQuery.isLoading ? (
                                        <div className="px-4 py-4 text-sm text-[#ababab]">
                                            Cargando…
                                        </div>
                                    ) : lowStockItems.length === 0 ? (
                                        <div className="px-4 py-4 text-sm text-[#ababab]">
                                            No hay alertas de bajo stock.
                                        </div>
                                    ) : (
                                        lowStockItems.slice(0, 10).map((it) => (
                                            <button
                                                key={it._id}
                                                onClick={() => openInventoryFromNotif(it._id)}
                                                className="w-full text-left px-4 py-3 hover:bg-yellow-500/10 transition-colors border-b border-[#2a2a2a]/30"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-[#f5f5f5] font-semibold truncate">
                                                            {it.name}
                                                        </p>
                                                        <p className="text-xs text-[#ababab]">
                                                            Stock: {it.stockCurrent} / Mín: {it.stockMin}{" "}
                                                            {it.unit ? `(${it.unit})` : ""}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs font-semibold text-yellow-400 whitespace-nowrap">
                            Bajo stock
                          </span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>

                                <div className="px-4 py-3 flex items-center justify-between">
                                    <button
                                        onClick={() => openInventoryFromNotif(null)}
                                        className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
                                    >
                                        Ver inventario
                                    </button>
                                    <button
                                        onClick={() => setIsNotifOpen(false)}
                                        className="text-sm text-[#ababab] hover:text-white transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Menú usuario */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
                    >
                        <div
                            className={`relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full p-2 border border-blue-500/30 group-hover:scale-110 transition-transform duration-200 ${
                                isUserMenuOpen ? "ring-2 ring-blue-500" : ""
                            }`}
                        >
                            <User className="text-blue-400 text-2xl" />
                        </div>
                        <div className="flex flex-col items-start">
                            <div className="flex items-center gap-1">
                                <h1 className="text-sm text-[#f5f5f5] font-semibold tracking-wide group-hover:text-white transition-colors">
                                    {userData?.name || "TEST USER"}
                                </h1>
                                <ChevronDown
                                    className={`text-[#ababab] w-4 h-4 transition-all duration-200 ${
                                        isUserMenuOpen ? "rotate-180" : ""
                                    }`}
                                />
                            </div>
                            <p className="text-xs text-[#ababab] font-medium group-hover:text-blue-400 transition-colors">
                                {userData?.role || "Role"}
                            </p>
                        </div>
                    </button>

                    <AnimatePresence>
                        {isUserMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute right-0 mt-2 w-64 bg-gradient-to-br from-[#1f1f1f] to-[#252525] rounded-xl shadow-2xl border border-[#2a2a2a]/50 overflow-hidden z-50 transition-colors duration-300"
                            >
                                <div className="px-4 py-3 border-b border-[#2a2a2a]/50 transition-colors duration-300">
                                    <p className="text-sm font-semibold text-[#f5f5f5] transition-colors duration-300">
                                        {userData?.name || "Usuario"}
                                    </p>
                                    <p className="text-xs text-[#ababab] mt-1 transition-colors duration-300">
                                        {userData?.role || "Role"}
                                    </p>
                                </div>

                                <div className="py-2">
                                    <div className="px-4 py-2 border-b border-[#2a2a2a]/30 transition-colors duration-300">
                                        <p className="text-xs font-semibold text-[#ababab] uppercase mb-2 transition-colors duration-300">
                                            Tema
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setDarkTheme();
                                                    setIsUserMenuOpen(false);
                                                }}
                                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
                                                    theme === "dark"
                                                        ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                                                        : "bg-[#2a2a2a]/50 border-[#2a2a2a]/50 text-[#ababab] hover:bg-[#2a2a2a] hover:text-white"
                                                }`}
                                            >
                                                <Moon className="w-4 h-4" />
                                                <span className="text-sm font-medium">Oscuro</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setLightTheme();
                                                    setIsUserMenuOpen(false);
                                                }}
                                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
                                                    theme === "light"
                                                        ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                                                        : "bg-[#2a2a2a]/50 border-[#2a2a2a]/50 text-[#ababab] hover:bg-[#2a2a2a] hover:text-white"
                                                }`}
                                            >
                                                <Sun className="w-4 h-4" />
                                                <span className="text-sm font-medium">Claro</span>
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-500/10 transition-colors duration-200 text-red-400"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        <span className="text-sm font-medium">Cerrar Sesión</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.header>
    );
});

Header.displayName = "Header";

export default Header;
