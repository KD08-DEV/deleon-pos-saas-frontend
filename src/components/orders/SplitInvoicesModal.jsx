// SplitInvoicesModal.jsx
import React, { useMemo } from "react";

function money(n) {
    const v = Number(n || 0);
    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SplitInvoicesModal({ open, onClose, splitBills, onPrint }) {
    const accounts = useMemo(() => splitBills || [], [splitBills]);
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
            <div className="w-full max-w-3xl rounded-2xl bg-[#1f1f1f] border border-white/10 shadow-xl p-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-white font-semibold text-lg">Facturas divididas</h3>
                        <p className="text-xs text-gray-400 mt-1">
                            Selecciona una cuenta para ver/imprimir su factura.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-300 hover:text-white text-sm">X</button>
                </div>

                <div className="mt-4 grid gap-3">
                    {accounts.map((b, idx) => {
                        const name = b.accountName || b.name || `Cuenta ${idx + 1}`;
                        const subtotal =
                            Number(b.subtotal ?? 0) ||
                            (b.items || []).reduce((acc, it) => acc + Number(it.lineTotal ?? it.total ?? 0), 0);

                        return (
                            <div key={b.accountId || b.id || idx} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-white font-semibold">{name}</div>
                                    <div className="text-sm text-white font-semibold">${money(subtotal)}</div>
                                </div>

                                <div className="mt-2 space-y-1">
                                    {(b.items || []).slice(0, 3).map((it, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs text-gray-200">
                                            <span className="truncate">{it.name} x{it.qty}</span>
                                            <span>${money(it.lineTotal ?? it.total ?? 0)}</span>
                                        </div>
                                    ))}
                                    {(b.items || []).length > 3 && (
                                        <div className="text-xs text-gray-400 mt-1">
                                            +{(b.items || []).length - 3} items más…
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 flex justify-end">
                                    <button
                                        className="rounded-lg px-3 py-2 text-xs font-semibold text-black bg-slate-200 hover:bg-slate-100"
                                        onClick={() => onPrint(b)}
                                    >
                                        Ver / Imprimir
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
