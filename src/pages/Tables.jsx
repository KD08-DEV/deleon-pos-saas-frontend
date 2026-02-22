import React, { useEffect } from "react";

import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTables, updateTable, updateOrder,  addOrder } from "@https";
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
    const tenantState = useSelector((s) => s.store || s.tenant || {});
    const tenant = tenantState?.tenant || tenantState?.data || tenantState;
    const orderSources = tenant?.features?.orderSources || {};
    const [deliveryPayOpen, setDeliveryPayOpen] = React.useState(false);
    const [deliveryPayMethod, setDeliveryPayMethod] = React.useState("Efectivo");
    const [pendingVirtual, setPendingVirtual] = React.useState(null);


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
        enabled: !!currentUser?._id,

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
    const mCreateOrder = useMutation({
        mutationFn: (payload) => addOrder(payload),
    });




    const normalizedRole =
        (currentUser?.role || currentUser?.user?.role || "").toString().toLowerCase();


    const handlePickTable = async (table) => {
        const tableId = table?._id;
        const status = table?.status || "Disponible";


        /// CANALES (Quick / Delivery)
        if (table?.isVirtual) {
            try {
                let effectiveOrderId = orderId;

                // ✅ Si NO hay orderId, crear orden automática (sin nombre)
                if (!effectiveOrderId) {
                    const created = await mCreateOrder.mutateAsync({
                        customerId: null,
                        customerDetails: {
                            name: "",      // <- sin nombre (como pediste)
                            phone: "",
                            address: "",
                            guests: 0,
                        },
                        user: currentUser?._id || null,
                    });

                    effectiveOrderId = created?.data?.data?._id;

                    if (!effectiveOrderId) {
                        enqueueSnackbar("No se pudo crear la orden.", { variant: "error" });
                        return;
                    }
                }

                // Si es canal delivery/pedidosya/ubereats, seteamos orderSource antes de ir al menú
                if (
                    table?.virtualType === "PEDIDOSYA" ||
                    table?.virtualType === "UBEREATS" ||
                    table?.virtualType === "DELIVERY"
                ) {
                    await mUpdateOrder.mutateAsync({
                        id: effectiveOrderId,
                        body: { orderSource: table.virtualType },
                    });
                }
                navigate(`/menu?orderId=${effectiveOrderId}`);
                return;
            } catch (e) {
                enqueueSnackbar("No se pudo acceder al canal.", { variant: "error" });
                return;
            }
        }



        // Mesa Ocupada => abrir orden existente (si tienes permiso)
        if (status === "Ocupada") {
            const existingOrderId =
                table?.currentOrder?._id ||
                table?.currentOrder?.id ||
                table?.currentOrder ||
                null;

            const canEditBooked =
                normalizedRole === "admin" || normalizedRole === "camarero" || normalizedRole === "cajera";

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

        // Mesa Disponible + orderId => asignar mesa a la orden
        // Mesa Disponible => si no hay orderId, crear una orden vacía y asignarla a la mesa
        try {
            let effectiveOrderId = orderId;

            // 1) Si NO hay orderId, crear orden con cliente vacío y con mesa asignada
            if (!effectiveOrderId) {
                const created = await mCreateOrder.mutateAsync({
                    customerId: null,
                    customerDetails: {
                        name: "",      // sin nombre
                        phone: "",
                        address: "",
                        guests: 0,
                    },
                    table: tableId,              // clave: asigna mesa desde el inicio
                    orderSource: "DINE_IN",      // opcional, pero recomendado
                    user: currentUser?._id || null,
                });

                effectiveOrderId = created?.data?.data?._id;

                if (!effectiveOrderId) {
                    enqueueSnackbar("No se pudo crear la orden para esta mesa.", { variant: "error" });
                    return;
                }
            } else {
                // 2) Si ya hay orderId, solo asignar la mesa a esa orden
                await mUpdateOrder.mutateAsync({
                    id: effectiveOrderId,
                    body: { table: tableId },
                });
            }

            // 3) Navegar al menú con la orden creada/asignada
            navigate(`/menu?orderId=${effectiveOrderId}`);
        } catch (error) {
            enqueueSnackbar("No se pudo asignar la mesa.", { variant: "error" });
        }
    };




    // Tarjeta virtual (no se guarda en BD)
    const quickCard = { _id: "no-table", isVirtual: true, tableNo: 0, status: "Quick", seats: 0 };
    const pedidosYaEnabled = !!orderSources?.pedidosYa?.enabled;
    const uberEatsEnabled = !!orderSources?.uberEats?.enabled;
    const deliveryEnabled = !!orderSources?.delivery?.enabled;

    const deliveryCard = {
        _id: "virtual-delivery",
        isVirtual: true,
        virtualType: "DELIVERY",
        displayName: "Delivery",
        badgeText: "ENVÍO",
        status: "Delivery",
        seats: 0,
    };

    const pedidosYaCard = {
        _id: "virtual-pedidosya",
        isVirtual: true,
        virtualType: "PEDIDOSYA",
        displayName: "PedidosYa",
        badgeText: `${Math.round((Number(orderSources?.pedidosYa?.commissionRate ?? 0.26) * 100))}%`,
        status: "Delivery",
        seats: 0,
    };

    const uberEatsCard = {
        _id: "virtual-ubereats",
        isVirtual: true,
        virtualType: "UBEREATS",
        displayName: "Uber Eats",
        badgeText: `${Math.round((Number(orderSources?.uberEats?.commissionRate ?? 0.22) * 100))}%`,
        status: "Delivery",
        seats: 0,
    };

    return (
        <section className="bg-[#111] min-h-screen px-6 pt-6 pb-24">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <TableCard table={quickCard} onPick={() => handlePickTable(quickCard)} />
                {pedidosYaEnabled && (
                    <TableCard table={pedidosYaCard} onPick={() => handlePickTable(pedidosYaCard)} />
                )}
                {deliveryEnabled && (
                    <TableCard table={deliveryCard} onPick={() => handlePickTable(deliveryCard)} />
                )}

                {uberEatsEnabled && (
                    <TableCard table={uberEatsCard} onPick={() => handlePickTable(uberEatsCard)} />
                )}
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
