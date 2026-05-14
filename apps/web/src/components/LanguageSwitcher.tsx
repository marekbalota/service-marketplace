import { useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '#/components/ui/select'

type Language = 'en' | 'sk' | 'cs'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const [lang, setLang] = useState<Language>('en')

  useLayoutEffect(() => {
    const stored = localStorage.getItem('language')
    const initial: Language = stored === 'sk' || stored === 'cs' ? stored : 'en'
    setLang(initial)
  }, [])

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
