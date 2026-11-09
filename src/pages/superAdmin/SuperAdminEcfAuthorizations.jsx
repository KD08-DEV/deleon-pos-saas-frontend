import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, FileUp, ShieldAlert, ShieldCheck, RefreshCw, Search, ExternalLink } from "lucide-react";
import api from "../../lib/api";

// Evitar que max= use el día UTC, que puede diferir del día del restaurante.
const todayInDR = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (key) => parts.find(({ type }) => type === key)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const labels = {
  pending: "Pendiente", verified: "Verificado", revoked: "Revocado",
  EVIDENCE_UPLOADED: "Archivo guardado", APPROVED: "Estado del emisor comprobado",
  CERTIFICATION_CONFIRMED: "Incorporación a DeLeonSoft confirmada",
  REVOKED: "Autorización revocada", CERTIFICATE_REPLACED: "Certificado reemplazado",
};
const fmt = (value) => value ? new Date(value).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" }) : "No registrado";
const friendlyErrors = {
  ECF_APPROVAL_EVIDENCE_REQUIRED: "Falta o es incorrecto el método, la frase de confirmación o las notas.",
  ECF_APPROVAL_INVALID_DATE: "La fecha de consulta no es válida.",
  ECF_APPROVAL_FUTURE_DATE: "La fecha de consulta no puede ser posterior a hoy en República Dominicana.",
};
const errText = (e) => {
  const body = e?.response?.data;
  return [friendlyErrors[body?.code] || body?.message || e?.message || "Error inesperado", body?.code, ...(body?.errors || [])].filter(Boolean).join(" · ");
};
const chipClass = (s) => ({
  verified: "text-emerald-300 border-emerald-600/50 bg-emerald-900/20",
  revoked: "text-red-300 border-red-600/50 bg-red-900/20",
  pending: "text-sky-300 border-sky-600/50 bg-sky-900/20",
}[s] || "text-gray-300 border-neutral-700");
const btn = "rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

export default function SuperAdminEcfAuthorizations() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState(null);
  const [reference, setReference] = useState("");
  const [verificationMethod, setVerificationMethod] = useState("DGII_PUBLIC_QUERY");
  const [queriedLegalName, setQueriedLegalName] = useState("");
  const [queryConfirmed, setQueryConfirmed] = useState(false);
  const [documentDate, setDocumentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [approvePhrase, setApprovePhrase] = useState("");
  const [revokePhrase, setRevokePhrase] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [softwareMethod, setSoftwareMethod] = useState("NEW_SOFTWARE_CERTIFICATION");
  const [softwareReference, setSoftwareReference] = useState("");
  const [softwareNotes, setSoftwareNotes] = useState("");
  const [softwarePhrase, setSoftwarePhrase] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/api/superadmin/ecf/authorizations");
      const list = data.data || [];
      setRows(list);
      setSelected(current => list.some(r => r.tenantId === current) ? current : list[0]?.tenantId || "");
      setError("");
    } catch (e) { setError(errText(e)); }
    finally { setLoading(false); }
  }, []);
  const loadDetail = useCallback(async (id) => {
    if (!id) { setDetail(null); return; }
    try {
      const { data } = await api.get(`/api/superadmin/ecf/authorizations/${encodeURIComponent(id)}`);
      setDetail(data.data);
    } catch (e) { setDetail(null); setError(errText(e)); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    setDetail(null); setError(""); setNotice(""); setFile(null);
    setReference(""); setDocumentDate(""); setNotes(""); setApprovePhrase("");
    setRevokePhrase(""); setRevokeReason(""); setReviewed(false);
    setQueriedLegalName(""); setQueryConfirmed(false); setVerificationMethod("DGII_PUBLIC_QUERY");
    setSoftwareMethod("NEW_SOFTWARE_CERTIFICATION"); setSoftwareReference(""); setSoftwareNotes(""); setSoftwarePhrase("");
    void loadDetail(selected);
  }, [selected, loadDetail]);
  const filtered = useMemo(() => rows.filter(r =>
    `${r.company} ${r.tenantId} ${r.issuer?.rnc || ""}`.toLowerCase().includes(search.toLowerCase().trim())), [rows, search]);
  const count = useMemo(() => Object.fromEntries(["pending", "verified", "revoked"].map(s =>
    [s, rows.filter(r => r.authorizationState === s).length])), [rows]);
  const approval = detail?.productionApproval || {};
  const certificate = detail?.certificate || {};
  const mayApprove = detail && detail.authorizationState !== "verified" &&
    detail.issuer?.rnc && reviewed && approvePhrase === "VERIFIQUE AUTORIZACION DGII" &&
    notes.trim().length >= 12 && Boolean(documentDate) &&
    (verificationMethod === "DGII_PUBLIC_QUERY" ?
      queryConfirmed && queriedLegalName.trim().length >= 3 : reference.trim().length >= 8);
  const mayConfirmSoftware = detail?.authorizationState === "verified" && !detail?.certificationVerification?.verifiedAt &&
    softwareReference.trim().length >= 8 && softwareNotes.trim().length >= 20 &&
    softwarePhrase === "CONFIRME CERTIFICACION DGII";

  const request = async (action, successMessage) => {
    if (!detail || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await action();
      setNotice(successMessage);
      setFile(null); setApprovePhrase(""); setRevokePhrase(""); setReviewed(false); setSoftwarePhrase("");
      await Promise.all([loadDetail(detail.tenantId), refresh()]);
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };
  const uploadProof = () => request(async () => {
    const form = new FormData(); form.append("evidence", file);
    await api.post(`/api/superadmin/tenants/${encodeURIComponent(detail.tenantId)}/ecf/evidence`, form, { timeout: 90000 });
  }, "PDF guardado de forma privada. Aún falta la verificación manual.");
  const approve = () => request(() => api.patch(`/api/superadmin/tenants/${encodeURIComponent(detail.tenantId)}/ecf/production-approval`, {
    issuerRnc: detail.issuer.rnc, certificateThumbprint: certificate.thumbprint || "",
    verificationMethod, queriedRnc: detail.issuer.rnc,
    queriedLegalName: queriedLegalName.trim(), dgiiTaxStatus: queryConfirmed ? "ACTIVE" : "",
    dgiiEcfStatus: queryConfirmed ? "YES" : "",
    evidenceReference: reference.trim(), evidenceDocumentDate: documentDate,
    verificationNotes: notes.trim(), confirmation: approvePhrase,
  }), "Estado del emisor registrado. Falta comprobar la incorporación del cliente a DeLeonSoft y la integración de firma. Producción sigue bloqueada.");
  const confirmSoftware = () => request(() => api.post(`/api/superadmin/tenants/${encodeURIComponent(detail.tenantId)}/ecf/confirm-certification`, {
    method: softwareMethod, reference: softwareReference.trim(), notes: softwareNotes.trim(), confirmation: softwarePhrase,
  }), "Confirmación del software registrada; no se ha activado Producción DGII.");
  const revoke = () => request(() => api.post(`/api/superadmin/tenants/${encodeURIComponent(detail.tenantId)}/ecf/revoke-production`, {
    reason: revokeReason.trim(), confirmation: revokePhrase,
  }), "Habilitación interna bloqueada. La autorización oficial ante DGII no cambia.");
  const openEvidence = async () => {
    const tab = window.open("", "_blank");
    try {
      const { data } = await api.get(`/api/superadmin/tenants/${encodeURIComponent(detail.tenantId)}/ecf/evidence-url`);
      if (tab) { tab.opener = null; tab.location.href = data.data.url; }
      else window.location.href = data.data.url;
    } catch (e) { tab?.close(); setError(errText(e)); }
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-12 text-gray-100">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-sky-400"/> Autorizaciones e-CF · DGII</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-400">Consulta manual del estatus del contribuyente y verificación independiente de su incorporación a DeLeonSoft. Tú no necesitas ser el emisor de tus clientes. No consulta automáticamente ni modifica registros DGII; no activa producción.</p>
      </div>
      <button type="button" onClick={() => { void refresh(); if (selected) void loadDetail(selected); }} className={`${btn} flex gap-2 bg-neutral-800 hover:bg-neutral-700`}><RefreshCw size={16}/> Actualizar</button>
    </div>
    <div className="grid grid-cols-3 gap-3">{["pending", "verified", "revoked"].map(s =>
      <div key={s} className="rounded-xl border border-neutral-700 bg-[#161616] p-4"><p className="text-xs text-gray-400">{labels[s]}</p><p className="text-2xl font-bold mt-1">{count[s] || 0}</p></div>)}</div>
    {error && <div role="alert" className="rounded-lg border border-red-700 bg-red-950/30 p-3 text-sm text-red-200 flex items-center gap-2"><AlertTriangle size={18}/>{error}</div>}
    {notice && <div role="status" className="rounded-lg border border-emerald-700 bg-emerald-950/20 p-3 text-sm text-emerald-200 flex items-center gap-2"><CheckCircle2 size={18}/>{notice}</div>}
    <div className="grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)] gap-5 items-start">
      <aside className="rounded-xl border border-neutral-700 bg-[#131313] p-3 lg:sticky lg:top-3">
        <label className="relative block"><Search size={17} className="absolute left-3 top-3 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa o RNC" className="w-full rounded-lg bg-neutral-900 border border-neutral-700 p-2.5 pl-9 text-sm text-white"/></label>
        <div className="mt-3 max-h-[600px] overflow-y-auto space-y-1">
          {loading ? <p className="p-3 text-sm text-gray-400">Cargando…</p> : filtered.length === 0 ? <p className="p-3 text-sm text-gray-400">No se encontraron empresas e-CF.</p> : filtered.map(r =>
            <button key={r.tenantId} type="button" onClick={() => setSelected(r.tenantId)} className={`w-full rounded-lg p-3 text-left border transition-colors ${selected === r.tenantId ? "bg-sky-400/10 border-sky-500/50" : "border-transparent hover:bg-neutral-800"}`}>
              <p className="font-medium break-words text-sm">{r.company}</p><p className="text-xs text-gray-400 my-1">RNC {r.issuer?.rnc || "No configurado"}</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${chipClass(r.authorizationState)}`}>{labels[r.authorizationState]}</span>
            </button>)}</div>
      </aside>
      <main className="min-w-0 space-y-5">
        {!detail ? <div className="rounded-xl border border-neutral-700 p-8 text-gray-400">{selected ? "Cargando información…" : "Selecciona una empresa para consultar su autorización."}</div> : <>
          <section className="rounded-xl border border-neutral-700 bg-[#151515] p-5 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3"><div><h2 className="text-xl font-semibold">{detail.company}</h2><p className="text-xs text-gray-400 mt-1 break-all">ID {detail.tenantId}</p></div>
              <span className={`px-3 py-1 rounded-full text-sm border ${chipClass(detail.authorizationState)}`}>{labels[detail.authorizationState]}</span></div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Emisor / RNC</p><p className="mt-1 break-words">{detail.issuer?.legalName || "Sin razón social"} · {detail.issuer?.rnc || "Sin RNC"}</p></div>
              <div><p className="text-xs text-gray-400">Entorno actual</p><p className="mt-1">{detail.environment}</p></div>
              <div><p className="text-xs text-gray-400">Estado técnico de certificación</p><p className="mt-1">{detail.certificationStatus}</p></div>
              <div><p className="text-xs text-gray-400">Fiscal / empresa</p><p className="mt-1">{detail.fiscalEnabled ? "Fiscal habilitado" : "Fiscal no habilitado"} · {detail.tenantStatus}</p></div>
            </div>
            <div className="border-t border-neutral-700 pt-4 space-y-3"><h3 className="font-semibold flex gap-2 items-center"><FileCheck2 size={18} className="text-sky-400"/> Certificado digital (solo lectura)</h3>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><dt className="text-gray-400 text-xs">Titular del certificado X.509</dt><dd className="break-words mt-1">{certificate.subjectName || "No disponible en certificado registrado anteriormente"}</dd></div>
                <div><dt className="text-gray-400 text-xs">Número de serie</dt><dd className="font-mono break-all mt-1">{certificate.serialNumber || "No disponible"}</dd></div>
                <div><dt className="text-gray-400 text-xs">Huella digital</dt><dd className="font-mono text-xs break-all mt-1">{certificate.thumbprint || "No disponible"}</dd></div>
                <div><dt className="text-gray-400 text-xs">Válido desde / vence</dt><dd className="mt-1">{fmt(certificate.validFrom)} → {fmt(certificate.validTo)}</dd></div>
              </dl>
              {certificate.validTo && new Date(certificate.validTo) <= new Date() && <p className="text-red-300 text-sm flex gap-2"><ShieldAlert size={17}/> Certificado vencido: no debe aprobarse.</p>}
            </div>
          </section>
          <section className="rounded-xl border border-neutral-700 bg-[#151515] p-5 space-y-4">
            <h3 className="font-semibold">Comprobación del emisor ante DGII (registro interno)</h3>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><dt className="text-gray-400 text-xs">Método de comprobación</dt><dd className="mt-1">{approval.verificationMethod === "DGII_PUBLIC_QUERY" ? "Consulta pública del RNC" : approval.verificationMethod === "DGII_OFFICIAL_DOCUMENT" ? "Documento oficial" : "Pendiente"}</dd></div>
              <div><dt className="text-gray-400 text-xs">RNC / razón social consultados</dt><dd className="mt-1 break-words">{approval.queriedRnc || "—"} · {approval.queriedLegalName || "—"}</dd></div>
              <div><dt className="text-gray-400 text-xs">Resultado DGII registrado</dt><dd className="mt-1">{approval.dgiiTaxStatus === "ACTIVE" ? "Activo" : "—"} · Facturador electrónico: {approval.dgiiEcfStatus === "YES" ? "Sí" : "—"}</dd></div>
              <div><dt className="text-gray-400 text-xs">Referencia (si existe)</dt><dd className="mt-1 break-all">{approval.evidenceReference || "Sin número documental"}</dd></div>
              <div><dt className="text-gray-400 text-xs">Verificado por / fecha</dt><dd className="mt-1">{approval.verifiedBy || "—"} · {fmt(approval.verifiedAt)}</dd></div>
              <div><dt className="text-gray-400 text-xs">Archivo adjunto (opcional)</dt><dd className="mt-1 break-words">{approval.evidenceFile?.name || "No adjuntado"}</dd></div>
              <div><dt className="text-gray-400 text-xs">Fecha de consulta / documento</dt><dd className="mt-1">{approval.evidenceDocumentDate ? fmt(approval.evidenceDocumentDate) : "—"}</dd></div>
            </dl>
            {approval.evidenceFile && <div className="space-y-2"><p className="text-xs font-mono break-all text-gray-400">SHA-256: {approval.evidenceFile.sha256}</p>
              <button type="button" className={`${btn} bg-neutral-800 hover:bg-neutral-700 flex items-center gap-2`} onClick={openEvidence}><ExternalLink size={15}/> Ver evidencia privada (enlace temporal)</button></div>}
            {approval.revokedAt && <p className="text-sm text-red-300">Habilitación interna bloqueada: {fmt(approval.revokedAt)} · {approval.revocationReason || "Sin motivo"}</p>}
            <div className="rounded-lg border border-neutral-700 p-3 text-sm space-y-1"><strong>Incorporación del cliente a DeLeonSoft</strong>
              <p className="text-gray-400">{detail.certificationVerification?.verifiedAt ? `Confirmada internamente · ${fmt(detail.certificationVerification.verifiedAt)}` : "Sin comprobación del proceso de certificación o cambio de software ante DGII"}</p>
              <p className="text-xs text-gray-400">La consulta pública de RNC no acredita por sí sola que DeLeonSoft sea el software incorporado del emisor.</p>
            </div>
            {detail.productionGuard?.errors?.length > 0 && <div className="rounded-lg border border-sky-800/50 p-3 text-xs text-sky-200"><p className="font-semibold mb-1">Controles que impiden validar para producción:</p><p className="break-words">{detail.productionGuard.errors.join(" · ")}</p></div>}
          </section>
          {detail.authorizationState !== "verified" && <>
            <section className="rounded-xl border border-sky-800/60 bg-[#111517] p-5 space-y-4">
              <h3 className="font-semibold flex gap-2 items-center"><ShieldCheck size={18}/> 1. Registrar verificación del emisor</h3>
              <p className="text-sm text-sky-200">Verifica manualmente el RNC del CLIENTE en el portal oficial de DGII. No uses el RNC de otra empresa y no marques «Sí» si la consulta no lo muestra.</p>
              <a className="inline-flex gap-2 items-center text-sm text-sky-300 underline hover:text-sky-200" target="_blank" rel="noopener noreferrer" href="https://dgii.gov.do/">Abrir portal oficial DGII <ExternalLink size={15}/></a>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <label className="block">Método de verificación
                  <select value={verificationMethod} onChange={e => setVerificationMethod(e.target.value)} className="block w-full mt-1 rounded-lg bg-neutral-900 border border-neutral-600 p-2.5 text-white">
                    <option value="DGII_PUBLIC_QUERY">Consulta pública RNC DGII</option>
                    <option value="DGII_OFFICIAL_DOCUMENT">Documento oficial DGII</option>
                  </select>
                </label>
                <label className="block">{verificationMethod === "DGII_PUBLIC_QUERY" ? "Fecha de consulta" : "Fecha del documento"}
                  <input value={documentDate} type="date" max={todayInDR()} onChange={e => setDocumentDate(e.target.value)} className="block w-full mt-1 rounded-lg bg-neutral-900 border border-neutral-600 p-2.5 text-white"/>
                </label>
              </div>
              {verificationMethod === "DGII_PUBLIC_QUERY" && <div className="rounded-lg border border-neutral-700 p-3 space-y-3 text-sm">
                <p>RNC que debes buscar: <strong className="font-mono">{detail.issuer?.rnc || "Sin RNC"}</strong></p>
                <label className="block">Razón social que aparece en DGII
                  <input value={queriedLegalName} maxLength={240} onChange={e => setQueriedLegalName(e.target.value)} placeholder="Copia exactamente el nombre mostrado en la consulta" className="block mt-1 w-full rounded-lg bg-neutral-900 border border-neutral-600 p-2.5"/>
                </label>
                <label className="flex items-start gap-3"><input type="checkbox" checked={queryConfirmed} onChange={e => setQueryConfirmed(e.target.checked)} className="mt-1"/>
                  <span>Confirmo que consulté el RNC <strong>de este cliente</strong> y vi «Estado: ACTIVO» y «Facturador Electrónico: SI» en la web oficial.</span>
                </label>
              </div>}
              <label className="block text-sm">Referencia documental {verificationMethod === "DGII_PUBLIC_QUERY" ? "(opcional; no inventes un número)" : "(obligatoria si existe documento)"}
                <input value={reference} onChange={e => setReference(e.target.value)} maxLength={180} placeholder={verificationMethod === "DGII_PUBLIC_QUERY" ? "Se puede dejar en blanco" : "Número identificador del documento DGII"} className="block w-full mt-1 rounded-lg bg-neutral-900 border border-neutral-600 p-2.5 text-white"/>
              </label>
              <label className="block text-sm">Notas de verificación (mínimo 12 caracteres)
                <textarea rows={3} value={notes} maxLength={1000} onChange={e => setNotes(e.target.value)} placeholder="Describe qué consultaste y cómo verificaste el RNC del cliente…" className="block w-full mt-1 rounded-lg bg-neutral-900 border border-neutral-600 p-2.5 text-white"/>
              </label>
              <label className="flex gap-3 items-start text-sm"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} className="mt-1"/><span>Confirmo que comprobé los datos de este emisor en una fuente auténtica. No equivale a certificar DeLeonSoft ni a habilitar producción.</span></label>
              <label className="block text-sm">Escribe <strong>VERIFIQUE AUTORIZACION DGII</strong><input value={approvePhrase} onChange={e => setApprovePhrase(e.target.value)} autoComplete="off" className="block w-full mt-1 rounded-lg bg-neutral-900 border border-neutral-600 p-2.5 text-white"/></label>
              <button type="button" disabled={!mayApprove || busy} onClick={approve} className={`${btn} bg-sky-400 text-black hover:bg-sky-300`}>Guardar verificación (sin activar producción)</button>
            </section>
            <section className="rounded-xl border border-neutral-700 bg-[#151515] p-5 space-y-3">
              <h3 className="font-semibold flex gap-2 items-center"><FileUp size={19}/> Adjunto PDF opcional</h3>
              <p className="text-sm text-gray-400">Solo si posees un documento real que respalde la consulta. No se exige para registrar la consulta pública. El bucket privado de Supabase solo se necesita para subir PDF, no para consultar ni verificar RNC. Nunca subas P12/PFX ni contraseñas.</p>
              <input type="file" accept=".pdf,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-700 file:text-white file:px-3 file:py-2"/>
              <button type="button" onClick={uploadProof} disabled={!file || busy || file.size > 5 * 1024 * 1024} className={`${btn} bg-neutral-700 hover:bg-neutral-600`}>{busy ? "Procesando…" : "Guardar PDF opcional"}</button>
            </section>
          </>}
          {detail.authorizationState === "verified" && <>
            {!detail.certificationVerification?.verifiedAt && <section className="rounded-xl border border-sky-800/60 bg-[#10171a] p-5 space-y-3">
              <h3 className="font-semibold">2. Confirmar incorporación a DeLeonSoft ante DGII</h3>
              <p className="text-sm text-sky-200">Paso SEPARADO: úsalo solo si el restaurante completó ante DGII la certificación del software DeLeonSoft o el cambio desde su proveedor anterior. La consulta RNC no demuestra este paso.</p>
              <label className="block text-sm">Modalidad
                <select value={softwareMethod} onChange={e => setSoftwareMethod(e.target.value)} className="block mt-1 w-full rounded-lg bg-neutral-900 border border-neutral-600 p-2.5">
                  <option value="NEW_SOFTWARE_CERTIFICATION">Certificación del software para este emisor</option>
                  <option value="SOFTWARE_CHANGE">Cambio de software/proveedor</option>
                </select>
              </label>
              <label className="block text-sm">Referencia verificable del trámite de incorporación
                <input value={softwareReference} onChange={e => setSoftwareReference(e.target.value)} maxLength={180} placeholder="Número de caso, expediente o documento comprobable" className="block mt-1 w-full rounded-lg bg-neutral-900 border border-neutral-600 p-2.5"/>
              </label>
              <label className="block text-sm">Notas de la comprobación (mínimo 20 caracteres)
                <textarea value={softwareNotes} rows={3} maxLength={1000} onChange={e => setSoftwareNotes(e.target.value)} placeholder="Indica qué comunicación y etapa oficial comprobaste…" className="block mt-1 w-full rounded-lg bg-neutral-900 border border-neutral-600 p-2.5"/>
              </label>
              <label className="block text-sm">Escribe <strong>CONFIRME CERTIFICACION DGII</strong><input value={softwarePhrase} onChange={e => setSoftwarePhrase(e.target.value)} autoComplete="off" className="block mt-1 w-full rounded-lg bg-neutral-900 border border-neutral-600 p-2.5"/></label>
              <button type="button" disabled={!mayConfirmSoftware || busy} onClick={confirmSoftware} className={`${btn} bg-sky-700 hover:bg-sky-600`}>Confirmar incorporación (sin activar producción)</button>
            </section>}
            <section className="rounded-xl border border-red-800/60 bg-[#1a1212] p-5 space-y-4">
              <h3 className="font-semibold flex gap-2 items-center"><ShieldAlert size={19}/> Bloquear habilitación interna de producción</h3>
              <p className="text-sm text-gray-300">Esta acción bloquea DeLeonSoft, NO revoca la autorización oficial de DGII. Las facturas emitidas anteriormente no se eliminan.</p>
              <label className="block text-sm">Motivo obligatorio<textarea rows={2} value={revokeReason} maxLength={1000} onChange={e => setRevokeReason(e.target.value)} className="block mt-1 w-full rounded-lg bg-neutral-900 border border-neutral-600 p-2.5" placeholder="Describe el motivo del bloqueo…"/></label>
              <label className="block text-sm">Escribe <strong>REVOCAR PRODUCCION ECF</strong><input value={revokePhrase} autoComplete="off" onChange={e => setRevokePhrase(e.target.value)} className="block mt-1 w-full rounded-lg bg-neutral-900 border border-neutral-600 p-2.5"/></label>
              <button type="button" disabled={busy || revokeReason.trim().length < 10 || revokePhrase !== "REVOCAR PRODUCCION ECF"} onClick={revoke} className={`${btn} bg-red-700 hover:bg-red-600`}>Bloquear producción en DeLeonSoft</button>
            </section>
          </>}
          <section className="rounded-xl border border-neutral-700 bg-[#151515] p-5"><h3 className="font-semibold flex items-center gap-2 mb-4"><Clock3 size={18}/> Historial de auditoría</h3>
            {!detail.history?.length ? <p className="text-sm text-gray-400">No hay decisiones registradas en esta fase.</p> : <ol className="space-y-3">{detail.history.map((entry, i) => <li key={`${entry.at}-${i}`} className="rounded-lg bg-neutral-900/70 border border-neutral-700 p-3 text-sm">
              <div className="flex flex-wrap gap-2 items-center justify-between"><strong>{labels[entry.action] || entry.action}</strong><span className="text-xs text-gray-400">{fmt(entry.at)}</span></div><p className="text-xs text-gray-400 mt-1">Actor: {entry.actor || "Sistema"}</p>
              {entry.reason && <p className="mt-2 break-words">{entry.reason}</p>}
              {entry.evidenceReference && <p className="text-xs mt-1 text-gray-400 break-all">Referencia: {entry.evidenceReference}</p>}
            </li>)}</ol>}
          </section>
        </>}
      </main>
    </div>
  </div>;
}
