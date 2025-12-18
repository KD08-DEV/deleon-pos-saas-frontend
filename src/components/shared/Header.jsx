import React from "react";
import { FaUserCircle, FaBell } from "react-icons/fa";
import logoApp from "../../assets/images/logo-mark.png";
import { useDispatch, useSelector } from "react-redux";
import { IoLogOut } from "react-icons/io5";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../../https";
import { removeUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { MdDashboard } from "react-icons/md";

const Header = () => {
    const { userData } = useSelector((state) => state.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const logoutMutation = useMutation({
        mutationFn: () => logout(),
        onSuccess: () => {
            dispatch(removeUser());
            navigate("/auth");
        },
    });

    const handleLogout = () => logoutMutation.mutate();

    return (
        <header className="flex justify-between items-center h-20 px-8 bg-[#1a1a1a]">
            <div
                onClick={() => navigate("/")}
                className="flex items-center gap-2 cursor-pointer"
            >
                <img
                    src={logoApp}
                    className="h-12 object-contain"
                />
                <h1 className="text-xl tracking-wide">
                    <span className="font-semibold text-[#f5f5f5]">DeLeon </span>
                    <span className="font-bold text-blue-500">Soft</span>
                </h1>

            </div>

            <div className="flex items-center gap-4">
                {userData?.role === "Admin" && (
                    <div
                        onClick={() => navigate("/dashboard")}
                        className="bg-[#1f1f1f] rounded-[15px] p-3 cursor-pointer"
                    >
                        <MdDashboard className="text-[#f5f5f5] text-2xl" />
                    </div>
                )}
                <div className="bg-[#1f1f1f] rounded-[15px] p-3 cursor-pointer">
                    <FaBell className="text-[#f5f5f5] text-2xl" />
                </div>
                <div className="flex items-center gap-3 cursor-pointer">
                    <FaUserCircle className="text-[#f5f5f5] text-4xl" />
                    <div className="flex flex-col items-start">
                        <h1 className="text-md text-[#f5f5f5] font-semibold tracking-wide">
                            {userData?.name || "TEST USER"}
                        </h1>
                        <p className="text-xs text-[#ababab] font-medium">
                            {userData?.role || "Role"}
                        </p>
                    </div>
                    <IoLogOut
                        onClick={handleLogout}
                        className="text-[#f5f5f5] ml-2"
                        size={40}
                    />
                </div>
            </div>
        </header>
    );
};

export default Header;
