import type { Metadata } from "next";
import { Inter, Noto_Sans_Bengali, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oris EMR — Multi-Tenant Dental Chamber Management",
  description:
    "Ultra-fast SaaS EMR for dental chambers in Bangladesh: patient cards, slot engine, live queue, Bangla prescriptions, and whole-Taka billing.",
};

import { Suspense } from "react";
import NavigationProgress from "@/components/ui/NavigationProgress";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${notoBengali.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#F4F4F5] text-[#1C1C1E] font-sans antialiased selection:bg-[#E8EEF7] selection:text-[#2A5CAA]"
      >
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
