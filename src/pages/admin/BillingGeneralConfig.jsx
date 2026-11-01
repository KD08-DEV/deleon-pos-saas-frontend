import React from "react";
import { useTranslation } from "react-i18next";

import {
    CreditCard,
    ImageIcon,
    Info,
    Percent,
    Trash2,
    UploadCloud,
} from "lucide-react";

export default function BillingGeneralConfig({
                                                 form,
                                                 setForm,
                                                 data,

                                                 inputCls,
                                                 Section,
                                                 ToggleRow,

                                                 logoFile,
                                                 setLogoFile,

                                                 logoUploading,
                                                 uploadBusinessLogo,
                                                 deleteBusinessLogo,
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
        <div className="space-y-6">

            {/* Logo */}
            <Section
                title={t(
                    "billingGeneralConfig.logo.title"
                )}
                icon={ImageIcon}
                description={t(
                    "billingGeneralConfig.logo.description"
                )}
            >
                <div className="space-y-4">

                    <div className="rounded-xl border border-gray-800/50 bg-[#1a1a1a]/60 p-4">

                        <div className="flex flex-col md:flex-row md:items-center gap-4">

                            <div className="w-32 h-24 rounded-xl bg-[#111] border border-gray-800/60 flex items-center justify-center overflow-hidden">

                                {data
                                    ?.business
                                    ?.logoUrl ? (

                                    <img
                                        src={
                                            data
                                                .business
                                                .logoUrl
                                        }
                                        alt={t(
                                            "billingGeneralConfig.logo.currentAlt"
                                        )}
                                        className="max-w-full max-h-full object-contain p-2"
                                    />

                                ) : (

                                    <div className="text-center text-gray-500 text-xs px-3">

                                        {t(
                                            "billingGeneralConfig.logo.noLogo"
                                        )}

                                    </div>

                                )}

                            </div>

                            <div className="flex-1 space-y-3">

                                <div>

                                    <p className="text-sm font-semibold text-white">

                                        {t(
                                            "billingGeneralConfig.logo.currentInvoiceLogo"
                                        )}

                                    </p>

                                    <p className="text-xs text-gray-400 mt-1">

                                        {t(
                                            "billingGeneralConfig.logo.help"
                                        )}

                                    </p>

                                </div>

                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    onChange={(
                                        event
                                    ) =>
                                        setLogoFile(
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

                                {logoFile && (

                                    <p className="text-xs text-gray-400">

                                        {t(
                                            "billingGeneralConfig.logo.selected"
                                        )}
                                        :{" "}

                                        {
                                            logoFile.name
                                        }

                                    </p>

                                )}

                                <div className="flex flex-wrap gap-3">

                                    <button
                                        type="button"
                                        onClick={
                                            uploadBusinessLogo
                                        }
                                        disabled={
                                            logoUploading ||
                                            !logoFile
                                        }
                                        className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm ${
                                            logoUploading ||
                                            !logoFile
                                                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                                : "bg-[#f6b100] text-[#1f1f1f] hover:opacity-90"
                                        }`}
                                    >
                                        <UploadCloud className="w-4 h-4" />

                                        {logoUploading
                                            ? t(
                                                "billingGeneralConfig.logo.uploading"
                                            )
                                            : t(
                                                "billingGeneralConfig.logo.upload"
                                            )
                                        }
                                    </button>

                                    {data
                                        ?.business
                                        ?.logoUrl && (

                                        <button
                                            type="button"
                                            onClick={
                                                deleteBusinessLogo
                                            }
                                            disabled={
                                                logoUploading
                                            }
                                            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20"
                                        >
                                            <Trash2 className="w-4 h-4" />

                                            {t(
                                                "billingGeneralConfig.logo.delete"
                                            )}
                                        </button>

                                    )}

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </Section>

            {/* Funciones */}
            <Section
                title={t(
                    "billingGeneralConfig.features.title"
                )}
                icon={CreditCard}
                description={t(
                    "billingGeneralConfig.features.description"
                )}
            >

                <div className="space-y-1">

                    <ToggleRow
                        label={t(
                            "billingGeneralConfig.features.manualTip.label"
                        )}
                        desc={t(
                            "billingGeneralConfig.features.manualTip.description"
                        )}
                        checked={
                            !!features
                                .tipEnabled
                        }
                        onChange={(
                            value
                        ) =>
                            updateFeature(
                                "tipEnabled",
                                value
                            )
                        }
                        icon={
                            CreditCard
                        }
                    />

                    <ToggleRow
                        label={t(
                            "billingGeneralConfig.features.discounts.label"
                        )}
                        desc={t(
                            "billingGeneralConfig.features.discounts.description"
                        )}
                        checked={
                            !!features
                                .discountEnabled
                        }
                        onChange={(
                            value
                        ) =>
                            updateFeature(
                                "discountEnabled",
                                value
                            )
                        }
                        icon={Percent}
                    />

                </div>

            </Section>

            {/* Modo de cobro */}
            <Section
                title={t(
                    "billingGeneralConfig.chargeMode.title"
                )}
                icon={CreditCard}
                description={t(
                    "billingGeneralConfig.chargeMode.description"
                )}
            >

                <div className="space-y-2">

                    <select
                        value={
                            features
                                .chargeMode ||
                            "AT_COMPLETE"
                        }
                        onChange={(
                            event
                        ) =>
                            updateFeature(
                                "chargeMode",
                                event
                                    .target
                                    .value
                            )
                        }
                        className={
                            inputCls
                        }
                    >

                        <option value="AT_INVOICE">

                            {t(
                                "billingGeneralConfig.chargeMode.options.atInvoice"
                            )}

                        </option>

                        <option value="AT_COMPLETE">

                            {t(
                                "billingGeneralConfig.chargeMode.options.atComplete"
                            )}

                        </option>

                    </select>

                    <p className="text-xs text-gray-400">

                        {t(
                            "billingGeneralConfig.chargeMode.help"
                        )}

                    </p>

                </div>

            </Section>

            {/* PreFactura */}
            <Section
                title={t(
                    "billingGeneralConfig.preInvoice.title"
                )}
                icon={CreditCard}
                description={t(
                    "billingGeneralConfig.preInvoice.description"
                )}
            >

                <ToggleRow
                    label={t(
                        "billingGeneralConfig.preInvoice.label"
                    )}
                    desc={t(
                        "billingGeneralConfig.preInvoice.toggleDescription"
                    )}
                    checked={
                        !!features
                            .preInvoiceEnabled
                    }
                    onChange={(
                        value
                    ) =>
                        updateFeature(
                            "preInvoiceEnabled",
                            value
                        )
                    }
                />

                {features
                    .preInvoiceEnabled && (

                    <div className="mt-4 pt-4 border-t border-gray-800/30">

                        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">

                            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />

                            <p className="text-xs text-gray-400">

                                {t(
                                    "billingGeneralConfig.preInvoice.info"
                                )}

                            </p>

                        </div>

                    </div>

                )}

            </Section>

        </div>
    );
}