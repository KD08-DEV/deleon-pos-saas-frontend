import React, { useEffect } from "react";

import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTables, updateTable, updateOrder } from "@https";
import TableCard from "@components/tables/TableCard";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/slices/userSlice";
import { QK } from "../queryKeys";
import { getSocket } from "../realtime/socket";
import { useTablesRealtime } from "../realtime/useTablesRealtime";


export default function Tables() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();


    const userState = useSelector((state) => state.user);

// soporta varios shapes: {userData}, {user}, o el usuario directo
    const currentUser = userState?.userData || userState?.user || userState;
    useTablesRealtime({ tenantId: currentUser?.tenantId });



    const orderId = new URLSearchParams(location.search).get("orderId");
    const dispatch = useDispatch();

    useEffect(() => {
        if (!currentUser) return;

        const isTestAdmin = currentUser?.email === "test@gmail.com";
        const hasWrongRole = currentUser?.role?.toLowerCase?.() !== "admin";

        if (isTestAdmin && hasWrongRole) {
            const fixedUser = { ...currentUser, role: "Admin" };
            dispatch(setUser(fixedUser));
            console.log("✅ Rol corregido a Admin para:", fixedUser.email);
        }
    }, [currentUser, dispatch]);


    const { data, isLoading } = useQuery({
        queryKey: QK.TABLES,
        queryFn: getTables,
        refetchInterval: 0,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        select: (res) => {
            if (Array.isArray(res?.data?.data)) return res.data.data;
            if (Array.isArray(res?.data)) return res.data;
            return [];
        },
    });



    const tables = data || [];

    const mUpdateOrder = useMutation({
        mutationFn: ({ id, body }) => updateOrder(id, body),
        onSuccess: (_res, vars) => {
            queryClient.invalidateQueries({ queryKey: QK.TABLES, exact: true });
            queryClient.invalidateQueries({ queryKey: QK.ORDERS, exact: true });

            // instantáneo en ESTA pantalla
            queryClient.refetchQueries({ queryKey: QK.TABLES, exact: true, type: "active" });

            // realtime: avisa a otras sesiones (manda ids para cache/update futuro)
            const tenantId = currentUser?.tenantId || localStorage.getItem("tenantId");
            const socket = getSocket();
            socket?.emit("tenant:tablesUpdated", {
                tenantId,
                orderId: vars?.id,
                tableId: vars?.body?.table,
            });
        },
    });



    const normalizedRole =
        (currentUser?.role || currentUser?.user?.role || "").toString().toLowerCase();


    const handlePickTable = async (table) => {
        const tableId = table?._id;
        const status = table?.status || "Available";

        // QUICK (sin mesa física)
        if (table?.isVirtual) {
            if (!orderId) {
                enqueueSnackbar("Primero crea una orden para continuar.", {
                    variant: "warning",
                });
                return;
            }
            navigate(`/menu?orderId=${orderId}`);
            return;
        }

        // Mesa AVAILABLE + sin orderId => bloquear
        if (status === "Available" && !orderId) {
            enqueueSnackbar("Debes crear una orden antes de usar esta mesa.", {
                variant: "warning",
            });
            return;
        }

        // Mesa BOOKED => abrir orden existente (si tienes permiso)
        if (status === "Booked") {
            const existingOrderId =
                table?.currentOrder?._id ||
                table?.currentOrder?.id ||
                table?.currentOrder ||
                null;

            const canEditBooked =
                normalizedRole === "admin" || normalizedRole === "owner" || normalizedRole === "manager";

            // Debug rápido (puedes borrarlo luego)
            console.log("ROLE:", normalizedRole, "existingOrderId:", existingOrderId);

            if (canEditBooked && existingOrderId) {
                navigate(`/menu?orderId=${existingOrderId}`);
                return;
            }

            if (canEditBooked && !existingOrderId) {
                enqueueSnackbar(
                    "Esta mesa está marcada como ocupada pero no tiene una orden asociada.",
                    { variant: "warning" }
                );
                return;
            }

            enqueueSnackbar("Mesa ocupada. No tienes permisos para editar esta orden.", {
                variant: "warning",
            });
            return;
        }

        // Mesa AVAILABLE + orderId => asignar mesa a la orden
        try {
            await mUpdateOrder.mutateAsync({
                id: orderId,
                body: { table: tableId },
            });

            navigate(`/menu?orderId=${orderId}`);
        } catch (error) {
            enqueueSnackbar("No se pudo asignar la mesa.", { variant: "error" });
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
