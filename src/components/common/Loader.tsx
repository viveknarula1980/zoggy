import React from "react";

interface LoaderProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

const Loader: React.FC<LoaderProps> = ({ size = "md", className = "" }) => {
    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-10 h-10",
        lg: "w-16 h-16",
    };

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div className={`animate-spin rounded-full border-4 border-primary border-t-transparent ${sizeClasses[size]}`} />
        </div>
    );
};

export default Loader;
