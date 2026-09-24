"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft, Home, Armchair, User, FileText } from "lucide-react";

interface AutoPrintTriggerProps {
  patientId?: string;
  customBackUrl?: string;
  autoPrint?: boolean;
}

export function AutoPrintTrigger({
  patientId,
  customBackUrl,
  autoPrint = true,
}: AutoPrintTriggerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!autoPrint) return;
    // Delay slightly to ensure web fonts, SVG barcode, and CSS styling have rendered
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  return (
    <div className="no-print print:hidden sticky top-0 z-50 bg-[#1C1C1E]/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl mb-6 shadow-xl flex flex-wrap items-center justify-between gap-3 border border-white/10">
      {/* Left Navigation Buttons */}
      <div className="flex items-center flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (customBackUrl) {
              router.push(customBackUrl);
            } else {
              router.back();
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>

        <Link
          href="/app/queue"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-xs font-semibold text-white transition"
        >
          <Armchair className="w-3.5 h-3.5" />
          <span>Return to Queue</span>
        </Link>

        {patientId && (
          <Link
            href={`/app/patients/${patientId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition"
          >
            <User className="w-3.5 h-3.5" />
            <span>Patient Profile</span>
          </Link>
        )}

        <Link
          href="/app/prescriptions"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Prescriptions</span>
        </Link>

        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Right Print Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-[#30D158] hover:bg-[#28b84d] text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Document</span>
        </button>
      </div>
    </div>
  );
}
