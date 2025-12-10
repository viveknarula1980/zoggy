"use client";

import { useState } from "react";
import { User, UsersApiService } from "@/utils/api/usersApi";
import { Check, X, AlertTriangle } from "lucide-react";

interface WithdrawalControlsProps {
  user: User;
  onWithdrawalPermissionUpdate: (withdrawalsEnabled: boolean) => void;
  updating: boolean;
  setUpdating: (updating: boolean) => void;
}

export default function WithdrawalControls({ user, onWithdrawalPermissionUpdate, updating, setUpdating }: WithdrawalControlsProps) {
  const [reason, setReason] = useState("");
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<boolean | null>(null);

  const handleWithdrawalToggle = async (enable: boolean) => {
    setPendingAction(enable);
    setShowReasonForm(true);
  };

  const confirmWithdrawalToggle = async () => {
    if (!reason.trim()) {
      alert("Please provide a reason for this withdrawal permission change");
      return;
    }

    if (pendingAction === null) return;

    try {
      setUpdating(true);
      await UsersApiService.updateWithdrawalPermissions(user.id, pendingAction, reason);
      onWithdrawalPermissionUpdate(pendingAction);
      
      // Reset form
      setReason("");
      setShowReasonForm(false);
      setPendingAction(null);
      
      alert(`Successfully ${pendingAction ? "enabled" : "blocked"} withdrawals for user`);
    } catch (error) {
      console.error("Error updating withdrawal permissions:", error);
      alert("Failed to update withdrawal permissions");
    } finally {
      setUpdating(false);
    }
  };

  const cancelWithdrawalToggle = () => {
    setReason("");
    setShowReasonForm(false);
    setPendingAction(null);
  };

  return (
    <div className="glass rounded-xl p-6 border border-soft/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Withdrawal Controls</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-soft">Status:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
            user.withdrawalsEnabled 
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-red-500/20 text-red-400 border-red-500/30"
          }`}>
            <div className="flex items-center gap-1">
              {user.withdrawalsEnabled ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Enabled</span>
                </>
              ) : (
                <>
                  <X className="w-3 h-3" />
                  <span>Blocked</span>
                </>
              )}
            </div>
          </span>
        </div>
      </div>

      {!showReasonForm ? (
        <div className="space-y-3">
          <p className="text-sm text-soft">
            Control whether this user can withdraw funds from their account. Blocking withdrawals prevents all withdrawal attempts while still allowing deposits and gameplay.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleWithdrawalToggle(true)}
              disabled={user.withdrawalsEnabled || updating}
              className="flex-1 px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Enable Withdrawals
            </button>
            <button
              onClick={() => handleWithdrawalToggle(false)}
              disabled={!user.withdrawalsEnabled || updating}
              className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Block Withdrawals
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              pendingAction 
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}>
              {pendingAction ? "Enabling Withdrawals" : "Blocking Withdrawals"}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-soft mb-2">
              Reason for Change
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Enter reason for ${pendingAction ? "enabling" : "blocking"} withdrawals...`}
              rows={3}
              className="w-full px-3 py-2 bg-card/20 border border-soft/20 rounded-lg text-white placeholder-soft/50 focus:outline-none focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/50 resize-none"
            />
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-200">
                <strong>Warning:</strong> {pendingAction ? "Enabling" : "Blocking"} withdrawals will {pendingAction ? "allow" : "prevent"} the user from withdrawing funds. This action will be logged and can be audited.
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={confirmWithdrawalToggle}
              disabled={updating || !reason.trim()}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                pendingAction
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {updating ? "Processing..." : `Confirm ${pendingAction ? "Enable" : "Block"}`}
            </button>
            <button
              onClick={cancelWithdrawalToggle}
              disabled={updating}
              className="px-4 py-2 bg-gray-500/20 border border-gray-500/30 text-gray-400 rounded-lg hover:bg-gray-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
