import {createContext} from 'react';

interface ThemeContextType {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
}


export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);


