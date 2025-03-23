import {createRoot} from 'react-dom/client'
import './index.css'
import App from "./App.tsx";
import React from 'react';
import {ThemeProvider} from "./components/context/ThemeProvider.tsx";

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider>
            <div className="bg-white dark:bg-gray-800">
                <App/>
            </div>
        </ThemeProvider>
    </React.StrictMode>
,
)
