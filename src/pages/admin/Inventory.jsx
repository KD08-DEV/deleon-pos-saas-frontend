import { useEffect, useMemo, useState } from "react";
import Modal from "../../components/shared/Modal";
import { inventoryApi, downloadBlob } from "../../lib/inventoryApi";

const emptyForm = {
    name: "",
    category: "General",
    unit: "unidad",
    cost: 0,
    stockCurrent: 0,
    stockMin: 0,
};

function Field({ label, children }) {
    return (
        <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-200">{label}</div>
            {children}
        </label>
    );
}

function Help({ children }) {
    return <div className="mt-1 text-xs text-gray-400">{children}</div>;
}

const inputCls =
    "w-full p-3 border border-gray-800 rounded-xl bg-[#0b0b0b] text-white placeholder:text-gray-500 " +
    "focus:outline-none focus:ring-2 focus:ring-yellow-500/40";

export default function Inventory({ plan }) {
    const rawPlan = (plan || "").toLowerCase();
    const canUseInventory = ["pro", "vip"].includes(rawPlan);

    const [items, setItems] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [q, setQ] = useState("");

    const [openForm, setOpenForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const [openMove, setOpenMove] = useState(false);
    const [moveItem, setMoveItem] = useState(null);
    const [movement, setMovement] = useState({
        type: "purchase",
        qty: 1,
        unitCost: "",
        note: "",
    });

    // Tabs
    const [tab, setTab] = useState("items"); // items | consumption

    // Consumption range
    const [range, setRange] = useState(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const today = `${yyyy}-${mm}-${dd}`;
        return { from: today, to: today };
    });

    const [consumptionRows, setConsumptionRows] = useState([]);
    const [loadingConsumption, setLoadingConsumption] = useState(false);

    async function loadConsumption() {
        setLoadingConsumption(true);
        try {
            const { data } = await inventoryApi.consumption({
                from: range.from ? new Date(range.from).toISOString() : undefined,
                to: range.to ? new Date(range.to).toISOString() : undefined,
            });
            setConsumptionRows(data.rows || []);
        } finally {
            setLoadingConsumption(false);
        }
    }

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return items;
        return items.filter(
            (i) =>
                (i.name || "").toLowerCase().includes(s) ||
                (i.category || "").toLowerCase().includes(s)
        );
    }, [items, q]);

    async function load() {
        const [{ data: a }, { data: b }] = await Promise.all([
            inventoryApi.listItems(),
            inventoryApi.lowStock(),
        ]);
        setItems(a.items || []);
        setLowStock(b.items || []);
    }

    useEffect(() => {
        if (!canUseInventory) return;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canUseInventory]);

    if (!canUseInventory) {
        return (
            <div className="p-2">
                <h2 className="text-xl font-semibold">Inventario</h2>
                <p className="mt-2 text-gray-400">
                    Este módulo está disponible solo para los planes <b>Pro (Premium)</b> y{" "}
                    <b>VIP</b>.
                </p>
            </div>
        );
    }

    function openCreate() {
        setQ(""); // evita “no aparece” por filtros previos
        setEditing(null);
        setForm(emptyForm);
        setOpenForm(true);
    }

    function openEdit(item) {
        setEditing(item);
        setForm({
            name: item.name || "",
            category: item.category || "General",
            unit: item.unit || "unidad",
            cost: item.cost ?? 0,
            stockCurrent: item.stockCurrent ?? 0,
            stockMin: item.stockMin ?? 0,
        });
        setOpenForm(true);
    }

    async function saveItem(e) {
        e.preventDefault();
        if (!form.name.trim()) return;

        if (editing?._id) {
            await inventoryApi.updateItem(editing._id, {
                name: form.name,
                category: form.category,
                unit: form.unit,
                cost: Number(form.cost) || 0,
                stockMin: Number(form.stockMin) || 0,
            });
        } else {
            await inventoryApi.createItem({
                ...form,
                cost: Number(form.cost) || 0,
                stockCurrent: Number(form.stockCurrent) || 0,
                stockMin: Number(form.stockMin) || 0,
            });
        }

        setOpenForm(false);
        await load();
    }

    async function archiveItem(id) {
        await inventoryApi.archiveItem(id);
        await load();
    }

    function openMovementModal(item) {
        setMoveItem(item);
        setMovement({ type: "purchase", qty: 1, unitCost: "", note: "" });
        setOpenMove(true);
    }

    async function submitMovement(e) {
        e.preventDefault();
        if (!moveItem?._id) return;

        await inventoryApi.createMovement({
            itemId: moveItem._id,
            type: movement.type,
            qty: Number(movement.qty),
            unitCost: movement.unitCost === "" ? undefined : Number(movement.unitCost),
            note: movement.note,
        });

        setOpenMove(false);
        await load();
    }

    async function exportItems() {
        const res = await inventoryApi.exportItemsCSV();
        downloadBlob(res.data, "inventory-items.csv");
    }

    async function exportMovements() {
        const res = await inventoryApi.exportMovementsCSV();
        downloadBlob(res.data, "inventory-movements.csv");
    }

    return (
        <div className="p-2">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">Inventario</h2>
                <div className="flex gap-2">
                    <button
                        className="px-4 py-2 rounded-xl bg-[#f6b100] text-black font-semibold"
                        onClick={openCreate}
                    >
                        Nuevo insumo
                    </button>
                    <button
                        className="px-4 py-2 rounded-xl border border-gray-700"
                        onClick={exportItems}
                    >
                        Exportar Items
                    </button>
                    <button
                        className="px-4 py-2 rounded-xl border border-gray-700"
                        onClick={exportMovements}
                    >
                        Exportar Kardex
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="mt-3 flex gap-2">
                <button
                    className={`px-4 py-2 rounded-xl border ${
                        tab === "items"
                            ? "border-yellow-500/50 bg-yellow-500/10"
                            : "border-gray-700"
                    }`}
                    onClick={() => setTab("items")}
                >
                    Insumos
                </button>

                <button
                    className={`px-4 py-2 rounded-xl border ${
                        tab === "consumption"
                            ? "border-yellow-500/50 bg-yellow-500/10"
                            : "border-gray-700"
                    }`}
                    onClick={() => {
                        setTab("consumption");
                        loadConsumption();
                    }}
                >
                    Consumo / Vendido
                </button>
            </div>

            {/* TAB: INSUMOS */}
            {tab === "items" && (
                <>
                    {lowStock.length > 0 && (
                        <div className="mt-4 p-4 rounded-2xl border border-gray-800 bg-[#111111]">
                            <div className="font-semibold">Alertas: Stock bajo</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {lowStock.slice(0, 12).map((i) => (
                                    <span
                                        key={i._id}
                                        className="px-3 py-1 rounded-full border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-sm"
                                    >
                    {i.name} ({i.stockCurrent}/{i.stockMin})
                  </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-4">
                        <input
                            className={inputCls}
                            placeholder="Buscar por nombre o categoría..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>

                    <div className="mt-4 grid gap-3">
                        {filtered.map((i) => {
                            const stockCurrent = Number(i.stockCurrent ?? 0);
                            const stockMin = Number(i.stockMin ?? 0);
                            const isLow = stockCurrent <= stockMin && stockMin > 0;

                            return (
                                <div
                                    key={i._id}
                                    className="p-4 rounded-2xl border border-gray-800 bg-[#111111] flex items-center justify-between"
                                >
                                    <div>
                                        <div className="font-semibold flex items-center gap-2">
                                            {i.name}
                                            {isLow && (
                                                <span className="text-xs px-2 py-1 rounded-full border border-yellow-500/40 bg-yellow-500/10 text-yellow-300">
                          Bajo
                        </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {i.category} · {i.unit} · Costo: {i.cost ?? 0} · Stock:{" "}
                                            {i.stockCurrent ?? 0} (Min: {i.stockMin ?? 0})
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            className="px-4 py-2 rounded-xl border border-gray-700"
                                            onClick={() => openMovementModal(i)}
                                        >
                                            Movimiento
                                        </button>
                                        <button
                                            className="px-4 py-2 rounded-xl border border-gray-700"
                                            onClick={() => openEdit(i)}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            className="px-4 py-2 rounded-xl border border-gray-700"
                                            onClick={() => archiveItem(i._id)}
                                        >
                                            Archivar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* TAB: CONSUMO / VENDIDO */}
            {tab === "consumption" && (
                <div className="mt-4">
                    <div className="p-4 rounded-2xl border border-gray-800 bg-[#111111]">
                        <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
                            <div>
                                <div className="font-semibold">Consumo / Vendido</div>
                                <div className="text-sm text-gray-400">
                                    Resumen basado en movimientos automáticos tipo <b>sale</b> al
                                    completar órdenes.
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 items-end">
                                <div>
                                    <div className="text-xs text-gray-400 mb-1">Desde</div>
                                    <input
                                        type="date"
                                        className="p-2 border border-gray-800 rounded-xl bg-[#0b0b0b] text-white"
                                        value={range.from}
                                        onChange={(e) =>
                                            setRange((r) => ({ ...r, from: e.target.value }))
                                        }
                                    />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400 mb-1">Hasta</div>
                                    <input
                                        type="date"
                                        className="p-2 border border-gray-800 rounded-xl bg-[#0b0b0b] text-white"
                                        value={range.to}
                                        onChange={(e) =>
                                            setRange((r) => ({ ...r, to: e.target.value }))
                                        }
                                    />
                                </div>
                                <button
                                    className="px-4 py-2 rounded-xl bg-[#f6b100] text-black font-semibold"
                                    onClick={loadConsumption}
                                >
                                    Ver
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                            {loadingConsumption && (
                                <div className="text-gray-400">Cargando...</div>
                            )}

                            {!loadingConsumption && consumptionRows.length === 0 && (
                                <div className="text-gray-400">
                                    No hay consumo/ventas en el rango seleccionado.
                                </div>
                            )}

                            {!loadingConsumption &&
                                consumptionRows.map((r) => {
                                    const stockCurrent = Number(r.stockCurrent ?? 0);
                                    const stockMin = Number(r.stockMin ?? 0);
                                    const soldQty = Number(r.soldQty ?? 0);
                                    const low = stockMin > 0 && stockCurrent <= stockMin;

                                    return (
                                        <div
                                            key={r.itemId}
                                            className="p-4 rounded-2xl border border-gray-800 bg-[#0b0b0b] flex items-center justify-between"
                                        >
                                            <div>
                                                <div className="font-semibold flex items-center gap-2">
                                                    {r.name}
                                                    {low && (
                                                        <span className="text-xs px-2 py-1 rounded-full border border-yellow-500/40 bg-yellow-500/10 text-yellow-300">
                              Bajo
                            </span>
                                                    )}
                                                </div>

                                                <div className="text-sm text-gray-400">
                                                    Vendido: <b className="text-white">{soldQty}</b>{" "}
                                                    {r.unit} · Stock:{" "}
                                                    <b className="text-white">{stockCurrent}</b> (Min:{" "}
                                                    {stockMin})
                                                </div>

                                                {low && (
                                                    <div className="mt-1 text-sm text-yellow-300">
                                                        Alerta: stock bajo
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear/Editar */}
            {openForm && (
                <Modal
                    title={editing ? "Editar insumo" : "Nuevo insumo"}
                    onClose={() => setOpenForm(false)}
                >
                    <form onSubmit={saveItem} className="w-full max-w-full text-white">
                        <div className="grid gap-4">
                            <Field label="Nombre del insumo *">
                                <input
                                    className={inputCls}
                                    placeholder="Ej: Arroz"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                                <Help>Cómo lo verás en reportes y kardex.</Help>
                            </Field>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Categoría">
                                    <input
                                        className={inputCls}
                                        placeholder="Ej: Granos"
                                        value={form.category}
                                        onChange={(e) =>
                                            setForm({ ...form, category: e.target.value })
                                        }
                                    />
                                    <Help>Ej: Carnes, Vegetales, Bebidas.</Help>
                                </Field>

                                <Field label="Unidad">
                                    <select
                                        className="w-full p-3 border border-gray-800 rounded-xl bg-[#0b0b0b] text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                                        value={form.unit}
                                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                    >
                                        <option value="unidad">Unidad</option>
                                        <option value="lb">Libra (lb)</option>
                                        <option value="kg">Kilogramo (kg)</option>
                                        <option value="g">Gramo (g)</option>
                                        <option value="l">Litro (L)</option>
                                        <option value="ml">Mililitro (ml)</option>
                                        <option value="pz">Porción</option>
                                        <option value="otro">Otro…</option>
                                    </select>

                                    {form.unit === "otro" && (
                                        <input
                                            className={`${inputCls} mt-2`}
                                            placeholder="Escribe la unidad (ej: caja, funda, bandeja)"
                                            value={form.customUnit || ""}
                                            onChange={(e) => setForm({ ...form, customUnit: e.target.value })}
                                            onBlur={() => {
                                                const v = (form.customUnit || "").trim();
                                                if (v) setForm((f) => ({ ...f, unit: v, customUnit: "" }));
                                            }}
                                        />
                                    )}

                                    <Help>Unidad del insumo para compras, desperdicios y kardex.</Help>
                                </Field>

                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Costo unitario (RD$)">
                                    <input
                                        className={inputCls}
                                        type="number"
                                        step="0.01"
                                        placeholder="Ej: 55.00"
                                        value={form.cost}
                                        onChange={(e) => setForm({ ...form, cost: e.target.value })}
                                    />
                                    <Help>Costo estimado por unidad (opcional).</Help>
                                </Field>

                                <Field label="Stock mínimo (alerta)">
                                    <input
                                        className={inputCls}
                                        type="number"
                                        step="0.01"
                                        placeholder="Ej: 5"
                                        value={form.stockMin}
                                        onChange={(e) =>
                                            setForm({ ...form, stockMin: e.target.value })
                                        }
                                    />
                                    <Help>Si baja de aquí, te saldrá alerta.</Help>
                                </Field>
                            </div>

                            {!editing && (
                                <Field label="Stock inicial">
                                    <input
                                        className={inputCls}
                                        type="number"
                                        step="0.01"
                                        placeholder="Ej: 20"
                                        value={form.stockCurrent}
                                        onChange={(e) =>
                                            setForm({ ...form, stockCurrent: e.target.value })
                                        }
                                    />
                                    <Help>Cuánto tienes ahora mismo en inventario.</Help>
                                </Field>
                            )}
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                className="px-4 py-2 rounded-xl border border-gray-700"
                                onClick={() => setOpenForm(false)}
                            >
                                Cancelar
                            </button>
                            <button className="px-4 py-2 rounded-xl bg-[#f6b100] text-black font-semibold">
                                Guardar
                            </button>
                        </div>

                        {editing && (
                            <p className="mt-3 text-sm text-gray-400">
                                Nota: el stock se ajusta usando “Movimiento” → “Ajuste (+/-)”
                                para que quede registrado en el Kardex.
                            </p>
                        )}
                    </form>
                </Modal>
            )}

            {/* Modal Movimiento */}
            {openMove && moveItem && (
                <Modal
                    title={`Movimiento: ${moveItem.name}`}
                    onClose={() => setOpenMove(false)}
                >
                    <form onSubmit={submitMovement} className="w-full max-w-full text-white">
                        <div className="grid gap-3">
                            <select
                                className="p-3 border border-gray-800 rounded-xl bg-[#0b0b0b] text-white"
                                value={movement.type}
                                onChange={(e) =>
                                    setMovement({ ...movement, type: e.target.value })
                                }
                            >
                                <option value="purchase">Compra (entrada)</option>
                                <option value="waste">Desperdicio (salida)</option>
                                <option value="adjustment">Ajuste (+/-)</option>
                            </select>

                            <input
                                className="p-3 border border-gray-800 rounded-xl bg-[#0b0b0b] text-white"
                                type="number"
                                step="0.01"
                                placeholder={
                                    movement.type === "adjustment" ? "Cantidad (+/-)" : "Cantidad"
                                }
                                value={movement.qty}
                                onChange={(e) =>
                                    setMovement({ ...movement, qty: e.target.value })
                                }
                            />

                            {movement.type === "purchase" && (
                                <input
                                    className="p-3 border border-gray-800 rounded-xl bg-[#0b0b0b] text-white"
                                    type="number"
                                    step="0.01"
                                    placeholder="Costo unitario (opcional)"
                                    value={movement.unitCost}
                                    onChange={(e) =>
                                        setMovement({ ...movement, unitCost: e.target.value })
                                    }
                                />
                            )}

                            <input
                                className="p-3 border border-gray-800 rounded-xl bg-[#0b0b0b] text-white"
                                placeholder="Nota (opcional)"
                                value={movement.note}
                                onChange={(e) =>
                                    setMovement({ ...movement, note: e.target.value })
                                }
                            />
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                className="px-4 py-2 rounded-xl border border-gray-700"
                                onClick={() => setOpenMove(false)}
                            >
                                Cancelar
                            </button>
                            <button className="px-4 py-2 rounded-xl bg-[#f6b100] text-black font-semibold">
                                Registrar
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
