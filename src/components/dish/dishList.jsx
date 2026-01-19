import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDishes, deleteDish } from "../../https";
import { useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";

export default function DishList() {
    const userData = useSelector((state) => state.user.userData);
    const tenantId = userData?.tenantId;
    const queryClient = useQueryClient();
    
    const { data: dishes = [], isLoading } = useQuery({
        queryKey: ["dishes", tenantId],
        queryFn: () => getDishes(tenantId),
        enabled: !!tenantId,
    });

    const mutation = useMutation({
        mutationFn: (id) => deleteDish(id),
        onSuccess: () => {
            queryClient.invalidateQueries(["dishes", tenantId]);
            enqueueSnackbar("Plato eliminado exitosamente", { variant: "success" });
        },
        onError: (error) => {
            const msg = error?.response?.data?.message || "Error al eliminar plato";
            enqueueSnackbar(msg, { variant: "error" });
        },
    });

    if (isLoading) return <p>Loading dishes...</p>;

    return (
        <div className="grid grid-cols-3 gap-4 mt-6">
            {dishes.map((dish) => (
                <div key={dish._id} className="border rounded-lg shadow p-3">
                    {dish.imageUrl && (
                        <img
                            src={dish.imageUrl || " /placeholder.jpg"}
                            alt={dish.name}
                            className="h-40 w-full object-cover rounded"
                            onError={(e) => {
                                e.currentTarget.src = " /placeholder.jpg";
                            }}
                        />
                    )}
                    <h3 className="text-lg font-bold mt-2">{dish.name}</h3>
                    <p className="text-gray-600">${dish.price}</p>
                    <p className="text-sm text-gray-400">{dish.category}</p>
                    <button
                        onClick={() => mutation.mutate(dish._id)}
                        className="mt-3 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                        Delete
                    </button>
                </div>
            ))}
        </div>
    );
}
