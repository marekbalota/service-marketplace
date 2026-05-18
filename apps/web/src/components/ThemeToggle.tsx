import { useEffect, useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '#/components/ui/button'

type ThemeMode = 'light' | 'dark' | 'auto'

export function getStoredMode(): ThemeMode {
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  return 'auto'
}

function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode

  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)
  document.documentElement.style.colorScheme = resolved

  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }
}

export function ThemeToggle() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ThemeMode>('auto')

  useLayoutEffect(() => {
    const initial = getStoredMode()
    setMode(initial)
    applyThemeMode(initial)
  }, [])

  useEffect(() => {
    if (mode !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('auto')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  function toggleMode() {
    const nextMode: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light'
    setMode(nextMode)
    applyThemeMode(nextMode)
    window.localStorage.setItem('theme', nextMode)
  }

  const modeLabel =
    mode === 'auto' ? t('theme.auto') : mode === 'dark' ? t('theme.dark') : t('theme.light')
  const ariaLabel =
    mode === 'auto' ? t('theme.labelAuto') : t('theme.labelMode', { mode: modeLabel })

  return (
    <Button
      type="button"
      onClick={toggleMode}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="bg-foreground text-background hover:bg-foreground/90"
    >
      {modeLabel}
    </Button>
  )
}
