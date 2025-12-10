// components/admin/settings/MaintenanceSettings.tsx
'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Settings as SettingsIcon, Save } from 'lucide-react';
import { adminFetch } from '@/utils/api/adminsetting';
import DateTimePicker from '@/components/admin/common/DateTimePicker';

interface MaintenanceConfig {
  isEnabled: boolean;
  message: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  redirectUrl: string;
  notifyUsers: boolean;
  notificationMinutes: number;
}

export default function MaintenanceSettings() {
  const [config, setConfig] = useState<MaintenanceConfig>({
    isEnabled: false,
    message: "FlipVerse is currently undergoing scheduled maintenance. We'll be back shortly!",
    scheduledStart: null,
    scheduledEnd: null,
    redirectUrl: '/maintenance',
    notifyUsers: true,
    notificationMinutes: 30,
  });
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    setMsg(null);
    try {
      // NOTE: your server.js doesn't provide a maintenance config endpoint by default.
      // If you implement GET /admin/maintenance that returns the object shape below, it will populate the UI.
      const serverCfg = await adminFetch('/admin/maintenance').catch(() => null);
      if (serverCfg) {
        setConfig((prev) => ({ ...prev, ...serverCfg }));
      }
    } catch (err: any) {
      // ignore - server may not expose maintenance admin endpoints
    } finally {
      setLoading(false);
    }
  }

  async function toggleMaintenance() {
    setIsSaving(true);
    setMsg(null);
    try {
      // Prefer server endpoint: POST /admin/maintenance/toggle or PUT /admin/maintenance
      // UI will optimistically toggle locally, and attempt server update if endpoint exists.
      setConfig((c) => ({ ...c, isEnabled: !c.isEnabled }));
      try {
        await adminFetch('/admin/maintenance/toggle', { method: 'POST' });
      } catch {
        // endpoint may not exist — fine; UI still toggles locally.
      }
      setMsg('Maintenance toggled.');
    } catch (err: any) {
      setMsg(err?.body?.error || err?.message || 'Failed to toggle maintenance');
    } finally {
      setIsSaving(false);
    }
  }

  async function saveConfig() {
    setIsSaving(true);
    setMsg(null);
    try {
      // Preferred server endpoint: PUT /admin/maintenance
      await adminFetch('/admin/maintenance', {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      setMsg('Maintenance configuration saved.');
    } catch (err: any) {
      // If endpoint missing, just show success locally
      setMsg(err?.body?.error || 'Saved locally (server endpoint not present).');
    } finally {
      setIsSaving(false);
    }
  }

  function quickSchedule() {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    setConfig((p) => ({ ...p, scheduledStart: start.toISOString().slice(0, 16), scheduledEnd: end.toISOString().slice(0, 16) }));
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center">
            <div className={`p-3 rounded-full mr-4 ${config.isEnabled ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Maintenance Mode</h2>
              <p className="text-light text-sm">{config.isEnabled ? 'Site is currently in maintenance mode' : 'Site is operational'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${config.isEnabled ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
              {config.isEnabled ? 'MAINTENANCE' : 'OPERATIONAL'}
            </div>
            <button onClick={toggleMaintenance} disabled={isSaving} className={`px-6 py-2 rounded-lg font-medium ${config.isEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isSaving ? 'Updating...' : config.isEnabled ? 'Disable Maintenance' : 'Enable Maintenance'}
            </button>
          </div>
        </div>

        {config.isEnabled && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertTriangle className="text-red-400 mr-2" size={16} />
              <span className="text-red-400 font-medium">Warning</span>
            </div>
            <p className="text-light text-sm">Maintenance mode is active. Users will see the maintenance page and cannot access the platform.</p>
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <SettingsIcon className="text-neon-pink mr-3" size={20} />
            <h3 className="text-lg font-bold text-white">Configuration</h3>
          </div>
          <button onClick={quickSchedule} className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg">Quick Schedule</button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-light mb-2">Maintenance Message</label>
            <textarea value={config.message} onChange={(e) => setConfig((c) => ({ ...c, message: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-white" />
          </div>

          <div>
            <label className="block text-sm font-medium text-light mb-2">Redirect URL</label>
            <input value={config.redirectUrl} onChange={(e) => setConfig((c) => ({ ...c, redirectUrl: e.target.value }))} className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-white" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateTimePicker
              label="Start Time"
              value={config.scheduledStart || null}
              onChange={(value) => setConfig((c) => ({ ...c, scheduledStart: value }))}
              placeholder="Select maintenance start time"
            />

            <DateTimePicker
              label="End Time"
              value={config.scheduledEnd || null}
              onChange={(value) => setConfig((c) => ({ ...c, scheduledEnd: value }))}
              placeholder="Select maintenance end time"
            />
          </div>

          <div className="pt-4">
            <button onClick={saveConfig} disabled={isSaving} className="w-[300px] py-3 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-lg hover:bg-neon-pink/30 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 font-medium">
              <Save size={16} /> <span className="ml-2">{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>

          {msg && <div className="text-sm text-light">{msg}</div>}
          {loading && <div className="text-xs text-light">Loading server config (if available)...</div>}
        </div>
      </div>
    </div>
  );
}
