import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDish } from "../../https";
import { useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";

export default function DishForm({ onClose }) {
    const userData = useSelector((state) => state.user.userData);
    const tenantId = userData?.tenantId;
    const [form, setForm] = useState({ name: "", price: "", category: "", sellMode: "unit" });
    const [image, setImage] = useState(null);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (formData) => addDish(formData, tenantId),
        onSuccess: (res) => {
            queryClient.invalidateQueries(["dishes", tenantId]);
            setForm({ name: "", price: "", category: "", sellMode: "unit" });
            setImage(null);
            enqueueSnackbar(res?.data?.message || "Plato agregado exitosamente", { variant: "success" });
            onClose();
        },
        onError: (error) => {
            const msg = error?.response?.data?.message || "Error al agregar plato";
            enqueueSnackbar(msg, { variant: "error" });
        },
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!tenantId) {
            enqueueSnackbar("TenantId no encontrado. Inicia sesión de nuevo.", { variant: "warning" });
            return;
        }

        const formData = new FormData();
        formData.append("name", form.name);
        formData.append("category", form.category);
        formData.append("price", form.price);
        formData.append("sellMode", form.sellMode || "unit");
        if (image) formData.append("image", image);

        mutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-[#1a1a1a] p-8 rounded-xl w-[400px] shadow-lg border border-[#333] relative">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-[#999] hover:text-[#f5f5f5]"
                >
                    ×
                </button>

                <h2 className="text-2xl font-semibold text-[#f5f5f5] mb-6 text-center">
                    Agregar Plato
                </h2>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Nombre del plato"
                        className="border w-full p-2 rounded bg-[#2a2a2a] text-[#f5f5f5]"
                        required
                    />
                    <input
                        name="price"
                        value={form.price}
                        onChange={handleChange}
                        placeholder="Precio"
                        type="number"
                        className="border w-full p-2 rounded bg-[#2a2a2a] text-[#f5f5f5]"
                        required
                    />
                    <input
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        placeholder="Categoria"
                        className="border w-full p-2 rounded bg-[#2a2a2a] text-[#f5f5f5]"
                        required
                    />
                    <input
                        type="file"
                        onChange={(e) => setImage(e.target.files[0])}
                        className="border w-full p-2 rounded bg-[#2a2a2a] text-[#f5f5f5]"
                    />

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-1/2 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-all"
                        >
                            {mutation.isLoading ? "Saving..." : "Add Dish"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
