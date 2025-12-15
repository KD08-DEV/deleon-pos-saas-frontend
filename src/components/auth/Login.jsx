import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query"
import { login } from "../../https/index"
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import api, { setScope } from "@/lib/api";
 
const Login = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const[formData, setFormData] = useState({
      email: "",
      password: "",
    });
  
    const handleChange = (e) => {
      setFormData({...formData, [e.target.name]: e.target.value});
    }

  
    const handleSubmit = (e) => {
      e.preventDefault();
      loginMutation.mutate(formData);
    }

    const loginMutation = useMutation({
        mutationFn: (reqData) => login(reqData),
        onSuccess: (res) => {
            const { data } = res;
            const token = res.data?.token;
            console.log("🔐 Login response:", data);
            if (token) {
                localStorage.setItem("token", token);
            }

            const userData = data?.data?.user || data?.user || data?.data;
            if (!userData) {
                enqueueSnackbar("No se recibió información de usuario al iniciar sesión.", { variant: "error" });
                return;
            }

            // ========================================================
            // 🔥 1. SUPERADMIN — flujo especial SIN tenant, SIN scope
            // ========================================================
            if (userData.role === "SuperAdmin") {
                dispatch(setUser({
                    _id: null,
                    name: userData.name,
                    email: userData.email,
                    phone: null,
                    role: "SuperAdmin",
                    tenantId: null,
                }));

                localStorage.removeItem("scope");

                navigate("/superadmin");
                return;
            }

            // ========================================================
            // 🔥 2. FLUJO NORMAL (Admin/Cashier/Waiter)
            // ========================================================
            const tenantId =
                userData?.tenantId || data?.tenantId || data?.data?.tenantId;

            if (!tenantId) {
                enqueueSnackbar("Tu cuenta no está asociada a ningún tenant. Contacta al administrador.", { variant: "error" });
                return;
            }

            // Guardar token
            localStorage.setItem("token", token);

            // Guardar scope completo para api.js
            setScope({
                tenantId,
                clientId: "default"
            });

        // Guardar redundante si lo usas en otras partes
            localStorage.setItem("tenantId", tenantId);
            localStorage.setItem("clientId", "default");

            console.log("🔥 Scope guardado:", {
                token,
                tenantId,
                clientId: "default"
            });

            const { _id, name, email, phone, role } = userData;
            dispatch(setUser({ _id, name, email, phone, role, tenantId }));

            navigate("/");
        },
        onError: (error) => {
            const msg = error?.response?.data?.message || "Error al iniciar sesión";
            enqueueSnackbar(msg, { variant: "error" });
        }
    });

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
            Employee Email
          </label>
          <div className="flex item-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter employee email"
              className="bg-transparent flex-1 text-white focus:outline-none"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-[#ababab] mb-2 mt-3 text-sm font-medium">
            Password
          </label>
          <div className="flex item-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className="bg-transparent flex-1 text-white focus:outline-none"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg mt-6 py-3 text-lg bg-yellow-400 text-gray-900 font-bold"
        >
          Sign in
        </button>
      </form>
    </div>
  );
};

export default Login;
