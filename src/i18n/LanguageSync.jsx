import {
    useEffect,
} from "react";

import {
    useSelector,
} from "react-redux";

import i18n from "./index.js";

import {
    getTenantLocalization,
} from "../lib/localization.js";

import {
    normalizeAppLanguage,
} from "./languages.js";


export default function LanguageSync() {

    const tenantState =
        useSelector(
            (
                state
            ) =>
                state?.store ||
                state?.tenant ||
                {}
        );


    const tenant =
        tenantState
            ?.tenant ||
        tenantState
            ?.data ||
        tenantState;


    const localization =
        getTenantLocalization(
            tenant
        );


    const language =
        normalizeAppLanguage(
            localization
                ?.language
        );


    useEffect(
        () => {

            if (
                i18n.resolvedLanguage !==
                language
            ) {
                i18n.changeLanguage(
                    language
                );
            }


            if (
                typeof document !==
                "undefined"
            ) {
                document
                    .documentElement
                    .lang =
                    language;
            }

        },

        [
            language,
        ]
    );


    return null;
}