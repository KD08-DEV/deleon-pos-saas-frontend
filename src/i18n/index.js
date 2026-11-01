import i18n from "i18next";

import {
    initReactI18next,
} from "react-i18next";

import es from "./locales/es.js";
import en from "./locales/en.js";


i18n
    .use(
        initReactI18next
    )
    .init({
        resources: {
            es: {
                translation:
                es,
            },

            en: {
                translation:
                en,
            },
        },


        /*
         * Antes de cargar el tenant,
         * arrancamos en español.
         *
         * LanguageSync lo actualizará
         * automáticamente.
         */
        lng:
            "es",

        fallbackLng:
            "es",


        interpolation: {
            escapeValue:
                false,
        },


        returnNull:
            false,

        returnEmptyString:
            false,
    });


export default i18n;