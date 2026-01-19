// src/pages/admin/Suppliers.jsx
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, X, Save, Store, Mail, Phone, MapPin, User, FileText } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import api from "../../lib/api";

const Suppliers = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [supplierForm, setSupplierForm] = useState({
        name: "",
        rnc: "",
        phone: "",
        email: "",
        address: "",
        contactPerson: "",
        notes: "",
        status: "active",
    });

    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin/suppliers"],
        queryFn: async () => {
            const res = await api.get("/api/admin/suppliers");
            return res.data?.data || [];
        },
    });

    const suppliers = data || [];

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter((supplier) => {
            const search = searchTerm.toLowerCase();
            return (
                supplier.name?.toLowerCase().includes(search) ||
                supplier.rnc?.toLowerCase().includes(search) ||
                supplier.phone?.toLowerCase().includes(search) ||
                supplier.email?.toLowerCase().includes(search)
            );
        });
    }, [suppliers, searchTerm]);

    const resetForm = () => {
        setSupplierForm({
            name: "",
            rnc: "",
            phone: "",
            email: "",
            address: "",
            contactPerson: "",
            notes: "",
            status: "active",
        });
        setEditingSupplier(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowSupplierModal(true);
    };

    const openEditModal = (supplier) => {
        setEditingSupplier(supplier);
        setSupplierForm({
            name: supplier.name || "",
            rnc: supplier.rnc || "",
            phone: supplier.phone || "",
            email: supplier.email || "",
            address: supplier.address || "",
            contactPerson: supplier.contactPerson || "",
            notes: supplier.notes || "",
            status: supplier.status || "active",
        });
        setShowSupplierModal(true);
    };

    const closeModal = () => {
        setShowSupplierModal(false);
        resetForm();
    };

    const createMutation = useMutation({
        mutationFn: (data) => api.post("/api/admin/suppliers", data),
        onSuccess: () => {
            enqueueSnackbar("Proveedor creado exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: ["admin/suppliers"] });
            closeModal();
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al crear proveedor", { variant: "error" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/api/admin/suppliers/${id}`, data),
        onSuccess: () => {
            enqueueSnackbar("Proveedor actualizado exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: ["admin/suppliers"] });
            closeModal();
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al actualizar proveedor", { variant: "error" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/api/admin/suppliers/${id}`),
        onSuccess: () => {
            enqueueSnackbar("Proveedor eliminado exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: ["admin/suppliers"] });
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al eliminar proveedor", { variant: "error" });
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!supplierForm.name.trim()) {
            enqueueSnackbar("El nombre es requerido", { variant: "warning" });
            return;
        }

        const data = {
            name: supplierForm.name.trim(),
            rnc: supplierForm.rnc.trim(),
            phone: supplierForm.phone.trim(),
            email: supplierForm.email.trim(),
            address: supplierForm.address.trim(),
            contactPerson: supplierForm.contactPerson.trim(),
            notes: supplierForm.notes.trim(),
            status: supplierForm.status,
        };

        if (editingSupplier?._id) {
            updateMutation.mutate({ id: editingSupplier._id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f6b100] mx-auto"></div>
                <p className="mt-2">Cargando proveedores...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-8 text-red-400">
                Error al cargar proveedores
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Store className="w-6 h-6 text-[#f6b100]" />
                        Proveedores
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Gestiona los proveedores de tu restaurante</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Agregar Proveedor
                </button>
            </div>

            {/* Búsqueda */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, RNC, teléfono o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                    />
                </div>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Total Proveedores</p>
                    <p className="text-2xl font-bold text-white">{suppliers.length}</p>
                </div>
                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Proveedores Activos</p>
                    <p className="text-2xl font-bold text-green-400">
                        {suppliers.filter((s) => s.status === "active").length}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Proveedores Inactivos</p>
                    <p className="text-2xl font-bold text-gray-400">
                        {suppliers.filter((s) => s.status === "inactive").length}
                    </p>
                </div>
            </div>

            {/* Lista de proveedores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSuppliers.map((supplier) => (
                    <div
                        key={supplier._id}
                        className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-5 hover:border-[#f6b100]/50 transition-all group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="p-2 bg-[#f6b100]/10 rounded-lg border border-[#f6b100]/20">
                                    <Store className="w-5 h-5 text-[#f6b100]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-white truncate">{supplier.name}</h3>
                                    <span
                                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            supplier.status === "active"
                                                ? "bg-green-500/20 text-green-400 border border-green-500/40"
                                                : "bg-gray-500/20 text-gray-400 border border-gray-500/40"
                                        }`}
                                    >
                                        {supplier.status === "active" ? "Activo" : "Inactivo"}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(supplier)}
                                    className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-[#f6b100] transition-colors"
                                    title="Editar"
                                >
                                    <Edit className="w-4 h-4 text-white" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm(`¿Estás seguro de eliminar "${supplier.name}"?`)) {
                                            deleteMutation.mutate(supplier._id);
                                        }
                                    }}
                                    className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-red-500 transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {supplier.rnc && (
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <FileText className="w-4 h-4" />
                                    <span>RNC: {supplier.rnc}</span>
                                </div>
                            )}
                            {supplier.phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Phone className="w-4 h-4" />
                                    <span>{supplier.phone}</span>
                                </div>
                            )}
                            {supplier.email && (
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Mail className="w-4 h-4" />
                                    <span className="truncate">{supplier.email}</span>
                                </div>
                            )}
                            {supplier.address && (
                                <div className="flex items-start gap-2 text-sm text-gray-400">
                                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2">{supplier.address}</span>
                                </div>
                            )}
                            {supplier.contactPerson && (
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <User className="w-4 h-4" />
                                    <span>Contacto: {supplier.contactPerson}</span>
                                </div>
                            )}
                        </div>

                        {supplier.notes && (
                            <div className="mt-4 pt-4 border-t border-gray-800/30">
                                <p className="text-xs text-gray-500 line-clamp-2">{supplier.notes}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filteredSuppliers.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Store className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No hay proveedores disponibles</p>
                </div>
            )}

            {/* Modal de crear/editar proveedor */}
            {showSupplierModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={closeModal}
                >
                    <div
                        className="w-full max-w-2xl bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-800/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white">
                                    {editingSupplier ? "Editar Proveedor" : "Agregar Nuevo Proveedor"}
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Nombre */}
                                <div className="md:col-span-2">
                                    <label className="text-sm text-gray-400 mb-1 block">
                                        Nombre del Proveedor *
                                    </label>
                                    <input
                                        type="text"
                                        value={supplierForm.name}
                                        onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))}
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                        required
                                    />
                                </div>

                                {/* RNC */}
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">RNC</label>
                                    <input
                                        type="text"
                                        value={supplierForm.rnc}
                                        onChange={(e) => setSupplierForm((f) => ({ ...f, rnc: e.target.value }))}
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    />
                                </div>

                                {/* Teléfono */}
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Teléfono</label>
                                    <input
                                        type="text"
                                        value={supplierForm.phone}
                                        onChange={(e) => setSupplierForm((f) => ({ ...f, phone: e.target.value }))}
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Email</label>
                                    <input
                                        type="email"
                                        value={supplierForm.email}
                                        onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))}
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    />
                                </div>

                                {/* Persona de contacto */}
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Persona de Contacto</label>
                                    <input
                                        type="text"
                                        value={supplierForm.contactPerson}
                                        onChange={(e) => setSupplierForm((f) => ({ ...f, contactPerson: e.target.value }))}
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    />
                                </div>

                                {/* Estado */}
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Estado</label>
                                    <select
                                        value={supplierForm.status}
                                        onChange={(e) => setSupplierForm((f) => ({ ...f, status: e.target.value }))}
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    >
                                        <option value="active">Activo</option>
                                        <option value="inactive">Inactivo</option>
                                    </select>
                                </div>

                                {/* Dirección */}
                                <div className="md:col-span-2">
                                    <label className="text-sm text-gray-400 mb-1 block">Dirección</label>
                                    <input
                                        type="text"
                                        value={supplierForm.address}
                                        onChange={(e) => setSupplierForm((f) => ({ ...f, address: e.target.value }))}
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    />
                                </div>

                                {/* Notas */}
                                <div className="md:col-span-2">
                                    <label className="text-sm text-gray-400 mb-1 block">Notas</label>
                                    <textarea
                                        value={supplierForm.notes}
                                        onChange={(e) => setSupplierForm((f) => ({ ...f, notes: e.target.value }))}
                                        rows={3}
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50 resize-none"
                                    />
                                </div>
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
                                        : editingSupplier ? "Actualizar" : "Agregar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
