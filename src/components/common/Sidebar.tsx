import {FC} from 'react';
import SidebarItem from "./SidebarItem.tsx";
import {IconName} from "lucide-react/dynamic";

const navigationItems = [
    {name: 'Home', href: '/', icon: "home"},
    {name: 'Workloads', href: '/workloads', icon: "box"},
    {name: 'Blueprints', href: '/blueprints', icon: "map"},
];


const Sidebar: FC = () => {
    return (
            <aside className="w-1/8 h-[calc(100vh-8.88rem)]">
                <div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                    <ul className="space-y-2 font-medium">
                        {navigationItems.map(item => (
                            <SidebarItem icon={item.icon as IconName} text={item.name} href={item.href} key={item.name}/>
                        ))}
                    </ul>
                </div>
                <div
                    className="px-3 py-4 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 text-center">
                    made with ❤️ at Pulumi
                </div>
            </aside>
    );
};

export default Sidebar;
