"use client";

/**
 * Keep your auto-connect policy:
 * - Only if ssBoot (after signMessage) + auto flag + fresh heartbeat.
 * - Last-tab close clears flipverse:* and zoggy:* (with small reload grace).
 * - Adapters are memoized once to avoid first-click races from re-instantiation.
 * - Provider now owns the heartbeat interval globally across routes.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

const LS_AUTO = "flipverse:autoConnect";
const LS_HB = "flipverse:hb";
const LS_TABS = "flipverse:tabs";
const LS_AUTO_CLEARED_AT = "flipverse:autoClearedAt";
const SS_BOOT = "flipverse:ssBoot";

const Z_LS_AUTO = "zoggy:autoConnect";
const Z_LS_HB = "zoggy:hb";
const Z_SS_BOOT = "zoggy:ssBoot";

const HEARTBEAT_TIMEOUT_MS = 120_000;
const RELOAD_RESTORE_GRACE_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

function isHbFreshAny() {
  const fhb = parseInt(localStorage.getItem(LS_HB) || "0", 10);
  const zhb = parseInt(localStorage.getItem(Z_LS_HB) || "0", 10);
  const now = Date.now();
  return now - Math.max(fhb, zhb) < HEARTBEAT_TIMEOUT_MS;
}

function bumpHeartbeat() {
  const now = String(Date.now());
  try {
    localStorage.setItem(LS_HB, now);
    localStorage.setItem(Z_LS_HB, now);
  } catch {}
}

function getNavTypeReload(): boolean {
  try {
    const entries = performance.getEntriesByType?.("navigation") as any;
    const navType = (entries && entries[0]?.type) || (performance as any).navigation?.type;
    return navType === "reload" || navType === 1;
  } catch {
    return false;
  }
}

function restoreFlagsOnReloadGrace(): void {
  try {
    const clearedAt = parseInt(localStorage.getItem(LS_AUTO_CLEARED_AT) || "0", 10);
    if (!clearedAt) return;
    if (Date.now() - clearedAt > RELOAD_RESTORE_GRACE_MS) return;

    // restore auto flags
    localStorage.setItem(LS_AUTO, "1");
    localStorage.setItem(Z_LS_AUTO, "1");

    // restore session boot (lost during last-tab cleanup on reload)
    sessionStorage.setItem(SS_BOOT, "1");
    sessionStorage.setItem(Z_SS_BOOT, "1");

    // refresh heartbeats so they count as fresh after reload
    bumpHeartbeat();
  } catch {}
}

function getInitialAutoConnect(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // small grace for Ctrl+R reloads
    if (getNavTypeReload()) {
      restoreFlagsOnReloadGrace();
    }

    const ssBoot =
      sessionStorage.getItem(SS_BOOT) === "1" ||
      sessionStorage.getItem(Z_SS_BOOT) === "1";
    if (!ssBoot) return false;

    const auto =
      localStorage.getItem(LS_AUTO) === "1" ||
      localStorage.getItem(Z_LS_AUTO) === "1";
    if (!auto) return false;

    return isHbFreshAny();
  } catch {
    return false;
  }
}

export const WalletContextProvider = ({ children }: { children: React.ReactNode }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const [autoConnect, setAutoConnect] = useState<boolean>(getInitialAutoConnect());
  const hbTimerRef = useRef<number | null>(null);

  const wallets = useMemo(
    () => [
      // Create adapters ONCE. Recreating during first click causes races.
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ],
    [network]
  );

  // tab counting & last-tab cleanup
  useEffect(() => {
    if (typeof window === "undefined") return;

    const incTabs = () => {
      const n = Math.max(parseInt(localStorage.getItem(LS_TABS) || "0", 10), 0) + 1;
      localStorage.setItem(LS_TABS, String(n));
    };
    const onBeforeUnload = () => {
      const n = Math.max(parseInt(localStorage.getItem(LS_TABS) || "1", 10) - 1, 0);
      localStorage.setItem(LS_TABS, String(n));
      if (n === 0) {
        try {
          localStorage.removeItem(LS_AUTO);
          localStorage.removeItem(LS_HB);
          localStorage.removeItem(Z_LS_AUTO);
          localStorage.removeItem(Z_LS_HB);
          localStorage.setItem(LS_AUTO_CLEARED_AT, String(Date.now()));
          sessionStorage.removeItem(SS_BOOT);
          sessionStorage.removeItem(Z_SS_BOOT);
        } catch {}
      }
    };

    incTabs();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      onBeforeUnload();
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  // recompute autoConnect on storage + cross-tab boot
  useEffect(() => {
    if (typeof window === "undefined") return;

    const recompute = () => {
      const ssBoot =
        sessionStorage.getItem(SS_BOOT) === "1" ||
        sessionStorage.getItem(Z_SS_BOOT) === "1";
      const auto =
        localStorage.getItem(LS_AUTO) === "1" ||
        localStorage.getItem(Z_LS_AUTO) === "1";
      setAutoConnect(ssBoot && auto && isHbFreshAny());
    };

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === LS_AUTO || e.key === LS_HB || e.key === Z_LS_AUTO || e.key === Z_LS_HB) {
        recompute();
      }
    };

    let bcFlip: BroadcastChannel | null = null;
    let bcZog: BroadcastChannel | null = null;
    try {
      bcFlip = new (window as any).BroadcastChannel("flipverse:ss");
      bcZog = new (window as any).BroadcastChannel("zoggy:ss");

      const onMsg = (ev: any) => {
        const msg = ev?.data;
        if (!msg) return;
        if (msg.type === "boot") {
          try {
            sessionStorage.setItem(SS_BOOT, "1");
            sessionStorage.setItem(Z_SS_BOOT, "1");
          } catch {}
          // ensure an immediate heartbeat bump so autoConnect can turn true
          bumpHeartbeat();
          recompute();
        }
        if (msg.type === "hello") {
          const booted =
            sessionStorage.getItem(SS_BOOT) === "1" ||
            sessionStorage.getItem(Z_SS_BOOT) === "1";
          if (booted) {
            bcFlip?.postMessage?.({ type: "boot" });
            bcZog?.postMessage?.({ type: "boot" });
          }
        }
      };

      if (bcFlip) bcFlip.onmessage = onMsg;
      if (bcZog) bcZog.onmessage = onMsg;

      bcFlip?.postMessage({ type: "hello" });
      bcZog?.postMessage({ type: "hello" });
    } catch {}

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      try {
        bcFlip && bcFlip.close();
      } catch {}
      try {
        bcZog && bcZog.close();
      } catch {}
    };
  }, []);

  // GLOBAL HEARTBEAT: run as long as ssBoot + auto flags are present (regardless of route)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const shouldRun =
      (sessionStorage.getItem(SS_BOOT) === "1" || sessionStorage.getItem(Z_SS_BOOT) === "1") &&
      (localStorage.getItem(LS_AUTO) === "1" || localStorage.getItem(Z_LS_AUTO) === "1");

    if (!shouldRun) {
      if (hbTimerRef.current) {
        clearInterval(hbTimerRef.current);
        hbTimerRef.current = null;
      }
      return;
    }

    // kick immediately, then keep fresh
    bumpHeartbeat();
    if (hbTimerRef.current) clearInterval(hbTimerRef.current);
    hbTimerRef.current = window.setInterval(bumpHeartbeat, HEARTBEAT_INTERVAL_MS) as any;

    return () => {
      if (hbTimerRef.current) {
        clearInterval(hbTimerRef.current);
        hbTimerRef.current = null;
      }
    };
    // tie to autoConnect because recompute() toggles it when flags/hb change
  }, [autoConnect]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
