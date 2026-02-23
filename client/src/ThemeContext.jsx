import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    const [dark, setDark] = useState(() => {
        const saved = localStorage.getItem('qualitea-theme')
        if (saved) return saved === 'dark'
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
    })

    useEffect(() => {
        const root = document.documentElement
        if (dark) {
            root.classList.add('dark')
            localStorage.setItem('qualitea-theme', 'dark')
        } else {
            root.classList.remove('dark')
            localStorage.setItem('qualitea-theme', 'light')
        }
    }, [dark])

    return (
        <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext)
}
