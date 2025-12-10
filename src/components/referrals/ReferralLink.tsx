// components/referrals/ReferralLink.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Link } from "lucide-react";
import { getReferralLinkData, type ReferralLinkData } from "@/utils/api/referralsApi";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://zoggy.io").replace(/\/$/, "");

function extractCode(input?: string | null): string | null {
  if (!input) return null;
  const m = input.match(/\/r\/([A-Za-z0-9_-]+)/);
  return m?.[1] || null;
}

export default function ReferralLink() {
  const [copied, setCopied] = useState(false);
  const [linkData, setLinkData] = useState<ReferralLinkData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getReferralLinkData();
        setLinkData(data);
      } catch (error) {
        console.error("Failed to fetch referral link data:", error);
      }
    })();
  }, []);

  // Build the public link from code (never show API domain)
  const publicLink = useMemo(() => {
    const code =
      (linkData?.referralCode && String(linkData.referralCode)) ||
      extractCode(linkData?.referralLink) ||
      "";

    return code ? `${SITE_URL}/r/${encodeURIComponent(code)}` : `${SITE_URL}/referrals`;
  }, [linkData]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!linkData) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-soft/20 rounded mb-4"></div>
          <div className="h-16 bg-soft/20 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link className="text-blue-400" size={28} />
            <h2 className="text-2xl font-bold text-white">Your Referral Link</h2>
          </div>
        </div>
      </div>

      {/* Referral Link Display */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 glass-dark rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-white font-mono text-sm break-all">{publicLink}</span>
            <button
              onClick={copyToClipboard}
              className={`ml-4 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                copied ? "bg-green-600 text-white" : "bg-neon-pink hover:bg-neon-pink/80 text-white"
              }`}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="glass-dark rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-neon-pink">{linkData.totalClicks}</div>
          <div className="text-soft text-sm">Total Clicks</div>
        </div>
        <div className="glass-dark rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{linkData.conversions}</div>
          <div className="text-soft text-sm">Conversions</div>
        </div>
        <div className="glass-dark rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{linkData.conversionRate}%</div>
          <div className="text-soft text-sm">Conversion Rate</div>
        </div>
      </div>
    </div>
  );
}
