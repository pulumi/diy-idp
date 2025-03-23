import {ReactNode} from 'react';
import {useAuth} from "react-oidc-context";

type ProtectedRouteProps = {
    children: ReactNode;
}

export default function ProtectedRoute({children}: ProtectedRouteProps) {
    const auth = useAuth();

    if (auth.isLoading) {
        return <div>Loading...</div>;
    }

    if (auth.error) {
        return <div>Error: {auth.error.message}</div>;
    }

    if (!auth.isAuthenticated) {

        auth.signinRedirect();
        return <div>Redirecting to login...</div>;
    }

    return children;
};

