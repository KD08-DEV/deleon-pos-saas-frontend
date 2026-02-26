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
    const tenantId = userData?.tenantId || localStorage.getItem("tenantId") || "";

    useEffect(() => {
        if (userData?.tenantId) {
            localStorage.setItem("tenantId", userData.tenantId);
        }
    }, [userData?.tenantId]);

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
        inventoryCategoryId: "",
        isInventoryItem: false,
        price: "",
        sellMode: "unit",
        weightUnit: "lb",
        avgCost: "",
        lastCost: "",
        pricePerLb: "",
        imageFile: null,
    });
    const [showInvCatModal, setShowInvCatModal] = useState(false);
    const [invCatForm, setInvCatForm] = useState({
        name: "",
        description: "",
        color: "#f6b100",
        icon: "Package",
    });


    const { data, isLoading, isError } = useQuery({
        queryKey: ["dishes", tenantId],
        queryFn: () => getDishes(tenantId),
        enabled: Boolean(tenantId),
        staleTime: 30_000,
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
            inventoryCategoryId: "",
            isInventoryItem: false,
            price: "",
            sellMode: "unit",
            weightUnit: "lb",
            pricePerLb: "",
            avgCost: "",
            lastCost: "",
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
            isInventoryItem: Boolean(dish.isInventoryItem),
            pricePerLb: dish.pricePerLb?.toString() || "",
            avgCost: dish.avgCost != null ? String(dish.avgCost) : "",
            lastCost: dish.lastCost != null ? String(dish.lastCost) : "",
            imageFile: null,
        });
        setShowDishModal(true);
    };

    const closeModal = () => {
        setShowDishModal(false);
        resetForm();
    };

    const createInvCatMutation = useMutation({
        mutationFn: (data) => api.post("/api/admin/inventory/categories", data),
        onSuccess: async (res) => {
            enqueueSnackbar("Categoría creada exitosamente", { variant: "success" });
            await reloadInvCats();

            // Si el backend devuelve la categoría creada, la seleccionamos automáticamente
            const created = res?.data?.data;
            if (created?._id) {
                setDishForm((f) => ({
                    ...f,
                    inventoryCategoryId: created._id,
                    isInventoryItem: true,
                }));
            }

            setShowInvCatModal(false);
            setInvCatForm({ name: "", description: "", color: "#f6b100", icon: "Package" });
        },
        onError: (error) => {
            enqueueSnackbar(error?.response?.data?.message || "Error al crear categoría", { variant: "error" });
        },
    });

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
    const reloadInvCats = async () => {
        try {
            const res = await api.get("/api/admin/inventory/categories");
            const list = res?.data?.data || res?.data?.data?.data || [];
            setInvCats(Array.isArray(list) ? list : []);
        } catch {
            setInvCats([]);
        }
    };


    useEffect(() => {
        reloadInvCats();
    }, []);

    const getDishCategoryLabel = (dish) => {
        // si viene poblado (objeto)
        if (dish?.inventoryCategoryId?.name) return dish.inventoryCategoryId.name;

        // si viene como string ObjectId
        const id = dish?.inventoryCategoryId;
        if (id) {
            const found = invCats.find((c) => String(c._id) === String(id));
            if (found?.name) return found.name;
        }

        // fallback
        return dish?.category || "Sin categoría";
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!tenantId) {
            enqueueSnackbar("TenantId no encontrado", { variant: "warning" });
            return;
        }

        const formData = new FormData();

        // ✅ Campos base del plato (MENÚ)
        formData.append("name", String(dishForm.name || "").trim());
        formData.append("category",dishForm.inventoryCategoryId || "");

        // ✅ Modo de venta (default: unit)
        const sellMode = dishForm.sellMode || "unit";
        const weightUnit = dishForm.weightUnit || "lb";

        formData.append("sellMode", sellMode);
        formData.append("weightUnit", weightUnit);

        formData.append("inventoryCategoryId", dishForm.inventoryCategoryId || "");

        const basePrice =
            sellMode === "weight" ? Number(dishForm.pricePerLb || 0) : Number(dishForm.price || 0);

        formData.append("price", String(basePrice));

        if (sellMode === "weight") {
            formData.append("pricePerLb", String(basePrice));
        }

        formData.append("avgCost", dishForm.avgCost ?? "");
        formData.append("lastCost", dishForm.lastCost ?? "");

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
                                     {getDishCategoryLabel(dish)}
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
                            {/* Categoría de inventario (para stock) */}
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Categoría de inventario (para stock)
                                </label>

                                <div className="flex gap-2">
                                    <select
                                        value={dishForm.inventoryCategoryId || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setDishForm((f) => ({
                                                ...f,
                                                inventoryCategoryId: val,
                                            }));
                                        }}
                                        className="flex-1 p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    >
                                        <option value="">Sin categoría</option>
                                        {invCats.map((c) => (
                                            <option key={c._id} value={c._id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        onClick={() => setShowInvCatModal(true)}
                                        className="px-3 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all"
                                    >
                                        Crear
                                    </button>
                                </div>

                                <p className="text-xs text-gray-500 mt-2">
                                    Esta es la categoría de inventario (reportes/control de stock).
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

                            {/* Costos (opcionales) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Costo promedio (opcional)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={dishForm.avgCost}
                                        onChange={(e) => setDishForm((f) => ({ ...f, avgCost: e.target.value }))}
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                        placeholder="Ej: 150"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Último costo (opcional)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={dishForm.lastCost}
                                        onChange={(e) => setDishForm((f) => ({ ...f, lastCost: e.target.value }))}
                                        className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                        placeholder="Ej: 160"
                                    />
                                </div>
                            </div>

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
            {showInvCatModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md rounded-2xl bg-[#0b0b0c] border border-white/10 shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Crear categoría de inventario</h3>
                            <button
                                type="button"
                                onClick={() => setShowInvCatModal(false)}
                                className="p-2 rounded-lg hover:bg-white/5 text-white/70"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!invCatForm.name.trim()) {
                                    enqueueSnackbar("El nombre es requerido", { variant: "warning" });
                                    return;
                                }

                                createInvCatMutation.mutate({
                                    name: invCatForm.name.trim(),
                                    description: invCatForm.description.trim(),
                                    color: invCatForm.color,
                                    icon: invCatForm.icon,
                                });
                            }}
                            className="space-y-3"
                        >
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Nombre</label>
                                <input
                                    value={invCatForm.name}
                                    onChange={(e) => setInvCatForm((f) => ({ ...f, name: e.target.value }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Descripción (opcional)</label>
                                <input
                                    value={invCatForm.description}
                                    onChange={(e) => setInvCatForm((f) => ({ ...f, description: e.target.value }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowInvCatModal(false)}
                                    className="flex-1 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createInvCatMutation.isPending}
                                    className="flex-1 px-4 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] disabled:opacity-60"
                                >
                                    {createInvCatMutation.isPending ? "Creando..." : "Crear"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MenuManagement;
