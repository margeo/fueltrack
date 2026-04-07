import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import el from "./locales/el.json";

// Initialize i18n for tests with Greek as default (matching production default)
i18n.use(initReactI18next).init({
  resources: { el: { translation: el } },
  lng: "el",
  fallbackLng: "el",
  interpolation: { escapeValue: false },
});
