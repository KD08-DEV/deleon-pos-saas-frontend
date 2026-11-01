export const SUPPORTED_LANGUAGES = [
    {
        code: "es",
        name: "Español",
    },
    {
        code: "en",
        name: "English",
    },
];


export function normalizeAppLanguage(
    value
) {
    const normalized =
        String(
            value || ""
        )
            .trim()
            .toLowerCase()
            .split(
                /[-_]/
            )[0];


    const supported =
        SUPPORTED_LANGUAGES
            .some(
                (
                    language
                ) =>
                    language.code ===
                    normalized
            );


    return supported
        ? normalized
        : "es";
}