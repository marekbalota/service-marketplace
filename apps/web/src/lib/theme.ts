import { useState, useEffect } from "react"
import { getStoredMode } from "#/components/ThemeToggle"

export function useAppTheme(): ReturnType<typeof getStoredMode> {
  const [theme, setTheme] = useState<ReturnType<typeof getStoredMode>>("auto")
  useEffect(() => { setTheme(getStoredMode()) }, [])
  return theme
}
