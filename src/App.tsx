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
import ListWorkflows, {CreateWorkflow} from "./components/pages/Workflow.tsx";
import WorkflowDetail from "./components/pages/WorkflowDetail.tsx";

const oidcConfig = {
    authority: "https://github.com/login/oauth/authorize",
    client_id: 'Ov23lizXFAbOUkmWXuvN',
    redirect_uri: `${window.location.origin}/callback`,

    authorization_endpoint: 'https://github.com/login/oauth/authorize',
    token_endpoint: '/api/auth/github/token',
    userinfo_endpoint: 'https://api.github.com/user',

    scope: 'read:user user:email', // Adjust scopes based on your needs
    loadUserInfo: true,

    response_type: 'code',
    metadata: {
        authorization_endpoint: 'https://github.com/login/oauth/authorize',
        token_endpoint: '/api/github/token',
        userinfo_endpoint: 'https://api.github.com/user',
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
                                <ProtectedRoute>
                                    <Routes>
                                        <Route path="profile" element={<ProfileCard/>}/>
                                        <Route path="workflows/*" element={
                                            <Routes>
                                                <Route path="create/:blueprintName" element={<CreateWorkflow/>}/>
                                                <Route path="" element={<ListWorkflows/>}/>
                                                <Route path="/:organization/:blueprintName/:name" element={<WorkflowDetail />} />
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
