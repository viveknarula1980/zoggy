"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { WalletMinimal, LogOut, Menu, X, Dices, Gamepad2, Users, Gift } from "lucide-react";
import WalletConnectPopup from "../wallet-connect/WalletConnectPopup";
import AddFundsPopup from "../wallet-connect/AddFundsPopup";
import WithdrawFundsPopup from "../wallet-connect/WithdrawFundsPopup";
import ChestDropdown from "./ChestDropdown";
import ChestRewardPopup from "./ChestRewardPopup";
import ProfileDropdown from "./ProfileDropdown";
import PDAWalletDisplay from "./PDAWalletDisplay";
import { useWallet } from "@solana/wallet-adapter-react";

const Navbar = () => {
    const [activeTab, setActiveTab] = useState("");
    const [isWalletPopupOpen, setIsWalletPopupOpen] = useState(false);
    const [isAddFundsPopupOpen, setIsAddFundsPopupOpen] = useState(false);
    const [isWithdrawFundsPopupOpen, setIsWithdrawFundsPopupOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showChestRewardPopup, setShowChestRewardPopup] = useState(false);
    const [claimedReward, setClaimedReward] = useState<{ type: string; reward: number | string } | null>(null);
    const { connected, publicKey, disconnect } = useWallet();
    const router = useRouter();

    return (
        <nav className="p-1.5 sm:p-4 bg-background flex justify-center fixed w-full z-50">
            <div className="p-1.5 px-2 sm:p-2 sm:px-3 glass w-full max-w-[1440px] rounded-xl sm:rounded-2xl flex gap-1.5 sm:gap-2 md:gap-4 items-center justify-between border border-purple/20 relative">
                {/* Decorative spots */}

                <div className="absolute -top-10 left-10 w-32 h-32 bg-neon-pink/5 rounded-full filter blur-3xl"></div>
                <div className="absolute -bottom-10 right-10 w-40 h-40 bg-purple/5 rounded-full filter blur-3xl"></div>

                {/* Left Section: Hamburger + Logo */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 relative z-10">
                    {/* Mobile Menu Button */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                        className="md:hidden flex items-center justify-center bg-purple/20 text-light h-8 w-8 rounded-lg transition-all duration-300 hover:bg-purple/30" 
                        aria-label="Toggle mobile menu"
                    >
                        {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>

                    {/* Logo */}
                    <Link href="/" className="flex items-center hover:opacity-80 hover:cursor-pointer transition-all duration-300">
                        <Image
                            src="/logo.png"
                            alt="Flipverse Logo"
                            width={200}
                            height={40}
                            className="h-5 sm:h-6 md:h-8 w-auto"
                            priority
                        />
                    </Link>
                </div>

                {/* Desktop Navigation Links */}
                <div className="hidden md:flex w-full gap-2 relative z-10">
                    <NavLink href="/slots" icon={Dices} label="Slots" isActive={activeTab === "slots"} onClick={() => setActiveTab("slots")} />
                    <NavLink href="/classics" icon={Gamepad2} label="Classics" isActive={activeTab === "classics"} onClick={() => setActiveTab("classics")} />
                </div>

                {/* Wallet Section */}
                <div className="flex relative z-10 gap-1 sm:gap-1.5">
                    {connected && publicKey ? (
                        <div className="flex gap-1 sm:gap-1.5 items-center">
                            <PDAWalletDisplay
                                className="relative"
                                onAddFunds={() => setIsAddFundsPopupOpen(true)}
                                onWithdrawFunds={() => setIsWithdrawFundsPopupOpen(true)}
                            />
                            <div className="hidden md:block">
                                <ProfileDropdown />
                            </div>

                            {/* Chest Dropdown */}
                            <ChestDropdown
                                balance={1234}
                                onRewardClaimed={(rewardType, reward) => {
                                    setClaimedReward({ type: rewardType, reward });
                                    setShowChestRewardPopup(true);
                                }}
                            />
                        </div>
                    ) : (
                        <button onClick={() => setIsWalletPopupOpen(true)} className="flex gap-1.5 sm:gap-2 items-center bg-neon-pink text-light px-3 sm:px-4 md:px-6 h-9 sm:h-10 md:h-12 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-all duration-300 hover:bg-neon-pink/80 hover:cursor-pointer">
                            <WalletMinimal size={16} className="hidden sm:block" />
                            <span>Connect</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <>
                    {/* Backdrop */}
                    <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileMenuOpen(false)} />

                    {/* Mobile Menu Panel */}
                    <div className="md:hidden fixed top-16 left-3 right-3 bg-background/95 backdrop-blur-xl rounded-xl border border-purple/20 z-50 p-3">
                        <div className="glass-dark rounded-lg p-3">
                            {/* Mobile Navigation Links */}
                            <div className="flex flex-col gap-2">
                                <MobileNavLink
                                    href="/slots"
                                    icon={Dices}
                                    label="Slots"
                                    isActive={activeTab === "slots"}
                                    onClick={() => {
                                        setActiveTab("slots");
                                        setIsMobileMenuOpen(false);
                                    }}
                                />
                                <MobileNavLink
                                    href="/classics"
                                    icon={Gamepad2}
                                    label="Classics"
                                    isActive={activeTab === "classics"}
                                    onClick={() => {
                                        setActiveTab("classics");
                                        setIsMobileMenuOpen(false);
                                    }}
                                />
                                {connected && publicKey && (
                                    <>
                                        {/* Profile Section in Mobile Menu */}
                                        <div className="border-t border-purple/20 pt-2 mt-1">
                                            <MobileNavLink
                                                href="/profile"
                                                icon={() => (
                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-neon-pink to-purple flex items-center justify-center text-xs font-bold">
                                                        {publicKey.toString().slice(0, 1).toUpperCase()}
                                                    </div>
                                                )}
                                                label="Profile"
                                                isActive={activeTab === "profile"}
                                                onClick={() => {
                                                    setActiveTab("profile");
                                                    setIsMobileMenuOpen(false);
                                                }}
                                            />
                                            <MobileNavLink
                                                href="/referrals"
                                                icon={Users}
                                                label="Referrals"
                                                isActive={activeTab === "referrals"}
                                                onClick={() => {
                                                    setActiveTab("referrals");
                                                    setIsMobileMenuOpen(false);
                                                }}
                                            />
                                            <MobileNavLink
                                                href="/rewards"
                                                icon={Gift}
                                                label="Rewards"
                                                isActive={activeTab === "rewards"}
                                                onClick={() => {
                                                    setActiveTab("rewards");
                                                    setIsMobileMenuOpen(false);
                                                }}
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                disconnect();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all duration-300 border border-red-500/30 mt-1"
                                        >
                                            <LogOut size={18} />
                                            <span className="text-base font-medium">Disconnect</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Wallet Connect Popup */}
            <WalletConnectPopup isOpen={isWalletPopupOpen} onClose={() => setIsWalletPopupOpen(false)} />

            {/* Add Funds Popup */}
            {isAddFundsPopupOpen && (
                <AddFundsPopup
                    onClose={() => setIsAddFundsPopupOpen(false)}
                    onFundsAdded={() => {
                        setIsAddFundsPopupOpen(false);
                        // Optionally show success message or refresh balance
                    }}
                />
            )}

            {/* Withdraw Funds Popup */}
            {isWithdrawFundsPopupOpen && (
                <WithdrawFundsPopup
                    onClose={() => setIsWithdrawFundsPopupOpen(false)}
                    onFundsWithdrawn={() => {
                        setIsWithdrawFundsPopupOpen(false);
                        // Optionally show success message or refresh balance
                    }}
                />
            )}

            {/* Chest Reward Popup */}
            {claimedReward && (
           <ChestRewardPopup
           isOpen={showChestRewardPopup}
            onClose={() => {
            setShowChestRewardPopup(false);
           setClaimedReward(null);
           }}
         rewardType={claimedReward?.type}
         reward={claimedReward?.reward}
  />
)}

        </nav>
    );
};

interface NavLinkProps {
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const NavLink = ({ href, icon: Icon, label, isActive, onClick }: NavLinkProps) => {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`relative group flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-300
        ${isActive ? "text-neon-pink" : "text-soft hover:text-light"}`}
        >
            <Icon size={24} />
            <span className="text-xl font-medium">{label}</span>
            
            {/* Smooth underline animation on hover */}
            <span className="absolute -bottom-1 left-1/2 h-[0.5px] w-0 bg-gradient-to-r from-transparent via-soft to-transparent transition-all duration-300 ease-out group-hover:w-full group-hover:left-0 transform -translate-x-0 group-hover:translate-x-0"></span>
        </Link>
    );
};

const MobileNavLink = ({ href, icon: Icon, label, isActive, onClick }: NavLinkProps) => {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`relative group flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-300 w-full
        ${isActive ? "bg-purple/30 border border-purple/40 text-light" : "text-soft hover:bg-purple/20 hover:text-light"}`}
        >
            <Icon size={18} />
            <span className="text-base font-medium">{label}</span>
        </Link>
    );
};

export default Navbar;
