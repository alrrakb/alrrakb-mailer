"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { setTheme, theme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // useEffect only runs on the client, so now we can safely show the UI
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse">
                <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
        );
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100 transition-colors border border-transparent dark:border-gray-700/50"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            {theme === "dark" ? (
                <Moon className="h-[1.1rem] w-[1.1rem]" />
            ) : (
                <Sun className="h-[1.1rem] w-[1.1rem]" />
            )}
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}
