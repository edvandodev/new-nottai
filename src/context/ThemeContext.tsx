import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type ThemeDefinition = {
  id: string
  name: string
  enabled: boolean
  locked?: boolean
}

const STORAGE_KEY = 'nottai.theme'

const themeDefinitions: ThemeDefinition[] = [
  { id: 'theme-01', name: 'Tema 01 (Atual)', enabled: true, locked: false },
  // { id: 'theme-02', name: 'Tema 02', enabled: false, locked: true },
  // { id: 'theme-03', name: 'Tema 03', enabled: false, locked: true }
]

type ThemeContextValue = {
  themeId: string
  setThemeId: (id: string) => void
  themes: ThemeDefinition[]
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const applyThemeAttribute = (id: string) => {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', id)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return 'theme-01'
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored || 'theme-01'
  })

  useEffect(() => {
    applyThemeAttribute(themeId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, themeId)
    }
  }, [themeId])

  const setThemeId = (id: string) => {
    const exists = themeDefinitions.some((t) => t.id === id && t.enabled)
    if (!exists) return
    setThemeIdState(id)
  }

  const value = useMemo(
    () => ({
      themeId,
      setThemeId,
      themes: themeDefinitions
    }),
    [themeId]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export { themeDefinitions }
