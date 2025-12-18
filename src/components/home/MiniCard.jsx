import React from 'react'

const MiniCard = ({ title, icon, number, footerNum }) => {
    const footerColor =
        footerNum > 0
            ? "text-[#02ca3a]"
            : footerNum < 0
                ? "text-[#ff4d4d]"
                : "text-[#ababab]";

    // Identify card types
    const isEarnings = title === "Total Earnings" || title === "Revenue";
    const isActiveOrders = title === "Ordenes Activas";

    // Format number
    const displayedNumber = isEarnings
        ? `$${Number(number).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        : number;

    // Button color logic
    const buttonColor = isActiveOrders
        ? "bg-[#02ca3a]"
        : "bg-[#f6b100]";

    return (
        <div className="bg-[#1a1a1a] py-5 px-5 rounded-lg w-full">
            <div className="flex items-start justify-between">
                <h1 className="text-[#f5f5f5] text-base sm:text-lg font-semibold tracking-wide">
                    {title}
                </h1>

                <button
                    className={`${buttonColor} p-3 rounded-lg text-[#f5f5f5] text-xl sm:text-2xl`}
                    aria-label={title}
                >
                    {icon}
                </button>
            </div>

            <div>
                <h1 className="text-[#f5f5f5] text-3xl sm:text-4xl font-bold mt-5">
                    {displayedNumber}
                </h1>

                {/* Show these metrics ONLY for earnings, not for active orders */}
                {isEarnings && (
                    <h1 className="text-[#f5f5f5] text-sm sm:text-base mt-2">
                        <span className={footerColor}>{footerNum}%</span> than yesterday
                    </h1>
                )}
            </div>
        </div>
    );
};

export default MiniCard;
