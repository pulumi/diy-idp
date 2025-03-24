import {useContext, useEffect, useRef, useState} from "react";
import {useAuth} from "react-oidc-context";
import {
    BoxIcon,
    ChevronDown,
    HelpCircle,
    HomeIcon,
    LogInIcon,
    LogOut,
    MapIcon,
    Moon,
    Settings,
    Sun,
    User
} from "lucide-react";
import HeaderLogo from "../common/HeaderLogo.tsx";
import {Link, useLocation} from 'react-router-dom';
import {ThemeContext} from "../context/ThemeContext.tsx";

type LoginButtonProps = {
    onClick: () => void;
}

function LoginButton({onClick: handleLogin}: LoginButtonProps) {
    return (
        <button
            onClick={handleLogin}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-900 dark:text-white bg-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 space-x-2"
        >
            <LogInIcon/>
            <span>Login</span>
        </button>
    );
}

function AuthenticatedDropdown() {
    const auth = useAuth();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
                <img
                    className="w-8 h-8 rounded-full bg-white"
                    src={auth.user?.profile.avatar_url as string}
                    alt="avatar"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {auth.user?.profile.name}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-900 dark:text-white"/>
            </button>

            {isProfileDropdownOpen && (
                <div className="z-40 absolute right-0 mt-2 w-48 shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                        <Link
                            to="/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <User className="w-4 h-4 mr-2"/>
                            Profile
                        </Link>
                        <a
                            href="/settings"
                            className="flex items-center px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <Settings className="w-4 h-4 mr-2"/>
                            Settings
                        </a>
                        <button
                            onClick={() => void auth.removeUser()}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <LogOut className="w-4 h-4 mr-2"/>
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Header() {
    const [nav, setNav] = useState(false);
    const auth = useAuth();
    const location = useLocation();

    const themeContext = useContext(ThemeContext);

    if (!themeContext) {
        throw new Error('ThemeSwitcher must be used within a ThemeProvider');
    }

    const {theme, setTheme} = themeContext;



    const applyTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    useEffect(() => {



        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            applyTheme();
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const cycleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const handleLogin = () => {
        void auth.signinRedirect();
    };


    const isActiveRoute = (path: string) => {
        if (path === '/') {
            return location.pathname === path;
        }
        return location.pathname.startsWith(path);
    };


    const getLinkClassName = (path: string) => {
        const baseClasses = "flex items-center p-2 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group";
        const activeClasses = "bg-gray-100 dark:bg-gray-700 text-primary-600 dark:text-primary-400 font-semibold";
        const inactiveClasses = "text-gray-900 dark:text-white";

        return `${baseClasses} ${isActiveRoute(path) ? activeClasses : inactiveClasses}`;
    };

    return (
        <header className="bg-white shadow-sm">
            <nav className="bg-white border-gray-200 px-4 lg:px-6 py-2.5 dark:bg-gray-800 shadow">
                <div className="flex flex-wrap justify-between items-center mx-auto">
                    <div className="flex items-center space-x-5">
                        <div className="w-28">
                            <HeaderLogo/>
                        </div>
                        <span className="text-3xl font-bold text-gray-900 dark:text-white pt-4">
                            Internal Developer Platform
                        </span>
                    </div>

                    <div
                        className={`flex-col md:flex md:flex-row items-center w-full md:w-auto md:order-2 transition-all duration-300 ${
                            nav
                                ? "absolute top-14 left-0 w-full bg-white shadow-md p-4 md:relative md:top-0 md:w-auto md:bg-transparent md:shadow-none"
                                : "hidden md:flex gap-6"
                        }`}
                    >
                        <ul className="flex flex-col md:flex-row md:gap-8 gap-0">
                            <li>
                                <button
                                    onClick={cycleTheme}
                                    className="flex items-center p-2 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
                                    aria-label="Toggle theme"
                                >
                                    {theme === 'dark' ? (
                                        <Sun size={24} className="text-primary-400"/>
                                    ) : (
                                        <Moon size={24}/>
                                    )}
                                </button>
                            </li>
                            <li>
                                <Link to="/"
                                      className={getLinkClassName("/")}
                                      aria-current={isActiveRoute("/") ? "page" : undefined}
                                >
                                    <HomeIcon size={24}
                                              className={isActiveRoute("/") ? "text-primary-600 dark:text-primary-400" : ""}/>
                                    <span className="ms-3">Home</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/workloads"
                                      className={getLinkClassName("/workloads")}
                                      aria-current={isActiveRoute("/workloads") ? "page" : undefined}
                                >
                                    <BoxIcon size={24}
                                             className={isActiveRoute("/workloads") ? "text-primary-600 dark:text-primary-400" : ""}/>
                                    <span className="ms-3">Workloads</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/blueprints"
                                      className={getLinkClassName("/blueprints")}
                                      aria-current={isActiveRoute("/blueprints") ? "page" : undefined}
                                >
                                    <MapIcon size={24}
                                             className={isActiveRoute("/blueprints") ? "text-primary-600 dark:text-primary-400" : ""}/>
                                    <span className="ms-3">Blueprints</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/help"
                                      className={getLinkClassName("/help")}
                                      aria-current={isActiveRoute("/help") ? "page" : undefined}
                                >
                                    <HelpCircle esize={24}
                                                className={isActiveRoute("/help") ? "text-primary-600 dark:text-primary-400" : ""}
                                    />
                                </Link>
                            </li>
                        </ul>
                        <div className="h-16 flex items-center justify-between px-4">
                            {auth.isAuthenticated ? <AuthenticatedDropdown/> : <LoginButton onClick={handleLogin}/>}
                        </div>
                    </div>
                    <div className="md:hidden flex items-center lg:order-1">
                        <button
                            type="button"
                            className="inline-flex items-center p-2 ml-1 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
                            aria-controls="mobile-menu"
                            aria-expanded={nav}
                            onClick={() => setNav(!nav)}
                        >
                            <span className="sr-only">Open main menu</span>
                            {nav ? (
                                <svg
                                    className="w-6 h-6"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                    ></path>
                                </svg>
                            ) : (
                                <svg
                                    className="w-6 h-6"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                        clipRule="evenodd"
                                    ></path>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </nav>
        </header>
    );
}
