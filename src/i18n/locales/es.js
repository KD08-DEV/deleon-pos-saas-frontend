const es = {
    common: {
        save: "Guardar",
        cancel: "Cancelar",
        close: "Cerrar",
        loading: "Cargando...",
        print: "Imprimir",
        customer: "Cliente",
        phone: "Teléfono",
        address: "Dirección",
        total: "Total",
        subtotal: "Subtotal",
        discount: "Descuento",
        tax: "Impuesto",
        taxes: "Impuestos",
        tip: "Propina",
        paymentMethod: "Método de pago",
    },

    invoice: {
        titles: {
            standard: "Factura",
            consumerFinal: "Factura Consumidor Final",
            fiscal: "Factura con Comprobante Fiscal",
            ecf: "Factura Electrónica e-CF",
            preInvoice: "PreFactura",
        },

        thankYou: "Gracias por su compra",
        waiter: "Mesero",
        table: "Mesa",
        roomArea: "Sala/Área",
        branch: "Sucursal",
        emissionPoint: "Punto de emisión",
        dateTime: "Fecha/Hora",
        invoiceNumber: "Factura No.",
        customer: "Cliente",
        phone: "Teléfono",
        address: "Dirección",
        consumptionDetail: "Detalle de consumo",
        adjustmentDetail: "Detalle de la nota",
        description: "Descripción",
        quantity: "Cant.",
        price: "Precio",
        amount: "Importe",
        subtotal: "Subtotal",
        discount: "Descuento",
        tip: "Propina",
        tax: "Impuesto",
        totalToPay: "Total a pagar",
        paymentMethod: "Método de pago",
        printer: "Impresora",
        noPrinters: "No hay impresoras registradas",
        browserPrinterHelp:
            "En modo navegador se mostrará el diálogo de impresión.",
        printTicket: "Imprimir ticket",
        otherPrinters: "Otras impresoras",
        networkPrinter: "Impresora de red",
        printing: "Imprimiendo...",
        close: "Cerrar",
        closeAndRelease: "Cerrar y desocupar",
        releasing: "Desocupando...",
        noItems: "No hay artículos.",
        finalConsumer: "Consumidor Final",
        product: "Producto",
        adjustmentDocument: "Documento de ajuste electrónico",
        ecfType: "Tipo e-CF",
        ncfType: "Tipo NCF",
        ecfStatus: "Estado e-CF",
        pending: "Pendiente",
        referenceInfo: "Información de referencia",
        affectedEcf: "eNCF afectado",
        affectedEcfDate: "Fecha e-CF afectado",
        modificationCode: "Código modificación",
        reason: "Motivo",
        ncfExpiration: "Vence (NCF)",
        includedInPrice: "incluido",
        charge: "Cargo",
        commission: "Comisión",
        shipping: "Envío",
        mode: "Modo",
        paper: "Papel",
        ecfLookup: "Consulta e-CF DGII",
        securityCode: "Código de seguridad",
        signatureDate: "Fecha firma",
        openingPrintDialog:
            "Abriendo impresión normal del navegador...",
        sendingToPrinter:
            "Enviando factura a la impresora...",
        printedSuccessfully:
            "Factura impresa correctamente.",
        printFailed:
            "No se pudo imprimir la factura.",

        paymentMethods: {
            cash: "Efectivo",
            card: "Tarjeta",
            transfer: "Transferencia",
            credit: "Crédito",
        },
    },

    ticket: {
        title: "TICKET",
        finalConsumer: "Consumidor Final",
        item: "Artículo",
        phoneShort: "Tel",
        operation: "Operación",
        customer: "Cliente",
        table: "Mesa",
        date: "Fecha",
        waiter: "Mesero",
        roomArea: "Sala/Área",
        noItems: "Sin artículos",
        orderNote: "Nota del pedido",
        endOrder: "FIN PEDIDO",
        thankYou: "Gracias por su compra",
        printer: "Impresora",
        noPrinters: "No hay impresoras registradas",
        default: "Predeterminada",
        mode: "Modo",
        paper: "Papel",
        browserPrinterHelp:
            "En modo navegador se mostrará el diálogo de impresión.",
        fallbackKitchenPrinter:
            'No hay impresora registrada para "{{category}}". Se está usando la impresora de cocina.',
        otherPrinters: "Otras impresoras",
        printing: "Imprimiendo...",
        networkPrinter: "Impresora de red",
        close: "Cerrar",
        openingPrintDialog:
            "Abriendo impresión normal del navegador...",
        sendingToPrinter:
            "Enviando ticket a la impresora...",
        sentSuccessfully:
            "Ticket enviado correctamente.",
        printFailed:
            "No se pudo imprimir el ticket.",
        business: "NEGOCIO",
        note: "NOTA",
        subtotal: "Subtotal",
        discount: "Descuento",
        tax: "Impuesto",
        charge: "Cargo",
        serviceCharge: "Cargo servicio",
        manualTip: "Propina manual",
        total: "TOTAL",
        payment: "Pago",
        includedShort: "inc.",
        automaticPaymentByChannel:
            "El método de pago se asigna automáticamente por el canal",
    },

    bill: {
        items: "Artículos",
        note: "Nota",
        edit: "Editar",
        add: "Agregar",
        noNote: "Sin nota",
        orderNote: "Nota de la orden",
        notePlaceholder:
            "Ej: Sin cebolla, poco picante, entregar en recepción...",
        discount: "Descuento",
        tip: "Propina",
        tipHelp:
            "Propina voluntaria ingresada manualmente",
        taxes: "Impuestos",
        taxesHelp:
            "Se calculan según cada producto",
        shipping: "Envío",
        commission: "Comisión",
        tax: "Impuesto",
        charge: "Cargo",
        included: "incluido",
        recalculatingTaxes:
            "Recalculando impuestos...",
        total: "Total",

        paymentMethods: {
            cash: "Efectivo",
            card: "Tarjeta",
            transfer: "Transferencia",
            credit: "Crédito",
        },

        ticket: "Ticket",
        invoice: "Facturar",
        update: "Actualizar",
        printTicket: "Imprimir ticket",
        fiscalTicketBlocked:
            "Con NCF se imprime factura, no ticket.",

        customerDisplay: {
            review:
                "Revise su pedido antes de pagar.",
            empty:
                "Su orden aparecerá aquí.",
            paid:
                "Factura generada. Gracias por su compra.",
        },

        fiscal: {
            ecfTitle:
                "Factura electrónica e-CF",
            ncfTitle:
                "Factura fiscal (NCF)",
            ecfDescription:
                "Selecciona si será consumo electrónico o crédito fiscal electrónico.",
            ncfDescription:
                "Solo si el cliente lo solicita y tu empresa tiene NCF configurado.",
            ecfNotReady:
                "Este tenant no tiene e-CF listo para emitir.",
            ncfNotReady:
                "Este tenant no tiene NCF habilitado/configurado.",
            ncfType:
                "Tipo NCF",
            ecfType:
                "Tipo e-CF",
            e32:
                "e32 - Factura de consumo electrónica",
            e31:
                "e31 - Crédito fiscal electrónico",
            b01:
                "B01 - Crédito Fiscal",
            b02:
                "B02 - Consumidor Final",
            e31Help:
                "Para e31 debes agregar el RNC y razón social del cliente.",
            e32Help:
                "Para e32 los datos del cliente son opcionales, salvo casos especiales.",
            ncfHelp:
                "Recomendación: agrega RNC/Cédula para completar los datos.",
            searching:
                "Buscando en DGII...",
            found:
                "Encontrado.",
            notFound:
                "No encontrado.",
            lookupError:
                "Error consultando.",
            autocompleteFailed:
                "No se pudo autocompletar, introduzca el nombre manualmente.",
            customerData:
                "Datos del cliente",
            rncCedula:
                "RNC / Cédula",
            legalName:
                "Nombre / Razón Social",
        },

        leaveTable: {
            title:
                "¿Qué deseas hacer con esta mesa?",
            description:
                "Tienes productos agregados. Puedes guardarlos en la mesa para continuar luego o borrarlos antes de salir.",
            products:
                "Productos",
            currentTotal:
                "Total actual",
            saving:
                "Guardando...",
            save:
                "Guardar en la mesa",
            discard:
                "Borrar y salir",
            cancel:
                "Cancelar",
        },

        cash: {
            title:
                "Cambio en efectivo",
            description:
                "Ingresa cuánto entregó el cliente para calcular la devolución.",
            exact:
                "Exacto",
            received:
                "Monto recibido",
            placeholder:
                "Ej: 1000",
            change:
                "A devolver",
            missing:
                "Falta {{amount}}",
            sufficient:
                "Monto suficiente para facturar.",
        },

        messages: {
            orderAlreadyClosed:
                "La orden ya estaba cerrada. Se limpió el carrito para iniciar una nueva venta.",
            paymentUpdated:
                "Método de pago actualizado.",
            saveOrderFirst:
                "Guarda la orden primero para cambiar el método de pago.",
            creditNotAllowed:
                "Tu plan actual no permite ventas a crédito.",
            creditNeedsCustomer:
                "Para vender fiado debes seleccionar o crear un cliente guardado.",
            noItems:
                "No hay artículos en el carrito para guardar la orden.",
            noNewItems:
                "No hay platos nuevos para imprimir.",
            invoiceGenerated:
                "Factura generada correctamente.",
            ecfGenerated:
                "e-CF emitido correctamente.",
            ecfFailed:
                "No se pudo emitir el e-CF. La factura no debe imprimirse.",
            invoiceEcfFailed:
                "La factura fue generada, pero no se pudo emitir el e-CF.",
            closeTableSuccess:
                "Factura cerrada y mesa desocupada correctamente.",
            closeTableError:
                "No se pudo cerrar y desocupar la mesa.",
            deleteTableItemsError:
                "No se pudieron borrar los artículos de la mesa.",
            autocompleteFailed:
                "No se pudo autocompletar, introduzca el nombre manualmente.",
            e32BuyerRequired:
                "Para facturar e32 por RD$250,000 o más debes agregar RNC/Cédula válido del comprador.",
            e31BuyerRequired:
                "Para e31 crédito fiscal electrónico, debes agregar un RNC/Cédula válido de 9 u 11 dígitos.",
            b01BuyerRequired:
                "Para B01 crédito fiscal, debes agregar un RNC válido de 9 u 11 dígitos.",
        },

        production: {
            kitchen: "COCINA",
            bar: "BAR",
            production: "PRODUCCIÓN",
        },
    },
    cart: {
        title:
            "Detalles de la orden",

        empty:
            "Tu carrito está vacío. Empieza a añadir productos.",

        added:
            "Agregado",

        product:
            "Producto",

        extra:
            "Extra",

        ingredient:
            "Ingrediente",

        withoutPrefix:
            "Sin",

        note:
            "Nota",

        basePrice:
            "Precio base",

        extrasPerUnit:
            "Extras por unidad",

        removeProduct:
            "Eliminar producto",

        editCustomization:
            "Editar personalización",

        editProductAria:
            "Editar {{product}}",

        addUnit:
            "Agregar una unidad",
    },
    customerInfo: {
        finalConsumer:
            "Consumidor Final",

        finalConsumerInitials:
            "CF",

        selectedTable:
            "Mesa seleccionada",

        noPhone:
            "Sin teléfono",

        table:
            "Mesa",

        editNamePhone:
            "Editar nombre y teléfono",

        editCustomer:
            "Editar cliente",

        title:
            "Datos del cliente",

        description:
            "Estos datos aparecerán en la factura.",

        customerName:
            "Nombre del cliente",

        namePlaceholder:
            "Ej: Juan Pérez",

        phone:
            "Teléfono",

        phonePlaceholder:
            "Ej: 809-555-5555",

        taxIdentity:
            "Identificación fiscal",

        taxIdentityDescription:
            "Opcional. Se utilizará en facturas y documentos fiscales cuando corresponda.",

        country:
            "País",

        type:
            "Tipo",

        label:
            "Etiqueta",

        visibleNamePlaceholder:
            "Nombre visible",

        taxNumber:
            "Número fiscal",

        taxNumberPlaceholder:
            "Número de identificación fiscal",

        emptyNameInfo:
            "Puedes dejar el nombre vacío y la factura utilizará",

        saving:
            "Guardando...",
        selectSavedCustomer:
            "Seleccionar cliente guardado",

        changeCustomer:
            "Cambiar cliente",

        savedCustomers: {
            title:
                "Clientes guardados",

            description:
                "Busca y selecciona un cliente para asignarlo a esta orden.",

            searchPlaceholder:
                "Buscar por nombre, teléfono o dirección...",

            loading:
                "Cargando clientes...",

            empty:
                "No hay clientes para mostrar.",

            current:
                "Actual",

            selecting:
                "Seleccionando...",
        },

        messages: {
            updated:
                "Datos del cliente actualizados.",

            updateFailed:
                "No se pudieron actualizar los datos del cliente.",

            invalidSavedCustomer:
                "El cliente seleccionado no es válido.",

            customerSelected:
                "Cliente seleccionado correctamente.",

            customerSelectFailed:
                "No se pudo seleccionar el cliente.",

            customersLoadFailed:
                "No se pudieron cargar los clientes guardados.",
        },
    },
    menu: {
        availableDishes:
            "Platos disponibles",

        searchPlaceholder:
            "Buscar platos...",

        uncategorized:
            "Sin categoría",

        editCustomization:
            "Editar personalización",

        customizeProduct:
            "Personalizar producto",

        customizationDescription:
            "Selecciona los extras y lo que deseas retirar.",

        extras:
            "Extras",

        extrasDescription:
            "El precio seleccionado se suma a cada unidad del producto.",

        maximum:
            "Máximo {{count}}",

        removeIngredients:
            "Retirar ingredientes",

        removeIngredientsDescription:
            "Marca únicamente lo que no debe incluirse.",

        withoutIngredient:
            "Sin {{name}}",

        kitchenNoteOptional:
            "Nota para cocina (opcional)",

        kitchenNotePlaceholder:
            "Ej: Salsa aparte, bien cocida...",

        basePrice:
            "Precio base",

        extrasPerUnit:
            "Extras por unidad",

        totalUnits_one:
            "Total ({{count}} unidad)",

        totalUnits_other:
            "Total ({{count}} unidades)",

        saveChanges:
            "Guardar cambios",

        addToOrder:
            "Agregar al pedido",

        manualPrice:
            "Precio manual",

        enterPrice:
            "Escribe el precio",

        manualPricePlaceholder:
            "Ej: 350",

        add:
            "Agregar",

        added:
            "Agregado",

        loading:
            "Cargando menú...",

        loadError:
            "Error al cargar el menú.",

        noDishesAvailable:
            "Platos no disponibles",

        noSearchResults:
            "No se encontraron platos para “{{search}}”.",

        itemCount_one:
            "{{count}} artículo",

        itemCount_other:
            "{{count}} artículos",

        weight:
            "Peso",

        weightPlaceholder:
            "Ej: 0.5",

        decrease:
            "Disminuir {{name}}",

        increase:
            "Aumentar {{name}}",

        messages: {
            customizationDisabled:
                "La personalización de productos no está habilitada.",

            weightProductsNoEditor:
                "Los productos por peso no utilizan este editor.",

            productConfigNotFound:
                "No se pudo encontrar la configuración actual de este producto.",

            quantityAtLeastOne:
                "La cantidad debe ser al menos 1.",

            productUpdateFailed:
                "No se pudo actualizar este producto.",

            productUpdated:
                "{{name}} actualizado.",

            productAdded:
                "{{name}} x{{quantity}} agregado.",

            weightGreaterThanZero:
                "El peso debe ser mayor a 0 {{unit}}.",

            invalidManualPrice:
                "Precio manual inválido.",
        },
    },
    tableCard: {
        channel:
            "Canal",

        table:
            "Mesa",

        quick:
            "Rápido",

        delivery:
            "Delivery",

        available:
            "Disponible",

        occupied:
            "Ocupada",

        area:
            "Área",

        general:
            "General",

        seats:
            "Sillas",

        noTable:
            "Sin mesa",

        tableAria:
            "Mesa {{table}}",
    },
    tables: {
        area:
            "Área",

        allAreas:
            "Todas",

        general:
            "General",

        loadingTables:
            "Cargando mesas...",

        table:
            "Mesa",

        seats:
            "Sillas",

        currentOrder:
            "Orden actual",

        yes:
            "Sí",

        no:
            "No",

        openOrder:
            "Abrir orden",

        goToMenu:
            "Ir al menú",

        releaseTable:
            "Desocupar mesa",

        releaseDescription:
            "La mesa quedará disponible, pero la orden activa se mantendrá igual. No será cancelada ni facturada.",

        releasing:
            "Desocupando...",

        confirmRelease:
            "Sí, desocupar",

        quick:
            "Rápido",

        delivery:
            "Delivery",

        shippingBadge:
            "ENVÍO",

        status: {
            available:
                "Disponible",

            occupied:
                "Ocupada",

            reserved:
                "Reservada",
        },

        messages: {
            tableUpdated:
                "Estado de mesa actualizado.",

            tableUpdateFailed:
                "No se pudo actualizar la mesa.",

            occupiedNoPermission:
                "Mesa ocupada. No tienes permisos para editar esta orden.",

            closedOrderLinked:
                "La mesa tenía una orden cerrada asociada. Se abrirá una nueva orden.",

            tableIdNotFound:
                "No se encontró el ID de la mesa.",

            releaseSuccess:
                "Mesa desocupada correctamente. La orden se mantiene igual.",

            releaseFailed:
                "No se pudo desocupar la mesa.",
        },
    },
    menuPage: {
        documentTitle:
            "POS | Menú",

        customerName:
            "Nombre del cliente",

        selectedTable:
            "Mesa seleccionada",

        table:
            "Mesa",

        customerDisplay: {
            title:
                "Pantalla cliente",

            open:
                "Abrir pantalla del cliente",

            open7:
                'Abrir pantalla 7"',

            open116:
                'Abrir pantalla 11.6"',

            review:
                "Revise su pedido en pantalla.",

            empty:
                "Su orden aparecerá aquí.",
        },

        leaveTable: {
            title:
                "¿Qué deseas hacer con esta mesa?",

            description:
                "Tienes productos agregados. Puedes guardarlos en la mesa para continuar luego o borrarlos antes de salir.",

            products:
                "Productos",

            currentTotal:
                "Total actual",

            processing:
                "Procesando...",

            save:
                "Guardar en la mesa",

            discard:
                "Borrar y salir",
        },

        messages: {
            itemsSaved:
                "Productos guardados en la mesa.",

            saveFailed:
                "No se pudieron guardar los productos en la mesa.",

            itemsRemoved:
                "Productos eliminados de la mesa.",

            removeFailed:
                "No se pudieron borrar los productos de la mesa.",
        },
    },
    homeGreeting: {
        morning:
            "Buenos días",

        afternoon:
            "Buenas tardes",

        evening:
            "Buenas noches",

        user:
            "Usuario",

        messages: {
            morning:
                "Gestiona tus operaciones de manera eficiente",

            afternoon:
                "Continúa brindando excelente servicio a tus clientes",

            evening:
                "Revisa el resumen del día y prepárate para mañana",
        },
    },
    messages: {
        loadOrdersFailed:
            "No se pudieron cargar las órdenes.",
    },
        cashGate: {
            pendingTitle: "Cierre de caja pendiente",
            pendingDescription: "Hay una caja anterior abierta. Debes cerrarla antes de abrir la caja de hoy.",
            pendingDate: "Fecha pendiente",
            register: "Caja",
            openingFloat: "Fondo inicial",
            goToClose: "Ir a cerrar caja",
            openTitle: "Apertura de caja",
            openDescription: "Debes registrar el fondo inicial antes de usar el sistema.",
            openingAmount: "Monto de apertura",
            amountPlaceholder: "Ej.: 2000",
            saving: "Guardando...",
            saveOpening: "Guardar apertura",
            closeTitle: "¿Cerrar apertura de caja?",
            closeDescription: "Si cierras esta ventana, no podrás registrar ventas hasta abrir la caja con un fondo inicial.",
            cancel: "Cancelar",
            close: "Cerrar"
        },
    homeDashboard: {
        pageTitle:
            "POS | Inicio",

        miniCard: {
            activeOrders:
                "Órdenes activas",

            completedOrders:
                "Órdenes completadas",

            totalEarnings:
                "Ganancias totales",

            revenue:
                "Ingresos",

            comparedToYesterday:
                "que ayer",
        },

        orderStatus: {
            inProgress:
                "En Progreso",

            ready:
                "Listo",

            completed:
                "Completado",

            cancelled:
                "Cancelado",
        },

        orderList: {
            customer:
                "Cliente",

            table:
                "Mesa",

            itemCount_one:
                "{{count}} artículo",

            itemCount_other:
                "{{count}} artículos",
        },

        recentOrders: {
            title:
                "Órdenes recientes",

            searchPlaceholder:
                "Busca tus órdenes recientes...",

            showMore:
                "Ver más",

            showLess:
                "Ver menos",

            empty:
                "No hay pedidos disponibles",

            loadError:
                "Ocurrió un error al cargar las órdenes.",
        },

        popularDishes: {
            title:
                "Platos populares",

            category:
                "Categoría",

            sold:
                "Vendidos",

            revenue:
                "Ingresos",

            uncategorized:
                "Sin categoría",

            loading:
                "Cargando platos...",

            loadError:
                "Error cargando platos.",

            empty:
                "Todavía no hay platos disponibles.",
        },
    },

    bottomNav: {
        superAdminPanel:
            "Panel SuperAdmin",

        selectTable:
            "Seleccionar mesa",

        selectTableDescription:
            "Elige la mesa antes de ir al menú.",

        table:
            "Mesa",

        general:
            "General",

        continueWithoutTable:
            "Continuar sin mesa",

        home:
            "Inicio",

        orders:
            "Órdenes",

        tables:
            "Mesas",

        cashRegister:
            "Cierre de caja",

        admin:
            "Admin",

        createOrder:
            "Crear orden",

        createNewOrder:
            "Crear nueva orden",

        savedCustomerSearch:
            "Buscar cliente guardado",

        searchCustomer:
            "Buscar cliente",

        customerSelected:
            "Cliente seleccionado",

        optional:
            "Opcional",

        searchCustomerPlaceholder:
            "Buscar por nombre, teléfono o dirección...",

        clear:
            "Limpiar",

        loadingCustomers:
            "Cargando clientes...",

        noCustomers:
            "No hay clientes para mostrar.",

        noPhone:
            "Sin teléfono",

        close:
            "Cerrar",

        customerName:
            "Nombre del cliente",

        customerNamePlaceholder:
            "Ingresa el nombre del cliente",

        customerPhoneOptional:
            "Teléfono del cliente (opcional)",

        addressOptional:
            "Dirección (opcional)",

        addressPlaceholder:
            "Ej: Alma Rosa II, Calle..., Apto...",

        guests:
            "Personas",

        personCount_one:
            "{{count}} persona",

        personCount_other:
            "{{count}} personas",

        creating:
            "Creando...",

        selectCustomer:
            "Seleccionar cliente",

        messages: {
            createOrderMissingId:
                "No se pudo crear la orden.",

            createOrderFailed:
                "Error al crear la orden.",

            phoneExists:
                "Este teléfono ya existe. Usando el cliente guardado.",

            customerSaveFailed:
                "No se pudo guardar el cliente, pero puedes continuar con el nombre escrito.",
        },
    },

    header: {
        inventoryNotifications:
            "Notificaciones de inventario",

        inventoryPlanRequired:
            "El inventario está disponible solo en los planes Premium/Estándar",

        inventory:
            "Inventario",

        lowStockCount:
            "Bajo stock: {{count}}",

        loading:
            "Cargando...",

        noLowStockAlerts:
            "No hay alertas de bajo stock.",

        stock:
            "Stock",

        minimum:
            "Mín",

        lowStock:
            "Bajo stock",

        viewInventory:
            "Ver inventario",

        close:
            "Cerrar",

        testUser:
            "USUARIO DE PRUEBA",

        userFallback:
            "Usuario",

        roleFallback:
            "Rol",

        theme:
            "Tema",

        dark:
            "Oscuro",

        light:
            "Claro",

        logout:
            "Cerrar sesión",

        roles: {
            cashier:
                "Cajera",

            waiter:
                "Camarero",

            owner:
                "Propietario",

            admin:
                "Admin",

            superAdmin:
                "SuperAdmin",
        },
    },
    splitBilling: {
        title:
            "Dividir cuenta",

        description:
            "Asigna cantidades por ítem a cada cuenta. Luego podrás cobrar por separado.",

        accountNumber:
            "Cuenta {{number}}",

        splitEqually:
            "Dividir igual",

        splitByAmountComingSoon:
            "Dividir por monto (próximo)",

        splitByAmountTooltip:
            "Lo añadiremos en el siguiente paso porque asignar montos personalizados requiere controles adicionales.",

        orderItems:
            "Ítems del pedido",

        totalAllocated:
            "Total asignado",

        quantity:
            "Cant.",

        unitPrice:
            "Unidad",

        remaining:
            "Restante",

        accounts:
            "Cuentas",

        add:
            "Añadir",

        noItemsAssigned:
            "No hay ítems asignados a esta cuenta.",

        subtotal:
            "Subtotal",

        versionNote:
            "Nota: en esta versión, los impuestos y la propina se calculan después, de forma proporcional o manual.",

        close:
            "Cerrar",

        validation: {
            allocateAll:
                "Debes asignar el 100% de las cantidades antes de guardar.",
        },

        invoices: {
            title:
                "Facturas divididas",

            description:
                "Selecciona una cuenta para ver o imprimir su factura.",

            viewPrint:
                "Ver / Imprimir",

            moreItems_one:
                "+{{count}} ítem más…",

            moreItems_other:
                "+{{count}} ítems más…",
        },
    },
    orderCard: {
        correction: {
            action: "Corregir orden",
            history: "Historial de correcciones",
            title: "Corrección de orden normal",
            help: "Corrige artículos, extras, impuestos, propinas y métodos de pago con auditoría. Los comprobantes fiscales emitidos permanecen bloqueados.",
            note: "Observaciones de la orden",
            reason: "Motivo de corrección (obligatorio)",
            minReason: "Escribe al menos 8 caracteres. Quedará registrado en la auditoría.",
            saved: "Corrección registrada correctamente",
            failed: "No se pudo corregir la orden. Revisa permisos y estado.",
            OPEN_CASH_SESSION_REQUIRED: "No puedes cambiar el método: la caja de esa venta no está abierta o no se puede identificar.",
            FISCAL_OR_CREDIT_ORDER_LOCKED: "Una orden fiscal o a crédito no se corrige por esta vía.",
            ECF_DOCUMENT_EXISTS: "La orden tiene un documento electrónico y no puede modificarse.",
            ORDER_CHANGED_RELOAD: "La orden cambió. Actualiza la página y vuelve a intentarlo.",
            method: { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", other: "Otros" },
        },
        noNumber:
            "Sin número",

        dineIn:
            "Restaurante",

        withoutIngredient:
            "Sin {{name}}",

        itemFallback:
            "Ítem",

        extraFallback:
            "Extra",

        ingredientFallback:
            "Ingrediente",

        userFallback:
            "Usuario",

        customerFallback:
            "Cliente",

        invoice:
            "Factura",

        table:
            "Mesa",

        customer:
            "Cliente",

        statusLabel:
            "Estado",

        items:
            "Ítems",

        note:
            "Nota",

        productTypes:
            "Tipos de producto",

        statusHistory:
            "Historial de estados",

        createdAt:
            "Creado en",

        type:
            "Tipo",

        actionsLabel:
            "Acciones",

        noProducts:
            "No hay productos.",

        changedBy:
            "por {{name}}",

        page:
            "Página {{current}}/{{total}}",

        showingLines:
            "Mostrando {{start}}-{{end}} de {{total}} líneas",

        guestCount_one:
            "{{count}} invitado",

        guestCount_other:
            "{{count}} invitados",

        itemCount_one:
            "{{count}} ítem",

        itemCount_other:
            "{{count}} ítems",

        accountCount_one:
            "{{count}} cuenta",

        accountCount_other:
            "{{count}} cuentas",

        splitAccountBadge_one:
            "Cuenta dividida: {{count}} cuenta",

        splitAccountBadge_other:
            "Cuenta dividida: {{count}} cuentas",

        waitTime: {
            justArrived:
                "Recién entró",

            waiting:
                "Lleva tiempo",

            delayed:
                "Está tardando",
        },

        status: {
            inProgress:
                "En Progreso",

            ready:
                "Listo",

            completed:
                "Completado",

            cancelled:
                "Cancelado",

            pending:
                "Pendiente",
        },

        actions: {
            back:
                "Atrás",

            complete:
                "Completar",

            options:
                "Opciones",

            next:
                "Siguiente",

            markReady:
                "Marcar como Listo",

            markComplete:
                "Marcar como Completo",

            markCompleted:
                "Marcar como completado",

            reactivate:
                "Reactivar orden",

            viewInvoice:
                "Ver factura",

            generateInvoice:
                "Generar factura",

            splitPayment:
                "Dividir pago",

            cancelOrder:
                "Cancelar orden",
        },

        details: {
            title:
                "Detalles de la orden",
        },

        cancelModal: {
            title:
                "Cancelar orden",

            description:
                "Puedes agregar o editar la nota antes de cancelar esta orden.",

            noteLabel:
                "Nota de la orden",

            notePlaceholder:
                "Ej: Cliente canceló, producto no disponible, pedido duplicado...",

            cancelling:
                "Cancelando...",
        },

        messages: {
            splitSaved:
                "Split guardado. Selecciona una cuenta para imprimir.",

            splitSaveFailed:
                "No se pudo guardar el split.",

            invoiceUnavailable:
                "Esta orden no tiene factura disponible.",

            invoiceOpenFailed:
                "No se pudo abrir la factura.",

            invoiceGenerateFailed:
                "No se pudo generar la factura.",

            invoiceOpenGenerateFailed:
                "Error abriendo o generando la factura.",

            cancelNotAllowed:
                "No tienes permiso para cancelar órdenes.",

            paymentSuccess:
                "Orden cobrada correctamente.",

            paymentFailed:
                "No se pudo cobrar la orden.",
        },
    },
    ordersPage: {
        correctionHistoryAll: "Historial de correcciones",
        pageTitle:
            "POS | Órdenes",

        title:
            "Órdenes",

        updating:
            "Actualizando",

        date:
            "Fecha",

        type:
            "Tipo",

        allTypes:
            "Todos",

        dateFilters: {
            last24h:
                "Últimas 24h",

            last7Days:
                "7 días",

            all:
                "Todos",
        },

        statusTabs: {
            all:
                "Todo",
        },

        viewModes: {
            display:
                "Pantalla",

            list:
                "Lista",

            comfortable:
                "Cómoda",

            compact:
                "Compacta",
        },

        noCategories:
            "No hay categorías disponibles.",

        loading:
            "Cargando órdenes...",

        loadError:
            "No se pudieron cargar las órdenes.",

        retry:
            "Reintentar",

        showingOrders:
            "Mostrando {{visible}} de {{total}} órdenes · {{date}}.",

        sortedNewestBottom:
            "Ordenadas con las más recientes abajo.",

        loadMorePrevious:
            "Cargar órdenes anteriores",

        empty:
            "No hay órdenes para mostrar.",

        messages: {
            newOrdersReceived_one:
                "{{count}} nueva orden recibida",

            newOrdersReceived_other:
                "{{count}} nuevas órdenes recibidas",
        },
    },
    accountsReceivable: {
        title:
            "Cuentas por cobrar",

        description:
            "Controla ventas fiadas, abonos, pagos parciales y saldos pendientes.",

        searchPlaceholder:
            "Buscar cliente, teléfono o factura...",

        customerFallback:
            "Cliente",

        noPhone:
            "Sin teléfono",

        invoice:
            "Factura",

        amount:
            "Monto",

        paidAmount:
            "Abonado",

        balance:
            "Pendiente",

        noActions:
            "Sin acciones",

        loading:
            "Cargando cuentas por cobrar...",

        empty:
            "No hay cuentas por cobrar para este filtro.",

        summary: {
            openBalance:
                "Balance pendiente",

            pending:
                "Pendientes",

            partial:
                "Parciales",

            totalPaid:
                "Total abonado",
        },
        grouped: {
            accountsLabel:
                "Cuentas",

            accounts_one:
                "{{count}} cuenta",

            accounts_other:
                "{{count}} cuentas",

            totalCredit:
                "Total a crédito",

            showDetails:
                "Ver deudas y fechas",

            hideDetails:
                "Ocultar deudas",

            creditDetails:
                "Detalle de cuentas",

            creditDetailsDescription:
                "Facturas, fechas y saldos pendientes de {{name}}.",

            saleDate:
                "Fecha de venta",

            dueDate:
                "Vencimiento",

            noDueDate:
                "Sin fecha de vencimiento",
        },

        filters: {
            open:
                "Abiertas",

            pending:
                "Pendientes",

            partial:
                "Parciales",

            paid:
                "Pagadas",

            void:
                "Anuladas",
        },

        status: {
            pending:
                "Pendiente",

            partial:
                "Parcial",

            paid:
                "Pagada",

            void:
                "Anulada",
        },

        actions: {
            partialPayment:
                "Abonar",

            fullPayment:
                "Pago completo",
        },

        table: {
            customer:
                "Cliente",

            invoice:
                "Factura",

            date:
                "Fecha",

            amount:
                "Monto",

            paid:
                "Abonado",

            balance:
                "Pendiente",

            status:
                "Estado",

            actions:
                "Acciones",
        },

        paymentMethods: {
            cash:
                "Efectivo",

            card:
                "Tarjeta",

            transfer:
                "Transferencia",

            other:
                "Otros",
        },

        paymentModal: {
            title:
                "Registrar pago",

            amountReceived:
                "Monto recibido",

            paymentMethod:
                "Método de pago",

            optionalNote:
                "Nota opcional",

            notePlaceholder:
                "Ejemplo: pago recibido en caja...",

            saving:
                "Guardando...",

            registerPayment:
                "Registrar pago",
        },

        messages: {
            noAccountSelected:
                "Cuenta no seleccionada.",

            invalidAmount:
                "Monto inválido.",

            selectRegisterBeforePayment:
                "Debes seleccionar una caja antes de registrar el cobro.",

            paymentExceedsBalance:
                "El pago no puede superar el balance pendiente de {{amount}}.",

            paymentSuccess:
                "Pago registrado correctamente.",

            paymentFailed:
                "No se pudo registrar el pago.",

            loadFailed:
                "No se pudieron cargar las cuentas por cobrar.",
        },
    },
    admin: {
        loading:
            "Cargando...",

        navigation:
            "Navegación",

        comingSoon:
            "Próximamente",

        comingSoonDescription:
            "Esta funcionalidad estará disponible próximamente.",

        header: {
            eyebrow:
                "Panel administrativo",

            title:
                "Panel de Administración",

            description:
                "Gestiona tu equipo, revisa reportes y controla el uso de tu plan.",

            registerUser:
                "Registrar Usuario",
        },

        metrics: {
            currentPlan:
                "Plan actual",

            users:
                "Usuarios",

            team:
                "Equipo",

            totalActive:
                "Total activos",

            tablesAndDishes:
                "Mesas & Platos",

            tables:
                "mesas",

            dishes:
                "platos",

            limit:
                "Límite",
        },

        menu: {
            sections: {
                reportsAnalysis:
                    "Reportes y Análisis",

                staffManagement:
                    "Gestión de Personal",

                restaurant:
                    "Restaurante",

                billingConfiguration:
                    "Facturación y Configuración",

                inventory:
                    "Inventario",

                financialManagement:
                    "Gestión Financiera",

                settings:
                    "Configuración",
            },

            items: {
                cashRegister: {
                    label:
                        "Cierre de Caja",

                    description:
                        "Control de cierre de caja diario",
                },

                accountsReceivable: {
                    label:
                        "Cuentas por cobrar",

                    description:
                        "Control de fiado, abonos y saldos pendientes",
                },

                salesReports: {
                    label:
                        "Reportes de Ventas",

                    description:
                        "Reporte básico de ventas y facturación",
                },

                productReports: {
                    label:
                        "Reportes de Productos",

                    description:
                        "Productos más vendidos y análisis por producto",
                },

                financialAnalysis: {
                    label:
                        "Análisis Financiero",

                    description:
                        "Análisis detallado de finanzas",
                },

                employees: {
                    label:
                        "Empleados",

                    description:
                        "Gestionar empleados",
                },

                payroll: {
                    label:
                        "Nómina",

                    description:
                        "Crear corridas y postear gasto",
                },

                schedules: {
                    label:
                        "Horarios y Turnos",

                    description:
                        "Gestionar horarios de trabajo",
                },

                attendance: {
                    label:
                        "Asistencia",

                    description:
                        "Control de asistencia",
                },

                branches: {
                    label: "Sucursales",
                    description: "Administrar sedes y menú compartido",
                },
                menuManagement: {
                    label:
                        "Gestión de Menú",

                    description:
                        "Administrar platos, productos y categorías básicas",
                },

                tablesManagement: {
                    label:
                        "Gestión de Mesas",

                    description:
                        "Administrar mesas del restaurante",
                },

                inventoryCategories: {
                    label:
                        "Categorías de inventario",

                    description:
                        "Organizar categorías de inventario",
                },

                regionalConfig: {
                    label:
                        "Configuración regional",

                    description:
                        "País, moneda, idioma, zona horaria, fecha, hora y unidades",
                },

                taxConfig: {
                    label:
                        "Impuestos",

                    description:
                        "Tasas, impuestos por producto y reglas fiscales generales",
                },

                serviceCharges: {
                    label:
                        "Cargos y propinas",

                    description:
                        "Propina manual, service charges y cargos automáticos",
                },

                billingGeneral: {
                    label:
                        "Facturación general",

                    description:
                        "Logo, descuentos, prefactura y comportamiento de facturación",
                },

                deliveryChannels: {
                    label:
                        "Delivery y canales",

                    description:
                        "Delivery interno, PedidosYa, Uber Eats y comisiones",
                },

                taxIdentity: {
                    label:
                        "Identificación fiscal",

                    description:
                        "RNC, EIN, VAT, ABN y otras identificaciones fiscales",
                },

                printers: {
                    label:
                        "Configuración de impresoras",

                    description:
                        "Gestionar impresoras de tickets y facturas",
                },

                suppliers: {
                    label:
                        "Proveedores",

                    description:
                        "Gestionar proveedores",
                },

                stockControl: {
                    label:
                        "Control de Stock",

                    description:
                        "Inventario y stock de ingredientes",
                },

                expenseCategories: {
                    label:
                        "Categorías de gasto",

                    description:
                        "Crear o editar categorías de gasto",
                },

                expenses: {
                    label:
                        "Registro de gastos",

                    description:
                        "Registrar gastos operativos",
                },

                expenseSummary: {
                    label:
                        "Reporte de gastos",

                    description:
                        "Resumen y análisis de gastos",
                },

                notifications: {
                    label:
                        "Notificaciones",

                    description:
                        "Configurar notificaciones del negocio",
                },

                help: {
                    label:
                        "Ayuda y Soporte",

                    description:
                        "Documentación y ayuda",
                },
            },
        },

        plan: {
            subscription:
                "Suscripción",

            currentPlan:
                "Plan Actual",

            usageDescription:
                "Uso basado en los recursos de tu empresa.",

            upgrade:
                "Mejorar plan",

            totalUsers:
                "Usuarios totales",

            admins:
                "Admins",

            cashiers:
                "Cajeras",

            waiters:
                "Camareros",

            dishes:
                "Platos",

            tables:
                "Mesas",

            remaining_one:
                "{{count}} restante",

            remaining_other:
                "{{count}} restantes",

            upgradeMessages: {
                emprendedor:
                    "¿Necesitas más capacidad y módulos? Pásate a ESTÁNDAR, PREMIUM o PRO.",

                estandar:
                    "¿Necesitas funciones más avanzadas? Pásate a PREMIUM o PRO.",

                premium:
                    "¿Quieres desbloquear todas las funciones disponibles? Pásate a PRO.",
            },
        },
    },
    suppliers: {
        title:
            "Proveedores",

        description:
            "Gestiona los proveedores de tu restaurante.",

        searchPlaceholder:
            "Buscar por nombre, RNC, teléfono o email...",

        loading:
            "Cargando proveedores...",

        loadError:
            "Error al cargar proveedores.",

        empty:
            "No hay proveedores disponibles.",

        contact:
            "Contacto: {{name}}",

        confirmDelete:
            '¿Estás seguro de eliminar "{{name}}"?',

        summary: {
            total:
                "Total Proveedores",

            active:
                "Proveedores Activos",

            inactive:
                "Proveedores Inactivos",
        },

        status: {
            active:
                "Activo",

            inactive:
                "Inactivo",
        },

        actions: {
            addSupplier:
                "Agregar Proveedor",

            edit:
                "Editar",

            delete:
                "Eliminar",

            saving:
                "Guardando...",

            update:
                "Actualizar",

            add:
                "Agregar",
        },

        modal: {
            editTitle:
                "Editar Proveedor",

            addTitle:
                "Agregar Nuevo Proveedor",
        },

        fields: {
            name:
                "Nombre del Proveedor",

            phone:
                "Teléfono",

            email:
                "Email",

            contactPerson:
                "Persona de Contacto",

            status:
                "Estado",

            address:
                "Dirección",

            notes:
                "Notas",
        },

        messages: {
            createSuccess:
                "Proveedor creado exitosamente.",

            createFailed:
                "Error al crear proveedor.",

            updateSuccess:
                "Proveedor actualizado exitosamente.",

            updateFailed:
                "Error al actualizar proveedor.",

            deleteSuccess:
                "Proveedor eliminado exitosamente.",

            deleteFailed:
                "Error al eliminar proveedor.",

            nameRequired:
                "El nombre es requerido.",
        },
    },
    tablesManagement: {
        title:
            "Gestión de Mesas",

        description:
            "Agrega, edita y gestiona las mesas del restaurante.",

        searchPlaceholder:
            "Buscar por número de mesa, estado o área...",

        loading:
            "Cargando mesas...",

        loadError:
            "Error al cargar mesas.",

        empty:
            "No hay mesas disponibles.",

        seats:
            "Asientos",

        statusLabel:
            "Estado",

        activeOrder:
            "Orden activa",

        summary: {
            total:
                "Total Mesas",

            available:
                "Mesas Disponibles",

            occupied:
                "Mesas Ocupadas",
        },

        status: {
            available:
                "Disponible",

            occupied:
                "Ocupada",

            reserved:
                "Reservada",
        },

        areas: {
            general:
                "General",

            terrace:
                "Terraza",

            vip:
                "VIP",

            bar:
                "Barra",

            diningRoom:
                "Salón",
        },

        fields: {
            tableNumber:
                "Número de Mesa",

            seats:
                "Número de Asientos",

            area:
                "Área",
        },

        modal: {
            editTitle:
                "Editar Mesa",

            addTitle:
                "Agregar Nueva Mesa",
        },

        actions: {
            addTable:
                "Agregar Mesa",

            edit:
                "Editar",

            delete:
                "Eliminar",

            saving:
                "Guardando...",

            deleting:
                "Eliminando...",

            update:
                "Actualizar",

            add:
                "Agregar",
        },

        deleteConfirm: {
            title:
                "Confirmar eliminación",

            thisTable:
                "esta mesa",

            description:
                "Vas a eliminar {{name}}. Esta acción no se puede deshacer.",
        },

        messages: {
            createSuccess:
                "Mesa agregada exitosamente.",

            createFailed:
                "Error al agregar mesa.",

            updateSuccess:
                "Mesa actualizada exitosamente.",

            updateFailed:
                "Error al actualizar mesa.",

            deleteSuccess:
                "Mesa eliminada exitosamente.",

            deleteFailed:
                "Error al eliminar mesa.",
        },
    },
    taxIdentityConfig: {
        title:
            "Identificación fiscal",

        description:
            "Configura la identidad legal y fiscal del negocio sin mezclarla con impuestos, NCF o e-CF.",

        loading:
            "Cargando identificación fiscal...",

        loadError:
            "Error cargando la identificación fiscal.",

        status: {
            active:
                "Activa",

            inactive:
                "Inactiva",
        },

        enableSection: {
            title:
                "Identidad fiscal del negocio",

            description:
                "Al activarla, estos datos podrán reutilizarse en facturas, tickets, exportaciones e integraciones fiscales posteriores.",

            toggleAria:
                "Activar o desactivar la identidad fiscal del negocio",
        },

        primarySection: {
            title:
                "Datos principales",

            description:
                "El país define el preset sugerido para la identificación principal.",
        },

        regionalCountry: {
            current:
                "País regional actual:",

            use:
                "Usar país regional",
        },

        primaryId: {
            title:
                "Identificación principal",

            countryPreset:
                "Preset del país",

            genericPreset:
                "Preset genérico",
        },

        fields: {
            primaryTaxCountry:
                "País fiscal principal",

            legalNamePlaceholder:
                "Nombre legal registrado del negocio",

            type:
                "Tipo",

            label:
                "Etiqueta",

            visibleNamePlaceholder:
                "Nombre visible",

            country:
                "País",

            numberValue:
                "Número / Valor",

            taxIdentifierPlaceholder:
                "Identificador fiscal",

            taxNumber:
                "número fiscal",
        },

        additional: {
            title:
                "Identificaciones adicionales",

            description:
                "Opcional. Útil para negocios que manejan más de un registro fiscal o registros de diferentes países.",

            add:
                "Agregar identificación",

            empty:
                "No hay identificaciones adicionales configuradas.",

            identifierNumber:
                "Identificación #{{number}}",

            removeAria:
                "Eliminar identificación {{number}}",

            useWhenApplicable:
                "Usar esta identificación cuando corresponda.",

            toggleAria:
                "Activar o desactivar identificación {{number}}",

            defaultLabel:
                "Identificación fiscal",
        },

        validation: {
            legalNameRequired:
                "Debes indicar la razón social o nombre legal del negocio.",

            typeRequired:
                "Debes indicar el tipo de identificación fiscal principal.",

            valueRequired:
                "Debes indicar el {{label}} del negocio.",
        },

        messages: {
            maxAdditional:
                "Solo puedes agregar hasta 10 identificaciones fiscales adicionales.",

            saveSuccess:
                "Identificación fiscal guardada correctamente.",
        },

        errors: {
            countryInvalid:
                "El país de la identificación fiscal no es válido.",

            legalNameRequired:
                "Debes indicar la razón social o nombre legal del negocio.",

            typeRequired:
                "Debes indicar el tipo de identificación fiscal principal.",

            valueRequired:
                "Debes indicar el número de identificación fiscal principal.",

            tooManyIdentifiers:
                "Solo se permiten hasta 10 identificaciones fiscales adicionales.",

            saveFailed:
                "No se pudo guardar la identificación fiscal.",
        },

        info:
            "Esta configuración solo guarda la identidad fiscal del negocio. No activa impuestos, NCF ni facturación electrónica. Para República Dominicana, el RNC legado que ya existe en el negocio se muestra automáticamente aquí hasta que guardes esta pantalla.",

        actions: {
            saving:
                "Guardando...",

            saveChanges:
                "Guardar Cambios",
        },
    },
    serviceChargeConfig: {
        title:
            "Cargos y servicios",

        description:
            "Configura cargos porcentuales automáticos separados de los impuestos y de la propina manual.",

        enable: {
            title:
                "Habilitar cargos automáticos",

            description:
                "Permite aplicar propina legal, service charge u otros cargos a la venta.",
        },

        actions: {
            legalTipAdded:
                "Propina legal agregada",

            addLegalTip:
                "Agregar Propina legal 10%",

            addCharge:
                "Agregar cargo",

            deleteCharge:
                "Eliminar cargo",
        },

        empty:
            "No hay cargos automáticos configurados.",

        noCode:
            "SIN CÓDIGO",

        chargeFallback:
            "Cargo {{number}}",

        defaults: {
            newChargeName:
                "Nuevo cargo",

            legalTipName:
                "Propina legal",
        },

        fields: {
            name:
                "Nombre",

            code:
                "Código",

            percentage:
                "Porcentaje (%)",

            calculationBase:
                "Base de cálculo",
        },

        calculationBase: {
            net:
                "Subtotal después de descuento",

            afterTax:
                "Después de impuestos",
        },

        options: {
            active: {
                title:
                    "Activo",

                description:
                    "Habilita o deshabilita este cargo.",
            },

            deliveryOrders: {
                title:
                    "Aplicar a órdenes Delivery",

                description:
                    "Si está desactivado, este cargo no se aplicará a ventas del canal Delivery.",
            },

            deliveryFee: {
                title:
                    "Incluir costo de envío en la base",

                description:
                    "El monto del delivery también formará parte de la base usada para calcular el porcentaje.",
            },

            addToTotal: {
                title:
                    "Sumar al total",

                description:
                    "Agrega el importe calculado al total que paga el cliente.",
            },
        },

        info:
            "Estos cargos son independientes de los impuestos. Por ejemplo, puedes tener ITBIS 18%, Propina legal 10% y además una propina manual ingresada por el cajero.",
    },
    reportsPage: {
        title:
            "Reportes",

        loading:
            "Cargando...",

        loadError:
            "Error al cargar reportes",

        empty:
            "No hay resultados",

        notAvailable:
            "No disponible",

        finalConsumer:
            "Consumidor Final",

        taxFallback:
            "Impuesto",

        orderCount_one:
            "{{count}} orden",

        orderCount_other:
            "{{count}} órdenes",

        filters: {
            allMethods:
                "Todos los métodos",

            userPlaceholder:
                "Usuario (empleado)",

            customerPlaceholder:
                "Cliente",
        },

        paymentMethods: {
            cash:
                "Efectivo",

            card:
                "Tarjeta",

            transfer:
                "Transferencia",

            pedidosYa:
                "PedidosYa",

            uberEats:
                "Uber Eats",

            delivery:
                "Delivery",

            other:
                "Otros",
        },

        cashClosure: {
            title:
                "Cierre de caja",

            total:
                "Total",
        },

        table: {
            date:
                "Fecha",

            user:
                "Usuario",

            customer:
                "Cliente",

            method:
                "Método",

            total:
                "Total",

            invoice:
                "Factura",
        },

        actions: {
            exportExcel:
                "Exportar a Excel",

            viewInvoice:
                "Ver factura",

            download:
                "Descargar",
        },

        messages: {
            invoiceUrlMissing:
                "No se pudo obtener la factura porque no se recibió una URL.",

            invoiceLoadFailed:
                "Error al cargar la factura.",

            exportFailed:
                "Error al exportar el archivo.",
        },

        export: {
            sheetName:
                "Reportes",

            fileName:
                "reporte_ordenes.xlsx",

            columns: {
                date:
                    "Fecha",

                user:
                    "Usuario",

                customer:
                    "Cliente",

                customerTaxCountry:
                    "País fiscal cliente",

                taxIdType:
                    "Tipo identificación fiscal",

                taxIdLabel:
                    "Etiqueta identificación fiscal",

                taxIdNumber:
                    "Número identificación fiscal",

                method:
                    "Método",

                channel:
                    "Canal",

                subtotal:
                    "Subtotal",

                discount:
                    "Descuento",

                taxTotal:
                    "Total impuestos",

                taxBreakdown:
                    "Detalle impuestos",

                tip:
                    "Propina",

                serviceCharge:
                    "Cargo por servicio",

                shipping:
                    "Envío",

                total:
                    "Total",

                currency:
                    "Moneda",
            },
        },
    },
    regionalTaxConfig: {
        regional: {
            title:
                "Configuración regional",

            description:
                "Define país, moneda, idioma, zona horaria y formatos generales del negocio.",

            countryHelp:
                "Seleccionar un país aplica valores regionales recomendados. Puedes modificarlos manualmente antes de guardar.",

            fields: {
                country:
                    "País",

                language:
                    "Idioma",

                currency:
                    "Moneda",

                locale:
                    "Locale",

                timezone:
                    "Zona horaria",

                dateFormat:
                    "Formato de fecha",

                timeFormat:
                    "Formato de hora",

                measurementSystem:
                    "Sistema de medidas",

                weightUnit:
                    "Unidad de peso",
            },

            timeFormats: {
                hour12:
                    "12 horas",

                hour24:
                    "24 horas",
            },

            measurementSystems: {
                imperial:
                    "Imperial",

                metric:
                    "Métrico",
            },

            weightUnits: {
                lb:
                    "Libras (lb)",

                kg:
                    "Kilogramos (kg)",
            },

            info:
                "El país solo establece valores regionales recomendados. Los impuestos son independientes y puedes configurarlos según las necesidades fiscales del negocio.",
        },

        taxes: {
            title:
                "Impuestos",

            description:
                "Crea los impuestos que utilice este negocio. No están ligados obligatoriamente al país.",

            enable: {
                title:
                    "Habilitar impuestos",

                description:
                    "Si está desactivado, el POS no aplicará impuestos.",
            },

            configuredTitle:
                "Impuestos configurados",

            configuredDescription:
                "Puedes tener diferentes tasas para diferentes productos.",

            empty:
                "No hay impuestos configurados.",

            taxFallback:
                "Impuesto {{number}}",

            defaults: {
                newTax:
                    "Nuevo impuesto",
            },

            status: {
                default:
                    "Predeterminado",

                inactive:
                    "Inactivo",
            },

            actions: {
                addTax:
                    "Agregar impuesto",

                useDefault:
                    "Usar por defecto",
            },

            fields: {
                name:
                    "Nombre",

                code:
                    "Código",

                percentage:
                    "Porcentaje (%)",
            },

            options: {
                active:
                    "Activo",

                includedInPrice:
                    "Incluido en precio",

                deliveryFee:
                    "Aplicar al delivery",
            },

            info:
                "Desactivar un impuesto es preferible a eliminarlo. Las ventas guardan una copia del impuesto aplicado para que las facturas históricas nunca cambien.",
        },
    },
    productReports: {
        title:
            "Reportes de Productos",

        description:
            "Análisis de productos más vendidos y categorías.",

        loading:
            "Cargando reportes...",

        loadError:
            "Error al cargar reportes",

        units:
            "unidades",

        topByQuantity:
            "Top 10 Productos Más Vendidos (por Cantidad)",

        topByRevenue:
            "Top 10 Productos por Ingresos",

        fallbacks: {
            unknownProduct:
                "Producto Desconocido",

            uncategorized:
                "Sin Categoría",
        },

        actions: {
            exportExcel:
                "Exportar a Excel",
        },

        filters: {
            from:
                "Fecha desde",

            to:
                "Fecha hasta",
        },

        summary: {
            totalProducts:
                "Total Productos",

            uniqueProductsSold:
                "Productos únicos vendidos",

            totalCategories:
                "Total Categorías",

            activeCategories:
                "Categorías activas",

            totalRevenue:
                "Ingresos Totales",

            fromProducts:
                "De productos",
        },

        allProducts: {
            title:
                "Todos los productos",

            searchPlaceholder:
                "Buscar por nombre...",

            empty:
                "No se encontraron productos.",
        },

        table: {
            product:
                "Producto",

            category:
                "Categoría",

            totalQuantity:
                "Cantidad total",

            totalRevenue:
                "Total de ingresos",

            averagePrice:
                "Precio promedio",

            orders:
                "Órdenes",
        },

        categories: {
            title:
                "Ventas por Categoría",

            quantitySold:
                "Cantidad vendida",

            orders:
                "Órdenes",
        },

        messages: {
            exportFailed:
                "Error al exportar el archivo.",
        },

        export: {
            sheetName:
                "Reportes de Productos",

            filePrefix:
                "reportes_productos",

            columns: {
                product:
                    "Producto",

                category:
                    "Categoría",

                quantitySold:
                    "Cantidad Vendida",

                totalRevenue:
                    "Ingresos Totales",

                orders:
                    "Órdenes",

                averagePrice:
                    "Precio Promedio",
            },
        },
    },
    printersConfig: {
        title:
            "Administración de Impresoras",

        description:
            "Crea y gestiona múltiples impresoras para este negocio.",

        loading:
            "Cargando impresoras...",

        empty:
            "No hay impresoras registradas.",

        noName:
            "Sin nombre",

        fields: {
            alias:
                "Alias",

            name:
                "Nombre",

            category:
                "Categoría",

            mode:
                "Modo",

            type:
                "Tipo",

            paperSize:
                "Tamaño de papel",

            port:
                "Puerto",

            notes:
                "Notas",
        },

        categories: {
            ticket:
                "Ticket general",

            invoice:
                "Factura",

            kitchen:
                "Cocina",

            bar:
                "Bar",

            delivery:
                "Delivery",

            other:
                "Otra",
        },

        modes: {
            browser:
                "Navegador",

            qz:
                "QZ Tray",

            network:
                "Red",
        },

        types: {
            thermal:
                "Térmica",

            laser:
                "Láser",

            inkjet:
                "Inyección de tinta",

            escpos:
                "ESC/POS",

            other:
                "Otra",
        },

        filters: {
            all:
                "Todas",
        },

        registered: {
            title:
                "Impresoras registradas",
        },

        status: {
            default:
                "Predeterminada",
        },

        actions: {
            saveChanges:
                "Guardar cambios",

            addPrinter:
                "Agregar impresora",

            cancelEdit:
                "Cancelar edición",

            setDefault:
                "Por defecto",

            edit:
                "Editar",

            delete:
                "Eliminar",
        },
    },
    planUsageWidget: {
        loading:
            "Cargando uso del plan...",

        loadError:
            "Error al cargar el uso del plan. Por favor, inténtalo más tarde.",

        subscription:
            "Suscripción",

        currentPlan:
            "Plan Actual",

        usageDescription:
            "Uso basado en los recursos de tu negocio.",

        limitHint:
            "¿Has llegado al límite? Mejora tu plan para obtener más usuarios, mesas y platos.",

        remaining_one:
            "{{count}} restante",

        remaining_other:
            "{{count}} restantes",

        resources: {
            totalUsers:
                "Usuarios totales",

            admins:
                "Admins",

            cashiers:
                "Cajeras",

            waiters:
                "Camareros",

            dishes:
                "Platos",

            tables:
                "Mesas",
        },

        actions: {
            upgradePlan:
                "Mejorar plan",
        },

        modal: {
            title:
                "Mejora tu plan",

            currentPlanPrefix:
                "Tu plan actual es",

            description:
                "Para desbloquear límites más altos de usuarios, platos y mesas, contacta con el equipo de soporte o con tu gestor de cuenta.",

            benefits: {
                employees:
                    "Más empleados, incluyendo administradores, cajeras y camareros.",

                tablesAndDishes:
                    "Más mesas y platos para tu restaurante.",

                multiBranch:
                    "Soporte multisucursal en planes superiores.",
            },
        },
    },
    payrollRuns: {
        title:
            "Nómina",

        confirmPost:
            "¿Postear esta nómina? Esto creará automáticamente el gasto correspondiente en Gastos.",

        fields: {
            from:
                "Desde",

            to:
                "Hasta",

            payDate:
                "Fecha de pago",
        },

        summary: {
            net:
                "Neto",
        },

        table: {
            employee:
                "Empleado",

            role:
                "Cargo",

            gross:
                "Bruto",

            deductions:
                "Deducciones",

            note:
                "Nota",

            action:
                "Acción",
        },

        placeholders: {
            employeeName:
                "Nombre",

            role:
                "Cargo",

            optional:
                "Opcional",
        },

        status: {
            posted:
                "Posteada",

            draft:
                "Borrador",
        },

        actions: {
            addEmployee:
                "Agregar empleado",

            removeEmployee:
                "Eliminar empleado",

            createRun:
                "Crear corrida",

            saving:
                "Guardando...",

            post:
                "Postear",
        },

        runs: {
            title:
                "Corridas",

            payDate:
                "Fecha de pago",

            period:
                "Período",

            employees:
                "Empleados",

            net:
                "Neto",

            status:
                "Estado",

            action:
                "Acción",

            periodSeparator:
                "a",

            empty:
                "No hay corridas aún.",
        },

        messages: {
            employeeRequired:
                "Debes agregar al menos un empleado.",
        },
    },
    notificationsPage: {
        title:
            "Notificaciones",

        description:
            "Configura cómo y cuándo recibir notificaciones.",

        channels: {
            title:
                "Canales de Notificación",

            email: {
                title:
                    "Notificaciones por Email",

                description:
                    "Recibe notificaciones en tu correo electrónico.",

                address:
                    "Dirección de Email",

                placeholder:
                    "ejemplo@restaurante.com",

                toggleAria:
                    "Activar o desactivar notificaciones por email",
            },

            sms: {
                title:
                    "Notificaciones por SMS",

                description:
                    "Recibe notificaciones por mensaje de texto.",

                phoneNumber:
                    "Número de Teléfono",

                placeholder:
                    "+1 809 555 1234",

                toggleAria:
                    "Activar o desactivar notificaciones por SMS",
            },
        },

        types: {
            title:
                "Tipos de Notificaciones",

            orders: {
                label:
                    "Notificaciones de Órdenes",

                description:
                    "Recibe notificaciones cuando se crean o completan órdenes.",
            },

            lowStock: {
                label:
                    "Alertas de Stock Bajo",

                description:
                    "Recibe notificaciones cuando un producto está por agotarse.",
            },

            payments: {
                label:
                    "Notificaciones de Pagos",

                description:
                    "Recibe alertas cuando se procesan pagos importantes.",
            },

            reports: {
                label:
                    "Notificaciones de Reportes",

                description:
                    "Recibe actualizaciones sobre reportes y análisis.",
            },
        },

        scheduledReports: {
            title:
                "Reportes Programados",

            weekly: {
                label:
                    "Reporte Semanal",

                description:
                    "Recibe un resumen semanal de ventas y operaciones.",
            },

            monthly: {
                label:
                    "Reporte Mensual",

                description:
                    "Recibe un resumen mensual completo de tu negocio.",
            },
        },

        status: {
            active:
                "Activo",

            inactive:
                "Inactivo",
        },

        actions: {
            save:
                "Guardar Configuración",
        },

        messages: {
            saveSuccess:
                "Configuración de notificaciones guardada exitosamente.",
        },
    },
    menuManagement: {
        title:
            "Gestión de Menú",

        description:
            "Crea, edita y gestiona los platos del menú.",

        loading:
            "Cargando platos...",

        loadError:
            "Error al cargar platos.",

        empty:
            "No hay platos disponibles.",

        customizable:
            "Personalizable",

        fallbacks: {
            uncategorized:
                "Sin categoría",
        },

        filters: {
            searchPlaceholder:
                "Buscar por nombre o categoría...",

            allCategories:
                "Todas las categorías",

            searching:
                "Buscando productos...",
        },

        actions: {
            addDish:
                "Agregar Plato",

            edit:
                "Editar",

            delete:
                "Eliminar",

            create:
                "Crear",

            add:
                "Agregar",

            saving:
                "Guardando...",

            creating:
                "Creando...",

            update:
                "Actualizar",
        },

        modal: {
            editTitle:
                "Editar Plato",

            addTitle:
                "Agregar Nuevo Plato",
        },

        fields: {
            dishName:
                "Nombre del Plato",

            productionArea:
                "Área de Producción",

            weightUnit:
                "Unidad de Peso",

            image:
                "Imagen",
        },

        productionAreas: {
            kitchen:
                "Cocina",

            bar:
                "Bar",

            other:
                "Otra",
        },

        productionAreaHelp:
            "Esto define a qué impresora de producción se enviará el ticket.",

        category: {
            title:
                "Categoría",

            description:
                "Selecciona una categoría existente o crea una nueva.",

            select:
                "Selecciona categoría",

            help:
                "Esta categoría se usará para organizar el menú y clasificar el producto dentro del inventario.",
        },

        productType: {
            title:
                "Tipo de producto",

            description:
                "Define cómo este producto se comporta frente al inventario.",
        },

        productTypes: {
            none: {
                title:
                    "Plato normal",

                description:
                    "Se vende en el menú, pero no descuenta inventario.",
            },

            direct: {
                title:
                    "Producto con inventario",

                description:
                    "Se vende y descuenta su propio inventario. Puede quedar negativo.",
            },

            recipe: {
                title:
                    "Plato con receta",

                description:
                    "Se vende en el menú y descuenta ingredientes configurados.",
            },
        },

        directStock: {
            title:
                "Producto con stock directo",

            descriptionPrefix:
                "Este producto aparecerá en Control de Stock usando la misma categoría del menú:",

            descriptionSuffix:
                ". Podrá recibir entradas, salidas y quedar en negativo si se vende sin existencia.",
        },

        recipe: {
            title:
                "Plato con receta",

            description:
                "Este plato no manejará stock directo. Al venderlo, el sistema descontará los ingredientes configurados en su receta.",
        },

        pricing: {
            type:
                "Tipo de Precio",

            fixed:
                "Precio fijo",

            manual:
                "Precio manual",

            manualHelp:
                "El precio se definirá al momento de facturar.",

            unitPrice:
                "Precio (por unidad)",

            pricePerUnit:
                "Precio por {{unit}}",
        },

        sellMode: {
            title:
                "Modo de Venta",

            unit:
                "Por Unidad",

            weight:
                "Por Peso",
        },

        tax: {
            title:
                "Impuesto del producto",

            description:
                "Define qué impuesto utiliza este producto y si está incluido en el precio mostrado.",

            taxLabel:
                "Impuesto",

            businessDefault:
                "Predeterminado del negocio",

            priceTaxLabel:
                "Impuesto en el precio",

            useTaxSetting:
                "Usar configuración del impuesto",

            included:
                "Impuesto incluido en el precio",

            excluded:
                "Impuesto se agrega al precio",

            includedBadge:
                "Incluido en el precio",

            excludedBadge:
                "Se agrega al precio",

            includedHelp:
                "El precio que escribas ya contiene {{taxName}}.",

            excludedHelp:
                "{{taxName}} se sumará al precio al calcular la venta.",
        },

        weightUnits: {
            lb:
                "Libra (lb)",

            kg:
                "Kilogramo (kg)",
        },

        costs: {
            average:
                "Costo promedio (opcional)",

            last:
                "Último costo (opcional)",
        },

        customization: {
            title:
                "Personalización del producto",

            description:
                "Permite seleccionar extras y marcar ingredientes que deben retirarse. Todo aparecerá debajo del producto en el carrito, cocina y ticket.",

            unitOnly:
                "La personalización estará disponible inicialmente solo para productos por unidad.",

            removableIngredients: {
                title:
                    "Ingredientes que se pueden retirar",

                description:
                    "Ejemplos: tomate, cebolla, salsa o lechuga.",

                empty:
                    "Todavía no hay ingredientes removibles.",

                deleteTitle:
                    "Eliminar ingrediente",
            },

            extras: {
                title:
                    "Extras disponibles",

                description:
                    "El precio del extra se suma al precio unitario del producto.",

                empty:
                    "Todavía no hay extras configurados.",

                configurationTitle:
                    "Configuración del extra",

                configurationDescription:
                    "Puedes escribirlo manualmente o vincular un producto existente.",

                deleteTitle:
                    "Eliminar extra",

                linkExisting:
                    "Vincular producto existente (opcional)",

                manualExtra:
                    "Extra manual",

                name:
                    "Nombre del extra",

                additionalPrice:
                    "Precio adicional ({{currency}})",

                maxQuantity:
                    "Cantidad máxima",

                active:
                    "Extra activo",
            },
        },

        status: {
            active:
                "Activo",
        },

        placeholders: {
            averageCost:
                "Ej: 150",

            lastCost:
                "Ej: 160",

            ingredient:
                "Ej: Tomate",

            extraName:
                "Ej: Queso extra",

            extraPrice:
                "Ej: 50",
        },

        image: {
            currentKept:
                "La imagen actual se mantendrá.",
        },

        deleteConfirm: {
            title:
                "Confirmar eliminación",

            descriptionPrefix:
                "Vas a eliminar el plato",

            descriptionSuffix:
                ". Esta acción no se puede deshacer.",
        },

        inventoryCategoryModal: {
            title:
                "Crear categoría de inventario",

            name:
                "Nombre",

            description:
                "Descripción (opcional)",
        },

        pagination: {
            summary_one:
                "Página {{page}} de {{totalPages}} · {{count}} plato",

            summary_other:
                "Página {{page}} de {{totalPages}} · {{count}} platos",

            previous:
                "Anterior",

            next:
                "Siguiente",
        },

        messages: {
            noCreatePermission:
                "No tienes permiso para crear productos.",

            noEditPermission:
                "No tienes permiso para editar productos.",

            noDeletePermission:
                "No tienes permiso para eliminar productos.",

            categoryCreated:
                "Categoría creada exitosamente.",

            categoryCreateFailed:
                "Error al crear categoría.",

            dishCreated:
                "Plato agregado exitosamente.",

            dishCreateFailed:
                "Error al agregar plato.",

            dishUpdated:
                "Plato actualizado exitosamente.",

            dishUpdateFailed:
                "Error al actualizar plato.",

            dishDeleted:
                "Plato eliminado exitosamente.",

            dishDeleteFailed:
                "Error al eliminar plato.",

            tenantMissing:
                "TenantId no encontrado.",

            categoryRequired:
                "La categoría es requerida para todos los productos.",

            selectCategory:
                "Debes seleccionar una categoría.",

            customizationRequired:
                "Agrega al menos un ingrediente removible o un extra.",

            duplicateCustomizationNames:
                "No puedes repetir el mismo nombre dentro de ingredientes o extras.",

            invalidExtra:
                "Revisa el precio y la cantidad máxima de los extras.",

            categoryNameRequired:
                "El nombre es requerido.",
        },
    },
    inventoryCategories: {
        title:
            "Categorías de inventario",

        description:
            "Organiza tus productos de inventario por categorías.",

        loading:
            "Cargando categorías...",

        loadError:
            "Error al cargar categorías.",

        empty:
            "No hay categorías disponibles.",

        searchPlaceholder:
            "Buscar categorías...",

        summary: {
            total:
                "Total Categorías",
        },

        fields: {
            name:
                "Nombre de la Categoría",

            description:
                "Descripción",

            color:
                "Color",

            icon:
                "Icono",
        },

        modal: {
            editTitle:
                "Editar Categoría",

            addTitle:
                "Agregar Nueva Categoría",
        },

        actions: {
            addCategory:
                "Agregar Categoría",

            edit:
                "Editar",

            delete:
                "Eliminar",

            saving:
                "Guardando...",

            update:
                "Actualizar",

            add:
                "Agregar",
        },

        deleteConfirm: {
            title:
                "Confirmar eliminación",

            description:
                "Vas a eliminar la categoría \"{{name}}\". Esta acción no se puede deshacer.",
        },

        colorAria:
            "Seleccionar color {{color}}",

        icons: {
            package:
                "Paquete",

            box:
                "Caja",

            shoppingBag:
                "Bolsa de compra",

            tag:
                "Etiqueta",

            archive:
                "Archivo",

            layers:
                "Capas",

            grid:
                "Cuadrícula",

            folder:
                "Carpeta",

            briefcase:
                "Maletín",

            cube:
                "Cubo",

            droplet:
                "Gota",

            flame:
                "Llama",

            leaf:
                "Hoja",

            apple:
                "Manzana",

            chefHat:
                "Gorro de chef",
        },

        messages: {
            createSuccess:
                "Categoría creada exitosamente.",

            createFailed:
                "Error al crear categoría.",

            updateSuccess:
                "Categoría actualizada exitosamente.",

            updateFailed:
                "Error al actualizar categoría.",

            deleteSuccess:
                "Categoría eliminada exitosamente.",

            deleteFailed:
                "Error al eliminar categoría.",

            nameRequired:
                "El nombre de la categoría es requerido.",
        },
    },
    helpAndSupport: {
        title:
            "Ayuda y Soporte",

        description:
            "Documentación, guías y asistencia para tu restaurante.",

        resourceCount_one:
            "{{count}} recurso disponible",

        resourceCount_other:
            "{{count}} recursos disponibles",

        quickLinks: {
            title:
                "Accesos Rápidos",

            createOrder:
                "Crear Orden",

            viewReports:
                "Ver Reportes",

            manageMenu:
                "Gestionar Menú",

            settings:
                "Configuración",
        },

        categories: {
            gettingStarted: {
                title:
                    "Primeros Pasos",

                items: {
                    quickStart: {
                        title:
                            "Guía de Inicio Rápido",

                        description:
                            "Aprende a configurar tu restaurante en minutos.",
                    },

                    videoTutorial: {
                        title:
                            "Video Tutorial Completo",

                        description:
                            "Guía paso a paso en video.",
                    },

                    faq: {
                        title:
                            "Preguntas Frecuentes (FAQ)",

                        description:
                            "Respuestas a las preguntas más comunes.",
                    },
                },
            },

            features: {
                title:
                    "Funcionalidades",

                items: {
                    orders: {
                        title:
                            "Gestión de Órdenes",

                        description:
                            "Cómo crear y gestionar órdenes eficientemente.",
                    },

                    fiscal: {
                        title:
                            "Configuración Fiscal",

                        description:
                            "Guía completa de configuración NCF.",
                    },

                    inventory: {
                        title:
                            "Gestión de Inventario",

                        description:
                            "Control de stock y productos.",
                    },

                    reports: {
                        title:
                            "Reportes y Análisis",

                        description:
                            "Cómo usar los reportes de ventas y productos.",
                    },
                },
            },

            support: {
                title:
                    "Soporte",

                items: {
                    contact: {
                        title:
                            "Contactar Soporte",

                        description:
                            "Envía un mensaje al equipo de soporte.",
                    },

                    whatsapp: {
                        title:
                            "Soporte por WhatsApp",

                        description:
                            "Chatea con nosotros por WhatsApp.",
                    },

                    email: {
                        title:
                            "Email de Soporte",

                        description:
                            "Envíanos un correo electrónico.",
                    },
                },
            },

            resources: {
                title:
                    "Recursos",

                items: {
                    documentation: {
                        title:
                            "Documentación Completa",

                        description:
                            "Accede a toda la documentación del sistema.",
                    },

                    helpCenter: {
                        title:
                            "Centro de Ayuda",

                        description:
                            "Busca artículos y tutoriales.",
                    },

                    community: {
                        title:
                            "Comunidad de Usuarios",

                        description:
                            "Únete a nuestra comunidad.",
                    },
                },
            },
        },

        actions: {
            backToCategories:
                "Volver a categorías",

            openWhatsApp:
                "Abrir WhatsApp",

            sendEmail:
                "Enviar Email",

            contact:
                "Contactar",
        },

        supportEmail: {
            subject:
                "Solicitud de Soporte",

            body:
                "Hola, necesito ayuda con...",
        },

        contactInfo: {
            title:
                "Información de Contacto",

            email:
                "Email",

            chatWithUs:
                "Chatear con nosotros",

            hours:
                "Horario",

            schedule:
                "Lun - Vie: 9AM - 6PM",
        },
    },
    fiscalConfig: {
        loading:
            "Cargando configuración...",

        loadError:
            "Error cargando la configuración.",

        views: {
            regional: {
                title:
                    "Configuración regional",

                description:
                    "País, moneda, idioma, zona horaria y formatos del negocio.",
            },

            taxes: {
                title:
                    "Impuestos",

                description:
                    "Configura impuestos y tasas aplicables a productos y servicios.",
            },

            serviceCharges: {
                title:
                    "Cargos y propinas",

                description:
                    "Configura propinas, cargos por servicio y cargos automáticos.",
            },

            billing: {
                title:
                    "Facturación general",

                description:
                    "Configura descuentos, prefactura, logo y comportamiento de facturación.",
            },

            delivery: {
                title:
                    "Delivery y canales",

                description:
                    "Configura delivery interno y plataformas externas.",
            },

            ncf: {
                title:
                    "NCF / Comprobantes RD",

                description:
                    "Configura los comprobantes fiscales dominicanos B01 y B02.",
            },

            ecf: {
                title:
                    "Facturación electrónica e-CF",

                description:
                    "Configura e-CF, certificado digital y conexión fiscal DGII.",
            },
        },

        status: {
            active:
                "Activo",

            inactive:
                "Inactivo",
        },

        logo: {
            selectFirst:
                "Selecciona un logo primero.",

            uploadFailed:
                "No se pudo subir el logo.",

            uploadSuccess:
                "Logo actualizado correctamente.",

            uploadError:
                "Error subiendo logo.",

            deleteFailed:
                "No se pudo eliminar el logo.",

            deleteSuccess:
                "Logo eliminado correctamente.",

            deleteError:
                "Error eliminando logo.",
        },

        messages: {
            saveFailed:
                "No se pudo guardar la configuración.",

            ecfSaveFailed:
                "No se pudo guardar la configuración e-CF.",

            saveSuccess:
                "Configuración guardada correctamente.",

            saveSuccessSnackbar:
                "Configuración guardada exitosamente.",

            saveError:
                "Error guardando la configuración.",
        },

        actions: {
            saving:
                "Guardando...",

            saveChanges:
                "Guardar Cambios",
        },
    },

    financeSummary: {
        header: {
            eyebrow:
                "Dashboard financiero",

            title:
                "Resumen financiero",

            description:
                "Vista ejecutiva del rendimiento financiero y el control de caja para el rango seleccionado.",
        },

        filters: {
            from:
                "Desde",

            to:
                "Hasta",
        },

        actions: {
            loading:
                "Consultando...",

            run:
                "Consultar",
        },

        empty: {
            prefix:
                "Selecciona un rango y presiona",

            suffix:
                ".",
        },

        executive: {
            title:
                "Resumen ejecutivo",

            subtitle:
                "Los dos indicadores más importantes del periodo.",

            range:
                "Rango",

            status:
                "Estado",

            updated:
                "Actualizado",
        },

        featured: {
            netResult: {
                title:
                    "Resultado neto",

                description:
                    "Margen bruto - gastos - nómina.",
            },

            openingFloat: {
                title:
                    "Fondo inicial",

                description:
                    "Menudo con el que inició la caja en la fecha inicial del rango.",
            },
        },

        performance: {
            title:
                "Rendimiento financiero",

            subtitle:
                "Indicadores reales del negocio para el periodo seleccionado.",
        },

        cards: {
            sales: {
                title:
                    "Ventas",

                description:
                    "Ingresos generados en el periodo.",
            },

            cogs: {
                title:
                    "COGS (Costo de ventas)",

                description:
                    "Costo real aplicado al completar órdenes.",
            },

            grossProfit: {
                title:
                    "Margen bruto",

                description:
                    "Ventas - COGS.",
            },

            expenses: {
                title:
                    "Gastos",

                description:
                    "Gastos operativos registrados.",
            },

            payroll: {
                title:
                    "Nómina",

                description:
                    "Total de nómina dentro del rango.",
            },

            purchases: {
                title:
                    "Compras",

                description:
                    "Incluye compras por merma (entrada usable).",
            },

            waste: {
                title:
                    "Merma",

                description:
                    "Costo original del desperdicio.",
            },
        },

        messages: {
            loadFailed:
                "No se pudo cargar el resumen financiero.",
        },
    },
    expensesPage: {
        title:
            "Gastos",

        filters: {
            from:
                "Desde",

            to:
                "Hasta",

            type:
                "Tipo",
        },

        sourceTypes: {
            all:
                "Todos",

            manual:
                "Manual",

            manualPlural:
                "Manuales",

            payroll:
                "Nómina",
        },

        paymentMethods: {
            cash:
                "Efectivo",

            transfer:
                "Transferencia",

            card:
                "Tarjeta",

            other:
                "Otro",
        },

        summary: {
            rangeTotal:
                "Total rango",

            totalExpenses:
                "Total egresos",

            manualExpenses:
                "Gastos manuales",

            payroll:
                "Nómina",

            records:
                "Registros",
        },

        fields: {
            date:
                "Fecha",

            amount:
                "Monto",

            category:
                "Categoría",

            method:
                "Método",

            reference:
                "Referencia",

            note:
                "Nota",
        },

        placeholders: {
            reference:
                "Ej: Recibo 00231",

            note:
                "Ej: Pago de luz",
        },

        actions: {
            filter:
                "Filtrar",

            save:
                "Guardar",

            saving:
                "Guardando...",

            void:
                "Anular",

            voiding:
                "Anulando...",

            confirmVoid:
                "Sí, anular",
        },

        table: {
            date:
                "Fecha",

            type:
                "Tipo",

            category:
                "Categoría",

            note:
                "Nota",

            reference:
                "Referencia",

            method:
                "Método",

            amount:
                "Monto",

            action:
                "Acción",

            fromPayroll:
                "Desde nómina",
        },

        empty:
            "No hay gastos en este rango.",

        voidModal: {
            title:
                "Anular gasto",

            description:
                "Esta acción marcará el registro como anulado.",

            warning:
                "Confirma si deseas anular este registro. Esta acción no se puede deshacer fácilmente.",
        },

        messages: {
            loadFailed:
                "No se pudieron cargar los gastos.",

            createFailed:
                "No se pudo crear el gasto.",

            voidFailed:
                "No se pudo anular el gasto.",
        },
    },
    expenseCategoriesPage: {
        title:
            "Categorías de gastos",

        placeholders: {
            name:
                "Nombre (Ej: Luz, Gas, Transporte)",

            description:
                "Descripción (opcional)",
        },

        fields: {
            name:
                "Nombre",

            description:
                "Descripción",
        },

        table: {
            name:
                "Nombre",

            description:
                "Descripción",

            actions:
                "Acciones",
        },

        actions: {
            create:
                "Crear",

            creating:
                "Creando...",

            edit:
                "Editar",

            delete:
                "Eliminar",

            saving:
                "Guardando...",

            saveChanges:
                "Guardar cambios",

            deleting:
                "Eliminando...",

            confirmDelete:
                "Sí, eliminar",
        },

        empty:
            "No hay categorías aún.",

        editModal: {
            title:
                "Editar categoría",

            description:
                "Actualiza el nombre y la descripción.",
        },

        deleteModal: {
            title:
                "Eliminar categoría",

            description:
                "Esta acción solo funciona si la categoría no está en uso.",

            confirmPrefix:
                "Vas a eliminar la categoría",

            confirmSuffix:
                ".",
        },

        messages: {
            loadFailed:
                "No se pudieron cargar las categorías de gastos.",

            createFailed:
                "No se pudo crear la categoría de gastos.",

            updateFailed:
                "No se pudo actualizar la categoría de gastos.",

            deleteFailed:
                "No se pudo eliminar la categoría de gastos.",

            nameRequired:
                "El nombre de la categoría es requerido.",
        },
    },
        employeesPage: {
            title: "Empleados",
            loading: "Cargando empleados...",
            loadError: "Error al cargar los empleados",
            empty: "No hay empleados registrados.",

            table: {
                name: "Nombre",
                email: "Email",
                phone: "Teléfono",
                role: "Rol",
                permissions: "Permisos",
                actions: "Acciones",
            },

            actions: {
                edit: "Editar",
                clear: "Limpiar",
                save: "Guardar",
                saving: "Guardando...",
            },

            modal: {
                title: "Editar Empleado",
                description: "Permisos y datos en tiempo real del usuario seleccionado.",
            },

            sections: {
                basicInfo: "Información básica",
                security: "Seguridad",
            },

            fields: {
                name: "Nombre",
                email: "Email",
                phone: "Teléfono",
                role: "Rol",
            },

            placeholders: {
                name: "Nombre del empleado",
                email: "email@ejemplo.com",
                password: "Dejar vacío para no cambiar",
                confirmPassword: "Confirma la nueva contraseña",
            },

            roles: {
                select: "Seleccionar rol",
                owner: "Propietario",
                waiter: "Camarero",
                cashier: "Cajera",
                kitchen: "Cocina",
                admin: "Admin",
            },

            common: {
                optional: "(opcional)",
            },

            security: {
                description: "Cambia la contraseña solo si es necesario.",
                newPassword: "Nueva Contraseña",
                minimumCharacters: "Mínimo 6 caracteres",
                confirmPassword: "Confirmar Contraseña",
                showPassword: "Mostrar contraseña",
                hidePassword: "Ocultar contraseña",
            },

            messages: {
                updateSuccess: "Empleado actualizado exitosamente.",
                updateFailed: "Error al actualizar empleado.",
                nameRequired: "El nombre es requerido.",
                emailRequired: "El email es requerido.",
                phoneInvalid: "El teléfono debe contener entre 7 y 15 dígitos.",
                roleRequired: "El rol es requerido.",
                passwordMinLength: "La contraseña debe tener al menos 6 caracteres.",
                passwordMismatch: "Las contraseñas no coinciden.",
            },

            permissions: {
                activeCount_one: "{{count}} permiso activo",
                activeCount_other: "{{count}} permisos activos",
                summaryEyebrow: "Resumen de permisos",
                summaryDescription:
                    "Los cambios se cargan desde la base de datos del empleado actual.",
                none: "Sin permisos especiales",
                specialTitle: "Permisos especiales",
                specialDescription:
                    "Estos permisos aplican solo al usuario que estás editando.",

                products: {
                    sectionTitle: "Productos",
                    sectionSubtitle: "Permisos para gestión de menú y productos.",

                    create: {
                        title: "Crear productos",
                        description:
                            "Permite crear platos o productos nuevos dentro de Gestión de Menú.",
                    },

                    update: {
                        title: "Editar productos",
                        description: "Permite modificar productos existentes.",
                    },

                    delete: {
                        title: "Eliminar productos",
                        description: "Permite eliminar productos del sistema.",
                    },
                },

                inventory: {
                    sectionTitle: "Inventario",
                    sectionSubtitle:
                        "Permisos para entradas y operaciones sobre stock.",

                    entry: {
                        title: "Dar entrada de inventario",
                        chip: "Entrada inventario",
                        description:
                            "Permite registrar entradas tipo compra o entrada manual.",
                    },

                    exit: {
                        title: "Registrar salidas",
                        chip: "Salidas",
                        description:
                            "Permite registrar salidas manuales de inventario.",
                    },

                    adjust: {
                        title: "Realizar ajustes",
                        chip: "Ajustes",
                        description:
                            "Permite hacer ajustes positivos o negativos de stock.",
                    },

                    waste: {
                        title: "Registrar merma",
                        chip: "Merma",
                        description:
                            "Permite registrar pérdida o merma de inventario.",
                    },
                },

                orders: {
                    sectionTitle: "Órdenes",
                    sectionSubtitle:
                        "Permisos para acciones críticas sobre órdenes.",

                    edit: {
                        title: "Corregir órdenes normales",
                        description: "Permite a esta cajera editar platos, cantidades, extras, precios, descuentos, impuestos, propinas y método de pago. No autoriza cambios de documentos fiscales y todos los ajustes quedan registrados.",
                    },

                    cancel: {
                        title: "Cancelar órdenes",
                        description:
                            "Permite cancelar una orden activa. Si este permiso está apagado, el usuario no podrá cancelar órdenes.",
                    },
                },

                accountsReceivable: {
                    sectionTitle: "Cuentas por cobrar",
                    sectionSubtitle:
                        "Permisos para ventas a crédito y cobros pendientes.",

                    view: {
                        title: "Ver y cobrar cuentas pendientes",
                        chip: "Cuentas por cobrar",
                        description:
                            "Permite consultar cuentas por cobrar y registrar abonos o pagos.",
                    },
                },
            },
        },
    salesReportsPage: {
        title: "Reportes de Ventas",
        subtitle: "Análisis detallado de ventas y facturación",

        loading: "Cargando reportes...",
        loadError: "Error al cargar reportes",

        actions: {
            exportExcel: "Exportar a Excel",
            closeNotification: "Cerrar notificación",
        },

        tabs: {
            category: "Por categoría",
            payment: "Por método de pago",
            product: "Detalle por producto",
        },

        filters: {
            from: "Fecha desde",
            to: "Fecha hasta",
            paymentMethod: "Método de pago",
            allMethods: "Todos los métodos",
        },

        paymentMethods: {
            cash: "Efectivo",
            card: "Tarjeta",
            transfer: "Transferencia",
            credit: "Crédito",
            other: "Otros",
        },

        common: {
            unknown: "Desconocido",
            noCategory: "Sin categoría",
            regular: "Regular",
            product: "Producto",
            notAvailable: "N/A",
            top10: "Top 10",
        },

        summary: {
            taxes: "Impuestos",
            serviceCharge: "Cargo por servicio",
            serviceCharges: "Cargos por servicio",
        },

        metrics: {
            totalSales: "Total Ventas",
            averageOrder: "Promedio por orden",
            perOrder: "Por orden",
            totalOrders: "Total Órdenes",
            processedOrders: "Órdenes procesadas",
            taxesCollected: "Impuestos recaudados",
            serviceChargesCollected: "Cargos por servicio recaudados",
        },

        orderCount_one: "{{count}} orden",
        orderCount_other: "{{count}} órdenes",

        quantityValue: "{{count}} cant.",

        pagination: {
            show: "Mostrar",
            rows: "filas",
            previous: "Anterior",
            next: "Siguiente",
            pageOf: "Página {{page}} de {{totalPages}}",
        },

        reportTitles: {
            category: "Reporte por Categoría",
            payment: "Reporte por Método de Pago",
            product: "Detalle por Producto",
        },

        report: {
            loading: "Cargando reporte...",
            loadError: "Error cargando reporte.",
            empty: "No hay datos para este rango de fechas.",
        },

        table: {
            category: "Categoría",
            method: "Método",
            presentation: "Presentación",
            product: "Producto",
            quantityShort: "Cant.",
            revenue: "Ingresos",
            cost: "Costo",
            profit: "Utilidad",
            costPercent: "Costo %",
            profitPercent: "Utilidad %",
        },

        sections: {
            salesByPaymentMethod: "Ventas por Método de Pago",
            salesByDish: "Ventas por Plato",
            loadingDishSales: "Cargando ventas por plato...",
            noDishSales:
                "No hay productos vendidos para mostrar en este rango.",
            salesByWeekday: "Ventas por Día de la Semana",
            recentSales: "Ventas Recientes",
        },

        recentTable: {
            date: "Fecha",
            customer: "Cliente",
            dishes: "Platos",
            total: "Total",
        },

        messages: {
            exportError: "Error al exportar el archivo.",
        },

        excel: {
            salesSheet: "Reportes de Ventas",
            reportSheet: "Reporte",
            salesFilePrefix: "reportes_ventas",

            fileNames: {
                category: "reporte_por_categoria",
                payment: "reporte_por_metodo_pago",
                product: "detalle_por_producto",
            },

            columns: {
                date: "Fecha",
                time: "Hora",
                orderId: "ID de orden",
                customer: "Cliente",
                method: "Método",
                paymentMethod: "Método de pago",
                source: "Origen",
                subtotal: "Subtotal",
                total: "Total",
                user: "Usuario",
                table: "Mesa",
                shipping: "Envío",

                category: "Categoría",
                presentation: "Presentación",
                product: "Producto",
                quantity: "Cantidad",
                unitPrice: "Precio Unit.",
                unitCost: "Costo Unit.",
                revenue: "Ingresos",
                cost: "Costo",
                profit: "Utilidad",
                costPercent: "Costo %",
                profitPercent: "Utilidad %",
            },
        },
    },
    financialAnalysisPage: {
        title:
            "Análisis Financiero",

        subtitle:
            "Análisis detallado de finanzas y tendencias",

        loading:
            "Cargando análisis...",

        loadError:
            "Error al cargar análisis",

        actions: {
            exportExcel:
                "Exportar a Excel",

            close:
                "Cerrar",

            closeNotification:
                "Cerrar notificación",
        },

        filters: {
            from:
                "Fecha desde",

            to:
                "Fecha hasta",

            paymentMethod:
                "Método de pago",

            allMethods:
                "Todos los métodos",

            category:
                "Categoría",

            allCategories:
                "Todas las categorías",

            appliedRange:
                "Rango aplicado: {{from}} al {{to}}",
        },

        paymentMethods: {
            cash:
                "Efectivo",

            card:
                "Tarjeta",

            transfer:
                "Transferencia",

            credit:
                "Crédito",
        },

        common: {
            product:
                "Producto",

            noCategory:
                "Sin categoría",
        },

        metrics: {
            totalRevenue:
                "Ingresos Totales",

            netRevenue:
                "Ingresos Netos",

            afterCommissions:
                "Después de comisiones",

            averageTicket:
                "Ticket Promedio",

            perOrder:
                "Por orden",

            totalOrders:
                "Total Órdenes",

            processedOrders:
                "Órdenes procesadas",
        },

        breakdown: {
            revenueTitle:
                "Desglose de Ingresos",

            subtotal:
                "Subtotal",

            taxesWithRate:
                "Impuestos ({{rate}}%)",

            tips:
                "Propinas",

            totalRevenue:
                "Total Ingresos",

            expensesTitle:
                "Desglose de Gastos",

            commissionsWithRate:
                "Comisiones ({{rate}}%)",

            averageNetPerOrder:
                "Promedio Neto por Orden",
        },

        daily: {
            title:
                "Tendencias Diarias",

            net:
                "Neto",

            taxes:
                "Impuestos",

            commissions:
                "Comisiones",
        },

        hourly: {
            title:
                "Ingresos por Hora del Día",

            selectedHour:
                "Hora seleccionada",

            totalRevenue:
                "Ingresos totales",

            orders:
                "Órdenes",

            product:
                "Producto",

            category:
                "Categoría",

            quantity:
                "Cantidad",

            revenue:
                "Ingresos",

            noSales:
                "No hay ventas registradas en esta hora.",

            openHourDetails:
                "Ver detalle de las {{hour}}",
        },

        orderCount_one:
            "{{count}} orden",

        orderCount_other:
            "{{count}} órdenes",

        messages: {
            exportError:
                "Error al exportar el archivo.",
        },

        excel: {
            sheetName:
                "Análisis Financiero",

            filePrefix:
                "analisis_financiero",

            columns: {
                metric:
                    "Métrica",

                value:
                    "Valor",

                detail:
                    "Detalle",

                date:
                    "Fecha",

                revenue:
                    "Ingresos",

                orders:
                    "Órdenes",
            },

            sections: {
                financialSummary:
                    "RESUMEN FINANCIERO",

                dateAnalysis:
                    "ANÁLISIS POR FECHA",
            },

            metrics: {
                totalRevenue:
                    "Ingresos Totales",

                totalTaxes:
                    "Impuestos Totales",

                totalTips:
                    "Propinas Totales",

                totalCommissions:
                    "Comisiones Totales",

                netRevenue:
                    "Ingresos Netos",

                averageTicket:
                    "Ticket Promedio",

                totalOrders:
                    "Total Órdenes",

                growthRate:
                    "Tasa de Crecimiento",
            },
        },
    },
    ecfConfig: {
        status: {
            current:
                "Estado actual",

            ecfStatus:
                "Estado e-CF",

            fiscalIssuer:
                "Emisor fiscal",

            configured:
                "Configurado",

            incomplete:
                "Incompleto",

            digitalCertificate:
                "Certificado digital",

            ready:
                "Listo",

            pendingOrInvalid:
                "Pendiente o inválido",

            certificateNotRequiredSandbox:
                "Certificado digital: no requerido en Sandbox",

            certificationStatus:
                "Estado certificación",

            ecfIssuance:
                "Emisión e-CF",

            readyFeminine:
                "Lista",

            blockedFeminine:
                "Bloqueada",

            mustFix:
                "Debes corregir:",
        },

        certificate: {
            title:
                "Certificado digital e-CF",

            description:
                "Sube el certificado .p12 o .pfx del contribuyente.",

            fileLabel:
                "Archivo certificado",

            selected:
                "Seleccionado",

            passwordLabel:
                "Contraseña",

            passwordPlaceholder:
                "Contraseña del .p12 / .pfx",

            uploading:
                "Subiendo certificado...",

            uploadButton:
                "Subir certificado e-CF",

            validatedTitle:
                "Certificado cargado y validado.",

            validatedDescription:
                "El sistema pudo abrir correctamente el archivo.",

            file:
                "Archivo",

            serial:
                "Serial",

            validFrom:
                "Válido desde",

            validTo:
                "Válido hasta",

            problemTitle:
                "El certificado no está validado correctamente.",

            problemDescription:
                "Verifica archivo, contraseña y configuración.",

            pendingTitle:
                "Certificado pendiente.",

            pendingDescription:
                "Sube un .p12 o .pfx y valida su contraseña.",

            messages: {
                selectFile:
                    "Selecciona un certificado .p12 o .pfx.",

                passwordRequired:
                    "Ingresa la contraseña del certificado.",

                uploadFailed:
                    "No se pudo subir el certificado.",

                uploadSuccess:
                    "Certificado e-CF cargado y validado correctamente.",

                uploadError:
                    "Error subiendo certificado e-CF.",
            },

            errors: {
                passwordInvalid:
                    "La contraseña del certificado es incorrecta.",

                fileInvalid:
                    "El archivo del certificado no es válido.",

                invalidExtension:
                    "El archivo debe ser .p12 o .pfx.",

                passwordRequired:
                    "Debes escribir la contraseña del certificado.",

                fileRequired:
                    "Debes seleccionar un archivo de certificado.",

                notValidated:
                    "El certificado fue recibido, pero no quedó validado correctamente.",

                storageFailed:
                    "No se pudo subir el certificado al almacenamiento privado.",
            },
        },

        documentTypes: {
            code:
                "Código",

            rangeRequired:
                "Rango requerido",

            exhausted:
                "Agotado",

            expired:
                "Vencido",

            sequenceFrom:
                "Secuencia desde",

            sequenceTo:
                "Secuencia hasta",

            authorizationDate:
                "Fecha autorización",

            validUntil:
                "Válido hasta",

            nextSequence:
                "Próxima secuencia",

            nextENcf:
                "Próximo e-NCF",

            certification:
                "Certificación",

            stats: {
                total:
                    "Total",

                used:
                    "Usados",

                available:
                    "Disponibles",

                usedPercent:
                    "Utilizado",
            },

            rangeExpired:
                "Este rango está vencido.",

            rangeExhausted:
                "Este rango está agotado.",
        },
    },
    deliveryConfig: {
        title:
            "Plataformas de Delivery",

        description:
            "Configura los canales de delivery y las comisiones de plataformas externas.",

        channels: {
            pedidosYa: {
                description:
                    "Habilita el canal PedidosYa en la pantalla de Mesas.",
            },

            ownDelivery: {
                label:
                    "Delivery",

                description:
                    "Habilita el canal de delivery propio en la pantalla de Mesas.",
            },

            uberEats: {
                description:
                    "Habilita el canal Uber Eats en la pantalla de Mesas.",
            },
        },

        commission: {
            label:
                "Comisión (%)",

            pedidosYaExample:
                "Ejemplo: 26% de comisión.",

            uberEatsExample:
                "Ejemplo: 22% de comisión.",
        },

        info: {
            disabledChannel:
                "Si un canal está desactivado, se ocultará en Mesas. Las órdenes existentes de ese canal seguirán disponibles en Órdenes y Reportes.",
        },
    },
    billingGeneralConfig: {
        logo: {
            title: "Logo del negocio",
            description: "Este logo aparecerá en la factura visual y en el PDF generado.",
            currentAlt: "Logo actual",
            noLogo: "Sin logo",
            currentInvoiceLogo: "Logo actual de la factura",
            help: "Usa PNG o JPG. Se recomienda fondo transparente y un tamaño máximo de 2 MB.",
            selected: "Seleccionado",
            uploading: "Subiendo...",
            upload: "Subir logo",
            delete: "Eliminar logo",
        },

        features: {
            title: "Funciones de Facturación",
            description: "Habilita o deshabilita funciones disponibles durante la venta.",

            manualTip: {
                label: "Propina manual",
                description: "Permite al cajero ingresar manualmente una propina voluntaria en dinero.",
            },

            discounts: {
                label: "Descuentos",
                description: "Permite aplicar descuentos en la cuenta.",
            },
        },

        chargeMode: {
            title: "Modo de cobro",
            description: "Define en qué momento una venta entra al cierre de caja.",

            options: {
                atInvoice: "Cobrar al facturar",
                atComplete: "Cobrar al completar",
            },

            help: "Cobrar al facturar: la venta entra al cierre al emitir la factura. Cobrar al completar: la venta entra al cierre cuando la orden se marca como completada.",
        },

        preInvoice: {
            title: "PreFactura",
            description: "Controla el comportamiento de documentos no fiscales.",
            label: "PreFactura",
            toggleDescription: 'Si está activo, las facturas NO fiscales mostrarán "PreFactura" en vez de "Factura para Consumidor Final".',
            info: "PreFactura solamente aplica a facturas no fiscales. Si la operación utiliza comprobante fiscal, seguirá tratándose como factura fiscal.",
        },
    },
    inventoryPage: {
        title:
            "Inventario",

        subtitle:
            "Stock real, kardex y consumo",

        plan: {
            restricted:
                "Este módulo está disponible solo para los planes Estándar, Premium y Pro.",
        },

        help: {
            costs:
                "Nota: Último costo es el último precio unitario comprado. Costo promedio es el promedio ponderado utilizado para calcular el costo real.",

            minimumStock:
                "Stock mínimo sirve para marcar Bajo stock cuando el stock actual llega a esa cantidad o menos.",
        },

        tabs: {
            stock:
                "Stock",

            movements:
                "Movimientos",

            consumption:
                "Consumo",

            waste:
                "Merma",

            suppliers:
                "Proveedores",

            categories:
                "Categorías",
        },

        metrics: {
            items:
                "Artículos",

            lowStock:
                "Bajo stock",

            estimatedValue:
                "Valor estimado",
        },

        itemTypes: {
            none: {
                title:
                    "Sin inventario",
            },

            ingredient: {
                title:
                    "Ingrediente / insumo",

                description:
                    "No se vende como plato. Se usa para recetas y puede recibir entrada o salida.",
            },

            direct: {
                title:
                    "Producto con stock directo",

                description:
                    "Producto del menú que maneja su propio stock.",
            },

            recipe: {
                title:
                    "Plato con receta",

                description:
                    "Plato del menú que descuenta ingredientes.",
            },
        },

        units: {
            unit:
                "Unidad",

            lb:
                "lb",

            kg:
                "kg",

            g:
                "g",

            oz:
                "oz",

            ml:
                "ml",

            l:
                "L",
        },

        messages: {
            saved:
                "Guardado correctamente.",

            duplicateItem:
                "Ya existe un artículo de inventario con ese nombre. Cambia el nombre o archiva el anterior.",

            saveError:
                "Error guardando el artículo.",

            archived:
                "Archivado.",

            archiveError:
                "Error archivando el artículo.",

            unarchived:
                "Desarchivado.",

            unarchiveError:
                "Error desarchivando el artículo.",

            movementCreated:
                "Movimiento registrado.",

            movementError:
                "Error registrando el movimiento.",

            yieldApplied:
                "Proceso de merma aplicado.",

            yieldError:
                "Error en el proceso de merma.",
        },

        permissions: {
            createItem:
                "No tienes permiso para crear artículos directos de inventario.",

            editItem:
                "No tienes permiso para editar artículos de inventario.",

            yield:
                "No tienes permiso para procesar rendimiento o merma.",

            entry:
                "No tienes permiso para registrar entradas.",

            exit:
                "No tienes permiso para registrar salidas.",

            adjust:
                "No tienes permiso para realizar ajustes.",

            waste:
                "No tienes permiso para registrar merma.",
        },

        yield: {
            alreadyProcessedQuestion:
                "Ya procesaste una merma para este producto. ¿Qué deseas hacer?",

            processAnother:
                "Procesar otra merma",

            addWaste:
                "Agregar pérdida (merma)",

            processAgainQuestion:
                "Ya procesaste merma por proceso para este artículo. ¿Quieres procesar otra?",

            processAnotherShort:
                "Procesar otra",
        },

        roles: {
            owner:
                "Propietario",

            admin:
                "Admin",

            cashier:
                "Cajera",

            waiter:
                "Camarero",

            kitchen:
                "Cocina",

            system:
                "Sistema",
        },

        movements: {
            filters: {
                item:
                    "Artículo",

                allItems:
                    "Todos",

                type:
                    "Tipo",

                allTypes:
                    "Todos",
            },

            types: {
                purchase:
                    "Compra / entrada",

                sale:
                    "Venta / salida",

                waste:
                    "Merma",

                adjust:
                    "Ajuste",

                transfer:
                    "Transferencia",

                conversion:
                    "Conversión",
            },

            table: {
                date:
                    "Fecha",

                type:
                    "Tipo",

                item:
                    "Artículo",

                quantity:
                    "Cantidad",

                before:
                    "Antes",

                after:
                    "Después",

                cost:
                    "Costo",

                user:
                    "Usuario",

                note:
                    "Nota",
            },

            empty:
                "No hay movimientos.",
        },

        consumption: {
            table: {
                item:
                    "Artículo",

                quantity:
                    "Cantidad",

                cost:
                    "Costo",
            },

            empty:
                "No hay datos para este rango.",

            pagination: {
                summary:
                    "Mostrando página {{page}} de {{totalPages}} · {{total}} registros",
            },
        },

        yieldDashboard: {
            title:
                "Merma (Yield)",

            description:
                "Historial y KPIs basados en movimientos de merma.",

            metadataHelp:
                "Para calcular Comprado / Final / Rendimiento, las notas históricas del yield deben incluir los marcadores “comprado X” y “final Y”. Sin ellos todavía podrás ver cantidad y costo de merma.",

            viewHistory:
                "Ver historial",

            kpis: {
                purchasedTotal:
                    "Comprado (total)",

                movements:
                    "Movimientos: {{count}}",

                finalUsable:
                    "Final usable (total)",

                yieldPercent:
                    "Rendimiento: {{value}}%",

                wasteQuantity:
                    "Merma (cantidad)",

                wastePercent:
                    "Merma: {{value}}%",

                wasteCost:
                    "Merma (costo)",

                averageWasteCost:
                    "Costo prom./u merma: {{value}}",

                averageWasteUnit:
                    "Costo promedio por unidad de merma",

                averageWasteFormula:
                    "wasteCost / wasteQty",

                metadataRecords:
                    "Registros con metadata (comprado/final)",

                metadataHelp:
                    "Si es 0, la nota histórica no contiene los marcadores comprado/final.",
            },

            latest: {
                title:
                    "Últimas mermas",

                empty:
                    "No hay mermas registradas para este día.",

                waste:
                    "Merma",

                cost:
                    "Costo",

                purchased:
                    "Comprado",

                final:
                    "Final",

                note:
                    "Nota",

                more:
                    "más",
            },

            history: {
                title:
                    "Historial de merma (Yield) — {{date}}",

                empty:
                    "No hay registros.",
            },
        },

        itemModal: {
            title: {
                edit:
                    "Editar artículo",

                create:
                    "Nuevo artículo",
            },

            createQuestion:
                "¿Qué estás creando?",

            newIngredientDescription:
                "Para recetas, compras, entradas y salidas de inventario.",

            fromExistingDish:
                "Basado en plato existente",

            fromExistingDishDescription:
                "Habilita un plato del menú como stock directo o plato con receta.",

            selectDish:
                "Selecciona un plato",

            selectedDish:
                "Plato seleccionado",

            category:
                "Categoría",

            price:
                "Precio",

            inventoryTypeForDish:
                "Tipo de inventario para este plato",

            directDishDescription:
                "Se vende y descuenta su propio inventario. Puede permitirse stock negativo.",

            recipeDishDescription:
                "No tiene inventario directo. Descuenta ingredientes.",

            sameDishHelp:
                "Esto habilita el MISMO plato para inventario sin crear un duplicado.",

            stockMovementHelp:
                "El stock se maneja con movimientos: usa el botón Entrada luego de guardar.",

            recipe: {
                title:
                    "Receta",

                description:
                    "Los ingredientes se descuentan al vender si el backend utiliza la receta.",

                addedIngredients:
                    "Ingredientes agregados",

                empty:
                    "Aún no has agregado ingredientes.",
            },

            fields: {
                ingredient:
                    "Ingrediente",

                quantity:
                    "Cantidad",

                createIngredient:
                    "Crear ingrediente",

                inventoryCategoryOptional:
                    "Categoría de inventario (opcional)",

                name:
                    "Nombre",

                unit:
                    "Unidad",

                inventoryCategory:
                    "Categoría de inventario",

                currentSupplierOptional:
                    "Proveedor actual (opcional)",

                minimumStock:
                    "Stock mínimo",

                lastCost:
                    "Último costo",

                averageCost:
                    "Costo promedio",
            },

            placeholders: {
                selectIngredient:
                    "— Selecciona ingrediente —",

                quantity:
                    "Ejemplo: 1, 0.5",

                ingredientName:
                    "Ejemplo: Queso mozzarella",
            },

            actions: {
                add:
                    "Agregar",

                create:
                    "Crear",

                creating:
                    "Creando...",

                remove:
                    "Quitar",

                save:
                    "Guardar",

                saving:
                    "Guardando...",
            },

            messages: {
                nameRequired:
                    "El nombre es requerido.",

                selectDish:
                    "Selecciona un plato primero.",

                selectDishInventoryType:
                    "Selecciona si el plato usará stock directo o receta.",

                recipeIngredientRequired:
                    "Agrega al menos un ingrediente para crear un plato con receta.",

                recipeSaved:
                    "Receta guardada.",

                recipeSaveError:
                    "No se pudo guardar la receta.",

                selectIngredient:
                    "Selecciona un ingrediente.",

                invalidQuantity:
                    "Cantidad inválida. Debe ser mayor que 0.",

                ingredientNameRequired:
                    "Escribe el nombre del ingrediente.",

                ingredientCreated:
                    "Ingrediente creado.",

                ingredientCreateError:
                    "No se pudo crear el ingrediente.",
            },
        },

        movementModal: {
            title: {
                yield:
                    "Proceso de merma (yield)",

                purchase:
                    "Entrada de inventario",

                sale:
                    "Salida de inventario",

                waste:
                    "Merma",

                adjust:
                    "Ajuste de inventario",
            },

            fields: {
                item:
                    "Artículo",

                quantity:
                    "Cantidad",

                unitCost:
                    "Costo unitario",

                direction:
                    "Dirección",

                note:
                    "Nota",
            },

            direction: {
                reduce:
                    "Reducir",

                increase:
                    "Aumentar",
            },

            messages: {
                invalidItem:
                    "Artículo inválido.",

                invalidPurchasedQuantity:
                    "Cantidad comprada inválida.",

                invalidFinalQuantity:
                    "Cantidad final inválida.",

                invalidTotalCost:
                    "Costo total inválido.",

                invalidQuantity:
                    "Cantidad inválida.",
            },

            yield: {
                activeDescription:
                    "Aplicando rendimiento (merma por proceso)",

                normalEntry:
                    "Entrada normal",

                enable:
                    "Activar",

                disable:
                    "Desactivar",

                process:
                    "proceso de merma",

                purchasedQuantity:
                    "Cantidad comprada (ejemplo: 44.60)",

                totalPurchaseCost:
                    "Costo total de compra (ejemplo: 7136)",

                finalUsableQuantity:
                    "Cantidad final usable (ejemplo: 28)",

                intermediateStepsHelp:
                    "Pasos intermedios (opcional). Ejemplo: hervido 32.8, cocido 28.",

                quantityAfter:
                    "Cantidad después",

                estimatedFinalUnitCost:
                    "Costo final por unidad (estimado)",

                defaultSteps: {
                    boiled:
                        "Hervido",

                    cooked:
                        "Cocido",

                    step:
                        "Paso",
                },
            },

            actions: {
                remove:
                    "Quitar",

                addStep:
                    "+ Agregar paso",

                saving:
                    "Guardando...",

                save:
                    "Guardar",
            },

            negative: {
                title:
                    "Inventario quedará en negativo",

                description:
                    "Este movimiento reducirá el stock por debajo de cero. Verifica si deseas continuar.",

                currentStock:
                    "Stock actual",

                outputQuantity:
                    "Cantidad de salida",

                newStock:
                    "Nuevo stock",

                warning:
                    "Si continúas, el producto quedará con existencia negativa. Esto puede afectar tus reportes y conteos.",

                continueAnyway:
                    "Continuar de todos modos",
            },
        },
        common: {
            loading:
                "Cargando...",
            from:
                "Desde",

            to:
                "Hasta",

            refresh:
                "Refrescar",

            supplier:
                "Proveedor",

            noSupplier:
                "Sin proveedor",

            noCategory:
                "Sin categoría",

            yes:
                "Sí",

            no:
                "No",
        },

        status: {
            noInventory:
                "Sin inventario",

            lowStock:
                "Bajo stock",

            negativeStock:
                "Stock negativo",

            ok:
                "OK",
        },

        filters: {
            search:
                "Buscar",

            searchPlaceholder:
                "Buscar por nombre...",

            searching:
                "Buscando...",

            category:
                "Categoría",

            allCategories:
                "Todas las categorías",

            supplier:
                "Proveedor",

            allSuppliers:
                "Todos los proveedores",
        },

        archive: {
            showing:
                "Mostrando archivados",

            hiding:
                "Ocultando archivados",
        },

        table: {
            item:
                "Artículo",

            unit:
                "Unidad",

            stock:
                "Stock",

            minimum:
                "Mínimo",

            minimumShort:
                "Mín.",

            averageCost:
                "Costo prom.",

            supplier:
                "Proveedor",

            status:
                "Estado",

            actions:
                "Acciones",
        },

        stock: {
            empty:
                "No hay artículos.",
        },

        actions: {
            newItem:
                "Nuevo artículo",

            entry:
                "Entrada",

            exit:
                "Salida",

            yieldProcess:
                "Proceso merma",

            adjust:
                "Ajuste",

            waste:
                "Merma",

            edit:
                "Editar",

            archive:
                "Archivar",

            unarchive:
                "Desarchivar",
        },

        pagination: {
            page:
                "Página",

            of:
                "de",

            total:
                "Total",

            previous:
                "Anterior",

            next:
                "Siguiente",
        },

        export: {
            label:
                "Exportar",

            button:
                "Exportar Excel",

            exporting:
                "Exportando...",

            options: {
                all:
                    "Todo el inventario",

                category:
                    "Categoría seleccionada",

                products:
                    "Solo productos",
            },

            selectCategoryFirst:
                "Selecciona primero una categoría para exportarla.",

            noRecords:
                "No hay registros para exportar.",

            error:
                "No se pudo exportar el inventario.",

            success:
                "{{count}} registros exportados a Excel.",

            sheetName:
                "Inventario",

            filePrefix:
                "Inventario",

            fileNames: {
                all:
                    "Todos",

                products:
                    "Productos",

                category:
                    "Categoria",
            },

            columns: {
                item:
                    "Artículo",

                type:
                    "Tipo",

                category:
                    "Categoría",

                unit:
                    "Unidad",

                currentStock:
                    "Stock actual",

                minimumStock:
                    "Stock mínimo",

                lastCost:
                    "Último costo",

                averageCost:
                    "Costo promedio",

                usedCost:
                    "Costo utilizado",

                inventoryValue:
                    "Valor inventario",

                supplier:
                    "Proveedor",

                status:
                    "Estado",

                archived:
                    "Archivado",

                id:
                    "ID",
            },
        },
    },


    cashRegisterPage: {
        title: "Cierre de Caja",

        common: {
            date: "Fecha",
            register: "Caja",
            user: "Usuario",
            customer: "Cliente",
            method: "Método",
            total: "Total",
            invoice: "Factura",
            product: "Producto",
            quantity: "Cantidad",
            quantityValue: "Cantidad: {{count}}",
            note: "Nota",
            subtotal: "Subtotal",
            status: "Estado",
            loading: "Cargando...",
            unavailable: "No disponible",
            enabled: "Activado",
            disabled: "Desactivado",
            open: "Abierto",
            closed: "Cerrado",
            orderCount_one: "{{count}} orden",
            orderCount_other: "{{count}} órdenes",
        },

        actions: {
            add: "Agregar",
            cancel: "Cancelar",
            saveChange: "Guardar cambio",
            saveChanges: "Guardar cambios",
            saving: "Guardando...",
            close: "Cerrar",
            viewFullRecords: "Ver Registros Completos",
            hideSession: "Ocultar sesión",
            viewPrint: "Ver / Imprimir",
            view:
                "Ver",

            exportExcel:
                "Exportar a Excel",

            filters:
                "Filtros",

            clearFilters:
                "Limpiar filtros",
        },

        registers: {
            active: "Caja activa",
            allRegisters: "TODAS LAS CAJAS",
            allSales: "ADMIN — Ver todas las ventas",
        },

        paymentMethods: {
            cash: "Efectivo",
            card: "Tarjeta",
            transfer: "Transferencia",
            transfers: "Transferencias",
            credit: "Crédito",
            ticket: "Ticket",
            tickets: "Tickets",
            other: "Otros",
        },

        status: {
            paid: "Pagado",
            pending: "Pendiente",
            partial: "Parcial",
        },

        opening: {
            title: "Fondo inicial de caja (menudo)",
            description:
                "Este monto no es venta: es el efectivo con el que se inicia la caja para dar cambio.",
            editInitialAdmin:
                "Editar fondo inicial (admin) — {{date}}",

            currentFloat:
                "Menudo (fondo inicial + agregado)",

            initialAdded:
                "Inicial: {{initial}} · Agregado: {{added}}",

            cashSales:
                "Efectivo (ventas)",

            dayExpenses:
                "Gastos del día",

            cashExpenses:
                "En efectivo: {{amount}}",

            cashInRegister:
                "Efectivo en caja (fondo + ventas)",

            netSales:
                "Ventas netas",

            amountExample:
                "Monto (ej. 2000)",

            addMoney:
                "Agregar dinero",

            adminOnlyHint:
                "Solo administración puede agregar dinero o ajustar el fondo inicial.",

            saveInitial:
                "Guardar fondo inicial",

            editWithManager:
                "Editar fondo inicial con código de autorización",

            saveInitialAdmin:
                "Guardar fondo inicial (Admin) — {{date}}",

            editInitial:
                "Editar fondo inicial",

            savedToday:
                "Fondo inicial guardado para hoy.",

            notSavedToday:
                "Aún no se ha guardado el fondo inicial de hoy.",

            showingHistory:
                "Mostrando histórico del día seleccionado.",
        },

        manager: {
            title:
                "Configurar código manager",

            code:
                "Código del manager",

            codePlaceholder:
                "Ej: 1234",

            lastUpdated:
                "Última actualización",

            newCode:
                "Nuevo código (4–8 dígitos)",

            securityHint:
                "Solo se guarda el hash en el servidor. El sistema muestra un hint tipo ***12.",

            saveUpdate:
                "Guardar / Actualizar",

            disableCode:
                "Desactivar código",
        },

        closing: {
            comparisonTitle:
                "Comparación (Reporte de Cierre de Caja)",

            systemExpected:
                "Sistema (efectivo esperado)",

            countedCash:
                "Contado (efectivo en caja)",
            ticketsDetail:
                "Detalle de tickets",

            transferTotal:
                "Total transferencia",

            otherTotal:
                "Total otros",

            transferAndOther:
                "Transferencia + otros",

            difference:
                "Diferencia",

            closeNote:
                "Nota del cierre",

            breakdownTitle:
                "Desglose del efectivo contado",

            breakdownDescription:
                "Billetes, monedas, tickets, transferencias y otros montos declarados al cierre.",

            consolidatedCounted:
                "Contado consolidado",

            registerCounted:
                "Contado caja",

            billsCoins:
                "Billetes/monedas",

            billsAndCoins:
                "Billetes y monedas",

            totalClose:
                "Total cierre",

            hideBreakdown:
                "Ocultar billetes y monedas registrados",

            showBreakdown:
                "Ver billetes y monedas registrados",

            breakdownHint:
                "Haz click para ver el detalle exacto contado al cierre.",

            billsCoinsDetail:
                "Detalle de billetes y monedas",

            ticketValue:
                "Ticket {{amount}}",

            finalTitle:
                "Cierre final de caja",

            selectedSession:
                "Sesión seleccionada para cierre",

            instruction:
                "Para ver el resumen, primero registra el efectivo contado al cierre.",

            totalCounted:
                "Total contado",

            countedLabel:
                "Efectivo contado (lo que tienes en caja)",

            denominationTitle:
                "Conteo por denominación",

            denominationDescription:
                "Ingresa la cantidad de cada billete o moneda.",

            bill:
                "Billete",

            coin:
                "Moneda",

            ticketDescription:
                "Crédito físico contado como efectivo.",

            ticketAmount:
                "Monto ticket",

            ticketSubtotal:
                "Subtotal tickets",

            transferDescription:
                "Monto confirmado por transferencia.",

            transferAmount:
                "Monto transferencia",

            otherDescription:
                "Otro método o ajuste contado.",

            otherAmount:
                "Monto otros",

            totalDeclared:
                "Total declarado",

            optionalNote:
                "Nota del cierre (opcional)",

            notePlaceholder:
                "Ej: faltó cambio, sobrante, observación de la cajera, etc.",

            closing:
                "Cerrando caja...",

            registerClose:
                "Registrar cierre",
        },

        sessions: {
            openTitle:
                "Sesiones abiertas de esta caja",

            openDescription:
                "Selecciona la sesión de la cajera que deseas cerrar.",

            unnamedCashier:
                "Cajera sin nombre",

            registerAndOpening:
                "Caja: {{register}} · Fondo inicial: {{amount}}",

            openedAt:
                "Abierta",

            closeThis:
                "Cerrar esta sesión",
        },

        salesSummary: {
            title:
                "Resumen de ventas",

            totalCollected:
                "Total cobrado",

            paidOrders_one:
                "{{count}} orden cobrada",

            paidOrders_other:
                "{{count}} órdenes cobradas",

            receivablePayments:
                "Abonos CxC",

            creditSales:
                "Ventas a crédito (CxC)",
        },

        table: {
            invoiceNumber:
                "No. Factura",

            noRecords:
                "No hay registros disponibles",
        },

        fullRecords: {
            title:
                "Registros Completos",
            summary:
                "Resumen",

            dayFloat:
                "Menudo del día",

            showingDayHistory:
                "Mostrando {{count}} registros del día {{date}}. Para ver histórico, usa “Ver Registros Completos”.",

            adminOnly:
                "Los registros del día solo están disponibles para administración.",
        },

        filters: {
            title:
                "Filtros de Búsqueda",

            from:
                "Fecha desde",

            to:
                "Fecha hasta",

            paymentMethod:
                "Método de pago",

            allMethods:
                "Todos los métodos",

            all:
                "Todos",

            fiscalDocument:
                "Comprobante fiscal",

            withFiscal:
                "Con comprobante fiscal / e-CF",

            fiscalCredit:
                "Crédito fiscal (B01 / E31)",

            finalConsumer:
                "Consumidor final (B02 / E32)",

            fiscalDebit:
                "Débito fiscal / Nota de débito (E33)",

            creditNote:
                "Nota de crédito (E34)",

            onlyB01:
                "Solo B01",

            onlyB02:
                "Solo B02",

            onlyE31:
                "Solo E31",

            onlyE32:
                "Solo E32",

            onlyE33:
                "Solo E33",

            onlyE34:
                "Solo E34",

            withoutFiscal:
                "Sin comprobante fiscal / e-CF",

            userSearch:
                "Buscar por usuario",

            userPlaceholder:
                "Nombre del usuario...",

            customerSearch:
                "Buscar por cliente",

            customerPlaceholder:
                "Nombre del cliente...",
        },

        adjustClose: {
            title:
                "Editar cierre final",

            description:
                "Puedes corregir el cierre como total directo o por billetes, tickets y transferencia.",

            adjustedCash:
                "Efectivo contado ajustado",

            denominationDescription:
                "Corrige billetes, monedas, tickets, transferencias u otros.",

            notePlaceholder:
                "Motivo del ajuste",

            saving:
                "Guardando ajuste...",

            save:
                "Guardar ajuste",
        },

        ecf: {
            defaultCreditReason:
                "Devolución parcial de producto",

            defaultDebitReason:
                "Monto adicional pendiente de facturar",
            affectedInvoice:
                "Factura afectada",

            availableCreditBalance:
                "Balance disponible para nota de crédito",

            balanceBreakdown:
                "Total original: {{original}} · Débito aplicado: {{debit}} · Crédito aplicado: {{credit}}",

            creditFullyApplied:
                "Esta factura ya fue cubierta por notas de crédito aceptadas. No se puede emitir otra E34.",

            disabled:
                "El e-CF está desactivado para este tenant.",

            debitDisabled:
                "La Nota de Débito e33 no está habilitada.",

            creditDisabled:
                "La Nota de Crédito e34 no está habilitada.",

            orderUnavailable:
                "Orden no disponible.",

            acceptedOnly:
                "Solo puedes crear notas sobre facturas e-CF aceptadas.",

            validationError:
                "No se pudo validar el e-CF de esta factura.",

            reasonRequired:
                "Debes escribir el motivo de la nota.",

            validAmountRequired:
                "Debes colocar un monto válido.",

            noCreditBalance:
                "Esta factura ya no tiene balance disponible para nota de crédito.",

            creditExceedsBalance:
                "La nota de crédito excede el balance disponible. Disponible: {{available}}. Solicitado: {{requested}}.",

            noteIssued:
                "{{type}} emitida: {{number}}",

            issueError:
                "No se pudo emitir la nota.",

            debitNote:
                "Nota de Débito",

            creditNote:
                "Nota de Crédito",

            debitNoteElectronic:
                "Nota de Débito Electrónica e-CF",

            creditNoteElectronic:
                "Nota de Crédito Electrónica e-CF",

            electronicNote:
                "Nota Electrónica e-CF",

            createCreditNote:
                "Crear Nota de Crédito e34",

            createDebitNote:
                "Crear Nota de Débito e33",

            e34Credit:
                "e34 - Nota de Crédito",

            e33Debit:
                "e33 - Nota de Débito",

            type:
                "Tipo",

            originalInvoice:
                "Factura original",

            originalTotal:
                "Total original",

            adjustmentMode:
                "Modo de ajuste",

            partial:
                "Parcial",

            total:
                "Total",

            baseAmount:
                "Monto base",

            modificationCode:
                "Código de modificación",

            modification1:
                "1 - Anula o modifica comprobante",

            modification2:
                "2 - Corrige texto",

            modification3:
                "3 - Corrige monto",

            reason:
                "Motivo",

            reasonPlaceholder:
                "Describe el motivo de la nota...",

            noteIssuedSuccessfully:
                "Nota emitida correctamente",

            existingNotes:
                "Notas existentes de esta factura",

            noteCount_one:
                "{{count}} nota",

            noteCount_other:
                "{{count}} notas",

            loadingNotes:
                "Cargando notas...",

            noNotes:
                "Esta factura todavía no tiene notas.",

            issuing:
                "Emitiendo...",

            issueNote:
                "Emitir nota",
        },



        excel: {
            salesSheet:
                "Cierre de Caja",

            summarySheet:
                "Resumen",

            filePrefix:
                "cierre_caja",

            columns: {
                invoice:
                    "Factura",

                date:
                    "Fecha",

                user:
                    "Usuario",

                customer:
                    "Cliente",

                method:
                    "Método",

                total:
                    "Total",

                status:
                    "Estado",

                orderId:
                    "ID de orden",

                field:
                    "Campo",

                value:
                    "Valor",
            },

            summary: {
                opening:
                    "Fondo inicial (menudo)",

                creditSales:
                    "Ventas a crédito / CxC",

                receivablePayments:
                    "Abonos CxC cobrados",

                receivableCash:
                    "Abonos CxC efectivo",

                receivableCard:
                    "Abonos CxC tarjeta",

                receivableTransfer:
                    "Abonos CxC transferencia",

                cashSales:
                    "Efectivo (ventas)",

                cashInRegister:
                    "Efectivo en caja (fondo + ventas)",

                grandTotal:
                    "Total general (todas las ventas)",

                orders:
                    "Órdenes",

                totalWithOpening:
                    "Total (ventas + menudo)",

                addedCash:
                    "Dinero agregado",

                wasteCost:
                    "Merma (costo)",

                netSales:
                    "Ventas netas (ventas - merma)",
            },
        },

        messages: {
            closeAdjustmentSaved:
                "Ajuste guardado correctamente.",
            invalidAmount:
                "Monto inválido.",

            noOpenRegisterForDate:
                "No hay una caja abierta para esta fecha.",

            selectSpecificRegisterToClose:
                "Selecciona una caja específica para poder cerrarla.",

            openingRequiredBeforeClose:
                "Primero debe existir un fondo inicial para poder cerrar la caja.",

            closingBreakdownRequired:
                "Debes ingresar billetes, tickets, transferencia u otros.",

            sessionIdNotFound:
                "No se encontró el ID de la sesión.",

            selectSpecificRegisterBeforeClose:
                "Selecciona una caja específica antes de cerrar.",

            selectSpecificRegisterBeforeOpening:
                "Selecciona una caja específica antes de guardar el fondo inicial.",

            selectSpecificRegisterBeforeEditingOpening:
                "Selecciona una caja específica antes de editar el fondo inicial.",

            selectedRegisterUnavailable:
                "La caja seleccionada no existe o no está activa.",

            selectSpecificRegisterBeforeAdjustClosing:
                "Selecciona una caja específica antes de ajustar el cierre.",

            cannotAddToClosedRegister:
                "La caja ya está cerrada. No se puede agregar dinero.",

            invoiceUnavailable:
                "No se pudo obtener la factura.",

            invoiceLoadError:
                "Error al cargar la factura.",

            managerCodeInvalidFormat:
                "Código inválido. Debe tener 4 a 8 dígitos.",

            closeAdjustmentError:
                "Error ajustando cierre",

            closeSuccess:
                "Cierre registrado correctamente.",

            closeError:
                "No se pudo cerrar la caja.",

            invalidManagerCode:
                "Código del manager incorrecto.",

            managerCodeRequired:
                "Código del manager requerido.",

            managerCodeSaveError:
                "Error guardando manager code",


            addCashError:
                "No se pudo agregar dinero.",

            sessionNotFound:
                "No se encontró la sesión para esa fecha/caja.",

            adminOnlyAddAfterClose:
                "Solo admin puede agregar dinero después del cierre.",

            adminOnlyAddCash:
                "Solo administración puede agregar dinero.",

            pendingPreviousSession:
                "Tienes una caja anterior pendiente de cierre ({{date}}) {{register}}. Debes cerrarla antes de ingresar el fondo inicial.",

            registerSuffix:
                "Caja: {{register}}",

            registerAlreadyClosed:
                "Esta caja ya fue cerrada para esta fecha.",

            sessionAlreadyExists:
                "Ya existe una apertura para esta caja y esta cajera.",

            openRegisterError:
                "No se pudo abrir la caja. Revisa si ya existe una sesión.",

            saveOpeningError:
                "No se pudo guardar el fondo inicial.",

            cashierSessionNotFound:
                "No se encontró la sesión de caja para esta cajera y caja.",

            closedOpeningEditForbidden:
                "La caja ya está cerrada. No se puede editar el fondo inicial.",

            editOpeningError:
                "No se pudo editar el fondo inicial.",

            recordsLoadError:
                "Error al cargar registros.",

            exportError:
                "Error al exportar el archivo. Verifica tu sesión.",
        },
    },
    adminRegisterPage: {
        title:
            "Administración",

        subtitle:
            "Registra usuarios y gestiona tus cajas desde un solo lugar.",


        common: {
            optional:
                "(opcional)",
        },


        tabs: {
            users:
                "Registrar Usuario",

            registers:
                "Gestionar Cajas",
        },


        actions: {
            back:
                "Volver",

            reload:
                "Recargar",

            registerUser:
                "Registrar Usuario",

            registering:
                "Registrando...",

            cancel:
                "Cancelar",

            saving:
                "Guardando...",

            saveChanges:
                "Guardar Cambios",

            creating:
                "Creando...",

            createRegister:
                "Crear Caja",

            edit:
                "Editar",

            deactivate:
                "Desactivar",

            activate:
                "Activar",
        },


        roles: {
            waiter:
                "Camarero",

            kitchen:
                "Cocina",

            cashier:
                "Cajera",

            admin:
                "Admin",
        },


        users: {
            formTitle:
                "Registrar Nuevo Usuario",


            fields: {
                name:
                    "Nombre del empleado",

                email:
                    "Correo electrónico",

                phone:
                    "Número de teléfono",

                password:
                    "Contraseña",

                role:
                    "Rol del empleado",
            },


            placeholders: {
                name:
                    "Ej: Juan Pérez",

                email:
                    "ejemplo@correo.com",

                phone:
                    "Ej: 8095551234",
            },


            cashiersTitle:
                "Cajeras / Admins",

            loading:
                "Cargando usuarios...",

            emptyCashiers:
                "No hay cajeras ni administradores registrados todavía.",
        },


        registers: {
            newTitle:
                "Nueva Caja",

            editTitle:
                "Editar Caja",


            fields: {
                code:
                    "Código",

                name:
                    "Nombre",

                location:
                    "Ubicación",

                sortOrder:
                    "Orden",

                defaultCashier:
                    "Cajera por defecto",

                active:
                    "Caja activa",
            },


            placeholders: {
                code:
                    "Ej: CAJA1",

                name:
                    "Ej: Caja 1",

                location:
                    "Ej: Salón / Barra / Entrada",
            },


            unassigned:
                "Sin asignar",

            noLocation:
                "Sin ubicación",


            listTitle:
                "Cajas Registradas",

            listDescription:
                "Crea, edita, activa o desactiva tus cajas.",

            showInactive:
                "Ver inactivas",

            loading:
                "Cargando cajas...",

            empty:
                "No hay cajas registradas todavía.",


            status: {
                active:
                    "Activa",

                inactive:
                    "Inactiva",
            },
        },


        messages: {
            accessDenied:
                "Acceso denegado. Solo administradores.",


            userCreated:
                "Usuario registrado correctamente.",

            userCreateFailed:
                "No se pudo registrar el usuario.",


            registerCreated:
                "Caja creada correctamente.",

            registerCreateFailed:
                "No se pudo crear la caja.",


            registerUpdated:
                "Caja actualizada correctamente.",

            registerUpdateFailed:
                "No se pudo actualizar la caja.",


            registerStatusUpdated:
                "Estado de caja actualizado.",

            registerStatusUpdateFailed:
                "No se pudo cambiar el estado de la caja.",


            registerCodeRequired:
                "Debes indicar el código de la caja.",

            registerNameRequired:
                "Debes indicar el nombre de la caja.",
        },
    },
    loginPage: {
        fields: {
            email:
                "Correo electrónico",

            password:
                "Contraseña",
        },


        placeholders: {
            email:
                "Ingresa tu correo electrónico",

            password:
                "Ingresa tu contraseña",
        },


        actions: {
            signIn:
                "Ingresar",

            signingIn:
                "Ingresando...",
        },


        messages: {
            noUserData:
                "No se recibió información del usuario al iniciar sesión.",

            noTenant:
                "Tu cuenta no está asociada a ninguna empresa. Contacta al administrador.",

            loginFailed:
                "Error al iniciar sesión.",
        },
    },
};


export default es;