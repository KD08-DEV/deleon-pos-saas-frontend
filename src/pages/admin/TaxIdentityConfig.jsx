import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    AlertCircle,
    CheckCircle2,
    FileText,
    Info,
    Plus,
    Save,
    Trash2,
} from "lucide-react";

import {
    enqueueSnackbar,
} from "notistack";

import {
    useTranslation,
} from "react-i18next";

import api from "../../lib/api";

import {
    COUNTRY_OPTIONS,
} from "../../data/countryConfig.js";

import {
    createPrimaryTaxIdentifier,
    getTaxIdentityPreset,
    hasTaxIdentityPreset,
} from "../../data/taxIdentityPresets.js";


const inputCls =
    "w-full p-3 border border-gray-800/50 rounded-xl bg-[#1a1a1a] text-white text-sm " +
    "focus:outline-none focus:border-[#f6b100]/50 transition-colors disabled:opacity-60";


function Switch({
                    checked,
                    onChange,
                    disabled = false,
                    ariaLabel,
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
            aria-label={ariaLabel}
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


function normalizeIdentifier(
    raw,
    fallbackCountryCode
) {
    if (!raw) {
        return null;
    }

    return {
        type:
            String(
                raw?.type || ""
            )
                .trim()
                .toUpperCase(),

        label:
            String(
                raw?.label || ""
            ).trim(),

        value:
            String(
                raw?.value || ""
            ).trim(),

        countryCode:
            String(
                raw?.countryCode ||
                fallbackCountryCode ||
                ""
            )
                .trim()
                .toUpperCase(),

        active:
            raw?.active !== false,
    };
}


function buildInitialForm(data) {
    const localizationCountry =
        String(
            data
                ?.localization
                ?.countryCode ||
            "DO"
        )
            .trim()
            .toUpperCase();

    const raw =
        data?.taxIdentity || {};

    const countryCode =
        String(
            raw?.countryCode ||
            localizationCountry
        )
            .trim()
            .toUpperCase();

    const preset =
        getTaxIdentityPreset(
            countryCode
        );

    const primary =
        normalizeIdentifier(
            raw?.primaryTaxId,
            countryCode
        ) ||
        createPrimaryTaxIdentifier(
            countryCode
        );

    return {
        enabled:
            raw?.enabled === true,

        countryCode,

        legalName:
            String(
                raw?.legalName ||
                data
                    ?.business
                    ?.name ||
                ""
            ).trim(),

        primaryTaxId: {
            ...primary,

            type:
                primary.type ||
                preset
                    .primaryTaxId
                    .type,

            label:
                primary.label ||
                preset
                    .primaryTaxId
                    .shortLabel ||
                preset
                    .primaryTaxId
                    .label,
        },

        additionalTaxIds:
            Array.isArray(
                raw?.additionalTaxIds
            )
                ? raw
                    .additionalTaxIds
                    .map(
                        (item) =>
                            normalizeIdentifier(
                                item,
                                countryCode
                            )
                    )
                    .filter(Boolean)
                : [],
    };
}


function getErrorMessage(
    error,
    t
) {
    const rawMessage =
        error
            ?.response
            ?.data
            ?.message ||
        error?.message ||
        "TAX_IDENTITY_SAVE_FAILED";

    const messages = {
        TAX_IDENTITY_COUNTRY_INVALID:
            t(
                "taxIdentityConfig.errors.countryInvalid"
            ),

        TAX_IDENTITY_LEGAL_NAME_REQUIRED:
            t(
                "taxIdentityConfig.errors.legalNameRequired"
            ),

        TAX_IDENTITY_TYPE_REQUIRED:
            t(
                "taxIdentityConfig.errors.typeRequired"
            ),

        TAX_IDENTITY_VALUE_REQUIRED:
            t(
                "taxIdentityConfig.errors.valueRequired"
            ),

        TOO_MANY_TAX_IDENTIFIERS:
            t(
                "taxIdentityConfig.errors.tooManyIdentifiers"
            ),

        TAX_IDENTITY_SAVE_FAILED:
            t(
                "taxIdentityConfig.errors.saveFailed"
            ),

        "No se pudo guardar la identificación fiscal.":
            t(
                "taxIdentityConfig.errors.saveFailed"
            ),
    };

    return (
        messages[
            rawMessage
            ] ||
        rawMessage
    );
}


export default function TaxIdentityConfig() {
    const {
        t,
        i18n,
    } =
        useTranslation();

    const qc =
        useQueryClient();

    const [
        form,
        setForm,
    ] =
        useState(null);

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

            staleTime: 0,

            refetchOnMount:
                "always",

            refetchOnReconnect:
                true,
        });


    useEffect(() => {
        if (!data) {
            return;
        }

        setForm(
            buildInitialForm(
                data
            )
        );
    }, [data]);


    useEffect(() => {
        if (!msg) {
            return;
        }

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
    }, [msg]);


    const preset =
        useMemo(
            () =>
                getTaxIdentityPreset(
                    form
                        ?.countryCode ||
                    data
                        ?.localization
                        ?.countryCode ||
                    "DO"
                ),

            [
                form
                    ?.countryCode,

                data
                    ?.localization
                    ?.countryCode,
            ]
        );


    const regionalCountryCode =
        String(
            data
                ?.localization
                ?.countryCode ||
            "DO"
        )
            .trim()
            .toUpperCase();


    const regionalCountry =
        COUNTRY_OPTIONS.find(
            (item) =>
                item.code ===
                regionalCountryCode
        );


    /*
     * Permite que los nombres de países cambien:
     *
     * República Dominicana -> Dominican Republic
     * Estados Unidos       -> United States
     *
     * sin modificar COUNTRY_OPTIONS ni el countryCode.
     */
    const currentLanguage =
        String(
            i18n.resolvedLanguage ||
            i18n.language ||
            "es"
        )
            .trim()
            .toLowerCase();


    const regionDisplayNames =
        useMemo(
            () => {
                try {
                    return new Intl.DisplayNames(
                        [
                            currentLanguage,
                        ],
                        {
                            type:
                                "region",
                        }
                    );
                } catch {
                    return null;
                }
            },
            [
                currentLanguage,
            ]
        );


    const getCountryDisplayName = (
        country
    ) => {
        const code =
            String(
                country?.code ||
                ""
            )
                .trim()
                .toUpperCase();

        if (!code) {
            return (
                country?.name ||
                ""
            );
        }

        return (
            regionDisplayNames
                ?.of(
                    code
                ) ||
            country?.name ||
            code
        );
    };


    /*
     * "Identificación fiscal" es actualmente
     * un valor por defecto que puede terminar
     * persistido.
     *
     * No cambiamos el dato interno por cambiar
     * el idioma. Solo cambiamos cómo se muestra.
     */
    const getAdditionalLabelDisplayValue = (
        value
    ) => {
        const raw =
            String(
                value ||
                ""
            ).trim();

        if (
            raw ===
            "Identificación fiscal" ||
            raw ===
            "Tax identification"
        ) {
            return t(
                "taxIdentityConfig.additional.defaultLabel"
            );
        }

        return raw;
    };


    const setField = (
        field,
        value
    ) => {
        setForm(
            (current) => ({
                ...current,

                [field]:
                value,
            })
        );
    };


    const setPrimaryField = (
        field,
        value
    ) => {
        setForm(
            (current) => ({
                ...current,

                primaryTaxId: {
                    ...current
                        .primaryTaxId,

                    [field]:
                    value,
                },
            })
        );
    };


    const applyCountryPreset = (
        countryCode
    ) => {
        const normalizedCountryCode =
            String(
                countryCode ||
                ""
            )
                .trim()
                .toUpperCase();

        const nextPreset =
            getTaxIdentityPreset(
                normalizedCountryCode
            );

        const nextPrimary =
            createPrimaryTaxIdentifier(
                normalizedCountryCode
            );

        setForm(
            (current) => ({
                ...current,

                countryCode:
                normalizedCountryCode,

                primaryTaxId: {
                    ...nextPrimary,

                    type:
                    nextPreset
                        .primaryTaxId
                        .type,

                    label:
                        nextPreset
                            .primaryTaxId
                            .shortLabel ||
                        nextPreset
                            .primaryTaxId
                            .label,

                    value:
                        "",

                    countryCode:
                    normalizedCountryCode,

                    active:
                        true,
                },
            })
        );
    };


    const useRegionalCountry =
        () => {
            applyCountryPreset(
                regionalCountryCode
            );
        };


    const addAdditionalIdentifier =
        () => {
            setForm(
                (current) => {
                    const currentItems =
                        current
                            .additionalTaxIds ||
                        [];

                    if (
                        currentItems.length >=
                        10
                    ) {
                        enqueueSnackbar(
                            t(
                                "taxIdentityConfig.messages.maxAdditional"
                            ),
                            {
                                variant:
                                    "warning",
                            }
                        );

                        return current;
                    }

                    return {
                        ...current,

                        additionalTaxIds: [
                            ...currentItems,

                            {
                                type:
                                    "TAX_ID",

                                /*
                                 * Conservamos este valor interno
                                 * para que el idioma no altere
                                 * los datos guardados.
                                 */
                                label:
                                    "Identificación fiscal",

                                value:
                                    "",

                                countryCode:
                                current
                                    .countryCode,

                                active:
                                    true,
                            },
                        ],
                    };
                }
            );
        };


    const updateAdditionalIdentifier =
        (
            index,
            field,
            value
        ) => {
            setForm(
                (current) => ({
                    ...current,

                    additionalTaxIds:
                        current
                            .additionalTaxIds
                            .map(
                                (
                                    item,
                                    itemIndex
                                ) =>
                                    itemIndex ===
                                    index
                                        ? {
                                            ...item,

                                            [field]:
                                            value,
                                        }
                                        : item
                            ),
                })
            );
        };


    const removeAdditionalIdentifier =
        (
            index
        ) => {
            setForm(
                (current) => ({
                    ...current,

                    additionalTaxIds:
                        current
                            .additionalTaxIds
                            .filter(
                                (
                                    _,
                                    itemIndex
                                ) =>
                                    itemIndex !==
                                    index
                            ),
                })
            );
        };


    const save =
        async () => {
            const legalName =
                String(
                    form
                        ?.legalName ||
                    ""
                ).trim();

            const primaryType =
                String(
                    form
                        ?.primaryTaxId
                        ?.type ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            const primaryLabel =
                String(
                    form
                        ?.primaryTaxId
                        ?.label ||
                    primaryType
                ).trim();

            const primaryValue =
                String(
                    form
                        ?.primaryTaxId
                        ?.value ||
                    ""
                ).trim();


            if (
                form?.enabled &&
                !legalName
            ) {
                enqueueSnackbar(
                    t(
                        "taxIdentityConfig.validation.legalNameRequired"
                    ),
                    {
                        variant:
                            "warning",
                    }
                );

                return;
            }


            if (
                form?.enabled &&
                !primaryType
            ) {
                enqueueSnackbar(
                    t(
                        "taxIdentityConfig.validation.typeRequired"
                    ),
                    {
                        variant:
                            "warning",
                    }
                );

                return;
            }


            if (
                form?.enabled &&
                !primaryValue
            ) {
                enqueueSnackbar(
                    t(
                        "taxIdentityConfig.validation.valueRequired",
                        {
                            label:
                                primaryLabel ||
                                t(
                                    "taxIdentityConfig.fields.taxNumber"
                                ),
                        }
                    ),
                    {
                        variant:
                            "warning",
                    }
                );

                return;
            }


            setSaving(
                true
            );

            setMsg(
                null
            );


            try {
                const additionalTaxIds =
                    (
                        form
                            .additionalTaxIds ||
                        []
                    )
                        .map(
                            (
                                item
                            ) => ({
                                type:
                                    String(
                                        item
                                            ?.type ||
                                        ""
                                    )
                                        .trim()
                                        .toUpperCase(),

                                label:
                                    String(
                                        item
                                            ?.label ||
                                        item
                                            ?.type ||
                                        ""
                                    ).trim(),

                                value:
                                    String(
                                        item
                                            ?.value ||
                                        ""
                                    ).trim(),

                                countryCode:
                                    String(
                                        item
                                            ?.countryCode ||
                                        form
                                            .countryCode
                                    )
                                        .trim()
                                        .toUpperCase(),

                                active:
                                    item
                                        ?.active !==
                                    false,
                            })
                        )
                        .filter(
                            (
                                item
                            ) =>
                                Boolean(
                                    item.value
                                )
                        );


                const payload = {
                    taxIdentity: {
                        enabled:
                            form.enabled ===
                            true,

                        countryCode:
                            String(
                                form
                                    .countryCode ||
                                regionalCountryCode ||
                                "DO"
                            )
                                .trim()
                                .toUpperCase(),

                        legalName,

                        primaryTaxId:
                            (
                                primaryType ||
                                primaryLabel ||
                                primaryValue
                            )
                                ? {
                                    type:
                                    primaryType,

                                    label:
                                        primaryLabel ||
                                        primaryType,

                                    value:
                                    primaryValue,

                                    countryCode:
                                        String(
                                            form
                                                .primaryTaxId
                                                ?.countryCode ||
                                            form
                                                .countryCode
                                        )
                                            .trim()
                                            .toUpperCase(),

                                    active:
                                        form
                                            .primaryTaxId
                                            ?.active !==
                                        false,
                                }
                                : null,

                        additionalTaxIds,
                    },
                };


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
                        "TAX_IDENTITY_SAVE_FAILED"
                    );
                }


                await qc.invalidateQueries({
                    queryKey: [
                        "admin-fiscal-config",
                    ],
                });
                // El perfil emisor e-CF obtiene el RNC desde la identidad fiscal,
                // siempre que no tenga un RNC de emisor ya configurado.
                await qc.invalidateQueries({ queryKey: ["admin-ecf-profile"] });


                const successMessage =
                    t(
                        "taxIdentityConfig.messages.saveSuccess"
                    );


                setMsg({
                    type:
                        "ok",

                    text:
                    successMessage,
                });


                enqueueSnackbar(
                    successMessage,
                    {
                        variant:
                            "success",
                    }
                );

            } catch (error) {
                const message =
                    getErrorMessage(
                        error,
                        t
                    );


                setMsg({
                    type:
                        "err",

                    text:
                    message,
                });


                enqueueSnackbar(
                    message,
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


    if (
        isLoading ||
        !form
    ) {
        return (
            <div className="text-center py-8 text-gray-400">

                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f6b100] mx-auto" />

                <p className="mt-2">
                    {t(
                        "taxIdentityConfig.loading"
                    )}
                </p>

            </div>
        );
    }


    if (
        isError
    ) {
        return (
            <div className="text-center py-8 text-red-400">
                {t(
                    "taxIdentityConfig.loadError"
                )}
            </div>
        );
    }


    const hasPreset =
        hasTaxIdentityPreset(
            form.countryCode
        );


    return (
        <div>

            {/* HEADER */}

            <div className="mb-6">

                <h2 className="text-2xl font-bold text-white flex items-center gap-2">

                    <FileText className="w-6 h-6 text-[#f6b100]" />

                    {t(
                        "taxIdentityConfig.title"
                    )}

                </h2>


                <p className="text-sm text-gray-400 mt-1">
                    {t(
                        "taxIdentityConfig.description"
                    )}
                </p>

            </div>


            {/* MENSAJE */}

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
                        {msg.text}
                    </p>

                </div>
            )}


            <div className="space-y-6">

                {/* ACTIVAR IDENTIDAD */}

                <section className="p-6 rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] shadow-xl">

                    <div className="flex items-start justify-between gap-4">

                        <div>

                            <h3 className="text-lg font-semibold text-white">
                                {t(
                                    "taxIdentityConfig.enableSection.title"
                                )}
                            </h3>


                            <p className="text-xs text-gray-400 mt-1 max-w-2xl">
                                {t(
                                    "taxIdentityConfig.enableSection.description"
                                )}
                            </p>

                        </div>


                        <div className="flex items-center gap-3 flex-shrink-0">

                            <span
                                className={`text-xs font-medium ${
                                    form.enabled
                                        ? "text-green-300"
                                        : "text-gray-400"
                                }`}
                            >

                                {form.enabled
                                    ? t(
                                        "taxIdentityConfig.status.active"
                                    )
                                    : t(
                                        "taxIdentityConfig.status.inactive"
                                    )
                                }

                            </span>


                            <Switch
                                checked={
                                    form.enabled
                                }

                                onChange={
                                    (
                                        value
                                    ) =>
                                        setField(
                                            "enabled",
                                            value
                                        )
                                }

                                ariaLabel={
                                    t(
                                        "taxIdentityConfig.enableSection.toggleAria"
                                    )
                                }
                            />

                        </div>

                    </div>

                </section>


                {/* IDENTIDAD PRINCIPAL */}

                <section className="p-6 rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] shadow-xl">

                    <div className="flex items-start gap-3 mb-5 pb-4 border-b border-gray-800/50">

                        <div className="p-2 rounded-lg bg-[#f6b100]/10 border border-[#f6b100]/20">

                            <FileText className="w-5 h-5 text-[#f6b100]" />

                        </div>


                        <div>

                            <h3 className="text-lg font-semibold text-white">

                                {t(
                                    "taxIdentityConfig.primarySection.title"
                                )}

                            </h3>


                            <p className="text-xs text-gray-400 mt-0.5">

                                {t(
                                    "taxIdentityConfig.primarySection.description"
                                )}

                            </p>

                        </div>

                    </div>


                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* PAÍS */}

                        <div>

                            <label className="block text-sm text-gray-300 mb-2">

                                {t(
                                    "taxIdentityConfig.fields.primaryTaxCountry"
                                )}

                            </label>


                            <select
                                value={
                                    form.countryCode
                                }

                                onChange={(
                                    event
                                ) =>
                                    applyCountryPreset(
                                        event
                                            .target
                                            .value
                                    )
                                }

                                className={
                                    inputCls
                                }
                            >

                                {COUNTRY_OPTIONS.map(
                                    (
                                        country
                                    ) => (

                                        <option
                                            key={
                                                country.code
                                            }

                                            value={
                                                country.code
                                            }
                                        >

                                            {country.flag
                                                ? `${country.flag} `
                                                : ""
                                            }

                                            {getCountryDisplayName(
                                                country
                                            )} ({country.code})

                                        </option>

                                    )
                                )}

                            </select>


                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">

                                <span className="text-gray-500">

                                    {t(
                                        "taxIdentityConfig.regionalCountry.current"
                                    )}

                                </span>


                                <span className="text-gray-300">

                                    {regionalCountry
                                        ?.flag
                                        ? `${regionalCountry.flag} `
                                        : ""
                                    }

                                    {getCountryDisplayName(
                                        regionalCountry || {
                                            code:
                                            regionalCountryCode,

                                            name:
                                            regionalCountryCode,
                                        }
                                    )}

                                </span>


                                {form.countryCode !==
                                    regionalCountryCode && (

                                        <button
                                            type="button"

                                            onClick={
                                                useRegionalCountry
                                            }

                                            className="text-[#f6b100] hover:text-[#ffd633] font-medium"
                                        >

                                            {t(
                                                "taxIdentityConfig.regionalCountry.use"
                                            )}

                                        </button>

                                    )}

                            </div>

                        </div>


                        {/* NOMBRE LEGAL */}

                        <div>

                            <label className="block text-sm text-gray-300 mb-2">

                                {preset
                                    .legalNameLabel
                                }

                            </label>


                            <input
                                type="text"

                                value={
                                    form
                                        .legalName
                                }

                                onChange={(
                                    event
                                ) =>
                                    setField(
                                        "legalName",
                                        event
                                            .target
                                            .value
                                    )
                                }

                                maxLength={
                                    160
                                }

                                placeholder={
                                    t(
                                        "taxIdentityConfig.fields.legalNamePlaceholder"
                                    )
                                }

                                className={
                                    inputCls
                                }
                            />

                        </div>

                    </div>


                    {/* IDENTIFICACIÓN PRINCIPAL */}

                    <div className="mt-5 p-4 rounded-xl border border-gray-800/50 bg-[#0d0d0d]">

                        <div className="flex items-start justify-between gap-4 mb-4">

                            <div>

                                <h4 className="text-sm font-semibold text-white">

                                    {t(
                                        "taxIdentityConfig.primaryId.title"
                                    )}

                                </h4>


                                <p className="text-xs text-gray-400 mt-1">

                                    {preset
                                        .primaryTaxId
                                        .helpText
                                    }

                                </p>

                            </div>


                            <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                                    hasPreset
                                        ? "border-green-500/20 bg-green-500/10 text-green-300"
                                        : "border-blue-500/20 bg-blue-500/10 text-blue-300"
                                }`}
                            >

                                {hasPreset
                                    ? t(
                                        "taxIdentityConfig.primaryId.countryPreset"
                                    )
                                    : t(
                                        "taxIdentityConfig.primaryId.genericPreset"
                                    )
                                }

                            </span>

                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* TIPO */}

                            <div>

                                <label className="block text-xs text-gray-400 mb-2">

                                    {t(
                                        "taxIdentityConfig.fields.type"
                                    )}

                                </label>


                                <input
                                    type="text"

                                    value={
                                        form
                                            .primaryTaxId
                                            .type
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setPrimaryField(
                                            "type",
                                            event
                                                .target
                                                .value
                                                .toUpperCase()
                                        )
                                    }

                                    maxLength={
                                        40
                                    }

                                    placeholder="RNC, EIN, VAT..."

                                    className={
                                        inputCls
                                    }
                                />

                            </div>


                            {/* ETIQUETA */}

                            <div>

                                <label className="block text-xs text-gray-400 mb-2">

                                    {t(
                                        "taxIdentityConfig.fields.label"
                                    )}

                                </label>


                                <input
                                    type="text"

                                    value={
                                        form
                                            .primaryTaxId
                                            .label
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setPrimaryField(
                                            "label",
                                            event
                                                .target
                                                .value
                                        )
                                    }

                                    maxLength={
                                        80
                                    }

                                    placeholder={
                                        t(
                                            "taxIdentityConfig.fields.visibleNamePlaceholder"
                                        )
                                    }

                                    className={
                                        inputCls
                                    }
                                />

                            </div>


                            {/* VALOR */}

                            <div>

                                <label className="block text-xs text-gray-400 mb-2">

                                    {preset
                                        .primaryTaxId
                                        .label
                                    }

                                </label>


                                <input
                                    type="text"

                                    inputMode={
                                        preset
                                            .primaryTaxId
                                            .inputMode ||
                                        "text"
                                    }

                                    value={
                                        form
                                            .primaryTaxId
                                            .value
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setPrimaryField(
                                            "value",
                                            event
                                                .target
                                                .value
                                        )
                                    }

                                    maxLength={
                                        preset
                                            .primaryTaxId
                                            .maxLength ||
                                        120
                                    }

                                    placeholder={
                                        preset
                                            .primaryTaxId
                                            .placeholder
                                    }

                                    className={
                                        inputCls
                                    }
                                />

                            </div>

                        </div>

                    </div>

                </section>


                {/* IDENTIFICACIONES ADICIONALES */}

                <section className="p-6 rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] shadow-xl">

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5 pb-4 border-b border-gray-800/50">

                        <div>

                            <h3 className="text-lg font-semibold text-white">

                                {t(
                                    "taxIdentityConfig.additional.title"
                                )}

                            </h3>


                            <p className="text-xs text-gray-400 mt-1">

                                {t(
                                    "taxIdentityConfig.additional.description"
                                )}

                            </p>

                        </div>


                        <button
                            type="button"

                            onClick={
                                addAdditionalIdentifier
                            }

                            disabled={
                                form
                                    .additionalTaxIds
                                    .length >=
                                10
                            }

                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#f6b100]/30 bg-[#f6b100]/10 text-[#f6b100] text-sm font-semibold hover:bg-[#f6b100]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >

                            <Plus className="w-4 h-4" />


                            {t(
                                "taxIdentityConfig.additional.add"
                            )}

                        </button>

                    </div>


                    {form
                        .additionalTaxIds
                        .length ===
                    0 ? (

                        <div className="rounded-xl border border-dashed border-gray-800 p-6 text-center">

                            <p className="text-sm text-gray-400">

                                {t(
                                    "taxIdentityConfig.additional.empty"
                                )}

                            </p>

                        </div>

                    ) : (

                        <div className="space-y-4">

                            {form
                                .additionalTaxIds
                                .map(
                                    (
                                        identifier,
                                        index
                                    ) => (

                                        <div
                                            key={`tax-identifier-${index}`}

                                            className="p-4 rounded-xl border border-gray-800/50 bg-[#0d0d0d]"
                                        >

                                            <div className="flex items-center justify-between gap-4 mb-4">

                                                <div className="text-sm font-semibold text-white">

                                                    {t(
                                                        "taxIdentityConfig.additional.identifierNumber",
                                                        {
                                                            number:
                                                                index +
                                                                1,
                                                        }
                                                    )}

                                                </div>


                                                <button
                                                    type="button"

                                                    onClick={
                                                        () =>
                                                            removeAdditionalIdentifier(
                                                                index
                                                            )
                                                    }

                                                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"

                                                    aria-label={
                                                        t(
                                                            "taxIdentityConfig.additional.removeAria",
                                                            {
                                                                number:
                                                                    index +
                                                                    1,
                                                            }
                                                        )
                                                    }
                                                >

                                                    <Trash2 className="w-4 h-4" />

                                                </button>

                                            </div>


                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

                                                {/* PAÍS */}

                                                <div>

                                                    <label className="block text-xs text-gray-400 mb-2">

                                                        {t(
                                                            "taxIdentityConfig.fields.country"
                                                        )}

                                                    </label>


                                                    <select
                                                        value={
                                                            identifier
                                                                .countryCode
                                                        }

                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateAdditionalIdentifier(
                                                                index,
                                                                "countryCode",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }

                                                        className={
                                                            inputCls
                                                        }
                                                    >

                                                        {COUNTRY_OPTIONS.map(
                                                            (
                                                                country
                                                            ) => (

                                                                <option
                                                                    key={
                                                                        country
                                                                            .code
                                                                    }

                                                                    value={
                                                                        country
                                                                            .code
                                                                    }
                                                                >

                                                                    {country.flag
                                                                        ? `${country.flag} `
                                                                        : ""
                                                                    }

                                                                    {getCountryDisplayName(
                                                                        country
                                                                    )}

                                                                </option>

                                                            )
                                                        )}

                                                    </select>

                                                </div>


                                                {/* TIPO */}

                                                <div>

                                                    <label className="block text-xs text-gray-400 mb-2">

                                                        {t(
                                                            "taxIdentityConfig.fields.type"
                                                        )}

                                                    </label>


                                                    <input
                                                        type="text"

                                                        value={
                                                            identifier
                                                                .type
                                                        }

                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateAdditionalIdentifier(
                                                                index,
                                                                "type",
                                                                event
                                                                    .target
                                                                    .value
                                                                    .toUpperCase()
                                                            )
                                                        }

                                                        maxLength={
                                                            40
                                                        }

                                                        placeholder="VAT, TAX_ID..."

                                                        className={
                                                            inputCls
                                                        }
                                                    />

                                                </div>


                                                {/* ETIQUETA */}

                                                <div>

                                                    <label className="block text-xs text-gray-400 mb-2">

                                                        {t(
                                                            "taxIdentityConfig.fields.label"
                                                        )}

                                                    </label>


                                                    <input
                                                        type="text"

                                                        value={
                                                            getAdditionalLabelDisplayValue(
                                                                identifier
                                                                    .label
                                                            )
                                                        }

                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateAdditionalIdentifier(
                                                                index,
                                                                "label",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }

                                                        maxLength={
                                                            80
                                                        }

                                                        placeholder={
                                                            t(
                                                                "taxIdentityConfig.fields.visibleNamePlaceholder"
                                                            )
                                                        }

                                                        className={
                                                            inputCls
                                                        }
                                                    />

                                                </div>


                                                {/* VALOR */}

                                                <div>

                                                    <label className="block text-xs text-gray-400 mb-2">

                                                        {t(
                                                            "taxIdentityConfig.fields.numberValue"
                                                        )}

                                                    </label>


                                                    <input
                                                        type="text"

                                                        value={
                                                            identifier
                                                                .value
                                                        }

                                                        onChange={(
                                                            event
                                                        ) =>
                                                            updateAdditionalIdentifier(
                                                                index,
                                                                "value",
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }

                                                        maxLength={
                                                            120
                                                        }

                                                        placeholder={
                                                            t(
                                                                "taxIdentityConfig.fields.taxIdentifierPlaceholder"
                                                            )
                                                        }

                                                        className={
                                                            inputCls
                                                        }
                                                    />

                                                </div>

                                            </div>


                                            <div className="mt-4 flex items-center justify-between gap-4">

                                                <span className="text-xs text-gray-400">

                                                    {t(
                                                        "taxIdentityConfig.additional.useWhenApplicable"
                                                    )}

                                                </span>


                                                <div className="flex items-center gap-3">

                                                    <span
                                                        className={`text-xs ${
                                                            identifier
                                                                .active
                                                                ? "text-green-300"
                                                                : "text-gray-500"
                                                        }`}
                                                    >

                                                        {identifier
                                                            .active
                                                            ? t(
                                                                "taxIdentityConfig.status.active"
                                                            )
                                                            : t(
                                                                "taxIdentityConfig.status.inactive"
                                                            )
                                                        }

                                                    </span>


                                                    <Switch
                                                        checked={
                                                            identifier
                                                                .active
                                                        }

                                                        onChange={(
                                                            value
                                                        ) =>
                                                            updateAdditionalIdentifier(
                                                                index,
                                                                "active",
                                                                value
                                                            )
                                                        }

                                                        ariaLabel={
                                                            t(
                                                                "taxIdentityConfig.additional.toggleAria",
                                                                {
                                                                    number:
                                                                        index +
                                                                        1,
                                                                }
                                                            )
                                                        }
                                                    />

                                                </div>

                                            </div>

                                        </div>

                                    )
                                )}

                        </div>

                    )}

                </section>


                {/* INFO */}

                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">

                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />


                    <p className="text-xs text-gray-300 leading-relaxed">

                        {t(
                            "taxIdentityConfig.info"
                        )}

                    </p>

                </div>


                {/* GUARDAR */}

                <div className="flex justify-end">

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
                                "taxIdentityConfig.actions.saving"
                            )
                            : t(
                                "taxIdentityConfig.actions.saveChanges"
                            )
                        }

                    </button>

                </div>

            </div>

        </div>
    );
}