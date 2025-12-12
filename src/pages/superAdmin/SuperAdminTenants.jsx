import React, { useEffect, useState } from "react";
import api from "@/lib/api";

const SuperAdminTenants = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTenants = async () => {
        try {
            const res = await api.get("/api/superadmin/tenants");
            setTenants(res.data.data);
        } catch (err) {
            console.error(err);
            alert("Error loading tenants");
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
            alert("Error updating tenant status");
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
            alert("Error updating plan");
        }
    };

    if (loading) return <p className="p-6">Loading tenants...</p>;

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-4">Tenants</h1>

            <table className="w-full bg-gray-900 rounded-xl overflow-hidden">
                <thead className="bg-gray-800 text-left">
                <tr>
                    <th className="p-3">Company</th>
                    <th className="p-3">Tenant ID</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                </tr>
                </thead>

                <tbody>
                {tenants.map((t) => (
                    <tr key={t._id} className="border-b border-gray-700">
                        <td className="p-3">{t.name}</td>
                        <td className="p-3">{t.tenantId}</td>
                        <td className="p-3 capitalize">{t.plan}</td>
                        <td className="p-3 capitalize">{t.status}</td>

                        <td className="p-3 space-x-2">
                            {t.status === "active" ? (
                                <button
                                    onClick={() => toggleStatus(t.tenantId, "suspended")}
                                    className="bg-red-600 px-3 py-1 rounded"
                                >
                                    Suspend
                                </button>
                            ) : (
                                <button
                                    onClick={() => toggleStatus(t.tenantId, "active")}
                                    className="bg-green-600 px-3 py-1 rounded"
                                >
                                    Activate
                                </button>
                            )}

                            <select
                                onChange={(e) => changePlan(t.tenantId, e.target.value)}
                                defaultValue={t.plan}
                                className="bg-gray-800 px-2 py-1 rounded"
                            >
                                <option value="basic">Basic</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default SuperAdminTenants;
