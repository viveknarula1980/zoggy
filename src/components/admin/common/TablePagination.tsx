import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    showPageNumbers?: boolean;
    maxVisiblePages?: number;
}

export default function TablePagination({ currentPage, totalPages, onPageChange, showPageNumbers = true, maxVisiblePages = 5 }: TablePaginationProps) {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
        if (totalPages <= maxVisiblePages) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const half = Math.floor(maxVisiblePages / 2);
        let start = Math.max(currentPage - half, 1);
        let end = Math.min(start + maxVisiblePages - 1, totalPages);

        if (end - start + 1 < maxVisiblePages) {
            start = Math.max(end - maxVisiblePages + 1, 1);
        }

        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    return (
        <div className="flex items-center justify-between p-4">
            <div className="text-sm text-soft">
                Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 text-soft hover:text-light disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary rounded-lg transition-colors" title="Previous page">
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {showPageNumbers &&
                    getVisiblePages().map((page) => (
                        <button key={page} onClick={() => onPageChange(page)} className={`px-3 py-1 rounded-lg text-sm transition-colors ${page === currentPage ? "bg-neon-pink text-white" : "text-soft hover:text-light hover:bg-background-secondary"}`}>
                            {page}
                        </button>
                    ))}

                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 text-soft hover:text-light disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary rounded-lg transition-colors" title="Next page">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
