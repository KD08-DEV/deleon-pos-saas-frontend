import React, { useState } from "react";
import { FaHome } from "react-icons/fa";
import { MdOutlineReorder, MdTableBar, MdOutlineSettings } from "react-icons/md";
import { BiSolidDish } from "react-icons/bi";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "./Modal";
import { useDispatch, useSelector } from "react-redux";
import { setCustomer } from "../../redux/slices/customerSlice";
import { useMutation } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { addOrder } from "../../https";

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();


    const { userData } = useSelector((s) => s.user);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [guestCount, setGuestCount] = useState(0);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    if (userData?.role === "SuperAdmin") {
        return (
            <div className="fixed bottom-0 left-0 right-0 bg-[#262626] p-2 h-16 flex justify-center items-center z-40">
                <button
                    className="flex items-center justify-center font-bold text-yellow-400 w-[400px]"
                    onClick={() => navigate("/superadmin")}
                >
                    SuperAdmin Panel
                </button>
            </div>
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

    return (
        <>
            {/* 🔹 Bottom navigation bar (diseño original) */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#262626] p-2 h-16 flex justify-between items-center z-40">
                <button
                    className={`flex items-center justify-center font-bold ${
                        isActive("/") ? "text-white" : "text-[#ababab]"
                    } w-[300px]`}
                    onClick={() => navigate("/")}
                >
                    <FaHome className="inline mr-2" size={20} /> Home
                </button>

                <button
                    className={`flex items-center justify-center font-bold ${
                        isActive("/orders") ? "text-white" : "text-[#ababab]"
                    } w-[300px]`}
                    onClick={() => navigate("/orders")}
                >
                    <MdOutlineReorder className="inline mr-2" size={20} /> Ordenes
                </button>

                {/* 🔸 Botón central: abrir modal para crear orden */}
                <button
                    onClick={openModal}
                    className="w-16 h-16 rounded-full bg-[#e7b400] text-black font-bold flex items-center justify-center -mt-10 shadow-lg"
                    title="Create Order"
                >
                    <BiSolidDish size={24} />
                </button>


                <button
                    className={`flex items-center justify-center font-bold ${
                        isActive("/tables") ? "text-white" : "text-[#ababab]"
                    } w-[300px]`}
                    onClick={() => navigate("/tables")}
                >
                    <MdTableBar className="inline mr-2" size={20} />Mesas
                </button>

                {/* 🔒 Mostrar botón Admin SOLO si el rol es "Admin" */}
                {userData?.role === "Admin" && (
                    <button
                        className={`flex items-center justify-center font-bold ${
                            isActive("/admin") ? "text-white" : "text-[#ababab]"
                        } w-[300px]`}
                        onClick={() => navigate("/admin")}
                    >
                        <MdOutlineSettings className="inline mr-2" size={20} /> Admin
                    </button>
                )}

            </div>

            {/* 🔹 Modal Crear Orden (sin cambios visuales) */}
            {isModalOpen && (
                <Modal onClose={closeModal} title="Create Order">
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
                            <button
                                onClick={handleCreateOrder}
                                disabled={createOrder.isPending}
                                className="w-full py-3 rounded-lg bg-[#e7b400] text-black font-semibold hover:opacity-90 disabled:opacity-70"
                            >
                                {createOrder.isPending ? "Creating..." : "Create Order"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default BottomNav;
