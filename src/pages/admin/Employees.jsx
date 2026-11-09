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
    CreditCard
} from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { useTranslation } from "react-i18next";
import api, { getScope } from "../../lib/api";

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
        edit: false,
    },
    fiscal: { ecfIssue: false, creditNote: false, debitNote: false, manage: false },
    accountsReceivable: {
        view: false,
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
        edit: Boolean(permissions?.orders?.edit),
    },
    fiscal: {
        ecfIssue: Boolean(permissions?.fiscal?.ecfIssue),
        creditNote: Boolean(permissions?.fiscal?.creditNote),
        debitNote: Boolean(permissions?.fiscal?.debitNote),
        manage: false,
    },
    accountsReceivable: {
        view: Boolean(
            permissions?.accountsReceivable?.view
        ),
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
        p.orders.edit,
        p.fiscal.ecfIssue,
        p.fiscal.creditNote,
        p.fiscal.debitNote,
        p.accountsReceivable.view,
    ].filter(Boolean).length;
};

const getEmployeeRoleLabel = (role, t) => {
    const keyMap = {
        Owner: "employeesPage.roles.owner",
        Admin: "employeesPage.roles.admin",
        Cajera: "employeesPage.roles.cashier",
        Camarero: "employeesPage.roles.waiter",
        Cocina: "employeesPage.roles.kitchen",
    };

    return keyMap[role] ? t(keyMap[role]) : role || "—";
};

const ToggleSwitch = ({ checked, onChange, disabled = false, ariaLabel }) => {
    return (
        <button
            type="button"
            aria-label={ariaLabel}
            aria-pressed={checked}
            onClick={() => !disabled && onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                disabled
                    ? "opacity-50 cursor-not-allowed bg-white/10"
                    : checked
                        ? "bg-[#38bdf8]"
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
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-4 hover:border-[#38bdf8]/35 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#38bdf8]/10 border border-[#38bdf8]/20">
                    <Icon className="w-5 h-5 text-[#38bdf8]" />
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
                <ToggleSwitch checked={checked} onChange={onChange} ariaLabel={title} />
            </div>
        </div>
    </div>
);

const PermissionSection = ({ title, subtitle, icon: Icon, children }) => (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#111111] to-[#171717] p-4">
        <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#38bdf8]/10 border border-[#38bdf8]/20">
                <Icon className="w-5 h-5 text-[#38bdf8]" />
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
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const activeBranchId = getScope().clientId || "default";
    const { data: branchResponse } = useQuery({
        queryKey: ["branches", getScope().tenantId],
        queryFn: async () => (await api.get("/api/clients")).data,
        staleTime: 30_000,
    });
    const branches = Array.isArray(branchResponse?.data) ? branchResponse.data.filter(b => b.isActive !== false) : [];
    const activeBranchName = branches.find(b => b.clientId === activeBranchId)?.name || (activeBranchId === "default" ? "Sucursal principal" : activeBranchId);
    const employeeQueryKey = ["admin/employees", activeBranchId];

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
        clientIds: [activeBranchId],
    });

    const {
        data: employees = [],
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: employeeQueryKey,
        queryFn: async () => {
            const { data } = await api.get("/api/admin/employees");
            return Array.isArray(data?.data) ? data.data : [];
        },
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnReconnect: true,
    });

    // Solo se ofrecen permisos DGII a negocios dominicanos con plan fiscal.
    const { data: fiscalAccess } = useQuery({
        queryKey: ["admin/usage", "employee-fiscal-availability"],
        queryFn: async () => (await api.get("/api/admin/usage")).data?.data,
        retry: 0,
        staleTime: 60_000,
    });
    const canConfigureFiscal = fiscalAccess?.countryCode === "DO" &&
        fiscalAccess?.features?.fiscal === true;

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
            clientIds: editingEmployee.clientIds?.length ? editingEmployee.clientIds : ["default"],
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
            clientIds: [activeBranchId],
        });
    };

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await api.patch(`/api/admin/employees/${id}`, data);
            return response;
        },
        onSuccess: (_, variables) => {
            const updatedPermissions = normalizePermissions(
                variables?.data?.permissions || DEFAULT_PERMISSIONS
            );

            queryClient.setQueryData(employeeQueryKey, (old = []) => {
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
                            clientIds: variables.data.clientIds || emp.clientIds,
                        }
                        : emp
                );
            });

            enqueueSnackbar(
                t("employeesPage.messages.updateSuccess"),
                { variant: "success" }
            );

            queryClient.invalidateQueries({ queryKey: ["admin/employees"] });
            queryClient.invalidateQueries({ queryKey: ["order-correction-access"] });

            setEditingEmployeeId(null);
            resetForm();
        },
        onError: (error) => {
            const code = error?.response?.data?.code;
            const serverMessage = error?.response?.data?.message || (
                code === "EMPLOYEE_NOT_IN_BRANCH" ? "El empleado no pertenece a esta sucursal." :
                code === "INVALID_BRANCH_ASSIGNMENT" ? "La asignación de sucursales no es válida." :
                code === "GLOBAL_ADMIN_ASSIGNMENT_READ_ONLY" ? "Las sucursales de Owner/Admin no se pueden modificar." :
                code === "EMPLOYEE_MEMBERSHIP_CHANGED" ? "La asignación cambió; recarga Empleados e intenta de nuevo." :
                code
            );
            enqueueSnackbar(
                serverMessage || t("employeesPage.messages.updateFailed"),
                { variant: "error" }
            );
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
            enqueueSnackbar(t("employeesPage.messages.nameRequired"), { variant: "warning" });
            return;
        }

        if (!formData.email.trim()) {
            enqueueSnackbar(t("employeesPage.messages.emailRequired"), { variant: "warning" });
            return;
        }

        const normalizedPhone =
            String(formData.phone || "")
                .replace(/\D/g, "");

        if (
            normalizedPhone &&
            !/^\d{7,15}$/.test(normalizedPhone)
        ) {
            enqueueSnackbar(
                t("employeesPage.messages.phoneInvalid"),
                {
                    variant: "warning",
                }
            );

            return;
        }

        if (!formData.role) {
            enqueueSnackbar(t("employeesPage.messages.roleRequired"), { variant: "warning" });
            return;
        }

        if (formData.password.trim()) {
            if (formData.password.length < 6) {
                enqueueSnackbar(
                    t("employeesPage.messages.passwordMinLength"),
                    { variant: "warning" }
                );
                return;
            }

            if (formData.password !== formData.confirmPassword) {
                enqueueSnackbar(
                    t("employeesPage.messages.passwordMismatch"),
                    { variant: "warning" }
                );
                return;
            }
        }

        if (formData.role !== "Admin" && formData.role !== "Owner" && !formData.clientIds?.length) {
            enqueueSnackbar("Selecciona al menos una sucursal para este empleado", { variant: "warning" });
            return;
        }
        const updateData = {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: normalizedPhone,
            role: formData.role,
            // Owner/Admin son miembros globales; no reenviar su asignación de sedes.
            clientIds: ["Admin", "Owner"].includes(formData.role) ? undefined : formData.clientIds,
            permissions: {
                ...normalizePermissions(formData.permissions),
                orders: {
                    ...normalizePermissions(formData.permissions).orders,
                    edit: formData.role === "Cajera" && Boolean(formData.permissions?.orders?.edit),
                },
                fiscal: {
                    ecfIssue: canConfigureFiscal && formData.role === "Cajera" && Boolean(formData.permissions?.fiscal?.ecfIssue),
                    creditNote: canConfigureFiscal && formData.role === "Cajera" && Boolean(formData.permissions?.fiscal?.creditNote),
                    debitNote: canConfigureFiscal && formData.role === "Cajera" && Boolean(formData.permissions?.fiscal?.debitNote),
                    manage: false,
                },
            },
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
                {t("employeesPage.loading")}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center text-red-500 py-10">
                {t("employeesPage.loadError")}
                {error?.response?.status ? ` (HTTP ${error.response.status})` : ""}.
            </div>
        );
    }

    return (
        <>
            <div className="p-8 bg-gradient-to-br from-[#1a1a1a] to-[#1f1f1f] rounded-lg shadow-lg text-[#f5f5f5]">
                <h2 className="text-2xl font-bold mb-2 text-center">{t("employeesPage.title")}</h2>
                <p className="text-sm text-center text-sky-300 mb-6">{activeBranchName} · {employees.length} empleado(s) asignado(s)</p>

                {employees.length === 0 ? (
                    <p className="text-center text-[#ababab]">
                        {t("employeesPage.empty")}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse border border-[#2a2a2a] rounded-lg overflow-hidden">
                            <thead className="bg-gradient-to-r from-[#262626] to-[#2a2a2a]">
                            <tr>
                                <th className="p-4 text-[#f5f5f5] font-semibold">{t("employeesPage.table.name")}</th>
                                <th className="p-4 text-[#f5f5f5] font-semibold">{t("employeesPage.table.email")}</th>
                                <th className="p-4 text-[#f5f5f5] font-semibold">{t("employeesPage.table.phone")}</th>
                                <th className="p-4 text-[#f5f5f5] font-semibold">{t("employeesPage.table.role")}</th>
                                <th className="p-4 text-[#f5f5f5] font-semibold">{t("employeesPage.table.permissions")}</th>
                                <th className="p-4 text-[#f5f5f5] font-semibold text-center">
                                    {t("employeesPage.table.actions")}
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
                                                <span className="px-3 py-1 rounded-lg bg-[#38bdf8]/20 text-[#38bdf8] font-semibold text-sm border border-[#38bdf8]/30">
                                                    {getEmployeeRoleLabel(e.membershipRole || e.role, t)}
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
                                                    {t("employeesPage.permissions.activeCount", { count: total })}
                                                </span>
                                        </td>
                                        <td className="p-4">
                                            <motion.button
                                                type="button"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleEdit(e)}
                                                className="mx-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200"
                                            >
                                                <Edit className="w-4 h-4" />
                                                <span className="text-sm font-semibold">{t("employeesPage.actions.edit")}</span>
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
                                                {t("employeesPage.modal.title")}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-400 leading-snug">
                                                {t("employeesPage.modal.description")}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        aria-label={t("common.close")}
                                        onClick={handleCancel}
                                        className="shrink-0 p-2.5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:bg-red-500/15 hover:border-red-500/20 hover:text-red-400 transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div
                                    className="relative overflow-y-auto overscroll-contain px-4 sm:px-6 pt-4 sm:pt-6 pb-36 sm:pb-28"
                                    style={{
                                        maxHeight: "calc(92dvh - 150px)",
                                        scrollbarWidth: "thin",
                                        scrollbarColor: "#38bdf8 #1f1f1f",
                                    }}
                                >
                                    <div className="pointer-events-none sticky top-0 z-10 h-5 -mt-4 sm:-mt-6 mb-2 bg-gradient-to-b from-[#171717] to-transparent" />
                                    <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-4 sm:gap-6">
                                        <div className="space-y-4">
                                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                                <h4 className="text-sm font-bold text-white mb-4">
                                                    {t("employeesPage.sections.basicInfo")}
                                                </h4>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                                            <User className="w-4 h-4" />
                                                            {t("employeesPage.fields.name")}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="name"
                                                            value={formData.name}
                                                            onChange={handleChange}
                                                            className="w-full px-3 py-3 sm:p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                            placeholder={t("employeesPage.placeholders.name")}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                                            <Mail className="w-4 h-4" />
                                                            {t("employeesPage.fields.email")}
                                                        </label>
                                                        <input
                                                            type="email"
                                                            name="email"
                                                            value={formData.email}
                                                            onChange={handleChange}
                                                            className="w-full px-3 py-3 sm:p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                            placeholder={t("employeesPage.placeholders.email")}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                                            <Phone className="w-4 h-4" />
                                                            {t("employeesPage.fields.phone")}
                                                        </label>
                                                        <input
                                                            type="tel"
                                                            name="phone"
                                                            value={formData.phone}
                                                            onChange={handleChange}
                                                            maxLength={15}
                                                            className="w-full px-3 py-3 sm:p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                            placeholder="1234567890"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                                            <Briefcase className="w-4 h-4" />
                                                            {t("employeesPage.fields.role")}
                                                        </label>
                                                        <select
                                                            name="role"
                                                            value={formData.role}
                                                            onChange={handleChange}
                                                            className="w-full px-3 py-3 sm:p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                        >
                                                            <option value="">{t("employeesPage.roles.select")}</option>
                                                            <option value="Camarero">{t("employeesPage.roles.waiter")}</option>
                                                            <option value="Cajera">{t("employeesPage.roles.cashier")}</option>
                                                            <option value="Cocina">{t("employeesPage.roles.kitchen")}</option>
                                                            <option value="Admin">{t("employeesPage.roles.admin")}</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {formData.role !== "Owner" && formData.role !== "Admin" && (
                                                <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4">
                                                    <h4 className="text-sm font-bold text-white mb-2">Sucursales asignadas</h4>
                                                    <p className="text-xs text-gray-400 mb-3">Este empleado solo puede entrar a las sedes seleccionadas. El cupo de usuarios se cuenta por empresa.</p>
                                                    <div className="flex flex-wrap gap-3">
                                                        {branches.map(b => (
                                                            <label key={b.clientId} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                                                                <input type="checkbox" className="accent-sky-500" checked={formData.clientIds?.includes(b.clientId) || false}
                                                                    onChange={e => setFormData(prev => ({ ...prev, clientIds: e.target.checked
                                                                        ? [...new Set([...(prev.clientIds || []), b.clientId])]
                                                                        : (prev.clientIds || []).filter(x => x !== b.clientId) }))} />
                                                                {b.name}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white">
                                                            {t("employeesPage.sections.security")}
                                                        </h4>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {t("employeesPage.security.description")}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="flex items-center gap-2 text-sm font-semibold text-[#ababab] mb-2">
                                                            <Lock className="w-4 h-4" />
                                                            {t("employeesPage.security.newPassword")}
                                                            <span className="text-xs text-gray-500 font-normal">
                                                                {t("employeesPage.common.optional")}
                                                            </span>
                                                        </label>

                                                        <div className="relative">
                                                            <input
                                                                type={showPassword ? "text" : "password"}
                                                                name="password"
                                                                value={formData.password}
                                                                onChange={handleChange}
                                                                className="w-full px-3 py-3 sm:p-3 pr-10 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                                placeholder={t("employeesPage.placeholders.password")}
                                                            />
                                                            <button
                                                                type="button"
                                                                aria-label={t(
                                                                    showPassword
                                                                        ? "employeesPage.security.hidePassword"
                                                                        : "employeesPage.security.showPassword"
                                                                )}
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
                                                            {t("employeesPage.security.minimumCharacters")}
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
                                                                {t("employeesPage.security.confirmPassword")}
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
                                                                    placeholder={t("employeesPage.placeholders.confirmPassword")}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    aria-label={t(
                                                                        showConfirmPassword
                                                                            ? "employeesPage.security.hidePassword"
                                                                            : "employeesPage.security.showPassword"
                                                                    )}
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
                                                                        {t("employeesPage.messages.passwordMismatch")}
                                                                    </p>
                                                                )}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="rounded-2xl border border-[#38bdf8]/15 bg-[#38bdf8]/5 p-4 sm:p-5">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.18em] text-[#38bdf8]/80">
                                                            {t("employeesPage.permissions.summaryEyebrow")}
                                                        </p>
                                                        <h4 className="text-white font-semibold mt-1">
                                                            {t("employeesPage.permissions.activeCount", { count: activePermissions })}
                                                        </h4>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {t("employeesPage.permissions.summaryDescription")}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center justify-start sm:justify-end">
                                                        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center">
                                                            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#38bdf8]" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-2 max-w-full">
                                                    {activePermissions > 0 ? (
                                                        <>
                                                            {formData.permissions?.products?.create && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                                                                    {t("employeesPage.permissions.products.create.title")}
                                                                </span>
                                                            )}
                                                            {formData.permissions?.products?.update && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                                                                    {t("employeesPage.permissions.products.update.title")}
                                                                </span>
                                                            )}
                                                            {formData.permissions?.products?.delete && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                                                                    {t("employeesPage.permissions.products.delete.title")}
                                                                </span>
                                                            )}
                                                            {formData.permissions?.inventory?.entry && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                                                    {t("employeesPage.permissions.inventory.entry.chip")}
                                                                </span>
                                                            )}
                                                            {formData.permissions?.inventory?.exit && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                                                    {t("employeesPage.permissions.inventory.exit.chip")}
                                                                </span>
                                                            )}
                                                            {formData.permissions?.inventory?.adjust && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                                                    {t("employeesPage.permissions.inventory.adjust.chip")}
                                                                </span>
                                                            )}
                                                            {formData.permissions?.inventory?.waste && (
                                                                <span className="px-2.5 py-1 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                                                    {t("employeesPage.permissions.inventory.waste.chip")}
                                                                </span>
                                                            )}
                                                            {formData.permissions?.orders?.edit && (
                                                                <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-200">
                                                                    {t("employeesPage.permissions.orders.edit.title")}
                                                                </span>
                                                            )}
                                                            {formData.permissions?.orders?.cancel && (
                                                                <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">
                                                                    {t("employeesPage.permissions.orders.cancel.title")}
                                                                </span>
                                                            )}
                                                            {formData.permissions?.accountsReceivable?.view && (
                                                                <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-300">
                                                                    {t("employeesPage.permissions.accountsReceivable.view.chip")}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-400">
                                                            {t("employeesPage.permissions.none")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                                                <div>
                                                    <h4 className="text-sm font-bold text-white">
                                                        {t("employeesPage.permissions.specialTitle")}
                                                    </h4>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {t("employeesPage.permissions.specialDescription")}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handleResetPermissions}
                                                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all text-sm w-full sm:w-auto"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    {t("employeesPage.actions.clear")}
                                                </button>
                                            </div>

                                            <PermissionSection
                                                title={t("employeesPage.permissions.products.sectionTitle")}
                                                subtitle={t("employeesPage.permissions.products.sectionSubtitle")}
                                                icon={Package}
                                            >
                                                <PermissionItem
                                                    icon={CheckCircle2}
                                                    title={t("employeesPage.permissions.products.create.title")}
                                                    desc={t("employeesPage.permissions.products.create.description")}
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
                                                    title={t("employeesPage.permissions.products.update.title")}
                                                    desc={t("employeesPage.permissions.products.update.description")}
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
                                                    title={t("employeesPage.permissions.products.delete.title")}
                                                    desc={t("employeesPage.permissions.products.delete.description")}
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
                                                title={t("employeesPage.permissions.inventory.sectionTitle")}
                                                subtitle={t("employeesPage.permissions.inventory.sectionSubtitle")}
                                                icon={Boxes}
                                            >
                                                <PermissionItem
                                                    icon={CheckCircle2}
                                                    title={t("employeesPage.permissions.inventory.entry.title")}
                                                    desc={t("employeesPage.permissions.inventory.entry.description")}
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
                                                    title={t("employeesPage.permissions.inventory.exit.title")}
                                                    desc={t("employeesPage.permissions.inventory.exit.description")}
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
                                                    title={t("employeesPage.permissions.inventory.adjust.title")}
                                                    desc={t("employeesPage.permissions.inventory.adjust.description")}
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
                                                    title={t("employeesPage.permissions.inventory.waste.title")}
                                                    desc={t("employeesPage.permissions.inventory.waste.description")}
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
                                                title={t("employeesPage.permissions.orders.sectionTitle")}
                                                subtitle={t("employeesPage.permissions.orders.sectionSubtitle")}
                                                icon={ShieldCheck}
                                            >
                                                {formData.role === "Cajera" && (
                                                    <PermissionItem
                                                        icon={ShieldCheck}
                                                        title={t("employeesPage.permissions.orders.edit.title")}
                                                        desc={t("employeesPage.permissions.orders.edit.description")}
                                                        checked={!!formData.permissions?.orders?.edit}
                                                        onChange={(enabled) => handlePermissionChange("orders.edit", enabled)}
                                                    />
                                                )}
                                                <PermissionItem
                                                    icon={X}
                                                    title={t("employeesPage.permissions.orders.cancel.title")}
                                                    desc={t("employeesPage.permissions.orders.cancel.description")}
                                                    checked={!!formData.permissions?.orders?.cancel}
                                                    onChange={(v) =>
                                                        handlePermissionChange(
                                                            "orders.cancel",
                                                            v
                                                        )
                                                    }
                                                />
                                            </PermissionSection>
                                            {canConfigureFiscal && formData.role === "Cajera" && (
                                                <PermissionSection
                                                    title="Facturación electrónica DGII (RD)"
                                                    subtitle="Permisos independientes para comprobantes electrónicos. Solo República Dominicana."
                                                    icon={ShieldCheck}
                                                >
                                                    <PermissionItem
                                                        icon={ShieldCheck}
                                                        title="Emitir e-CF E31 / E32"
                                                        desc="Permite emitir facturas electrónicas desde el POS, incluida la emisión automática."
                                                        checked={!!formData.permissions?.fiscal?.ecfIssue}
                                                        onChange={(v) => handlePermissionChange("fiscal.ecfIssue", v)}
                                                    />
                                                    <PermissionItem
                                                        icon={ShieldCheck}
                                                        title="Emitir nota de crédito E34"
                                                        desc="Puede reducir o anular importes fiscales autorizados."
                                                        checked={!!formData.permissions?.fiscal?.creditNote}
                                                        onChange={(v) => handlePermissionChange("fiscal.creditNote", v)}
                                                    />
                                                    <PermissionItem
                                                        icon={ShieldCheck}
                                                        title="Emitir nota de débito E33"
                                                        desc="Puede incrementar importes fiscales autorizados."
                                                        checked={!!formData.permissions?.fiscal?.debitNote}
                                                        onChange={(v) => handlePermissionChange("fiscal.debitNote", v)}
                                                    />
                                                    <p className="text-xs text-gray-400">
                                                        Certificados, secuencias y configuración e-CF: solo Owner/Admin.
                                                    </p>
                                                </PermissionSection>
                                            )}
                                            <PermissionSection
                                                title={t("employeesPage.permissions.accountsReceivable.sectionTitle")}
                                                subtitle={t("employeesPage.permissions.accountsReceivable.sectionSubtitle")}
                                                icon={CreditCard}
                                            >
                                                <PermissionItem
                                                    icon={CreditCard}
                                                    title={t("employeesPage.permissions.accountsReceivable.view.title")}
                                                    desc={t("employeesPage.permissions.accountsReceivable.view.description")}
                                                    checked={
                                                        !!formData.permissions
                                                            ?.accountsReceivable
                                                            ?.view
                                                    }
                                                    onChange={(v) =>
                                                        handlePermissionChange(
                                                            "accountsReceivable.view",
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
                                        type="button"
                                        onClick={handleCancel}
                                        className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all font-medium"
                                    >
                                        {t("common.cancel")}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={updateMutation.isPending}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_10px_30px_rgba(16,185,129,0.28)] transition-all font-semibold disabled:opacity-60"
                                    >
                                        <Save className="w-4 h-4" />
                                        {updateMutation.isPending ? t("employeesPage.actions.saving") : t("employeesPage.actions.save")}
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