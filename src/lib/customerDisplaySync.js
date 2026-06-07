export const CUSTOMER_DISPLAY_KEY = "deleonsoft_customer_display_state";
export const CUSTOMER_DISPLAY_CHANNEL = "deleonsoft_customer_display_channel";

const defaultState = {
    status: "idle", // idle | active | payment | paid
    orderId: null,
    customerName: "",
    tableLabel: "",
    orderSource: "DINE_IN",
    items: [],
    subtotal: 0,
    discount: 0,
    deliveryFee: 0,
    tax: 0,
    tip: 0,
    commission: 0,
    total: 0,
    paymentMethod: "",
    cashReceived: 0,
    cashChange: 0,
    cashMissing: 0,
    message: "Su orden aparecerá aquí.",
    updatedAt: Date.now(),
};

const num = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const safeJsonParse = (value) => {
    try {
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
};

export const readCustomerDisplayState = () => {
    if (typeof window === "undefined") return defaultState;

    const saved = safeJsonParse(localStorage.getItem(CUSTOMER_DISPLAY_KEY));

    return {
        ...defaultState,
        ...(saved || {}),
    };
};

export const buildDisplayItems = (items = []) => {
    if (!Array.isArray(items)) return [];

    return items.map((item, index) => {
        const quantity = num(item?.quantity ?? item?.qty ?? 1);
        const unitPrice = num(
            item?.unitPrice ??
            item?.pricePerQuantity ??
            item?.pricePerLb ??
            item?.pricePerLB ??
            item?.price ??
            0
        );

        const lineTotal = num(
            item?.price ??
            unitPrice * quantity
        );

        return {
            id: String(item?.lineId || item?.dishId || item?._id || item?.id || index),
            name: String(item?.name || item?.dishName || item?.itemName || "Producto"),
            quantity,
            qtyType: item?.qtyType || "unit",
            weightUnit: item?.weightUnit || "",
            unitPrice,
            price: Number(lineTotal.toFixed(2)),
            note: item?.note || "",
        };
    });
};

export const publishCustomerDisplayPatch = (patch = {}) => {
    if (typeof window === "undefined") return defaultState;

    const previous = readCustomerDisplayState();

    const next = {
        ...previous,
        ...patch,
        updatedAt: Date.now(),
    };

    localStorage.setItem(CUSTOMER_DISPLAY_KEY, JSON.stringify(next));

    if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
        channel.postMessage(next);
        channel.close();
    }

    return next;
};

export const clearCustomerDisplay = () => {
    return publishCustomerDisplayPatch({
        ...defaultState,
        updatedAt: Date.now(),
    });
};

export const subscribeCustomerDisplayState = (callback) => {
    if (typeof window === "undefined") return () => {};

    callback(readCustomerDisplayState());

    let channel = null;

    if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);

        channel.onmessage = (event) => {
            callback({
                ...defaultState,
                ...(event.data || {}),
            });
        };
    }

    const onStorage = (event) => {
        if (event.key !== CUSTOMER_DISPLAY_KEY) return;

        callback({
            ...defaultState,
            ...(safeJsonParse(event.newValue) || {}),
        });
    };

    window.addEventListener("storage", onStorage);

    return () => {
        window.removeEventListener("storage", onStorage);

        if (channel) {
            channel.close();
        }
    };
};

export const openCustomerDisplayWindow = (screen = "11") => {
    if (typeof window === "undefined") return null;

    const url = `${window.location.origin}/customer-display?screen=${encodeURIComponent(screen)}`;

    const width = screen === "7" ? 800 : 1120;
    const height = screen === "7" ? 480 : 700;

    const popup = window.open(
        url,
        "deleonsoft_customer_display",
        `popup=yes,width=${width},height=${height},left=100,top=100`
    );

    if (popup) {
        popup.focus();
    }

    return popup;
};

export const formatCurrency = (value) => {
    return `RD$${num(value).toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};