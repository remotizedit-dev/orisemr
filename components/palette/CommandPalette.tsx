"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Calendar,
  CreditCard,
  FilePlus,
  Layers,
  Search,
  Settings,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { resolveCode } from "@/lib/barcode/resolve-code";
import { toast } from "sonner";

interface CommandPaletteProps {
  tenantId: string;
  tenantShortCode: string;
}

export function CommandPalette({ tenantId, tenantShortCode }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Toggle on Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleResolveCode = async () => {
    if (!search.trim()) return;
    try {
      const res = await resolveCode(search.trim(), tenantId, tenantShortCode);
      if (res.found && res.url) {
        setOpen(false);
        router.push(res.url);
      } else {
        toast.error(res.message || "No record found");
      }
    } catch {
      toast.error("Lookup failed");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="glass-floating rounded-2xl w-full max-w-xl overflow-hidden border border-[#E4E4E7] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <Command className="w-full">
          <div className="flex items-center px-4 py-3 border-b border-[#E4E4E7] gap-3">
            <Search className="w-5 h-5 text-[#6B7280]" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search patients, scan card, or type code (APT-, RX-, INV-)..."
              className="flex-1 bg-transparent text-sm text-[#1C1C1E] focus:outline-none placeholder:text-[#6B7280]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleResolveCode();
                }
              }}
            />
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-6 text-center text-xs text-[#6B7280]">
              No exact match. Press Enter to lookup code "{search}".
            </Command.Empty>

            <Command.Group heading="Quick Navigation" className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider px-2 py-1">
              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  router.push("/app/queue");
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA] cursor-pointer transition"
              >
                <Layers className="w-4 h-4 text-[#2A5CAA]" />
                <span>Live Patient Queue</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  router.push("/app/patients/new");
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA] cursor-pointer transition"
              >
                <UserPlus className="w-4 h-4 text-[#30D158]" />
                <span>Register New Patient</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  router.push("/app/appointments/new");
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA] cursor-pointer transition"
              >
                <Calendar className="w-4 h-4 text-[#FF9F0A]" />
                <span>Book Appointment</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  router.push("/app/billing");
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA] cursor-pointer transition"
              >
                <CreditCard className="w-4 h-4 text-[#2A5CAA]" />
                <span>Billing &amp; Invoices</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  router.push("/app/settings");
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA] cursor-pointer transition"
              >
                <Settings className="w-4 h-4 text-[#6B7280]" />
                <span>Chamber Settings</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="px-4 py-2 border-t border-[#E4E4E7] bg-[#F4F4F5]/60 text-[11px] text-[#6B7280] flex items-center justify-between">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E4E4E7] font-mono">↵ Enter</kbd> to search code</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E4E4E7] font-mono">Esc</kbd> to close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
