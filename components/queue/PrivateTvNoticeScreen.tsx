"use client";

import { Lock, ShieldAlert, Tv, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PrivateTvNoticeScreenProps {
  tenantName: string;
}

export function PrivateTvNoticeScreen({ tenantName }: PrivateTvNoticeScreenProps) {
  return (
    <div className="min-h-screen bg-[#0E131F] text-white flex items-center justify-center p-6 selection:bg-[#2A5CAA] selection:text-white">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400/90 block">
            Security &amp; Privacy Notice
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Private TV Display
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            The live waiting room monitor for <strong className="text-white">{tenantName}</strong> is protected to safeguard patient privacy.
          </p>
        </div>

        <div className="bg-black/30 border border-white/5 rounded-2xl p-4 text-xs text-gray-300 text-left space-y-2">
          <div className="flex items-center gap-2 text-white font-bold">
            <Tv className="w-4 h-4 text-[#2A5CAA]" />
            <span>How to Connect this Smart TV:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-gray-400">
            <li>Log into your clinic account on a staff computer or tablet.</li>
            <li>Go to <strong className="text-white">Live Queue</strong> and click the <strong className="text-white">TV Screen</strong> menu.</li>
            <li>Click <strong className="text-white">Copy Protected TV URL</strong> to get your clinic&apos;s private link with its secret key.</li>
            <li>Open that secret URL on this display browser.</li>
          </ol>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Clinic Staff Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
