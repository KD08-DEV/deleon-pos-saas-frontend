import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { Check, Copy, Inbox, RefreshCw, ShieldCheck, X } from "lucide-react";
import api from "../../lib/api";
import { describeEcfXmlError, downloadFromApi } from "../../lib/ecfXmlDownload.js";

// Receptor electrónico: servicios públicos que la DGII y otros emisores usan para
// enviar e-CF al restaurante, más la lista de e-CF recibidos y su aprobación comercial.
const NOT_RECEIVED_REASONS = {
    1: "Error de especificación",
    2: "Error de firma digital",
    3: "Envío duplicado",
    4: "RNC comprador no corresponde",
};
const COMMERCIAL_LABELS = { pending: "Pendiente", approved: "Aprobado", rejected: "Rechazado" };
const ISSUER_DELIVERY_LABELS = {
    pending: "enviando…",
    delivered: "entregada",
    not_electronic: "no es receptor electrónico",
    failed: "no se pudo entregar",
};
const ERROR_MESSAGES = {
    ISSUER_RNC_REQUIRED: "Primero registra el RNC del emisor en esta configuración.",
    REJECTION_REASON_REQUIRED: "Escribe el motivo del rechazo.",
    COMMERCIAL_DECISION_ALREADY_MADE: "Este e-CF ya tiene una decisión comercial.",
    ECF_NOT_RECEIVED: "Solo se pueden aprobar o rechazar e-CF recibidos.",
    DGII_COMMERCIAL_APPROVAL_FAILED: "La DGII no aceptó la aprobación comercial. Revisa el mensaje y vuelve a intentarlo.",
    RECEIVED_ECF_DATA_INCOMPLETE: "Al e-CF recibido le faltan datos (fecha o monto).",
};

const money = (n) => (n === null || n === undefined ? "—"
    : `RD$${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

function errorText(error) {
    const code = error?.response?.data?.code;
    return ERROR_MESSAGES[code] || error?.response?.data?.message || "No se pudo completar la operación.";
}

function CopyRow({ label, value, hint }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            enqueueSnackbar("No se pudo copiar. Selecciona el texto y cópialo.", { variant: "warning" });
        }
    };
    return (
        <div className="rounded-lg border border-gray-800 bg-[#151517] p-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-300">{label}</p>
                <button type="button" onClick={copy} aria-label={`Copiar ${label}`}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-800">
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copiado" : "Copiar"}
                </button>
            </div>
            <p className="mt-1 break-all font-mono text-xs text-sky-300">{value}</p>
            {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
        </div>
    );
}

export default function EcfReceptorPanel() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [rejecting, setRejecting] = useState(null);
    const [reason, setReason] = useState("");

    const configQuery = useQuery({
        queryKey: ["ecf-receptor-config"],
        queryFn: async () => (await api.get("/api/admin/ecf/receptor")).data?.data,
        retry: 0,
    });
    const receptor = configQuery.data;

    const receivedQuery = useQuery({
        queryKey: ["ecf-received", page],
        queryFn: async () => (await api.get("/api/admin/ecf/received", { params: { page } })).data?.data,
        enabled: Boolean(receptor?.enabled),
        retry: 0,
    });

    const configMutation = useMutation({
        mutationFn: async (body) => (await api.post("/api/admin/ecf/receptor", body)).data?.data,
        onSuccess: (data) => {
            queryClient.setQueryData(["ecf-receptor-config"], data);
            enqueueSnackbar("Configuración del receptor actualizada.", { variant: "success" });
        },
        onError: (error) => enqueueSnackbar(errorText(error), { variant: "error" }),
    });

    const decisionMutation = useMutation({
        mutationFn: async ({ id, approve, reason: why }) =>
            (await api.post(`/api/admin/ecf/received/${id}/commercial`, { approve, reason: why })).data,
        onSuccess: (_data, vars) => {
            setRejecting(null);
            setReason("");
            queryClient.invalidateQueries({ queryKey: ["ecf-received"] });
            enqueueSnackbar(vars.approve ? "Aprobación comercial emitida." : "Rechazo comercial emitido.", { variant: "success" });
        },
        onError: (error) => {
            queryClient.invalidateQueries({ queryKey: ["ecf-received"] });
            enqueueSnackbar(errorText(error), { variant: "error" });
        },
    });

    const download = async (doc, kind) => {
        try {
            await downloadFromApi(api, `/api/admin/ecf/received/${doc._id}/xml`, { kind }, `${kind}_${doc.eNCF || doc._id}.xml`);
        } catch (error) {
            enqueueSnackbar(await describeEcfXmlError(error), { variant: "error" });
        }
    };

    const confirmRotate = () => {
        if (window.confirm("Al cambiar la clave cambian las URL. Tendrás que actualizarlas en el portal de la DGII. ¿Continuar?")) {
            configMutation.mutate({ action: "rotate" });
        }
    };

    if (configQuery.isLoading) {
        return <div className="rounded-xl border border-gray-800 p-4 text-sm text-gray-400">Cargando receptor electrónico...</div>;
    }
    if (configQuery.isError) {
        return (
            <div className="rounded-xl border border-gray-800 p-4 text-sm text-gray-400">
                El receptor electrónico estará disponible cuando la configuración e-CF esté guardada.
            </div>
        );
    }

    const docs = receivedQuery.data?.documents || [];
    const totalPages = Math.max(1, Math.ceil((receivedQuery.data?.total || 0) / (receivedQuery.data?.pageSize || 30)));

    return (
        <div className="space-y-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Inbox size={18} className="text-sky-300" />
                        <h3 className="text-sm font-semibold text-white">Recepción de e-CF (receptor electrónico)</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${receptor?.enabled
                            ? "bg-emerald-500/15 text-emerald-300" : "bg-gray-700/60 text-gray-300"}`}>
                            {receptor?.enabled ? "Activo" : "Inactivo"}
                        </span>
                    </div>
                    <p className="mt-1 max-w-3xl text-xs text-gray-400">
                        Son las direcciones donde la DGII y tus proveedores te envían e-CF y aprobaciones comerciales.
                        La DGII las pide en la solicitud de certificación y en las pruebas de recepción. Cada e-CF recibido
                        se responde al instante con un acuse de recibo firmado con tu certificado.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {receptor?.enabled ? (
                        <button type="button" disabled={configMutation.isPending} onClick={() => configMutation.mutate({ action: "disable" })}
                            className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50">
                            Desactivar
                        </button>
                    ) : (
                        <button type="button" disabled={configMutation.isPending} onClick={() => configMutation.mutate({ action: "enable" })}
                            className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-black hover:bg-sky-400 disabled:opacity-50">
                            Activar receptor
                        </button>
                    )}
                    {receptor?.urls && (
                        <button type="button" disabled={configMutation.isPending} onClick={confirmRotate}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50">
                            <RefreshCw size={12} /> Cambiar clave
                        </button>
                    )}
                </div>
            </div>

            {!receptor?.certificateReady && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                    Sube el certificado digital antes de recibir e-CF: con él se firma cada acuse de recibo.
                </p>
            )}

            {receptor?.urls && (
                <>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <CopyRow label="URL Recepción" value={receptor.urls.recepcion} />
                        <CopyRow label="URL Aprobación Comercial" value={receptor.urls.aprobacionComercial} />
                        <CopyRow label="URL Autenticación" value={receptor.urls.autenticacion}
                            hint="Semilla. La validación del certificado está en .../fe/autenticacion/api/validacioncertificado." />
                        <CopyRow label="Dirección base" value={receptor.urls.base}
                            hint="Si el portal de la DGII pide solo la dirección base, usa esta." />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-300">
                        <input type="checkbox" checked={receptor.requireAuth}
                            disabled={configMutation.isPending}
                            onChange={(e) => configMutation.mutate({ action: "setAuth", requireAuth: e.target.checked })} />
                        <ShieldCheck size={14} className="text-emerald-300" />
                        Exigir autenticación con token (recomendado). Desactívalo solo si no registras la URL de autenticación en la DGII.
                    </label>
                </>
            )}

            {receptor?.enabled && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">e-CF recibidos</h4>
                        <button type="button" onClick={() => receivedQuery.refetch()} aria-label="Actualizar e-CF recibidos"
                            className="rounded-md border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    {receivedQuery.isLoading ? (
                        <p className="text-xs text-gray-500">Cargando...</p>
                    ) : docs.length === 0 ? (
                        <p className="text-xs text-gray-500">Todavía no has recibido e-CF.</p>
                    ) : (
                        <div className="space-y-2">
                            {docs.map((doc) => {
                                const commercial = doc.commercial?.status || "pending";
                                const canDecide = doc.status === "received" && commercial === "pending";
                                return (
                                    <div key={doc._id} className="rounded-lg border border-gray-800 bg-[#111113] p-3 text-xs">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-white">
                                                    E{doc.documentType || "?"} · <span className="text-sky-300">{doc.eNCF}</span>
                                                </p>
                                                <p className="text-gray-400">
                                                    {doc.razonSocialEmisor || "Emisor"} · RNC {doc.rncEmisor} · {doc.fechaEmision || "—"}
                                                </p>
                                                <p className="text-gray-300">{money(doc.montoTotal)}</p>
                                                <p className={doc.status === "received" ? "text-emerald-300" : "text-rose-300"}>
                                                    Acuse: {doc.status === "received" ? "Recibido"
                                                        : `No recibido (${NOT_RECEIVED_REASONS[doc.notReceivedCode] || "motivo desconocido"})`}
                                                </p>
                                                {doc.status === "received" && (
                                                    <p className="text-gray-300">
                                                        Comercial: {COMMERCIAL_LABELS[commercial]}
                                                        {doc.commercial?.reason ? ` · ${doc.commercial.reason}` : ""}
                                                        {ISSUER_DELIVERY_LABELS[doc.commercial?.issuerDelivery?.status] && (
                                                            <span className="text-gray-400"> · Emisor: {ISSUER_DELIVERY_LABELS[doc.commercial.issuerDelivery.status]}</span>
                                                        )}
                                                        {doc.commercial?.dgii?.ok === false && (
                                                            <span className="text-rose-300"> · DGII: {(doc.commercial.dgii.mensajes || []).join(" ") || "rechazado"}</span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button type="button" onClick={() => download(doc, "ecf")}
                                                    className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-500/20">XML</button>
                                                <button type="button" onClick={() => download(doc, "acuse")}
                                                    className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-500/20">Acuse</button>
                                                {commercial !== "pending" && (
                                                    <button type="button" onClick={() => download(doc, "acecf")}
                                                        className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-500/20">Aprobación</button>
                                                )}
                                                {canDecide && (
                                                    <>
                                                        <button type="button" disabled={decisionMutation.isPending}
                                                            onClick={() => decisionMutation.mutate({ id: doc._id, approve: true })}
                                                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50">
                                                            <Check size={12} /> Aprobar
                                                        </button>
                                                        <button type="button" disabled={decisionMutation.isPending}
                                                            onClick={() => { setRejecting(doc._id); setReason(""); }}
                                                            className="inline-flex items-center gap-1 rounded-md bg-rose-500 px-2 py-1 font-semibold text-white hover:bg-rose-400 disabled:opacity-50">
                                                            <X size={12} /> Rechazar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {rejecting === doc._id && (
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <input value={reason} maxLength={250} onChange={(e) => setReason(e.target.value)}
                                                    placeholder="Motivo del rechazo (máximo 250 caracteres)"
                                                    className="min-w-0 flex-1 rounded-md border border-gray-700 bg-[#1e1e21] px-2 py-1.5 text-xs text-white" />
                                                <button type="button" disabled={!reason.trim() || decisionMutation.isPending}
                                                    onClick={() => decisionMutation.mutate({ id: doc._id, approve: false, reason: reason.trim() })}
                                                    className="rounded-md bg-rose-500 px-2 py-1.5 font-semibold text-white disabled:opacity-50">Confirmar rechazo</button>
                                                <button type="button" onClick={() => setRejecting(null)}
                                                    className="rounded-md border border-gray-700 px-2 py-1.5 text-gray-200">Cancelar</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                                    className="rounded border border-gray-700 px-2 py-1 disabled:opacity-40">Anterior</button>
                                <span>{page}/{totalPages}</span>
                                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                                    className="rounded border border-gray-700 px-2 py-1 disabled:opacity-40">Siguiente</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
