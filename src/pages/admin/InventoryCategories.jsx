// src/pages/admin/InventoryCategories.jsx
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, X, Save, Tag, Package, Palette } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import api from "../../lib/api";

const iconOptions = [
    "Package", "Box", "ShoppingBag", "Tag", "Archive", "Layers", "Grid", "Folder",
    "Briefcase", "Cube", "Droplet", "Flame", "Leaf", "Apple", "ChefHat"
];

const colorOptions = [
    "#f6b100", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316"
];

const InventoryCategories = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({
        open: false,
        category: null,
    });

    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryForm, setCategoryForm] = useState({
        name: "",
        description: "",
        color: "#f6b100",
        icon: "Package",
    });

    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin/inventory/categories"],
        queryFn: async () => {
            const res = await api.get("/api/admin/inventory/categories");
            return res.data?.data || [];
        },
    });

    const categories = data || [];

    const filteredCategories = useMemo(() => {
        return categories.filter((category) => {
            const search = searchTerm.toLowerCase();
            return (
                category.name?.toLowerCase().includes(search) ||
                category.description?.toLowerCase().includes(search)
            );
        });
    }, [categories, searchTerm]);

    const resetForm = () => {
        setCategoryForm({
            name: "",
            description: "",
            color: "#f6b100",
            icon: "Package",
        });
        setEditingCategory(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowCategoryModal(true);
    };

    const openEditModal = (category) => {
        setEditingCategory(category);
        setCategoryForm({
            name: category.name || "",
            description: category.description || "",
            color: category.color || "#f6b100",
            icon: category.icon || "Package",
        });
        setShowCategoryModal(true);
    };

    const closeModal = () => {
        setShowCategoryModal(false);
        resetForm();
    };

    const createMutation = useMutation({
        mutationFn: (data) => api.post("/api/admin/inventory/categories", data),
        onSuccess: () => {
            enqueueSnackbar("Categoría creada exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: ["admin/inventory/categories"] });
            closeModal();
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al crear categoría", { variant: "error" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/api/admin/inventory/categories/${id}`, data),
        onSuccess: () => {
            enqueueSnackbar("Categoría actualizada exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: ["admin/inventory/categories"] });
            closeModal();
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al actualizar categoría", { variant: "error" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/api/admin/inventory/categories/${id}`),
        onSuccess: () => {
            enqueueSnackbar("Categoría eliminada exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: ["admin/inventory/categories"] });
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al eliminar categoría", { variant: "error" });
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!categoryForm.name.trim()) {
            enqueueSnackbar("El nombre es requerido", { variant: "warning" });
            return;
        }

        const data = {
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim(),
            color: categoryForm.color,
            icon: categoryForm.icon,
        };

        if (editingCategory?._id) {
            updateMutation.mutate({ id: editingCategory._id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f6b100] mx-auto"></div>
                <p className="mt-2">Cargando categorías...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-8 text-red-400">
                Error al cargar categorías
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Tag className="w-6 h-6 text-[#f6b100]" />
                        Categorías
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Organiza tus productos por categorías</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Agregar Categoría
                </button>
            </div>

            {/* Búsqueda */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar categorías..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                    />
                </div>
            </div>

            {/* Resumen */}
            <div className="mb-6 bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Total Categorías</p>
                <p className="text-3xl font-bold text-white">{categories.length}</p>
            </div>

            {/* Grid de categorías */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCategories.map((category) => (
                    <div
                        key={category._id}
                        className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-5 hover:border-[#f6b100]/50 transition-all group"
                        style={{ borderLeftColor: category.color, borderLeftWidth: "4px" }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div
                                    className="p-2 rounded-lg border flex-shrink-0"
                                    style={{ backgroundColor: `${category.color}20`, borderColor: `${category.color}40` }}
                                >
                                    <Package className="w-5 h-5" style={{ color: category.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-white truncate">{category.name}</h3>
                                    {category.description && (
                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{category.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(category)}
                                    className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-[#f6b100] transition-colors"
                                    title="Editar"
                                >
                                    <Edit className="w-4 h-4 text-white" />
                                </button>
                                <button
                                    onClick={() => setConfirmDelete({ open: true, category })}

                                    className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-red-500 transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-3 border-t border-gray-800/30">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Palette className="w-3.5 h-3.5" />
                                <span className="uppercase">{category.color}</span>
                            </div>
                            <div
                                className="w-4 h-4 rounded-full border border-gray-700"
                                style={{ backgroundColor: category.color }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {filteredCategories.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Tag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No hay categorías disponibles</p>
                </div>
            )}

            {/* Modal de crear/editar categoría */}
            {showCategoryModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={closeModal}
                >
                    <div
                        className="w-full max-w-lg bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-800/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white">
                                    {editingCategory ? "Editar Categoría" : "Agregar Nueva Categoría"}
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
                            {/* Nombre */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Nombre de la Categoría *</label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    required
                                />
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Descripción</label>
                                <textarea
                                    value={categoryForm.description}
                                    onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                                    rows={3}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50 resize-none"
                                />
                            </div>

                            {/* Color */}
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                                    <Palette className="w-4 h-4" />
                                    Color
                                </label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {colorOptions.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setCategoryForm((f) => ({ ...f, color }))}
                                            className={`w-10 h-10 rounded-lg border-2 transition-all ${
                                                categoryForm.color === color
                                                    ? "border-white scale-110"
                                                    : "border-gray-700 hover:border-gray-600"
                                            }`}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={categoryForm.color}
                                    onChange={(e) => setCategoryForm((f) => ({ ...f, color: e.target.value }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50 font-mono"
                                    placeholder="#f6b100"
                                />
                            </div>

                            {/* Icono */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Icono</label>
                                <select
                                    value={categoryForm.icon}
                                    onChange={(e) => setCategoryForm((f) => ({ ...f, icon: e.target.value }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                >
                                    {iconOptions.map((icon) => {
                                        return (
                                            <option key={icon} value={icon}>
                                                {icon}
                                            </option>
                                        );
                                    })}
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
                                        : editingCategory ? "Actualizar" : "Agregar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {confirmDelete.open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setConfirmDelete({ open: false, category: null })}
                >
                    <div
                        className="w-full max-w-md bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-800/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Confirmar eliminación</h3>
                                <button
                                    onClick={() => setConfirmDelete({ open: false, category: null })}
                                    className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                                    aria-label="Cerrar"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-gray-300">
                                Vas a eliminar la categoría{" "}
                                <span className="font-semibold text-white">
            {confirmDelete.category?.name}
          </span>
                                . Esta acción no se puede deshacer.
                            </p>

                            <div className="mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDelete({ open: false, category: null })}
                                    className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] transition-all"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const id = confirmDelete.category?._id;
                                        if (id) deleteMutation.mutate(id);
                                        setConfirmDelete({ open: false, category: null });
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default InventoryCategories;
