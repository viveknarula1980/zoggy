import { Edit, Trash2, ToggleLeft, ToggleRight, Trophy } from "lucide-react";
import { Range } from "@/utils/api/rewardsApi";
import TablePagination from "../common/TablePagination";

interface RangeTableProps {
    ranges: Range[];
    onEdit: (range: Range) => void;
    onDelete: (id: number) => void;
    onToggleStatus: (id: number) => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function RangeTable({ ranges, onEdit, onDelete, onToggleStatus, currentPage, totalPages, onPageChange }: RangeTableProps) {
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="glass rounded-2xl border border-soft/10 overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-background-secondary/50">
                        <tr className="text-left text-light font-medium">
                            <th className="p-4">Image</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Quote</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Created</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranges.map((range) => (
                            <tr key={range.id} className="border-t border-soft/10 hover:bg-background-secondary/30 transition-colors">
                                <td className="p-4">
                                    {range.image ? (
                                        <div className="w-10 h-10 rounded-lg overflow-hidden">
                                            <img src={range.image} alt={range.name} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-soft/20 flex items-center justify-center">
                                            <Trophy className="w-4 h-4 text-yellow-400" />
                                        </div>
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="font-medium text-light">{range.name}</div>
                                    <div className="text-xs text-soft">ID: {range.id}</div>
                                </td>
                                <td className="p-4">
                                    <div className="text-soft italic max-w-xs truncate" title={range.quote}>
                                        "{range.quote}"
                                    </div>
                                </td>
                                <td className="p-4">
                                    <button onClick={() => onToggleStatus(range.id)} className="flex items-center gap-2">
                                        {range.isActive ? (
                                            <>
                                                <ToggleRight className="w-5 h-5 text-green-500" />
                                                <span className="text-green-400 text-sm">Active</span>
                                            </>
                                        ) : (
                                            <>
                                                <ToggleLeft className="w-5 h-5 text-gray-500" />
                                                <span className="text-gray-400 text-sm">Inactive</span>
                                            </>
                                        )}
                                    </button>
                                </td>
                                <td className="p-4">
                                    <div className="text-sm text-soft">{formatDate(range.created_at)}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onEdit(range)}
                                            className="p-2 text-soft hover:text-light hover:bg-background-secondary rounded-lg transition-colors cursor-pointer"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(range.id)}
                                            className="p-2 text-soft hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
            />
        </div>
    );
}
