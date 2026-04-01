'use client'
// Replaces the inline theme toggle script from admin.html:
//   toggleTheme() + localStorage.getItem('theme') + data-theme attribute

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme:  Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:  'dark',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  // On mount — read from localStorage exactly like the original inline IIFE
  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme) ?? 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Hook — use in any client component
export function useTheme() {
  return useContext(ThemeContext)
}
