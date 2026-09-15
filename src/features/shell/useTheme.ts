// Theme state + document application. Preference is cosmetic; losing it
// in hardened storage is acceptable.
import { useEffect, useState } from 'react'

import type { Theme } from '../../shared/settings/exportSettings'
import { THEME_KEY } from '../../shared/settings/storageKeys'

const getInitialTheme = (): Theme => {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(THEME_KEY)
  } catch {
    // Hardened storage just means we fall back to the system theme.
  }
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Theme preference is cosmetic; losing it is acceptable.
    }
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#1b1b19' : '#f7f6f3',
    )
  }, [theme])

  return { theme, setTheme }
}
