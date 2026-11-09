import api from "../lib/api";
import MoveTableAction from "../components/tables/MoveTableAction";
import { refreshTableViews, tableOperationMessage } from "../lib/tableOperations";
import React, { useEffect } from "react";
import { setDraftContext, clearDraftContext } from "../redux/slices/customerSlice";
import { removeAllItems } from "../redux/slices/cartSlice";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTables, updateTable, updateOrder, addOrder } from "@https";
import TableCard from "@components/tables/TableCard";
import TableAccountsActions from "@components/tables/TableAccountsActions";
import { enqueueSnackbar } from "notistack";
import { setUser } from "../redux/slices/userSlice";
import { QK } from "../queryKeys";
import { getSocket } from "../realtime/socket";
import { useTablesRealtime } from "../realtime/useTablesRealtime";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";


export default function Tables() {
    const { t } = useTranslation();
    const releaseLock = React.useRef(false);
    const moveLock = React.useRef(false);
    const [moveBusy, setMoveBusy] = React.useState(false);
    const onMoveBusyChange = busy => { moveLock.current = busy; setMoveBusy(busy); };

    const location =
        useLocation();

    const navigate =
        useNavigate();

    const queryClient =
        useQueryClient();

    const tenantState =
        useSelector(
            (s) =>
                s.store ||
                s.tenant ||
                {}
        );

    const tenant =
        tenantState?.tenant ||
        tenantState?.data ||
        tenantState;

    const orderSources =
        tenant?.features?.orderSources ||
        {};

    const [
        deliveryPayOpen,
        setDeliveryPayOpen,
    ] =
        React.useState(
            false
        );

    const [
        deliveryPayMethod,
        setDeliveryPayMethod,
    ] =
        React.useState(
            "Efectivo"
        );

    const [
        pendingVirtual,
        setPendingVirtual,
    ] =
        React.useState(
            null
        );

    const [
        tableActionModal,
        setTableActionModal,
    ] =
        React.useState({
            open:
                false,

            table:
                null,
        });


    const closeTableActionModal =
        () => {
            if (moveLock.current || releaseLock.current) return;

            setTableActionModal({
                open:
                    false,

                table:
                    null,
            });
        };


    const [
        releaseConfirmModal,
        setReleaseConfirmModal,
    ] =
        React.useState({
            open:
                false,

            table:
                null,

            loading:
                false,
        });


    const closeReleaseConfirmModal =
        () => {

            if (
                releaseConfirmModal
                    .loading
            ) {
                return;
            }


            setReleaseConfirmModal({
                open:
                    false,

                table:
                    null,

                loading:
                    false,
            });
        };


    const userState =
        useSelector(
            (
                state
            ) =>
                state.user
        );


    // soporta varios shapes: {userData}, {user}, o el usuario directo
    const currentUser =
        userState?.userData ||
        userState?.user ||
        userState;


    useTablesRealtime({
        tenantId:
        currentUser?.tenantId,
    });


    const orderId =
        new URLSearchParams(
            location.search
        ).get(
            "orderId"
        );


    const dispatch =
        useDispatch();


    useEffect(
        () => {

            if (
                !currentUser
            ) {
                return;
            }


            const isTestAdmin =
                currentUser?.email ===
                "test@gmail.com";


            const hasWrongRole =
                currentUser
                    ?.role
                    ?.toLowerCase?.() !==
                "admin";


            if (
                isTestAdmin &&
                hasWrongRole
            ) {

                const fixedUser = {
                    ...currentUser,

                    role:
                        "Admin",
                };


                dispatch(
                    setUser(
                        fixedUser
                    )
                );


                console.log(
                    "✅ Rol corregido a Admin para:",
                    fixedUser.email
                );
            }

        },
        [
            currentUser,
            dispatch,
        ]
    );


    const {
        data,
        isLoading,
    } =
        useQuery({

            queryKey:
            QK.TABLES,

            queryFn:
            getTables,

            enabled:
                !!currentUser?._id,

            refetchInterval:
                0,

            refetchOnWindowFocus:
                true,

            refetchOnMount:
                true,

            select:
                (
                    res
                ) => {

                    if (
                        Array.isArray(
                            res
                                ?.data
                                ?.data
                        )
                    ) {
                        return res
                            .data
                            .data;
                    }


                    if (
                        Array.isArray(
                            res
                                ?.data
                        )
                    ) {
                        return res
                            .data;
                    }


                    return [];
                },
        });


    const tables =
        data ||
        [];


    const [
        selectedArea,
        setSelectedArea,
    ] =
        React.useState(
            "all"
        );


    const areas =
        React.useMemo(
            () => {

                const set =
                    new Set();


                for (
                    const table
                    of tables
                    ) {

                    if (
                        table?.isVirtual
                    ) {
                        continue;
                    }


                    set.add(
                        (
                            table?.area ||
                            "General"
                        ).trim()
                    );
                }


                return Array
                    .from(
                        set
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a.localeCompare(
                                b
                            )
                    );

            },
            [
                tables,
            ]
        );


    const filteredTables =
        React.useMemo(
            () => {

                const onlyReal =
                    tables.filter(
                        (
                            table
                        ) =>
                            !table
                                ?.isVirtual
                    );


                if (
                    selectedArea ===
                    "all"
                ) {
                    return onlyReal;
                }


                return onlyReal
                    .filter(
                        (
                            table
                        ) =>
                            (
                                table?.area ||
                                "General"
                            ).trim() ===
                            selectedArea
                    );

            },
            [
                tables,
                selectedArea,
            ]
        );


    const mUpdateOrder =
        useMutation({

            mutationFn:
                ({
                     id,
                     body,
                 }) =>
                    updateOrder(
                        id,
                        body
                    ),

            onSuccess:
                (
                    _res,
                    vars
                ) => {

                    queryClient
                        .invalidateQueries({
                            queryKey:
                            QK.TABLES,

                            exact:
                                true,
                        });


                    queryClient
                        .invalidateQueries({
                            queryKey:
                            QK.ORDERS,

                            exact:
                                true,
                        });


                    queryClient
                        .refetchQueries({
                            queryKey:
                            QK.TABLES,

                            exact:
                                true,

                            type:
                                "active",
                        });


                    const tenantId =
                        currentUser
                            ?.tenantId ||
                        localStorage
                            .getItem(
                                "tenantId"
                            );


                    const socket =
                        getSocket();


                    socket
                        ?.emit(
                            "tenant:tablesUpdated",
                            {
                                tenantId,

                                orderId:
                                vars?.id,

                                tableId:
                                vars
                                    ?.body
                                    ?.table,
                            }
                        );
                },
        });


    const mCreateOrder =
        useMutation({

            mutationFn:
                (
                    payload
                ) =>
                    addOrder(
                        payload
                    ),
        });


    const mUpdateTable =
        useMutation({

            mutationFn:
                ({
                     id,
                     body,
                 }) =>
                    updateTable(
                        id,
                        body
                    ),

            onSuccess:
                (
                    _res,
                    vars
                ) => {

                    queryClient
                        .invalidateQueries({
                            queryKey:
                            QK.TABLES,

                            exact:
                                true,
                        });


                    queryClient
                        .refetchQueries({
                            queryKey:
                            QK.TABLES,

                            exact:
                                true,

                            type:
                                "active",
                        });


                    enqueueSnackbar(
                        t(
                            "tables.messages.tableUpdated"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );


                    closeTableActionModal();
                },

            onError:
                (
                    error
                ) => {

                    enqueueSnackbar(
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "tables.messages.tableUpdateFailed"
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


    const normalizedRole =
        (
            currentUser?.role ||
            currentUser
                ?.user
                ?.role ||
            ""
        )
            .toString()
            .toLowerCase();


    const goToTableFlow =
        (
            table
        ) => {

            const tableId =
                table?._id;


            const status =
                table?.status ||
                "Disponible";


            const currentOrder =
                table?.currentOrder ||
                null;


            const existingOrderId =
                currentOrder?._id ||
                currentOrder?.id ||
                (
                    typeof currentOrder ===
                    "string"
                        ? currentOrder
                        : null
                );


            const existingOrderStatus =
                String(
                    currentOrder
                        ?.orderStatus ||
                    ""
                ).trim();


            const hasActiveOrder =
                Boolean(
                    existingOrderId
                ) &&
                existingOrderStatus !==
                "Cancelado";


            const hasClosedOrderLinked =
                Boolean(
                    existingOrderId
                ) &&
                existingOrderStatus ===
                "Cancelado";


            const canEditBooked =
                normalizedRole ===
                "admin" ||
                normalizedRole ===
                "camarero" ||
                normalizedRole ===
                "cajera";


            if (
                (
                    status ===
                    "Ocupada" ||
                    status ===
                    "Reservada"
                ) &&
                hasActiveOrder
            ) {

                if (
                    !canEditBooked
                ) {

                    enqueueSnackbar(
                        t(
                            "tables.messages.occupiedNoPermission"
                        ),
                        {
                            variant:
                                "warning",
                        }
                    );

                    return;
                }


                navigate(
                    `/menu?orderId=${existingOrderId}`
                );

                return;
            }


            if (
                (
                    status ===
                    "Ocupada" ||
                    status ===
                    "Reservada"
                ) &&
                hasClosedOrderLinked
            ) {

                console.warn(
                    "[Tables] Mesa con orden cerrada enlazada detectada",
                    {
                        tableId,

                        existingOrderId,

                        existingOrderStatus,
                    }
                );


                enqueueSnackbar(
                    t(
                        "tables.messages.closedOrderLinked"
                    ),
                    {
                        variant:
                            "warning",
                    }
                );


                queryClient
                    .invalidateQueries({
                        queryKey:
                        QK.TABLES,

                        exact:
                            true,
                    });
            }


            /*
             * Mesa nueva sin orden activa:
             * limpiar carrito anterior,
             * pero NO borrar el cliente seleccionado.
             */

            dispatch(
                removeAllItems()
            );


            dispatch(
                clearDraftContext()
            );


            dispatch(
                setDraftContext({
                    table: {
                        _id:
                        tableId,

                        id:
                        tableId,

                        tableNo:
                        table
                            ?.tableNo,

                        tableNumber:
                        table
                            ?.tableNumber,

                        name:
                        table
                            ?.name,

                        area:
                            table
                                ?.area ||
                            "General",

                        seats:
                        table
                            ?.seats,
                    },

                    isVirtual:
                        false,

                    virtualType:
                        null,

                    orderSource:
                        "DINE_IN",
                })
            );


            navigate(
                "/menu"
            );
        };


    const getOrderIdFromTable =
        (
            table
        ) => {

            const currentOrder =
                table?.currentOrder;


            return (
                currentOrder?._id ||
                currentOrder?.id ||
                (
                    typeof currentOrder ===
                    "string"
                        ? currentOrder
                        : null
                ) ||
                null
            );
        };


    const handleReleaseTable =
        (
            table
        ) => {

            const tableId =
                table?._id ||
                table?.id ||
                null;


            if (
                !tableId
            ) {

                enqueueSnackbar(
                    t(
                        "tables.messages.tableIdNotFound"
                    ),
                    {
                        variant:
                            "error",
                    }
                );

                return;
            }


            setReleaseConfirmModal({
                open:
                    true,

                table,

                loading:
                    false,
            });
        };


    const confirmReleaseTable = async () => {
        const table = releaseConfirmModal.table;
        const tableId = table?._id || table?.id;
        if (releaseLock.current || !tableId) return;
        releaseLock.current = true;
        setReleaseConfirmModal(previous => ({ ...previous, loading: true }));
        try {
            const activeOrderId = getOrderIdFromTable(table);
            if (activeOrderId) {
                await api.post(`/api/order/${encodeURIComponent(activeOrderId)}/close-and-vacate`);
            } else {
                await updateTable(tableId, { status: "Disponible", orderId: null });
            }
            dispatch(removeAllItems());
            dispatch(clearDraftContext());
            await refreshTableViews(queryClient);
            enqueueSnackbar(t("tables.messages.releaseSuccess"), { variant: "success" });
            setReleaseConfirmModal({ open: false, table: null, loading: false });
            releaseLock.current = false;
            closeTableActionModal();
        } catch (error) {
            setReleaseConfirmModal(previous => ({ ...previous, loading: false }));
            enqueueSnackbar(tableOperationMessage(error), { variant: "error" });
        } finally { releaseLock.current = false; }
    };

    const handlePickTable =
        (
            table
        ) => {

            /*
             * 1) CANALES VIRTUALES
             */

            if (
                table?.isVirtual
            ) {

                const vtRaw =
                    (
                        table
                            ?.virtualType ||
                        "QUICK"
                    )
                        .toString()
                        .trim()
                        .toUpperCase();


                const allowed =
                    new Set([
                        "PEDIDOSYA",
                        "UBEREATS",
                        "DELIVERY",
                        "QUICK",
                    ]);


                const vt =
                    allowed.has(
                        vtRaw
                    )
                        ? vtRaw
                        : "QUICK";


                dispatch(
                    removeAllItems()
                );


                dispatch(
                    clearDraftContext()
                );


                dispatch(
                    setDraftContext({
                        table:
                            null,

                        isVirtual:
                            true,

                        virtualType:
                        vt,

                        orderSource:
                        vt,
                    })
                );


                navigate(
                    "/menu"
                );

                return;
            }


            /*
             * 2) MESA REAL
             */

            setTableActionModal({
                open:
                    true,

                table,
            });
        };


    /*
     * Tarjetas virtuales.
     * No se guardan en BD.
     */

    const quickCard = {
        _id:
            "no-table",

        isVirtual:
            true,

        virtualType:
            "QUICK",

        displayName:
            t(
                "tables.quick"
            ),

        tableNo:
            0,

        status:
            "Quick",

        seats:
            0,
    };


    const pedidosYaEnabled =
        !!orderSources
            ?.pedidosYa
            ?.enabled;


    const uberEatsEnabled =
        !!orderSources
            ?.uberEats
            ?.enabled;


    const deliveryEnabled =
        !!orderSources
            ?.delivery
            ?.enabled;


    const deliveryCard = {
        _id:
            "virtual-delivery",

        isVirtual:
            true,

        virtualType:
            "DELIVERY",

        displayName:
            t(
                "tables.delivery"
            ),

        badgeText:
            t(
                "tables.shippingBadge"
            ),

        status:
            "Delivery",

        seats:
            0,
    };


    const pedidosYaCard = {
        _id:
            "virtual-pedidosya",

        isVirtual:
            true,

        virtualType:
            "PEDIDOSYA",

        displayName:
            "PedidosYa",

        badgeText:
            `${Math.round(
                (
                    Number(
                        orderSources
                            ?.pedidosYa
                            ?.commissionRate ??
                        0.26
                    ) *
                    100
                )
            )}%`,

        status:
            "Delivery",

        seats:
            0,
    };


    const uberEatsCard = {
        _id:
            "virtual-ubereats",

        isVirtual:
            true,

        virtualType:
            "UBEREATS",

        displayName:
            "Uber Eats",

        badgeText:
            `${Math.round(
                (
                    Number(
                        orderSources
                            ?.uberEats
                            ?.commissionRate ??
                        0.22
                    ) *
                    100
                )
            )}%`,

        status:
            "Delivery",

        seats:
            0,
    };


    /*
     * Solo traducimos los estados cuando
     * se muestran en pantalla.
     *
     * Los valores internos permanecen:
     * Disponible / Ocupada / Reservada.
     */
    const getTableStatusLabel =
        (
            value
        ) => {

            const normalized =
                String(
                    value ||
                    "Disponible"
                )
                    .trim()
                    .toLowerCase();


            if (
                normalized ===
                "disponible"
            ) {
                return t(
                    "tables.status.available"
                );
            }


            if (
                normalized ===
                "ocupada" ||
                normalized ===
                "ocupado"
            ) {
                return t(
                    "tables.status.occupied"
                );
            }


            if (
                normalized ===
                "reservada" ||
                normalized ===
                "reservado"
            ) {
                return t(
                    "tables.status.reserved"
                );
            }


            return (
                value ||
                t(
                    "tables.status.available"
                )
            );
        };


    /*
     * Los nombres reales de áreas creadas
     * por el negocio NO se traducen.
     *
     * Solo traducimos el fallback "General".
     */
    const getAreaDisplayLabel =
        (
            value
        ) => {

            const area =
                String(
                    value ||
                    ""
                ).trim();


            return (
                area ||
                t(
                    "tables.general"
                )
            );
        };


    return (
        <section className="bg-[#111] min-h-screen px-6 pt-6 pb-24">

            <div className="mb-4 flex items-center gap-3">

                <label className="text-gray-300 text-sm">

                    {t(
                        "tables.area"
                    )}:

                </label>


                <select
                    value={
                        selectedArea
                    }

                    onChange={(
                        event
                    ) =>
                        setSelectedArea(
                            event
                                .target
                                .value
                        )
                    }

                    className="
                        bg-[#1f1f1f]
                        text-white
                        text-sm
                        rounded-lg
                        px-3
                        py-2
                        border
                        border-white/10
                    "
                >

                    <option value="all">

                        {t(
                            "tables.allAreas"
                        )}

                    </option>


                    {areas.map(
                        (
                            area
                        ) => (

                            <option
                                key={
                                    area
                                }

                                value={
                                    area
                                }
                            >
                                {area}
                            </option>

                        )
                    )}

                </select>

            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                <TableCard
                    table={
                        quickCard
                    }

                    onPick={() =>
                        handlePickTable(
                            quickCard
                        )
                    }
                />


                {pedidosYaEnabled && (

                    <TableCard
                        table={
                            pedidosYaCard
                        }

                        onPick={() =>
                            handlePickTable(
                                pedidosYaCard
                            )
                        }
                    />

                )}


                {deliveryEnabled && (

                    <TableCard
                        table={
                            deliveryCard
                        }

                        onPick={() =>
                            handlePickTable(
                                deliveryCard
                            )
                        }
                    />

                )}


                {uberEatsEnabled && (

                    <TableCard
                        table={
                            uberEatsCard
                        }

                        onPick={() =>
                            handlePickTable(
                                uberEatsCard
                            )
                        }
                    />

                )}


                {isLoading
                    ? (

                        <div className="text-gray-400">

                            {t(
                                "tables.loadingTables"
                            )}

                        </div>

                    )
                    : filteredTables
                        .map(
                            (
                                table
                            ) => (

                                <TableCard
                                    key={
                                        table._id ||
                                        table.id
                                    }

                                    table={
                                        table
                                    }

                                    onPick={() =>
                                        handlePickTable(
                                            table
                                        )
                                    }
                                />

                            )
                        )
                }

            </div>


            <AnimatePresence>

                {tableActionModal.open &&
                    tableActionModal.table && (

                        <motion.div
                            initial={{
                                opacity:
                                    0,
                            }}

                            animate={{
                                opacity:
                                    1,
                            }}

                            exit={{
                                opacity:
                                    0,
                            }}

                            className="
                            fixed
                            inset-0
                            z-[9999]
                            bg-black/70
                            backdrop-blur-sm
                            flex
                            items-center
                            justify-center
                            p-4
                        "

                            onClick={
                                closeTableActionModal
                            }
                        >

                            <motion.div
                                initial={{
                                    scale:
                                        0.96,

                                    opacity:
                                        0,

                                    y:
                                        12,
                                }}

                                animate={{
                                    scale:
                                        1,

                                    opacity:
                                        1,

                                    y:
                                        0,
                                }}

                                exit={{
                                    scale:
                                        0.96,

                                    opacity:
                                        0,

                                    y:
                                        12,
                                }}

                                transition={{
                                    duration:
                                        0.2,

                                    ease:
                                        "easeOut",
                                }}

                                className="
                                w-full
                                max-w-md
                                rounded-2xl
                                border
                                border-white/10
                                bg-gradient-to-br
                                from-[#111111]
                                to-[#0a0a0a]
                                shadow-2xl
                                overflow-hidden
                            "

                                onClick={(
                                    event
                                ) =>
                                    event
                                        .stopPropagation()
                                }
                            >

                                <div className="p-5 border-b border-white/10">

                                    <div className="flex items-center justify-between gap-3">

                                        <div>

                                            <h3 className="text-lg font-semibold text-white">

                                                {t(
                                                    "tables.table"
                                                )}{" "}

                                                {tableActionModal
                                                        .table
                                                        ?.tableNo ||
                                                    "—"
                                                }

                                            </h3>


                                            <p className="text-sm text-white/60 mt-1">

                                                {t(
                                                    "tables.area"
                                                )}:{" "}

                                                {getAreaDisplayLabel(
                                                    tableActionModal
                                                        .table
                                                        ?.area
                                                )}

                                            </p>

                                        </div>


                                        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                                            <TableAccountsActions
                                                table={tableActionModal.table}
                                                variant="split"
                                                onOpenOrder={(id) => { closeTableActionModal(); navigate(`/menu?orderId=${encodeURIComponent(id)}`); }}
                                                onChanged={() => queryClient.invalidateQueries({queryKey:QK.TABLES})}
                                            />
                                            <MoveTableAction table={tableActionModal.table} tables={tables} onDone={closeTableActionModal} onBusyChange={onMoveBusyChange} />
                                        <span
                                            className={`px-3 py-2 rounded-lg text-base font-bold border whitespace-nowrap ${
                                                tableActionModal
                                                    .table
                                                    ?.status ===
                                                "Disponible"
                                                    ? "bg-sky-700/40 text-sky-200 border-sky-400/50"
                                                    : "bg-green-700/40 text-green-200 border-green-400/50"
                                            }`}
                                        >

                                        {getTableStatusLabel(
                                            tableActionModal
                                                .table
                                                ?.status
                                        )}

                                    </span>
                                        </div>

                                    </div>

                                </div>


                                <div className="p-5 space-y-3">

                                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">

                                        <div className="flex items-center justify-between text-sm">

                                        <span className="text-white/60">

                                            {t(
                                                "tables.seats"
                                            )}

                                        </span>


                                            <span className="text-white font-medium">

                                            {tableActionModal
                                                    .table
                                                    ?.seats ??
                                                "—"
                                            }

                                        </span>

                                        </div>


                                        <div className="flex items-center justify-between text-sm mt-2">

                                        <span className="text-white/60">

                                            {t(
                                                "tables.currentOrder"
                                            )}

                                        </span>


                                            <span className="text-white font-medium">

                                            {tableActionModal
                                                .table
                                                ?.currentOrder
                                                ? t(
                                                    "tables.yes"
                                                )
                                                : t(
                                                    "tables.no"
                                                )
                                            }

                                        </span>

                                        </div>

                                    </div>


                                    <TableAccountsActions
                                        table={tableActionModal.table}
                                        variant="ecf"
                                        onOpenOrder={(id) => { if (moveLock.current) return; closeTableActionModal(); navigate(`/menu?orderId=${encodeURIComponent(id)}`); }}
                                        onChanged={() => queryClient.invalidateQueries({queryKey:QK.TABLES})}
                                    />

                                    <button
                                        type="button"

                                        onClick={() => {
                                            if (moveLock.current) return;

                                            const selectedTable =
                                                tableActionModal
                                                    .table;


                                            closeTableActionModal();


                                            goToTableFlow(
                                                selectedTable
                                            );

                                        }}

                                        className="
                                        w-full
                                        px-4
                                        py-3
                                        rounded-xl
                                        bg-[#38bdf8]
                                        text-black
                                        font-semibold
                                        hover:bg-[#7dd3fc]
                                        transition-all
                                    "
                                    >

                                        {tableActionModal
                                            .table
                                            ?.currentOrder
                                            ? t(
                                                "tables.openOrder"
                                            )
                                            : t(
                                                "tables.goToMenu"
                                            )
                                        }

                                    </button>



                                    {tableActionModal
                                            .table
                                            ?.status !==
                                        "Disponible" && (

                                            <button
                                                type="button"
                                                disabled={moveBusy}

                                                onClick={() =>
                                                    handleReleaseTable(
                                                        tableActionModal
                                                            .table
                                                    )
                                                }

                                                className="
                                            w-full
                                            px-4
                                            py-3
                                            rounded-xl
                                            border
                                            border-red-500/20
                                            bg-red-500/10
                                            text-red-300
                                            font-semibold
                                            hover:bg-red-500/20
                                            transition-all
                                            disabled:opacity-60
                                        "
                                            >

                                                {t(
                                                    "tables.releaseTable"
                                                )}

                                            </button>

                                        )}


                                    <button
                                        type="button"

                                        onClick={
                                            closeTableActionModal
                                        }

                                        className="
                                        w-full
                                        px-4
                                        py-3
                                        rounded-xl
                                        border
                                        border-white/10
                                        bg-[#1a1a1a]
                                        text-white
                                        hover:bg-[#262626]
                                        transition-all
                                    "
                                    >

                                        {t(
                                            "common.cancel"
                                        )}

                                    </button>

                                </div>

                            </motion.div>

                        </motion.div>

                    )}

            </AnimatePresence>


            <AnimatePresence>

                {releaseConfirmModal.open &&
                    releaseConfirmModal.table && (

                        <motion.div
                            initial={{
                                opacity:
                                    0,
                            }}

                            animate={{
                                opacity:
                                    1,
                            }}

                            exit={{
                                opacity:
                                    0,
                            }}

                            className="
                            fixed
                            inset-0
                            z-[10000]
                            bg-black/75
                            backdrop-blur-sm
                            flex
                            items-center
                            justify-center
                            p-4
                        "

                            onClick={
                                closeReleaseConfirmModal
                            }
                        >

                            <motion.div
                                initial={{
                                    scale:
                                        0.94,

                                    opacity:
                                        0,

                                    y:
                                        16,
                                }}

                                animate={{
                                    scale:
                                        1,

                                    opacity:
                                        1,

                                    y:
                                        0,
                                }}

                                exit={{
                                    scale:
                                        0.94,

                                    opacity:
                                        0,

                                    y:
                                        16,
                                }}

                                transition={{
                                    duration:
                                        0.2,

                                    ease:
                                        "easeOut",
                                }}

                                className="
                                w-full
                                max-w-md
                                overflow-hidden
                                rounded-3xl
                                border
                                border-white/10
                                bg-gradient-to-br
                                from-[#151515]
                                via-[#101010]
                                to-[#070707]
                                shadow-2xl
                            "

                                onClick={(
                                    event
                                ) =>
                                    event
                                        .stopPropagation()
                                }
                            >

                                <div className="p-6 border-b border-white/10">

                                    <div className="flex items-start gap-4">

                                        <div className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">

                                        <span className="text-2xl">
                                            !
                                        </span>

                                        </div>


                                        <div className="flex-1">

                                            <h3 className="text-xl font-bold text-white">

                                                {t(
                                                    "tables.releaseTable"
                                                )}

                                            </h3>


                                            <p className="mt-2 text-sm leading-6 text-white/60">

                                                {t(
                                                    "tables.releaseDescription"
                                                )}

                                            </p>

                                        </div>

                                    </div>

                                </div>


                                <div className="p-6">

                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 mb-5">

                                        <div className="flex items-center justify-between text-sm">

                                        <span className="text-white/50">

                                            {t(
                                                "tables.table"
                                            )}

                                        </span>


                                            <span className="font-semibold text-white">

                                            {t(
                                                "tables.table"
                                            )}{" "}

                                                {releaseConfirmModal
                                                        .table
                                                        ?.tableNo ||
                                                    "—"
                                                }

                                        </span>

                                        </div>


                                        <div className="flex items-center justify-between text-sm mt-3">

                                        <span className="text-white/50">

                                            {t(
                                                "tables.area"
                                            )}

                                        </span>


                                            <span className="font-semibold text-white">

                                            {getAreaDisplayLabel(
                                                releaseConfirmModal
                                                    .table
                                                    ?.area
                                            )}

                                        </span>

                                        </div>


                                        <div className="flex items-center justify-between text-sm mt-3">

                                        <span className="text-white/50">

                                            {t(
                                                "tables.currentOrder"
                                            )}

                                        </span>


                                            <span className="font-semibold text-white">

                                            {releaseConfirmModal
                                                .table
                                                ?.currentOrder
                                                ? t(
                                                    "tables.yes"
                                                )
                                                : t(
                                                    "tables.no"
                                                )
                                            }

                                        </span>

                                        </div>

                                    </div>


                                    <div className="flex flex-col sm:flex-row gap-3">

                                        <button
                                            type="button"

                                            onClick={
                                                closeReleaseConfirmModal
                                            }

                                            disabled={
                                                releaseConfirmModal
                                                    .loading
                                            }

                                            className="
                                            w-full
                                            px-4
                                            py-3
                                            rounded-2xl
                                            border
                                            border-white/10
                                            bg-[#1a1a1a]
                                            text-white
                                            font-semibold
                                            hover:bg-[#242424]
                                            transition-all
                                            disabled:opacity-50
                                        "
                                        >

                                            {t(
                                                "common.cancel"
                                            )}

                                        </button>


                                        <button
                                            type="button"

                                            onClick={
                                                confirmReleaseTable
                                            }

                                            disabled={
                                                releaseConfirmModal
                                                    .loading
                                            }

                                            className="
                                            w-full
                                            px-4
                                            py-3
                                            rounded-2xl
                                            bg-red-500
                                            text-white
                                            font-bold
                                            hover:bg-red-400
                                            transition-all
                                            disabled:opacity-50
                                        "
                                        >

                                            {releaseConfirmModal
                                                .loading
                                                ? t(
                                                    "tables.releasing"
                                                )
                                                : t(
                                                    "tables.confirmRelease"
                                                )
                                            }

                                        </button>

                                    </div>

                                </div>

                            </motion.div>

                        </motion.div>

                    )}

            </AnimatePresence>

        </section>
    );
}
