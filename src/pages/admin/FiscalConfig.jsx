// src/pages/admin/FiscalConfig.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Save,
    Receipt,
    CreditCard,
    Percent,
    Calendar,
    AlertCircle,
    CheckCircle2,
    Info,
    ImageIcon,
    UploadCloud,
    Trash2,
} from "lucide-react";
import { enqueueSnackbar } from "notistack";
import api from "../../lib/api";
import useTenantPrinting from "../../hooks/usePrinters.js";


const inputCls =
    "w-full p-3 border border-gray-800/50 rounded-xl bg-[#1a1a1a] text-white text-sm " +
    "focus:outline-none focus:border-[#f6b100]/50 transition-colors";
const ECF_DOCUMENT_TYPE_GROUPS = [
    {
        title: "Ventas normales",
        description: "Tipos usados para ventas directas del negocio.",
        items: [
            {
                key: "e31",
                code: "31",
                label: "Crédito Fiscal",
                description: "Para clientes con RNC que solicitan crédito fiscal.",
                defaultEnabled: true,
            },
            {
                key: "e32",
                code: "32",
                label: "Consumo",
                description: "Para consumidor final.",
                defaultEnabled: true,
            },
        ],
    },
    {
        title: "Ajustes",
        description: "Tipos usados para corregir o ajustar comprobantes ya emitidos.",
        items: [
            {
                key: "e33",
                code: "33",
                label: "Nota de Débito",
                description: "Para aumentar o ajustar montos de un e-CF previo.",
                defaultEnabled: true,
            },
            {
                key: "e34",
                code: "34",
                label: "Nota de Crédito",
                description: "Para devoluciones, anulaciones o descuentos sobre un e-CF previo.",
                defaultEnabled: true,
            },
        ],
    },
    {
        title: "Comprobantes especiales",
        description: "Activa solo si el contribuyente está autorizado o realmente los necesita.",
        items: [
            {
                key: "e41",
                code: "41",
                label: "Compras",
                description: "Comprobante electrónico de compras.",
                defaultEnabled: false,
            },
            {
                key: "e43",
                code: "43",
                label: "Gastos Menores",
                description: "Para gastos menores relacionados al trabajo.",
                defaultEnabled: false,
            },
            {
                key: "e44",
                code: "44",
                label: "Regímenes Especiales",
                description: "Para contribuyentes acogidos a regímenes especiales.",
                defaultEnabled: false,
            },
            {
                key: "e45",
                code: "45",
                label: "Gubernamental",
                description: "Para ventas al Estado o entidades gubernamentales.",
                defaultEnabled: false,
            },
            {
                key: "e46",
                code: "46",
                label: "Exportación",
                description: "Para operaciones de exportación.",
                defaultEnabled: false,
            },
            {
                key: "e47",
                code: "47",
                label: "Pagos al Exterior",
                description: "Para pagos realizados al exterior.",
                defaultEnabled: false,
            },
        ],
    },
];

const buildDefaultEcfDocumentTypes = (profileDocumentTypes = {}) => {
    const out = {};

    for (const group of ECF_DOCUMENT_TYPE_GROUPS) {
        for (const item of group.items) {
            out[item.key] = {
                enabled:
                    typeof profileDocumentTypes?.[item.key]?.enabled === "boolean"
                        ? profileDocumentTypes[item.key].enabled
                        : item.defaultEnabled,
            };
        }
    }

    return out;
};

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
    const {
        printingConfig,
        isLoadingPrintingConfig,
        savePrintingConfig,
        savingPrintingConfig,
        testPrinting,
        testingPrinting,
    } = useTenantPrinting();
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);
    const [printingForm, setPrintingForm] = useState(null);
    const [certFile, setCertFile] = useState(null);
    const [certPassword, setCertPassword] = useState("");
    const [uploadingCert, setUploadingCert] = useState(false);
    const uploadEcfCertificate = async () => {
        if (!certFile) {
            enqueueSnackbar("Selecciona un certificado .p12 o .pfx.", { variant: "warning" });
            return;
        }

        if (!certPassword.trim()) {
            enqueueSnackbar("Ingresa la contraseña del certificado.", { variant: "warning" });
            return;
        }

        try {
            setUploadingCert(true);

            const formData = new FormData();
            formData.append("certificate", certFile);
            formData.append("password", certPassword.trim());

            const res = await api.post("/api/admin/ecf/profile/certificate", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (!res.data?.success) {
                throw new Error(res.data?.message || "No se pudo subir el certificado.");
            }

            const uploadedProfile = res.data?.data;

            const certificateValidated =
                uploadedProfile?.security?.certificateUploaded === true &&
                uploadedProfile?.security?.passwordConfigured === true &&
                uploadedProfile?.certificate?.isActive === true;

            if (!certificateValidated) {
                throw new Error("CERTIFICATE_NOT_VALIDATED");
            }

            enqueueSnackbar("Certificado e-CF cargado y contraseña validada correctamente.", {
                variant: "success",
            });

            setCertFile(null);
            setCertPassword("");

            await qc.invalidateQueries({ queryKey: ["admin-ecf-profile"] });
            await qc.invalidateQueries({ queryKey: ["tenant-ecf-status"] });
        } catch (error) {
            console.error("uploadEcfCertificate error:", error);

            const backendMessage =
                error?.response?.data?.message ||
                error?.message ||
                "ERROR_UPLOADING_CERTIFICATE";

            const friendlyMessages = {
                CERTIFICATE_PASSWORD_INVALID:
                    "La contraseña del certificado es incorrecta. Verifica la clave e intenta nuevamente.",
                CERTIFICATE_FILE_INVALID:
                    "El archivo del certificado no es válido. Debe ser un .p12 o .pfx correcto.",
                INVALID_CERTIFICATE_EXTENSION:
                    "El archivo debe ser .p12 o .pfx.",
                CERTIFICATE_PASSWORD_REQUIRED:
                    "Debes escribir la contraseña del certificado.",
                CERTIFICATE_FILE_REQUIRED:
                    "Debes seleccionar un archivo de certificado.",
                CERTIFICATE_NOT_VALIDATED:
                    "El certificado fue recibido, pero no quedó validado correctamente. Verifica el archivo y la contraseña.",
                CERTIFICATE_UPLOAD_FAILED:
                    "No se pudo subir el certificado al almacenamiento privado.",
            };

            enqueueSnackbar(
                friendlyMessages[backendMessage] || backendMessage || "Error subiendo certificado e-CF.",
                { variant: "error" }
            );
        } finally {
            setUploadingCert(false);
        }
    };

    useEffect(() => {
        if (!printingConfig) return;
        setPrintingForm({
            enabled: !!printingConfig.enabled,
            mode: printingConfig.mode || "browser",
            paperSize: printingConfig.paperSize || "80mm",
            autoPrintTicket: !!printingConfig.autoPrintTicket,
            autoPrintInvoice: !!printingConfig.autoPrintInvoice,
            mobile: {
                enabled: printingConfig?.mobile?.enabled !== false,
                allowAirPrint: printingConfig?.mobile?.allowAirPrint !== false,
            },
            qz: {
                enabled: !!printingConfig?.qz?.enabled,
                host: printingConfig?.qz?.host || "localhost",
                port: Number(printingConfig?.qz?.port || 8181),
            },
        });
    }, [printingConfig]);
    const savePrinting = async () => {
        if (!printingForm) return;
        await savePrintingConfig(printingForm);
    };

    const runPrintingTest = async () => {
        await testPrinting();
    };

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

    const {
        data: ecfProfile,
        isLoading: isLoadingEcfProfile,
    } = useQuery({
        queryKey: ["admin-ecf-profile"],
        queryFn: async () => {
            const res = await api.get("/api/admin/ecf/profile");
            return res.data?.data || null;
        },
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnReconnect: true,
    });
    const currentPlan = String(data?.plan || "").trim().toLowerCase();

    const canUseFiscal =
        Boolean(data?.planFeatures?.fiscal) ||
        ["premium", "pro"].includes(currentPlan);
    const initial = useMemo(() => {
        const b01 = data?.fiscal?.ncfConfig?.B01 || {};
        const b02 = data?.fiscal?.ncfConfig?.B02 || {};
        return {
            ecf: {
                enabled: !!ecfProfile?.enabled,
                environment: ecfProfile?.environment || "internal_sandbox",
                certificationStatus: ecfProfile?.certificationStatus || "not_started",
                issuerRnc: ecfProfile?.issuer?.rnc || "",
                issuerLegalName: ecfProfile?.issuer?.legalName || "",
                certificateUploaded:
                    ecfProfile?.security?.certificateUploaded === true &&
                    ecfProfile?.security?.passwordConfigured === true &&
                    ecfProfile?.certificate?.isActive === true,
                documentTypes: buildDefaultEcfDocumentTypes(ecfProfile?.documentTypes || {}),
            },
            features: {
                taxEnabled: typeof data?.features?.tax?.enabled === "boolean" ? data.features.tax.enabled : true,
                tipEnabled: typeof data?.features?.tip?.enabled === "boolean" ? data.features.tip.enabled : true,
                discountEnabled: typeof data?.features?.discount?.enabled === "boolean" ? data.features.discount.enabled : true,
                pedidosYaEnabled: !!data?.features?.orderSources?.pedidosYa?.enabled,
                uberEatsEnabled: !!data?.features?.orderSources?.uberEats?.enabled,
                pedidosYaCommissionPct: Math.round((Number(data?.features?.orderSources?.pedidosYa?.commissionRate ?? 0.26)) * 100),
                uberEatsCommissionPct: Math.round((Number(data?.features?.orderSources?.uberEats?.commissionRate ?? 0.22)) * 100),
                deliveryEnabled: !!data?.features?.orderSources?.delivery?.enabled,
                preInvoiceEnabled: !!data?.features?.preInvoice?.enabled,
                chargeMode: String(data?.features?.checkout?.chargeMode || "AT_COMPLETE"),
            },
            fiscalEnabled: canUseFiscal ? !!data?.fiscal?.enabled : false,
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
    }, [data, canUseFiscal, ecfProfile]);

    const [form, setForm] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [logoUploading, setLogoUploading] = useState(false);

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
    const uploadBusinessLogo = async () => {
        if (!logoFile) {
            enqueueSnackbar("Selecciona un logo primero.", { variant: "warning" });
            return;
        }

        setLogoUploading(true);

        try {
            const fd = new FormData();
            fd.append("logo", logoFile);

            const res = await api.post("/api/admin/tenant-logo", fd);

            if (!res.data?.success) {
                throw new Error(res.data?.message || "No se pudo subir el logo.");
            }

            setLogoFile(null);

            await qc.invalidateQueries({ queryKey: ["admin-fiscal-config"] });

            enqueueSnackbar("Logo actualizado correctamente.", { variant: "success" });
        } catch (error) {
            const msg =
                error?.response?.data?.message ||
                error?.message ||
                "Error subiendo logo.";

            enqueueSnackbar(msg, { variant: "error" });
        } finally {
            setLogoUploading(false);
        }
    };

    const deleteBusinessLogo = async () => {
        setLogoUploading(true);

        try {
            const res = await api.delete("/api/admin/tenant-logo");

            if (!res.data?.success) {
                throw new Error(res.data?.message || "No se pudo eliminar el logo.");
            }

            setLogoFile(null);

            await qc.invalidateQueries({ queryKey: ["admin-fiscal-config"] });

            enqueueSnackbar("Logo eliminado correctamente.", { variant: "success" });
        } catch (error) {
            const msg =
                error?.response?.data?.message ||
                error?.message ||
                "Error eliminando logo.";

            enqueueSnackbar(msg, { variant: "error" });
        } finally {
            setLogoUploading(false);
        }
    };
    if (isLoading || isLoadingEcfProfile || !form) {
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
    const certificateReady =
        ecfProfile?.security?.certificateUploaded === true &&
        ecfProfile?.security?.passwordConfigured === true &&
        ecfProfile?.certificate?.isActive === true;

    const certificateHasFile =
        Boolean(ecfProfile?.certificate?.fileName) ||
        Boolean(ecfProfile?.certificate?.path);

    const certificateHasProblem =
        certificateHasFile && !certificateReady;

    const certificateMissing =
        !certificateHasFile && !certificateReady;

    const formatCertificateDate = (value) => {
        if (!value) return null;

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return null;

        return date.toLocaleDateString("es-DO", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    };

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
                fiscalEnabled: canUseFiscal ? !!form.fiscalEnabled : false,
                features: {
                    tax: { enabled: !!form.features.taxEnabled },
                    tip: { enabled: !!form.features.tipEnabled },
                    discount: { enabled: !!form.features.discountEnabled },
                    preInvoice: { enabled: !!form.features.preInvoiceEnabled },
                    checkout: {
                        chargeMode: form.features.chargeMode || "AT_COMPLETE",
                    },
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

                ...(canUseFiscal
                    ? {
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
                    }
                    : {}),
            };

            const res = await api.patch("/api/admin/fiscal-config", payload);
            if (!res.data?.success) throw new Error(res.data?.message || "No se pudo guardar");
            const ecfPayload = {
                enabled: !!form.ecf?.enabled,
                environment: form.ecf?.environment || "internal_sandbox",
                syncIssuerFromTenant: true,
                documentTypes: form.ecf?.documentTypes || buildDefaultEcfDocumentTypes(),
            };

            const ecfRes = await api.patch("/api/admin/ecf/profile", ecfPayload);
            if (!ecfRes.data?.success) {
                throw new Error(ecfRes.data?.message || "No se pudo guardar la configuración e-CF");
            }

            await qc.invalidateQueries({ queryKey: ["admin-fiscal-config"] });
            await qc.invalidateQueries({ queryKey: ["admin-ecf-profile"] });
            await qc.invalidateQueries({ queryKey: ["tenant-ecf-status"] });
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

            <Section
                title="Logo del negocio"
                icon={ImageIcon}
                description="Este logo aparecerá en la factura visual y en el PDF generado."
            >
                <div className="space-y-4">
                    <div className="rounded-xl border border-gray-800/50 bg-[#1a1a1a]/60 p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="w-32 h-24 rounded-xl bg-[#111] border border-gray-800/60 flex items-center justify-center overflow-hidden">
                                {data?.business?.logoUrl ? (
                                    <img
                                        src={data.business.logoUrl}
                                        alt="Logo actual"
                                        className="max-w-full max-h-full object-contain p-2"
                                    />
                                ) : (
                                    <div className="text-center text-gray-500 text-xs px-3">
                                        Sin logo
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">
                                        Logo actual de la factura
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Usa PNG o JPG. Recomendado: fondo transparente, máximo 2MB.
                                    </p>
                                </div>

                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                    className={inputCls}
                                />

                                {logoFile && (
                                    <p className="text-xs text-gray-400">
                                        Seleccionado: {logoFile.name}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={uploadBusinessLogo}
                                        disabled={logoUploading || !logoFile}
                                        className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm ${
                                            logoUploading || !logoFile
                                                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                                : "bg-[#f6b100] text-[#1f1f1f] hover:opacity-90"
                                        }`}
                                    >
                                        <UploadCloud className="w-4 h-4" />
                                        {logoUploading ? "Subiendo..." : "Subir logo"}
                                    </button>

                                    {data?.business?.logoUrl && (
                                        <button
                                            type="button"
                                            onClick={deleteBusinessLogo}
                                            disabled={logoUploading}
                                            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Eliminar logo
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>
            {/* Funciones principales */}

            <div className="mb-6">
                <div className="mb-6">
                    <Section
                        title="Facturación Electrónica e-CF"
                        icon={Receipt}
                        description="Activa o desactiva la emisión electrónica para este cliente"
                    >
                        <div className="space-y-4">
                            <ToggleRow
                                label="Activar e-CF"
                                desc="Muestra el botón de Emitir e-CF en la factura y permite generar documentos electrónicos."
                                checked={!!form.ecf?.enabled}
                                onChange={(v) =>
                                    setForm((f) => ({
                                        ...f,
                                        ecf: {
                                            ...f.ecf,
                                            enabled: v,
                                        },
                                    }))
                                }
                                icon={Receipt}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-800/40">
                                <label>
                                    <div className="text-xs text-gray-400 mb-1">Ambiente e-CF</div>
                                    <select
                                        className={inputCls}
                                        value={form.ecf?.environment || "internal_sandbox"}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                ecf: {
                                                    ...f.ecf,
                                                    environment: e.target.value,
                                                },
                                            }))
                                        }
                                    >
                                        <option value="internal_sandbox">Sandbox interno</option>
                                        <option value="dgii_certification">Certificación DGII</option>
                                        <option value="dgii_production">Producción DGII</option>
                                    </select>
                                </label>

                                <div>
                                    <div className="text-xs text-gray-400 mb-1">Estado actual</div>
                                    <div className="p-3 rounded-xl bg-[#1a1a1a] border border-gray-800/50 text-sm text-white">
                                        {form.ecf?.enabled ? "e-CF activo" : "e-CF inactivo"}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-800/50 bg-[#1a1a1a]/60 p-4">
                                <p className="text-xs text-gray-400 mb-2">
                                    Validación de configuración:
                                </p>

                                <div className="space-y-1 text-xs">
                                    <p className={form.ecf?.issuerRnc ? "text-green-300" : "text-yellow-300"}>
                                        RNC emisor: {form.ecf?.issuerRnc || "Pendiente"}
                                    </p>

                                    <p className={form.ecf?.issuerLegalName ? "text-green-300" : "text-yellow-300"}>
                                        Razón social: {form.ecf?.issuerLegalName || "Pendiente"}
                                    </p>

                                    <p className={certificateReady ? "text-green-300" : "text-yellow-300"}>
                                        Certificado digital: {certificateReady ? "Validado correctamente" : "Pendiente o incompleto"}
                                    </p>

                                    <p className="text-gray-400">
                                        Estado certificación: {form.ecf?.certificationStatus || "not_started"}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                                <p className="text-xs text-yellow-200">
                                    Nota: activar e-CF aquí solo habilita la función en el POS. Para producción real DGII todavía se requiere certificado digital, firma XML y gateway DGII.
                                </p>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-800/50 bg-[#1a1a1a]/60 p-4 space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    Certificado digital e-CF
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Sube el certificado .p12 o .pfx del contribuyente. Se guardará en almacenamiento privado.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label>
                                    <div className="text-xs text-gray-400 mb-1">
                                        Archivo certificado
                                    </div>

                                    <input
                                        type="file"
                                        accept=".p12,.pfx"
                                        onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                                        className={inputCls}
                                    />

                                    {certFile && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            Seleccionado: {certFile.name}
                                        </p>
                                    )}
                                </label>

                                <label>
                                    <div className="text-xs text-gray-400 mb-1">
                                        Contraseña del certificado
                                    </div>

                                    <input
                                        type="password"
                                        value={certPassword}
                                        onChange={(e) => setCertPassword(e.target.value)}
                                        placeholder="Contraseña del .p12 / .pfx"
                                        className={inputCls}
                                    />
                                </label>
                            </div>

                            <button
                                type="button"
                                onClick={uploadEcfCertificate}
                                disabled={uploadingCert}
                                className={`px-4 py-3 rounded-xl font-semibold text-sm ${
                                    uploadingCert
                                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                        : "bg-[#f6b100] text-[#1f1f1f] hover:opacity-90"
                                }`}
                            >
                                {uploadingCert ? "Subiendo certificado..." : "Subir certificado e-CF"}
                            </button>

                            {certificateReady && (
                                <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 space-y-2">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-green-300">
                                                Certificado cargado y contraseña validada correctamente.
                                            </p>
                                            <p className="text-xs text-green-200/80 mt-1">
                                                El sistema pudo abrir el .p12/.pfx con la contraseña indicada.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-300 pt-2">
                                        {ecfProfile?.certificate?.fileName && (
                                            <p>
                                                Archivo: <span className="text-white">{ecfProfile.certificate.fileName}</span>
                                            </p>
                                        )}

                                        {ecfProfile?.certificate?.serialNumber && (
                                            <p>
                                                Serial: <span className="text-white">{ecfProfile.certificate.serialNumber}</span>
                                            </p>
                                        )}

                                        {ecfProfile?.certificate?.validFrom && (
                                            <p>
                                                Válido desde:{" "}
                                                <span className="text-white">
                        {formatCertificateDate(ecfProfile.certificate.validFrom)}
                    </span>
                                            </p>
                                        )}

                                        {ecfProfile?.certificate?.validTo && (
                                            <p>
                                                Válido hasta:{" "}
                                                <span className="text-white">
                        {formatCertificateDate(ecfProfile.certificate.validTo)}
                    </span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {certificateHasProblem && (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 space-y-2">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-red-300">
                                                El certificado no está validado correctamente.
                                            </p>
                                            <p className="text-xs text-red-200/80 mt-1">
                                                Puede que la contraseña sea incorrecta, el archivo no sea válido o la configuración esté incompleta.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs pt-2">
                                        <div className={ecfProfile?.security?.certificateUploaded ? "text-green-300" : "text-red-300"}>
                                            Archivo: {ecfProfile?.security?.certificateUploaded ? "Cargado" : "No validado"}
                                        </div>

                                        <div className={ecfProfile?.security?.passwordConfigured ? "text-green-300" : "text-red-300"}>
                                            Contraseña: {ecfProfile?.security?.passwordConfigured ? "Configurada" : "No validada"}
                                        </div>

                                        <div className={ecfProfile?.certificate?.isActive ? "text-green-300" : "text-red-300"}>
                                            Estado: {ecfProfile?.certificate?.isActive ? "Activo" : "Inactivo"}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {certificateMissing && (
                                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                                    <div className="flex items-start gap-2">
                                        <Info className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-yellow-200">
                                                Certificado pendiente.
                                            </p>
                                            <p className="text-xs text-yellow-100/80 mt-1">
                                                Sube un archivo .p12 o .pfx y valida su contraseña para poder firmar e-CF reales.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Section>
                </div>
                <Section title="Funciones de Facturación" icon={CreditCard} description="Habilita o deshabilita funciones para las órdenes">
                    <div className="space-y-1">
                        <ToggleRow
                            label="NCF (Comprobante Fiscal)"
                            desc={
                                canUseFiscal
                                    ? "Habilita la emisión y visualización de comprobantes fiscales"
                                    : "Disponible solo en Plan Premium o Pro"
                            }
                            checked={!!form.fiscalEnabled}
                            onChange={(v) => {
                                if (!canUseFiscal) return;
                                setForm((f) => ({ ...f, fiscalEnabled: v }));
                            }}
                            disabled={!canUseFiscal}
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
            <div className="rounded-xl border border-gray-800/50 bg-[#1a1a1a]/60 p-4 space-y-5">
                <div>
                    <p className="text-sm font-semibold text-white">
                        Tipos de e-CF habilitados
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Activa solo los tipos de comprobantes electrónicos autorizados o necesarios para este contribuyente.
                    </p>
                </div>

                <div className="space-y-5">
                    {ECF_DOCUMENT_TYPE_GROUPS.map((group) => (
                        <div
                            key={group.title}
                            className="rounded-xl border border-gray-800/40 bg-[#111111]/70 p-4"
                        >
                            <div className="mb-3">
                                <p className="text-sm font-semibold text-[#f6b100]">
                                    {group.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {group.description}
                                </p>
                            </div>

                            <div className="space-y-2">
                                {group.items.map((item) => {
                                    const checked =
                                        form.ecf?.documentTypes?.[item.key]?.enabled === true;

                                    return (
                                        <div
                                            key={item.key}
                                            className="flex items-start justify-between gap-4 rounded-lg border border-gray-800/30 bg-[#1a1a1a]/60 px-3 py-3"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-semibold text-white">
                                            {item.key} - {item.label}
                                        </span>

                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                                            Código {item.code}
                                        </span>
                                                </div>

                                                <p className="text-xs text-gray-500 mt-1">
                                                    {item.description}
                                                </p>
                                            </div>

                                            <Switch
                                                checked={checked}
                                                onChange={(v) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        ecf: {
                                                            ...f.ecf,
                                                            documentTypes: {
                                                                ...(f.ecf?.documentTypes || {}),
                                                                [item.key]: {
                                                                    ...(f.ecf?.documentTypes?.[item.key] || {}),
                                                                    enabled: v,
                                                                },
                                                            },
                                                        },
                                                    }))
                                                }
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                    <p className="text-xs text-blue-200">
                        Recomendación: para restaurantes y negocios normales, deja activos e31, e32, e33 y e34. Los comprobantes especiales deben activarse solo cuando el contribuyente los necesite.
                    </p>
                </div>
            </div>
            {/* Modo de cobro */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                    Modo de cobro
                </label>

                <select
                    value={form.features.chargeMode || "AT_COMPLETE"}
                    onChange={(e) =>
                        setForm((f) => ({
                            ...f,
                            features: {
                                ...f.features,
                                chargeMode: e.target.value,
                            },
                        }))
                    }
                    className={inputCls}
                >
                    <option value="AT_INVOICE">Cobrar al facturar</option>
                    <option value="AT_COMPLETE">Cobrar al completar</option>
                </select>
                <p className="text-xs text-gray-400">
                    Cobrar al facturar: la venta entra al cierre al emitir la factura. Cobrar al completar: la venta entra al cierre solo cuando se marca como completada.
                </p>
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

            {/* Print */}
            {printingForm && (
                <div className="mb-6">
                    <Section
                        title="Configuración de Impresión"
                        icon={Receipt}
                        description="Configura cómo imprimen tickets y facturas para este tenant"
                    >
                        <div className="space-y-4">
                            <ToggleRow
                                label="Habilitar impresión personalizada"
                                desc="Activa la configuración de impresión por tenant"
                                checked={!!printingForm.enabled}
                                onChange={(v) => setPrintingForm((f) => ({ ...f, enabled: v }))}
                                icon={Receipt}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label>
                                    <div className="text-xs text-gray-400 mb-1">Modo</div>
                                    <select
                                        className={inputCls}
                                        value={printingForm.mode}
                                        onChange={(e) =>
                                            setPrintingForm((f) => ({ ...f, mode: e.target.value }))
                                        }
                                    >
                                        <option value="browser">Browser</option>
                                        <option value="qz">QZ</option>
                                    </select>
                                </label>

                                <label>
                                    <div className="text-xs text-gray-400 mb-1">Tamaño papel</div>
                                    <select
                                        className={inputCls}
                                        value={printingForm.paperSize}
                                        onChange={(e) =>
                                            setPrintingForm((f) => ({ ...f, paperSize: e.target.value }))
                                        }
                                    >
                                        <option value="58mm">58mm</option>
                                        <option value="80mm">80mm</option>
                                        <option value="A4">A4</option>
                                    </select>
                                </label>
                            </div>

                            <ToggleRow
                                label="Auto imprimir ticket"
                                desc="Dispara el flujo automático de ticket cuando corresponda"
                                checked={!!printingForm.autoPrintTicket}
                                onChange={(v) =>
                                    setPrintingForm((f) => ({ ...f, autoPrintTicket: v }))
                                }
                            />

                            <ToggleRow
                                label="Auto imprimir factura"
                                desc="Dispara el flujo automático de factura cuando corresponda"
                                checked={!!printingForm.autoPrintInvoice}
                                onChange={(v) =>
                                    setPrintingForm((f) => ({ ...f, autoPrintInvoice: v }))
                                }
                            />

                            <ToggleRow
                                label="Permitir impresión móvil"
                                desc="Mantiene habilitado el flujo para celular/navegador"
                                checked={!!printingForm.mobile.enabled}
                                onChange={(v) =>
                                    setPrintingForm((f) => ({
                                        ...f,
                                        mobile: { ...f.mobile, enabled: v },
                                    }))
                                }
                            />

                            <ToggleRow
                                label="Permitir AirPrint"
                                desc="Solo relevante en dispositivos Apple compatibles"
                                checked={!!printingForm.mobile.allowAirPrint}
                                onChange={(v) =>
                                    setPrintingForm((f) => ({
                                        ...f,
                                        mobile: { ...f.mobile, allowAirPrint: v },
                                    }))
                                }
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label>
                                    <div className="text-xs text-gray-400 mb-1">Alias impresora ticket</div>
                                    <input
                                        className={inputCls}
                                        value={printingForm.ticketPrinter.alias}
                                        onChange={(e) =>
                                            setPrintingForm((f) => ({
                                                ...f,
                                                ticketPrinter: {
                                                    ...f.ticketPrinter,
                                                    alias: e.target.value,
                                                },
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    <div className="text-xs text-gray-400 mb-1">Nombre impresora ticket</div>
                                    <input
                                        className={inputCls}
                                        value={printingForm.ticketPrinter.name}
                                        onChange={(e) =>
                                            setPrintingForm((f) => ({
                                                ...f,
                                                ticketPrinter: {
                                                    ...f.ticketPrinter,
                                                    name: e.target.value,
                                                },
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    <div className="text-xs text-gray-400 mb-1">Alias impresora factura</div>
                                    <input
                                        className={inputCls}
                                        value={printingForm.invoicePrinter.alias}
                                        onChange={(e) =>
                                            setPrintingForm((f) => ({
                                                ...f,
                                                invoicePrinter: {
                                                    ...f.invoicePrinter,
                                                    alias: e.target.value,
                                                },
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    <div className="text-xs text-gray-400 mb-1">Nombre impresora factura</div>
                                    <input
                                        className={inputCls}
                                        value={printingForm.invoicePrinter.name}
                                        onChange={(e) =>
                                            setPrintingForm((f) => ({
                                                ...f,
                                                invoicePrinter: {
                                                    ...f.invoicePrinter,
                                                    name: e.target.value,
                                                },
                                            }))
                                        }
                                    />
                                </label>
                            </div>

                            {printingForm.mode === "qz" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label>
                                        <div className="text-xs text-gray-400 mb-1">QZ Host</div>
                                        <input
                                            className={inputCls}
                                            value={printingForm.qz.host}
                                            onChange={(e) =>
                                                setPrintingForm((f) => ({
                                                    ...f,
                                                    qz: { ...f.qz, host: e.target.value },
                                                }))
                                            }
                                        />
                                    </label>

                                    <label>
                                        <div className="text-xs text-gray-400 mb-1">QZ Port</div>
                                        <input
                                            className={inputCls}
                                            type="number"
                                            value={printingForm.qz.port}
                                            onChange={(e) =>
                                                setPrintingForm((f) => ({
                                                    ...f,
                                                    qz: { ...f.qz, port: Number(e.target.value || 8181) },
                                                }))
                                            }
                                        />
                                    </label>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={savePrinting}
                                    disabled={savingPrintingConfig}
                                    className="px-5 py-2 rounded-xl bg-[#f6b100] text-black font-semibold hover:bg-[#ffd633] disabled:opacity-60"
                                >
                                    {savingPrintingConfig ? "Guardando impresión..." : "Guardar impresión"}
                                </button>

                                <button
                                    type="button"
                                    onClick={runPrintingTest}
                                    disabled={testingPrinting}
                                    className="px-5 py-2 rounded-xl border border-gray-700 text-white hover:bg-[#1a1a1a] disabled:opacity-60"
                                >
                                    {testingPrinting ? "Probando..." : "Probar backend impresión"}
                                </button>
                            </div>
                        </div>
                    </Section>
                </div>
            )}
            {/* PreFactura */}
            <div className="rounded-lg border border-gray-800/30 bg-[#1a1a1a]/50 p-4 mb-6">
                <ToggleRow
                    label="PreFactura"
                    desc='Si está activo, las facturas NO fiscales mostrarán "PreFactura" en vez de "Factura para Consumidor Final".'
                    checked={!!form.features.preInvoiceEnabled}
                    onChange={(v) =>
                        setForm((f) => ({
                            ...f,
                            features: { ...f.features, preInvoiceEnabled: v },
                        }))
                    }
                />

                {form.features.preInvoiceEnabled && (
                    <div className="mt-4 pt-4 border-t border-gray-800/30">
                        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-400">
                                Nota: “PreFactura” solo aplica a facturas NO fiscales (sin NCF). Si una orden es fiscal, seguirá saliendo “Factura con Comprobante Fiscal”.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Configuración NCF */}
            {canUseFiscal ? (
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
            ) : (
                <div className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-yellow-200">
                                NCF disponible en Plan Premium o Pro
                            </h3>
                            <p className="text-xs text-gray-300 mt-1">
                                Puedes seguir configurando ITBIS, propina, descuentos, PreFactura, Delivery, PedidosYa, Uber Eats, modo de cobro e impresión. Solo los comprobantes fiscales NCF están limitados por plan.
                            </p>
                        </div>
                    </div>
                </div>
            )}

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
