import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { MdDashboard, MdBusiness, MdAddBusiness, MdLogout } from "react-icons/md";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../../https";
import { useDispatch } from "react-redux";
import { removeUser } from "../../redux/slices/userSlice";

const SuperAdminSidebar = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const logoutMutation = useMutation({
        mutationFn: () => logout(),
        onSuccess: () => {
            dispatch(removeUser());
            navigate("/auth");
        },
    });

    const handleLogout = () => logoutMutation.mutate();

    const linkBase =
        "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors";
    const linkInactive = "text-gray-400 hover:text-white hover:bg-[#18181b]";
    const linkActive = "bg-[#eab308]/10 text-[#eab308]";

    return (
        <aside className="hidden md:flex flex-col w-64 bg-[#0b0b0b] border-r border-[#1f1f1f] py-6 px-3">
            <div className="px-3 mb-8">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">
                    SiteFort POS
                </p>
                <h1 className="text-lg font-semibold text-white">SuperAdmin</h1>
            </div>

            <nav className="flex-1 space-y-1">
                <NavLink
                    to="/superadmin"
                    end
                    className={({ isActive }) =>
                        `${linkBase} ${isActive ? linkActive : linkInactive}`
                    }
                >
                    <MdDashboard size={18} />
                    <span>Overview</span>
                </NavLink>

                <NavLink
                    to="/superadmin/tenants"
                    className={({ isActive }) =>
                        `${linkBase} ${isActive ? linkActive : linkInactive}`
                    }
                >
                    <MdBusiness size={18} />
                    <span>Tenants</span>
                </NavLink>

                <NavLink
                    to="/superadmin/create-tenant"
                    className={({ isActive }) =>
                        `${linkBase} ${isActive ? linkActive : linkInactive}`
                    }
                >
                    <MdAddBusiness size={18} />
                    <span>Create tenant</span>
                </NavLink>

                <NavLink
                    to="/superadmin/tenant-usage"
                    className={({ isActive }) =>
                        `${linkBase} ${isActive ? linkActive : linkInactive}`
                    }
                >
                    <MdDashboard size={18} />
                    <span>Tenant Usage</span>
                </NavLink>
            </nav>

            <button
                onClick={handleLogout}
                className="mt-4 mx-3 flex items-center gap-2 text-sm text-gray-400 hover:text-red-400"
            >
                <MdLogout size={18} />
                <span>Logout</span>
            </button>
        </aside>
    );
};

export default SuperAdminSidebar;
