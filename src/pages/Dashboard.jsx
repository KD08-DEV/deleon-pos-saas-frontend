import React, { useState, useEffect } from "react";
import { MdTableBar, MdCategory } from "react-icons/md";
import {BiError, BiErrorAlt, BiErrorCircle, BiSolidCategory, BiSolidDish, BiSolidExit} from "react-icons/bi";
import Metrics from "../components/dashboard/Metrics";
import RecentOrders from "../components/dashboard/RecentOrders";
import Modal from "../components/dashboard/Modal";
import DishModal from "../components/dish/DishesModal.jsx";
import RemoveTableModal from "../components/tables/removeTableModal";
import RemoveDishModal from "../components/dish/removeDishModal.jsx";

const buttons = [
  { label: "Agregar Mesa", icon: <MdTableBar />, action: "table" },
  { label: "Remover Mesa", icon: <BiErrorAlt />, action: "removeTable" },
  { label: "Agregar Platos", icon: <BiSolidDish />, action: "dishes" },
  { label: "Remover Platos", icon: <BiErrorAlt/>, action: "removeDish" },

];


const tabs = ["Metrics", "Orders",];

const Dashboard = () => {

  useEffect(() => {
    document.title = "POS | Admin Dashboard"
  }, [])

    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [isDishModalOpen, setIsDishModalOpen] = useState(false);
    const [isRemoveTableModalOpen, setIsRemoveTableModalOpen] = useState(false);
    const [isRemoveDishModalOpen, setIsRemoveDishModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("Metrics");

    const handleOpenModal = (action) => {
        if (action === "table") setIsTableModalOpen(true);
        if (action === "dishes") setIsDishModalOpen(true);
        if (action === "removeTable") setIsRemoveTableModalOpen(true);
        if (action === "removeDish") setIsRemoveDishModalOpen(true);
    };

  return (
      <div className="bg-[#1f1f1f] min-h-[calc(100vh-5rem)] overflow-y-auto">
          {/* 🔹 Barra de acciones y tabs */}
          <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 px-4 md:px-8 border-b border-[#2b2b2b]">

              {/* 🔸 Botones de acciones */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {buttons.map(({ label, icon, action }, index) => (
                      <button
                          key={action || index}
                          onClick={() => handleOpenModal(action)}
                          className="bg-[#1a1a1a] hover:bg-[#262626] px-4 sm:px-5 py-2 sm:py-3 rounded-lg text-[#f5f5f5] font-medium text-sm sm:text-base flex items-center gap-1 sm:gap-2"
                      >
                          {label} {icon}
                      </button>
                  ))}
              </div>

              {/* 🔸 Tabs principales */}
              <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 sm:gap-3">
                  {tabs.map((tab) => (
                      <button
                          key={tab}
                          className={`
              px-4 sm:px-5 py-2 sm:py-3 rounded-lg text-[#f5f5f5] font-medium text-sm sm:text-base flex items-center gap-1 sm:gap-2
              ${
                              activeTab === tab
                                  ? "bg-[#262626]"
                                  : "bg-[#1a1a1a] hover:bg-[#262626]"
                          }
            `}
                          onClick={() => setActiveTab(tab)}
                      >
                          {tab}
                      </button>
                  ))}
              </div>
          </div>

          {/* 🔹 Contenido dinámico */}
          {activeTab === "Metrics" && <Metrics />}
          {activeTab === "Orders" && <RecentOrders />}
          {activeTab === "Payments" && (
              <div className="text-white p-6 container mx-auto">
                  Payment Component Coming Soon
              </div>
          )}

          {/* 🔹 Modales */}
          {isTableModalOpen && (
              <Modal setIsTableModalOpen={setIsTableModalOpen} />
          )}
          {isDishModalOpen && (
              <DishModal setIsDishesModalOpen={setIsDishModalOpen} />
          )}
          {isRemoveTableModalOpen && (
              <RemoveTableModal setIsRemoveTableModalOpen={setIsRemoveTableModalOpen} />
          )}
          {isRemoveDishModalOpen && (
              <RemoveDishModal setIsRemoveDishModalOpen={setIsRemoveDishModalOpen} />
          )}
      </div>
  );
};

export default Dashboard;
