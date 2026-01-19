import React, {useEffect, useState} from "react";
import { register } from "../../https";
import { useMutation } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {useSelector} from "react-redux";
import {useNavigate} from "react-router-dom";

const AdminRegister = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
  });
    const user = useSelector((state) => state.user);
    const navigate = useNavigate();

    // 🚫 Bloquear acceso a usuarios que no sean admin
    useEffect(() => {
        if (!user?.userData || user?.userData?.role !== "Admin") {
            enqueueSnackbar("Access denied. Admins only.", { variant: "error" });
            navigate("/");
        }
    }, [user, navigate]);


    const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelection = (selectedRole) => {
    setFormData({ ...formData, role: selectedRole });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  const registerMutation = useMutation({
    mutationFn: (reqData) => register(reqData),
    onSuccess: (res) => {
      const { data } = res;
      enqueueSnackbar(data.message, { variant: "success" });
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "",
      });
      
      setTimeout(() => {
      }, 1500);
    },
    onError: (error) => {
      const { response } = error;
      const message = response.data.message;
      enqueueSnackbar(message, { variant: "error" });
    },
  });

    return (
        <section className="bg-[#121212] min-h-screen flex flex-col items-center justify-center px-4">
            <div className="bg-[#1a1a1a] p-8 sm:p-10 rounded-2xl shadow-lg w-full max-w-xl text-white">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#f6b100]">
                        Registrar Nuevo Usuario
                    </h1>
                    <button
                        onClick={() => navigate("/admin")}
                        className="bg-[#f6b100] text-black px-4 py-2 rounded-lg font-semibold hover:bg-[#ffd633] text-sm"
                    >
                        ← Volver
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[#ababab] text-sm mb-2">
                            Nombre del empleado
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej: Juan Pérez"
                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#f6b100] outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[#ababab] text-sm mb-2">
                            Correo electrónico
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="ejemplo@correo.com"
                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#f6b100] outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[#ababab] text-sm mb-2">
                            Número de teléfono
                        </label>
                        <input
                            type="number"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Ej: 8095551234"
                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#f6b100] outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[#ababab] text-sm mb-2">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#f6b100] outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[#ababab] text-sm mb-3">
                            Rol del empleado
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {["Camarero", "Cajera", "Admin"].map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => handleRoleSelection(role)}
                                    className={`px-4 py-3 rounded-lg font-semibold transition text-sm ${
                                        formData.role === role
                                            ? "bg-[#f6b100] text-black"
                                            : "bg-[#262626] text-[#ababab] hover:bg-[#333]"
                                    }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-6 py-3 bg-[#f6b100] text-black font-bold rounded-lg text-lg hover:bg-[#ffd633] transition"
                    >
                        Registrar Usuario
                    </button>
                </form>
            </div>
        </section>
    );
};

export default AdminRegister;
