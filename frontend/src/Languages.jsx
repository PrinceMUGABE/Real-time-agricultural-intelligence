/* eslint-disable no-unused-vars */
// src/components/LanguageSwitcher.jsx
import React from 'react';
import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <select 
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      value={i18n.language}
      className="px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
      <option value="sw">Swahili</option>
      <option value="rw">Kinyarwanda</option>
    </select>
  );
};

export default LanguageSwitcher;