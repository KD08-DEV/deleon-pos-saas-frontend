import React from "react";
import { useTranslation } from "react-i18next";

import {
    CreditCard,
    Info,
} from "lucide-react";

export default function DeliveryConfig({
                                           form,
                                           setForm,
                                           inputCls,
                                           Section,
                                           ToggleRow,
                                       }) {
    const { t } = useTranslation();

    if (!form) {
        return null;
    }

    const features =
        form.features || {};

    const updateFeature = (
        key,
        value
    ) => {
        setForm(
            (current) => ({
                ...current,

                features: {
                    ...current.features,

                    [key]:
                    value,
                },
            })
        );
    };

    return (
        <div className="mb-6">

            <Section
                title={t(
                    "deliveryConfig.title"
                )}
                icon={CreditCard}
                description={t(
                    "deliveryConfig.description"
                )}
            >

                <div className="space-y-4">

                    {/* PedidosYa */}

                    <div className="rounded-lg border border-gray-800/30 bg-[#1a1a1a]/50 p-4">

                        <ToggleRow
                            label="PedidosYa"
                            desc={t(
                                "deliveryConfig.channels.pedidosYa.description"
                            )}
                            checked={
                                !!features
                                    .pedidosYaEnabled
                            }
                            onChange={(
                                value
                            ) =>
                                updateFeature(
                                    "pedidosYaEnabled",
                                    value
                                )
                            }
                        />

                        {features
                            .pedidosYaEnabled && (

                            <div className="mt-4 pt-4 border-t border-gray-800/30">

                                <label className="block mb-2">

                                    <div className="text-xs text-gray-400 mb-1">

                                        {t(
                                            "deliveryConfig.commission.label"
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
                                            features
                                                .pedidosYaCommissionPct ??
                                            0
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateFeature(
                                                "pedidosYaCommissionPct",
                                                Number(
                                                    event
                                                        .target
                                                        .value ||
                                                    0
                                                )
                                            )
                                        }
                                    />

                                    <div className="text-xs text-gray-500 mt-1">

                                        {t(
                                            "deliveryConfig.commission.pedidosYaExample"
                                        )}

                                    </div>

                                </label>

                            </div>

                        )}

                    </div>

                    {/* Delivery propio */}

                    <div className="rounded-lg border border-gray-800/30 bg-[#1a1a1a]/50 p-4">

                        <ToggleRow
                            label={t(
                                "deliveryConfig.channels.ownDelivery.label"
                            )}
                            desc={t(
                                "deliveryConfig.channels.ownDelivery.description"
                            )}
                            checked={
                                !!features
                                    .deliveryEnabled
                            }
                            onChange={(
                                value
                            ) =>
                                updateFeature(
                                    "deliveryEnabled",
                                    value
                                )
                            }
                        />

                    </div>

                    {/* Uber Eats */}

                    <div className="rounded-lg border border-gray-800/30 bg-[#1a1a1a]/50 p-4">

                        <ToggleRow
                            label="Uber Eats"
                            desc={t(
                                "deliveryConfig.channels.uberEats.description"
                            )}
                            checked={
                                !!features
                                    .uberEatsEnabled
                            }
                            onChange={(
                                value
                            ) =>
                                updateFeature(
                                    "uberEatsEnabled",
                                    value
                                )
                            }
                        />

                        {features
                            .uberEatsEnabled && (

                            <div className="mt-4 pt-4 border-t border-gray-800/30">

                                <label className="block mb-2">

                                    <div className="text-xs text-gray-400 mb-1">

                                        {t(
                                            "deliveryConfig.commission.label"
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
                                            features
                                                .uberEatsCommissionPct ??
                                            0
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateFeature(
                                                "uberEatsCommissionPct",
                                                Number(
                                                    event
                                                        .target
                                                        .value ||
                                                    0
                                                )
                                            )
                                        }
                                    />

                                    <div className="text-xs text-gray-500 mt-1">

                                        {t(
                                            "deliveryConfig.commission.uberEatsExample"
                                        )}

                                    </div>

                                </label>

                            </div>

                        )}

                    </div>

                    {/* Información */}

                    <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">

                        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />

                        <p className="text-xs text-gray-400">

                            {t(
                                "deliveryConfig.info.disabledChannel"
                            )}

                        </p>

                    </div>

                </div>

            </Section>

        </div>
    );
}