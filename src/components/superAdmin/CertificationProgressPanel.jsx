import { useEffect, useState } from "react";
import { ListChecks, AlertTriangle } from "lucide-react";
import api from "../../lib/api";

// Avance de la certificación DGII de cada cliente (SuperAdmin).
const ENV_LABELS = {
    internal_sandbox: "Sandbox", dgii_pre_certification: "TesteCF",
    dgii_certification: "CerteCF", dgii_production: "Producción",
};

export default function CertificationProgressPanel() {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let alive = true;
        api.get("/api/superadmin/ecf/certification-progress")
            .then((res) => { if (alive) setRows(res.data?.data || []); })
            .catch(() => { if (alive) setError(true); });
        return () => { alive = false; };
    }, []);

    if (error) return null;
    return (
        <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-200">
                <ListChecks size={18} /> Avance de certificación por cliente
            </h2>
            <p className="mt-1 text-xs text-gray-400">Calculado con la guía de certificación de cada negocio. El siguiente paso es lo que le falta hacer.</p>
            {!rows ? (
                <p className="mt-3 text-sm text-gray-400">Cargando…</p>
            ) : rows.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">Ningún cliente ha empezado la configuración e-CF.</p>
            ) : (
                <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-gray-400">
                            <tr>
                                <th className="py-2 pr-3">Cliente</th>
                                <th className="py-2 pr-3">Ambiente</th>
                                <th className="py-2 pr-3">Avance</th>
                                <th className="py-2">Siguiente paso</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.tenantId} className="border-t border-gray-800 align-top">
                                    <td className="py-2 pr-3">
                                        <p className="font-medium text-white">{r.company}</p>
                                        <p className="text-xs text-gray-500">{r.rnc ? `RNC ${r.rnc}` : "Sin RNC"}</p>
                                    </td>
                                    <td className="py-2 pr-3 text-gray-300">{ENV_LABELS[r.environment] || r.environment || "—"}</td>
                                    <td className="py-2 pr-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-800">
                                                <div className="h-full bg-emerald-400" style={{ width: `${r.percent}%` }} />
                                            </div>
                                            <span className="text-xs text-gray-300">{r.done}/{r.total}</span>
                                        </div>
                                    </td>
                                    <td className="py-2 text-xs text-gray-300">
                                        {r.nextStep ? r.nextStep.title : <span className="text-emerald-300">Completado</span>}
                                        {r.warnings?.length > 0 && (
                                            <p className="mt-1 flex items-start gap-1 text-amber-200">
                                                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {r.warnings.join(" · ")}
                                            </p>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
