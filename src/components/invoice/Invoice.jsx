// src/components/invoice/Invoice.jsx
import React, { useRef } from "react";
import { motion } from "framer-motion";
import { FaCheck } from "react-icons/fa";
import { useReactToPrint } from "react-to-print";
import { formatDateAndTime } from "../../utils";
import useTenant from "../../hooks/useTenant.js";

const Invoice = ({ order, onClose }) => {
    const { business, fiscal, name } = useTenant();
    const receiptRef = useRef(null);


    // =========================
    //   DATOS DEL NEGOCIO
    // =========================
    // Tomamos la info del negocio desde donde exista:
    const tenantInfo = useTenant();
    const businessName =  tenantInfo?.business?.name || tenantInfo?.name;
    const businessAddress = tenantInfo?.business?.address;
    const businessRnc =
        tenantInfo?.business?.rnc ||
        tenantInfo?.fiscal?.rnc ||
        "";
    const businessPhone = tenantInfo?.business?.phone;

    // (dejamos fiscal preparado por si quieres usar NCF más adelante)
    // const ncfType = fiscal.ncfType ?? fiscal.ncf ?? "";

    // =========================
    //   DATOS DEL CLIENTE / ORDEN
    // =========================
    const clientName = order?.customerName || "Consumidor Final";
    const clientRnc = order?.customerRnc || ""; // si luego decides mostrar el RNC del cliente
    const guests = order?.guests || 0;
    const paymentMethod = order?.paymentMethod || "Cash";

    // Soportar distintos nombres para los items
    const items =
        order?.orderedItems ||
        order?.items ||
        order?.dishes ||
        [];

    const subtotal = Number(order?.subTotal || 0);
    const tax = Number(order?.taxAmount || 0);
    const grandTotal = Number(order?.totalAmount || 0);

    const tip = Number(
        order?.tipAmount ??
        order?.bills?.tipAmount ??
        0
    );

    const taxEnabled = order?.taxEnabled ?? order?.bills?.taxEnabled ?? true;

    const headerGridClass = taxEnabled
        ? "grid grid-cols-[2fr_0.5fr_1fr_1fr]"
        : "grid grid-cols-[2fr_0.5fr_1fr]";

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: "Order Receipt",
    });

    // Animaciones
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    };

    const modalVariants = {
        hidden: { opacity: 0, y: -20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-2 sm:px-4"
            initial="hidden"
            animate="visible"
            variants={backdropVariants}
        >
            <motion.div
                className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
                initial="hidden"
                animate="visible"
                variants={modalVariants}
            >
                {/* CONTENIDO SCROLLEABLE PARA LA IMPRESIÓN */}
                <div ref={receiptRef} className="px-6 pt-6 pb-4 overflow-y-auto">
                    {/* Icono de éxito */}
                    <div className="flex justify-center mb-2">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        >
                            {/*  <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <FaCheck className="text-white" />
                                </motion.span>
                            </div>*/}
                        </motion.div>
                    </div>

                    {/* CABECERA DEL NEGOCIO */}
                    <div className="text-center text-xs text-gray-700 mb-2">
                        <p className="font-semibold text-sm text-gray-900">
                            {businessName}
                        </p>
                        {businessRnc && <p>RNC: {businessRnc}</p>}
                        {businessAddress && <p>{businessAddress}</p>}
                        <p>{businessPhone}</p>
                    </div>

                    <h2 className="text-lg font-bold text-center mb-1">
                        Factura para Consumidor Final
                    </h2>
                    <p className="text-[11px] text-center text-gray-600">
                        Gracias por su compra
                    </p>

                    {/* Datos generales de la orden */}
                    <div className="mt-3 border-t pt-3 text-xs text-gray-800 space-y-1">
                        <p>
                            <span className="font-semibold">Order ID:</span> {order?._id}
                        </p>
                        <p>
                            <span className="font-semibold">Fecha/Hora:</span>{" "}
                            {order?.createdAt
                                ? formatDateAndTime(order.createdAt)
                                : "N/A"}
                        </p>
                        <p>
                            <span className="font-semibold">Cliente:</span> {clientName}
                        </p>
                        {clientRnc && (
                            <p>
                                <span className="font-semibold">RNC Cliente:</span>{" "}
                                {clientRnc}
                            </p>
                        )}
                        {/*<p>
                            <span className="font-semibold">Comensales:</span> {guests}
                        </p>*/}
                    </div>

                    {/* Detalle de consumo */}
                    <div className="mt-4 text-xs">
                        <h3 className="font-semibold mb-2 text-gray-800">
                            Detalle de consumo
                        </h3>

                        {/* Encabezado de columnas */}
                        <div className={`${headerGridClass} gap-x-3 border-b pb-1 mb-1 font-semibold text-[11px] text-gray-700`}>
                            <span>Descripción</span>
                            <span className="text-right">Cant.</span>
                            {taxEnabled && <span className="text-right">ITBIS</span>}
                            <span className="text-right">Valor</span>
                        </div>

                        {/* Filas de items */}
                        <div className="space-y-0.5">
                            {items.length === 0 && (
                                <p className="text-gray-500">No hay items.</p>
                            )}

                            {items.map((item, index) => {
                                const itemName =
                                    item?.dishInfo?.name ||
                                    item?.name ||
                                    item?.dishName ||
                                    "Producto";

                                const qty = item?.quantity || item?.qty || 1;
                                const unitPrice = item?.unitPrice ?? (item?.price / qty) ?? 0;
                                const lineSubtotal = unitPrice * qty;
                                const lineTax = taxEnabled ? Number(item?.tax ?? 0) : 0;
                                const lineTotal = Number(item?.price ?? lineSubtotal) + lineTax;

                                return (
                                    <div
                                        key={index}
                                        className={`${headerGridClass} gap-x-3 text-[11px] text-gray-800`}
                                    >
                                        <span className="truncate" title={itemName}>
                                          {itemName}
                                        </span>
                                                                            <span className="text-right">
                                          {qty}
                                        </span>
                                                                            {taxEnabled && (
                                                                                <span className="text-right">
                                              RD${lineTax.toFixed(2)}
                                            </span>
                                                                            )}
                                                                            <span className="text-right">
                                          RD${unitPrice.toFixed(2)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Totales */}
                    <div className="mt-4 border-t pt-3 text-xs space-y-1 text-gray-800">
                        <p>
                            <span className="font-semibold">Subtotal:</span>{" "}
                            RD${subtotal.toFixed(2)}
                        </p>
                        {/* Descuento */}
                        {order?.discountAmount > 0 && (
                            <p>
                                <span className="font-semibold">Descuento:</span>{" "}
                                -RD${order.discountAmount.toFixed(2)}
                            </p>
                        )}
                        {tip > 0 && (
                            <p>
                                <span className="font-semibold">
                                    Propina ({order?.tipPercent ?? 0}%):
                                </span>{" "}
                                                        RD${tip.toFixed(2)}
                            </p>
                        )}

                        {taxEnabled && tax > 0 && (
                            <p>
                                <span className="font-semibold">ITBIS (18%):</span>{" "}
                                RD${tax.toFixed(2)}
                            </p>
                        )}
                        <p className="font-semibold">
                            Total a pagar: RD${grandTotal.toFixed(2)}
                        </p>
                        <p>
                            <span className="font-semibold">Método de pago:</span>{" "}
                            {paymentMethod}
                        </p>
                    </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex justify-between items-center border-t px-4 py-3 bg-gray-50 text-xs sm:text-sm">
                    <button
                        onClick={handlePrint}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                        Imprimir
                    </button>
                    <button
                        onClick={onClose}
                        className="text-red-500 hover:text-red-600 font-medium"
                    >
                        Cerrar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Invoice;
