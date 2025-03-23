import Header from './Header.tsx';
import React from "react";

type LayoutProps = {
    children: React.ReactNode;
}

export default function Layout({children}: LayoutProps) {
    return (
        <div className="flex flex-col h-screen">
            <Header/>
            <div className="flex flex-row h-[calc(100vh-5.64rem)]">
                <main className="w-full overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};
