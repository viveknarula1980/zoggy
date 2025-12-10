'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      try { router.push('/admin/dashboard'); } catch {}
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    const success = await login(username, password);
    if (!success) {
      setError('Invalid credentials');
    } else {
      try { router.push('/admin/dashboard'); } catch {}
    }
  };

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center glass">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-light mb-2">Admin Login</h2>
          <p className="text-soft">Access the admin panel</p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-soft mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-soft/10 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                placeholder="Enter username"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-soft mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-soft/10 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
                placeholder="Enter password"
                disabled={isLoading}
              />
            </div>

            {error && <div className="text-red-400 text-sm text-center">{error}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-neon-pink hover:bg-neon-pink/80 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-soft">
            <p>For local development, use the admin username is admin password is admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
