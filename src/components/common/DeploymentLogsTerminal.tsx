import React, {useEffect, useRef, useState} from 'react';
import {Terminal} from 'lucide-react';

export default function DeploymentLogsTerminal({organization, project, stack, deploymentID}) {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const terminalRef = useRef(null);
    const wsRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    const formatTimestamp = (timestamp) => {
        if (!timestamp || timestamp === '0001-01-01T00:00:00Z') return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };


    useEffect(() => {
        if (autoScroll && terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    useEffect(() => {
        if (!organization || !project || !stack || !deploymentID) return;

        const connectWebSocket = () => {

            if (wsRef.current) {
                wsRef.current.close();
            }

            setIsLoading(true);
            setError(null);
            setLogs([]);


            const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/workloads/ws/${organization}/${project}/${stack}/deployments/${deploymentID}/logs`;

            const socket = new WebSocket(wsUrl);
            wsRef.current = socket;

            socket.onopen = () => {
                setIsConnected(true);
                setIsLoading(false);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.error) {
                        setError(data.error);
                        return;
                    }

                    if (data.lines && Array.isArray(data.lines)) {
                        setLogs(prevLogs => [...prevLogs, ...data.lines]);
                    }
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            socket.onerror = (event) => {
                setError('WebSocket connection error');
                setIsLoading(false);
                setIsConnected(false);
            };

            socket.onclose = () => {
                setIsConnected(false);
                setIsLoading(false);
            };
        };


        connectWebSocket();


        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [organization, project, stack, deploymentID]);


    const fetchLogsViaREST = async () => {
        setIsLoading(true);
        setError(null);
        setLogs([]);

        try {
            let continuationToken = null;
            let keepFetching = true;
            const API_URL = import.meta.env.MODE === 'production' ? import.meta.env.VITE_API_URL : '/';

            while (keepFetching) {
                const url = `${API_URL}api/workloads/${organization}/${project}/${stack}/deployments/${deploymentID}/logs${
                    continuationToken ? `?continuationToken=${continuationToken}` : ''
                }`;

                const response = await fetch(url);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to fetch logs: ${errorText}`);
                }

                const data = await response.json();

                if (data.lines && Array.isArray(data.lines)) {
                    setLogs(prevLogs => [...prevLogs, ...data.lines]);
                }

                if (data.nextToken) {
                    continuationToken = data.nextToken;
                } else {
                    keepFetching = false;
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };


    const handleRefresh = () => {
        if (isConnected && wsRef.current) {

        } else {
            fetchLogsViaREST();
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Terminal className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400"/>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Deployment Logs
                        </h3>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="autoScroll"
                                checked={autoScroll}
                                onChange={() => setAutoScroll(!autoScroll)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor="autoScroll" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                Auto-scroll
                            </label>
                        </div>
                        {isConnected ? (
                            <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                <span className="h-2 w-2 mr-1 bg-green-500 rounded-full"></span>
                Live
              </span>
                        ) : (
                            <button
                                onClick={handleRefresh}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                            >
                                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none"
                                     viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                                Refresh
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Terminal window */}
            <div
                ref={terminalRef}
                className="bg-gray-900 text-gray-100 font-mono text-sm p-4 overflow-auto"
                style={{height: '400px'}}
            >
                {isLoading && logs.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                        <div
                            className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : error ? (
                    <div className="text-red-500 p-2">Error: {error}</div>
                ) : logs.length === 0 ? (
                    <div className="text-gray-500 p-2">No logs available</div>
                ) : (
                    logs.map((logEntry, index) => (
                        <div key={index} className="mb-1">
                            {logEntry.header && (
                                <div className="text-indigo-400 font-bold pb-1 pt-2">
                                    {logEntry.header}
                                </div>
                            )}
                            {logEntry.line && (
                                <div className="flex">
                                    {formatTimestamp(logEntry.timestamp) && (
                                        <span className="text-gray-500 mr-2">
                      [{formatTimestamp(logEntry.timestamp)}]
                    </span>
                                    )}
                                    <span className="whitespace-pre-wrap break-words">{logEntry.line}</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
