// src/pages/admin/FiscalConfig.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ServiceChargeConfig from "./ServiceChargeConfig.jsx";
import {
    Save,
    Receipt,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import EcfConfig, {
    buildDefaultEcfDocumentTypes,
    buildEcfDocumentTypesPayload,
} from "./EcfConfig.jsx";
import { enqueueSnackbar } from "notistack";
import { useTranslation } from "react-i18next";
import api, { getScope } from "../../lib/api";
import RegionalTaxConfig from "./RegionalTaxConfig.jsx";
import BillingGeneralConfig from "./BillingGeneralConfig.jsx";
import DeliveryConfig from "./DeliveryConfig.jsx";
import DominicanNcfConfig from "./DominicanNcfConfig.jsx";

const inputCls =
    "w-full p-3 border border-gray-800/50 rounded-xl bg-[#1a1a1a] text-white text-sm " +
    "focus:outline-none focus:border-[#f6b100]/50 transition-colors";

const VIEW_META = {
    regional: {
        titleKey:
            "fiscalConfig.views.regional.title",

        descriptionKey:
            "fiscalConfig.views.regional.description",
    },

    taxes: {
        titleKey:
            "fiscalConfig.views.taxes.title",

        descriptionKey:
            "fiscalConfig.views.taxes.description",
    },

    "service-charges": {
        titleKey:
            "fiscalConfig.views.serviceCharges.title",

        descriptionKey:
            "fiscalConfig.views.serviceCharges.description",
    },

    billing: {
        titleKey:
            "fiscalConfig.views.billing.title",

        descriptionKey:
            "fiscalConfig.views.billing.description",
    },

    delivery: {
        titleKey:
            "fiscalConfig.views.delivery.title",

        descriptionKey:
            "fiscalConfig.views.delivery.description",
    },

    ncf: {
        titleKey:
            "fiscalConfig.views.ncf.title",

        descriptionKey:
            "fiscalConfig.views.ncf.description",
    },

    ecf: {
        titleKey:
            "fiscalConfig.views.ecf.title",

        descriptionKey:
            "fiscalConfig.views.ecf.description",
    },
};

function asDateInputValue(d) {
    if (!d) return "";

    const raw = String(d);

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        return raw.slice(0, 10);
    }

    const x = new Date(d);

    if (
        Number.isNaN(
            x.getTime()
        )
    ) {
        return "";
    }

    return x
        .toISOString()
        .slice(0, 10);
}

function Section({
                     title,
                     icon: Icon,
                     description,
                     children,
                     className = "",
                 }) {
    return (
        <div
            className={`p-6 rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] shadow-xl ${className}`}
        >
            {Icon && (
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800/50">
                    <div className="p-2 bg-[#f6b100]/10 rounded-lg border border-[#f6b100]/20">
                        <Icon className="w-5 h-5 text-[#f6b100]" />
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            {title}
                        </h3>

                        {description && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {!Icon && (
                <h3 className="text-lg font-semibold text-white mb-4">
                    {title}
                </h3>
            )}

            {children}
        </div>
    );
}

function Switch({
                    checked,
                    onChange,
                    disabled,
                }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() =>
                !disabled &&
                onChange(!checked)
            }
            className={[
                "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200",

                disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer",

                checked
                    ? "bg-[#f6b100]"
                    : "bg-gray-700",
            ].join(" ")}
            aria-pressed={checked}
        >
            <span
                className={[
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200",

                    checked
                        ? "translate-x-6"
                        : "translate-x-1",
                ].join(" ")}
            />
        </button>
    );
}

function ToggleRow({
                       label,
                       desc,
                       checked,
                       onChange,
                       disabled,
                       icon: Icon,
                   }) {
    const { t } =
        useTranslation();

    return (
        <div className="flex items-start justify-between gap-4 py-3 px-3 rounded-lg hover:bg-[#1a1a1a]/50 transition-colors">
            <div className="flex items-start gap-3 flex-1">
                {Icon && (
                    <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                )}

                <div className="flex-1">
                    <div className="text-sm text-gray-100 font-medium">
                        {label}
                    </div>

                    {desc && (
                        <div className="text-xs text-gray-400 mt-1">
                            {desc}
                        </div>
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
                            "fiscalConfig.status.active"
                        )
                        : t(
                            "fiscalConfig.status.inactive"
                        )
                    }
                </span>

                <Switch
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}

export default function FiscalConfig({
                                         view = "billing",
                                     }) {
    const { t } =
        useTranslation();

    const viewMeta =
        VIEW_META[view] ||
        VIEW_META.billing;

    const show =
        (...views) =>
            view === "all" ||
            views.includes(
                view
            );

    const qc =
        useQueryClient();

    const [
        saving,
        setSaving,
    ] =
        useState(false);

    const [
        msg,
        setMsg,
    ] =
        useState(null);

    /*
     * ==========================================
     * CONFIGURACIÓN GENERAL
     * ==========================================
     */

    const {
        data,
        isLoading,
        isError,
    } =
        useQuery({
            queryKey: [
                "admin-fiscal-config",
            ],

            queryFn:
                async () => {
                    const res =
                        await api.get(
                            "/api/admin/fiscal-config"
                        );

                    return (
                        res.data
                            ?.data ||
                        null
                    );
                },

            staleTime:
                0,

            refetchOnMount:
                "always",

            refetchOnReconnect:
                true,
        });

    /*
     * ==========================================
     * PERFIL E-CF
     * ==========================================
     */

    const secondaryEcfBranch = (getScope()?.clientId || "default") !== "default";

    const {
        data:
            ecfProfile,

        isLoading:
            isLoadingEcfProfile,
    } =
        useQuery({
            queryKey: [
                "admin-ecf-profile",
            ],

            queryFn:
                async () => {
                    const res =
                        await api.get(
                            "/api/admin/ecf/profile"
                        );

                    return (
                        res.data
                            ?.data ||
                        null
                    );
                },

            staleTime:
                0,

            enabled:
                view ===
                "ecf",

            refetchOnMount:
                "always",

            refetchOnReconnect:
                true,
        });

    /*
     * ==========================================
     * ESTADO RUNTIME E-CF
     * ==========================================
     */

    const {
        data:
            ecfRuntimeStatus,
    } =
        useQuery({
            queryKey: [
                "tenant-ecf-status",
            ],

            queryFn:
                async () => {
                    const res =
                        await api.get(
                            "/api/order/ecf/status"
                        );

                    return (
                        res.data
                            ?.data ||
                        null
                    );
                },

            staleTime:
                0,

            enabled:
                view ===
                "ecf",

            refetchOnMount:
                "always",

            refetchOnReconnect:
                true,
        });

    /*
     * ==========================================
     * PLAN / FISCAL
     * ==========================================
     */

    const currentPlan =
        String(
            data?.plan ||
            ""
        )
            .trim()
            .toLowerCase();

    const canUseFiscal =
        Boolean(
            data
                ?.planFeatures
                ?.fiscal
        ) ||
        [
            "premium",
            "pro",
        ].includes(
            currentPlan
        );

    /*
     * ==========================================
     * ESTADO INICIAL
     * ==========================================
     */

    const initial =
        useMemo(
            () => {
                const b01 =
                    data
                        ?.fiscal
                        ?.ncfConfig
                        ?.B01 ||
                    {};

                const b02 =
                    data
                        ?.fiscal
                        ?.ncfConfig
                        ?.B02 ||
                    {};

                return {
                    localization: {
                        countryCode:
                            data
                                ?.localization
                                ?.countryCode ||
                            "DO",

                        language:
                            data
                                ?.localization
                                ?.language ||
                            "es",

                        locale:
                            data
                                ?.localization
                                ?.locale ||
                            "es-DO",

                        currency:
                            data
                                ?.localization
                                ?.currency ||
                            "DOP",

                        timezone:
                            data
                                ?.localization
                                ?.timezone ||
                            "America/Santo_Domingo",

                        dateFormat:
                            data
                                ?.localization
                                ?.dateFormat ||
                            "DD/MM/YYYY",

                        timeFormat:
                            data
                                ?.localization
                                ?.timeFormat ||
                            "12h",

                        measurementSystem:
                            data
                                ?.localization
                                ?.measurementSystem ||
                            "imperial",

                        weightUnit:
                            data
                                ?.localization
                                ?.weightUnit ||
                            "lb",
                    },

                    taxConfig: {
                        enabled:
                            typeof data
                                ?.taxConfig
                                ?.enabled ===
                            "boolean"
                                ? data
                                    .taxConfig
                                    .enabled
                                : (
                                    typeof data
                                        ?.features
                                        ?.tax
                                        ?.enabled ===
                                    "boolean"
                                        ? data
                                            .features
                                            .tax
                                            .enabled
                                        : true
                                ),

                        defaultTaxId:
                            data
                                ?.taxConfig
                                ?.defaultTaxId ||
                            null,

                        taxes:
                            Array.isArray(
                                data
                                    ?.taxConfig
                                    ?.taxes
                            )
                                ? data
                                    .taxConfig
                                    .taxes
                                    .map(
                                        (
                                            tax
                                        ) => ({
                                            ...tax,

                                            ratePercent:
                                                Number(
                                                    tax
                                                        ?.ratePercent ??
                                                    0
                                                ),
                                        })
                                    )
                                : [],
                    },

                    serviceChargeConfig: {
                        enabled:
                            data
                                ?.features
                                ?.serviceCharges
                                ?.enabled ===
                            true,

                        charges:
                            Array.isArray(
                                data
                                    ?.features
                                    ?.serviceCharges
                                    ?.charges
                            )
                                ? data
                                    .features
                                    .serviceCharges
                                    .charges
                                    .map(
                                        (
                                            charge
                                        ) => ({
                                            ...charge,

                                            ratePercent:
                                                Number(
                                                    charge
                                                        ?.ratePercent ??
                                                    0
                                                ),
                                        })
                                    )
                                : [],
                    },

                    ecf: {
                        enabled:
                            !!ecfProfile
                                ?.enabled,

                        environment:
                            ecfProfile
                                ?.environment ||
                            "internal_sandbox",

                        certificationStatus:
                            ecfProfile
                                ?.certificationStatus ||
                            "not_started",

                        issuerRnc:
                            ecfProfile
                                ?.issuer
                                ?.rnc ||
                            "",

                        issuerLegalName:
                            ecfProfile
                                ?.issuer
                                ?.legalName ||
                            "",

                        certificateUploaded:
                            ecfProfile
                                ?.security
                                ?.certificateUploaded ===
                            true &&
                            ecfProfile
                                ?.security
                                ?.passwordConfigured ===
                            true &&
                            ecfProfile
                                ?.certificate
                                ?.isActive ===
                            true,

                        documentTypes:
                            buildDefaultEcfDocumentTypes(
                                ecfProfile
                                    ?.documentTypes ||
                                {}
                            ),
                    },

                    features: {
                        taxEnabled:
                            typeof data
                                ?.taxConfig
                                ?.enabled ===
                            "boolean"
                                ? data
                                    .taxConfig
                                    .enabled
                                : (
                                    typeof data
                                        ?.features
                                        ?.tax
                                        ?.enabled ===
                                    "boolean"
                                        ? data
                                            .features
                                            .tax
                                            .enabled
                                        : true
                                ),

                        tipEnabled:
                            typeof data
                                ?.features
                                ?.tip
                                ?.enabled ===
                            "boolean"
                                ? data
                                    .features
                                    .tip
                                    .enabled
                                : true,

                        discountEnabled:
                            typeof data
                                ?.features
                                ?.discount
                                ?.enabled ===
                            "boolean"
                                ? data
                                    .features
                                    .discount
                                    .enabled
                                : true,

                        pedidosYaEnabled:
                            !!data
                                ?.features
                                ?.orderSources
                                ?.pedidosYa
                                ?.enabled,

                        uberEatsEnabled:
                            !!data
                                ?.features
                                ?.orderSources
                                ?.uberEats
                                ?.enabled,

                        pedidosYaCommissionPct:
                            Math.round(
                                Number(
                                    data
                                        ?.features
                                        ?.orderSources
                                        ?.pedidosYa
                                        ?.commissionRate ??
                                    0.26
                                ) *
                                100
                            ),

                        uberEatsCommissionPct:
                            Math.round(
                                Number(
                                    data
                                        ?.features
                                        ?.orderSources
                                        ?.uberEats
                                        ?.commissionRate ??
                                    0.22
                                ) *
                                100
                            ),

                        deliveryEnabled:
                            !!data
                                ?.features
                                ?.orderSources
                                ?.delivery
                                ?.enabled,

                        preInvoiceEnabled:
                            !!data
                                ?.features
                                ?.preInvoice
                                ?.enabled,

                        chargeMode:
                            String(
                                data
                                    ?.features
                                    ?.checkout
                                    ?.chargeMode ||
                                "AT_COMPLETE"
                            ),
                    },

                    fiscalEnabled:
                        canUseFiscal
                            ? !!data
                                ?.fiscal
                                ?.enabled
                            : false,

                    B01: {
                        active:
                            data
                                ?.fiscal
                                ?.ncfConfig
                                ?.B01
                                ?.active !==
                            false,

                        start:
                            b01.start ??
                            1,

                        current:
                            b01.current ??
                            1,

                        max:
                            b01.max ??
                            0,

                        expiresAt:
                            asDateInputValue(
                                b01.expiresAt
                            ),
                    },

                    B02: {
                        active:
                            data
                                ?.fiscal
                                ?.ncfConfig
                                ?.B02
                                ?.active !==
                            false,

                        start:
                            b02.start ??
                            1,

                        current:
                            b02.current ??
                            1,

                        max:
                            b02.max ??
                            0,

                        expiresAt:
                            asDateInputValue(
                                b02.expiresAt
                            ),
                    },
                };
            },
            [
                data,
                canUseFiscal,
                ecfProfile,
            ]
        );

    const [
        form,
        setForm,
    ] =
        useState(null);

    const [
        logoFile,
        setLogoFile,
    ] =
        useState(null);

    const [
        logoUploading,
        setLogoUploading,
    ] =
        useState(false);

    /*
     * ==========================================
     * SINCRONIZAR FORM
     * ==========================================
     */

    useEffect(
        () => {
            if (
                !data
            ) {
                return;
            }

            setForm(
                initial
            );
        },
        [
            data,
            initial,
        ]
    );

    /*
     * ==========================================
     * AUTO OCULTAR MENSAJE
     * ==========================================
     */

    useEffect(
        () => {
            if (
                msg
            ) {
                const timer =
                    setTimeout(
                        () =>
                            setMsg(
                                null
                            ),
                        5000
                    );

                return () =>
                    clearTimeout(
                        timer
                    );
            }
        },
        [
            msg,
        ]
    );

    /*
     * ==========================================
     * SUBIR LOGO
     * ==========================================
     */

    const uploadBusinessLogo =
        async () => {
            if (
                !logoFile
            ) {
                enqueueSnackbar(
                    t(
                        "fiscalConfig.logo.selectFirst"
                    ),
                    {
                        variant:
                            "warning",
                    }
                );

                return;
            }

            setLogoUploading(
                true
            );

            try {
                const fd =
                    new FormData();

                fd.append(
                    "logo",
                    logoFile
                );

                const res =
                    await api.post(
                        "/api/admin/tenant-logo",
                        fd
                    );

                if (
                    !res.data
                        ?.success
                ) {
                    throw new Error(
                        res.data
                            ?.message ||
                        t(
                            "fiscalConfig.logo.uploadFailed"
                        )
                    );
                }

                setLogoFile(
                    null
                );

                await qc.invalidateQueries(
                    {
                        queryKey: [
                            "admin-fiscal-config",
                        ],
                    }
                );

                enqueueSnackbar(
                    t(
                        "fiscalConfig.logo.uploadSuccess"
                    ),
                    {
                        variant:
                            "success",
                    }
                );

            } catch (
                error
                ) {
                const message =
                    error
                        ?.response
                        ?.data
                        ?.message ||
                    error
                        ?.message ||
                    t(
                        "fiscalConfig.logo.uploadError"
                    );

                enqueueSnackbar(
                    message,
                    {
                        variant:
                            "error",
                    }
                );

            } finally {
                setLogoUploading(
                    false
                );
            }
        };

    /*
     * ==========================================
     * ELIMINAR LOGO
     * ==========================================
     */

    const deleteBusinessLogo =
        async () => {
            setLogoUploading(
                true
            );

            try {
                const res =
                    await api.delete(
                        "/api/admin/tenant-logo"
                    );

                if (
                    !res.data
                        ?.success
                ) {
                    throw new Error(
                        res.data
                            ?.message ||
                        t(
                            "fiscalConfig.logo.deleteFailed"
                        )
                    );
                }

                setLogoFile(
                    null
                );

                await qc.invalidateQueries(
                    {
                        queryKey: [
                            "admin-fiscal-config",
                        ],
                    }
                );

                enqueueSnackbar(
                    t(
                        "fiscalConfig.logo.deleteSuccess"
                    ),
                    {
                        variant:
                            "success",
                    }
                );

            } catch (
                error
                ) {
                const message =
                    error
                        ?.response
                        ?.data
                        ?.message ||
                    error
                        ?.message ||
                    t(
                        "fiscalConfig.logo.deleteError"
                    );

                enqueueSnackbar(
                    message,
                    {
                        variant:
                            "error",
                    }
                );

            } finally {
                setLogoUploading(
                    false
                );
            }
        };

    /*
     * ==========================================
     * LOADING
     * ==========================================
     */

    if (
        isLoading ||
        (
            view ===
            "ecf" &&
            isLoadingEcfProfile
        ) ||
        !form
    ) {
        return (
            <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f6b100] mx-auto" />

                <p className="mt-2">
                    {t(
                        "fiscalConfig.loading"
                    )}
                </p>
            </div>
        );
    }

    /*
     * ==========================================
     * ERROR
     * ==========================================
     */

    if (
        isError
    ) {
        return (
            <div className="text-center py-8 text-red-400">
                {t(
                    "fiscalConfig.loadError"
                )}
            </div>
        );
    }

    /*
     * ==========================================
     * GUARDAR
     * ==========================================
     */

    const save =
        async () => {
            setSaving(
                true
            );

            setMsg(
                null
            );

            try {
                const payload =
                    {};

                /*
                 * ========================
                 * REGIONAL
                 * ========================
                 */

                if (
                    show(
                        "regional"
                    )
                ) {
                    payload.localization =
                        {
                            countryCode:
                            form
                                .localization
                                .countryCode,

                            language:
                            form
                                .localization
                                .language,

                            locale:
                            form
                                .localization
                                .locale,

                            currency:
                            form
                                .localization
                                .currency,

                            timezone:
                            form
                                .localization
                                .timezone,

                            dateFormat:
                            form
                                .localization
                                .dateFormat,

                            timeFormat:
                            form
                                .localization
                                .timeFormat,

                            measurementSystem:
                            form
                                .localization
                                .measurementSystem,

                            weightUnit:
                            form
                                .localization
                                .weightUnit,
                        };
                }

                /*
                 * ========================
                 * IMPUESTOS
                 * ========================
                 */

                if (
                    show(
                        "taxes"
                    )
                ) {
                    payload.taxConfig =
                        {
                            enabled:
                                !!form
                                    .taxConfig
                                    .enabled,

                            defaultTaxId:
                                form
                                    .taxConfig
                                    .defaultTaxId ||
                                null,

                            taxes:
                                (
                                    form
                                        .taxConfig
                                        .taxes ||
                                    []
                                ).map(
                                    (
                                        tax
                                    ) => ({
                                        id:
                                        tax.id,

                                        name:
                                            String(
                                                tax.name ||
                                                ""
                                            ).trim(),

                                        code:
                                            String(
                                                tax.code ||
                                                ""
                                            )
                                                .trim()
                                                .toUpperCase(),

                                        ratePercent:
                                            Number(
                                                tax
                                                    .ratePercent ||
                                                0
                                            ),

                                        active:
                                            tax.active !==
                                            false,

                                        includedInPrice:
                                            tax
                                                .includedInPrice ===
                                            true,

                                        appliesToDeliveryFee:
                                            tax
                                                .appliesToDeliveryFee ===
                                            true,
                                    })
                                ),
                        };
                }

                /*
                 * ========================
                 * SERVICE CHARGES
                 * ========================
                 */

                if (
                    show(
                        "service-charges"
                    )
                ) {
                    payload.features =
                        {
                            serviceCharges:
                                {
                                    enabled:
                                        !!form
                                            .serviceChargeConfig
                                            .enabled,

                                    charges:
                                        (
                                            form
                                                .serviceChargeConfig
                                                .charges ||
                                            []
                                        ).map(
                                            (
                                                charge
                                            ) => ({
                                                id:
                                                charge.id,

                                                name:
                                                    String(
                                                        charge.name ||
                                                        ""
                                                    ).trim(),

                                                code:
                                                    String(
                                                        charge.code ||
                                                        ""
                                                    )
                                                        .trim()
                                                        .toUpperCase(),

                                                ratePercent:
                                                    Number(
                                                        charge
                                                            .ratePercent ||
                                                        0
                                                    ),

                                                active:
                                                    charge.active !==
                                                    false,

                                                calculationBase:
                                                    charge
                                                        .calculationBase ===
                                                    "AFTER_TAX"
                                                        ? "AFTER_TAX"
                                                        : "NET",

                                                appliesToDeliveryOrders:
                                                    charge
                                                        .appliesToDeliveryOrders !==
                                                    false,

                                                appliesToDeliveryFee:
                                                    charge
                                                        .appliesToDeliveryFee ===
                                                    true,

                                                addToTotal:
                                                    charge
                                                        .addToTotal !==
                                                    false,
                                            })
                                        ),
                                },
                        };
                }

                /*
                 * ========================
                 * FACTURACIÓN GENERAL
                 * ========================
                 */

                if (
                    show(
                        "billing"
                    )
                ) {
                    payload.features =
                        {
                            tip: {
                                enabled:
                                    !!form
                                        .features
                                        .tipEnabled,
                            },

                            discount: {
                                enabled:
                                    !!form
                                        .features
                                        .discountEnabled,
                            },

                            preInvoice: {
                                enabled:
                                    !!form
                                        .features
                                        .preInvoiceEnabled,
                            },

                            checkout: {
                                chargeMode:
                                    form
                                        .features
                                        .chargeMode ||
                                    "AT_COMPLETE",
                            },
                        };
                }

                /*
                 * ========================
                 * DELIVERY
                 * ========================
                 */

                if (
                    show(
                        "delivery"
                    )
                ) {
                    payload.features =
                        {
                            orderSources:
                                {
                                    pedidosYa:
                                        {
                                            enabled:
                                                !!form
                                                    .features
                                                    .pedidosYaEnabled,

                                            commissionRate:
                                                Number(
                                                    form
                                                        .features
                                                        .pedidosYaCommissionPct ||
                                                    0
                                                ) /
                                                100,
                                        },

                                    uberEats:
                                        {
                                            enabled:
                                                !!form
                                                    .features
                                                    .uberEatsEnabled,

                                            commissionRate:
                                                Number(
                                                    form
                                                        .features
                                                        .uberEatsCommissionPct ||
                                                    0
                                                ) /
                                                100,
                                        },

                                    delivery:
                                        {
                                            enabled:
                                                !!form
                                                    .features
                                                    .deliveryEnabled,
                                        },
                                },
                        };
                }

                /*
                 * ========================
                 * NCF RD
                 * ========================
                 */

                if (
                    show(
                        "ncf"
                    ) &&
                    canUseFiscal
                ) {
                    payload.fiscalEnabled =
                        !!form
                            .fiscalEnabled;

                    payload.ncfConfig =
                        {
                            B01: {
                                active:
                                    !!form
                                        .B01
                                        .active,

                                start:
                                    Number(
                                        form
                                            .B01
                                            .start
                                    ),

                                current:
                                    Number(
                                        form
                                            .B01
                                            .current
                                    ),

                                max:
                                    Number(
                                        form
                                            .B01
                                            .max
                                    ),

                                expiresAt:
                                    form
                                        .B01
                                        .expiresAt ||
                                    null,
                            },

                            B02: {
                                active:
                                    !!form
                                        .B02
                                        .active,

                                start:
                                    Number(
                                        form
                                            .B02
                                            .start
                                    ),

                                current:
                                    Number(
                                        form
                                            .B02
                                            .current
                                    ),

                                max:
                                    Number(
                                        form
                                            .B02
                                            .max
                                    ),

                                expiresAt:
                                    form
                                        .B02
                                        .expiresAt ||
                                    null,
                            },
                        };
                }

                /*
                 * ==========================================
                 * GUARDAR CONFIGURACIÓN NORMAL
                 * ==========================================
                 */

                if (
                    Object.keys(
                        payload
                    ).length >
                    0
                ) {
                    const res =
                        await api.patch(
                            "/api/admin/fiscal-config",
                            payload
                        );

                    if (
                        !res.data
                            ?.success
                    ) {
                        throw new Error(
                            res.data
                                ?.message ||
                            t(
                                "fiscalConfig.messages.saveFailed"
                            )
                        );
                    }
                }

                /*
                 * ==========================================
                 * e-CF / DGII
                 * ==========================================
                 */

                if (
                    show(
                        "ecf"
                    )
                ) {
                    const documentTypes =
                        buildEcfDocumentTypesPayload(
                            form.ecf
                        );

                    const ecfPayload =
                        {
                            enabled:
                                !!form
                                    .ecf
                                    ?.enabled,

                            environment:
                                form
                                    .ecf
                                    ?.environment ||
                                "internal_sandbox",

                            syncIssuerFromTenant:
                                true,

                            documentTypes,
                        };

                    if (secondaryEcfBranch) {
                        throw new Error("La configuración global e-CF solo se modifica desde la sucursal principal.");
                    }
                    const ecfRes =
                        await api.patch(
                            "/api/admin/ecf/profile",
                            ecfPayload
                        );

                    if (
                        !ecfRes.data
                            ?.success
                    ) {
                        throw new Error(
                            ecfRes.data
                                ?.message ||
                            t(
                                "fiscalConfig.messages.ecfSaveFailed"
                            )
                        );
                    }
                }

                /*
                 * ==========================================
                 * INVALIDAR QUERIES
                 * ==========================================
                 */

                await qc.invalidateQueries(
                    {
                        queryKey: [
                            "admin-fiscal-config",
                        ],
                    }
                );

                if (
                    show(
                        "ecf"
                    )
                ) {
                    await qc.invalidateQueries(
                        {
                            queryKey: [
                                "admin-ecf-profile",
                            ],
                        }
                    );

                    await qc.invalidateQueries(
                        {
                            queryKey: [
                                "tenant-ecf-status",
                            ],
                        }
                    );
                }

                setMsg({
                    type:
                        "ok",

                    text:
                        t(
                            "fiscalConfig.messages.saveSuccess"
                        ),
                });

                enqueueSnackbar(
                    t(
                        "fiscalConfig.messages.saveSuccessSnackbar"
                    ),
                    {
                        variant:
                            "success",
                    }
                );

            } catch (
                error
                ) {
                const errorMsg =
                    error
                        ?.response
                        ?.data
                        ?.message ||
                    error
                        ?.message ||
                    t(
                        "fiscalConfig.messages.saveError"
                    );

                setMsg({
                    type:
                        "err",

                    text:
                    errorMsg,
                });

                enqueueSnackbar(
                    errorMsg,
                    {
                        variant:
                            "error",
                    }
                );

            } finally {
                setSaving(
                    false
                );
            }
        };

    return (
        <div>

            {/* ======================================
                HEADER
            ====================================== */}

            <div className="flex items-center justify-between mb-6">

                <div>

                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">

                        <Receipt className="w-6 h-6 text-[#f6b100]" />

                        {t(
                            viewMeta.titleKey
                        )}

                    </h2>

                    <p className="text-sm text-gray-400 mt-1">

                        {t(
                            viewMeta.descriptionKey
                        )}

                    </p>

                </div>

            </div>

            {/* ======================================
                MENSAJE DE ESTADO
            ====================================== */}

            {msg && (

                <div
                    className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
                        msg.type ===
                        "ok"
                            ? "border-green-500/40 bg-green-500/10 text-green-200"
                            : "border-red-500/40 bg-red-500/10 text-red-200"
                    }`}
                >

                    {msg.type ===
                    "ok" ? (

                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />

                    ) : (

                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />

                    )}

                    <p className="text-sm font-medium">
                        {
                            msg.text
                        }
                    </p>

                </div>

            )}

            {/* ======================================
                REGIONAL
            ====================================== */}

            {show(
                "regional"
            ) && (

                <div className="mb-6">

                    <RegionalTaxConfig
                        form={form}
                        setForm={
                            setForm
                        }
                        inputCls={
                            inputCls
                        }
                        Section={
                            Section
                        }
                        Switch={
                            Switch
                        }
                        view="regional"
                    />

                </div>

            )}

            {/* ======================================
                IMPUESTOS
            ====================================== */}

            {show(
                "taxes"
            ) && (

                <div className="mb-6">

                    <RegionalTaxConfig
                        form={form}
                        setForm={
                            setForm
                        }
                        inputCls={
                            inputCls
                        }
                        Section={
                            Section
                        }
                        Switch={
                            Switch
                        }
                        view="taxes"
                    />

                </div>

            )}

            {/* ======================================
                CARGOS
            ====================================== */}

            {show(
                "service-charges"
            ) && (

                <div className="mb-6">

                    <ServiceChargeConfig
                        form={form}
                        setForm={
                            setForm
                        }
                        inputCls={
                            inputCls
                        }
                        Section={
                            Section
                        }
                        Switch={
                            Switch
                        }
                    />

                </div>

            )}

            {/* ======================================
                FACTURACIÓN GENERAL
            ====================================== */}

            {show(
                "billing"
            ) && (

                <BillingGeneralConfig
                    form={form}
                    setForm={
                        setForm
                    }
                    data={
                        data
                    }
                    inputCls={
                        inputCls
                    }
                    Section={
                        Section
                    }
                    ToggleRow={
                        ToggleRow
                    }
                    logoFile={
                        logoFile
                    }
                    setLogoFile={
                        setLogoFile
                    }
                    logoUploading={
                        logoUploading
                    }
                    uploadBusinessLogo={
                        uploadBusinessLogo
                    }
                    deleteBusinessLogo={
                        deleteBusinessLogo
                    }
                />

            )}

            {/* ======================================
                DELIVERY
            ====================================== */}

            {show(
                "delivery"
            ) && (

                <DeliveryConfig
                    form={form}
                    setForm={
                        setForm
                    }
                    inputCls={
                        inputCls
                    }
                    Section={
                        Section
                    }
                    ToggleRow={
                        ToggleRow
                    }
                />

            )}

            {/* ======================================
                NCF RD
            ====================================== */}

            {show(
                "ncf"
            ) && (

                <DominicanNcfConfig
                    form={form}
                    setForm={
                        setForm
                    }
                    inputCls={
                        inputCls
                    }
                    Section={
                        Section
                    }
                    Switch={
                        Switch
                    }
                    ToggleRow={
                        ToggleRow
                    }
                    canUseFiscal={
                        canUseFiscal
                    }
                />

            )}

            {/* ======================================
                E-CF
            ====================================== */}

            {show(
                "ecf"
            ) && (

                secondaryEcfBranch ? (
                    <section className="rounded-2xl border border-amber-600/50 bg-[#17140c] p-5 space-y-3 text-sm text-gray-200">
                        <h3 className="text-lg font-semibold text-amber-300">e-CF de esta sucursal — solo lectura</h3>
                        <p>El RNC, certificado, firma digital, ambiente y secuencias pertenecen al contribuyente y se administran desde la sucursal principal.</p>
                        <p><strong>Sucursal preparada:</strong> {ecfProfile?.branch?.prepared ? "Sí" : "No"}</p>
                        <p><strong>Emisor fiscal:</strong> {ecfProfile?.issuer?.legalName || "Pendiente"} · {ecfProfile?.issuer?.rnc || "Sin RNC"}</p>
                        <p><strong>Entorno compartido:</strong> {ecfProfile?.environment || "No configurado"}</p>
                        <p><strong>Certificación:</strong> {ecfProfile?.certificationStatus || "Pendiente"}</p>
                        <p className="text-amber-300">En sucursales secundarias solo se permite emisión de prueba en sandbox interno cuando estén preparadas y se cumplan los permisos y controles fiscales. No se permite editar ni subir certificados aquí.</p>
                    </section>
                ) : <EcfConfig
                    form={form}
                    setForm={
                        setForm
                    }
                    inputCls={
                        inputCls
                    }
                    Section={
                        Section
                    }
                    Switch={
                        Switch
                    }
                    ToggleRow={
                        ToggleRow
                    }
                    ecfProfile={
                        ecfProfile
                    }
                    ecfRuntimeStatus={
                        ecfRuntimeStatus
                    }
                />

            )}

            {/* ======================================
                GUARDAR
            ====================================== */}

            {!(secondaryEcfBranch && view === "ecf") && <div className="flex justify-end">

                <button
                    type="button"
                    onClick={
                        save
                    }
                    disabled={
                        saving
                    }
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f6b100] text-black font-semibold hover:bg-[#ffd633] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40"
                >

                    <Save className="w-4 h-4" />

                    {saving
                        ? t(
                            "fiscalConfig.actions.saving"
                        )
                        : t(
                            "fiscalConfig.actions.saveChanges"
                        )
                    }

                </button>

            </div>}

        </div>
    );
}