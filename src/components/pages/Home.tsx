import {useState} from 'react';
import {useAuth} from "react-oidc-context";
import {BarChart, LineChart, PieChart} from '@mui/x-charts';
import Banner from "../common/Banner";
import {FaJava} from "react-icons/fa";
import {SiAmazonwebservices, SiDotnet, SiGo, SiGooglecloud, SiJavascript, SiPython, SiTypescript} from "react-icons/si";
import {VscAzure} from "react-icons/vsc";
import {CloudIcon, CodeIcon} from "lucide-react";

type Project = {
    id: string;
    name: string;
    status: 'active' | 'warning' | 'error' | 'completed';
    language: string;
    cloudProvider: string;
    lastDeployed: string;
    workflow: string;
    metrics?: {
        deploymentFrequency: any;
        leadTime: any;
        changeFailureRate: any;
        mttr: any;
        deployments: any;
    };
};

type ProjectsTableProps = {
    onSelectProject: (project: Project) => void;
    selectedProjectId: string | null;
}


function ProjectsTable({onSelectProject, selectedProjectId}: ProjectsTableProps) {
    const generateMetricsForProject = (projectId: string): any => {

        const seed = parseInt(projectId) * 7;

        return {
            deploymentFrequency: {
                months: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
                values: [
                    20 + (seed % 15),
                    26 + (seed % 20),
                    32 + (seed % 15),
                    38 + (seed % 10),
                    42 + (seed % 8),
                    45 + (seed % 12)
                ],
                target: 50,
            },
            leadTime: {
                months: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
                values: [
                    4.8 - (seed % 10) * 0.1,
                    4.2 - (seed % 10) * 0.15,
                    3.7 - (seed % 10) * 0.1,
                    3.1 - (seed % 10) * 0.05,
                    2.6 - (seed % 10) * 0.08,
                    2.2 - (seed % 10) * 0.12
                ],
                target: 2.0,
            },
            changeFailureRate: {
                current: 15 + (seed % 10),
                target: 10,
                previous: 18 + (seed % 10),
            },
            mttr: {
                months: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
                values: [
                    160 - (seed % 20),
                    145 - (seed % 25),
                    130 - (seed % 15),
                    115 - (seed % 20),
                    100 - (seed % 15),
                    85 - (seed % 10)
                ],
                target: 60,
            },
            deployments: {
                labels: ['CI/CD', 'Manual', 'Scheduled', 'Hotfix', 'Rollback'],
                values: [
                    60 - (seed % 15),
                    20 + (seed % 10),
                    10 + (seed % 5),
                    5 + (seed % 5),
                    3 + (seed % 3)
                ],
            }
        };
    };


    const projects: Project[] = [
        {
            id: '1',
            name: 'Customer Portal',
            status: 'active',
            language: 'typescript',
            cloudProvider: 'aws',
            lastDeployed: '12 minutes ago',
            workflow: 'Frontend',
            metrics: generateMetricsForProject('1')
        },
        {
            id: '2',
            name: 'Order Processing API',
            status: 'active',
            language: 'java',
            cloudProvider: 'azure',
            lastDeployed: '2 hours ago',
            workflow: 'Backend',
            metrics: generateMetricsForProject('2')
        },
        {
            id: '3',
            name: 'Analytics Dashboard',
            status: 'warning',
            language: 'python',
            cloudProvider: 'gcp',
            lastDeployed: '1 day ago',
            workflow: 'Data',
            metrics: generateMetricsForProject('3')
        },
        {
            id: '4',
            name: 'Mobile App Backend',
            status: 'error',
            language: 'go',
            cloudProvider: 'aws',
            lastDeployed: '3 days ago',
            workflow: 'Mobile',
            metrics: generateMetricsForProject('4')
        },
        {
            id: '5',
            name: 'Identity Service',
            status: 'completed',
            language: 'csharp',
            cloudProvider: 'azure',
            lastDeployed: '4 hours ago',
            workflow: 'Infrastructure',
            metrics: generateMetricsForProject('5')
        },
        {
            id: '6',
            name: 'Payment Gateway',
            status: 'active',
            language: 'javascript',
            cloudProvider: 'aws',
            lastDeployed: '30 minutes ago',
            workflow: 'Backend',
            metrics: generateMetricsForProject('6')
        }
    ];


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'text-green-500';
            case 'warning':
                return 'text-yellow-500';
            case 'error':
                return 'text-red-500';
            case 'completed':
                return 'text-blue-500';
            default:
                return 'text-gray-500';
        }
    };


    const getLanguageIcon = (language: string) => {
        switch (language) {
            case 'typescript':
                return <SiTypescript color={'#007acc'} size={24} className="mr-2"/>;
            case 'javascript':
                return <SiJavascript color={'#f7df1e'} size={24} className="mr-2"/>;
            case 'python':
                return <SiPython color={'#306998'} size={24} className="mr-2"/>;
            case 'java':
                return <FaJava color={'#5382a1'} size={24} className="mr-2"/>;
            case 'go':
                return <SiGo color={'#00add8'} size={24} className="mr-2"/>;
            case 'csharp':
                return <SiDotnet color={'#512bd4'} size={24} className="mr-2"/>;
            default:
                return <CodeIcon color={'#333'} size={24} className="mr-2"/>;
        }
    };


    const getCloudIcon = (provider: string) => {
        switch (provider) {
            case 'aws':
                return <SiAmazonwebservices color={'#ff9900'} size={24} className="mr-2"/>;
            case 'azure':
                return <VscAzure color={'#0072c6'} size={24} className="mr-2"/>;
            case 'gcp':
                return <SiGooglecloud color={'#4285f4'} size={24} className="mr-2"/>;
            default:
                return <CloudIcon color={'#333'} size={24} className="mr-2"/>;
        }
    };

    return (
        <div className="card col-span-2 mb-6 pt-2">
            <div className="bg-white dark:bg-gray-800 shadow-md">
                <div
                    className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Active Workflows</h2>
                    <button className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300">View All</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="table-auto w-full text-left">
                        <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                            <th className="px-4 py-2 border-r border-gray-200 dark:border-gray-600 dark:text-gray-300"></th>
                            <th className="px-4 py-2 border-r border-gray-200 dark:border-gray-600 dark:text-gray-300">Project</th>
                            <th className="px-4 py-2 border-r border-gray-200 dark:border-gray-600 dark:text-gray-300">Workflow</th>
                            <th className="px-4 py-2 border-r border-gray-200 dark:border-gray-600 dark:text-gray-300">Language</th>
                            <th className="px-4 py-2 border-r border-gray-200 dark:border-gray-600 dark:text-gray-300">Cloud
                                Provider
                            </th>
                            <th className="px-4 py-2 dark:text-gray-300">Last Deployed</th>
                        </tr>
                        </thead>
                        <tbody className="text-gray-600 dark:text-gray-300">
                        {projects.map((project) => (
                            <tr
                                key={project.id}
                                onClick={() => onSelectProject(project)}
                                className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                    selectedProjectId === project.id ? 'bg-blue-50 dark:bg-blue-900' : ''
                                }`}
                            >
                                <td className="border border-l-0 border-gray-200 dark:border-gray-600 px-4 py-2 text-center">
                                    <i className={`fad fa-circle ${getStatusColor(project.status)}`}></i>
                                </td>
                                <td className="border border-l-0 border-gray-200 dark:border-gray-600 px-4 py-2 font-medium">
                                    {project.name}
                                </td>
                                <td className="border border-l-0 border-gray-200 dark:border-gray-600 px-4 py-2">
                                    {project.workflow}
                                </td>
                                <td className="border border-l-0 border-gray-200 dark:border-gray-600 px-4 py-2">
                                    <div className="flex items-center">
                                        {getLanguageIcon(project.language)}
                                        <span className="capitalize">{project.language}</span>
                                    </div>
                                </td>
                                <td className="border border-l-0 border-gray-200 dark:border-gray-600 px-4 py-2">
                                    <div className="flex items-center">
                                        {getCloudIcon(project.cloudProvider)}
                                        <span className="capitalize">{project.cloudProvider}</span>
                                    </div>
                                </td>
                                <td className="border border-l-0 border-r-0 border-gray-200 dark:border-gray-600 px-4 py-2">
                                    {project.lastDeployed}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


type DoraMetric = {
    id: string;
    title: string;
    description: string;
    data: any;
    chartType: 'gauge' | 'bar' | 'line' | 'pie';
}



function MetricChart({metric}: { metric: DoraMetric }) {
    const {chartType, data, title} = metric;

    const width = 400;
    const height = 260;

    switch (chartType) {
        case 'gauge':
            return (
                <div className="flex items-center justify-center h-full w-full">
                    <div className="relative w-56 h-56">
                        {/* Creating a custom gauge visualization */}
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            {/* Background arc */}
                            <path
                                d="M 10 90 A 40 40 0 1 1 90 90"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="10"
                                strokeLinecap="round"
                            />
                            {/* Foreground arc (value) - calculate the length based on current value */}
                            <path
                                d={`M 10 90 A 40 40 0 ${data.current > 50 ? 1 : 0} 1 ${
                                    10 + 80 * (data.current / 100)
                                } ${
                                    90 - Math.sin(Math.PI * (data.current / 100)) * 80
                                }`}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="10"
                                strokeLinecap="round"
                            />
                            {/* Center text */}
                            <text
                                x="50"
                                y="60"
                                textAnchor="middle"
                                fontSize="16"
                                fontWeight="bold"
                            >
                                {data.current}%
                            </text>
                            <text
                                x="50"
                                y="75"
                                textAnchor="middle"
                                fontSize="10"
                                fill="#6b7280"
                            >
                                Target: {data.target}%
                            </text>
                        </svg>
                    </div>
                </div>
            );

        case 'bar':
            return (
                <BarChart
                    width={width}
                    height={height}
                    series={[
                        {
                            data: data.values,
                            label: title,
                            valueFormatter: (value) => `${value} deploys`,
                        },
                    ]}
                    xAxis={[
                        {
                            data: data.months,
                            scaleType: 'band',
                        },
                    ]}
                    colors={['#3b82f6']}
                />
            );

        case 'line':
            return (
                <LineChart
                    width={width}
                    height={height}
                    series={[
                        {
                            data: data.values,
                            label: title,
                            area: true,
                            showMark: false,
                        },
                    ]}
                    xAxis={[
                        {
                            data: data.months,
                            scaleType: 'point',
                        },
                    ]}
                    colors={['#3b82f6']}
                />
            );

        case 'pie':
            return (
                <PieChart
                    width={width}
                    height={height}
                    series={[
                        {
                            data: data.labels.map((label: string, index: number) => ({
                                id: index,
                                value: data.values[index],
                                label: label,
                            })),
                            highlightScope: {faded: 'global', highlighted: 'item'},
                            arcLabel: (item) => `${item.value}`,
                            arcLabelMinAngle: 45,
                        },
                    ]}
                    slotProps={{
                        legend: {
                            direction: 'column',
                            position: {vertical: 'middle', horizontal: 'right'},
                            itemMarkWidth: 10,
                            itemMarkHeight: 10,
                            markGap: 5,
                            itemGap: 10,
                        },
                    }}
                />
            );

        default:
            return <div>Chart type not supported</div>;
    }
}

export default function Home() {
    const auth = useAuth();
    const [metrics, setMetrics] = useState<DoraMetric[]>([]);
    const [isCustomizeMode, setIsCustomizeMode] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);


    const convertProjectToMetrics = (project: any): DoraMetric[] => {
        if (!project || !project.metrics) return [];

        return [
            {
                id: 'deployment-frequency',
                title: `Deployment Frequency - ${project.name}`,
                description: 'How often code is deployed to production',
                data: project.metrics.deploymentFrequency,
                chartType: 'bar',
            },
            {
                id: 'lead-time',
                title: `Lead Time to Changes - ${project.name}`,
                description: 'Time from commit to production (days)',
                data: project.metrics.leadTime,
                chartType: 'line',
            },
            {
                id: 'change-failure-rate',
                title: `Change Failure Rate - ${project.name}`,
                description: 'Percentage of deployments causing failure',
                data: project.metrics.changeFailureRate,
                chartType: 'gauge',
            },
            {
                id: 'mttr',
                title: `Mean Time to Recovery - ${project.name}`,
                description: 'Time to restore service after failure (minutes)',
                data: project.metrics.mttr,
                chartType: 'line',
            },
            {
                id: 'deployment-types',
                title: `Deployment Types - ${project.name}`,
                description: 'Types of deployments in the last 30 days',
                data: {
                    labels: project.metrics.deployments.labels,
                    values: project.metrics.deployments.values,
                },
                chartType: 'pie',
            },
        ];
    };


    const handleSelectProject = (project: any) => {
        setSelectedProject(project);
        setSelectedProjectId(project.id);
        setMetrics(convertProjectToMetrics(project));
    };


    const toggleCustomizeMode = () => {
        setIsCustomizeMode(!isCustomizeMode);
    };

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <Banner
                title={auth.isAuthenticated ? `Welcome ${auth.user?.profile.name}` : 'Welcome Anonymous'}
                body={auth.isAuthenticated ? "Welcome to the Acme Inc. Internal Developer Platform! This platform is designed to help you build and deploy your applications with ease." : "Please log in to access the Acme Inc. Internal Developer Platform."}
            />

            <ProjectsTable
                onSelectProject={handleSelectProject}
                selectedProjectId={selectedProjectId}
            />

            <div className="w-full mt-4">
                {/* Header with customize button */}
                <div className="bg-white dark:bg-gray-800 shadow-md mb-4">
                    <div className="flex justify-between items-center p-4">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                            {selectedProject
                                ? `DORA Metrics for ${selectedProject.name}`
                                : "DORA Metrics Dashboard"}
                        </h2>
                        <button
                            onClick={toggleCustomizeMode}
                            className={`px-4 py-2 transition-colors ${
                                isCustomizeMode
                                    ? "bg-blue-600 text-white"
                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                            }`}
                        >
                            {isCustomizeMode ? "Done" : "Customize"}
                        </button>
                    </div>
                </div>

                <div>
                    {isCustomizeMode && (
                        <div
                            className="bg-blue-50 dark:bg-blue-900 border border-blue-100 dark:border-blue-800 p-4 mb-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                Customize Mode: This mode will allow you to customize your dashboard
                            </p>
                        </div>
                    )}

                    {selectedProject ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {metrics.map((metric) => (
                                <div key={metric.id} className="col-span-1">
                                    <div
                                        className="bg-white dark:bg-gray-800 shadow-md p-4 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{metric.title}</h3>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{metric.description}</p>
                                        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                            <div className="h-64 flex justify-center">
                                                <MetricChart metric={metric}/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 shadow-md p-8 text-center">
                            <p className="text-lg text-gray-500 dark:text-gray-400">
                                Select a project from the table above to view its DORA metrics
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
