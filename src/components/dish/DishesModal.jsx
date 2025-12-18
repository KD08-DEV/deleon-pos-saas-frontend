import React, { useState } from "react";
import { motion } from "framer-motion";
import { IoMdClose } from "react-icons/io";
import { useMutation } from "@tanstack/react-query";
import { addDish } from "../../https/index.js"; // ✅ debes crear esta función
import { enqueueSnackbar } from "notistack";

const DishModal = ({ setIsDishesModalOpen }) => {
    const [dishData, setDishData] = useState({
        name: "",
        price: "",
        category: "",
    });
    const [image, setImage] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setDishData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        setImage(e.target.files[0]);
    };

    const handleCloseModal = () => {
        setIsDishesModalOpen(false);
    };

    const dishMutation = useMutation({
        mutationFn: (reqData) => addDish(reqData),
        onSuccess: (res) => {
            setIsDishesModalOpen(false);
            enqueueSnackbar(res.data.message, { variant: "success" });
        },
        onError: (error) => {
            const { data } = error.response;
            enqueueSnackbar(data?.message || "Error adding dish", { variant: "error" });
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("name", dishData.name);
        formData.append("price", dishData.price);
        formData.append("category", dishData.category);
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
                <div className="flex justify-between item-center mb-4">
                    <h2 className="text-[#f5f5f5] text-xl font-semibold">Agregar plato</h2>
                    <button
                        onClick={handleCloseModal}
                        className="text-[#f5f5f5] hover:text-red-500"
                    >
                        <IoMdClose size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 mt-10">
                    <div>
                        <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
                            Nombre del plato
                        </label>
                        <div className="flex item-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
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
                        <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
                            Price
                        </label>
                        <div className="flex item-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
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

                    <div>
                        <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
                            Category
                        </label>
                        <div className="flex item-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
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
                        <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
                            Image
                        </label>
                        <div className="flex item-center rounded-lg p-3 px-4 bg-[#1f1f1f]">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="bg-transparent flex-1 text-white focus:outline-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-lg mt-10 mb-6 py-3 text-lg bg-yellow-400 text-gray-900 font-bold"
                    >
                        Agregar plato
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default DishModal;
