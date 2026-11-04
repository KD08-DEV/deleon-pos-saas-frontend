import countries from "world-countries";

// ======================================================
// AJUSTES REGIONALES ESPECIALES
// ======================================================
//
// Solo ponemos aquí configuraciones que no se pueden
// deducir correctamente únicamente del país.
//
// NO contiene impuestos.
// ======================================================

const REGIONAL_OVERRIDES = {
    DO: {
        language: "es",
        locale: "es-DO",
        timezone: "America/Santo_Domingo",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12h",
        measurementSystem: "imperial",
        weightUnit: "lb",
    },

    US: {
        language: "en",
        locale: "en-US",
        timezone: "America/New_York",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h",
        measurementSystem: "imperial",
        weightUnit: "lb",
    },

    GB: {
        language: "en",
        locale: "en-GB",
        timezone: "Europe/London",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h",
        measurementSystem: "metric",
        weightUnit: "kg",
    },

    AU: {
        language: "en",
        locale: "en-AU",
        timezone: "Australia/Sydney",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12h",
        measurementSystem: "metric",
        weightUnit: "kg",
    },

    CO: {
        language: "es",
        locale: "es-CO",
        timezone: "America/Bogota",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12h",
        measurementSystem: "metric",
        weightUnit: "kg",
    },

    MX: {
        language: "es",
        locale: "es-MX",
        timezone: "America/Mexico_City",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12h",
        measurementSystem: "metric",
        weightUnit: "kg",
    },

    ES: {
        language: "es",
        locale: "es-ES",
        timezone: "Europe/Madrid",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h",
        measurementSystem: "metric",
        weightUnit: "kg",
    },

    CA: {
        language: "en",
        locale: "en-CA",
        timezone: "America/Toronto",
        dateFormat: "YYYY-MM-DD",
        timeFormat: "12h",
        measurementSystem: "metric",
        weightUnit: "kg",
    },

    PA: {
        language: "es",
        locale: "es-PA",
        timezone: "America/Panama",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12h",
        measurementSystem: "metric",
        weightUnit: "kg",
    },

    PR: {
        language: "es",
        locale: "es-PR",
        timezone: "America/Puerto_Rico",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h",
        measurementSystem: "imperial",
        weightUnit: "lb",
    },
};

// ======================================================
// OBTENER MONEDA PRINCIPAL
// ======================================================

function getPrimaryCurrency(country) {
    const currencies =
        country?.currencies || {};

    const currencyCodes =
        Object.keys(currencies);

    return (
        currencyCodes[0] ||
        "USD"
    );
}

// ======================================================
// IDIOMA FALLBACK
// ======================================================

function guessLanguage(countryCode) {
    const spanishCountries = new Set([
        "DO",
        "CO",
        "MX",
        "ES",
        "PA",
        "PR",
        "AR",
        "CL",
        "PE",
        "EC",
        "VE",
        "UY",
        "PY",
        "BO",
        "CR",
        "GT",
        "HN",
        "NI",
        "SV",
    ]);

    if (
        spanishCountries.has(
            countryCode
        )
    ) {
        return "es";
    }

    return "en";
}

// ======================================================
// CREAR CONFIGURACIÓN DEL PAÍS
// ======================================================

export function getCountryPreset(
    countryCode
) {
    const code =
        String(
            countryCode || ""
        )
            .trim()
            .toUpperCase();

    const country =
        countries.find(
            (item) =>
                item.cca2 === code
        );

    if (!country) {
        return null;
    }

    const override =
        REGIONAL_OVERRIDES[
            code
            ] || {};

    const language =
        override.language ||
        guessLanguage(code);

    const timezone =
        override.timezone ||
        country.timezones?.[0] ||
        "UTC";

    return {
        countryCode:
        code,

        countryName:
            country.name?.common ||
            code,

        language,

        locale:
            override.locale ||
            `${language}-${code}`,

        currency:
            getPrimaryCurrency(
                country
            ),

        timezone,

        timezones:
            Array.isArray(
                country.timezones
            )
                ? country.timezones
                : [timezone],

        dateFormat:
            override.dateFormat ||
            "DD/MM/YYYY",

        timeFormat:
            override.timeFormat ||
            "12h",

        measurementSystem:
            override.measurementSystem ||
            "metric",

        weightUnit:
            override.weightUnit ||
            "kg",
    };
}

// ======================================================
// LISTA PARA SELECT
// ======================================================

export const COUNTRY_OPTIONS =
    countries
        .map((country) => ({
            code:
            country.cca2,

            name:
                country.name
                    ?.common ||
                country.cca2,

            flag:
                country.flag ||
                "",
        }))
        .sort(
            (a, b) =>
                a.name.localeCompare(
                    b.name
                )
        );