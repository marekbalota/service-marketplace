import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { z } from 'zod'
import en from '../translations/en.json'
import sk from '../translations/sk.json'
import cs from '../translations/cs.json'
import { zodErrorMap } from './zodErrorMap'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sk: { translation: sk },
    cs: { translation: cs },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

z.config({ customError: zodErrorMap })

export default i18n
