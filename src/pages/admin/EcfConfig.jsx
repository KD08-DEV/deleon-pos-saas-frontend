import React, {
    useState,
} from "react";
import { useTranslation } from "react-i18next";

import {
    AlertCircle,
    CheckCircle2,
    Info,
    Receipt,
} from "lucide-react";

import {
    useQueryClient,
} from "@tanstack/react-query";

import {
    enqueueSnackbar,
} from "notistack";

import api from "../../lib/api";


export const ECF_DOCUMENT_TYPE_GROUPS = [
    {
        title: "Ventas normales",
        description:
            "Tipos usados para ventas directas del negocio.",

        items: [
            {
                key: "e31",
                code: "31",
                label: "Crédito Fiscal",
                description:
                    "Para clientes con RNC que solicitan crédito fiscal.",
                defaultEnabled: true,
            },

            {
                key: "e32",
                code: "32",
                label: "Consumo",
                description:
                    "Para consumidor final.",
                defaultEnabled: true,
            },
        ],
    },

    {
        title: "Ajustes",
        description:
            "Tipos usados para corregir o ajustar comprobantes ya emitidos.",

        items: [
            {
                key: "e33",
                code: "33",
                label: "Nota de Débito",
                description:
                    "Para aumentar o ajustar montos de un e-CF previo.",
                defaultEnabled: true,
            },

            {
                key: "e34",
                code: "34",
                label: "Nota de Crédito",
                description:
                    "Para devoluciones, anulaciones o descuentos sobre un e-CF previo.",
                defaultEnabled: true,
            },
        ],
    },

    {
        title:
            "Comprobantes especiales",

        description:
            "Activa solo si el contribuyente está autorizado o realmente los necesita.",

        items: [
            {
                key: "e41",
                code: "41",
                label: "Compras",
                description:
                    "Comprobante electrónico de compras.",
                defaultEnabled: false,
            },

            {
                key: "e43",
                code: "43",
                label: "Gastos Menores",
                description:
                    "Para gastos menores relacionados al trabajo.",
                defaultEnabled: false,
            },

            {
                key: "e44",
                code: "44",
                label:
                    "Regímenes Especiales",
                description:
                    "Para contribuyentes acogidos a regímenes especiales.",
                defaultEnabled: false,
            },

            {
                key: "e45",
                code: "45",
                label:
                    "Gubernamental",
                description:
                    "Para ventas al Estado o entidades gubernamentales.",
                defaultEnabled: false,
            },

            {
                key: "e46",
                code: "46",
                label:
                    "Exportación",
                description:
                    "Para operaciones de exportación.",
                defaultEnabled: false,
            },

            {
                key: "e47",
                code: "47",
                label:
                    "Pagos al Exterior",
                description:
                    "Para pagos realizados al exterior.",
                defaultEnabled: false,
            },
        ],
    },
];


function toPositiveIntegerOrNull(
    value
) {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const number =
        Number(
            value
        );

    if (
        !Number.isInteger(
            number
        ) ||
        number <= 0
    ) {
        return null;
    }

    return number;
}


export function buildDefaultEcfDocumentTypes(
    profileDocumentTypes = {}
) {
    const out = {};

    for (
        const group
        of ECF_DOCUMENT_TYPE_GROUPS
        ) {
        for (
            const item
            of group.items
            ) {
            const current =
                profileDocumentTypes
                    ?.[item.key] ||
                {};

            out[
                item.key
                ] = {
                enabled:
                    typeof current
                        ?.enabled ===
                    "boolean"
                        ? current.enabled
                        : item.defaultEnabled,

                sandboxNextSequence:
                    Number.isInteger(
                        Number(
                            current
                                ?.sandboxNextSequence
                        )
                    ) &&
                    Number(
                        current
                            ?.sandboxNextSequence
                    ) > 0
                        ? Number(
                            current
                                .sandboxNextSequence
                        )
                        : 1,

                certificationNextSequence:
                    Number.isInteger(
                        Number(
                            current
                                ?.certificationNextSequence
                        )
                    ) &&
                    Number(
                        current
                            ?.certificationNextSequence
                    ) > 0
                        ? Number(
                            current
                                .certificationNextSequence
                        )
                        : 1,

                nextSequence:
                    Number.isInteger(
                        Number(
                            current
                                ?.nextSequence
                        )
                    ) &&
                    Number(
                        current
                            ?.nextSequence
                    ) > 0
                        ? Number(
                            current
                                .nextSequence
                        )
                        : 1,

                authorizedFrom:
                    Number.isInteger(
                        Number(
                            current
                                ?.authorizedFrom
                        )
                    ) &&
                    Number(
                        current
                            ?.authorizedFrom
                    ) > 0
                        ? Number(
                            current
                                .authorizedFrom
                        )
                        : "",

                authorizedTo:
                    Number.isInteger(
                        Number(
                            current
                                ?.authorizedTo
                        )
                    ) &&
                    Number(
                        current
                            ?.authorizedTo
                    ) > 0
                        ? Number(
                            current
                                .authorizedTo
                        )
                        : "",

                authorizedAt:
                    normalizeDateInput(
                        current
                            ?.authorizedAt
                    ),

                validUntil:
                    normalizeDateInput(
                        current
                            ?.validUntil
                    ),
            };
        }
    }

    return out;
}


function normalizeDateInput(
    value
) {
    if (
        !value
    ) {
        return "";
    }

    const raw =
        String(
            value
        );

    if (
        /^\d{4}-\d{2}-\d{2}/.test(
            raw
        )
    ) {
        return raw.slice(
            0,
            10
        );
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return date
        .toISOString()
        .slice(
            0,
            10
        );
}


function getEcfRangeInfo(
    typeConfig = {}
) {
    const from =
        toPositiveIntegerOrNull(
            typeConfig.authorizedFrom
        );

    const to =
        toPositiveIntegerOrNull(
            typeConfig.authorizedTo
        );

    const next =
        toPositiveIntegerOrNull(
            typeConfig.nextSequence
        );

    const hasRange =
        from !== null &&
        to !== null &&
        from <= to;

    const total =
        hasRange
            ? (
                to -
                from +
                1
            )
            : 0;

    const used =
        hasRange &&
        next !== null
            ? Math.max(
                0,
                Math.min(
                    total,
                    next -
                    from
                )
            )
            : 0;

    const remaining =
        hasRange &&
        next !== null
            ? Math.max(
                0,
                to -
                next +
                1
            )
            : total;

    const percentage =
        total > 0
            ? Number(
                (
                    (
                        used /
                        total
                    ) *
                    100
                ).toFixed(
                    1
                )
            )
            : 0;

    let isExpired =
        false;

    let daysUntilExpiry =
        null;

    if (
        typeConfig.validUntil
    ) {
        const validUntil =
            new Date(
                `${typeConfig.validUntil}T23:59:59`
            );

        if (
            !Number.isNaN(
                validUntil.getTime()
            )
        ) {
            const now =
                new Date();

            isExpired =
                validUntil.getTime() <
                now.getTime();

            daysUntilExpiry =
                Math.ceil(
                    (
                        validUntil.getTime() -
                        now.getTime()
                    ) /
                    (
                        1000 *
                        60 *
                        60 *
                        24
                    )
                );
        }
    }

    return {
        from,
        to,
        next,

        hasRange,
        total,
        used,
        remaining,
        percentage,
        isExpired,
        daysUntilExpiry,

        isExhausted:
            hasRange &&
            next !== null &&
            next > to,
    };
}


function formatENcfPreview(
    typeCode,
    sequence
) {
    const value =
        toPositiveIntegerOrNull(
            sequence
        );

    if (
        !value ||
        value >
        9999999999
    ) {
        return "Pendiente";
    }

    return `E${typeCode}${String(
        value
    ).padStart(
        10,
        "0"
    )}`;
}


function getEnvironmentSequence(
    typeConfig = {},
    environment =
    "internal_sandbox"
) {
    if (
        environment ===
        "internal_sandbox"
    ) {
        return (
            toPositiveIntegerOrNull(
                typeConfig
                    .sandboxNextSequence
            ) ||
            1
        );
    }

    if (
        environment ===
        "dgii_certification"
    ) {
        return (
            toPositiveIntegerOrNull(
                typeConfig
                    .certificationNextSequence
            ) ||
            1
        );
    }

    return (
        toPositiveIntegerOrNull(
            typeConfig
                .nextSequence
        ) ||
        1
    );
}


export function buildEcfDocumentTypesPayload(
    ecf = {}
) {
    const payload = {};

    const isProduction =
        ecf.environment ===
        "dgii_production";

    for (
        const group
        of ECF_DOCUMENT_TYPE_GROUPS
        ) {
        for (
            const item
            of group.items
            ) {
            const typeConfig =
                ecf
                    ?.documentTypes
                    ?.[item.key] ||
                {};

            const enabled =
                typeConfig.enabled ===
                true;

            const authorizedFrom =
                toPositiveIntegerOrNull(
                    typeConfig
                        .authorizedFrom
                );

            const authorizedTo =
                toPositiveIntegerOrNull(
                    typeConfig
                        .authorizedTo
                );

            if (
                (
                    authorizedFrom ===
                    null
                ) !==
                (
                    authorizedTo ===
                    null
                )
            ) {
                throw new Error(
                    `Completa el rango desde y hasta para ${item.key.toUpperCase()}.`
                );
            }

            if (
                authorizedFrom !==
                null &&
                authorizedTo !==
                null &&
                authorizedFrom >
                authorizedTo
            ) {
                throw new Error(
                    `El rango de ${item.key.toUpperCase()} es inválido: el inicio no puede ser mayor que el final.`
                );
            }

            if (
                isProduction &&
                enabled &&
                (
                    authorizedFrom ===
                    null ||
                    authorizedTo ===
                    null
                )
            ) {
                throw new Error(
                    `Debes configurar el rango autorizado por DGII para ${item.key.toUpperCase()} antes de usar Producción.`
                );
            }

            payload[
                item.key
                ] = {
                enabled,

                authorizedFrom,

                authorizedTo,

                authorizedAt:
                    typeConfig
                        .authorizedAt ||
                    null,

                validUntil:
                    typeConfig
                        .validUntil ||
                    null,
            };
        }
    }

    return payload;
}


export default function EcfConfig({
                                      form,
                                      setForm,

                                      inputCls,
                                      Section,
                                      Switch,
                                      ToggleRow,

                                      ecfProfile,
                                      ecfRuntimeStatus,
                                  }) {
    const { t } =
        useTranslation();

    const qc =
        useQueryClient();

    const [
        certFile,
        setCertFile,
    ] =
        useState(
            null
        );

    const [
        certPassword,
        setCertPassword,
    ] =
        useState(
            ""
        );

    const [
        uploadingCert,
        setUploadingCert,
    ] =
        useState(
            false
        );

    if (
        !form
    ) {
        return null;
    }


    const certificateReady =
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
        true;


    const certificateHasFile =
        Boolean(
            ecfProfile
                ?.certificate
                ?.fileName
        ) ||
        Boolean(
            ecfProfile
                ?.certificate
                ?.path
        );


    const certificateHasProblem =
        certificateHasFile &&
        !certificateReady;


    const certificateMissing =
        !certificateHasFile &&
        !certificateReady;


    const runtimeErrors =
        Array.isArray(
            ecfRuntimeStatus
                ?.errors
        )
            ? ecfRuntimeStatus
                .errors
            : [];


    const runtimeWarnings =
        Array.isArray(
            ecfRuntimeStatus
                ?.warnings
        )
            ? ecfRuntimeStatus
                .warnings
            : [];


    const ecfOperationalReady =
        ecfRuntimeStatus
            ?.canIssue ===
        true;


    const currentEnvironment =
        ecfRuntimeStatus
            ?.environment ||
        form.ecf
            ?.environment ||
        "internal_sandbox";


    const currentCertificationStatus =
        ecfRuntimeStatus
            ?.certificationStatus ||
        form.ecf
            ?.certificationStatus ||
        "not_started";


    const phaseLabel =
        (() => {
                if (
                    form.ecf
                        ?.enabled !==
                    true
                ) {
                    return "Inactivo";
                }

                if (
                    currentEnvironment ===
                    "internal_sandbox"
                ) {
                    return ecfOperationalReady
                        ? "Sandbox listo"
                        : "Sandbox requiere configuración";
                }

                if (
                    currentEnvironment ===
                    "dgii_certification"
                ) {
                    if (
                        currentCertificationStatus ===
                        "certified"
                    ) {
                        return "Certificado DGII";
                    }

                    return ecfOperationalReady
                        ? "En certificación"
                        : "Certificación bloqueada";
                }

                if (
                    currentEnvironment ===
                    "dgii_production"
                ) {
                    return ecfOperationalReady
                        ? "Producción"
                        : "Producción bloqueada";
                }

                return "Configurando";
        })();


    const setEcf = (
        key,
        value
    ) => {
        setForm(
            (
                current
            ) => ({
                ...current,

                ecf: {
                    ...current.ecf,

                    [key]:
                    value,
                },
            })
        );
    };


    const setDocumentTypeField = (
        typeKey,
        field,
        value
    ) => {
        setForm(
            (
                current
            ) => ({
                ...current,

                ecf: {
                    ...current.ecf,

                    documentTypes: {
                        ...(
                            current
                                .ecf
                                ?.documentTypes ||
                            {}
                        ),

                        [typeKey]: {
                            ...(
                                current
                                    .ecf
                                    ?.documentTypes
                                    ?.[typeKey] ||
                                {}
                            ),

                            [field]:
                            value,
                        },
                    },
                },
            })
        );
    };


    const formatCertificateDate =
        (
            value
        ) => {
            if (
                !value
            ) {
                return null;
            }

            const date =
                new Date(
                    value
                );

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return null;
            }

            return date
                .toLocaleDateString(
                    "es-DO",
                    {
                        year:
                            "numeric",

                        month:
                            "2-digit",

                        day:
                            "2-digit",
                    }
                );
        };


    const uploadCertificate =
        async () => {
            if (
                !certFile
            ) {
                enqueueSnackbar(
                    t(
                        "ecfConfig.certificate.messages.selectFile"
                    ),
                    {
                        variant:
                            "warning",
                    }
                );

                return;
            }

            if (
                !certPassword
                    .trim()
            ) {
                enqueueSnackbar(
                    t(
                        "ecfConfig.certificate.messages.passwordRequired"
                    ),
                    {
                        variant:
                            "warning",
                    }
                );

                return;
            }

            try {
                setUploadingCert(
                    true
                );

                const formData =
                    new FormData();

                formData.append(
                    "certificate",
                    certFile
                );

                formData.append(
                    "password",
                    certPassword
                        .trim()
                );

                const response =
                    await api.post(
                        "/api/admin/ecf/profile/certificate",
                        formData,
                        {
                            headers: {
                                "Content-Type":
                                    "multipart/form-data",
                            },
                        }
                    );

                if (
                    !response
                        .data
                        ?.success
                ) {
                    throw new Error(
                        response
                            .data
                            ?.message ||
                        t(
                            "ecfConfig.certificate.messages.uploadFailed"
                        )
                    );
                }

                const uploadedProfile =
                    response
                        .data
                        ?.data;

                const validated =
                    uploadedProfile
                        ?.security
                        ?.certificateUploaded ===
                    true &&
                    uploadedProfile
                        ?.security
                        ?.passwordConfigured ===
                    true &&
                    uploadedProfile
                        ?.certificate
                        ?.isActive ===
                    true;

                if (
                    !validated
                ) {
                    throw new Error(
                        "CERTIFICATE_NOT_VALIDATED"
                    );
                }

                setCertFile(
                    null
                );

                setCertPassword(
                    ""
                );

                await qc
                    .invalidateQueries({
                        queryKey: [
                            "admin-ecf-profile",
                        ],
                    });

                await qc
                    .invalidateQueries({
                        queryKey: [
                            "tenant-ecf-status",
                        ],
                    });

                enqueueSnackbar(
                    t(
                        "ecfConfig.certificate.messages.uploadSuccess"
                    ),
                    {
                        variant:
                            "success",
                    }
                );

            } catch (
                error
                ) {
                const backendMessage =
                    error
                        ?.response
                        ?.data
                        ?.message ||
                    error
                        ?.message ||
                    "ERROR_UPLOADING_CERTIFICATE";

                const messages = {
                    CERTIFICATE_PASSWORD_INVALID:
                        t(
                            "ecfConfig.certificate.errors.passwordInvalid"
                        ),

                    CERTIFICATE_FILE_INVALID:
                        t(
                            "ecfConfig.certificate.errors.fileInvalid"
                        ),

                    INVALID_CERTIFICATE_EXTENSION:
                        t(
                            "ecfConfig.certificate.errors.invalidExtension"
                        ),

                    CERTIFICATE_PASSWORD_REQUIRED:
                        t(
                            "ecfConfig.certificate.errors.passwordRequired"
                        ),

                    CERTIFICATE_FILE_REQUIRED:
                        t(
                            "ecfConfig.certificate.errors.fileRequired"
                        ),

                    CERTIFICATE_NOT_VALIDATED:
                        t(
                            "ecfConfig.certificate.errors.notValidated"
                        ),

                    CERTIFICATE_UPLOAD_FAILED:
                        t(
                            "ecfConfig.certificate.errors.storageFailed"
                        ),
                };

                enqueueSnackbar(
                    messages[
                        backendMessage
                        ] ||
                    backendMessage ||
                    t(
                        "ecfConfig.certificate.messages.uploadError"
                    ),
                    {
                        variant:
                            "error",
                    }
                );

            } finally {
                setUploadingCert(
                    false
                );
            }
        };


    return (
        <div className="space-y-6">

            <Section
                title="Facturación Electrónica e-CF"
                icon={
                    Receipt
                }
                description="Configura emisión electrónica, ambiente y certificado digital DGII."
            >

                <div className="space-y-4">
                    {ecfProfile?.issuerRncMismatch && (
                        <div role="alert" className="rounded-xl border border-sky-400/40 bg-sky-400/10 p-4 text-sm text-sky-100">
                            <strong>Atención: RNC del emisor diferente.</strong>
                            <p className="mt-1">Identificación Fiscal tiene {ecfProfile.configuredBusinessRnc}, pero el perfil e-CF conserva {ecfProfile?.issuer?.rnc}. Por seguridad no se modifica automáticamente un emisor ya configurado. Verifica el RNC y el certificado digital antes de sincronizar los datos de la empresa.</p>
                        </div>
                    )}
                    <ToggleRow
                        label="Activar e-CF"
                        desc="Muestra el botón de Emitir e-CF y habilita documentos electrónicos."
                        checked={
                            !!form
                                .ecf
                                ?.enabled
                        }
                        onChange={(
                            value
                        ) =>
                            setEcf(
                                "enabled",
                                value
                            )
                        }
                        icon={
                            Receipt
                        }
                    />


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-800/40">

                        <label>

                            <div className="text-xs text-gray-400 mb-1">
                                Ambiente e-CF
                            </div>

                            <select
                                className={
                                    inputCls
                                }
                                value={
                                    form
                                        .ecf
                                        ?.environment ||
                                    "internal_sandbox"
                                }
                                onChange={(
                                    event
                                ) =>
                                    setEcf(
                                        "environment",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >

                                <option value="internal_sandbox">
                                    Sandbox interno
                                </option>

                                <option value="dgii_certification">
                                    Certificación DGII
                                </option>

                                <option value="dgii_production">
                                    Producción DGII
                                </option>

                            </select>

                        </label>


                        <div>

                            <div className="text-xs text-gray-400 mb-1">
                                {t(
                                    "ecfConfig.status.current"
                                )}
                            </div>

                            <div
                                className={[
                                    "p-3 rounded-xl border text-sm font-medium",

                                    ecfOperationalReady
                                        ? "bg-green-500/10 border-green-500/30 text-green-300"
                                        : "bg-sky-500/10 border-sky-500/30 text-sky-200",
                                ].join(
                                    " "
                                )}
                            >
                                {
                                    phaseLabel
                                }
                            </div>

                        </div>

                    </div>


                    <div className="rounded-xl border border-gray-800/50 bg-[#1a1a1a]/60 p-4">

                        <div className="flex items-center justify-between gap-3 mb-3">

                            <p className="text-sm font-semibold text-white">
                                {t(
                                    "ecfConfig.status.ecfStatus"
                                )}
                            </p>

                            <span
                                className={[
                                    "text-[11px] px-2.5 py-1 rounded-full border",

                                    ecfOperationalReady
                                        ? "bg-green-500/10 border-green-500/30 text-green-300"
                                        : "bg-sky-500/10 border-sky-500/30 text-sky-200",
                                ].join(
                                    " "
                                )}
                            >
                                {
                                    phaseLabel
                                }
                            </span>

                        </div>


                        <div className="space-y-1.5 text-xs">

                            <p
                                className={
                                    ecfRuntimeStatus
                                        ?.issuerReady
                                        ? "text-green-300"
                                        : "text-sky-300"
                                }
                            >
                                {t(
                                    "ecfConfig.status.fiscalIssuer"
                                )}
                                :{" "}

                                {ecfRuntimeStatus
                                    ?.issuerReady
                                    ? t(
                                        "ecfConfig.status.configured"
                                    )
                                    : t(
                                        "ecfConfig.status.incomplete"
                                    )
                                }
                            </p>


                            <p
                                className={
                                    form
                                        .ecf
                                        ?.issuerRnc
                                        ? "text-green-300"
                                        : "text-sky-300"
                                }
                            >
                                RNC emisor:{" "}

                                {form
                                        .ecf
                                        ?.issuerRnc ||
                                    "Pendiente"
                                }
                            </p>


                            <p
                                className={
                                    form
                                        .ecf
                                        ?.issuerLegalName
                                        ? "text-green-300"
                                        : "text-sky-300"
                                }
                            >
                                Razón social:{" "}

                                {form
                                        .ecf
                                        ?.issuerLegalName ||
                                    "Pendiente"
                                }
                            </p>


                            {ecfRuntimeStatus
                                ?.certificateRequired ? (

                                <p
                                    className={
                                        ecfRuntimeStatus
                                            ?.certificateReady
                                            ? "text-green-300"
                                            : "text-sky-300"
                                    }
                                >
                                    {t(
                                        "ecfConfig.status.digitalCertificate"
                                    )}
                                    :{" "}

                                    {ecfRuntimeStatus
                                        ?.certificateReady
                                        ? t(
                                            "ecfConfig.status.ready"
                                        )
                                        : t(
                                            "ecfConfig.status.pendingOrInvalid"
                                        )
                                    }
                                </p>

                            ) : (

                                <p className="text-gray-400">
                                    {t(
                                        "ecfConfig.status.certificateNotRequiredSandbox"
                                    )}
                                </p>

                            )}


                            <p className="text-gray-300">

                                {t(
                                    "ecfConfig.status.certificationStatus"
                                )}
                                :{" "}

                                {
                                    currentCertificationStatus
                                }

                            </p>


                            <div className="rounded-lg border border-gray-700 bg-gray-950/40 p-3 text-xs space-y-1">
                                <p className="font-semibold text-gray-200">Autorización de producción (solo lectura)</p>
                                <p className="text-gray-300">{
                                    ecfProfile?.productionApproval?.revokedAt
                                        ? "Revocada"
                                        : ecfProfile?.productionApproval?.verifiedAt
                                            ? "Estado del emisor verificado internamente (no confirma incorporación a DeLeonSoft)"
                                            : "Pendiente de revisión por SuperAdmin"
                                }</p>
                                {ecfProfile?.productionApproval?.verifiedAt && <p className="text-gray-400">Verificado: {new Date(ecfProfile.productionApproval.verifiedAt).toLocaleString("es-DO")}</p>}
                                {ecfProfile?.productionApproval?.revocationReason && <p className="text-red-300">Motivo: {ecfProfile.productionApproval.revocationReason}</p>}
                                <p className="text-gray-400">La validación interna no sustituye la autorización oficial de la DGII.</p>
                            </div>

                            <p
                                className={
                                    ecfOperationalReady
                                        ? "text-green-300 font-semibold"
                                        : "text-sky-300 font-semibold"
                                }
                            >
                                {t(
                                    "ecfConfig.status.ecfIssuance"
                                )}
                                :{" "}

                                {ecfOperationalReady
                                    ? t(
                                        "ecfConfig.status.readyFeminine"
                                    )
                                    : t(
                                        "ecfConfig.status.blockedFeminine"
                                    )
                                }
                            </p>

                        </div>


                        {runtimeErrors.length >
                            0 && (

                                <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">

                                    <div className="flex items-start gap-2">

                                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />

                                        <div>

                                            <p className="text-xs font-semibold text-red-300 mb-1">
                                                {t(
                                                    "ecfConfig.status.mustFix"
                                                )}
                                            </p>

                                            <div className="space-y-1">

                                                {runtimeErrors.map(
                                                    (
                                                        error,
                                                        index
                                                    ) => (

                                                        <p
                                                            key={`${error}-${index}`}
                                                            className="text-xs text-red-200"
                                                        >
                                                            •{" "}
                                                            {
                                                                error
                                                            }
                                                        </p>

                                                    )
                                                )}

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            )}


                        {runtimeWarnings.length >
                            0 && (

                                <div className="mt-3 rounded-lg border border-sky-500/20 bg-sky-500/10 p-3">

                                    <div className="space-y-1">

                                        {runtimeWarnings.map(
                                            (
                                                warning,
                                                index
                                            ) => (

                                                <p
                                                    key={`${warning}-${index}`}
                                                    className="text-xs text-sky-200"
                                                >
                                                    •{" "}
                                                    {
                                                        warning
                                                    }
                                                </p>

                                            )
                                        )}

                                    </div>

                                </div>

                            )}

                    </div>


                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">

                        <p className="text-xs text-sky-200">
                            La activación e-CF habilita la función en el POS.
                            La emisión real requiere la configuración fiscal
                            DGII correspondiente.
                        </p>

                    </div>

                </div>


                <div className="mt-6 rounded-xl border border-gray-800/50 bg-[#1a1a1a]/60 p-4 space-y-4">

                    <div>

                        <p className="text-sm font-semibold text-white">
                            {t(
                                "ecfConfig.certificate.title"
                            )}
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                            {t(
                                "ecfConfig.certificate.description"
                            )}
                        </p>

                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <label>

                            <div className="text-xs text-gray-400 mb-1">
                                {t(
                                    "ecfConfig.certificate.fileLabel"
                                )}
                            </div>

                            <input
                                type="file"
                                accept=".p12,.pfx"
                                onChange={(
                                    event
                                ) =>
                                    setCertFile(
                                        event
                                            .target
                                            .files?.[0] ||
                                        null
                                    )
                                }
                                className={
                                    inputCls
                                }
                            />

                            {certFile && (

                                <p className="text-xs text-gray-400 mt-1">

                                    {t(
                                        "ecfConfig.certificate.selected"
                                    )}
                                    :{" "}

                                    {
                                        certFile.name
                                    }

                                </p>

                            )}

                        </label>


                        <label>

                            <div className="text-xs text-gray-400 mb-1">
                                {t(
                                    "ecfConfig.certificate.passwordLabel"
                                )}
                            </div>

                            <input
                                type="password"
                                value={
                                    certPassword
                                }
                                onChange={(
                                    event
                                ) =>
                                    setCertPassword(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder={
                                    t(
                                        "ecfConfig.certificate.passwordPlaceholder"
                                    )
                                }
                                className={
                                    inputCls
                                }
                            />

                        </label>

                    </div>


                    <button
                        type="button"
                        onClick={
                            uploadCertificate
                        }
                        disabled={
                            uploadingCert
                        }
                        className={`px-4 py-3 rounded-xl font-semibold text-sm ${
                            uploadingCert
                                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                : "bg-[#38bdf8] text-[#1f1f1f] hover:opacity-90"
                        }`}
                    >
                        {uploadingCert
                            ? t(
                                "ecfConfig.certificate.uploading"
                            )
                            : t(
                                "ecfConfig.certificate.uploadButton"
                            )
                        }
                    </button>


                    {certificateReady && (

                        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 space-y-2">

                            <div className="flex items-start gap-2">

                                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />

                                <div>

                                    <p className="text-sm font-semibold text-green-300">
                                        {t(
                                            "ecfConfig.certificate.validatedTitle"
                                        )}
                                    </p>

                                    <p className="text-xs text-green-200/80 mt-1">
                                        {t(
                                            "ecfConfig.certificate.validatedDescription"
                                        )}
                                    </p>

                                </div>

                            </div>


                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-300 pt-2">

                                {ecfProfile
                                    ?.certificate
                                    ?.fileName && (

                                    <p>

                                        {t(
                                            "ecfConfig.certificate.file"
                                        )}
                                        :{" "}

                                        <span className="text-white">
                                            {
                                                ecfProfile
                                                    .certificate
                                                    .fileName
                                            }
                                        </span>

                                    </p>

                                )}


                                {ecfProfile
                                    ?.certificate
                                    ?.serialNumber && (

                                    <p>

                                        {t(
                                            "ecfConfig.certificate.serial"
                                        )}
                                        :{" "}

                                        <span className="text-white">
                                            {
                                                ecfProfile
                                                    .certificate
                                                    .serialNumber
                                            }
                                        </span>

                                    </p>

                                )}


                                {ecfProfile
                                    ?.certificate
                                    ?.validFrom && (

                                    <p>

                                        {t(
                                            "ecfConfig.certificate.validFrom"
                                        )}
                                        :{" "}

                                        <span className="text-white">
                                            {formatCertificateDate(
                                                ecfProfile
                                                    .certificate
                                                    .validFrom
                                            )}
                                        </span>

                                    </p>

                                )}


                                {ecfProfile
                                    ?.certificate
                                    ?.validTo && (

                                    <p>

                                        {t(
                                            "ecfConfig.certificate.validTo"
                                        )}
                                        :{" "}

                                        <span className="text-white">
                                            {formatCertificateDate(
                                                ecfProfile
                                                    .certificate
                                                    .validTo
                                            )}
                                        </span>

                                    </p>

                                )}

                            </div>

                        </div>

                    )}


                    {certificateHasProblem && (

                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">

                            <div className="flex items-start gap-2">

                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />

                                <div>

                                    <p className="text-sm font-semibold text-red-300">
                                        {t(
                                            "ecfConfig.certificate.problemTitle"
                                        )}
                                    </p>

                                    <p className="text-xs text-red-200/80 mt-1">
                                        {t(
                                            "ecfConfig.certificate.problemDescription"
                                        )}
                                    </p>

                                </div>

                            </div>

                        </div>

                    )}


                    {certificateMissing && (

                        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">

                            <div className="flex items-start gap-2">

                                <Info className="w-4 h-4 text-sky-400 mt-0.5" />

                                <div>

                                    <p className="text-sm font-semibold text-sky-200">
                                        {t(
                                            "ecfConfig.certificate.pendingTitle"
                                        )}
                                    </p>

                                    <p className="text-xs text-sky-100/80 mt-1">
                                        {t(
                                            "ecfConfig.certificate.pendingDescription"
                                        )}
                                    </p>

                                </div>

                            </div>

                        </div>

                    )}

                </div>

            </Section>


            <div className="rounded-xl border border-gray-800/50 bg-[#1a1a1a]/60 p-4 space-y-5">

                <div>

                    <p className="text-sm font-semibold text-white">
                        Tipos de e-CF y rangos autorizados
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                        Activa solo los comprobantes que utilizará el contribuyente.
                    </p>

                </div>


                <div
                    className={[
                        "text-[11px] px-3 py-1.5 rounded-full border w-fit",

                        form.ecf
                            ?.environment ===
                        "dgii_production"
                            ? "border-green-500/30 bg-green-500/10 text-green-300"
                            : form.ecf
                                ?.environment ===
                            "dgii_certification"
                                ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                                : "border-gray-700 bg-gray-800/60 text-gray-300",
                    ].join(
                        " "
                    )}
                >
                    {form.ecf
                        ?.environment ===
                    "dgii_production"
                        ? "Producción DGII"
                        : form.ecf
                            ?.environment ===
                        "dgii_certification"
                            ? "Certificación DGII"
                            : "Sandbox interno"
                    }
                </div>


                {form.ecf
                    ?.environment ===
                "internal_sandbox" ? (

                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">

                        <p className="text-xs text-blue-200">
                            En Sandbox interno no necesitas rangos autorizados por DGII.
                        </p>

                    </div>

                ) : (

                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">

                        <p className="text-xs text-sky-200">
                            La próxima secuencia es de solo lectura.
                            DeLeonSoft la controla automáticamente.
                        </p>

                    </div>

                )}


                <div className="space-y-5">

                    {ECF_DOCUMENT_TYPE_GROUPS.map(
                        (
                            group
                        ) => (

                            <div
                                key={
                                    group.title
                                }
                                className="rounded-xl border border-gray-800/40 bg-[#111111]/70 p-4"
                            >

                                <div className="mb-4">

                                    <p className="text-sm font-semibold text-[#38bdf8]">
                                        {
                                            group.title
                                        }
                                    </p>

                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {
                                            group.description
                                        }
                                    </p>

                                </div>


                                <div className="space-y-4">

                                    {group.items.map(
                                        (
                                            item
                                        ) => {
                                            const typeConfig =
                                                form
                                                    .ecf
                                                    ?.documentTypes
                                                    ?.[item.key] ||
                                                {};

                                            const checked =
                                                typeConfig
                                                    .enabled ===
                                                true;

                                            const rangeInfo =
                                                getEcfRangeInfo(
                                                    typeConfig
                                                );

                                            const environment =
                                                form
                                                    .ecf
                                                    ?.environment ||
                                                "internal_sandbox";

                                            const isProduction =
                                                environment ===
                                                "dgii_production";

                                            const isCertification =
                                                environment ===
                                                "dgii_certification";

                                            const activeSequence =
                                                getEnvironmentSequence(
                                                    typeConfig,
                                                    environment
                                                );

                                            const rangeRequired =
                                                isProduction &&
                                                checked;


                                            return (
                                                <div
                                                    key={
                                                        item.key
                                                    }
                                                    className="rounded-xl border border-gray-800/40 bg-[#1a1a1a]/60 overflow-hidden"
                                                >

                                                    <div className="flex items-start justify-between gap-4 p-4">

                                                        <div>

                                                            <div className="flex flex-wrap items-center gap-2">

                                                                <span className="text-sm font-semibold text-white">

                                                                    {item.key.toUpperCase()}
                                                                    {" - "}
                                                                    {
                                                                        item.label
                                                                    }

                                                                </span>


                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">

                                                                    {t(
                                                                        "ecfConfig.documentTypes.code"
                                                                    )}
                                                                    {" "}
                                                                    {
                                                                        item.code
                                                                    }

                                                                </span>


                                                                {rangeRequired &&
                                                                    !rangeInfo.hasRange && (

                                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30">

                                                                        {t(
                                                                            "ecfConfig.documentTypes.rangeRequired"
                                                                        )}

                                                                    </span>

                                                                    )}


                                                                {rangeInfo.isExhausted && (

                                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30">

                                                                        {t(
                                                                            "ecfConfig.documentTypes.exhausted"
                                                                        )}

                                                                    </span>

                                                                )}


                                                                {rangeInfo.isExpired && (

                                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30">

                                                                        {t(
                                                                            "ecfConfig.documentTypes.expired"
                                                                        )}

                                                                    </span>

                                                                )}

                                                            </div>


                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {
                                                                    item.description
                                                                }
                                                            </p>

                                                        </div>


                                                        <Switch
                                                            checked={
                                                                checked
                                                            }
                                                            onChange={(
                                                                value
                                                            ) =>
                                                                setDocumentTypeField(
                                                                    item.key,
                                                                    "enabled",
                                                                    value
                                                                )
                                                            }
                                                        />

                                                    </div>


                                                    {checked && (

                                                        <div className="border-t border-gray-800/40 p-4 space-y-4">

                                                            {isProduction ? (

                                                                <>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

                                                                        <label>

                                                                            <div className="text-xs text-gray-400 mb-1">

                                                                                {t(
                                                                                    "ecfConfig.documentTypes.sequenceFrom"
                                                                                )}

                                                                                {rangeRequired
                                                                                    ? " *"
                                                                                    : ""
                                                                                }

                                                                            </div>

                                                                            <input
                                                                                className={
                                                                                    inputCls
                                                                                }
                                                                                type="number"
                                                                                min="1"
                                                                                max="9999999999"
                                                                                value={
                                                                                    typeConfig
                                                                                        .authorizedFrom ??
                                                                                    ""
                                                                                }
                                                                                onChange={(
                                                                                    event
                                                                                ) =>
                                                                                    setDocumentTypeField(
                                                                                        item.key,
                                                                                        "authorizedFrom",
                                                                                        event
                                                                                            .target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                            />

                                                                        </label>


                                                                        <label>

                                                                            <div className="text-xs text-gray-400 mb-1">

                                                                                {t(
                                                                                    "ecfConfig.documentTypes.sequenceTo"
                                                                                )}

                                                                                {rangeRequired
                                                                                    ? " *"
                                                                                    : ""
                                                                                }

                                                                            </div>

                                                                            <input
                                                                                className={
                                                                                    inputCls
                                                                                }
                                                                                type="number"
                                                                                min="1"
                                                                                max="9999999999"
                                                                                value={
                                                                                    typeConfig
                                                                                        .authorizedTo ??
                                                                                    ""
                                                                                }
                                                                                onChange={(
                                                                                    event
                                                                                ) =>
                                                                                    setDocumentTypeField(
                                                                                        item.key,
                                                                                        "authorizedTo",
                                                                                        event
                                                                                            .target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                            />

                                                                        </label>


                                                                        <label>

                                                                            <div className="text-xs text-gray-400 mb-1">

                                                                                {t(
                                                                                    "ecfConfig.documentTypes.authorizationDate"
                                                                                )}

                                                                            </div>

                                                                            <input
                                                                                className={
                                                                                    inputCls
                                                                                }
                                                                                type="date"
                                                                                value={
                                                                                    typeConfig
                                                                                        .authorizedAt ||
                                                                                    ""
                                                                                }
                                                                                onChange={(
                                                                                    event
                                                                                ) =>
                                                                                    setDocumentTypeField(
                                                                                        item.key,
                                                                                        "authorizedAt",
                                                                                        event
                                                                                            .target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                            />

                                                                        </label>


                                                                        <label>

                                                                            <div className="text-xs text-gray-400 mb-1">

                                                                                {t(
                                                                                    "ecfConfig.documentTypes.validUntil"
                                                                                )}

                                                                            </div>

                                                                            <input
                                                                                className={
                                                                                    inputCls
                                                                                }
                                                                                type="date"
                                                                                value={
                                                                                    typeConfig
                                                                                        .validUntil ||
                                                                                    ""
                                                                                }
                                                                                onChange={(
                                                                                    event
                                                                                ) =>
                                                                                    setDocumentTypeField(
                                                                                        item.key,
                                                                                        "validUntil",
                                                                                        event
                                                                                            .target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                            />

                                                                        </label>

                                                                    </div>


                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                                                                        <div className="rounded-lg border border-gray-800/50 bg-[#111] p-3">

                                                                            <p className="text-[11px] text-gray-500">
                                                                                {t(
                                                                                    "ecfConfig.documentTypes.nextSequence"
                                                                                )}
                                                                            </p>

                                                                            <p className="text-sm font-semibold text-white mt-1">
                                                                                {rangeInfo
                                                                                        .next ||
                                                                                    "Pendiente"
                                                                                }
                                                                            </p>

                                                                        </div>


                                                                        <div className="rounded-lg border border-gray-800/50 bg-[#111] p-3">

                                                                            <p className="text-[11px] text-gray-500">
                                                                                {t(
                                                                                    "ecfConfig.documentTypes.nextENcf"
                                                                                )}
                                                                            </p>

                                                                            <p className="text-sm font-semibold text-[#38bdf8] mt-1">

                                                                                {formatENcfPreview(
                                                                                    item.code,
                                                                                    rangeInfo.next
                                                                                )}

                                                                            </p>

                                                                        </div>

                                                                    </div>


                                                                    {rangeInfo.hasRange && (

                                                                        <div className="rounded-lg border border-gray-800/50 bg-[#111] p-3 space-y-3">

                                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">

                                                                                <div>

                                                                                    <span className="text-gray-500 block">
                                                                                        {t(
                                                                                            "ecfConfig.documentTypes.stats.total"
                                                                                        )}
                                                                                    </span>

                                                                                    <span className="text-white font-semibold">
                                                                                        {
                                                                                            rangeInfo.total
                                                                                        }
                                                                                    </span>

                                                                                </div>


                                                                                <div>

                                                                                    <span className="text-gray-500 block">
                                                                                        {t(
                                                                                            "ecfConfig.documentTypes.stats.used"
                                                                                        )}
                                                                                    </span>

                                                                                    <span className="text-white font-semibold">
                                                                                        {
                                                                                            rangeInfo.used
                                                                                        }
                                                                                    </span>

                                                                                </div>


                                                                                <div>

                                                                                    <span className="text-gray-500 block">
                                                                                        {t(
                                                                                            "ecfConfig.documentTypes.stats.available"
                                                                                        )}
                                                                                    </span>

                                                                                    <span className="text-green-300 font-semibold">
                                                                                        {
                                                                                            rangeInfo.remaining
                                                                                        }
                                                                                    </span>

                                                                                </div>


                                                                                <div>

                                                                                    <span className="text-gray-500 block">
                                                                                        {t(
                                                                                            "ecfConfig.documentTypes.stats.usedPercent"
                                                                                        )}
                                                                                    </span>

                                                                                    <span className="text-white font-semibold">
                                                                                        {
                                                                                            rangeInfo.percentage
                                                                                        }
                                                                                        %
                                                                                    </span>

                                                                                </div>

                                                                            </div>


                                                                            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">

                                                                                <div
                                                                                    className={[
                                                                                        "h-2 rounded-full",

                                                                                        rangeInfo.percentage >=
                                                                                        90
                                                                                            ? "bg-red-500"
                                                                                            : rangeInfo.percentage >=
                                                                                            70
                                                                                                ? "bg-sky-500"
                                                                                                : "bg-green-500",
                                                                                    ].join(
                                                                                        " "
                                                                                    )}
                                                                                    style={{
                                                                                        width:
                                                                                            `${Math.min(
                                                                                                rangeInfo.percentage,
                                                                                                100
                                                                                            )}%`,
                                                                                    }}
                                                                                />

                                                                            </div>

                                                                        </div>

                                                                    )}


                                                                    {rangeInfo.isExpired && (

                                                                        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/20 bg-red-500/10">

                                                                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />

                                                                            <p className="text-xs text-red-200">
                                                                                {t(
                                                                                    "ecfConfig.documentTypes.rangeExpired"
                                                                                )}
                                                                            </p>

                                                                        </div>

                                                                    )}


                                                                    {rangeInfo.isExhausted && (

                                                                        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/20 bg-red-500/10">

                                                                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />

                                                                            <p className="text-xs text-red-200">
                                                                                {t(
                                                                                    "ecfConfig.documentTypes.rangeExhausted"
                                                                                )}
                                                                            </p>

                                                                        </div>

                                                                    )}

                                                                </>

                                                            ) : (

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                                                                    <div className="rounded-lg border border-gray-800/50 bg-[#111] p-3">

                                                                        <p className="text-[11px] text-gray-500">

                                                                            {t(
                                                                                "ecfConfig.documentTypes.nextSequence"
                                                                            )}
                                                                            {" "}

                                                                            {isCertification
                                                                                ? t(
                                                                                    "ecfConfig.documentTypes.certification"
                                                                                )
                                                                                : "Sandbox"
                                                                            }

                                                                        </p>

                                                                        <p className="text-sm font-semibold text-white mt-1">
                                                                            {
                                                                                activeSequence
                                                                            }
                                                                        </p>

                                                                    </div>


                                                                    <div className="rounded-lg border border-gray-800/50 bg-[#111] p-3">

                                                                        <p className="text-[11px] text-gray-500">
                                                                            {t(
                                                                                "ecfConfig.documentTypes.nextENcf"
                                                                            )}
                                                                        </p>

                                                                        <p className="text-sm font-semibold text-[#38bdf8] mt-1">

                                                                            {formatENcfPreview(
                                                                                item.code,
                                                                                activeSequence
                                                                            )}

                                                                        </p>

                                                                    </div>

                                                                </div>

                                                            )}

                                                        </div>

                                                    )}

                                                </div>
                                            );
                                        }
                                    )}

                                </div>

                            </div>

                        )
                    )}

                </div>


                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">

                    <p className="text-xs text-blue-200">
                        Para restaurantes normalmente usarás E31, E32,
                        E33 y E34. Los comprobantes especiales deben
                        habilitarse solo cuando el contribuyente realmente
                        los necesite.
                    </p>

                </div>

            </div>

        </div>
    );
}