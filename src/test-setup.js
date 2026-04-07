// Initialize i18n for tests with Greek as default
import "./i18n";
import i18n from "i18next";

// Force Greek in tests to match test expectations
i18n.changeLanguage("el");
