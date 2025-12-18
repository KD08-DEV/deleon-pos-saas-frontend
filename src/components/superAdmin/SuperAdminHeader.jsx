import React from "react";
import { FaBell, FaUserCircle } from "react-icons/fa";
import logo from "../../assets/images/logo-mark.png";

const SuperAdminHeader = ({ user }) => {
    return (
        <header className="h-16 flex items-center justify-between px-6 border-b border-[#1f1f1f] bg-[#0b0b0b]">
            {/* Logo + título */}
            <div className="flex items-center gap-3">
                <img src={logo} alt="logo" className="h-8 w-8" />
                <div>
                    <h1 className="text-sm font-semibold text-white tracking-wide">
                        SiteFort POS
                    </h1>
                    <p className="text-xs text-gray-500">SuperAdmin Panel</p>
                </div>
            </div>

            {/* Usuario */}
            <div className="flex items-center gap-4">
                <button className="relative p-2 rounded-full bg-[#18181b]">
                    <FaBell className="text-gray-300" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#eab308]" />
                </button>

                <div className="flex items-center gap-2">
                    <FaUserCircle className="text-3xl text-gray-200" />
                    <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-white">
              {user?.name || "SuperAdmin"}
            </span>
                        <span className="text-[11px] text-[#eab308] font-semibold uppercase tracking-wide">
              SuperAdmin
            </span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default SuperAdminHeader;
