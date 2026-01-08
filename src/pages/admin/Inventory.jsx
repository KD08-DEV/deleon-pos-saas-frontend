import { useEffect, useMemo, useState } from "react";
import Modal from "../../components/shared/Modal";
import { inventoryApi, downloadBlob } from "../../lib/inventoryApi";

const emptyForm = { name: "", category: "General", unit: "unidad", cost: 0, stockCurrent: 0, stockMin: 0 };
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
    const [movement, setMovement] = useState({ type: "purchase", qty: 1, unitCost: "", note: "" });

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return items;
        return items.filter((i) =>
            (i.name || "").toLowerCase().includes(s) || (i.category || "").toLowerCase().includes(s)
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
                    Este módulo está disponible solo para los planes <b>Pro (Premium)</b> y <b>VIP</b>.
                </p>
            </div>
        );
    }

    function openCreate() {
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
                    <button className="px-4 py-2 rounded-xl bg-[#f6b100] text-black font-semibold" onClick={openCreate}>
                        Nuevo insumo
                    </button>
                    <button className="px-4 py-2 rounded-xl border border-gray-700" onClick={exportItems}>
                        Exportar Items
                    </button>
                    <button className="px-4 py-2 rounded-xl border border-gray-700" onClick={exportMovements}>
                        Exportar Kardex
                    </button>
                </div>
            </div>

            {lowStock.length > 0 && (
                <div className="mt-4 p-4 rounded-2xl border border-gray-800 bg-[#111111]">
                    <div className="font-semibold">Alertas: Stock bajo</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {lowStock.slice(0, 12).map((i) => (
                            <span key={i._id} className="px-3 py-1 rounded-full border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-sm">
                {i.name} ({i.stockCurrent}/{i.stockMin})
              </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-4">
                <input
                    className="w-full p-3 border border-gray-800 rounded-xl bg-[#0b0b0b]"
                    placeholder="Buscar por nombre o categoría..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>

            <div className="mt-4 grid gap-3">
                {filtered.map((i) => (
                    <div key={i._id} className="p-4 rounded-2xl border border-gray-800 bg-[#111111] flex items-center justify-between">
                        <div>
                            <div className="font-semibold">{i.name}</div>
                            <div className="text-sm text-gray-400">
                                {i.category} · {i.unit} · Costo: {i.cost ?? 0} · Stock: {i.stockCurrent ?? 0} (Min: {i.stockMin ?? 0})
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 rounded-xl border border-gray-700" onClick={() => openMovementModal(i)}>
                                Movimiento
                            </button>
                            <button className="px-4 py-2 rounded-xl border border-gray-700" onClick={() => openEdit(i)}>
                                Editar
                            </button>
                            <button className="px-4 py-2 rounded-xl border border-gray-700" onClick={() => archiveItem(i._id)}>
                                Archivar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Crear/Editar */}
            {openForm && (
                <Modal
                    title={editing ? "Editar insumo" : "Nuevo insumo"}
                    onClose={() => setOpenForm(false)}
                >
                    <form onSubmit={saveItem} className="w-full max-w-full text-white">
                        {/* QUITADO: el h3 duplicado */}

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
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    />
                                    <Help>Ej: Carnes, Vegetales, Bebidas.</Help>
                                </Field>

                                <Field label="Unidad">
                                    <input
                                        className={inputCls}
                                        placeholder="Ej: lb, kg, unidad, litro"
                                        value={form.unit}
                                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                    />
                                    <Help>Esto te ayuda a registrar compras/desperdicios.</Help>
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
                                        onChange={(e) => setForm({ ...form, stockMin: e.target.value })}
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
                                        onChange={(e) => setForm({ ...form, stockCurrent: e.target.value })}
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
                                Nota: el stock se ajusta usando “Movimiento” → “Ajuste (+/-)” para que quede registrado en el Kardex.
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
                                className="p-3 border border-gray-800 rounded-xl bg-[#0b0b0b]"
                                value={movement.type}
                                onChange={(e) => setMovement({ ...movement, type: e.target.value })}
                            >
                                <option value="purchase">Compra (entrada)</option>
                                <option value="waste">Desperdicio (salida)</option>
                                <option value="adjustment">Ajuste (+/-)</option>
                            </select>

                            <input
                                className="p-3 border border-gray-800 rounded-xl bg-[#0b0b0b]"
                                type="number"
                                step="0.01"
                                placeholder={movement.type === "adjustment" ? "Cantidad (+/-)" : "Cantidad"}
                                value={movement.qty}
                                onChange={(e) => setMovement({ ...movement, qty: e.target.value })}
                            />

                            {movement.type === "purchase" && (
                                <input
                                    className="p-3 border border-gray-800 rounded-xl bg-[#0b0b0b]"
                                    type="number"
                                    step="0.01"
                                    placeholder="Costo unitario (opcional)"
                                    value={movement.unitCost}
                                    onChange={(e) => setMovement({ ...movement, unitCost: e.target.value })}
                                />
                            )}

                            <input
                                className="p-3 border border-gray-800 rounded-xl bg-[#0b0b0b]"
                                placeholder="Nota (opcional)"
                                value={movement.note}
                                onChange={(e) => setMovement({ ...movement, note: e.target.value })}
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
