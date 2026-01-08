import React, { useEffect, useMemo, useState } from "react";

function money(n = 0) {
    return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Intenta detectar estructura típica: item.price, item.qty, item.quantity, item.total, etc.
function getItemQty(item) {
    return Number(item.qty ?? item.quantity ?? 1);
}
function getItemPrice(item) {
    // si existe unitPrice o price (o dish.price)
    const p = item.unitPrice ?? item.price ?? item?.dish?.price;
    if (p != null) return Number(p);
    // fallback: si viene total y qty
    const q = getItemQty(item);
    const t = item.total ?? item.amount;
    if (t != null && q) return Number(t) / Number(q);
    return 0;
}
function getItemName(item) {
        return (
                item.dishName ??
                item?.dish?.name ??
                item.name ??
                item.title ??
                item.productName ??
                "Item"
            );
}
function getItemId(item, idx) {
    // prioriza ids estables (dishId / dish._id) para que allocations no se rompan
        return item._id ?? item.id ?? item.dishId ?? item?.dish?._id ?? item.sku ?? `${idx}`;
}

const DEFAULT_ACCOUNTS = [
    { id: "acc1", name: "Cuenta 1" },
    { id: "acc2", name: "Cuenta 2" },
];

export default function SplitBillModal({ order, onClose, onSave }) {
    if (!open) return null;
    const items = useMemo(() => {
        const raw = order?.items || order?.orderItems || [];
        return raw.map((it, idx) => {
            const id = getItemId(it, idx);
            const qty = getItemQty(it);
            const price = getItemPrice(it);
            return {
                _raw: it,
                id,
                name: getItemName(it),
                qty,
                price,
            };
        });
    }, [order]);

    const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
    const [activeAccId, setActiveAccId] = useState("acc1");

    // allocations[itemId][accId] = qty asignada
    const [allocations, setAllocations] = useState({});

    useEffect(() => {
        // Inicial: todo a Cuenta 1
        const init = {};
        for (const it of items) {
            init[it.id] = { acc1: it.qty };
        }
        setAllocations(init);
    }, [items]);

    const remainingByItem = useMemo(() => {
        const rem = {};
        for (const it of items) {
            const map = allocations[it.id] || {};
            const used = Object.values(map).reduce((a, b) => a + Number(b || 0), 0);
            rem[it.id] = Math.max(0, it.qty - used);
        }
        return rem;
    }, [items, allocations]);

    const totalsByAcc = useMemo(() => {
        const totals = {};
        for (const acc of accounts) totals[acc.id] = 0;

        for (const it of items) {
            const map = allocations[it.id] || {};
            for (const accId of Object.keys(map)) {
                const q = Number(map[accId] || 0);
                if (!q) continue;
                totals[accId] = (totals[accId] || 0) + it.price * q;
            }
        }
        return totals;
    }, [items, accounts, allocations]);

    const grandTotal = useMemo(() => {
        return Object.values(totalsByAcc).reduce((a, b) => a + Number(b || 0), 0);
    }, [totalsByAcc]);

    const addAccount = () => {
        const next = accounts.length + 1;
        const id = `acc${next}`;
        setAccounts((prev) => [...prev, { id, name: `Cuenta ${next}` }]);
        setActiveAccId(id);
    };

    const setAlloc = (itemId, accId, value) => {
        const v = Math.max(0, Math.floor(Number(value || 0)));
        setAllocations((prev) => {
            const current = prev[itemId] || {};
            // Limitar para no pasar del qty total del item
            const it = items.find((x) => x.id === itemId);
            const maxQty = it?.qty ?? 0;

            // Calcula cuánto usan las otras cuentas
            const others = Object.keys(current)
                .filter((k) => k !== accId)
                .reduce((a, k) => a + Number(current[k] || 0), 0);

            const allowed = Math.max(0, maxQty - others);
            const finalV = Math.min(v, allowed);

            const updated = { ...current, [accId]: finalV };
            // Limpia ceros
            Object.keys(updated).forEach((k) => {
                if (!updated[k]) delete updated[k];
            });

            return { ...prev, [itemId]: updated };
        });
    };

    const splitEqualSimple = () => {
        // Divide subtotal por #cuentas proporcionalmente por item (simple: reparte qty)
        setAllocations(() => {
            const out = {};
            const n = accounts.length;

            for (const it of items) {
                const base = Math.floor(it.qty / n);
                let rem = it.qty % n;

                const m = {};
                accounts.forEach((acc) => {
                    m[acc.id] = base + (rem > 0 ? 1 : 0);
                    if (rem > 0) rem--;
                });

                // Limpia ceros
                Object.keys(m).forEach((k) => {
                    if (!m[k]) delete m[k];
                });

                out[it.id] = m;
            }
            return out;
        });
    };

    const validateAllAllocated = () => {
        for (const it of items) {
            const map = allocations[it.id] || {};
            const used = Object.values(map).reduce((a, b) => a + Number(b || 0), 0);
            if (used !== it.qty) return false;
        }
        return true;
    };

    const handleSave = () => {
        if (!validateAllAllocated()) {
            alert("Debes asignar el 100% de las cantidades antes de guardar.");
            return;
        }

        // Construye splitBills para backend
        const splitBills = accounts.map((acc) => {
            const lineItems = [];
            for (const it of items) {
                const q = Number((allocations[it.id] || {})[acc.id] || 0);
                if (!q) continue;
                lineItems.push({
                    itemId: it.id,
                    name: it.name,
                    qty: q,
                    unitPrice: it.price,
                    lineTotal: it.price * q,
                });
            }

            const subtotal = lineItems.reduce((a, x) => a + Number(x.lineTotal || 0), 0);

            return {
                accountId: acc.id,
                accountName: acc.name,
                items: lineItems,
                subtotal,
                // En esta fase dejo tax/tip en 0 para que tú decidas regla:
                // - proporcional por subtotal
                // - o igual
                // - o manual por cuenta
                tax: 0,
                tip: 0,
                total: subtotal,
                paid: false,
            };
        });

        onSave?.({
                        orderId: order?._id,
                        accounts,
                        allocations,
                        totals: {
                            byAccount: totalsByAcc,
                                grandTotal,
                            },
                    splitBills,
                    });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
            <div className="w-full max-w-5xl rounded-2xl bg-[#1f1f1f] border border-white/10 shadow-xl p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-white font-semibold text-lg">Dividir cuenta</h3>
                        <p className="text-xs text-gray-400 mt-1">
                            Asigna cantidades por ítem a cada cuenta. Luego podrás cobrar por separado.
                        </p>
                    </div>

                    <button onClick={onClose} className="text-gray-300 hover:text-white text-sm">
                        X
                    </button>
                </div>

                {/* Quick actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={splitEqualSimple}
                        className="rounded-lg bg-white/10 hover:bg-white/15 text-gray-100 text-xs px-3 py-2"
                    >
                        Dividir igual
                    </button>

                    {/* “Dividir por monto” lo dejo preparado (normalmente requiere UI extra) */}
                    <button
                        type="button"
                        disabled
                        className="rounded-lg bg-white/5 text-gray-500 text-xs px-3 py-2 cursor-not-allowed"
                        title="Lo hacemos en el siguiente paso (requiere UI para asignar montos)"
                    >
                        Dividir por monto (próximo)
                    </button>
                </div>

                {/* Body */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: items */}
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-white">Ítems del pedido</h4>
                            <div className="text-xs text-gray-400">
                                Total asignado: ${money(grandTotal)}
                            </div>
                        </div>

                        <div className="mt-3 space-y-2 max-h-[420px] overflow-auto pr-1">
                            {items.map((it) => (
                                <div key={it.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm text-white font-medium">{it.name}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Qty: {it.qty} • Unit: ${money(it.price)}
                                            </div>
                                        </div>

                                        <div className="text-xs text-gray-400">
                                            Restante: {remainingByItem[it.id] ?? 0}
                                        </div>
                                    </div>

                                    {/* Allocation inputs */}
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        {accounts.map((acc) => {
                                            const val = (allocations[it.id] || {})[acc.id] || 0;
                                            return (
                                                <label key={acc.id} className="text-xs text-gray-300">
                                                    {acc.name}
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        value={val}
                                                        onChange={(e) => setAlloc(it.id, acc.id, e.target.value)}
                                                        className="mt-1 w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: accounts */}
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold text-white">Cuentas</h4>
                            <button
                                type="button"
                                onClick={addAccount}
                                className="rounded-lg bg-white/10 hover:bg-white/15 text-gray-100 text-xs px-3 py-2"
                            >
                                + Añadir
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="mt-3 flex flex-wrap gap-2">
                            {accounts.map((acc) => (
                                <button
                                    key={acc.id}
                                    type="button"
                                    onClick={() => setActiveAccId(acc.id)}
                                    className={`rounded-lg px-3 py-2 text-xs border transition ${
                                        activeAccId === acc.id
                                            ? "bg-white/15 border-white/20 text-white"
                                            : "bg-transparent border-white/10 text-gray-300 hover:bg-white/10"
                                    }`}
                                >
                                    {acc.name}
                                </button>
                            ))}
                        </div>

                        {/* Active account detail */}
                        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-white font-semibold">
                                    {accounts.find((a) => a.id === activeAccId)?.name}
                                </div>
                                <div className="text-sm text-white">
                                    ${money(totalsByAcc[activeAccId] || 0)}
                                </div>
                            </div>

                            <div className="mt-3 space-y-2 max-h-[320px] overflow-auto pr-1">
                                {items
                                    .map((it) => {
                                        const q = Number((allocations[it.id] || {})[activeAccId] || 0);
                                        if (!q) return null;
                                        return (
                                            <div key={it.id} className="flex items-center justify-between text-xs text-gray-200">
                                                <div className="truncate">
                                                    {it.name} <span className="text-gray-400">x{q}</span>
                                                </div>
                                                <div>${money(it.price * q)}</div>
                                            </div>
                                        );
                                    })
                                    .filter(Boolean)}

                                {!items.some((it) => Number((allocations[it.id] || {})[activeAccId] || 0) > 0) && (
                                    <div className="text-xs text-gray-400">No hay ítems asignados a esta cuenta.</div>
                                )}
                            </div>

                            <div className="mt-4 border-t border-white/10 pt-3 flex items-center justify-between">
                                <div className="text-xs text-gray-400">Subtotal</div>
                                <div className="text-sm text-white">${money(totalsByAcc[activeAccId] || 0)}</div>
                            </div>
                        </div>

                        <p className="mt-3 text-[11px] text-gray-500">
                            Nota: en este v1 el tax/propina se calculan después (proporcional o manual). Lo añadimos en el siguiente paso.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-4 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={handleSave}
                        className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-black bg-slate-200 hover:bg-slate-100"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
