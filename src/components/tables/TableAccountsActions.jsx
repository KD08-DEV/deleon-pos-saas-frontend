import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import api, { getScope } from "../../lib/api";
import Invoice from "../invoice/Invoice";

/**
 * 12.8.4.2
 * - Confirmación de nuevo consumo mediante modal accesible en lugar del diálogo nativo.
 * - Mejora legibilidad visual de cuentas y selector de división.
 * - Permite dividir después de facturar SOLO si NO es e-CF y sigue pendiente de cobro.
 * - El estado visual ya no muestra "Pendiente" cuando existe e-CF o factura no electrónica.
 */
export default function TableAccountsActions({ table, variant = "split", onOpenOrder, onChanged }) {
  const qc = useQueryClient();
  const [showSplit, setShowSplit] = useState(false);
  const [splitOrderId, setSplitOrderId] = useState("");
  const [quantities, setQuantities] = useState({});
  const [busy, setBusy] = useState(false);
  const [reprintOrder, setReprintOrder] = useState(null);
  const [showNewConsumptionConfirm, setShowNewConsumptionConfirm] = useState(false);
  const id = String(table?._id || "");
  const scope = getScope();
  const tenantId = String(scope?.tenantId || "");
  const clientId = String(scope?.clientId || "default");
  const accountsKey = ["table-accounts-12842", tenantId, clientId, id];

  const { data: tableData, refetch } = useQuery({
    queryKey: accountsKey,
    queryFn: async () => (await api.get(`/api/table/${encodeURIComponent(id)}/accounts`)).data?.data,
    enabled: Boolean(id), staleTime: 4000, retry: 0,
  });

  const { data: profile } = useQuery({
    queryKey: ["table-ecf-enabled-12842", tenantId, clientId],
    queryFn: async () => (await api.get("/api/order/ecf/status")).data?.data,
    enabled: Boolean(id), retry: 0, staleTime: 15000,
  });

  const ecfOn = profile?.enabled === true &&
    profile?.sharedProfileEnabled === true && profile?.branch?.prepared === true;

  const accounts = tableData?.accounts || [];
  const activeId = String(tableData?.currentOrderId || "");
  const active = accounts.find((a) => a.orderId === activeId);

  const acceptedStatuses = ["accepted", "accepted_with_observation"];
  const printed = accounts.filter((a) => a.hasEcf && acceptedStatuses.includes(String(a.ecfStatus).toLowerCase()));

  const getVisualStatus = (account) => {
    if (account?.hasEcf) {
      if (acceptedStatuses.includes(String(account.ecfStatus).toLowerCase())) return "Facturada e-CF";
      return "e-CF en proceso";
    }
    if (account?.hasFiscal) return "Facturada";
    if (String(account?.paymentStatus) === "Pagado") return "Pagada";
    return "Pendiente";
  };

  const getStatusTone = (account) => {
    if (account?.hasEcf) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    if (account?.hasFiscal) return "border-sky-500/40 bg-sky-500/10 text-sky-300";
    if (String(account?.paymentStatus) === "Pagado") return "border-indigo-500/40 bg-indigo-500/10 text-indigo-300";
    return "border-sky-500/40 bg-sky-500/10 text-sky-300";
  };

  // El backend decide la elegibilidad con tenant, sucursal, NCF, inventario y estado financiero.
  const splittableAccounts = useMemo(() => (
    accounts.filter((a) => a.canSplit === true)
  ), [accounts]);

  const notify = (e) => enqueueSnackbar(
    e?.response?.data?.code || e?.response?.data?.message || e?.message || "No se pudo completar la operación",
    { variant: "error" }
  );

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: accountsKey });
    await refetch();
    onChanged?.();
  };

  async function printExisting(orderId) {
    if (!ecfOn || busy) return;
    setBusy(true);
    try {
      const [ord, ecf] = await Promise.all([
        api.get(`/api/order/${encodeURIComponent(orderId)}`),
        api.get(`/api/order/${encodeURIComponent(orderId)}/ecf`),
      ]);
      const original = ord.data?.data;
      const result = ecf.data;
      if (!original || result?.exists !== true || !result?.data?.eNCF ||
        !acceptedStatuses.includes(String(result.data.status).toLowerCase())) {
        throw new Error("ECF_NOT_ACCEPTED_FOR_REPRINT");
      }
      setReprintOrder({
        ...original,
        ecf: { ...(original.ecf || {}), ...result.data, exists: true },
        totalAmount: original?.bills?.totalWithTax,
        subTotal: original?.bills?.subtotal,
        taxAmount: original?.bills?.tax,
        discountAmount: original?.bills?.discount,
        tipAmount: original?.bills?.tipAmount,
        facturaNo: original?.fiscal?.invoiceNumber || original?.invoiceNumber || original?.facturaNo,
      });
    } catch (e) {
      notify(e);
    } finally {
      setBusy(false);
    }
  }

  function askNewConsumption() {
    if (!ecfOn || busy || !active?.hasEcf) return;
    setShowNewConsumptionConfirm(true);
  }

  async function newConsumption() {
    setBusy(true);
    try {
      const r = await api.post(`/api/table/${encodeURIComponent(id)}/new-consumption`, {});
      const orderId = r?.data?.data?.orderId;
      if (!orderId) throw new Error("NEW_CONSUMPTION_NO_ORDER");
      setShowNewConsumptionConfirm(false);
      await refresh();
      onOpenOrder?.(orderId);
    } catch (e) {
      notify(e);
    } finally {
      setBusy(false);
    }
  }

  function openSplit() {
    if (!splittableAccounts.length) {
      enqueueSnackbar(
        "Solo se pueden dividir cuentas pendientes y no cerradas fiscalmente. Las facturas electrónicas y los NCF emitidos no se modifican.",
        { variant: "warning" }
      );
      return;
    }
    setSplitOrderId(splittableAccounts.find((p) => p.orderId === activeId)?.orderId || splittableAccounts[0].orderId);
    setQuantities({});
    setShowSplit(true);
  }

  async function confirmSplit() {
    if (busy) return;
    const selected = (accounts.find((a) => a.orderId === splitOrderId)?.items || [])
      .filter((i) => Number(quantities[i.lineId] || 0) > 0)
      .map((i) => ({ lineId: i.lineId, quantity: Number(quantities[i.lineId]) }));
    if (!selected.length) {
      enqueueSnackbar("Selecciona al menos un producto para la nueva cuenta.", { variant: "warning" });
      return;
    }
    setBusy(true);
    try {
      const r = await api.post(`/api/table/${encodeURIComponent(id)}/split`, { orderId: splitOrderId, lines: selected });
      const orderId = r?.data?.data?.orderId;
      if (!orderId) throw new Error("SPLIT_FAILED");
      setShowSplit(false);
      await refresh();
      enqueueSnackbar("Cuenta dividida correctamente.", { variant: "success" });
      onOpenOrder?.(orderId);
    } catch (e) {
      notify(e);
    } finally {
      setBusy(false);
    }
  }

  const selectedAccount = accounts.find((a) => a.orderId === splitOrderId);
  const splitTotal = (selectedAccount?.items || []).reduce(
    (sum, i) => sum + Number(quantities[i.lineId] || 0) * Number(i.unitPrice || 0),
    0
  );

  return <>
    {variant === "split" ? (
      <button
        type="button"
        onClick={openSplit}
        title="Separar productos en dos cuentas"
        className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-[#38bdf8]/60 text-[#38bdf8] bg-[#38bdf8]/5 hover:bg-[#38bdf8]/12 whitespace-nowrap shadow-sm"
      >
        Dividir cuenta
      </button>
    ) : (
      <div className="space-y-3">
        {accounts.length > 1 && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
            <p className="text-xs text-white/70 font-semibold tracking-wide uppercase">Cuentas de esta mesa</p>
            {accounts.map((a, index) => (
              <div key={a.orderId} className="rounded-lg border border-white/10 bg-[#1b1b1b] px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-white">Cuenta {index + 1}</span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusTone(a)}`}>
                      {getVisualStatus(a)}
                    </span>
                  </div>
                  <div className="text-xs text-white/70 mt-1 truncate">
                    Total RD${Number(a.total || 0).toFixed(2)}
                    {a.hasEcf && a.eNCF ? ` · ${a.eNCF}` : ""}
                    {!a.hasEcf && a.hasFiscal ? " · No electrónica" : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg px-3 py-1.5 bg-white/10 text-sm text-white hover:bg-white/15 border border-white/10"
                  onClick={() => onOpenOrder?.(a.orderId)}
                >
                  Abrir
                </button>
              </div>
            ))}
          </div>
        )}

        {ecfOn && printed.length > 0 && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
            <div className="text-xs text-[#38bdf8] font-semibold uppercase tracking-wide">e-CF emitidas · solo lectura</div>
            {printed.map((a) => (
              <button
                key={a.orderId}
                type="button"
                disabled={busy}
                onClick={() => printExisting(a.orderId)}
                className="block w-full text-xs rounded-lg border border-white/15 bg-[#1d1d1d] p-2.5 text-white hover:bg-white/10 text-left disabled:opacity-50"
              >
                <span className="block font-semibold">Ver / Reimprimir {a.eNCF}</span>
                <span className="block text-white/60 mt-0.5">Se reutiliza el mismo e-NCF y el mismo QR.</span>
              </button>
            ))}
            {active?.hasEcf && acceptedStatuses.includes(String(active.ecfStatus).toLowerCase()) && (
              <button
                type="button"
                disabled={busy}
                onClick={askNewConsumption}
                className="w-full rounded-lg p-2.5 text-sm font-semibold text-black bg-[#38bdf8] hover:bg-[#7dd3fc] disabled:opacity-50"
              >
                + Nuevo consumo
              </button>
            )}
          </div>
        )}
      </div>
    )}

    {showSplit && createPortal(
      <div className="fixed inset-0 z-[15000] bg-black/80 p-4 flex items-center justify-center" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setShowSplit(false); }}>
        <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#111214] text-white p-5 shadow-2xl space-y-4" onMouseDown={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg">Dividir cuenta · Mesa {table?.tableNo}</h3>
              <p className="text-xs text-white/60 mt-1">Selecciona la cuenta de origen y las cantidades que pasarán a una nueva cuenta.</p>
            </div>
            <button type="button" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10" onClick={() => setShowSplit(false)} disabled={busy}>Cerrar</button>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/75 leading-5">
            <p>• Las <span className="text-[#38bdf8] font-semibold">facturas electrónicas (e-CF)</span> no se pueden dividir después de emitidas.</p>
            <p>• Puedes dividir cuentas <span className="text-sky-300 font-semibold">no electrónicas aún modificables</span> y pendientes de cobro. Los NCF ya emitidos solo admiten división del pago, no de artículos.</p>
          </div>

          {splittableAccounts.length > 1 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">Elegir cuenta a dividir</div>
              <div className="grid gap-2">
                {splittableAccounts.map((a, i) => {
                  const selected = a.orderId === splitOrderId;
                  return (
                    <button
                      key={a.orderId}
                      type="button"
                      onClick={() => { setSplitOrderId(a.orderId); setQuantities({}); }}
                      className={`text-left rounded-xl border px-3 py-3 transition ${selected ? "border-[#38bdf8] bg-[#38bdf8]/10" : "border-white/10 bg-[#1a1a1a] hover:bg-[#202020]"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-sm text-white">Cuenta {i + 1}</div>
                          <div className="text-xs text-white/65 mt-1">RD${Number(a.total || 0).toFixed(2)} · {getVisualStatus(a)}</div>
                        </div>
                        {selected && <span className="rounded-full bg-[#38bdf8] text-black text-[11px] font-bold px-2 py-1">Seleccionada</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm font-semibold">Productos a mover a la nueva cuenta</div>
            {(selectedAccount?.items || []).map((i, index) => (
              <div key={i.lineId || index} className="rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-white truncate">{i.name}</div>
                  <div className="text-xs text-white/60 mt-1">Disponible: {i.quantity} · RD${Number(i.unitPrice || 0).toFixed(2)} c/u</div>
                </div>
                <input
                  type="number"
                  min="0"
                  max={i.quantity}
                  step="1"
                  value={quantities[i.lineId] ?? 0}
                  onChange={(e) => setQuantities((x) => ({ ...x, [i.lineId]: e.target.value }))}
                  className="w-24 rounded-xl bg-[#242424] border border-white/15 px-3 py-2 text-right text-white font-semibold outline-none focus:border-[#38bdf8]"
                />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-white/70">Base estimada de la nueva cuenta</span>
            <span className="font-bold text-[#38bdf8]">RD${splitTotal.toFixed(2)}</span>
          </div>

          <div className="flex gap-2">
            <button type="button" className="flex-1 rounded-xl p-2.5 bg-white/8 border border-white/10 text-white" disabled={busy} onClick={() => setShowSplit(false)}>Cancelar</button>
            <button type="button" className="flex-1 rounded-xl p-2.5 bg-[#38bdf8] text-black font-semibold disabled:opacity-50" disabled={busy} onClick={confirmSplit}>Crear segunda cuenta</button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {showNewConsumptionConfirm && createPortal(
      <div className="fixed inset-0 z-[15500] bg-black/80 p-4 flex items-center justify-center" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setShowNewConsumptionConfirm(false); }}>
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#111214] text-white p-5 shadow-2xl space-y-4" onMouseDown={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">¿Crear nuevo consumo?</h3>
              <p className="text-sm text-white/65 mt-1">La e-CF anterior se conservará intacta y el consumo adicional se abrirá en una cuenta nueva.</p>
            </div>
            <button type="button" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10" onClick={() => setShowNewConsumptionConfirm(false)} disabled={busy}>Cerrar</button>
          </div>
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200 leading-5">
            No se emitirá otro e-NCF sobre la cuenta anterior. Solo se abrirá una orden nueva para los artículos adicionales.
          </div>
          <div className="flex gap-2">
            <button type="button" className="flex-1 rounded-xl p-2.5 bg-white/8 border border-white/10 text-white" disabled={busy} onClick={() => setShowNewConsumptionConfirm(false)}>Cancelar</button>
            <button type="button" className="flex-1 rounded-xl p-2.5 bg-[#38bdf8] text-black font-semibold disabled:opacity-50" disabled={busy} onClick={newConsumption}>Sí, abrir nueva cuenta</button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {reprintOrder && createPortal(
      <div className="fixed inset-0 z-[16000]">
        <Invoice order={reprintOrder} onClose={() => setReprintOrder(null)} canReleaseTable={false} />
      </div>,
      document.body
    )}
  </>;
}
