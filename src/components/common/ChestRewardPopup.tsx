"use client";

import { useState, useEffect, useRef } from "react";
import { X, Sparkles } from "lucide-react";
import SpineChestAnimation, { SpineChestAnimationHandle } from "./SpineChestAnimation";
import ToastService from "@/utils/toastService";

interface ChestRewardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  rewardType: string;
  reward: number | string;
  chestType?: "daily" | "weekly";
}

export default function ChestRewardPopup({
  isOpen,
  onClose,
  rewardType,
  reward,
  chestType = "daily",
}: ChestRewardPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] =
    useState<"waiting" | "revealing" | "opening" | "opened">("waiting");
  const [isSpineLoaded, setIsSpineLoaded] = useState(false);
  const spineAnimationRef = useRef<SpineChestAnimationHandle>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setAnimationPhase("waiting");
      setIsSpineLoaded(false);
    }
  }, [isOpen]);

  // Auto-play reveal animation when Spine is loaded
  useEffect(() => {
    if (isSpineLoaded && animationPhase === "waiting") {
      setAnimationPhase("revealing");
      spineAnimationRef.current?.playReveal(() => {
        console.log("Reveal animation completed, waiting for click");
        // Stay in revealing state until user clicks
      });
    }
  }, [isSpineLoaded, animationPhase]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setAnimationPhase("waiting");
      setIsSpineLoaded(false);
      spineAnimationRef.current?.stopAll();
      onClose();
    }, 300);
  };

  const handleSpineLoaded = () => {
    console.log("Spine animation loaded");
    setIsSpineLoaded(true);
  };

  const handleSpineError = (error: Error) => {
    console.error("Spine animation error:", error);
    ToastService.rewardError("Animation failed to load");
  };

  // Haptic feedback (if supported)
  const triggerHaptic = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const handleChestClick = () => {
    if (animationPhase === "revealing") {
      setAnimationPhase("opening");
      triggerHaptic();

      spineAnimationRef.current?.playOpen(() => {
        console.log("Open animation completed");
        setAnimationPhase("opened");

        // Play idle_open animation
        spineAnimationRef.current?.playIdleOpen(true);

        // Show reward in toast (reward comes from parent)
        const rewardText =
          typeof reward === "number" ? `$${reward.toLocaleString()}` : reward.toString();
        ToastService.rewardClaimed(`${rewardType}: ${rewardText}`);

        triggerHaptic();

        // Auto-close after 2 seconds
        setTimeout(() => {
          handleClose();
        }, 2000);
      });
    }
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
        className={`relative bg-background-secondary border border-soft/10 rounded-xl p-8 max-w-md w-full h-[500px] transform transition-all duration-300 ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-soft hover:text-light transition-colors"
        >
          <X size={24} />
        </button>

        {/* Spine Animation Container */}
        <div className="text-center space-y-4 flex flex-col h-full">
          {/* Chest Animation Container */}
          <div className="relative mx-auto w-80 h-80 flex-shrink-0">
            {!isSpineLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-2xl border border-yellow-400/30">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-xs text-yellow-300 font-medium">Loading chest...</p>
                </div>
              </div>
            )}

            {/* Spine Animation */}
            <div
              className={`w-full h-full transition-all duration-300 ${
                animationPhase === "revealing"
                  ? "cursor-pointer hover:scale-105"
                  : animationPhase === "opening"
                  ? "scale-110"
                  : ""
              }`}
              onClick={handleChestClick}
            >
              <SpineChestAnimation
                ref={spineAnimationRef}
                width={320}
                height={320}
                chestType={chestType}
                onLoaded={handleSpineLoaded}
                onError={handleSpineError}
              />
            </div>

            {/* Click instruction overlay */}
            {animationPhase === "revealing" && isSpineLoaded && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                <p className="text-xs text-yellow-300 font-medium">Click to open!</p>
              </div>
            )}

            {/* Sparkle effects - only show when revealing */}
            {animationPhase === "revealing" && isSpineLoaded && (
              <>
                <Sparkles className="absolute -top-2 -right-2 w-4 h-4 animate-ping text-neon-pink" />
                <Sparkles className="absolute -bottom-2 -left-2 w-4 h-4 animate-ping delay-300 text-purple" />
                <Sparkles className="absolute top-1/2 -left-4 w-4 h-4 animate-ping delay-700 text-neon-pink" />
                <Sparkles className="absolute top-1/2 -right-4 w-4 h-4 animate-ping delay-500 text-purple" />
              </>
            )}
          </div>

          {/* Content Area - Flexible */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-light">
                {animationPhase === "waiting"
                  ? "Loading Chest..."
                  : animationPhase === "revealing"
                  ? `${chestType === "daily" ? "Daily" : "Weekly"} Chest`
                  : animationPhase === "opening"
                  ? "Opening Chest..."
                  : "Chest Opened!"}
              </h2>
              <p className="text-soft text-sm">
                {animationPhase === "waiting"
                  ? "Please wait while we prepare your chest..."
                  : animationPhase === "revealing"
                  ? "Click the chest to reveal your reward!"
                  : animationPhase === "opening"
                  ? "The magic is happening..."
                  : "Reward claimed! Check your notifications."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
