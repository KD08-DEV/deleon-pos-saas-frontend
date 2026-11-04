import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, FileSearch, RefreshCcw, ShieldAlert, X } from "lucide-react";
import api from "../../lib/api";

const STATUS_NAMES = {
  claimed: "Solicitud recibida", reserving: "Reservando número", reserved: "Número reservado",
  xml_generated: "XML generado", signed: "XML firmado", dispatching: "Enviando a DGII",
  submitted: "Enviado", track_received: "TrackId recibido", pending: "Pendiente",
  needs_review: "Revisión necesaria", accepted: "Aceptado",
  accepted_with_observation: "Aceptado con observación", rejected: "Rechazado", cancelled: "Cancelado",
  draft: "Borrador",
};
const FINISHED = new Set(["accepted", "accepted_with_observation", "rejected", "cancelled"]);
const readableDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" });
};
const errorText = (error) => {
  const code = error?.response?.data?.code || error?.response?.data?.message || error?.message;
  const messages = {
    ECF_NO_TRACK_REQUIRES_MANUAL_DGII_VERIFICATION: "No existe evidencia suficiente para consultar de forma automática. Verifica el e-NCF en el portal de DGII antes de tomar cualquier decisión.",
    ECF_RECONCILIATION_QUERY_FAILED: "No fue posible consultar el estado. El comprobante permanece protegido; no vuelvas a emitirlo.",
    ECF_UNRECOGNIZED_DGII_STATUS: "DGII respondió con un estado que esta versión no reconoce. Es necesaria revisión manual.",
    ECF_DOCUMENT_NOT_FOUND: "El documento no está disponible en esta sucursal.",
    ECF_PERMISSION_DENIED: "No tienes permiso para consultar este comprobante.",
  };
  return messages[code] || String(code || "No fue posible consultar el documento.");
};

export default function EcfIncidentsModal({ onClose, tenantId, clientId }) {
  const [mode, setMode] = useState("attempts");
  const [filter, setFilter] = useState("open");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [showPendingHelp, setShowPendingHelp] = useState(false);
  const [showExample, setShowExample] = useState(false);
  // Solo en Vite DEV. La demostración jamás guarda documentos ni llama a DGII.
  const canShowVisualExample = import.meta.env.DEV;
  const queryClient = useQueryClient();
  useEffect(() => {
    const onEscape = (event) => { if (event.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose]);
  useEffect(() => setPage(1), [mode, filter]);

  // La caché de React Query NUNCA debe reutilizar incidentes de otra sede.
  // Los IDs solo identifican la caché; el backend determina el scope desde la sesión.
  const queryKey = ["ecf-incidents", tenantId || "NO_TENANT", clientId || "default", mode, filter, page];
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get("/api/admin/ecf/incidents", { params: { mode, filter, page } });
      return response.data?.data;
    },
    retry: 0,
    staleTime: 5000,
  });
  const reconcile = useMutation({
    mutationFn: async (item) => {
      if (!item.orderId || !item.documentId) throw new Error("Documento sin referencia a orden; requiere revisión manual.");
      return (await api.post(`/api/order/${encodeURIComponent(item.orderId)}/ecf/reconcile`, {
        documentId: item.documentId,
      })).data;
    },
    onSuccess: async (response) => {
      const status = response?.data?.status || "";
      setNotice(response?.unchanged ? "El documento ya tenía un estado final; no se alteró." :
        `Consulta completada. Estado: ${STATUS_NAMES[status] || status || "registrado"}.`);
      await queryClient.invalidateQueries({ queryKey: ["ecf-incidents", tenantId || "NO_TENANT", clientId || "default"] });
    },
    onError: (err) => setNotice(errorText(err)),
  });
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = Number(data?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const modal = (
    <div role="presentation" className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/85 px-3 pt-4 pb-24 sm:px-5 sm:pt-10"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="ecf-incident-title"
        className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-[#131416] text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-[#151618] p-5">
          <div>
            <h2 id="ecf-incident-title" className="flex items-center gap-2 text-lg font-bold"><ShieldAlert size={20} className="text-amber-400"/> Conciliación e incidentes e-CF</h2>
            <p className="mt-1 text-xs text-gray-400">Consulta de la sucursal seleccionada, incluso con e-CF desactivado. No se envían documentos ni se reservan nuevos e-NCF.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar incidentes" className="rounded-lg p-2 text-gray-300 hover:bg-white/10"><X size={19}/></button>
        </div>
        <div className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[["attempts", "Intentos de emisión"], ["documents", "Documentos fiscales"]].map(([value, label]) => (
              <button key={value} type="button" onClick={() => { setMode(value); setNotice(""); }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode === value ? "bg-amber-400 text-black" : "border border-white/15 bg-white/5 text-gray-200 hover:bg-white/10"}`}>{label}</button>
            ))}
            {/* Botones de alto contraste en lugar de un <select> nativo con opciones ilegibles en Windows. */}
            <div role="group" aria-label="Filtrar estado"
              className="flex max-w-full flex-wrap gap-1 rounded-xl border border-slate-600 bg-[#090c13] p-1">
              {[
                ["open", "Pendientes"],
                ["finished", "Finalizados"],
                ["all", "Todos"],
              ].map(([value, label]) => (
                <button key={value} type="button" aria-pressed={filter === value}
                  onClick={() => { setFilter(value); setNotice(""); }}
                  className={`min-h-[36px] rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
                    filter === value
                      ? "bg-amber-400 text-black shadow-sm"
                      : "bg-[#232937] text-white hover:bg-[#384153]"
                  }`}>{label}</button>
              ))}
            </div>
            <button type="button" onClick={() => { setNotice(""); refetch(); }} className="ml-auto flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10" disabled={isFetching}><RefreshCcw size={14} className={isFetching ? "animate-spin" : ""}/> Actualizar</button>
          </div>
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            <AlertTriangle size={17} className="mt-0.5 shrink-0"/>
            <span>Si aparece <strong>reserva incierta</strong> o falta el TrackId, conserva el bloqueo y realiza una comprobación manual. Nunca crees otra factura para resolver un error de conexión.</span>
          </div>
          <div className="mb-4 rounded-xl border border-slate-700 bg-[#181d29] p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">¿Por qué no aparecen pendientes?</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-200">
                  Un pendiente se registra automáticamente cuando una emisión no tiene resultado definitivo.
                  En Sandbox interno los comprobantes suelen aceptarse de inmediato.
                </p>
              </div>
              <button type="button" aria-expanded={showPendingHelp} onClick={() => setShowPendingHelp((v) => !v)}
                className="min-h-[36px] rounded-lg border border-slate-500 bg-[#293345] px-3 py-2 text-sm font-semibold text-white hover:bg-[#36445a]">
                {showPendingHelp ? "Ocultar explicación" : "Cómo probar pendientes"}
              </button>
            </div>
            {showPendingHelp && (
              <div className="mt-3 border-t border-slate-600 pt-3 text-sm leading-relaxed text-slate-200">
                <p>Una emisión puede quedar en espera del estado de DGII (por ejemplo, con TrackId) o en revisión manual si la comunicación falla sin evidencia suficiente.</p>
                <p className="mt-2">Para probar la conciliación real utiliza una <strong>pasarela DGII simulada</strong> y una base de desarrollo aislada. No modifiques facturas aceptadas ni insertes e-NCF ficticios en producción.</p>
                <p className="mt-2 text-amber-200">Los filtros funcionan con registros reales de la sucursal. El ejemplo visual, cuando está disponible, es completamente independiente de esos registros.</p>
              </div>
            )}
            {canShowVisualExample && (
              <button type="button" onClick={() => setShowExample((v) => !v)}
                className="mt-3 min-h-[36px] rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/20">
                {showExample ? "Ocultar ejemplo visual" : "Ver ejemplo de un pendiente (sin guardar)"}
              </button>
            )}
          </div>
          {canShowVisualExample && showExample && (
            <div role="note" className="mb-4 space-y-3 rounded-xl border-2 border-dashed border-amber-400 bg-[#29200c] p-4" data-ecf-example="visual-only">
              <p className="text-sm font-bold text-amber-200">DEMOSTRACIÓN LOCAL — NO ES UNA FACTURA NI UN INCIDENTE REAL</p>
              <p className="text-xs text-amber-100">Solo ilustra la apariencia. No consulta DGII, no hace solicitudes y no guarda nada en MongoDB.</p>
              <div className="rounded-lg border border-amber-600/50 bg-[#141414] p-3">
                <p className="text-sm font-semibold text-white">E32 · Ejemplo sin e-NCF real</p>
                <p className="mt-1 text-xs text-amber-200">Estado: TrackId recibido — pendiente de consulta</p>
                <p className="mt-1 text-xs text-gray-200">TrackId: EJEMPLO-NO-REAL</p>
                <button type="button" disabled className="mt-3 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-300 opacity-75">Consultar estado (no disponible en demostración)</button>
              </div>
              <div className="rounded-lg border border-red-600/40 bg-[#141414] p-3">
                <p className="text-sm font-semibold text-white">Reserva incierta de ejemplo</p>
                <p className="mt-1 text-xs text-red-200">Sin TrackId — requiere revisión manual. No se debe emitir un segundo documento.</p>
              </div>
            </div>
          )}
          {notice && <div role="status" className="mb-4 rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-sm text-sky-100">{notice}</div>}
          {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">{errorText(error)}</p>}
          {isLoading && <p className="py-10 text-center text-gray-400">Consultando registros…</p>}
          {!isLoading && !error && items.length === 0 && <div className="flex flex-col items-center gap-2 py-12 text-center text-gray-400"><CheckCircle2 size={30}/><p>No hay registros reales para este filtro en esta sucursal. No necesitas crear pendientes manualmente.</p></div>}
          {!isLoading && !error && items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => {
                const done = FINISHED.has(item.status);
                const canQuery = !done && !item.needsManualReview && !!item.orderId && !!item.documentId;
                return <div key={`${item.source}:${item.id}`} className="rounded-xl border border-white/10 bg-[#1c1d20] p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">E{item.documentType || "?"} · {item.eNCF || "Sin e-NCF conocido"}</span>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${done ? "bg-emerald-500/15 text-emerald-200" : item.status === "needs_review" ? "bg-red-500/15 text-red-200" : "bg-amber-500/15 text-amber-200"}`}>{STATUS_NAMES[item.status] || item.status || "Sin estado"}</span>
                      </div>
                      <p className="break-all text-xs text-gray-400">Orden: {item.orderId || "No asociada"} · TrackId: {item.trackId || "No disponible"}</p>
                      <p className="text-xs text-gray-400">Creado: {readableDate(item.createdAt)} · Última consulta: {readableDate(item.lastCheckedAt)}</p>
                      {item.errorCode && <p className="text-xs text-red-300">Incidente: {item.errorCode}</p>}
                      {!done && item.needsManualReview && <p className="flex items-center gap-1 text-xs text-amber-300"><Clock3 size={13}/> Revisión manual: no hay evidencia suficiente para consultar automáticamente.</p>}
                    </div>
                    <button type="button" disabled={!canQuery || reconcile.isPending}
                      onClick={() => { setNotice(""); reconcile.mutate(item); }}
                      title={canQuery ? "Consultar el estado del documento existente" : "Consulta automática no disponible para este registro"}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40">
                      <FileSearch size={14}/> Consultar estado
                    </button>
                  </div>
                </div>;
              })}
            </div>
          )}
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <span className="text-xs text-gray-400">{total} registros · Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || isFetching} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-30">Anterior</button>
              <button type="button" disabled={page >= totalPages || isFetching} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-30">Siguiente</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
  return createPortal(modal, document.body);
}
