import React from "react";

/**
 * Muestra una tarjeta de mesa.
 * Cambios mínimos:
 * - Soporta "mesa imaginaria" (isVirtual).
 * - Muestra badge amarillo "Quick" para mesa sin número.
 */
export default function TableCard({ table, onPick }) {
    const isVirtual = !!table.isVirtual;
    const status = isVirtual ? "Quick" : table?.status || "Available";

    return (
        <div
            role="button"
            onClick={onPick}
            className="bg-[#1f1f1f] rounded-lg p-4 cursor-pointer hover:bg-[#242424] transition"
            aria-label={isVirtual ? "Sin mesa" : `Mesa ${table?.tableNo ?? "—"}`}
        >
            <div className="flex items-center justify-between">
                <p className="text-white font-semibold">
                    Mesa <span className="mx-1">→</span>{" "}
                    {isVirtual ? "—" : table?.tableNo ?? "—"}
                </p>

                {/* 🔹 Aquí añadimos la condición especial para Quick */}
                {isVirtual ? (
                    <span className="bg-yellow-600 text-xs px-2 py-1 rounded">Rapido</span>
                ) : (
                    <span
                        className={`px-2 py-1 rounded text-xs ${
                            status === "Available"
                                ? "bg-yellow-700/40"
                                : "bg-green-700/40"
                        }`}
                    >
            {status}
          </span>
                )}
            </div>

            <div className="h-12 w-12 rounded-full bg-black/40 flex items-center justify-center text-gray-300">
                {isVirtual
                    ? "—"
                    : (
                        table?.currentOrder?.customerDetails?.name
                            ?.split(" ")
                            ?.map((n) => n[0])
                            ?.join("")
                            ?.toUpperCase() || "N/A"
                    )}
            </div>

            <p className="mt-4 text-xs text-gray-400">
                Sillas: {isVirtual ? 0 : table?.seats ?? "—"}
            </p>
        </div>
    );
}
