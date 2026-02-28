// src/pages/admin/TablesManagement.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, X, Save, Table2, Users } from "lucide-react";
import { addTable, getTables, updateTable, deleteTable } from "../../https";
import { enqueueSnackbar } from "notistack";
import { QK } from "../../queryKeys";

const TablesManagement = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [showTableModal, setShowTableModal] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [tableForm, setTableForm] = useState({
        tableNo: "",
        seats: "",
        area: "General",
    });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }


    const { data, isLoading, isError } = useQuery({
        queryKey: QK.TABLES,
        queryFn: getTables,
        select: (res) => {
            if (Array.isArray(res?.data?.data)) return res.data.data;
            if (Array.isArray(res?.data)) return res.data;
            return [];
        },
    });

    const tables = data || [];
    const getAreaCode = (areaRaw) => {
        const area = String(areaRaw || "General").trim().toLowerCase();

        if (area === "terraza") return "TER";
        if (area === "vip") return "VIP";
        if (area === "salón" || area === "salon") return "SAL";
        if (area === "barra") return "BAR";
        return "GEN";
    };
    const getTableLabel = (table) => {
        const code = getAreaCode(table?.area);
        const no = table?.tableNo ?? "—";
        return `${code}-${no}`;
    };

    // Filtrar mesas
    const filteredTables = useMemo(() => {

        return tables
            .filter((table) => !table.isVirtual) // Excluir mesas virtuales
            .filter((table) => {
                const tableNo = String(table.tableNo || "").toLowerCase();
                const status = String(table.status || "").toLowerCase();
                const search = searchTerm.toLowerCase();
                const area = String(table.area || "General").toLowerCase();
                const label = getTableLabel(table).toLowerCase();

                return (
                    tableNo.includes(search) ||
                    status.includes(search) ||
                    area.includes(search) ||
                    label.includes(search)
                );            })
            .sort((a, b) => {
                const aa = String(a.area || "General").localeCompare(String(b.area || "General"));
                if (aa !== 0) return aa;
                return (a.tableNo || 0) - (b.tableNo || 0);
            });    }, [tables, searchTerm]);

    const resetForm = () => {
        setTableForm({
            tableNo: "",
            seats: "",
            area: "General",
        });
        setEditingTable(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowTableModal(true);
    };

    const openEditModal = (table) => {
        setEditingTable(table);
        setTableForm({
            tableNo: table.tableNo?.toString() || "",
            seats: table.seats?.toString() || "",
            area: (table.area || "General").toString(),
        });
        setShowTableModal(true);
    };

    const closeModal = () => {
        setShowTableModal(false);
        resetForm();
    };

    const createMutation = useMutation({
        mutationFn: (data) => addTable(data),
        onSuccess: () => {
            enqueueSnackbar("Mesa agregada exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: QK.TABLES });
            closeModal();
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al agregar mesa", { variant: "error" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, body }) => updateTable(id, body),
        onSuccess: () => {
            enqueueSnackbar("Mesa actualizada exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: QK.TABLES });
            closeModal();
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al actualizar mesa", { variant: "error" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => deleteTable(id),
        onSuccess: () => {
            enqueueSnackbar("Mesa eliminada exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: QK.TABLES });
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al eliminar mesa", { variant: "error" });
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const tableNo = parseInt(tableForm.tableNo);
        const seats = parseInt(tableForm.seats);
        const area = (tableForm.area || "General").trim();

        if (editingTable?._id) {
            updateMutation.mutate({
                id: editingTable._id,
                body: { tableNo, seats, area },
            });
        } else {
            createMutation.mutate({ tableNo, seats, area });
        }
    };



    const getStatusColor = (status) => {
        switch (status) {
            case "Disponible":
                return "bg-green-500/20 text-green-400 border-green-500/40";
            case "Ocupada":
                return "bg-red-500/20 text-red-400 border-red-500/40";
            default:
                return "bg-gray-500/20 text-gray-400 border-gray-500/40";
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f6b100] mx-auto"></div>
                <p className="mt-2">Cargando mesas...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-8 text-red-400">
                Error al cargar mesas
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Table2 className="w-6 h-6 text-[#f6b100]" />
                        Gestión de Mesas
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Agrega, edita y gestiona las mesas del restaurante</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Agregar Mesa
                </button>
            </div>

            {/* Filtros */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por número de mesa o estado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                    />
                </div>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Total Mesas</p>
                    <p className="text-2xl font-bold text-white">{filteredTables.length}</p>
                </div>
                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Mesas Disponibles</p>
                    <p className="text-2xl font-bold text-green-400">
                        {filteredTables.filter((t) => t.status === "Disponible").length}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Mesas Ocupadas</p>
                    <p className="text-2xl font-bold text-red-400">
                        {filteredTables.filter((t) => t.status === "Ocupada").length}
                    </p>
                </div>
            </div>

            {/* Grid de mesas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTables.map((table) => (
                    <div
                        key={table._id}
                        className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-5 hover:border-[#f6b100]/50 transition-all group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#f6b100]/10 rounded-lg border border-[#f6b100]/20">
                                    <Table2 className="w-5 h-5 text-[#f6b100]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{getTableLabel(table)}</h3>
                                    <p className="text-xs text-gray-400">{(table.area || "General").trim()} • ID: {table._id?.slice(-6)}</p>                                    <p className="text-xs text-gray-400">ID: {table._id?.slice(-6)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(table)}
                                    className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-[#f6b100] transition-colors"
                                    title="Editar"
                                >
                                    <Edit className="w-4 h-4 text-white" />
                                </button>
                                {table.status === "Disponible" && (
                                    <button
                                        onClick={() => {
                                            setDeleteTarget({ id: table._id, name: getTableLabel(table) });
                                            setDeleteConfirmOpen(true);
                                        }}
                                        className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-red-500 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4 text-white" />
                                    </button>

                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Asientos:
                                </span>
                                <span className="text-sm font-semibold text-white">{table.seats || 0}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">Estado:</span>
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(table.status)}`}
                                >
                                    {table.status || "Disponible"}
                                </span>
                            </div>

                            {table.currentOrder && (
                                <div className="pt-3 border-t border-gray-800/30">
                                    <p className="text-xs text-gray-500">Orden activa</p>
                                    {(() => {
                                        const currentOrderId = table.currentOrder?._id ?? table.currentOrder; // soporta objeto poblado o string/id
                                        const shortId = String(currentOrderId || "").slice(-8);
                                        return (
                                            <p className="text-xs text-gray-400 font-mono">
                                                {shortId || "—"}
                                            </p>
                                        );
                                    })()}

                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredTables.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Table2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No hay mesas disponibles</p>
                </div>
            )}

            {/* Modal de crear/editar mesa */}
            {showTableModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={closeModal}
                >
                    <div
                        className="w-full max-w-md bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-800/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white">
                                    {editingTable ? "Editar Mesa" : "Agregar Nueva Mesa"}
                                </h3>
                                <button
                                    onClick={closeModal}
                                    className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Número de mesa */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block flex items-center gap-2">
                                    <Table2 className="w-4 h-4" />
                                    Número de Mesa *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={tableForm.tableNo}
                                    onChange={(e) => setTableForm((f) => ({ ...f, tableNo: e.target.value }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    required
                                />
                            </div>

                            {/* Número de asientos */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Número de Asientos *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={tableForm.seats}
                                    onChange={(e) => setTableForm((f) => ({ ...f, seats: e.target.value }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Área *
                                </label>

                                <select
                                    value={tableForm.area}
                                    onChange={(e) => setTableForm((f) => ({ ...f, area: e.target.value }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    required
                                >
                                    <option value="General">General</option>
                                    <option value="Terraza">Terraza</option>
                                    <option value="VIP">VIP</option>
                                    <option value="Barra">Barra</option>
                                    <option value="Salon">Salón</option>
                                </select>
                            </div>

                            {/* Botones */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="flex-1 px-4 py-2.5 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {createMutation.isPending || updateMutation.isPending
                                        ? "Guardando..."
                                        : editingTable ? "Actualizar" : "Agregar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {deleteConfirmOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => {
                        if (deleteMutation.isPending) return;
                        setDeleteConfirmOpen(false);
                        setDeleteTarget(null);
                    }}
                >
                    <div
                        className="w-full max-w-md bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-800/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white">Confirmar eliminación</h3>
                                <button
                                    onClick={() => {
                                        if (deleteMutation.isPending) return;
                                        setDeleteConfirmOpen(false);
                                        setDeleteTarget(null);
                                    }}
                                    className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                                    aria-label="Cerrar"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-gray-300">
                                Vas a eliminar{" "}
                                <span className="font-semibold text-white">
            {deleteTarget?.name || "esta mesa"}
          </span>
                                . Esta acción no se puede deshacer.
                            </p>

                            <div className="mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (deleteMutation.isPending) return;
                                        setDeleteConfirmOpen(false);
                                        setDeleteTarget(null);
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] transition-all disabled:opacity-50"
                                    disabled={deleteMutation.isPending}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const id = deleteTarget?.id;
                                        if (!id) return;
                                        deleteMutation.mutate(id, {
                                            onSettled: () => {
                                                setDeleteConfirmOpen(false);
                                                setDeleteTarget(null);
                                            },
                                        });
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TablesManagement;
