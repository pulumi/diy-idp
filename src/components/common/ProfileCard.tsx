import {useState} from 'react';
import {LogOut, MoreHorizontal} from 'lucide-react';
import Card, {CardContent, CardHeader} from './Card.tsx';
import {Link} from "react-router-dom";
import {useAuth} from "react-oidc-context";

const ProfileCard = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const auth = useAuth();

    return (
        <Card className="max-w-auto bg-slate-50 dark:bg-gray-800 m-8">
            <CardHeader className="flex justify-end p-4">
                <div></div>
            </CardHeader>

            <CardContent className="flex flex-col items-center pb-10">
                <img
                    className="w-24 h-24 mb-3 shadow-md dark:shadow-gray-900"
                    src={auth.user?.profile.avatar_url as string}
                    alt="avatar"
                />
                <h5 className="mb-1 text-xl font-medium text-gray-900 dark:text-gray-100">{auth.user?.profile.name}</h5>
                <span className="text-sm text-gray-500 dark:text-gray-400 mb-6">{auth.user?.profile.email}</span>

                <Link
                    onClick={() => void auth.removeUser()}
                    to="/#"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-red-500 dark:hover:text-red-400 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 focus:outline-none transition-colors"
                >
                    <LogOut className="w-4 h-4 mr-2"/>
                    Logout
                </Link>
            </CardContent>
        </Card>
    );
};

export default ProfileCard;
