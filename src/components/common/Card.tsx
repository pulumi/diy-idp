import React from "react";
import {DynamicIcon, IconName} from "lucide-react/dynamic";

type ColorType = "default" | "success" | "warning" | "danger" | "primary" | "secondary" | "info";

type BadgeProps = {
    className?: string;
    variant?: ColorType;
    children: React.ReactNode;
}

function Badge({className, variant = "default", children, ...props}: BadgeProps) {
    const variants: Record<ColorType, string> = {
        default: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        primary: 'bg-blue-500 text-white dark:bg-blue-700',
        secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
        info: 'bg-blue-300 text-blue-800 dark:bg-blue-700 dark:text-blue-300'
    };
    return (
        <span
            className={`
                text-xs font-medium px-2.5 py-0.5 rounded-full
                ${variants[variant]}
                ${className}
            `}
            {...props}
        >
            {children}
        </span>
    );
}

// Define a type for badge items
type BadgeItem = {
    text: string;
    variant?: ColorType;
    className?: string;
}

type CardProps = {
    className?: string;
    onClick?: () => void;
    children: React.ReactNode;
    hover?: boolean;
    dashed?: boolean;
}

export default function Card({className, onClick, hover, dashed = false, children, ...props}: CardProps) {
    return (
        <div
            className={`
                border-gray-900 dark:border-white bg-white dark:bg-gray-800 
                ${hover ? 'cursor-pointer transform hover:scale-105  duration-200 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 ' : ''}
                ${dashed ? 'border-dashed border-4' : 'border shadow-sm dark:shadow-gray-900'}
                ${className}
            `}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
};

type CardHeaderProps = {
    className?: string;
    children: React.ReactNode;
    icon?: IconName;
    iconColor?: string;
    iconSize?: number;
    badges?: BadgeItem[]; // New property for array of badges
    badgesPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    backgroundColor?: string;
}

export function CardHeader({
                               className,
                               children,
                               icon,
                               iconColor = '#fff',
                               iconSize = 80,
                               badges = [],
                               badgesPosition = 'top-right',
                               backgroundColor = 'white',
                               ...props
                           }: CardHeaderProps) {
    const bgColorClass = backgroundColor === 'white'
        ? 'bg-white dark:bg-gray-800'
        : `bg-${backgroundColor}-500 dark:bg-${backgroundColor}-700`;

    // Define position classes for badge container
    const positionClasses = {
        'top-right': 'absolute top-4 right-4 flex flex-col items-end gap-2',
        'top-left': 'absolute top-4 left-4 flex flex-col items-start gap-2',
        'bottom-right': 'absolute bottom-4 right-4 flex flex-col items-end gap-2',
        'bottom-left': 'absolute bottom-4 left-4 flex flex-col items-start gap-2'
    };

    // For horizontal layout option
    const isHorizontal = badges.length > 0 && badges.length <= 1;
    const horizontalClass = isHorizontal ? 'flex-row' : 'flex-col';

    return (
        <div
            className={`flex flex-col space-y-1.5 pl-6 pr-6 pt-6 ${className} ${bgColorClass} relative`}
            {...props}
        >

            {/* Support for array of badges */}
            {badges.length > 0 && (
                <div className={`${positionClasses[badgesPosition]} ${horizontalClass}`}>
                    {badges.map((badge, index) => (
                        <Badge
                            key={index}
                            variant={badge.variant}
                            className={badge.className}
                        >
                            {badge.text}
                        </Badge>
                    ))}
                </div>
            )}

            {icon && (
                <div className={`flex justify-center items-center -mt-2 mb-4 pb-2`}>
                    <DynamicIcon
                        name={icon}
                        className={className}
                        color={iconColor}
                        size={iconSize}
                    />
                </div>
            )}
            {children}
        </div>
    );
}

type CardContentProps = {
    className?: string;
    children: React.ReactNode;
}

export function CardContent({className, children, ...props}: CardContentProps) {
    return (
        <div
            className={`p-6 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

type CardTitleProps = {
    className?: string;
    textSize?: string;
    children: React.ReactNode;
}

export function CardTitle({className, textSize = "text-xl", children, ...props}: CardTitleProps) {
    return (
        <h3
            className={`${textSize} font-semibold leading-none tracking-tight mb-2 text-gray-900 dark:text-gray-100 ${className}`}
            {...props}
        >
            {children}
        </h3>
    );
};

export function CardSubtitle({className, children, ...props}: CardTitleProps) {
    return (
        <h4
            className={`text-sm font-medium text-gray-500 dark:text-gray-400 ${className}`}
            {...props}
        >
            {children}
        </h4>
    );
}

type CardDescriptionProps = {
    className?: string;
    backgroundColor?: string;
    children: React.ReactNode;
}

export function CardDescription({
                                    className,
                                    backgroundColor = "white",
                                    children,
                                    ...props
                                }: CardDescriptionProps) {

    const bgColorClass = backgroundColor === 'white'
        ? 'bg-white dark:bg-gray-800'
        : `bg-${backgroundColor}-500 dark:bg-${backgroundColor}-700`;

    return (
        <p
            className={`text-gray-600 dark:text-gray-400 ${className} ${bgColorClass}`}
            {...props}
        >
            {children}
        </p>
    );
}
