import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, FileText, Receipt, RefreshCw, X } from "lucide-react";
import api from "../../lib/api";
import { getClosingInvoicePdfUrl } from "../../lib/cashCloseInvoicePdf.mjs";
import { useTranslation } from "react-i18next";

const CLOSING_LABELS = {
    es: {
        title: "Facturas y notas del cierre", date: "Fecha", register: "Caja", all: "Todas",
        main: "Principal", readonly: "Solo consulta", close: "Cerrar", invoices: "Facturas / ventas",
        fiscal: "E31 / E32 / E33 / E34", search: "Buscar por e-NCF, cliente o número...",
        refresh: "Actualizar", emptyOrders: "No hay facturas de ventas para esta fecha y caja.",
        viewInvoice: "Ver / Imprimir factura", viewPdf: "Ver PDF", downloadPdf: "Descargar PDF", pdfWorking: "Preparando PDF...", pdfBlocked: "El navegador bloqueó la ventana del PDF. Permite ventanas emergentes para este sitio.", pdfNotFound: "No se encontró el PDF de esta factura.", pdfForbidden: "No tienes permiso para acceder a este PDF.", pdfError: "No se pudo abrir el PDF. Vuelve a intentarlo.", loadingFiscal: "Consultando documentos fiscales...",
        fiscalError: "No se pudieron cargar los documentos", emptyFiscal: "No hay documentos fiscales en esta fecha/caja.",
        fiscalNotice: "Las E33/E34 se listan por su fecha de emisión, aunque la factura original sea de otro día. Este registro fiscal no agrega ni resta dinero del cierre por sí mismo.",
        consumer: "Consumidor Final", order: "Orden", modified: "Modifica", noReason: "Sin motivo",
        view: "Ver / Imprimir", pending: "No imprimible como aceptado", documents: "documento(s)",
        prev: "Anterior", next: "Siguiente", unchanged: "Consulta sin alterar el cierre.",
    },
    en: {
        title: "Invoices and fiscal notes", date: "Date", register: "Register", all: "All",
        main: "Main", readonly: "Read only", close: "Close", invoices: "Sales invoices",
        fiscal: "E31 / E32 / E33 / E34", search: "Search e-NCF, customer or number...",
        refresh: "Refresh", emptyOrders: "No sales invoices for this date and register.",
        viewInvoice: "View / Print invoice", viewPdf: "View PDF", downloadPdf: "Download PDF", pdfWorking: "Preparing PDF...", pdfBlocked: "The browser blocked the PDF window. Allow pop-ups for this site.", pdfNotFound: "The PDF for this invoice could not be found.", pdfForbidden: "You cannot access this PDF.", pdfError: "Unable to open the PDF. Please try again.", loadingFiscal: "Loading fiscal documents...",
        fiscalError: "Unable to load documents", emptyFiscal: "No fiscal documents for this date/register.",
        fiscalNotice: "E33/E34 notes are listed by issue date, even if the original invoice is older. These fiscal documents do not automatically change cash-closing totals.",
        consumer: "Final consumer", order: "Order", modified: "Modifies", noReason: "No reason",
        view: "View / Print", pending: "Cannot print as accepted", documents: "document(s)",
        prev: "Previous", next: "Next", unchanged: "Read-only view. Closing totals are unchanged.",
    },
};

const STATUS = {
    accepted: "Aceptado", accepted_with_observation: "Aceptado con observaciones",
    submitted: "Enviado", track_received: "Pendiente de respuesta",
    signed: "Firmado", xml_generated: "XML generado",
    rejected: "Rechazado", cancelled: "Anulado", draft: "Borrador",
};
const fiscalTypeName = (type) => ({
    "31": "E31 · Crédito fiscal", "32": "E32 · Consumo",
    "33": "E33 · Nota de débito", "34": "E34 · Nota de crédito",
}[String(type)] || "Comprobante electrónico");
const printableStatus = (status) => ["accepted", "accepted_with_observation"].includes(String(status || ""));

export default function CashCloseDocumentsModal({
    onClose, dateYMD, registerId, orders = [], money, onOpenOrder, onOpenFiscal,
    supportsDominicanFiscal = false, tenantId = "", clientId = "default",
}) {
    const { i18n } = useTranslation();
    const L = CLOSING_LABELS[String(i18n.resolvedLanguage || i18n.language || "es").startsWith("en") ? "en" : "es"];
    const [tab, setTab] = useState("invoices");
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [pdfBusy, setPdfBusy] = useState(null);
    const [pdfError, setPdfError] = useState("");
    const openPdf = async (orderId, download = false) => {
        if (pdfBusy) return;
        setPdfError("");
        // Abrir la pestaña en el clic evita bloqueadores tras la espera HTTP.
        const popup = window.open("about:blank", "_blank");
        if (!popup) {
            setPdfError(L.pdfBlocked);
            return;
        }
        try {
            popup.opener = null;
            popup.document.title = L.pdfWorking;
            popup.document.body.textContent = L.pdfWorking;
        } catch { /* Algunos navegadores no permiten modificar la pestaña. */ }
        setPdfBusy(`${orderId}:${download ? "download" : "view"}`);
        try {
            const url = await getClosingInvoicePdfUrl(api, orderId, { download });
            if (popup.closed) return;
            popup.location.replace(url);
        } catch (err) {
            try { popup.close(); } catch { /* Sin efecto. */ }
            const status = err?.response?.status;
            setPdfError(status === 401 || status === 403 ? L.pdfForbidden :
                status === 404 ? L.pdfNotFound : L.pdfError);
        } finally {
            setPdfBusy(null);
        }
    };
    useEffect(() => { setPage(1); }, [dateYMD, registerId]);
    useEffect(() => {
        const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    const { data, isFetching, error, refetch } = useQuery({
        queryKey: ["cash-close-fiscal-documents", tenantId || "NO_TENANT", clientId || "default", dateYMD, registerId || "", page],
        queryFn: async () => {
            const response = await api.get("/api/admin/cash-close/fiscal-documents", {
                params: {
                    dateYMD, page,
                    ...(!registerId || registerId === "__ALL_REGISTERS__" ? {} : { registerId }),
                },
            });
            return response.data?.data || { documents: [], total: 0, pageSize: 30 };
        },
        enabled: supportsDominicanFiscal && tab === "fiscal",
        staleTime: 10_000,
        retry: false,
    });
    const fiscalDocs = data?.documents || [];
    const total = Number(data?.total || 0);
    const maxPage = Math.max(1, Math.ceil(total / Number(data?.pageSize || 30)));
    const q = search.trim().toLowerCase();
    const filteredOrders = orders.filter((order) => !q || [
        order.facturaNo, order.invoiceNumber, order?.ecf?.eNCF,
        order?.customerDetails?.name, order?._id,
    ].some((part) => String(part || "").toLowerCase().includes(q)));
    const filteredFiscal = fiscalDocs.filter((doc) => !q || [
        doc.eNCF, doc.orderId, doc.customer?.name, doc.reference?.modifiedENCF,
        doc.reference?.reason,
    ].some((part) => String(part || "").toLowerCase().includes(q)));
    const formatDate = (value) => {
        if (!value) return "—";
        try { return new Intl.DateTimeFormat("es-DO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(new Date(value)); }
        catch { return "—"; }
    };
    return (
        <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-black/85 backdrop-blur-sm px-2 sm:px-4 pt-3"
            role="dialog" aria-modal="true" aria-label={L.title}>
            <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-[#101012] shadow-2xl"
                style={{ maxHeight: "calc(100dvh - 112px)" }}>
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-800 px-4 py-4 sm:px-6">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Receipt size={19} className="text-amber-400"/> {L.title}</h2>
                        <p className="mt-1 text-xs text-gray-400">{L.date}: {dateYMD} · {L.register}: {registerId === "__ALL_REGISTERS__" ? L.all : (registerId || L.main)} · {L.readonly}</p>
                    </div>
                    <button aria-label={L.close} type="button" onClick={onClose} className="rounded-lg border border-gray-700 p-2 text-gray-200 hover:bg-gray-800"><X size={18}/></button>
                </header>
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-800 px-4 py-3 sm:px-6">
                    <button type="button" onClick={() => { setTab("invoices"); setSearch(""); }}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === "invoices" ? "bg-amber-500 text-black" : "bg-[#242429] text-gray-200"}`}>
                        {L.invoices} ({orders.length})
                    </button>
                    {supportsDominicanFiscal && <button type="button" onClick={() => { setTab("fiscal"); setSearch(""); }}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === "fiscal" ? "bg-amber-500 text-black" : "bg-[#242429] text-gray-200"}`}>
                        {L.fiscal}
                    </button>}
                    <input type="search" aria-label="Buscar factura" placeholder={L.search} value={search} onChange={(e) => setSearch(e.target.value)}
                        className="ml-auto w-full rounded-lg border border-gray-700 bg-[#1e1e21] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 sm:w-64" />
                    {tab === "fiscal" && <button type="button" onClick={() => refetch()} className="rounded-lg border border-gray-700 p-2 text-gray-200" title={L.refresh}><RefreshCw size={17}/></button>}
                </div>
                {pdfError && <div role="alert" className="mx-3 mt-3 rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-200 sm:mx-5">{pdfError}</div>}
                <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
                    {tab === "invoices" ? (
                        filteredOrders.length === 0 ? <p className="py-12 text-center text-sm text-gray-400">{L.emptyOrders}</p> :
                            <div className="space-y-2">{filteredOrders.map((order) => (
                                <div key={order._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 bg-[#19191c] p-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-white">{order?.ecf?.eNCF || order?.facturaNo || order?.invoiceNumber || `${L.order} ${String(order._id).slice(-7)}`}</div>
                                        <div className="text-xs text-gray-400">{order?.customerDetails?.name || order?.customerName || L.consumer} · {formatDate(order.paidAt || order.invoicedAt || order.createdAt)}</div>
                                        <div className="mt-1 text-xs font-semibold text-amber-300">{money(Number(order?.bills?.totalWithTax || 0))}</div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button type="button" onClick={() => onOpenOrder(order._id)} className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/20">{L.viewInvoice}</button>
                                        <button type="button" onClick={() => openPdf(order._id)} disabled={!!pdfBusy}
                                            aria-label={`${L.viewPdf}: ${order.facturaNo || order.invoiceNumber || order._id}`}
                                            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50">
                                            <Eye size={14}/> {pdfBusy === `${order._id}:view` ? L.pdfWorking : L.viewPdf}
                                        </button>
                                        <button type="button" onClick={() => openPdf(order._id, true)} disabled={!!pdfBusy}
                                            aria-label={`${L.downloadPdf}: ${order.facturaNo || order.invoiceNumber || order._id}`}
                                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50">
                                            <Download size={14}/> {pdfBusy === `${order._id}:download` ? L.pdfWorking : L.downloadPdf}
                                        </button>
                                    </div>
                                </div>
                            ))}</div>
                    ) : (
                        <>
                            <p className="mb-3 text-xs text-amber-200/80">{L.fiscalNotice}</p>
                            {isFetching && <p className="py-6 text-center text-sm text-gray-400">{L.loadingFiscal}</p>}
                            {error && <p className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">{L.fiscalError} (HTTP {error?.response?.status || "—"}{error?.response?.data?.code ? ` · ${String(error.response.data.code).slice(0, 96)}` : ""}).</p>}
                            {!isFetching && !error && !filteredFiscal.length && <p className="py-10 text-center text-sm text-gray-400">{L.emptyFiscal}</p>}
                            {!isFetching && !error && <div className="space-y-2">{filteredFiscal.map((doc) => (
                                <div key={doc.documentId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 bg-[#19191c] p-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-white">{fiscalTypeName(doc.documentType)} · <span className="text-amber-300">{doc.eNCF || "Sin e-NCF"}</span></div>
                                        <div className="mt-0.5 text-xs text-gray-400">{doc.customer?.name || L.consumer} · {formatDate(doc.createdAt)}</div>
                                        {(doc.documentType === "33" || doc.documentType === "34") && <div className="mt-1 text-xs text-gray-500">{L.modified}: {doc.reference?.modifiedENCF || "—"} · {doc.reference?.reason || L.noReason}</div>}
                                        <div className="mt-1 text-xs font-semibold text-amber-300">{money(Number(doc.totals?.total || 0))} · <span className="text-gray-300">{STATUS[doc.status] || doc.status}</span></div>
                                    </div>
                                    {printableStatus(doc.status) ? <button type="button" onClick={() => onOpenFiscal(doc)} className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/20"><FileText size={14} className="mr-1 inline"/> {L.view}</button>
                                        : <span className="text-xs text-gray-500">{L.pending}</span>}
                                </div>
                            ))}</div>}
                        </>
                    )}
                </div>
                <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-800 bg-[#131315] px-4 py-3 sm:px-6">
                    {tab === "fiscal" && <div className="flex items-center gap-2 text-xs text-gray-400"><span>{total} {L.documents}</span><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-md border border-gray-700 px-2 py-1 disabled:opacity-40">{L.prev}</button><span>{page}/{maxPage}</span><button disabled={page >= maxPage} onClick={() => setPage(p => p + 1)} className="rounded-md border border-gray-700 px-2 py-1 disabled:opacity-40">{L.next}</button></div>}
                    {tab === "invoices" && <span className="text-xs text-gray-500">{L.unchanged}</span>}
                    <button type="button" onClick={onClose} className="ml-auto rounded-lg bg-[#28282b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#38383b]">{L.close}</button>
                </footer>
            </div>
        </div>
    );
}
