import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { History, X, ReceiptText, ChevronDown, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

const tr = {
  es: {
    title: "Historial de correcciones", description: "Auditoría de la orden: fecha, responsable, motivo y valores originales.",
    noChanges: "Esta orden todavía no tiene correcciones registradas.", loading: "Cargando historial…",
    error: "No fue posible cargar el historial. Comprueba tus permisos y la conexión.",
    reason: "Motivo", before: "Antes", after: "Después", payment: "Método de pago", detail: "Ver cambios en artículos, extras e importes",
    itemsBefore: "Artículos anteriores", itemsAfter: "Artículos corregidos", cash: "Movimiento financiero", manual: "Declarado como realizado fuera del sistema", noEvidence: "El código interno no es un comprobante bancario.",
    close: "Cerrar", changed: "Campos modificados", reference: "Código de ajuste", performedBy: "Realizado por", amounts: "Desglose", noItems: "Sin artículos", unknown: "Corrección histórica sin código",
  },
  en: {
    title: "Correction history", description: "Order audit: time, person, reason, and original values.",
    noChanges: "This order has no recorded corrections yet.", loading: "Loading history…",
    error: "Could not load the audit history. Check your permissions and connection.",
    reason: "Reason", before: "Before", after: "After", payment: "Payment method", detail: "View item, extra, and amount changes",
    itemsBefore: "Previous items", itemsAfter: "Corrected items", cash: "Financial adjustment", manual: "Declared completed outside the app", noEvidence: "An internal ID is not a bank receipt.",
    close: "Close", changed: "Changed fields", reference: "Adjustment ID", performedBy: "Performed by", amounts: "Amounts", noItems: "No items", unknown: "Legacy correction without an ID",
  },
};

export default function OrderCorrectionHistory({ orderId, onClose }) {
  const { i18n } = useTranslation();
  const lang = String(i18n.resolvedLanguage || i18n.language || "es").startsWith("en") ? "en" : "es";
  const t = tr[lang];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    api.get(`/api/order/${orderId}/correction/history`).then((res) => {
      if (alive) setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    }).catch(() => { if (alive) setError(t.error); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; document.body.style.overflow = oldOverflow; };
  }, [orderId, t.error]);
  const money = (n) => Number(n ?? 0).toFixed(2);
  const lineText = (line) => `${line.name || "—"} × ${line.quantity || 0}${line.addons?.length ? ` · ${line.addons.map(x => `${x.name} × ${x.quantity}`).join(", ")}` : ""}`;
  const body = (
    <div className="fixed inset-0 z-[2147483001] flex items-center justify-center bg-black/80 px-2 sm:px-4"
      style={{ paddingTop: "max(12px,env(safe-area-inset-top,0px))", paddingBottom: "calc(7rem + env(safe-area-inset-bottom,0px))" }}
      onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={t.title}
        onClick={e => e.stopPropagation()}
        className="flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-sky-500/25 bg-[#151515] text-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div><h2 className="flex items-center gap-2 text-lg font-bold"><History className="h-5 w-5 text-sky-400" />{t.title}</h2>
            <p className="mt-1 text-xs text-gray-400">{t.description}</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label={t.close}><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {loading && <p className="text-sm text-gray-400">{t.loading}</p>}
          {error && <p role="alert" className="rounded-lg bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
          {!loading && !error && !rows.length && <p className="rounded-xl bg-white/5 p-5 text-sm text-gray-400">{t.noChanges}</p>}
          {rows.map((row, i) => (
            <article key={row.id || i} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400"/><span className="font-semibold">{row.actor?.name || "—"}</span></div>
                <time className="text-xs text-gray-400">{row.at ? new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.at)) : "—"}</time>
              </div>
              <p className="mt-3 text-xs text-gray-400">{t.reason}</p><p className="text-sm">{row.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">{(row.changed || []).map(c => <span key={c} className="rounded-md bg-white/10 px-2 py-1 text-xs text-gray-200">{c}</span>)}</div>
              <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-black/20 p-3 text-sm">
                <div><div className="text-xs text-gray-400">{t.before}</div><strong>{money(row.previousTotal)}</strong></div>
                <div><div className="text-xs text-gray-400">{t.after}</div><strong className="text-emerald-300">{money(row.nextTotal)}</strong></div>
                {row.previousPaymentMethod !== row.nextPaymentMethod && <div className="col-span-2 text-xs">{t.payment}: {row.previousPaymentMethod} → {row.nextPaymentMethod}</div>}
              </div>
              {row.settlement && <div className="mt-3 flex items-start gap-2 rounded-lg border border-sky-500/20 p-3 text-xs text-sky-200">
                <ReceiptText className="h-4 w-4 shrink-0"/><span>{t.cash}: {row.settlement.direction} {money(row.settlement.amount)} · {t.manual}
                <span className="mt-1 block font-mono">{t.reference}: {row.code || row.settlement.reference || t.unknown}</span>
                <span className="mt-1 block text-sky-200/70">{t.noEvidence}</span></span>
              </div>}
              <details className="group mt-3 rounded-lg border border-white/10 p-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm">{t.detail}<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180"/></summary>
                <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                  {[{title:t.itemsBefore,items:row.previousItems,bills:row.previousBills},{title:t.itemsAfter,items:row.nextItems,bills:row.nextBills}].map((x,j) => (
                    <div key={j} className="rounded-lg bg-black/20 p-3"><strong>{x.title}</strong>
                      <ul className="mt-2 space-y-1 text-gray-300">{(x.items || []).map((line,k) => <li key={k}>{lineText(line)}</li>)}{!(x.items || []).length && <li>{t.noItems}</li>}</ul>
                      {x.bills && <pre className="mt-2 overflow-auto whitespace-pre-wrap text-[11px] text-gray-400">{JSON.stringify(x.bills,null,2)}</pre>}
                    </div>
                  ))}
                </div>
              </details>
            </article>
          ))}
        </div>
        <footer className="shrink-0 border-t border-white/10 p-3 text-right"><button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium">{t.close}</button></footer>
      </section>
    </div>
  );
  return createPortal(body, document.body);
}
