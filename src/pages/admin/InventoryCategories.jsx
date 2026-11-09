// src/pages/admin/InventoryCategories.jsx
import React, { useMemo, useState } from "react";
import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import {
    Plus,
    Edit,
    Trash2,
    Search,
    X,
    Save,
    Tag,
    Package,
    Palette,
} from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

const iconOptions = [
    "Package",
    "Box",
    "ShoppingBag",
    "Tag",
    "Archive",
    "Layers",
    "Grid",
    "Folder",
    "Briefcase",
    "Cube",
    "Droplet",
    "Flame",
    "Leaf",
    "Apple",
    "ChefHat",
];

const colorOptions = [
    "#38bdf8",
    "#3b82f6",
    "#10b981",
    "#0babf5",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
    "#f97316",
];

const ICON_TRANSLATION_KEYS = {
    Package:
        "inventoryCategories.icons.package",

    Box:
        "inventoryCategories.icons.box",

    ShoppingBag:
        "inventoryCategories.icons.shoppingBag",

    Tag:
        "inventoryCategories.icons.tag",

    Archive:
        "inventoryCategories.icons.archive",

    Layers:
        "inventoryCategories.icons.layers",

    Grid:
        "inventoryCategories.icons.grid",

    Folder:
        "inventoryCategories.icons.folder",

    Briefcase:
        "inventoryCategories.icons.briefcase",

    Cube:
        "inventoryCategories.icons.cube",

    Droplet:
        "inventoryCategories.icons.droplet",

    Flame:
        "inventoryCategories.icons.flame",

    Leaf:
        "inventoryCategories.icons.leaf",

    Apple:
        "inventoryCategories.icons.apple",

    ChefHat:
        "inventoryCategories.icons.chefHat",
};

const InventoryCategories = () => {
    const { t } =
        useTranslation();

    const queryClient =
        useQueryClient();

    const [
        searchTerm,
        setSearchTerm,
    ] =
        useState("");

    const [
        showCategoryModal,
        setShowCategoryModal,
    ] =
        useState(false);

    const [
        confirmDelete,
        setConfirmDelete,
    ] =
        useState({
            open: false,
            category: null,
        });

    const [
        editingCategory,
        setEditingCategory,
    ] =
        useState(null);

    const [
        categoryForm,
        setCategoryForm,
    ] =
        useState({
            name: "",
            description: "",
            color: "#38bdf8",
            icon: "Package",
        });

    /*
     * ==========================================
     * CARGAR CATEGORÍAS
     * ==========================================
     */

    const {
        data,
        isLoading,
        isError,
    } =
        useQuery({
            queryKey: [
                "admin/inventory/categories",
            ],

            queryFn:
                async () => {
                    const res =
                        await api.get(
                            "/api/admin/inventory/categories"
                        );

                    return (
                        res.data
                            ?.data ||
                        []
                    );
                },
        });

    const categories =
        data || [];

    /*
     * ==========================================
     * FILTRO
     * ==========================================
     */

    const filteredCategories =
        useMemo(
            () => {
                return categories.filter(
                    (
                        category
                    ) => {
                        const search =
                            searchTerm
                                .toLowerCase();

                        return (
                            category.name
                                ?.toLowerCase()
                                .includes(
                                    search
                                ) ||
                            category.description
                                ?.toLowerCase()
                                .includes(
                                    search
                                )
                        );
                    }
                );
            },
            [
                categories,
                searchTerm,
            ]
        );

    /*
     * ==========================================
     * DISPLAY DE ICONOS
     * ==========================================
     *
     * Los valores internos siguen siendo:
     *
     * Package
     * Box
     * ShoppingBag
     * ChefHat
     * etc.
     *
     * Solo traducimos el texto visible.
     */

    const getIconDisplayName = (
        icon
    ) => {
        const key =
            ICON_TRANSLATION_KEYS[
                icon
                ];

        return key
            ? t(key)
            : icon;
    };

    /*
     * ==========================================
     * FORMULARIO
     * ==========================================
     */

    const resetForm =
        () => {
            setCategoryForm({
                name: "",
                description: "",
                color: "#38bdf8",
                icon: "Package",
            });

            setEditingCategory(
                null
            );
        };

    const openAddModal =
        () => {
            resetForm();

            setShowCategoryModal(
                true
            );
        };

    const openEditModal = (
        category
    ) => {
        setEditingCategory(
            category
        );

        setCategoryForm({
            name:
                category.name ||
                "",

            description:
                category.description ||
                "",

            color:
                category.color ||
                "#38bdf8",

            icon:
                category.icon ||
                "Package",
        });

        setShowCategoryModal(
            true
        );
    };

    const closeModal =
        () => {
            setShowCategoryModal(
                false
            );

            resetForm();
        };

    /*
     * ==========================================
     * CREAR
     * ==========================================
     */

    const createMutation =
        useMutation({
            mutationFn:
                (
                    data
                ) =>
                    api.post(
                        "/api/admin/inventory/categories",
                        data
                    ),

            onSuccess:
                () => {
                    enqueueSnackbar(
                        t(
                            "inventoryCategories.messages.createSuccess"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );

                    queryClient.invalidateQueries(
                        {
                            queryKey: [
                                "admin/inventory/categories",
                            ],
                        }
                    );

                    closeModal();
                },

            onError:
                (
                    error
                ) => {
                    enqueueSnackbar(
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "inventoryCategories.messages.createFailed"
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });

    /*
     * ==========================================
     * ACTUALIZAR
     * ==========================================
     */

    const updateMutation =
        useMutation({
            mutationFn:
                ({
                     id,
                     data,
                 }) =>
                    api.put(
                        `/api/admin/inventory/categories/${id}`,
                        data
                    ),

            onSuccess:
                () => {
                    enqueueSnackbar(
                        t(
                            "inventoryCategories.messages.updateSuccess"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );

                    queryClient.invalidateQueries(
                        {
                            queryKey: [
                                "admin/inventory/categories",
                            ],
                        }
                    );

                    closeModal();
                },

            onError:
                (
                    error
                ) => {
                    enqueueSnackbar(
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "inventoryCategories.messages.updateFailed"
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });

    /*
     * ==========================================
     * ELIMINAR
     * ==========================================
     */

    const deleteMutation =
        useMutation({
            mutationFn:
                (
                    id
                ) =>
                    api.delete(
                        `/api/admin/inventory/categories/${id}`
                    ),

            onSuccess:
                () => {
                    enqueueSnackbar(
                        t(
                            "inventoryCategories.messages.deleteSuccess"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );

                    queryClient.invalidateQueries(
                        {
                            queryKey: [
                                "admin/inventory/categories",
                            ],
                        }
                    );
                },

            onError:
                (
                    error
                ) => {
                    enqueueSnackbar(
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "inventoryCategories.messages.deleteFailed"
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });

    /*
     * ==========================================
     * SUBMIT
     * ==========================================
     */

    const handleSubmit = (
        event
    ) => {
        event.preventDefault();

        if (
            !categoryForm.name
                .trim()
        ) {
            enqueueSnackbar(
                t(
                    "inventoryCategories.messages.nameRequired"
                ),
                {
                    variant:
                        "warning",
                }
            );

            return;
        }

        /*
         * Estos son DATOS REALES DEL NEGOCIO.
         * NO traducir.
         */
        const data = {
            name:
                categoryForm.name
                    .trim(),

            description:
                categoryForm.description
                    .trim(),

            color:
            categoryForm.color,

            icon:
            categoryForm.icon,
        };

        if (
            editingCategory?._id
        ) {
            updateMutation.mutate({
                id:
                editingCategory._id,

                data,
            });
        } else {
            createMutation.mutate(
                data
            );
        }
    };

    /*
     * ==========================================
     * LOADING
     * ==========================================
     */

    if (
        isLoading
    ) {
        return (
            <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38bdf8] mx-auto" />

                <p className="mt-2">
                    {t(
                        "inventoryCategories.loading"
                    )}
                </p>
            </div>
        );
    }

    /*
     * ==========================================
     * ERROR
     * ==========================================
     */

    if (
        isError
    ) {
        return (
            <div className="text-center py-8 text-red-400">
                {t(
                    "inventoryCategories.loadError"
                )}
            </div>
        );
    }

    return (
        <div>

            {/* ======================================
                HEADER
            ====================================== */}

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Tag className="w-6 h-6 text-[#38bdf8]" />

                        {t(
                            "inventoryCategories.title"
                        )}
                    </h2>

                    <p className="text-sm text-gray-400 mt-1">
                        {t(
                            "inventoryCategories.description"
                        )}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        openAddModal
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-[#38bdf8] text-black rounded-lg font-semibold hover:bg-[#7dd3fc] transition-all"
                >
                    <Plus className="w-4 h-4" />

                    {t(
                        "inventoryCategories.actions.addCategory"
                    )}
                </button>
            </div>

            {/* ======================================
                BÚSQUEDA
            ====================================== */}

            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />

                    <input
                        type="text"
                        placeholder={
                            t(
                                "inventoryCategories.searchPlaceholder"
                            )
                        }
                        value={
                            searchTerm
                        }
                        onChange={(
                            event
                        ) =>
                            setSearchTerm(
                                event
                                    .target
                                    .value
                            )
                        }
                        className="w-full pl-10 p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                    />
                </div>
            </div>

            {/* ======================================
                RESUMEN
            ====================================== */}

            <div className="mb-6 bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                    {t(
                        "inventoryCategories.summary.total"
                    )}
                </p>

                <p className="text-3xl font-bold text-white">
                    {
                        categories.length
                    }
                </p>
            </div>

            {/* ======================================
                GRID DE CATEGORÍAS
            ====================================== */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCategories.map(
                    (
                        category
                    ) => (
                        <div
                            key={
                                category._id
                            }
                            className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-5 hover:border-[#38bdf8]/50 transition-all group"
                            style={{
                                borderLeftColor:
                                category.color,

                                borderLeftWidth:
                                    "4px",
                            }}
                        >
                            <div className="flex items-start justify-between mb-4">

                                <div className="flex items-center gap-3 flex-1 min-w-0">

                                    <div
                                        className="p-2 rounded-lg border flex-shrink-0"
                                        style={{
                                            backgroundColor:
                                                `${category.color}20`,

                                            borderColor:
                                                `${category.color}40`,
                                        }}
                                    >
                                        <Package
                                            className="w-5 h-5"
                                            style={{
                                                color:
                                                category.color,
                                            }}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">

                                        <h3 className="text-lg font-bold text-white truncate">
                                            {
                                                category.name
                                            }
                                        </h3>

                                        {category.description && (
                                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                                {
                                                    category.description
                                                }
                                            </p>
                                        )}

                                    </div>
                                </div>

                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            openEditModal(
                                                category
                                            )
                                        }
                                        className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-[#38bdf8] transition-colors"
                                        title={
                                            t(
                                                "inventoryCategories.actions.edit"
                                            )
                                        }
                                        aria-label={
                                            t(
                                                "inventoryCategories.actions.edit"
                                            )
                                        }
                                    >
                                        <Edit className="w-4 h-4 text-white" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setConfirmDelete({
                                                open:
                                                    true,

                                                category,
                                            })
                                        }
                                        className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-red-500 transition-colors"
                                        title={
                                            t(
                                                "inventoryCategories.actions.delete"
                                            )
                                        }
                                        aria-label={
                                            t(
                                                "inventoryCategories.actions.delete"
                                            )
                                        }
                                    >
                                        <Trash2 className="w-4 h-4 text-white" />
                                    </button>

                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-3 border-t border-gray-800/30">

                                <div className="flex items-center gap-2 text-xs text-gray-400">

                                    <Palette className="w-3.5 h-3.5" />

                                    <span className="uppercase">
                                        {
                                            category.color
                                        }
                                    </span>

                                </div>

                                <div
                                    className="w-4 h-4 rounded-full border border-gray-700"
                                    style={{
                                        backgroundColor:
                                        category.color,
                                    }}
                                />

                            </div>
                        </div>
                    )
                )}
            </div>

            {/* ======================================
                VACÍO
            ====================================== */}

            {filteredCategories.length ===
                0 && (

                    <div className="text-center py-12 text-gray-400">

                        <Tag className="w-16 h-16 mx-auto mb-4 opacity-50" />

                        <p>
                            {t(
                                "inventoryCategories.empty"
                            )}
                        </p>

                    </div>

                )}

            {/* ======================================
                MODAL CREAR / EDITAR
            ====================================== */}

            {showCategoryModal && (

                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={
                        closeModal
                    }
                >

                    <div
                        className="w-full max-w-lg bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="p-6 border-b border-gray-800/50">

                            <div className="flex items-center justify-between">

                                <h3 className="text-xl font-bold text-white">
                                    {editingCategory
                                        ? t(
                                            "inventoryCategories.modal.editTitle"
                                        )
                                        : t(
                                            "inventoryCategories.modal.addTitle"
                                        )
                                    }
                                </h3>

                                <button
                                    type="button"
                                    onClick={
                                        closeModal
                                    }
                                    className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                                    aria-label={
                                        t(
                                            "common.close"
                                        )
                                    }
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>

                            </div>
                        </div>

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="p-6 space-y-4"
                        >

                            {/* NOMBRE */}

                            <div>

                                <label className="text-sm text-gray-400 mb-1 block">
                                    {t(
                                        "inventoryCategories.fields.name"
                                    )}{" "}
                                    *
                                </label>

                                <input
                                    type="text"
                                    value={
                                        categoryForm.name
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCategoryForm(
                                            (
                                                current
                                            ) => ({
                                                ...current,

                                                name:
                                                event
                                                    .target
                                                    .value,
                                            })
                                        )
                                    }
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                                    required
                                />

                            </div>

                            {/* DESCRIPCIÓN */}

                            <div>

                                <label className="text-sm text-gray-400 mb-1 block">
                                    {t(
                                        "inventoryCategories.fields.description"
                                    )}
                                </label>

                                <textarea
                                    value={
                                        categoryForm.description
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCategoryForm(
                                            (
                                                current
                                            ) => ({
                                                ...current,

                                                description:
                                                event
                                                    .target
                                                    .value,
                                            })
                                        )
                                    }
                                    rows={
                                        3
                                    }
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50 resize-none"
                                />

                            </div>

                            {/* COLOR */}

                            <div>

                                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">

                                    <Palette className="w-4 h-4" />

                                    {t(
                                        "inventoryCategories.fields.color"
                                    )}

                                </label>

                                <div className="flex flex-wrap gap-2 mb-3">

                                    {colorOptions.map(
                                        (
                                            color
                                        ) => (

                                            <button
                                                key={
                                                    color
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setCategoryForm(
                                                        (
                                                            current
                                                        ) => ({
                                                            ...current,

                                                            color,
                                                        })
                                                    )
                                                }
                                                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                                                    categoryForm.color ===
                                                    color
                                                        ? "border-white scale-110"
                                                        : "border-gray-700 hover:border-gray-600"
                                                }`}
                                                style={{
                                                    backgroundColor:
                                                    color,
                                                }}
                                                title={
                                                    color
                                                }
                                                aria-label={
                                                    t(
                                                        "inventoryCategories.colorAria",
                                                        {
                                                            color,
                                                        }
                                                    )
                                                }
                                            />

                                        )
                                    )}

                                </div>

                                <input
                                    type="text"
                                    value={
                                        categoryForm.color
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCategoryForm(
                                            (
                                                current
                                            ) => ({
                                                ...current,

                                                color:
                                                event
                                                    .target
                                                    .value,
                                            })
                                        )
                                    }
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50 font-mono"
                                    placeholder="#38bdf8"
                                />

                            </div>

                            {/* ICONO */}

                            <div>

                                <label className="text-sm text-gray-400 mb-1 block">
                                    {t(
                                        "inventoryCategories.fields.icon"
                                    )}
                                </label>

                                <select
                                    value={
                                        categoryForm.icon
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCategoryForm(
                                            (
                                                current
                                            ) => ({
                                                ...current,

                                                icon:
                                                event
                                                    .target
                                                    .value,
                                            })
                                        )
                                    }
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                                >

                                    {iconOptions.map(
                                        (
                                            icon
                                        ) => (

                                            <option
                                                key={
                                                    icon
                                                }
                                                value={
                                                    icon
                                                }
                                            >
                                                {getIconDisplayName(
                                                    icon
                                                )}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* BOTONES */}

                            <div className="flex gap-3 pt-4">

                                <button
                                    type="button"
                                    onClick={
                                        closeModal
                                    }
                                    className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] transition-all"
                                >
                                    {t(
                                        "common.cancel"
                                    )}
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
                                        ? t(
                                            "inventoryCategories.actions.saving"
                                        )
                                        : editingCategory
                                            ? t(
                                                "inventoryCategories.actions.update"
                                            )
                                            : t(
                                                "inventoryCategories.actions.add"
                                            )
                                    }

                                </button>

                            </div>

                        </form>
                    </div>
                </div>

            )}

            {/* ======================================
                CONFIRMAR ELIMINACIÓN
            ====================================== */}

            {confirmDelete.open && (

                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() =>
                        setConfirmDelete({
                            open:
                                false,

                            category:
                                null,
                        })
                    }
                >

                    <div
                        className="w-full max-w-md bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="p-6 border-b border-gray-800/50">

                            <div className="flex items-center justify-between">

                                <h3 className="text-lg font-bold text-white">
                                    {t(
                                        "inventoryCategories.deleteConfirm.title"
                                    )}
                                </h3>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setConfirmDelete({
                                            open:
                                                false,

                                            category:
                                                null,
                                        })
                                    }
                                    className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                                    aria-label={
                                        t(
                                            "common.close"
                                        )
                                    }
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>

                            </div>
                        </div>

                        <div className="p-6">

                            <p className="text-sm text-gray-300">
                                {t(
                                    "inventoryCategories.deleteConfirm.description",
                                    {
                                        name:
                                            confirmDelete
                                                .category
                                                ?.name ||
                                            "",
                                    }
                                )}
                            </p>

                            <div className="mt-6 flex gap-3">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setConfirmDelete({
                                            open:
                                                false,

                                            category:
                                                null,
                                        })
                                    }
                                    className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] transition-all"
                                >
                                    {t(
                                        "common.cancel"
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const id =
                                            confirmDelete
                                                .category
                                                ?._id;

                                        if (
                                            id
                                        ) {
                                            deleteMutation.mutate(
                                                id
                                            );
                                        }

                                        setConfirmDelete({
                                            open:
                                                false,

                                            category:
                                                null,
                                        });
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all"
                                >
                                    {t(
                                        "inventoryCategories.actions.delete"
                                    )}
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