// ======================================================
// IDENTIFICACIÓN FISCAL PARA DOCUMENTOS / UI
// ======================================================

const normalizeTaxIdentity = (
    raw,
    fallbackCountryCode = ""
) => {
    if (
        !raw ||
        typeof raw !== "object"
    ) {
        return null;
    }


    /*
     * Negocio:
     *
     * taxIdentity.primaryTaxId
     *
     * Cliente / orden:
     *
     * customerDetails.taxIdentity
     */
    const source =
        raw?.primaryTaxId &&
        typeof raw.primaryTaxId === "object"
            ? raw.primaryTaxId
            : raw;


    const value =
        String(
            source?.value ||
            ""
        ).trim();


    if (!value) {
        return null;
    }


    const type =
        String(
            source?.type ||
            "TAX_ID"
        )
            .trim()
            .toUpperCase();


    return {
        countryCode:
            String(
                source?.countryCode ||
                raw?.countryCode ||
                fallbackCountryCode ||
                ""
            )
                .trim()
                .toUpperCase(),

        type,

        label:
            String(
                source?.label ||
                type ||
                "Tax ID"
            ).trim(),

        value,
    };
};


// ======================================================
// IDENTIFICACIÓN DEL NEGOCIO
// ======================================================

export const getBusinessTaxIdentity = (
    tenantInfo = {}
) => {
    const config =
        tenantInfo?.taxIdentity ||
        {};


    // ==============================================
    // FORMATO INTERNACIONAL NUEVO
    // ==============================================

    if (
        config?.enabled === true
    ) {
        const identity =
            normalizeTaxIdentity(
                config,

                config?.countryCode ||
                tenantInfo
                    ?.localization
                    ?.countryCode ||
                ""
            );


        if (identity) {
            return identity;
        }
    }


    // ==============================================
    // COMPATIBILIDAD RNC LEGACY
    // ==============================================

    const legacyRnc =
        String(
            tenantInfo
                ?.business
                ?.rnc ||
            tenantInfo
                ?.fiscal
                ?.rnc ||
            ""
        ).trim();


    if (!legacyRnc) {
        return null;
    }


    return {
        countryCode:
            "DO",

        type:
            "RNC",

        label:
            "RNC",

        value:
        legacyRnc,
    };
};


// ======================================================
// IDENTIFICACIÓN DEL CLIENTE
// ======================================================

export const getCustomerTaxIdentity = (
    order = {}
) => {
    const newIdentity =
        normalizeTaxIdentity(
            order
                ?.customerDetails
                ?.taxIdentity ||
            order
                ?.customerTaxIdentity ||
            null
        );


    if (newIdentity) {
        return newIdentity;
    }


    // ==============================================
    // LEGACY
    // ==============================================

    const legacy =
        String(
            order
                ?.customerDetails
                ?.rncCedula ||
            order
                ?.customerDetails
                ?.rnc ||
            order
                ?.customerRnc ||
            order
                ?.customerRNC ||
            ""
        ).trim();


    if (!legacy) {
        return null;
    }


    const digits =
        legacy.replace(
            /\D/g,
            ""
        );


    let type =
        "RNC_CEDULA";

    let label =
        "RNC / Cédula";


    if (
        digits.length === 9
    ) {
        type =
            "RNC";

        label =
            "RNC";
    }


    if (
        digits.length === 11
    ) {
        type =
            "CEDULA";

        label =
            "Cédula";
    }


    return {
        countryCode:
            "DO",

        type,

        label,

        value:
        legacy,
    };
};