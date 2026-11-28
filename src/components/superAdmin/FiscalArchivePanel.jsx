import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { describeEcfXmlError, downloadFromApi } from "@/lib/ecfXmlDownload.js";

// Archivo fiscal: e-CF de empresas borradas, conservados 10 años.
// Solo SuperAdmin. Permite descargar todo en un ZIP si la empresa o la DGII lo piden.
const fmt = (d) => (d ? new Date(d).toLocaleDateString("es-DO") : "—");

export default function FiscalArchivePanel({ refreshKey = 0, onError }) {
    const [archives, setArchives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(null);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        api.get("/api/superadmin/fiscal-archives")
            .then((res) => { if (alive) setArchives(res.data?.data || []); })
            .catch(() => { if (alive) setArchives([]); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [refreshKey]);

    const download = async (a) => {
        setDownloading(a.archivedTenantId);
        try {
            await downloadFromApi(api, `/api/superadmin/fiscal-archives/${encodeURIComponent(a.archivedTenantId)}/export`,
                {}, `archivo-fiscal_${a.issuer?.rnc || a.archivedTenantId}.zip`);
        } catch (error) {
            onError?.(await describeEcfXmlError(error));
        } finally {
            setDownloading(null);
        }
    };

    const total = (c = {}) => (c.electronicTaxDocuments || 0) + (c.receivedEcf || 0) + (c.annulments || 0) + (c.commercialApprovals || 0);

    return (
        <section className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <h2 className="text-lg font-semibold text-amber-200">Archivo fiscal de empresas borradas</h2>
            <p className="mt-1 text-xs text-gray-400">
                Cuando se borra una empresa, sus comprobantes electrónicos (emitidos, recibidos, aprobaciones y anulaciones)
                no se eliminan: se conservan 10 años como exige la ley. Desde aquí puedes descargarlos en un ZIP.
            </p>
            {loading ? (
                <p className="mt-3 text-sm text-gray-400">Cargando…</p>
            ) : archives.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No hay empresas borradas con comprobantes conservados.</p>
            ) : (
                <div className="mt-3 space-y-2">
                    {archives.map((a) => (
                        <div key={a.archivedTenantId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-800 bg-[#111113] p-3 text-sm">
                            <div>
                                <p className="font-semibold text-white">{a.tenantName || a.archivedTenantId}</p>
                                <p className="text-xs text-gray-400">
                                    RNC {a.issuer?.rnc || "—"} · {a.issuer?.legalName || "—"}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {total(a.counts)} comprobante(s) · {fmt(a.firstDocumentAt)} a {fmt(a.lastDocumentAt)} ·
                                    {" "}borrada el {fmt(a.deletedAt)} · conservar hasta {fmt(a.retainUntil)}
                                </p>
                            </div>
                            <button type="button" disabled={downloading === a.archivedTenantId} onClick={() => download(a)}
                                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50">
                                {downloading === a.archivedTenantId ? "Preparando…" : "Descargar ZIP"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
