"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/contexts/AdminContext";

export default function AdminRoot() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAdmin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      // Prefer using the centralized auth from useAdmin()
      const success = await login(username, password);
      if (success) {
        // navigate to dashboard after successful login
        router.replace("/admin/dashboard");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to sign in");
    } finally {
      setIsLoading(false);
    }

    // NOTE: If you don't have useAdmin().login implemented yet, the above will fail.
    // Uncomment fallback below to keep behavior until backend integration is done:
    // setTimeout(() => {
    //     setIsLoading(false);
    //     router.push("/admin/dashboard");
    // }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-light mb-2">Admin Login</h2>
        </div>

        <div className="glass border border-soft/10 rounded-lg p-6">
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
                className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
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
                className="w-full px-3 py-2 bg-background/50 border border-soft/10 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent"
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
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
