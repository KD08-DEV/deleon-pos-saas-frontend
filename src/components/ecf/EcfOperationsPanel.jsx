import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { Ban, Activity, RefreshCw, RotateCcw } from "lucide-react";
import api from "../../lib/api";
import { describeEcfXmlError, downloadFromApi } from "../../lib/ecfXmlDownload.js";

// Operaciones e-CF: seguimiento automático con la DGII (consultas, contingencia y
// envíos a compradores electrónicos) y anulación de secuencias no usadas (ANECF).
const TYPES = [
    ["31", "E31 Crédito Fiscal"], ["32", "E32 Consumo"], ["33", "E33 Nota de Débito"], ["34", "E34 Nota de Crédito"],
    ["41", "E41 Compras"], ["43", "E43 Gastos Menores"], ["44", "E44 Regímenes Especiales"],
    ["45", "E45 Gubernamental"], ["46", "E46 Exportaciones"], ["47", "E47 Pagos al Exterior"],
];
const STATUS_LABELS = { signed: "Firmado sin enviar", submitted: "Enviado", track_received: "En proceso DGII" };
const DELIVERY_LABELS = {
    pending: "Enviando", delivered: "Entregado", not_received: "El receptor no lo aceptó",
    failed: "No se pudo entregar", not_electronic: "No es receptor electrónico",
};
const SYNC_ERRORS = {
    RESUBMIT_REQUIRES_MANUAL_REVIEW: "En CerteCF no se puede saber si llegó a la DGII. Verifícalo en el portal y usa \"Reintentar\".",
    ENVIRONMENT_CHANGED: "Se emitió en otro ambiente; no se consulta con las credenciales actuales.",
    SIGNED_XML_MISSING: "No se guardó el XML firmado; revisar manualmente.",
    MAX_CHECKS_REACHED: "La DGII no dio respuesta final después de muchos intentos.",
};
const ANNUL_ERRORS = {
    ANNULMENT_CONFIRMATION_REQUIRED: "Confirma la anulación.",
    ANNULMENT_TYPE_NOT_ALLOWED: "Ese tipo de e-CF no se puede anular.",
    ANNULMENT_SEQUENCE_INVALID: "Escribe números de secuencia válidos (por ejemplo 15 o E320000000015).",
    ANNULMENT_TYPE_MISMATCH: "El e-NCF escrito no corresponde al tipo elegido.",
    ANNULMENT_RANGE_INVERTED: "La secuencia \"desde\" no puede ser mayor que \"hasta\".",
    ANNULMENT_LEAVES_GAP: "No puedes anular secuencias más adelante de la próxima: empieza desde la próxima secuencia o antes.",
    ANNULMENT_OUTSIDE_AUTHORIZED_RANGE: "El rango está fuera del rango autorizado por la DGII.",
    ANNULMENT_RANGE_HAS_ISSUED_DOCUMENTS: "El rango incluye e-CF ya emitidos o en proceso; esos no se anulan.",
    ANNULMENT_ALREADY_SENT: "Parte de ese rango ya fue anulada.",
    ANNULMENT_TOO_MANY_SEQUENCES: "Demasiadas secuencias en una sola anulación.",
    DGII_SERVICE_NOT_AVAILABLE_IN_CERTIFICATION: "La DGII no ofrece anulación en el ambiente de certificación (CerteCF).",
    ECF_ISSUER_RNC_REQUIRED: "Primero registra el RNC del emisor.",
    DGII_ANNULMENT_FAILED: "La DGII no aceptó la anulación. Revisa el mensaje.",
};
const ANNUL_STATUS = { sent: "Enviada a la DGII", simulated: "Simulada (sandbox)", failed: "Rechazada / falló" };

const when = (d) => (d ? new Date(d).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" }) : "—");
const errText = (error, map) => {
    const data = error?.response?.data;
    return map[data?.code] || data?.message || "No se pudo completar la operación.";
};

export default function EcfOperationsPanel() {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ tipo: "32", desde: "", hasta: "" });

    const syncQuery = useQuery({
        queryKey: ["ecf-sync-overview"],
        queryFn: async () => (await api.get("/api/admin/ecf/sync")).data?.data,
        refetchInterval: 60000,
        retry: 0,
    });
    const annulQuery = useQuery({
        queryKey: ["ecf-annulments"],
        queryFn: async () => (await api.get("/api/admin/ecf/annulments")).data?.data,
        retry: 0,
    });

    const retryMutation = useMutation({
        mutationFn: async ({ id, kind }) => (await api.post(`/api/admin/ecf/sync/${id}/retry`, { kind })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ecf-sync-overview"] });
            enqueueSnackbar("Se volverá a intentar en el próximo minuto.", { variant: "success" });
        },
        onError: (error) => enqueueSnackbar(errText(error, {}), { variant: "error" }),
    });

    const annulMutation = useMutation({
        mutationFn: async (body) => (await api.post("/api/admin/ecf/annulments", body)).data?.data,
        onSuccess: (data) => {
            setForm((f) => ({ ...f, desde: "", hasta: "" }));
            queryClient.invalidateQueries({ queryKey: ["ecf-annulments"] });
            enqueueSnackbar(data?.status === "simulated" ? "Anulación simulada (sandbox)." : "Anulación enviada a la DGII.", { variant: "success" });
        },
        onError: (error) => {
            queryClient.invalidateQueries({ queryKey: ["ecf-annulments"] });
            const msgs = error?.response?.data?.data?.dgii?.mensajes || [];
            enqueueSnackbar(`${errText(error, ANNUL_ERRORS)}${msgs.length ? ` ${msgs.join(" ")}` : ""}`, { variant: "error" });
        },
    });

    const submitAnnulment = () => {
        const desde = form.desde.trim();
        const hasta = (form.hasta.trim() || desde);
        if (!desde) return enqueueSnackbar("Escribe la secuencia desde.", { variant: "warning" });
        const ok = window.confirm(`Vas a anular E${form.tipo} desde ${desde} hasta ${hasta}. Esas secuencias no se podrán usar nunca. ¿Continuar?`);
        if (ok) annulMutation.mutate({ confirm: true, ranges: [{ tipo: form.tipo, desde, hasta }] });
        return undefined;
    };

    const downloadAnnulment = async (doc) => {
        try {
            await downloadFromApi(api, `/api/admin/ecf/annulments/${doc._id}/xml`, {}, `ANECF_${doc._id}.xml`);
        } catch (error) {
            enqueueSnackbar(await describeEcfXmlError(error), { variant: "error" });
        }
    };

    const sync = syncQuery.data;
    const annulments = annulQuery.data?.documents || [];
    const input = "rounded-md border border-gray-700 bg-[#1e1e21] px-2 py-1.5 text-xs text-white";

    return (
        <div className="space-y-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Activity size={18} className="text-violet-300" />
                        <h3 className="text-sm font-semibold text-white">Seguimiento automático con la DGII</h3>
                    </div>
                    <p className="mt-1 max-w-3xl text-xs text-gray-400">
                        Cada minuto el sistema consulta los e-CF que quedaron en proceso, recupera los que no llegaron a la DGII
                        por fallas de internet (primero confirma con la DGII que no los tiene) y entrega los e-CF aceptados a los
                        compradores que son receptores electrónicos.
                    </p>
                </div>
                <button type="button" onClick={() => syncQuery.refetch()} aria-label="Actualizar seguimiento"
                    className="rounded-md border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800">
                    <RefreshCw size={14} />
                </button>
            </div>

            {syncQuery.isError ? (
                <p className="text-xs text-gray-500">El seguimiento estará disponible cuando la configuración e-CF esté guardada.</p>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-gray-800 px-3 py-1 text-gray-200">En seguimiento: {sync?.pending ?? "…"}</span>
                        <span className={`rounded-full px-3 py-1 ${sync?.attention?.length ? "bg-amber-500/15 text-amber-200" : "bg-gray-800 text-gray-200"}`}>
                            Requieren revisión: {sync?.attention?.length ?? "…"}
                        </span>
                        {sync && !sync.jobsEnabled && (
                            <span className="rounded-full bg-rose-500/15 px-3 py-1 text-rose-200">Proceso automático desactivado en el servidor</span>
                        )}
                    </div>

                    {sync?.attention?.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Requieren revisión</h4>
                            {sync.attention.map((d) => (
                                <div key={d.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-gray-800 bg-[#111113] p-3 text-xs">
                                    <div>
                                        <p className="font-semibold text-white">{d.eNCF} · {STATUS_LABELS[d.status] || d.status}</p>
                                        <p className="text-amber-200">{SYNC_ERRORS[d.sync.lastError] || d.sync.lastError || "Sin respuesta final"}</p>
                                        <p className="text-gray-500">Intentos: {d.sync.checks} · Último: {when(d.sync.lastCheckedAt)}</p>
                                    </div>
                                    <button type="button" disabled={retryMutation.isPending}
                                        onClick={() => retryMutation.mutate({ id: d.id, kind: "status" })}
                                        className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2 py-1 text-gray-200 hover:bg-gray-800 disabled:opacity-50">
                                        <RotateCcw size={12} /> Reintentar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {sync?.deliveries?.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Entregas a compradores electrónicos</h4>
                            {sync.deliveries.map((d) => (
                                <div key={d.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-gray-800 bg-[#111113] p-3 text-xs">
                                    <div>
                                        <p className="font-semibold text-white">{d.eNCF} · {d.delivery?.receptorName || `RNC ${d.buyer}`}</p>
                                        <p className={d.delivery?.status === "delivered" ? "text-emerald-300" : "text-amber-200"}>
                                            {DELIVERY_LABELS[d.delivery?.status] || d.delivery?.status}
                                            {d.delivery?.lastError ? ` · ${d.delivery.lastError}` : ""}
                                        </p>
                                        <p className="text-gray-500">Intentos: {d.delivery?.attempts || 0} · {when(d.delivery?.deliveredAt)}</p>
                                    </div>
                                    {["failed", "not_received"].includes(d.delivery?.status) && (
                                        <button type="button" disabled={retryMutation.isPending}
                                            onClick={() => retryMutation.mutate({ id: d.id, kind: "delivery" })}
                                            className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2 py-1 text-gray-200 hover:bg-gray-800 disabled:opacity-50">
                                            <RotateCcw size={12} /> Reintentar
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <div className="space-y-3 border-t border-gray-800 pt-4">
                <div className="flex items-center gap-2">
                    <Ban size={16} className="text-rose-300" />
                    <h3 className="text-sm font-semibold text-white">Anular secuencias e-NCF (ANECF)</h3>
                </div>
                <p className="max-w-3xl text-xs text-gray-400">
                    Para secuencias que no se usaron (saltadas, que nunca llegaron a la DGII o sobrantes de un rango).
                    Los e-CF ya emitidos se anulan con una nota de crédito, no aquí. Si el rango incluye la próxima secuencia,
                    el sistema la mueve después del rango. Disponible en TesteCF y producción (en CerteCF la DGII no lo ofrece).
                </p>
                <div className="flex flex-wrap items-end gap-2">
                    <label className="text-xs text-gray-300">Tipo
                        <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} className={`mt-1 block ${input}`}>
                            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </label>
                    <label className="text-xs text-gray-300">Desde
                        <input value={form.desde} onChange={(e) => setForm((f) => ({ ...f, desde: e.target.value }))}
                            placeholder="15 o E320000000015" className={`mt-1 block w-44 ${input}`} />
                    </label>
                    <label className="text-xs text-gray-300">Hasta
                        <input value={form.hasta} onChange={(e) => setForm((f) => ({ ...f, hasta: e.target.value }))}
                            placeholder="igual a desde" className={`mt-1 block w-44 ${input}`} />
                    </label>
                    <button type="button" disabled={annulMutation.isPending} onClick={submitAnnulment}
                        className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50">
                        {annulMutation.isPending ? "Anulando..." : "Anular"}
                    </button>
                </div>

                {annulments.length > 0 && (
                    <div className="space-y-2">
                        {annulments.map((a) => (
                            <div key={a._id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-gray-800 bg-[#111113] p-3 text-xs">
                                <div>
                                    <p className="font-semibold text-white">
                                        {a.ranges.map((r) => `${r.desde} → ${r.hasta}`).join(", ")} · {a.total} secuencia(s)
                                    </p>
                                    <p className={a.status === "failed" ? "text-rose-300" : "text-emerald-300"}>
                                        {ANNUL_STATUS[a.status] || a.status}
                                        {a.dgii?.mensajes?.length ? ` · ${a.dgii.mensajes.join(" ")}` : ""}
                                    </p>
                                    <p className="text-gray-500">{when(a.createdAt)}</p>
                                </div>
                                <button type="button" onClick={() => downloadAnnulment(a)}
                                    className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-500/20">XML</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
