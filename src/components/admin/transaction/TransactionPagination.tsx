"use client";

import TablePagination from "../common/TablePagination";

interface TransactionPaginationProps {
    currentPage: number;
    totalPages: number;
    totalTransactions: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export default function TransactionPagination({
    currentPage,
    totalPages,
    totalTransactions,
    itemsPerPage,
    onPageChange
}: TransactionPaginationProps) {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalTransactions);

    return (
        <div className="px-6 py-4 border-t border-soft/10 flex items-center justify-between">
            <div className="text-sm text-soft">
                Showing {startItem} to {endItem} of {totalTransactions} transactions
            </div>
            <TablePagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
            />
        </div>
    );
}
