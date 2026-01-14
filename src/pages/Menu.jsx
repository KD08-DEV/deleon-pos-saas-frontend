import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomNav from "../components/shared/BottomNav";
import BackButton from "../components/shared/BackButton";
import { MdRestaurantMenu } from "react-icons/md";
import MenuContainer from "../components/menu/MenuContainer";
import CustomerInfo from "../components/menu/CustomerInfo";
import CartInfo from "../components/menu/CartInfo";
import Bill from "../components/menu/Bill";
import { useQuery } from "@tanstack/react-query";
import { getOrderById } from "@https";
import { setCart, removeAllItems } from "../redux/slices/cartSlice";
import { useDispatch, useSelector } from "react-redux";
import { deleteOrder } from "../https/index";

const Menu = () => {
    const [isOrderOpen, setIsOrderModalOpen] = useState(true);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get("orderId");
    const dispatch = useDispatch();

    const { data: orderRes } = useQuery({
        queryKey: ["order", orderId],
        queryFn: () => getOrderById(orderId),
        enabled: !!orderId,
    });

    const order = orderRes?.data?.data;

    useEffect(() => {
        document.title = "POS | Menu";
    }, []);

    useEffect(() => {
        if (!isOrderOpen) navigate("/tables");
    }, [isOrderOpen, navigate]);

    // --- Hidratar carrito desde la orden ---
    useEffect(() => {
        dispatch(removeAllItems());

        const items = order?.items || [];
        if (items.length > 0) {
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

                // unitPrice o pricePerLb según aplique
                const unitPrice = Number(
                    it.unitPrice ??
                    it.pricePerQuantity ??
                    it.pricePerLb ??
                    it?.dish?.pricePerLb ??
                    it?.dish?.price ??
                    it.price ??
                    0
                );

                return {
                    id: dishId,
                    dishId,
                    name,
                    qtyType,
                    weightUnit,
                    quantity,
                    price: unitPrice,
                };
            });

            dispatch(setCart(mapped));
        }
    }, [orderId, order, dispatch]);


    // --- Lógica mejorada para borrar orden vacía ---
    const cart = useSelector((state) => state.cart);
    const cartLenRef = useRef(0);
    useEffect(() => {
        cartLenRef.current = Array.isArray(cart?.items)
            ? cart.items.length
            : Array.isArray(cart)
                ? cart.length
                : 0;
    }, [cart]);

    const orderItemsLenRef = useRef(0);
    useEffect(() => {
        orderItemsLenRef.current = Array.isArray(order?.items)
            ? order.items.length
            : 0;
    }, [order]);

    const strictGuardRef = useRef(false);
    const orderFinalizedRef = useRef(false);
    const handleOrderFinalized = () => {
        orderFinalizedRef.current = true;
    };

    useEffect(() => {
        return () => {
            // 🧠 No ejecutar si la orden ya fue finalizada
            if (orderFinalizedRef.current) return;

            // 🚫 Ignorar el primer desmontaje fantasma (React Strict Mode)
            if (!strictGuardRef.current) {
                strictGuardRef.current = true;
                return;
            }

            if (!orderId) return;

            const hasCart = cartLenRef.current > 0;
            const hasOrderItems = orderItemsLenRef.current > 0;

            // 🚨 Si no hay items ni en carrito ni en la orden -> eliminar orden
            if (!hasCart && !hasOrderItems) {
                deleteOrder(orderId)
                    .then(() =>
                        console.log(`🗑️ Orden ${orderId} eliminada por estar vacía`)
                    )
                    .catch((err) => {
                        if (err?.response?.status === 404) {
                            console.warn("⚠️ Orden ya eliminada anteriormente.");
                        } else {
                            console.error("Error al eliminar orden vacía:", err);
                        }
                    });
            }

            dispatch(removeAllItems());
        };
    }, [orderId, dispatch]);

    // --- Fin de cambios ---

    if (!orderId) {
        navigate("/tables");
        return null;
    }


    return (
        <div className="bg-[#1f1f1f] min-h-[100dvh] flex flex-col">
            {/* CONTENT */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row gap-3">
                {/* LEFT */}
                <div className="flex-1 lg:flex-[3] min-w-0 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-10 py-4 shrink-0">
                        <div className="flex items-center gap-4">
                            <BackButton />
                            <h1 className="text-[#f5f5f5] text-2xl font-bold tracking-wider">Menu</h1>
                        </div>

                        <div className="flex items-center justify-around gap-4">
                            <div className="flex items-center gap-3 cursor-pointer">
                                <MdRestaurantMenu className="text-[#f5f5f5] text-4xl" />
                                <div className="flex flex-col items-start">
                                    <h1 className="text-md text-[#f5f5f5] font-semibold tracking-wide">
                                        {order?.customerDetails?.name || "Customer Name"}
                                    </h1>
                                    <p className="text-xs text-[#ababab] font-medium">
                                        Table : {order?.table?.tableNo || "N/A"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Menu scroll area */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <MenuContainer orderId={orderId} />
                    </div>
                </div>

                {/* RIGHT */}
                <aside className="w-full lg:w-[420px] lg:shrink-0 bg-[#1a1a1a] mt-0 lg:mt-4 lg:mr-3 rounded-lg flex flex-col min-h-0 overflow-hidden">
                    {isOrderOpen && (
                        <>
                            <CustomerInfo order={order} />
                            <hr className="border-[#2a2a2a] border-t-2" />

                            {/* Right panel scroll */}
                            <div className="flex-1 min-h-0 overflow-y-auto pb-24">
                                <CartInfo orderId={orderId} />
                                <hr className="border-[#2a2a2a] border-t-2" />
                                <Bill orderId={orderId} setIsOrderModalOpen={setIsOrderModalOpen} />
                            </div>
                        </>
                    )}
                </aside>
            </div>

            {/* BottomNav (NO fixed) */}
            <BottomNav />
        </div>
    );

};

export default Menu;
