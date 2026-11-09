import React, { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import usePrinters from "../../hooks/usePrinters.js";

const inputCls =
    "w-full p-3 border border-gray-800/50 rounded-xl bg-[#1a1a1a] text-white text-sm " +
    "focus:outline-none focus:border-[#38bdf8]/50 transition-colors";

const emptyForm = {
    alias: "",
    name: "",
    category: "ticket",
    mode: "browser",
    type: "thermal",
    ip: "",
    port: 9100,
    host: "",
    paperSize: "80mm",
    qzHost: "localhost",
    qzPort: 8181,
    isDefault: false,
    isActive: true,
    notes: "",
};

const CATEGORY_KEYS = {
    ticket: "printersConfig.categories.ticket",
    invoice: "printersConfig.categories.invoice",
    kitchen: "printersConfig.categories.kitchen",
    bar: "printersConfig.categories.bar",
    delivery: "printersConfig.categories.delivery",
    other: "printersConfig.categories.other",
};

const MODE_KEYS = {
    browser: "printersConfig.modes.browser",
    qz: "printersConfig.modes.qz",
    network: "printersConfig.modes.network",
};

export default function PrintersConfig() {
    const { t } = useTranslation();

    const [category, setCategory] = useState("");

    const {
        printers,
        isLoadingPrinters,
        createPrinter,
        updatePrinter,
        deletePrinter,
        setDefaultPrinter,
    } = usePrinters(category);

    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);

    const grouped = useMemo(() => printers || [], [printers]);

    const getCategoryLabel = (value) => {
        const key =
            CATEGORY_KEYS[String(value || "").trim().toLowerCase()];

        return key
            ? t(key)
            : value || t("printersConfig.categories.other");
    };

    const getModeLabel = (value) => {
        const key =
            MODE_KEYS[String(value || "").trim().toLowerCase()];

        return key
            ? t(key)
            : value || "—";
    };

    const submit = async () => {
        const payload = {
            ...form,
            port: Number(form.port || 9100),
            qzPort: Number(form.qzPort || 8181),
        };

        if (editingId) {
            await updatePrinter({
                id: editingId,
                payload,
            });
        } else {
            await createPrinter(payload);
        }

        setForm(emptyForm);
        setEditingId(null);
    };

    const editRow = (printer) => {
        setEditingId(printer._id);

        setForm({
            alias: printer.alias || "",
            name: printer.name || "",
            category: printer.category || "ticket",
            mode: printer.mode || "browser",
            type: printer.type || "thermal",
            ip: printer.ip || "",
            port: printer.port || 9100,
            host: printer.host || "",
            paperSize: printer.paperSize || "80mm",
            qzHost: printer.qzHost || "localhost",
            qzPort: printer.qzPort || 8181,
            isDefault: !!printer.isDefault,
            isActive: printer.isActive !== false,
            notes: printer.notes || "",
        });
    };

    return (
        <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] shadow-xl">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800/50">
                    <div className="p-2 bg-[#38bdf8]/10 rounded-lg border border-[#38bdf8]/20">
                        <Printer className="w-5 h-5 text-[#38bdf8]" />
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            {t("printersConfig.title")}
                        </h3>

                        <p className="text-xs text-gray-400 mt-0.5">
                            {t("printersConfig.description")}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <label>
                        <div className="text-xs text-gray-400 mb-1">
                            {t("printersConfig.fields.alias")}
                        </div>

                        <input
                            className={inputCls}
                            value={form.alias}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    alias: event.target.value,
                                }))
                            }
                        />
                    </label>

                    <label>
                        <div className="text-xs text-gray-400 mb-1">
                            {t("printersConfig.fields.name")}
                        </div>

                        <input
                            className={inputCls}
                            value={form.name}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    name: event.target.value,
                                }))
                            }
                        />
                    </label>

                    <label>
                        <div className="text-xs text-gray-400 mb-1">
                            {t("printersConfig.fields.category")}
                        </div>

                        <select
                            className={inputCls}
                            value={form.category}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    category: event.target.value,
                                }))
                            }
                        >
                            <option value="ticket">
                                {t("printersConfig.categories.ticket")}
                            </option>

                            <option value="invoice">
                                {t("printersConfig.categories.invoice")}
                            </option>

                            <option value="kitchen">
                                {t("printersConfig.categories.kitchen")}
                            </option>

                            <option value="bar">
                                {t("printersConfig.categories.bar")}
                            </option>

                            <option value="delivery">
                                {t("printersConfig.categories.delivery")}
                            </option>

                            <option value="other">
                                {t("printersConfig.categories.other")}
                            </option>
                        </select>
                    </label>

                    <label>
                        <div className="text-xs text-gray-400 mb-1">
                            {t("printersConfig.fields.mode")}
                        </div>

                        <select
                            className={inputCls}
                            value={form.mode}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    mode: event.target.value,
                                }))
                            }
                        >
                            <option value="browser">
                                {t("printersConfig.modes.browser")}
                            </option>

                            <option value="qz">
                                {t("printersConfig.modes.qz")}
                            </option>

                            <option value="network">
                                {t("printersConfig.modes.network")}
                            </option>
                        </select>
                    </label>

                    <label>
                        <div className="text-xs text-gray-400 mb-1">
                            {t("printersConfig.fields.type")}
                        </div>

                        <select
                            className={inputCls}
                            value={form.type}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    type: event.target.value,
                                }))
                            }
                        >
                            <option value="thermal">
                                {t("printersConfig.types.thermal")}
                            </option>

                            <option value="laser">
                                {t("printersConfig.types.laser")}
                            </option>

                            <option value="inkjet">
                                {t("printersConfig.types.inkjet")}
                            </option>

                            <option value="escpos">
                                {t("printersConfig.types.escpos")}
                            </option>

                            <option value="other">
                                {t("printersConfig.types.other")}
                            </option>
                        </select>
                    </label>

                    <label>
                        <div className="text-xs text-gray-400 mb-1">
                            {t("printersConfig.fields.paperSize")}
                        </div>

                        <select
                            className={inputCls}
                            value={form.paperSize}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    paperSize: event.target.value,
                                }))
                            }
                        >
                            <option value="58mm">58mm</option>
                            <option value="80mm">80mm</option>
                            <option value="A4">A4</option>
                        </select>
                    </label>
                </div>

                {(form.mode === "browser" ||
                    form.mode === "network" ||
                    form.mode === "qz") && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <label>
                            <div className="text-xs text-gray-400 mb-1">
                                IP
                            </div>

                            <input
                                className={inputCls}
                                value={form.ip}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        ip: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label>
                            <div className="text-xs text-gray-400 mb-1">
                                {t("printersConfig.fields.port")}
                            </div>

                            <input
                                className={inputCls}
                                type="number"
                                value={form.port}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        port: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label>
                            <div className="text-xs text-gray-400 mb-1">
                                Host
                            </div>

                            <input
                                className={inputCls}
                                value={form.host}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        host: event.target.value,
                                    }))
                                }
                            />
                        </label>
                    </div>
                )}

                {form.mode === "qz" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <label>
                            <div className="text-xs text-gray-400 mb-1">
                                QZ Host
                            </div>

                            <input
                                className={inputCls}
                                value={form.qzHost}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        qzHost: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label>
                            <div className="text-xs text-gray-400 mb-1">
                                QZ {t("printersConfig.fields.port")}
                            </div>

                            <input
                                className={inputCls}
                                type="number"
                                value={form.qzPort}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        qzPort: event.target.value,
                                    }))
                                }
                            />
                        </label>
                    </div>
                )}

                <label className="block mb-4">
                    <div className="text-xs text-gray-400 mb-1">
                        {t("printersConfig.fields.notes")}
                    </div>

                    <textarea
                        className={inputCls}
                        rows={3}
                        value={form.notes}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                notes: event.target.value,
                            }))
                        }
                    />
                </label>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={submit}
                        className="px-5 py-2 rounded-xl bg-[#38bdf8] text-black font-semibold hover:bg-[#7dd3fc]"
                    >
                        {editingId
                            ? t("printersConfig.actions.saveChanges")
                            : t("printersConfig.actions.addPrinter")}
                    </button>

                    {editingId && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingId(null);
                                setForm(emptyForm);
                            }}
                            className="px-5 py-2 rounded-xl border border-gray-700 text-white hover:bg-[#1a1a1a]"
                        >
                            {t("printersConfig.actions.cancelEdit")}
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                        {t("printersConfig.registered.title")}
                    </h3>

                    <select
                        className={inputCls}
                        value={category}
                        onChange={(event) =>
                            setCategory(event.target.value)
                        }
                    >
                        <option value="">
                            {t("printersConfig.filters.all")}
                        </option>

                        <option value="ticket">
                            {t("printersConfig.categories.ticket")}
                        </option>

                        <option value="invoice">
                            {t("printersConfig.categories.invoice")}
                        </option>

                        <option value="kitchen">
                            {t("printersConfig.categories.kitchen")}
                        </option>

                        <option value="bar">
                            {t("printersConfig.categories.bar")}
                        </option>

                        <option value="delivery">
                            {t("printersConfig.categories.delivery")}
                        </option>

                        <option value="other">
                            {t("printersConfig.categories.other")}
                        </option>
                    </select>
                </div>

                {isLoadingPrinters ? (
                    <div className="text-gray-400 text-sm">
                        {t("printersConfig.loading")}
                    </div>
                ) : grouped.length === 0 ? (
                    <div className="text-gray-500 text-sm">
                        {t("printersConfig.empty")}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {grouped.map((printer) => (
                            <div
                                key={printer._id}
                                className="rounded-xl border border-gray-800/50 bg-[#151515] p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-white font-semibold flex items-center gap-2">
                                            {printer.alias}

                                            {printer.isDefault && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/20">
                                                    {t(
                                                        "printersConfig.status.default"
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs text-gray-400 mt-1">
                                            {getCategoryLabel(
                                                printer.category
                                            )}
                                            {" · "}
                                            {getModeLabel(
                                                printer.mode
                                            )}
                                            {" · "}
                                            {printer.paperSize}
                                        </div>

                                        <div className="text-xs text-gray-500 mt-1">
                                            {printer.name ||
                                                t(
                                                    "printersConfig.noName"
                                                )}

                                            {printer.ip
                                                ? ` · ${printer.ip}:${printer.port}`
                                                : ""}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {!printer.isDefault && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDefaultPrinter(
                                                        printer._id
                                                    )
                                                }
                                                className="px-3 py-2 rounded-lg border border-green-500/30 text-green-300 hover:bg-green-500/10 text-xs"
                                            >
                                                {t(
                                                    "printersConfig.actions.setDefault"
                                                )}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                editRow(printer)
                                            }
                                            className="px-3 py-2 rounded-lg border border-gray-700 text-white hover:bg-[#1f1f1f] text-xs"
                                        >
                                            {t(
                                                "printersConfig.actions.edit"
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                deletePrinter(
                                                    printer._id
                                                )
                                            }
                                            className="px-3 py-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs"
                                        >
                                            {t(
                                                "printersConfig.actions.delete"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}