import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, X, Save, Mail, Phone, User, Briefcase, Lock, Eye, EyeOff } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import api from "../../lib/api";

const Employees = () => {
    const queryClient = useQueryClient();
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        role: "",
        password: "",
        confirmPassword: "",
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

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.patch(`/api/admin/employees/${id}`, data);
            return response;
        },
                                        onSuccess: (data) => {
            enqueueSnackbar(data.message || "Empleado actualizado exitosamente", { variant: "success" });
            queryClient.invalidateQueries(["admin/employees"]);
            setEditingEmployee(null);
            setShowPassword(false);
            setShowConfirmPassword(false);
            setFormData({ name: "", email: "", phone: "", role: "", password: "", confirmPassword: "" });
        },
        onError: (error) => {
            const message = error?.response?.data?.message || "Error al actualizar empleado";
            enqueueSnackbar(message, { variant: "error" });
        },
    });

    const handleEdit = (employee) => {
        setEditingEmployee(employee._id);
        setShowPassword(false);
        setShowConfirmPassword(false);
        setFormData({
            name: employee.name || "",
            email: employee.email || "",
            phone: employee.phone?.toString() || "",
            role: employee.role || "",
            password: "",
            confirmPassword: "",
        });
    };

    const handleCancel = () => {
        setEditingEmployee(null);
        setShowPassword(false);
        setShowConfirmPassword(false);
        setFormData({ name: "", email: "", phone: "", role: "", password: "", confirmPassword: "" });
    };

    const handleSave = () => {
        if (!editingEmployee) return;
        
        // Validaciones básicas
        if (!formData.name.trim()) {
            enqueueSnackbar("El nombre es requerido", { variant: "warning" });
            return;
        }
        if (!formData.email.trim()) {
            enqueueSnackbar("El email es requerido", { variant: "warning" });
            return;
        }
        if (!formData.phone || formData.phone.toString().length !== 10) {
            enqueueSnackbar("El teléfono debe tener 10 dígitos", { variant: "warning" });
            return;
        }
        if (!formData.role) {
            enqueueSnackbar("El rol es requerido", { variant: "warning" });
            return;
        }

        // Validación de contraseña si se proporciona
        if (formData.password.trim()) {
            if (formData.password.length < 6) {
                enqueueSnackbar("La contraseña debe tener al menos 6 caracteres", { variant: "warning" });
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                enqueueSnackbar("Las contraseñas no coinciden", { variant: "warning" });
                return;
            }
        }

        const updateData = {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone,
            role: formData.role,
        };

        // Solo incluir password si se proporcionó
        if (formData.password.trim()) {
            updateData.password = formData.password.trim();
        }

        updateMutation.mutate({
            id: editingEmployee,
            data: updateData,
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    if (isLoading) {
        return <div className="text-center text-[#ababab] py-10">Cargando empleados...</div>;
    }

    if (isError) {
        return (
            <div className="text-center text-red-500 py-10">
                Error al cargar los empleados{error?.response?.status ? ` (HTTP ${error.response.status})` : ""}.
            </div>
        );
    }

    return (
        <>
            <div className="p-8 bg-gradient-to-br from-[#1a1a1a] to-[#1f1f1f] rounded-lg shadow-lg text-[#f5f5f5]">
                <h2 className="text-2xl font-bold mb-6 text-center">Empleados</h2>

                {employees.length === 0 ? (
                    <p className="text-center text-[#ababab]">No hay empleados registrados.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse border border-[#2a2a2a] rounded-lg overflow-hidden">
                            <thead className="bg-gradient-to-r from-[#262626] to-[#2a2a2a]">
                                <tr>
                                    <th className="p-4 text-[#f5f5f5] font-semibold">Nombre</th>
                                    <th className="p-4 text-[#f5f5f5] font-semibold">Email</th>
                                    <th className="p-4 text-[#f5f5f5] font-semibold">Teléfono</th>
                                    <th className="p-4 text-[#f5f5f5] font-semibold">Rol</th>
                                    <th className="p-4 text-[#f5f5f5] font-semibold text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((e) => (
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
                                                {e.role}
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Edición */}
            <AnimatePresence>
                {editingEmployee && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCancel}
                            className="fixed inset-0 z-50 backdrop-blur-md bg-black/60"
                        />
                        
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div className="w-full max-w-md bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#1a1a1a] rounded-2xl border border-[#2a2a2a]/50 shadow-2xl pointer-events-auto">
                                {/* Header */}
                                <div className="sticky top-0 bg-gradient-to-r from-[#1f1f1f] to-[#252525] border-b border-[#2a2a2a]/50 px-6 py-4 rounded-t-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                                            <Edit className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-[#f5f5f5]">Editar Empleado</h3>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleCancel}
                                        className="p-2 rounded-lg bg-[#2a2a2a]/50 text-[#ababab] hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </motion.button>
                                </div>

                                {/* Contenido */}
                                <div className="p-6 space-y-4">
                                    {/* Nombre */}
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
                                            className="w-full p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                            placeholder="Nombre del empleado"
                                        />
                                    </div>

                                    {/* Email */}
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
                                            className="w-full p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                            placeholder="email@ejemplo.com"
                                        />
                                    </div>

                                    {/* Teléfono */}
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
                                            className="w-full p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                            placeholder="1234567890"
                                        />
                                    </div>

                                    {/* Rol */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                            <Briefcase className="w-4 h-4" />
                                            Rol
                                        </label>
                                        <select
                                            name="role"
                                            value={formData.role}
                                            onChange={handleChange}
                                            className="w-full p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                        >
                                            <option value="">Seleccionar rol</option>
                                            <option value="Camarero">Camarero</option>
                                            <option value="Cajera">Cajera</option>
                                            <option value="Admin">Admin</option>
                                        </select>
                                    </div>

                                    {/* Contraseña */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                            <Lock className="w-4 h-4" />
                                            Nueva Contraseña <span className="text-xs text-gray-500 font-normal">(opcional)</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="w-full p-3 pr-10 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                placeholder="Dejar vacío para no cambiar"
                                            />
                                            <motion.button
                                                type="button"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ababab] hover:text-[#f5f5f5] transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </motion.button>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Mínimo 6 caracteres</p>
                                    </div>

                                    {/* Confirmar Contraseña */}
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
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    value={formData.confirmPassword}
                                                    onChange={handleChange}
                                                    className="w-full p-3 pr-10 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                    placeholder="Confirma la nueva contraseña"
                                                />
                                                <motion.button
                                                    type="button"
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ababab] hover:text-[#f5f5f5] transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </motion.button>
                                            </div>
                                            {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                                <p className="mt-1 text-xs text-red-400">Las contraseñas no coinciden</p>
                                            )}
                                        </motion.div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 border-t border-[#2a2a2a]/50 flex gap-3">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleCancel}
                                        className="flex-1 px-4 py-3 rounded-lg border border-[#2a2a2a] text-[#ababab] hover:bg-[#2a2a2a] transition-all font-semibold"
                                    >
                                        Cancelar
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSave}
                                        disabled={updateMutation.isLoading}
                                        className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/30 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updateMutation.isLoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Guardando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                <span>Guardar</span>
                                            </>
                                        )}
                                    </motion.button>
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
