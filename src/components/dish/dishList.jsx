import { useQuery, useMutation, useQueryClient } from "react-query";
import { getDishes, deleteDish } from "../api/dishes";

export default function DishList() {
    const queryClient = useQueryClient();
    const { data: dishes = [], isLoading } = useQuery("dishes", getDishes);

    const mutation = useMutation(deleteDish, {
        onSuccess: () => queryClient.invalidateQueries("dishes"),
    });

    if (isLoading) return <p>Loading dishes...</p>;

    return (
        <div className="grid grid-cols-3 gap-4 mt-6">
            {dishes.map((dish) => (
                <div key={dish._id} className="border rounded-lg shadow p-3">
                    {dish.imageUrl && (
                        <img
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="h-40 w-full object-cover rounded"
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
