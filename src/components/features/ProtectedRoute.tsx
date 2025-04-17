import {ReactNode, useEffect, useState} from 'react';
import {useAuth} from "react-oidc-context";
import {Octokit} from '@octokit/rest';

type ProtectedRouteProps = {
    orgName: string;
    children: ReactNode;
}

export default function ProtectedRoute({orgName, children}: ProtectedRouteProps) {
    const auth = useAuth();
    const [isOrgMember, setIsOrgMember] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkOrgMembership = async () => {
            if (!auth.isAuthenticated) {
                setIsLoading(false);
                return;
            }

            try {
                // Create Octokit instance with the user's access token
                const octokit = new Octokit({
                    auth: auth.user?.access_token,
                });

                // Check if user is a member of the specified organization
                const {status} = await octokit.orgs.checkMembershipForUser({
                    org: orgName,
                    username: auth.user?.profile?.preferred_username || auth.user?.profile?.login,
                });

                // Status 204 means the user is a member of the organization
                setIsOrgMember(status === 204);
            } catch (err) {
                // 404 means user is not a member of the organization
                if (err.status === 404) {
                    setIsOrgMember(false);
                } else {
                    setError(err.message);
                    console.error('Error checking organization membership:', err);
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkOrgMembership();
    }, [auth.isAuthenticated, auth.user, orgName]);

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

    if (!isOrgMember) {
        return <div>Error: You are not a member of the organization {orgName}.</div>;
    }

    return children;
};

