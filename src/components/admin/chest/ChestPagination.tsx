"use client";

import TablePagination from "@/components/admin/common/TablePagination";

interface ChestPaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export default function ChestPagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: ChestPaginationProps) {
    return (
        <div className="flex items-center justify-between p-4">
            <div className="text-sm text-soft">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} chests
            </div>
            <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
            />
        </div>
    );
}
