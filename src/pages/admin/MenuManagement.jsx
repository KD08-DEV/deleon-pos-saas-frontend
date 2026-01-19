// src/pages/admin/MenuManagement.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
    Plus,
    Edit,
    Trash2,
    Search,
    Image as ImageIcon,
    X,
    Save,
    Tag,
    DollarSign,
    Package,
    Scale
} from "lucide-react";
import { addDish, getDishes, deleteDish, updateDish } from "../../https";
import { enqueueSnackbar } from "notistack";
import api from "../../lib/api";


const currency = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
        .format(Number(n || 0));

const MenuManagement = () => {
    const userData = useSelector((state) => state.user.userData);
    const tenantId = userData?.tenantId;
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [confirmDelete, setConfirmDelete] = useState({
        open: false,
        category: null,
    });
    const [showDishModal, setShowDishModal] = useState(false);
    const [editingDish, setEditingDish] = useState(null);
    const [dishForm, setDishForm] = useState({
        name: "",
        category: "",
        price: "",
        sellMode: "unit",
        weightUnit: "lb",
        pricePerLb: "",
        imageFile: null,
    });

    const { data, isLoading, isError } = useQuery({
        queryKey: ["dishes", tenantId],
        queryFn: () => getDishes(tenantId),
        enabled: !!tenantId,
    });

    const dishes = useMemo(() => {
        const raw =
            data?.data?.data ??
            data?.data?.dishes ??
            data?.data ??
            [];
        return Array.isArray(raw) ? raw : [];
    }, [data]);

    // Obtener categorías únicas
    const categories = useMemo(() => {
        const cats = new Set();
        dishes.forEach((dish) => {
            if (dish.category) cats.add(dish.category);
        });
        return Array.from(cats).sort();
    }, [dishes]);

    // Filtrar platos
    const filteredDishes = useMemo(() => {
        return dishes.filter((dish) => {
            const matchesSearch = dish.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 dish.category?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = !selectedCategory || dish.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [dishes, searchTerm, selectedCategory]);

    const resetForm = () => {
        setDishForm({
            name: "",
            category: "",
            inventoryCategoryId: "", // <-- NUEVO
            price: "",
            sellMode: "unit",
            weightUnit: "lb",
            pricePerLb: "",
            imageFile: null,
        });
        setEditingDish(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowDishModal(true);
    };

    const openEditModal = (dish) => {
        setEditingDish(dish);
        setDishForm({
            name: dish.name || "",
            category: dish.category || "",
            inventoryCategoryId: dish?.inventoryCategoryId?._id || dish?.inventoryCategoryId || "",
            price: dish.price?.toString() || "",
            sellMode: dish.sellMode || "unit",
            weightUnit: dish.weightUnit || "lb",
            pricePerLb: dish.pricePerLb?.toString() || "",
            imageFile: null,
        });
        setShowDishModal(true);
    };

    const closeModal = () => {
        setShowDishModal(false);
        resetForm();
    };

    const createMutation = useMutation({
        mutationFn: (formData) => addDish(formData, tenantId),
        onSuccess: () => {
            enqueueSnackbar("Plato agregado exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: ["dishes", tenantId] });
            closeModal();
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al agregar plato", { variant: "error" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, formData }) => updateDish(id, formData),
        onSuccess: () => {
            enqueueSnackbar("Plato actualizado exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: ["dishes", tenantId] });
            closeModal();
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al actualizar plato", { variant: "error" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => deleteDish(id),
        onSuccess: () => {
            enqueueSnackbar("Plato eliminado exitosamente", { variant: "success" });
            queryClient.invalidateQueries({ queryKey: ["dishes", tenantId] });
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al eliminar plato", { variant: "error" });
        },
    });
    const [invCats, setInvCats] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get("/api/admin/inventory/categories");
                const list = res?.data?.data || res?.data?.data?.data || [];
                setInvCats(Array.isArray(list) ? list : []);
            } catch (e) {
                // si falla, no rompas nada: solo no muestras el select
                setInvCats([]);
            }
        })();
    }, []);


    const handleSubmit = (e) => {
        e.preventDefault();
        if (!tenantId) {
            enqueueSnackbar("TenantId no encontrado", { variant: "warning" });
            return;
        }

        const formData = new FormData();
        formData.append("name", dishForm.name.trim());
        formData.append("category", dishForm.category.trim());
        formData.append("sellMode", dishForm.sellMode);
        formData.append("weightUnit", dishForm.weightUnit);

        if (dishForm.inventoryCategoryId !== undefined) {
            formData.append("inventoryCategoryId", dishForm.inventoryCategoryId || "");
        }

        const basePrice = dishForm.sellMode === "weight"
            ? (dishForm.pricePerLb || dishForm.price)
            : dishForm.price;
        formData.append("price", basePrice);

        if (dishForm.sellMode === "weight" && dishForm.pricePerLb) {
            formData.append("pricePerLb", dishForm.pricePerLb);
        }

        if (dishForm.imageFile) {
            formData.append("image", dishForm.imageFile);
        }

        if (editingDish?._id) {
            updateMutation.mutate({ id: editingDish._id, formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f6b100] mx-auto"></div>
                <p className="mt-2">Cargando platos...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-8 text-red-400">
                Error al cargar platos
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Package className="w-6 h-6 text-[#f6b100]" />
                        Gestión de Menú
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Crea, edita y gestiona los platos del menú</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Agregar Plato
                </button>
            </div>

            {/* Filtros */}
            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o categoría..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                    >
                        <option value="">Todas las categorías</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Grid de platos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDishes.map((dish) => (
                    <div
                        key={dish._id}
                        className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg overflow-hidden hover:border-[#f6b100]/50 transition-all group"
                    >
                        {/* Imagen */}
                        <div className="relative h-48 bg-[#1a1a1a] overflow-hidden">
                            {dish.imageUrl ? (
                                <img
                                    src={dish.imageUrl}
                                    alt={dish.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                        e.target.src = "/placeholder.jpg";
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-12 h-12 text-gray-600" />
                                </div>
                            )}
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(dish)}
                                    className="p-2 bg-[#1a1a1a]/90 rounded-lg hover:bg-[#f6b100] transition-colors"
                                    title="Editar"
                                >
                                    <Edit className="w-4 h-4 text-white" />
                                </button>
                                <button
                                    onClick={() => setConfirmDelete({ open: true, dish })}

                                    className="p-2 bg-[#1a1a1a]/90 rounded-lg hover:bg-red-500 transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Información */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-white">{dish.name}</h3>
                                <span className="px-2 py-1 bg-[#f6b100]/20 text-[#f6b100] text-xs rounded-full border border-[#f6b100]/40">
                                    {dish.category}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                    {dish.sellMode === "weight" ? (
                                        <>
                                            <Scale className="w-4 h-4" />
                                            <span>{currency(dish.pricePerLb || dish.price)} / {dish.weightUnit}</span>
                                        </>
                                    ) : (
                                        <>
                                            <DollarSign className="w-4 h-4" />
                                            <span>{currency(dish.price)}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredDishes.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No hay platos disponibles</p>
                </div>
            )}

            {/* Modal de crear/editar plato */}
            {showDishModal && (
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
                                    {editingDish ? "Editar Plato" : "Agregar Nuevo Plato"}
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
                                <label className="text-sm text-gray-400 mb-1 block">Nombre del Plato *</label>
                                <input
                                    type="text"
                                    value={dishForm.name}
                                    onChange={(e) => setDishForm((f) => ({ ...f, name: e.target.value }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    required
                                />
                            </div>

                            {/* Categoría */}

                            <div>
                                <label className="text-sm text-gray-400 mb-1 block flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    Categoría *
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={dishForm.category}
                                        onChange={(e) => setDishForm((f) => ({ ...f, category: e.target.value }))}
                                        list="categories-list"
                                        className="flex-1 p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                        required
                                    />
                                    <datalist id="categories-list">
                                        {categories.map((cat) => (
                                            <option key={cat} value={cat} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">
                                    Categoría de inventario (para stock)
                                </label>
                                <select
                                    value={dishForm.inventoryCategoryId || ""}
                                    onChange={(e) => setDishForm((f) => ({ ...f, inventoryCategoryId: e.target.value }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                >
                                    <option value="">Sin categoría</option>
                                    {invCats.map((c) => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Esto NO es la categoría del menú; es para reportes/control de stock.
                                </p>
                            </div>


                            {/* Modo de venta */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Modo de Venta *</label>
                                <select
                                    value={dishForm.sellMode}
                                    onChange={(e) => setDishForm((f) => ({ ...f, sellMode: e.target.value }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                >
                                    <option value="unit">Por Unidad</option>
                                    <option value="weight">Por Peso</option>
                                </select>
                            </div>

                            {/* Precio según modo */}
                            {dishForm.sellMode === "weight" ? (
                                <>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">Unidad de Peso *</label>
                                        <select
                                            value={dishForm.weightUnit}
                                            onChange={(e) => setDishForm((f) => ({ ...f, weightUnit: e.target.value }))}
                                            className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                        >
                                            <option value="lb">Libra (lb)</option>
                                            <option value="kg">Kilogramo (kg)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">
                                            Precio por {dishForm.weightUnit} *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={dishForm.pricePerLb}
                                            onChange={(e) => setDishForm((f) => ({ ...f, pricePerLb: e.target.value }))}
                                            className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                            required
                                        />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        Precio (por unidad) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={dishForm.price}
                                        onChange={(e) => setDishForm((f) => ({ ...f, price: e.target.value }))}
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                        required
                                    />
                                </div>
                            )}

                            {/* Imagen */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Imagen</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setDishForm((f) => ({ ...f, imageFile: e.target.files?.[0] || null }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50 file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#f6b100] file:text-black hover:file:bg-[#ffd633]"
                                />
                                {editingDish?.imageUrl && !dishForm.imageFile && (
                                    <p className="text-xs text-gray-500 mt-1">Imagen actual se mantendrá</p>
                                )}
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
                                        : editingDish ? "Actualizar" : "Agregar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {confirmDelete.open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setConfirmDelete({ open: false, dish: null })}
                >
                    <div
                        className="w-full max-w-md bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-800/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Confirmar eliminación</h3>
                                <button
                                    onClick={() => setConfirmDelete({ open: false, dish: null })}
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
                                    onClick={() => setConfirmDelete({ open: false, dish: null })}
                                    className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] transition-all"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const id = confirmDelete.dish?._id;
                                        if (id) deleteMutation.mutate(id);
                                        setConfirmDelete({ open: false, dish: null });
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

export default MenuManagement;
