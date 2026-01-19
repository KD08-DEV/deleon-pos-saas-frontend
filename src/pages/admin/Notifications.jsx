// src/pages/admin/Notifications.jsx
import React, { useState, useMemo } from "react";
import { Bell, Mail, Phone, Settings, CheckCircle2, XCircle, AlertCircle, Info, Save } from "lucide-react";
import { enqueueSnackbar } from "notistack";

const Notifications = () => {
    const [notificationSettings, setNotificationSettings] = useState({
        emailEnabled: true,
        emailAddress: "",
        smsEnabled: false,
        phoneNumber: "",
        orderNotifications: true,
        lowStockAlerts: true,
        paymentNotifications: true,
        reportNotifications: false,
        weeklyReport: false,
        monthlyReport: true,
    });

    const handleSave = () => {
        // Aquí podrías guardar en el backend cuando esté listo
        enqueueSnackbar("Configuración de notificaciones guardada exitosamente", { variant: "success" });
    };

    const toggleSetting = (key) => {
        setNotificationSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const updateSetting = (key, value) => {
        setNotificationSettings((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Bell className="w-6 h-6 text-[#f6b100]" />
                    Notificaciones
                </h2>
                <p className="text-sm text-gray-400 mt-1">Configura cómo y cuándo recibir notificaciones</p>
            </div>

            <div className="space-y-6">
                {/* Canal de Notificaciones */}
                <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-[#f6b100]" />
                        Canales de Notificación
                    </h3>
                    
                    <div className="space-y-4">
                        {/* Email */}
                        <div className="p-4 bg-[#1a1a1a] border border-gray-800/30 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <p className="text-sm font-medium text-white">Notificaciones por Email</p>
                                        <p className="text-xs text-gray-400">Recibe notificaciones en tu correo electrónico</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleSetting("emailEnabled")}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                                        notificationSettings.emailEnabled ? "bg-[#f6b100]" : "bg-gray-700"
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            notificationSettings.emailEnabled ? "translate-x-6" : "translate-x-1"
                                        }`}
                                    />
                                </button>
                            </div>
                            {notificationSettings.emailEnabled && (
                                <div className="mt-3 pt-3 border-t border-gray-800/30">
                                    <label className="text-xs text-gray-400 mb-1 block">Dirección de Email</label>
                                    <input
                                        type="email"
                                        value={notificationSettings.emailAddress}
                                        onChange={(e) => updateSetting("emailAddress", e.target.value)}
                                        placeholder="ejemplo@restaurante.com"
                                        className="w-full p-2.5 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    />
                                </div>
                            )}
                        </div>

                        {/* SMS */}
                        <div className="p-4 bg-[#1a1a1a] border border-gray-800/30 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <Phone className="w-5 h-5 text-green-400" />
                                    <div>
                                        <p className="text-sm font-medium text-white">Notificaciones por SMS</p>
                                        <p className="text-xs text-gray-400">Recibe notificaciones por mensaje de texto</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleSetting("smsEnabled")}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                                        notificationSettings.smsEnabled ? "bg-[#f6b100]" : "bg-gray-700"
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            notificationSettings.smsEnabled ? "translate-x-6" : "translate-x-1"
                                        }`}
                                    />
                                </button>
                            </div>
                            {notificationSettings.smsEnabled && (
                                <div className="mt-3 pt-3 border-t border-gray-800/30">
                                    <label className="text-xs text-gray-400 mb-1 block">Número de Teléfono</label>
                                    <input
                                        type="tel"
                                        value={notificationSettings.phoneNumber}
                                        onChange={(e) => updateSetting("phoneNumber", e.target.value)}
                                        placeholder="+1 809 555 1234"
                                        className="w-full p-2.5 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#f6b100]/50"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tipos de Notificaciones */}
                <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Tipos de Notificaciones</h3>
                    
                    <div className="space-y-3">
                        <NotificationToggle
                            label="Notificaciones de Órdenes"
                            description="Recibe notificaciones cuando se crean o completan órdenes"
                            checked={notificationSettings.orderNotifications}
                            onChange={() => toggleSetting("orderNotifications")}
                            icon={CheckCircle2}
                        />
                        <NotificationToggle
                            label="Alertas de Stock Bajo"
                            description="Notificaciones cuando un producto está por agotarse"
                            checked={notificationSettings.lowStockAlerts}
                            onChange={() => toggleSetting("lowStockAlerts")}
                            icon={AlertCircle}
                        />
                        <NotificationToggle
                            label="Notificaciones de Pagos"
                            description="Alertas cuando se procesan pagos importantes"
                            checked={notificationSettings.paymentNotifications}
                            onChange={() => toggleSetting("paymentNotifications")}
                            icon={CheckCircle2}
                        />
                        <NotificationToggle
                            label="Notificaciones de Reportes"
                            description="Actualizaciones sobre reportes y análisis"
                            checked={notificationSettings.reportNotifications}
                            onChange={() => toggleSetting("reportNotifications")}
                            icon={Info}
                        />
                    </div>
                </div>

                {/* Reportes Programados */}
                <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Reportes Programados</h3>
                    
                    <div className="space-y-3">
                        <NotificationToggle
                            label="Reporte Semanal"
                            description="Recibe un resumen semanal de ventas y operaciones"
                            checked={notificationSettings.weeklyReport}
                            onChange={() => toggleSetting("weeklyReport")}
                            icon={Mail}
                        />
                        <NotificationToggle
                            label="Reporte Mensual"
                            description="Resumen mensual completo de tu restaurante"
                            checked={notificationSettings.monthlyReport}
                            onChange={() => toggleSetting("monthlyReport")}
                            icon={Mail}
                        />
                    </div>
                </div>

                {/* Botón Guardar */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-3 bg-[#f6b100] text-black rounded-lg font-semibold hover:bg-[#ffd633] transition-all shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40"
                    >
                        <Save className="w-4 h-4" />
                        Guardar Configuración
                    </button>
                </div>
            </div>
        </div>
    );
};

function NotificationToggle({ label, description, checked, onChange, icon: Icon }) {
    return (
        <div className="flex items-start justify-between gap-4 p-4 bg-[#1a1a1a] border border-gray-800/30 rounded-lg hover:bg-[#1f1f1f] transition-colors">
            <div className="flex items-start gap-3 flex-1">
                {Icon && <Icon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />}
                <div className="flex-1">
                    <p className="text-sm font-medium text-white">{label}</p>
                    {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
                </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs font-medium ${checked ? "text-green-300" : "text-gray-400"}`}>
                    {checked ? "Activo" : "Inactivo"}
                </span>
                <button
                    onClick={onChange}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                        checked ? "bg-[#f6b100]" : "bg-gray-700"
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            checked ? "translate-x-6" : "translate-x-1"
                        }`}
                    />
                </button>
            </div>
        </div>
    );
}

export default Notifications;
