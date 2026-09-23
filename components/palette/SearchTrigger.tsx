"use client";

import { Search } from "lucide-react";

export function SearchTrigger() {
  const handleClick = () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full px-3.5 py-2 rounded-xl bg-[#F4F4F5] hover:bg-white border border-[#E4E4E7] text-xs text-[#6B7280] flex items-center justify-between transition cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-[#6B7280]" />
        <span>Search patient, card scan, or code...</span>
      </div>
      <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E4E4E7] font-mono text-[10px]">
        Ctrl K
      </kbd>
    </button>
  );
}
