"use client";
import { WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";

export default function AutoConnect() {
    const { wallet, connected, select } = useWallet();

    useEffect(() => {
        const autoConnect = async () => {
            const isInPhantomBrowser = navigator.userAgent.includes("Phantom");
            const selectedWalletName = "Phantom";

            if (isInPhantomBrowser && !connected) {
                select(selectedWalletName as WalletName);
                await new Promise((res) => setTimeout(res, 100));
                await wallet?.adapter.connect();
            }
        };
        autoConnect();
    }, [wallet, connected, select]);

    return null;
}
