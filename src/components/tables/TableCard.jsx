import React from "react";
import { useTranslation } from "react-i18next";


/**
 * Muestra una tarjeta de mesa.
 * - Soporta "mesa imaginaria" (isVirtual).
 * - Muestra badge para Quick / Delivery.
 * - Muestra label TER-1 / VIP-1 / SAL-1 / BAR-1 / GEN-1
 */
export default function TableCard({
                                      table,
                                      onPick,
                                  }) {
    const {
        t,
    } =
        useTranslation();


    const isVirtual =
        !!table?.isVirtual;


    const virtualType =
        table?.virtualType ||
        "QUICK";


    /*
     * IMPORTANTE:
     *
     * Estos valores internos NO se traducen.
     * Solo traducimos cuando los mostramos.
     */
    const status =
        isVirtual
            ? virtualType ===
            "QUICK"
                ? "Quick"
                : "Delivery"
            : table?.status ||
            "Disponible";


    /*
     * Los códigos de área permanecen iguales.
     * Son códigos internos/visuales.
     */
    const getAreaCode =
        (
            areaRaw
        ) => {

            const area =
                String(
                    areaRaw ||
                    "General"
                )
                    .trim()
                    .toLowerCase();


            if (
                area ===
                "terraza"
            ) {
                return "TER";
            }


            if (
                area ===
                "vip"
            ) {
                return "VIP";
            }


            if (
                area ===
                "salón" ||
                area ===
                "salon"
            ) {
                return "SAL";
            }


            if (
                area ===
                "barra"
            ) {
                return "BAR";
            }


            return "GEN";
        };


    const getTableLabel =
        (
            currentTable
        ) => {

            const code =
                getAreaCode(
                    currentTable
                        ?.area
                );


            const number =
                currentTable
                    ?.tableNo ??
                "—";


            return `${code}-${number}`;
        };


    const titleLeft =
        isVirtual
            ? t(
                "tableCard.channel"
            )
            : t(
                "tableCard.table"
            );


    const titleRight =
        isVirtual
            ? table
                ?.displayName ||
            "—"
            : getTableLabel(
                table
            );


    const getStatusLabel =
        () => {

            if (
                isVirtual
            ) {
                return virtualType ===
                "QUICK"
                    ? t(
                        "tableCard.quick"
                    )
                    : t(
                        "tableCard.delivery"
                    );
            }


            const normalizedStatus =
                String(
                    status ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (
                normalizedStatus ===
                "disponible"
            ) {
                return t(
                    "tableCard.available"
                );
            }


            if (
                normalizedStatus ===
                "ocupada" ||
                normalizedStatus ===
                "ocupado"
            ) {
                return t(
                    "tableCard.occupied"
                );
            }


            /*
             * Si en el futuro existe otro estado,
             * mostramos el valor recibido en vez
             * de romper compatibilidad.
             */
            return status;
        };


    const areaLabel =
        String(
            table?.area ||
            ""
        ).trim() ||
        t(
            "tableCard.general"
        );


    return (
        <div
            role="button"

            onClick={
                onPick
            }

            className="
                bg-[#1f1f1f]
                rounded-lg
                p-4
                cursor-pointer
                hover:bg-[#242424]
                transition
            "

            aria-label={
                isVirtual
                    ? t(
                        "tableCard.noTable"
                    )
                    : t(
                        "tableCard.tableAria",
                        {
                            table:
                                getTableLabel(
                                    table
                                ),
                        }
                    )
            }
        >

            {/* Header */}

            <div className="flex items-center justify-between">

                <p className="text-white font-semibold">

                    {titleLeft}

                    <span className="mx-1">
                        →
                    </span>

                    {titleRight}

                </p>


                {isVirtual ? (

                    virtualType ===
                    "QUICK" ? (

                        <span className="bg-yellow-600 text-xs px-2 py-1 rounded">

                            {t(
                                "tableCard.quick"
                            )}

                        </span>

                    ) : (

                        <span className="bg-yellow-600 text-xs px-2 py-1 rounded">

                            {t(
                                "tableCard.delivery"
                            )}

                            {table
                                ?.badgeText
                                ? ` • ${table.badgeText}`
                                : ""
                            }

                        </span>

                    )

                ) : (

                    <span
                        className={`px-2 py-1 rounded text-xs ${
                            status ===
                            "Disponible"
                                ? "bg-yellow-700/40"
                                : "bg-green-700/40"
                        }`}
                    >

                        {getStatusLabel()}

                    </span>

                )}

            </div>


            {/* Área debajo del header - solo mesas reales */}

            {!isVirtual && (

                <p className="mt-2 text-xs text-gray-400">

                    {t(
                        "tableCard.area"
                    )}:{" "}

                    {areaLabel}

                </p>

            )}


            {/* Avatar / Iniciales */}

            <div className="mt-3 h-12 w-12 rounded-full bg-black/40 flex items-center justify-center text-gray-300">

                {isVirtual
                    ? "—"
                    : table
                        ?.currentOrder
                        ?.customerDetails
                        ?.name
                        ?.split(
                            " "
                        )
                        ?.map(
                            (
                                name
                            ) =>
                                name[
                                    0
                                    ]
                        )
                        ?.join(
                            ""
                        )
                        ?.toUpperCase() ||
                    "N/A"
                }

            </div>


            <p className="mt-4 text-xs text-gray-400">

                {t(
                    "tableCard.seats"
                )}:{" "}

                {isVirtual
                    ? 0
                    : table?.seats ??
                    "—"
                }

            </p>

        </div>
    );
}