import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import validator from '@rjsf/validator-ajv8';
import TailwindThemedForm from "../common/Form.tsx";
import LoadingSpinner from "../common/LoadingsSpinner.tsx";
import Banner from "../common/Banner.tsx";
import {Plus, RefreshCcw, Trash2} from "lucide-react";
import {useAuth} from "react-oidc-context";

type Stack = {
    orgName: string;
    projectName: string;
    stackName: string;
    lastUpdate: number;
    resourceCount: number;
    result: string;
    tags?: {
        "idp:projectid"?: string;
        "idp:workload"?: string;
        [key: string]: string | undefined;
    };
    version?: number;
}

type StacksResponse = {
    stacks: Stack[];
    continuationToken?: string;
}

export default function ListWorkloads() {
    const [stacks, setStacks] = useState([] as Stack[]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState({organization: '', project: '', tag: ''});
    const [selectedStack, setSelectedStack] = useState<Stack | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const navigate = useNavigate();
    const auth = useAuth();
    const showFilter: boolean = false

    const fetchStacks = () => {
        setLoading(true);
        const API_URL = import.meta.env.MODE === 'production' ? import.meta.env.VITE_API_URL : '';


        const params = new URLSearchParams();
        if (filter.organization) params.append('organization', filter.organization);
        if (filter.project) params.append('project', filter.project);
        if (filter.tag) params.append('tagName', filter.tag);

        const queryString = params.toString() ? `?${params.toString()}` : '';

        fetch(`${API_URL}api/workloads${queryString}`)
            .then(res => res.json())
            .then((data: StacksResponse) => {
                setStacks(data.stacks);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchStacks();
    }, [filter]);

    const handleFilterChange = (name: string, value: string) => {
        setFilter(prev => ({...prev, [name]: value}));

        setSelectedStack(null);
    };

    const handleRefresh = () => {
        fetchStacks();
    };

    const handleDeleteStack = () => {
        if (!selectedStack) return;

        setLoading(true);
        const API_URL = import.meta.env.MODE === 'production' ? import.meta.env.VITE_API_URL : '';

        fetch(`${API_URL}api/workloads/${selectedStack.orgName}/${selectedStack.projectName}/${selectedStack.stackName}`, {
            method: 'DELETE',
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to delete stack: ${res.status}`);
                }
                return res.json();
            })
            .then(() => {

                fetchStacks();
                setSelectedStack(null);
                setShowDeleteConfirm(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
                setShowDeleteConfirm(false);
            });
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 max-w-auto">
            <div className="max-w-auto mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 justify-between items-center max-w-auto">
                    <Banner
                        title={auth.isAuthenticated ? `Hi ${auth.user?.profile.name}!` : 'Welcome Anonymous'}
                        body={'Manage your workloads here'}
                    />
                </div>
                {/* Filter controls */}
                {showFilter && (
                    <div className="mb-6 bg-white dark:bg-gray-800 p-4 shadow-sm">
                        <div className="flex flex-wrap gap-4">
                            <div className="w-full sm:w-auto">
                                <label htmlFor="org-filter"
                                       className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Organization
                                </label>
                                <input
                                    type="text"
                                    id="org-filter"
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    placeholder="Filter by organization"
                                    value={filter.organization}
                                    onChange={(e) => handleFilterChange('organization', e.target.value)}
                                />
                            </div>
                            <div className="w-full sm:w-auto">
                                <label htmlFor="project-filter"
                                       className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Project
                                </label>
                                <input
                                    type="text"
                                    id="project-filter"
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    placeholder="Filter by project"
                                    value={filter.project}
                                    onChange={(e) => handleFilterChange('project', e.target.value)}
                                />
                            </div>
                            <div className="w-full sm:w-auto">
                                <label htmlFor="tag-filter"
                                       className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tag
                                </label>
                                <input
                                    type="text"
                                    id="tag-filter"
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    placeholder="Filter by tag"
                                    value={filter.tag}
                                    onChange={(e) => handleFilterChange('tag', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}
                <button
                    onClick={handleRefresh}
                    className="mb-5 inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                >
                    <RefreshCcw className="h-4 w-4 mr-2"/>
                    Refresh
                </button>
                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed z-50 inset-0 overflow-y-auto">
                        <div
                            className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                            </div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen"
                                  aria-hidden="true">&#8203;</span>
                            <div
                                className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-50">
                                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div
                                            className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                                            <svg className="h-6 w-6 text-red-600 dark:text-red-400"
                                                 xmlns="http://www.w3.org/2000/svg"
                                                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                            </svg>
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Delete
                                                Workload</h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Are you sure you want to delete the workload <span
                                                    className="font-semibold">{selectedStack?.stackName}</span> in
                                                    project <span
                                                    className="font-semibold">{selectedStack?.projectName}</span>? This
                                                    action cannot be undone.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 sm:ml-3 sm:w-auto sm:text-sm"
                                        onClick={handleDeleteStack}
                                    >
                                        Delete
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        onClick={() => setShowDeleteConfirm(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stacks List */}
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg"
                                     viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                          clipRule="evenodd"/>
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error loading
                                    stacks</h3>
                                <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                                    <p>{error}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-hidden">
                        <ul className="">
                            {stacks.map((stack, index) => (
                                <li
                                    key={`${stack.orgName}-${stack.projectName}-${stack.stackName}`}
                                    className={`${selectedStack?.stackName === stack.stackName &&
                                    selectedStack?.projectName === stack.projectName &&
                                    selectedStack?.orgName === stack.orgName
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''} my-1 first:mt-0 last:mb-0`}
                                    onClick={() => setSelectedStack(stack)}
                                >
                                    <div
                                        className={`px-6 py-4 flex items-center border-2 ${
                                            selectedStack?.stackName === stack.stackName &&
                                            selectedStack?.projectName === stack.projectName &&
                                            selectedStack?.orgName === stack.orgName
                                                ? 'border-blue-500'
                                                : 'border-gray-200 dark:border-gray-700'
                                        } hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer my-5 dark:bg-gray-800`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center">
                                                    <p className="text-2xl font-medium text-indigo-600 dark:text-indigo-400 truncate mr-3">{stack.stackName}</p>
                                                    {/* Status Badge */}
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColorClass(stack.result)}`}>
                                                {getStatusText(stack.result)}
                                            </span>
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(stack.lastUpdate)}</p>
                                            </div>
                                            <div className="mt-2 flex flex-wrap">
                                                <div
                                                    className="flex items-center text-sm text-gray-500 dark:text-gray-400 mr-6">
                                            <span className="truncate">Organization: <span
                                                className="font-medium text-gray-900 dark:text-gray-200">{stack.orgName}</span></span>
                                                </div>
                                                <div
                                                    className="flex items-center text-sm text-gray-500 dark:text-gray-400 mr-6">
                                            <span className="truncate">Project: <span
                                                className="font-medium text-gray-900 dark:text-gray-200">{stack.projectName}</span></span>
                                                </div>
                                                <div
                                                    className="flex items-center text-sm text-gray-500 dark:text-gray-400 mr-6">
                                            <span className="truncate">Project ID: <span
                                                className="font-medium text-gray-900 dark:text-gray-200">{stack.tags?.["idp:projectid"] || "N/A"}</span></span>
                                                </div>
                                                <div
                                                    className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <span className="truncate">Resources: <span
                                                className="font-medium text-gray-900 dark:text-gray-200">{stack.resourceCount}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ml-5 flex-shrink-0">
                                            <button
                                                type="button"
                                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/workloads/${stack.orgName}/${stack.projectName}/${stack.stackName}`);
                                                }}
                                            >
                                                Details
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {stacks.length === 0 && (
                            <div className="px-6 py-12 text-center bg-white dark:bg-gray-800 rounded-md">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">No workloads found.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex justify-between">
                    <button
                        type="button"
                        onClick={() => {
                            if (selectedStack) {
                                setShowDeleteConfirm(true);
                            }
                        }}
                        disabled={!selectedStack}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                            selectedStack
                                ? 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800'
                                : 'bg-red-300 dark:bg-red-800/50 cursor-not-allowed'
                        }`}
                    >
                        <Trash2 className="h-4 w-4 mr-2"/>
                        Delete Workload
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/blueprints')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                    >
                        <Plus className="h-4 w-4 mr-2"/>
                        Create New Workload
                    </button>
                </div>
            </div>
        </div>
    );
};

export function CreateWorkload() {
    const {blueprintName} = useParams();
    const [schema, setSchema] = useState(null);
    const [uiSchema, setUiSchema] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [mergedData, setMergedData] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const API_URL = import.meta.env.MODE === 'production' ? import.meta.env.VITE_API_URL : '/';

        const fetchSchema = fetch(`${API_URL}api/blueprints/${blueprintName}/schema`)
            .then(res => res.json());


        const fetchMetadata = fetch(`${API_URL}api/workloads/schema`)
            .then(res => res.json());


        const fetchUiSchema = fetch(`${API_URL}api/blueprints/${blueprintName}/ui-schema`)
            .then(res => res.json());


        Promise.all([fetchSchema, fetchMetadata, fetchUiSchema])
            .then(([schemaData, metadataData, uiSchemaData]) => {
                if (isMounted) {

                    setSchema(schemaData);
                    setMetadata(metadataData);

                    const mergedUiSchema = {
                        "ui:order": [
                            "name",
                            "stage",
                            "*",
                            "cookiecut",
                            "advanced"
                        ],
                        ...uiSchemaData,
                    }

                    setUiSchema(mergedUiSchema);


                    const mergedData = {
                        ...schemaData,
                        properties: {
                            ...metadataData.properties,

                        },
                        required: [
                            ...metadataData.required,
                        ],
                    }
                    if (Object.keys(schemaData.properties).length > 0) {
                        mergedData.properties.advanced = {
                            type: "array",
                            title: "Advanced Settings",
                            items: {
                                type: "object",
                                properties: schemaData.properties,
                                required: schemaData.required,
                            }
                        }
                    }
                    if (schemaData.stage) {
                        mergedData.properties.stage = {
                            type: "string",
                            title: "Stage",
                            ...schemaData.stage,
                        }
                    }
                    setMergedData(mergedData);
                    setLoading(false);
                }
            })
            .catch(error => {
                console.error("Error fetching data:", error);
                if (isMounted) {
                    setLoading(false);
                    // You might want to add an error state here
                }
            });

        return () => {
            isMounted = false;
        };
    }, [blueprintName]);

    const handleSubmit = ({formData}) => {
        const API_URL = import.meta.env.MODE === 'production' ? import.meta.env.VITE_API_URL : '/';
        fetch(`${API_URL}api/workloads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                blueprintName,
                ...formData
            }),
        })
            .then(res => res.json())
            .then(() => {
                navigate('/workloads');
            })
            .catch(err => console.error('Error creating item:', err));
    };

    if (loading) return <LoadingSpinner/>;

    const formData = {
        "blueprint": blueprintName,
    }

    return (
        <TailwindThemedForm
            schema={mergedData}
            uiSchema={uiSchema}
            formData={formData}
            validator={validator}
            onSubmit={handleSubmit}
        />
    );
};
