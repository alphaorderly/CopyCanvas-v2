import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ko from './locales/ko.json';

const STORAGE_LANGUAGE = 'copycanvas-language';

const getInitialLanguage = (): string => {
    const saved = localStorage.getItem(STORAGE_LANGUAGE);
    if (saved === 'en' || saved === 'ko') return saved;
    return 'en';
};

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        ko: { translation: ko },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

i18n.on('languageChanged', (lng) => {
    localStorage.setItem(STORAGE_LANGUAGE, lng);
});

export default i18n;
