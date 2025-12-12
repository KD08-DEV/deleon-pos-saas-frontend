import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDishes, deleteDish } from "../../https";
import { enqueueSnackbar } from "notistack";

const RemoveDishModal = ({ setIsRemoveDishModalOpen }) => {
    const queryClient = useQueryClient();
    const [selectedDishId, setSelectedDishId] = useState("");

    const { data: resData, isLoading, isError } = useQuery({
        queryKey: ["dishes"],
        queryFn: async () => await getDishes(),
    });

    const mutation = useMutation({
        mutationFn: (id) => deleteDish(id),
        onSuccess: () => {
            enqueueSnackbar("Dish removed successfully!", { variant: "success" });
            queryClient.invalidateQueries(["dishes"]);
            setIsRemoveDishModalOpen(false);
        },
        onError: () =>
            enqueueSnackbar("Failed to remove dish!", { variant: "error" }),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedDishId) mutation.mutate(selectedDishId);
    };

    const dishes = resData?.data?.data || [];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-[#1a1a1a] p-8 rounded-xl w-[400px] shadow-lg border border-[#333] relative">
                <button
                    onClick={() => setIsRemoveDishModalOpen(false)}
                    className="absolute top-3 right-3 text-[#999] hover:text-[#f5f5f5]"
                >
                    ×
                </button>

                <h2 className="text-2xl font-semibold text-[#f5f5f5] mb-6 text-center">
                    Remove Dish
                </h2>

                {isLoading ? (
                    <p className="text-[#ababab] text-center">Loading dishes...</p>
                ) : isError ? (
                    <p className="text-red-500 text-center">Error loading dishes 😢</p>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <select
                            value={selectedDishId}
                            onChange={(e) => setSelectedDishId(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-gray-600 rounded-lg p-3 text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-red-600"
                            required
                        >
                            <option value="">Select a dish</option>
                            {dishes.map((dish) => (
                                <option key={dish._id} value={dish._id}>
                                    {dish.name} — ${dish.price}
                                </option>
                            ))}
                        </select>

                        <div className="flex justify-between gap-4">
                            <button
                                type="button"
                                onClick={() => setIsRemoveDishModalOpen(false)}
                                className="w-1/2 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-all"
                            >
                                Cancel
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
            </div>
        </div>
    );
};

export default RemoveDishModal;
