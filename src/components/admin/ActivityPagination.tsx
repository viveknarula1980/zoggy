"use client";

import TablePagination from "./common/TablePagination";

interface ActivityPaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export default function ActivityPagination({ 
    currentPage, 
    totalPages, 
    totalItems, 
    itemsPerPage, 
    onPageChange 
}: ActivityPaginationProps) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalPages <= 1) return null;

    return (
        <div className="px-6 py-4 border-t border-soft/10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-soft">
                    Showing {startItem} to {endItem} of {totalItems} activities
                </div>
                <TablePagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            </div>
        </div>
    );
}
