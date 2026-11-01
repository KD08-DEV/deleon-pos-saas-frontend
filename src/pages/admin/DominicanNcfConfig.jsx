import React from "react";

import {
    AlertCircle,
    Calendar,
    Info,
    Receipt,
} from "lucide-react";


const getNCFInfo = (
    ncf = {}
) => {
    const start =
        Number(
            ncf.start || 0
        );

    const current =
        Number(
            ncf.current || 0
        );

    const max =
        Number(
            ncf.max || 0
        );

    const used =
        current - start;

    const total =
        max - start;

    const remaining =
        max - current;

    const percentage =
        total > 0
            ? (
                (
                    used /
                    total
                ) *
                100
            ).toFixed(1)
            : 0;

    const isExpired =
        ncf.expiresAt
            ? (
                new Date(
                    ncf.expiresAt
                ) <
                new Date()
            )
            : false;

    const isExpiringSoon =
        ncf.expiresAt
            ? {
                days:
                    Math.floor(
                        (
                            new Date(
                                ncf.expiresAt
                            ) -
                            new Date()
                        ) /
                        (
                            1000 *
                            60 *
                            60 *
                            24
                        )
                    ),
            }
            : null;

    return {
        used,
        total,
        remaining,
        percentage,
        isExpired,
        isExpiringSoon,
    };
};


function NcfTypeCard({
                         type,
                         title,
                         description,

                         form,
                         setForm,

                         inputCls,
                         Section,
                         Switch,
                     }) {
    const config =
        form[type];

    const info =
        getNCFInfo(
            config
        );

    const setType = (
        key,
        value
    ) => {
        setForm(
            (current) => ({
                ...current,

                [type]: {
                    ...current[
                        type
                        ],

                    [key]:
                    value,
                },
            })
        );
    };

    return (
        <Section
            title={title}
            icon={Receipt}
            description={
                description
            }
        >
            <div className="space-y-4">

                <div className="flex items-center justify-between p-3 bg-[#1a1a1a]/50 rounded-lg">
                    <span className="text-xs text-gray-400">
                        Estado:
                    </span>

                    <span
                        className={`text-xs font-semibold ${
                            config
                                .active
                                ? "text-green-400"
                                : "text-gray-400"
                        }`}
                    >
                        {config.active
                            ? "Activo"
                            : "Inactivo"}
                    </span>
                </div>

                {info.isExpired && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />

                        <p className="text-xs text-red-300">
                            Este rango NCF
                            ha expirado.
                        </p>
                    </div>
                )}

                {info
                        .isExpiringSoon &&
                    info
                        .isExpiringSoon
                        .days >
                    0 &&
                    info
                        .isExpiringSoon
                        .days <=
                    30 && (
                        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />

                            <p className="text-xs text-yellow-300">
                                Este rango
                                expira en{" "}
                                {
                                    info
                                        .isExpiringSoon
                                        .days
                                }{" "}
                                día(s).
                            </p>
                        </div>
                    )}

                <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                        Número de Inicio
                    </label>

                    <input
                        className={
                            inputCls
                        }
                        type="number"
                        min="1"
                        value={
                            config.start
                        }
                        onChange={(
                            e
                        ) =>
                            setType(
                                "start",
                                e
                                    .target
                                    .value
                            )
                        }
                    />
                </div>

                <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                        Número Actual
                    </label>

                    <input
                        className={
                            inputCls
                        }
                        type="number"
                        min="1"
                        value={
                            config.current
                        }
                        onChange={(
                            e
                        ) =>
                            setType(
                                "current",
                                e
                                    .target
                                    .value
                            )
                        }
                    />

                    <div className="text-xs text-gray-500 mt-1">
                        Siguiente NCF
                        a emitir.
                    </div>
                </div>

                <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                        Número Máximo
                    </label>

                    <input
                        className={
                            inputCls
                        }
                        type="number"
                        min="1"
                        value={
                            config.max
                        }
                        onChange={(
                            e
                        ) =>
                            setType(
                                "max",
                                e
                                    .target
                                    .value
                            )
                        }
                    />

                    <div className="text-xs text-gray-500 mt-1">
                        Fin del rango
                        autorizado.
                    </div>
                </div>

                <div>
                    <label className="text-xs text-gray-400 mb-1 block flex items-center gap-2">
                        <Calendar className="w-4 h-4" />

                        Fecha de
                        Expiración
                    </label>

                    <input
                        className={
                            inputCls
                        }
                        type="date"
                        value={
                            config
                                .expiresAt ||
                            ""
                        }
                        onChange={(
                            e
                        ) =>
                            setType(
                                "expiresAt",
                                e
                                    .target
                                    .value
                            )
                        }
                    />

                    <div className="text-xs text-gray-500 mt-1">
                        Dejar vacío
                        para limpiar
                        la fecha.
                    </div>
                </div>

                {Number(
                        config.max
                    ) >
                    Number(
                        config.start
                    ) && (
                        <div className="p-3 bg-[#1a1a1a]/50 rounded-lg space-y-2">

                            <div className="flex justify-between text-xs">
                            <span className="text-gray-400">
                                Usados:
                            </span>

                                <span className="text-white font-semibold">
                                {
                                    info.used
                                }
                            </span>
                            </div>

                            <div className="flex justify-between text-xs">
                            <span className="text-gray-400">
                                Disponibles:
                            </span>

                                <span className="text-green-400 font-semibold">
                                {
                                    info.remaining
                                }
                            </span>
                            </div>

                            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-2 rounded-full transition-all ${
                                        Number(
                                            info.percentage
                                        ) >
                                        80
                                            ? "bg-red-500"
                                            : Number(
                                                info.percentage
                                            ) >
                                            50
                                                ? "bg-yellow-500"
                                                : "bg-green-500"
                                    }`}
                                    style={{
                                        width: `${Math.min(
                                            Number(
                                                info.percentage
                                            ),
                                            100
                                        )}%`,
                                    }}
                                />
                            </div>

                            <div className="text-xs text-gray-500 text-center">
                                {
                                    info.percentage
                                }
                                % utilizado
                            </div>
                        </div>
                    )}

                <div className="pt-2 border-t border-gray-800/30">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-300">
                            Activar este
                            tipo NCF
                        </span>

                        <Switch
                            checked={
                                !!config
                                    .active
                            }
                            onChange={(
                                value
                            ) =>
                                setType(
                                    "active",
                                    value
                                )
                            }
                        />
                    </label>
                </div>
            </div>
        </Section>
    );
}


export default function DominicanNcfConfig({
                                               form,
                                               setForm,

                                               inputCls,
                                               Section,
                                               Switch,
                                               ToggleRow,

                                               canUseFiscal,
                                           }) {
    if (!form) {
        return null;
    }

    return (
        <>
            <div className="mb-6">
                <Section
                    title="Módulo fiscal dominicano"
                    icon={Receipt}
                    description="Activa o desactiva la emisión de comprobantes NCF para este negocio."
                >
                    <ToggleRow
                        label="Habilitar NCF"
                        desc={
                            canUseFiscal
                                ? "Permite emitir comprobantes fiscales dominicanos."
                                : "Disponible únicamente en planes con funciones fiscales."
                        }
                        checked={
                            !!form
                                .fiscalEnabled
                        }
                        onChange={(
                            value
                        ) => {
                            if (
                                !canUseFiscal
                            ) {
                                return;
                            }

                            setForm(
                                (
                                    current
                                ) => ({
                                    ...current,

                                    fiscalEnabled:
                                    value,
                                })
                            );
                        }}
                        disabled={
                            !canUseFiscal
                        }
                        icon={Receipt}
                    />
                </Section>
            </div>

            {canUseFiscal ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                    <NcfTypeCard
                        type="B01"
                        title="NCF Tipo B01"
                        description="Comprobante de Crédito Fiscal"
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

                    <NcfTypeCard
                        type="B02"
                        title="NCF Tipo B02"
                        description="Comprobante de Consumo"
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
            ) : (
                <div className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />

                        <div>
                            <h3 className="text-sm font-semibold text-yellow-200">
                                NCF disponible
                                en Plan
                                Premium o Pro
                            </h3>

                            <p className="text-xs text-gray-300 mt-1">
                                Las funciones
                                generales del
                                sistema siguen
                                disponibles.
                                Únicamente la
                                emisión NCF está
                                limitada por el
                                plan.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}