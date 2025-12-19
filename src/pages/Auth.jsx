import React, { useEffect, useState } from "react";
import restaurant from "../assets/images/restaurant-img.jpg"
import logoApp from "../assets/images/logo-mark.png"
import AdminRegister from "@components/auth/AdminRegister.jsx";
import Login from "../components/auth/Login";

const Auth = () => {

  useEffect(() => {
    document.title = "POS | Auth"
  }, [])

  const [isRegister, setIsRegister] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Section */}
      <div className="w-1/2 relative flex items-center justify-center bg-cover">
        {/* BG Image */}
        <img className="w-full h-full object-cover" src={restaurant} alt="Restaurant Image" />

        {/* Black Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-80"></div>

        {/* Quote at bottom */}
        <blockquote className="absolute bottom-10 px-8 mb-10 text-2xl italic text-white">
            "Un excelente servicio transforma una simple atención en una experiencia memorable"
          <br />
          <span className="block mt-4 text-yellow-400">- Founder of DeLeon Soft</span>
        </blockquote>
      </div>

      {/* Right Section */}
      <div className="w-1/2 min-h-screen bg-[#1a1a1a] p-10">
        <div className="flex flex-col items-center gap-2">
            <img
                src={logoApp}
                className="h-20 object-contain mb-4"
            />

            <h1 className="text-xl tracking-wide">
                <span className="font-semibold text-[#f5f5f5]">DeLeon </span>
                <span className="font-bold text-blue-500">Soft</span>
            </h1>
            <p className="text-sm text-gray-400">
                Restaurant  Management System
            </p>
        </div>

        <h2 className="text-4xl text-center mt-10 font-semibold text-yellow-400 mb-10">
          {isRegister ? "Employee Registration" : " Login"}
        </h2>

        {/* Components */}  
        {isRegister ? <AdminRegister setIsRegister={setIsRegister} />: <Login />}


        <div className="flex justify-center mt-6">
         
        </div>


      </div>
    </div>
  );
};

export default Auth;
