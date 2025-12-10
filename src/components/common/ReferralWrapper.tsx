"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import ReferralHandler from "./ReferralHandler";

export default function ReferralWrapper({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWallet();

  return (
    <>
      <ReferralHandler walletAddress={publicKey?.toBase58()} />
      {children}
    </>
  );
}
