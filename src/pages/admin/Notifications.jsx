// src/pages/admin/Notifications.jsx
import React, { useState } from "react";
import {
    Bell,
    Mail,
    Phone,
    Settings,
    CheckCircle2,
    AlertCircle,
    Info,
    Save,
} from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { useTranslation } from "react-i18next";

const Notifications = () => {
    const { t } = useTranslation();

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
        // Cuando el backend esté listo, la persistencia puede conectarse aquí.
        enqueueSnackbar(
            t("notificationsPage.messages.saveSuccess"),
            {
                variant: "success",
            }
        );
    };

    const toggleSetting = (key) => {
        setNotificationSettings((previous) => ({
            ...previous,
            [key]: !previous[key],
        }));
    };

    const updateSetting = (key, value) => {
        setNotificationSettings((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    return (
        <div>
            {/* HEADER */}

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Bell className="w-6 h-6 text-[#38bdf8]" />

                    {t("notificationsPage.title")}
                </h2>

                <p className="text-sm text-gray-400 mt-1">
                    {t("notificationsPage.description")}
                </p>
            </div>


            <div className="space-y-6">

                {/* CANALES */}

                <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-[#38bdf8]" />

                        {t("notificationsPage.channels.title")}
                    </h3>


                    <div className="space-y-4">

                        {/* EMAIL */}

                        <div className="p-4 bg-[#1a1a1a] border border-gray-800/30 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-blue-400" />

                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {t(
                                                "notificationsPage.channels.email.title"
                                            )}
                                        </p>

                                        <p className="text-xs text-gray-400">
                                            {t(
                                                "notificationsPage.channels.email.description"
                                            )}
                                        </p>
                                    </div>
                                </div>


                                <button
                                    type="button"

                                    onClick={() =>
                                        toggleSetting(
                                            "emailEnabled"
                                        )
                                    }

                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                                        notificationSettings.emailEnabled
                                            ? "bg-[#38bdf8]"
                                            : "bg-gray-700"
                                    }`}

                                    aria-pressed={
                                        notificationSettings.emailEnabled
                                    }

                                    aria-label={
                                        t(
                                            "notificationsPage.channels.email.toggleAria"
                                        )
                                    }
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            notificationSettings.emailEnabled
                                                ? "translate-x-6"
                                                : "translate-x-1"
                                        }`}
                                    />
                                </button>
                            </div>


                            {notificationSettings.emailEnabled && (
                                <div className="mt-3 pt-3 border-t border-gray-800/30">
                                    <label className="text-xs text-gray-400 mb-1 block">
                                        {t(
                                            "notificationsPage.channels.email.address"
                                        )}
                                    </label>

                                    <input
                                        type="email"

                                        value={
                                            notificationSettings.emailAddress
                                        }

                                        onChange={(event) =>
                                            updateSetting(
                                                "emailAddress",
                                                event.target.value
                                            )
                                        }

                                        placeholder={
                                            t(
                                                "notificationsPage.channels.email.placeholder"
                                            )
                                        }

                                        className="w-full p-2.5 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
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
                                        <p className="text-sm font-medium text-white">
                                            {t(
                                                "notificationsPage.channels.sms.title"
                                            )}
                                        </p>

                                        <p className="text-xs text-gray-400">
                                            {t(
                                                "notificationsPage.channels.sms.description"
                                            )}
                                        </p>
                                    </div>
                                </div>


                                <button
                                    type="button"

                                    onClick={() =>
                                        toggleSetting(
                                            "smsEnabled"
                                        )
                                    }

                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                                        notificationSettings.smsEnabled
                                            ? "bg-[#38bdf8]"
                                            : "bg-gray-700"
                                    }`}

                                    aria-pressed={
                                        notificationSettings.smsEnabled
                                    }

                                    aria-label={
                                        t(
                                            "notificationsPage.channels.sms.toggleAria"
                                        )
                                    }
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            notificationSettings.smsEnabled
                                                ? "translate-x-6"
                                                : "translate-x-1"
                                        }`}
                                    />
                                </button>
                            </div>


                            {notificationSettings.smsEnabled && (
                                <div className="mt-3 pt-3 border-t border-gray-800/30">
                                    <label className="text-xs text-gray-400 mb-1 block">
                                        {t(
                                            "notificationsPage.channels.sms.phoneNumber"
                                        )}
                                    </label>

                                    <input
                                        type="tel"

                                        value={
                                            notificationSettings.phoneNumber
                                        }

                                        onChange={(event) =>
                                            updateSetting(
                                                "phoneNumber",
                                                event.target.value
                                            )
                                        }

                                        placeholder={
                                            t(
                                                "notificationsPage.channels.sms.placeholder"
                                            )
                                        }

                                        className="w-full p-2.5 bg-[#0a0a0a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                                    />
                                </div>
                            )}
                        </div>

                    </div>
                </div>


                {/* TIPOS DE NOTIFICACIONES */}

                <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        {t("notificationsPage.types.title")}
                    </h3>


                    <div className="space-y-3">
                        <NotificationToggle
                            label={
                                t(
                                    "notificationsPage.types.orders.label"
                                )
                            }

                            description={
                                t(
                                    "notificationsPage.types.orders.description"
                                )
                            }

                            checked={
                                notificationSettings.orderNotifications
                            }

                            onChange={() =>
                                toggleSetting(
                                    "orderNotifications"
                                )
                            }

                            icon={
                                CheckCircle2
                            }
                        />


                        <NotificationToggle
                            label={
                                t(
                                    "notificationsPage.types.lowStock.label"
                                )
                            }

                            description={
                                t(
                                    "notificationsPage.types.lowStock.description"
                                )
                            }

                            checked={
                                notificationSettings.lowStockAlerts
                            }

                            onChange={() =>
                                toggleSetting(
                                    "lowStockAlerts"
                                )
                            }

                            icon={
                                AlertCircle
                            }
                        />


                        <NotificationToggle
                            label={
                                t(
                                    "notificationsPage.types.payments.label"
                                )
                            }

                            description={
                                t(
                                    "notificationsPage.types.payments.description"
                                )
                            }

                            checked={
                                notificationSettings.paymentNotifications
                            }

                            onChange={() =>
                                toggleSetting(
                                    "paymentNotifications"
                                )
                            }

                            icon={
                                CheckCircle2
                            }
                        />


                        <NotificationToggle
                            label={
                                t(
                                    "notificationsPage.types.reports.label"
                                )
                            }

                            description={
                                t(
                                    "notificationsPage.types.reports.description"
                                )
                            }

                            checked={
                                notificationSettings.reportNotifications
                            }

                            onChange={() =>
                                toggleSetting(
                                    "reportNotifications"
                                )
                            }

                            icon={
                                Info
                            }
                        />
                    </div>
                </div>


                {/* REPORTES PROGRAMADOS */}

                <div className="rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        {t(
                            "notificationsPage.scheduledReports.title"
                        )}
                    </h3>


                    <div className="space-y-3">
                        <NotificationToggle
                            label={
                                t(
                                    "notificationsPage.scheduledReports.weekly.label"
                                )
                            }

                            description={
                                t(
                                    "notificationsPage.scheduledReports.weekly.description"
                                )
                            }

                            checked={
                                notificationSettings.weeklyReport
                            }

                            onChange={() =>
                                toggleSetting(
                                    "weeklyReport"
                                )
                            }

                            icon={
                                Mail
                            }
                        />


                        <NotificationToggle
                            label={
                                t(
                                    "notificationsPage.scheduledReports.monthly.label"
                                )
                            }

                            description={
                                t(
                                    "notificationsPage.scheduledReports.monthly.description"
                                )
                            }

                            checked={
                                notificationSettings.monthlyReport
                            }

                            onChange={() =>
                                toggleSetting(
                                    "monthlyReport"
                                )
                            }

                            icon={
                                Mail
                            }
                        />
                    </div>
                </div>


                {/* GUARDAR */}

                <div className="flex justify-end">
                    <button
                        type="button"

                        onClick={
                            handleSave
                        }

                        className="flex items-center gap-2 px-6 py-3 bg-[#38bdf8] text-black rounded-lg font-semibold hover:bg-[#7dd3fc] transition-all shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40"
                    >
                        <Save className="w-4 h-4" />

                        {t(
                            "notificationsPage.actions.save"
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};


function NotificationToggle({
                                label,
                                description,
                                checked,
                                onChange,
                                icon: Icon,
                            }) {
    const { t } =
        useTranslation();


    return (
        <div className="flex items-start justify-between gap-4 p-4 bg-[#1a1a1a] border border-gray-800/30 rounded-lg hover:bg-[#1f1f1f] transition-colors">

            <div className="flex items-start gap-3 flex-1">
                {Icon && (
                    <Icon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                )}


                <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                        {label}
                    </p>


                    {description && (
                        <p className="text-xs text-gray-400 mt-1">
                            {description}
                        </p>
                    )}
                </div>
            </div>


            <div className="flex items-center gap-3 flex-shrink-0">
                <span
                    className={`text-xs font-medium ${
                        checked
                            ? "text-green-300"
                            : "text-gray-400"
                    }`}
                >
                    {checked
                        ? t(
                            "notificationsPage.status.active"
                        )
                        : t(
                            "notificationsPage.status.inactive"
                        )
                    }
                </span>


                <button
                    type="button"

                    onClick={
                        onChange
                    }

                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                        checked
                            ? "bg-[#38bdf8]"
                            : "bg-gray-700"
                    }`}

                    aria-pressed={
                        checked
                    }

                    aria-label={
                        label
                    }
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            checked
                                ? "translate-x-6"
                                : "translate-x-1"
                        }`}
                    />
                </button>
            </div>

        </div>
    );
}


export default Notifications;