import React from "react";
import {
    Percent,
    Plus,
    Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

function makeChargeId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return `charge_${crypto.randomUUID()}`;
    }

    return (
        `charge_${Date.now()}_` +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );
}

function getUniqueCode(
    charges = [],
    preferredCode = "SERVICE_CHARGE"
) {
    const usedCodes =
        new Set(
            charges.map(
                (charge) =>
                    String(
                        charge?.code || ""
                    )
                        .trim()
                        .toUpperCase()
            )
        );

    const base =
        String(
            preferredCode ||
            "SERVICE_CHARGE"
        )
            .trim()
            .toUpperCase();

    if (!usedCodes.has(base)) {
        return base;
    }

    let index = 2;

    while (
        usedCodes.has(
            `${base}_${index}`
        )
        ) {
        index += 1;
    }

    return `${base}_${index}`;
}

export default function ServiceChargeConfig({
                                                form,
                                                setForm,
                                                inputCls,
                                                Section,
                                                Switch,
                                            }) {
    const { t } = useTranslation();

    const config =
        form?.serviceChargeConfig || {
            enabled: false,
            charges: [],
        };

    const charges =
        Array.isArray(
            config?.charges
        )
            ? config.charges
            : [];

    const setConfigField = (
        field,
        value
    ) => {
        setForm(
            (current) => ({
                ...current,

                serviceChargeConfig: {
                    ...(
                        current
                            ?.serviceChargeConfig ||
                        {}
                    ),

                    [field]:
                    value,
                },
            })
        );
    };

    const updateCharge = (
        id,
        field,
        value
    ) => {
        setForm(
            (current) => ({
                ...current,

                serviceChargeConfig: {
                    ...current
                        .serviceChargeConfig,

                    charges:
                        (
                            current
                                ?.serviceChargeConfig
                                ?.charges ||
                            []
                        ).map(
                            (charge) =>
                                charge.id ===
                                id
                                    ? {
                                        ...charge,

                                        [field]:
                                        value,
                                    }
                                    : charge
                        ),
                },
            })
        );
    };

    const getChargeDisplayName = (
        charge,
        index
    ) => {
        const raw =
            String(
                charge?.name ||
                ""
            ).trim();

        const code =
            String(
                charge?.code ||
                ""
            )
                .trim()
                .toUpperCase();

        if (
            code ===
            "LEGAL_TIP" &&
            (
                raw ===
                "Propina legal" ||
                raw ===
                "Legal tip"
            )
        ) {
            return t(
                "serviceChargeConfig.defaults.legalTipName"
            );
        }

        if (
            raw ===
            "Nuevo cargo" ||
            raw ===
            "New charge"
        ) {
            return t(
                "serviceChargeConfig.defaults.newChargeName"
            );
        }

        if (raw) {
            return raw;
        }

        return t(
            "serviceChargeConfig.chargeFallback",
            {
                number:
                    index +
                    1,
            }
        );
    };

    const addGenericCharge = () => {
        setForm(
            (current) => {
                const currentCharges =
                    current
                        ?.serviceChargeConfig
                        ?.charges ||
                    [];

                const newCharge = {
                    id:
                        makeChargeId(),

                    /*
                     * Valor canónico persistido.
                     * Cambiar el idioma NO modifica
                     * automáticamente los datos.
                     */
                    name:
                        "Nuevo cargo",

                    code:
                        getUniqueCode(
                            currentCharges,
                            "SERVICE_CHARGE"
                        ),

                    ratePercent:
                        0,

                    active:
                        true,

                    calculationBase:
                        "NET",

                    appliesToDeliveryFee:
                        false,

                    appliesToDeliveryOrders:
                        true,

                    addToTotal:
                        true,
                };

                return {
                    ...current,

                    serviceChargeConfig: {
                        ...current
                            .serviceChargeConfig,

                        enabled:
                            true,

                        charges: [
                            ...currentCharges,
                            newCharge,
                        ],
                    },
                };
            }
        );
    };

    const addLegalTip = () => {
        setForm(
            (current) => {
                const currentCharges =
                    current
                        ?.serviceChargeConfig
                        ?.charges ||
                    [];

                const alreadyExists =
                    currentCharges.some(
                        (charge) =>
                            String(
                                charge?.code ||
                                ""
                            )
                                .trim()
                                .toUpperCase() ===
                            "LEGAL_TIP"
                    );

                if (alreadyExists) {
                    return current;
                }

                const legalTip = {
                    id:
                        makeChargeId(),

                    /*
                     * Valor canónico persistido.
                     */
                    name:
                        "Propina legal",

                    code:
                        "LEGAL_TIP",

                    ratePercent:
                        10,

                    active:
                        true,

                    calculationBase:
                        "NET",

                    appliesToDeliveryOrders:
                        true,

                    appliesToDeliveryFee:
                        false,

                    addToTotal:
                        true,
                };

                return {
                    ...current,

                    serviceChargeConfig: {
                        ...current
                            .serviceChargeConfig,

                        enabled:
                            true,

                        charges: [
                            ...currentCharges,
                            legalTip,
                        ],
                    },
                };
            }
        );
    };

    const removeCharge = (
        id
    ) => {
        setForm(
            (current) => ({
                ...current,

                serviceChargeConfig: {
                    ...current
                        .serviceChargeConfig,

                    charges:
                        (
                            current
                                ?.serviceChargeConfig
                                ?.charges ||
                            []
                        ).filter(
                            (charge) =>
                                charge.id !==
                                id
                        ),
                },
            })
        );
    };

    const hasLegalTip =
        charges.some(
            (charge) =>
                String(
                    charge?.code ||
                    ""
                )
                    .trim()
                    .toUpperCase() ===
                "LEGAL_TIP"
        );

    return (
        <Section
            title={
                t(
                    "serviceChargeConfig.title"
                )
            }

            icon={Percent}

            description={
                t(
                    "serviceChargeConfig.description"
                )
            }

            className="mt-6"
        >
            <div className="space-y-5">

                {/* HABILITAR */}

                <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-800/50 bg-[#1a1a1a]/60 p-4">

                    <div>

                        <p className="text-sm font-semibold text-white">
                            {t(
                                "serviceChargeConfig.enable.title"
                            )}
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                            {t(
                                "serviceChargeConfig.enable.description"
                            )}
                        </p>

                    </div>


                    <Switch
                        checked={
                            config.enabled ===
                            true
                        }

                        onChange={(value) =>
                            setConfigField(
                                "enabled",
                                value
                            )
                        }
                    />

                </div>


                {/* BOTONES */}

                <div className="flex flex-col sm:flex-row gap-3">

                    <button
                        type="button"

                        onClick={
                            addLegalTip
                        }

                        disabled={
                            hasLegalTip
                        }

                        className={[
                            "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold",

                            hasLegalTip
                                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                                : "bg-[#f6b100] text-black hover:bg-[#ffd633]",
                        ].join(" ")}
                    >

                        <Plus className="w-4 h-4" />


                        {hasLegalTip
                            ? t(
                                "serviceChargeConfig.actions.legalTipAdded"
                            )
                            : t(
                                "serviceChargeConfig.actions.addLegalTip"
                            )
                        }

                    </button>


                    <button
                        type="button"

                        onClick={
                            addGenericCharge
                        }

                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-700 text-gray-200 text-sm font-semibold hover:border-[#f6b100]/50 hover:text-[#f6b100]"
                    >

                        <Plus className="w-4 h-4" />


                        {t(
                            "serviceChargeConfig.actions.addCharge"
                        )}

                    </button>

                </div>


                {/* LISTA */}

                {charges.length === 0 ? (

                    <div className="rounded-xl border border-dashed border-gray-700 p-6 text-center">

                        <p className="text-sm text-gray-400">
                            {t(
                                "serviceChargeConfig.empty"
                            )}
                        </p>

                    </div>

                ) : (

                    <div className="space-y-4">

                        {charges.map(
                            (
                                charge,
                                index
                            ) => (

                                <div
                                    key={
                                        charge.id
                                    }

                                    className="rounded-xl border border-gray-800/50 bg-[#111]/80 p-4 space-y-4"
                                >

                                    <div className="flex items-center justify-between gap-3">

                                        <div>

                                            <p className="text-sm font-semibold text-white">

                                                {getChargeDisplayName(
                                                    charge,
                                                    index
                                                )}

                                            </p>


                                            <p className="text-[11px] text-gray-500 mt-1">

                                                {charge.code ||
                                                    t(
                                                        "serviceChargeConfig.noCode"
                                                    )
                                                }

                                            </p>

                                        </div>


                                        <button
                                            type="button"

                                            onClick={() =>
                                                removeCharge(
                                                    charge.id
                                                )
                                            }

                                            className="p-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20"

                                            title={
                                                t(
                                                    "serviceChargeConfig.actions.deleteCharge"
                                                )
                                            }

                                            aria-label={
                                                t(
                                                    "serviceChargeConfig.actions.deleteCharge"
                                                )
                                            }
                                        >

                                            <Trash2 className="w-4 h-4" />

                                        </button>

                                    </div>


                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                        <label>

                                            <div className="text-xs text-gray-400 mb-1">

                                                {t(
                                                    "serviceChargeConfig.fields.name"
                                                )}

                                            </div>


                                            <input
                                                className={
                                                    inputCls
                                                }

                                                value={
                                                    getChargeDisplayName(
                                                        charge,
                                                        index
                                                    )
                                                }

                                                onChange={(event) =>
                                                    updateCharge(
                                                        charge.id,
                                                        "name",
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
                                                    "serviceChargeConfig.fields.code"
                                                )}

                                            </div>


                                            <input
                                                className={
                                                    inputCls
                                                }

                                                value={
                                                    charge.code ||
                                                    ""
                                                }

                                                onChange={(event) =>
                                                    updateCharge(
                                                        charge.id,
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
                                                    "serviceChargeConfig.fields.percentage"
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
                                                    charge
                                                        .ratePercent ??
                                                    0
                                                }

                                                onChange={(event) =>
                                                    updateCharge(
                                                        charge.id,
                                                        "ratePercent",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />

                                        </label>

                                    </div>


                                    <label className="block">

                                        <div className="text-xs text-gray-400 mb-1">

                                            {t(
                                                "serviceChargeConfig.fields.calculationBase"
                                            )}

                                        </div>


                                        <select
                                            className={
                                                inputCls
                                            }

                                            value={
                                                charge
                                                    .calculationBase ||
                                                "NET"
                                            }

                                            onChange={(event) =>
                                                updateCharge(
                                                    charge.id,
                                                    "calculationBase",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >

                                            <option value="NET">

                                                {t(
                                                    "serviceChargeConfig.calculationBase.net"
                                                )}

                                            </option>


                                            <option value="AFTER_TAX">

                                                {t(
                                                    "serviceChargeConfig.calculationBase.afterTax"
                                                )}

                                            </option>

                                        </select>

                                    </label>


                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                                        {/* ACTIVO */}

                                        <div className="min-h-[94px] flex items-start justify-between gap-4 rounded-xl border border-gray-800/50 bg-[#0d0d0d] p-4">

                                            <div className="min-w-0 pr-2">

                                                <p className="text-sm font-semibold text-gray-100">

                                                    {t(
                                                        "serviceChargeConfig.options.active.title"
                                                    )}

                                                </p>


                                                <p className="text-[11px] text-gray-500 mt-1 leading-4">

                                                    {t(
                                                        "serviceChargeConfig.options.active.description"
                                                    )}

                                                </p>

                                            </div>


                                            <div className="shrink-0 pt-0.5">

                                                <Switch
                                                    checked={
                                                        charge.active !==
                                                        false
                                                    }

                                                    onChange={(value) =>
                                                        updateCharge(
                                                            charge.id,
                                                            "active",
                                                            value
                                                        )
                                                    }
                                                />

                                            </div>

                                        </div>


                                        {/* DELIVERY */}

                                        <div className="min-h-[94px] flex items-start justify-between gap-4 rounded-xl border border-gray-800/50 bg-[#0d0d0d] p-4">

                                            <div className="min-w-0 pr-2">

                                                <p className="text-sm font-semibold text-gray-100">

                                                    {t(
                                                        "serviceChargeConfig.options.deliveryOrders.title"
                                                    )}

                                                </p>


                                                <p className="text-[11px] text-gray-500 mt-1 leading-4">

                                                    {t(
                                                        "serviceChargeConfig.options.deliveryOrders.description"
                                                    )}

                                                </p>

                                            </div>


                                            <div className="shrink-0 pt-0.5">

                                                <Switch
                                                    checked={
                                                        charge
                                                            .appliesToDeliveryOrders !==
                                                        false
                                                    }

                                                    onChange={(value) =>
                                                        updateCharge(
                                                            charge.id,
                                                            "appliesToDeliveryOrders",
                                                            value
                                                        )
                                                    }
                                                />

                                            </div>

                                        </div>


                                        {/* DELIVERY FEE */}

                                        <div className="min-h-[94px] flex items-start justify-between gap-4 rounded-xl border border-gray-800/50 bg-[#0d0d0d] p-4">

                                            <div className="min-w-0 pr-2">

                                                <p className="text-sm font-semibold text-gray-100">

                                                    {t(
                                                        "serviceChargeConfig.options.deliveryFee.title"
                                                    )}

                                                </p>


                                                <p className="text-[11px] text-gray-500 mt-1 leading-4">

                                                    {t(
                                                        "serviceChargeConfig.options.deliveryFee.description"
                                                    )}

                                                </p>

                                            </div>


                                            <div className="shrink-0 pt-0.5">

                                                <Switch
                                                    checked={
                                                        charge
                                                            .appliesToDeliveryFee ===
                                                        true
                                                    }

                                                    onChange={(value) =>
                                                        updateCharge(
                                                            charge.id,
                                                            "appliesToDeliveryFee",
                                                            value
                                                        )
                                                    }
                                                />

                                            </div>

                                        </div>


                                        {/* TOTAL */}

                                        <div className="min-h-[94px] flex items-start justify-between gap-4 rounded-xl border border-gray-800/50 bg-[#0d0d0d] p-4">

                                            <div className="min-w-0 pr-2">

                                                <p className="text-sm font-semibold text-gray-100">

                                                    {t(
                                                        "serviceChargeConfig.options.addToTotal.title"
                                                    )}

                                                </p>


                                                <p className="text-[11px] text-gray-500 mt-1 leading-4">

                                                    {t(
                                                        "serviceChargeConfig.options.addToTotal.description"
                                                    )}

                                                </p>

                                            </div>


                                            <div className="shrink-0 pt-0.5">

                                                <Switch
                                                    checked={
                                                        charge
                                                            .addToTotal !==
                                                        false
                                                    }

                                                    onChange={(value) =>
                                                        updateCharge(
                                                            charge.id,
                                                            "addToTotal",
                                                            value
                                                        )
                                                    }
                                                />

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            )
                        )}

                    </div>

                )}


                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">

                    <p className="text-xs text-blue-200">

                        {t(
                            "serviceChargeConfig.info"
                        )}

                    </p>

                </div>

            </div>

        </Section>
    );
}