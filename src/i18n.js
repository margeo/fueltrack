import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import el from "./locales/el.json";
import en from "./locales/en.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { el: { translation: el }, en: { translation: en } },
    lng: localStorage.getItem("ft_language") || (navigator.language?.startsWith("el") ? "el" : "en"),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "ft_language",
      caches: ["localStorage"],
    },
  });

export default i18n;
