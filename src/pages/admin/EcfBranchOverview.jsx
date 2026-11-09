import React from "react";
import { useQuery } from "@tanstack/react-query";
import api, { getScope } from "../../lib/api";

const fmt = n => new Intl.NumberFormat("es-DO").format(Number(n || 0));
export default function EcfBranchOverview() {
  const tenantId = getScope().tenantId;
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["ecf-branch-overview", tenantId],
    queryFn: async () => (await api.get("/api/admin/ecf/branch-overview")).data.data,
    retry: 0, staleTime: 10000,
  });
  return <section className="rounded-xl border border-slate-600 bg-[#111827] p-4 text-white" aria-label="Resumen e-CF multisucursal">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-lg font-semibold">Panel fiscal multisucursal</h3>
        <p className="text-xs text-slate-300">Consulta agregada del contribuyente, exclusiva de Owner. No modifica documentos ni reserva e-NCF.</p></div>
      <button type="button" onClick={() => refetch()} disabled={isFetching} className="rounded bg-slate-700 px-3 py-2 text-sm disabled:opacity-50">Actualizar</button>
    </div>
    {isLoading && <p className="mt-3 text-sm">Consultando estados fiscales…</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-200">No fue posible consultar el panel fiscal ({error?.response?.data?.code || "error de conexión"}).</p>}
    {data && <>
      <div className="mt-3 rounded border border-sky-500/40 bg-sky-950/20 p-3 text-xs text-sky-100">
        Entorno: <strong>{data.environment}</strong> · Certificación registrada: <strong>{data.certificationStatus}</strong> · Firma externa: <strong>pendiente de proveedor</strong>.
        Este panel no acredita autorización DGII ni habilita producción.
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(data.branches || []).map(b => <article key={b.clientId} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
          <div className="flex justify-between gap-2"><h4 className="font-semibold break-words">{b.name}</h4>
            <span className={`text-xs ${b.ecfEnabled && b.active ? "text-emerald-300" : "text-sky-300"}`}>{b.ecfEnabled && b.active ? "e-CF ON" : "e-CF OFF"}</span></div>
          <p className="mt-1 text-xs text-slate-300">{b.clientId === "default" ? "Principal" : "Sucursal secundaria"} · {b.active ? "Activa" : "Inactiva"}</p>
          <p className={`mt-1 text-xs ${b.canIssueInSandbox ? "text-emerald-300" : "text-sky-300"}`}>
            {b.canIssueInSandbox ? "Perfil listo para pruebas en sandbox" : !b.profileReady ? "Perfil fiscal incompleto: emisión bloqueada" : "Emisión de prueba no disponible en esta sede"}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-xs text-slate-400">Documentos</dt><dd>{fmt(b.documents)}</dd></div>
            <div><dt className="text-xs text-slate-400">Aceptados</dt><dd>{fmt(b.accepted)}</dd></div>
            <div><dt className="text-xs text-slate-400">Rechazados</dt><dd>{fmt(b.rejected)}</dd></div>
            <div><dt className="text-xs text-slate-400">Intentos abiertos</dt><dd>{fmt(b.openAttempts)}</dd></div>
            <div><dt className="text-xs text-slate-400">Por revisar</dt><dd className={b.needsReview ? "text-sky-300" : ""}>{fmt(b.needsReview)}</dd></div>
            <div><dt className="text-xs text-slate-400">Documentos pendientes</dt><dd>{fmt(b.openDocuments)}</dd></div>
          </dl>
          {b.environments?.legacy_unknown > 0 && <p className="mt-2 text-xs text-sky-300">{fmt(b.environments.legacy_unknown)} documento(s) sin ambiente confirmado. Revisar antes de conciliar.</p>}
        </article>)}
      </div>
      <p className="mt-3 text-xs text-slate-400">Los intentos abiertos y los documentos pendientes son categorías distintas; no sumarlos como facturas. Consulta el detalle desde Incidentes de la sucursal correspondiente.</p>
    </>}
  </section>;
}
