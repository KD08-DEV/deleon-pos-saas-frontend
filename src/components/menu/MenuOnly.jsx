import React, { useState } from "react";
import { menus } from "../../constants";
import { useNavigate } from "react-router-dom";
import BottomNav from "../shared/BottomNav"; // ✅ usa tu navbar existente

const MenuOnly = () => {
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState(null);

    const handleSelectDish = (dish) => {
        localStorage.setItem("selectedDish", JSON.stringify(dish));
        navigate("/tables");
    };

    const filteredMenus = selectedCategory
        ? menus.filter((menu) => menu.name === selectedCategory)
        : menus;

    return (
        <div className="bg-[#121212] min-h-screen flex flex-col justify-between">
            <div className="p-10 flex-1">
                <h1 className="text-2xl font-bold text-white mb-6">Menu</h1>

                {/* 🔹 Categorías */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {menus.map((menu) => (
                        <div
                            key={menu.id}
                            onClick={() =>
                                setSelectedCategory(
                                    selectedCategory === menu.name ? null : menu.name
                                )
                            }
                            className={`p-4 rounded-lg text-left cursor-pointer transition-all duration-200 ${
                                selectedCategory === menu.name
                                    ? "opacity-100 scale-[1.02]"
                                    : "opacity-90"
                            }`}
                            style={{ backgroundColor: menu.bgColor }}
                        >
                            <h2 className="text-lg font-semibold text-[#f5f5f5] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {menu.icon} {menu.name}
                </span>
                                <span className="text-sm text-[#dcdcdc]">
                  {menu.items.length} Items
                </span>
                            </h2>
                        </div>
                    ))}
                </div>

                {/* 🔹 Platos (filtrados por categoría si se selecciona uno) */}
                {filteredMenus.map((menu) => (
                    <div key={menu.id} className="mb-10">
                        <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">
                            {menu.name}
                        </h2>
                        <div className="grid grid-cols-4 gap-4">
                            {menu.items.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleSelectDish(item)}
                                    className="bg-[#1a1a1a] hover:bg-[#2a2a2a] p-5 rounded-xl cursor-pointer transition-all duration-200"
                                >
                                    <h3 className="text-lg font-semibold text-[#f5f5f5] mb-2">
                                        {item.name}
                                    </h3>
                                    <p className="text-[#f6b100] text-xl font-bold">
                                        ${item.price}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 🔹 Navbar inferior (reutilizado del proyecto) */}
            <BottomNav />
        </div>
    );
};

export default MenuOnly;
``