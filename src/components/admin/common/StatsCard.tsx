import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    color?: string;
    trend?: {
        value: string;
        isPositive?: boolean;
    };
}

export default function StatsCard({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color = "border-soft/10",
    trend 
}: StatsCardProps) {
    const formatValue = (val: string | number) => {
        if (typeof val === 'number') {
            return val.toLocaleString();
        }
        return val;
    };

    const getTrendColor = () => {
        if (!trend) return '';
        return trend.isPositive ? 'text-green-400' : 'text-red-400';
    };

    return (
        <div className={`glass rounded-xl p-6 border ${color}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-gray-400 text-sm font-medium">{title}</p>
                    <p className="text-2xl font-bold text-white mt-2">{formatValue(value)}</p>
                    {subtitle && (
                        <p className="text-sm mt-2 text-soft">{subtitle}</p>
                    )}
                    {trend && (
                        <p className={`text-sm mt-2 ${getTrendColor()}`}>{trend.value}</p>
                    )}
                </div>
                <div className="ml-4">
                    {React.createElement(icon, { className: "w-8 h-8 text-soft" })}
                </div>
            </div>
        </div>
    );
}
