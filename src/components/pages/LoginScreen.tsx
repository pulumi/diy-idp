
import {Navigate, useLocation} from 'react-router-dom';
import {useAuth} from "react-oidc-context";

export default function LoginScreen() {
    const auth = useAuth();
    const location = useLocation();
    const from = (location.state as any)?.from?.pathname || '/';
    if (auth.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (auth.error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>Oops... {auth.error.message}</p>
            </div>
        );
    }

    if (auth.isAuthenticated) {
        return <Navigate to={from} replace/>;
    } else {
        return (
            <div className="bg-white shadow rounded-lg p-6 text-center">
                <h2 className="text-xl font-semibold mb-4">Please log in</h2>
                <button
                    onClick={() => void auth.signinRedirect()}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
                >
                    Login with GitHub
                </button>
            </div>
        );
    }
};

