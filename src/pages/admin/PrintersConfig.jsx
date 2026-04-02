import React, { useMemo, useState } from "react";
import { Printer, Plus, Trash2, CheckCircle2, Save } from "lucide-react";
import usePrinters from "../../hooks/usePrinters.js";

const inputCls =
    "w-full p-3 border border-gray-800/50 rounded-xl bg-[#1a1a1a] text-white text-sm " +
    "focus:outline-none focus:border-[#f6b100]/50 transition-colors";

const emptyForm = {
    alias: "",
    name: "",
    category: "ticket",
    mode: "browser",
    type: "thermal",
    ip: "",
    port: 9100,
    host: "",
    paperSize: "80mm",
    qzHost: "localhost",
    qzPort: 8181,
    isDefault: false,
    isActive: true,
    notes: "",
};

export default function PrintersConfig() {
    const [category, setCategory] = useState("");
    const {
        printers,
        isLoadingPrinters,
        createPrinter,
        updatePrinter,
        deletePrinter,
        setDefaultPrinter,
    } = usePrinters(category);

    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);

    const grouped = useMemo(() => printers || [], [printers]);

    const submit = async () => {
        const payload = {
            ...form,
            port: Number(form.port || 9100),
            qzPort: Number(form.qzPort || 8181),
        };

        if (editingId) {
            await updatePrinter({ id: editingId, payload });
        } else {
            await createPrinter(payload);
        }

        setForm(emptyForm);
        setEditingId(null);
    };

    const editRow = (p) => {
        setEditingId(p._id);
        setForm({
            alias: p.alias || "",
            name: p.name || "",
            category: p.category || "ticket",
            mode: p.mode || "browser",
            type: p.type || "thermal",
            ip: p.ip || "",
            port: p.port || 9100,
            host: p.host || "",
            paperSize: p.paperSize || "80mm",
            qzHost: p.qzHost || "localhost",
            qzPort: p.qzPort || 8181,
            isDefault: !!p.isDefault,
            isActive: p.isActive !== false,
            notes: p.notes || "",
        });
    };

    return (
        <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] shadow-xl">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800/50">
                    <div className="p-2 bg-[#f6b100]/10 rounded-lg border border-[#f6b100]/20">
                        <Printer className="w-5 h-5 text-[#f6b100]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Administración de Impresoras</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Crea y gestiona múltiples impresoras por tenant
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <label>
                        <div className="text-xs text-gray-400 mb-1">Alias</div>
                        <input
                            className={inputCls}
                            value={form.alias}
                            onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
                        />
                    </label>

                    <label>
                        <div className="text-xs text-gray-400 mb-1">Nombre</div>
                        <input
                            className={inputCls}
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        />
                    </label>

                    <label>
                        <div className="text-xs text-gray-400 mb-1">Categoría</div>
                        <select
                            className={inputCls}
                            value={form.category}
                            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        >
                            <option value="ticket">Ticket general</option>
                            <option value="invoice">Factura</option>
                            <option value="kitchen">Cocina</option>
                            <option value="bar">Bar</option>
                            <option value="delivery">Delivery</option>
                            <option value="other">Otra</option>
                        </select>
                    </label>

                    <label>
                        <div className="text-xs text-gray-400 mb-1">Modo</div>
                        <select
                            className={inputCls}
                            value={form.mode}
                            onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
                        >
                            <option value="browser">browser</option>
                            <option value="qz">qz</option>
                            <option value="network">network</option>
                        </select>
                    </label>

                    <label>
                        <div className="text-xs text-gray-400 mb-1">Tipo</div>
                        <select
                            className={inputCls}
                            value={form.type}
                            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                        >
                            <option value="thermal">thermal</option>
                            <option value="laser">laser</option>
                            <option value="inkjet">inkjet</option>
                            <option value="escpos">escpos</option>
                            <option value="other">other</option>
                        </select>
                    </label>

                    <label>
                        <div className="text-xs text-gray-400 mb-1">Tamaño papel</div>
                        <select
                            className={inputCls}
                            value={form.paperSize}
                            onChange={(e) => setForm((f) => ({ ...f, paperSize: e.target.value }))}
                        >
                            <option value="58mm">58mm</option>
                            <option value="80mm">80mm</option>
                            <option value="A4">A4</option>
                        </select>
                    </label>
                </div>

                {(form.mode === "browser" || form.mode === "network" || form.mode === "qz") && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <label>
                            <div className="text-xs text-gray-400 mb-1">IP</div>
                            <input
                                className={inputCls}
                                value={form.ip}
                                onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
                            />
                        </label>

                        <label>
                            <div className="text-xs text-gray-400 mb-1">Port</div>
                            <input
                                className={inputCls}
                                type="number"
                                value={form.port}
                                onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                            />
                        </label>

                        <label>
                            <div className="text-xs text-gray-400 mb-1">Host</div>
                            <input
                                className={inputCls}
                                value={form.host}
                                onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                            />
                        </label>
                    </div>
                )}

                {form.mode === "qz" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <label>
                            <div className="text-xs text-gray-400 mb-1">QZ Host</div>
                            <input
                                className={inputCls}
                                value={form.qzHost}
                                onChange={(e) => setForm((f) => ({ ...f, qzHost: e.target.value }))}
                            />
                        </label>

                        <label>
                            <div className="text-xs text-gray-400 mb-1">QZ Port</div>
                            <input
                                className={inputCls}
                                type="number"
                                value={form.qzPort}
                                onChange={(e) => setForm((f) => ({ ...f, qzPort: e.target.value }))}
                            />
                        </label>
                    </div>
                )}

                <label className="block mb-4">
                    <div className="text-xs text-gray-400 mb-1">Notas</div>
                    <textarea
                        className={inputCls}
                        rows={3}
                        value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                </label>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={submit}
                        className="px-5 py-2 rounded-xl bg-[#f6b100] text-black font-semibold hover:bg-[#ffd633]"
                    >
                        {editingId ? "Guardar cambios" : "Agregar impresora"}
                    </button>

                    {editingId && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingId(null);
                                setForm(emptyForm);
                            }}
                            className="px-5 py-2 rounded-xl border border-gray-700 text-white hover:bg-[#1a1a1a]"
                        >
                            Cancelar edición
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Impresoras registradas</h3>

                    <select
                        className={inputCls}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="">Todas</option>
                        <option value="ticket">ticket</option>
                        <option value="invoice">invoice</option>
                        <option value="kitchen">kitchen</option>
                        <option value="bar">bar</option>
                        <option value="delivery">delivery</option>
                        <option value="other">other</option>
                    </select>
                </div>

                {isLoadingPrinters ? (
                    <div className="text-gray-400 text-sm">Cargando impresoras...</div>
                ) : grouped.length === 0 ? (
                    <div className="text-gray-500 text-sm">No hay impresoras registradas.</div>
                ) : (
                    <div className="space-y-3">
                        {grouped.map((p) => (
                            <div
                                key={p._id}
                                className="rounded-xl border border-gray-800/50 bg-[#151515] p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-white font-semibold flex items-center gap-2">
                                            {p.alias}
                                            {p.isDefault && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/20">
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {p.category} · {p.mode} · {p.paperSize}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {p.name || "Sin nombre"} {p.ip ? `· ${p.ip}:${p.port}` : ""}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {!p.isDefault && (
                                            <button
                                                type="button"
                                                onClick={() => setDefaultPrinter(p._id)}
                                                className="px-3 py-2 rounded-lg border border-green-500/30 text-green-300 hover:bg-green-500/10 text-xs"
                                            >
                                                Por defecto
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => editRow(p)}
                                            className="px-3 py-2 rounded-lg border border-gray-700 text-white hover:bg-[#1f1f1f] text-xs"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => deletePrinter(p._id)}
                                            className="px-3 py-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}