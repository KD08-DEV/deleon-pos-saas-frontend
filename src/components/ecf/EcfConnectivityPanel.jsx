import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, MinusCircle, FlaskConical } from "lucide-react";
import api from "../../lib/api";

// Pruebas sin la DGII (sirven con certificados de prueba):
//  1. Probar firma: descarga y abre el certificado, firma un e-CF de muestra y lo valida.
//  2. Enviar un e-CF de muestra a otro receptor (por ejemplo, otro restaurante de prueba).
//  3. Enviar la aprobación comercial de un e-CF recibido de vuelta a su emisor.
const ERRORS = {
    ECF_CERTIFICATE_NOT_CONFIGURED: "Primero sube el certificado digital.",
    ECF_CERTIFICATE_PASSWORD_DECRYPT_FAILED: "No se pudo leer la contraseña guardada. Vuelve a subir el certificado.",
    ECF_CERTIFICATE_EXPIRED: "El certificado está vencido.",
    PRIVATE_KEY_NOT_FOUND_IN_CERTIFICATE: "El archivo no trae la llave privada.",
    TEST_URL_INVALID: "La dirección no es válida.",
    TEST_URL_NOT_HTTPS: "La dirección debe empezar con https://",
    TEST_URL_NOT_PUBLIC: "La dirección debe ser pública (no localhost ni red interna).",
    TEST_URL_DNS_FAILED: "No se encontró esa dirección.",
    TEST_BUYER_RNC_INVALID: "El RNC del comprador debe tener 9 u 11 dígitos.",
    TEST_ONLY_IN_SANDBOX_OR_TESTECF: "Estas pruebas solo se permiten en Sandbox o TesteCF.",
    COMMERCIAL_DECISION_REQUIRED: "Primero aprueba o rechaza ese e-CF en «Recepción de e-CF».",
    TOO_MANY_TESTS: "Demasiadas pruebas seguidas. Espera un minuto.",
    RECEPTOR_SEED_FAILED: "El receptor no entregó la semilla (revisa la dirección y que su receptor esté activo).",
    RECEPTOR_AUTH_FAILED: "El receptor no aceptó la autenticación con tu certificado.",
    RECEPTOR_RECEPTION_FAILED: "El receptor rechazó el envío.",
    ISSUER_APPROVAL_FAILED: "El emisor rechazó la aprobación comercial.",
    ACUSE_NO_RECIBIDO_MOTIVO_1: "El receptor no lo recibió: error de especificación (formato).",
    ACUSE_NO_RECIBIDO_MOTIVO_2: "El receptor no lo recibió: error de firma digital.",
    ACUSE_NO_RECIBIDO_MOTIVO_3: "El receptor ya lo tenía (enviado duplicado).",
    ACUSE_NO_RECIBIDO_MOTIVO_4: "El receptor no lo recibió: el RNC del comprador no es el suyo.",
};
const explain = (code) => {
    const text = String(code || "");
    if (text.startsWith("CERTIFICATE_DOWNLOAD_FAILED")) return `No se pudo descargar el certificado del almacenamiento (${text.split(":").slice(1).join(":").trim()}).`;
    return ERRORS[text] || text;
};
const requestError = (error) => explain(error?.response?.data?.code) || "No se pudo completar la prueba.";

function StepList({ result }) {
    if (!result) return null;
    return (
        <div className="mt-3 space-y-1.5">
            <p className={`text-xs font-semibold ${result.ok ? "text-emerald-300" : "text-rose-300"}`}>
                {result.ok ? "Prueba completada sin errores." : "La prueba se detuvo en el paso marcado en rojo."}
            </p>
            <ol className="space-y-1">
                {result.steps.map((s) => (
                    <li key={s.key} className="flex items-start gap-2 text-xs">
                        {s.ok === true ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                            : s.ok === false ? <XCircle size={14} className="mt-0.5 shrink-0 text-rose-400" />
                                : <MinusCircle size={14} className="mt-0.5 shrink-0 text-gray-600" />}
                        <div>
                            <span className={s.skipped ? "text-gray-500" : "text-gray-200"}>{s.label}</span>
                            {s.detail && <span className="text-gray-500"> · {s.detail}</span>}
                            {s.ok === false && <p className="text-rose-300">{explain(s.error)}{s.httpStatus ? ` (HTTP ${s.httpStatus})` : ""}</p>}
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
}

export default function EcfConnectivityPanel() {
    const queryClient = useQueryClient();
    const [send, setSend] = useState({ url: "", rnc: "", name: "" });
    const [approval, setApproval] = useState({ id: "", url: "" });
    const [results, setResults] = useState({});
    const [errors, setErrors] = useState({});
    const input = "w-full rounded-md border border-gray-700 bg-[#1e1e21] px-2 py-1.5 text-xs text-white";
    const button = "rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50";

    const receivedQuery = useQuery({
        queryKey: ["ecf-received", 1],
        queryFn: async () => (await api.get("/api/admin/ecf/received", { params: { page: 1 } })).data?.data,
        retry: 0,
    });
    const decided = (receivedQuery.data?.documents || []).filter((d) => d.status === "received"
        && ["approved", "rejected"].includes(d.commercial?.status));

    const run = (key, fn) => ({
        mutationFn: fn,
        onMutate: () => { setErrors((e) => ({ ...e, [key]: null })); setResults((r) => ({ ...r, [key]: null })); },
        onSuccess: (data) => {
            setResults((r) => ({ ...r, [key]: data }));
            queryClient.invalidateQueries({ queryKey: ["ecf-certification-guide"] });
            queryClient.invalidateQueries({ queryKey: ["admin-ecf-profile"] });
        },
        onError: (error) => setErrors((e) => ({ ...e, [key]: requestError(error) })),
    });
    const signature = useMutation(run("signature", async () => (await api.post("/api/admin/ecf/test/signature")).data?.data));
    const sendEcf = useMutation(run("send", async () => (await api.post("/api/admin/ecf/test/send-ecf", {
        targetBaseUrl: send.url.trim(), buyerRnc: send.rnc.trim(), buyerName: send.name.trim(),
    })).data?.data));
    const sendApproval = useMutation(run("approval", async () => (await api.post(`/api/admin/ecf/test/send-approval/${approval.id}`, {
        targetBaseUrl: approval.url.trim(),
    })).data?.data));

    return (
        <div className="space-y-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <div>
                <div className="flex items-center gap-2">
                    <FlaskConical size={18} className="text-violet-300" />
                    <h3 className="text-sm font-semibold text-white">Pruebas de firma y comunicación (sin DGII)</h3>
                </div>
                <p className="mt-1 max-w-3xl text-xs text-gray-400">
                    Sirven con certificados de prueba. Los documentos de muestra dicen «PRUEBA DE CONEXION - SIN VALOR FISCAL»,
                    no usan tus secuencias y no se envían a la DGII.
                </p>
            </div>

            <section className="rounded-lg border border-gray-800 bg-[#111113] p-3">
                <h4 className="text-xs font-semibold text-white">1. Probar firma con el certificado</h4>
                <p className="mt-1 text-xs text-gray-400">Descarga el certificado, lo abre con su contraseña, firma un e-CF de muestra, verifica la firma y la valida con el formato oficial.</p>
                <button type="button" className={`${button} mt-2`} disabled={signature.isPending} onClick={() => signature.mutate()}>
                    {signature.isPending ? "Probando…" : "Probar firma"}
                </button>
                {errors.signature && <p className="mt-2 text-xs text-rose-300">{errors.signature}</p>}
                <StepList result={results.signature} />
            </section>

            <section className="rounded-lg border border-gray-800 bg-[#111113] p-3">
                <h4 className="text-xs font-semibold text-white">2. Enviar un e-CF de prueba a otro receptor</h4>
                <p className="mt-1 text-xs text-gray-400">
                    Usa la «Dirección base» y el RNC del otro negocio (por ejemplo, otro restaurante de prueba con su receptor activo).
                    Hace lo mismo que la DGII: pide la semilla, se autentica, envía el e-CF y verifica el acuse de recibo firmado.
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <input className={`${input} md:col-span-3`} placeholder="Dirección base del receptor (https://…/fe/…)" value={send.url}
                        onChange={(e) => setSend((s) => ({ ...s, url: e.target.value }))} />
                    <input className={input} placeholder="RNC del comprador (el otro negocio)" value={send.rnc}
                        onChange={(e) => setSend((s) => ({ ...s, rnc: e.target.value }))} />
                    <input className={`${input} md:col-span-2`} placeholder="Nombre del comprador (opcional)" value={send.name}
                        onChange={(e) => setSend((s) => ({ ...s, name: e.target.value }))} />
                </div>
                <button type="button" className={`${button} mt-2`} disabled={sendEcf.isPending || !send.url.trim() || !send.rnc.trim()}
                    onClick={() => sendEcf.mutate()}>
                    {sendEcf.isPending ? "Enviando…" : "Enviar e-CF de prueba"}
                </button>
                {errors.send && <p className="mt-2 text-xs text-rose-300">{errors.send}</p>}
                <StepList result={results.send} />
            </section>

            <section className="rounded-lg border border-gray-800 bg-[#111113] p-3">
                <h4 className="text-xs font-semibold text-white">3. Devolver la aprobación comercial al emisor</h4>
                <p className="mt-1 text-xs text-gray-400">
                    Para un e-CF que recibiste y ya aprobaste o rechazaste en «Recepción de e-CF»: firma la aprobación comercial y la envía a la «Dirección base» del emisor.
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <select className={input} value={approval.id} onChange={(e) => setApproval((a) => ({ ...a, id: e.target.value }))}>
                        <option value="">{decided.length ? "Elige el e-CF recibido" : "No hay e-CF recibidos con decisión"}</option>
                        {decided.map((d) => (
                            <option key={d._id} value={d._id}>
                                {d.eNCF} · {d.razonSocialEmisor || d.rncEmisor} · {d.commercial.status === "approved" ? "Aprobado" : "Rechazado"}
                            </option>
                        ))}
                    </select>
                    <input className={`${input} md:col-span-2`} placeholder="Dirección base del emisor (https://…/fe/…)" value={approval.url}
                        onChange={(e) => setApproval((a) => ({ ...a, url: e.target.value }))} />
                </div>
                <button type="button" className={`${button} mt-2`} disabled={sendApproval.isPending || !approval.id || !approval.url.trim()}
                    onClick={() => sendApproval.mutate()}>
                    {sendApproval.isPending ? "Enviando…" : "Enviar aprobación de prueba"}
                </button>
                {errors.approval && <p className="mt-2 text-xs text-rose-300">{errors.approval}</p>}
                <StepList result={results.approval} />
            </section>
        </div>
    );
}
