'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Phone, Calendar, Save } from 'lucide-react';
import { adminFetch } from '@/utils/api/adminsetting'; // adjust path if your helper lives elsewhere

// NOTE: this component expects either:
// - NEXT_PUBLIC_ADMIN_USER_ID env var (admin wallet/id) OR
// - you can paste an id into the input to fetch a specific user

interface AdminProfile {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  joinDate?: string;
  walletAddress?: string;
  pdaBalance?: number;
}

export default function ProfileSettings() {
  const envUserId = process.env.NEXT_PUBLIC_ADMIN_USER_ID || '';
  const [userId, setUserId] = useState(envUserId);
  const [profile, setProfile] = useState<AdminProfile>({
    name: 'Admin User',
    email: 'admin@flipverse.com',
    phone: '',
    role: 'Super Admin',
    joinDate: new Date().toISOString(),
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // load on mount and when userId changes
  useEffect(() => {
    // if userId is blank use admin
    if (userId !== undefined) fetchUser(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function fetchUser(id: string) {
    try {
      setLoading(true);
      setError(null);

      const isAdmin = !id || id === envUserId || id === 'admin';
      const u = await adminFetch(isAdmin ? `/admin/me` : `/admin/users/${encodeURIComponent(id)}`);

      setProfile({
        id: u.id || id || 'admin',
        name: (u.name || u.username) ?? profile.name,
        email: u.email ?? profile.email,
        phone: u.phone ?? profile.phone,
        role: u.role ?? profile.role,
        joinDate: u.joinDate ?? u.joinedAt ?? profile.joinDate,
        walletAddress: u.walletAddress ?? id,
        pdaBalance: Number(u.pdaBalance ?? 0),
      });
    } catch (err: any) {
      setError(err?.body?.error || err?.message || 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      // only send allowed fields
      const body: Partial<AdminProfile> = {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        joinDate: profile.joinDate,
      };

      const idToUse = profile.id || envUserId || 'admin';
      const res = await adminFetch(`/admin/users/${encodeURIComponent(idToUse)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      // server returns updated profile (getAdminProfile writes & returns)
      setProfile((p) => ({ ...p, ...(res || {}) }));
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.body?.error || err?.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Admin Profile</h2>
      </div>

      <div className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm text-light mb-2">User ID / Wallet</label>
          <div className="flex gap-2">
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="paste user id or wallet (leave blank or 'admin' to edit admin profile)"
              className="flex-1 px-3 py-2 bg-background/50 border border-border rounded-lg text-white"
            />
            <button
              onClick={() => fetchUser(userId)}
              className="px-4 py-2 rounded-lg bg-neon-pink/20 text-neon-pink border border-neon-pink/30"
            >
              Load
            </button>
          </div>
          {loading && <div className="text-xs text-light mt-1">Loading...</div>}
          {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
        </div>

        <div>
          <label className="block text-sm font-medium text-light mb-2">
            <User size={16} className="inline mr-2" />
            Full Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={profile.name || ''}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-white"
            />
          ) : (
            <p className="text-white bg-background/30 px-3 py-2 rounded-lg">{profile.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-light mb-2">
            <Mail size={16} className="inline mr-2" />
            Email Address
          </label>
          {isEditing ? (
            <input
              type="email"
              value={profile.email || ''}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-white"
            />
          ) : (
            <p className="text-white bg-background/30 px-3 py-2 rounded-lg">{profile.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-light mb-2">
            <Phone size={16} className="inline mr-2" />
            Phone Number
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={profile.phone || ''}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-white"
            />
          ) : (
            <p className="text-white bg-background/30 px-3 py-2 rounded-lg">{profile.phone || '—'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-light mb-2">
            <Calendar size={16} className="inline mr-2" />
            Join Date
          </label>
          <p className="text-white bg-background/30 px-3 py-2 rounded-lg">
            {profile.joinDate ? new Date(profile.joinDate).toLocaleDateString() : '—'}
          </p>
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-lg"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg"
              >
                {isSaving ? 'Saving...' : <><Save size={14} className="inline mr-2" />Save</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
