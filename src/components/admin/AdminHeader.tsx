"use client";

import { useAdmin } from "@/contexts/AdminContext";

interface AdminHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export default function AdminHeader({ title, subtitle, action }: AdminHeaderProps) {
    const { logout } = useAdmin();

    return (
        <div className="bg-card/30 backdrop-blur-sm border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">{title}</h1>
                    {subtitle && <p className="text-soft mt-1">{subtitle}</p>}
                </div>

                <div className="flex items-center space-x-4">
                    {action && <div>{action}</div>}
                    <div className="text-sm text-soft">
                        Welcome, <span className="text-white font-medium">Admin</span>
                    </div>
                    <button onClick={logout} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm font-medium">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
