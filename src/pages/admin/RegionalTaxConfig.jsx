import React, {
    useMemo,
} from "react";

import {
    Globe2,
    Percent,
    Plus,
    Trash2,
} from "lucide-react";

import {
    useTranslation,
} from "react-i18next";

import {
    COUNTRY_OPTIONS,
    getCountryPreset,
} from "../../data/countryConfig.js";

import {
    SUPPORTED_LANGUAGES,
} from "../../i18n/languages.js";


function makeTaxId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return `tax_${crypto.randomUUID()}`;
    }

    return (
        `tax_${Date.now()}_` +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );
}


export default function RegionalTaxConfig({
                                              form,
                                              setForm,
                                              inputCls,
                                              Section,
                                              Switch,
                                              view = "all",
                                          }) {
    const {
        t,
        i18n,
    } = useTranslation();


    const localization =
        form?.localization ||
        {};


    const taxConfig =
        form?.taxConfig ||
        {
            enabled: true,
            defaultTaxId: null,
            taxes: [],
        };


    const taxes =
        Array.isArray(
            taxConfig.taxes
        )
            ? taxConfig.taxes
            : [];


    /*
     * ==========================================
     * DISPLAY DE PAÍSES / IDIOMAS
     * ==========================================
     *
     * Los códigos internos NO cambian:
     *
     * DO
     * US
     * es
     * en
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
                            type: "region",
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


    const languageDisplayNames =
        useMemo(
            () => {
                try {
                    return new Intl.DisplayNames(
                        [
                            currentLanguage,
                        ],
                        {
                            type: "language",
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


    const getLanguageDisplayName = (
        language
    ) => {
        const code =
            String(
                language?.code ||
                ""
            )
                .trim()
                .toLowerCase();


        if (!code) {
            return (
                language?.name ||
                ""
            );
        }


        const localizedName =
            languageDisplayNames
                ?.of(
                    code
                );


        if (localizedName) {
            return (
                localizedName
                    .charAt(0)
                    .toUpperCase() +
                localizedName
                    .slice(1)
            );
        }


        return (
            language?.name ||
            code
        );
    };


    /*
     * ==========================================
     * NOMBRE VISIBLE DEL IMPUESTO
     * ==========================================
     *
     * Solo traducimos el nombre predeterminado
     * generado por esta pantalla.
     *
     * Los impuestos personalizados del negocio
     * se muestran exactamente como fueron guardados.
     */

    const getTaxDisplayName = (
        tax,
        index
    ) => {
        const raw =
            String(
                tax?.name ||
                ""
            ).trim();


        if (
            raw ===
            "Nuevo impuesto"
        ) {
            return t(
                "regionalTaxConfig.taxes.defaults.newTax"
            );
        }


        if (raw) {
            return raw;
        }


        return t(
            "regionalTaxConfig.taxes.taxFallback",
            {
                number:
                    index +
                    1,
            }
        );
    };


    /*
     * ==========================================
     * LOCALIZACIÓN
     * ==========================================
     */

    const setLocalizationField = (
        field,
        value
    ) => {
        setForm(
            (
                current
            ) => ({
                ...current,

                localization: {
                    ...current.localization,

                    [field]:
                    value,
                },
            })
        );
    };


    const applyCountry = (
        countryCode
    ) => {
        const preset =
            getCountryPreset(
                countryCode
            );


        if (!preset) {
            return;
        }


        setForm(
            (
                current
            ) => ({
                ...current,

                localization: {
                    ...current.localization,

                    countryCode:
                    preset.countryCode,

                    language:
                    preset.language,

                    locale:
                    preset.locale,

                    currency:
                    preset.currency,

                    timezone:
                    preset.timezone,

                    dateFormat:
                    preset.dateFormat,

                    timeFormat:
                    preset.timeFormat,

                    measurementSystem:
                    preset.measurementSystem,

                    weightUnit:
                    preset.weightUnit,
                },
            })
        );
    };


    /*
     * ==========================================
     * IMPUESTOS
     * ==========================================
     */

    const setTaxConfigField = (
        field,
        value
    ) => {
        setForm(
            (
                current
            ) => ({
                ...current,

                taxConfig: {
                    ...current.taxConfig,

                    [field]:
                    value,
                },

                /*
                 * Compatibilidad temporal.
                 *
                 * taxEnabled sigue siendo
                 * un valor interno.
                 */
                features:
                    field === "enabled"
                        ? {
                            ...current.features,

                            taxEnabled:
                            value,
                        }
                        : current.features,
            })
        );
    };


    const updateTax = (
        id,
        field,
        value
    ) => {
        setForm(
            (
                current
            ) => ({
                ...current,

                taxConfig: {
                    ...current.taxConfig,

                    taxes:
                        (
                            current
                                ?.taxConfig
                                ?.taxes ||
                            []
                        ).map(
                            (
                                tax
                            ) =>
                                tax.id === id
                                    ? {
                                        ...tax,

                                        [field]:
                                        value,
                                    }
                                    : tax
                        ),
                },
            })
        );
    };


    const addTax = () => {
        const id =
            makeTaxId();


        const nextTax = {
            id,

            /*
             * Valor canónico existente.
             *
             * Cambiar idioma NO reescribe
             * este dato automáticamente.
             */
            name:
                "Nuevo impuesto",

            code:
                `TAX${taxes.length + 1}`,

            ratePercent:
                0,

            active:
                true,

            includedInPrice:
                false,

            appliesToDeliveryFee:
                false,
        };


        setForm(
            (
                current
            ) => {
                const currentTaxes =
                    current
                        ?.taxConfig
                        ?.taxes ||
                    [];


                return {
                    ...current,

                    taxConfig: {
                        ...current.taxConfig,

                        enabled:
                            true,

                        defaultTaxId:
                            current
                                ?.taxConfig
                                ?.defaultTaxId ||
                            id,

                        taxes: [
                            ...currentTaxes,
                            nextTax,
                        ],
                    },

                    features: {
                        ...current.features,

                        taxEnabled:
                            true,
                    },
                };
            }
        );
    };


    const removeTax = (taxId) => {
        const selected = taxes.find((tax) => tax.id === taxId);
        if (!selected) return;
        const warning = t("regionalTaxConfig.taxes.actions.confirmDelete", {
            defaultValue: "¿Eliminar el impuesto {{name}}? Si está asociado a un producto, el servidor impedirá eliminarlo. Puedes desactivarlo en su lugar.",
            name: selected.name,
        });
        if (!window.confirm(warning)) return;
        setForm((current) => {
            const remaining = (current?.taxConfig?.taxes || []).filter((tax) => tax.id !== taxId);
            const enabledTaxes = remaining.filter((tax) => tax.active !== false);
            const defaultTaxId = current?.taxConfig?.defaultTaxId === taxId
                ? (enabledTaxes[0]?.id || null)
                : current?.taxConfig?.defaultTaxId;
            const enabled = current?.taxConfig?.enabled === true && enabledTaxes.length > 0;
            return {
                ...current,
                taxConfig: { ...current.taxConfig, taxes: remaining, defaultTaxId, enabled },
                features: { ...current.features, taxEnabled: enabled },
            };
        });
    };

    const setDefaultTax = (
        taxId
    ) => {
        setTaxConfigField(
            "defaultTaxId",
            taxId
        );
    };


    const showRegional =
        view === "all" ||
        view === "regional";


    const showTaxes =
        view === "all" ||
        view === "taxes";


    return (
        <>

            {/* ======================================
                CONFIGURACIÓN REGIONAL
            ====================================== */}

            {showRegional && (

                <Section
                    title={
                        t(
                            "regionalTaxConfig.regional.title"
                        )
                    }

                    icon={
                        Globe2
                    }

                    description={
                        t(
                            "regionalTaxConfig.regional.description"
                        )
                    }
                >

                    <div className="space-y-5">

                        {/* PAÍS */}

                        <div>

                            <div className="text-xs text-gray-400 mb-2">

                                {t(
                                    "regionalTaxConfig.regional.fields.country"
                                )}

                            </div>


                            <select
                                className={
                                    inputCls
                                }

                                value={
                                    localization.countryCode ||
                                    "DO"
                                }

                                onChange={(
                                    event
                                ) =>
                                    applyCountry(
                                        event.target.value
                                    )
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

                                            {getCountryDisplayName(
                                                country
                                            )}{" "}
                                            ({country.code})

                                        </option>

                                    )
                                )}

                            </select>


                            <p className="text-[11px] text-gray-500 mt-2">

                                {t(
                                    "regionalTaxConfig.regional.countryHelp"
                                )}

                            </p>

                        </div>


                        {/* CAMPOS REGIONALES */}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                            {/* IDIOMA */}

                            <label>

                                <div className="text-xs text-gray-400 mb-1">

                                    {t(
                                        "regionalTaxConfig.regional.fields.language"
                                    )}

                                </div>


                                <select
                                    className={
                                        inputCls
                                    }

                                    value={
                                        localization.language ||
                                        "es"
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setLocalizationField(
                                            "language",
                                            event.target.value
                                        )
                                    }
                                >

                                    {SUPPORTED_LANGUAGES.map(
                                        (
                                            language
                                        ) => (

                                            <option
                                                key={
                                                    language.code
                                                }

                                                value={
                                                    language.code
                                                }
                                            >

                                                {getLanguageDisplayName(
                                                    language
                                                )}

                                            </option>

                                        )
                                    )}

                                </select>

                            </label>


                            {/* MONEDA */}

                            <label>

                                <div className="text-xs text-gray-400 mb-1">

                                    {t(
                                        "regionalTaxConfig.regional.fields.currency"
                                    )}

                                </div>


                                <input
                                    className={
                                        inputCls
                                    }

                                    maxLength={
                                        3
                                    }

                                    value={
                                        localization.currency ||
                                        ""
                                    }

                                    placeholder="DOP, USD, GBP, AUD..."

                                    onChange={(
                                        event
                                    ) =>
                                        setLocalizationField(
                                            "currency",
                                            event
                                                .target
                                                .value
                                                .toUpperCase()
                                        )
                                    }
                                />

                            </label>


                            {/* LOCALE */}

                            <label>

                                <div className="text-xs text-gray-400 mb-1">

                                    {t(
                                        "regionalTaxConfig.regional.fields.locale"
                                    )}

                                </div>


                                <input
                                    className={
                                        inputCls
                                    }

                                    value={
                                        localization.locale ||
                                        ""
                                    }

                                    placeholder="es-DO, en-US, en-AU..."

                                    onChange={(
                                        event
                                    ) =>
                                        setLocalizationField(
                                            "locale",
                                            event.target.value
                                        )
                                    }
                                />

                            </label>


                            {/* ZONA HORARIA */}

                            <label>

                                <div className="text-xs text-gray-400 mb-1">

                                    {t(
                                        "regionalTaxConfig.regional.fields.timezone"
                                    )}

                                </div>


                                <input
                                    className={
                                        inputCls
                                    }

                                    value={
                                        localization.timezone ||
                                        ""
                                    }

                                    placeholder="America/Santo_Domingo"

                                    onChange={(
                                        event
                                    ) =>
                                        setLocalizationField(
                                            "timezone",
                                            event.target.value
                                        )
                                    }
                                />

                            </label>


                            {/* FORMATO FECHA */}

                            <label>

                                <div className="text-xs text-gray-400 mb-1">

                                    {t(
                                        "regionalTaxConfig.regional.fields.dateFormat"
                                    )}

                                </div>


                                <select
                                    className={
                                        inputCls
                                    }

                                    value={
                                        localization.dateFormat ||
                                        "DD/MM/YYYY"
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setLocalizationField(
                                            "dateFormat",
                                            event.target.value
                                        )
                                    }
                                >

                                    <option value="DD/MM/YYYY">
                                        DD/MM/YYYY
                                    </option>

                                    <option value="MM/DD/YYYY">
                                        MM/DD/YYYY
                                    </option>

                                    <option value="YYYY-MM-DD">
                                        YYYY-MM-DD
                                    </option>

                                </select>

                            </label>


                            {/* FORMATO HORA */}

                            <label>

                                <div className="text-xs text-gray-400 mb-1">

                                    {t(
                                        "regionalTaxConfig.regional.fields.timeFormat"
                                    )}

                                </div>


                                <select
                                    className={
                                        inputCls
                                    }

                                    value={
                                        localization.timeFormat ||
                                        "12h"
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setLocalizationField(
                                            "timeFormat",
                                            event.target.value
                                        )
                                    }
                                >

                                    <option value="12h">

                                        {t(
                                            "regionalTaxConfig.regional.timeFormats.hour12"
                                        )}

                                    </option>


                                    <option value="24h">

                                        {t(
                                            "regionalTaxConfig.regional.timeFormats.hour24"
                                        )}

                                    </option>

                                </select>

                            </label>


                            {/* SISTEMA MEDIDAS */}

                            <label>

                                <div className="text-xs text-gray-400 mb-1">

                                    {t(
                                        "regionalTaxConfig.regional.fields.measurementSystem"
                                    )}

                                </div>


                                <select
                                    className={
                                        inputCls
                                    }

                                    value={
                                        localization.measurementSystem ||
                                        "imperial"
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setLocalizationField(
                                            "measurementSystem",
                                            event.target.value
                                        )
                                    }
                                >

                                    <option value="imperial">

                                        {t(
                                            "regionalTaxConfig.regional.measurementSystems.imperial"
                                        )}

                                    </option>


                                    <option value="metric">

                                        {t(
                                            "regionalTaxConfig.regional.measurementSystems.metric"
                                        )}

                                    </option>

                                </select>

                            </label>


                            {/* UNIDAD PESO */}

                            <label>

                                <div className="text-xs text-gray-400 mb-1">

                                    {t(
                                        "regionalTaxConfig.regional.fields.weightUnit"
                                    )}

                                </div>


                                <select
                                    className={
                                        inputCls
                                    }

                                    value={
                                        localization.weightUnit ||
                                        "lb"
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setLocalizationField(
                                            "weightUnit",
                                            event.target.value
                                        )
                                    }
                                >

                                    <option value="lb">

                                        {t(
                                            "regionalTaxConfig.regional.weightUnits.lb"
                                        )}

                                    </option>


                                    <option value="kg">

                                        {t(
                                            "regionalTaxConfig.regional.weightUnits.kg"
                                        )}

                                    </option>

                                </select>

                            </label>

                        </div>


                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">

                            <p className="text-xs text-blue-200">

                                {t(
                                    "regionalTaxConfig.regional.info"
                                )}

                            </p>

                        </div>

                    </div>

                </Section>

            )}


            {/* ======================================
                IMPUESTOS
            ====================================== */}

            {showTaxes && (

                <Section
                    title={
                        t(
                            "regionalTaxConfig.taxes.title"
                        )
                    }

                    icon={
                        Percent
                    }

                    description={
                        t(
                            "regionalTaxConfig.taxes.description"
                        )
                    }

                    className="mt-6"
                >

                    <div className="space-y-5">

                        {/* HABILITAR IMPUESTOS */}

                        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-800/50 bg-[#1a1a1a]/60 p-4">

                            <div>

                                <p className="text-sm font-semibold text-white">

                                    {t(
                                        "regionalTaxConfig.taxes.enable.title"
                                    )}

                                </p>


                                <p className="text-xs text-gray-400 mt-1">

                                    {t(
                                        "regionalTaxConfig.taxes.enable.description"
                                    )}

                                </p>

                            </div>


                            <Switch
                                checked={
                                    taxConfig.enabled ===
                                    true
                                }

                                onChange={(
                                    value
                                ) =>
                                    setTaxConfigField(
                                        "enabled",
                                        value
                                    )
                                }
                            />

                        </div>


                        {/* LISTA / BOTÓN */}

                        <div className="flex items-center justify-between gap-3">

                            <div>

                                <p className="text-sm font-semibold text-white">

                                    {t(
                                        "regionalTaxConfig.taxes.configuredTitle"
                                    )}

                                </p>


                                <p className="text-xs text-gray-500">

                                    {t(
                                        "regionalTaxConfig.taxes.configuredDescription"
                                    )}

                                </p>

                            </div>


                            <button
                                type="button"

                                onClick={
                                    addTax
                                }

                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#38bdf8] text-black text-sm font-semibold hover:bg-[#7dd3fc]"
                            >

                                <Plus className="w-4 h-4" />


                                {t(
                                    "regionalTaxConfig.taxes.actions.addTax"
                                )}

                            </button>

                        </div>


                        {taxes.length === 0 ? (

                            <div className="rounded-xl border border-dashed border-gray-700 p-6 text-center">

                                <p className="text-sm text-gray-400">

                                    {t(
                                        "regionalTaxConfig.taxes.empty"
                                    )}

                                </p>

                            </div>

                        ) : (

                            <div className="space-y-4">

                                {taxes.map(
                                    (
                                        tax,
                                        index
                                    ) => {
                                        const isDefault =
                                            taxConfig.defaultTaxId ===
                                            tax.id;


                                        return (
                                            <div
                                                key={
                                                    tax.id
                                                }

                                                className="rounded-xl border border-gray-800/50 bg-[#111]/80 p-4 space-y-4"
                                            >

                                                {/* HEADER IMPUESTO */}

                                                <div className="flex items-center justify-between gap-3">

                                                    <div>

                                                        <div className="flex items-center gap-2 flex-wrap">

                                                            <p className="text-sm font-semibold text-white">

                                                                {getTaxDisplayName(
                                                                    tax,
                                                                    index
                                                                )}

                                                            </p>


                                                            {isDefault && (

                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30">

                                                                    {t(
                                                                        "regionalTaxConfig.taxes.status.default"
                                                                    )}

                                                                </span>

                                                            )}


                                                            {!tax.active && (

                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">

                                                                    {t(
                                                                        "regionalTaxConfig.taxes.status.inactive"
                                                                    )}

                                                                </span>

                                                            )}

                                                        </div>

                                                    </div>


                                                    {!isDefault &&
                                                        tax.active && (

                                                            <button
                                                                type="button"

                                                                onClick={() =>
                                                                    setDefaultTax(
                                                                        tax.id
                                                                    )
                                                                }

                                                                className="text-xs px-3 py-2 rounded-lg border border-gray-700 text-gray-300 hover:border-[#38bdf8]/50 hover:text-[#38bdf8]"
                                                            >

                                                                {t(
                                                                    "regionalTaxConfig.taxes.actions.useDefault"
                                                                )}

                                                            </button>

                                                        )}

                                                </div>


                                                <div className="flex justify-end">
                                                    <button type="button" onClick={() => removeTax(tax.id)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-red-600/50 px-3 py-2 text-sm text-red-300 hover:bg-red-600/10">
                                                        <Trash2 className="h-4 w-4" />
                                                        {t("regionalTaxConfig.taxes.actions.deleteTax", { defaultValue: "Eliminar impuesto" })}
                                                    </button>
                                                </div>

                                                {/* DATOS */}

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                                    <label>

                                                        <div className="text-xs text-gray-400 mb-1">

                                                            {t(
                                                                "regionalTaxConfig.taxes.fields.name"
                                                            )}

                                                        </div>


                                                        <input
                                                            className={
                                                                inputCls
                                                            }

                                                            value={
                                                                getTaxDisplayName(
                                                                    tax,
                                                                    index
                                                                )
                                                            }

                                                            placeholder="ITBIS, VAT, Sales Tax..."

                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateTax(
                                                                    tax.id,
                                                                    "name",
                                                                    event.target.value
                                                                )
                                                            }
                                                        />

                                                    </label>


                                                    <label>

                                                        <div className="text-xs text-gray-400 mb-1">

                                                            {t(
                                                                "regionalTaxConfig.taxes.fields.code"
                                                            )}

                                                        </div>


                                                        <input
                                                            className={
                                                                inputCls
                                                            }

                                                            value={
                                                                tax.code ||
                                                                ""
                                                            }

                                                            placeholder="ITBIS"

                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateTax(
                                                                    tax.id,
                                                                    "code",
                                                                    event
                                                                        .target
                                                                        .value
                                                                        .toUpperCase()
                                                                )
                                                            }
                                                        />

                                                    </label>


                                                    <label>

                                                        <div className="text-xs text-gray-400 mb-1">

                                                            {t(
                                                                "regionalTaxConfig.taxes.fields.percentage"
                                                            )}

                                                        </div>


                                                        <input
                                                            className={
                                                                inputCls
                                                            }

                                                            type="number"

                                                            min="0"

                                                            max="100"

                                                            step="0.01"

                                                            value={
                                                                tax.ratePercent ??
                                                                0
                                                            }

                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateTax(
                                                                    tax.id,
                                                                    "ratePercent",
                                                                    event.target.value
                                                                )
                                                            }
                                                        />

                                                    </label>

                                                </div>


                                                {/* OPCIONES */}

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                                                    <div className="flex items-center justify-between rounded-lg border border-gray-800/50 p-3">

                                                        <div>

                                                            <p className="text-xs font-medium text-gray-200">

                                                                {t(
                                                                    "regionalTaxConfig.taxes.options.active"
                                                                )}

                                                            </p>

                                                        </div>


                                                        <Switch
                                                            checked={
                                                                tax.active !==
                                                                false
                                                            }

                                                            onChange={(
                                                                value
                                                            ) =>
                                                                updateTax(
                                                                    tax.id,
                                                                    "active",
                                                                    value
                                                                )
                                                            }
                                                        />

                                                    </div>


                                                    <div className="flex items-center justify-between rounded-lg border border-gray-800/50 p-3">

                                                        <div>

                                                            <p className="text-xs font-medium text-gray-200">

                                                                {t(
                                                                    "regionalTaxConfig.taxes.options.includedInPrice"
                                                                )}

                                                            </p>

                                                        </div>


                                                        <Switch
                                                            checked={
                                                                tax.includedInPrice ===
                                                                true
                                                            }

                                                            onChange={(
                                                                value
                                                            ) =>
                                                                updateTax(
                                                                    tax.id,
                                                                    "includedInPrice",
                                                                    value
                                                                )
                                                            }
                                                        />

                                                    </div>


                                                    <div className="flex items-center justify-between rounded-lg border border-gray-800/50 p-3">

                                                        <div>

                                                            <p className="text-xs font-medium text-gray-200">

                                                                {t(
                                                                    "regionalTaxConfig.taxes.options.deliveryFee"
                                                                )}

                                                            </p>

                                                        </div>


                                                        <Switch
                                                            checked={
                                                                tax.appliesToDeliveryFee ===
                                                                true
                                                            }

                                                            onChange={(
                                                                value
                                                            ) =>
                                                                updateTax(
                                                                    tax.id,
                                                                    "appliesToDeliveryFee",
                                                                    value
                                                                )
                                                            }
                                                        />

                                                    </div>

                                                </div>

                                            </div>
                                        );
                                    }
                                )}

                            </div>

                        )}


                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">

                            <p className="text-xs text-blue-200">

                                {t(
                                    "regionalTaxConfig.taxes.info"
                                )}

                            </p>

                        </div>

                    </div>

                </Section>

            )}

        </>
    );
}