import React from "react";

/**
 * Muestra una tarjeta de mesa.
 * - Soporta "mesa imaginaria" (isVirtual).
 * - Muestra badge amarillo para Quick / Delivery.
 * - Muestra label TER-1 / VIP-1 / SAL-1 / BAR-1 / GEN-1
 */
export default function TableCard({ table, onPick }) {
    const isVirtual = !!table?.isVirtual;
    const virtualType = table?.virtualType || "QUICK"; // QUICK / PEDIDOSYA / UBEREATS / DELIVERY
    const status = isVirtual
        ? virtualType === "QUICK"
            ? "Quick"
            : "Delivery"
        : table?.status || "Disponible";

    // ✅ 1) Primero define getAreaCode (para poder usarlo abajo sin errores)
    const getAreaCode = (areaRaw) => {
        const area = String(areaRaw || "General").trim().toLowerCase();

        if (area === "terraza") return "TER";
        if (area === "vip") return "VIP";
        if (area === "salón" || area === "salon") return "SAL";
        if (area === "barra") return "BAR";
        return "GEN";
    };

    // ✅ 2) Luego define getTableLabel
    const getTableLabel = (t) => {
        const code = getAreaCode(t?.area);
        const no = t?.tableNo ?? "—";
        return `${code}-${no}`;
    };

    const titleLeft = isVirtual ? "Canal" : "Mesa";
    const titleRight = isVirtual ? table?.displayName || "—" : getTableLabel(table);

    return (
        <div
            role="button"
            onClick={onPick}
            className="bg-[#1f1f1f] rounded-lg p-4 cursor-pointer hover:bg-[#242424] transition"
            aria-label={isVirtual ? "Sin mesa" : `Mesa ${getTableLabel(table)}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-white font-semibold">
                    {titleLeft} <span className="mx-1">→</span> {titleRight}
                </p>

                {isVirtual ? (
                    virtualType === "QUICK" ? (
                        <span className="bg-yellow-600 text-xs px-2 py-1 rounded">Rápido</span>
                    ) : (
                        <span className="bg-yellow-600 text-xs px-2 py-1 rounded">
              Delivery {table?.badgeText ? `• ${table.badgeText}` : ""}
            </span>
                    )
                ) : (
                    <span
                        className={`px-2 py-1 rounded text-xs ${
                            status === "Disponible" ? "bg-yellow-700/40" : "bg-green-700/40"
                        }`}
                    >
            {status}
          </span>
                )}
            </div>

            {/* ✅ Área debajo del header (solo mesas reales) */}
            {!isVirtual && (
                <p className="mt-2 text-xs text-gray-400">
                    Área: {(table?.area || "General").trim()}
                </p>
            )}

            {/* Avatar/Iniciales */}
            <div className="mt-3 h-12 w-12 rounded-full bg-black/40 flex items-center justify-center text-gray-300">
                {isVirtual
                    ? "—"
                    : table?.currentOrder?.customerDetails?.name
                    ?.split(" ")
                    ?.map((n) => n[0])
                    ?.join("")
                    ?.toUpperCase() || "N/A"}
            </div>

            <p className="mt-4 text-xs text-gray-400">
                Sillas: {isVirtual ? 0 : table?.seats ?? "—"}
            </p>
        </div>
    );
}