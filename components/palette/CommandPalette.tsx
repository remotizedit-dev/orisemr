"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Calendar,
  CreditCard,
  Layers,
  Search,
  Settings,
  UserPlus,
  Users,
  X,
  User,
  Phone,
  FileText,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { resolveCode } from "@/lib/barcode/resolve-code";
import { searchPatientsForBookingAction } from "@/app/(tenant)/app/appointments/actions";
import { toast } from "sonner";

interface CommandPaletteProps {
  tenantId: string;
  tenantShortCode: string;
}

interface PatientSearchResult {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  cardNumber: string;
  gender?: string | null;
  bloodGroup?: string | null;
}

export function CommandPalette({ tenantId, tenantShortCode }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Toggle on Ctrl+K / Cmd+K or close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Debounced search for patients by Name, Phone, or Card Number (Issue 8)
  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setPatients([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPatientsForBookingAction(query);
        setPatients(results || []);
      } catch (err) {
        console.error("Command palette search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [search]);

  const handleResolveCode = async () => {
    const clean = search.trim();
    if (!clean) return;

    setIsResolving(true);
    try {
      const res = await resolveCode(clean, tenantId, tenantShortCode);
      if (res.found && res.url) {
        setOpen(false);
        setSearch("");
        router.push(res.url);
      } else if (patients.length > 0) {
        // If exact code match not found but patient results exist, jump to first patient
        setOpen(false);
        setSearch("");
        router.push(`/app/patients/${patients[0].id}`);
      } else {
        toast.error(res.message || `No record found for "${clean}"`);
      }
    } catch {
      toast.error("Lookup failed");
    } finally {
      setIsResolving(false);
    }
  };

  if (!open) return null;

  const isCodeLookup =
    /^(APT|RX|INV|RPT)-/i.test(search.trim()) || /^\d{6,12}$/.test(search.trim());

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 p-3 sm:p-4 cursor-pointer animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="glass-floating rounded-3xl w-full max-w-xl overflow-hidden border border-[#E4E4E7] shadow-2xl animate-in zoom-in-95 duration-150 cursor-default bg-white/95">
        <Command shouldFilter={false} className="w-full">
          <div className="flex items-center px-4 py-3.5 border-b border-[#E4E4E7] gap-3">
            <Search className="w-5 h-5 text-[#2A5CAA] shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search patient name, phone, card, or code (APT-, RX-, INV-)..."
              className="flex-1 bg-transparent text-sm sm:text-base font-medium text-[#1C1C1E] focus:outline-none placeholder:text-[#9CA3AF]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleResolveCode();
                }
              }}
            />
            {isSearching || isResolving ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#2A5CAA] shrink-0" />
            ) : search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#1C1C1E] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#1C1C1E] transition cursor-pointer"
              >
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#F4F4F5] rounded border border-[#E4E4E7] text-[#6B7280]">
                  ESC
                </kbd>
              </button>
            )}
          </div>

          <Command.List className="max-h-84 overflow-y-auto p-2 space-y-1 divide-y divide-[#F4F4F5]">
            {/* Matching Patient Results from live DB Search */}
            {patients.length > 0 && (
              <Command.Group
                heading={`Matching Patients (${patients.length})`}
                className="text-[11px] font-bold text-[#2A5CAA] uppercase tracking-wider px-2 py-1"
              >
                {patients.map((p) => (
                  <Command.Item
                    key={p.id}
                    onSelect={() => {
                      setOpen(false);
                      setSearch("");
                      router.push(`/app/patients/${p.id}`);
                    }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA] cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#EBF2FC] text-[#2A5CAA] flex items-center justify-center font-bold shrink-0 border border-[#2A5CAA]/20 group-hover:scale-105 transition-transform">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-extrabold text-sm block text-[#1C1C1E] group-hover:text-[#2A5CAA]">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-[#6B7280] font-mono">
                          {p.phone && <span>{p.phone}</span>}
                          {p.gender && <span>• {p.gender}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#2A5CAA] bg-[#EBF2FC] px-2.5 py-1 rounded-lg border border-[#2A5CAA]/20">
                        {p.cardNumber}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-[#2A5CAA] group-hover:translate-x-0.5 transition" />
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Direct Code / Barcode Lookup Trigger */}
            {search.trim().length > 0 && (
              <Command.Group
                heading="Record & Barcode Lookup"
                className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider px-2 py-1 pt-2"
              >
                <Command.Item
                  onSelect={handleResolveCode}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-[#2A5CAA] bg-[#EBF2FC]/50 hover:bg-[#EBF2FC] cursor-pointer transition border border-[#2A5CAA]/20"
                >
                  <div className="flex items-center gap-2.5">
                    <Search className="w-4 h-4 text-[#2A5CAA]" />
                    <span>
                      Look up {isCodeLookup ? "code" : "record"} &ldquo;{search.trim()}&rdquo;
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#2A5CAA]/30 text-[#2A5CAA]">
                    ↵ Enter
                  </span>
                </Command.Item>
              </Command.Group>
            )}

            {/* No match banner */}
            {search.trim().length > 0 && patients.length === 0 && !isSearching && (
              <div className="py-4 text-center text-xs text-[#6B7280] space-y-1">
                <p>No patients matched &ldquo;<span className="font-bold text-[#1C1C1E]">{search}</span>&rdquo;</p>
                <p className="text-[11px] text-[#9CA3AF]">
                  Press <kbd className="px-1 py-0.5 bg-[#F4F4F5] rounded border font-mono">Enter</kbd> to search record codes or cards.
                </p>
              </div>
            )}

            {/* Quick Actions (when search is empty or as fast shortcuts) */}
            {(!search.trim() || patients.length === 0) && (
              <Command.Group
                heading="Quick Navigation"
                className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider px-2 py-1 pt-2"
              >
                <Command.Item
                  onSelect={() => {
                    setOpen(false);
                    router.push("/app/queue");
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA] cursor-pointer transition"
                >
                  <Layers className="w-4 h-4 text-[#2A5CAA]" />
                  <span>Live Chamber Queue</span>
                </Command.Item>

                <Command.Item
                  onSelect={() => {
                    setOpen(false);
                    router.push("/app/patients/new");
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA] cursor-pointer transition"
                >
                  <UserPlus className="w-4 h-4 text-[#30D158]" />
                  <span>Register New Patient</span>
                </Command.Item>

                <Command.Item
                  onSelect={() => {
                    setOpen(false);
                    router.push("/app/appointments/new");
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA] cursor-pointer transition"
                >
                  <Calendar className="w-4 h-4 text-[#FF9F0A]" />
                  <span>Book Appointment</span>
                </Command.Item>

                <Command.Item
                  onSelect={() => {
                    setOpen(false);
                    router.push("/app/billing");
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA] cursor-pointer transition"
                >
                  <CreditCard className="w-4 h-4 text-[#2A5CAA]" />
                  <span>Billing &amp; Invoices</span>
                </Command.Item>

                <Command.Item
                  onSelect={() => {
                    setOpen(false);
                    router.push("/app/settings");
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA] cursor-pointer transition"
                >
                  <Settings className="w-4 h-4 text-[#6B7280]" />
                  <span>Chamber Settings</span>
                </Command.Item>
              </Command.Group>
            )}
          </Command.List>

          <div className="px-4 py-2.5 border-t border-[#E4E4E7] bg-[#F4F4F5]/60 text-[11px] text-[#6B7280] flex items-center justify-between">
            <span>
              Type name, phone, or code • Press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E4E4E7] font-mono">
                ↵ Enter
              </kbd>{" "}
              to open
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E4E4E7] font-mono">
                Esc
              </kbd>{" "}
              to close
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
