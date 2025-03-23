import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {ArrowLeft, Edit, RefreshCcw, Save, X} from 'lucide-react';
import Banner from "../common/Banner.tsx";
import LoadingSpinner from "../common/LoadingsSpinner.tsx";
import {useAuth} from "react-oidc-context";
import validator from '@rjsf/validator-ajv8';
import TailwindThemedForm from "../common/Form.tsx";
import DeploymentLogsTerminal from "../common/DeploymentLogsTerminal.tsx";

type Stack = {
    orgName: string;
    projectName: string;
    stackName: string;
    lastUpdate: number;
    resourceCount: number;
    result: string;
    deploymentId: string;
    tags?: {
        "idp:projectid"?: string;
        "idp:workflow"?: string;
        [key: string]: string | undefined;
    };
    version?: number;
}

type Workflow = {
    orgName: string;
    projectName: string;
    stackName: string;
    lastUpdate: number;
    resourceCount: number;
    result: string;
    tags?: {
        "idp:projectid"?: string;
        "idp:workflow"?: string;
        [key: string]: string | undefined;
    };
    version?: number;
    advanced?: any[];
    stack?: Stack;
}


export default function WorkflowDetail() {
    const {organization, blueprintName, name} = useParams();
    const [workflow, setWorkflow] = useState(null);
    const [workflowDetails, setWorkflowDetails] = useState<Workflow | null>(null);
    const [loading, setLoading] = useState(true);
    const [detailsLoading, setDetailsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [detailsError, setDetailsError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editSchema, setEditSchema] = useState(null);
    const [editUiSchema, setEditUiSchema] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const navigate = useNavigate();
    const auth = useAuth();

    const fetchWorkflowAdditionalDetails = () => {
        setDetailsLoading(true);

        const API_URL = import.meta.env.MODE === 'production' ? import.meta.env.VITE_API_URL : '/';

        fetch(`${API_URL}api/workflows/${organization}/${blueprintName}/${name}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to fetch details: ${res.status}`);
                }
                return res.json();
            })
            .then((data: Workflow) => {
                setWorkflowDetails(data);
                setDetailsLoading(false);
            })
            .catch(err => {
                setDetailsError(err.message);
                setDetailsLoading(false);
            });
    };

    const fetchSchemaForEditing = () => {

        if (!workflowDetails) {
            fetchWorkflowAdditionalDetails();
            return;
        }

        setEditLoading(true);
        const API_URL = import.meta.env.MODE === 'production' ? import.meta.env.VITE_API_URL : '/';


        fetch(`${API_URL}api/blueprints/${blueprintName}/schema`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to fetch blueprint schema: ${res.status}`);
                }
                return res.json();
            })
            .then(schemaData => {

                const advancedSchema = {
                    type: "object",
                    title: "Advanced Settings",
                    properties: schemaData.properties || {},
                    required: schemaData.required || []
                };
                setEditSchema(advancedSchema);


                return fetch(`${API_URL}api/blueprints/${blueprintName}/ui-schema`);
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to fetch UI schema: ${res.status}`);
                }
                return res.json();
            })
            .then(uiSchemaData => {
                setEditUiSchema(uiSchemaData);
                setEditLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setEditLoading(false);
            });
    };

    useEffect(() => {
        fetchWorkflowAdditionalDetails();
    }, [organization, blueprintName, name]);

    const handleRefresh = () => {
        fetchWorkflowAdditionalDetails();
    };

    const handleEditClick = () => {

        if (!workflowDetails) {
            fetchWorkflowAdditionalDetails();
        }
        fetchSchemaForEditing();
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleSubmitEdit = ({formData}) => {
        setEditLoading(true);
        const API_URL = import.meta.env.MODE === 'production' ? import.meta.env.VITE_API_URL : '/';



        const advancedData = Array.isArray(formData) ? formData : [formData];

        fetch(`${API_URL}api/workflows/${organization}/${blueprintName}/${name}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...workflowDetails,
                advanced: advancedData
            }),
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to update workflow: ${res.status}`);
                }
                return res.json();
            })
            .then(() => {
                setIsEditing(false);
                setEditLoading(false);

                navigate(`/workflows/${organization}/${blueprintName}/${name}`);
            })
            .catch(err => {
                setError(err.message);
                setEditLoading(false);
            });
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };


    const formatISODate = (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };



    const getBadgeColorClass = (result) => {
        if (!result) return 'bg-gray-100 text-gray-800';

        switch (result.toLowerCase()) {
            case 'succeeded':
                return 'bg-green-100 text-green-800';
            case 'error':
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    };


    const getStatusText = (result) => {
        if (!result) return 'No Updates';
        return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
    };


    const renderAdvancedSettings = () => {
        if (!workflowDetails || !workflowDetails.advanced || workflowDetails.advanced.length === 0) {
            return <p className="text-gray-500 dark:text-gray-400 text-sm">No advanced settings configured.</p>;
        }

        return (
            <div className="space-y-4">
                {workflowDetails.advanced.map((item, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 ">
                        {Object.entries(item).map(([key, value]) => (
                            <div key={key} className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{key}:</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 justify-between items-center max-w-auto">
                    <Banner
                        title={auth.isAuthenticated ? `Workflow: ${name}` : 'Workflow Details'}
                        body={`Organization: ${organization} | Blueprint: ${blueprintName}`}
                    />
                </div>

                <div className="flex justify-between mb-6">
                    <button
                        onClick={() => navigate('/workflows')}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2"/>
                        Back to List
                    </button>

                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                    >
                        <RefreshCcw className="h-4 w-4 mr-2"/>
                        Refresh
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg mb-6">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                Workflow Details
                            </h3>
                        </div>
                    </div>
                    <div className="px-6 py-4">
                        {detailsLoading ? (
                            <div className="flex justify-center items-center py-4">
                                <LoadingSpinner/>
                            </div>
                        ) : detailsError ? (
                            <div className="bg-red-50 dark:bg-red-900/30 p-4 ">
                                <p className="text-sm text-red-700 dark:text-red-400">{detailsError}</p>
                            </div>
                        ) : workflowDetails ? (
                            <div>
                                {/* Display other details like resources, status, etc. */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 ">
                                        <div
                                            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Organization
                                        </div>
                                        <div
                                            className="text-sm text-gray-900 dark:text-white">{workflowDetails?.stack?.orgName}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 ">
                                        <div
                                            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project
                                        </div>
                                        <div
                                            className="text-sm text-gray-900 dark:text-white">{workflowDetails.stack?.projectName}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 ">
                                        <div
                                            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resource
                                            Count
                                        </div>
                                        <div
                                            className="text-sm text-gray-900 dark:text-white">{workflowDetails.stack?.resourceCount}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 ">
                                        <div
                                            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status
                                        </div>
                                        <div className="text-sm">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColorClass(workflowDetails.stack?.result)}`}>
                                                {getStatusText(workflowDetails.stack?.result)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 ">
                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last
                                            Update
                                        </div>
                                        <div
                                            className="text-sm text-gray-900 dark:text-white">{formatDate(workflowDetails.stack?.lastUpdate)}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 ">
                                        <div
                                            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project
                                            ID
                                        </div>
                                        <div
                                            className="text-sm text-gray-900 dark:text-white">{workflowDetails.stack?.tags?.["idp:projectid"] || "N/A"}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 ">
                                        <div
                                            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stage
                                        </div>
                                        <div
                                            className="text-sm text-gray-900 dark:text-white">{workflowDetails.stack?.tags?.["idp:stage"] || "N/A"}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">No additional details available.</p>
                        )}
                    </div>
                </div>

                {/* Advanced Settings Card */}
                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg mb-6">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                Advanced Settings
                            </h3>
                            {!isEditing && (
                                <button
                                    onClick={handleEditClick}
                                    className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                                >
                                    <Edit className="h-4 w-4 mr-2"/>
                                    Edit Settings
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="px-6 py-4">
                        {isEditing ? (
                            editLoading ? (
                                <div className="flex justify-center items-center py-4">
                                    <LoadingSpinner/>
                                </div>
                            ) : (
                                <div>
                                    {editSchema && (
                                        <div>
                                            <TailwindThemedForm
                                                schema={editSchema}
                                                uiSchema={editUiSchema}
                                                formData={workflowDetails?.advanced?.[0] || {}}
                                                validator={validator}
                                                onSubmit={handleSubmitEdit}
                                            >
                                                <div className="flex justify-end space-x-2 mt-4">
                                                    <button
                                                        type="button"
                                                        onClick={handleCancelEdit}
                                                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                                                    >
                                                        <X className="h-4 w-4 mr-2"/>
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                                                    >
                                                        <Save className="h-4 w-4 mr-2"/>
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </TailwindThemedForm>
                                        </div>
                                    )}
                                </div>
                            )
                        ) : (
                            <div>
                                {detailsLoading ? (
                                    <div className="flex justify-center items-center py-4">
                                        <LoadingSpinner/>
                                    </div>
                                ) : workflowDetails ? (
                                    renderAdvancedSettings()
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No advanced settings
                                        available.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <DeploymentLogsTerminal deploymentID={workflowDetails?.stack?.deploymentId} stack={workflowDetails?.stack?.stackName}
                                        organization={workflowDetails?.stack?.orgName} project={workflowDetails?.stack?.projectName} />
            </div>
        </div>
    );
}
