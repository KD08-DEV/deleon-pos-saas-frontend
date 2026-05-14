import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomNav from "../components/shared/BottomNav";
import { MdRestaurantMenu } from "react-icons/md";
import MenuContainer from "../components/menu/MenuContainer";
import CustomerInfo from "../components/menu/CustomerInfo";
import CartInfo from "../components/menu/CartInfo";
import Bill from "../components/menu/Bill";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrderById, updateOrder, addOrder, updateTable } from "@https";
import { setCart, removeAllItems } from "../redux/slices/cartSlice";
import { useDispatch, useSelector } from "react-redux";
import { clearDraftContext } from "../redux/slices/customerSlice";
import { AnimatePresence, motion } from "framer-motion";
import { enqueueSnackbar } from "notistack";

const TABLES_ROUTE = "/tables";

const num = (value) => {
    if (value === null || value === undefined) return 0;
    const n = Number(String(value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
};

const getTableIdFromAny = (value) => {
    if (!value) return null;
    if (typeof value === "string") return value;

    return (
        value?._id ||
        value?.id ||
        value?.tableId ||
        null
    );
};

const getCartItemsArray = (cart) => {
    if (Array.isArray(cart)) return cart;
    if (Array.isArray(cart?.items)) return cart.items;
    return [];
};

const normalizeItemsForOrder = (items = []) => {
    return items
        .map((it) => {
            const quantity = num(it?.quantity ?? it?.qty ?? 1);
            const unitPrice = num(
                it?.unitPrice ??
                it?.pricePerQuantity ??
                it?.pricePerLb ??
                it?.price ??
                0
            );

            const lineTotal = num(
                it?.price ??
                unitPrice * quantity
            );

            const dishId =
                it?.dishId ||
                it?.dish?._id ||
                it?.dish ||
                it?.id ||
                it?._id ||
                null;

            return {
                dishId,
                lineId: it?.lineId || null,
                name: String(it?.name || it?.dishName || it?.itemName || "Producto").trim(),
                qtyType: it?.qtyType || "unit",
                weightUnit: it?.weightUnit || "lb",
                quantity,
                unitPrice,
                price: Number(lineTotal.toFixed(2)),
                productionArea: it?.productionArea || "kitchen",
                note: it?.note || "",
                addons: Array.isArray(it?.addons) ? it.addons : [],
                modifiers: Array.isArray(it?.modifiers) ? it.modifiers : [],
                presentation: it?.presentation || "Regular",
            };
        })
        .filter((it) => it.name && it.quantity > 0 && it.unitPrice >= 0);
};

const Menu = () => {
    const [isOrderOpen, setIsOrderModalOpen] = useState(true);
    const [leaveTableModal, setLeaveTableModal] = useState({
        open: false,
        loading: false,
    });

    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get("orderId");

    const dispatch = useDispatch();
    const draft = useSelector((state) => state.customer);
    const cart = useSelector((state) => state.cart);

    const cartItems = useMemo(() => getCartItemsArray(cart), [cart]);

    const itemsCount = useMemo(() => {
        return cartItems.reduce((acc, it) => {
            const isWeight = it?.qtyType === "weight";
            return acc + (isWeight ? 1 : num(it?.quantity ?? it?.qty ?? 1));
        }, 0);
    }, [cartItems]);

    const totalAmount = useMemo(() => {
        return cartItems.reduce((acc, it) => {
            const lineTotal = num(
                it?.price ??
                num(it?.unitPrice ?? 0) * num(it?.quantity ?? it?.qty ?? 1)
            );

            return acc + lineTotal;
        }, 0);
    }, [cartItems]);

    const hasDraftContext = !!draft?.table || !!draft?.isVirtual || !!draft?.orderSource;
    const draftKey = `${draft?.table || "no-table"}|${draft?.isVirtual ? "virtual" : "real"}|${draft?.orderSource || "DINE_IN"}`;
    const lastDraftKeyRef = useRef(null);

    const { data: orderRes } = useQuery({
        queryKey: ["order", orderId],
        queryFn: () => getOrderById(orderId),
        enabled: !!orderId,
    });

    const order = orderRes?.data?.data;

    const getTableLabel = (table) => {
        if (!table) return "N/A";

        if (typeof table === "string") {
            return "Mesa seleccionada";
        }

        return (
            table?.tableNo ||
            table?.tableNumber ||
            table?.name ||
            table?.label ||
            "Mesa seleccionada"
        );
    };

    const displayCustomerName =
        order?.customerDetails?.name ||
        draft?.customerName ||
        draft?.name ||
        "Customer Name";

    const displayTableLabel =
        order?.table?.tableNo ||
        order?.table?.tableNumber ||
        getTableLabel(draft?.table);

    const tableId =
        getTableIdFromAny(order?.table) ||
        getTableIdFromAny(draft?.table);

    const currentOrderId =
        orderId ||
        order?._id ||
        null;

    useEffect(() => {
        document.title = "POS | Menu";
    }, []);

    useEffect(() => {
        if (orderId) return;
        if (!hasDraftContext) return;

        if (lastDraftKeyRef.current === draftKey) return;

        dispatch(removeAllItems());
        lastDraftKeyRef.current = draftKey;
    }, [orderId, hasDraftContext, draftKey, dispatch]);

    useEffect(() => {
        if (!isOrderOpen) {
            dispatch(removeAllItems());
            dispatch(clearDraftContext());
            navigate(TABLES_ROUTE);
        }
    }, [isOrderOpen, dispatch, navigate]);

    useEffect(() => {
        if (!orderId) return;

        dispatch(removeAllItems());

        const items = order?.items || [];
        if (items.length === 0) return;

        const mapped = items.map((it) => {
            const quantity = Number(it.quantity ?? it.qty ?? it.count ?? 1);
            const dishId = it.dishId ?? it.dish?._id ?? it.dish ?? it.id ?? it._id;

            const name =
                it.name ||
                it.dishName ||
                it.itemName ||
                it?.dishInfo?.name ||
                it?.dish?.name ||
                "Producto";

            const qtyType =
                it.qtyType ||
                (it?.dish?.sellMode === "weight" ? "weight" : "unit") ||
                "unit";

            const weightUnit = it.weightUnit || it?.dish?.weightUnit || "lb";

            const safeUnitPrice = Number(
                it.unitPrice ??
                it.pricePerQuantity ??
                it.pricePerLb ??
                it?.dish?.pricePerLb ??
                it?.dish?.price ??
                0
            );

            const lineTotal = Number(
                it.price ??
                safeUnitPrice * quantity
            );

            return {
                id: String(dishId),
                dishId: String(dishId),
                lineId: it.lineId || null,
                name,
                qtyType,
                weightUnit,
                quantity,
                unitPrice: safeUnitPrice,
                price: Number(lineTotal.toFixed(2)),
                productionArea: it.productionArea || "kitchen",
                note: it.note || "",
                addons: Array.isArray(it.addons) ? it.addons : [],
                modifiers: Array.isArray(it.modifiers) ? it.modifiers : [],
            };
        });

        dispatch(setCart(mapped));
    }, [orderId, order, dispatch]);

    useEffect(() => {
        if (!orderId && !hasDraftContext) {
            navigate(TABLES_ROUTE, { replace: true });
        }
    }, [orderId, hasDraftContext, navigate]);

    const closeLeaveTableModal = () => {
        if (leaveTableModal.loading) return;

        setLeaveTableModal({
            open: false,
            loading: false,
        });
    };

    const goBackClean = () => {
        dispatch(removeAllItems());
        dispatch(clearDraftContext());
        navigate(TABLES_ROUTE, { replace: true });
    };

    const handleBackFromMenu = () => {
        const hasItems = itemsCount > 0;

        if (!hasItems) {
            goBackClean();
            return;
        }

        if (!tableId && !currentOrderId) {
            goBackClean();
            return;
        }

        setLeaveTableModal({
            open: true,
            loading: false,
        });
    };

    const handleSaveItemsAndLeave = async () => {
        try {
            setLeaveTableModal((prev) => ({
                ...prev,
                loading: true,
            }));

            const normalizedItems = normalizeItemsForOrder(cartItems);

            if (!normalizedItems.length) {
                goBackClean();
                return;
            }

            const payload = {
                orderStatus: "En Progreso",
                submitAction: "update",
                items: normalizedItems,
                table: tableId || undefined,
                paymentMethod: order?.paymentMethod || "Efectivo",
                orderSource: order?.orderSource || draft?.orderSource || "DINE_IN",
                customerId: order?.customerId?._id || order?.customerId || draft?.customerId || null,
                customerDetails: {
                    name:
                        order?.customerDetails?.name ||
                        draft?.customerName ||
                        draft?.name ||
                        "",
                    phone:
                        order?.customerDetails?.phone ||
                        draft?.customerPhone ||
                        draft?.phone ||
                        "",
                    address:
                        order?.customerDetails?.address ||
                        draft?.customerAddress ||
                        draft?.address ||
                        "",
                    guests:
                        order?.customerDetails?.guests ||
                        draft?.guests ||
                        0,
                    rnc:
                        order?.customerDetails?.rnc ||
                        draft?.rnc ||
                        "",
                    rncCedula:
                        order?.customerDetails?.rncCedula ||
                        draft?.rncCedula ||
                        draft?.rnc ||
                        "",
                },
            };

            let savedOrderId = currentOrderId;

            if (currentOrderId) {
                const res = await updateOrder(currentOrderId, payload);
                savedOrderId = res?.data?.data?._id || currentOrderId;
            } else {
                const res = await addOrder(payload);
                savedOrderId = res?.data?.data?._id || null;
            }

            if (tableId && savedOrderId) {
                await updateTable(tableId, {
                    status: "Ocupada",
                    orderId: savedOrderId,
                });
            }

            dispatch(removeAllItems());
            dispatch(clearDraftContext());

            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["tables"] });
            queryClient.invalidateQueries({ queryKey: ["order", currentOrderId] });
            queryClient.invalidateQueries({ queryKey: ["cash-session"] });

            setLeaveTableModal({
                open: false,
                loading: false,
            });

            enqueueSnackbar("Productos guardados en la mesa.", { variant: "success" });
            navigate(TABLES_ROUTE, { replace: true });
        } catch (e) {
            console.error("[MENU] No pude guardar la mesa:", e?.response?.data || e);

            setLeaveTableModal((prev) => ({
                ...prev,
                loading: false,
            }));

            enqueueSnackbar(
                e?.response?.data?.message || "No se pudieron guardar los productos en la mesa.",
                { variant: "error" }
            );
        }
    };

    const handleDiscardItemsAndLeave = async () => {
        try {
            setLeaveTableModal((prev) => ({
                ...prev,
                loading: true,
            }));

            if (currentOrderId) {
                await updateOrder(currentOrderId, {
                    orderStatus: "Cancelado",
                    submitAction: "discard_table_items",
                });
            }

            if (tableId) {
                await updateTable(tableId, {
                    status: "Disponible",
                    orderId: null,
                });
            }

            dispatch(removeAllItems());
            dispatch(clearDraftContext());

            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["tables"] });
            queryClient.invalidateQueries({ queryKey: ["order", currentOrderId] });
            queryClient.invalidateQueries({ queryKey: ["cash-session"] });

            setLeaveTableModal({
                open: false,
                loading: false,
            });

            enqueueSnackbar("Productos eliminados de la mesa.", { variant: "success" });
            navigate(TABLES_ROUTE, { replace: true });
        } catch (e) {
            console.error("[MENU] No pude borrar los productos de la mesa:", e?.response?.data || e);

            setLeaveTableModal((prev) => ({
                ...prev,
                loading: false,
            }));

            enqueueSnackbar(
                e?.response?.data?.message || "No se pudieron borrar los productos de la mesa.",
                { variant: "error" }
            );
        }
    };

    return (
        <div className="bg-[#1f1f1f] min-h-[100dvh] flex flex-col pb-24">
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row gap-3">
                <div className="flex-1 lg:flex-[3] min-w-0 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-10 py-4 shrink-0">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={handleBackFromMenu}
                                className="h-11 w-11 rounded-xl bg-[#2da8ff] text-white text-2xl font-bold flex items-center justify-center hover:bg-[#4bb6ff] active:scale-95 transition-all shadow-lg shadow-black/20"
                                aria-label="Volver"
                            >
                                ←
                            </button>

                            <h1 className="text-[#f5f5f5] text-2xl font-bold tracking-wider">
                                Menu
                            </h1>
                        </div>

                        <div className="flex items-center justify-around gap-4">
                            <div className="flex items-center gap-3 cursor-pointer">
                                <MdRestaurantMenu className="text-[#f5f5f5] text-4xl" />
                                <div className="flex flex-col items-start">
                                    <h1 className="text-md text-[#f5f5f5] font-semibold tracking-wide">
                                        {displayCustomerName}
                                    </h1>

                                    <p className="text-xs text-[#ababab] font-medium">
                                        Table : {displayTableLabel}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden">
                        <MenuContainer orderId={orderId} />
                    </div>
                </div>

                <aside className="w-full lg:w-[420px] lg:shrink-0 bg-[#1a1a1a] mt-0 lg:mt-4 lg:mr-3 rounded-lg flex flex-col min-h-0 overflow-hidden">
                    {isOrderOpen && (
                        <>
                            <CustomerInfo order={order} />
                            <hr className="border-[#2a2a2a] border-t-2" />

                            <div className="flex-1 min-h-0 overflow-y-auto pb-24">
                                <CartInfo orderId={orderId} />
                                <hr className="border-[#2a2a2a] border-t-2" />
                                <Bill
                                    orderId={orderId}
                                    order={order}
                                    setIsOrderModalOpen={setIsOrderModalOpen}
                                />
                            </div>
                        </>
                    )}
                </aside>
            </div>

            <AnimatePresence>
                {leaveTableModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={closeLeaveTableModal}
                    >
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 16 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#151515] via-[#101010] to-[#070707] shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-white/10">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-[#f6b100]/10 border border-[#f6b100]/30 flex items-center justify-center">
                                        <span className="text-2xl">!</span>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white">
                                            ¿Qué deseas hacer con esta mesa?
                                        </h3>

                                        <p className="mt-2 text-sm leading-6 text-white/60">
                                            Tienes productos agregados. Puedes guardarlos en la mesa para continuar luego o borrarlos antes de salir.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 mb-5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-white/50">Mesa</span>
                                        <span className="font-semibold text-white">
                                            {displayTableLabel ? `Mesa ${displayTableLabel}` : "Mesa seleccionada"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm mt-3">
                                        <span className="text-white/50">Productos</span>
                                        <span className="font-semibold text-white">
                                            {itemsCount}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm mt-3">
                                        <span className="text-white/50">Total actual</span>
                                        <span className="font-semibold text-[#f6b100]">
                                            RD${totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSaveItemsAndLeave}
                                        disabled={leaveTableModal.loading}
                                        className="w-full px-4 py-3 rounded-2xl bg-[#f6b100] text-black font-bold hover:bg-[#ffd633] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {leaveTableModal.loading ? "Procesando..." : "Guardar en la mesa"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDiscardItemsAndLeave}
                                        disabled={leaveTableModal.loading}
                                        className="w-full px-4 py-3 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 font-bold hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Borrar y salir
                                    </button>

                                    <button
                                        type="button"
                                        onClick={closeLeaveTableModal}
                                        disabled={leaveTableModal.loading}
                                        className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-[#1a1a1a] text-white font-semibold hover:bg-[#242424] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <BottomNav />
        </div>
    );
};

export default Menu;