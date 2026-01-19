import React, { memo, useCallback, useState, useRef, useEffect } from "react";
import { User, Bell, LogOut, LayoutDashboard, Sun, Moon, ChevronDown } from "lucide-react";
import logoApp from "../../assets/images/logo-mark.png";
import { useDispatch, useSelector } from "react-redux";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../../https";
import { removeUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../contexts/ThemeContext";

const Header = memo(() => {
    const { userData } = useSelector((state) => state.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { theme, setDarkTheme, setLightTheme } = useTheme();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const menuRef = useRef(null);

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

    // Cerrar menú al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        if (isUserMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isUserMenuOpen]);

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
                <img
                    src={logoApp}
                    alt="Logo"
                    className="h-12 object-contain"
                />
                <div>
                    <h1 className="text-xl tracking-wide">
                        <span className="font-semibold text-[#f5f5f5] group-hover:text-white transition-colors">DeLeon </span>
                        <span className="font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">Soft</span>
                    </h1>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {userData?.role === "Admin" && (
                    <button
                        onClick={handleDashboard}
                        className="relative bg-gradient-to-br from-[#1f1f1f] to-[#252525] rounded-xl p-3 cursor-pointer border border-[#2a2a2a]/50 hover:border-blue-500/50 hover:scale-105 active:scale-95 transition-all duration-200 group"
                    >
                        <LayoutDashboard className="text-[#f5f5f5] text-xl group-hover:text-blue-400 transition-colors" />
                    </button>
                )}
                <div className="relative bg-gradient-to-br from-[#1f1f1f] to-[#252525] rounded-xl p-3 cursor-pointer border border-[#2a2a2a]/50 hover:border-yellow-500/50 hover:scale-105 active:scale-95 transition-all duration-200 group">
                    <Bell className="text-[#f5f5f5] text-xl group-hover:text-yellow-400 transition-colors" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full opacity-75" />
                </div>
                <div className="relative" ref={menuRef}>
                    {/* Avatar del usuario - clickeable */}
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
                    >
                        <div className={`relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full p-2 border border-blue-500/30 group-hover:scale-110 transition-transform duration-200 ${isUserMenuOpen ? 'ring-2 ring-blue-500' : ''}`}>
                            <User className="text-blue-400 text-2xl" />
                        </div>
                        <div className="flex flex-col items-start">
                            <div className="flex items-center gap-1">
                                <h1 className="text-sm text-[#f5f5f5] font-semibold tracking-wide group-hover:text-white transition-colors">
                                    {userData?.name || "TEST USER"}
                                </h1>
                                <ChevronDown className={`text-[#ababab] w-4 h-4 transition-all duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </div>
                            <p className="text-xs text-[#ababab] font-medium group-hover:text-blue-400 transition-colors">
                                {userData?.role || "Role"}
                            </p>
                        </div>
                    </button>

                    {/* Menú desplegable */}
                    <AnimatePresence>
                        {isUserMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute right-0 mt-2 w-64 bg-gradient-to-br from-[#1f1f1f] to-[#252525] rounded-xl shadow-2xl border border-[#2a2a2a]/50 overflow-hidden z-50 transition-colors duration-300"
                            >
                                {/* Información del usuario */}
                                <div className="px-4 py-3 border-b border-[#2a2a2a]/50 transition-colors duration-300">
                                    <p className="text-sm font-semibold text-[#f5f5f5] transition-colors duration-300">{userData?.name || "Usuario"}</p>
                                    <p className="text-xs text-[#ababab] mt-1 transition-colors duration-300">{userData?.role || "Role"}</p>
                                </div>

                                {/* Opciones del menú */}
                                <div className="py-2">
                                    {/* Opción de tema */}
                                    <div className="px-4 py-2 border-b border-[#2a2a2a]/30 transition-colors duration-300">
                                        <p className="text-xs font-semibold text-[#ababab] uppercase mb-2 transition-colors duration-300">Tema</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setDarkTheme();
                                                    setIsUserMenuOpen(false);
                                                }}
                                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
                                                    theme === 'dark'
                                                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                                        : 'bg-[#2a2a2a]/50 border-[#2a2a2a]/50 text-[#ababab] hover:bg-[#2a2a2a] hover:text-white'
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
                                                    theme === 'light'
                                                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                                        : 'bg-[#2a2a2a]/50 border-[#2a2a2a]/50 text-[#ababab] hover:bg-[#2a2a2a] hover:text-white'
                                                }`}
                                            >
                                                <Sun className="w-4 h-4" />
                                                <span className="text-sm font-medium">Claro</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Botón de logout */}
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

Header.displayName = 'Header';

export default Header;
