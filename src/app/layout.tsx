import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./(main)/globals.css";
import { Toaster } from "react-hot-toast";

import { WalletContextProvider } from "@/contexts/WalletContext";
import ReferralWrapper from "@/components/common/ReferralWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zoggy",
  description: "Your next-gen gaming platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <WalletContextProvider>
          <ReferralWrapper>{children}</ReferralWrapper>
        </WalletContextProvider>

        <Toaster
          position="bottom-right"
          toastOptions={{
            success: { duration: 3000, style: { background: "#10B981", color: "white" } },
            error: { duration: 4000, style: { background: "#EF4444", color: "white" } },
          }}
        />
      </body>
    </html>
  );
}
