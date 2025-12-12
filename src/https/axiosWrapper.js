import axios from "axios";

const defaultHeader = {
    "Content-Type": "application/json",
    Accept: "application/json",
};

export const axiosWrapper = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    withCredentials: true,
    headers: { ...defaultHeader },
});

// ✅ Interceptor que agrega el token automáticamente
axiosWrapper.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);
