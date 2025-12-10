import { LucideIcon } from 'lucide-react';
import StatsCard from './StatsCard';

interface StatItem {
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

interface StatsGridProps {
    stats: StatItem[];
    columns?: 1 | 2 | 3 | 4;
}

export default function StatsGrid({ stats, columns = 4 }: StatsGridProps) {
    const getGridCols = () => {
        switch (columns) {
            case 1: return 'grid-cols-1';
            case 2: return 'grid-cols-1 md:grid-cols-2';
            case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
            case 4: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
            default: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
        }
    };

    return (
        <div className={`grid ${getGridCols()} gap-6 mb-8`}>
            {stats.map((stat, index) => (
                <StatsCard
                    key={index}
                    title={stat.title}
                    value={stat.value}
                    subtitle={stat.subtitle}
                    icon={stat.icon}
                    color={stat.color}
                    trend={stat.trend}
                />
            ))}
        </div>
    );
}
