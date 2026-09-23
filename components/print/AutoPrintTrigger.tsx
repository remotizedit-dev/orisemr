"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export function AutoPrintTrigger() {
  useEffect(() => {
    // Delay slightly to ensure fonts and barcodes have drawn
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="no-print fixed top-4 right-4 z-50">
      <button
        onClick={() => window.print()}
        className="px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
      >
        <Printer className="w-4 h-4" />
        <span>Print Document</span>
      </button>
    </div>
  );
}
