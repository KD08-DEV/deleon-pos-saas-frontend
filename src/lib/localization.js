export function getTenantLocalization(
    tenantInfo = {}
) {
    const localization =
        tenantInfo?.localization || {};

    const supportedDateFormats = [
        "DD/MM/YYYY",
        "MM/DD/YYYY",
        "YYYY-MM-DD",
    ];

    const dateFormat =
        supportedDateFormats.includes(
            localization.dateFormat
        )
            ? localization.dateFormat
            : "DD/MM/YYYY";

    return {
        countryCode:
            String(
                localization.countryCode ||
                "DO"
            )
                .trim()
                .toUpperCase() ||
            "DO",

        language:
            String(
                localization.language ||
                "es"
            )
                .trim()
                .toLowerCase() ||
            "es",

        locale:
            String(
                localization.locale ||
                "es-DO"
            ).trim() ||
            "es-DO",

        currency:
            String(
                localization.currency ||
                "DOP"
            )
                .trim()
                .toUpperCase() ||
            "DOP",

        timezone:
            String(
                localization.timezone ||
                "America/Santo_Domingo"
            ).trim() ||
            "America/Santo_Domingo",

        dateFormat,

        timeFormat:
            localization.timeFormat ===
            "24h"
                ? "24h"
                : "12h",

        measurementSystem:
            localization
                .measurementSystem ===
            "metric"
                ? "metric"
                : "imperial",

        weightUnit:
            localization.weightUnit ===
            "kg"
                ? "kg"
                : "lb",
    };
}
export function getDefaultWeightUnit(
    localization = {}
) {
    if (
        localization.weightUnit ===
        "kg"
    ) {
        return "kg";
    }

    if (
        localization.weightUnit ===
        "lb"
    ) {
        return "lb";
    }

    return (
        localization.measurementSystem ===
        "metric"
            ? "kg"
            : "lb"
    );
}

export function getWeightUnitLabel(
    unit
) {
    if (unit === "kg") {
        return "Kilogramo (kg)";
    }

    if (unit === "lb") {
        return "Libra (lb)";
    }

    return String(
        unit || ""
    );
}
export function formatMoney(
    value,
    localization = {}
) {
    const locale =
        localization.locale ||
        "es-DO";

    const currency =
        localization.currency ||
        "DOP";

    const parsed =
        Number(value);

    const amount =
        Number.isFinite(parsed)
            ? parsed
            : 0;

    try {
        return new Intl.NumberFormat(
            locale,
            {
                style: "currency",
                currency,
            }
        ).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

export function getCurrencySymbol(
    localization = {}
) {
    const locale =
        localization.locale ||
        "es-DO";

    const currency =
        localization.currency ||
        "DOP";

    try {
        const parts =
            new Intl.NumberFormat(
                locale,
                {
                    style: "currency",
                    currency,
                    currencyDisplay:
                        "symbol",
                }
            ).formatToParts(0);

        return (
            parts.find(
                (part) =>
                    part.type ===
                    "currency"
            )?.value ||
            currency
        );
    } catch {
        return currency;
    }
}

function normalizeDate(
    value
) {
    if (!value) {
        return null;
    }

    const raw =
        typeof value ===
        "object" &&
        value?.$date
            ? value.$date
            : value;

    const date =
        new Date(raw);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
}
function getDateParts(
    date,
    localization = {}
) {
    const timezone =
        localization.timezone ||
        "America/Santo_Domingo";

    try {
        const parts =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    timeZone:
                    timezone,

                    year:
                        "numeric",

                    month:
                        "2-digit",

                    day:
                        "2-digit",
                }
            ).formatToParts(
                date
            );

        const get =
            (type) =>
                parts.find(
                    (part) =>
                        part.type ===
                        type
                )?.value || "";

        return {
            year:
                get("year"),

            month:
                get("month"),

            day:
                get("day"),
        };
    } catch {
        return {
            year:
                String(
                    date.getFullYear()
                ),

            month:
                String(
                    date.getMonth() + 1
                ).padStart(2, "0"),

            day:
                String(
                    date.getDate()
                ).padStart(2, "0"),
        };
    }
}
export function getYMDInTimezone(
    value = new Date(),
    localization = {}
) {
    const date =
        normalizeDate(value);

    if (!date) {
        return null;
    }

    const {
        year,
        month,
        day,
    } = getDateParts(
        date,
        localization
    );

    if (
        !year ||
        !month ||
        !day
    ) {
        return null;
    }

    return `${year}-${month}-${day}`;
}

export function getTodayYMD(
    localization = {}
) {
    return (
        getYMDInTimezone(
            new Date(),
            localization
        ) ||
        new Date()
            .toISOString()
            .slice(0, 10)
    );
}

export function addDaysYMD(
    value,
    days = 0
) {
    const match =
        String(value || "")
            .trim()
            .match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );

    if (!match) {
        return null;
    }

    const year =
        Number(match[1]);

    const month =
        Number(match[2]);

    const day =
        Number(match[3]);

    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );

    date.setUTCDate(
        date.getUTCDate() +
        Number(days || 0)
    );

    return date
        .toISOString()
        .slice(0, 10);
}

export function formatWeekday(
    value,
    localization = {}
) {
    const date =
        normalizeDate(value);

    if (!date) {
        return "";
    }

    try {
        return new Intl.DateTimeFormat(
            localization.locale ||
            "es-DO",
            {
                timeZone:
                    localization.timezone ||
                    "America/Santo_Domingo",

                weekday: "long",
            }
        ).format(date);
    } catch {
        return "";
    }
}
export function formatDate(
    value,
    localization = {}
) {
    const date =
        normalizeDate(value);

    if (!date) {
        return "N/A";
    }

    const {
        year,
        month,
        day,
    } = getDateParts(
        date,
        localization
    );

    const dateFormat =
        localization.dateFormat ||
        "DD/MM/YYYY";

    if (
        dateFormat ===
        "MM/DD/YYYY"
    ) {
        return `${month}/${day}/${year}`;
    }

    if (
        dateFormat ===
        "YYYY-MM-DD"
    ) {
        return `${year}-${month}-${day}`;
    }

    return `${day}/${month}/${year}`;
}
export function formatTime(
    value,
    localization = {}
) {
    const date =
        normalizeDate(value);

    if (!date) {
        return "N/A";
    }

    const locale =
        localization.locale ||
        "es-DO";

    const timezone =
        localization.timezone ||
        "America/Santo_Domingo";

    const hour12 =
        localization.timeFormat !==
        "24h";

    try {
        return new Intl.DateTimeFormat(
            locale,
            {
                timeZone:
                timezone,

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12,
            }
        ).format(date);
    } catch {
        return date.toLocaleTimeString();
    }
}
export function formatDateTime(
    value,
    localization = {}
) {
    const date =
        normalizeDate(value);

    if (!date) {
        return "N/A";
    }

    return `${formatDate(
        date,
        localization
    )}, ${formatTime(
        date,
        localization
    )}`;
}