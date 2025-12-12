// --- IMPORTS ---
import React, { useState } from "react";
import axios from "../../https/index";
import { useNavigate } from "react-router-dom";

const SuperAdminCreateTenant = () => {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({

        // Tenant info
        tenantName: "",
        plan: "basic",

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

        // Fiscal info
        ncfType: "B02",
        ncfNumber: "",
        issueDate: "",
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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

                // Business Info (corrected)
                business: {
                    name: formData.commercialName,   // <-- FIX: ESTA ES LA CLAVE
                    rnc: formData.rnc,
                    address: formData.businessAddress,
                    phone: formData.businessPhone,
                },

                // Fiscal Info
                fiscal: {
                    ncfType: formData.ncfType,
                    ncfNumber: formData.ncfNumber,
                    issueDate: formData.issueDate,
                }
            };

            const res = await axios.post("/api/user/register", payload);

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
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
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

                <div>
                    <label className="block font-semibold">NCF Type</label>
                    <input
                        type="text"
                        name="ncfType"
                        value={formData.ncfType}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                    />
                </div>

                <div>
                    <label className="block font-semibold">NCF Number</label>
                    <input
                        type="text"
                        name="ncfNumber"
                        value={formData.ncfNumber}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                    />
                </div>

                <div>
                    <label className="block font-semibold">Issue Date</label>
                    <input
                        type="date"
                        name="issueDate"
                        value={formData.issueDate}
                        onChange={handleChange}
                        className="w-full p-2 border rounded bg-white text-black"
                    />
                </div>

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
