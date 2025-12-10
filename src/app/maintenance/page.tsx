import { Metadata } from "next";
import { Construction } from "lucide-react";

export const metadata: Metadata = {
  title: "Maintenance - Zoggy",
  description: "Zoggy is currently under maintenance. We'll be back soon!",
};

type MaintCfg = {
  isEnabled: boolean;
  message?: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  estimatedCompletion?: string | null;
};

async function fetchMaintenance(): Promise<MaintCfg> {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    "http://127.0.0.1:4000";

  try {
    const res = await fetch(`${apiBase}/admin/maintenance`, {
      headers: process.env.ADMIN_API_KEY
        ? { Authorization: `Bearer ${process.env.ADMIN_API_KEY}` }
        : {},
      cache: "no-store", // ✅ Always up-to-date
    });

    if (!res.ok) throw new Error("Failed to fetch maintenance");

    const cfg = await res.json();
    return {
      isEnabled: !!cfg.isEnabled,
      message:
        cfg.message ??
        "We're performing scheduled maintenance to improve your experience.",
      scheduledStart: cfg.scheduledStart ?? null,
      scheduledEnd: cfg.scheduledEnd ?? null,
      estimatedCompletion:
        cfg.scheduledEnd ??
        cfg.estimatedCompletion ??
        "Soon™",
    };
  } catch (e) {
    return {
      isEnabled: true,
      message:
        "We're performing scheduled maintenance to improve your experience.",
      estimatedCompletion: "Soon™",
    };
  }
}

export default async function MaintenancePage() {
  const cfg = await fetchMaintenance();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4 max-w-lg mx-auto">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-purple/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-purple"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-light flex items-center justify-center gap-2">
          Under Maintenance <Construction className="w-8 h-8 text-yellow-400" />
        </h1>

        {/* Dynamic Message */}
        <p className="text-soft mb-3">
          {cfg.message}
        </p>

        {/* Estimated Completion */}
        {cfg.estimatedCompletion && (
          <p className="text-purple mb-8 font-medium">
            Estimated completion: {cfg.estimatedCompletion}
          </p>
        )}

        {/* Try Again button */}
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 bg-purple rounded-lg font-medium text-white hover:bg-purple/80 transition-colors duration-200"
        >
          Try Again
        </a>
      </div>
    </div>
  );
}
