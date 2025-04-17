import {useEffect, useState} from 'react';
import {AlertCircle} from 'lucide-react';
import Card, {CardContent, CardHeader, CardTitle} from "../common/Card.tsx";
import {useNavigate} from "react-router-dom";
import LoadingSpinner from "../common/LoadingsSpinner.tsx";
import BlueprintCard from "../common/BlueprintCard.tsx";
import {IconName} from "lucide-react/dynamic";


type Stage = {
    name: string;
    environments: string[];
}

export type Blueprint = {
    name: string;
    author: string;
    description: string;
    displayName: string;
    icon: IconName;
    lifecycle: string;
    git: string;
    environments: string[] | null;
    stages: Stage[] | null;
    tags: {
        [key: string]: string;
    }
}


export default function BlueprintGrid() {
    const [blueprints, setBlueprints] = useState([] as Blueprint[]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        const API_URL = import.meta.env.MODE === 'production' ? import.meta.env.VITE_API_URL : '/';

        fetch(`${API_URL}api/blueprints/`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch blueprints');
                return res.json() as Promise<Blueprint[]>;
            })
            .then(data => {
                if (isMounted) {
                    setBlueprints(data);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (isMounted) {
                    setError(err.message);
                    setLoading(false);
                }
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const handleBlueprintClick = (blueprint: Blueprint) => {
        navigate(`/workloads/create/${blueprint.name}`);
    };

    if (loading) return <LoadingSpinner/>;
    if (error) return (
        <div className="p-8 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 flex items-center gap-4">
            <AlertCircle className="text-red-600 dark:text-red-400"/>
            <span>{error}</span>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 dark:text-gray-100">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Available Blueprints</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blueprints.map(blueprint => (
                    <BlueprintCard
                        blueprint={blueprint}
                        onClick={() => handleBlueprintClick(blueprint)}
                    />
                ))}
                <Card dashed={true}>
                    <CardHeader icon="search-x" className="stroke-gray-900 dark:stroke-white">
                        <CardTitle textSize={"text-3xl"}>Missing a Blueprint?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        Reach out to the platform engineering team for any new blueprint ideas.
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

