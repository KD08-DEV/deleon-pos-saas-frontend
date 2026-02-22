import React, { useEffect, useState } from "react";
import {
    listExpenseCategories,
    createExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
} from "../../lib/adminFinanceApi";

export default function ExpenseCategories() {
    const [rows, setRows] = useState([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    async function refresh() {
        setErr("");
        const r = await listExpenseCategories();
        setRows(r.data || []);
    }

    useEffect(() => {
        refresh().catch((e) => setErr(e.message));
    }, []);

    async function onCreate(e) {
        e.preventDefault();
        setBusy(true);
        setErr("");
        try {
            await createExpenseCategory({ name, description });
            setName("");
            setDescription("");
            await refresh();
        } catch (e2) {
            setErr(e2.message);
        } finally {
            setBusy(false);
        }
    }

    async function onRename(id, current) {
        const newName = prompt("Nuevo nombre:", current);
        if (!newName) return;
        setBusy(true);
        setErr("");
        try {
            await updateExpenseCategory(id, { name: newName });
            await refresh();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function onDelete(id) {
        if (!confirm("¿Eliminar categoría? (Solo si no está en uso)")) return;
        setBusy(true);
        setErr("");
        try {
            await deleteExpenseCategory(id);
            await refresh();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="p-4 text-white">
            <h1 className="text-xl font-semibold">Categorías de gastos</h1>

            {err ? <div className="mt-3 text-red-400">{err}</div> : null}

            <form onSubmit={onCreate} className="mt-4 flex flex-col gap-2 max-w-xl">
                <input
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2"
                    placeholder="Nombre (Ej: Luz, Gas, Transporte)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <input
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2"
                    placeholder="Descripción (opcional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <button
                    disabled={busy || !name.trim()}
                    className="bg-yellow-500 text-black rounded-lg px-3 py-2 font-medium disabled:opacity-60"
                >
                    Crear
                </button>
            </form>

            <div className="mt-6 border border-white/10 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-sm text-white/80">
                    <div className="col-span-5">Nombre</div>
                    <div className="col-span-5">Descripción</div>
                    <div className="col-span-2 text-right">Acciones</div>
                </div>

                {rows.map((r) => (
                    <div key={r._id} className="grid grid-cols-12 px-3 py-2 border-t border-white/10">
                        <div className="col-span-5">{r.name}</div>
                        <div className="col-span-5 text-white/70">{r.description || "-"}</div>
                        <div className="col-span-2 flex justify-end gap-2">
                            <button
                                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                                onClick={() => onRename(r._id, r.name)}
                                disabled={busy}
                            >
                                Editar
                            </button>
                            <button
                                className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30"
                                onClick={() => onDelete(r._id)}
                                disabled={busy}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                ))}

                {!rows.length ? (
                    <div className="px-3 py-4 text-white/60">No hay categorías aún.</div>
                ) : null}
            </div>
        </section>
    );
}
