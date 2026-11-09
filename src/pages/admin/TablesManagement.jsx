// src/pages/admin/TablesManagement.jsx
import React, {
    useMemo,
    useState,
} from "react";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    Plus,
    Edit,
    Trash2,
    Search,
    X,
    Save,
    Table2,
    Users,
} from "lucide-react";

import {
    useTranslation,
} from "react-i18next";

import {
    addTable,
    getTables,
    updateTable,
    deleteTable,
} from "../../https";

import {
    enqueueSnackbar,
} from "notistack";

import {
    QK,
} from "../../queryKeys";


const TablesManagement = () => {
    const {
        t,
    } =
        useTranslation();


    const queryClient =
        useQueryClient();


    const [
        searchTerm,
        setSearchTerm,
    ] =
        useState(
            ""
        );


    const [
        showTableModal,
        setShowTableModal,
    ] =
        useState(
            false
        );


    const [
        editingTable,
        setEditingTable,
    ] =
        useState(
            null
        );


    const [
        tableForm,
        setTableForm,
    ] =
        useState({
            tableNo:
                "",

            seats:
                "",

            /*
             * Valor interno.
             * NO traducir.
             */
            area:
                "General",
        });


    const [
        deleteConfirmOpen,
        setDeleteConfirmOpen,
    ] =
        useState(
            false
        );


    const [
        deleteTarget,
        setDeleteTarget,
    ] =
        useState(
            null
        );


    /*
     * ==========================================
     * MESAS
     * ==========================================
     */

    const {
        data,
        isLoading,
        isError,
    } =
        useQuery({
            queryKey:
            QK.TABLES,

            queryFn:
            getTables,

            select:
                (
                    res
                ) => {
                    if (
                        Array.isArray(
                            res
                                ?.data
                                ?.data
                        )
                    ) {
                        return res
                            .data
                            .data;
                    }


                    if (
                        Array.isArray(
                            res?.data
                        )
                    ) {
                        return res.data;
                    }


                    return [];
                },
        });


    const tables =
        data ||
        [];


    /*
     * ==========================================
     * ÁREAS
     * ==========================================
     *
     * Los valores guardados siguen siendo:
     *
     * General
     * Terraza
     * VIP
     * Barra
     * Salon
     */

    const getAreaCode = (
        areaRaw
    ) => {
        const area =
            String(
                areaRaw ||
                "General"
            )
                .trim()
                .toLowerCase();


        if (
            area ===
            "terraza" ||
            area ===
            "terrace"
        ) {
            return "TER";
        }


        if (
            area ===
            "vip"
        ) {
            return "VIP";
        }


        if (
            area ===
            "salón" ||
            area ===
            "salon" ||
            area ===
            "dining room"
        ) {
            return "SAL";
        }


        if (
            area ===
            "barra" ||
            area ===
            "bar"
        ) {
            return "BAR";
        }


        return "GEN";
    };


    const getTableLabel = (
        table
    ) => {
        const code =
            getAreaCode(
                table?.area
            );


        const no =
            table?.tableNo ??
            "—";


        return `${code}-${no}`;
    };


    /*
     * Solo traduce áreas predeterminadas.
     *
     * Si en algún momento existe un área
     * personalizada creada por el negocio,
     * se muestra tal cual.
     */
    const getAreaDisplayLabel = (
        areaRaw
    ) => {
        const raw =
            String(
                areaRaw ||
                "General"
            ).trim();


        const normalized =
            raw.toLowerCase();


        if (
            normalized ===
            "general"
        ) {
            return t(
                "tablesManagement.areas.general"
            );
        }


        if (
            [
                "terraza",
                "terrace",
            ].includes(
                normalized
            )
        ) {
            return t(
                "tablesManagement.areas.terrace"
            );
        }


        if (
            normalized ===
            "vip"
        ) {
            return t(
                "tablesManagement.areas.vip"
            );
        }


        if (
            [
                "barra",
                "bar",
            ].includes(
                normalized
            )
        ) {
            return t(
                "tablesManagement.areas.bar"
            );
        }


        if (
            [
                "salón",
                "salon",
                "dining room",
            ].includes(
                normalized
            )
        ) {
            return t(
                "tablesManagement.areas.diningRoom"
            );
        }


        return raw;
    };


    /*
     * ==========================================
     * ESTADOS
     * ==========================================
     *
     * Los estados internos NO cambian.
     */

    const getStatusDisplayLabel = (
        status
    ) => {
        const normalized =
            String(
                status ||
                "Disponible"
            )
                .trim()
                .toLowerCase();


        if (
            [
                "disponible",
                "available",
            ].includes(
                normalized
            )
        ) {
            return t(
                "tablesManagement.status.available"
            );
        }


        if (
            [
                "ocupada",
                "ocupado",
                "occupied",
            ].includes(
                normalized
            )
        ) {
            return t(
                "tablesManagement.status.occupied"
            );
        }


        if (
            [
                "reservada",
                "reservado",
                "reserved",
            ].includes(
                normalized
            )
        ) {
            return t(
                "tablesManagement.status.reserved"
            );
        }


        return (
            status ||
            t(
                "tablesManagement.status.available"
            )
        );
    };


    const getStatusColor = (
        status
    ) => {
        switch (
            String(
                status ||
                ""
            )
                .trim()
                .toLowerCase()
            ) {
            case "disponible":
            case "available":
                return "bg-green-500/20 text-green-400 border-green-500/40";


            case "ocupada":
            case "ocupado":
            case "occupied":
                return "bg-red-500/20 text-red-400 border-red-500/40";


            case "reservada":
            case "reservado":
            case "reserved":
                return "bg-sky-500/20 text-sky-400 border-sky-500/40";


            default:
                return "bg-gray-500/20 text-gray-400 border-gray-500/40";
        }
    };


    /*
     * ==========================================
     * FILTRO
     * ==========================================
     *
     * Permite buscar tanto:
     *
     * Disponible
     * como
     * Available
     *
     * dependiendo del idioma actual.
     */

    const filteredTables =
        useMemo(
            () => {
                const search =
                    searchTerm
                        .trim()
                        .toLowerCase();


                return tables
                    .filter(
                        (
                            table
                        ) =>
                            !table.isVirtual
                    )
                    .filter(
                        (
                            table
                        ) => {
                            const tableNo =
                                String(
                                    table.tableNo ||
                                    ""
                                )
                                    .toLowerCase();


                            const rawStatus =
                                String(
                                    table.status ||
                                    ""
                                )
                                    .toLowerCase();


                            const visibleStatus =
                                getStatusDisplayLabel(
                                    table.status
                                )
                                    .toLowerCase();


                            const rawArea =
                                String(
                                    table.area ||
                                    "General"
                                )
                                    .toLowerCase();


                            const visibleArea =
                                getAreaDisplayLabel(
                                    table.area
                                )
                                    .toLowerCase();


                            const label =
                                getTableLabel(
                                    table
                                )
                                    .toLowerCase();


                            return (
                                tableNo.includes(
                                    search
                                ) ||
                                rawStatus.includes(
                                    search
                                ) ||
                                visibleStatus.includes(
                                    search
                                ) ||
                                rawArea.includes(
                                    search
                                ) ||
                                visibleArea.includes(
                                    search
                                ) ||
                                label.includes(
                                    search
                                )
                            );
                        }
                    )
                    .sort(
                        (
                            a,
                            b
                        ) => {
                            const areaA =
                                String(
                                    a.area ||
                                    "General"
                                );


                            const areaB =
                                String(
                                    b.area ||
                                    "General"
                                );


                            const areaComparison =
                                areaA.localeCompare(
                                    areaB
                                );


                            if (
                                areaComparison !==
                                0
                            ) {
                                return areaComparison;
                            }


                            return (
                                (
                                    a.tableNo ||
                                    0
                                ) -
                                (
                                    b.tableNo ||
                                    0
                                )
                            );
                        }
                    );
            },
            [
                tables,
                searchTerm,
                t,
            ]
        );


    /*
     * ==========================================
     * FORMULARIO
     * ==========================================
     */

    const resetForm =
        () => {
            setTableForm({
                tableNo:
                    "",

                seats:
                    "",

                area:
                    "General",
            });


            setEditingTable(
                null
            );
        };


    const openAddModal =
        () => {
            resetForm();

            setShowTableModal(
                true
            );
        };


    const openEditModal = (
        table
    ) => {
        setEditingTable(
            table
        );


        setTableForm({
            tableNo:
                table
                    .tableNo
                    ?.toString() ||
                "",

            seats:
                table
                    .seats
                    ?.toString() ||
                "",

            area:
                (
                    table.area ||
                    "General"
                ).toString(),
        });


        setShowTableModal(
            true
        );
    };


    const closeModal =
        () => {
            setShowTableModal(
                false
            );


            resetForm();
        };


    /*
     * ==========================================
     * CREAR
     * ==========================================
     */

    const createMutation =
        useMutation({
            mutationFn:
                (
                    payload
                ) =>
                    addTable(
                        payload
                    ),

            onSuccess:
                () => {
                    enqueueSnackbar(
                        t(
                            "tablesManagement.messages.createSuccess"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );


                    queryClient.invalidateQueries({
                        queryKey:
                        QK.TABLES,
                    });


                    closeModal();
                },

            onError:
                (
                    error
                ) => {
                    enqueueSnackbar(
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "tablesManagement.messages.createFailed"
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


    /*
     * ==========================================
     * ACTUALIZAR
     * ==========================================
     */

    const updateMutation =
        useMutation({
            mutationFn:
                ({
                     id,
                     body,
                 }) =>
                    updateTable(
                        id,
                        body
                    ),

            onSuccess:
                () => {
                    enqueueSnackbar(
                        t(
                            "tablesManagement.messages.updateSuccess"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );


                    queryClient.invalidateQueries({
                        queryKey:
                        QK.TABLES,
                    });


                    closeModal();
                },

            onError:
                (
                    error
                ) => {
                    enqueueSnackbar(
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "tablesManagement.messages.updateFailed"
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


    /*
     * ==========================================
     * ELIMINAR
     * ==========================================
     */

    const deleteMutation =
        useMutation({
            mutationFn:
                (
                    id
                ) =>
                    deleteTable(
                        id
                    ),

            onSuccess:
                () => {
                    enqueueSnackbar(
                        t(
                            "tablesManagement.messages.deleteSuccess"
                        ),
                        {
                            variant:
                                "success",
                        }
                    );


                    queryClient.invalidateQueries({
                        queryKey:
                        QK.TABLES,
                    });
                },

            onError:
                (
                    error
                ) => {
                    enqueueSnackbar(
                        error
                            ?.response
                            ?.data
                            ?.message ||
                        t(
                            "tablesManagement.messages.deleteFailed"
                        ),
                        {
                            variant:
                                "error",
                        }
                    );
                },
        });


    const handleSubmit = (
        event
    ) => {
        event.preventDefault();


        const tableNo =
            parseInt(
                tableForm.tableNo,
                10
            );


        const seats =
            parseInt(
                tableForm.seats,
                10
            );


        /*
         * IMPORTANTE:
         *
         * El valor enviado sigue siendo:
         *
         * General
         * Terraza
         * VIP
         * Barra
         * Salon
         */
        const area =
            (
                tableForm.area ||
                "General"
            ).trim();


        if (
            editingTable?._id
        ) {
            updateMutation.mutate({
                id:
                editingTable._id,

                body: {
                    tableNo,
                    seats,
                    area,
                },
            });

        } else {
            createMutation.mutate({
                tableNo,
                seats,
                area,
            });
        }
    };


    const closeDeleteConfirm =
        () => {
            if (
                deleteMutation.isPending
            ) {
                return;
            }


            setDeleteConfirmOpen(
                false
            );


            setDeleteTarget(
                null
            );
        };


    /*
     * ==========================================
     * LOADING / ERROR
     * ==========================================
     */

    if (
        isLoading
    ) {
        return (
            <div className="text-center py-8 text-gray-400">

                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38bdf8] mx-auto" />


                <p className="mt-2">
                    {t(
                        "tablesManagement.loading"
                    )}
                </p>

            </div>
        );
    }


    if (
        isError
    ) {
        return (
            <div className="text-center py-8 text-red-400">

                {t(
                    "tablesManagement.loadError"
                )}

            </div>
        );
    }


    return (
        <div>

            {/* ======================================
                HEADER
            ====================================== */}

            <div className="flex items-center justify-between mb-6">

                <div>

                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">

                        <Table2 className="w-6 h-6 text-[#38bdf8]" />


                        {t(
                            "tablesManagement.title"
                        )}

                    </h2>


                    <p className="text-sm text-gray-400 mt-1">

                        {t(
                            "tablesManagement.description"
                        )}

                    </p>

                </div>


                <button
                    type="button"

                    onClick={
                        openAddModal
                    }

                    className="flex items-center gap-2 px-4 py-2 bg-[#38bdf8] text-black rounded-lg font-semibold hover:bg-[#7dd3fc] transition-all"
                >

                    <Plus className="w-4 h-4" />


                    {t(
                        "tablesManagement.actions.addTable"
                    )}

                </button>

            </div>


            {/* ======================================
                BÚSQUEDA
            ====================================== */}

            <div className="mb-6 rounded-lg border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-4">

                <div className="relative">

                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />


                    <input
                        type="text"

                        placeholder={
                            t(
                                "tablesManagement.searchPlaceholder"
                            )
                        }

                        value={
                            searchTerm
                        }

                        onChange={(
                            event
                        ) =>
                            setSearchTerm(
                                event.target.value
                            )
                        }

                        className="w-full pl-10 p-2 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"
                    />

                </div>

            </div>


            {/* ======================================
                RESUMEN
            ====================================== */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">

                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">

                        {t(
                            "tablesManagement.summary.total"
                        )}

                    </p>


                    <p className="text-2xl font-bold text-white">

                        {filteredTables.length}

                    </p>

                </div>


                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">

                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">

                        {t(
                            "tablesManagement.summary.available"
                        )}

                    </p>


                    <p className="text-2xl font-bold text-green-400">

                        {
                            filteredTables.filter(
                                (
                                    table
                                ) =>
                                    table.status ===
                                    "Disponible"
                            ).length
                        }

                    </p>

                </div>


                <div className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-4">

                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">

                        {t(
                            "tablesManagement.summary.occupied"
                        )}

                    </p>


                    <p className="text-2xl font-bold text-red-400">

                        {
                            filteredTables.filter(
                                (
                                    table
                                ) =>
                                    table.status ===
                                    "Ocupada"
                            ).length
                        }

                    </p>

                </div>

            </div>


            {/* ======================================
                GRID DE MESAS
            ====================================== */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

                {filteredTables.map(
                    (
                        table
                    ) => (

                        <div
                            key={
                                table._id
                            }

                            className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-gray-800/50 rounded-lg p-5 hover:border-[#38bdf8]/50 transition-all group"
                        >

                            <div className="flex items-center justify-between mb-4">

                                <div className="flex items-center gap-3">

                                    <div className="p-2 bg-[#38bdf8]/10 rounded-lg border border-[#38bdf8]/20">

                                        <Table2 className="w-5 h-5 text-[#38bdf8]" />

                                    </div>


                                    <div>

                                        <h3 className="text-lg font-bold text-white">

                                            {getTableLabel(
                                                table
                                            )}

                                        </h3>


                                        <p className="text-xs text-gray-400">

                                            {getAreaDisplayLabel(
                                                table.area
                                            )}{" "}
                                            • ID:{" "}
                                            {table._id?.slice(
                                                -6
                                            )}

                                        </p>

                                    </div>

                                </div>


                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                                    <button
                                        type="button"

                                        onClick={() =>
                                            openEditModal(
                                                table
                                            )
                                        }

                                        className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-[#38bdf8] transition-colors"

                                        title={
                                            t(
                                                "tablesManagement.actions.edit"
                                            )
                                        }

                                        aria-label={
                                            t(
                                                "tablesManagement.actions.edit"
                                            )
                                        }
                                    >

                                        <Edit className="w-4 h-4 text-white" />

                                    </button>


                                    {table.status ===
                                        "Disponible" && (

                                            <button
                                                type="button"

                                                onClick={() => {
                                                    setDeleteTarget({
                                                        id:
                                                        table._id,

                                                        name:
                                                            getTableLabel(
                                                                table
                                                            ),
                                                    });


                                                    setDeleteConfirmOpen(
                                                        true
                                                    );
                                                }}

                                                className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-red-500 transition-colors"

                                                title={
                                                    t(
                                                        "tablesManagement.actions.delete"
                                                    )
                                                }

                                                aria-label={
                                                    t(
                                                        "tablesManagement.actions.delete"
                                                    )
                                                }
                                            >

                                                <Trash2 className="w-4 h-4 text-white" />

                                            </button>

                                        )}

                                </div>

                            </div>


                            <div className="space-y-3">

                                <div className="flex items-center justify-between">

                                    <span className="text-sm text-gray-400 flex items-center gap-2">

                                        <Users className="w-4 h-4" />


                                        {t(
                                            "tablesManagement.seats"
                                        )}
                                        :

                                    </span>


                                    <span className="text-sm font-semibold text-white">

                                        {table.seats || 0}

                                    </span>

                                </div>


                                <div className="flex items-center justify-between">

                                    <span className="text-sm text-gray-400">

                                        {t(
                                            "tablesManagement.statusLabel"
                                        )}
                                        :

                                    </span>


                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                                            table.status
                                        )}`}
                                    >

                                        {getStatusDisplayLabel(
                                            table.status
                                        )}

                                    </span>

                                </div>


                                {table.currentOrder && (

                                    <div className="pt-3 border-t border-gray-800/30">

                                        <p className="text-xs text-gray-500">

                                            {t(
                                                "tablesManagement.activeOrder"
                                            )}

                                        </p>


                                        {(() => {
                                            const currentOrderId =
                                                table.currentOrder?._id ??
                                                table.currentOrder;


                                            const shortId =
                                                String(
                                                    currentOrderId ||
                                                    ""
                                                ).slice(
                                                    -8
                                                );


                                            return (
                                                <p className="text-xs text-gray-400 font-mono">

                                                    {shortId || "—"}

                                                </p>
                                            );
                                        })()}

                                    </div>

                                )}

                            </div>

                        </div>

                    )
                )}

            </div>


            {filteredTables.length ===
                0 && (

                    <div className="text-center py-12 text-gray-400">

                        <Table2 className="w-16 h-16 mx-auto mb-4 opacity-50" />


                        <p>

                            {t(
                                "tablesManagement.empty"
                            )}

                        </p>

                    </div>

                )}


            {/* ======================================
                MODAL CREAR / EDITAR
            ====================================== */}

            {showTableModal && (

                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"

                    onClick={
                        closeModal
                    }
                >

                    <div
                        className="w-full max-w-md bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"

                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="p-6 border-b border-gray-800/50">

                            <div className="flex items-center justify-between">

                                <h3 className="text-xl font-bold text-white">

                                    {editingTable
                                        ? t(
                                            "tablesManagement.modal.editTitle"
                                        )
                                        : t(
                                            "tablesManagement.modal.addTitle"
                                        )
                                    }

                                </h3>


                                <button
                                    type="button"

                                    onClick={
                                        closeModal
                                    }

                                    className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"

                                    aria-label={
                                        t(
                                            "common.close"
                                        )
                                    }
                                >

                                    <X className="w-5 h-5 text-gray-400" />

                                </button>

                            </div>

                        </div>


                        <form
                            onSubmit={
                                handleSubmit
                            }

                            className="p-6 space-y-4"
                        >

                            {/* NÚMERO DE MESA */}

                            <div>

                                <label className="text-sm text-gray-400 mb-1 block flex items-center gap-2">

                                    <Table2 className="w-4 h-4" />


                                    {t(
                                        "tablesManagement.fields.tableNumber"
                                    )} *

                                </label>


                                <input
                                    type="number"

                                    min="1"

                                    value={
                                        tableForm.tableNo
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setTableForm(
                                            (
                                                current
                                            ) => ({
                                                ...current,

                                                tableNo:
                                                event
                                                    .target
                                                    .value,
                                            })
                                        )
                                    }

                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"

                                    required
                                />

                            </div>


                            {/* ASIENTOS */}

                            <div>

                                <label className="text-sm text-gray-400 mb-1 block flex items-center gap-2">

                                    <Users className="w-4 h-4" />


                                    {t(
                                        "tablesManagement.fields.seats"
                                    )} *

                                </label>


                                <input
                                    type="number"

                                    min="1"

                                    value={
                                        tableForm.seats
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setTableForm(
                                            (
                                                current
                                            ) => ({
                                                ...current,

                                                seats:
                                                event
                                                    .target
                                                    .value,
                                            })
                                        )
                                    }

                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"

                                    required
                                />

                            </div>


                            {/* ÁREA */}

                            <div>

                                <label className="text-sm text-gray-400 mb-1 block">

                                    {t(
                                        "tablesManagement.fields.area"
                                    )} *

                                </label>


                                <select
                                    value={
                                        tableForm.area
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setTableForm(
                                            (
                                                current
                                            ) => ({
                                                ...current,

                                                /*
                                                 * Se conserva el valor
                                                 * interno en español.
                                                 */
                                                area:
                                                event
                                                    .target
                                                    .value,
                                            })
                                        )
                                    }

                                    className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:border-[#38bdf8]/50"

                                    required
                                >

                                    <option value="General">

                                        {t(
                                            "tablesManagement.areas.general"
                                        )}

                                    </option>


                                    <option value="Terraza">

                                        {t(
                                            "tablesManagement.areas.terrace"
                                        )}

                                    </option>


                                    <option value="VIP">

                                        {t(
                                            "tablesManagement.areas.vip"
                                        )}

                                    </option>


                                    <option value="Barra">

                                        {t(
                                            "tablesManagement.areas.bar"
                                        )}

                                    </option>


                                    <option value="Salon">

                                        {t(
                                            "tablesManagement.areas.diningRoom"
                                        )}

                                    </option>

                                </select>

                            </div>


                            {/* BOTONES */}

                            <div className="flex gap-3 pt-4">

                                <button
                                    type="button"

                                    onClick={
                                        closeModal
                                    }

                                    className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] transition-all"
                                >

                                    {t(
                                        "common.cancel"
                                    )}

                                </button>


                                <button
                                    type="submit"

                                    disabled={
                                        createMutation.isPending ||
                                        updateMutation.isPending
                                    }

                                    className="flex-1 px-4 py-2.5 bg-[#38bdf8] text-black rounded-lg font-semibold hover:bg-[#7dd3fc] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >

                                    <Save className="w-4 h-4" />


                                    {createMutation.isPending ||
                                    updateMutation.isPending
                                        ? t(
                                            "tablesManagement.actions.saving"
                                        )
                                        : editingTable
                                            ? t(
                                                "tablesManagement.actions.update"
                                            )
                                            : t(
                                                "tablesManagement.actions.add"
                                            )
                                    }

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}


            {/* ======================================
                CONFIRMAR ELIMINACIÓN
            ====================================== */}

            {deleteConfirmOpen && (

                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"

                    onClick={
                        closeDeleteConfirm
                    }
                >

                    <div
                        className="w-full max-w-md bg-gradient-to-br from-[#101010] to-[#0a0a0a] border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"

                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="p-6 border-b border-gray-800/50">

                            <div className="flex items-center justify-between">

                                <h3 className="text-xl font-bold text-white">

                                    {t(
                                        "tablesManagement.deleteConfirm.title"
                                    )}

                                </h3>


                                <button
                                    type="button"

                                    onClick={
                                        closeDeleteConfirm
                                    }

                                    className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"

                                    aria-label={
                                        t(
                                            "common.close"
                                        )
                                    }
                                >

                                    <X className="w-5 h-5 text-gray-400" />

                                </button>

                            </div>

                        </div>


                        <div className="p-6">

                            <p className="text-sm text-gray-300">

                                {t(
                                    "tablesManagement.deleteConfirm.description",
                                    {
                                        name:
                                            deleteTarget?.name ||
                                            t(
                                                "tablesManagement.deleteConfirm.thisTable"
                                            ),
                                    }
                                )}

                            </p>


                            <div className="mt-6 flex gap-3">

                                <button
                                    type="button"

                                    onClick={
                                        closeDeleteConfirm
                                    }

                                    className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-800/50 rounded-lg text-white hover:bg-[#262626] transition-all disabled:opacity-50"

                                    disabled={
                                        deleteMutation.isPending
                                    }
                                >

                                    {t(
                                        "common.cancel"
                                    )}

                                </button>


                                <button
                                    type="button"

                                    onClick={() => {
                                        const id =
                                            deleteTarget?.id;


                                        if (
                                            !id
                                        ) {
                                            return;
                                        }


                                        deleteMutation.mutate(
                                            id,
                                            {
                                                onSettled:
                                                    () => {
                                                        setDeleteConfirmOpen(
                                                            false
                                                        );


                                                        setDeleteTarget(
                                                            null
                                                        );
                                                    },
                                            }
                                        );
                                    }}

                                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all disabled:opacity-50"

                                    disabled={
                                        deleteMutation.isPending
                                    }
                                >

                                    {deleteMutation.isPending
                                        ? t(
                                            "tablesManagement.actions.deleting"
                                        )
                                        : t(
                                            "tablesManagement.actions.delete"
                                        )
                                    }

                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
};


export default TablesManagement;