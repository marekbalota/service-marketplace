import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../translations/en.json'
import sk from '../translations/sk.json'
import cs from '../translations/cs.json'

const stored = typeof window !== 'undefined' ? localStorage.getItem('language') : null
const lng = stored === 'sk' || stored === 'cs' ? stored : 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sk: { translation: sk },
    cs: { translation: cs },
  },
  lng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
