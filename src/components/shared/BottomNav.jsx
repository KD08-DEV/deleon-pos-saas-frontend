import React, { useState, memo, useCallback } from "react";
import { Home, ListOrdered, Table2, Settings, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "./Modal";
import { useDispatch, useSelector } from "react-redux";
import { setCustomer } from "../../redux/slices/customerSlice";
import { useMutation } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { addOrder } from "../../https";
import { motion, AnimatePresence } from "framer-motion";

const BottomNav = memo(() => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { userData } = useSelector((s) => s.user);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [guestCount, setGuestCount] = useState(0);

    const openModal = useCallback(() => setIsModalOpen(true), []);
    const closeModal = useCallback(() => setIsModalOpen(false), []);

    if (userData?.role === "SuperAdmin") {
        return (
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#1a1a1a] to-[#1f1f1f] p-2 h-16 flex justify-center items-center z-40 border-t border-[#2a2a2a]/50 backdrop-blur-lg"
            >
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center gap-2 font-bold bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-6 py-3 rounded-xl shadow-lg hover:shadow-yellow-500/20 transition-all"
                    onClick={() => navigate("/superadmin")}
                >
                    <Settings className="w-5 h-5" />
                    SuperAdmin Panel
                </motion.button>
            </motion.div>
        );
    }

    // ✅ Crear orden sin mesa y redirigir a /tables
    const createOrder = useMutation({
        mutationFn: (payload) => addOrder(payload),
        onSuccess: (res) => {
            const orderId = res?.data?.data?._id;
            if (!orderId) {
                enqueueSnackbar("No se pudo crear la orden.", { variant: "error" });
                return;
            }

            dispatch(
                setCustomer({
                    customerName: name.trim(),
                    customerPhone: String(phone || "").trim(),
                    guests: Number(guestCount || 0),
                })
            );

            setName("");
            setPhone("");
            setGuestCount(0);
            closeModal();

            navigate(`/tables?orderId=${orderId}`);
        },
        onError: (err) => {
            enqueueSnackbar(err?.response?.data?.message || "Error al crear la orden.", {
                variant: "error",
            });
        },
    });

    const handleCreateOrder = () => {

        const payload = {
            customerDetails: {
                name: name?.trim() || "",
                phone: String(phone || "").trim(),
                guests: Number(guestCount || 0),
            },
            user: userData?._id || null
        };

        if (userData?._id) payload.user = userData._id;

        createOrder.mutate(payload);
    };

    const isActive = (path) => location.pathname.startsWith(path);

    const navItems = [
        { path: "/", label: "Home", icon: Home, id: "home" },
        { path: "/orders", label: "Ordenes", icon: ListOrdered, id: "orders" },
        { path: "/tables", label: "Mesas", icon: Table2, id: "tables" },
    ];

    const canSeeAdmin = ["Owner", "Admin", "Cajera"].includes(userData?.role);

    if (canSeeAdmin) {
        navItems.push({ path: "/admin", label: "Admin", icon: Settings, id: "admin" });
    }

    return (
        <>
            {/* Bottom navigation bar optimizado */}
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#1a1a1a] via-[#1f1f1f] to-[#1a1a1a] p-3 h-20 flex justify-between items-center z-50 border-t border-[#2a2a2a]/50 shadow-2xl transition-colors duration-300"
            >
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
                                active
                                    ? "text-white"
                                    : "text-[#ababab] hover:text-white"
                            }`}
                        >
                            {active && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30"
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                />
                            )}
                            <Icon className={`w-5 h-5 relative z-10 ${active ? "text-blue-400" : ""}`} />
                            <span className={`text-xs font-semibold relative z-10 ${active ? "text-blue-400" : ""}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                {/* Botón central: crear orden - simplificado */}
                <button
                    onClick={openModal}
                    className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-black font-bold flex items-center justify-center shadow-2xl hover:shadow-yellow-500/50 hover:scale-110 active:scale-95 transition-transform duration-200 z-50"
                    title="Crear Orden"
                >
                    <Plus className="w-7 h-7" />
                </button>
            </motion.div>

            {/* Modal Crear Orden mejorado */}
            <AnimatePresence>
                {isModalOpen && (
                    <Modal onClose={closeModal} title="Crear Nueva Orden">
                    <div className="space-y-4 text-white">
                        <div>
                            <label className="block mb-2 text-sm text-white/70">Customer Name</label>
                            <input
                                className="w-full rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2 outline-none text-white"
                                placeholder="Enter customer name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm text-white/70">
                                Customer Phone (optional)
                            </label>
                            <input
                                className="w-full rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2 outline-none text-white"
                                placeholder="+1-9999999999"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm text-white/70">Guests</label>
                            <div className="flex items-center justify-between rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2">
                                <button
                                    onClick={() => setGuestCount((g) => Math.max(0, g - 1))}
                                    className="px-3 py-1 bg-[#2a2a2a] rounded text-white"
                                >
                                    −
                                </button>
                                <span>{guestCount} Person</span>
                                <button
                                    onClick={() => setGuestCount((g) => g + 1)}
                                    className="px-3 py-1 bg-[#2a2a2a] rounded text-white"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleCreateOrder}
                                disabled={createOrder.isPending}
                                className="w-full py-3 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold hover:shadow-lg hover:shadow-yellow-500/30 disabled:opacity-70 transition-all"
                            >
                                {createOrder.isPending ? "Creando..." : "Crear Orden"}
                            </motion.button>
                        </div>
                    </div>
                    </Modal>
                )}
            </AnimatePresence>
        </>
    );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
