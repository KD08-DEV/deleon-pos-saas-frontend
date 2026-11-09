import React from "react";
import { motion } from "framer-motion";

const Modal = ({ onClose, title, children }) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="bg-[#1a1a1a] rounded-xl shadow-lg w-full max-w-lg mx-4 border border-[#333] relative flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden"
            >
                <div className="flex shrink-0 justify-between items-center gap-3 px-6 py-4 border-b border-b-[#333]">
                    <h2 className="min-w-0 break-words text-xl text-[#f5f5f5] font-semibold">{title}</h2>
                    <button
                        type="button"
                        aria-label="Cerrar / Close"
                        className="shrink-0 text-gray-500 text-2xl hover:text-gray-300"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>
                <div className="min-h-0 overflow-y-auto p-6">{children}</div>
            </motion.div>
        </div>
    );
};

export default Modal;
