import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger } from '#/components/ui/select'

type Language = 'en' | 'sk' | 'cs'

function getInitialLang(): Language {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('language') : null
  return stored === 'sk' || stored === 'cs' ? stored : 'en'
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const [lang, setLang] = useState<Language>(getInitialLang)

  return (
    <Select
      value={lang}
      onValueChange={(value) => {
        if (!value) return
        const l = value as Language
        setLang(l)
        i18n.changeLanguage(l)
        localStorage.setItem('language', l)
      }}
    >
      <SelectTrigger className="w-[70px]" aria-label={t('language.label')}>
        {lang.toUpperCase()}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">EN</SelectItem>
        <SelectItem value="sk">SK</SelectItem>
        <SelectItem value="cs">CS</SelectItem>
      </SelectContent>
    </Select>
  )
}
