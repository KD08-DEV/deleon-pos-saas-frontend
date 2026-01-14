import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTables, deleteTable } from "../../https";
import { enqueueSnackbar } from "notistack";
import { motion } from "framer-motion"; // ✅ para animación suave

const RemoveTableModal = ({ setIsRemoveTableModalOpen }) => {
    const queryClient = useQueryClient();
    const [selectedTableId, setSelectedTableId] = useState("");

    // Obtener mesas desde la base de datos
    const { data: resData, isLoading, isError } = useQuery({
        queryKey: ["tables"],
        queryFn: async () => await getTables(),
    });

    const mutation = useMutation({
        mutationFn: (id) => deleteTable(id),
        onSuccess: () => {
            enqueueSnackbar("Table deleted successfully!", { variant: "success" });
            queryClient.invalidateQueries(["tables"]);
            setIsRemoveTableModalOpen(false);
        },
        onError: () =>
            enqueueSnackbar("Failed to delete table!", { variant: "error" }),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedTableId) mutation.mutate(selectedTableId);
    };

    const tables = resData?.data?.data || [];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
            {/* Modal con animación */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="bg-[#1a1a1a] p-8 rounded-xl w-[400px] shadow-lg border border-[#333] relative"
            >
                {/* Botón de cerrar */}
                <button
                    onClick={() => setIsRemoveTableModalOpen(false)}
                    className="absolute top-3 right-3 text-[#999] hover:text-[#f5f5f5] font-bold text-xl"
                >
                    ×
                </button>

                <h2 className="text-2xl font-semibold text-[#f5f5f5] mb-6 text-center">
                    Remover Mesa
                </h2>

                {isLoading ? (
                    <p className="text-[#ababab] text-center">Cargando mesas..</p>
                ) : isError ? (
                    <p className="text-red-500 text-center">Error cargando mesas 😢</p>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <select
                            value={selectedTableId}
                            onChange={(e) => setSelectedTableId(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-gray-600 rounded-lg p-3 text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-red-600"
                            required
                        >
                            <option value="">Seleccionar la mesa</option>
                            {tables.map((table) => (
                                <option key={table._id} value={table._id}>
                                    Table {table.tableNo}
                                </option>
                            ))}
                        </select>

                        <div className="flex justify-between gap-4">
                            <button
                                type="button"
                                onClick={() => setIsRemoveTableModalOpen(false)}
                                className="w-1/2 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="w-1/2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-all"
                            >
                                {mutation.isLoading ? "Removing..." : "Remove"}
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

export default RemoveTableModal;
