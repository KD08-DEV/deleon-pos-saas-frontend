import CustomerManager from '../menu/CustomerManager';
import DeleteCustomerAction from '../menu/DeleteCustomerAction';
import useRncLookup from '../../hooks/useRncLookup';
import api from '../../lib/api';
import {customerErrorMessage} from '../../lib/customerErrors';
import React, { useState, useRef, memo, useCallback, useEffect } from "react";
import { Home, ListOrdered, Table2, Settings, Plus, Wallet } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "./Modal";
import { useDispatch, useSelector } from "react-redux";

import {
    setCustomer,
    setDraftContext,
    clearDraftContext,
    removeCustomer,
} from "../../redux/slices/customerSlice";

import { removeAllItems } from "../../redux/slices/cartSlice";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCustomers, createCustomer } from "../../https";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";


const BottomNav = memo(() => {
    const { t } = useTranslation();

    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    const { userData } =
        useSelector(
            (state) =>
                state.user
        );


    const [
        isModalOpen,
        setIsModalOpen,
    ] =
        useState(false);


    const [
        name,
        setName,
    ] =
        useState("");


    const [
        phone,
        setPhone,
    ] =
        useState("");


    const [
        guestCount,
        setGuestCount,
    ] =
        useState(0);


    const [
        address,
        setAddress,
    ] =
        useState("");


    const [
        search,
        setSearch,
    ] =
        useState("");


    const [
        isCustomerPickerOpen,
        setIsCustomerPickerOpen,
    ] =
        useState(false);


    const [
        selectedCustomerId,
        setSelectedCustomerId,
    ] =
        useState(null);


    const [
        showResults,
        setShowResults,
    ] =
        useState(false);


    const [
        isTablePickerOpen,
        setIsTablePickerOpen,
    ] =
        useState(false);


    const queryClient=useQueryClient(),customerLock=useRef(false);
    const [customerBusy,setCustomerBusy]=useState(false),[customerError,setCustomerError]=useState('');
    const [needsConfirmation,setNeedsConfirmation]=useState(false),[distinctConfirmed,setDistinctConfirmed]=useState(false);
    const [managerOpen,setManagerOpen]=useState(false),[managerCustomer,setManagerCustomer]=useState(null);
    const [selectedCustomer,setSelectedCustomer]=useState(null);
    const [taxIdentity,setTaxIdentity]=useState({countryCode:'DO',type:'RNC',value:''});
    const rncLookup=useRncLookup({value:taxIdentity.value,name,onName:value=>{setName(value);setDistinctConfirmed(false);},enabled:isModalOpen&&taxIdentity.countryCode==='DO'&&['RNC','CEDULA'].includes(taxIdentity.type)});
    const clearCustomer=()=>{setSelectedCustomerId(null);setSelectedCustomer(null);setName('');setPhone('');setAddress('');setTaxIdentity({countryCode:'DO',type:'RNC',value:''});setDistinctConfirmed(false);setNeedsConfirmation(false);setCustomerError('');};
    const openModal =
        useCallback(
            () => {
                /*
                 * Una nueva venta siempre
                 * debe comenzar limpia.
                 */
                dispatch(
                    removeAllItems()
                );

                dispatch(
                    clearDraftContext()
                );

                dispatch(
                    removeCustomer()
                );


                clearCustomer();
                setName("");
                setPhone("");
                setGuestCount(0);
                setAddress("");
                setSearch("");
                setSelectedCustomerId(null);
                setShowResults(false);
                setIsCustomerPickerOpen(false);

                setIsModalOpen(true);
            },
            [
                dispatch,
            ]
        );


    const closeModal =
        useCallback(
            () => {if(!customerLock.current)setIsModalOpen(false);},
            []
        );


    /*
     * ==========================================
     * SUPER ADMIN
     * ==========================================
     */

    const renderSuperAdmin = () => {
        return (
            <motion.div
                initial={{
                    y:
                        100,

                    opacity:
                        0,
                }}

                animate={{
                    y:
                        0,

                    opacity:
                        1,
                }}

                className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#1a1a1a] to-[#1f1f1f] p-2 h-16 flex justify-center items-center z-40 border-t border-[#2a2a2a]/50 backdrop-blur-lg"
            >

                <motion.button
                    whileHover={{
                        scale:
                            1.05,
                    }}

                    whileTap={{
                        scale:
                            0.95,
                    }}

                    className="flex items-center justify-center gap-2 font-bold bg-gradient-to-r from-blue-500 to-blue-700 text-black px-6 py-3 rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all"

                    onClick={() =>
                        navigate(
                            "/superadmin"
                        )
                    }
                >

                    <Settings className="w-5 h-5" />

                    {t(
                        "bottomNav.superAdminPanel"
                    )}

                </motion.button>


                <AnimatePresence>

                    {isTablePickerOpen && (

                        <motion.div
                            className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"

                            initial={{
                                opacity:
                                    0,
                            }}

                            animate={{
                                opacity:
                                    1,
                            }}

                            exit={{
                                opacity:
                                    0,
                            }}

                            onClick={() =>
                                setIsTablePickerOpen(
                                    false
                                )
                            }
                        >

                            <motion.div
                                className="w-full max-w-md rounded-2xl border border-gray-800/50 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-5"

                                initial={{
                                    scale:
                                        0.95,

                                    opacity:
                                        0,
                                }}

                                animate={{
                                    scale:
                                        1,

                                    opacity:
                                        1,
                                }}

                                exit={{
                                    scale:
                                        0.95,

                                    opacity:
                                        0,
                                }}

                                onClick={(
                                    event
                                ) =>
                                    event.stopPropagation()
                                }
                            >

                                <h3 className="text-white text-lg font-semibold">

                                    {t(
                                        "bottomNav.selectTable"
                                    )}

                                </h3>


                                <p className="text-xs text-[#ababab] mt-1">

                                    {t(
                                        "bottomNav.selectTableDescription"
                                    )}

                                </p>


                                <div className="mt-4 grid grid-cols-2 gap-3">

                                    <button
                                        type="button"

                                        onClick={() => {
                                            /*
                                             * Valor interno.
                                             * No traducimos "General".
                                             */
                                            const selectedTable = {
                                                tableNo:
                                                    1,

                                                area:
                                                    "General",
                                            };


                                            dispatch(
                                                setDraftContext({
                                                    table:
                                                    selectedTable,

                                                    isVirtual:
                                                        false,

                                                    virtualType:
                                                        null,

                                                    orderSource:
                                                        "DINE_IN",
                                                })
                                            );


                                            setIsTablePickerOpen(
                                                false
                                            );


                                            navigate(
                                                "/menu"
                                            );
                                        }}

                                        className="p-3 rounded-xl bg-[#1f1f1f] border border-gray-800/50 text-white hover:bg-[#2b2b2b]"
                                    >

                                        <div className="font-semibold">

                                            {t(
                                                "bottomNav.table"
                                            )}{" "}
                                            1

                                        </div>


                                        <div className="text-xs text-gray-400">

                                            {t(
                                                "bottomNav.general"
                                            )}

                                        </div>

                                    </button>

                                </div>


                                <div className="flex gap-3 mt-5">

                                    <button
                                        type="button"

                                        onClick={() =>
                                            setIsTablePickerOpen(
                                                false
                                            )
                                        }

                                        className="px-4 py-3 w-full rounded-lg font-semibold bg-[#1f1f1f] text-[#ababab]"
                                    >

                                        {t(
                                            "common.cancel"
                                        )}

                                    </button>


                                    <button
                                        type="button"

                                        onClick={() => {
                                            dispatch(
                                                setDraftContext({
                                                    table:
                                                        null,

                                                    isVirtual:
                                                        true,

                                                    virtualType:
                                                        "QUICK",

                                                    orderSource:
                                                        "QUICK",
                                                })
                                            );


                                            setIsTablePickerOpen(
                                                false
                                            );


                                            navigate(
                                                "/menu"
                                            );
                                        }}

                                        className="px-4 py-3 w-full rounded-lg font-semibold bg-[#f6b100] text-[#1f1f1f]"
                                    >

                                        {t(
                                            "bottomNav.continueWithoutTable"
                                        )}

                                    </button>

                                </div>

                            </motion.div>

                        </motion.div>

                    )}

                </AnimatePresence>

            </motion.div>
        );
    };


    /*
     * ==========================================
     * CLIENTES
     * ==========================================
     */

    const customersQuery =
        useQuery({
            queryKey: [
                "customers",
                isCustomerPickerOpen,
                search,
            ],

            queryFn:
                async () => {
                    const query =
                        String(
                            search ||
                            ""
                        ).trim();


                    const response =
                        await getCustomers(
                            query,
                            50
                        );


                    return (
                        response
                            ?.data
                            ?.data ||
                        []
                    );
                },

            enabled:
                isModalOpen &&
                isCustomerPickerOpen,

            staleTime:
                10_000,
        });


    const createCustomerMutation =
        useMutation({
            mutationFn:
                (
                    body
                ) =>
                    createCustomer(
                        body
                    ),
        });


    const pickCustomer = (
        customer
    ) => {
        setSelectedCustomer(customer);setTaxIdentity(customer?.taxIdentity||{countryCode:'DO',type:'RNC',value:''});setCustomerError('');setDistinctConfirmed(false);setNeedsConfirmation(false);setIsCustomerPickerOpen(false);
        setSelectedCustomerId(
            customer?._id ||
            null
        );

        setName(
            customer?.name ||
            ""
        );

        setPhone(
            customer?.phone ||
            ""
        );

        setAddress(
            customer?.address ||
            ""
        );

        setSearch(
            customer?.name ||
            ""
        );

        setShowResults(
            false
        );
    };


    useEffect(
        () => {
            if (
                !isModalOpen
            ) {
                return;
            }

            if (
                !selectedCustomerId
            ) {
                return;
            }
        },
        [
            name,
            selectedCustomerId,
            isModalOpen,
        ]
    );


    /*
     * ==========================================
     * CREAR ORDEN
     * ==========================================
     *
     * Los valores internos como:
     *
     * Consumidor Final
     * DINE_IN
     * QUICK
     *
     * permanecen intactos.
     */

    if (userData?.role === "SuperAdmin") return renderSuperAdmin();

    const handleCreateOrder = async () => {
        if(customerLock.current)return;customerLock.current=true;setCustomerBusy(true);setCustomerError('');
        try {
            const body={name:name.trim()||'Consumidor Final',phone:phone.trim(),address:address.trim(),taxIdentity:taxIdentity.value?.trim()?taxIdentity:null,confirmDistinctPerson:distinctConfirmed};
            let customer={...body,_id:null};
            if(selectedCustomerId||name.trim()||phone.trim()||taxIdentity.value?.trim()){
                const response=selectedCustomerId?await api.patch('/api/customer/'+selectedCustomerId,body):await createCustomerMutation.mutateAsync(body);
                customer=response.data?.data;
                if(!customer?._id)throw Error('CUSTOMER_RESPONSE_INVALID');
                await queryClient.invalidateQueries({queryKey:['customers']});
            }
            dispatch(setCustomer({customerId:customer._id,name:customer.name,phone:customer.phone,address:customer.address,taxIdentity:customer.taxIdentity,guests:Number(guestCount||0)}));
            dispatch(setDraftContext({table:null,isVirtual:false,virtualType:null,orderSource:'DINE_IN'}));
            setIsModalOpen(false);navigate('/tables');
        } catch(error){setCustomerError(customerErrorMessage(error.response?.data?.code));setNeedsConfirmation(error.response?.data?.code==='HOMONYM_CONFIRMATION_REQUIRED');setDistinctConfirmed(false);}
        finally{customerLock.current=false;setCustomerBusy(false);}
    };

    /*
     * ==========================================
     * NAVEGACIÓN
     * ==========================================
     */

    const handleNavigation = (
        path
    ) => {
        const isLeavingMenu =
            location
                .pathname
                .startsWith(
                    "/menu"
                ) &&
            !path.startsWith(
                "/menu"
            );


        if (
            isLeavingMenu
        ) {
            dispatch(
                removeAllItems()
            );

            dispatch(
                clearDraftContext()
            );

            dispatch(
                removeCustomer()
            );
        }


        navigate(
            path
        );
    };


    const isActive = (
        path
    ) =>
        location
            .pathname
            .startsWith(
                path
            );


    const navItems = [
        {
            path:
                "/",

            label:
                t(
                    "bottomNav.home"
                ),

            icon:
            Home,

            id:
                "home",
        },

        {
            path:
                "/orders",

            label:
                t(
                    "bottomNav.orders"
                ),

            icon:
            ListOrdered,

            id:
                "orders",
        },

        {
            path:
                "/tables",

            label:
                t(
                    "bottomNav.tables"
                ),

            icon:
            Table2,

            id:
                "tables",
        },
    ];


    /*
     * Estos roles son valores internos.
     * NO se traducen aquí.
     */
    const role =
        userData?.role;


    const isCashier =
        role ===
        "Cajera";


    const canSeeAdminPanel =
        [
            "Owner",
            "Admin",
        ].includes(
            role
        );


    if (
        isCashier
    ) {
        navItems.push({
            path:
                "/admin?tab=cash-register",

            label:
                t(
                    "bottomNav.cashRegister"
                ),

            icon:
            Wallet,

            id:
                "cash-register",
        });

    } else if (
        canSeeAdminPanel
    ) {
        navItems.push({
            path:
                "/admin",

            label:
                t(
                    "bottomNav.admin"
                ),

            icon:
            Settings,

            id:
                "admin",
        });
    }


    const needsCenterGap =
        navItems.length ===
        3;


    return (
        <>

            {/* ==========================================
                BOTTOM NAV
            ========================================== */}

            <motion.div
                initial={{
                    y:
                        100,

                    opacity:
                        0,
                }}

                animate={{
                    y:
                        0,

                    opacity:
                        1,
                }}

                transition={{
                    duration:
                        0.3,

                    ease:
                        "easeOut",
                }}

                className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#1a1a1a] via-[#1f1f1f] to-[#1a1a1a] p-3 h-20 flex justify-between items-center z-50 border-t border-[#2a2a2a]/50 shadow-2xl transition-colors duration-300"
            >

                {navItems.map(
                    (
                        item,
                        index
                    ) => {
                        const active =
                            isActive(
                                item.path
                            );


                        const Icon =
                            item.icon;


                        return (
                            <React.Fragment
                                key={
                                    item.id
                                }
                            >

                                <button
                                    onClick={() =>
                                        handleNavigation(
                                            item.path
                                        )
                                    }

                                    className={`relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
                                        active
                                            ? "text-white"
                                            : "text-[#ababab] hover:text-white"
                                    }`}
                                >

                                    {active && (

                                        <motion.div
                                            layoutId="activeTab"

                                            className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30"

                                            transition={{
                                                type:
                                                    "spring",

                                                stiffness:
                                                    300,

                                                damping:
                                                    25,
                                            }}
                                        />

                                    )}


                                    <Icon
                                        className={`w-5 h-5 relative z-10 ${
                                            active
                                                ? "text-blue-400"
                                                : ""
                                        }`}
                                    />


                                    <span
                                        className={`text-xs font-semibold relative z-10 ${
                                            active
                                                ? "text-blue-400"
                                                : ""
                                        }`}
                                    >

                                        {item.label}

                                    </span>

                                </button>


                                {needsCenterGap &&
                                    index ===
                                    1 && (

                                        <div
                                            className="w-16 pointer-events-none"

                                            aria-hidden="true"
                                        />

                                    )}

                            </React.Fragment>
                        );
                    }
                )}


                {/* BOTÓN CREAR ORDEN */}

                <button
                    onClick={
                        openModal
                    }

                    className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 via-blue-300 to-blue-950 text-black font-bold flex items-center justify-center shadow-2xl hover:shadow-blue-900/50 hover:scale-110 active:scale-95 transition-transform duration-200 z-50"

                    title={
                        t(
                            "bottomNav.createOrder"
                        )
                    }
                >

                    <Plus className="w-7 h-7" />

                </button>

            </motion.div>


            {/* ==========================================
                MODAL CREAR ORDEN
            ========================================== */}

            <AnimatePresence>

                {isModalOpen && (

                    <Modal
                        onClose={
                            closeModal
                        }

                        title={
                            t(
                                "bottomNav.createNewOrder"
                            )
                        }
                    >

                        <fieldset disabled={customerBusy} className="space-y-4 text-white max-h-[calc(100vh-180px)] overflow-y-auto pr-1" onChangeCapture={e=>{if(e.target.type!=='checkbox')setDistinctConfirmed(false);}}>

                            {/* CLIENTE GUARDADO */}

                            <div className="relative">

                                <label className="block mb-2 text-sm text-white/70">

                                    {t(
                                        "bottomNav.savedCustomerSearch"
                                    )}

                                </label>


                                <button
                                    type="button"

                                    className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-400 to-blue-100 text-black font-semibold hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 transition-all"

                                    onClick={() => {
                                        setIsCustomerPickerOpen(
                                            (
                                                value
                                            ) =>
                                                !value
                                        );

                                        setShowResults(
                                            true
                                        );
                                    }}
                                >

                                    {t(
                                        "bottomNav.searchCustomer"
                                    )}

                                </button>


                                {selectedCustomerId
                                    ? (

                                        <span className="block mt-2 text-xs text-white/70">

                                            {t(
                                                "bottomNav.customerSelected"
                                            )}

                                        </span>

                                    )
                                    : (

                                        <span className="block mt-2 text-xs text-white/50">

                                            {t(
                                                "bottomNav.optional"
                                            )}

                                        </span>

                                    )
                                }


                                {isCustomerPickerOpen && (

                                    <div className="absolute left-0 right-0 top-[88px] z-[99999] rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] p-3 shadow-2xl shadow-black/70">

                                        <div className="flex items-center gap-2">

                                            <input
                                                className="w-full rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2 outline-none text-white"

                                                placeholder={
                                                    t(
                                                        "bottomNav.searchCustomerPlaceholder"
                                                    )
                                                }

                                                value={
                                                    search
                                                }

                                                onChange={(
                                                    event
                                                ) =>
                                                    setSearch(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />


                                            <button
                                                type="button"

                                                className="px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a] text-white"

                                                onClick={() =>
                                                    setSearch(
                                                        ""
                                                    )
                                                }
                                            >

                                                {t(
                                                    "bottomNav.clear"
                                                )}

                                            </button>

                                        </div>


                                        <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-[#1f1f1f]">{customersQuery.isError&&<p role="alert">No se pudo cargar la lista. <button type="button" onClick={()=>customersQuery.refetch()}>Reintentar</button></p>}

                                            {customersQuery
                                                .isLoading && (

                                                <div className="px-3 py-2 text-sm text-white/60">

                                                    {t(
                                                        "bottomNav.loadingCustomers"
                                                    )}

                                                </div>

                                            )}


                                            {!customersQuery
                                                    .isLoading &&
                                                (
                                                    customersQuery
                                                        .data
                                                        ?.length ||
                                                    0
                                                ) ===
                                                0 && (

                                                    <div className="px-3 py-2 text-sm text-white/60">

                                                        {t(
                                                            "bottomNav.noCustomers"
                                                        )}

                                                    </div>

                                                )}


                                            {(
                                                customersQuery
                                                    .data ||
                                                []
                                            ).map(
                                                (
                                                    customer
                                                ) => (

                                                    <div key={customer._id}><button

                                                        type="button"

                                                        onClick={() => {
                                                            pickCustomer(
                                                                customer
                                                            );

                                                            setIsCustomerPickerOpen(
                                                                false
                                                            );
                                                        }}

                                                        className="w-full text-left px-3 py-2 hover:bg-[#161616] border-b border-[#1f1f1f]"
                                                    >

                                                        <div className="text-sm font-semibold text-white">

                                                            {customer.name}

                                                        </div>


                                                        <div className="text-xs text-white/60">

                                                            {customer.phone ||
                                                                t(
                                                                    "bottomNav.noPhone"
                                                                )
                                                            }

                                                            {customer.address
                                                                ? ` • ${customer.address}`
                                                                : ""
                                                            }

                                                        </div>

                                                    </button><div className="flex justify-end gap-3 mb-2"><button type="button" className="text-xs text-blue-300 px-2 py-2" onClick={()=>{setManagerCustomer(customer);setManagerOpen(true);}}>Editar</button><DeleteCustomerAction customer={customer} onDeleted={c=>{if(c._id===selectedCustomerId)clearCustomer();}}/></div></div>

                                                )
                                            )}

                                        </div>


                                        <div className="mt-3 flex justify-end">

                                            <button
                                                type="button"

                                                className="px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a] text-white"

                                                onClick={() =>
                                                    setIsCustomerPickerOpen(
                                                        false
                                                    )
                                                }
                                            >

                                                {t(
                                                    "bottomNav.close"
                                                )}

                                            </button>

                                        </div>

                                    </div>

                                )}

                            </div>


                            <div className="flex flex-wrap gap-3 text-sm"><button type="button" className="text-blue-300" onClick={()=>{setManagerCustomer(null);setManagerOpen(true);}}>Administrar clientes</button>{selectedCustomer&&<><button type="button" className="text-blue-300" onClick={()=>{setManagerCustomer(selectedCustomer);setManagerOpen(true);}}>Editar cliente guardado</button><DeleteCustomerAction customer={selectedCustomer} onDeleted={clearCustomer}/><button type="button" onClick={clearCustomer}>Usar otro cliente</button></>}</div>
                            {/* NOMBRE */}

                            <div>

                                <label className="block mb-2 text-sm text-white/70">

                                    {t(
                                        "bottomNav.customerName"
                                    )}

                                </label>


                                <input
                                    className="w-full rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2 outline-none text-white"

                                    placeholder={
                                        t(
                                            "bottomNav.customerNamePlaceholder"
                                        )
                                    }

                                    value={
                                        name
                                    }

                                    onChange={(
                                        event
                                    ) => {
                                        setName(
                                            event
                                                .target
                                                .value
                                        );
                                    }}
                                />

                            </div>


                            {/* TELÉFONO */}

                            <div>

                                <label className="block mb-2 text-sm text-white/70">

                                    {t(
                                        "bottomNav.customerPhoneOptional"
                                    )}

                                </label>


                                <input
                                    className="w-full rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2 outline-none text-white"

                                    placeholder="+1-9999999999"

                                    value={
                                        phone
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setPhone(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />

                            </div>


                            {/* DIRECCIÓN */}

                            <div>

                                <label className="block mb-2 text-sm text-white/70">

                                    {t(
                                        "bottomNav.addressOptional"
                                    )}

                                </label>


                                <input
                                    className="w-full rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2 outline-none text-white"

                                    placeholder={
                                        t(
                                            "bottomNav.addressPlaceholder"
                                        )
                                    }

                                    value={
                                        address
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setAddress(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />

                            </div>


                            <details><summary className="cursor-pointer text-sm text-white/70">Identificación fiscal (opcional)</summary><div className="grid gap-2 mt-2"><input aria-label="País fiscal" value={taxIdentity.countryCode||''} onChange={e=>setTaxIdentity(v=>({...v,countryCode:e.target.value.toUpperCase()}))} className="rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2"/><input aria-label="Tipo fiscal" value={taxIdentity.type||''} onChange={e=>setTaxIdentity(v=>({...v,type:e.target.value.toUpperCase()}))} className="rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2"/><input aria-label="RNC o cédula" placeholder="RNC o cédula" value={taxIdentity.value||''} onChange={e=>setTaxIdentity(v=>({...v,value:e.target.value}))} className="rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2"/><p role="status" className="text-xs text-white/60">{{LOADING:'Consultando RNC…',FOUND:'Encontrado; se conserva el nombre manual.',NOT_FOUND:'No encontrado. Completa el nombre manualmente.',ERROR:'Error consultando RNC.'}[rncLookup.status]}</p></div></details>
                            {customerError&&<p role="alert" className="text-sm text-red-300">{customerError}</p>}
                            {needsConfirmation&&<label className="flex items-start gap-2 text-sm text-amber-200"><input type="checkbox" checked={distinctConfirmed} onChange={e=>setDistinctConfirmed(e.target.checked)}/>Confirmo que es otra persona con una identificación fiscal distinta.</label>}
                            {/* PERSONAS */}

                            <div>

                                <label className="block mb-2 text-sm text-white/70">

                                    {t(
                                        "bottomNav.guests"
                                    )}

                                </label>


                                <div className="flex items-center justify-between rounded-lg bg-[#111] border border-[#2a2a2a] px-3 py-2">

                                    <button
                                        onClick={() =>
                                            setGuestCount(
                                                (
                                                    current
                                                ) =>
                                                    Math.max(
                                                        0,
                                                        current -
                                                        1
                                                    )
                                            )
                                        }

                                        className="px-3 py-1 bg-[#2a2a2a] rounded text-white"
                                    >
                                        −
                                    </button>


                                    <span>

                                        {t(
                                            "bottomNav.personCount",
                                            {
                                                count:
                                                guestCount,
                                            }
                                        )}

                                    </span>


                                    <button
                                        onClick={() =>
                                            setGuestCount(
                                                (
                                                    current
                                                ) =>
                                                    current +
                                                    1
                                            )
                                        }

                                        className="px-3 py-1 bg-[#2a2a2a] rounded text-white"
                                    >
                                        +
                                    </button>

                                </div>

                            </div>


                            <div className="pt-2">

                                <motion.button
                                    whileHover={{
                                        scale:
                                            1.02,
                                    }}

                                    whileTap={{
                                        scale:
                                            0.98,
                                    }}

                                    onClick={
                                        handleCreateOrder
                                    }

                                    disabled={customerBusy}

                                    className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-400 to-blue-800 text-black font-semibold hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 transition-all"
                                >

                                    {customerBusy
                                        ? t(
                                            "bottomNav.creating"
                                        )
                                        : t(
                                            "bottomNav.selectCustomer"
                                        )
                                    }

                                </motion.button>

                            </div>

                        </fieldset>

                    </Modal>

                )}

            </AnimatePresence>

            {managerOpen&&<CustomerManager key={managerCustomer?._id||'list'} initialCustomer={managerCustomer} onSaved={c=>{if(c){pickCustomer(c);setManagerOpen(false);}}} onClose={()=>setManagerOpen(false)}/>}
        </>
    );
});


BottomNav.displayName =
    "BottomNav";


export default BottomNav;