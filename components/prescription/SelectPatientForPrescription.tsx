"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  UserPlus,
  ArrowLeft,
  Loader2,
  User,
  Phone,
  CreditCard,
  Sparkles,
  ArrowRight,
  Armchair,
} from "lucide-react";
import { toast } from "sonner";
import { formatBdPhone } from "@/lib/utils";
import { searchPatientsForBookingAction } from "@/app/(tenant)/app/appointments/actions";
import { QuickRegisterPatientModal } from "@/components/patients/QuickRegisterPatientModal";

interface RecentPatient {
  id: string;
  name: string;
  phone: string;
  cardNumber: string;
  gender?: string | null;
  approxAge?: number | null;
}

interface SelectPatientForPrescriptionProps {
  recentPatients?: RecentPatient[];
}

export function SelectPatientForPrescription({
  recentPatients = [],
}: SelectPatientForPrescriptionProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const matches = await searchPatientsForBookingAction(query);
        setResults(matches);
      } catch (err) {
        console.error("Patient search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectPatient = (patient: { id: string; name: string }) => {
    toast.info(`Opening prescription for ${patient.name}...`);
    router.push(`/app/prescriptions/new?patientId=${patient.id}`);
  };

  const handlePatientRegistered = (newPatient: {
    id: string;
    name: string;
    phone: string;
    cardNumber: string;
  }) => {
    setIsQuickRegisterOpen(false);
    toast.success(`Patient ${newPatient.name} registered!`);
    router.push(`/app/prescriptions/new?patientId=${newPatient.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/prescriptions"
            className="p-2.5 rounded-2xl bg-white border border-[#E4E4E7] text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] transition shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
              Select Patient to Prescribe
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280]">
              Search existing chamber records or quickly enroll a walk-in patient.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsQuickRegisterOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Quick Register</span>
        </button>
      </div>

      {/* Main Search Panel */}
      <div className="glass-panel p-6 rounded-3xl border border-[#E4E4E7] shadow-sm space-y-5 bg-white">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center justify-between">
            <span>Search Patient</span>
            <span className="text-[11px] text-[#9CA3AF] font-normal">
              Type Name, Mobile (01X...), or Card #
            </span>
          </label>

          <div className="relative">
            <Search className="w-5 h-5 text-[#9CA3AF] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Asif Hossain or 01712... or 1000000001"
              className="w-full pl-12 pr-10 py-3.5 bg-white border-2 border-[#E4E4E7] focus:border-[#2A5CAA] rounded-2xl text-base text-[#1C1C1E] placeholder:text-[#9CA3AF] outline-none transition shadow-2xs"
            />
            {isSearching && (
              <Loader2 className="w-5 h-5 text-[#2A5CAA] animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
            )}
          </div>
        </div>

        {/* Live Search Results */}
        {query.trim().length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#E4E4E7]">
            <span className="text-xs font-bold text-[#6B7280] block">
              Search Results ({results.length}):
            </span>

            {results.length === 0 && !isSearching ? (
              <div className="p-6 text-center rounded-2xl bg-[#F9FAFB] border border-dashed border-[#E4E4E7] space-y-3">
                <p className="text-xs text-[#6B7280]">
                  No registered patient found matching &quot;<strong>{query}</strong>&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => setIsQuickRegisterOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register &quot;{query}&quot; as New Patient</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E4E4E7] border border-[#E4E4E7] rounded-2xl overflow-hidden bg-white">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className="w-full p-4 text-left hover:bg-[#EBF2FC]/40 transition flex items-center justify-between cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#1C1C1E] group-hover:text-[#2A5CAA]">
                          {p.name}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#2A5CAA] bg-[#E8EEF7] px-2 py-0.5 rounded-md">
                          {p.cardNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                        <span className="font-mono">{formatBdPhone(p.phone)}</span>
                        {p.gender && <span className="capitalize">• {p.gender}</span>}
                        {p.bloodGroup && <span>• {p.bloodGroup}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-[#2A5CAA] group-hover:translate-x-1 transition-transform">
                      <span>Write Prescription</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Suggestions / Recent Patients */}
        {query.trim().length === 0 && recentPatients.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-[#E4E4E7]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280] block">
              Recent Chamber Patients:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {recentPatients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPatient(p)}
                  className="p-3.5 rounded-2xl border border-[#E4E4E7] hover:border-[#2A5CAA]/50 bg-white hover:bg-[#F9FAFB] text-left transition flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <div className="truncate">
                    <span className="font-bold text-sm text-[#1C1C1E] group-hover:text-[#2A5CAA] block truncate">
                      {p.name}
                    </span>
                    <span className="font-mono text-xs text-[#6B7280] block mt-0.5">
                      {p.cardNumber} • {formatBdPhone(p.phone)}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center shrink-0 group-hover:bg-[#2A5CAA] group-hover:text-white transition">
                    <FileText className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Register Patient Modal */}
      <QuickRegisterPatientModal
        isOpen={isQuickRegisterOpen}
        onClose={() => setIsQuickRegisterOpen(false)}
        onSuccess={handlePatientRegistered}
        initialName={query}
      />
    </div>
  );
}
