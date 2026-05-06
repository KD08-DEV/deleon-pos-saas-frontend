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

const extractDishList = (response) => {
    const raw =
        response?.data?.data?.items ??
        response?.data?.items ??
        response?.data?.data ??
        response?.data?.dishes ??
        response?.data ??
        [];

    return Array.isArray(raw) ? raw : [];
};

const MENU_PRODUCT_TYPES = [
    {
        value: "none",
        title: "Plato normal",
        desc: "Se vende en el menú, pero no descuenta inventario.",
    },
    {
        value: "direct",
        title: "Producto con inventario",
        desc: "Se vende y descuenta su propio inventario. Puede quedar negativo.",
    },
    {
        value: "recipe",
        title: "Plato con receta",
        desc: "Se vende en el menú y descuenta ingredientes configurados.",
    },
];

const normalizeInventoryType = (value) => {
    const v = String(value || "none").trim();
    return ["none", "direct", "ingredient", "recipe"].includes(v) ? v : "none";
};

const MenuManagement = ({ currentUser }) => {
    const reduxUserData = useSelector((state) => state.user.userData);

    const effectiveUser = {
        ...(reduxUserData || {}),
        ...(currentUser || {}),
        permissions: {
            ...(reduxUserData?.permissions || {}),
            ...(currentUser?.permissions || {}),
            products: {
                ...(reduxUserData?.permissions?.products || {}),
                ...(currentUser?.permissions?.products || {}),
            },
            inventory: {
                ...(reduxUserData?.permissions?.inventory || {}),
                ...(currentUser?.permissions?.inventory || {}),
            },
            orders: {
                ...(reduxUserData?.permissions?.orders || {}),
                ...(currentUser?.permissions?.orders || {}),
            },
        },
    };

    const tenantId =
        effectiveUser?.tenantId ||
        localStorage.getItem("tenantId") ||
        "";

    const role = effectiveUser?.membershipRole || effectiveUser?.role;
    const normalizedRole = String(role || "").trim().toLowerCase();

    const userPermissions = effectiveUser?.permissions || {};

    const isOwnerOrAdmin = ["owner", "admin"].includes(normalizedRole);

    const canCreateProduct =
        isOwnerOrAdmin || userPermissions?.products?.create === true;

    const canEditProduct =
        isOwnerOrAdmin || userPermissions?.products?.update === true;

    const canDeleteProduct =
        isOwnerOrAdmin || userPermissions?.products?.delete === true;

    console.log("[MENU PERMISSIONS DEBUG]", {
        currentUser,
        reduxUserData,
        effectiveUser,
        role,
        normalizedRole,
        userPermissions,
        canCreateProduct,
        canEditProduct,
        canDeleteProduct,
    });

    useEffect(() => {
        if (tenantId) {
            localStorage.setItem("tenantId", tenantId);
        }
    }, [tenantId]);

    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [confirmDelete, setConfirmDelete] = useState({
        open: false,
        dish: null,
    });
    const [showDishModal, setShowDishModal] = useState(false);
    const PAGE_SIZE = 48; // puedes subirlo a 100 si quieres ver casi todo de una vez
    const CATEGORY_FETCH_LIMIT = 1000;

    const [page, setPage] = useState(1);
    const limit = PAGE_SIZE;
    const [editingDish, setEditingDish] = useState(null);
    const [dishForm, setDishForm] = useState({
        name: "",
        category: "",
        inventoryCategoryId: "",
        productionArea: "kitchen",
        isInventoryItem: false,
        allowCustomPrice: false,
        price: "",
        sellMode: "unit",
        weightUnit: "lb",
        avgCost: "",
        lastCost: "",
        pricePerLb: "",
        imageFile: null,
        inventoryType: "none",
        allowNegativeStock: true,
    });
    const [showInvCatModal, setShowInvCatModal] = useState(false);
    const [invCatForm, setInvCatForm] = useState({
        name: "",
        description: "",
        color: "#f6b100",
        icon: "Package",
    });


    const { data, isLoading, isError } = useQuery({
        queryKey: ["dishes", tenantId, page, limit, searchTerm, selectedCategory],
        queryFn: () =>
            getDishes({
                tenantId,
                page,
                limit,
                search: searchTerm,
                category: selectedCategory,
            }),
        enabled: Boolean(tenantId),
        staleTime: 30_000,
        keepPreviousData: true,
    });

    const { data: allDishesData } = useQuery({
        queryKey: ["dishes-all-for-categories", tenantId, searchTerm],
        queryFn: () =>
            getDishes({
                tenantId,
                page: 1,
                limit: CATEGORY_FETCH_LIMIT,
                search: searchTerm,
            }),
        enabled: Boolean(tenantId),
        staleTime: 30_000,
    });

    const dishes = useMemo(() => extractDishList(data), [data]);
    const allDishes = useMemo(() => extractDishList(allDishesData), [allDishesData]);

    const total =
        data?.data?.data?.total ??
        data?.data?.total ??
        dishes.length;

    const totalPages =
        data?.data?.data?.totalPages ??
        data?.data?.totalPages ??
        1;
    const [invCats, setInvCats] = useState([]);
    const getDishCategoryLabel = (dish) => {
        return String(dish?.category || "").trim() || "Sin categoría";
    };

    // Obtener categorías únicas
// ✅ Categorías únicas (usando la misma lógica del badge)
    const categories = useMemo(() => {
        const map = new Map();

        for (const dish of allDishes) {
            const value = String(dish?.category || "").trim();
            if (!value) continue;

            const label = String(getDishCategoryLabel(dish) || value).trim();

            if (!map.has(value)) {
                map.set(value, {
                    value,
                    label,
                });
            }
        }

        return Array.from(map.values()).sort((a, b) =>
            a.label.localeCompare(b.label)
        );
    }, [allDishes, invCats]);

    // Filtrar platos
    const filteredDishes = dishes;

    const resetForm = () => {
        setDishForm({
            name: "",
            category: "",
            inventoryType: "none",
            allowNegativeStock: true,
            inventoryCategoryId: "",
            productionArea: "kitchen",
            isInventoryItem: false,
            allowCustomPrice: false,
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
        if (!canCreateProduct) {
            enqueueSnackbar("No tienes permiso para crear productos.", { variant: "warning" });
            return;
        }

        resetForm();
        setShowDishModal(true);
    };

    const openEditModal = (dish) => {
        if (!canEditProduct) {
            enqueueSnackbar("No tienes permiso para editar productos.", { variant: "warning" });
            return;
        }
        const categoryName = String(dish?.category || "").trim();

        const invIdFromDish =
            dish?.inventoryCategoryId?._id ||
            dish?.inventoryCategoryId ||
            "";

        const invByName = invCats.find(
            (cat) =>
                String(cat?.name || "").trim().toLowerCase() ===
                categoryName.toLowerCase()
        );

        const invId = invIdFromDish || invByName?._id || "";
        setEditingDish(dish);
        setDishForm({
            name: dish.name || "",
            category: categoryName,
            inventoryType: normalizeInventoryType(dish.inventoryType),
            allowNegativeStock: dish.allowNegativeStock !== false,
            productionArea: dish.productionArea || "kitchen",
            allowCustomPrice: Boolean(dish.allowCustomPrice),
            inventoryCategoryId: invId,
            price: dish.price?.toString() || "",
            sellMode: dish.sellMode || "unit",
            weightUnit: dish.weightUnit || "lb",
            isInventoryItem: false,
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
            const created =
                res?.data?.data ||
                res?.data?.category ||
                res?.data?.item ||
                res?.data;
            if (created?._id) {
                setDishForm((f) => ({
                    ...f,
                    inventoryCategoryId: created._id,
                    category: String(created.name || "").trim(), // ✅ copiar
                    isInventoryItem: false,
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
            queryClient.invalidateQueries({ queryKey: ["inventory/items"] });
            queryClient.invalidateQueries({ queryKey: ["inventory/low-stock"] });
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
            queryClient.invalidateQueries({ queryKey: ["inventory/items"] });
            queryClient.invalidateQueries({ queryKey: ["inventory/low-stock"] });
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
    useEffect(() => {
        setPage(1);
    }, [searchTerm, selectedCategory]);



    const handleSubmit = (e) => {
        e.preventDefault();

        if (!tenantId) {
            enqueueSnackbar("TenantId no encontrado", { variant: "warning" });
            return;
        }
        if (editingDish && !canEditProduct) {
            enqueueSnackbar("No tienes permiso para editar productos.", { variant: "warning" });
            return;
        }

        if (!editingDish && !canCreateProduct) {
            enqueueSnackbar("No tienes permiso para crear productos.", { variant: "warning" });
            return;
        }
        const normalizedInventoryType = normalizeInventoryType(dishForm.inventoryType);
        const isDirectStockProduct = normalizedInventoryType === "direct";
        const isRecipeProduct = normalizedInventoryType === "recipe";
        const category = String(dishForm.category || "").trim();

        if (!category) {
            enqueueSnackbar("La categoría es requerida para todos los productos.", {
                variant: "warning",
            });
            return;
        }

        if (!dishForm.inventoryCategoryId) {
            enqueueSnackbar("Debes seleccionar una categoría.", {
                variant: "warning",
            });
            return;
        }

        const formData = new FormData();

        formData.append("name", String(dishForm.name || "").trim());
        formData.append("category", category);

        if (dishForm.inventoryCategoryId) {
            formData.append("inventoryCategoryId", String(dishForm.inventoryCategoryId));
        } else {
            formData.append("inventoryCategoryId", "");
        }


        formData.append("productionArea", String(dishForm.productionArea || "kitchen").trim());
        const sellMode = dishForm.sellMode || "unit";
        const weightUnit = dishForm.weightUnit || "lb";

        formData.append("sellMode", sellMode);
        formData.append("weightUnit", weightUnit);
        formData.append("allowCustomPrice", dishForm.allowCustomPrice ? "true" : "false");

        // ✅ Recomendado: explícito
        formData.append("inventoryType", normalizedInventoryType);

        if (isDirectStockProduct) {
            formData.append("stockMin", "0");
            formData.append(
                "allowNegativeStock",
                dishForm.allowNegativeStock !== false ? "true" : "false"
            );
        } else {
            formData.append("stockMin", "");
            formData.append("allowNegativeStock", "false");
        }

        formData.append("isInventoryItem", "false");
        // ✅ NO mandar vacío


        const priceRaw =
            sellMode === "weight" ? dishForm.pricePerLb : dishForm.price;

        const basePrice = Math.round(Number(priceRaw || 0) * 100) / 100;


        formData.append("price", String(basePrice));

        if (sellMode === "weight") {
            formData.append("pricePerLb", String(basePrice));
        } else {
            formData.append("pricePerLb", "");
        }

        if (isDirectStockProduct) {
            formData.append("avgCost", dishForm.avgCost ?? "");
            formData.append("lastCost", dishForm.lastCost ?? "");
        } else {
            formData.append("avgCost", "");
            formData.append("lastCost", "");
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
                {canCreateProduct && (
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-4 py-2 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar Plato
                    </button>
                )}
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
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
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
                            {(canEditProduct || canDeleteProduct) && (
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {canEditProduct && (
                                        <button
                                            onClick={() => openEditModal(dish)}
                                            className="p-2 bg-[#1a1a1a]/90 rounded-lg hover:bg-[#f6b100] transition-colors"
                                            title="Editar"
                                        >
                                            <Edit className="w-4 h-4 text-white" />
                                        </button>
                                    )}

                                    {canDeleteProduct && (
                                        <button
                                            onClick={() => setConfirmDelete({ open: true, dish })}
                                            className="p-2 bg-[#1a1a1a]/90 rounded-lg hover:bg-red-500 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4 text-white" />
                                        </button>
                                    )}
                                </div>
                            )}
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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-3 sm:px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]"                    onClick={closeModal}
                >
                    <div
                        className="w-full sm:max-w-2xl bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100dvh-7.5rem)] sm:max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 sm:p-6 border-b border-gray-800/50 shrink-0">
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

                        <form
                            onSubmit={handleSubmit}
                            className="flex-1 modern-scroll overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
                        >
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

                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Área de Producción *</label>
                                <select
                                    value={dishForm.productionArea}
                                    onChange={(e) => setDishForm((f) => ({ ...f, productionArea: e.target.value }))}
                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                >
                                    <option value="kitchen">Cocina</option>
                                    <option value="bar">Bar</option>
                                    <option value="other">Otra</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                    Esto define a qué impresora de producción se enviará el ticket.
                                </p>
                            </div>
                            {/* Categoría */}
                            <div className="rounded-2xl border border-gray-800/60 bg-[#111111] p-4">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        <label className="text-sm font-semibold text-white flex items-center gap-2">
                                            <Tag className="w-4 h-4 text-[#f6b100]" />
                                            Categoría *
                                        </label>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Selecciona una categoría existente o crea una nueva.
                                        </p>
                                    </div>

                                    {dishForm.category && (
                                        <span className="px-2.5 py-1 rounded-full text-xs border border-[#f6b100]/30 bg-[#f6b100]/10 text-[#f6b100]">
                {dishForm.category}
            </span>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <select
                                        value={dishForm.inventoryCategoryId || ""}
                                        onChange={(e) => {
                                            const selectedId = e.target.value;

                                            if (!selectedId) {
                                                setDishForm((f) => ({
                                                    ...f,
                                                    inventoryCategoryId: "",
                                                    category: "",
                                                }));
                                                return;
                                            }

                                            const selectedCategory = invCats.find(
                                                (cat) => String(cat._id) === String(selectedId)
                                            );

                                            setDishForm((f) => ({
                                                ...f,
                                                inventoryCategoryId: selectedId,
                                                category: String(selectedCategory?.name || "").trim(),
                                            }));
                                        }}
                                        className="flex-1 p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                        required
                                    >
                                        <option value="">Selecciona categoría</option>

                                        {invCats.map((cat) => (
                                            <option key={cat._id} value={cat._id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        onClick={() => setShowInvCatModal(true)}
                                        className="px-4 py-2.5 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all whitespace-nowrap"
                                    >
                                        Crear
                                    </button>
                                </div>

                                <p className="text-xs text-gray-500 mt-2">
                                    Esta categoría se usará para organizar el menú y clasificar el producto dentro del inventario.
                                </p>
                            </div>

                            {/* Tipo de producto */}
                            <div className="rounded-2xl border border-gray-800/60 bg-[#111111] p-4">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div>
                                        <label className="text-sm font-semibold text-white flex items-center gap-2">
                                            <Package className="w-4 h-4 text-[#f6b100]" />
                                            Tipo de producto
                                        </label>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Define cómo este producto se comporta frente al inventario.
                                        </p>
                                    </div>

                                    <span className="px-2.5 py-1 rounded-full text-xs border border-[#f6b100]/30 bg-[#f6b100]/10 text-[#f6b100]">
            {MENU_PRODUCT_TYPES.find((t) => t.value === dishForm.inventoryType)?.title || "Plato normal"}
        </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {MENU_PRODUCT_TYPES.map((type) => {
                                        const active = dishForm.inventoryType === type.value;

                                        return (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => {
                                                    setDishForm((f) => ({
                                                        ...f,
                                                        inventoryType: type.value,
                                                        allowNegativeStock: type.value === "direct",
                                                        isInventoryItem: false,
                                                        avgCost: type.value === "direct" ? f.avgCost : "",
                                                        lastCost: type.value === "direct" ? f.lastCost : "",
                                                    }));
                                                }}
                                                className={`text-left rounded-2xl border p-4 transition-all ${
                                                    active
                                                        ? "border-[#f6b100]/60 bg-[#f6b100]/10 text-white"
                                                        : "border-white/10 bg-black/20 text-gray-300 hover:border-white/20"
                                                }`}
                                            >
                                                <div className="text-sm font-bold">{type.title}</div>
                                                <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                                                    {type.desc}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {dishForm.inventoryType === "direct" && (
                                    <div className="mt-4 rounded-2xl border border-[#f6b100]/20 bg-[#f6b100]/5 p-4">
                                        <div className="text-sm font-semibold text-[#f6b100]">
                                            Producto con stock directo
                                        </div>
                                        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                                            Este producto aparecerá en Control de Stock usando la misma categoría del menú:
                                            <span className="text-white font-semibold">
                                                {" "}
                                                {dishForm.category || "Sin categoría"}
                                            </span>
                                            . Podrá recibir entradas, salidas y quedar en negativo si se vende sin existencia.
                                        </p>
                                    </div>
                                )}

                                {dishForm.inventoryType === "recipe" && (
                                    <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                                        <div className="text-sm font-semibold text-blue-200">
                                            Plato con receta
                                        </div>
                                        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                                            Este plato no manejará stock directo. Al venderlo, el sistema descontará los ingredientes configurados en su receta.
                                        </p>
                                    </div>
                                )}
                            </div>
                            {/* Precio Manual (estilo UberEats / botones tipo método de pago) */}
                            {!dishForm.isInventoryItem && (
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Tipo de Precio</label>

                                    <div className="flex items-center justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDishForm((f) => ({
                                                    ...f,
                                                    allowCustomPrice: false,
                                                }));
                                            }}
                                            className={`px-4 py-3 w-full rounded-lg font-semibold ${
                                                !dishForm.allowCustomPrice
                                                    ? "bg-[#2b2b2b] text-white"
                                                    : "bg-[#1f1f1f] text-[#ababab]"
                                            }`}
                                        >
                                            Precio fijo
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDishForm((f) => ({
                                                    ...f,
                                                    allowCustomPrice: true,

                                                    // fuerza modo unit y limpia precios fijos
                                                    sellMode: "unit",
                                                    price: "",
                                                    pricePerLb: "",
                                                    weightUnit: "lb",
                                                }));
                                            }}
                                            className={`px-4 py-3 w-full rounded-lg font-semibold ${
                                                dishForm.allowCustomPrice
                                                    ? "bg-[#2b2b2b] text-white"
                                                    : "bg-[#1f1f1f] text-[#ababab]"
                                            }`}
                                        >
                                            Precio manual
                                        </button>
                                    </div>

                                    {dishForm.allowCustomPrice && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            El precio se definirá al momento de facturar.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Modo de venta */}
                            {!dishForm.allowCustomPrice && (
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
                            )}
                            {/* Precio según modo */}
                            {!dishForm.allowCustomPrice && (
                                dishForm.sellMode === "weight" ? (
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
                                                onWheel={(e) => e.currentTarget.blur()}
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
                                            onWheel={(e) => e.currentTarget.blur()}
                                            onChange={(e) => setDishForm((f) => ({ ...f, price: e.target.value }))}
                                            className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                            required
                                        />
                                    </div>
                                )
                            )}

                            {/* Costos (opcionales) */}
                            {!dishForm.allowCustomPrice && (
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
                                Vas a eliminar el plato{" "}
                                <span className="font-semibold text-white">
        {confirmDelete.dish?.name || "—"}
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
                                        if (!canDeleteProduct) {
                                            enqueueSnackbar("No tienes permiso para eliminar productos.", { variant: "warning" });
                                            return;
                                        }

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
            <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-400">
                    Página {page} de {totalPages} · {total} platos
                </p>

                <div className="flex gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white disabled:opacity-50"
                    >
                        Anterior
                    </button>

                    <button
                        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                        disabled={page >= totalPages}
                        className="px-4 py-2 bg-[#f6b100] text-black rounded-lg font-semibold disabled:opacity-50"
                    >
                        Siguiente
                    </button>
                </div>
            </div>

        </div>
    );
};

export default MenuManagement;
