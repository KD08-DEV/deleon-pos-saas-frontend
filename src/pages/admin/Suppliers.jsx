// src/pages/admin/Suppliers.jsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Plus,
    Edit,
    Trash2,
    Search,
    X,
    Save,
    Store,
    Mail,
    Phone,
    MapPin,
    User,
    FileText,
} from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";


const Suppliers = () => {
    const { t } = useTranslation();
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


    const {
        data,
        isLoading,
        isError,
    } = useQuery({
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
        mutationFn: (payload) =>
            api.post(
                "/api/admin/suppliers",
                payload
            ),

        onSuccess: () => {
            enqueueSnackbar(
                t("suppliers.messages.createSuccess"),
                {
                    variant: "success",
                }
            );

            queryClient.invalidateQueries({
                queryKey: ["admin/suppliers"],
            });

            closeModal();
        },

        onError: (error) => {
            enqueueSnackbar(
                error?.response?.data?.message ||
                t("suppliers.messages.createFailed"),
                {
                    variant: "error",
                }
            );
        },
    });


    const updateMutation = useMutation({
        mutationFn: ({ id, data: payload }) =>
            api.put(
                `/api/admin/suppliers/${id}`,
                payload
            ),

        onSuccess: () => {
            enqueueSnackbar(
                t("suppliers.messages.updateSuccess"),
                {
                    variant: "success",
                }
            );

            queryClient.invalidateQueries({
                queryKey: ["admin/suppliers"],
            });

            closeModal();
        },

        onError: (error) => {
            enqueueSnackbar(
                error?.response?.data?.message ||
                t("suppliers.messages.updateFailed"),
                {
                    variant: "error",
                }
            );
        },
    });


    const deleteMutation = useMutation({
        mutationFn: (id) =>
            api.delete(
                `/api/admin/suppliers/${id}`
            ),

        onSuccess: () => {
            enqueueSnackbar(
                t("suppliers.messages.deleteSuccess"),
                {
                    variant: "success",
                }
            );

            queryClient.invalidateQueries({
                queryKey: ["admin/suppliers"],
            });
        },

        onError: (error) => {
            enqueueSnackbar(
                error?.response?.data?.message ||
                t("suppliers.messages.deleteFailed"),
                {
                    variant: "error",
                }
            );
        },
    });


    const handleSubmit = (event) => {
        event.preventDefault();

        if (!supplierForm.name.trim()) {
            enqueueSnackbar(
                t("suppliers.messages.nameRequired"),
                {
                    variant: "warning",
                }
            );

            return;
        }


        const payload = {
            name: supplierForm.name.trim(),
            rnc: supplierForm.rnc.trim(),
            phone: supplierForm.phone.trim(),
            email: supplierForm.email.trim(),
            address: supplierForm.address.trim(),
            contactPerson: supplierForm.contactPerson.trim(),
            notes: supplierForm.notes.trim(),

            /*
             * Valor interno.
             * NO traducir: active / inactive.
             */
            status: supplierForm.status,
        };


        if (editingSupplier?._id) {
            updateMutation.mutate({
                id: editingSupplier._id,
                data: payload,
            });
        } else {
            createMutation.mutate(payload);
        }
    };


    const getStatusLabel = (status) => {
        if (status === "inactive") {
            return t("suppliers.status.inactive");
        }

        return t("suppliers.status.active");
    };


    if (isLoading) {
        return (
            <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38bdf8] mx-auto" />

                <p className="mt-2">
                    {t("suppliers.loading")}
                </p>
            </div>
        );
    }


    if (isError) {
        return (
            <div className="text-center py-8 text-red-400">
                {t("suppliers.loadError")}
            </div>
        );
    }


    return (
        <div>

            {/* HEADER */}

            <div className="flex items-center justify-between mb-6">

                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Store className="w-6 h-6 text-[#38bdf8]" />

                        {t("suppliers.title")}
                    </h2>

                    <p className="text-sm text-gray-400 mt-1">
                        {t("suppliers.description")}
                    </p>
                </div>


                <button
                    type="button"
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#38bdf8] text-black rounded-lg font-semibold hover:bg-[#7dd3fc] transition-all"
                >
                    <Plus className="w-4 h-4" />

                    {t("suppliers.actions.addSupplier")}
                </button>

            </div>


            {/* BÚSQUEDA */}

            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />

                    <input
                        type="text"
                        placeholder={t("suppliers.searchPlaceholder")}
                        value={searchTerm}
                        onChange={(event) =>
                            setSearchTerm(
                                event.target.value
                            )
                        }
                        className="w-full pl-10 p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                    />
                </div>
            </div>


            {/* RESUMEN */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        {t("suppliers.summary.total")}
                    </p>

                    <p className="text-2xl font-bold text-white">
                        {suppliers.length}
                    </p>
                </div>


                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        {t("suppliers.summary.active")}
                    </p>

                    <p className="text-2xl font-bold text-green-400">
                        {
                            suppliers.filter(
                                (supplier) =>
                                    supplier.status === "active"
                            ).length
                        }
                    </p>
                </div>


                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        {t("suppliers.summary.inactive")}
                    </p>

                    <p className="text-2xl font-bold text-gray-400">
                        {
                            suppliers.filter(
                                (supplier) =>
                                    supplier.status === "inactive"
                            ).length
                        }
                    </p>
                </div>

            </div>


            {/* LISTA DE PROVEEDORES */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                {filteredSuppliers.map(
                    (supplier) => (
                        <div
                            key={supplier._id}
                            className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-5 hover:border-[#38bdf8]/50 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">

                                <div className="flex items-center gap-3 flex-1">
                                    <div className="p-2 bg-[#38bdf8]/10 rounded-lg border border-[#38bdf8]/20">
                                        <Store className="w-5 h-5 text-[#38bdf8]" />
                                    </div>


                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-white truncate">
                                            {supplier.name}
                                        </h3>

                                        <span
                                            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                supplier.status === "active"
                                                    ? "bg-green-500/20 text-green-400 border border-green-500/40"
                                                    : "bg-gray-500/20 text-gray-400 border border-gray-500/40"
                                            }`}
                                        >
                                            {getStatusLabel(
                                                supplier.status
                                            )}
                                        </span>
                                    </div>
                                </div>


                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openEditModal(
                                                supplier
                                            )
                                        }
                                        className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-[#38bdf8] transition-colors"
                                        title={t("suppliers.actions.edit")}
                                        aria-label={t("suppliers.actions.edit")}
                                    >
                                        <Edit className="w-4 h-4 text-white" />
                                    </button>


                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (
                                                window.confirm(
                                                    t(
                                                        "suppliers.confirmDelete",
                                                        {
                                                            name: supplier.name,
                                                        }
                                                    )
                                                )
                                            ) {
                                                deleteMutation.mutate(
                                                    supplier._id
                                                );
                                            }
                                        }}
                                        className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-red-500 transition-colors"
                                        title={t("suppliers.actions.delete")}
                                        aria-label={t("suppliers.actions.delete")}
                                    >
                                        <Trash2 className="w-4 h-4 text-white" />
                                    </button>
                                </div>

                            </div>


                            <div className="space-y-2">

                                {supplier.rnc && (
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <FileText className="w-4 h-4" />

                                        <span>
                                            RNC: {supplier.rnc}
                                        </span>
                                    </div>
                                )}


                                {supplier.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Phone className="w-4 h-4" />

                                        <span>
                                            {supplier.phone}
                                        </span>
                                    </div>
                                )}


                                {supplier.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Mail className="w-4 h-4" />

                                        <span className="truncate">
                                            {supplier.email}
                                        </span>
                                    </div>
                                )}


                                {supplier.address && (
                                    <div className="flex items-start gap-2 text-sm text-gray-400">
                                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />

                                        <span className="line-clamp-2">
                                            {supplier.address}
                                        </span>
                                    </div>
                                )}


                                {supplier.contactPerson && (
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <User className="w-4 h-4" />

                                        <span>
                                            {t(
                                                "suppliers.contact",
                                                {
                                                    name: supplier.contactPerson,
                                                }
                                            )}
                                        </span>
                                    </div>
                                )}

                            </div>


                            {supplier.notes && (
                                <div className="mt-4 pt-4 border-t border-gray-800/30">
                                    <p className="text-xs text-gray-500 line-clamp-2">
                                        {supplier.notes}
                                    </p>
                                </div>
                            )}

                        </div>
                    )
                )}

            </div>


            {filteredSuppliers.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Store className="w-16 h-16 mx-auto mb-4 opacity-50" />

                    <p>
                        {t("suppliers.empty")}
                    </p>
                </div>
            )}


            {/* MODAL */}

            {showSupplierModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={closeModal}
                >
                    <div
                        className="w-full max-w-2xl bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="p-6 border-b border-gray-800/50">

                            <div className="flex items-center justify-between">

                                <h3 className="text-xl font-bold text-white">
                                    {editingSupplier
                                        ? t("suppliers.modal.editTitle")
                                        : t("suppliers.modal.addTitle")
                                    }
                                </h3>


                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                                    aria-label={t("common.close")}
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>

                            </div>

                        </div>


                        <form
                            onSubmit={handleSubmit}
                            className="p-6 space-y-4"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                <div className="md:col-span-2">
                                    <label className="text-sm text-gray-400 mb-1 block">
                                        {t("suppliers.fields.name")} *
                                    </label>

                                    <input
                                        type="text"
                                        value={supplierForm.name}
                                        onChange={(event) =>
                                            setSupplierForm(
                                                (current) => ({
                                                    ...current,
                                                    name: event.target.value,
                                                })
                                            )
                                        }
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                                        required
                                    />
                                </div>


                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">
                                        RNC
                                    </label>

                                    <input
                                        type="text"
                                        value={supplierForm.rnc}
                                        onChange={(event) =>
                                            setSupplierForm(
                                                (current) => ({
                                                    ...current,
                                                    rnc: event.target.value,
                                                })
                                            )
                                        }
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                                    />
                                </div>


                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">
                                        {t("suppliers.fields.phone")}
                                    </label>

                                    <input
                                        type="text"
                                        value={supplierForm.phone}
                                        onChange={(event) =>
                                            setSupplierForm(
                                                (current) => ({
                                                    ...current,
                                                    phone: event.target.value,
                                                })
                                            )
                                        }
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                                    />
                                </div>


                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">
                                        {t("suppliers.fields.email")}
                                    </label>

                                    <input
                                        type="email"
                                        value={supplierForm.email}
                                        onChange={(event) =>
                                            setSupplierForm(
                                                (current) => ({
                                                    ...current,
                                                    email: event.target.value,
                                                })
                                            )
                                        }
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                                    />
                                </div>


                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">
                                        {t("suppliers.fields.contactPerson")}
                                    </label>

                                    <input
                                        type="text"
                                        value={supplierForm.contactPerson}
                                        onChange={(event) =>
                                            setSupplierForm(
                                                (current) => ({
                                                    ...current,
                                                    contactPerson: event.target.value,
                                                })
                                            )
                                        }
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                                    />
                                </div>


                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">
                                        {t("suppliers.fields.status")}
                                    </label>

                                    <select
                                        value={supplierForm.status}
                                        onChange={(event) =>
                                            setSupplierForm(
                                                (current) => ({
                                                    ...current,
                                                    status: event.target.value,
                                                })
                                            )
                                        }
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                                    >
                                        <option value="active">
                                            {t("suppliers.status.active")}
                                        </option>

                                        <option value="inactive">
                                            {t("suppliers.status.inactive")}
                                        </option>
                                    </select>
                                </div>


                                <div className="md:col-span-2">
                                    <label className="text-sm text-gray-400 mb-1 block">
                                        {t("suppliers.fields.address")}
                                    </label>

                                    <input
                                        type="text"
                                        value={supplierForm.address}
                                        onChange={(event) =>
                                            setSupplierForm(
                                                (current) => ({
                                                    ...current,
                                                    address: event.target.value,
                                                })
                                            )
                                        }
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                                    />
                                </div>


                                <div className="md:col-span-2">
                                    <label className="text-sm text-gray-400 mb-1 block">
                                        {t("suppliers.fields.notes")}
                                    </label>

                                    <textarea
                                        value={supplierForm.notes}
                                        onChange={(event) =>
                                            setSupplierForm(
                                                (current) => ({
                                                    ...current,
                                                    notes: event.target.value,
                                                })
                                            )
                                        }
                                        rows={3}
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50 resize-none"
                                    />
                                </div>

                            </div>


                            <div className="flex gap-3 pt-4">

                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] transition-all"
                                >
                                    {t("common.cancel")}
                                </button>


                                <button
                                    type="submit"
                                    disabled={
                                        createMutation.isPending ||
                                        updateMutation.isPending
                                    }
                                    className="flex-1 px-4 py-2.5 bg-[#38bdf8] text-black rounded-lg font-semibold hover:bg-[#7dd3fc] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />

                                    {createMutation.isPending ||
                                    updateMutation.isPending
                                        ? t("suppliers.actions.saving")
                                        : editingSupplier
                                            ? t("suppliers.actions.update")
                                            : t("suppliers.actions.add")
                                    }
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