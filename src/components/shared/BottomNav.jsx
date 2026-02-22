import React, { useState, memo, useCallback, useEffect  } from "react";
import { Home, ListOrdered, Table2, Settings, Plus, Wallet   } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "./Modal";
import { useDispatch, useSelector } from "react-redux";
import { setCustomer } from "../../redux/slices/customerSlice";
import { useMutation, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { addOrder, getCustomers, createCustomer } from "../../https";
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
    const [address, setAddress] = useState("");
    const [search, setSearch] = useState("");
    const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);
    const [showResults, setShowResults] = useState(false);


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
                    className="flex items-center justify-center gap-2 font-bold bg-gradient-to-r from-blue-500 to-blue-700 text-black px-6 py-3 rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all"
                    onClick={() => navigate("/superadmin")}
                >
                    <Settings className="w-5 h-5" />
                    SuperAdmin Panel
                </motion.button>
            </motion.div>
        );
    }
    const customersQuery = useQuery({
        queryKey: ["customers", isCustomerPickerOpen, search],
        queryFn: async () => {
            const q = String(search || "").trim(); // puede estar vacío
            const res = await getCustomers(q, 50); // más items para scroll
            return res?.data?.data || [];
        },
        enabled: isModalOpen && isCustomerPickerOpen,
        staleTime: 10_000,
    });
    const createCustomerMutation = useMutation({
        mutationFn: (body) => createCustomer(body),
    });
    const pickCustomer = (c) => {
        setSelectedCustomerId(c?._id || null);
        setName(c?.name || "");
        setPhone(c?.phone || "");
        setAddress(c?.address || "");
        setSearch(c?.name || "");
        setShowResults(false);
    };
    useEffect(() => {
        // Si el usuario cambia el nombre manualmente, quitamos selección para evitar inconsistencias
        // (solo si el nombre ya no coincide con el search del cliente seleccionado)
        if (!isModalOpen) return;
        if (!selectedCustomerId) return;

        // si están editando, asumimos que ya no es el mismo cliente
        // (puedes hacerlo más estricto si quieres)
    }, [name, selectedCustomerId, isModalOpen]);




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
                    customerId: selectedCustomerId || null,
                    name: name.trim(),
                    phone: String(phone || "").trim(),
                    address: String(address || "").trim(),
                    guests: Number(guestCount || 0),
                })
            );


            setName("");
            setPhone("");
            setGuestCount(0);
            closeModal();
            setAddress("");
            setSearch("");
            setSelectedCustomerId(null);
            setShowResults(false);

            navigate(`/tables?orderId=${orderId}`);
        },
        onError: (err) => {
            enqueueSnackbar(err?.response?.data?.message || "Error al crear la orden.", {
                variant: "error",
            });
        },
    });

    const handleCreateOrder = async () => {
        const cleanName = String(name || "").trim();
        const cleanPhone = String(phone || "").trim();
        const cleanAddress = String(address || "").trim();
        const guests = Number(guestCount || 0);

        const finalName = cleanName || "Consumidor Final";


        try {
            let customerIdToSend = selectedCustomerId;

            if (!customerIdToSend) {
                const shouldCreateCustomer = Boolean(cleanName) || Boolean(cleanPhone);

                if (shouldCreateCustomer) {
                    const created = await createCustomerMutation.mutateAsync({
                        name: cleanName || "Consumidor Final",
                        phone: cleanPhone,
                        address: cleanAddress,
                    });
                    customerIdToSend = created?.data?.data?._id || null;
                }
            }


            const payload = {
                customerId: customerIdToSend,
                customerDetails: {
                    guests,
                    name: finalName,
                    phone: cleanPhone,
                    address: cleanAddress,
                },
                user: userData?._id || null,
            };

            createOrder.mutate(payload);
        } catch (e) {
            const status = e?.response?.status;
            const code = e?.response?.data?.code;

            // Si backend devuelve "ya existe", usamos el customer existente
            if (status === 409 && code === "PHONE_ALREADY_EXISTS") {
                const existing = e?.response?.data?.data; // customer existente
                if (existing?._id) {
                    pickCustomer(existing);

                    const payload = {
                        customerId: existing._id,
                        customerDetails: {
                            guests,
                            name: existing.name || cleanName,
                            phone: existing.phone || cleanPhone,
                            address: existing.address || cleanAddress,
                        },
                        user: userData?._id || null,
                    };

                    enqueueSnackbar("Este teléfono ya existe. Usando el cliente guardado.", {
                        variant: "info",
                    });

                    createOrder.mutate(payload);
                    return;
                }
            }

            // Fallback: crear orden con snapshot aunque no se pudo guardar customer
            enqueueSnackbar("No se pudo guardar el cliente, pero se creará la orden.", {
                variant: "warning",
            });

            const payload = {
                customerId: null,
                customerDetails: {
                    guests,
                    name: finalName,
                    phone: cleanPhone,
                    address: cleanAddress,
                },
                user: userData?._id || null,
            };

            createOrder.mutate(payload);
        }
    };



    const isActive = (path) => location.pathname.startsWith(path);

    const navItems = [
        { path: "/", label: "Home", icon: Home, id: "home" },
        { path: "/orders", label: "Ordenes", icon: ListOrdered, id: "orders" },
        { path: "/tables", label: "Mesas", icon: Table2, id: "tables" },
    ];

    const role = userData?.role;
    const isCashier = role === "Cajera";
    const canSeeAdminPanel = ["Owner", "Admin"].includes(role);

    if (isCashier) {
        navItems.push({
            path: "/admin",
            label: "Cierre de caja",
            icon: Wallet,
            id: "cash-register",
        });
    } else if (canSeeAdminPanel) {
        navItems.push({
            path: "/admin",
            label: "Admin",
            icon: Settings,
            id: "admin",
        });
    }
    const needsCenterGap = navItems.length === 3;



    return (
        <>
            {/* Bottom navigation bar optimizado */}
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#1a1a1a] via-[#1f1f1f] to-[#1a1a1a] p-3 h-20 flex justify-between items-center z-50 border-t border-[#2a2a2a]/50 shadow-2xl transition-colors duration-300"
            >
                {navItems.map((item, idx) => {
                    const active = isActive(item.path);
                    const Icon = item.icon;

                    return (
                        <React.Fragment key={item.id}>
                            <button
                                onClick={() => navigate(item.path)}
                                className={`relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
                                    active ? "text-white" : "text-[#ababab] hover:text-white"
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

                            {/* ESPACIO CENTRAL para que el "+" no tape "Ordenes" cuando hay solo 3 opciones */}
                            {needsCenterGap && idx === 1 && (
                                <div className="w-16 pointer-events-none" aria-hidden="true" />
                            )}
                        </React.Fragment>
                    );
                })}


                {/* Botón central: crear orden - simplificado */}
                <button
                    onClick={openModal}
                    className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 via-blue-300 to-blue-950 text-black font-bold flex items-center justify-center shadow-2xl hover:shadow-blue-900/50 hover:scale-110 active:scale-95 transition-transform duration-200 z-50"
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
                            <label className="block mb-2 text-sm text-white/70">Buscar cliente guardado</label>


                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-400 to-blue-100 text-black font-semibold hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 transition-all"
                                onClick={() => {
                                    setIsCustomerPickerOpen((v) => !v);
                                    setShowResults(true);
                                    // si quieres que al abrir siempre muestre todo:
                                    // setSearch("");
                                }}
                            >
                                Buscar cliente
                            </button>


                        </div>
                        {selectedCustomerId ? (
                            <span className="text-xs text-white/70">
                                  Cliente seleccionado
                                </span>
                        ) : (
                            <span className="text-xs text-white/50">
                                  Opcional
                                </span>
                        )}

                        {isCustomerPickerOpen && (
                            <div className="mt-3 rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] p-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        className="w-full rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2 outline-none text-white"
                                        placeholder="Buscar por nombre, teléfono o dirección..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />

                                    <button
                                        type="button"
                                        className="px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a] text-white"
                                        onClick={() => setSearch("")}
                                    >
                                        Limpiar
                                    </button>
                                </div>

                                <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-[#1f1f1f]">
                                    {customersQuery.isLoading && (
                                        <div className="px-3 py-2 text-sm text-white/60">Cargando clientes...</div>
                                    )}

                                    {!customersQuery.isLoading && (customersQuery.data?.length || 0) === 0 && (
                                        <div className="px-3 py-2 text-sm text-white/60">
                                            No hay clientes para mostrar.
                                        </div>
                                    )}

                                    {(customersQuery.data || []).map((c) => (
                                        <button
                                            key={c._id}
                                            type="button"
                                            onClick={() => {
                                                pickCustomer(c);
                                                setIsCustomerPickerOpen(false);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-[#161616] border-b border-[#1f1f1f]"
                                        >
                                            <div className="text-sm font-semibold text-white">{c.name}</div>
                                            <div className="text-xs text-white/60">
                                                {c.phone || "Sin teléfono"} {c.address ? `• ${c.address}` : ""}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="button"
                                        className="px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a] text-white"
                                        onClick={() => setIsCustomerPickerOpen(false)}
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        )}


                        <div>
                            <label className="block mb-2 text-sm text-white/70">Customer Name</label>
                            <input
                                className="w-full rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2 outline-none text-white"
                                placeholder="Enter customer name"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (selectedCustomerId) setSelectedCustomerId(null);
                                }}

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
                            <label className="block mb-2 text-sm text-white/70">Dirección (opcional)</label>
                            <input
                                className="w-full rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2 outline-none text-white"
                                placeholder="Ej: Alma Rosa II, Calle..., Apto..."
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
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
                                className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-400 to-blue-800 text-black font-semibold hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 transition-all"
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
