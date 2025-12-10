// app/fairness/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, Zap, BookOpen } from "lucide-react";
import ManualVerification from "@/components/proof/ManualVerification";
import LiveResults from "@/components/proof/History";
import HowItWorks from "@/components/proof/HowItWorks";

type GameType = "crash" | "dice" | "mines" | "coinflip" | "slots" | "plinko";

// If your build still attempts to prerender this page, uncomment the next line:
// export const dynamic = "force-dynamic";

export default function FairnessPage() {
  return (
    <Suspense fallback={<FairnessFallback />}>
      <FairnessPageInner />
    </Suspense>
  );
}

function FairnessFallback() {
  return (
    <div className="min-h-screen bg-background py-14">
      <div className="layout-wrapper">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            Provably Fair Verification
          </h1>
          <p className="text-soft text-lg max-w-2xl mx-auto">
            Loading verification tools…
          </p>
        </div>
        <div className="glass rounded-2xl p-6 animate-pulse">
          <div className="h-6 w-40 mb-4 rounded bg-soft/20" />
          <div className="h-10 w-full mb-3 rounded bg-soft/10" />
          <div className="h-10 w-3/4 mb-3 rounded bg-soft/10" />
          <div className="h-10 w-2/3 rounded bg-soft/10" />
        </div>
      </div>
    </div>
  );
}

function FairnessPageInner() {
  const params = useSearchParams();
  const [activeTab, setActiveTab] = useState<"manual" | "live" | "how">("manual");

  // Keep activeTab in sync with ?tab=
  useEffect(() => {
    const tab = (params.get("tab") || "manual") as "manual" | "live" | "how";
    setActiveTab(tab);
  }, [params]);

  // Build props for ManualVerification from URL
  const { gameTypeHint, initial } = useMemo(() => {
    const get = (k: string) => params.get(k) || undefined;

    const rawGame = (get("gameType") || get("game")) as GameType | undefined;
    const gameTypeHint = rawGame as GameType | undefined;

    const initial: Record<string, string> = {};

    // server seed (hex or raw)
    const serverSeed = get("serverSeedHex") || get("serverSeed");
    if (serverSeed) initial.serverSeedHex = serverSeed;

    // common
    if (get("clientSeed")) initial.clientSeed = get("clientSeed")!;
    if (get("nonce")) initial.nonce = get("nonce")!;
    if (get("expectedHmac")) initial.expectedHmac = get("expectedHmac")!;

    // mines
    if (get("player")) initial.player = get("player")!;
    if (get("playerPk")) (initial as any).playerPk = get("playerPk")!;
    if (get("rows")) initial.rows = get("rows")!;
    if (get("cols")) initial.cols = get("cols")!;
    if (get("mines")) initial.mines = get("mines")!;
    if (get("firstSafeIndex")) initial.firstSafeIndex = get("firstSafeIndex")!;

    // coinflip
    if (get("clientSeedA")) initial.clientSeedA = get("clientSeedA")!;
    if (get("clientSeedB")) initial.clientSeedB = get("clientSeedB")!;

    return { gameTypeHint, initial };
  }, [params]);

  return (
    <div className="min-h-screen bg-background py-14">
      <div className="layout-wrapper">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            Provably Fair Verification
          </h1>
          <p className="text-soft text-lg max-w-2xl mx-auto">
            Verify the fairness of any game result using cryptographic proof.
            Our system ensures complete transparency and trust.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-start mb-4">
          <div className="glass rounded-2xl p-2 flex gap-2">
            <button
              onClick={() => setActiveTab("manual")}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                activeTab === "manual"
                  ? "bg-neon-pink text-light"
                  : "text-soft hover:text-light hover:bg-soft/10"
              }`}
            >
              <ClipboardCheck size={18} />
              Manual Verify
            </button>
            <button
              onClick={() => setActiveTab("live")}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                activeTab === "live"
                  ? "bg-neon-pink text-light"
                  : "text-soft hover:text-light hover:bg-soft/10"
              }`}
            >
              <Zap size={18} />
              History
            </button>
            <button
              onClick={() => setActiveTab("how")}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                activeTab === "how"
                  ? "bg-neon-pink text-light"
                  : "text-soft hover:text-light hover:bg-soft/10"
              }`}
            >
              <BookOpen size={18} />
              How It Works
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === "manual" && (
            <ManualVerification gameTypeHint={gameTypeHint} initial={initial} />
          )}
          {activeTab === "live" && <LiveResults />}
          {activeTab === "how" && <HowItWorks />}
        </div>
      </div>
    </div>
  );
}
