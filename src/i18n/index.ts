import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ptBR from "./locales/pt-BR.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

const resources = {
    "pt-BR": { translation: ptBR },
    en: { translation: en },
    es: { translation: es },
};

if (typeof window !== "undefined") {
    i18n.use(LanguageDetector);
}

i18n
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "pt-BR",
        supportedLngs: ["pt-BR", "en", "es"],
        interpolation: { escapeValue: false },
        detection: {
            order: ["localStorage"],
            lookupLocalStorage: "lexa-lang",
            caches: ["localStorage"],
        },
    });

export default i18n;

export const LANGUAGES = [
    { code: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "es", label: "Español", flag: "🇪🇸" },
] as const;
