// components/admin/settings/PasswordSettings.tsx
'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff, Shield, Check, X } from 'lucide-react';
import { adminFetch } from '@/utils/api/adminsetting';

interface PasswordRequirement {
  text: string;
  met: boolean;
}

export default function PasswordSettings() {
  const [userId, setUserId] = useState(process.env.NEXT_PUBLIC_ADMIN_USER_ID || '');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [isChanging, setIsChanging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const requirements: PasswordRequirement[] = [
    { text: 'At least 8 characters long', met: passwords.new.length >= 8 },
    { text: 'Contains uppercase letter', met: /[A-Z]/.test(passwords.new) },
    { text: 'Contains lowercase letter', met: /[a-z]/.test(passwords.new) },
    { text: 'Contains number', met: /\d/.test(passwords.new) },
    { text: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(passwords.new) },
  ];

  const passwordsMatch = passwords.new === passwords.confirm && passwords.confirm !== '';
  const allRequirementsMet = requirements.every((r) => r.met);
  const canSubmit = allRequirementsMet && passwordsMatch && passwords.current !== '' && userId !== '';

  async function handlePasswordChange() {
    if (!canSubmit) return;
    setIsChanging(true);
    setMessage(null);

    try {
      // server currently has NO password change endpoint: implement on server as e.g.:
      // PUT /admin/users/:id/password { currentPassword, newPassword }
      // Here we attempt to call it; if you haven't added it yet the call will fail.
      await adminFetch(`/admin/users/${encodeURIComponent(userId)}/password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new }),
      });

      setMessage('Password changed.');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      setMessage(err?.body?.error || err?.message || 'Failed to change password (server endpoint may not exist).');
    } finally {
      setIsChanging(false);
    }
  }

  function toggle(field: keyof typeof showPasswords) {
    setShowPasswords((s) => ({ ...s, [field]: !s[field] }));
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center mb-6">
        <Shield className="text-neon-pink mr-3" size={24} />
        <h2 className="text-xl font-bold text-white">Change Password</h2>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-light mb-2">User ID / Wallet (for password change)</label>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-white" placeholder="user id or wallet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-light mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                className="w-full px-3 py-2 pr-10 bg-background/50 border border-border rounded-lg text-white"
                placeholder="Enter current password"
              />
              <button type="button" onClick={() => toggle('current')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-light">
                {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-light mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwords.new}
                onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
                className="w-full px-3 py-2 pr-10 bg-background/50 border border-border rounded-lg text-white"
                placeholder="Enter new password"
              />
              <button type="button" onClick={() => toggle('new')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-light">
                {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-light mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                className={`w-full px-3 py-2 pr-10 bg-background/50 border rounded-lg text-white ${
                  passwords.confirm === '' ? 'border-border' : passwordsMatch ? 'border-green-500' : 'border-red-500'
                }`}
                placeholder="Confirm new password"
              />
              <button type="button" onClick={() => toggle('confirm')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-light">
                {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwords.confirm !== '' && <p className={`text-xs mt-1 ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</p>}
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={!canSubmit || isChanging}
            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center space-x-2 ${
              canSubmit && !isChanging ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/30' : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Lock size={16} />
            <span>{isChanging ? 'Changing Password...' : 'Change Password'}</span>
          </button>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Password Requirements</h3>
          <div className="space-y-3">
            {requirements.map((requirement, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${requirement.met ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{requirement.met ? <Check size={12} /> : <X size={12} />}</div>
                <span className={`text-sm ${requirement.met ? 'text-green-400' : 'text-light'}`}>{requirement.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {message && <div className="mt-4 text-sm text-light">{message}</div>}
    </div>
  );
}
