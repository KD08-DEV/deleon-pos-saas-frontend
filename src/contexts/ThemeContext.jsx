import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        // Cargar tema del localStorage o usar dark por defecto
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            return savedTheme || 'dark';
        }
        return 'dark';
    });

    // Aplicar tema inicial y cuando cambia
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const root = document.documentElement;
        
        // Asegurar que el tema dark esté aplicado por defecto
        if (theme === 'light') {
            root.classList.remove('dark');
        } else {
            root.classList.add('dark');
        }
        
        // Guardar en localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    const setDarkTheme = () => setTheme('dark');
    const setLightTheme = () => setTheme('light');

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setDarkTheme, setLightTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
