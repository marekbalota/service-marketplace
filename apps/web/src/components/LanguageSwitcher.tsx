import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Button } from '#/components/ui/button'

type Language = 'en' | 'sk' | 'cs'

const languages: { code: Language; nativeName: string }[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'sk', nativeName: 'Slovenčina' },
  { code: 'cs', nativeName: 'Čeština' },
]

function getInitialLang(): Language {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('language') : null
  return stored === 'sk' || stored === 'cs' ? stored : 'en'
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const [lang, setLang] = useState<Language>(getInitialLang)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2"
            aria-label={t('language.label')}
          />
        }
      >
        <Globe className="size-4 shrink-0" />
        <span className="hidden sm:inline">{lang.toUpperCase()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {languages.map(({ code, nativeName }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => {
              if (code === lang) return
              setLang(code)
              i18n.changeLanguage(code)
              localStorage.setItem('language', code)
            }}
          >
            <span className="flex items-center justify-between w-full">
              <span>{nativeName}</span>
              {lang === code && <Check className="size-3.5 text-primary" />}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
