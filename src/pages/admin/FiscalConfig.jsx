// src/pages/Admin/FiscalConfig.jsx
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";

const inputCls =
    "w-full p-3 border border-gray-800 rounded-xl bg-[#0b0b0b] text-white " +
    "focus:outline-none focus:ring-2 focus:ring-yellow-500/40";

function asDateInputValue(d) {
    if (!d) return "";
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "";
    const yyyy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function Section({ title, children }) {
    return (
        <div className="p-5 rounded-2xl border border-gray-800 bg-[#111111] shadow-sm">
            <div className="text-lg font-semibold mb-4 text-white">{title}</div>
            {children}
        </div>
    );
}
function Switch({ checked, onChange, disabled }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={[
                "relative inline-flex h-6 w-11 items-center rounded-full transition",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                checked ? "bg-yellow-500" : "bg-gray-700",
            ].join(" ")}
            aria-pressed={checked}
        >
      <span
          className={[
              "inline-block h-5 w-5 transform rounded-full bg-black transition",
              checked ? "translate-x-5" : "translate-x-1",
          ].join(" ")}
      />
        </button>
    );
}

function ToggleRow({ label, desc, checked, onChange, disabled }) {
    return (
        <div className="flex items-start justify-between gap-3 py-2">
            <div>
                <div className="text-sm text-gray-100 font-medium">{label}</div>
                {desc && <div className="text-xs text-gray-400">{desc}</div>}
            </div>
            <div className="flex items-center gap-2">
        <span className={`text-xs ${checked ? "text-green-300" : "text-gray-400"}`}>
          {checked ? "Activo" : "Inactivo"}
        </span>
                <Switch checked={checked} onChange={onChange} disabled={disabled} />
            </div>
        </div>
    );
}


export default function FiscalConfig() {
    const qc = useQueryClient();
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin-fiscal-config"],
        queryFn: async () => {
            const res = await api.get("/api/admin/fiscal-config");
            return res.data?.data || null;
        },
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnReconnect: true,
    });

    const initial = useMemo(() => {
        const b01 = data?.fiscal?.ncfConfig?.B01 || {};
        const b02 = data?.fiscal?.ncfConfig?.B02 || {};
        return {
            features: {
                taxEnabled: data?.features?.tax?.enabled !== false,
                tipEnabled: data?.features?.tip?.enabled !== false,
                discountEnabled: data?.features?.discount?.enabled !== false,

            },
            fiscalEnabled: !!data?.fiscal?.enabled,

            B01: {
                active: data?.fiscal?.ncfConfig?.B01?.active !== false,
                start: b01.start ?? 1,
                current: b01.current ?? 1,
                max: b01.max ?? 0,
                expiresAt: asDateInputValue(b01.expiresAt),
            },
            B02: {
                active: data?.fiscal?.ncfConfig?.B02?.active !== false,
                start: b02.start ?? 1,
                current: b02.current ?? 1,
                max: b02.max ?? 0,
                expiresAt: asDateInputValue(b02.expiresAt),
            },
        };


    }, [data]);
    console.log("[GET fiscal-config] B02.max:", data?.fiscal?.ncfConfig?.B02?.max);
    console.log("[GET fiscal-config] raw:", data);
    const [form, setForm] = useState(null);

    // sincroniza form cuando llega data
    React.useEffect(() => {
        if (!data) return;
        setForm(initial);
    }, [data, initial]);

    if (isLoading || !form) return <div className="text-gray-400">Cargando configuración fiscal...</div>;
    if (isError) return <div className="text-red-400">Error cargando configuración fiscal.</div>;

    const setType = (type, key, value) => {
        setForm((f) => ({
            ...f,
            [type]: { ...f[type], [key]: value },
        }));
    };

    const save = async () => {
        setSaving(true);
        setMsg(null);
        try {
            // mandamos números como Number; expiresAt como string YYYY-MM-DD (el backend lo parsea)
            const payload = {
                fiscalEnabled: !!form.fiscalEnabled,
                features: {
                    tax: { enabled: !!form.features.taxEnabled },
                    tip: { enabled: !!form.features.tipEnabled },
                    discount: { enabled: !!form.features.discountEnabled },
                },
                ncfConfig: {
                    B01: {
                        active: !!form.B01.active,
                        start: Number(form.B01.start),
                        current: Number(form.B01.current),
                        max: Number(form.B01.max),
                        expiresAt: form.B01.expiresAt || null,
                    },
                    B02: {
                        active: !!form.B02.active,
                        start: Number(form.B02.start),
                        current: Number(form.B02.current),
                        max: Number(form.B02.max),
                        expiresAt: form.B02.expiresAt || null,
                    },
                },
            };
            console.log("[ADMIN] payload fiscal-config:", payload);



            const res = await  api.patch("/api/admin/fiscal-config", payload);
            if (!res.data?.success) throw new Error(res.data?.message || "No se pudo guardar");

            await qc.invalidateQueries({ queryKey: ["admin-fiscal-config"] });
            setMsg({ type: "ok", text: "Guardado correctamente." });
            console.log("[ADMIN] response fiscal-config:", res.data);
            console.log("[ADMIN] invalidated admin-fiscal-config");


        } catch (e) {
            setMsg({ type: "err", text: e?.response?.data?.message || e.message || "Error guardando" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="text-sm text-gray-400">
                Aquí puedes ajustar <b>Comienzo/Factura Actual/Max</b> y <b>Fecha de expiracion</b> de los rangos NCF B01 y B02.
            </div>

            {msg && (
                <div
                    className={`p-3 rounded-xl border ${
                        msg.type === "ok"
                            ? "border-green-500/40 bg-green-500/10 text-green-200"
                            : "border-red-500/40 bg-red-500/10 text-red-200"
                    }`}
                >
                    {msg.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section title="Funciones">
                    <div className="space-y-3">
                        <ToggleRow
                            label="NCF (Factura fiscal)"
                            desc="Habilita la emisión y visualización de comprobantes fiscales."
                            checked={!!form.fiscalEnabled}
                            onChange={(v) => setForm((f) => ({ ...f, fiscalEnabled: v }))}
                        />
                        <ToggleRow
                            label="ITBIS"
                            desc="Aplica ITBIS al total cuando corresponda."
                            checked={!!form.features.taxEnabled}
                            onChange={(v) =>
                                setForm((f) => ({ ...f, features: { ...f.features, taxEnabled: v } }))
                            }
                        />
                        <ToggleRow
                            label="Propina"
                            desc="Muestra y permite aplicar propina en la cuenta."
                            checked={!!form.features.tipEnabled}
                            onChange={(v) =>
                                setForm((f) => ({ ...f, features: { ...f.features, tipEnabled: v } }))
                            }
                        />
                        <ToggleRow
                            label="Descuento"
                            desc="Permite aplicar descuentos en la cuenta."
                            checked={!!form.features.discountEnabled}
                            onChange={(v) =>
                                setForm((f) => ({ ...f, features: { ...f.features, discountEnabled: v } }))
                            }
                        />
                    </div>
                </Section>
                <Section title="B01">
                    <div className="grid grid-cols-1 gap-3">
                        <label className="block">
                            <div className="text-xs text-gray-400 mb-1">Comienzo</div>
                            <input className={inputCls} type="number" value={form.B01.start}
                                   onChange={(e) => setType("B01", "start", e.target.value)} />
                        </label>
                        <label className="block">
                            <div className="text-xs text-gray-400 mb-1">Factura Actual</div>
                            <input className={inputCls} type="number" value={form.B01.current}
                                   onChange={(e) => setType("B01", "current", e.target.value)} />
                        </label>
                        <label className="block">
                            <div className="text-xs text-gray-400 mb-1">Max</div>
                            <input className={inputCls} type="number" value={form.B01.max}
                                   onChange={(e) => setType("B01", "max", e.target.value)} />
                        </label>
                        <label className="block">
                            <div className="text-xs text-gray-400 mb-1">Fecha de expiracion</div>
                            <input className={inputCls} type="date" value={form.B01.expiresAt}
                                   onChange={(e) => setType("B01", "expiresAt", e.target.value)} />
                            <div className="text-xs text-gray-500 mt-1">Dejar vacío para limpiar la fecha.</div>
                        </label>
                    </div>
                </Section>

                <Section title="B02">
                    <div className="grid grid-cols-1 gap-3">
                        <label className="block">
                            <div className="text-xs text-gray-400 mb-1">Comienzo</div>
                            <input className={inputCls} type="number" value={form.B02.start}
                                   onChange={(e) => setType("B02", "start", e.target.value)} />
                        </label>
                        <label className="block">
                            <div className="text-xs text-gray-400 mb-1">Factura Actual</div>
                            <input className={inputCls} type="number" value={form.B02.current}
                                   onChange={(e) => setType("B02", "current", e.target.value)} />
                        </label>
                        <label className="block">
                            <div className="text-xs text-gray-400 mb-1">Max</div>
                            <input className={inputCls} type="number" value={form.B02.max}
                                   onChange={(e) => setType("B02", "max", e.target.value)} />
                        </label>
                        <label className="block">
                            <div className="text-xs text-gray-400 mb-1">Fecha de expiracion</div>
                            <input className={inputCls} type="date" value={form.B02.expiresAt}
                                   onChange={(e) => setType("B02", "expiresAt", e.target.value)} />
                            <div className="text-xs text-gray-500 mt-1">Dejar vacío para limpiar la fecha.</div>
                        </label>
                    </div>
                </Section>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={save}
                    disabled={saving}
                    className="px-5 py-3 rounded-xl bg-[#f6b100] text-black font-semibold disabled:opacity-60"
                >
                    {saving ? "Guardando..." : "Guardar cambios"}

                </button>
            </div>
        </div>

    );

}
