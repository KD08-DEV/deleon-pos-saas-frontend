import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";

const Employees = () => {
    const {
        data: employees = [],
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["admin/employees"],
        queryFn: async () => {
            const { data } = await api.get("/api/admin/employees");
            // backend responde { success, data: [...] }
            return Array.isArray(data?.data) ? data.data : [];
        },
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnReconnect: true,
    });

    if (isLoading) {
        return <div className="text-center text-[#ababab] py-10">Cargando empleados...</div>;
    }

    if (isError) {
        return (
            <div className="text-center text-red-500 py-10">
                Error al cargar los empleados{error?.response?.status ? ` (HTTP ${error.response.status})` : ""}.
            </div>
        );
    }

    return (
        <div className="p-8 bg-[#1a1a1a] rounded-lg shadow-lg text-[#f5f5f5]">
            <h2 className="text-2xl font-bold mb-6 text-center">Empleados</h2>

            {employees.length === 0 ? (
                <p className="text-center text-[#ababab]">No hay empleados registrados.</p>
            ) : (
                <table className="w-full text-left border-collapse border border-[#2a2a2a] rounded-lg overflow-hidden">
                    <thead className="bg-[#262626]">
                    <tr>
                        <th className="p-3 text-[#f5f5f5] font-semibold">Nombre</th>
                        <th className="p-3 text-[#f5f5f5] font-semibold">Rol</th>
                    </tr>
                    </thead>
                    <tbody>
                    {employees.map((e) => (
                        <tr key={e._id} className="border-t border-[#2a2a2a] hover:bg-[#2a2a2a] transition-all">
                            <td className="p-3">{e.name}</td>
                            <td className="p-3 text-[#F6B100] font-semibold">{e.role}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default Employees;
