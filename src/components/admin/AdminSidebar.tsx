"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/contexts/AdminContext";
import { BarChart3, Users, Gamepad2, DollarSign, Gift, Bot, UserCheck, Trophy, Megaphone, Settings, LogOut, ArrowUpRight } from "lucide-react";

const sidebarItems = [
    {
        name: "Dashboard",
        href: "/admin/dashboard",
        icon: BarChart3,
    },
    {
        name: "Users",
        href: "/admin/users",
        icon: Users,
    },
    {
        name: "Games",
        href: "/admin/games",
        icon: Gamepad2,
    },
    {
        name: "Transactions",
        href: "/admin/transactions",
        icon: DollarSign,
    },
    {
        name: "Withdraw",
        href: "/admin/withdraw",
        icon: ArrowUpRight,
    },
    {
        name: "Chests",
        href: "/admin/chests",
        icon: Gift,
    },
    {
        name: "Bot Management",
        href: "/admin/bots",
        icon: Bot,
    },
    {
        name: "Referrals",
        href: "/admin/referrals",
        icon: UserCheck,
    },
    {
        name: "Rewards",
        href: "/admin/rewards",
        icon: Trophy,
    },
    {
        name: "Settings",
        href: "/admin/settings",
        icon: Settings,
    },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const { logout } = useAdmin();

    return (
        <div className="w-64 glass h-screen sticky top-0 flex flex-col">
            <div className="p-6 flex-1 flex flex-col">
                <h1 className="text-2xl font-bold text-white mb-8">Admin Control</h1>

                <nav className="space-y-2 flex-1">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-300 ${isActive ? "bg-neon-pink/20 text-neon-pink border-neon-pink/30" : "text-light hover:bg-background/70 hover:text-neon-pink border-transparent hover:border-border/30"}`}
                            >
                                <item.icon size={18} />
                                <span className="font-medium text-sm">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="pt-8">
                    <button onClick={logout} className="flex items-center space-x-2 px-3 py-2 rounded-lg text-light hover:bg-red-500/20 hover:text-red-400 transition-all duration-300 w-full border border-transparent hover:border-red-500/30">
                        <LogOut size={18} />
                        <span className="font-medium text-sm">Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
