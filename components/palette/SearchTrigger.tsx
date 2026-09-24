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
      className="w-full px-4 py-2.5 rounded-2xl bg-[#F4F4F5] hover:bg-white border border-[#E4E4E7] text-sm font-medium text-[#4B5563] flex items-center justify-between transition cursor-pointer shadow-2xs hover:shadow-xs"
    >
      <div className="flex items-center gap-2.5">
        <Search className="w-4 h-4 text-[#4B5563]" />
        <span>Search patient, card scan, or code...</span>
      </div>
      <kbd className="px-2 py-0.5 rounded-lg bg-white border border-[#E4E4E7] font-mono text-xs text-[#6B7280] shadow-2xs font-semibold">
        Ctrl K
      </kbd>
    </button>
  );
}
