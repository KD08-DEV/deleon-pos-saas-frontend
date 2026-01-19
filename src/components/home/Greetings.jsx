import React, { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Sparkles, Clock } from "lucide-react";

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const Greetings = memo(() => {
    const { userData } = useSelector((state) => state.user);
    const [dateTime, setDateTime] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setDateTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDate = useCallback((date) => {
        return `${MONTHS[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
    }, []);

    const formatTime = useCallback((date) => {
        return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
    }, []);

    const { formattedDate, formattedTime, greeting, firstName, professionalMessage } = useMemo(() => {
        const hour = dateTime.getHours();
        let greeting = "Buenos días";
        let professionalMessage = "Gestiona tus operaciones de manera eficiente";
        
        if (hour >= 18) {
            greeting = "Buenas noches";
            professionalMessage = "Revisa el resumen del día y prepárate para mañana";
        } else if (hour >= 12) {
            greeting = "Buenas tardes";
            professionalMessage = "Continúa brindando excelente servicio a tus clientes";
        }
        
        return {
            formattedDate: formatDate(dateTime),
            formattedTime: formatTime(dateTime),
            greeting,
            firstName: userData?.name?.split(' ')[0] || "Usuario",
            professionalMessage
        };
    }, [dateTime, formatDate, formatTime, userData?.name]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#1a1a1a] rounded-2xl p-6 sm:p-8 border border-[#2a2a2a]/50 transition-colors duration-300"
        >
            {/* Background gradient simplificado - sin animación */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 opacity-50 dark:opacity-50" />
            
            <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                {/* Saludo y mensaje profesional */}
                <div className="text-left w-full sm:w-auto flex-1">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-[#f5f5f5] mb-2 transition-colors duration-300">
                        {greeting}, {firstName}
                    </h1>
                    <p className="text-[#ababab] text-sm sm:text-base font-medium transition-colors duration-300">
                        {professionalMessage}
                    </p>
                </div>

                {/* Hora y fecha - optimizado */}
                <div className="text-left sm:text-right w-full sm:w-auto">
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20 transition-colors duration-300">
                        <div className="flex items-center gap-2 sm:justify-end mb-1">
                            <Clock className="text-blue-400 w-4 h-4 transition-colors duration-300" />
                            <p className="text-[#ababab] text-xs font-medium transition-colors duration-300">
                                {formattedDate}
                            </p>
                        </div>
                        <motion.div
                            key={formattedTime}
                            initial={{ opacity: 0.8 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="text-3xl sm:text-4xl font-bold tracking-wide bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent transition-colors duration-300"
                        >
                            {formattedTime}
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

Greetings.displayName = 'Greetings';

export default Greetings;
