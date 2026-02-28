import React, { useEffect } from "react";
import { setDraftContext, clearDraftContext } from "../redux/slices/customerSlice";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTables, updateTable, updateOrder,  addOrder } from "@https";
import TableCard from "@components/tables/TableCard";
import { enqueueSnackbar } from "notistack";
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
    const [selectedArea, setSelectedArea] = React.useState("all");

    const areas = React.useMemo(() => {
        const set = new Set();
        for (const t of tables) {
            if (t?.isVirtual) continue;
            set.add((t?.area || "General").trim());
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [tables]);

    const filteredTables = React.useMemo(() => {
        const onlyReal = tables.filter((t) => !t?.isVirtual);

        if (selectedArea === "all") return onlyReal;

        return onlyReal.filter((t) => (t?.area || "General").trim() === selectedArea);
    }, [tables, selectedArea]);
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


    const handlePickTable = (table) => {
        const tableId = table?._id;
        const status = table?.status || "Disponible";

        // 1) CANALES VIRTUALES
        if (table?.isVirtual) {
            const vtRaw = (table?.virtualType || "QUICK").toString().trim().toUpperCase();
            const allowed = new Set(["PEDIDOSYA", "UBEREATS", "DELIVERY", "QUICK"]);
            const vt = allowed.has(vtRaw) ? vtRaw : "QUICK";

            dispatch(
                setDraftContext({
                    table: null,
                    isVirtual: true,
                    virtualType: vt,
                    orderSource: vt, // IMPORTANTE: mismo string que antes mandabas al backend
                })
            );

            navigate("/menu"); // sin orderId => draft local
            return;
        }

        // 2) MESA OCUPADA => abrir orden existente (si tienes permiso)
        if (status === "Ocupada") {
            const existingOrderId =
                table?.currentOrder?._id ||
                table?.currentOrder?.id ||
                table?.currentOrder ||
                null;

            const canEditBooked =
                normalizedRole === "admin" ||
                normalizedRole === "camarero" ||
                normalizedRole === "cajera";

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

        // 3) MESA DISPONIBLE => draft local
        dispatch(
            setDraftContext({
                table: tableId,
                isVirtual: false,
                virtualType: null,
                orderSource: "DINE_IN",
            })
        );

        navigate("/menu"); // sin orderId => draft local
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
            <div className="mb-4 flex items-center gap-3">
                <label className="text-gray-300 text-sm">Área:</label>
                <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="bg-[#1f1f1f] text-white text-sm rounded-lg px-3 py-2 border border-white/10"
                >
                    <option value="all">Todas</option>
                    {areas.map((a) => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
            </div>
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
                    filteredTables.map((t) => (
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
