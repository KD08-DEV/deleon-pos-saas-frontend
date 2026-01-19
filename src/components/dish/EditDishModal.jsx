import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { IoMdClose } from "react-icons/io";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useSelector } from "react-redux";
import { updateDish } from "../../https";

const EditDishModal = ({ dish, onClose }) => {
    const userData = useSelector((state) => state.user.userData);
    const tenantId = userData?.tenantId;
    const qc = useQueryClient();

    const [form, setForm] = useState({
        name: "",
        category: "",
        sellMode: "unit", // unit | weight
        weightUnit: "lb", // lb | kg
        price: "",
        pricePerLb: "",
        imageFile: null,
    });

    const dishId = dish?._id || dish?.id;

    const previewUrl = useMemo(() => {
        if (form.imageFile) return URL.createObjectURL(form.imageFile);
        return dish?.imageUrl || " /placeholder.jpg";
    }, [form.imageFile, dish]);

    useEffect(() => {
        return () => {
            if (form.imageFile && previewUrl) URL.revokeObjectURL(previewUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.imageFile]);

    useEffect(() => {
        setForm({
            name: dish?.name || "",
            category: dish?.category || "",
            sellMode: dish?.sellMode || "unit",
            weightUnit: dish?.weightUnit || "lb",
            price: dish?.price ?? "",
            pricePerLb: dish?.pricePerLb ?? "",
            imageFile: null,
        });
    }, [dish]);

    const onChange = (e) => {
        const { name, value, files } = e.target;

        if (name === "imageFile") {
            setForm((p) => ({ ...p, imageFile: files?.[0] || null }));
            return;
        }

        setForm((p) => ({ ...p, [name]: value }));

        // si cambia sellMode y pasa a unit, limpia pricePerLb
        if (name === "sellMode" && value === "unit") {
            setForm((p) => ({ ...p, sellMode: "unit", pricePerLb: "" }));
        }
    };

    const mUpdate = useMutation({
        mutationFn: async () => {
            if (!dishId) throw new Error("Missing dish id");

            const fd = new FormData();
            fd.append("name", String(form.name || "").trim());
            fd.append("category", String(form.category || "").trim());
            fd.append("sellMode", String(form.sellMode || "unit"));
            fd.append("weightUnit", String(form.weightUnit || "lb"));

            // price base siempre va en `price`
            // si weight: guardamos pricePerLb adicional
            const basePrice =
                form.sellMode === "weight"
                    ? String(form.pricePerLb || form.price || "").trim()
                    : String(form.price || "").trim();

            fd.append("price", basePrice);

            if (form.sellMode === "weight") {
                fd.append("pricePerLb", String(form.pricePerLb || "").trim());
            }

            if (form.imageFile) fd.append("image", form.imageFile);

            return updateDish(dishId, fd);
        },
        onSuccess: (res) => {
            enqueueSnackbar(res?.data?.message || "Plato actualizado exitosamente", { variant: "success" });
            qc.invalidateQueries({ queryKey: ["dishes", tenantId] });
            qc.refetchQueries({ queryKey: ["dishes", tenantId], type: "active" });
            onClose?.();
        },
        onError: (err) => {
            enqueueSnackbar(err?.response?.data?.message || err?.message || "Error actualizando plato.", {
                variant: "error",
            });
        },
    });

    const onSubmit = (e) => {
        e.preventDefault();
        mUpdate.mutate();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="bg-[#262626] p-6 rounded-lg shadow-lg w-96"
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[#f5f5f5] text-xl font-semibold">Editar plato</h2>
                    <button onClick={onClose} className="text-[#f5f5f5] hover:text-red-500">
                        <IoMdClose size={24} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4 mt-6">
                    <div>
                        <label className="block text-[#ababab] mb-2 text-sm font-medium">Nombre del plato</label>
                        <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f]">
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={onChange}
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
                                value={form.category}
                                onChange={onChange}
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
                                    value={form.sellMode}
                                    onChange={onChange}
                                    className="w-full appearance-none rounded-xl bg-[#0b0b0b] border border-gray-800 px-4 py-3 text-white
                  focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                                >
                                    <option className="bg-[#0b0b0b] text-white" value="unit">Unidad / Plato</option>
                                    <option className="bg-[#0b0b0b] text-white" value="weight">Libra / Peso</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400">▼</div>
                            </div>
                        </div>
                    </div>

                    {form.sellMode === "weight" ? (
                        <div>
                            <label className="block text-[#ababab] mb-2 text-sm font-medium">Unidad de peso</label>
                            <div className="rounded-xl p-3 bg-[#1f1f1f]">
                                <div className="relative w-full">
                                    <select
                                        name="weightUnit"
                                        value={form.weightUnit}
                                        onChange={onChange}
                                        className="w-full appearance-none rounded-xl bg-[#0b0b0b] border border-gray-800 px-4 py-3 text-white
                    focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                                    >
                                        <option className="bg-[#0b0b0b] text-white" value="lb">Libra (lb)</option>
                                        <option className="bg-[#0b0b0b] text-white" value="kg">Kilogramo (kg)</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400">▼</div>
                                </div>
                            </div>

                            <label className="block text-[#ababab] mb-2 text-sm font-medium">
                                Precio por {form.weightUnit}
                            </label>
                            <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f]">
                                <input
                                    type="number"
                                    step="0.01"
                                    name="pricePerLb"
                                    value={form.pricePerLb}
                                    onChange={onChange}
                                    className="bg-transparent flex-1 text-white focus:outline-none"
                                    required
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-[#ababab] mb-2 text-sm font-medium">Precio (por unidad)</label>
                            <div className="flex items-center rounded-lg p-4 bg-[#1f1f1f]">
                                <input
                                    type="number"
                                    step="0.01"
                                    name="price"
                                    value={form.price}
                                    onChange={onChange}
                                    className="bg-transparent flex-1 text-white focus:outline-none"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-[#ababab] mb-2 text-sm font-medium">Imagen</label>

                        {previewUrl ? (
                            <div className="mb-3">
                                <img
                                    src={previewUrl}
                                    alt="preview"
                                    className="h-40 w-full object-cover rounded"
                                    onError={(e) => { e.currentTarget.src = " /placeholder.jpg"; }}
                                />
                            </div>
                        ) : null}

                        <div className="flex items-center rounded-lg p-3 bg-[#1f1f1f]">
                            <input
                                type="file"
                                accept="image/*"
                                name="imageFile"
                                onChange={onChange}
                                className="text-white"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={mUpdate.isPending}
                        className="w-full rounded-lg py-3 text-lg bg-yellow-400 text-gray-900 font-bold disabled:opacity-60"
                    >
                        {mUpdate.isPending ? "Guardando..." : "Guardar cambios"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default EditDishModal;
