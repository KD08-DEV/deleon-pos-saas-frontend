import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useReactToPrint } from "react-to-print";
import useTenant from "../../hooks/useTenant.js";
import { printWithTenantConfig } from "../../lib/tenantPrint";
import usePrinterOptions from "../../hooks/usePrinterOptions";
import {
    formatDateTime,
    getTenantLocalization,
} from "../../lib/localization";

import {
    useTranslation,
} from "react-i18next";

import {
    getBusinessTaxIdentity,
    getCustomerTaxIdentity,
} from "../../lib/taxIdentityDisplay.js";
const safeNum = (value) => {
    if (
        value === null ||
        value === undefined
    ) {
        return 0;
    }

    if (
        typeof value ===
        "number"
    ) {
        return Number.isFinite(
            value
        )
            ? value
            : 0;
    }

    let normalized =
        String(value)
            .trim()
            .replace(/\s/g, "")
            .replace(
                /[^\d,.-]/g,
                ""
            );

    const lastComma =
        normalized.lastIndexOf(",");

    const lastDot =
        normalized.lastIndexOf(".");

    if (
        lastComma >
        lastDot
    ) {
        normalized =
            normalized
                .replace(
                    /\./g,
                    ""
                )
                .replace(
                    ",",
                    "."
                );
    } else {
        normalized =
            normalized.replace(
                /,/g,
                ""
            );
    }

    const number =
        Number(normalized);

    return Number.isFinite(
        number
    )
        ? number
        : 0;
};



const getItemName = (
    it,
    fallback = "Item"
) =>
    it?.name ||
    it?.dishName ||
    it?.title ||
    it?.productName ||
    it?.menuItemName ||
    fallback;

const getQty = (it) => {
    const q = safeNum(
        it?.quantity ??
        it?.qty ??
        1
    );

    return q <= 0
        ? 1
        : q;
};
const getItemExtras = (it) => {
    const extras = [];
    const note = it?.note || it?.comment || it?.specialInstructions || "";
    if (String(note).trim()) extras.push(String(note).trim());

    const addons = it?.addons || it?.addOns || it?.extras || it?.extraIngredients || it?.selectedExtras || null;
    if (Array.isArray(addons)) {
        addons.forEach((a) => {
            const label = a?.name || a?.label || a?.title || String(a);
            if (label && String(label).trim()) extras.push(String(label).trim());
        });
    }

    const modifiers = it?.modifiers || it?.selectedOptions || it?.options || null;
    if (Array.isArray(modifiers)) {
        modifiers.forEach((m) => {
            const label = m?.name || m?.label || m?.title || String(m);
            if (label && String(label).trim()) extras.push(String(label).trim());
        });
    }

    return extras;
};

const Ticket = ({
                    order,
                    onClose,
                    printerCategory = "ticket",
                    title = "",
                    closeAfterPrint = false,
                }) => {

    const {
        t,
    } =
        useTranslation();
    const { tenantInfo } = useTenant();
    const localization =
        getTenantLocalization(
            tenantInfo
        );
    const receiptRef = useRef(null);
    const [isPrintingLogic, setIsPrintingLogic] = useState(false);

    const businessName =
        tenantInfo?.business?.name ||
        tenantInfo?.name ||
        "";

    const businessAddress =
        tenantInfo?.business?.address ||
        "";

    const businessPhone =
        tenantInfo?.business?.phone ||
        "";


    const businessTaxIdentity =
        getBusinessTaxIdentity(
            tenantInfo
        );


    const businessTaxLabel =
        businessTaxIdentity
            ?.label ||
        businessTaxIdentity
            ?.type ||
        "Tax ID";


    const businessTaxValue =
        businessTaxIdentity
            ?.value ||
        "";


    const businessLegacyRnc =
        businessTaxIdentity
            ?.countryCode === "DO"
            ? businessTaxValue
            : "";


// ======================================================
// CLIENTE
// ======================================================

    const rawCustomerName =
        order
            ?.customerDetails
            ?.name ||
        order
            ?.customerName ||
        "";


    const normalizedCustomerName =
        String(
            rawCustomerName
        )
            .trim()
            .toLowerCase();


    const isFinalConsumer =
        !normalizedCustomerName ||
        [
            "consumidor final",
            "final consumer",
        ].includes(
            normalizedCustomerName
        );


    const customerName =
        isFinalConsumer
            ? t(
                "ticket.finalConsumer"
            )
            : rawCustomerName;


    const customerTaxIdentity =
        getCustomerTaxIdentity(
            order
        );


    const customerTaxLabel =
        customerTaxIdentity
            ?.label ||
        customerTaxIdentity
            ?.type ||
        "Tax ID";


    const customerTaxValue =
        customerTaxIdentity
            ?.value ||
        "";

    const createdAt = order?.createdAt || order?.updatedAt || order?.date || null;

    const items = useMemo(() => order?.items || order?.orderedItems || [], [order]);
    const orderNote = String(order?.orderNote || "").trim();

    const bills = order?.bills || {};
    const subtotal = safeNum(order?.subTotal ?? bills?.subtotal ?? 0);
    const discount = safeNum(order?.discountAmount ?? bills?.discount ?? 0);
    const tax = safeNum(order?.taxAmount ?? bills?.tax ?? 0);
    const tip = safeNum(order?.tipAmount ?? bills?.tip ?? 0);
    const total = safeNum(order?.totalAmount ?? bills?.totalWithTax ?? bills?.total ?? 0);

    const operation =
        order?.facturaNo ||
        order?.invoiceNumber ||
        order?.invoiceNo ||
        order?.fiscal?.internalNumber ||
        order?.fiscal?.internalSeq ||
        order?.internalNumber ||
        order?.operationNumber ||
        order?.operationNo ||
        order?.operation ||
        order?.orderNumber ||
        (() => {
            // fallback solo si el backend todavía no devolvió número
            const n = Date.now() % 1000000000;
            return String(n).padStart(9, "0");
        })();

    const tableObj = order?.table && typeof order.table === "object" ? order.table : null;

    const tableLabel =
        order?.tableName ||
        order?.table?.name ||
        (tableObj?.tableNo ? `${t("ticket.table")} ${tableObj.tableNo}` : "") ||
        (typeof order?.table === "string" ? order.table : "") ||
        "N/A";

    const roomLabel =
        order?.roomName ||
        order?.sala ||
        order?.area ||
        order?.section ||
        tableObj?.area ||
        "N/A";

    const waiter =
        order?.waiterName ||
        order?.serverName ||
        order?.mesero ||
        order?.waiter?.name ||
        "N/A";


    const paymentMethod = order?.paymentMethod || "Efectivo";

    const {
        printers: primaryPrinters,
        defaultPrinter: primaryDefaultPrinter,
        isLoadingPrinters: isLoadingPrimaryPrinters,
    } = usePrinterOptions(printerCategory);

    const {
        printers: kitchenPrinters,
        defaultPrinter: kitchenDefaultPrinter,
        isLoadingPrinters: isLoadingKitchenPrinters,
    } = usePrinterOptions("kitchen");

    const resolvedPrinters = useMemo(() => {
        if (Array.isArray(primaryPrinters) && primaryPrinters.length > 0) {
            return primaryPrinters;
        }
        return Array.isArray(kitchenPrinters) ? kitchenPrinters : [];
    }, [primaryPrinters, kitchenPrinters]);

    const resolvedDefaultPrinter = useMemo(() => {
        return primaryDefaultPrinter || kitchenDefaultPrinter || null;
    }, [primaryDefaultPrinter, kitchenDefaultPrinter]);

    const isLoadingPrinters = isLoadingPrimaryPrinters || isLoadingKitchenPrinters;

    const [selectedPrinterId, setSelectedPrinterId] = useState("");

    useEffect(() => {
        if (!selectedPrinterId && resolvedDefaultPrinter?._id) {
            setSelectedPrinterId(resolvedDefaultPrinter._id);
        }
    }, [resolvedDefaultPrinter, selectedPrinterId]);

    const selectedPrinter = useMemo(
        () =>
            resolvedPrinters.find((p) => p._id === selectedPrinterId) ||
            resolvedDefaultPrinter ||
            null,
        [resolvedPrinters, selectedPrinterId, resolvedDefaultPrinter]
    );
    const printingConfig = {
        enabled: true,
        mode: selectedPrinter?.mode || "browser",
    };

    const [printMessage, setPrintMessage] = useState("");

    const browserPrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Ticket-${operation}`,
    });

    const handleBrowserPrint =
        async () => {

            setPrintMessage(
                t(
                    "ticket.openingPrintDialog"
                )
            );


            await browserPrint?.();


            /*
             * Solo se activa cuando Ticket fue abierto
             * desde Invoice.
             */
            if (
                closeAfterPrint
            ) {
                onClose?.();
            }
        };
    const handleLogicPrint = async () => {
        if (isPrintingLogic) return;

        try {
            setIsPrintingLogic(true);
            setPrintMessage(
                t(
                    "ticket.sendingToPrinter"
                )
            );

            console.log("[PRINT][ticket] selectedPrinter =", selectedPrinter);

            const payload = {
                businessName,
                rnc:
                businessLegacyRnc,

                businessTaxIdentity,

                labels: {
                    business:
                        t(
                            "ticket.business"
                        ),

                    order:
                        t(
                            "ticket.operation"
                        ),

                    table:
                        t(
                            "ticket.table"
                        ),

                    waiter:
                        t(
                            "ticket.waiter"
                        ),

                    date:
                        t(
                            "ticket.date"
                        ),

                    area:
                        t(
                            "ticket.roomArea"
                        ),

                    note:
                        t(
                            "ticket.note"
                        ),

                    subtotal:
                        t(
                            "ticket.subtotal"
                        ),

                    discount:
                        t(
                            "ticket.discount"
                        ),

                    tax:
                        t(
                            "ticket.tax"
                        ),

                    charge:
                        t(
                            "ticket.charge"
                        ),

                    serviceCharge:
                        t(
                            "ticket.serviceCharge"
                        ),

                    manualTip:
                        t(
                            "ticket.manualTip"
                        ),

                    total:
                        t(
                            "ticket.total"
                        ),

                    payment:
                        t(
                            "ticket.payment"
                        ),

                    thankYou:
                        t(
                            "ticket.thankYou"
                        ),

                    item:
                        t(
                            "ticket.item"
                        ),

                    includedShort:
                        t(
                            "ticket.includedShort"
                        ),
                },
                businessTaxIdLabel:
                businessTaxLabel,

                businessTaxIdValue:
                businessTaxValue,

                clientName:
                customerName,

                clientTaxIdentity,

                clientTaxIdLabel:
                customerTaxLabel,

                clientTaxIdValue:
                customerTaxValue,
                address: businessAddress,
                phone: businessPhone,
                title:
                    title ||
                    t(
                        "ticket.title"
                    ),
                orderId: String(operation),
                mesa: tableLabel,
                mesero: String(waiter),
                fecha:
                    formatDateTime(
                        createdAt,
                        localization
                    ),

                localization,

                locale:
                localization.locale,

                currency:
                localization.currency,

                salaArea: roomLabel,
                orderNote,
                showTotals: false,
                showItemPrices: false,
                items: (items || []).map(
                    (it) => ({
                        name:
                            getItemName(
                                it,
                                t("ticket.item")
                            ),

                        qty:
                            getQty(it),

                        qtyType:
                            it?.qtyType ||
                            "unit",

                        weightUnit:
                            it?.qtyType ===
                            "weight"
                                ? (
                                    it?.weightUnit ||
                                    localization.weightUnit
                                )
                                : "",

                        modifiers:
                            getItemExtras(it).map(
                                (label) => ({
                                    name:
                                    label,
                                })
                            ),
                    })
                ),
                subtotal: undefined,
                tax: undefined,
                total: undefined,
                paymentMethod: "",
            };

            const result = await printWithTenantConfig({
                config: printingConfig,
                type: "ticket",
                printer: selectedPrinter,
                fallbackPrint: browserPrint,
                payload,
            });

            setPrintMessage(
                result?.message ||
                t(
                    "ticket.sentSuccessfully"
                )
            );
            if (
                closeAfterPrint
            ) {
                onClose?.();
            }
        } catch (err) {
            console.error("[PRINT][ticket] logic print error:", err);
            setPrintMessage(
                err?.response?.data?.message ||
                err?.message ||
                t(
                    "ticket.printFailed"
                )
            );
        } finally {
            setIsPrintingLogic(false);
        }
    };

    return (
        <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-2 sm:px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <motion.div
                className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="px-4 pt-4 pb-3 overflow-y-auto">
                    <style>
                        {`
                      .ticket-root {
                        width: 80mm;
                        max-width: 100%;
                        margin: 0 auto;
                        padding: 8mm 5mm;
                        background: #ffffff !important;
                        color: #111827 !important;
                      }
                
                      .ticket-root *:not(.ticket-qty-badge) {
                        color: #111827 !important;
                      }
                
                      .ticket-root .ticket-muted {
                        color: #4b5563 !important;
                      }
                
                      .ticket-root .ticket-qty-badge {
                        background: #111827 !important;
                        color: #ffffff !important;
                      }
                
                      .ticket-divider {
                        border-top: 1px dashed #111827;
                        margin: 8px 0;
                      }
                
                      @media print {
                        @page { size: 80mm auto; margin: 0mm; }
                
                        body {
                          -webkit-print-color-adjust: exact;
                          print-color-adjust: exact;
                          background: #ffffff !important;
                          color: #111827 !important;
                        }
                
                        .no-print {
                          display: none !important;
                        }
                
                        .ticket-root {
                          width: 80mm;
                          margin: 0 auto;
                          padding: 8mm 5mm;
                        }
                      }
                    `}
                </style>

                    <div ref={receiptRef} className="ticket-root text-black bg-white">
                        <div className="text-center">
                            <div className="text-lg font-extrabold">{businessName}</div>

                            {businessTaxValue ? (
                                <div className="text-xs">
                                    {businessTaxLabel}: {businessTaxValue}
                                </div>
                            ) : null}

                            {businessAddress ? (
                                <div className="text-xs">{businessAddress}</div>
                            ) : null}

                            {businessPhone ? (
                                <div className="text-xs">
                                    {t("ticket.phoneShort")}: {businessPhone}
                                </div>
                            ) : null}
                        </div>

                        <div className="ticket-divider" />

                        <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                                <span>{t("ticket.operation")}:</span>
                                <span className="font-semibold">{String(operation)}</span>
                            </div>

                            {customerName && !isFinalConsumer ? (
                                <div className="flex justify-between gap-4">
                                    <span>{t("ticket.customer")}:</span>
                                    <span className="font-semibold text-right">
                                        {customerName}
                                    </span>
                                </div>
                            ) : null}

                            {customerTaxValue ? (
                                <div className="flex justify-between gap-4">
                                    <span>{customerTaxLabel}:</span>
                                    <span className="font-semibold text-right">
                                        {customerTaxValue}
                                    </span>
                                </div>
                            ) : null}

                            <div className="flex justify-between">
                                <span>{t("ticket.table")}:</span>
                                <span className="font-semibold">{tableLabel}</span>
                            </div>

                            <div className="flex justify-between">
                                <span>{t("ticket.date")}:</span>
                                <span className="font-semibold">
                                    {formatDateTime(createdAt, localization)}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span>{t("ticket.waiter")}:</span>
                                <span className="font-semibold">{String(waiter)}</span>
                            </div>

                            <div className="flex justify-between">
                                <span>{t("ticket.roomArea")}:</span>
                                <span className="font-semibold">{roomLabel}</span>
                            </div>
                        </div>

                        <div className="ticket-divider" />

                        <div className="text-xs">
                            {items?.length ? (
                                <div className="space-y-2">
                                    {items.map((it, idx) => {
                                        const qty = getQty(it);
                                        const name = getItemName(
                                            it,
                                            t("ticket.item")
                                        );
                                        const extras = getItemExtras(it);
                                        const qtyLabel =
                                            it?.qtyType === "weight"
                                                ? `${qty} ${
                                                    it?.weightUnit ||
                                                    localization.weightUnit
                                                }`
                                                : `x${qty}`;

                                        return (
                                            <div
                                                key={`${idx}-${name}`}
                                                className="px-1 py-1"
                                            >
                                                <div className="flex items-start gap-2">

                                                    <div className="ticket-qty-badge min-w-[30px] rounded px-2 py-1 text-center text-[13px] font-extrabold leading-none">
                                                        {qtyLabel}
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="text-[14px] font-extrabold leading-snug uppercase">
                                                            {name}
                                                        </div>

                                                        {extras?.length ? (
                                                            <div className="mt-1 pl-1">
                                                                {extras.slice(0, 6).map((ex, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="text-[11px] text-gray-700 leading-snug"
                                                                    >
                                                                        • {ex}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500">
                                    {t(
                                        "ticket.noItems"
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="ticket-divider" />
                        {orderNote ? (
                            <>
                                <div className="mt-4 mb-4 px-1 py-1">
                                    <div className="text-[13px] font-extrabold uppercase">
                                        {t(
                                            "ticket.orderNote"
                                        )}
                                    </div>

                                    <div className="mt-2 pl-2 text-[14px] font-semibold whitespace-pre-wrap break-words leading-snug">
                                        {orderNote}
                                    </div>
                                </div>

                                <div className="ticket-divider my-3" />
                            </>
                        ) : null}



                        <div className="ticket-divider" />
                        <div className="text-center text-xs font-bold">
                            {t(
                                "ticket.endOrder"
                            )}
                        </div>

                        <div className="ticket-muted text-center text-[11px]">
                            {t(
                                "ticket.thankYou"
                            )}
                        </div>
                    </div>
                </div>
                <div className="no-print border-t pt-3 px-4 pb-2 bg-white">
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-700">{t(
                            "ticket.printer"
                        )}</div>

                        <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                            value={selectedPrinterId}
                            onChange={(e) => setSelectedPrinterId(e.target.value)}
                            disabled={isLoadingPrinters || resolvedPrinters.length === 0}
                        >
                            {resolvedPrinters.length === 0 ? (
                                <option value="">{t(
                                    "ticket.noPrinters"
                                )}</option>
                            ) : (
                                resolvedPrinters.map((p) => (
                                    <option key={p._id} value={p._id}>
                                        {p.alias} {p.isDefault ? `• ${t("ticket.default")}` : ""}
                                    </option>
                                ))
                            )}
                        </select>

                        {selectedPrinter ? (
                            <div className="text-[11px] text-gray-500">
                                {t(
                                    "ticket.mode"
                                )}: {selectedPrinter.mode}

                                {" · "}

                                {t(
                                    "ticket.paper"
                                )}: {selectedPrinter.paperSize}
                                {selectedPrinter.ip ? ` · ${selectedPrinter.ip}:${selectedPrinter.port}` : ""}
                            </div>
                        ) : (
                            <div className="text-[11px] text-gray-400">
                                {t(
                                    "ticket.browserPrinterHelp"
                                )}
                            </div>
                        )}
                        {printMessage && (
                            <div className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-2 py-2">
                                {printMessage}
                            </div>
                        )}
                        {printerCategory !== "kitchen" && primaryPrinters.length === 0 && kitchenPrinters.length > 0 && (
                            <div className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-2">
                                {t(
                                    "ticket.fallbackKitchenPrinter",
                                    {
                                        category:
                                        printerCategory,
                                    }
                                )}
                            </div>
                        )}

                    </div>
                </div>

                <div className="no-print flex items-center justify-between gap-3 border-t px-4 py-3 bg-white">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleBrowserPrint}
                            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-100"
                        >
                            {t(
                                "ticket.otherPrinters"
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleLogicPrint}
                            disabled={isPrintingLogic}
                            className={`px-4 py-2 rounded-md text-white font-semibold ${
                                isPrintingLogic
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-[#111111] hover:bg-[#2b2b2b]"
                            }`}
                        >
                            {isPrintingLogic
                                ? t(
                                    "ticket.printing"
                                )
                                : t(
                                    "ticket.networkPrinter"
                                )
                            }
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-md text-red-600 font-semibold hover:bg-red-50"
                    >
                        {t(
                            "ticket.close"
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Ticket;