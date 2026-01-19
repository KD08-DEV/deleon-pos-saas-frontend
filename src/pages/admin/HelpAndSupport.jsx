// src/pages/admin/HelpAndSupport.jsx
import React, { useState } from "react";
import {
    HelpCircle,
    Book,
    MessageCircle,
    Mail,
    Phone,
    ExternalLink,
    ChevronRight,
    Video,
    FileText,
    Code,
    Users,
    CheckCircle2,
    Settings
} from "lucide-react";

const HelpAndSupport = () => {
    const [selectedCategory, setSelectedCategory] = useState(null);

    const categories = [
        {
            id: "getting-started",
            title: "Primeros Pasos",
            icon: Book,
            color: "text-blue-400",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20",
            items: [
                {
                    title: "Guía de Inicio Rápido",
                    description: "Aprende a configurar tu restaurante en minutos",
                    type: "guide",
                },
                {
                    title: "Video Tutorial Completo",
                    description: "Guía paso a paso en video",
                    type: "video",
                    url: "#",
                },
                {
                    title: "Preguntas Frecuentes (FAQ)",
                    description: "Respuestas a las preguntas más comunes",
                    type: "faq",
                },
            ],
        },
        {
            id: "features",
            title: "Funcionalidades",
            icon: Code,
            color: "text-green-400",
            bgColor: "bg-green-500/10",
            borderColor: "border-green-500/20",
            items: [
                {
                    title: "Gestión de Órdenes",
                    description: "Cómo crear y gestionar órdenes eficientemente",
                    type: "guide",
                },
                {
                    title: "Configuración Fiscal",
                    description: "Guía completa de configuración NCF",
                    type: "guide",
                },
                {
                    title: "Gestión de Inventario",
                    description: "Control de stock y productos",
                    type: "guide",
                },
                {
                    title: "Reportes y Análisis",
                    description: "Cómo usar los reportes de ventas y productos",
                    type: "guide",
                },
            ],
        },
        {
            id: "support",
            title: "Soporte",
            icon: MessageCircle,
            color: "text-purple-400",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/20",
            items: [
                {
                    title: "Contactar Soporte",
                    description: "Envía un mensaje al equipo de soporte",
                    type: "contact",
                },
                {
                    title: "Soporte por WhatsApp",
                    description: "Chatea con nosotros por WhatsApp",
                    type: "whatsapp",
                    url: "https://wa.link/vzbps9",
                },
                {
                    title: "Email de Soporte",
                    description: "Envíanos un correo electrónico",
                    type: "email",
                    email: "soporte@sitfort.com",
                },
            ],
        },
        {
            id: "resources",
            title: "Recursos",
            icon: FileText,
            color: "text-orange-400",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/20",
            items: [
                {
                    title: "Documentación Completa",
                    description: "Accede a toda la documentación del sistema",
                    type: "docs",
                    url: "#",
                },
                {
                    title: "Centro de Ayuda",
                    description: "Busca artículos y tutoriales",
                    type: "help",
                    url: "#",
                },
                {
                    title: "Comunidad de Usuarios",
                    description: "Únete a nuestra comunidad",
                    type: "community",
                    url: "#",
                },
            ],
        },
    ];

    const quickLinks = [
        {
            label: "Crear Orden",
            icon: CheckCircle2,
            action: () => window.open("/tables", "_self"),
        },
        {
            label: "Ver Reportes",
            icon: FileText,
            action: () => window.open("/admin?tab=cash-register", "_self"),
        },
        {
            label: "Gestionar Menú",
            icon: Book,
            action: () => window.open("/admin?tab=menu-management", "_self"),
        },
        {
            label: "Configuración",
            icon: Settings,
            action: () => window.open("/admin?tab=fiscal", "_self"),
        },
    ];

    const selectedCategoryData = categories.find((cat) => cat.id === selectedCategory);

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-6 h-6 text-[#f6b100]" />
                    Ayuda y Soporte
                </h2>
                <p className="text-sm text-gray-400 mt-1">Documentación, guías y asistencia para tu restaurante</p>
            </div>

            {/* Accesos Rápidos */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Accesos Rápidos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickLinks.map((link, index) => {
                        const Icon = link.icon;
                        return (
                            <button
                                key={index}
                                onClick={link.action}
                                className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg hover:border-[#f6b100]/50 transition-all group"
                            >
                                <div className="p-2 bg-[#f6b100]/10 rounded-lg border border-[#f6b100]/20 group-hover:bg-[#f6b100]/20 transition-colors">
                                    <Icon className="w-5 h-5 text-[#f6b100]" />
                                </div>
                                <span className="text-sm font-medium text-white">{link.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {!selectedCategory ? (
                /* Vista de Categorías */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {categories.map((category) => {
                        const Icon = category.icon;
                        return (
                            <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`p-6 bg-gradient-to-br from-[#111111] to-[#0a0a0a] border rounded-2xl hover:border-[#f6b100]/50 transition-all text-left group ${category.borderColor}`}
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`p-3 rounded-lg border ${category.bgColor} ${category.borderColor}`}>
                                        <Icon className={`w-6 h-6 ${category.color}`} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white">{category.title}</h3>
                                    <ChevronRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-[#f6b100] transition-colors" />
                                </div>
                                <p className="text-sm text-gray-400">
                                    {category.items.length} {category.items.length === 1 ? "recurso" : "recursos"} disponibles
                                </p>
                            </button>
                        );
                    })}
                </div>
            ) : (
                /* Vista de Items de Categoría */
                <div>
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Volver a categorías
                    </button>

                    {selectedCategoryData && (
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`p-3 rounded-lg border ${selectedCategoryData.bgColor} ${selectedCategoryData.borderColor}`}>
                                    {React.createElement(selectedCategoryData.icon, {
                                        className: `w-6 h-6 ${selectedCategoryData.color}`,
                                    })}
                                </div>
                                <h3 className="text-xl font-bold text-white">{selectedCategoryData.title}</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedCategoryData.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="p-5 bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg hover:border-[#f6b100]/50 transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="text-base font-semibold text-white">{item.title}</h4>
                                            {item.url && (
                                                <ExternalLink className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                                        {item.type === "whatsapp" && item.url && (
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm text-[#f6b100] hover:text-[#ffd633] transition-colors"
                                            >
                                                Abrir WhatsApp
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                        {item.type === "email" && item.email && (
                                            <a
                                                href={`mailto:${item.email}`}
                                                className="inline-flex items-center gap-2 text-sm text-[#f6b100] hover:text-[#ffd633] transition-colors"
                                            >
                                                <Mail className="w-3.5 h-3.5" />
                                                Enviar Email
                                            </a>
                                        )}
                                        {item.type === "contact" && (
                                            <button
                                                onClick={() => {
                                                    const subject = encodeURIComponent("Solicitud de Soporte");
                                                    const body = encodeURIComponent("Hola, necesito ayuda con...");
                                                    window.location.href = `mailto:soporte@sitfort.com?subject=${subject}&body=${body}`;
                                                }}
                                                className="inline-flex items-center gap-2 text-sm text-[#f6b100] hover:text-[#ffd633] transition-colors"
                                            >
                                                <Mail className="w-3.5 h-3.5" />
                                                Contactar
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Información de Contacto */}
            <div className="mt-8 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Información de Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg">
                        <Mail className="w-5 h-5 text-[#f6b100]" />
                        <div>
                            <p className="text-xs text-gray-400">Email</p>
                            <a href="mailto:soporte@sitfort.com" className="text-sm text-white hover:text-[#f6b100] transition-colors">
                                soporte@sitfort.com
                            </a>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg">
                        <Phone className="w-5 h-5 text-[#f6b100]" />
                        <div>
                            <p className="text-xs text-gray-400">WhatsApp</p>
                            <a
                                href="https://wa.link/vzbps9"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-white hover:text-[#f6b100] transition-colors"
                            >
                                Chatear con nosotros
                            </a>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg">
                        <Users className="w-5 h-5 text-[#f6b100]" />
                        <div>
                            <p className="text-xs text-gray-400">Horario</p>
                            <p className="text-sm text-white">Lun - Vie: 9AM - 6PM</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpAndSupport;
