import React, { useEffect, useState } from "react";
import api from "@/lib/api";

const SuperAdminTenants = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ open: false, message: "", type: "error" });
    const [deletePreview, setDeletePreview] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [backupConfirmed, setBackupConfirmed] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);


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

    const changeLocalization = async (t, patch) => {
        try {
            await api.patch(`/api/superadmin/tenants/${t.tenantId}/localization`, patch);
            fetchTenants();
        } catch (err) {
            showToast(err?.response?.data?.message || "Could not change country/language");
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


    const requestDeletePreview = async (tenant) => {
        setDeletePreview(null); setDeleteConfirmText(""); setBackupConfirmed(false);
        try {
            const res = await api.get(`/api/superadmin/tenants/${encodeURIComponent(tenant.tenantId)}/delete-preview`);
            setDeletePreview({ ...res.data.data, deletionEnabled: res.data.deletionEnabled });
        } catch (e) {
            const code = e?.response?.data?.code;
            const detail = e?.response?.data?.message || e?.message || "Unable to preview tenant deletion";
            showToast(`${e?.response?.status || "Network"}: ${code || detail}`);
        }
    };
    const confirmPermanentDeletion = async () => {
        const target = deletePreview?.tenant;
        if (!target || target.status !== "suspended" || !deletePreview.deletionEnabled || !backupConfirmed) return;
        if (deleteConfirmText !== `BORRAR ${target.name}`) return;
        setIsDeleting(true);
        try {
            const res = await api.delete(`/api/superadmin/tenants/${encodeURIComponent(target.tenantId)}`, {
                data: { tenantId: target.tenantId, tenantName: target.name,
                    confirmation: deleteConfirmText, backupConfirmed: true },
            });
            const remaining = res.data?.data?.storage?.errors || [];
            setDeletePreview(null);
            await fetchTenants();
            showToast(remaining.length ? "MongoDB eliminado; quedan archivos externos pendientes de revisar." : "Tenant eliminado permanentemente.", remaining.length ? "error" : "success");
        } catch (e) { showToast(e.response?.data?.code || e.response?.data?.message || "Deletion failed"); }
        finally { setIsDeleting(false); }
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
                    <th className="p-3 w-[160px]">Country / Language</th>
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
                        <td className="p-3 text-gray-100">
                            <select aria-label="Country" value={t.localization?.countryCode || "DO"} onChange={(e) => changeLocalization(t, { countryCode: e.target.value })} className="bg-gray-800 w-full rounded mb-1">
                                <option value="DO">🇩🇴 DO</option><option value="US">🇺🇸 US</option><option value="GB">🇬🇧 GB</option><option value="CA">🇨🇦 CA</option><option value="AU">🇦🇺 AU</option>
                            </select>
                            <select aria-label="Language" value={t.localization?.language || "es"} onChange={(e) => changeLocalization(t, { language: e.target.value })} className="bg-gray-800 w-full rounded">
                                <option value="es">Español</option><option value="en">English</option>
                            </select>
                        </td>

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
                                    <span>{(t.localization?.countryCode || "DO") === "DO" ? "ITBIS" : "Tax"}</span>
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

                                {(t.localization?.countryCode || "DO") === "DO" && <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={t?.features?.fiscal?.enabled !== false}
                                        onChange={(e) =>
                                            updateFeatures(t.tenantId, { fiscalEnabled: e.target.checked })
                                        }
                                    />
                                    <span>NCF</span>
                                </label>}
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
                                    value={t.plan || "emprendedor"}
                                    className="bg-gray-800 px-2 py-1 rounded text-sm text-gray-100"
                                >
                                    <option value="emprendedor">emprendedor</option>
                                    <option value="estandar">estandar</option>
                                    <option value="premium">premium</option>
                                    <option value="pro">pro</option>
                                </select>
                                <button type="button" onClick={() => requestDeletePreview(t)}
                                    className="px-2 py-1 rounded border border-red-700 text-red-300 hover:bg-red-900 text-sm">
                                    Borrar tenant
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}

                </tbody>
            </table>
            {deletePreview && <div className="fixed inset-0 z-[100000] bg-black/85 flex items-center justify-center p-4">
                <div role="dialog" aria-modal="true" aria-label="Eliminar tenant" className="bg-[#181818] text-white border border-red-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto space-y-3">
                    <h2 className="text-xl font-bold text-red-300">Eliminar empresa y todos sus datos</h2>
                    <p><strong>{deletePreview.tenant.name}</strong> ({deletePreview.tenant.tenantId})</p>
                    <p className="text-sm text-red-200">Irreversible: usuarios, platos, facturas, cajas, inventarios, ventas y demás registros de esta empresa. No afecta otros tenants.</p>
                    <p className="text-sm">MongoDB: <strong>{deletePreview.totalDocuments}</strong> documentos detectados.</p>
                    {Object.entries(deletePreview.counts || {}).filter(([, n]) => n > 0).map(([collection, n]) => <div key={collection} className="flex justify-between text-xs text-gray-400"><span>{collection}</span><span>{n}</span></div>)}
                    {deletePreview.unknownCollections?.length > 0 && <p className="text-red-400">Bloqueado: hay colecciones de esta empresa pendientes de auditar.</p>}
                    {deletePreview.tenant.status !== "suspended" && <p className="text-amber-300">Primero debes suspender la empresa.</p>}
                    {!deletePreview.deletionEnabled && <p className="text-amber-300">El borrado permanente está desactivado en el servidor. Requiere ENABLE_PERMANENT_TENANT_DELETE=true.</p>}
                    <p className="text-xs text-gray-400">Se requiere respaldo probado. Los archivos en almacenamiento externo pueden necesitar verificación adicional; el servidor informará si no pudo limpiarlos.</p>
                    <label className="flex gap-2 text-sm"><input type="checkbox" checked={backupConfirmed} onChange={e => setBackupConfirmed(e.target.checked)} /> He respaldado los datos y revisado las obligaciones legales de conservación.</label>
                    <label className="block text-sm">Escribe exactamente: <strong>BORRAR {deletePreview.tenant.name}</strong></label>
                    <input className="w-full bg-gray-800 rounded p-2" autoComplete="off" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} />
                    <div className="flex gap-3 justify-end">
                        <button type="button" className="bg-gray-600 px-4 py-2 rounded" onClick={() => setDeletePreview(null)}>Cancelar</button>
                        <button type="button" className="bg-red-600 px-4 py-2 rounded disabled:opacity-30" disabled={isDeleting || !backupConfirmed || deletePreview.tenant.status !== "suspended" || !deletePreview.deletionEnabled || Boolean(deletePreview.unknownCollections?.length) || deleteConfirmText !== `BORRAR ${deletePreview.tenant.name}`} onClick={confirmPermanentDeletion}>
                            {isDeleting ? "Eliminando…" : "Eliminar definitivamente"}
                        </button>
                    </div>
                </div>
            </div>}
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
