import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight, History, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import OrderCorrectionHistory from "./OrderCorrectionHistory";

const messages = {
  es: {
    title: "Historial de correcciones", subtitle: "Todas las correcciones de órdenes de la sucursal activa, no solo las últimas 24 horas.",
    search: "Buscar responsable, motivo, orden o código COR…", from: "Desde", to: "Hasta", clear: "Limpiar filtros",
    loading: "Cargando correcciones…", empty: "No hay correcciones registradas para estos filtros.",
    error: "No se pudo cargar el historial. Comprueba la conexión y tus permisos.",
    forbidden: "No tienes permiso para consultar el historial de correcciones.",
    order: "Orden", actor: "Responsable", reason: "Motivo", before: "Antes", after: "Después", detail: "Ver detalle",
    previous: "Anterior", next: "Siguiente", close: "Cerrar", results: "correcciones", page: "Página", of: "de", code: "Código",
    change: "Diferencia", noNumber: "Sin número", deleted: "Usuario no disponible",
  },
  en: {
    title: "Correction history", subtitle: "All order corrections for the active branch, not just the last 24 hours.",
    search: "Search user, reason, order, or COR code…", from: "From", to: "To", clear: "Clear filters",
    loading: "Loading corrections…", empty: "There are no corrections matching these filters.",
    error: "Unable to load history. Check your connection and permissions.",
    forbidden: "You do not have permission to view correction history.",
    order: "Order", actor: "Performed by", reason: "Reason", before: "Before", after: "After", detail: "View details",
    previous: "Previous", next: "Next", close: "Close", results: "corrections", page: "Page", of: "of", code: "Code",
    change: "Difference", noNumber: "No number", deleted: "User unavailable",
  },
};

export default function OrderCorrectionGlobalHistory({ onClose }) {
  const { i18n } = useTranslation();
  const language = String(i18n.resolvedLanguage || i18n.language || "es").startsWith("en") ? "en" : "es";
  const tr = messages[language];
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [detailOrderId, setDetailOrderId] = useState(null);
  const clientId = String(localStorage.getItem("clientId") || "default");
  const tenantId = String(localStorage.getItem("tenantId") || "");

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [search]);
  useEffect(() => { setPage(1); }, [debouncedSearch, from, to]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => { if (event.key === "Escape") detailOrderId ? setDetailOrderId(null) : onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [detailOrderId, onClose]);

  const invalidDates = Boolean(from && to && from > to);
  const { data: response, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["order-global-corrections", tenantId, clientId, page, debouncedSearch, from, to],
    queryFn: async () => {
      const { data } = await api.get("/api/order/correction/history", {
        params: { page, pageSize: 15, search: debouncedSearch || undefined, from: from || undefined, to: to || undefined },
      });
      return data;
    },
    enabled: !invalidDates,
    staleTime: 15000,
    retry: false,
  });
  const rows = useMemo(() => Array.isArray(response?.data) ? response.data : [], [response]);
  const pagination = response?.pagination || { page: 1, pages: 1, total: 0 };
  const fmtMoney = (n) => Number(n ?? 0).toLocaleString(language === "en" ? "en-US" : "es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (at) => {
    if (!at) return "—";
    const d = new Date(at);
    return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat(language === "en" ? "en-US" : "es-DO", { dateStyle: "medium", timeStyle: "short" }).format(d);
  };
  const resetFilters = () => { setSearch(""); setFrom(""); setTo(""); setPage(1); };

  if (detailOrderId) {
    return <OrderCorrectionHistory orderId={detailOrderId} onClose={() => setDetailOrderId(null)} />;
  }

  return createPortal(
    <div className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/80 px-2 sm:px-4"
      style={{ paddingTop: "max(12px,env(safe-area-inset-top,0px))", paddingBottom: "calc(7rem + env(safe-area-inset-bottom,0px))" }}
      onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={tr.title} onClick={e => e.stopPropagation()}
        className="flex h-full min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-sky-500/25 bg-[#151515] text-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold"><History className="h-5 w-5 shrink-0 text-sky-400" />{tr.title}</h2>
            <p className="mt-1 text-xs text-gray-400">{tr.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-2 hover:bg-white/10" aria-label={tr.close}>
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="shrink-0 space-y-3 border-b border-white/10 p-4 sm:px-6">
          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#242424] px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={tr.search}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500" />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-gray-400 sm:flex-none">{tr.from}
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#242424] px-2.5 py-2 text-sm text-white" />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-gray-400 sm:flex-none">{tr.to}
              <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#242424] px-2.5 py-2 text-sm text-white" />
            </label>
            <button type="button" onClick={resetFilters} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-gray-300 hover:bg-white/10">{tr.clear}</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:px-6">
          {invalidDates && <p role="alert" className="rounded-lg bg-sky-900/20 p-3 text-sm text-sky-200">{language === "en" ? "End date must not be earlier than start date." : "La fecha final no puede ser anterior a la inicial."}</p>}
          {isError && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-950/40 p-4 text-sm text-red-200">{error?.response?.status === 403 ? tr.forbidden : tr.error}</p>}
          {isLoading && !invalidDates && <p className="py-8 text-center text-sm text-gray-400">{tr.loading}</p>}
          {!invalidDates && !isLoading && !isError && rows.length === 0 && <p className="rounded-xl bg-white/5 p-6 text-center text-sm text-gray-400">{tr.empty}</p>}
          {!invalidDates && !isError && rows.map((entry, idx) => {
            const delta = Number(entry.nextTotal ?? 0) - Number(entry.previousTotal ?? 0);
            return <article key={`${entry.orderId}:${entry.code || entry.at || idx}`} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">{tr.order} #{entry.orderNumber || String(entry.orderId || "").slice(-8) || tr.noNumber}</div>
                  <div className="text-xs text-gray-400">{tr.actor}: <span className="text-gray-200">{entry.actorName || tr.deleted}</span></div>
                  <time className="block text-xs text-gray-400">{fmtDate(entry.at)}</time>
                </div>
                <span className="rounded-md bg-sky-500/10 px-2 py-1 font-mono text-xs text-sky-200">{entry.code || "—"}</span>
              </div>
              <p className="mt-3 break-words text-sm text-gray-200">{entry.reason || "—"}</p>
              <div className="mt-3 flex flex-wrap gap-2">{(entry.changed || []).map((name, i) => <span key={`${name}:${i}`} className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-gray-300">{name}</span>)}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-black/20 p-3 text-xs">
                <div><div className="text-gray-400">{tr.before}</div><strong className="text-sm">{fmtMoney(entry.previousTotal)}</strong></div>
                <div><div className="text-gray-400">{tr.after}</div><strong className="text-sm">{fmtMoney(entry.nextTotal)}</strong></div>
                <div><div className="text-gray-400">{tr.change}</div><strong className={`text-sm ${delta >= 0 ? "text-emerald-300" : "text-sky-300"}`}>{delta > 0 ? "+" : ""}{fmtMoney(delta)}</strong></div>
              </div>
              <div className="mt-3 flex justify-end"><button type="button" onClick={() => setDetailOrderId(entry.orderId)}
                className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/20">
                {tr.detail}<ArrowRight className="h-4 w-4" />
              </button></div>
            </article>;
          })}
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-white/10 px-4 py-3 sm:px-6">
          <p className="text-xs text-gray-400">{pagination.total} {tr.results} · {tr.page} {pagination.page} {tr.of} {pagination.pages}{isFetching && !isLoading ? " …" : ""}</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || isFetching} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs disabled:opacity-40"><ChevronLeft className="h-4 w-4" />{tr.previous}</button>
            <button type="button" disabled={page >= pagination.pages || isFetching} onClick={() => setPage(p => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs disabled:opacity-40">{tr.next}<ChevronRight className="h-4 w-4" /></button>
          </div>
        </footer>
      </section>
    </div>, document.body,
  );
}
