"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User2, Gift, LogOut, Users } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";

interface ProfileDropdownProps { }

const ProfileDropdown = ({ }: ProfileDropdownProps) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { publicKey, disconnect } = useWallet();
    const router = useRouter();

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleOptionClick = (action: string) => {
        setIsDropdownOpen(false);

        switch (action) {
            case "profile":
                router.push("/profile");
                break;
            case "rewards":
                router.push("/rewards");
                break;
            case "referrals":
                router.push("/referrals");
                break;
            case "logout":
                disconnect();
                break;
        }
    };

    if (!publicKey) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex gap-1 sm:gap-2 items-center w-24 sm:w-32 md:w-40 h-9 sm:h-10 md:h-12 bg-background-secondary hover:bg-background-secondary/30 text-light px-2 sm:px-3 md:px-6 py-2 rounded-lg sm:rounded-xl border border-purple/30 transition-all duration-300 text-sm sm:text-base">
                <User2 size={18} className="hidden md:block sm:w-5 sm:h-5" />
                <span className="hidden sm:block truncate">
                    {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </span>
                <span className="block sm:hidden text-xs">Profile</span>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
                <div className="absolute right-0 top-14 w-48 px-2 py-2 rounded-xl border border-soft/10 bg-[#17132d] backdrop-blur-md drop-shadow-2xl z-50">
                    <div className="flex flex-col gap-1">
                        {/* Profile Option */}
                        <button onClick={() => handleOptionClick("profile")} className="flex items-center gap-3 w-full text-left px-3 py-2 text-soft hover:text-light hover:bg-soft/10 rounded-lg transition-all duration-200">
                            <User2 size={16} />
                            <span className="text-sm">Profile</span>
                        </button>

                        {/* FAQ Option */}
                        <button onClick={() => handleOptionClick("referrals")} className="flex items-center gap-3 w-full text-left px-3 py-2 text-soft hover:text-light hover:bg-soft/10 rounded-lg transition-all duration-200">
                            <Users size={16} />
                            <span className="text-sm">Referrals</span>
                        </button>

                        {/* Rewards Option */}
                        <button onClick={() => handleOptionClick("rewards")} className="flex items-center gap-3 w-full text-left px-3 py-2 text-soft hover:text-light hover:bg-soft/10 rounded-lg transition-all duration-200">
                            <Gift size={16} />
                            <span className="text-sm">Rewards</span>
                        </button>

                        {/* Divider */}
                        <div className="border-t border-purple/30 my-1"></div>

                        {/* Logout Option */}
                        <button onClick={() => handleOptionClick("logout")} className="flex items-center gap-3 w-full text-left px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200">
                            <LogOut size={16} />
                            <span className="text-sm">Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileDropdown;
