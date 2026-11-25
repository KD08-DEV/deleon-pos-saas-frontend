import React, { useState } from "react";
import { FileArchive } from "lucide-react";
import api from "../../lib/api";
import { downloadEcfXmlZip, describeEcfXmlError } from "../../lib/ecfXmlDownload.js";

// Fecha civil de República Dominicana (UTC-04:00, sin horario de verano).
function todayDO() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
}

const ENVIRONMENTS = [
    { value: "", label: "Todos los ambientes" },
    { value: "dgii_production", label: "Producción DGII" },
    { value: "dgii_certification", label: "Certificación DGII" },
    { value: "dgii_pre_certification", label: "Pre-certificación (TesteCF)" },
    { value: "internal_sandbox", label: "Sandbox interno" },
];

const TYPES = [
    { value: "", label: "Todos los tipos" },
    { value: "31", label: "E31 · Crédito fiscal" },
    { value: "32", label: "E32 · Consumo" },
    { value: "33", label: "E33 · Nota de débito" },
    { value: "34", label: "E34 · Nota de crédito" },
];

// Exporta en ZIP los XML firmados (e-CF y RFCE) de la sucursal activa.
export default function EcfXmlExportPanel({ inputCls = "" }) {
    const today = todayDO();
    const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
    const [to, setTo] = useState(today);
    const [environment, setEnvironment] = useState("");
    const [documentType, setDocumentType] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const fieldCls = inputCls || "w-full rounded-lg border border-gray-700 bg-[#1e1e21] px-3 py-2 text-sm text-white";

    const onExport = async () => {
        if (busy) return;
        setError("");
        if (!from || !to) return setError("Selecciona un rango de fechas válido.");
        if (from > to) return setError("La fecha inicial es posterior a la final.");
        setBusy(true);
        try {
            await downloadEcfXmlZip(api, { from, to, environment, documentType });
        } catch (err) {
            setError(await describeEcfXmlError(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
                <FileArchive size={18} className="text-amber-300" />
                <h3 className="text-sm font-semibold text-white">Descargar XML firmados</h3>
            </div>
            <p className="text-xs text-gray-400">
                Descarga un ZIP con los XML firmados de esta sucursal: la carpeta e-CF trae cada comprobante y la
                carpeta RFCE los resúmenes de consumo enviados a la DGII. Incluye un índice en CSV. Sirve para la
                certificación y para conservar los comprobantes. Máximo 92 días por descarga.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <label className="text-xs text-gray-400">Desde
                    <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={`${fieldCls} mt-1`} />
                </label>
                <label className="text-xs text-gray-400">Hasta
                    <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={`${fieldCls} mt-1`} />
                </label>
                <label className="text-xs text-gray-400">Ambiente
                    <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className={`${fieldCls} mt-1`}>
                        {ENVIRONMENTS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
                    </select>
                </label>
                <label className="text-xs text-gray-400">Tipo
                    <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className={`${fieldCls} mt-1`}>
                        {TYPES.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
                    </select>
                </label>
            </div>
            {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
            <button type="button" onClick={onExport} disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300 disabled:opacity-50">
                <FileArchive size={16} /> {busy ? "Preparando ZIP..." : "Descargar ZIP"}
            </button>
        </div>
    );
}
