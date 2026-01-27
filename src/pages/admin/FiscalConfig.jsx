// src/pages/admin/FiscalConfig.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Receipt, CreditCard, Percent, Calendar, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import api from "../../lib/api";

const inputCls =
    "w-full p-3 border border-gray-800/50 rounded-xl bg-[#1a1a1a] text-white text-sm " +
    "focus:outline-none focus:border-[#f6b100]/50 transition-colors";

function asDateInputValue(d) {
    if (!d) return "";
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "";
    const yyyy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function Section({ title, icon: Icon, description, children, className = "" }) {
    return (
        <div className={`p-6 rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] shadow-xl ${className}`}>
            {Icon && (
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800/50">
                    <div className="p-2 bg-[#f6b100]/10 rounded-lg border border-[#f6b100]/20">
                        <Icon className="w-5 h-5 text-[#f6b100]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
                    </div>
                </div>
            )}
            {!Icon && <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>}
            {children}
        </div>
    );
}

function Switch({ checked, onChange, disabled }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={[
                "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                checked ? "bg-[#f6b100]" : "bg-gray-700",
            ].join(" ")}
            aria-pressed={checked}
        >
            <span
                className={[
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200",
                    checked ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
            />
        </button>
    );
}

function ToggleRow({ label, desc, checked, onChange, disabled, icon: Icon }) {
    return (
        <div className="flex items-start justify-between gap-4 py-3 px-3 rounded-lg hover:bg-[#1a1a1a]/50 transition-colors">
            <div className="flex items-start gap-3 flex-1">
                {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />}
                <div className="flex-1">
                    <div className="text-sm text-gray-100 font-medium">{label}</div>
                    {desc && <div className="text-xs text-gray-400 mt-1">{desc}</div>}
                </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs font-medium ${checked ? "text-green-300" : "text-gray-400"}`}>
                    {checked ? "Activo" : "Inactivo"}
                </span>
                <Switch checked={checked} onChange={onChange} disabled={disabled} />
            </div>
        </div>
    );
}

export default function FiscalConfig() {
    const qc = useQueryClient();
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin-fiscal-config"],
        queryFn: async () => {
            const res = await api.get("/api/admin/fiscal-config");
            return res.data?.data || null;
        },
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnReconnect: true,
    });

    const initial = useMemo(() => {
        const b01 = data?.fiscal?.ncfConfig?.B01 || {};
        const b02 = data?.fiscal?.ncfConfig?.B02 || {};
        return {
            features: {
                taxEnabled: typeof data?.features?.tax?.enabled === "boolean" ? data.features.tax.enabled : true,
                tipEnabled: typeof data?.features?.tip?.enabled === "boolean" ? data.features.tip.enabled : true,
                discountEnabled: typeof data?.features?.discount?.enabled === "boolean" ? data.features.discount.enabled : true,
                pedidosYaEnabled: !!data?.features?.orderSources?.pedidosYa?.enabled,
                uberEatsEnabled: !!data?.features?.orderSources?.uberEats?.enabled,
                pedidosYaCommissionPct: Math.round((Number(data?.features?.orderSources?.pedidosYa?.commissionRate ?? 0.26)) * 100),
                uberEatsCommissionPct: Math.round((Number(data?.features?.orderSources?.uberEats?.commissionRate ?? 0.22)) * 100),
                deliveryEnabled: !!data?.features?.orderSources?.delivery?.enabled,

            },
            fiscalEnabled: !!data?.fiscal?.enabled,
            B01: {
                active: data?.fiscal?.ncfConfig?.B01?.active !== false,
                start: b01.start ?? 1,
                current: b01.current ?? 1,
                max: b01.max ?? 0,
                expiresAt: asDateInputValue(b01.expiresAt),
            },
            B02: {
                active: data?.fiscal?.ncfConfig?.B02?.active !== false,
                start: b02.start ?? 1,
                current: b02.current ?? 1,
                max: b02.max ?? 0,
                expiresAt: asDateInputValue(b02.expiresAt),
            },
        };
    }, [data]);

    const [form, setForm] = useState(null);

    useEffect(() => {
        if (!data) return;
        setForm(initial);
    }, [data, initial]);

    // Auto-ocultar mensaje después de 5 segundos
    useEffect(() => {
        if (msg) {
            const timer = setTimeout(() => setMsg(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [msg]);

    if (isLoading || !form) {
        return (
            <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f6b100] mx-auto"></div>
                <p className="mt-2">Cargando configuración fiscal...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-8 text-red-400">
                Error cargando configuración fiscal.
            </div>
        );
    }

    const setType = (type, key, value) => {
        setForm((f) => ({
            ...f,
            [type]: { ...f[type], [key]: value },
        }));
    };

    const save = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const payload = {
                fiscalEnabled: !!form.fiscalEnabled,
                features: {
                    tax: { enabled: !!form.features.taxEnabled },
                    tip: { enabled: !!form.features.tipEnabled },
                    discount: { enabled: !!form.features.discountEnabled },
                    orderSources: {
                        pedidosYa: {
                            enabled: !!form.features.pedidosYaEnabled,
                            commissionRate: Number(form.features.pedidosYaCommissionPct || 0) / 100,
                        },
                        uberEats: {
                            enabled: !!form.features.uberEatsEnabled,
                            commissionRate: Number(form.features.uberEatsCommissionPct || 0) / 100,
                        },
                        delivery: {
                            enabled: !!form.features.deliveryEnabled,
                        },

                    },
                },
                ncfConfig: {
                    B01: {
                        active: !!form.B01.active,
                        start: Number(form.B01.start),
                        current: Number(form.B01.current),
                        max: Number(form.B01.max),
                        expiresAt: form.B01.expiresAt || null,
                    },
                    B02: {
                        active: !!form.B02.active,
                        start: Number(form.B02.start),
                        current: Number(form.B02.current),
                        max: Number(form.B02.max),
                        expiresAt: form.B02.expiresAt || null,
                    },
                },
            };

            const res = await api.patch("/api/admin/fiscal-config", payload);
            if (!res.data?.success) throw new Error(res.data?.message || "No se pudo guardar");

            await qc.invalidateQueries({ queryKey: ["admin-fiscal-config"] });
            setMsg({ type: "ok", text: "Configuración guardada correctamente" });
            enqueueSnackbar("Configuración fiscal guardada exitosamente", { variant: "success" });
        } catch (e) {
            const errorMsg = e?.response?.data?.message || e.message || "Error guardando";
            setMsg({ type: "err", text: errorMsg });
            enqueueSnackbar(errorMsg, { variant: "error" });
        } finally {
            setSaving(false);
        }
    };

    // Calcular números disponibles y porcentaje usado
    const getNCFInfo = (ncf) => {
        const used = ncf.current - ncf.start;
        const total = ncf.max - ncf.start;
        const remaining = ncf.max - ncf.current;
        const percentage = total > 0 ? ((used / total) * 100).toFixed(1) : 0;
        const isExpired = ncf.expiresAt ? new Date(ncf.expiresAt) < new Date() : false;
        const isExpiringSoon = ncf.expiresAt ? {
            days: Math.floor((new Date(ncf.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)),
        } : null;
        
        return { used, total, remaining, percentage, isExpired, isExpiringSoon };
    };

    const b01Info = getNCFInfo(form.B01);
    const b02Info = getNCFInfo(form.B02);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-[#f6b100]" />
                        Configuración Fiscal / NCF
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Gestiona los comprobantes fiscales y configuraciones de facturación</p>
                </div>
            </div>

            {/* Mensaje de estado */}
            {msg && (
                <div
                    className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
                        msg.type === "ok"
                            ? "border-green-500/40 bg-green-500/10 text-green-200"
                            : "border-red-500/40 bg-red-500/10 text-red-200"
                    }`}
                >
                    {msg.type === "ok" ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm font-medium">{msg.text}</p>
                </div>
            )}

            {/* Funciones principales */}
            <div className="mb-6">
                <Section title="Funciones de Facturación" icon={CreditCard} description="Habilita o deshabilita funciones para las órdenes">
                    <div className="space-y-1">
                        <ToggleRow
                            label="NCF (Comprobante Fiscal)"
                            desc="Habilita la emisión y visualización de comprobantes fiscales electrónicos"
                            checked={!!form.fiscalEnabled}
                            onChange={(v) => setForm((f) => ({ ...f, fiscalEnabled: v }))}
                            icon={Receipt}
                        />
                        <ToggleRow
                            label="ITBIS"
                            desc="Aplica ITBIS (18%) al total cuando corresponda"
                            checked={!!form.features.taxEnabled}
                            onChange={(v) =>
                                setForm((f) => ({ ...f, features: { ...f.features, taxEnabled: v } }))
                            }
                            icon={Percent}
                        />
                        <ToggleRow
                            label="Propina"
                            desc="Muestra y permite aplicar propina en la cuenta"
                            checked={!!form.features.tipEnabled}
                            onChange={(v) =>
                                setForm((f) => ({ ...f, features: { ...f.features, tipEnabled: v } }))
                            }
                            icon={CreditCard}
                        />
                        <ToggleRow
                            label="Descuentos"
                            desc="Permite aplicar descuentos en la cuenta"
                            checked={!!form.features.discountEnabled}
                            onChange={(v) =>
                                setForm((f) => ({ ...f, features: { ...f.features, discountEnabled: v } }))
                            }
                            icon={Percent}
                        />
                    </div>
                </Section>
            </div>

            {/* Aplicaciones de delivery */}
            <div className="mb-6">
                <Section title="Plataformas de Delivery" icon={CreditCard} description="Configura las comisiones y habilitación de plataformas de delivery">
                    <div className="space-y-4">
                        {/* PedidosYa */}
                        <div className="rounded-lg border border-gray-800/30 bg-[#1a1a1a]/50 p-4">
                            <ToggleRow
                                label="PedidosYa"
                                desc="Habilita el canal PedidosYa en la pantalla de Mesas"
                                checked={!!form.features.pedidosYaEnabled}
                                onChange={(v) =>
                                    setForm((f) => ({ ...f, features: { ...f.features, pedidosYaEnabled: v } }))
                                }
                            />
                            {form.features.pedidosYaEnabled && (
                                <div className="mt-4 pt-4 border-t border-gray-800/30">
                                    <label className="block mb-2">
                                        <div className="text-xs text-gray-400 mb-1">Comisión (%)</div>
                                        <input
                                            className={inputCls}
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={form.features.pedidosYaCommissionPct}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    features: {
                                                        ...f.features,
                                                        pedidosYaCommissionPct: Number(e.target.value || 0),
                                                    },
                                                }))
                                            }
                                        />
                                        <div className="text-xs text-gray-500 mt-1">Ejemplo: 26% de comisión</div>
                                    </label>
                                </div>
                            )}
                        </div>
                        {/* DELIVERY  */}
                        <div className="rounded-lg border border-gray-800/30 bg-[#1a1a1a]/50 p-4">
                            <ToggleRow
                                label="Delivery"
                                desc="Habilita el canal Delivery en la pantalla de Mesas"
                                checked={!!form.features.deliveryEnabled}
                                onChange={(v) =>
                                    setForm((f) => ({ ...f, features: { ...f.features, deliveryEnabled: v } }))
                                }
                            />
                        </div>


                        {/* Uber Eats */}
                        <div className="rounded-lg border border-gray-800/30 bg-[#1a1a1a]/50 p-4">
                            <ToggleRow
                                label="Uber Eats"
                                desc="Habilita el canal Uber Eats en la pantalla de Mesas"
                                checked={!!form.features.uberEatsEnabled}
                                onChange={(v) =>
                                    setForm((f) => ({ ...f, features: { ...f.features, uberEatsEnabled: v } }))
                                }
                            />
                            {form.features.uberEatsEnabled && (
                                <div className="mt-4 pt-4 border-t border-gray-800/30">
                                    <label className="block mb-2">
                                        <div className="text-xs text-gray-400 mb-1">Comisión (%)</div>
                                        <input
                                            className={inputCls}
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={form.features.uberEatsCommissionPct}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    features: {
                                                        ...f.features,
                                                        uberEatsCommissionPct: Number(e.target.value || 0),
                                                    },
                                                }))
                                            }
                                        />
                                        <div className="text-xs text-gray-500 mt-1">Ejemplo: 22% de comisión</div>
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-400">
                                Si un canal está desactivado, se ocultará en "Mesas". Las órdenes existentes de ese canal seguirán siendo accesibles desde "Órdenes/Reportes".
                            </p>
                        </div>
                    </div>
                </Section>
            </div>

            {/* Configuración NCF */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* B01 */}
                <Section title="NCF Tipo B01" icon={Receipt} description="Comprobante de Crédito Fiscal">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-[#1a1a1a]/50 rounded-lg">
                            <span className="text-xs text-gray-400">Estado:</span>
                            <span className={`text-xs font-semibold ${form.B01.active ? "text-green-400" : "text-gray-400"}`}>
                                {form.B01.active ? "Activo" : "Inactivo"}
                            </span>
                        </div>

                        {b01Info.isExpired && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-300">Este rango NCF ha expirado</p>
                            </div>
                        )}

                        {b01Info.isExpiringSoon && b01Info.isExpiringSoon.days > 0 && b01Info.isExpiringSoon.days <= 30 && (
                            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-300">
                                    Este rango expira en {b01Info.isExpiringSoon.days} día(s)
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Número de Inicio</label>
                            <input
                                className={inputCls}
                                type="number"
                                min="1"
                                value={form.B01.start}
                                onChange={(e) => setType("B01", "start", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Número Actual</label>
                            <input
                                className={inputCls}
                                type="number"
                                min="1"
                                value={form.B01.current}
                                onChange={(e) => setType("B01", "current", e.target.value)}
                            />
                            <div className="text-xs text-gray-500 mt-1">Siguiente NCF a emitir</div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Número Máximo</label>
                            <input
                                className={inputCls}
                                type="number"
                                min="1"
                                value={form.B01.max}
                                onChange={(e) => setType("B01", "max", e.target.value)}
                            />
                            <div className="text-xs text-gray-500 mt-1">Fin del rango autorizado</div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-400 mb-1 block flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Fecha de Expiración
                            </label>
                            <input
                                className={inputCls}
                                type="date"
                                value={form.B01.expiresAt}
                                onChange={(e) => setType("B01", "expiresAt", e.target.value)}
                            />
                            <div className="text-xs text-gray-500 mt-1">Dejar vacío para limpiar la fecha</div>
                        </div>

                        {form.B01.max > form.B01.start && (
                            <div className="p-3 bg-[#1a1a1a]/50 rounded-lg space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Usados:</span>
                                    <span className="text-white font-semibold">{b01Info.used}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Disponibles:</span>
                                    <span className="text-green-400 font-semibold">{b01Info.remaining}</span>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            b01Info.percentage > 80 ? "bg-red-500" : b01Info.percentage > 50 ? "bg-yellow-500" : "bg-green-500"
                                        }`}
                                        style={{ width: `${Math.min(b01Info.percentage, 100)}%` }}
                                    />
                                </div>
                                <div className="text-xs text-gray-500 text-center">
                                    {b01Info.percentage}% utilizado
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t border-gray-800/30">
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-sm text-gray-300">Activar este tipo NCF</span>
                                <Switch
                                    checked={!!form.B01.active}
                                    onChange={(v) => setType("B01", "active", v)}
                                />
                            </label>
                        </div>
                    </div>
                </Section>

                {/* B02 */}
                <Section title="NCF Tipo B02" icon={Receipt} description="Comprobante de Consumo">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-[#1a1a1a]/50 rounded-lg">
                            <span className="text-xs text-gray-400">Estado:</span>
                            <span className={`text-xs font-semibold ${form.B02.active ? "text-green-400" : "text-gray-400"}`}>
                                {form.B02.active ? "Activo" : "Inactivo"}
                            </span>
                        </div>

                        {b02Info.isExpired && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-300">Este rango NCF ha expirado</p>
                            </div>
                        )}

                        {b02Info.isExpiringSoon && b02Info.isExpiringSoon.days > 0 && b02Info.isExpiringSoon.days <= 30 && (
                            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-300">
                                    Este rango expira en {b02Info.isExpiringSoon.days} día(s)
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Número de Inicio</label>
                            <input
                                className={inputCls}
                                type="number"
                                min="1"
                                value={form.B02.start}
                                onChange={(e) => setType("B02", "start", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Número Actual</label>
                            <input
                                className={inputCls}
                                type="number"
                                min="1"
                                value={form.B02.current}
                                onChange={(e) => setType("B02", "current", e.target.value)}
                            />
                            <div className="text-xs text-gray-500 mt-1">Siguiente NCF a emitir</div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Número Máximo</label>
                            <input
                                className={inputCls}
                                type="number"
                                min="1"
                                value={form.B02.max}
                                onChange={(e) => setType("B02", "max", e.target.value)}
                            />
                            <div className="text-xs text-gray-500 mt-1">Fin del rango autorizado</div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-400 mb-1 block flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Fecha de Expiración
                            </label>
                            <input
                                className={inputCls}
                                type="date"
                                value={form.B02.expiresAt}
                                onChange={(e) => setType("B02", "expiresAt", e.target.value)}
                            />
                            <div className="text-xs text-gray-500 mt-1">Dejar vacío para limpiar la fecha</div>
                        </div>

                        {form.B02.max > form.B02.start && (
                            <div className="p-3 bg-[#1a1a1a]/50 rounded-lg space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Usados:</span>
                                    <span className="text-white font-semibold">{b02Info.used}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Disponibles:</span>
                                    <span className="text-green-400 font-semibold">{b02Info.remaining}</span>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            b02Info.percentage > 80 ? "bg-red-500" : b02Info.percentage > 50 ? "bg-yellow-500" : "bg-green-500"
                                        }`}
                                        style={{ width: `${Math.min(b02Info.percentage, 100)}%` }}
                                    />
                                </div>
                                <div className="text-xs text-gray-500 text-center">
                                    {b02Info.percentage}% utilizado
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t border-gray-800/30">
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-sm text-gray-300">Activar este tipo NCF</span>
                                <Switch
                                    checked={!!form.B02.active}
                                    onChange={(v) => setType("B02", "active", v)}
                                />
                            </label>
                        </div>
                    </div>
                </Section>
            </div>

            {/* Botón guardar */}
            <div className="flex justify-end">
                <button
                    onClick={save}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f6b100] text-black font-semibold hover:bg-[#ffd633] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40"
                >
                    <Save className="w-4 h-4" />
                    {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
            </div>
        </div>
    );
}
