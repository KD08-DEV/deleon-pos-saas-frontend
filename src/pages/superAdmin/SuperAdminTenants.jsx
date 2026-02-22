import React, { useEffect, useState } from "react";
import api from "@/lib/api";

const SuperAdminTenants = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ open: false, message: "", type: "error" });

    const showToast = (message, type = "error") => {
        setToast({ open: true, message, type });
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3500);
    };


    const fetchTenants = async () => {
        try {
            const res = await api.get("/api/superadmin/tenants");
            setTenants(res.data.data);
        } catch (err) {
            console.error(err);
            showToast("Error loading tenants");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const toggleStatus = async (tenantId, status) => {
        try {
            await api.patch(`/api/superadmin/tenants/${tenantId}/status`, {
                status,
            });

            fetchTenants();
        } catch (err) {
            console.error(err);
            showToast("Error updating tenant status");
        }
    };

    const changePlan = async (tenantId, plan) => {
        try {
            await api.patch(`/api/superadmin/tenants/${tenantId}/plan`, {
                plan,
            });

            fetchTenants();
        } catch (err) {
            console.error(err);
            showToast("Error updating plan");
        }
    };
    const updateFeatures = async (tenantId, patch) => {
        try {
            await api.patch(`/api/superadmin/tenants/${tenantId}/features`, patch);
            fetchTenants();
        } catch (err) {
            console.error(err);
            showToast("Error updating features");
        }
    };


    if (loading) return <p className="p-6">Loading tenants...</p>;

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-4">Tenants</h1>

            <table className="w-full bg-gray-900 rounded-xl overflow-hidden table-fixed">
                <thead className="bg-gray-800 text-left">
                <tr className="text-sm text-gray-200">
                    <th className="p-3 w-[180px]">Company</th>
                    <th className="p-3">Tenant ID</th>
                    <th className="p-3 w-[140px]">Plan</th>
                    <th className="p-3 w-[120px]">Status</th>
                    <th className="p-3 w-[260px]">Features</th>
                    <th className="p-3 w-[220px]">Actions</th>
                </tr>
                </thead>

                <tbody>
                {tenants.map((t) => (
                    <tr
                        key={t._id}
                        className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors align-middle"
                    >
                        <td className="p-3 text-gray-100 font-medium truncate">{t.name}</td>

                        <td className="p-3 text-xs text-gray-300 break-all">
                            {t.tenantId}
                        </td>

                        <td className="p-3 capitalize text-gray-100">{t.plan}</td>

                        <td className="p-3 capitalize">
          <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  t.status === "active"
                      ? "bg-green-600/20 text-green-300"
                      : "bg-red-600/20 text-red-300"
              }`}
          >
            {t.status}
          </span>
                        </td>

                        {/* FEATURES (3 toggles en una sola celda) */}
                        <td className="p-3">
                            <div className="flex items-center gap-4 text-xs text-gray-200">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={t?.features?.tax?.enabled !== false}
                                        onChange={(e) =>
                                            updateFeatures(t.tenantId, { taxEnabled: e.target.checked })
                                        }
                                    />
                                    <span>ITBIS</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={t?.features?.discount?.enabled !== false}
                                        onChange={(e) =>
                                            updateFeatures(t.tenantId, { discountEnabled: e.target.checked })
                                        }
                                    />
                                    <span>Descuento</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={t?.features?.fiscal?.enabled !== false}
                                        onChange={(e) =>
                                            updateFeatures(t.tenantId, { fiscalEnabled: e.target.checked })
                                        }
                                    />
                                    <span>NCF</span>
                                </label>
                            </div>
                        </td>

                        {/* ACTIONS */}
                        <td className="p-3">
                            <div className="flex items-center gap-2">
                                {t.status === "active" ? (
                                    <button
                                        onClick={() => toggleStatus(t.tenantId, "suspended")}
                                        className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-sm text-white"
                                    >
                                        Suspend
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => toggleStatus(t.tenantId, "active")}
                                        className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm text-white"
                                    >
                                        Activate
                                    </button>
                                )}

                                <select
                                    onChange={(e) => changePlan(t.tenantId, e.target.value)}
                                    value={t.plan}
                                    className="bg-gray-800 px-2 py-1 rounded text-sm text-gray-100"
                                >
                                    <option value="emprendedor">emprendedor</option>
                                    <option value="premium">premium</option>
                                    <option value="vip">vip</option>
                                </select>
                            </div>
                        </td>
                    </tr>
                ))}

                </tbody>
            </table>
            {toast.open && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999]">
                    <div
                        className={`px-4 py-3 rounded-xl shadow-2xl border backdrop-blur
        ${toast.type === "error"
                            ? "bg-red-500/15 border-red-500/30 text-red-200"
                            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-medium">{toast.message}</div>
                            <button
                                type="button"
                                className="ml-2 text-white/70 hover:text-white"
                                onClick={() => setToast((t) => ({ ...t, open: false }))}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SuperAdminTenants;
