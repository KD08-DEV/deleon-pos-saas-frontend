import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    Edit,
    X,
    Save,
    Mail,
    Phone,
    User,
    Briefcase,
    Lock,
    Eye,
    EyeOff,
    ShieldCheck,
    Package,
    Boxes,
    RotateCcw,
    CheckCircle2,
} from "lucide-react";
import { enqueueSnackbar } from "notistack";
import api from "../../lib/api";

const DEFAULT_PERMISSIONS = {
    products: {
        create: false,
        update: false,
        delete: false,
    },
    inventory: {
        entry: false,
        exit: false,
        adjust: false,
        waste: false,
    },
    orders: {
        cancel: false,
    },
};

const normalizePermissions = (permissions = {}) => ({
    products: {
        create: Boolean(permissions?.products?.create),
        update: Boolean(permissions?.products?.update),
        delete: Boolean(permissions?.products?.delete),
    },
    inventory: {
        entry: Boolean(permissions?.inventory?.entry),
        exit: Boolean(permissions?.inventory?.exit),
        adjust: Boolean(permissions?.inventory?.adjust),
        waste: Boolean(permissions?.inventory?.waste),
    },
    orders: {
        cancel: Boolean(permissions?.orders?.cancel),
    },
});

const countActivePermissions = (permissions = DEFAULT_PERMISSIONS) => {
    const p = normalizePermissions(permissions);
    return [
        p.products.create,
        p.products.update,
        p.products.delete,
        p.inventory.entry,
        p.inventory.exit,
        p.inventory.adjust,
        p.inventory.waste,
        p.orders.cancel,
    ].filter(Boolean).length;
};

const ToggleSwitch = ({ checked, onChange, disabled = false }) => {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                disabled
                    ? "opacity-50 cursor-not-allowed bg-white/10"
                    : checked
                        ? "bg-[#F6B100]"
                        : "bg-white/10"
            }`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                    checked ? "translate-x-5" : "translate-x-1"
                }`}
            />
        </button>
    );
};

const PermissionItem = ({ icon: Icon, title, desc, checked, onChange }) => (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-4 hover:border-[#F6B100]/35 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F6B100]/10 border border-[#F6B100]/20">
                    <Icon className="w-5 h-5 text-[#F6B100]" />
                </div>

                <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white leading-snug">
                        {title}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed break-words">
                        {desc}
                    </p>
                </div>
            </div>

            <div className="flex justify-end sm:justify-start">
                <ToggleSwitch checked={checked} onChange={onChange} />
            </div>
        </div>
    </div>
);

const PermissionSection = ({ title, subtitle, icon: Icon, children }) => (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#111111] to-[#171717] p-4">
        <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6B100]/10 border border-[#F6B100]/20">
                <Icon className="w-5 h-5 text-[#F6B100]" />
            </div>
            <div>
                <h3 className="text-sm font-bold text-white">{title}</h3>
                <p className="text-xs text-gray-400">{subtitle}</p>
            </div>
        </div>

        <div className="space-y-3">{children}</div>
    </div>
);

const Employees = () => {
    const queryClient = useQueryClient();

    const [editingEmployeeId, setEditingEmployeeId] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        role: "",
        password: "",
        confirmPassword: "",
        permissions: DEFAULT_PERMISSIONS,
    });

    const {
        data: employees = [],
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["admin/employees"],
        queryFn: async () => {
            const { data } = await api.get("/api/admin/employees");
            return Array.isArray(data?.data) ? data.data : [];
        },
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnReconnect: true,
    });

    const editingEmployee = useMemo(() => {
        if (!editingEmployeeId) return null;
        return employees.find((e) => e._id === editingEmployeeId) || null;
    }, [employees, editingEmployeeId]);

    useEffect(() => {
        if (!editingEmployee) return;

        setShowPassword(false);
        setShowConfirmPassword(false);

        setFormData({
            name: editingEmployee.name || "",
            email: editingEmployee.email || "",
            phone: editingEmployee.phone?.toString() || "",
            role: editingEmployee.membershipRole || editingEmployee.role || "",
            password: "",
            confirmPassword: "",
            permissions: normalizePermissions(editingEmployee.permissions),
        });
    }, [editingEmployee]);

    const resetForm = () => {
        setShowPassword(false);
        setShowConfirmPassword(false);
        setFormData({
            name: "",
            email: "",
            phone: "",
            role: "",
            password: "",
            confirmPassword: "",
            permissions: DEFAULT_PERMISSIONS,
        });
    };

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.patch(`/api/admin/employees/${id}`, data);
            return response;
        },
        onSuccess: (response, variables) => {
            const updatedPermissions = normalizePermissions(
                variables?.data?.permissions || DEFAULT_PERMISSIONS
            );

            queryClient.setQueryData(["admin/employees"], (old = []) => {
                if (!Array.isArray(old)) return old;
                return old.map((emp) =>
                    emp._id === variables.id
                        ? {
                            ...emp,
                            name: variables.data.name,
                            email: variables.data.email,
                            phone: variables.data.phone,
                            role: variables.data.role,
                            membershipRole: variables.data.role,
                            permissions: updatedPermissions,
                        }
                        : emp
                );
            });

            enqueueSnackbar(
                response?.message || "Empleado actualizado exitosamente",
                { variant: "success" }
            );

            queryClient.invalidateQueries({ queryKey: ["admin/employees"] });

            setEditingEmployeeId(null);
            resetForm();
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message || "Error al actualizar empleado";
            enqueueSnackbar(message, { variant: "error" });
        },
    });

    const handleEdit = (employee) => {
        setEditingEmployeeId(employee._id);
    };

    const handleCancel = () => {
        setEditingEmployeeId(null);
        resetForm();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handlePermissionChange = (path, value) => {
        const [group, key] = path.split(".");

        setFormData((prev) => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [group]: {
                    ...(prev.permissions?.[group] || {}),
                    [key]: value,
                },
            },
        }));
    };

    const handleResetPermissions = () => {
        setFormData((prev) => ({
            ...prev,
            permissions: DEFAULT_PERMISSIONS,
        }));
    };

    const activePermissions = countActivePermissions(formData.permissions);

    const handleSave = () => {
        if (!editingEmployeeId) return;

        if (!formData.name.trim()) {
            enqueueSnackbar("El nombre es requerido", { variant: "warning" });
            return;
        }

        if (!formData.email.trim()) {
            enqueueSnackbar("El email es requerido", { variant: "warning" });
            return;
        }

        if (formData.phone.toString().length !== 10) {
            enqueueSnackbar("El teléfono debe tener 10 dígitos", {
                variant: "warning",
            });
            return;
        }

        if (!formData.role) {
            enqueueSnackbar("El rol es requerido", { variant: "warning" });
            return;
        }

        if (formData.password.trim()) {
            if (formData.password.length < 6) {
                enqueueSnackbar("La contraseña debe tener al menos 6 caracteres", {
                    variant: "warning",
                });
                return;
            }

            if (formData.password !== formData.confirmPassword) {
                enqueueSnackbar("Las contraseñas no coinciden", {
                    variant: "warning",
                });
                return;
            }
        }

        const updateData = {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone,
            role: formData.role,
            permissions: normalizePermissions(formData.permissions),
        };

        if (formData.password.trim()) {
            updateData.password = formData.password.trim();
        }

        updateMutation.mutate({
            id: editingEmployeeId,
            data: updateData,
        });
    };

    if (isLoading) {
        return (
            <div className="text-center text-[#ababab] py-10">
                Cargando empleados...
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center text-red-500 py-10">
                Error al cargar los empleados
                {error?.response?.status ? ` (HTTP ${error.response.status})` : ""}.
            </div>
        );
    }

    return (
        <>
            <div className="p-8 bg-gradient-to-br from-[#1a1a1a] to-[#1f1f1f] rounded-lg shadow-lg text-[#f5f5f5]">
                <h2 className="text-2xl font-bold mb-6 text-center">Empleados</h2>

                {employees.length === 0 ? (
                    <p className="text-center text-[#ababab]">
                        No hay empleados registrados.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse border border-[#2a2a2a] rounded-lg overflow-hidden">
                            <thead className="bg-gradient-to-r from-[#262626] to-[#2a2a2a]">
                            <tr>
                                <th className="p-4 text-[#f5f5f5] font-semibold">Nombre</th>
                                <th className="p-4 text-[#f5f5f5] font-semibold">Email</th>
                                <th className="p-4 text-[#f5f5f5] font-semibold">Teléfono</th>
                                <th className="p-4 text-[#f5f5f5] font-semibold">Rol</th>
                                <th className="p-4 text-[#f5f5f5] font-semibold">Permisos</th>
                                <th className="p-4 text-[#f5f5f5] font-semibold text-center">
                                    Acciones
                                </th>
                            </tr>
                            </thead>
                            <tbody>
                            {employees.map((e) => {
                                const total = countActivePermissions(e.permissions);
                                return (
                                    <motion.tr
                                        key={e._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="border-t border-[#2a2a2a] hover:bg-[#2a2a2a] transition-all"
                                    >
                                        <td className="p-4">{e.name}</td>
                                        <td className="p-4 text-[#ababab]">{e.email}</td>
                                        <td className="p-4 text-[#ababab]">{e.phone}</td>
                                        <td className="p-4">
                                                <span className="px-3 py-1 rounded-lg bg-[#F6B100]/20 text-[#F6B100] font-semibold text-sm border border-[#F6B100]/30">
                                                    {e.membershipRole || e.role}
                                                </span>
                                        </td>
                                        <td className="p-4">
                                                <span
                                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border text-sm font-medium ${
                                                        total > 0
                                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                                            : "bg-white/5 border-white/10 text-gray-400"
                                                    }`}
                                                >
                                                    <ShieldCheck className="w-4 h-4" />
                                                    {total} activos
                                                </span>
                                        </td>
                                        <td className="p-4">
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleEdit(e)}
                                                className="mx-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200"
                                            >
                                                <Edit className="w-4 h-4" />
                                                <span className="text-sm font-semibold">Editar</span>
                                            </motion.button>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {editingEmployeeId && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCancel}
                            className="fixed inset-0 z-50 backdrop-blur-md bg-black/70"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 24 }}
                            transition={{ type: "spring", stiffness: 260, damping: 24 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center px-2 py-4 sm:px-4 sm:py-6 pointer-events-none"
                        >
                            <div className="relative flex w-full max-w-[98vw] sm:max-w-3xl max-h-[92dvh] sm:max-h-[94vh] flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-[#141414] via-[#1b1b1b] to-[#131313] shadow-[0_30px_80px_rgba(0,0,0,0.55)] pointer-events-auto">
                                <div className="sticky top-0 z-20 border-b border-white/10 bg-[#171717]/95 backdrop-blur-xl px-4 sm:px-6 py-4 sm:py-5 rounded-t-2xl sm:rounded-t-3xl flex items-start sm:items-center justify-between gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                                        <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 border border-blue-500/25">
                                            <Edit className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
                                                Editar Empleado
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-400 leading-snug">
                                                Permisos y datos en tiempo real del usuario seleccionado
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleCancel}
                                        className="shrink-0 p-2.5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:bg-red-500/15 hover:border-red-500/20 hover:text-red-400 transition-all"                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div
                                    className="relative overflow-y-auto overscroll-contain px-4 sm:px-6 pt-4 sm:pt-6 pb-36 sm:pb-28"
                                    style={{
                                        maxHeight: "calc(92dvh - 150px)",
                                        scrollbarWidth: "thin",
                                        scrollbarColor: "#F6B100 #1f1f1f",
                                    }}
                                >
                                    <div className="pointer-events-none sticky top-0 z-10 h-5 -mt-4 sm:-mt-6 mb-2 bg-gradient-to-b from-[#171717] to-transparent" />
                                    <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-4 sm:gap-6">
                                        <div className="space-y-4">
                                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                                <h4 className="text-sm font-bold text-white mb-4">
                                                    Información básica
                                                </h4>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                                            <User className="w-4 h-4" />
                                                            Nombre
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="name"
                                                            value={formData.name}
                                                            onChange={handleChange}
                                                            className="w-full px-3 py-3 sm:p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                            placeholder="Nombre del empleado"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                                            <Mail className="w-4 h-4" />
                                                            Email
                                                        </label>
                                                        <input
                                                            type="email"
                                                            name="email"
                                                            value={formData.email}
                                                            onChange={handleChange}
                                                            className="w-full px-3 py-3 sm:p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                            placeholder="email@ejemplo.com"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                                            <Phone className="w-4 h-4" />
                                                            Teléfono
                                                        </label>
                                                        <input
                                                            type="tel"
                                                            name="phone"
                                                            value={formData.phone}
                                                            onChange={handleChange}
                                                            maxLength={10}
                                                            className="w-full px-3 py-3 sm:p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                            placeholder="1234567890"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                                            <Briefcase className="w-4 h-4" />
                                                            Rol
                                                        </label>
                                                        <select
                                                            name="role"
                                                            value={formData.role}
                                                            onChange={handleChange}
                                                            className="w-full px-3 py-3 sm:p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                        >
                                                            <option value="">Seleccionar rol</option>
                                                            <option value="Camarero">Camarero</option>
                                                            <option value="Cajera">Cajera</option>
                                                            <option value="Cocina">Cocina</option>
                                                            <option value="Admin">Admin</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white">
                                                            Seguridad
                                                        </h4>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            Cambia la contraseña solo si es necesario
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                                            <Lock className="w-4 h-4" />
                                                            Nueva Contraseña
                                                            <span className="text-xs text-gray-500 font-normal">
                                                                (opcional)
                                                            </span>
                                                        </label>

                                                        <div className="relative">
                                                            <input
                                                                type={showPassword ? "text" : "password"}
                                                                name="password"
                                                                value={formData.password}
                                                                onChange={handleChange}
                                                                className="w-full px-3 py-3 sm:p-3 pr-10 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                                placeholder="Dejar vacío para no cambiar"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setShowPassword(!showPassword)
                                                                }
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ababab] hover:text-[#f5f5f5] transition-colors"
                                                            >
                                                                {showPassword ? (
                                                                    <EyeOff className="w-4 h-4" />
                                                                ) : (
                                                                    <Eye className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Mínimo 6 caracteres
                                                        </p>
                                                    </div>

                                                    {formData.password && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                        >
                                                            <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                                                <Lock className="w-4 h-4" />
                                                                Confirmar Contraseña
                                                            </label>

                                                            <div className="relative">
                                                                <input
                                                                    type={
                                                                        showConfirmPassword
                                                                            ? "text"
                                                                            : "password"
                                                                    }
                                                                    name="confirmPassword"
                                                                    value={formData.confirmPassword}
                                                                    onChange={handleChange}
                                                                    className="w-full px-3 py-3 sm:p-3 pr-10 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                                    placeholder="Confirma la nueva contraseña"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setShowConfirmPassword(
                                                                            !showConfirmPassword
                                                                        )
                                                                    }
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ababab] hover:text-[#f5f5f5] transition-colors"
                                                                >
                                                                    {showConfirmPassword ? (
                                                                        <EyeOff className="w-4 h-4" />
                                                                    ) : (
                                                                        <Eye className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                            </div>

                                                            {formData.password &&
                                                                formData.confirmPassword &&
                                                                formData.password !==
                                                                formData.confirmPassword && (
                                                                    <p className="mt-1 text-xs text-red-400">
                                                                        Las contraseñas no coinciden
                                                                    </p>
                                                                )}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="rounded-2xl border border-[#F6B100]/15 bg-[#F6B100]/5 p-4 sm:p-5">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.18em] text-[#F6B100]/80">
                                                            Resumen de permisos
                                                        </p>
                                                        <h4 className="text-white font-semibold mt-1">
                                                            {activePermissions} permisos activos
                                                        </h4>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            Los cambios se cargan desde la base de datos del
                                                            empleado actual.
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center justify-start sm:justify-end">
                                                        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-[#F6B100]/10 border border-[#F6B100]/20 flex items-center justify-center">
                                                            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#F6B100]" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-2 max-w-full">
                                                    {activePermissions > 0 ? (
                                                        <>
                                                            {formData.permissions?.products?.create && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                                                                    Crear productos
                                                                </span>
                                                            )}
                                                            {formData.permissions?.products?.update && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                                                                    Editar productos
                                                                </span>
                                                            )}
                                                            {formData.permissions?.products?.delete && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                                                                    Eliminar productos
                                                                </span>
                                                            )}
                                                            {formData.permissions?.inventory?.entry && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                                                    Entrada inventario
                                                                </span>
                                                            )}
                                                            {formData.permissions?.inventory?.exit && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                                                    Salidas
                                                                </span>
                                                            )}
                                                            {formData.permissions?.inventory?.adjust && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                                                    Ajustes
                                                                </span>
                                                            )}
                                                            {formData.permissions?.inventory?.waste && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                                                    Merma
                                                                </span>
                                                            )}
                                                            {formData.permissions?.orders?.cancel && (
                                                                <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">
                                                                    Cancelar órdenes
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-400">
                                                            Sin permisos especiales
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                                                <div>
                                                    <h4 className="text-sm font-bold text-white">
                                                        Permisos especiales
                                                    </h4>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Estos permisos aplican solo al usuario que estás editando.
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handleResetPermissions}
                                                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all text-sm w-full sm:w-auto"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    Limpiar
                                                </button>
                                            </div>

                                            <PermissionSection
                                                title="Productos"
                                                subtitle="Permisos para gestión de menú y productos"
                                                icon={Package}
                                            >
                                                <PermissionItem
                                                    icon={CheckCircle2}
                                                    title="Crear productos"
                                                    desc="Permite crear platos o productos nuevos dentro de Gestión de Menú."
                                                    checked={!!formData.permissions?.products?.create}
                                                    onChange={(v) =>
                                                        handlePermissionChange(
                                                            "products.create",
                                                            v
                                                        )
                                                    }
                                                />

                                                <PermissionItem
                                                    icon={Edit}
                                                    title="Editar productos"
                                                    desc="Permite modificar productos existentes."
                                                    checked={!!formData.permissions?.products?.update}
                                                    onChange={(v) =>
                                                        handlePermissionChange(
                                                            "products.update",
                                                            v
                                                        )
                                                    }
                                                />

                                                <PermissionItem
                                                    icon={X}
                                                    title="Eliminar productos"
                                                    desc="Permite eliminar productos del sistema."
                                                    checked={!!formData.permissions?.products?.delete}
                                                    onChange={(v) =>
                                                        handlePermissionChange(
                                                            "products.delete",
                                                            v
                                                        )
                                                    }
                                                />
                                            </PermissionSection>

                                            <PermissionSection
                                                title="Inventario"
                                                subtitle="Permisos para entradas y operaciones sobre stock"
                                                icon={Boxes}
                                            >
                                                <PermissionItem
                                                    icon={CheckCircle2}
                                                    title="Dar entrada de inventario"
                                                    desc="Permite registrar entradas tipo compra o entrada manual."
                                                    checked={!!formData.permissions?.inventory?.entry}
                                                    onChange={(v) =>
                                                        handlePermissionChange(
                                                            "inventory.entry",
                                                            v
                                                        )
                                                    }
                                                />

                                                <PermissionItem
                                                    icon={CheckCircle2}
                                                    title="Registrar salidas"
                                                    desc="Permite registrar salidas manuales de inventario."
                                                    checked={!!formData.permissions?.inventory?.exit}
                                                    onChange={(v) =>
                                                        handlePermissionChange(
                                                            "inventory.exit",
                                                            v
                                                        )
                                                    }
                                                />

                                                <PermissionItem
                                                    icon={CheckCircle2}
                                                    title="Realizar ajustes"
                                                    desc="Permite hacer ajustes positivos o negativos de stock."
                                                    checked={!!formData.permissions?.inventory?.adjust}
                                                    onChange={(v) =>
                                                        handlePermissionChange(
                                                            "inventory.adjust",
                                                            v
                                                        )
                                                    }
                                                />

                                                <PermissionItem
                                                    icon={CheckCircle2}
                                                    title="Registrar merma"
                                                    desc="Permite registrar pérdida o merma de inventario."
                                                    checked={!!formData.permissions?.inventory?.waste}
                                                    onChange={(v) =>
                                                        handlePermissionChange(
                                                            "inventory.waste",
                                                            v
                                                        )
                                                    }
                                                />
                                            </PermissionSection>
                                            <PermissionSection
                                                title="Órdenes"
                                                subtitle="Permisos para acciones críticas sobre órdenes"
                                                icon={ShieldCheck}
                                            >
                                                <PermissionItem
                                                    icon={X}
                                                    title="Cancelar órdenes"
                                                    desc="Permite cancelar una orden activa. Si este permiso está apagado, el usuario no podrá cancelar órdenes."
                                                    checked={!!formData.permissions?.orders?.cancel}
                                                    onChange={(v) =>
                                                        handlePermissionChange(
                                                            "orders.cancel",
                                                            v
                                                        )
                                                    }
                                                />
                                            </PermissionSection>
                                        </div>
                                    </div>
                                </div>

                                <div className="sticky bottom-0 z-30 border-t border-white/10 bg-[#181818]/98 backdrop-blur-xl px-4 sm:px-6 pt-3 sm:pt-4 pb-6 sm:pb-5 rounded-b-2xl sm:rounded-b-3xl flex flex-col-reverse sm:flex-row sm:justify-end gap-3 shadow-[0_-18px_40px_rgba(0,0,0,0.35)]">
                                    <button
                                        onClick={handleCancel}
                                        className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all font-medium"
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        onClick={handleSave}
                                        disabled={updateMutation.isPending}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_10px_30px_rgba(16,185,129,0.28)] transition-all font-semibold disabled:opacity-60"
                                    >
                                        <Save className="w-4 h-4" />
                                        {updateMutation.isPending ? "Guardando..." : "Guardar"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default Employees;