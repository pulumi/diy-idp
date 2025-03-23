import {DynamicIcon, IconName} from "lucide-react/dynamic";
import {Link} from "react-router-dom";

type SidebarItemProps = {
    icon: IconName;
    text: string;
    href: string;
}

export default function SidebarItem({icon, text, href}: SidebarItemProps) {
    return (
        <li>
            <Link to={href}
                  className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
                <DynamicIcon name={icon} size={24}/>
                <span className="ms-3">{text}</span>
            </Link>
        </li>
    );
};
