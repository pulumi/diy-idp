import {useEffect} from 'react';
import {Navigate} from 'react-router-dom';
import {useAuth} from "react-oidc-context";

export default function CallbackPage() {
    const auth = useAuth();

    useEffect(() => {

        if (!auth.isAuthenticated && !auth.activeNavigator && !auth.isLoading) {
            //auth.signinRedirect().catch(console.error);
        }
    }, [auth.isAuthenticated, auth.activeNavigator, auth.isLoading, auth]);

    if (auth.isAuthenticated) {
        return <Navigate to="/" replace/>;
    }

    return <div>Processing login...</div>;
}

