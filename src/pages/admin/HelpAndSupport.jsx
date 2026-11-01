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
    FileText,
    Code,
    Users,
    CheckCircle2,
    Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const HelpAndSupport = () => {
    const { t } = useTranslation();

    const [
        selectedCategory,
        setSelectedCategory,
    ] = useState(null);

    /*
     * ==========================================
     * CATEGORÍAS DE AYUDA
     * ==========================================
     *
     * Los IDs y tipos internos NO se traducen.
     */

    const categories = [
        {
            id: "getting-started",

            title: t(
                "helpAndSupport.categories.gettingStarted.title"
            ),

            icon: Book,

            color:
                "text-blue-400",

            bgColor:
                "bg-blue-500/10",

            borderColor:
                "border-blue-500/20",

            items: [
                {
                    title: t(
                        "helpAndSupport.categories.gettingStarted.items.quickStart.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.gettingStarted.items.quickStart.description"
                    ),

                    type:
                        "guide",
                },

                {
                    title: t(
                        "helpAndSupport.categories.gettingStarted.items.videoTutorial.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.gettingStarted.items.videoTutorial.description"
                    ),

                    type:
                        "video",

                    url:
                        "#",
                },

                {
                    title: t(
                        "helpAndSupport.categories.gettingStarted.items.faq.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.gettingStarted.items.faq.description"
                    ),

                    type:
                        "faq",
                },
            ],
        },

        {
            id:
                "features",

            title: t(
                "helpAndSupport.categories.features.title"
            ),

            icon:
            Code,

            color:
                "text-green-400",

            bgColor:
                "bg-green-500/10",

            borderColor:
                "border-green-500/20",

            items: [
                {
                    title: t(
                        "helpAndSupport.categories.features.items.orders.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.features.items.orders.description"
                    ),

                    type:
                        "guide",
                },

                {
                    title: t(
                        "helpAndSupport.categories.features.items.fiscal.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.features.items.fiscal.description"
                    ),

                    type:
                        "guide",
                },

                {
                    title: t(
                        "helpAndSupport.categories.features.items.inventory.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.features.items.inventory.description"
                    ),

                    type:
                        "guide",
                },

                {
                    title: t(
                        "helpAndSupport.categories.features.items.reports.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.features.items.reports.description"
                    ),

                    type:
                        "guide",
                },
            ],
        },

        {
            id:
                "support",

            title: t(
                "helpAndSupport.categories.support.title"
            ),

            icon:
            MessageCircle,

            color:
                "text-purple-400",

            bgColor:
                "bg-purple-500/10",

            borderColor:
                "border-purple-500/20",

            items: [
                {
                    title: t(
                        "helpAndSupport.categories.support.items.contact.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.support.items.contact.description"
                    ),

                    type:
                        "contact",
                },

                {
                    title: t(
                        "helpAndSupport.categories.support.items.whatsapp.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.support.items.whatsapp.description"
                    ),

                    type:
                        "whatsapp",

                    url:
                        "https://wa.link/vzbps9",
                },

                {
                    title: t(
                        "helpAndSupport.categories.support.items.email.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.support.items.email.description"
                    ),

                    type:
                        "email",

                    email:
                        "soporte@sitfort.com",
                },
            ],
        },

        {
            id:
                "resources",

            title: t(
                "helpAndSupport.categories.resources.title"
            ),

            icon:
            FileText,

            color:
                "text-orange-400",

            bgColor:
                "bg-orange-500/10",

            borderColor:
                "border-orange-500/20",

            items: [
                {
                    title: t(
                        "helpAndSupport.categories.resources.items.documentation.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.resources.items.documentation.description"
                    ),

                    type:
                        "docs",

                    url:
                        "#",
                },

                {
                    title: t(
                        "helpAndSupport.categories.resources.items.helpCenter.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.resources.items.helpCenter.description"
                    ),

                    type:
                        "help",

                    url:
                        "#",
                },

                {
                    title: t(
                        "helpAndSupport.categories.resources.items.community.title"
                    ),

                    description: t(
                        "helpAndSupport.categories.resources.items.community.description"
                    ),

                    type:
                        "community",

                    url:
                        "#",
                },
            ],
        },
    ];

    /*
     * ==========================================
     * ACCESOS RÁPIDOS
     * ==========================================
     *
     * Las rutas permanecen intactas.
     */

    const quickLinks = [
        {
            id:
                "create-order",

            label: t(
                "helpAndSupport.quickLinks.createOrder"
            ),

            icon:
            CheckCircle2,

            action:
                () =>
                    window.open(
                        "/tables",
                        "_self"
                    ),
        },

        {
            id:
                "view-reports",

            label: t(
                "helpAndSupport.quickLinks.viewReports"
            ),

            icon:
            FileText,

            action:
                () =>
                    window.open(
                        "/admin?tab=cash-register",
                        "_self"
                    ),
        },

        {
            id:
                "manage-menu",

            label: t(
                "helpAndSupport.quickLinks.manageMenu"
            ),

            icon:
            Book,

            action:
                () =>
                    window.open(
                        "/admin?tab=menu-management",
                        "_self"
                    ),
        },

        {
            id:
                "settings",

            label: t(
                "helpAndSupport.quickLinks.settings"
            ),

            icon:
            Settings,

            action:
                () =>
                    window.open(
                        "/admin?tab=fiscal",
                        "_self"
                    ),
        },
    ];

    const selectedCategoryData =
        categories.find(
            (
                category
            ) =>
                category.id ===
                selectedCategory
        );

    /*
     * ==========================================
     * SOPORTE POR EMAIL
     * ==========================================
     */

    const openSupportEmail =
        () => {
            const subject =
                encodeURIComponent(
                    t(
                        "helpAndSupport.supportEmail.subject"
                    )
                );

            const body =
                encodeURIComponent(
                    t(
                        "helpAndSupport.supportEmail.body"
                    )
                );

            window.location.href =
                `mailto:soporte@sitfort.com?subject=${subject}&body=${body}`;
        };

    return (
        <div>

            {/* ======================================
                HEADER
            ====================================== */}

            <div className="mb-6">

                <h2 className="text-2xl font-bold text-white flex items-center gap-2">

                    <HelpCircle className="w-6 h-6 text-[#f6b100]" />

                    {t(
                        "helpAndSupport.title"
                    )}

                </h2>

                <p className="text-sm text-gray-400 mt-1">

                    {t(
                        "helpAndSupport.description"
                    )}

                </p>

            </div>

            {/* ======================================
                ACCESOS RÁPIDOS
            ====================================== */}

            <div className="mb-6">

                <h3 className="text-lg font-semibold text-white mb-4">

                    {t(
                        "helpAndSupport.quickLinks.title"
                    )}

                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    {quickLinks.map(
                        (
                            link
                        ) => {
                            const Icon =
                                link.icon;

                            return (
                                <button
                                    key={
                                        link.id
                                    }
                                    type="button"
                                    onClick={
                                        link.action
                                    }
                                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg hover:border-[#f6b100]/50 transition-all group"
                                >

                                    <div className="p-2 bg-[#f6b100]/10 rounded-lg border border-[#f6b100]/20 group-hover:bg-[#f6b100]/20 transition-colors">

                                        <Icon className="w-5 h-5 text-[#f6b100]" />

                                    </div>

                                    <span className="text-sm font-medium text-white">

                                        {
                                            link.label
                                        }

                                    </span>

                                </button>
                            );
                        }
                    )}

                </div>

            </div>

            {/* ======================================
                VISTA DE CATEGORÍAS
            ====================================== */}

            {!selectedCategory ? (

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {categories.map(
                        (
                            category
                        ) => {
                            const Icon =
                                category.icon;

                            return (
                                <button
                                    key={
                                        category.id
                                    }
                                    type="button"
                                    onClick={() =>
                                        setSelectedCategory(
                                            category.id
                                        )
                                    }
                                    className={`p-6 bg-gradient-to-br from-[#111111] to-[#0a0a0a] border rounded-2xl hover:border-[#f6b100]/50 transition-all text-left group ${category.borderColor}`}
                                >

                                    <div className="flex items-center gap-4 mb-4">

                                        <div
                                            className={`p-3 rounded-lg border ${category.bgColor} ${category.borderColor}`}
                                        >

                                            <Icon
                                                className={`w-6 h-6 ${category.color}`}
                                            />

                                        </div>

                                        <h3 className="text-lg font-semibold text-white">

                                            {
                                                category.title
                                            }

                                        </h3>

                                        <ChevronRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-[#f6b100] transition-colors" />

                                    </div>

                                    <p className="text-sm text-gray-400">

                                        {t(
                                            "helpAndSupport.resourceCount",
                                            {
                                                count:
                                                category
                                                    .items
                                                    .length,
                                            }
                                        )}

                                    </p>

                                </button>
                            );
                        }
                    )}

                </div>

            ) : (

                /* ======================================
                    ITEMS DE LA CATEGORÍA
                ====================================== */

                <div>

                    <button
                        type="button"
                        onClick={() =>
                            setSelectedCategory(
                                null
                            )
                        }
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
                    >

                        <ChevronRight className="w-4 h-4 rotate-180" />

                        {t(
                            "helpAndSupport.actions.backToCategories"
                        )}

                    </button>

                    {selectedCategoryData && (

                        <div>

                            <div className="flex items-center gap-3 mb-6">

                                <div
                                    className={`p-3 rounded-lg border ${selectedCategoryData.bgColor} ${selectedCategoryData.borderColor}`}
                                >

                                    {React.createElement(
                                        selectedCategoryData.icon,
                                        {
                                            className:
                                                `w-6 h-6 ${selectedCategoryData.color}`,
                                        }
                                    )}

                                </div>

                                <h3 className="text-xl font-bold text-white">

                                    {
                                        selectedCategoryData.title
                                    }

                                </h3>

                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {selectedCategoryData.items.map(
                                    (
                                        item,
                                        index
                                    ) => (

                                        <div
                                            key={`${item.type}-${index}`}
                                            className="p-5 bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg hover:border-[#f6b100]/50 transition-all"
                                        >

                                            <div className="flex items-start justify-between mb-2">

                                                <h4 className="text-base font-semibold text-white">

                                                    {
                                                        item.title
                                                    }

                                                </h4>

                                                {item.url && (

                                                    <ExternalLink className="w-4 h-4 text-gray-400" />

                                                )}

                                            </div>

                                            <p className="text-sm text-gray-400 mb-3">

                                                {
                                                    item.description
                                                }

                                            </p>

                                            {item.type ===
                                                "whatsapp" &&
                                                item.url && (

                                                    <a
                                                        href={
                                                            item.url
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 text-sm text-[#f6b100] hover:text-[#ffd633] transition-colors"
                                                    >

                                                        {t(
                                                            "helpAndSupport.actions.openWhatsApp"
                                                        )}

                                                        <ExternalLink className="w-3.5 h-3.5" />

                                                    </a>

                                                )}

                                            {item.type ===
                                                "email" &&
                                                item.email && (

                                                    <a
                                                        href={`mailto:${item.email}`}
                                                        className="inline-flex items-center gap-2 text-sm text-[#f6b100] hover:text-[#ffd633] transition-colors"
                                                    >

                                                        <Mail className="w-3.5 h-3.5" />

                                                        {t(
                                                            "helpAndSupport.actions.sendEmail"
                                                        )}

                                                    </a>

                                                )}

                                            {item.type ===
                                                "contact" && (

                                                    <button
                                                        type="button"
                                                        onClick={
                                                            openSupportEmail
                                                        }
                                                        className="inline-flex items-center gap-2 text-sm text-[#f6b100] hover:text-[#ffd633] transition-colors"
                                                    >

                                                        <Mail className="w-3.5 h-3.5" />

                                                        {t(
                                                            "helpAndSupport.actions.contact"
                                                        )}

                                                    </button>

                                                )}

                                        </div>

                                    )
                                )}

                            </div>

                        </div>

                    )}

                </div>

            )}

            {/* ======================================
                INFORMACIÓN DE CONTACTO
            ====================================== */}

            <div className="mt-8 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-6">

                <h3 className="text-lg font-semibold text-white mb-4">

                    {t(
                        "helpAndSupport.contactInfo.title"
                    )}

                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* EMAIL */}

                    <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg">

                        <Mail className="w-5 h-5 text-[#f6b100]" />

                        <div>

                            <p className="text-xs text-gray-400">

                                {t(
                                    "helpAndSupport.contactInfo.email"
                                )}

                            </p>

                            <a
                                href="mailto:soporte@sitfort.com"
                                className="text-sm text-white hover:text-[#f6b100] transition-colors"
                            >

                                soporte@sitfort.com

                            </a>

                        </div>

                    </div>

                    {/* WHATSAPP */}

                    <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg">

                        <Phone className="w-5 h-5 text-[#f6b100]" />

                        <div>

                            <p className="text-xs text-gray-400">
                                WhatsApp
                            </p>

                            <a
                                href="https://wa.link/vzbps9"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-white hover:text-[#f6b100] transition-colors"
                            >

                                {t(
                                    "helpAndSupport.contactInfo.chatWithUs"
                                )}

                            </a>

                        </div>

                    </div>

                    {/* HORARIO */}

                    <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg">

                        <Users className="w-5 h-5 text-[#f6b100]" />

                        <div>

                            <p className="text-xs text-gray-400">

                                {t(
                                    "helpAndSupport.contactInfo.hours"
                                )}

                            </p>

                            <p className="text-sm text-white">

                                {t(
                                    "helpAndSupport.contactInfo.schedule"
                                )}

                            </p>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default HelpAndSupport;