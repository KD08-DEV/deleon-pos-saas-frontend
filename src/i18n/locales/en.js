const en = {
    common: {
        save: "Save",
        cancel: "Cancel",
        close: "Close",
        loading: "Loading...",
        print: "Print",
        customer: "Customer",
        phone: "Phone",
        address: "Address",
        total: "Total",
        subtotal: "Subtotal",
        discount: "Discount",
        tax: "Tax",
        taxes: "Taxes",
        tip: "Tip",
        paymentMethod: "Payment method",
    },

    invoice: {
        titles: {
            standard: "Invoice",
            consumerFinal: "Final Consumer Invoice",
            fiscal: "Fiscal Invoice",
            ecf: "Electronic Fiscal Invoice e-CF",
            preInvoice: "Pre-Invoice",
        },

        thankYou: "Thank you for your purchase",
        waiter: "Server",
        table: "Table",
        roomArea: "Room / Area",
        branch: "Branch",
        emissionPoint: "Issuing point",
        dateTime: "Date / Time",
        invoiceNumber: "Invoice No.",
        customer: "Customer",
        phone: "Phone",
        address: "Address",
        consumptionDetail: "Purchase details",
        adjustmentDetail: "Adjustment details",
        description: "Description",
        quantity: "Qty.",
        price: "Price",
        amount: "Amount",
        subtotal: "Subtotal",
        discount: "Discount",
        tip: "Tip",
        tax: "Tax",
        totalToPay: "Total due",
        paymentMethod: "Payment method",
        printer: "Printer",
        noPrinters: "No printers configured",
        browserPrinterHelp:
            "Browser mode will open the system print dialog.",
        printTicket: "Print ticket",
        otherPrinters: "Other printers",
        networkPrinter: "Network printer",
        printing: "Printing...",
        close: "Close",
        closeAndRelease: "Close and release table",
        releasing: "Releasing...",
        noItems: "No items.",
        finalConsumer: "Final Consumer",
        product: "Product",
        adjustmentDocument: "Electronic adjustment document",
        ecfType: "e-CF Type",
        ncfType: "NCF Type",
        ecfStatus: "e-CF Status",
        pending: "Pending",
        referenceInfo: "Reference information",
        affectedEcf: "Affected eNCF",
        affectedEcfDate: "Affected e-CF date",
        modificationCode: "Modification code",
        reason: "Reason",
        ncfExpiration: "NCF expiration",
        includedInPrice: "included",
        charge: "Charge",
        commission: "Commission",
        shipping: "Shipping",
        mode: "Mode",
        paper: "Paper",
        ecfLookup: "DGII e-CF lookup",
        securityCode: "Security code",
        signatureDate: "Signature date",
        openingPrintDialog: "Opening browser print dialog...",
        sendingToPrinter: "Sending invoice to printer...",
        printedSuccessfully: "Invoice printed successfully.",
        printFailed: "Invoice could not be printed.",

        paymentMethods: {
            cash: "Cash",
            card: "Card",
            transfer: "Bank Transfer",
            credit: "Credit",
        },
    },

    ticket: {
        title: "TICKET",
        finalConsumer: "Final Consumer",
        item: "Item",
        phoneShort: "Phone",
        operation: "Order",
        customer: "Customer",
        table: "Table",
        date: "Date",
        waiter: "Server",
        roomArea: "Room / Area",
        noItems: "No items",
        orderNote: "Order note",
        endOrder: "END OF ORDER",
        thankYou: "Thank you for your purchase",
        printer: "Printer",
        noPrinters: "No printers configured",
        default: "Default",
        mode: "Mode",
        paper: "Paper",
        browserPrinterHelp:
            "Browser mode will open the system print dialog.",
        fallbackKitchenPrinter:
            'No printer is configured for "{{category}}". The kitchen printer is being used.',
        otherPrinters: "Other printers",
        printing: "Printing...",
        networkPrinter: "Network printer",
        close: "Close",
        openingPrintDialog: "Opening browser print dialog...",
        sendingToPrinter: "Sending ticket to printer...",
        sentSuccessfully: "Ticket sent successfully.",
        printFailed: "Ticket could not be printed.",
        business: "BUSINESS",
        note: "NOTE",
        subtotal: "Subtotal",
        discount: "Discount",
        tax: "Tax",
        charge: "Charge",
        serviceCharge: "Service charge",
        manualTip: "Manual tip",
        total: "TOTAL",
        payment: "Payment",
        includedShort: "incl.",
        automaticPaymentByChannel:
            "Payment method is automatically assigned by the channel",
    },

    bill: {
        items: "Items",
        note: "Note",
        edit: "Edit",
        add: "Add",
        noNote: "No note",
        orderNote: "Order note",
        notePlaceholder:
            "Example: No onions, mild spice, deliver to reception...",
        discount: "Discount",
        tip: "Tip",
        tipHelp: "Voluntary tip entered manually",
        taxes: "Taxes",
        taxesHelp: "Calculated according to each product",
        shipping: "Shipping",
        commission: "Commission",
        tax: "Tax",
        charge: "Charge",
        included: "included",
        recalculatingTaxes: "Recalculating taxes...",
        total: "Total",

        paymentMethods: {
            cash: "Cash",
            card: "Card",
            transfer: "Bank Transfer",
            credit: "Credit",
        },

        ticket: "Ticket",
        invoice: "Invoice",
        update: "Update",
        printTicket: "Print ticket",
        fiscalTicketBlocked:
            "Fiscal transactions must print an invoice, not a ticket.",

        customerDisplay: {
            review: "Review your order before paying.",
            empty: "Your order will appear here.",
            paid: "Invoice generated. Thank you for your purchase.",
        },

        fiscal: {
            ecfTitle: "Electronic Invoice e-CF",
            ncfTitle: "Fiscal Invoice (NCF)",
            ecfDescription:
                "Select whether this will be an electronic consumer invoice or electronic fiscal credit invoice.",
            ncfDescription:
                "Use only when requested by the customer and NCF is configured for this business.",
            ecfNotReady:
                "This business is not ready to issue e-CF.",
            ncfNotReady:
                "This business does not have NCF enabled or configured.",
            ncfType: "NCF Type",
            ecfType: "e-CF Type",
            e32: "e32 - Electronic Consumer Invoice",
            e31: "e31 - Electronic Fiscal Credit Invoice",
            b01: "B01 - Fiscal Credit",
            b02: "B02 - Final Consumer",
            e31Help:
                "For e31, enter the customer's RNC and legal name.",
            e32Help:
                "For e32, customer information is optional except in special cases.",
            ncfHelp:
                "Recommendation: enter RNC/Cédula to complete the customer information.",
            searching: "Searching DGII...",
            found: "Found.",
            notFound: "Not found.",
            lookupError: "Lookup error.",
            autocompleteFailed:
                "Could not autofill the information. Enter the name manually.",
            customerData: "Customer information",
            rncCedula: "RNC / Cédula",
            legalName: "Name / Legal name",
        },

        leaveTable: {
            title: "What would you like to do with this table?",
            description:
                "There are products on this table. You can save them to continue later or remove them before leaving.",
            products: "Products",
            currentTotal: "Current total",
            saving: "Saving...",
            save: "Save to table",
            discard: "Delete and leave",
            cancel: "Cancel",
        },

        cash: {
            title: "Cash change",
            description:
                "Enter the amount received from the customer to calculate the change.",
            exact: "Exact",
            received: "Amount received",
            placeholder: "Example: 1000",
            change: "Change due",
            missing: "Missing {{amount}}",
            sufficient:
                "Amount is sufficient to complete the invoice.",
        },

        messages: {
            orderAlreadyClosed:
                "The order was already closed. The cart was cleared to start a new sale.",
            paymentUpdated:
                "Payment method updated.",
            saveOrderFirst:
                "Save the order first before changing the payment method.",
            creditNotAllowed:
                "Your current plan does not allow credit sales.",
            creditNeedsCustomer:
                "A saved customer is required for a credit sale.",
            noItems:
                "There are no items in the cart to save.",
            noNewItems:
                "There are no new items to print.",
            invoiceGenerated:
                "Invoice generated successfully.",
            ecfGenerated:
                "e-CF issued successfully.",
            ecfFailed:
                "The e-CF could not be issued. The invoice should not be printed.",
            invoiceEcfFailed:
                "The invoice was generated, but the e-CF could not be issued.",
            closeTableSuccess:
                "Invoice closed and table released successfully.",
            closeTableError:
                "The invoice could not be closed and the table could not be released.",
            deleteTableItemsError:
                "The items could not be removed from the table.",
            autocompleteFailed:
                "Could not autofill the information. Enter the name manually.",
            e32BuyerRequired:
                "For e32 invoices of RD$250,000 or more, a valid buyer RNC/Cédula is required.",
            e31BuyerRequired:
                "For an e31 electronic fiscal credit invoice, enter a valid 9 or 11 digit RNC/Cédula.",
            b01BuyerRequired:
                "For B01 fiscal credit, enter a valid 9 or 11 digit RNC.",
        },

        production: {
            kitchen: "KITCHEN",
            bar: "BAR",
            production: "PRODUCTION",
        },
    },
    cart: {
        title:
            "Order Details",

        empty:
            "Your cart is empty. Start adding items.",

        added:
            "Added",

        product:
            "Product",

        extra:
            "Extra",

        ingredient:
            "Ingredient",

        withoutPrefix:
            "Without",

        note:
            "Note",

        basePrice:
            "Base price",

        extrasPerUnit:
            "Extras per unit",

        removeProduct:
            "Remove product",

        editCustomization:
            "Edit customization",

        editProductAria:
            "Edit {{product}}",

        addUnit:
            "Add one unit",
    },
    customerInfo: {
        finalConsumer:
            "Final Consumer",

        finalConsumerInitials:
            "FC",

        selectedTable:
            "Selected table",

        noPhone:
            "No phone number",

        table:
            "Table",

        editNamePhone:
            "Edit name and phone number",

        editCustomer:
            "Edit customer",

        title:
            "Customer Information",

        description:
            "This information will appear on the invoice.",

        customerName:
            "Customer name",

        namePlaceholder:
            "Example: John Smith",

        phone:
            "Phone",

        phonePlaceholder:
            "Example: 555-555-5555",

        taxIdentity:
            "Tax Identification",

        taxIdentityDescription:
            "Optional. It will be used on invoices and tax documents when applicable.",

        country:
            "Country",

        type:
            "Type",

        label:
            "Label",

        visibleNamePlaceholder:
            "Display name",

        taxNumber:
            "Tax number",

        taxNumberPlaceholder:
            "Tax identification number",

        emptyNameInfo:
            "You can leave the name blank and the invoice will use",

        saving:
            "Saving...",
        selectSavedCustomer:
            "Select saved customer",

        changeCustomer:
            "Change customer",

        savedCustomers: {
            title:
                "Saved customers",

            description:
                "Search and select a customer to assign to this order.",

            searchPlaceholder:
                "Search by name, phone number, or address...",

            loading:
                "Loading customers...",

            empty:
                "No customers to display.",

            current:
                "Current",

            selecting:
                "Selecting...",
        },

        messages: {
            updated:
                "Customer information updated.",

            updateFailed:
                "Customer information could not be updated.",

            invalidSavedCustomer:
                "The selected customer is invalid.",

            customerSelected:
                "Customer selected successfully.",

            customerSelectFailed:
                "The customer could not be selected.",

            customersLoadFailed:
                "Saved customers could not be loaded.",
        },
    },
    menu: {
        availableDishes:
            "Available Dishes",

        searchPlaceholder:
            "Search dishes...",

        uncategorized:
            "Uncategorized",

        editCustomization:
            "Edit customization",

        customizeProduct:
            "Customize product",

        customizationDescription:
            "Select extras and anything you want to remove.",

        extras:
            "Extras",

        extrasDescription:
            "The selected price is added to each unit of the product.",

        maximum:
            "Maximum {{count}}",

        removeIngredients:
            "Remove ingredients",

        removeIngredientsDescription:
            "Select only what should not be included.",

        withoutIngredient:
            "Without {{name}}",

        kitchenNoteOptional:
            "Kitchen note (optional)",

        kitchenNotePlaceholder:
            "Example: Sauce on the side, well done...",

        basePrice:
            "Base price",

        extrasPerUnit:
            "Extras per unit",

        totalUnits_one:
            "Total ({{count}} unit)",

        totalUnits_other:
            "Total ({{count}} units)",

        saveChanges:
            "Save changes",

        addToOrder:
            "Add to order",

        manualPrice:
            "Manual price",

        enterPrice:
            "Enter the price",

        manualPricePlaceholder:
            "Example: 350",

        add:
            "Add",

        added:
            "Added",

        loading:
            "Loading menu...",

        loadError:
            "Error loading menu.",

        noDishesAvailable:
            "No dishes available",

        noSearchResults:
            "No dishes found for “{{search}}”.",

        itemCount_one:
            "{{count}} item",

        itemCount_other:
            "{{count}} items",

        weight:
            "Weight",

        weightPlaceholder:
            "Example: 0.5",

        decrease:
            "Decrease {{name}}",

        increase:
            "Increase {{name}}",

        messages: {
            customizationDisabled:
                "Product customization is not enabled.",

            weightProductsNoEditor:
                "Products sold by weight do not use this customization editor.",

            productConfigNotFound:
                "The current configuration for this product could not be found.",

            quantityAtLeastOne:
                "Quantity must be at least 1.",

            productUpdateFailed:
                "This product could not be updated.",

            productUpdated:
                "{{name}} updated.",

            productAdded:
                "{{name}} x{{quantity}} added.",

            weightGreaterThanZero:
                "Weight must be greater than 0 {{unit}}.",

            invalidManualPrice:
                "Invalid manual price.",
        },
    },
    tableCard: {
        channel:
            "Channel",

        table:
            "Table",

        quick:
            "Quick",

        delivery:
            "Delivery",

        available:
            "Available",

        occupied:
            "Occupied",

        area:
            "Area",

        general:
            "General",

        seats:
            "Seats",

        noTable:
            "No table",

        tableAria:
            "Table {{table}}",
    },
    tables: {
        area:
            "Area",

        allAreas:
            "All",

        general:
            "General",

        loadingTables:
            "Loading tables...",

        table:
            "Table",

        seats:
            "Seats",

        currentOrder:
            "Current order",

        yes:
            "Yes",

        no:
            "No",

        openOrder:
            "Open order",

        goToMenu:
            "Go to menu",

        releaseTable:
            "Release table",

        releaseDescription:
            "The table will become available, but the active order will remain unchanged. It will not be cancelled or invoiced.",

        releasing:
            "Releasing...",

        confirmRelease:
            "Yes, release",

        quick:
            "Quick",

        delivery:
            "Delivery",

        shippingBadge:
            "DELIVERY",

        status: {
            available:
                "Available",

            occupied:
                "Occupied",

            reserved:
                "Reserved",
        },

        messages: {
            tableUpdated:
                "Table status updated.",

            tableUpdateFailed:
                "The table could not be updated.",

            occupiedNoPermission:
                "This table is occupied. You do not have permission to edit this order.",

            closedOrderLinked:
                "The table had a closed order associated with it. A new order will be opened.",

            tableIdNotFound:
                "The table ID could not be found.",

            releaseSuccess:
                "Table released successfully. The order remains unchanged.",

            releaseFailed:
                "The table could not be released.",
        },
    },
    menuPage: {
        documentTitle:
            "POS | Menu",

        customerName:
            "Customer Name",

        selectedTable:
            "Selected table",

        table:
            "Table",

        customerDisplay: {
            title:
                "Customer display",

            open:
                "Open customer display",

            open7:
                'Open 7" display',

            open116:
                'Open 11.6" display',

            review:
                "Review your order on the screen.",

            empty:
                "Your order will appear here.",
        },

        leaveTable: {
            title:
                "What would you like to do with this table?",

            description:
                "You have items in the order. You can save them to the table and continue later, or remove them before leaving.",

            products:
                "Products",

            currentTotal:
                "Current total",

            processing:
                "Processing...",

            save:
                "Save to table",

            discard:
                "Delete and leave",
        },

        messages: {
            itemsSaved:
                "Products saved to the table.",

            saveFailed:
                "The products could not be saved to the table.",

            itemsRemoved:
                "Products removed from the table.",

            removeFailed:
                "The products could not be removed from the table.",
        },
    },
    homeGreeting: {
        morning:
            "Good morning",

        afternoon:
            "Good afternoon",

        evening:
            "Good evening",

        user:
            "User",

        messages: {
            morning:
                "Manage your operations efficiently",

            afternoon:
                "Keep providing excellent service to your customers",

            evening:
                "Review today's summary and get ready for tomorrow",
        },
    },
    messages: {
        loadOrdersFailed:
            "Failed to load orders.",
    },
        cashGate: {
            pendingTitle: "Previous register still open",
            pendingDescription: "Close the previous cash session before opening today's register.",
            pendingDate: "Pending date",
            register: "Register",
            openingFloat: "Opening float",
            goToClose: "Go to cash register",
            openTitle: "Open cash register",
            openDescription: "Record the opening cash balance before using the system.",
            openingAmount: "Opening amount",
            amountPlaceholder: "e.g. 2000",
            saving: "Saving...",
            saveOpening: "Save opening balance",
            closeTitle: "Close this window?",
            closeDescription: "You cannot record sales until the cash register has been opened with an opening balance.",
            cancel: "Cancel",
            close: "Close"
        },
    homeDashboard: {
        pageTitle:
            "POS | Home",

        miniCard: {
            activeOrders:
                "Active Orders",

            completedOrders:
                "Completed Orders",

            totalEarnings:
                "Total Earnings",

            revenue:
                "Revenue",

            comparedToYesterday:
                "vs yesterday",
        },

        orderStatus: {
            inProgress:
                "In Progress",

            ready:
                "Ready",

            completed:
                "Completed",

            cancelled:
                "Cancelled",
        },

        orderList: {
            customer:
                "Customer",

            table:
                "Table",

            itemCount_one:
                "{{count}} item",

            itemCount_other:
                "{{count}} items",
        },

        recentOrders: {
            title:
                "Recent Orders",

            searchPlaceholder:
                "Search your recent orders...",

            showMore:
                "Show more",

            showLess:
                "Show less",

            empty:
                "No orders available",

            loadError:
                "Something went wrong while loading the orders.",
        },

        popularDishes: {
            title:
                "Popular Dishes",

            category:
                "Category",

            sold:
                "Sold",

            revenue:
                "Revenue",

            uncategorized:
                "Uncategorized",

            loading:
                "Loading dishes...",

            loadError:
                "Error loading dishes.",

            empty:
                "No dishes available yet.",
        },
    },
    bottomNav: {
        superAdminPanel:
            "SuperAdmin Panel",

        selectTable:
            "Select table",

        selectTableDescription:
            "Choose a table before going to the menu.",

        table:
            "Table",

        general:
            "General",

        continueWithoutTable:
            "Continue without a table",

        home:
            "Home",

        orders:
            "Orders",

        tables:
            "Tables",

        cashRegister:
            "Cash Register",

        admin:
            "Admin",

        createOrder:
            "Create Order",

        createNewOrder:
            "Create New Order",

        savedCustomerSearch:
            "Search saved customer",

        searchCustomer:
            "Search customer",

        customerSelected:
            "Customer selected",

        optional:
            "Optional",

        searchCustomerPlaceholder:
            "Search by name, phone number or address...",

        clear:
            "Clear",

        loadingCustomers:
            "Loading customers...",

        noCustomers:
            "No customers to display.",

        noPhone:
            "No phone number",

        close:
            "Close",

        customerName:
            "Customer Name",

        customerNamePlaceholder:
            "Enter customer name",

        customerPhoneOptional:
            "Customer Phone (optional)",

        addressOptional:
            "Address (optional)",

        addressPlaceholder:
            "Example: 123 Main Street, Apt. 2...",

        guests:
            "Guests",

        personCount_one:
            "{{count}} person",

        personCount_other:
            "{{count}} people",

        creating:
            "Creating...",

        selectCustomer:
            "Select customer",

        messages: {
            createOrderMissingId:
                "The order could not be created.",

            createOrderFailed:
                "Error creating the order.",

            phoneExists:
                "This phone number already exists. Using the saved customer.",

            customerSaveFailed:
                "The customer could not be saved, but you can continue with the name entered.",
        },
    },

    header: {
        inventoryNotifications:
            "Inventory notifications",

        inventoryPlanRequired:
            "Inventory is available only on Premium/Standard plans",

        inventory:
            "Inventory",

        lowStockCount:
            "Low stock: {{count}}",

        loading:
            "Loading...",

        noLowStockAlerts:
            "There are no low-stock alerts.",

        stock:
            "Stock",

        minimum:
            "Min",

        lowStock:
            "Low stock",

        viewInventory:
            "View inventory",

        close:
            "Close",

        testUser:
            "TEST USER",

        userFallback:
            "User",

        roleFallback:
            "Role",

        theme:
            "Theme",

        dark:
            "Dark",

        light:
            "Light",

        logout:
            "Log Out",

        roles: {
            cashier:
                "Cashier",

            waiter:
                "Waiter",

            owner:
                "Owner",

            admin:
                "Admin",

            superAdmin:
                "SuperAdmin",
        },
    },
    splitBilling: {
        title:
            "Split Bill",

        description:
            "Assign item quantities to each account. You can then charge each account separately.",

        accountNumber:
            "Account {{number}}",

        splitEqually:
            "Split equally",

        splitByAmountComingSoon:
            "Split by amount (coming soon)",

        splitByAmountTooltip:
            "This will be added in the next step because assigning custom amounts requires additional controls.",

        orderItems:
            "Order items",

        totalAllocated:
            "Total allocated",

        quantity:
            "Qty",

        unitPrice:
            "Unit",

        remaining:
            "Remaining",

        accounts:
            "Accounts",

        add:
            "Add",

        noItemsAssigned:
            "No items are assigned to this account.",

        subtotal:
            "Subtotal",

        versionNote:
            "Note: in this version, tax and tip are calculated afterward, either proportionally or manually.",

        close:
            "Close",

        validation: {
            allocateAll:
                "You must assign 100% of all item quantities before saving.",
        },

        invoices: {
            title:
                "Split Invoices",

            description:
                "Select an account to view or print its invoice.",

            viewPrint:
                "View / Print",

            moreItems_one:
                "+{{count}} more item…",

            moreItems_other:
                "+{{count}} more items…",
        },
    },
    orderCard: {
        correction: {
            action: "Correct order",
            history: "Correction history",
            title: "Correct non-fiscal order",
            help: "Correct items, extras, taxes, tips and payment methods with audit tracking. Issued fiscal documents stay locked.",
            note: "Order notes",
            reason: "Reason for correction (required)",
            minReason: "Enter at least 8 characters. This will be recorded in the audit trail.",
            saved: "Correction saved",
            failed: "The correction could not be saved. Check permissions and order status.",
            OPEN_CASH_SESSION_REQUIRED: "Payment method cannot be changed without the original open cash session.",
            FISCAL_OR_CREDIT_ORDER_LOCKED: "Fiscal or credit orders cannot be corrected here.",
            ECF_DOCUMENT_EXISTS: "This order has an electronic document and cannot be edited.",
            ORDER_CHANGED_RELOAD: "This order has changed. Reload and try again.",
            method: { cash: "Cash", card: "Card", transfer: "Transfer", other: "Other" },
        },
        noNumber:
            "No number",

        dineIn:
            "Dine in",

        withoutIngredient:
            "Without {{name}}",

        itemFallback:
            "Item",

        extraFallback:
            "Extra",

        ingredientFallback:
            "Ingredient",

        userFallback:
            "User",

        customerFallback:
            "Customer",

        invoice:
            "Invoice",

        table:
            "Table",

        customer:
            "Customer",

        statusLabel:
            "Status",

        items:
            "Items",

        note:
            "Note",

        productTypes:
            "Product types",

        statusHistory:
            "Status history",

        createdAt:
            "Created at",

        type:
            "Type",

        actionsLabel:
            "Actions",

        noProducts:
            "No products.",

        changedBy:
            "by {{name}}",

        page:
            "Page {{current}}/{{total}}",

        showingLines:
            "Showing {{start}}-{{end}} of {{total}} lines",

        guestCount_one:
            "{{count}} guest",

        guestCount_other:
            "{{count}} guests",

        itemCount_one:
            "{{count}} item",

        itemCount_other:
            "{{count}} items",

        accountCount_one:
            "{{count}} account",

        accountCount_other:
            "{{count}} accounts",

        splitAccountBadge_one:
            "Split bill: {{count}} account",

        splitAccountBadge_other:
            "Split bill: {{count}} accounts",

        waitTime: {
            justArrived:
                "Just arrived",

            waiting:
                "Waiting a while",

            delayed:
                "Taking longer",
        },

        status: {
            inProgress:
                "In Progress",

            ready:
                "Ready",

            completed:
                "Completed",

            cancelled:
                "Cancelled",

            pending:
                "Pending",
        },

        actions: {
            back:
                "Back",

            complete:
                "Complete",

            options:
                "Options",

            next:
                "Next",

            markReady:
                "Mark as Ready",

            markComplete:
                "Mark as Complete",

            markCompleted:
                "Mark as completed",

            reactivate:
                "Reactivate order",

            viewInvoice:
                "View invoice",

            generateInvoice:
                "Generate invoice",

            splitPayment:
                "Split Payment",

            cancelOrder:
                "Cancel Order",
        },

        details: {
            title:
                "Order Details",
        },

        cancelModal: {
            title:
                "Cancel order",

            description:
                "You can add or edit the note before cancelling this order.",

            noteLabel:
                "Order note",

            notePlaceholder:
                "Example: Customer cancelled, product unavailable, duplicate order...",

            cancelling:
                "Cancelling...",
        },

        messages: {
            splitSaved:
                "Split saved. Select an account to print.",

            splitSaveFailed:
                "The split could not be saved.",

            invoiceUnavailable:
                "This order does not have an invoice available.",

            invoiceOpenFailed:
                "The invoice could not be opened.",

            invoiceGenerateFailed:
                "The invoice could not be generated.",

            invoiceOpenGenerateFailed:
                "Error opening or generating the invoice.",

            cancelNotAllowed:
                "You do not have permission to cancel orders.",

            paymentSuccess:
                "Order charged successfully.",

            paymentFailed:
                "The order could not be charged.",
        },
    },
    ordersPage: {
        correctionHistoryAll: "Correction history",
        pageTitle:
            "POS | Orders",

        title:
            "Orders",

        updating:
            "Updating",

        date:
            "Date",

        type:
            "Type",

        allTypes:
            "All",

        dateFilters: {
            last24h:
                "Last 24 hours",

            last7Days:
                "7 days",

            all:
                "All",
        },

        statusTabs: {
            all:
                "All",
        },

        viewModes: {
            display:
                "Display",

            list:
                "List",

            comfortable:
                "Comfortable",

            compact:
                "Compact",
        },

        noCategories:
            "No categories available.",

        loading:
            "Loading orders...",

        loadError:
            "Orders could not be loaded.",

        retry:
            "Retry",

        showingOrders:
            "Showing {{visible}} of {{total}} orders · {{date}}.",

        sortedNewestBottom:
            "Sorted with the newest orders at the bottom.",

        loadMorePrevious:
            "Load earlier orders",

        empty:
            "No orders to display.",

        messages: {
            newOrdersReceived_one:
                "{{count}} new order received",

            newOrdersReceived_other:
                "{{count}} new orders received",
        },
    },
    accountsReceivable: {
        title:
            "Accounts Receivable",

        description:
            "Manage credit sales, installments, partial payments, and outstanding balances.",

        searchPlaceholder:
            "Search customer, phone number, or invoice...",

        customerFallback:
            "Customer",

        noPhone:
            "No phone number",

        invoice:
            "Invoice",

        amount:
            "Amount",

        paidAmount:
            "Paid",

        balance:
            "Balance",

        noActions:
            "No actions",

        loading:
            "Loading accounts receivable...",

        empty:
            "There are no accounts receivable for this filter.",

        summary: {
            openBalance:
                "Outstanding balance",

            pending:
                "Pending",

            partial:
                "Partial",

            totalPaid:
                "Total paid",
        },
        grouped: {
            accountsLabel:
                "Accounts",

            accounts_one:
                "{{count}} account",

            accounts_other:
                "{{count}} accounts",

            totalCredit:
                "Total credit",

            showDetails:
                "View debts and dates",

            hideDetails:
                "Hide debts",

            creditDetails:
                "Account details",

            creditDetailsDescription:
                "Invoices, dates, and outstanding balances for {{name}}.",

            saleDate:
                "Sale date",

            dueDate:
                "Due date",

            noDueDate:
                "No due date",
        },

        filters: {
            open:
                "Open",

            pending:
                "Pending",

            partial:
                "Partial",

            paid:
                "Paid",

            void:
                "Voided",
        },

        status: {
            pending:
                "Pending",

            partial:
                "Partial",

            paid:
                "Paid",

            void:
                "Voided",
        },

        actions: {
            partialPayment:
                "Add payment",

            fullPayment:
                "Pay in full",
        },

        table: {
            customer:
                "Customer",

            invoice:
                "Invoice",

            date:
                "Date",

            amount:
                "Amount",

            paid:
                "Paid",

            balance:
                "Balance",

            status:
                "Status",

            actions:
                "Actions",
        },

        paymentMethods: {
            cash:
                "Cash",

            card:
                "Card",

            transfer:
                "Bank Transfer",

            other:
                "Other",
        },

        paymentModal: {
            title:
                "Register Payment",

            amountReceived:
                "Amount received",

            paymentMethod:
                "Payment method",

            optionalNote:
                "Optional note",

            notePlaceholder:
                "Example: payment received at the register...",

            saving:
                "Saving...",

            registerPayment:
                "Register payment",
        },

        messages: {
            noAccountSelected:
                "No account selected.",

            invalidAmount:
                "Invalid amount.",

            selectRegisterBeforePayment:
                "You must select a cash register before recording the payment.",

            paymentExceedsBalance:
                "The payment cannot exceed the outstanding balance of {{amount}}.",

            paymentSuccess:
                "Payment registered successfully.",

            paymentFailed:
                "The payment could not be registered.",

            loadFailed:
                "Accounts receivable could not be loaded.",
        },
    },
    admin: {
        loading:
            "Loading...",

        navigation:
            "Navigation",

        comingSoon:
            "Coming soon",

        comingSoonDescription:
            "This feature will be available soon.",

        header: {
            eyebrow:
                "Admin Dashboard",

            title:
                "Administration Panel",

            description:
                "Manage your team, review reports, and monitor your plan usage.",

            registerUser:
                "Register User",
        },

        metrics: {
            currentPlan:
                "Current plan",

            users:
                "Users",

            team:
                "Team",

            totalActive:
                "Total active",

            tablesAndDishes:
                "Tables & Dishes",

            tables:
                "tables",

            dishes:
                "dishes",

            limit:
                "Limit",
        },

        menu: {
            sections: {
                reportsAnalysis:
                    "Reports & Analytics",

                staffManagement:
                    "Staff Management",

                restaurant:
                    "Restaurant",

                billingConfiguration:
                    "Billing & Configuration",

                inventory:
                    "Inventory",

                financialManagement:
                    "Financial Management",

                settings:
                    "Settings",
            },

            items: {
                cashRegister: {
                    label:
                        "Cash Register",

                    description:
                        "Manage daily cash register closing",
                },

                accountsReceivable: {
                    label:
                        "Accounts Receivable",

                    description:
                        "Manage credit sales, installments, and outstanding balances",
                },

                salesReports: {
                    label:
                        "Sales Reports",

                    description:
                        "Basic sales and billing reports",
                },

                productReports: {
                    label:
                        "Product Reports",

                    description:
                        "Best-selling products and product-level analysis",
                },

                financialAnalysis: {
                    label:
                        "Financial Analysis",

                    description:
                        "Detailed financial analysis",
                },

                employees: {
                    label:
                        "Employees",

                    description:
                        "Manage employees",
                },

                payroll: {
                    label:
                        "Payroll",

                    description:
                        "Create payroll runs and post expenses",
                },

                schedules: {
                    label:
                        "Schedules & Shifts",

                    description:
                        "Manage work schedules",
                },

                attendance: {
                    label:
                        "Attendance",

                    description:
                        "Track attendance",
                },

                branches: {
                    label: "Branches",
                    description: "Manage locations and shared menus",
                },
                menuManagement: {
                    label:
                        "Menu Management",

                    description:
                        "Manage dishes, products, and basic categories",
                },

                tablesManagement: {
                    label:
                        "Table Management",

                    description:
                        "Manage restaurant tables",
                },

                inventoryCategories: {
                    label:
                        "Inventory Categories",

                    description:
                        "Organize inventory categories",
                },

                regionalConfig: {
                    label:
                        "Regional Settings",

                    description:
                        "Country, currency, language, time zone, date, time, and units",
                },

                taxConfig: {
                    label:
                        "Taxes",

                    description:
                        "Rates, product taxes, and general tax rules",
                },

                serviceCharges: {
                    label:
                        "Charges & Tips",

                    description:
                        "Manual tips, service charges, and automatic charges",
                },

                billingGeneral: {
                    label:
                        "General Billing",

                    description:
                        "Logo, discounts, pre-invoice, and billing behavior",
                },

                deliveryChannels: {
                    label:
                        "Delivery & Channels",

                    description:
                        "In-house delivery, PedidosYa, Uber Eats, and commissions",
                },

                taxIdentity: {
                    label:
                        "Tax Identification",

                    description:
                        "RNC, EIN, VAT, ABN, and other tax identifiers",
                },

                printers: {
                    label:
                        "Printer Configuration",

                    description:
                        "Manage ticket and invoice printers",
                },

                suppliers: {
                    label:
                        "Suppliers",

                    description:
                        "Manage suppliers",
                },

                stockControl: {
                    label:
                        "Stock Control",

                    description:
                        "Ingredient inventory and stock",
                },

                expenseCategories: {
                    label:
                        "Expense Categories",

                    description:
                        "Create or edit expense categories",
                },

                expenses: {
                    label:
                        "Expense Entry",

                    description:
                        "Record operating expenses",
                },

                expenseSummary: {
                    label:
                        "Expense Report",

                    description:
                        "Expense summary and analysis",
                },

                notifications: {
                    label:
                        "Notifications",

                    description:
                        "Configure business notifications",
                },

                help: {
                    label:
                        "Help & Support",

                    description:
                        "Documentation and help",
                },
            },
        },

        plan: {
            subscription:
                "Subscription",

            currentPlan:
                "Current Plan",

            usageDescription:
                "Usage based on your tenant resources.",

            upgrade:
                "Upgrade plan",

            totalUsers:
                "Total users",

            admins:
                "Admins",

            cashiers:
                "Cashiers",

            waiters:
                "Waiters",

            dishes:
                "Dishes",

            tables:
                "Tables",

            remaining_one:
                "{{count}} left",

            remaining_other:
                "{{count}} left",

            upgradeMessages: {
                emprendedor:
                    "Need more capacity and modules? Upgrade to ESTÁNDAR, PREMIUM, or PRO.",

                estandar:
                    "Need more advanced features? Upgrade to PREMIUM or PRO.",

                premium:
                    "Want to unlock all available features? Upgrade to PRO.",
            },
        },
    },
    suppliers: {
        title:
            "Suppliers",

        description:
            "Manage your restaurant suppliers.",

        searchPlaceholder:
            "Search by name, RNC, phone number, or email...",

        loading:
            "Loading suppliers...",

        loadError:
            "Error loading suppliers.",

        empty:
            "No suppliers available.",

        contact:
            "Contact: {{name}}",

        confirmDelete:
            'Are you sure you want to delete "{{name}}"?',

        summary: {
            total:
                "Total Suppliers",

            active:
                "Active Suppliers",

            inactive:
                "Inactive Suppliers",
        },

        status: {
            active:
                "Active",

            inactive:
                "Inactive",
        },

        actions: {
            addSupplier:
                "Add Supplier",

            edit:
                "Edit",

            delete:
                "Delete",

            saving:
                "Saving...",

            update:
                "Update",

            add:
                "Add",
        },

        modal: {
            editTitle:
                "Edit Supplier",

            addTitle:
                "Add New Supplier",
        },

        fields: {
            name:
                "Supplier Name",

            phone:
                "Phone",

            email:
                "Email",

            contactPerson:
                "Contact Person",

            status:
                "Status",

            address:
                "Address",

            notes:
                "Notes",
        },

        messages: {
            createSuccess:
                "Supplier created successfully.",

            createFailed:
                "Error creating supplier.",

            updateSuccess:
                "Supplier updated successfully.",

            updateFailed:
                "Error updating supplier.",

            deleteSuccess:
                "Supplier deleted successfully.",

            deleteFailed:
                "Error deleting supplier.",

            nameRequired:
                "Supplier name is required.",
        },
    },
    tablesManagement: {
        title:
            "Table Management",

        description:
            "Add, edit, and manage your restaurant tables.",

        searchPlaceholder:
            "Search by table number, status, or area...",

        loading:
            "Loading tables...",

        loadError:
            "Error loading tables.",

        empty:
            "No tables available.",

        seats:
            "Seats",

        statusLabel:
            "Status",

        activeOrder:
            "Active order",

        summary: {
            total:
                "Total Tables",

            available:
                "Available Tables",

            occupied:
                "Occupied Tables",
        },

        status: {
            available:
                "Available",

            occupied:
                "Occupied",

            reserved:
                "Reserved",
        },

        areas: {
            general:
                "General",

            terrace:
                "Terrace",

            vip:
                "VIP",

            bar:
                "Bar",

            diningRoom:
                "Dining Room",
        },

        fields: {
            tableNumber:
                "Table Number",

            seats:
                "Number of Seats",

            area:
                "Area",
        },

        modal: {
            editTitle:
                "Edit Table",

            addTitle:
                "Add New Table",
        },

        actions: {
            addTable:
                "Add Table",

            edit:
                "Edit",

            delete:
                "Delete",

            saving:
                "Saving...",

            deleting:
                "Deleting...",

            update:
                "Update",

            add:
                "Add",
        },

        deleteConfirm: {
            title:
                "Confirm deletion",

            thisTable:
                "this table",

            description:
                "You are about to delete {{name}}. This action cannot be undone.",
        },

        messages: {
            createSuccess:
                "Table added successfully.",

            createFailed:
                "Error adding table.",

            updateSuccess:
                "Table updated successfully.",

            updateFailed:
                "Error updating table.",

            deleteSuccess:
                "Table deleted successfully.",

            deleteFailed:
                "Error deleting table.",
        },
    },
    taxIdentityConfig: {
        title:
            "Tax Identification",

        description:
            "Configure your business's legal and tax identity without mixing it with taxes, NCF, or e-CF settings.",

        loading:
            "Loading tax identification...",

        loadError:
            "Error loading tax identification.",

        status: {
            active:
                "Active",

            inactive:
                "Inactive",
        },

        enableSection: {
            title:
                "Business tax identity",

            description:
                "When enabled, these details can be reused on invoices, receipts, exports, and future tax integrations.",

            toggleAria:
                "Enable or disable business tax identity",
        },

        primarySection: {
            title:
                "Primary details",

            description:
                "The selected country determines the suggested preset for the primary tax identification.",
        },

        regionalCountry: {
            current:
                "Current regional country:",

            use:
                "Use regional country",
        },

        primaryId: {
            title:
                "Primary identification",

            countryPreset:
                "Country preset",

            genericPreset:
                "Generic preset",
        },

        fields: {
            primaryTaxCountry:
                "Primary tax country",

            legalNamePlaceholder:
                "Registered legal business name",

            type:
                "Type",

            label:
                "Label",

            visibleNamePlaceholder:
                "Display name",

            country:
                "Country",

            numberValue:
                "Number / Value",

            taxIdentifierPlaceholder:
                "Tax identifier",

            taxNumber:
                "tax number",
        },

        additional: {
            title:
                "Additional tax identifications",

            description:
                "Optional. Useful for businesses that use more than one tax registration or registrations from different countries.",

            add:
                "Add identification",

            empty:
                "No additional tax identifications are configured.",

            identifierNumber:
                "Identification #{{number}}",

            removeAria:
                "Remove identification {{number}}",

            useWhenApplicable:
                "Use this identification when applicable.",

            toggleAria:
                "Enable or disable identification {{number}}",

            defaultLabel:
                "Tax identification",
        },

        validation: {
            legalNameRequired:
                "Enter the business's legal or registered name.",

            typeRequired:
                "Enter the primary tax identification type.",

            valueRequired:
                "Enter the business's {{label}}.",
        },

        messages: {
            maxAdditional:
                "You can add up to 10 additional tax identifications.",

            saveSuccess:
                "Tax identification saved successfully.",
        },

        errors: {
            countryInvalid:
                "The tax identification country is invalid.",

            legalNameRequired:
                "The business legal or registered name is required.",

            typeRequired:
                "The primary tax identification type is required.",

            valueRequired:
                "The primary tax identification number is required.",

            tooManyIdentifiers:
                "Only up to 10 additional tax identifications are allowed.",

            saveFailed:
                "The tax identification could not be saved.",
        },

        info:
            "This configuration only stores the business's tax identity. It does not enable taxes, NCF, or electronic invoicing. For the Dominican Republic, the legacy RNC already stored for the business is shown here automatically until you save this screen.",

        actions: {
            saving:
                "Saving...",

            saveChanges:
                "Save Changes",
        },
    },
    serviceChargeConfig: {
        title:
            "Charges & Services",

        description:
            "Configure automatic percentage-based charges separately from taxes and manual tips.",

        enable: {
            title:
                "Enable automatic charges",

            description:
                "Allows legal tips, service charges, or other charges to be applied to a sale.",
        },

        actions: {
            legalTipAdded:
                "Legal tip added",

            addLegalTip:
                "Add 10% Legal Tip",

            addCharge:
                "Add charge",

            deleteCharge:
                "Delete charge",
        },

        empty:
            "No automatic charges are configured.",

        noCode:
            "NO CODE",

        chargeFallback:
            "Charge {{number}}",

        defaults: {
            newChargeName:
                "New charge",

            legalTipName:
                "Legal tip",
        },

        fields: {
            name:
                "Name",

            code:
                "Code",

            percentage:
                "Percentage (%)",

            calculationBase:
                "Calculation base",
        },

        calculationBase: {
            net:
                "Subtotal after discount",

            afterTax:
                "After taxes",
        },

        options: {
            active: {
                title:
                    "Active",

                description:
                    "Enable or disable this charge.",
            },

            deliveryOrders: {
                title:
                    "Apply to Delivery orders",

                description:
                    "When disabled, this charge will not apply to sales from the Delivery channel.",
            },

            deliveryFee: {
                title:
                    "Include delivery fee in calculation base",

                description:
                    "The delivery amount will also be included in the base used to calculate the percentage.",
            },

            addToTotal: {
                title:
                    "Add to total",

                description:
                    "Adds the calculated amount to the total paid by the customer.",
            },
        },

        info:
            "These charges are separate from taxes. For example, you can have 18% ITBIS, a 10% legal tip, and an additional manual tip entered by the cashier.",
    },
    reportsPage: {
        title:
            "Reports",

        loading:
            "Loading...",

        loadError:
            "Error loading reports",

        empty:
            "No results found",

        notAvailable:
            "Not available",

        finalConsumer:
            "Final Consumer",

        taxFallback:
            "Tax",

        orderCount_one:
            "{{count}} order",

        orderCount_other:
            "{{count}} orders",

        filters: {
            allMethods:
                "All payment methods",

            userPlaceholder:
                "User (employee)",

            customerPlaceholder:
                "Customer",
        },

        paymentMethods: {
            cash:
                "Cash",

            card:
                "Card",

            transfer:
                "Bank Transfer",

            pedidosYa:
                "PedidosYa",

            uberEats:
                "Uber Eats",

            delivery:
                "Delivery",

            other:
                "Other",
        },

        cashClosure: {
            title:
                "Cash Summary",

            total:
                "Total",
        },

        table: {
            date:
                "Date",

            user:
                "User",

            customer:
                "Customer",

            method:
                "Payment Method",

            total:
                "Total",

            invoice:
                "Invoice",
        },

        actions: {
            exportExcel:
                "Export to Excel",

            viewInvoice:
                "View invoice",

            download:
                "Download",
        },

        messages: {
            invoiceUrlMissing:
                "The invoice could not be retrieved because no URL was returned.",

            invoiceLoadFailed:
                "Error loading the invoice.",

            exportFailed:
                "Error exporting the file.",
        },

        export: {
            sheetName:
                "Reports",

            fileName:
                "orders_report.xlsx",

            columns: {
                date:
                    "Date",

                user:
                    "User",

                customer:
                    "Customer",

                customerTaxCountry:
                    "Customer Tax Country",

                taxIdType:
                    "Tax Identification Type",

                taxIdLabel:
                    "Tax Identification Label",

                taxIdNumber:
                    "Tax Identification Number",

                method:
                    "Payment Method",

                channel:
                    "Channel",

                subtotal:
                    "Subtotal",

                discount:
                    "Discount",

                taxTotal:
                    "Total Taxes",

                taxBreakdown:
                    "Tax Breakdown",

                tip:
                    "Tip",

                serviceCharge:
                    "Service Charge",

                shipping:
                    "Delivery Fee",

                total:
                    "Total",

                currency:
                    "Currency",
            },
        },
    },
    regionalTaxConfig: {
        regional: {
            title:
                "Regional Settings",

            description:
                "Define the country, currency, language, time zone, and general formats used by the business.",

            countryHelp:
                "Selecting a country applies recommended regional defaults. You can modify them manually before saving.",

            fields: {
                country:
                    "Country",

                language:
                    "Language",

                currency:
                    "Currency",

                locale:
                    "Locale",

                timezone:
                    "Time zone",

                dateFormat:
                    "Date format",

                timeFormat:
                    "Time format",

                measurementSystem:
                    "Measurement system",

                weightUnit:
                    "Weight unit",
            },

            timeFormats: {
                hour12:
                    "12-hour",

                hour24:
                    "24-hour",
            },

            measurementSystems: {
                imperial:
                    "Imperial",

                metric:
                    "Metric",
            },

            weightUnits: {
                lb:
                    "Pounds (lb)",

                kg:
                    "Kilograms (kg)",
            },

            info:
                "The selected country only provides recommended regional defaults. Taxes are independent and can be configured according to the business's tax requirements.",
        },

        taxes: {
            title:
                "Taxes",

            description:
                "Create the taxes used by this business. They are not required to be tied to the selected country.",

            enable: {
                title:
                    "Enable taxes",

                description:
                    "When disabled, the POS will not apply taxes.",
            },

            configuredTitle:
                "Configured taxes",

            configuredDescription:
                "You can use different tax rates for different products.",

            empty:
                "No taxes are configured.",

            taxFallback:
                "Tax {{number}}",

            defaults: {
                newTax:
                    "New tax",
            },

            status: {
                default:
                    "Default",

                inactive:
                    "Inactive",
            },

            actions: {
                addTax:
                    "Add tax",

                useDefault:
                    "Set as default",
            },

            fields: {
                name:
                    "Name",

                code:
                    "Code",

                percentage:
                    "Percentage (%)",
            },

            options: {
                active:
                    "Active",

                includedInPrice:
                    "Included in price",

                deliveryFee:
                    "Apply to delivery fee",
            },

            info:
                "Disabling a tax is preferable to removing it. Sales keep a snapshot of the tax that was applied so historical invoices do not change.",
        },
    },
    productReports: {
        title:
            "Product Reports",

        description:
            "Analysis of best-selling products and categories.",

        loading:
            "Loading reports...",

        loadError:
            "Error loading reports",

        units:
            "units",

        topByQuantity:
            "Top 10 Best-Selling Products (by Quantity)",

        topByRevenue:
            "Top 10 Products by Revenue",

        fallbacks: {
            unknownProduct:
                "Unknown Product",

            uncategorized:
                "Uncategorized",
        },

        actions: {
            exportExcel:
                "Export to Excel",
        },

        filters: {
            from:
                "From date",

            to:
                "To date",
        },

        summary: {
            totalProducts:
                "Total Products",

            uniqueProductsSold:
                "Unique products sold",

            totalCategories:
                "Total Categories",

            activeCategories:
                "Active categories",

            totalRevenue:
                "Total Revenue",

            fromProducts:
                "From products",
        },

        allProducts: {
            title:
                "All Products",

            searchPlaceholder:
                "Search by name...",

            empty:
                "No products found.",
        },

        table: {
            product:
                "Product",

            category:
                "Category",

            totalQuantity:
                "Total Quantity",

            totalRevenue:
                "Total Revenue",

            averagePrice:
                "Average Price",

            orders:
                "Orders",
        },

        categories: {
            title:
                "Sales by Category",

            quantitySold:
                "Quantity sold",

            orders:
                "Orders",
        },

        messages: {
            exportFailed:
                "Error exporting the file.",
        },

        export: {
            sheetName:
                "Product Reports",

            filePrefix:
                "product_reports",

            columns: {
                product:
                    "Product",

                category:
                    "Category",

                quantitySold:
                    "Quantity Sold",

                totalRevenue:
                    "Total Revenue",

                orders:
                    "Orders",

                averagePrice:
                    "Average Price",
            },
        },
    },
    printersConfig: {
        title:
            "Printer Management",

        description:
            "Create and manage multiple printers for this business.",

        loading:
            "Loading printers...",

        empty:
            "No printers are registered.",

        noName:
            "No name",

        fields: {
            alias:
                "Alias",

            name:
                "Name",

            category:
                "Category",

            mode:
                "Mode",

            type:
                "Type",

            paperSize:
                "Paper size",

            port:
                "Port",

            notes:
                "Notes",
        },

        categories: {
            ticket:
                "General Ticket",

            invoice:
                "Invoice",

            kitchen:
                "Kitchen",

            bar:
                "Bar",

            delivery:
                "Delivery",

            other:
                "Other",
        },

        modes: {
            browser:
                "Browser",

            qz:
                "QZ Tray",

            network:
                "Network",
        },

        types: {
            thermal:
                "Thermal",

            laser:
                "Laser",

            inkjet:
                "Inkjet",

            escpos:
                "ESC/POS",

            other:
                "Other",
        },

        filters: {
            all:
                "All",
        },

        registered: {
            title:
                "Registered Printers",
        },

        status: {
            default:
                "Default",
        },

        actions: {
            saveChanges:
                "Save Changes",

            addPrinter:
                "Add Printer",

            cancelEdit:
                "Cancel Editing",

            setDefault:
                "Set as Default",

            edit:
                "Edit",

            delete:
                "Delete",
        },
    },
    planUsageWidget: {
        loading:
            "Loading plan usage...",

        loadError:
            "Error loading plan usage. Please try again later.",

        subscription:
            "Subscription",

        currentPlan:
            "Current Plan",

        usageDescription:
            "Usage based on your business resources.",

        limitHint:
            "Reached your limit? Upgrade your plan to get more users, tables, and dishes.",

        remaining_one:
            "{{count}} left",

        remaining_other:
            "{{count}} left",

        resources: {
            totalUsers:
                "Total Users",

            admins:
                "Admins",

            cashiers:
                "Cashiers",

            waiters:
                "Waiters",

            dishes:
                "Dishes",

            tables:
                "Tables",
        },

        actions: {
            upgradePlan:
                "Upgrade Plan",
        },

        modal: {
            title:
                "Upgrade Your Plan",

            currentPlanPrefix:
                "Your current plan is",

            description:
                "To unlock higher limits for users, dishes, and tables, contact our support team or your account manager.",

            benefits: {
                employees:
                    "More employees, including administrators, cashiers, and waiters.",

                tablesAndDishes:
                    "More tables and dishes for your restaurant.",

                multiBranch:
                    "Multi-branch support on higher plans.",
            },
        },
    },
    payrollRuns: {
        title:
            "Payroll",

        confirmPost:
            "Post this payroll run? This will automatically create an expense in Expenses.",

        fields: {
            from:
                "From",

            to:
                "To",

            payDate:
                "Pay Date",
        },

        summary: {
            net:
                "Net",
        },

        table: {
            employee:
                "Employee",

            role:
                "Position",

            gross:
                "Gross",

            deductions:
                "Deductions",

            note:
                "Note",

            action:
                "Action",
        },

        placeholders: {
            employeeName:
                "Name",

            role:
                "Position",

            optional:
                "Optional",
        },

        status: {
            posted:
                "Posted",

            draft:
                "Draft",
        },

        actions: {
            addEmployee:
                "Add Employee",

            removeEmployee:
                "Remove employee",

            createRun:
                "Create Payroll Run",

            saving:
                "Saving...",

            post:
                "Post",
        },

        runs: {
            title:
                "Payroll Runs",

            payDate:
                "Pay Date",

            period:
                "Period",

            employees:
                "Employees",

            net:
                "Net",

            status:
                "Status",

            action:
                "Action",

            periodSeparator:
                "to",

            empty:
                "No payroll runs yet.",
        },

        messages: {
            employeeRequired:
                "You must add at least one employee.",
        },
    },
    notificationsPage: {
        title:
            "Notifications",

        description:
            "Configure how and when you receive notifications.",

        channels: {
            title:
                "Notification Channels",

            email: {
                title:
                    "Email Notifications",

                description:
                    "Receive notifications at your email address.",

                address:
                    "Email Address",

                placeholder:
                    "example@restaurant.com",

                toggleAria:
                    "Enable or disable email notifications",
            },

            sms: {
                title:
                    "SMS Notifications",

                description:
                    "Receive notifications by text message.",

                phoneNumber:
                    "Phone Number",

                placeholder:
                    "+1 809 555 1234",

                toggleAria:
                    "Enable or disable SMS notifications",
            },
        },

        types: {
            title:
                "Notification Types",

            orders: {
                label:
                    "Order Notifications",

                description:
                    "Receive notifications when orders are created or completed.",
            },

            lowStock: {
                label:
                    "Low Stock Alerts",

                description:
                    "Receive notifications when a product is running low.",
            },

            payments: {
                label:
                    "Payment Notifications",

                description:
                    "Receive alerts when important payments are processed.",
            },

            reports: {
                label:
                    "Report Notifications",

                description:
                    "Receive updates about reports and analytics.",
            },
        },

        scheduledReports: {
            title:
                "Scheduled Reports",

            weekly: {
                label:
                    "Weekly Report",

                description:
                    "Receive a weekly summary of sales and operations.",
            },

            monthly: {
                label:
                    "Monthly Report",

                description:
                    "Receive a complete monthly summary of your business.",
            },
        },

        status: {
            active:
                "Active",

            inactive:
                "Inactive",
        },

        actions: {
            save:
                "Save Settings",
        },

        messages: {
            saveSuccess:
                "Notification settings saved successfully.",
        },
    },
    menuManagement: {
        title: "Menu Management",

        description:
            "Create, edit, and manage the dishes on your menu.",

        loading:
            "Loading dishes...",

        loadError:
            "Error loading dishes.",

        empty:
            "No dishes available.",

        customizable:
            "Customizable",

        fallbacks: {
            uncategorized:
                "Uncategorized",
        },

        filters: {
            searchPlaceholder:
                "Search by name or category...",

            allCategories:
                "All categories",

            searching:
                "Searching products...",
        },

        actions: {
            addDish:
                "Add Dish",

            edit:
                "Edit",

            delete:
                "Delete",

            create:
                "Create",

            add:
                "Add",

            saving:
                "Saving...",

            creating:
                "Creating...",

            update:
                "Update",
        },

        modal: {
            editTitle:
                "Edit Dish",

            addTitle:
                "Add New Dish",
        },

        fields: {
            dishName:
                "Dish Name",

            productionArea:
                "Production Area",

            weightUnit:
                "Weight Unit",

            image:
                "Image",
        },

        productionAreas: {
            kitchen:
                "Kitchen",

            bar:
                "Bar",

            other:
                "Other",
        },

        productionAreaHelp:
            "This determines which production printer will receive the ticket.",

        category: {
            title:
                "Category",

            description:
                "Select an existing category or create a new one.",

            select:
                "Select category",

            help:
                "This category will be used to organize the menu and classify the product in inventory.",
        },

        productType: {
            title:
                "Product Type",

            description:
                "Defines how this product interacts with inventory.",
        },

        productTypes: {
            none: {
                title:
                    "Standard Dish",

                description:
                    "Sold on the menu without deducting inventory.",
            },

            direct: {
                title:
                    "Inventory Product",

                description:
                    "Sold and deducted directly from its own inventory. Stock may go negative.",
            },

            recipe: {
                title:
                    "Recipe Dish",

                description:
                    "Sold on the menu and deducts the ingredients configured in its recipe.",
            },
        },

        directStock: {
            title:
                "Direct Stock Product",

            descriptionPrefix:
                "This product will appear in Stock Control using the same menu category:",

            descriptionSuffix:
                ". It can receive stock entries and exits, and inventory may go negative if sold without available stock.",
        },

        recipe: {
            title:
                "Recipe Dish",

            description:
                "This dish will not keep direct stock. When sold, the system will deduct the ingredients configured in its recipe.",
        },

        pricing: {
            type:
                "Price Type",

            fixed:
                "Fixed Price",

            manual:
                "Manual Price",

            manualHelp:
                "The price will be entered when the sale is processed.",

            unitPrice:
                "Price (per unit)",

            pricePerUnit:
                "Price per {{unit}}",
        },

        sellMode: {
            title:
                "Sales Mode",

            unit:
                "Per Unit",

            weight:
                "By Weight",
        },

        tax: {
            title:
                "Product Tax",

            description:
                "Choose which tax this product uses and whether it is included in the displayed price.",

            taxLabel:
                "Tax",

            businessDefault:
                "Business Default",

            priceTaxLabel:
                "Tax in Price",

            useTaxSetting:
                "Use tax configuration",

            included:
                "Tax included in price",

            excluded:
                "Tax is added to price",

            includedBadge:
                "Included in price",

            excludedBadge:
                "Added to price",

            includedHelp:
                "The price you enter already includes {{taxName}}.",

            excludedHelp:
                "{{taxName}} will be added to the price when the sale is calculated.",
        },

        weightUnits: {
            lb:
                "Pound (lb)",

            kg:
                "Kilogram (kg)",
        },

        costs: {
            average:
                "Average cost (optional)",

            last:
                "Last cost (optional)",
        },

        customization: {
            title:
                "Product Customization",

            description:
                "Allows customers to select extras and remove ingredients. These selections will appear below the product in the cart, kitchen, and ticket.",

            unitOnly:
                "Customization is currently available only for products sold by unit.",

            removableIngredients: {
                title:
                    "Removable Ingredients",

                description:
                    "Examples: tomato, onion, sauce, or lettuce.",

                empty:
                    "No removable ingredients have been configured yet.",

                deleteTitle:
                    "Delete ingredient",
            },

            extras: {
                title:
                    "Available Extras",

                description:
                    "The extra price is added to the product's unit price.",

                empty:
                    "No extras have been configured yet.",

                configurationTitle:
                    "Extra Configuration",

                configurationDescription:
                    "You can enter it manually or link it to an existing product.",

                deleteTitle:
                    "Delete extra",

                linkExisting:
                    "Link existing product (optional)",

                manualExtra:
                    "Manual extra",

                name:
                    "Extra Name",

                additionalPrice:
                    "Additional Price ({{currency}})",

                maxQuantity:
                    "Maximum Quantity",

                active:
                    "Extra Active",
            },
        },

        status: {
            active:
                "Active",
        },

        placeholders: {
            averageCost:
                "Example: 150",

            lastCost:
                "Example: 160",

            ingredient:
                "Example: Tomato",

            extraName:
                "Example: Extra cheese",

            extraPrice:
                "Example: 50",
        },

        image: {
            currentKept:
                "The current image will be kept.",
        },

        deleteConfirm: {
            title:
                "Confirm Deletion",

            descriptionPrefix:
                "You are about to delete the dish",

            descriptionSuffix:
                ". This action cannot be undone.",
        },

        inventoryCategoryModal: {
            title:
                "Create Inventory Category",

            name:
                "Name",

            description:
                "Description (optional)",
        },

        pagination: {
            summary_one:
                "Page {{page}} of {{totalPages}} · {{count}} dish",

            summary_other:
                "Page {{page}} of {{totalPages}} · {{count}} dishes",

            previous:
                "Previous",

            next:
                "Next",
        },

        messages: {
            noCreatePermission:
                "You do not have permission to create products.",

            noEditPermission:
                "You do not have permission to edit products.",

            noDeletePermission:
                "You do not have permission to delete products.",

            categoryCreated:
                "Category created successfully.",

            categoryCreateFailed:
                "Error creating category.",

            dishCreated:
                "Dish added successfully.",

            dishCreateFailed:
                "Error adding dish.",

            dishUpdated:
                "Dish updated successfully.",

            dishUpdateFailed:
                "Error updating dish.",

            dishDeleted:
                "Dish deleted successfully.",

            dishDeleteFailed:
                "Error deleting dish.",

            tenantMissing:
                "Tenant ID was not found.",

            categoryRequired:
                "A category is required for every product.",

            selectCategory:
                "You must select a category.",

            customizationRequired:
                "Add at least one removable ingredient or one extra.",

            duplicateCustomizationNames:
                "You cannot use the same name more than once within ingredients or extras.",

            invalidExtra:
                "Check the price and maximum quantity of the extras.",

            categoryNameRequired:
                "The name is required.",
        },
    },
    inventoryCategories: {
        title:
            "Inventory Categories",

        description:
            "Organize your inventory products by category.",

        loading:
            "Loading categories...",

        loadError:
            "Error loading categories.",

        empty:
            "No categories available.",

        searchPlaceholder:
            "Search categories...",

        summary: {
            total:
                "Total Categories",
        },

        fields: {
            name:
                "Category Name",

            description:
                "Description",

            color:
                "Color",

            icon:
                "Icon",
        },

        modal: {
            editTitle:
                "Edit Category",

            addTitle:
                "Add New Category",
        },

        actions: {
            addCategory:
                "Add Category",

            edit:
                "Edit",

            delete:
                "Delete",

            saving:
                "Saving...",

            update:
                "Update",

            add:
                "Add",
        },

        deleteConfirm: {
            title:
                "Confirm Deletion",

            description:
                "You are about to delete the category \"{{name}}\". This action cannot be undone.",
        },

        colorAria:
            "Select color {{color}}",

        icons: {
            package:
                "Package",

            box:
                "Box",

            shoppingBag:
                "Shopping Bag",

            tag:
                "Tag",

            archive:
                "Archive",

            layers:
                "Layers",

            grid:
                "Grid",

            folder:
                "Folder",

            briefcase:
                "Briefcase",

            cube:
                "Cube",

            droplet:
                "Droplet",

            flame:
                "Flame",

            leaf:
                "Leaf",

            apple:
                "Apple",

            chefHat:
                "Chef Hat",
        },

        messages: {
            createSuccess:
                "Category created successfully.",

            createFailed:
                "Error creating category.",

            updateSuccess:
                "Category updated successfully.",

            updateFailed:
                "Error updating category.",

            deleteSuccess:
                "Category deleted successfully.",

            deleteFailed:
                "Error deleting category.",

            nameRequired:
                "The category name is required.",
        },
    },
    helpAndSupport: {
        title:
            "Help & Support",

        description:
            "Documentation, guides, and assistance for your restaurant.",

        resourceCount_one:
            "{{count}} resource available",

        resourceCount_other:
            "{{count}} resources available",

        quickLinks: {
            title:
                "Quick Access",

            createOrder:
                "Create Order",

            viewReports:
                "View Reports",

            manageMenu:
                "Manage Menu",

            settings:
                "Settings",
        },

        categories: {
            gettingStarted: {
                title:
                    "Getting Started",

                items: {
                    quickStart: {
                        title:
                            "Quick Start Guide",

                        description:
                            "Learn how to set up your restaurant in minutes.",
                    },

                    videoTutorial: {
                        title:
                            "Complete Video Tutorial",

                        description:
                            "Step-by-step video guide.",
                    },

                    faq: {
                        title:
                            "Frequently Asked Questions (FAQ)",

                        description:
                            "Answers to the most common questions.",
                    },
                },
            },

            features: {
                title:
                    "Features",

                items: {
                    orders: {
                        title:
                            "Order Management",

                        description:
                            "Learn how to create and manage orders efficiently.",
                    },

                    fiscal: {
                        title:
                            "Fiscal Configuration",

                        description:
                            "Complete NCF configuration guide.",
                    },

                    inventory: {
                        title:
                            "Inventory Management",

                        description:
                            "Manage stock and products.",
                    },

                    reports: {
                        title:
                            "Reports & Analytics",

                        description:
                            "Learn how to use sales and product reports.",
                    },
                },
            },

            support: {
                title:
                    "Support",

                items: {
                    contact: {
                        title:
                            "Contact Support",

                        description:
                            "Send a message to the support team.",
                    },

                    whatsapp: {
                        title:
                            "WhatsApp Support",

                        description:
                            "Chat with us on WhatsApp.",
                    },

                    email: {
                        title:
                            "Support Email",

                        description:
                            "Send us an email.",
                    },
                },
            },

            resources: {
                title:
                    "Resources",

                items: {
                    documentation: {
                        title:
                            "Complete Documentation",

                        description:
                            "Access all system documentation.",
                    },

                    helpCenter: {
                        title:
                            "Help Center",

                        description:
                            "Search articles and tutorials.",
                    },

                    community: {
                        title:
                            "User Community",

                        description:
                            "Join our community.",
                    },
                },
            },
        },

        actions: {
            backToCategories:
                "Back to categories",

            openWhatsApp:
                "Open WhatsApp",

            sendEmail:
                "Send Email",

            contact:
                "Contact",
        },

        supportEmail: {
            subject:
                "Support Request",

            body:
                "Hello, I need help with...",
        },

        contactInfo: {
            title:
                "Contact Information",

            email:
                "Email",

            chatWithUs:
                "Chat with us",

            hours:
                "Hours",

            schedule:
                "Mon - Fri: 9AM - 6PM",
        },
    },
    fiscalConfig: {
        loading:
            "Loading configuration...",

        loadError:
            "Error loading configuration.",

        views: {
            regional: {
                title:
                    "Regional Settings",

                description:
                    "Country, currency, language, time zone, and business formats.",
            },

            taxes: {
                title:
                    "Taxes",

                description:
                    "Configure taxes and rates applied to products and services.",
            },

            serviceCharges: {
                title:
                    "Charges & Tips",

                description:
                    "Configure tips, service charges, and automatic charges.",
            },

            billing: {
                title:
                    "General Billing",

                description:
                    "Configure discounts, pre-invoice, logo, and billing behavior.",
            },

            delivery: {
                title:
                    "Delivery & Channels",

                description:
                    "Configure in-house delivery and external platforms.",
            },

            // Dominican fiscal terminology remains in Spanish.
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
                "Active",

            inactive:
                "Inactive",
        },

        logo: {
            selectFirst:
                "Select a logo first.",

            uploadFailed:
                "The logo could not be uploaded.",

            uploadSuccess:
                "Logo updated successfully.",

            uploadError:
                "Error uploading logo.",

            deleteFailed:
                "The logo could not be deleted.",

            deleteSuccess:
                "Logo deleted successfully.",

            deleteError:
                "Error deleting logo.",
        },

        messages: {
            saveFailed:
                "The configuration could not be saved.",

            // Dominican e-CF message intentionally remains in Spanish.
            ecfSaveFailed:
                "No se pudo guardar la configuración e-CF.",

            saveSuccess:
                "Configuration saved successfully.",

            saveSuccessSnackbar:
                "Configuration saved successfully.",

            saveError:
                "Error saving configuration.",
        },

        actions: {
            saving:
                "Saving...",

            saveChanges:
                "Save Changes",
        },
    },

    financeSummary: {
        header: {
            eyebrow:
                "Financial Dashboard",

            title:
                "Financial Summary",

            description:
                "Executive view of financial performance and cash control for the selected range.",
        },

        filters: {
            from:
                "From",

            to:
                "To",
        },

        actions: {
            loading:
                "Loading...",

            run:
                "Run Report",
        },

        empty: {
            prefix:
                "Select a range and click",

            suffix:
                ".",
        },

        executive: {
            title:
                "Executive Summary",

            subtitle:
                "The two most important indicators for the selected period.",

            range:
                "Range",

            status:
                "Status",

            updated:
                "Updated",
        },

        featured: {
            netResult: {
                title:
                    "Net Result",

                description:
                    "Gross profit - expenses - payroll.",
            },

            openingFloat: {
                title:
                    "Opening Float",

                description:
                    "Cash float used to open the register on the first date of the selected range.",
            },
        },

        performance: {
            title:
                "Financial Performance",

            subtitle:
                "Actual business indicators for the selected period.",
        },

        cards: {
            sales: {
                title:
                    "Sales",

                description:
                    "Revenue generated during the selected period.",
            },

            cogs: {
                title:
                    "COGS (Cost of Goods Sold)",

                description:
                    "Actual cost applied when orders are completed.",
            },

            grossProfit: {
                title:
                    "Gross Profit",

                description:
                    "Sales - COGS.",
            },

            expenses: {
                title:
                    "Expenses",

                description:
                    "Recorded operating expenses.",
            },

            payroll: {
                title:
                    "Payroll",

                description:
                    "Total payroll within the selected range.",
            },

            purchases: {
                title:
                    "Purchases",

                description:
                    "Includes purchases from waste adjustments (usable entry).",
            },

            waste: {
                title:
                    "Waste",

                description:
                    "Original cost of waste.",
            },
        },

        messages: {
            loadFailed:
                "The financial summary could not be loaded.",
        },
    },
    expensesPage: {
        title:
            "Expenses",

        filters: {
            from:
                "From",

            to:
                "To",

            type:
                "Type",
        },

        sourceTypes: {
            all:
                "All",

            manual:
                "Manual",

            manualPlural:
                "Manual",

            payroll:
                "Payroll",
        },

        paymentMethods: {
            cash:
                "Cash",

            transfer:
                "Transfer",

            card:
                "Card",

            other:
                "Other",
        },

        summary: {
            rangeTotal:
                "Range Total",

            totalExpenses:
                "Total Expenses",

            manualExpenses:
                "Manual Expenses",

            payroll:
                "Payroll",

            records:
                "Records",
        },

        fields: {
            date:
                "Date",

            amount:
                "Amount",

            category:
                "Category",

            method:
                "Method",

            reference:
                "Reference",

            note:
                "Note",
        },

        placeholders: {
            reference:
                "Example: Receipt 00231",

            note:
                "Example: Electricity payment",
        },

        actions: {
            filter:
                "Filter",

            save:
                "Save",

            saving:
                "Saving...",

            void:
                "Void",

            voiding:
                "Voiding...",

            confirmVoid:
                "Yes, void",
        },

        table: {
            date:
                "Date",

            type:
                "Type",

            category:
                "Category",

            note:
                "Note",

            reference:
                "Reference",

            method:
                "Method",

            amount:
                "Amount",

            action:
                "Action",

            fromPayroll:
                "From payroll",
        },

        empty:
            "There are no expenses in this range.",

        voidModal: {
            title:
                "Void Expense",

            description:
                "This action will mark the record as voided.",

            warning:
                "Confirm that you want to void this record. This action cannot be easily undone.",
        },

        messages: {
            loadFailed:
                "Expenses could not be loaded.",

            createFailed:
                "The expense could not be created.",

            voidFailed:
                "The expense could not be voided.",
        },
    },
    expenseCategoriesPage: {
        title:
            "Expense Categories",

        placeholders: {
            name:
                "Name (Example: Electricity, Gas, Transportation)",

            description:
                "Description (optional)",
        },

        fields: {
            name:
                "Name",

            description:
                "Description",
        },

        table: {
            name:
                "Name",

            description:
                "Description",

            actions:
                "Actions",
        },

        actions: {
            create:
                "Create",

            creating:
                "Creating...",

            edit:
                "Edit",

            delete:
                "Delete",

            saving:
                "Saving...",

            saveChanges:
                "Save Changes",

            deleting:
                "Deleting...",

            confirmDelete:
                "Yes, delete",
        },

        empty:
            "No categories yet.",

        editModal: {
            title:
                "Edit Category",

            description:
                "Update the category name and description.",
        },

        deleteModal: {
            title:
                "Delete Category",

            description:
                "This action only works if the category is not currently in use.",

            confirmPrefix:
                "You are about to delete the category",

            confirmSuffix:
                ".",
        },

        messages: {
            loadFailed:
                "Expense categories could not be loaded.",

            createFailed:
                "The expense category could not be created.",

            updateFailed:
                "The expense category could not be updated.",

            deleteFailed:
                "The expense category could not be deleted.",

            nameRequired:
                "The category name is required.",
        },
    },
    ecfConfig: {
        status: {
            current:
                "Current status",

            ecfStatus:
                "e-CF status",

            fiscalIssuer:
                "Fiscal issuer",

            configured:
                "Configured",

            incomplete:
                "Incomplete",

            digitalCertificate:
                "Digital certificate",

            ready:
                "Ready",

            pendingOrInvalid:
                "Pending or invalid",

            certificateNotRequiredSandbox:
                "Digital certificate: not required in Sandbox",

            certificationStatus:
                "Certification status",

            ecfIssuance:
                "e-CF issuance",

            readyFeminine:
                "Ready",

            blockedFeminine:
                "Blocked",

            mustFix:
                "You must correct:",
        },

        certificate: {
            title:
                "e-CF Digital Certificate",

            description:
                "Upload the taxpayer's .p12 or .pfx certificate.",

            fileLabel:
                "Certificate file",

            selected:
                "Selected",

            passwordLabel:
                "Password",

            passwordPlaceholder:
                "Password for the .p12 / .pfx",

            uploading:
                "Uploading certificate...",

            uploadButton:
                "Upload e-CF certificate",

            validatedTitle:
                "Certificate uploaded and validated.",

            validatedDescription:
                "The system successfully opened the certificate file.",

            file:
                "File",

            serial:
                "Serial",

            validFrom:
                "Valid from",

            validTo:
                "Valid until",

            problemTitle:
                "The certificate is not validated correctly.",

            problemDescription:
                "Check the file, password, and configuration.",

            pendingTitle:
                "Certificate pending.",

            pendingDescription:
                "Upload a .p12 or .pfx file and validate its password.",

            messages: {
                selectFile:
                    "Select a .p12 or .pfx certificate.",

                passwordRequired:
                    "Enter the certificate password.",

                uploadFailed:
                    "The certificate could not be uploaded.",

                uploadSuccess:
                    "The e-CF certificate was uploaded and validated successfully.",

                uploadError:
                    "Error uploading the e-CF certificate.",
            },

            errors: {
                passwordInvalid:
                    "The certificate password is incorrect.",

                fileInvalid:
                    "The certificate file is invalid.",

                invalidExtension:
                    "The file must be .p12 or .pfx.",

                passwordRequired:
                    "You must enter the certificate password.",

                fileRequired:
                    "You must select a certificate file.",

                notValidated:
                    "The certificate was received but could not be validated correctly.",

                storageFailed:
                    "The certificate could not be uploaded to private storage.",
            },
        },

        documentTypes: {
            code:
                "Code",

            rangeRequired:
                "Range required",

            exhausted:
                "Exhausted",

            expired:
                "Expired",

            sequenceFrom:
                "Sequence from",

            sequenceTo:
                "Sequence to",

            authorizationDate:
                "Authorization date",

            validUntil:
                "Valid until",

            nextSequence:
                "Next sequence",

            nextENcf:
                "Next e-NCF",

            certification:
                "Certification",

            stats: {
                total:
                    "Total",

                used:
                    "Used",

                available:
                    "Available",

                usedPercent:
                    "Used",
            },

            rangeExpired:
                "This range has expired.",

            rangeExhausted:
                "This range is exhausted.",
        },
    },
    deliveryConfig: {
        title:
            "Delivery Platforms",

        description:
            "Configure delivery channels and commissions for external platforms.",

        channels: {
            pedidosYa: {
                description:
                    "Enables the PedidosYa channel on the Tables screen.",
            },

            ownDelivery: {
                label:
                    "Delivery",

                description:
                    "Enables your own delivery channel on the Tables screen.",
            },

            uberEats: {
                description:
                    "Enables the Uber Eats channel on the Tables screen.",
            },
        },

        commission: {
            label:
                "Commission (%)",

            pedidosYaExample:
                "Example: 26% commission.",

            uberEatsExample:
                "Example: 22% commission.",
        },

        info: {
            disabledChannel:
                "If a channel is disabled, it will be hidden from Tables. Existing orders from that channel will remain available in Orders and Reports.",
        },
    },
    billingGeneralConfig: {
        logo: {
            title: "Business Logo",
            description: "This logo will appear on the visual invoice and in the generated PDF.",
            currentAlt: "Current logo",
            noLogo: "No logo",
            currentInvoiceLogo: "Current invoice logo",
            help: "Use PNG or JPG. A transparent background is recommended, with a maximum file size of 2 MB.",
            selected: "Selected",
            uploading: "Uploading...",
            upload: "Upload logo",
            delete: "Delete logo",
        },

        features: {
            title: "Billing Features",
            description: "Enable or disable features available during the sale.",

            manualTip: {
                label: "Manual tip",
                description: "Allows the cashier to manually enter a voluntary tip amount.",
            },

            discounts: {
                label: "Discounts",
                description: "Allows discounts to be applied to the bill.",
            },
        },

        chargeMode: {
            title: "Charge Mode",
            description: "Defines when a sale is included in the cash register closing.",

            options: {
                atInvoice: "Charge when invoicing",
                atComplete: "Charge when completed",
            },

            help: "Charge when invoicing: the sale is included in the cash register closing when the invoice is issued. Charge when completed: the sale is included when the order is marked as completed.",
        },

        preInvoice: {
            title: "PreInvoice",
            description: "Controls the behavior of non-fiscal documents.",
            label: "PreInvoice",
            toggleDescription: 'When enabled, NON-fiscal invoices will display "PreInvoice" instead of "Final Consumer Invoice".',
            info: "PreInvoice applies only to non-fiscal invoices. If the transaction uses a fiscal document, it will continue to be treated as a fiscal invoice.",
        },
    },
    inventoryPage: {
        title:
            "Inventory",

        subtitle:
            "Real stock, inventory ledger, and consumption",

        plan: {
            restricted:
                "This module is available only for the Standard, Premium, and Pro plans.",
        },

        help: {
            costs:
                "Note: Last cost is the most recent unit purchase price. Average cost is the weighted average used to calculate the actual cost.",

            minimumStock:
                "Minimum stock is used to mark an item as Low Stock when the current stock reaches that quantity or less.",
        },

        tabs: {
            stock:
                "Stock",

            movements:
                "Movements",

            consumption:
                "Consumption",

            waste:
                "Waste",

            suppliers:
                "Suppliers",

            categories:
                "Categories",
        },

        metrics: {
            items:
                "Items",

            lowStock:
                "Low stock",

            estimatedValue:
                "Estimated value",
        },

        itemTypes: {
            none: {
                title:
                    "No inventory",
            },

            ingredient: {
                title:
                    "Ingredient / supply",

                description:
                    "Not sold as a dish. Used in recipes and can receive stock entries and exits.",
            },

            direct: {
                title:
                    "Direct-stock product",

                description:
                    "Menu product that manages its own stock.",
            },

            recipe: {
                title:
                    "Recipe-based dish",

                description:
                    "Menu dish that deducts ingredients from inventory.",
            },
        },

        units: {
            unit:
                "Unit",

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
                "Saved successfully.",

            duplicateItem:
                "An inventory item with that name already exists. Change the name or archive the previous item.",

            saveError:
                "Error saving the item.",

            archived:
                "Archived.",

            archiveError:
                "Error archiving the item.",

            unarchived:
                "Restored from archive.",

            unarchiveError:
                "Error restoring the item.",

            movementCreated:
                "Movement recorded.",

            movementError:
                "Error recording the movement.",

            yieldApplied:
                "Waste/yield process applied.",

            yieldError:
                "Error processing waste/yield.",
        },

        permissions: {
            createItem:
                "You do not have permission to create direct inventory items.",

            editItem:
                "You do not have permission to edit inventory items.",

            yield:
                "You do not have permission to process yield/waste.",

            entry:
                "You do not have permission to record stock entries.",

            exit:
                "You do not have permission to record stock exits.",

            adjust:
                "You do not have permission to make inventory adjustments.",

            waste:
                "You do not have permission to record waste.",
        },

        yield: {
            alreadyProcessedQuestion:
                "You already processed yield/waste for this product. What would you like to do?",

            processAnother:
                "Process another yield/waste",

            addWaste:
                "Add direct waste",

            processAgainQuestion:
                "You already processed yield/waste for this item. Do you want to process another one?",

            processAnotherShort:
                "Process another",
        },

        common: {
            loading:
                "Loading...",

            supplier:
                "Supplier",

            noSupplier:
                "No supplier",

            noCategory:
                "Uncategorized",

            yes:
                "Yes",

            no:
                "No",
            from:
                "From",

            to:
                "To",

            refresh:
                "Refresh",
        },
        roles: {
            owner:
                "Owner",

            admin:
                "Admin",

            cashier:
                "Cashier",

            waiter:
                "Waiter",

            kitchen:
                "Kitchen",

            system:
                "System",
        },

        movements: {
            filters: {
                item:
                    "Item",

                allItems:
                    "All",

                type:
                    "Type",

                allTypes:
                    "All",
            },

            types: {
                purchase:
                    "Purchase",

                sale:
                    "Sale",

                waste:
                    "Waste",

                adjust:
                    "Adjustment",

                transfer:
                    "Transfer",

                conversion:
                    "Conversion",
            },

            table: {
                date:
                    "Date",

                type:
                    "Type",

                item:
                    "Item",

                quantity:
                    "Quantity",

                before:
                    "Before",

                after:
                    "After",

                cost:
                    "Cost",

                user:
                    "User",

                note:
                    "Note",
            },

            empty:
                "There are no movements.",
        },

        consumption: {
            table: {
                item:
                    "Item",

                quantity:
                    "Quantity",

                cost:
                    "Cost",
            },

            empty:
                "There is no data for this range.",

            pagination: {
                summary:
                    "Showing page {{page}} of {{totalPages}} · {{total}} records",
            },
        },

        yieldDashboard: {
            title:
                "Waste (Yield)",

            description:
                "History and KPIs based on waste movements.",

            metadataHelp:
                "To calculate Purchased / Final / Yield, historical yield notes must include the markers “comprado X” and “final Y”. Waste quantity and cost are still available without them.",

            viewHistory:
                "View history",

            kpis: {
                purchasedTotal:
                    "Purchased (total)",

                movements:
                    "Movements: {{count}}",

                finalUsable:
                    "Final usable (total)",

                yieldPercent:
                    "Yield: {{value}}%",

                wasteQuantity:
                    "Waste (quantity)",

                wastePercent:
                    "Waste: {{value}}%",

                wasteCost:
                    "Waste (cost)",

                averageWasteCost:
                    "Avg. waste cost/unit: {{value}}",

                averageWasteUnit:
                    "Average cost per waste unit",

                averageWasteFormula:
                    "wasteCost / wasteQty",

                metadataRecords:
                    "Records with metadata (purchased/final)",

                metadataHelp:
                    "If this is 0, the historical note does not contain the purchased/final markers.",
            },

            latest: {
                title:
                    "Latest waste records",

                empty:
                    "There are no waste records for this day.",

                waste:
                    "Waste",

                cost:
                    "Cost",

                purchased:
                    "Purchased",

                final:
                    "Final",

                note:
                    "Note",

                more:
                    "more",
            },

            history: {
                title:
                    "Waste history (Yield) — {{date}}",

                empty:
                    "There are no records.",
            },
        },

        itemModal: {
            title: {
                edit:
                    "Edit item",

                create:
                    "New item",
            },

            createQuestion:
                "What are you creating?",

            newIngredientDescription:
                "For recipes, purchases, inventory entries, and inventory exits.",

            fromExistingDish:
                "Based on an existing dish",

            fromExistingDishDescription:
                "Enable an existing menu dish as direct stock or a recipe-based dish.",

            selectDish:
                "Select a dish",

            selectedDish:
                "Selected dish",

            category:
                "Category",

            price:
                "Price",

            inventoryTypeForDish:
                "Inventory type for this dish",

            directDishDescription:
                "It is sold and deducts its own stock. Negative stock can be allowed.",

            recipeDishDescription:
                "It does not have direct stock. It deducts ingredients.",

            sameDishHelp:
                "This enables inventory on the SAME dish without creating a duplicate.",

            stockMovementHelp:
                "Stock is managed through movements: use the Entry button after saving.",

            recipe: {
                title:
                    "Recipe",

                description:
                    "Ingredients are deducted when the dish is sold if the backend uses the recipe.",

                addedIngredients:
                    "Added ingredients",

                empty:
                    "You have not added any ingredients yet.",
            },

            fields: {
                ingredient:
                    "Ingredient",

                quantity:
                    "Quantity",

                createIngredient:
                    "Create ingredient",

                inventoryCategoryOptional:
                    "Inventory category (optional)",

                name:
                    "Name",

                unit:
                    "Unit",

                inventoryCategory:
                    "Inventory category",

                currentSupplierOptional:
                    "Current supplier (optional)",

                minimumStock:
                    "Minimum stock",

                lastCost:
                    "Last cost",

                averageCost:
                    "Average cost",
            },

            placeholders: {
                selectIngredient:
                    "— Select ingredient —",

                quantity:
                    "Example: 1, 0.5",

                ingredientName:
                    "Example: Mozzarella cheese",
            },

            actions: {
                add:
                    "Add",

                create:
                    "Create",

                creating:
                    "Creating...",

                remove:
                    "Remove",

                save:
                    "Save",

                saving:
                    "Saving...",
            },

            messages: {
                nameRequired:
                    "Name is required.",

                selectDish:
                    "Select a dish first.",

                selectDishInventoryType:
                    "Select whether the dish will use direct stock or a recipe.",

                recipeIngredientRequired:
                    "Add at least one ingredient to create a recipe-based dish.",

                recipeSaved:
                    "Recipe saved.",

                recipeSaveError:
                    "The recipe could not be saved.",

                selectIngredient:
                    "Select an ingredient.",

                invalidQuantity:
                    "Invalid quantity. It must be greater than 0.",

                ingredientNameRequired:
                    "Enter the ingredient name.",

                ingredientCreated:
                    "Ingredient created.",

                ingredientCreateError:
                    "The ingredient could not be created.",
            },
        },

        movementModal: {
            title: {
                yield:
                    "Waste process (yield)",

                purchase:
                    "Inventory entry",

                sale:
                    "Inventory exit",

                waste:
                    "Waste",

                adjust:
                    "Inventory adjustment",
            },

            fields: {
                item:
                    "Item",

                quantity:
                    "Quantity",

                unitCost:
                    "Unit cost",

                direction:
                    "Direction",

                note:
                    "Note",
            },

            direction: {
                reduce:
                    "Reduce",

                increase:
                    "Increase",
            },

            messages: {
                invalidItem:
                    "Invalid item.",

                invalidPurchasedQuantity:
                    "Invalid purchased quantity.",

                invalidFinalQuantity:
                    "Invalid final quantity.",

                invalidTotalCost:
                    "Invalid total cost.",

                invalidQuantity:
                    "Invalid quantity.",
            },

            yield: {
                activeDescription:
                    "Applying yield (process waste)",

                normalEntry:
                    "Normal entry",

                enable:
                    "Enable",

                disable:
                    "Disable",

                process:
                    "waste process",

                purchasedQuantity:
                    "Purchased quantity (example: 44.60)",

                totalPurchaseCost:
                    "Total purchase cost (example: 7136)",

                finalUsableQuantity:
                    "Final usable quantity (example: 28)",

                intermediateStepsHelp:
                    "Intermediate steps (optional). Example: boiled 32.8, cooked 28.",

                quantityAfter:
                    "Quantity after",

                estimatedFinalUnitCost:
                    "Estimated final unit cost",

                defaultSteps: {
                    boiled:
                        "Boiled",

                    cooked:
                        "Cooked",

                    step:
                        "Step",
                },
            },

            actions: {
                remove:
                    "Remove",

                addStep:
                    "+ Add step",

                saving:
                    "Saving...",

                save:
                    "Save",
            },

            negative: {
                title:
                    "Inventory will become negative",

                description:
                    "This movement will reduce stock below zero. Confirm whether you want to continue.",

                currentStock:
                    "Current stock",

                outputQuantity:
                    "Outgoing quantity",

                newStock:
                    "New stock",

                warning:
                    "If you continue, the product will have negative stock. This may affect reports and inventory counts.",

                continueAnyway:
                    "Continue anyway",
            },
        },

        status: {
            noInventory:
                "No inventory",

            lowStock:
                "Low stock",

            negativeStock:
                "Negative stock",

            ok:
                "OK",
        },

        filters: {
            search:
                "Search",

            searchPlaceholder:
                "Search by name...",

            searching:
                "Searching...",

            category:
                "Category",

            allCategories:
                "All categories",

            supplier:
                "Supplier",

            allSuppliers:
                "All suppliers",
        },

        archive: {
            showing:
                "Showing archived items",

            hiding:
                "Archived items hidden",
        },

        table: {
            item:
                "Item",

            unit:
                "Unit",

            stock:
                "Stock",

            minimum:
                "Minimum",

            minimumShort:
                "Min.",

            averageCost:
                "Avg. cost",

            supplier:
                "Supplier",

            status:
                "Status",

            actions:
                "Actions",
        },

        stock: {
            empty:
                "No items found.",
        },

        actions: {
            newItem:
                "New item",

            entry:
                "Entry",

            exit:
                "Exit",

            yieldProcess:
                "Yield / waste process",

            adjust:
                "Adjustment",

            waste:
                "Waste",

            edit:
                "Edit",

            archive:
                "Archive",

            unarchive:
                "Unarchive",
        },

        pagination: {
            page:
                "Page",

            of:
                "of",

            total:
                "Total",

            previous:
                "Previous",

            next:
                "Next",
        },

        export: {
            label:
                "Export",

            button:
                "Export Excel",

            exporting:
                "Exporting...",

            options: {
                all:
                    "Entire inventory",

                category:
                    "Selected category",

                products:
                    "Products only",
            },

            selectCategoryFirst:
                "Select a category first before exporting it.",

            noRecords:
                "There are no records to export.",

            error:
                "The inventory could not be exported.",

            success:
                "{{count}} records exported to Excel.",

            sheetName:
                "Inventory",

            filePrefix:
                "Inventory",

            fileNames: {
                all:
                    "All",

                products:
                    "Products",

                category:
                    "Category",
            },

            columns: {
                item:
                    "Item",

                type:
                    "Type",

                category:
                    "Category",

                unit:
                    "Unit",

                currentStock:
                    "Current stock",

                minimumStock:
                    "Minimum stock",

                lastCost:
                    "Last cost",

                averageCost:
                    "Average cost",

                usedCost:
                    "Cost used",

                inventoryValue:
                    "Inventory value",

                supplier:
                    "Supplier",

                status:
                    "Status",

                archived:
                    "Archived",

                id:
                    "ID",
            },
        },
    },
        employeesPage: {
            title: "Employees",
            loading: "Loading employees...",
            loadError: "Error loading employees",
            empty: "No employees are registered.",

            table: {
                name: "Name",
                email: "Email",
                phone: "Phone",
                role: "Role",
                permissions: "Permissions",
                actions: "Actions",
            },

            actions: {
                edit: "Edit",
                clear: "Clear",
                save: "Save",
                saving: "Saving...",
            },

            modal: {
                title: "Edit Employee",
                description:
                    "Real-time permissions and information for the selected user.",
            },

            sections: {
                basicInfo: "Basic Information",
                security: "Security",
            },

            fields: {
                name: "Name",
                email: "Email",
                phone: "Phone",
                role: "Role",
            },

            placeholders: {
                name: "Employee name",
                email: "email@example.com",
                password: "Leave blank to keep the current password",
                confirmPassword: "Confirm the new password",
            },

            roles: {
                select: "Select role",
                owner: "Owner",
                waiter: "Waiter",
                cashier: "Cashier",
                kitchen: "Kitchen",
                admin: "Admin",
            },

            common: {
                optional: "(optional)",
            },

            security: {
                description: "Change the password only if necessary.",
                newPassword: "New Password",
                minimumCharacters: "Minimum 6 characters",
                confirmPassword: "Confirm Password",
                showPassword: "Show password",
                hidePassword: "Hide password",
            },

            messages: {
                updateSuccess: "Employee updated successfully.",
                updateFailed: "Error updating employee.",
                nameRequired: "The name is required.",
                emailRequired: "The email is required.",
                phoneInvalid:
                    "The phone number must contain between 7 and 15 digits.",
                roleRequired: "The role is required.",
                passwordMinLength:
                    "The password must contain at least 6 characters.",
                passwordMismatch: "Passwords do not match.",
            },

            permissions: {
                activeCount_one: "{{count}} active permission",
                activeCount_other: "{{count}} active permissions",
                summaryEyebrow: "Permissions Summary",
                summaryDescription:
                    "Changes are loaded from the current employee's database record.",
                none: "No special permissions",
                specialTitle: "Special Permissions",
                specialDescription:
                    "These permissions apply only to the user you are editing.",

                products: {
                    sectionTitle: "Products",
                    sectionSubtitle:
                        "Permissions for menu and product management.",

                    create: {
                        title: "Create products",
                        description:
                            "Allows the user to create new dishes or products in Menu Management.",
                    },

                    update: {
                        title: "Edit products",
                        description:
                            "Allows the user to modify existing products.",
                    },

                    delete: {
                        title: "Delete products",
                        description:
                            "Allows the user to delete products from the system.",
                    },
                },

                inventory: {
                    sectionTitle: "Inventory",
                    sectionSubtitle:
                        "Permissions for stock entries and inventory operations.",

                    entry: {
                        title: "Add inventory",
                        chip: "Inventory entry",
                        description:
                            "Allows the user to register purchase entries or manual inventory entries.",
                    },

                    exit: {
                        title: "Register stock exits",
                        chip: "Stock exits",
                        description:
                            "Allows the user to register manual inventory exits.",
                    },

                    adjust: {
                        title: "Make adjustments",
                        chip: "Adjustments",
                        description:
                            "Allows the user to make positive or negative stock adjustments.",
                    },

                    waste: {
                        title: "Register waste",
                        chip: "Waste",
                        description:
                            "Allows the user to register inventory loss or waste.",
                    },
                },

                orders: {
                    sectionTitle: "Orders",
                    sectionSubtitle:
                        "Permissions for critical actions on orders.",

                    edit: {
                        title: "Correct regular orders",
                        description: "Allows this cashier to correct dishes, quantities, extras, prices, discounts, taxes, tips and payment method. Fiscal documents remain protected and every change is logged.",
                    },

                    cancel: {
                        title: "Cancel orders",
                        description:
                            "Allows the user to cancel an active order. If this permission is disabled, the user cannot cancel orders.",
                    },
                },

                accountsReceivable: {
                    sectionTitle: "Accounts Receivable",
                    sectionSubtitle:
                        "Permissions for credit sales and outstanding balances.",

                    view: {
                        title: "View and collect outstanding accounts",
                        chip: "Accounts receivable",
                        description:
                            "Allows the user to view accounts receivable and record partial or full payments.",
                    },
                },
            },
        },
    salesReportsPage: {
        title: "Sales Reports",
        subtitle: "Detailed sales and billing analysis",

        loading: "Loading reports...",
        loadError: "Error loading reports",

        actions: {
            exportExcel: "Export to Excel",
            closeNotification: "Close notification",
        },

        tabs: {
            category: "By category",
            payment: "By payment method",
            product: "Product details",
        },

        filters: {
            from: "From date",
            to: "To date",
            paymentMethod: "Payment method",
            allMethods: "All methods",
        },

        paymentMethods: {
            cash: "Cash",
            card: "Card",
            transfer: "Transfer",
            credit: "Credit",
            other: "Other",
        },

        common: {
            unknown: "Unknown",
            noCategory: "Uncategorized",
            regular: "Regular",
            product: "Product",
            notAvailable: "N/A",
            top10: "Top 10",
        },

        summary: {
            taxes: "Taxes",
            serviceCharge: "Service charge",
            serviceCharges: "Service charges",
        },

        metrics: {
            totalSales: "Total Sales",
            averageOrder: "Average per order",
            perOrder: "Per order",
            totalOrders: "Total Orders",
            processedOrders: "Orders processed",
            taxesCollected: "Taxes collected",
            serviceChargesCollected: "Service charges collected",
        },

        orderCount_one: "{{count}} order",
        orderCount_other: "{{count}} orders",

        quantityValue: "{{count}} qty.",

        pagination: {
            show: "Show",
            rows: "rows",
            previous: "Previous",
            next: "Next",
            pageOf: "Page {{page}} of {{totalPages}}",
        },

        reportTitles: {
            category: "Report by Category",
            payment: "Report by Payment Method",
            product: "Product Details",
        },

        report: {
            loading: "Loading report...",
            loadError: "Error loading report.",
            empty: "There is no data for this date range.",
        },

        table: {
            category: "Category",
            method: "Method",
            presentation: "Presentation",
            product: "Product",
            quantityShort: "Qty.",
            revenue: "Revenue",
            cost: "Cost",
            profit: "Profit",
            costPercent: "Cost %",
            profitPercent: "Profit %",
        },

        sections: {
            salesByPaymentMethod: "Sales by Payment Method",
            salesByDish: "Sales by Dish",
            loadingDishSales: "Loading sales by dish...",
            noDishSales:
                "There are no sold products to display for this range.",
            salesByWeekday: "Sales by Day of the Week",
            recentSales: "Recent Sales",
        },

        recentTable: {
            date: "Date",
            customer: "Customer",
            dishes: "Dishes",
            total: "Total",
        },

        messages: {
            exportError: "Error exporting the file.",
        },

        excel: {
            salesSheet: "Sales Reports",
            reportSheet: "Report",
            salesFilePrefix: "sales_reports",

            fileNames: {
                category: "report_by_category",
                payment: "report_by_payment_method",
                product: "product_details",
            },

            columns: {
                date: "Date",
                time: "Time",
                orderId: "Order ID",
                customer: "Customer",
                method: "Method",
                paymentMethod: "Payment method",
                source: "Source",
                subtotal: "Subtotal",
                total: "Total",
                user: "User",
                table: "Table",
                shipping: "Shipping",

                category: "Category",
                presentation: "Presentation",
                product: "Product",
                quantity: "Quantity",
                unitPrice: "Unit Price",
                unitCost: "Unit Cost",
                revenue: "Revenue",
                cost: "Cost",
                profit: "Profit",
                costPercent: "Cost %",
                profitPercent: "Profit %",
            },
        },
    },
    financialAnalysisPage: {
        title:
            "Financial Analysis",

        subtitle:
            "Detailed financial and trend analysis",

        loading:
            "Loading analysis...",

        loadError:
            "Error loading analysis",

        actions: {
            exportExcel:
                "Export to Excel",

            close:
                "Close",

            closeNotification:
                "Close notification",
        },

        filters: {
            from:
                "From date",

            to:
                "To date",

            paymentMethod:
                "Payment method",

            allMethods:
                "All methods",

            category:
                "Category",

            allCategories:
                "All categories",

            appliedRange:
                "Applied range: {{from}} to {{to}}",
        },

        paymentMethods: {
            cash:
                "Cash",

            card:
                "Card",

            transfer:
                "Transfer",

            credit:
                "Credit",
        },

        common: {
            product:
                "Product",

            noCategory:
                "Uncategorized",
        },

        metrics: {
            totalRevenue:
                "Total Revenue",

            netRevenue:
                "Net Revenue",

            afterCommissions:
                "After commissions",

            averageTicket:
                "Average Ticket",

            perOrder:
                "Per order",

            totalOrders:
                "Total Orders",

            processedOrders:
                "Orders processed",
        },

        breakdown: {
            revenueTitle:
                "Revenue Breakdown",

            subtotal:
                "Subtotal",

            taxesWithRate:
                "Taxes ({{rate}}%)",

            tips:
                "Tips",

            totalRevenue:
                "Total Revenue",

            expensesTitle:
                "Expense Breakdown",

            commissionsWithRate:
                "Commissions ({{rate}}%)",

            averageNetPerOrder:
                "Average Net per Order",
        },

        daily: {
            title:
                "Daily Trends",

            net:
                "Net",

            taxes:
                "Taxes",

            commissions:
                "Commissions",
        },

        hourly: {
            title:
                "Revenue by Hour of Day",

            selectedHour:
                "Selected hour",

            totalRevenue:
                "Total revenue",

            orders:
                "Orders",

            product:
                "Product",

            category:
                "Category",

            quantity:
                "Quantity",

            revenue:
                "Revenue",

            noSales:
                "No sales were recorded during this hour.",

            openHourDetails:
                "View details for {{hour}}",
        },

        orderCount_one:
            "{{count}} order",

        orderCount_other:
            "{{count}} orders",

        messages: {
            exportError:
                "Error exporting the file.",
        },

        excel: {
            sheetName:
                "Financial Analysis",

            filePrefix:
                "financial_analysis",

            columns: {
                metric:
                    "Metric",

                value:
                    "Value",

                detail:
                    "Detail",

                date:
                    "Date",

                revenue:
                    "Revenue",

                orders:
                    "Orders",
            },

            sections: {
                financialSummary:
                    "FINANCIAL SUMMARY",

                dateAnalysis:
                    "ANALYSIS BY DATE",
            },

            metrics: {
                totalRevenue:
                    "Total Revenue",

                totalTaxes:
                    "Total Taxes",

                totalTips:
                    "Total Tips",

                totalCommissions:
                    "Total Commissions",

                netRevenue:
                    "Net Revenue",

                averageTicket:
                    "Average Ticket",

                totalOrders:
                    "Total Orders",

                growthRate:
                    "Growth Rate",
            },
        },
    },
    cashRegisterPage: {
        title: "Cash Register Closing",

        common: {
            date: "Date",
            register: "Register",
            user: "User",
            customer: "Customer",
            method: "Method",
            total: "Total",
            invoice: "Invoice",
            product: "Product",
            quantity: "Quantity",
            quantityValue: "Quantity: {{count}}",
            note: "Note",
            subtotal: "Subtotal",
            status: "Status",
            loading: "Loading...",
            unavailable: "Unavailable",
            enabled: "Enabled",
            disabled: "Disabled",
            open: "Open",
            closed: "Closed",
            orderCount_one: "{{count}} order",
            orderCount_other: "{{count}} orders",
        },

        actions: {
            add: "Add",
            cancel: "Cancel",
            view:
                "View",

            exportExcel:
                "Export to Excel",

            filters:
                "Filters",

            clearFilters:
                "Clear filters",
            saveChange: "Save change",
            saveChanges: "Save changes",
            saving: "Saving...",
            close: "Close",
            viewFullRecords: "View Full Records",
            hideSession: "Hide session",
            viewPrint: "View / Print",
        },

        registers: {
            active: "Active register",
            allRegisters: "ALL REGISTERS",
            allSales: "ADMIN — View all sales",
        },

        paymentMethods: {
            cash: "Cash",
            card: "Card",
            transfer: "Transfer",
            transfers: "Transfers",
            credit: "Credit",
            ticket: "Ticket",
            tickets: "Tickets",
            other: "Other",
        },

        status: {
            paid: "Paid",
            pending: "Pending",
            partial: "Partial",
        },

        opening: {
            title: "Initial Cash Float",
            description:
                "This amount is not a sale. It is the cash used to start the register and provide change.",
            editInitialAdmin:
                "Edit initial float (admin) — {{date}}",

            currentFloat:
                "Cash float (initial + added)",

            initialAdded:
                "Initial: {{initial}} · Added: {{added}}",

            cashSales:
                "Cash sales",

            dayExpenses:
                "Today's expenses",

            cashExpenses:
                "Cash: {{amount}}",

            cashInRegister:
                "Cash in register (float + sales)",

            netSales:
                "Net sales",

            amountExample:
                "Amount (e.g. 2000)",

            addMoney:
                "Add cash",

            adminOnlyHint:
                "Only administrators can add cash or adjust the initial float.",

            saveInitial:
                "Save initial float",

            editWithManager:
                "Edit initial float with manager code",

            saveInitialAdmin:
                "Save initial float (Admin) — {{date}}",

            editInitial:
                "Edit initial float",

            savedToday:
                "Today's initial float has been saved.",

            notSavedToday:
                "Today's initial float has not been saved yet.",

            showingHistory:
                "Showing history for the selected day.",
        },

        manager: {
            title:
                "Configure Manager Code",

            code:
                "Manager code",

            codePlaceholder:
                "E.g. 1234",

            lastUpdated:
                "Last updated",

            newCode:
                "New code (4–8 digits)",

            securityHint:
                "Only the hash is stored on the server. The system displays a hint such as ***12.",

            saveUpdate:
                "Save / Update",

            disableCode:
                "Disable code",
        },

        closing: {
            comparisonTitle:
                "Comparison (Cash Closing Report)",

            systemExpected:
                "System (expected cash)",
            ticketsDetail:
                "Ticket details",

            transferTotal:
                "Total transfer",

            otherTotal:
                "Total other",

            transferAndOther:
                "Transfer + other",

            countedCash:
                "Counted cash in register",

            difference:
                "Difference",

            closeNote:
                "Closing note",

            breakdownTitle:
                "Counted cash breakdown",

            breakdownDescription:
                "Bills, coins, tickets, transfers, and other amounts declared at closing.",

            consolidatedCounted:
                "Consolidated count",

            registerCounted:
                "Register count",

            billsCoins:
                "Bills/coins",

            billsAndCoins:
                "Bills and coins",

            totalClose:
                "Closing total",

            hideBreakdown:
                "Hide recorded bills and coins",

            showBreakdown:
                "View recorded bills and coins",

            breakdownHint:
                "Click to view the exact amount counted at closing.",

            billsCoinsDetail:
                "Bills and coins details",

            ticketValue:
                "Ticket {{amount}}",

            finalTitle:
                "Final Cash Register Closing",

            selectedSession:
                "Session selected for closing",

            instruction:
                "To view the summary, first enter the cash counted at closing.",

            totalCounted:
                "Total counted",

            countedLabel:
                "Cash counted (cash currently in the register)",

            denominationTitle:
                "Count by denomination",

            denominationDescription:
                "Enter the quantity of each bill or coin.",

            bill:
                "Bill",

            coin:
                "Coin",

            ticketDescription:
                "Physical credit ticket counted as cash.",

            ticketAmount:
                "Ticket amount",

            ticketSubtotal:
                "Ticket subtotal",

            transferDescription:
                "Amount confirmed by transfer.",

            transferAmount:
                "Transfer amount",

            otherDescription:
                "Other payment method or counted adjustment.",

            otherAmount:
                "Other amount",

            totalDeclared:
                "Total declared",

            optionalNote:
                "Closing note (optional)",

            notePlaceholder:
                "E.g. missing change, overage, cashier observation, etc.",

            closing:
                "Closing register...",

            registerClose:
                "Register closing",
        },

        sessions: {
            openTitle:
                "Open Sessions for This Register",

            openDescription:
                "Select the cashier session you want to close.",

            unnamedCashier:
                "Unnamed cashier",

            registerAndOpening:
                "Register: {{register}} · Initial float: {{amount}}",

            openedAt:
                "Opened",

            closeThis:
                "Close this session",
        },

        salesSummary: {
            title:
                "Sales Summary",

            totalCollected:
                "Total collected",

            paidOrders_one:
                "{{count}} paid order",

            paidOrders_other:
                "{{count}} paid orders",

            receivablePayments:
                "A/R payments",

            creditSales:
                "Credit sales (A/R)",
        },

        table: {
            invoiceNumber:
                "Invoice No.",

            noRecords:
                "No records available",
        },

        fullRecords: {
            title:
                "Full Records",
            summary:
                "Summary",

            dayFloat:
                "Day cash float",

            showingDayHistory:
                "Showing {{count}} records for {{date}}. To view history, use “View Full Records”.",

            adminOnly:
                "Daily records are available to administrators only.",
        },

        filters: {
            title:
                "Search Filters",

            from:
                "From date",

            to:
                "To date",

            paymentMethod:
                "Payment method",

            allMethods:
                "All methods",

            all:
                "All",

            fiscalDocument:
                "Fiscal document",

            withFiscal:
                "With fiscal document / e-CF",

            fiscalCredit:
                "Fiscal credit (B01 / E31)",

            finalConsumer:
                "Final consumer (B02 / E32)",

            fiscalDebit:
                "Fiscal debit / Debit note (E33)",

            creditNote:
                "Credit note (E34)",

            onlyB01:
                "B01 only",

            onlyB02:
                "B02 only",

            onlyE31:
                "E31 only",

            onlyE32:
                "E32 only",

            onlyE33:
                "E33 only",

            onlyE34:
                "E34 only",

            withoutFiscal:
                "Without fiscal document / e-CF",

            userSearch:
                "Search by user",

            userPlaceholder:
                "User name...",

            customerSearch:
                "Search by customer",

            customerPlaceholder:
                "Customer name...",
        },

        adjustClose: {
            title:
                "Edit Final Closing",

            description:
                "You can correct the closing using a direct total or by bills, tickets, and transfers.",

            adjustedCash:
                "Adjusted cash counted",

            denominationDescription:
                "Correct bills, coins, tickets, transfers, or other amounts.",

            notePlaceholder:
                "Reason for adjustment",

            saving:
                "Saving adjustment...",

            save:
                "Save adjustment",
        },

        ecf: {
            defaultCreditReason:
                "Partial product return",
            affectedInvoice:
                "Affected invoice",

            availableCreditBalance:
                "Available credit note balance",

            balanceBreakdown:
                "Original total: {{original}} · Applied debit: {{debit}} · Applied credit: {{credit}}",

            creditFullyApplied:
                "This invoice has already been fully covered by accepted credit notes. Another E34 cannot be issued.",

            defaultDebitReason:
                "Additional amount pending invoicing",

            disabled:
                "e-CF is disabled for this tenant.",

            debitDisabled:
                "Debit Note e33 is not enabled.",

            creditDisabled:
                "Credit Note e34 is not enabled.",

            orderUnavailable:
                "Order unavailable.",

            acceptedOnly:
                "Notes can only be created for accepted e-CF invoices.",

            validationError:
                "The e-CF for this invoice could not be validated.",

            reasonRequired:
                "You must enter a reason for the note.",

            validAmountRequired:
                "You must enter a valid amount.",

            noCreditBalance:
                "This invoice no longer has an available balance for a credit note.",

            creditExceedsBalance:
                "The credit note exceeds the available balance. Available: {{available}}. Requested: {{requested}}.",

            noteIssued:
                "{{type}} issued: {{number}}",

            issueError:
                "The note could not be issued.",

            debitNote:
                "Debit Note",

            creditNote:
                "Credit Note",

            debitNoteElectronic:
                "Electronic Debit Note e-CF",

            creditNoteElectronic:
                "Electronic Credit Note e-CF",

            electronicNote:
                "Electronic Note e-CF",

            createCreditNote:
                "Create Credit Note e34",

            createDebitNote:
                "Create Debit Note e33",

            e34Credit:
                "e34 - Credit Note",

            e33Debit:
                "e33 - Debit Note",

            type:
                "Type",

            originalInvoice:
                "Original invoice",

            originalTotal:
                "Original total",

            adjustmentMode:
                "Adjustment mode",

            partial:
                "Partial",

            total:
                "Total",

            baseAmount:
                "Base amount",

            modificationCode:
                "Modification code",

            modification1:
                "1 - Cancels or modifies document",

            modification2:
                "2 - Corrects text",

            modification3:
                "3 - Corrects amount",

            reason:
                "Reason",

            reasonPlaceholder:
                "Describe the reason for the note...",

            noteIssuedSuccessfully:
                "Note issued successfully",

            existingNotes:
                "Existing notes for this invoice",

            noteCount_one:
                "{{count}} note",

            noteCount_other:
                "{{count}} notes",

            loadingNotes:
                "Loading notes...",

            noNotes:
                "This invoice does not have any notes yet.",

            issuing:
                "Issuing...",

            issueNote:
                "Issue note",
        },

        excel: {
            salesSheet:
                "Cash Closing",

            summarySheet:
                "Summary",

            filePrefix:
                "cash_closing",

            columns: {
                invoice:
                    "Invoice",

                date:
                    "Date",

                user:
                    "User",

                customer:
                    "Customer",

                method:
                    "Method",

                total:
                    "Total",

                status:
                    "Status",

                orderId:
                    "Order ID",

                field:
                    "Field",

                value:
                    "Value",
            },

            summary: {
                opening:
                    "Initial cash float",
                invalidAmount:
                    "Invalid amount.",

                noOpenRegisterForDate:
                    "There is no open cash register for this date.",

                selectSpecificRegisterToClose:
                    "Select a specific register before closing it.",

                openingRequiredBeforeClose:
                    "An initial cash float must exist before the register can be closed.",

                closingBreakdownRequired:
                    "Enter bills, tickets, transfers, or another amount.",

                sessionIdNotFound:
                    "The session ID could not be found.",

                selectSpecificRegisterBeforeClose:
                    "Select a specific register before closing.",

                selectSpecificRegisterBeforeOpening:
                    "Select a specific register before saving the initial float.",

                selectSpecificRegisterBeforeEditingOpening:
                    "Select a specific register before editing the initial float.",

                selectedRegisterUnavailable:
                    "The selected register does not exist or is not active.",

                selectSpecificRegisterBeforeAdjustClosing:
                    "Select a specific register before adjusting the closing.",

                cannotAddToClosedRegister:
                    "The register is already closed. Cash cannot be added.",

                invoiceUnavailable:
                    "The invoice could not be retrieved.",

                invoiceLoadError:
                    "Error loading the invoice.",

                managerCodeInvalidFormat:
                    "Invalid code. It must contain 4 to 8 digits.",

                creditSales:
                    "Credit sales / A/R",

                receivablePayments:
                    "A/R payments collected",

                receivableCash:
                    "A/R cash payments",

                receivableCard:
                    "A/R card payments",

                receivableTransfer:
                    "A/R transfer payments",

                cashSales:
                    "Cash sales",

                cashInRegister:
                    "Cash in register (float + sales)",

                grandTotal:
                    "Grand total (all sales)",

                orders:
                    "Orders",

                totalWithOpening:
                    "Total (sales + cash float)",

                addedCash:
                    "Added cash",

                wasteCost:
                    "Waste cost",

                netSales:
                    "Net sales (sales - waste)",
            },
        },

        messages: {
            closeAdjustmentSaved:
                "Closing adjustment saved successfully.",

            closeAdjustmentError:
                "Error adjusting closing",

            closeSuccess:
                "Cash register closing recorded successfully.",

            closeError:
                "The cash register could not be closed.",

            invalidManagerCode:
                "Incorrect manager code.",

            managerCodeRequired:
                "Manager code is required.",

            managerCodeSaveError:
                "Error saving manager code",

            addCashError:
                "Cash could not be added.",

            sessionNotFound:
                "No session was found for that date/register.",

            adminOnlyAddAfterClose:
                "Only an admin can add cash after closing.",

            adminOnlyAddCash:
                "Only administrators can add cash.",

            pendingPreviousSession:
                "You have a previous register session pending closure ({{date}}) {{register}}. You must close it before entering the initial float.",

            registerSuffix:
                "Register: {{register}}",

            registerAlreadyClosed:
                "This register has already been closed for this date.",

            sessionAlreadyExists:
                "An opening already exists for this register and cashier.",

            openRegisterError:
                "The register could not be opened. Check whether a session already exists.",

            saveOpeningError:
                "The initial float could not be saved.",

            cashierSessionNotFound:
                "No cash session was found for this cashier and register.",

            closedOpeningEditForbidden:
                "The register is already closed. The initial float cannot be edited.",

            editOpeningError:
                "The initial float could not be edited.",

            recordsLoadError:
                "Error loading records.",

            exportError:
                "Error exporting the file. Check your session.",
        },
    },

    adminRegisterPage: {
        title:
            "Administration",

        subtitle:
            "Register users and manage your cash registers from one place.",


        common: {
            optional:
                "(optional)",
        },


        tabs: {
            users:
                "Register User",

            registers:
                "Manage Registers",
        },


        actions: {
            back:
                "Back",

            reload:
                "Reload",

            registerUser:
                "Register User",

            registering:
                "Registering...",

            cancel:
                "Cancel",

            saving:
                "Saving...",

            saveChanges:
                "Save Changes",

            creating:
                "Creating...",

            createRegister:
                "Create Register",

            edit:
                "Edit",

            deactivate:
                "Deactivate",

            activate:
                "Activate",
        },


        roles: {
            waiter:
                "Waiter",

            kitchen:
                "Kitchen",

            cashier:
                "Cashier",

            admin:
                "Admin",
        },


        users: {
            formTitle:
                "Register New User",


            fields: {
                name:
                    "Employee name",

                email:
                    "Email address",

                phone:
                    "Phone number",

                password:
                    "Password",

                role:
                    "Employee role",
            },


            placeholders: {
                name:
                    "E.g. John Smith",

                email:
                    "example@email.com",

                phone:
                    "E.g. 8095551234",
            },


            cashiersTitle:
                "Cashiers / Admins",

            loading:
                "Loading users...",

            emptyCashiers:
                "There are no cashiers or administrators registered yet.",
        },


        registers: {
            newTitle:
                "New Register",

            editTitle:
                "Edit Register",


            fields: {
                code:
                    "Code",

                name:
                    "Name",

                location:
                    "Location",

                sortOrder:
                    "Order",

                defaultCashier:
                    "Default cashier",

                active:
                    "Active register",
            },


            placeholders: {
                code:
                    "E.g. REGISTER1",

                name:
                    "E.g. Register 1",

                location:
                    "E.g. Dining Room / Bar / Entrance",
            },


            unassigned:
                "Unassigned",

            noLocation:
                "No location",


            listTitle:
                "Registered Cash Registers",

            listDescription:
                "Create, edit, activate, or deactivate your cash registers.",

            showInactive:
                "Show inactive",

            loading:
                "Loading registers...",

            empty:
                "There are no cash registers registered yet.",


            status: {
                active:
                    "Active",

                inactive:
                    "Inactive",
            },
        },


        messages: {
            accessDenied:
                "Access denied. Admins only.",


            userCreated:
                "User registered successfully.",

            userCreateFailed:
                "The user could not be registered.",


            registerCreated:
                "Cash register created successfully.",

            registerCreateFailed:
                "The cash register could not be created.",


            registerUpdated:
                "Cash register updated successfully.",

            registerUpdateFailed:
                "The cash register could not be updated.",


            registerStatusUpdated:
                "Cash register status updated.",

            registerStatusUpdateFailed:
                "The cash register status could not be changed.",


            registerCodeRequired:
                "Enter the cash register code.",

            registerNameRequired:
                "Enter the cash register name.",
        },
    },
};

export default en;