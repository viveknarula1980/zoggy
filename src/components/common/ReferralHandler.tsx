'use client';

import { useEffect } from "react";
import { trackReferralClick, bindReferral } from "@/utils/api/referralsApi";

export default function ReferralHandler({ walletAddress }: { walletAddress?: string | null }) {
  // Save referral click immediately
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (code) {
      console.log("DEBUG: saving referral code:", code);
      localStorage.setItem("pending_referral", code);
      trackReferralClick(code);
    }
  }, []);

  // Bind referral on mount AND whenever wallet connects
  useEffect(() => {
    const code = localStorage.getItem("pending_referral");
    if (code && walletAddress) {
      console.log("DEBUG: binding referral:", code, "for wallet:", walletAddress);
      bindReferral(code)
        .then(() => {
          console.log("DEBUG: referral bound successfully");
          localStorage.removeItem("pending_referral");
        })
        .catch((err) => {
          console.error("DEBUG: referral binding failed", err);
        });
    }
  }, [walletAddress]); // triggers when wallet changes

  // Force a retry a few seconds after page load
  useEffect(() => {
    const retry = setTimeout(() => {
      const code = localStorage.getItem("pending_referral");
      if (code && walletAddress) {
        console.log("DEBUG: retry binding referral:", code);
        bindReferral(code)
          .then(() => {
            console.log("DEBUG: referral bound successfully on retry");
            localStorage.removeItem("pending_referral");
          })
          .catch((err) => {
            console.error("DEBUG: referral binding retry failed", err);
          });
      }
    }, 3000);
    return () => clearTimeout(retry);
  }, [walletAddress]);

  return null;
}
