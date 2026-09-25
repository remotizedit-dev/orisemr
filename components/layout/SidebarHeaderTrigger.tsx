"use client";

import { PanelLeft } from "lucide-react";

export function SidebarHeaderTrigger() {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("oris:toggle-sidebar"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="hidden md:flex p-2 rounded-xl text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] border border-transparent hover:border-[#E4E4E7] transition cursor-pointer items-center justify-center shrink-0"
      title="Toggle Navigation Sidebar (or hover left edge)"
      aria-label="Toggle navigation sidebar"
    >
      <PanelLeft className="w-5 h-5 text-[#2A5CAA]" />
    </button>
  );
}
