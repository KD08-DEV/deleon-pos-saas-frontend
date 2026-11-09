import {serviceCharges,manualTip} from "../../lib/reportChargeAmounts";
// src/pages/admin/SalesReports.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download, Calendar, TrendingUp, DollarSign, ShoppingCart, CreditCard } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/api";
import useTenant from "../../hooks/useTenant";

import {
    formatDate,
    formatTime,
    formatMoney,
    getTenantLocalization,
    getTodayYMD,
    formatWeekday,
} from "../../lib/localization";

const normalizePaymentMethodLabel = (value, t) => {
    const raw = String(value || "").trim();
    const key = raw.toLowerCase();

    if (!key) return t("salesReportsPage.paymentMethods.cash");

    if (["efectivo", "cash"].includes(key)) {
        return t("salesReportsPage.paymentMethods.cash");
    }

    if (["tarjeta", "card", "credit_card", "debit_card"].includes(key)) {
        return t("salesReportsPage.paymentMethods.card");
    }

    if (["transferencia", "transfer", "bank_transfer"].includes(key)) {
        return t("salesReportsPage.paymentMethods.transfer");
    }

    if (["credito", "crédito", "credit"].includes(key)) {
        return t("salesReportsPage.paymentMethods.credit");
    }

    if (["otros", "otro", "other"].includes(key)) {
        return t("salesReportsPage.paymentMethods.other");
    }

    return raw || t("salesReportsPage.common.unknown");
};

const getEffectivePaymentMethodLabel = (order = {}, t) =>
    normalizePaymentMethodLabel(
        order?.paymentMethod ||
        order?.paymentMethodType ||
        order?.paymentMethodReal ||
        order?.deliveryPaymentMethod ||
        order?.payment?.method ||
        order?.paidWith ||
        "Otros",
        t
    );


const SalesReports = () => {
    const { t, i18n } = useTranslation();

    const getLocalYMD =
        () =>
            getTodayYMD(
                localization
            );
    const { tenantInfo } =
        useTenant();

    const localization =
        getTenantLocalization(
            tenantInfo
        );

    const currency = (value) =>
        formatMoney(
            value,
            localization
        );
    const configuredTaxes =
        Array.isArray(
            tenantInfo
                ?.taxConfig
                ?.taxes
        )
            ? tenantInfo
                .taxConfig
                .taxes
            : [];

    const activeTaxes =
        configuredTaxes.filter(
            (tax) =>
                tax?.active !==
                false
        );

    const configuredCharges =
        Array.isArray(
            tenantInfo
                ?.features
                ?.serviceCharges
                ?.charges
        )
            ? tenantInfo
                .features
                .serviceCharges
                .charges
            : [];

    const activeCharges =
        configuredCharges.filter(
            (charge) =>
                charge?.active !==
                false &&
                charge?.addToTotal !==
                false
        );

    const taxReportLabel =
        activeTaxes.length === 1
            ? String(
                activeTaxes[0]
                    ?.name ||
                activeTaxes[0]
                    ?.code ||
                t("salesReportsPage.summary.taxes")
            )
            : t("salesReportsPage.summary.taxes");

    const serviceChargeReportLabel =
        activeCharges.length === 1
            ? String(
                activeCharges[0]
                    ?.name ||
                activeCharges[0]
                    ?.code ||
                t("salesReportsPage.summary.serviceCharge")
            )
            : t("salesReportsPage.summary.serviceCharges");

    const [filters, setFilters] = useState({
        from: getLocalYMD(),
        to: getLocalYMD(),
        method: "",
    });
    const [tab, setTab] = useState("category");

    const [recentPage, setRecentPage] = useState(1);
    const recentPageSize = 10;


    useEffect(() => {
        setRecentPage(1);
    }, [filters.from, filters.to, filters.method]); // ajusta a tus filtros reales
    const [toast, setToast] = useState({ open: false, message: "", type: "error" });
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);

    useEffect(() => setPage(1), [tab, filters.from, filters.to, filters.method, pageSize]);

    const showToast = (message, type = "error") => {
        setToast({ open: true, message, type });
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3500);
    };

    const hasCostForRow = (r) => {
        const unitCost = Number(r?.unitCost ?? 0);
        const costTotal = Number(r?.costTotal ?? 0);
        // regla: costo “válido” cuando unitCost > 0 y costTotal > 0
        return unitCost > 0 && costTotal > 0;
    };

    const safeNumber = (v) => {
        if (typeof v === "string") {
            const cleaned = v.replace(/[^\d.-]/g, "");
            const n = Number(cleaned);
            return Number.isFinite(n) ? n : 0;
        }

        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };
    const getBillTax = (bill = {}) =>
        safeNumber(
            bill?.tax ??
            bill?.itbis ??
            bill?.itbisTotal ??
            bill?.totalTax ??
            0
        );

    const getBillTip=serviceCharges;
    const getRowTipTotal=row=>safeNumber(row?.tipTotal??row?.serviceChargeTotal??0);
    const cleanedParams = useMemo(() => {
        const obj = { ...filters };


        // Si solo selecciona "desde", asumimos "hasta" = mismo día
        // Si solo selecciona "hasta", asumimos "desde" = mismo día
        let fromYMD = obj.from || obj.to || "";
        let toYMD = obj.to || obj.from || "";

        // Evita rango invertido (to < from)
        if (fromYMD && toYMD && toYMD < fromYMD) {
            const tmp = fromYMD;
            fromYMD = toYMD;
            toYMD = tmp;
        }

        if (fromYMD) obj.from = fromYMD;
        if (toYMD) obj.to = toYMD; // fin exclusivo (día siguiente 00:00)

        Object.keys(obj).forEach((k) => {
            if (obj[k] === "" || obj[k] == null) delete obj[k];
        });

        return obj;
    }, [filters]);



    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["admin/reports", cleanedParams],
        queryFn: async () => {
            const res = await api.get("/api/admin/reports", { params: cleanedParams });
            return res.data;
        },
        keepPreviousData: true,
        staleTime: 30_000,
    });
    const productReportQuery = useQuery({
        queryKey: ["sales-by-product-report", filters.from, filters.to, filters.method],
        queryFn: async () => {
            // En tu UI, filters.from / filters.to están en formato YYYY-MM-DD
            // El backend los parsea bien con new Date(...)
            return fetchProductDetail({
                from: filters.from,
                to: filters.to,
                paymentMethod: filters.method || undefined,
            });
        },
        enabled: true,
        keepPreviousData: true,
        staleTime: 30_000,

    });
    useEffect(() => {
        if (productReportQuery.data?.rows?.length) {
            console.log("[sales-by-product][first-row]", productReportQuery.data.rows[0]);
        }
    }, [productReportQuery.data, t, i18n.language]);

    const detailRows = useMemo(() => {
        return (productReportQuery.data?.rows || []).map((r) => {
            const resolvedCategory =
                r?.categoryName ||
                r?.menuCategory ||
                r?.inventoryCategoryName ||
                r?.dishCategory ||
                r?.dish?.category ||
                r?.productCategory ||
                r?.category ||
                "";

            const resolvedPresentation =
                r?.presentationName ||
                r?.presentation ||
                r?.variant ||
                r?.size ||
                t("salesReportsPage.common.regular");

            const resolvedProduct =
                r?.product ||
                r?.productName ||
                r?.dishName ||
                r?.itemName ||
                r?.name ||
                t("salesReportsPage.common.product");

            const resolvedPaymentMethod = normalizePaymentMethodLabel(
                r?.paymentMethod ||
                r?.method ||
                t("salesReportsPage.common.unknown"),
                t
            );

            return {
                ...r,
                category: String(resolvedCategory || "").trim() || t("salesReportsPage.common.noCategory"),
                presentation: String(resolvedPresentation || "").trim() || t("salesReportsPage.common.regular"),
                product: String(resolvedProduct || "").trim() || t("salesReportsPage.common.product"),
                paymentMethod: resolvedPaymentMethod,
                qty: safeNumber(r?.qty ?? r?.quantity ?? 0),
                revenue: safeNumber(
                    r?.grossRevenue ??
                    r?.totalWithTax ??
                    r?.revenue ??
                    r?.sales ??
                    r?.total ??
                    0
                ),
                subtotalRevenue: safeNumber(r?.revenue ?? 0),
                unitCost: safeNumber(r?.unitCost ?? r?.costUnit ?? 0),
                costTotal: safeNumber(r?.costTotal ?? r?.totalCost ?? 0),
                taxTotal: safeNumber(r?.taxTotal ?? r?.tax ?? r?.itbis ?? 0),
                tipTotal: getRowTipTotal(r),
                manualTipTotal:safeNumber(r.manualTipTotal),
                orderCount: safeNumber(r?.orderCount ?? r?.count ?? 0),
            };
        });
    }, [productReportQuery.data]);

    const reportRows = useMemo(() => {
        if (tab === "category") return groupByCategory(detailRows);
        if (tab === "payment") return groupByPaymentMethod(detailRows);
        return detailRows; // "product"
    }, [tab, detailRows]);

    const orders = data?.data || [];
    const dailySummary = data?.dailySummary || {};

    // Análisis de ventas
    const salesAnalysis = useMemo(() => {
        const totalSales = orders.reduce((sum, o) => sum + safeNumber(o.bills?.totalWithTax), 0);
        const totalTax = orders.reduce((sum, o) => sum + getBillTax(o.bills), 0);
        const totalTip = orders.reduce((sum, o) => sum + getBillTip(o.bills), 0);
        const totalOrders = orders.length;
        const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

        const byMethod = {};
        orders.forEach((o) => {
            const method = getEffectivePaymentMethodLabel(o, t);


            if (!byMethod[method]) {
                byMethod[method] = { total: 0, count: 0 };
            }

            byMethod[method].total += Number(o.bills?.totalWithTax) || 0;
            byMethod[method].count += 1;
        });

        const bySource = {};
        orders.forEach((o) => {
            const source = o.orderSource || "DINE_IN";
            if (!bySource[source]) {
                bySource[source] = { total: 0, count: 0 };
            }
            bySource[source].total += Number(o.bills?.totalWithTax) || 0;
            bySource[source].count += 1;
        });

        // Agrupar por día de la semana
        const byDayOfWeek = {};
        orders.forEach((o) => {
            const dayName =
                formatWeekday(
                    o.createdAt,
                    localization
                );
            if (!byDayOfWeek[dayName]) {
                byDayOfWeek[dayName] = { total: 0, count: 0 };
            }
            byDayOfWeek[dayName].total += Number(o.bills?.totalWithTax) || 0;
            byDayOfWeek[dayName].count += 1;
        });

        return {
            totalSales,
            totalTax,
            totalTip,
            totalOrders,
            avgTicket: Number(avgTicket.toFixed(2)),
            byMethod,
            bySource,
            byDayOfWeek,
        };
    }, [
        orders,
        localization.locale,
        localization.timezone,
        t,
        i18n.language,
    ]);
    const paymentCards = useMemo(() => {
        const baseMethods = [
            t("salesReportsPage.paymentMethods.cash"),
            t("salesReportsPage.paymentMethods.card"),
            t("salesReportsPage.paymentMethods.transfer"),
            t("salesReportsPage.paymentMethods.other"),
        ];

        const extraMethods = Object.keys(salesAnalysis.byMethod || {}).filter(
            (method) => !baseMethods.includes(method)
        );

        return [...baseMethods, ...extraMethods].map((method) => [
            method,
            salesAnalysis.byMethod?.[method] || { total: 0, count: 0 },
        ]);
    }, [salesAnalysis.byMethod, t, i18n.language]);
    const cashSessionRangeQuery = useQuery({
        queryKey: ["cash-session-range-for-sales-report", filters.from, filters.to],
        queryFn: async () => {
            const from = filters.from || getLocalYMD();
            const to = filters.to || from;

            const res = await api.get("/api/admin/cash-session/range", {
                params: { from, to },
            });

            return res.data?.data || {};
        },
        enabled: !!(filters.from || filters.to),
        keepPreviousData: true,
        staleTime: 30_000,
    });

    const closureReportTotals = useMemo(() => {
        const sessions = cashSessionRangeQuery.data?.sessions || [];

        return sessions.reduce(
            (acc, session) => {
                const closing = session?.closing || {};

                let ticketTotal = safeNumber(closing.ticketTotal);

                if (!ticketTotal && Array.isArray(closing.breakdown)) {
                    ticketTotal = closing.breakdown
                        .filter((item) => String(item?.kind || "").toLowerCase() === "ticket")
                        .reduce(
                            (sum, item) =>
                                sum + safeNumber(item?.value) * safeNumber(item?.count),
                            0
                        );
                }

                acc.ticketTotal += ticketTotal;
                acc.transferCountedTotal += safeNumber(closing.transferCountedTotal);
                acc.otherCountedTotal += safeNumber(closing.otherCountedTotal);
                acc.totalDeclaredAtClose += safeNumber(closing.totalDeclaredAtClose);

                return acc;
            },
            {
                ticketTotal: 0,
                transferCountedTotal: 0,
                otherCountedTotal: 0,
                totalDeclaredAtClose: 0,
            }
        );
    }, [cashSessionRangeQuery.data]);
    const hasClosureReportData = useMemo(() => {
        return (
            safeNumber(closureReportTotals.ticketTotal) > 0 ||
            safeNumber(closureReportTotals.transferCountedTotal) > 0 ||
            safeNumber(closureReportTotals.otherCountedTotal) > 0 ||
            safeNumber(closureReportTotals.totalDeclaredAtClose) > 0
        );
    }, [closureReportTotals]);
    async function fetchProductDetail({ from, to, paymentMethod }) {
        const params = new URLSearchParams();
        params.append("from", from);
        params.append("to", to);
        if (paymentMethod) params.append("paymentMethod", paymentMethod);

        // ✅ OJO: tu backend está bajo /api
        const res = await api.get(`/api/order/report/sales-by-product?${params.toString()}`);
        return {rows:res.data?.data||[],meta:res.data?.meta||{}};
    }
    function groupByCategory(detailRows) {
        const map = new Map();

        for (const r of detailRows) {
            const key = (r?.category || t("salesReportsPage.common.noCategory")).trim();
            const revenue = safeNumber(r?.revenue);
            const qty = safeNumber(r?.qty);
            const taxTotal = safeNumber(r?.taxTotal);
            const tipTotal = safeNumber(r?.tipTotal);

            const hasCost = hasCostForRow(r);
            const costTotal = safeNumber(r?.costTotal);

            const prev = map.get(key) || {
                category: key,
                qty: 0,
                revenue: 0,
                taxTotal: 0,
                tipTotal: 0,
                manualTipTotal:0,
                // solo si costo existe para TODOS
                costTotal: 0,
                profit: 0,
                costPct: null,
                profitPct: null,

                // tracking
                anyCost: false,
                allCost: true,
            };

            prev.qty += qty;
            prev.revenue += revenue;
            prev.taxTotal += taxTotal;
            prev.tipTotal += tipTotal;
            prev.manualTipTotal += safeNumber(r.manualTipTotal);

            if (hasCost) {
                prev.anyCost = true;
                prev.costTotal += costTotal;
                prev.profit += (revenue - costTotal);
            } else {
                prev.allCost = false;
            }

            map.set(key, prev);
        }

        return Array.from(map.values()).map((x) => {
            // si ninguno tiene costo => N/A
            if (!x.anyCost) {
                x.costTotal = null;
                x.profit = null;
                x.costPct = null;
                x.profitPct = null;
                return x;
            }

            // si mezcla (unos con costo y otros sin costo) => N/A (evita números falsos)
            if (!x.allCost) {
                x.costTotal = null;
                x.profit = null;
                x.costPct = null;
                x.profitPct = null;
                return x;
            }

            // todos con costo => calcula %
            x.costPct = x.revenue > 0 ? (x.costTotal / x.revenue) * 100 : 0;
            x.profitPct = x.revenue > 0 ? (x.profit / x.revenue) * 100 : 0;
            return x;
        });
    }
    function groupByPaymentMethod(detailRows) {
        const map = new Map();

        for (const r of detailRows) {
            const key = (r?.paymentMethod || t("salesReportsPage.common.unknown")).trim();
            const revenue = safeNumber(r?.revenue);
            const qty = safeNumber(r?.qty);
            const taxTotal = safeNumber(r?.taxTotal);
            const tipTotal = safeNumber(r?.tipTotal);

            const hasCost = hasCostForRow(r);
            const costTotal = safeNumber(r?.costTotal);

            const prev = map.get(key) || {
                paymentMethod: key,
                qty: 0,
                revenue: 0,
                taxTotal: 0,

                costTotal: 0,
                profit: 0,
                costPct: null,
                profitPct: null,
                tipTotal: 0,
                manualTipTotal:0,
                anyCost: false,
                allCost: true,
            };

            prev.qty += qty;
            prev.revenue += revenue;
            prev.taxTotal += taxTotal;
            prev.tipTotal += tipTotal;
            prev.manualTipTotal += safeNumber(r.manualTipTotal);

            if (hasCost) {
                prev.anyCost = true;
                prev.costTotal += costTotal;
                prev.profit += (revenue - costTotal);
            } else {
                prev.allCost = false;
            }

            map.set(key, prev);
        }

        return Array.from(map.values()).map((x) => {
            if (!x.anyCost) {
                x.costTotal = null;
                x.profit = null;
                x.costPct = null;
                x.profitPct = null;
                return x;
            }

            if (!x.allCost) {
                x.costTotal = null;
                x.profit = null;
                x.costPct = null;
                x.profitPct = null;
                return x;
            }

            x.costPct = x.revenue > 0 ? (x.costTotal / x.revenue) * 100 : 0;
            x.profitPct = x.revenue > 0 ? (x.profit / x.revenue) * 100 : 0;
            return x;
        });
    }
    const downloadExcel = async () => {
        try {
            const rows = orders.map((o) => ({
                [t("salesReportsPage.excel.columns.date")]: o?.createdAt
                    ? formatDate(o.createdAt, localization)
                    : "",
                [t("salesReportsPage.excel.columns.time")]: o?.createdAt
                    ? formatTime(o.createdAt, localization)
                    : "",
                [t("salesReportsPage.excel.columns.orderId")]: o?._id || "",
                [t("salesReportsPage.excel.columns.customer")]: o?.customerDetails?.name || "—",
                [t("salesReportsPage.excel.columns.method")]: getEffectivePaymentMethodLabel(o, t),
                [t("salesReportsPage.excel.columns.source")]: o?.orderSource || "DINE_IN",
                [t("salesReportsPage.excel.columns.subtotal")]: Number(o.bills?.subtotal || 0),
                [taxReportLabel]: getBillTax(o.bills),
                [serviceChargeReportLabel]: getBillTip(o.bills),
                "Propina adicional":manualTip(o.bills),
                [t("salesReportsPage.excel.columns.total")]: Number(o.bills?.totalWithTax || 0),
                [t("salesReportsPage.excel.columns.user")]: o?.user?.name || "—",
                [t("salesReportsPage.excel.columns.table")]: o?.table?.tableNumber || "—",
                [t("salesReportsPage.excel.columns.shipping")]: Number(
                    o?.shippingFee ??
                    o?.deliveryFee ??
                    o?.bills?.shippingFee ??
                    o?.bills?.deliveryFee ??
                    0
                ),
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, t("salesReportsPage.excel.salesSheet"));

            const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([arrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            saveAs(
                blob,
                `${t("salesReportsPage.excel.salesFilePrefix")}_${getTodayYMD(localization)}.xlsx`
            );
        } catch (error) {
            console.error("Error exportando Excel:", error);
            showToast(t("salesReportsPage.messages.exportError"));
        }
    };
    const downloadExcelReport = async (exportAll = true) => {
        try {
            const sourceRows = exportAll ? reportRows : pagedRows;

            const rows = sourceRows.map((r) => {
                // Detalle por producto
                if (tab === "product") {
                    const revenue = safeNumber(r.revenue);
                    const hasCost = hasCostForRow(r);
                    const costTotal = safeNumber(r.costTotal);
                    const profit = hasCost ? (revenue - costTotal) : null;
                    const costPct = hasCost && revenue > 0 ? (costTotal / revenue) * 100 : null;
                    const profitPct = hasCost && revenue > 0 ? (profit / revenue) * 100 : null;

                    return {
                        [t("salesReportsPage.excel.columns.category")]: r.category || t("salesReportsPage.common.noCategory"),
                        [t("salesReportsPage.excel.columns.presentation")]: r.presentation || t("salesReportsPage.common.regular"),
                        [t("salesReportsPage.excel.columns.product")]: r.product || "",
                        [t("salesReportsPage.excel.columns.method")]: r.paymentMethod || t("salesReportsPage.common.unknown"),
                        [t("salesReportsPage.excel.columns.quantity")]: safeNumber(r.qty),
                        [t("salesReportsPage.excel.columns.unitPrice")]: safeNumber(r.unitPrice),
                        [t("salesReportsPage.excel.columns.unitCost")]: hasCost ? safeNumber(r.unitCost) : t("salesReportsPage.common.notAvailable"),
                        [t("salesReportsPage.excel.columns.revenue")]: revenue,
                        [t("salesReportsPage.excel.columns.cost")]: hasCost ? costTotal : t("salesReportsPage.common.notAvailable"),
                        [t("salesReportsPage.excel.columns.profit")]: profit == null ? t("salesReportsPage.common.notAvailable") : Number(profit.toFixed(2)),
                        [t("salesReportsPage.excel.columns.costPercent")]: costPct == null ? t("salesReportsPage.common.notAvailable") : `${costPct.toFixed(2)}%`,
                        [t("salesReportsPage.excel.columns.profitPercent")]: profitPct == null ? t("salesReportsPage.common.notAvailable") : `${profitPct.toFixed(2)}%`,
                        [taxReportLabel]: safeNumber(r.taxTotal),
                        [serviceChargeReportLabel]: safeNumber(r.tipTotal),
                        "Propina adicional":safeNumber(r.manualTipTotal),
                    };
                }

                // Por categoría
                if (tab === "category") {
                    return {
                        [t("salesReportsPage.excel.columns.category")]: r.category || t("salesReportsPage.common.noCategory"),
                        [t("salesReportsPage.excel.columns.quantity")]: safeNumber(r.qty),
                        [t("salesReportsPage.excel.columns.revenue")]: safeNumber(r.revenue),
                        [t("salesReportsPage.excel.columns.cost")]: r.costTotal == null ? t("salesReportsPage.common.notAvailable") : safeNumber(r.costTotal),
                        [t("salesReportsPage.excel.columns.profit")]: r.profit == null ? t("salesReportsPage.common.notAvailable") : safeNumber(r.profit),
                        [t("salesReportsPage.excel.columns.costPercent")]: r.costPct == null ? t("salesReportsPage.common.notAvailable") : `${Number(r.costPct).toFixed(2)}%`,
                        [t("salesReportsPage.excel.columns.profitPercent")]: r.profitPct == null ? t("salesReportsPage.common.notAvailable") : `${Number(r.profitPct).toFixed(2)}%`,
                        [taxReportLabel]: safeNumber(r.taxTotal),
                        [serviceChargeReportLabel]: safeNumber(r.tipTotal),
                        "Propina adicional":safeNumber(r.manualTipTotal),
                    };
                }

                // Por método
                return {
                    [t("salesReportsPage.excel.columns.paymentMethod")]: r.paymentMethod || t("salesReportsPage.common.unknown"),
                    [t("salesReportsPage.excel.columns.quantity")]: safeNumber(r.qty),
                    [t("salesReportsPage.excel.columns.revenue")]: safeNumber(r.revenue),
                    [t("salesReportsPage.excel.columns.cost")]: r.costTotal == null ? t("salesReportsPage.common.notAvailable") : safeNumber(r.costTotal),
                    [t("salesReportsPage.excel.columns.profit")]: r.profit == null ? t("salesReportsPage.common.notAvailable") : safeNumber(r.profit),
                    [t("salesReportsPage.excel.columns.costPercent")]: r.costPct == null ? t("salesReportsPage.common.notAvailable") : `${Number(r.costPct).toFixed(2)}%`,
                    [t("salesReportsPage.excel.columns.profitPercent")]: r.profitPct == null ? t("salesReportsPage.common.notAvailable") : `${Number(r.profitPct).toFixed(2)}%`,
                    [taxReportLabel]: safeNumber(r.taxTotal),
                    [serviceChargeReportLabel]:safeNumber(r.tipTotal),
                    "Propina adicional":safeNumber(r.manualTipTotal),
                };
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, t("salesReportsPage.excel.reportSheet"));
            XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{Criterio:'Cargos y propina adicional prorrateados por subtotal original de artículos; ajuste acumulado de centavos. No modifica facturas.',CargosOrdenes:productReportQuery.data?.meta?.chargeReconciliation?.serviceChargeTotal||0,PropinaAdicional:productReportQuery.data?.meta?.chargeReconciliation?.manualTipTotal||0,SinAsignar:(productReportQuery.data?.meta?.chargeReconciliation?.unallocatedServiceCharge||0)+(productReportQuery.data?.meta?.chargeReconciliation?.unallocatedManualTip||0)}]),'Criterio cargos');

            const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([arrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const name =
                tab === "category"
                    ? t("salesReportsPage.excel.fileNames.category")
                    : tab === "payment"
                        ? t("salesReportsPage.excel.fileNames.payment")
                        : t("salesReportsPage.excel.fileNames.product");

            saveAs(blob, `${name}_${filters.from}_a_${filters.to}.xlsx`);
        } catch (error) {
            console.error("Error exportando Excel (reporte):", error);
            showToast(t("salesReportsPage.messages.exportError"));
        }
    };
    const salesByDish = useMemo(() => {
        const map = new Map();

        for (const r of detailRows || []) {
            const name = String(
                r?.product ||
                r?.productName ||
                r?.dishName ||
                r?.itemName ||
                r?.name ||
                t("salesReportsPage.common.product")
            ).trim();

            const qty = safeNumber(r?.qty ?? r?.quantity ?? 0);
            const revenue = safeNumber(r?.revenue ?? r?.sales ?? r?.total ?? 0);
            const orderCount = safeNumber(r?.orderCount ?? r?.count ?? 0);

            if (!name || (qty <= 0 && revenue <= 0)) continue;

            const prev = map.get(name) || {
                name,
                qty: 0,
                total: 0,
                count: 0,
            };

            prev.qty += qty;
            prev.total += revenue;
            prev.count += orderCount;

            map.set(name, prev);
        }

        return Array.from(map.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
    }, [detailRows, t, i18n.language]);
    const totalRows = reportRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const getOrderDishesLabel = (order, max = 2) => {
        const items = Array.isArray(order?.items) ? order.items : [];
        if (!items.length) return "—";

        const names = items
            .map((it) => (it?.name || "").trim())
            .filter(Boolean);

        if (!names.length) return "—";
        if (names.length <= max) return names.join(", ");

        return `${names.slice(0, max).join(", ")} (+${names.length - max})`;
    };
    const recentTotal = orders.length;
    const recentTotalPages = Math.max(1, Math.ceil(recentTotal / recentPageSize));

    const recentOrders = useMemo(() => {
        const start = (recentPage - 1) * recentPageSize;
        return orders.slice(start, start + recentPageSize);
    }, [orders, recentPage]);
    const pagedRows = useMemo(() => {
        const start = (page - 1) * pageSize;
        return reportRows.slice(start, start + pageSize);
    }, [reportRows, page, pageSize]);

    const summaryTax = safeNumber(
        salesAnalysis.totalTax ||
        dailySummary.totalTax ||
        dailySummary.tax ||
        dailySummary.itbis ||
        0
    );

    const summaryTip = safeNumber(salesAnalysis.totalTip);
    if (isLoading) {
        return (
            <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38bdf8] mx-auto"></div>
                <p className="mt-2">{t("salesReportsPage.loading")}</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-8 text-red-400">
                {t("salesReportsPage.loadError")}{error?.response?.status ? ` (HTTP ${error.response.status})` : ""}.
            </div>
        );
    }


    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-[#38bdf8]" />
                        {t("salesReportsPage.title")}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">{t("salesReportsPage.subtitle")}</p>
                </div>
                <button
                    onClick={() => downloadExcelReport(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] hover:border-[#38bdf8]/50 transition-all"
                >
                    <Download className="w-4 h-4" />
                    {t("salesReportsPage.actions.exportExcel")}
                </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">

                {[
                    { key: "category", label: t("salesReportsPage.tabs.category") },
                    { key: "payment", label: t("salesReportsPage.tabs.payment") },
                    { key: "product", label: t("salesReportsPage.tabs.product") },
                ].map((t) => {
                    const active = tab === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={[
                                "px-3 py-2 rounded-lg border transition-all text-sm",
                                active
                                    ? "bg-[#262626] border-[#38bdf8]/50 text-white"
                                    : "bg-[#1a1a1a] border-gray-800/50 text-gray-300 hover:bg-[#262626] hover:border-[#38bdf8]/30",
                            ].join(" ")}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Filtros */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">{t("salesReportsPage.filters.from")}</label>
                        <input
                            type="date"
                            value={filters.from}
                            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">{t("salesReportsPage.filters.to")}</label>
                        <input
                            type="date"
                            value={filters.to}
                            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">{t("salesReportsPage.filters.paymentMethod")}</label>
                        <select
                            value={filters.method}
                            onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
                            className="w-full p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                        >
                            <option value="">{t("salesReportsPage.filters.allMethods")}</option>
                            <option value="Efectivo">{t("salesReportsPage.paymentMethods.cash")}</option>
                            <option value="Tarjeta">{t("salesReportsPage.paymentMethods.card")}</option>
                            <option value="Transferencia">{t("salesReportsPage.paymentMethods.transfer")}</option>
                            <option value="Otros">{t("salesReportsPage.paymentMethods.other")}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">{t("salesReportsPage.metrics.totalSales")}</p>
                        <DollarSign className="w-4 h-4 text-[#38bdf8]" />
                    </div>
                    <p className="text-2xl font-bold text-white">{currency(salesAnalysis.totalSales)}</p>
                    <p className="text-xs text-gray-500 mt-1">{t("salesReportsPage.orderCount", { count: salesAnalysis.totalOrders })}</p>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">{t("salesReportsPage.metrics.averageOrder")}</p>
                        <ShoppingCart className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{currency(salesAnalysis.avgTicket)}</p>
                    <p className="text-xs text-gray-500 mt-1">{t("salesReportsPage.metrics.perOrder")}</p>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">{t("salesReportsPage.metrics.totalOrders")}</p>
                        <Calendar className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{salesAnalysis.totalOrders}</p>
                    <p className="text-xs text-gray-500 mt-1">{t("salesReportsPage.metrics.processedOrders")}</p>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">
                            {taxReportLabel}
                        </p>
                        <CreditCard className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{currency(summaryTax)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        {t("salesReportsPage.metrics.taxesCollected")}
                    </p>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">
                            {serviceChargeReportLabel}
                        </p>
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{currency(summaryTip)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        {t("salesReportsPage.metrics.serviceChargesCollected")}
                    </p>
                </div>
            </div>


            {/* ✅ Reporte por Producto/Categoría/Método (nuevo) */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span>{t("salesReportsPage.pagination.show")}</span>
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="bg-[#1a1a1a] text-gray-100 border border-gray-800/50 rounded-lg px-2 py-1 [color-scheme:dark]"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                    </select>
                    <span>{t("salesReportsPage.pagination.rows")}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-300">
                    <button
                        className="px-3 py-1 rounded-lg border border-gray-800/50 bg-[#1a1a1a] disabled:opacity-40"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                    >
                        {t("salesReportsPage.pagination.previous")}
                    </button>

                    <span>
      {t("salesReportsPage.pagination.pageOf", { page, totalPages })}
    </span>

                    <button
                        className="px-3 py-1 rounded-lg border border-gray-800/50 bg-[#1a1a1a] disabled:opacity-40"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                    >
                        {t("salesReportsPage.pagination.next")}
                    </button>
                </div>
            </div>
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                        {tab === "category"
                            ? t("salesReportsPage.reportTitles.category")
                            : tab === "payment"
                                ? t("salesReportsPage.reportTitles.payment")
                                : t("salesReportsPage.reportTitles.product")}
                    </h3>

                    <div className="text-xs text-gray-400">
                        {filters.from} → {filters.to}
                        {filters.method ? ` · ${normalizePaymentMethodLabel(filters.method, t)}` : ` · ${t("salesReportsPage.filters.allMethods")}`}
                    </div>
                </div>

                {productReportQuery.isLoading ? (
                    <div className="text-center py-8 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38bdf8] mx-auto"></div>
                        <p className="mt-2">{t("salesReportsPage.report.loading")}</p>
                    </div>
                ) : productReportQuery.isError ? (
                    <div className="text-center py-6 text-red-400">
                        {t("salesReportsPage.report.loadError")}
                    </div>
                ) : reportRows.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                        {t("salesReportsPage.report.empty")}
                    </div>
                ) : (
                    <><p className="text-xs text-gray-400 p-3">Los cargos de servicio (incluida la propina legal) y la propina adicional se prorratean por el subtotal original de los artículos, con ajuste de centavos. Es un reparto analítico; no modifica las facturas. Los cargos informativos no cobrados se excluyen.</p>
                    <p className="text-xs text-gray-400 p-3">Cargos de servicio de las órdenes del rango: {currency(productReportQuery.data?.meta?.chargeReconciliation?.serviceChargeTotal||0)} · Propina adicional: {currency(productReportQuery.data?.meta?.chargeReconciliation?.manualTipTotal||0)} · Sin base para asignar a categorías: {currency((productReportQuery.data?.meta?.chargeReconciliation?.unallocatedServiceCharge||0)+(productReportQuery.data?.meta?.chargeReconciliation?.unallocatedManualTip||0))}</p>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                            <tr className="text-gray-400 border-b border-gray-800/60">
                                {tab === "category" && <th className="text-left py-2 pr-4">{t("salesReportsPage.table.category")}</th>}
                                {tab === "payment" && <th className="text-left py-2 pr-4">{t("salesReportsPage.table.method")}</th>}
                                {tab === "product" && (
                                    <>
                                        <th className="text-left py-2 pr-4">{t("salesReportsPage.table.category")}</th>
                                        <th className="text-left py-2 pr-4">{t("salesReportsPage.table.presentation")}</th>
                                        <th className="text-left py-2 pr-4">{t("salesReportsPage.table.product")}</th>
                                        <th className="text-left py-2 pr-4">{t("salesReportsPage.table.method")}</th>
                                    </>
                                )}

                                <th className="text-right py-2 px-3">{t("salesReportsPage.table.quantityShort")}</th>
                                <th className="text-right py-2 px-3">{t("salesReportsPage.table.revenue")}</th>
                                <th className="text-right py-2 px-3">{t("salesReportsPage.table.cost")}</th>
                                <th className="text-right py-2 px-3">{t("salesReportsPage.table.profit")}</th>
                                <th className="text-right py-2 px-3">{t("salesReportsPage.table.costPercent")}</th>
                                <th className="text-right py-2 px-3">{t("salesReportsPage.table.profitPercent")}</th>
                                <th className="text-right py-2 px-3">
                                    {taxReportLabel}
                                </th>

                                <th className="text-right py-2 pl-3">
                                    {serviceChargeReportLabel}
                                </th><th className="text-right py-2 pl-3">Propina adicional</th>
                            </tr>
                            </thead>

                            <tbody>
                            {pagedRows.map((r, idx) => {
                                const qty = Number(r.qty || 0);

                                const revenue = Number(r.revenue || 0);
                                const unitCost = Number(r.unitCost || 0);
                                const costTotalRaw = Number(r.costTotal || 0);
                                const taxTotal = Number(r.taxTotal || 0);
                                const tipTotal = Number(r.tipTotal || 0);

                                // ✅ costo “válido” solo si realmente existe
                                const hasCost = unitCost > 0 && costTotalRaw > 0;

                                // ✅ si no hay costo, no mostramos márgenes
                                const costTotal = hasCost ? costTotalRaw : null;
                                const profit = hasCost ? (revenue - costTotalRaw) : null;

                                const costPct = hasCost && revenue > 0 ? (costTotalRaw / revenue) * 100 : null;
                                const profitPct = hasCost && revenue > 0 ? (profit / revenue) * 100 : null;

                                return (
                                    <tr key={idx} className="border-b border-gray-800/30 text-gray-200">
                                        {tab === "category" && <td className="py-2 pr-4">{r.category}</td>}
                                        {tab === "payment" && <td className="py-2 pr-4">{r.paymentMethod}</td>}
                                        {tab === "product" && (
                                            <>
                                                <td className="py-2 pr-4">{r.category}</td>
                                                <td className="py-2 pr-4">{r.presentation}</td>
                                                <td className="py-2 pr-4">{r.product}</td>
                                                <td className="py-2 pr-4">{r.paymentMethod}</td>
                                            </>
                                        )}

                                        <td className="py-2 px-3 text-right">{qty}</td>
                                        <td className="py-2 px-3 text-right">{currency(revenue)}</td>

                                        {/* ✅ Costo */}
                                        <td className="py-2 px-3 text-right">
                                            {costTotal == null ? t("salesReportsPage.common.notAvailable") : currency(costTotal)}
                                        </td>

                                        {/* ✅ Utilidad */}
                                        <td className="py-2 px-3 text-right">
                                            {profit == null ? t("salesReportsPage.common.notAvailable") : currency(profit)}
                                        </td>

                                        {/* ✅ Costo % */}
                                        <td className="py-2 px-3 text-right">
                                            {costPct == null ? t("salesReportsPage.common.notAvailable") : `${costPct.toFixed(2)}%`}
                                        </td>

                                        {/* ✅ Utilidad % */}
                                        <td className="py-2 px-3 text-right">
                                            {profitPct == null ? t("salesReportsPage.common.notAvailable") : `${profitPct.toFixed(2)}%`}
                                        </td>

                                        <td className="py-2 px-3 text-right">{currency(taxTotal)}</td>
                                        <td className="py-2 pl-3 text-right">{currency(tipTotal)}</td><td className="py-2 pl-3 text-right">{currency(r.manualTipTotal)}</td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div></>
                )}
            </div>
            {/* Análisis por método de pago */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <h3 className="text-lg font-semibold text-white mb-4">{t("salesReportsPage.sections.salesByPaymentMethod")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {paymentCards.map(([method, data]) => (
                        <div key={method} className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-3">
                            <p className="text-sm text-gray-400 mb-1">{method}</p>
                            <p className="text-lg font-bold text-white">{currency(data.total)}</p>
                            <p className="text-xs text-gray-500 mt-1">{t("salesReportsPage.orderCount", { count: data.count })}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ventas por Plato */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{t("salesReportsPage.sections.salesByDish")}</h3>
                    <span className="text-xs text-gray-400">{t("salesReportsPage.common.top10")}</span>
                </div>
                {productReportQuery.isLoading ? (
                    <div className="text-center py-6 text-gray-400">
                        {t("salesReportsPage.sections.loadingDishSales")}
                    </div>
                ) : salesByDish.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                        {t("salesReportsPage.sections.noDishSales")}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {salesByDish.map((x) => (
                            <div key={x.name} className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-3">
                                <p className="text-sm text-gray-200 mb-1 line-clamp-2">{x.name}</p>
                                <p className="text-lg font-bold text-white">{currency(x.total)}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {x.count > 0 ? `${t("salesReportsPage.orderCount", { count: x.count })} · ` : ""}
                                    {t("salesReportsPage.quantityValue", { count: Number(x.qty || 0).toFixed(2) })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Ventas por día de la semana */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <h3 className="text-lg font-semibold text-white mb-4">{t("salesReportsPage.sections.salesByWeekday")}</h3>
                <div className="space-y-2">
                    {Object.entries(salesAnalysis.byDayOfWeek)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([day, data]) => {
                            const maxTotal = Math.max(...Object.values(salesAnalysis.byDayOfWeek).map(d => d.total));
                            const percentage = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
                            return (
                                <div key={day} className="bg-[#1a1a1a] border border-gray-800/30 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-white capitalize">{day}</p>
                                        <p className="text-sm font-bold text-[#38bdf8]">{currency(data.total)}</p>
                                    </div>
                                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-2 bg-gradient-to-r from-[#38bdf8] to-[#7dd3fc] rounded-full transition-all"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{t("salesReportsPage.orderCount", { count: data.count })}</p>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Tabla de ventas recientes */}
            <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] overflow-hidden">
                <div className="p-4 border-b border-gray-800/50">
                    <h3 className="text-lg font-semibold text-white">{t("salesReportsPage.sections.recentSales")}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#1a1a1a] border-b border-gray-800/50">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-300">{t("salesReportsPage.recentTable.date")}</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">{t("salesReportsPage.recentTable.customer")}</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">{t("salesReportsPage.table.method")}</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">{t("salesReportsPage.recentTable.dishes")}</th>
                                <th className="p-3 text-sm font-semibold text-gray-300">{t("salesReportsPage.recentTable.total")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map((order) => (
                                <tr key={order._id} className="border-b border-gray-800/30 hover:bg-[#1a1a1a]/50 transition-colors">
                                    <td className="p-3 text-sm text-gray-300">
                                        {formatDate(
                                            order.createdAt,
                                            localization
                                        )}
                                    </td>
                                    <td className="p-3 text-sm text-gray-300">
                                        {order.customerDetails?.name || "—"}
                                    </td>
                                    <td className="p-3 text-sm text-gray-300">
                                        {normalizePaymentMethodLabel(order.paymentMethod, t)}
                                    </td>
                                    <td className="p-3 text-sm text-gray-300 max-w-[260px] truncate">
                                        {getOrderDishesLabel(order, 2)}
                                    </td>
                                    <td className="p-3 text-sm font-bold text-[#38bdf8]">
                                        {currency(order.bills?.totalWithTax || 0)}
                                    </td>
                                </tr>
                            ))}

                        </tbody>
                    </table>
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-300">
                        <button
                            className="px-3 py-1 rounded-lg border border-gray-800/50 bg-[#1a1a1a] disabled:opacity-40"
                            onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                            disabled={recentPage <= 1}
                        >
                            {t("salesReportsPage.pagination.previous")}
                        </button>

                        <span>
                            {t("salesReportsPage.pagination.pageOf", { page: recentPage, totalPages: recentTotalPages })}
                          </span>

                        <button
                            className="px-3 py-1 rounded-lg border border-gray-800/50 bg-[#1a1a1a] disabled:opacity-40"
                            onClick={() => setRecentPage((p) => Math.min(recentTotalPages, p + 1))}
                            disabled={recentPage >= recentTotalPages}
                        >
                            {t("salesReportsPage.pagination.next")}
                        </button>
                    </div>
                </div>
            </div>
            {toast.open && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999]">
                    <div
                        className={`px-4 py-3 rounded-xl shadow-2xl border backdrop-blur
        ${toast.type === "error"
                            ? "bg-red-500/15 border-red-500/30 text-red-200"
                            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-medium">{toast.message}</div>
                            <button
                                type="button"
                                aria-label={t("salesReportsPage.actions.closeNotification")}
                                className="ml-2 text-white/70 hover:text-white"
                                onClick={() => setToast((t) => ({ ...t, open: false }))}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SalesReports;
