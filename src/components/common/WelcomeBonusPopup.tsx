"use client";
//! not in use for now
import { useEffect, useRef, useState } from "react";
import { X, Gift, PartyPopper, Sparkles, DollarSign } from "lucide-react";
import {
  claimWelcomeBonus,
  fetchWelcomeState,
  getWelcomeBonusAmount,
  type WelcomeState,
} from "@/utils/api/profileapi";

interface WelcomeBonusPopupProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string; // popup handles claiming using this
}

export default function WelcomeBonusPopup({
  isOpen,
  onClose,
  walletAddress,
}: WelcomeBonusPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<
    "waiting" | "anticipation" | "playing" | "revealed"
  >("waiting");
  const [showReward, setShowReward] = useState(false);
  const [countUpAmount, setCountUpAmount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [txSig, setTxSig] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);

  const startedPlayingAt = useRef<number>(0);

  // Explorer cluster (default mainnet-beta; override via NEXT_PUBLIC_SOLANA_CLUSTER)
  const cluster =
    (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_SOLANA_CLUSTER) ||
    "mainnet-beta";

  const txExplorerUrl =
    txSig ? `https://explorer.solana.com/tx/${encodeURIComponent(txSig)}?cluster=${encodeURIComponent(cluster)}` : undefined;

  useEffect(() => {
    if (!isOpen) return;

    setIsVisible(true);
    setAnimationPhase("waiting");
    setShowReward(false);
    setCountUpAmount(0);
    setIsShaking(false);
    setErrorMsg(null);
    setAlreadyClaimed(false);
    setClaimedAmount(0);
    setTxSig(undefined);
    setIsProcessing(false);

    // On open, check current welcome state;
    // if already claimed/active/cleared, show revealed instantly (no re-claim).
    (async () => {
      if (!walletAddress) return;

      const st = await fetchWelcomeState(walletAddress);
      if (!st) return;

      const status = st.status || "none";
      const wasClaimed = Boolean(st.claimed) || status === "active" || status === "cleared";
      if (wasClaimed) {
        setAlreadyClaimed(true);

        // Determine amount to show
        let amt = 0;
        if (typeof st.bonus_amount_usd !== "undefined") {
          amt = Math.floor(Number(st.bonus_amount_usd || 0));
        } else if (typeof st.eligible_bonus_usd !== "undefined") {
          amt = Math.floor(Number(st.eligible_bonus_usd || 0));
        } else {
          // Fallback: ask helper
          amt = Math.floor(await getWelcomeBonusAmount(walletAddress));
        }
        amt = Math.max(0, amt);
        setClaimedAmount(amt);

        // Try to fetch the txSig without re-claiming (backend returns alreadyClaimed)
        try {
          const probe = await claimWelcomeBonus(walletAddress);
          if (probe?.alreadyClaimed && probe?.txSig) {
            setTxSig(probe.txSig);
          }
        } catch {
          // ignore
        }

        // Reveal immediately with animation
        setTimeout(() => {
          setAnimationPhase("revealed");
          setShowReward(true);
          animateCountUp(amt);
        }, 150);
      }
    })();
  }, [isOpen, walletAddress]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setAnimationPhase("waiting");
      setShowReward(false);
      setCountUpAmount(0);
      setIsShaking(false);
      setErrorMsg(null);
      setAlreadyClaimed(false);
      setClaimedAmount(0);
      setTxSig(undefined);
      setIsProcessing(false);
      onClose();
    }, 300);
  };

  // Count-up animation for bonus amount
  const animateCountUp = (amount: number) => {
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();

    const updateCount = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      setCountUpAmount(Math.floor((amount || 0) * easeOutCubic));
      if (progress < 1) requestAnimationFrame(updateCount);
    };

    requestAnimationFrame(updateCount);
  };

  const triggerHaptic = () => {
    if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
  };

  const doClaim = async () => {
    if (isProcessing) return;
    if (alreadyClaimed) return; // do nothing if previously claimed

    if (!walletAddress) {
      setErrorMsg("Connect your wallet to claim the welcome bonus.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      setAnimationPhase("waiting");
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      // Call claim endpoint; backend guarantees idempotency and returns alreadyClaimed if so
      const resp = await claimWelcomeBonus(walletAddress);

      if (!resp.ok) {
        throw new Error(resp.error || "Could not claim the welcome bonus.");
      }

      // If already claimed, just show revealed state; (we shouldn't normally get here due to pre-check)
      if (resp.alreadyClaimed) {
        setAlreadyClaimed(true);
      }

      if (resp.txSig) setTxSig(resp.txSig);

      // Amount preference: server-reported USD; fallback to state
      let displayedUsd =
        typeof resp.bonusUsd === "number" ? Math.floor(resp.bonusUsd) : 0;

      if (!displayedUsd) {
        const st = await fetchWelcomeState(walletAddress);
        displayedUsd = Math.floor(
          Number(st?.bonus_amount_usd || st?.eligible_bonus_usd || 0)
        );
      }

      displayedUsd = Math.max(0, displayedUsd);
      setClaimedAmount(displayedUsd);

      // Ensure the "playing" phase feels smooth
      const minPlayMs = 1500;
      const elapsed = Date.now() - startedPlayingAt.current;
      const wait = Math.max(0, minPlayMs - elapsed);
      await new Promise((r) => setTimeout(r, wait));

      setAnimationPhase("revealed");
      setShowReward(true);
      animateCountUp(displayedUsd);
      triggerHaptic();
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not claim the welcome bonus.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      setAnimationPhase("waiting");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGifClick = () => {
    if (animationPhase !== "waiting") return;
    if (alreadyClaimed) return; // prevent re-claim clicks

    setAnimationPhase("anticipation");
    setIsShaking(true);
    triggerHaptic();

    // Step 1: anticipation
    setTimeout(() => {
      setAnimationPhase("playing");
      setIsShaking(false);
      startedPlayingAt.current = Date.now();

      // Step 2: while "playing", run the claim flow
      void doClaim();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative bg-background-secondary border border-soft/10 rounded-xl p-8 max-w-md w-full h-[540px] transform transition-all duration-300 ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-soft hover:text-light transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Animation Container */}
        <div className="text-center space-y-4 flex flex-col h-full">
          {/* GIF Container */}
          <div
            className={`relative mx-auto w-48 h-48 flex-shrink-0 transition-all duration-200 ${
              isShaking ? "animate-pulse" : ""
            } ${animationPhase === "waiting" ? "hover:scale-105" : ""}`}
          >
            <div
              className={`relative w-full h-full bg-gradient-to-br from-neon-pink/20 to-purple/20 rounded-2xl flex items-center justify-center border border-neon-pink/30 ${
                alreadyClaimed
                  ? "cursor-default"
                  : "cursor-pointer"
              } transition-all duration-300 ${
                animationPhase === "waiting"
                  ? "hover:scale-105 hover:border-neon-pink/50"
                  : animationPhase === "anticipation"
                  ? "animate-pulse"
                  : animationPhase === "playing"
                  ? "scale-110"
                  : ""
              }`}
              onClick={alreadyClaimed ? undefined : handleGifClick}
              role={alreadyClaimed ? "img" : "button"}
              aria-label={alreadyClaimed ? "Already claimed" : "Click to claim"}
            >
              <img
                src="/assets/zoggychest.gif"
                alt="Welcome Bonus Animation"
                className={`w-full h-full object-cover rounded-2xl transition-opacity duration-300 ${
                  animationPhase === "playing" ? "opacity-100" : "opacity-0"
                }`}
              />

              {animationPhase === "waiting" && !alreadyClaimed && (
                <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/30 to-purple/30 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <Gift className="w-12 h-12 mb-2 mx-auto text-neon-pink" />
                    <p className="text-xs text-neon-pink font-medium">Click to claim!</p>
                  </div>
                </div>
              )}

              {animationPhase === "waiting" && alreadyClaimed && (
                <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/30 to-purple/30 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <PartyPopper className="w-12 h-12 mb-2 mx-auto text-neon-pink" />
                    <p className="text-xs text-neon-pink font-medium">Already claimed</p>
                  </div>
                </div>
              )}

              {animationPhase === "anticipation" && (
                <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/40 to-purple/40 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <Gift className="w-16 h-16 mb-2 mx-auto text-neon-pink animate-pulse" />
                    <p className="text-sm text-light font-bold animate-pulse">
                      Claiming...
                    </p>
                  </div>
                </div>
              )}

              {animationPhase === "revealed" && (
                <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/30 to-purple/30 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <PartyPopper className="w-12 h-12 mx-auto text-neon-pink" />
                    <p className="text-xs text-neon-pink font-medium mt-2">
                      Claimed!
                    </p>
                  </div>
                </div>
              )}

              {animationPhase !== "revealed" && (
                <>
                  <Sparkles className="absolute -top-2 -right-2 w-4 h-4 animate-ping text-neon-pink" />
                  <Sparkles className="absolute -bottom-2 -left-2 w-4 h-4 animate-ping delay-300 text-purple" />
                  <Sparkles className="absolute top-1/2 -left-4 w-4 h-4 animate-ping delay-700 text-neon-pink" />
                  <Sparkles className="absolute top-1/2 -right-4 w-4 h-4 animate-ping delay-500 text-purple" />
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-center">
            {showReward || alreadyClaimed ? (
              <div className="space-y-3 animate-fade-in">
                <h2 className="text-xl font-bold text-light">Welcome Bonus Claimed!</h2>
                <p className="text-soft text-sm">
                  {alreadyClaimed ? "You already claimed your bonus." : "Congratulations on joining FlipVerse!"}
                </p>

                <div className="glass border border-neon-pink/20 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-neon-pink" />
                    <p className="text-xs text-soft font-medium">Your welcome bonus:</p>
                  </div>
                  <p className="text-3xl font-bold text-neon-pink text-center">
                    ${ (showReward ? countUpAmount : claimedAmount).toLocaleString() }
                  </p>
                </div>

                {txSig && (
                  <div className="pt-1">
                    <p className="text-[10px] text-soft/70">
                      Tx Signature:&nbsp;
                      <a
                        href={txExplorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-light"
                        title={txSig}
                      >
                        {txSig.slice(0, 8)}...{txSig.slice(-8)}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-light">
                  {animationPhase === "waiting"
                    ? "Welcome Bonus"
                    : animationPhase === "anticipation"
                    ? "Preparing..."
                    : animationPhase === "playing"
                    ? "Claiming Bonus..."
                    : "Bonus Claimed!"}
                </h2>
                <p className="text-soft text-sm">
                  {animationPhase === "waiting"
                    ? "Click to claim your welcome bonus!"
                    : animationPhase === "anticipation"
                    ? "Get ready for your bonus!"
                    : animationPhase === "playing"
                    ? "The magic is happening..."
                    : "Congratulations on joining FlipVerse!"}
                </p>

                {errorMsg && (
                  <p className="text-[11px] text-red-300 mt-1">{errorMsg}</p>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          {(showReward || alreadyClaimed) && (
            <div className="flex-shrink-0 mt-4">
              <button
                onClick={handleClose}
                className="w-full bg-neon-pink hover:bg-neon-pink/80 text-light font-medium py-2.5 px-6 rounded-xl transition-all duration-300 transform animate-fade-in"
              >
                Start Playing!
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
