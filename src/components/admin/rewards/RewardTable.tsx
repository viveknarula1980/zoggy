"use client";

import { Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { RewardTier } from "@/utils/api/rewardsApi";
import TablePagination from "../common/TablePagination";

// Extend RewardTier to optionally carry the printable text for FS rewards
type RewardRow = RewardTier & { rewardText?: string };

interface RewardTableProps {
  rewards: RewardRow[];
  onEdit: (reward: RewardRow) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function RewardTable({
  rewards,
  onEdit,
  onDelete,
  onToggleStatus,
  currentPage,
  totalPages,
  onPageChange,
}: RewardTableProps) {
  const formatAmount = (amount: number) => {
    const n = Number.isFinite(amount) ? amount : 0;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toString() === "Invalid Date"
      ? "-"
      : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="glass rounded-2xl border border-soft/10 overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background-secondary/50">
            <tr className="text-left text-light font-medium">
              <th className="p-4">Tier</th>
              <th className="p-4">Requirement</th>
              <th className="p-4">Reward</th>
              <th className="p-4">Users</th>
              <th className="p-4">Claimed</th>
              <th className="p-4">Status</th>
              <th className="p-4">Updated</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((reward) => {
              const users = Number(reward.totalUsers ?? 0);
              const claimed = Number(reward.totalClaimed ?? 0);
              const pct = users > 0 ? ((claimed / users) * 100).toFixed(1) : "0";

              return (
                <tr key={reward.id} className="border-t border-soft/10 hover:bg-background-secondary/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${reward.color} flex items-center justify-center border`}>
                        <span className="text-lg">{reward.icon}</span>
                      </div>
                      <div>
                        <div className="font-medium text-light">{reward.name}</div>
                        <div className="text-xs text-soft">{reward.id}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="font-medium text-light">{formatAmount(Number(reward.requirement || 0))}</div>
                    <div className="text-xs text-soft">Wagered</div>
                  </td>

                  {/* IMPORTANT: Prefer the original rewardText (e.g., "10 FS x $0.25 = $2.50") */}
                  <td className="p-4">
                    <div className="font-medium text-light">
                      {reward.rewardText?.trim()
                        ? reward.rewardText
                        : formatAmount(Number(reward.rewardAmount || 0))}
                    </div>
                    <div className="text-xs text-soft">Reward</div>
                  </td>

                  <td className="p-4">
                    <div className="font-medium text-light">{users.toLocaleString()}</div>
                    <div className="text-xs text-soft">Eligible</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-light">{claimed.toLocaleString()}</div>
                    <div className="text-xs text-soft">{pct}%</div>
                  </td>

                  <td className="p-4">
                    <button onClick={() => onToggleStatus(reward.id)} className="flex items-center gap-2">
                      {reward.isActive ? (
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
                    <div className="text-sm text-soft">{formatDate(reward.updatedAt)}</div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(reward)}
                        className="p-2 text-soft hover:text-light hover:bg-background-secondary rounded-lg transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(reward.id)}
                        className="p-2 text-soft hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
