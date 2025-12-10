"use client";

import TablePagination from "./common/TablePagination";

interface UserPaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export default function UserPagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: UserPaginationProps) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-soft/10">
            <div className="text-sm text-soft">
                Showing {startItem} to {endItem} of {totalItems} users
            </div>
            <div className="flex items-center gap-2">
                <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
            </div>
        </div>
    );
}
