"use client";

import { useState, useEffect } from "react";
import { Stethoscope, Pin, PinOff, PanelLeft, ChevronLeft } from "lucide-react";
import { TenantSidebarNav } from "./TenantSidebarNav";
import SignOutButton from "@/components/auth/SignOutButton";

interface TenantDesktopSidebarProps {
  user: {
    id: string;
    name: string;
    role: string;
    isDoctor?: boolean | null;
  };
  tenant: {
    id: string;
    name: string;
    shortCode: string;
    brandColor?: string | null;
  };
}

export function TenantDesktopSidebar({ user, tenant }: TenantDesktopSidebarProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("oris_sidebar_pinned");
    if (saved === "true") {
      setIsPinned(true);
    }

    // Listen to global open sidebar event from header button
    const handleToggle = () => {
      setIsHovered((prev) => !prev);
    };
    window.addEventListener("oris:toggle-sidebar", handleToggle);
    return () => window.removeEventListener("oris:toggle-sidebar", handleToggle);
  }, []);

  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    localStorage.setItem("oris_sidebar_pinned", String(next));
    if (next) {
      setIsHovered(false);
    }
  };

  const isOpen = isPinned || isHovered;

  return (
    <>
      {/* 1. Left Edge Hover Detection Zone (only active when unpinned) */}
      {!isPinned && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          className="fixed top-0 left-0 bottom-0 w-3 hover:w-6 z-40 group cursor-pointer transition-all duration-200 hidden md:flex items-center"
          title="Hover to reveal sidebar"
        >
          <div className="w-1.5 h-20 rounded-r-full bg-[#2A5CAA]/40 group-hover:bg-[#2A5CAA] group-hover:w-2 transition-all shadow-sm" />
        </div>
      )}

      {/* 2. Backdrop Overlay when floating over content */}
      {!isPinned && isHovered && (
        <div
          onClick={() => setIsHovered(false)}
          className="fixed inset-0 bg-black/15 backdrop-blur-[1px] z-45 hidden md:block transition-opacity duration-200 animate-in fade-in"
        />
      )}

      {/* 3. Layout Spacer when pinned (takes width in standard document flow) */}
      {isPinned && <div className="w-68 shrink-0 hidden md:block transition-all duration-300" />}

      {/* 4. Desktop Sidebar Container */}
      <aside
        onMouseEnter={() => !isPinned && setIsHovered(true)}
        onMouseLeave={() => !isPinned && setIsHovered(false)}
        className={`w-68 border-r border-[#E4E4E7] bg-white flex flex-col justify-between hidden md:flex transition-all duration-300 ease-out z-50 ${
          isPinned
            ? "fixed top-0 left-0 bottom-0 shadow-xs"
            : `fixed top-0 left-0 bottom-0 shadow-2xl ${
                isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
              }`
        }`}
      >
        <div>
          {/* Clinic Brand Header with Pin/Unpin Toggle */}
          <div className="p-4 border-b border-[#E4E4E7] flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm shrink-0"
                style={{ backgroundColor: tenant.brandColor || "#2A5CAA" }}
              >
                <Stethoscope className="w-5 h-5" />
              </div>
              <div className="overflow-hidden min-w-0">
                <span className="text-sm font-extrabold text-[#1C1C1E] tracking-tight block truncate">
                  {tenant.name}
                </span>
                <span className="font-mono text-[11px] uppercase font-bold text-[#2A5CAA] bg-[#E8EEF7] px-2 py-0.5 rounded-md inline-block mt-0.5">
                  {tenant.shortCode}
                </span>
              </div>
            </div>

            {/* Pin / Auto-Hide Mode Toggle Button */}
            <button
              type="button"
              onClick={togglePin}
              className={`p-2 rounded-xl border transition cursor-pointer shrink-0 ${
                isPinned
                  ? "bg-[#E8EEF7] text-[#2A5CAA] border-[#2A5CAA]/30 hover:bg-[#2A5CAA] hover:text-white"
                  : "bg-[#F4F4F5] text-[#6B7280] border-[#E4E4E7] hover:text-[#1C1C1E] hover:bg-white"
              }`}
              title={
                isPinned
                  ? "Sidebar is Pinned. Click to enable Auto-Hide on Hover."
                  : "Sidebar is Auto-Hidden. Click to Pin Open permanently."
              }
            >
              {isPinned ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Unpinned Mode Hint Badge */}
          {!isPinned && (
            <div className="px-4 py-1.5 bg-[#F9FAFB] border-b border-[#E4E4E7] flex items-center justify-between text-[11px] font-semibold text-[#6B7280]">
              <span>Hover mode active</span>
              <button
                type="button"
                onClick={() => setIsHovered(false)}
                className="text-[#2A5CAA] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Hide</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <TenantSidebarNav userRole={user.role} />
        </div>

        {/* User Profile Card & Log Out Button */}
        <div className="p-4 border-t border-[#E4E4E7] bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-[#EBF2FC] text-[#2A5CAA] font-bold text-xs flex items-center justify-center shrink-0 border border-[#2A5CAA]/20">
                {user.name ? user.name.slice(0, 1).toUpperCase() : "U"}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#1C1C1E] block truncate">
                  {user.name}
                </span>
                <span className="text-[10px] text-[#4B5563] uppercase font-semibold block truncate">
                  {user.role} {user.isDoctor && "• Dentist"}
                </span>
              </div>
            </div>
            <SignOutButton
              showText={true}
              text="Log Out"
              className="px-2.5 py-1.5 text-xs font-bold text-[#DC2626] bg-[#FEE2E2]/60 hover:bg-[#DC2626] hover:text-white border border-[#FCA5A5]/60 hover:border-[#DC2626] rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Log Out of EMR"
            />
          </div>
        </div>
      </aside>
    </>
  );
}
