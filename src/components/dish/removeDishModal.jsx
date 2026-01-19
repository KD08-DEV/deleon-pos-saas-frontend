import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDishes, deleteDish } from "../../https";
import { enqueueSnackbar } from "notistack";
import { useSelector } from "react-redux";
import EditDishModal from "./EditDishModal";

const RemoveDishModal = ({ setIsRemoveDishModalOpen }) => {
    const userData = useSelector((state) => state.user.userData);
    const tenantId = userData?.tenantId;
    const queryClient = useQueryClient();
    const [selectedDishId, setSelectedDishId] = useState("");
    const [isEditOpen, setIsEditOpen] = useState(false);

    const { data: resData, isLoading, isError } = useQuery({
        queryKey: ["dishes", tenantId],
        queryFn: async () => await getDishes(tenantId),
        enabled: !!tenantId,
    });

    const dishes = resData?.data?.data || [];

    const selectedDish = useMemo(
        () => dishes.find((d) => String(d?._id) === String(selectedDishId)),
        [dishes, selectedDishId]
    );

    const mutation = useMutation({
        mutationFn: (id) => deleteDish(id),
        onSuccess: () => {
            enqueueSnackbar("Plato eliminado exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: ["dishes", tenantId] });
            queryClient.refetchQueries({ queryKey: ["dishes", tenantId], type: "active" });
            setIsRemoveDishModalOpen(false);
        },
        onError: (error) => {
            const msg = error?.response?.data?.message || "Error al eliminar plato";
            enqueueSnackbar(msg, { variant: "error" });
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedDishId) mutation.mutate(selectedDishId);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
                <div className="bg-[#1a1a1a] p-8 rounded-xl w-[420px] shadow-lg border border-[#333] relative">
                    <button
                        onClick={() => setIsRemoveDishModalOpen(false)}
                        className="absolute top-3 right-3 text-[#999] hover:text-[#f5f5f5]"
                    >
                        ×
                    </button>

                    <h2 className="text-2xl font-semibold text-[#f5f5f5] mb-6 text-center">
                        Gestionar Platos
                    </h2>

                    {isLoading ? (
                        <p className="text-[#ababab] text-center">Cargando platos...</p>
                    ) : isError ? (
                        <p className="text-red-500 text-center">Error cargando platos</p>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <select
                                value={selectedDishId}
                                onChange={(e) => setSelectedDishId(e.target.value)}
                                className="w-full bg-[#2a2a2a] border border-gray-600 rounded-lg p-3 text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                                required
                            >
                                <option value="">Seleccionar plato</option>
                                {dishes.map((dish) => (
                                    <option key={dish._id} value={dish._id}>
                                        {dish.name} — ${dish.price}
                                    </option>
                                ))}
                            </select>

                            <div className="flex justify-between gap-4">
                                <button
                                    type="button"
                                    disabled={!selectedDish}
                                    onClick={() => setIsEditOpen(true)}
                                    className="w-1/2 bg-yellow-500 hover:bg-yellow-600 text-black py-2 rounded-lg transition-all disabled:opacity-60"
                                >
                                    Editar
                                </button>

                                <button
                                    type="submit"
                                    disabled={!selectedDishId || mutation.isPending}
                                    className="w-1/2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-all disabled:opacity-60"
                                >
                                    {mutation.isPending ? "Removing..." : "Remove"}
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsRemoveDishModalOpen(false)}
                                className="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 rounded-lg transition-all"
                            >
                                Cerrar
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {isEditOpen && selectedDish ? (
                <EditDishModal dish={selectedDish} onClose={() => setIsEditOpen(false)} />
            ) : null}
        </>
    );
};

export default RemoveDishModal;
