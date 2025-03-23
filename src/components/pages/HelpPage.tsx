import {createContext, useContext, useState} from 'react';
import Card, {CardContent, CardHeader, CardTitle} from "../common/Card.tsx";
import {BookOpen, Code2, Rocket, Terminal, Zap} from 'lucide-react';

const TabsContext = createContext({
    selectedTab: '',
    setSelectedTab: () => {
    },
});

export const Tabs = ({defaultValue, className = '', children, ...props}) => {
    const [selectedTab, setSelectedTab] = useState(defaultValue);

    return (
        <TabsContext.Provider value={{selectedTab, setSelectedTab}}>
            <div className={`w-full ${className}`} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    );
};

export const TabsList = ({className = '', children, ...props}) => {
    return (
        <div
            role="tablist"
            className={`inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

export const TabsTrigger = ({value, className = '', children, ...props}) => {
    const {selectedTab, setSelectedTab} = useContext(TabsContext);
    const isSelected = selectedTab === value;

    return (
        <button
            role="tab"
            aria-selected={isSelected}
            onClick={() => setSelectedTab(value)}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white dark:ring-offset-gray-900 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
        ${isSelected
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            } ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export const TabsContent = ({value, className = '', children, ...props}) => {
    const {selectedTab} = useContext(TabsContext);

    if (value !== selectedTab) return null;

    return (
        <div
            role="tabpanel"
            className={`mt-2 ring-offset-white dark:ring-offset-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-600 focus-visible:ring-offset-2 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

const HelpPage = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-8">
            {/* Hero Section */}
            <div className="mb-12 text-center">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-gray-100 mb-4">
                    DevPlatform Documentation
                </h1>
                <p className="text-lg text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Your one-stop solution for managing, deploying, and monitoring internal applications.
                    Built by developers, for developers.
                </p>
            </div>

            {/* Quick Start Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                <Card>
                    <CardHeader>
                        <Rocket className="h-8 w-8 text-blue-500 dark:text-blue-400 mb-2"/>
                        <CardTitle>Quick Start</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 dark:text-gray-400">
                            Get up and running in minutes with our streamlined onboarding process.
                            Perfect for new team members.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <Terminal className="h-8 w-8 text-green-500 dark:text-green-400 mb-2"/>
                        <CardTitle>CLI Tools</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 dark:text-gray-400">
                            Power up your workflow with our command-line tools.
                            Automate common tasks and integrate with your existing scripts.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <Zap className="h-8 w-8 text-yellow-500 dark:text-yellow-400 mb-2"/>
                        <CardTitle>Best Practices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 dark:text-gray-400">
                            Learn our recommended patterns and practices for optimal platform usage
                            and team collaboration.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="getting-started" className="max-w-4xl mx-auto">
                <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
                    <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
                    <TabsTrigger value="core-concepts">Core Concepts</TabsTrigger>
                    <TabsTrigger value="workflows">Workflows</TabsTrigger>
                    <TabsTrigger value="api-docs">API Docs</TabsTrigger>
                </TabsList>

                <TabsContent value="getting-started" className="mt-6">
                    <Card children={undefined} onClick={undefined}>
                        <CardHeader children={undefined} icon={undefined}>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5"/>
                                Getting Started Guide
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Platform
                                    Overview</h3>
                                <p className="text-slate-600 dark:text-gray-400">
                                    Our internal developer platform streamlines the development process by providing
                                    a unified interface for all your development needs. From code deployment to
                                    monitoring, we've got you covered.
                                </p>

                                <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Key
                                    Features</h3>
                                <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-gray-400">
                                    <li>One-click deployments to multiple environments</li>
                                    <li>Integrated CI/CD pipelines with built-in testing</li>
                                    <li>Real-time monitoring and alerting</li>
                                    <li>Automated infrastructure provisioning</li>
                                    <li>Team collaboration tools and access management</li>
                                </ul>

                                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mt-6">
                                    <h4 className="text-blue-700 dark:text-blue-300 font-medium mb-2">Pro Tip</h4>
                                    <p className="text-blue-600 dark:text-blue-300">
                                        Start with our CLI tool installation: <code
                                        className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">devp install</code>
                                        This will set up everything you need to begin working with the platform.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="core-concepts" className="mt-6">
                    <Card children={undefined} onClick={undefined}>
                        <CardHeader children={undefined} icon={undefined}>
                            <CardTitle className="flex items-center gap-2">
                                <Code2 className="h-5 w-5"/>
                                Core Platform Concepts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100 mb-2">Workflows</h3>
                                    <p className="text-slate-600 dark:text-gray-400">
                                        Workflows are isolated environments where you can manage related projects
                                        and resources. They help organize work and control access across teams.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100 mb-2">Service
                                        Templates</h3>
                                    <p className="text-slate-600 dark:text-gray-400">
                                        Pre-configured application templates that follow best practices and
                                        security guidelines. Use these to quickly bootstrap new services.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100 mb-2">Deployment
                                        Pipelines</h3>
                                    <p className="text-slate-600 dark:text-gray-400">
                                        Automated workflows that handle building, testing, and deploying your
                                        applications across different environments.
                                    </p>
                                </div>

                                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
                                    <h4 className="text-yellow-700 dark:text-yellow-300 font-medium mb-2">Important
                                        Note</h4>
                                    <p className="text-yellow-600 dark:text-yellow-300">
                                        Always review the auto-generated configuration files before deployment.
                                        They contain important settings that affect your application's behavior.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Additional tab content can be added here */}
            </Tabs>

            {/* Footer Section */}
            <div className="mt-12 text-center text-slate-600 dark:text-gray-400">
                <p>Need more help? Reach out to the platform team on Slack at #dev-platform-support</p>
            </div>
        </div>
    );
};

export default HelpPage;
