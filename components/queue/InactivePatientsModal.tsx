"use client";

import { useState } from "react";
import { QueueItem } from "./QueueBoard";
import {
  RotateCcw,
  Search,
  UserX,
  X,
  Loader2,
  Clock,
  Phone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
} from "lucide-react";
import { formatBdPhone } from "@/lib/utils";

interface InactivePatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inactiveItems: QueueItem[];
  onCheckInLate: (appointmentId: string) => Promise<void>;
  onRevertToBooked: (appointmentId: string) => Promise<void>;
  processingId: string | null;
}

export function InactivePatientsModal({
  isOpen,
  onClose,
  inactiveItems,
  onCheckInLate,
  onRevertToBooked,
  processingId,
}: InactivePatientsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredItems = inactiveItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.patientName.toLowerCase().includes(q) ||
      item.patientCard.toLowerCase().includes(q) ||
      item.patientPhone.toLowerCase().includes(q) ||
      item.doctorName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E4E4E7] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E4E4E7] flex items-center justify-between bg-gradient-to-r from-amber-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-[#1C1C1E]">
                  Cancelled &amp; No-Show Patients
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-200 text-amber-900 font-mono">
                  {inactiveItems.length}
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">
                Missed or cancelled slots for today. Revive or check in late patients instantly.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        {inactiveItems.length > 0 && (
          <div className="px-6 py-3 border-b border-[#E4E4E7] bg-[#FAFAFA]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, phone, card #, or doctor..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#E4E4E7] rounded-xl text-[#1C1C1E] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#2A5CAA]/20 transition"
              />
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {inactiveItems.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-[#1C1C1E]">
                No Inactive Patients Today
              </h4>
              <p className="text-sm text-[#6B7280] max-w-sm mx-auto">
                All scheduled patients are active in the queue. Any future no-show or cancelled appointments will appear here for easy restoration.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#6B7280]">
              No patients found matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isBusy = processingId === item.appointmentId;
              const isNoShow = item.status === "no_show";

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E4E4E7] hover:border-[#2A5CAA]/30 transition space-y-3 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isNoShow
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-rose-100 text-rose-900 border border-rose-300"
                          }`}
                        >
                          {isNoShow ? "No-Show" : "Cancelled"}
                        </span>
                        <h4 className="text-base font-extrabold text-[#1C1C1E]">
                          {item.patientName}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
                        <span className="flex items-center gap-1 font-mono">
                          <CreditCard className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          {item.patientCard}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          {formatBdPhone(item.patientPhone)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          {item.doctorName}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-[#1C1C1E]">
                          <Clock className="w-3.5 h-3.5 text-[#2A5CAA]" />
                          Booked: {item.startTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-[#E4E4E7] flex flex-wrap items-center gap-2.5">
                    {/* Primary Revival: Check In Late Patient -> assigns next SL */}
                    <button
                      type="button"
                      onClick={() => onCheckInLate(item.appointmentId)}
                      disabled={isBusy}
                      className="flex-1 min-w-[200px] py-2 px-3.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>Patient Arrived Late → Check In (Next SL #)</span>
                    </button>

                    {/* Secondary Revival: Restore back to Booked */}
                    <button
                      type="button"
                      onClick={() => onRevertToBooked(item.appointmentId)}
                      disabled={isBusy}
                      className="py-2 px-3.5 rounded-xl bg-white hover:bg-[#F4F4F5] text-[#4B5563] hover:text-[#1C1C1E] border border-[#E4E4E7] text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                      title="Restore back to Booked Today column"
                    >
                      <span>Restore to Booked</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Helpful Tip Footer */}
        <div className="px-6 py-3.5 border-t border-[#E4E4E7] bg-[#FAFAFA] flex items-center justify-between text-xs text-[#6B7280]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#2A5CAA] shrink-0" />
            <span>
              Reviving a late patient automatically generates the next Serial # without disturbing earlier active patients.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#E4E4E7] transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
