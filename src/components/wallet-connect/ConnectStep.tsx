"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import WalletSelectPopup from "./WalletSelectPopup";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletName } from "@solana/wallet-adapter-base";
import ToastService from "@/utils/toastService";

interface ConnectStepProps {
  onWalletSelect: (walletName: string) => void;
}

const hasNavigator = typeof navigator !== "undefined";
const isMobile =
  hasNavigator && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
const ua = hasNavigator ? navigator.userAgent.toLowerCase() : "";
const inPhantom = ua.includes("phantom");
const inSolflare = ua.includes("solflare");

// zoggy (original)
const LS_AUTO = "zoggy:autoConnect";
const LS_HB = "zoggy:hb";
const SS_BOOT = "zoggy:ssBoot";
// flipverse (bridge)
const F_LS_AUTO = "flipverse:autoConnect";
const F_LS_HB = "flipverse:hb";
const F_SS_BOOT = "flipverse:ssBoot";

// ---------- utils ----------
function redirectToWalletBrowser(walletName: "Phantom" | "Solflare") {
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const encodedUrl = encodeURIComponent(currentUrl);
  const originRef =
    typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
  if (walletName === "Phantom") {
    window.location.href = `https://phantom.app/ul/browse/${encodedUrl}?ref=${originRef}`;
  } else {
    window.location.href = `https://solflare.com/ul/browse/${encodedUrl}?ref=${originRef}`;
  }
}

const makeNonce = () => {
  const buf = new Uint8Array(16);
  (globalThis.crypto || window.crypto).getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
const makeLoginMessage = (address: string, nonce: string) =>
  `zoggy Login\nAddress: ${address}\nNonce: ${nonce}`;

async function waitFor<T>(
  fn: () => T | null | undefined,
  ms: number,
  step = 0
): Promise<T | null> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const v = fn();
    if (v) return v as T;
    if (step < 20) {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    } else {
      await new Promise((r) => setTimeout(r, 50));
    }
    step++;
  }
  return null;
}

function waitForPageFocus(ms = 30000) {
  return new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (val: boolean) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(val);
    };
    const onFocus = () => finish(true);
    const onVis = () => {
      if (document.visibilityState === "visible") finish(true);
    };
    const timer = setTimeout(() => finish(false), ms);
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
  });
}

// ---------- component ----------
const ConnectStep = ({ onWalletSelect }: ConnectStepProps) => {
  const [showWalletSelectPopup, setShowWalletSelectPopup] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const { wallets, select, wallet, publicKey } = useWallet();
  const clickedOnceRef = useRef(false);

  // strongest pk resolver (events + polling + onlyIfTrusted nudge)
  async function resolvePublicKey(
    selected: "Phantom" | "Solflare",
    adapter: any,
    maxMs = 9000
  ) {
    const isFn = (x: any) => x && typeof x.toBase58 === "function";
    const w = typeof window !== "undefined" ? (window as any) : {};

    const evt = new Promise<any>((res) => {
      try {
        adapter?.once?.("connect", () => {
          if (isFn(adapter?.publicKey)) res(adapter.publicKey);
        });
        adapter?.once?.("accountChanged", (pk: any) => {
          if (isFn(pk)) res(pk);
        });
      } catch {}
    });

    const poll = waitFor<any>(() => {
      if (isFn(publicKey)) return publicKey;
      if (isFn(wallet?.adapter?.publicKey)) return wallet!.adapter!.publicKey;
      if (isFn(adapter?.publicKey)) return adapter.publicKey;
      if (selected === "Phantom" && isFn(w?.solana?.publicKey)) return w.solana.publicKey;
      if (selected === "Solflare" && isFn(w?.solflare?.publicKey)) return w.solflare.publicKey;
      return null;
    }, maxMs);

    let pk = await Promise.race([evt, poll]);

    // one nudge that won't re-prompt
    if (!pk) {
      try {
        if (selected === "Phantom" && w?.solana?.connect) {
          await w.solana.connect({ onlyIfTrusted: true });
          pk = w?.solana?.publicKey;
        } else if (selected === "Solflare" && w?.solflare?.connect) {
          await w.solflare.connect({ onlyIfTrusted: true });
          pk = w?.solflare?.publicKey;
        }
      } catch {}
    }

    if (!pk) await new Promise((r) => setTimeout(r, 200));
    return pk && typeof pk.toBase58 === "function" ? pk : null;
  }

  async function adapterConnectWithUnlock(adapter: any) {
    // ensure selection flushes before connect (fixes first-click race)
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    try {
      await Promise.race([
        adapter.connect?.(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("connect-timeout")), 12000)),
      ]);
    } catch (e) {
      // user entering password or extension slow — wait for focus then one retry
      const gotFocus = await waitForPageFocus(30000);
      if (!gotFocus) throw e;
      await Promise.race([
        adapter.connect?.(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("post-unlock-timeout")), 12000)),
      ]);
    }
  }

  const handleWalletSelection = async (walletName: string) => {
    if (isConnecting || clickedOnceRef.current) return;
    clickedOnceRef.current = true;

    const selected: "Phantom" | "Solflare" =
      walletName === "Solflare" ? "Solflare" : "Phantom";

    // mobile in-app browser handoff
    if (isMobile) {
      if (selected === "Phantom" && !inPhantom) return redirectToWalletBrowser("Phantom");
      if (selected === "Solflare" && !inSolflare) return redirectToWalletBrowser("Solflare");
    }

    // find adapter first
    const target = wallets.find((w) => w.adapter.name === selected);
    const baseAdapter = target?.adapter as any;
    if (!baseAdapter) {
      ToastService.walletError(`${selected} wallet not found.`);
      clickedOnceRef.current = false;
      return;
    }

    const state = String(baseAdapter.readyState || "");
    const isReady = state === "Installed" || state === "Loadable";
    if (!isReady) {
      ToastService.walletError(`${selected} wallet not installed. Please install it first.`);
      const dl =
        selected === "Phantom" ? "https://phantom.app/download" : "https://solflare.com/download";
      if (typeof window !== "undefined") window.open(dl, "_blank");
      clickedOnceRef.current = false;
      return;
    }

    try {
      setIsConnecting(true);

      // IMPORTANT: do NOT pre-disconnect here — that is what causes first-click fails.
      select(selected as WalletName);
      await waitFor(() => (wallet?.adapter?.name === selected ? true : null), 1500);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      await adapterConnectWithUnlock(baseAdapter);

      // tiny cooldown for adapters that publish pk on next tick
      await new Promise((r) => setTimeout(r, 120));

      const pk = await resolvePublicKey(selected, baseAdapter, 8000);
      if (!pk) {
        try {
          await baseAdapter.disconnect?.();
        } catch {}
        ToastService.walletError("Connected, but couldn't read wallet address. Please try again.");
        return;
      }

      // sign-in AFTER pk is solid
      const signer = baseAdapter;
      if (!signer?.signMessage) {
        try {
          await baseAdapter.disconnect?.();
        } catch {}
        ToastService.walletError("This wallet does not support message signing.");
        setShowWalletSelectPopup(false);
        return;
      }

      const addr = pk.toBase58();
      const nonce = makeNonce();
      const msg = new TextEncoder().encode(makeLoginMessage(addr, nonce));

      try {
        const sig = await signer.signMessage(msg);
        if (!sig?.length) throw new Error("Empty signature");
      } catch (e: any) {
        try {
          await baseAdapter.disconnect?.();
        } catch {}
        const m = String(e?.message || "").toLowerCase();
        ToastService.walletError(m.includes("reject") ? "Signature rejected." : "Signature failed.");
        return;
      }

      // mark session + single heartbeat tick (Provider will take over the interval)
      try {
        sessionStorage.setItem(SS_BOOT, "1");
        sessionStorage.setItem(F_SS_BOOT, "1");
        localStorage.setItem(LS_AUTO, "1");
        localStorage.setItem(F_LS_AUTO, "1");
        const now = String(Date.now());
        localStorage.setItem(LS_HB, now);
        localStorage.setItem(F_LS_HB, now);
      } catch {}

      // broadcast to wake other tabs/providers
      try {
        const bcf = new (window as any).BroadcastChannel("flipverse:ss");
        bcf.postMessage({ type: "boot" });
        setTimeout(() => bcf.close(), 1200);
      } catch {}
      try {
        const bcz = new (window as any).BroadcastChannel("zoggy:ss");
        bcz.postMessage({ type: "boot" });
        setTimeout(() => bcz.close(), 1200);
      } catch {}
      try {
        const bc1 = new (window as any).BroadcastChannel("zoggy:session");
        bc1.postMessage({ type: "auto", value: "1" });
        setTimeout(() => bc1.close(), 1200);
      } catch {}

      onWalletSelect(selected);
      setShowWalletSelectPopup(false);
      ToastService.walletConnected(`${selected} connected & signed in`);
    } catch (error: any) {
      try {
        await (wallet?.adapter as any)?.disconnect?.();
      } catch {}
      const msg = String(error?.message || "");
      if (msg.toLowerCase().includes("reject")) {
        ToastService.walletError("Connection request rejected.");
      } else if (msg.toLowerCase().includes("timeout")) {
        ToastService.walletError("Wallet did not respond. Please try again.");
      } else {
        ToastService.walletError("Failed to connect wallet. Please try again.");
      }
    } finally {
      setIsConnecting(false);
      setTimeout(() => (clickedOnceRef.current = false), 100);
    }
  };

  return (
    <div className="h-full">
      <div className="flex flex-col md:flex-row gap-6 h-full">
        <div className="md:w-1/2 flex justify-center items-center">
          <div className="w-full h-[200px] md:h-full flex justify-center">
            <div className="w-full h-full glass-dark rounded-2xl flex items-center justify-center border border-purple/30 relative overflow-hidden">
              <Image
                src="/assets/Zoggy-rank-icons/avatar8.png"
                alt="Wallet connection illustration"
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
            </div>
          </div>
        </div>

        <div className="md:w-1/2 flex flex-col gap-4 justify-center items-start">
          <h2 className="text-2xl md:text-4xl font-bold text-light mb-2">
            Connect Wallet & Continue
          </h2>
          <div className="mb-4 md:mb-6 flex items-center gap-3 text-left">
            <div className="mt-1">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={isTermsAccepted}
                onChange={(e) => setIsTermsAccepted(e.target.checked)}
                className="w-5 h-5 accent-neon-pink cursor-pointer"
              />
            </div>
            <div className="text-sm text-soft">
              I confirm that I have read, understood, and that I accept the{" "}
              <span className="text-neon-pink underline cursor-pointer hover:text-neon-pink/80">
                Terms of Service
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowWalletSelectPopup(true)}
            disabled={!isTermsAccepted || isConnecting}
            className={`w-full h-12 md:h-16 py-3 md:py-4 rounded-xl font-semibold text-base md:text-lg text-center transition-all ${
              isTermsAccepted && !isConnecting
                ? "bg-neon-pink text-light hover:bg-neon-pink/90 cursor-pointer"
                : "bg-neon-pink/50 text-gray-400 cursor-not-allowed"
            }`}
          >
            <span className="text-base md:text-lg">
              {isConnecting ? "Connecting..." : "Connect"}
            </span>
          </button>
        </div>
      </div>

      <WalletSelectPopup
        isOpen={showWalletSelectPopup}
        onClose={() => setShowWalletSelectPopup(false)}
        onSelect={handleWalletSelection}
        isConnecting={isConnecting}
      />
    </div>
  );
};

export default ConnectStep;
