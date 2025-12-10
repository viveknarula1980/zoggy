"use client";

interface SkeletonLoaderProps {
    className?: string;
    width?: string;
    height?: string;
}

export function SkeletonLoader({ className = "", width = "100%", height = "1rem" }: SkeletonLoaderProps) {
    return <div className={`animate-pulse bg-soft/20 rounded ${className}`} style={{ width, height }} />;
}

// Stats Card Skeleton
export function StatsCardSkeleton() {
    return (
        <div className="glass rounded-xl p-6 border border-soft/10">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <SkeletonLoader height="1rem" width="60%" className="mb-2" />
                    <SkeletonLoader height="2rem" width="40%" className="mb-1" />
                    <SkeletonLoader height="0.75rem" width="50%" />
                </div>
                <div className="ml-4">
                    <SkeletonLoader height="2.5rem" width="2.5rem" className="rounded-full" />
                </div>
            </div>
        </div>
    );
}

// Stats Grid Skeleton
export function StatsGridSkeleton({ columns = 4 }: { columns?: number }) {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6 mb-8`}>
            {Array.from({ length: columns }).map((_, index) => (
                <StatsCardSkeleton key={index} />
            ))}
        </div>
    );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
    return (
        <tr className="border-b border-soft/10">
            {Array.from({ length: columns }).map((_, index) => (
                <td key={index} className="px-6 py-4">
                    <SkeletonLoader height="1rem" width={index === 0 ? "80%" : "60%"} />
                </td>
            ))}
        </tr>
    );
}

// Table Skeleton
export function TableSkeleton({ columns = 6, rows = 5, showHeader = true }: { columns?: number; rows?: number; showHeader?: boolean }) {
    return (
        <div className="glass rounded-xl border border-soft/10 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    {showHeader && (
                        <thead className="bg-background-secondary/50 border-b border-border/30">
                            <tr>
                                {Array.from({ length: columns }).map((_, index) => (
                                    <th key={index} className="px-6 py-4 text-left">
                                        <SkeletonLoader height="1rem" width="70%" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {Array.from({ length: rows }).map((_, index) => (
                            <TableRowSkeleton key={index} columns={columns} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Filter Section Skeleton
export function FiltersSkeleton() {
    return (
        <div className="glass rounded-xl p-6 border border-soft/10 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col md:flex-row gap-4 flex-1">
                    <SkeletonLoader height="2.5rem" width="300px" className="rounded-lg" />
                    <SkeletonLoader height="2.5rem" width="150px" className="rounded-lg" />
                    <SkeletonLoader height="2.5rem" width="150px" className="rounded-lg" />
                </div>
                <SkeletonLoader height="2.5rem" width="100px" className="rounded-lg" />
            </div>
        </div>
    );
}

// Full Page Loading Skeleton
export function AdminPageSkeleton({
    title = "Loading...",
    subtitle = "Please wait while we fetch the data",
    showStats = true,
    showFilters = true,
    statsColumns = 4,
    tableColumns = 6,
    tableRows = 5,
}: {
    title?: string;
    subtitle?: string;
    showStats?: boolean;
    showFilters?: boolean;
    statsColumns?: number;
    tableColumns?: number;
    tableRows?: number;
}) {
    return (
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {/* Page Header Skeleton */}
            <div className="mb-8">
                <SkeletonLoader height="2rem" width="200px" className="mb-2" />
                <SkeletonLoader height="1rem" width="300px" />
            </div>

            {/* Stats Skeleton */}
            {showStats && <StatsGridSkeleton columns={statsColumns} />}

            {/* Filters Skeleton */}
            {showFilters && <FiltersSkeleton />}

            {/* Table Skeleton */}
            <TableSkeleton columns={tableColumns} rows={tableRows} />

            {/* Pagination Skeleton */}
            <div className="flex items-center justify-between mt-6">
                <SkeletonLoader height="1rem" width="150px" />
                <div className="flex gap-2">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <SkeletonLoader key={index} height="2rem" width="2rem" className="rounded" />
                    ))}
                </div>
            </div>
        </main>
    );
}

// Loading State with Message
export function LoadingState({ message = "Loading...", description = "Please wait while we fetch the data" }: { message?: string; description?: string }) {
    return (
        <div className="glass rounded-xl p-12 border border-soft/10 text-center">
            <div className="flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-pink"></div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{message}</h3>
            <p className="text-soft">{description}</p>
        </div>
    );
}
