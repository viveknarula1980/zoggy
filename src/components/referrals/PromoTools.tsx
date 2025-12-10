"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Share2, MessageCircle, Twitter, Send, Settings, FileText } from "lucide-react";
import { getReferralLinkData, type ReferralLinkData } from "@/utils/api/referralsApi";

// —— helpers to always show frontend link ——
function stripSlash(s: string) {
  return (s || "").replace(/\/$/, "");
}
function extractCodeFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, "https://dummy.base"); // base for relative safety
    const parts = u.pathname.split("/").filter(Boolean);
    // expect /r/:code
    const idx = parts.findIndex((p) => p === "r");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1].toUpperCase();
  } catch {}
  // Fallback: last segment after /r/
  const m = String(url).match(/\/r\/([A-Za-z0-9]+)/);
  return m?.[1]?.toUpperCase() || null;
}
function toFrontendReferral(linkData: ReferralLinkData | null): string {
  if (!linkData) return "";
  const site = stripSlash(process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : ""));
  const code = linkData.referralCode || extractCodeFromUrl(linkData.referralLink) || "";
  return code ? `${site}/r/${code}` : "";
}

export default function PromoTools() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<ReferralLinkData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getReferralLinkData();
        setLinkData(data);
      } catch (e) {
        console.error("Failed to load referral link", e);
      }
    })();
  }, []);

  const displayLink = toFrontendReferral(linkData); // <- always zoggy.io/r/XXXX

  const promoTexts = [
    { id: "basic", title: "Basic Invite", text: "Join me on FlipVerse - the hottest crypto casino! Use my link and we both win big!", category: "General" },
    { id: "commission", title: "Commission Focus", text: "Invite friends → Earn 30% of their wagers for life! Join the FlipVerse affiliate program and start earning passive income!", category: "Earnings" },
    { id: "games", title: "Game Focused", text: "Crash, Slots, Mines, Dice & more! FlipVerse has the best crypto games with instant payouts. Join now!", category: "Games" },
    { id: "bonus", title: "Bonus Highlight", text: "Get instant bonuses when you sign up through my link! Plus I earn commission on your plays - it's a win-win!", category: "Bonus" },
    { id: "social", title: "Social Media", text: "Making bank on @FlipVerse! Best crypto casino with fair games and instant withdrawals. Join my squad! #CryptoCasino #FlipVerse", category: "Social" },
  ];

  const socialPlatforms = [
    { name: "Telegram", icon: Send, color: "bg-blue-500", url: "https://t.me/share/url" },
    { name: "Twitter", icon: Twitter, color: "bg-sky-500", url: "https://twitter.com/intent/tweet" },
    { name: "Discord", icon: MessageCircle, color: "bg-indigo-500", url: "#" },
    { name: "WhatsApp", icon: MessageCircle, color: "bg-green-500", url: "https://wa.me/" },
  ];

  const copyToClipboard = async (text: string, id: string) => {
    try {
      const out = displayLink ? `${text} ${displayLink}` : text;
      await navigator.clipboard.writeText(out);
      setCopiedText(id);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareToSocial = (platform: string, text: string) => {
    if (!displayLink) {
      console.warn("Referral link not ready yet");
      return;
    }
    const fullText = `${text} ${displayLink}`;
    let url = "";
    switch (platform) {
      case "Telegram":
        url = `https://t.me/share/url?url=${encodeURIComponent(displayLink)}&text=${encodeURIComponent(text)}`;
        break;
      case "Twitter":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;
        break;
      case "WhatsApp":
        url = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
        break;
      default:
        return;
    }
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="text-orange-400" size={28} />
          <h2 className="text-2xl font-bold text-white">Promo Tools</h2>
        </div>
        <div className="text-sm text-soft">Ready-to-use promotional content</div>
      </div>

      {/* Pre-written Texts */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="text-blue-400" size={20} />
          <h3 className="text-lg font-semibold text-white">Pre-written Messages</h3>
        </div>

        <div className="grid gap-4">
          {promoTexts.map((promo) => (
            <div key={promo.id} className="glass-dark rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-white font-medium">{promo.title}</h4>
                  <span className="text-xs text-soft bg-white/10 px-2 py-1 rounded-full">{promo.category}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(promo.text, promo.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm cursor-pointer ${
                    copiedText === promo.id ? "bg-green-600 text-white" : "bg-neon-pink hover:bg-neon-pink/80 text-white"
                  }`}
                >
                  {copiedText === promo.id ? (
                    <>
                      <Check size={14} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <p className="text-light text-sm leading-relaxed mb-4">
                {promo.text}{" "}
                {displayLink ? <span className="text-soft break-all">{displayLink}</span> : null}
              </p>

              {/* Social Share Buttons */}
              <div className="flex gap-2">
                {socialPlatforms.map((platform) => {
                  const IconComponent = platform.icon;
                  const disabled = !displayLink;
                  return (
                    <button
                      key={platform.name}
                      onClick={() => shareToSocial(platform.name, promo.text)}
                      className={`${platform.color} hover:opacity-80 p-2 rounded-lg transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed`}
                      title={`Share on ${platform.name}`}
                      disabled={disabled}
                    >
                      <IconComponent size={16} className="text-white" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
