import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
    listExpenseCategories,
    createExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
} from "../../lib/adminFinanceApi";

const initialEditState = {
    open: false,
    id: null,
    name: "",
    description: "",
};

const initialDeleteState = {
    open: false,
    id: null,
    name: "",
};

export default function ExpenseCategories() {
    const [rows, setRows] = useState([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const [editModal, setEditModal] = useState(initialEditState);
    const [deleteModal, setDeleteModal] = useState(initialDeleteState);

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
            await createExpenseCategory({
                name: name.trim(),
                description: description.trim(),
            });

            setName("");
            setDescription("");
            await refresh();
        } catch (e2) {
            setErr(e2.message);
        } finally {
            setBusy(false);
        }
    }

    function openEditModal(row) {
        setEditModal({
            open: true,
            id: row._id,
            name: row.name || "",
            description: row.description || "",
        });
    }

    function closeEditModal() {
        setEditModal(initialEditState);
    }

    async function confirmEditCategory(e) {
        e.preventDefault();

        if (!editModal.name.trim()) {
            setErr("El nombre de la categoría es requerido.");
            return;
        }

        setBusy(true);
        setErr("");

        try {
            await updateExpenseCategory(editModal.id, {
                name: editModal.name.trim(),
                description: editModal.description.trim(),
            });

            closeEditModal();
            await refresh();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    function openDeleteModal(row) {
        setDeleteModal({
            open: true,
            id: row._id,
            name: row.name || "",
        });
    }

    function closeDeleteModal() {
        setDeleteModal(initialDeleteState);
    }

    async function confirmDeleteCategory() {
        if (!deleteModal.id) return;

        setBusy(true);
        setErr("");

        try {
            await deleteExpenseCategory(deleteModal.id);
            closeDeleteModal();
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
                    <div
                        key={r._id}
                        className="grid grid-cols-12 px-3 py-3 border-t border-white/10 items-center"
                    >
                        <div className="col-span-5">{r.name}</div>
                        <div className="col-span-5 text-white/70">{r.description || "-"}</div>
                        <div className="col-span-2 flex justify-end gap-2">
                            <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                                onClick={() => openEditModal(r)}
                                disabled={busy}
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-all"
                                onClick={() => openDeleteModal(r)}
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

            <AnimatePresence>
                {editModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={closeEditModal}
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-[#101010] to-[#0a0a0a] shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-5 border-b border-white/10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        Editar categoría
                                    </h3>
                                    <p className="text-sm text-white/60 mt-1">
                                        Actualiza el nombre y la descripción.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="h-10 w-10 rounded-lg hover:bg-white/5 transition-colors text-white/70"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={confirmEditCategory} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-sm text-white/70 mb-1">
                                        Nombre
                                    </label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                                        value={editModal.name}
                                        onChange={(e) =>
                                            setEditModal((prev) => ({
                                                ...prev,
                                                name: e.target.value,
                                            }))
                                        }
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-white/70 mb-1">
                                        Descripción
                                    </label>
                                    <textarea
                                        rows={3}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white resize-none"
                                        value={editModal.description}
                                        onChange={(e) =>
                                            setEditModal((prev) => ({
                                                ...prev,
                                                description: e.target.value,
                                            }))
                                        }
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={busy || !editModal.name.trim()}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400 transition-all disabled:opacity-60"
                                    >
                                        {busy ? "Guardando..." : "Guardar cambios"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {deleteModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={closeDeleteModal}
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="w-full max-w-md rounded-2xl border border-red-500/20 bg-gradient-to-br from-[#101010] to-[#0a0a0a] shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-5 border-b border-white/10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        Eliminar categoría
                                    </h3>
                                    <p className="text-sm text-white/60 mt-1">
                                        Esta acción solo funciona si la categoría no está en uso.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeDeleteModal}
                                    className="h-10 w-10 rounded-lg hover:bg-white/5 transition-colors text-white/70"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-5">
                                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                    Vas a eliminar la categoría{" "}
                                    <span className="font-semibold text-white">
                                        {deleteModal.name}
                                    </span>
                                    .
                                </div>

                                <div className="flex gap-3 pt-5">
                                    <button
                                        type="button"
                                        onClick={closeDeleteModal}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={confirmDeleteCategory}
                                        disabled={busy}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-all disabled:opacity-60"
                                    >
                                        {busy ? "Eliminando..." : "Sí, eliminar"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}