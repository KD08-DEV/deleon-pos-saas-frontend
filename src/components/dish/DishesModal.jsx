import React, { useState } from "react";
import { motion } from "framer-motion";
import { IoMdClose } from "react-icons/io";
import { useMutation } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { addDish } from "@/https";
import { enqueueSnackbar } from "notistack";

const DishModal = ({ setIsDishesModalOpen }) => {
    const userData = useSelector((state) => state.user.userData);
    const tenantId = userData?.tenantId;

    const [dishData, setDishData] = useState({
        name: "",
        price: "",
        category: "",
        sellMode: "unit",     // unit | weight
        weightUnit: "lb",     // lb | kg
        pricePerLb: "",       // usado cuando sellMode=weight (nombre legacy)
    });

    const [image, setImage] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setDishData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => setImage(e.target.files?.[0] || null);

    const handleCloseModal = () => setIsDishesModalOpen(false);

    const dishMutation = useMutation({
        mutationFn: (formData) => addDish(formData, tenantId),
        onSuccess: (res) => {
            setIsDishesModalOpen(false);
            enqueueSnackbar(res?.data?.message || "Plato agregado.", { variant: "success" });
        },
        onError: (error) => {
            const msg = error?.response?.data?.message || "Error adding dish";
            enqueueSnackbar(msg, { variant: "error" });
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!tenantId) {
            enqueueSnackbar("TenantId no encontrado. Inicia sesión de nuevo.", { variant: "warning" });
            return;
        }

        const formData = new FormData();

        formData.append("name", dishData.name);
        formData.append("category", dishData.category);

        // price normal (unit)
        const basePrice =
            dishData.sellMode === "weight"
                ? (dishData.pricePerLb || dishData.price)
                : dishData.price;

        formData.append("price", basePrice);

        // weight fields
        formData.append("sellMode", dishData.sellMode);
        formData.append("weightUnit", dishData.weightUnit);

        if (dishData.sellMode === "weight") {
            formData.append("pricePerLb", dishData.pricePerLb); // backend lo guarda como pricePerLb
        }

        if (image) formData.append("image", image);

        dishMutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="bg-[#262626] p-6 rounded-lg shadow-lg w-96"
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[#f5f5f5] text-xl font-semibold">Agregar plato</h2>
                    <button onClick={handleCloseModal} className="text-[#f5f5f5] hover:text-red-500">
                        <IoMdClose size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                    <div>
                        <label className="block text-[#ababab] mb-2 text-sm font-medium">Nombre del plato</label>
                        <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f]">
                            <input
                                type="text"
                                name="name"
                                value={dishData.name}
                                onChange={handleInputChange}
                                className="bg-transparent flex-1 text-white focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[#ababab] mb-2 text-sm font-medium">Categoria</label>
                        <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f]">
                            <input
                                type="text"
                                name="category"
                                value={dishData.category}
                                onChange={handleInputChange}
                                className="bg-transparent flex-1 text-white focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[#ababab] mb-2 text-sm font-medium">Se vende por</label>
                        <div className="rounded-xl p-3 bg-[#1f1f1f] border border-transparent">
                            <div className="relative w-full">
                                <select
                                    name="sellMode"
                                    value={dishData.sellMode}
                                    onChange={handleInputChange}
                                    className="w-full appearance-none rounded-xl bg-[#0b0b0b] border border-gray-800 px-4 py-3 text-white
                 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                                >
                                    <option className="bg-[#0b0b0b] text-white" value="unit">Unidad / Plato</option>
                                    <option className="bg-[#0b0b0b] text-white" value="weight">Libra / Peso</option>
                                </select>

                                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400">
                                    ▼
                                </div>
                            </div>
                        </div>
                    </div>

                    {dishData.sellMode === "weight" ? (
                        <>
                            <div>
                                <label className="block text-[#ababab] mb-2 text-sm font-medium">Unidad de peso</label>
                                <div className="rounded-xl p-3 bg-[#1f1f1f]">
                                    <div className="relative w-full">
                                        <select
                                            name="weightUnit"
                                            value={dishData.weightUnit}
                                            onChange={handleInputChange}
                                            className="w-full appearance-none rounded-xl bg-[#0b0b0b] border border-gray-800 px-4 py-3 text-white
                 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                                        >
                                            <option className="bg-[#0b0b0b] text-white" value="lb">Libra (lb)</option>
                                            <option className="bg-[#0b0b0b] text-white" value="kg">Kilogramo (kg)</option>
                                        </select>

                                        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400">
                                            ▼
                                        </div>
                                    </div>
                                </div>

                                <label className="block text-[#ababab] mb-2 text-sm font-medium">
                                    Precio por {dishData.weightUnit}
                                </label>
                                <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f]">
                                    <input
                                        type="number"
                                        name="pricePerLb"
                                        value={dishData.pricePerLb}
                                        onChange={handleInputChange}
                                        className="bg-transparent flex-1 text-white focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-[#ababab] mb-2 text-sm font-medium">Precio (por unidad)</label>
                            <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f]">
                                <input
                                    type="number"
                                    name="price"
                                    value={dishData.price}
                                    onChange={handleInputChange}
                                    className="bg-transparent flex-1 text-white focus:outline-none"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-[#ababab] mb-2 text-sm font-medium">Imagen</label>
                        <div className="flex items-center rounded-lg p-3 bg-[#1f1f1f]">
                            <input type="file" accept="image/*" onChange={handleImageChange} className="text-white" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={dishMutation.isPending}
                        className="w-full rounded-lg py-3 text-lg bg-yellow-400 text-gray-900 font-bold disabled:opacity-60"
                    >
                        {dishMutation.isPending ? "Guardando..." : "Agregar plato"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default DishModal;
