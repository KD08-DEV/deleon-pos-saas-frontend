import React, { useEffect } from "react";

import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTables, updateTable, updateOrder } from "@https";
import TableCard from "@components/tables/TableCard";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { setUser  } from "../redux/slices/userSlice";

export default function Tables() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const user = useSelector((state) => state.user);
    const role = user?.role || user?.user?.role || "User";

    const orderId = new URLSearchParams(location.search).get("orderId");
    const dispatch = useDispatch();

    useEffect(() => {
        if (!user) return;

        const isTestAdmin = user?.email === "test@gmail.com";
        const hasWrongRole = user?.role?.toLowerCase?.() !== "admin";

        if (isTestAdmin && hasWrongRole) {
            const fixedUser = { ...user, role: "Admin" };
            dispatch(setUser(fixedUser));
            console.log("✅ Rol corregido a Admin para:", fixedUser.email);
        }
    }, [user, dispatch]);


    const { data, isLoading } = useQuery({
        queryKey: ["tables"],
        queryFn: getTables,
        select: (res) => {
            if (Array.isArray(res?.data?.data)) return res.data.data;
            if (Array.isArray(res?.data)) return res.data;
            return [];
        },
    });

    const tables = data || [];

    const mUpdateTable = useMutation({
        mutationFn: ({ id, body }) => updateTable(id, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tables"] }),
    });

    const mUpdateOrder = useMutation({
        mutationFn: ({ id, body }) => updateOrder(id, body),
    });

    const handlePickTable = async (table) => {
        const tableIdOf = (t) => t?._id ?? t?.id ?? t?.tableId ?? null;

        // 1) Tarjeta "Quick" (virtual/sin mesa): solo continúa si venimos con orderId
        if (table?.isVirtual) {
            if (!orderId) {
                enqueueSnackbar("Primero crea una orden para continuar sin mesa.", { variant: "warning" });
                return;
            }
            navigate(`/menu?orderId=${orderId}`);
            return;
        }

        const status  = table?.status || "Available";
        const tableId = tableIdOf(table);
        if (!tableId) {
            console.error("Mesa sin id =>", table);
            enqueueSnackbar("No se pudo leer el ID de la mesa. Refresca o revisa el backend.", { variant: "error" });
            return; // ⛔️ no llames updateTable sin id
        }

        // 2) Si NO vienes con orderId y la mesa está libre, no dejes pasar
        if (!orderId && status === "Available") {
            enqueueSnackbar("Crea una orden antes de asignar una mesa.", { variant: "warning" });
            return;
        }

        // 3) Mesa ocupada: si eres Admin, abre la orden asociada; si no, avisa
        if (status !== "Available") {
            // soporta distintos formatos: _id dentro de currentOrder, id plano, etc.
            const orderIdToEdit =
                table?.currentOrder?._id ??
                table?.currentOrder ??
                table?.orderId ??
                table?.order?._id ??
                null;

            const isAdmin =
                user?.role?.toLowerCase?.() === "admin" ||
                role?.toLowerCase?.() === "admin";

            if (isAdmin && orderIdToEdit) {
                navigate(`/menu?orderId=${orderIdToEdit}`);
                return;
            }
            console.log("🧩 DEBUG handlePickTable");
            console.log("User role:", role);
            console.log("Table clicked:", table);
            console.log("Current Order:", table?.currentOrder);
            console.log("Current Order ID:", table?.currentOrder?._id);

            enqueueSnackbar("Mesa ocupada. No puedes editar esta orden.", { variant: "warning" });
            return;
        }

        // 4) Mesa libre + orderId → asigna mesa a la orden y marca la mesa como Booked
        try {
            await mUpdateOrder.mutateAsync({
                id: orderId,
                body: {
                    // 👉 aquí mandamos el _id real de la mesa
                    table: tableId,
                },
            });

            await mUpdateTable.mutateAsync({
                id: tableId,
                body: { status: "Booked" },
            });

            navigate(`/menu?orderId=${orderId}`);
        } catch (e) {
            console.error(e);
            enqueueSnackbar("No se pudo asignar la mesa. Inténtalo de nuevo.", { variant: "error" });
        }
    };

    // Tarjeta virtual (no se guarda en BD)
    const quickCard = { _id: "no-table", isVirtual: true, tableNo: 0, status: "Quick", seats: 0 };

    return (
        <section className="bg-[#111] min-h-screen px-6 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <TableCard table={quickCard} onPick={() => handlePickTable(quickCard)} />
                {isLoading ? (
                    <div className="text-gray-400">Cargando mesas…</div>
                ) : (
                    tables.map((t) => (
                        <TableCard
                            key={t._id || t.id}
                            table={t}
                            onPick={() => handlePickTable(t)}   // <- usa handler, NO navegues a /tables/:id
                        />
                    ))
                )}
            </div>
        </section>
    );
}
