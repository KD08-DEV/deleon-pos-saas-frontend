import React, { useState } from "react";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";

const SuperAdminCreateTenant = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        // Tenant info
        tenantName: "",
        plan: "emprendedor",

        // Admin info
        adminName: "",
        adminEmail: "",
        adminPassword: "",
        adminPhone: "",

        // Business info
        commercialName: "",
        rnc: "",
        businessAddress: "",
        businessPhone: "",

        // Fiscal info (nuevo)
        fiscalEnabled: false,

        b01Active: false,
        b01Start: 1,
        b01Max: 0,

        b02Active: false,
        b02Start: 1,
        b02Max: 0,
    });

    const handleChange = (e) => {
        const { name, type, value, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const toNumber = (v, fallback = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                // Admin User Info
                name: formData.adminName,
                email: formData.adminEmail,
                password: formData.adminPassword,
                phone: formData.adminPhone,
                role: "Admin",

                // Tenant Info
                tenantName: formData.tenantName,
                plan: formData.plan,

                // Business Info
                business: {
                    name: formData.commercialName || null,
                    rnc: formData.rnc || null,
                    address: formData.businessAddress || null,
                    phone: formData.businessPhone || null,
                },

                // Fiscal Info (nuevo)
                fiscal: {
                    enabled: Boolean(formData.fiscalEnabled),
                    nextInvoiceNumber: 1,
                    ncfConfig: {
                        B01: {
                            start: toNumber(formData.b01Start, 1),
                            current: toNumber(formData.b01Start, 1),
                            max: toNumber(formData.b01Max, 0),
                            active: Boolean(formData.b01Active),
                        },
                        B02: {
                            start: toNumber(formData.b02Start, 1),
                            current: toNumber(formData.b02Start, 1),
                            max: toNumber(formData.b02Max, 0),
                            active: Boolean(formData.b02Active),
                        },
                    },
                },
            };

            // si fiscal está apagado, forzamos active false (doble seguridad)
            if (!payload.fiscal.enabled) {
                payload.fiscal.ncfConfig.B01.active = false;
                payload.fiscal.ncfConfig.B02.active = false;
            }

            const res = await api.post("/api/user/register", payload);

            if (res.data.success) {
                alert("Tenant + Admin created successfully!");
                navigate("/superadmin");
            }
        } catch (error) {
            console.error(error);
            alert(error?.response?.data?.message || "Error creating tenant");
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">Create New Tenant</h1>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Tenant Info */}
                <div>
                    <label className="block font-semibold">Tenant Name</label>
                    <input
                        type="text"
                        name="tenantName"
                        value={formData.tenantName}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                        required
                    />
                </div>

                <div>
                    <label className="block font-semibold">Plan</label>
                    <select
                        name="plan"
                        value={formData.plan}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                    >
                        <option value="emprendedor">emprendedor</option>
                        <option value="premium">premium</option>
                        <option value="vip">vip</option>
                    </select>
                </div>

                <hr className="my-5 border-gray-600" />

                {/* Business Info */}
                <h2 className="text-xl font-bold mt-4">Business Information</h2>

                <div>
                    <label className="block font-semibold">Commercial Name</label>
                    <input
                        type="text"
                        name="commercialName"
                        value={formData.commercialName}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                    />
                </div>

                <div>
                    <label className="block font-semibold">RNC (optional)</label>
                    <input
                        type="text"
                        name="rnc"
                        value={formData.rnc}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                    />
                </div>

                <div>
                    <label className="block font-semibold">Business Address</label>
                    <input
                        type="text"
                        name="businessAddress"
                        value={formData.businessAddress}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                    />
                </div>

                <div>
                    <label className="block font-semibold">Business Phone</label>
                    <input
                        type="text"
                        name="businessPhone"
                        value={formData.businessPhone}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                    />
                </div>

                <hr className="my-5 border-gray-600" />

                {/* Fiscal Info */}
                <h2 className="text-xl font-bold mt-4">Fiscal Information</h2>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        name="fiscalEnabled"
                        checked={formData.fiscalEnabled}
                        onChange={handleChange}
                    />
                    <span className="font-semibold">Habilitar comprobante fiscal (NCF)</span>
                </label>

                {formData.fiscalEnabled && (
                    <div className="space-y-6 mt-3">
                        {/* B01 */}
                        <div className="p-3 border rounded">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="b01Active"
                                    checked={formData.b01Active}
                                    onChange={handleChange}
                                />
                                <span className="font-semibold">Activar B01</span>
                            </label>

                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <label className="block text-sm">B01 Start</label>
                                    <input
                                        type="number"
                                        name="b01Start"
                                        value={formData.b01Start}
                                        onChange={handleChange}
                                        className="w-full p-2 border rounded bg-white text-black"
                                        min={1}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm">B01 Max (0 = no configurado)</label>
                                    <input
                                        type="number"
                                        name="b01Max"
                                        value={formData.b01Max}
                                        onChange={handleChange}
                                        className="w-full p-2 border rounded bg-white text-black"
                                        min={0}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* B02 */}
                        <div className="p-3 border rounded">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="b02Active"
                                    checked={formData.b02Active}
                                    onChange={handleChange}
                                />
                                <span className="font-semibold">Activar B02</span>
                            </label>

                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <label className="block text-sm">B02 Start</label>
                                    <input
                                        type="number"
                                        name="b02Start"
                                        value={formData.b02Start}
                                        onChange={handleChange}
                                        className="w-full p-2 border rounded bg-white text-black"
                                        min={1}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm">B02 Max (0 = no configurado)</label>
                                    <input
                                        type="number"
                                        name="b02Max"
                                        value={formData.b02Max}
                                        onChange={handleChange}
                                        className="w-full p-2 border rounded bg-white text-black"
                                        min={0}
                                    />
                                </div>
                            </div>
                        </div>

                        <p className="text-sm opacity-80">
                            Nota: Issue Date y el NCF específico se definen por factura, no por tenant.
                        </p>
                    </div>
                )}

                <hr className="my-5 border-gray-600" />

                {/* Admin Info */}
                <h2 className="text-xl font-bold mt-4">Admin Information</h2>

                <div>
                    <label className="block font-semibold">Admin Name</label>
                    <input
                        type="text"
                        name="adminName"
                        value={formData.adminName}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                        required
                    />
                </div>

                <div>
                    <label className="block font-semibold">Admin Email</label>
                    <input
                        type="email"
                        name="adminEmail"
                        value={formData.adminEmail}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                        required
                    />
                </div>

                <div>
                    <label className="block font-semibold">Admin Password</label>
                    <input
                        type="password"
                        name="adminPassword"
                        value={formData.adminPassword}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                        required
                    />
                </div>

                <div>
                    <label className="block font-semibold">Admin Phone</label>
                    <input
                        type="text"
                        name="adminPhone"
                        value={formData.adminPhone}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded font-bold"
                >
                    Create Tenant
                </button>
            </form>
        </div>
    );
};

export default SuperAdminCreateTenant;
