import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locals/en/translations.json";
import fr from "./locals/fr/translations.json";
import rw from "./locals/rw/translations.json";
import sw from "./locals/sw/translations.json";

const savedLanguage =
  localStorage.getItem("language") ||
  navigator.language?.split("-")[0] ||
  "en";

const supportedCodes = ["en", "fr", "rw", "sw"];
const resolvedLang = supportedCodes.includes(savedLanguage) ? savedLanguage : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    rw: { translation: rw },
    sw: { translation: sw },
  },
  lng:           resolvedLang,
  fallbackLng:   "en",
  interpolation: { escapeValue: false },
});

export default i18n;