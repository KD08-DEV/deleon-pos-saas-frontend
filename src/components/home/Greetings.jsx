import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

const Greetings = () => {
    const { userData } = useSelector((state) => state.user);
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
  };

  const formatTime = (date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-8 mt-5 gap-4 sm:gap-0">
            {/* Saludo y mensaje */}
            <div className="text-left w-full sm:w-auto">
                <h1 className="text-[#f5f5f5] text-xl sm:text-2xl font-semibold tracking-wide">
                    Good Morning, {userData?.name || "TEST USER"}
                </h1>
                <p className="text-[#ababab] text-sm sm:text-base">
                    Give your best services for customers 😀
                </p>
            </div>

            {/* Hora y fecha */}
            <div className="text-left sm:text-right w-full sm:w-auto">
                <h1 className="text-[#f5f5f5] text-2xl sm:text-3xl font-bold tracking-wide">
                    {formatTime(dateTime)}
                </h1>
                <p className="text-[#ababab] text-sm sm:text-base">
                    {formatDate(dateTime)}
                </p>
            </div>
        </div>
    );
};

export default Greetings;
