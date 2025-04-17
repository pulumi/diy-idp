import './App.css'
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {AuthProvider} from "react-oidc-context";
import CallbackPage from "./components/pages/CallbackPage.tsx";
import Layout from "./components/layout/Layout.tsx";
import ProtectedRoute from "./components/features/ProtectedRoute.tsx";
import HelpPage from "./components/pages/HelpPage.tsx";
import ProfileCard from "./components/common/ProfileCard.tsx";
import BlueprintGrid from "./components/pages/Blueprints.tsx";

import DynamicSelectForm from "./components/pages/Home.tsx";
import ListWorkloads, {CreateWorkload} from "./components/pages/Workload.tsx";
import WorkloadDetail from "./components/pages/WorkloadDetail.tsx";

const oidcConfig = {
    authority: import.meta.env.VITE_GITHUB_AUTH_URL,
    client_id: import.meta.env.VITE_GITHUB_CLIENT_ID,
    redirect_uri: `${window.location.origin}/callback`,

    authorization_endpoint: import.meta.env.VITE_GITHUB_AUTH_URL,
    token_endpoint: import.meta.env.VITE_GITHUB_TOKEN_ENDPOINT,
    userinfo_endpoint: import.meta.env.VITE_GITHUB_USER_API,

    scope: import.meta.env.VITE_GITHUB_SCOPE || 'read:user user:email',
    loadUserInfo: true,

    response_type: 'code',
    metadata: {
        authorization_endpoint: import.meta.env.VITE_GITHUB_AUTH_URL,
        token_endpoint: import.meta.env.VITE_GITHUB_TOKEN_ENDPOINT,
        userinfo_endpoint: import.meta.env.VITE_GITHUB_USER_API,
    },
};

function App() {
    return (
        <AuthProvider {...oidcConfig}>
            <BrowserRouter>
                <Layout>
                    <Routes>
                        <Route path="/" element={<DynamicSelectForm/>}/>
                        <Route path="callback" element={<CallbackPage/>}/>
                        <Route path="help" element={<HelpPage/>}/>
                        <Route path="blueprints" element={<BlueprintGrid/>}/>
                        <Route
                            path="/*"
                            element={
                                <ProtectedRoute orgName={import.meta.env.VITE_GITHUB_ORG_NAME}>
                                    <Routes>
                                        <Route path="profile" element={<ProfileCard/>}/>
                                        <Route path="workloads/*" element={
                                            <Routes>
                                                <Route path="create/:blueprintName" element={<CreateWorkload/>}/>
                                                <Route path="" element={<ListWorkloads/>}/>
                                                <Route path="/:organization/:blueprintName/:name"
                                                       element={<WorkloadDetail/>}/>
                                            </Routes>
                                        }/>
                                    </Routes>
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </Layout>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App
