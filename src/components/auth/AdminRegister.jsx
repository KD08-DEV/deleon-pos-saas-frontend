import React, { useEffect, useMemo, useState } from "react";
import { register } from "../../https";
import api from "../../lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const EMPTY_USER_FORM = {
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
};

const EMPTY_REGISTER_FORM = {
    code: "",
    name: "",
    location: "",
    sortOrder: 0,
    isActive: true,
    defaultCashierUserId: "",
};

const AdminRegister = () => {
    const [activeTab, setActiveTab] = useState("users");
    const [formData, setFormData] = useState(EMPTY_USER_FORM);

    const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM);
    const [editingRegisterId, setEditingRegisterId] = useState(null);
    const [showInactiveRegisters, setShowInactiveRegisters] = useState(true);

    const user = useSelector((state) => state.user);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user?.userData || user?.userData?.role !== "Admin") {
            enqueueSnackbar("Access denied. Admins only.", { variant: "error" });
            navigate("/");
        }
    }, [user, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleSelection = (selectedRole) => {
        setFormData({ ...formData, role: selectedRole });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        registerMutation.mutate(formData);
    };

    const registerMutation = useMutation({
        mutationFn: (reqData) => register(reqData),
        onSuccess: (res) => {
            const { data } = res;
            enqueueSnackbar(data.message || "Usuario registrado correctamente.", {
                variant: "success",
            });
            setFormData(EMPTY_USER_FORM);
            queryClient.invalidateQueries({ queryKey: ["admin/users"] });
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "No se pudo registrar el usuario.";
            enqueueSnackbar(message, { variant: "error" });
        },
    });

    const {
        data: usersResp,
        isLoading: usersLoading,
        refetch: refetchUsers,
    } = useQuery({
        queryKey: ["admin/users"],
        queryFn: async () => {
            const res = await api.get("/api/admin/users");
            return res.data;
        },
        staleTime: 60_000,
    });

    const users = useMemo(() => {
        const raw = usersResp?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(usersResp)) return usersResp;
        return [];
    }, [usersResp]);

    const cashierUsers = useMemo(() => {
        return users.filter(
            (u) =>
                String(u?.role || "").toLowerCase() === "cajera" ||
                String(u?.role || "").toLowerCase() === "admin"
        );
    }, [users]);

    const {
        data: registersResp,
        isLoading: registersLoading,
        refetch: refetchRegisters,
    } = useQuery({
        queryKey: ["admin/registers", showInactiveRegisters],
        queryFn: async () => {
            const res = await api.get("/api/admin/registers", {
                params: { includeInactive: showInactiveRegisters ? 1 : 0 },
            });
            return res.data;
        },
        staleTime: 30_000,
    });

    const registers = useMemo(() => {
        const raw = registersResp?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(registersResp)) return registersResp;
        return [];
    }, [registersResp]);

    const createRegisterMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/api/admin/registers", payload);
            return res.data;
        },
        onSuccess: () => {
            enqueueSnackbar("Caja creada correctamente.", { variant: "success" });
            setRegisterForm(EMPTY_REGISTER_FORM);
            setEditingRegisterId(null);
            refetchRegisters();
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "No se pudo crear la caja.";
            enqueueSnackbar(message, { variant: "error" });
        },
    });

    const updateRegisterMutation = useMutation({
        mutationFn: async ({ id, payload }) => {
            const res = await api.put(`/api/admin/registers/${id}`, payload);
            return res.data;
        },
        onSuccess: () => {
            enqueueSnackbar("Caja actualizada correctamente.", { variant: "success" });
            setRegisterForm(EMPTY_REGISTER_FORM);
            setEditingRegisterId(null);
            refetchRegisters();
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "No se pudo actualizar la caja.";
            enqueueSnackbar(message, { variant: "error" });
        },
    });

    const toggleRegisterMutation = useMutation({
        mutationFn: async ({ id, isActive }) => {
            const res = await api.patch(`/api/admin/registers/${id}/toggle`, {
                isActive,
            });
            return res.data;
        },
        onSuccess: () => {
            enqueueSnackbar("Estado de caja actualizado.", { variant: "success" });
            refetchRegisters();
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message ||
                "No se pudo cambiar el estado de la caja.";
            enqueueSnackbar(message, { variant: "error" });
        },
    });

    const handleRegisterFormChange = (e) => {
        const { name, value, type, checked } = e.target;

        setRegisterForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? checked
                    : name === "sortOrder"
                        ? Number(value)
                        : value,
        }));
    };

    const handleRegisterSubmit = (e) => {
        e.preventDefault();

        const payload = {
            code: String(registerForm.code || "").trim().toUpperCase(),
            name: String(registerForm.name || "").trim(),
            location: String(registerForm.location || "").trim(),
            sortOrder: Number(registerForm.sortOrder || 0),
            isActive: Boolean(registerForm.isActive),
            defaultCashierUserId: registerForm.defaultCashierUserId || null,
        };

        if (!payload.code) {
            enqueueSnackbar("Debes indicar el código de la caja.", {
                variant: "warning",
            });
            return;
        }

        if (!payload.name) {
            enqueueSnackbar("Debes indicar el nombre de la caja.", {
                variant: "warning",
            });
            return;
        }

        if (editingRegisterId) {
            updateRegisterMutation.mutate({ id: editingRegisterId, payload });
        } else {
            createRegisterMutation.mutate(payload);
        }
    };

    const handleEditRegister = (item) => {
        setActiveTab("registers");
        setEditingRegisterId(item._id);
        setRegisterForm({
            code: item.code || "",
            name: item.name || "",
            location: item.location || "",
            sortOrder: Number(item.sortOrder || 0),
            isActive: Boolean(item.isActive),
            defaultCashierUserId:
                item?.defaultCashierUserId?._id ||
                item?.defaultCashierUserId ||
                "",
        });
    };

    const handleCancelRegisterEdit = () => {
        setEditingRegisterId(null);
        setRegisterForm(EMPTY_REGISTER_FORM);
    };

    return (
        <section className="bg-[#121212] min-h-screen px-4 py-8">
            <div className="max-w-6xl mx-auto">
                <div className="bg-[#1a1a1a] p-6 sm:p-8 rounded-2xl shadow-lg text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-[#f6b100]">
                                Administración
                            </h1>
                            <p className="text-sm text-[#ababab] mt-1">
                                Registra usuarios y gestiona tus cajas desde un solo lugar.
                            </p>
                        </div>

                        <button
                            onClick={() => navigate("/admin")}
                            className="bg-[#f6b100] text-black px-4 py-2 rounded-lg font-semibold hover:bg-[#ffd633] text-sm"
                        >
                            ← Volver
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-3 mb-8">
                        <button
                            type="button"
                            onClick={() => setActiveTab("users")}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                                activeTab === "users"
                                    ? "bg-[#f6b100] text-black"
                                    : "bg-[#262626] text-[#ababab] hover:bg-[#333]"
                            }`}
                        >
                            Registrar Usuario
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("registers")}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                                activeTab === "registers"
                                    ? "bg-[#f6b100] text-black"
                                    : "bg-[#262626] text-[#ababab] hover:bg-[#333]"
                            }`}
                        >
                            Gestionar Cajas
                        </button>
                    </div>

                    {activeTab === "users" && (
                        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
                            <div className="bg-[#151515] rounded-2xl p-6 border border-[#2a2a2a]">
                                <h2 className="text-xl font-bold text-white mb-5">
                                    Registrar Nuevo Usuario
                                </h2>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-[#ababab] text-sm mb-2">
                                            Nombre del empleado
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Ej: Juan Pérez"
                                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#f6b100] outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#ababab] text-sm mb-2">
                                            Correo electrónico
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="ejemplo@correo.com"
                                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#f6b100] outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#ababab] text-sm mb-2">
                                            Número de teléfono
                                        </label>
                                        <input
                                            type="number"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="Ej: 8095551234"
                                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#f6b100] outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#ababab] text-sm mb-2">
                                            Contraseña
                                        </label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#f6b100] outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#ababab] text-sm mb-3">
                                            Rol del empleado
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {["Camarero", "Cajera", "Admin"].map((role) => (
                                                <button
                                                    key={role}
                                                    type="button"
                                                    onClick={() => handleRoleSelection(role)}
                                                    className={`px-4 py-3 rounded-lg font-semibold transition text-sm ${
                                                        formData.role === role
                                                            ? "bg-[#f6b100] text-black"
                                                            : "bg-[#262626] text-[#ababab] hover:bg-[#333]"
                                                    }`}
                                                >
                                                    {role}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={registerMutation.isPending}
                                        className="w-full mt-6 py-3 bg-[#f6b100] text-black font-bold rounded-lg text-lg hover:bg-[#ffd633] transition disabled:opacity-60"
                                    >
                                        {registerMutation.isPending
                                            ? "Registrando..."
                                            : "Registrar Usuario"}
                                    </button>
                                </form>
                            </div>

                            <div className="bg-[#151515] rounded-2xl p-6 border border-[#2a2a2a]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white">Cajeras</h3>
                                    <button
                                        type="button"
                                        onClick={() => refetchUsers()}
                                        className="text-sm bg-[#262626] px-3 py-2 rounded-lg hover:bg-[#333] text-[#f6b100]"
                                    >
                                        Recargar
                                    </button>
                                </div>

                                {usersLoading ? (
                                    <div className="text-sm text-[#ababab]">Cargando usuarios...</div>
                                ) : cashierUsers.length === 0 ? (
                                    <div className="text-sm text-[#ababab]">
                                        No hay cajeras registradas todavía.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {cashierUsers.map((item) => (
                                            <div
                                                key={item._id}
                                                className="bg-[#202020] rounded-xl p-4 border border-[#2e2e2e]"
                                            >
                                                <div className="font-semibold text-white">{item.name}</div>
                                                <div className="text-sm text-[#ababab]">{item.email}</div>
                                                <div className="text-xs text-[#f6b100] mt-2">
                                                    {item.role}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "registers" && (
                        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
                            <div className="bg-[#151515] rounded-2xl p-6 border border-[#2a2a2a]">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xl font-bold text-white">
                                        {editingRegisterId ? "Editar Caja" : "Nueva Caja"}
                                    </h2>

                                    {editingRegisterId && (
                                        <button
                                            type="button"
                                            onClick={handleCancelRegisterEdit}
                                            className="text-sm bg-[#262626] px-3 py-2 rounded-lg hover:bg-[#333] text-[#f6b100]"
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </div>

                                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-[#ababab] text-sm mb-2">
                                            Código
                                        </label>
                                        <input
                                            type="text"
                                            name="code"
                                            value={registerForm.code}
                                            onChange={handleRegisterFormChange}
                                            placeholder="Ej: CAJA1"
                                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white uppercase focus:ring-2 focus:ring-[#f6b100] outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#ababab] text-sm mb-2">
                                            Nombre
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={registerForm.name}
                                            onChange={handleRegisterFormChange}
                                            placeholder="Ej: Caja 1"
                                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#f6b100] outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#ababab] text-sm mb-2">
                                            Ubicación
                                        </label>
                                        <input
                                            type="text"
                                            name="location"
                                            value={registerForm.location}
                                            onChange={handleRegisterFormChange}
                                            placeholder="Ej: Salón / Barra / Entrada"
                                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#f6b100] outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#ababab] text-sm mb-2">
                                            Orden
                                        </label>
                                        <input
                                            type="number"
                                            name="sortOrder"
                                            value={registerForm.sortOrder}
                                            onChange={handleRegisterFormChange}
                                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#f6b100] outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#ababab] text-sm mb-2">
                                            Cajera por defecto
                                        </label>
                                        <select
                                            name="defaultCashierUserId"
                                            value={registerForm.defaultCashierUserId}
                                            onChange={handleRegisterFormChange}
                                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#f6b100] outline-none"
                                        >
                                            <option value="">Sin asignar</option>
                                            {cashierUsers.map((cashier) => (
                                                <option key={cashier._id} value={cashier._id}>
                                                    {cashier.name} — {cashier.role}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <label className="flex items-center gap-3 text-sm text-[#ababab]">
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={registerForm.isActive}
                                            onChange={handleRegisterFormChange}
                                            className="accent-[#f6b100]"
                                        />
                                        Caja activa
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={
                                            createRegisterMutation.isPending ||
                                            updateRegisterMutation.isPending
                                        }
                                        className="w-full mt-4 py-3 bg-[#f6b100] text-black font-bold rounded-lg text-lg hover:bg-[#ffd633] transition disabled:opacity-60"
                                    >
                                        {editingRegisterId
                                            ? updateRegisterMutation.isPending
                                                ? "Guardando..."
                                                : "Guardar Cambios"
                                            : createRegisterMutation.isPending
                                                ? "Creando..."
                                                : "Crear Caja"}
                                    </button>
                                </form>
                            </div>

                            <div className="bg-[#151515] rounded-2xl p-6 border border-[#2a2a2a]">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">
                                            Cajas Registradas
                                        </h2>
                                        <p className="text-sm text-[#ababab] mt-1">
                                            Crea, edita, activa o desactiva tus cajas.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 text-sm text-[#ababab]">
                                            <input
                                                type="checkbox"
                                                checked={showInactiveRegisters}
                                                onChange={(e) =>
                                                    setShowInactiveRegisters(e.target.checked)
                                                }
                                                className="accent-[#f6b100]"
                                            />
                                            Ver inactivas
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() => refetchRegisters()}
                                            className="text-sm bg-[#262626] px-3 py-2 rounded-lg hover:bg-[#333] text-[#f6b100]"
                                        >
                                            Recargar
                                        </button>
                                    </div>
                                </div>

                                {registersLoading ? (
                                    <div className="text-sm text-[#ababab]">Cargando cajas...</div>
                                ) : registers.length === 0 ? (
                                    <div className="text-sm text-[#ababab]">
                                        No hay cajas registradas todavía.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {registers.map((item) => (
                                            <div
                                                key={item._id}
                                                className="bg-[#202020] rounded-xl p-4 border border-[#2e2e2e]"
                                            >
                                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="text-white font-semibold text-lg">
                                                                {item.name}
                                                            </h3>
                                                            <span className="text-xs px-2 py-1 rounded-full bg-[#2d2d2d] text-[#f6b100]">
                                {item.code}
                              </span>
                                                            <span
                                                                className={`text-xs px-2 py-1 rounded-full ${
                                                                    item.isActive
                                                                        ? "bg-green-500/20 text-green-400"
                                                                        : "bg-red-500/20 text-red-400"
                                                                }`}
                                                            >
                                {item.isActive ? "Activa" : "Inactiva"}
                              </span>
                                                        </div>

                                                        <div className="text-sm text-[#ababab] mt-2">
                                                            Ubicación: {item.location || "Sin ubicación"}
                                                        </div>

                                                        <div className="text-sm text-[#ababab] mt-1">
                                                            Cajera por defecto:{" "}
                                                            <span className="text-white">
                                {item?.defaultCashierUserId?.name || "Sin asignar"}
                              </span>
                                                        </div>

                                                        <div className="text-xs text-[#777] mt-2">
                                                            Orden: {item.sortOrder ?? 0}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditRegister(item)}
                                                            className="px-3 py-2 rounded-lg bg-[#2b2b2b] text-white hover:bg-[#3a3a3a] text-sm"
                                                        >
                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleRegisterMutation.mutate({
                                                                    id: item._id,
                                                                    isActive: !item.isActive,
                                                                })
                                                            }
                                                            className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                                                                item.isActive
                                                                    ? "bg-red-500/15 text-red-300 hover:bg-red-500/25"
                                                                    : "bg-green-500/15 text-green-300 hover:bg-green-500/25"
                                                            }`}
                                                        >
                                                            {item.isActive ? "Desactivar" : "Activar"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default AdminRegister;