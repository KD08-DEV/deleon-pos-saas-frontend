// src/pages/admin/components/MermaPanel.jsx
import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api.js";

const safeNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const moneyRD = (n) =>
    new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: "DOP",
        maximumFractionDigits: 2,
    }).format(Number(n || 0));

function getLocalYMD(date = new Date()) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export default function MermaPanel() {
    const queryClient = useQueryClient();

    const todayYMD = getLocalYMD();
    const [selectedYMD, setSelectedYMD] = useState(todayYMD);

    const [batchesModalOpen, setBatchesModalOpen] = useState(false);
    const [mermaModalOpen, setMermaModalOpen] = useState(false);

    const [mermaMode, setMermaMode] = useState("create"); // create | close
    const [mermaSearch, setMermaSearch] = useState("");
    const [mermaNote, setMermaNote] = useState("");
    const [steps, setSteps] = useState([{ label: "", qty: "" }]);

    // Create inputs
    const [rawQtyInput, setRawQtyInput] = useState("");
    const [unitCostOriginalInput, setUnitCostOriginalInput] = useState("");

    // Close inputs
    const [finalQtyInput, setFinalQtyInput] = useState("");

    const [batchToClose, setBatchToClose] = useState(null);
    const [batchesTab, setBatchesTab] = useState("open"); // open | closed | all

    // ========= Queries =========
    const { data: dishesResp, isLoading: dishesLoading } = useQuery({
        queryKey: ["dishes-for-merma"],
        enabled: mermaModalOpen || batchesModalOpen,
        queryFn: async () => {
            const res = await api.get("/api/dishes?includeInventory=true");
            return res.data;
        },
        staleTime: 30_000,
        retry: 1,
    });

    const dishesList = useMemo(() => {
        const raw = dishesResp;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.dishes)) return raw.dishes;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
    }, [dishesResp]);

    const dishById = useMemo(() => {
        const m = new Map();
        for (const d of dishesList || []) {
            const id = String(d?._id || d?.id || "");
            if (id) m.set(id, d);
        }
        return m;
    }, [dishesList]);

    const filteredDishes = useMemo(() => {
        const q = String(mermaSearch || "").trim().toLowerCase();
        if (!q) return dishesList;
        return (dishesList || []).filter((d) =>
            String(d?.name || "").toLowerCase().includes(q)
        );
    }, [dishesList, mermaSearch]);

    const { data: mermaBatchesResp, refetch: refetchMermaBatches } = useQuery({
        queryKey: ["merma/batches", selectedYMD],
        enabled: !!selectedYMD,
        queryFn: async () => {
            try {
                const res = await api.get("/api/inventory/merma/batches", {
                    params: { dateYMD: selectedYMD },
                });
                return res.data;
            } catch {
                return { success: false, batches: [] };
            }
        },
        staleTime: 15_000,
        retry: 0,
    });

    const mermaBatches = useMemo(() => {
        const raw = mermaBatchesResp;
        if (Array.isArray(raw?.batches)) return raw.batches;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
    }, [mermaBatchesResp]);

    const openBatches = useMemo(
        () => mermaBatches.filter((b) => (b?.status || "open") === "open"),
        [mermaBatches]
    );
    const closedBatches = useMemo(
        () => mermaBatches.filter((b) => (b?.status || "") === "closed"),
        [mermaBatches]
    );

    const getBatchProductName = (b) => {
        if (!b) return "Producto";
        if (b?.rawItemName) return b.rawItemName;
        if (b?.rawItem?.name) return b.rawItem.name;

        const rawItemId =
            typeof b?.rawItemId === "object"
                ? String(b?.rawItemId?._id || b?.rawItemId?.id || "")
                : String(b?.rawItemId || "");

        const dish = rawItemId ? dishById.get(rawItemId) : null;
        return dish?.name || "Producto";
    };

    const { data: mermaRes } = useQuery({
        queryKey: ["inventory/merma/summary", selectedYMD],
        enabled: !!selectedYMD,
        queryFn: async () => {
            try {
                const res = await api.get("/api/inventory/merma/summary", {
                    params: { dateYMD: selectedYMD },
                });
                return res.data;
            } catch {
                return { success: false, data: { mermaQty: 0, mermaCost: 0 } };
            }
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    const mermaQty = Number(mermaRes?.data?.mermaQty || 0);
    const mermaCost = Number(mermaRes?.data?.mermaCost || 0);
    const kpis = useMemo(() => {
        const list = Array.isArray(mermaBatches) ? mermaBatches : [];
        const closed = list.filter((b) => (b?.status || "") === "closed");

        const sum = (arr, fn) => arr.reduce((acc, x) => acc + safeNumber(fn(x)), 0);

        const boughtTotal = sum(closed, (b) => b?.rawQty);
        const finalTotal = sum(closed, (b) => b?.finalQty);
        const wasteTotal = sum(closed, (b) => b?.wasteQty ?? (safeNumber(b?.rawQty) - safeNumber(b?.finalQty)));

        const totalCost = sum(closed, (b) => b?.totalCost);
        const wasteCostOriginal = sum(closed, (b) => b?.wasteCostOriginal);

        // Costo real unitario ponderado = totalCost / finalTotal
        const effectiveUnitCostWeighted = finalTotal > 0 ? totalCost / finalTotal : 0;

        // Rendimiento %
        const yieldPct = boughtTotal > 0 ? (finalTotal / boughtTotal) * 100 : 0;

        return {
            closedCount: closed.length,
            openCount: list.filter((b) => (b?.status || "open") === "open").length,

            boughtTotal,
            finalTotal,
            wasteTotal,

            totalCost,
            wasteCostOriginal,
            effectiveUnitCostWeighted,
            yieldPct,
        };
    }, [mermaBatches]);

    // ========= Mutations =========
    const createBatchMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/api/inventory/merma/batches", payload);
            return res.data;
        },
        onSuccess: async () => {
            await refetchMermaBatches();
            queryClient.invalidateQueries({ queryKey: ["inventory/merma/summary", selectedYMD] });
            queryClient.invalidateQueries({ queryKey: ["merma/summary"] });
        },
    });

    const closeBatchMutation = useMutation({
        mutationFn: async ({ batchId, finalQty, note, steps, dateYMD }) => {
            const res = await api.patch(
                `/api/inventory/merma/batches/${encodeURIComponent(batchId)}/close`,
                { finalQty, note, steps, dateYMD }
            );
            return res.data;
        },
        onSuccess: async () => {
            await refetchMermaBatches();
            queryClient.invalidateQueries({ queryKey: ["inventory/merma/summary", selectedYMD] });
            queryClient.invalidateQueries({ queryKey: ["merma/summary"] });
        },
    });

    // ========= Helpers =========
    const openCreateModal = () => {
        setMermaMode("create");
        setMermaSearch("");
        setMermaNote("");
        setRawQtyInput("");
        setUnitCostOriginalInput("");
        setMermaModalOpen(true);
    };

    const openCloseModal = (b) => {
        setMermaMode("close");
        setBatchToClose(b);
        setFinalQtyInput(String(b?.finalQty ?? ""));
        setMermaNote(b?.note || "");
        setMermaModalOpen(true);
    };

    const closeModal = () => {
        setMermaModalOpen(false);
        setBatchToClose(null);
    };

    const handleSave = () => {
        const cleanedSteps = (steps || [])
            .map((s) => ({
                label: String(s.label || "").trim(),
                qtyAfter: Number(String(s.qty || "").replace(/[^\d.-]/g, "")),
            }))
            .filter((s) => s.label && Number.isFinite(s.qtyAfter) && s.qtyAfter > 0);
        if (mermaMode === "create") {
            // Elegimos el primer match si el usuario busca por nombre
            const chosen =
                filteredDishes?.[0] ||
                null;

            if (!chosen?._id) {
                alert("Busca y selecciona un producto (plato) para el lote.");
                return;
            }

            const rawQty = Number(String(rawQtyInput).replace(/[^\d.-]/g, ""));
            if (!Number.isFinite(rawQty) || rawQty <= 0) {
                alert("Cantidad cruda inválida.");
                return;
            }

            const unitCostOriginal = unitCostOriginalInput
                ? Number(String(unitCostOriginalInput).replace(/[^\d.-]/g, ""))
                : 0;

            createBatchMutation.mutate({
                rawItemId: chosen._id,
                rawQty,
                unitCostOriginal, // ✅ nombre correcto para que backend guarde y calcule
                note: mermaNote || "",
                steps: cleanedSteps,
                dateYMD: selectedYMD,
            });

            closeModal();
            return;
        }

        if (mermaMode === "close") {
            if (!batchToClose?._id) {
                alert("No se encontró el lote.");
                return;
            }

            const rawQty = safeNumber(batchToClose?.rawQty);
            const finalQty = Number(String(finalQtyInput).replace(/[^\d.-]/g, ""));
            if (!Number.isFinite(finalQty) || finalQty < 0) {
                alert("Cantidad final inválida.");
                return;
            }
            if (finalQty > rawQty) {
                alert("La cantidad final no puede ser mayor que la cruda.");
                return;
            }

            closeBatchMutation.mutate({
                batchId: batchToClose._id,
                finalQty,
                steps: cleanedSteps,
                note: mermaNote || "",
                dateYMD: selectedYMD,
            });

            closeModal();
        }
    };

    // Preview fórmula (frontend) para mostrarle el costo real antes de guardar
    const preview = useMemo(() => {
        if (mermaMode !== "close") return null;
        const rawQty = safeNumber(batchToClose?.rawQty);
        const unitCostOriginal = safeNumber(batchToClose?.unitCostOriginal ?? batchToClose?.unitCost ?? 0);
        const totalCost = rawQty * unitCostOriginal;

        const finalQty = Number(String(finalQtyInput || "").replace(/[^\d.-]/g, ""));
        const usable = Number.isFinite(finalQty) ? finalQty : 0;

        const wasteQty = rawQty - usable;
        const effectiveUnitCost = usable > 0 ? totalCost / usable : 0;

        return {
            rawQty,
            unitCostOriginal,
            totalCost,
            usable,
            wasteQty,
            effectiveUnitCost,
        };
    }, [mermaMode, batchToClose, finalQtyInput]);

    return (
        <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Merma</h2>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={selectedYMD}
                        onChange={(e) => setSelectedYMD(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                    />

                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold"
                    >
                        Crear lote
                    </button>

                    <button
                        type="button"
                        onClick={() => setBatchesModalOpen(true)}
                        className="px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold hover:bg-[#262626]"
                    >
                        Ver lotes
                    </button>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* KPIs */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                        <div className="text-xs text-gray-400">Comprado (total)</div>
                        <div className="text-lg font-semibold text-white">{kpis.boughtTotal}</div>
                        <div className="text-[11px] text-gray-500 mt-1">Lotes cerrados: {kpis.closedCount}</div>
                    </div>

                    <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                        <div className="text-xs text-gray-400">Final usable (total)</div>
                        <div className="text-lg font-semibold text-white">{kpis.finalTotal}</div>
                        <div className="text-[11px] text-gray-500 mt-1">Rendimiento: {kpis.yieldPct.toFixed(1)}%</div>
                    </div>

                    <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                        <div className="text-xs text-gray-400">Merma (cantidad)</div>
                        <div className="text-lg font-semibold text-white">{kpis.wasteTotal}</div>
                        <div className="text-[11px] text-gray-500 mt-1">De resumen: {mermaQty}</div>
                    </div>

                    <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                        <div className="text-xs text-gray-400">Costo compra (total)</div>
                        <div className="text-lg font-semibold text-white">{moneyRD(kpis.totalCost)}</div>
                        <div className="text-[11px] text-gray-500 mt-1">Lotes abiertos: {kpis.openCount}</div>
                    </div>

                    <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                        <div className="text-xs text-gray-400">Merma (costo original)</div>
                        <div className="text-lg font-semibold text-white">{moneyRD(kpis.wasteCostOriginal)}</div>
                        <div className="text-[11px] text-gray-500 mt-1">De resumen: {moneyRD(mermaCost)}</div>
                    </div>

                    <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                        <div className="text-xs text-gray-400">Costo real promedio / unidad</div>
                        <div className="text-lg font-semibold text-white">{moneyRD(kpis.effectiveUnitCostWeighted)}</div>
                        <div className="text-[11px] text-gray-500 mt-1">TotalCost / Final usable</div>
                    </div>
                </div>

                {/* Últimos lotes */}
                <div className="mt-4 rounded-2xl bg-[#0b0b0b] border border-gray-800/50">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
                        <div className="text-white font-bold">Últimos lotes</div>
                        <button
                            type="button"
                            onClick={() => setBatchesModalOpen(true)}
                            className="px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold hover:bg-[#262626]"
                        >
                            Ver todos
                        </button>
                    </div>

                    <div className="p-4 space-y-3">
                        {(() => {
                            const list = [...(mermaBatches || [])]
                                .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
                                .slice(0, 5);

                            if (list.length === 0) {
                                return <div className="text-sm text-gray-400">No hay lotes para mostrar.</div>;
                            }

                            return list.map((b) => {
                                const isClosed = (b?.status || "") === "closed";
                                const rawQty = safeNumber(b?.rawQty);
                                const finalQty = safeNumber(b?.finalQty);
                                const wasteQty = safeNumber(b?.wasteQty ?? (rawQty - finalQty));

                                const unitCostOriginal = safeNumber(b?.unitCostOriginal ?? b?.unitCost ?? 0);
                                const totalCost = safeNumber(b?.totalCost ?? rawQty * unitCostOriginal);
                                const effectiveUnitCost = safeNumber(
                                    b?.effectiveUnitCost ?? (finalQty > 0 ? totalCost / finalQty : 0)
                                );

                                const note = String(b?.note || "").trim();
                                const stepsArr = Array.isArray(b?.steps) ? b.steps : [];

                                return (
                                    <div
                                        key={b?._id}
                                        className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-white font-semibold truncate">{getBatchProductName(b)}</div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    Entrada: <span className="text-gray-200">{rawQty}</span> · Final:{" "}
                                                    <span className="text-gray-200">{finalQty}</span> · Merma:{" "}
                                                    <span className="text-gray-200">{wasteQty}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Total: <span className="text-gray-200">{moneyRD(totalCost)}</span> · Costo real/u:{" "}
                                                    <span className="text-gray-200">{moneyRD(effectiveUnitCost)}</span>
                                                </div>

                                                {note ? (
                                                    <div className="text-xs text-gray-400 mt-2">
                                                        Nota: <span className="text-gray-200">{note}</span>
                                                    </div>
                                                ) : null}

                                                {stepsArr.length > 0 ? (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {stepsArr.slice(0, 6).map((s, idx) => {
                                                            const label = String(s?.label || "").trim();
                                                            const qtyAfter = safeNumber(s?.qtyAfter ?? s?.qty ?? 0);
                                                            if (!label) return null;

                                                            return (
                                                                <span
                                                                    key={idx}
                                                                    className="text-[11px] px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-gray-200"
                                                                >
                          {label}: {qtyAfter}
                        </span>
                                                            );
                                                        })}
                                                        {stepsArr.length > 6 ? (
                                                            <span className="text-[11px] px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-gray-400">
                        +{stepsArr.length - 6} más
                      </span>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </div>

                                            <span
                                                className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-lg border ${
                                                    isClosed
                                                        ? "text-green-300 border-green-500/30 bg-green-500/10"
                                                        : "text-yellow-200 border-yellow-500/30 bg-yellow-500/10"
                                                }`}
                                            >
                                            {isClosed ? "Cerrado" : "Abierto"}
                                          </span>
                                        </div>

                                        <div className="mt-3 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => openCloseModal(b)}
                                                className="px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold hover:bg-[#262626]"
                                            >
                                                {isClosed ? "Ver / Editar" : "Cerrar lote"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Merma (costo)</div>
                    <div className="text-lg font-semibold text-white">{moneyRD(mermaCost)}</div>
                </div>
            </div>

            {/* ===== Modal: lista de lotes ===== */}
            {batchesModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-[#0b0b0b] border border-gray-800/50 shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
                            <div className="text-white font-bold text-lg">Lotes del día</div>
                            <button
                                onClick={() => setBatchesModalOpen(false)}
                                className="p-2 rounded-lg hover:bg-white/5"
                            >
                                <X className="w-5 h-5 text-gray-300" />
                            </button>
                        </div>

                        <div className="px-5 pt-4">
                            <div className="inline-flex rounded-xl overflow-hidden border border-gray-800/60">
                                <button
                                    type="button"
                                    onClick={() => setBatchesTab("open")}
                                    className={`px-3 py-2 text-sm font-semibold ${
                                        batchesTab === "open" ? "bg-[#f6b100] text-black" : "bg-[#121212] text-white"
                                    }`}
                                >
                                    Abiertos ({openBatches.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBatchesTab("closed")}
                                    className={`px-3 py-2 text-sm font-semibold ${
                                        batchesTab === "closed" ? "bg-[#f6b100] text-black" : "bg-[#121212] text-white"
                                    }`}
                                >
                                    Cerrados ({closedBatches.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBatchesTab("all")}
                                    className={`px-3 py-2 text-sm font-semibold ${
                                        batchesTab === "all" ? "bg-[#f6b100] text-black" : "bg-[#121212] text-white"
                                    }`}
                                >
                                    Todos ({mermaBatches.length})
                                </button>
                            </div>

                            <div className="text-xs text-gray-500 mt-2">
                                Fecha: <span className="text-gray-300 font-semibold">{selectedYMD}</span>
                            </div>
                        </div>

                        <div className="p-4 max-h-[70vh] overflow-auto">
                            {(() => {
                                const list =
                                    batchesTab === "open" ? openBatches : batchesTab === "closed" ? closedBatches : mermaBatches;

                                if (!list || list.length === 0) {
                                    return <div className="text-sm text-gray-400">No hay lotes en esta vista.</div>;
                                }

                                return (
                                    <div className="space-y-2">
                                        {list.map((b) => {
                                            const isClosed = (b?.status || "") === "closed";
                                            const rawQty = safeNumber(b?.rawQty);
                                            const finalQty = safeNumber(b?.finalQty);
                                            const wasteQty = rawQty - finalQty;

                                            const unitCostOriginal = safeNumber(b?.unitCostOriginal ?? b?.unitCost ?? 0);
                                            const totalCost = safeNumber(b?.totalCost ?? rawQty * unitCostOriginal);
                                            const effectiveUnitCost = safeNumber(b?.effectiveUnitCost ?? (finalQty > 0 ? totalCost / finalQty : 0));

                                            return (
                                                <div
                                                    key={b?._id}
                                                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0f0f0f] border border-gray-800/40"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="text-white font-semibold truncate">
                                                            {getBatchProductName(b)}
                                                        </div>

                                                        <div className="text-xs text-gray-400 mt-1">
                                                            Entrada: {rawQty} · Costo unit: {moneyRD(unitCostOriginal)} · Total: {moneyRD(totalCost)}
                                                        </div>

                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Estado:{" "}
                                                            <span className={isClosed ? "text-green-400" : "text-yellow-300"}>
                                                                {isClosed ? "Cerrado" : "Abierto"}
                                                            </span>
                                                            {isClosed ? (
                                                                <>
                                                                    {" "}
                                                                    · Final: <span className="text-gray-300">{finalQty}</span>
                                                                    {" "}
                                                                    · Merma: <span className="text-gray-300">{wasteQty}</span>
                                                                    {" "}
                                                                    · Costo real: <span className="text-gray-300">{moneyRD(effectiveUnitCost)}</span>
                                                                </>
                                                            ) : null}
                                                        </div>
                                                        {Array.isArray(b?.steps) && b.steps.length > 0 && (
                                                            <div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2">
                                                                <div className="text-[11px] text-gray-400 mb-1">Pasos</div>

                                                                <div className="space-y-1">
                                                                    {b.steps.map((s, idx) => {
                                                                        const label = String(s?.label || "").trim();
                                                                        const qtyAfter = Number(s?.qtyAfter ?? s?.qty ?? 0);

                                                                        if (!label) return null;

                                                                        return (
                                                                            <div key={idx} className="flex items-center justify-between text-xs">
                                                                                <span className="text-gray-200">{label}</span>
                                                                                <span className="text-gray-400">{qtyAfter}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!isClosed ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setBatchesModalOpen(false);
                                                                openCloseModal(b);
                                                            }}
                                                            className="px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold hover:bg-[#262626]"
                                                        >
                                                            Registrar salida
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setBatchesModalOpen(false);
                                                                openCloseModal(b);
                                                            }}
                                                            className="px-3 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white font-semibold hover:bg-[#262626]"
                                                        >
                                                            Ver / Editar cierre
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-800/50">
                            <button
                                onClick={() => setBatchesModalOpen(false)}
                                className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-gray-800/50 text-white font-semibold"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Modal: crear / cerrar lote ===== */}
            {mermaModalOpen && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-xl rounded-2xl bg-[#0b0b0b] border border-gray-800/50 shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
                            <div className="text-white font-bold text-lg">
                                {mermaMode === "create" ? "Crear lote (Entrada)" : "Registrar salida (Cerrar lote)"}
                            </div>
                            <button onClick={closeModal} className="p-2 rounded-lg hover:bg-white/5">
                                <X className="w-5 h-5 text-gray-300" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {mermaMode === "create" ? (
                                <>
                                    <div>
                                        <div className="text-xs text-white/70 mb-1">Buscar producto</div>
                                        <input
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                                            placeholder={dishesLoading ? "Cargando..." : "Ej: Carne, Pollo, Arroz..."}
                                            value={mermaSearch}
                                            onChange={(e) => setMermaSearch(e.target.value)}
                                            disabled={dishesLoading}
                                        />
                                        <div className="mt-2 max-h-40 overflow-auto border border-white/10 rounded-lg">
                                            {(filteredDishes || []).slice(0, 20).map((d) => (
                                                <button
                                                    key={d._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setMermaSearch(d?.name || "");
                                                        // seleccion “implícita”: el primer match se usa al guardar
                                                    }}
                                                    className="w-full text-left px-3 py-2 hover:bg-white/5 text-white/80"
                                                >
                                                    {d?.name || "Sin nombre"}
                                                </button>
                                            ))}
                                            {!filteredDishes?.length ? (
                                                <div className="px-3 py-2 text-white/40 text-sm">Sin resultados.</div>
                                            ) : null}
                                        </div>
                                        <div className="mt-1 text-xs text-white/40">
                                            Tip: selecciona de la lista o escribe el nombre exacto (se usa el primer match).
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-xs text-white/70 mb-2">Pasos intermedios (opcional)</div>

                                        <div className="space-y-2">
                                            {steps.map((s, idx) => (
                                                <div key={idx} className="grid grid-cols-12 gap-2">
                                                    <input
                                                        className="col-span-7 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                                                        placeholder="Ej: Hervido, Cocido..."
                                                        value={s.label}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setSteps((arr) => arr.map((x, i) => (i === idx ? { ...x, label: v } : x)));
                                                        }}
                                                    />
                                                    <input
                                                        className="col-span-3 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                                                        placeholder="Qty"
                                                        value={s.qty}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setSteps((arr) => arr.map((x, i) => (i === idx ? { ...x, qty: v } : x)));
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="col-span-2 bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg px-2"
                                                        onClick={() => setSteps((arr) => arr.filter((_, i) => i !== idx))}
                                                    >
                                                        Quitar
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            className="mt-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/80"
                                            onClick={() => setSteps((arr) => [...arr, { label: "", qty: "" }])}
                                        >
                                            + Agregar paso
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-xs text-white/70 mb-1">Cantidad cruda (lb)</div>
                                            <input
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                                                placeholder="Ej: 10"
                                                value={rawQtyInput}
                                                onChange={(e) => setRawQtyInput(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <div className="text-xs text-white/70 mb-1">Costo unitario original (RD$)</div>
                                            <input
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                                                placeholder="Ej: 600"
                                                value={unitCostOriginalInput}
                                                onChange={(e) => setUnitCostOriginalInput(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/70 mb-1">Nota</div>
                                        <input
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                                            placeholder="Ej: Carne con grasa, limpieza..."
                                            value={mermaNote}
                                            onChange={(e) => setMermaNote(e.target.value)}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                        <div className="text-sm text-white font-semibold">{getBatchProductName(batchToClose)}</div>
                                        <div className="text-xs text-white/60 mt-1">
                                            Entrada: {safeNumber(batchToClose?.rawQty)} · Costo unit original:{" "}
                                            {moneyRD(safeNumber(batchToClose?.unitCostOriginal ?? batchToClose?.unitCost ?? 0))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/70 mb-1">Cantidad final usable (lb)</div>
                                        <input
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                                            placeholder="Ej: 7"
                                            value={finalQtyInput}
                                            onChange={(e) => setFinalQtyInput(e.target.value)}
                                        />
                                    </div>

                                    {preview ? (
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                                            <div className="text-white/80">
                                                Total compra: <span className="font-semibold">{moneyRD(preview.totalCost)}</span>
                                            </div>
                                            <div className="text-white/80">
                                                Merma: <span className="font-semibold">{preview.wasteQty}</span> lb
                                            </div>
                                            <div className="text-white/80">
                                                Usable: <span className="font-semibold">{preview.usable}</span> lb
                                            </div>
                                            <div className="text-white/80">
                                                Costo real por lb usable:{" "}
                                                <span className="font-semibold">{moneyRD(preview.effectiveUnitCost)}</span>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div>
                                        <div className="text-xs text-white/70 mb-1">Nota</div>
                                        <input
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                                            placeholder="Ej: se dañó por..."
                                            value={mermaNote}
                                            onChange={(e) => setMermaNote(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-800/50">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-gray-800/50 text-white font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 rounded-lg bg-[#f6b100] text-black font-semibold"
                                disabled={createBatchMutation.isPending || closeBatchMutation.isPending}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
