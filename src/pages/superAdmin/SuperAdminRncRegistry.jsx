import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, FileText, RefreshCw, UploadCloud } from "lucide-react";
import api from "../../lib/api";

const formatNumber = (v) => new Intl.NumberFormat("es-DO").format(Number(v || 0));
const statusText = { ready: "Validado; listo para aplicar", running: "Actualizando padrón…", completed: "Actualización finalizada", failed: "Actualización incompleta: revisar error" };
const errorText = {
    INVALID_DGII_RNC_TXT: "El documento no parece ser el TXT oficial DGII_RNC.TXT (11 columnas separadas por |).",
    SOLO_ARCHIVOS_TXT: "Debes seleccionar el archivo DGII_RNC.TXT extraído del ZIP.",
    LIMIT_FILE_SIZE: "Archivo demasiado grande para esta instalación.",
    RNC_IMPORT_ALREADY_RUNNING: "Ya hay una actualización en curso.",
    CONFIRMATION_REQUIRED: "Confirma expresamente la actualización.",
    PREVIEW_EXPIRED_OR_ALREADY_APPLIED: "La validación venció o este documento ya se aplicó. Vuelve a cargarlo.",
};
const getError = e => {
    const code = String(e?.response?.data?.code || e?.response?.data?.message || e?.message || "ERROR");
    return errorText[code] || code;
};

export default function SuperAdminRncRegistry() {
    const [file, setFile] = useState(null);
    const [summary, setSummary] = useState(null);
    const [preview, setPreview] = useState(null);
    const [job, setJob] = useState(null);
    const [confirmation, setConfirmation] = useState("");
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const mounted = useRef(true);

    const refreshSummary = useCallback(async () => {
        try {
            const { data } = await api.get("/api/superadmin/rnc/import/status");
            if (mounted.current) {
                setSummary(data.data);
                if (data.data?.running) setJob(data.data.running);
            }
        } catch (e) { if (mounted.current) setError(getError(e)); }
    }, []);
    useEffect(() => {
        mounted.current = true;
        refreshSummary();
        return () => { mounted.current = false; };
    }, [refreshSummary]);

    useEffect(() => {
        if (job?.status !== "running" || !job?._id) return undefined;
        let busyPolling = false;
        const timer = setInterval(async () => {
            if (busyPolling) return;
            busyPolling = true;
            try {
                const { data } = await api.get(`/api/superadmin/rnc/import/${job._id}`);
                if (mounted.current) {
                    setJob(data.data);
                    if (data.data.status !== "running") void refreshSummary();
                }
            } catch (e) { if (mounted.current) setError(getError(e)); }
            finally { busyPolling = false; }
        }, 2000);
        return () => clearInterval(timer);
    }, [job?._id, job?.status, refreshSummary]);

    const validateFile = async () => {
        if (!file || busy) return;
        setBusy(true); setError(""); setPreview(null); setConfirmation(""); setProgress(0);
        try {
            const form = new FormData();
            form.append("file", file);
            const { data } = await api.post("/api/superadmin/rnc/import/preview", form, {
                timeout: 180000,
                onUploadProgress: ev => {
                    if (ev.total) setProgress(Math.min(100, Math.round((ev.loaded / ev.total) * 100)));
                },
            });
            setPreview(data.data);
        } catch (e) { setError(getError(e)); }
        finally { setBusy(false); }
    };
    const apply = async () => {
        if (!preview?.jobId || confirmation !== "ACTUALIZAR RNC" || busy) return;
        setBusy(true); setError("");
        try {
            const { data } = await api.post(`/api/superadmin/rnc/import/${preview.jobId}/commit`, { confirmation });
            setJob({ _id: data.data.jobId, status: "running", valid: preview.valid, processed: 0 });
            setPreview(null); setConfirmation(""); setFile(null);
        } catch (e) { setError(getError(e)); }
        finally { setBusy(false); }
    };
    const uploading = busy && !preview;
    return (
        <div className="max-w-5xl mx-auto space-y-6 text-gray-100 pb-12">
            <div className="flex flex-wrap justify-between gap-3 items-start">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Database size={25} className="text-sky-400"/> Padrón RNC de la DGII</h1>
                    <p className="text-gray-400 text-sm mt-2">Actualiza las consultas de RNC desde SuperAdmin. No modifica facturas emitidas ni datos fiscales existentes de tus clientes.</p>
                </div>
                <button type="button" onClick={refreshSummary} className="flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 hover:bg-neutral-700 text-sm"><RefreshCw size={16}/> Actualizar estado</button>
            </div>
            {error && <div role="alert" className="rounded-xl border border-red-500/50 bg-red-950/30 p-3 text-sm text-red-200 flex gap-2"><AlertTriangle size={18}/> {error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-neutral-700 bg-[#171717] p-5">
                    <p className="text-gray-400 text-sm">RNC en la base de datos</p>
                    <p className="text-3xl font-bold mt-1">{summary ? formatNumber(summary.total) : "—"}</p>
                </div>
                <div className="rounded-xl border border-neutral-700 bg-[#171717] p-5">
                    <p className="text-gray-400 text-sm">Última actualización completa</p>
                    <p className="text-base font-medium mt-2">{summary?.latest?.completedAt ? new Date(summary.latest.completedAt).toLocaleString("es-DO") : "Sin actualizaciones registradas desde este panel"}</p>
                    {summary?.latest && <p className="text-xs text-gray-400 mt-1">{formatNumber(summary.latest.created)} nuevos · {formatNumber(summary.latest.updated)} modificados</p>}
                </div>
            </div>
            <section className="rounded-xl border border-neutral-700 bg-[#151515] p-5 space-y-4">
                <h2 className="font-semibold text-lg">1. Subir documento oficial</h2>
                <p className="text-sm text-gray-400">Descomprime el ZIP de la DGII y selecciona <strong>DGII_RNC.TXT</strong>. Se aceptan archivos TXT de hasta 150 MB, con columnas separadas por <code>|</code>. Se procesan por lotes.</p>
                <label className="block rounded-xl border border-dashed border-neutral-600 bg-neutral-900/50 p-6 cursor-pointer hover:border-sky-400 transition-colors text-center">
                    <UploadCloud size={26} className="mx-auto mb-2 text-sky-400"/>
                    <span className="text-sm">{file?.name || "Elegir archivo DGII_RNC.TXT"}</span>
                    <input type="file" accept=".txt,text/plain" className="sr-only" disabled={busy || job?.status === "running"} onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); setError(""); }}/>
                </label>
                <button type="button" disabled={!file || busy || job?.status === "running"} onClick={validateFile} className="rounded-lg px-5 py-2.5 font-semibold text-black bg-sky-400 hover:bg-sky-300 disabled:opacity-50 disabled:cursor-not-allowed">
                    {busy ? "Subiendo y validando…" : "Validar documento"}
                </button>
                {uploading && <p className="text-xs text-gray-400" role="status">Envío: {progress}% · Después se analizarán todas las líneas.</p>}
            </section>
            {preview && <section className="rounded-xl border border-emerald-700/50 bg-[#11211b] p-5 space-y-4">
                <h2 className="font-semibold text-lg flex items-center gap-2"><CheckCircle2 size={19} className="text-emerald-400"/> 2. Revisión antes de actualizar</h2>
                <p className="text-sm">Documento: <strong>{preview.filename}</strong></p>
                <div className="flex flex-wrap gap-6 text-sm"><span>Registros válidos: <b>{formatNumber(preview.valid)}</b></span><span>Inválidos omitidos: <b>{formatNumber(preview.invalid)}</b></span></div>
                <div className="overflow-x-auto border border-neutral-700 rounded-lg"><table className="w-full text-left text-sm"><thead className="bg-neutral-800"><tr><th className="px-3 py-2">RNC</th><th className="px-3 py-2">Nombre</th></tr></thead><tbody>{(preview.sample || []).map(row => <tr key={row.rnc} className="border-t border-neutral-700"><td className="px-3 py-2 font-mono">{row.rnc}</td><td className="px-3 py-2">{row.nombre}</td></tr>)}</tbody></table></div>
                <p className="text-sm text-sky-200">Se actualizarán los nombres de RNC existentes y se crearán los nuevos. Se conservan sus _id. Los RNC ausentes del TXT no se borrarán.</p>
                <label className="block text-sm">Para confirmar escribe <strong>ACTUALIZAR RNC</strong><input value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off" className="mt-2 w-full max-w-sm block bg-neutral-900 border border-neutral-600 rounded-lg p-2.5 outline-none focus:border-sky-400" placeholder="ACTUALIZAR RNC"/></label>
                <button type="button" onClick={apply} disabled={busy || confirmation !== "ACTUALIZAR RNC"} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2.5 font-semibold">Confirmar actualización del padrón</button>
            </section>}
            {job && <section className="rounded-xl border border-neutral-700 bg-[#171717] p-5 space-y-3" aria-live="polite">
                <div className="flex items-center gap-2"><FileText size={19} className="text-sky-400"/><h2 className="font-semibold">Estado de la importación</h2></div>
                <p className={job.status === "failed" ? "text-red-300" : job.status === "completed" ? "text-emerald-300" : "text-sky-300"}>{statusText[job.status] || job.status}</p>
                <p className="text-sm text-gray-400">Procesados: {formatNumber(job.processed)} / {formatNumber(job.valid)} · Nuevos: {formatNumber(job.created)} · Modificados: {formatNumber(job.updated)}</p>
                {job.status === "running" && <div className="bg-neutral-800 rounded-full h-2 overflow-hidden"><div className="bg-sky-400 h-full transition-all" style={{ width: `${Math.min(100, Number(job.valid) ? 100 * Number(job.processed || 0) / Number(job.valid) : 0)}%` }}/></div>}
                {job.status === "failed" && <p className="text-red-200 text-sm">Error: {job.errorCode}. Parte de los cambios podría haberse aplicado. Revisa el resultado antes de reintentar.</p>}
            </section>}
            <p className="text-xs text-gray-500">Este panel administra un padrón global compartido. No hace cambios a las empresas, los RNC de facturas históricas ni los certificados fiscales. Usa únicamente archivos oficiales obtenidos de la DGII.</p>
        </div>
    );
}
