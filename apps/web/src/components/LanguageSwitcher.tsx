import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Globe, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Button } from '#/components/ui/button'
import type { SupportedLocale } from '@marketplace/shared'
import { useLocale } from '#/lib/useLocale'

const languages: { code: SupportedLocale; nativeName: string }[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'sk', nativeName: 'Slovenčina' },
  { code: 'cs', nativeName: 'Čeština' },
]

export function LanguageSwitcher() {
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2"
            aria-label={t('language.label')}
            data-testid="language-switcher"
          />
        }
      >
        <Globe className="size-4 shrink-0" />
        <span className="hidden sm:inline">{locale.toUpperCase()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {languages.map(({ code, nativeName }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => {
              if (code === locale) return
              void navigate({
                to: '.',
                params: (prev) => ({ ...prev, locale: code }),
                search: (prev) => prev,
                replace: true,
              })
            }}
          >
            <span className="flex items-center justify-between w-full">
              <span>{nativeName}</span>
              {locale === code && <Check className="size-3.5 text-primary" />}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
