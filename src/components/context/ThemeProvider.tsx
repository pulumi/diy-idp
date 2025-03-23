import {ReactNode, useEffect, useState} from "react";
import {ThemeContext} from "./ThemeContext.tsx";

interface ThemeProviderProps {
    children: ReactNode;
}


export function ThemeProvider({children}: ThemeProviderProps) {
    const [theme, setTheme] = useState<'light' | 'dark'>(localStorage.getItem('theme') as 'light' | 'dark' || 'light');

    useEffect(() => {
        localStorage.setItem('theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{theme, setTheme}}>
            {children}
        </ThemeContext.Provider>
    );
};
