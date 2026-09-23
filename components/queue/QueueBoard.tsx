"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  advanceQueueStatusAction,
  checkInPatientAction,
  callNextPatientAction,
} from "@/app/(tenant)/app/queue/actions";
import {
  AlertCircle,
  ArrowRight,
  Armchair,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  Play,
  Sparkles,
  Stethoscope,
  User,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

export interface QueueItem {
  id: string;
  appointmentId: string;
  status: "booked" | "waiting" | "in_chair" | "billing" | "done" | "no_show" | "cancelled";
  serialNo: number | null;
  chairId?: string | null;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientCard: string;
  allergyFlags: string[];
  doctorId: string;
  doctorName: string;
  startTime: string;
}

interface ChairOption {
  id: string;
  name: string;
}

interface QueueBoardProps {
  initialItems: QueueItem[];
  currentUserId: string;
  currentUserIsDoctor: boolean;
  doctors: { id: string; name: string }[];
  chairs?: ChairOption[];
}

export function QueueBoard({
  initialItems,
  currentUserId,
  currentUserIsDoctor,
  doctors,
  chairs = [],
}: QueueBoardProps) {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("all");
  const [selectedChairId, setSelectedChairId] = useState<string>(chairs[0]?.id || "");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Sync state whenever server revalidates and sends fresh initialItems
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const filteredItems = items.filter((item) => {
    if (selectedDoctorFilter === "all") return true;
    return item.doctorId === selectedDoctorFilter;
  });

  const getColumnItems = (status: QueueItem["status"]) =>
    filteredItems.filter((i) => i.status === status);

  const handleCheckIn = async (appointmentId: string) => {
    setProcessingId(appointmentId);
    try {
      const res = await checkInPatientAction(appointmentId);
      if (res?.success) {
        setItems((prev) =>
          prev.map((i) =>
            i.appointmentId === appointmentId
              ? { ...i, status: "waiting", serialNo: res.serialNo }
              : i
          )
        );
        toast.success(`Patient checked in with Serial #${res.serialNo}`);
      }
    } catch {
      toast.error("Failed to check in patient");
      router.refresh();
    } finally {
      setProcessingId(null);
    }
  };

  const handleAdvance = async (
    itemId: string,
    newStatus: QueueItem["status"],
    chairId?: string
  ) => {
    setProcessingId(itemId);
    // Optimistic update - instant UI response
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, status: newStatus, ...(chairId ? { chairId } : {}) }
          : i
      )
    );
    try {
      await advanceQueueStatusAction(itemId, newStatus, chairId);
      const labels: Record<string, string> = {
        in_chair: "In Chair (Treatment Active)",
        billing: "Pending Billing",
        done: "Completed Visits",
      };
      toast.success(`Patient moved to ${labels[newStatus] || newStatus}`);
    } catch {
      toast.error("Failed to update queue");
      router.refresh();
    } finally {
      setProcessingId(null);
    }
  };

  const handleCallNext = async () => {
    setIsCallingNext(true);
    try {
      const targetDoc = selectedDoctorFilter === "all" ? undefined : selectedDoctorFilter;
      const res = await callNextPatientAction(targetDoc, selectedChairId || undefined);
      if (res?.success) {
        toast.success(`Called Serial #${res.serialNo} to the dental chair!`);
        router.refresh();
      } else {
        toast.info(res?.message || "No patients currently waiting");
      }
    } catch {
      toast.error("Could not call next patient");
    } finally {
      setIsCallingNext(false);
    }
  };

  const getChairName = (chairId?: string | null) => {
    if (!chairId) return null;
    return chairs.find((c) => c.id === chairId)?.name || null;
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Call Next Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-[#E4E4E7] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-[#6B7280]">
            Dentist Filter:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedDoctorFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedDoctorFilter === "all"
                  ? "bg-[#2A5CAA] text-white shadow-xs"
                  : "bg-white text-[#1C1C1E] border border-[#E4E4E7] hover:bg-[#F4F4F5]"
              }`}
            >
              All Dentists
            </button>
            {doctors.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDoctorFilter(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedDoctorFilter === d.id
                    ? "bg-[#2A5CAA] text-white shadow-xs"
                    : "bg-white text-[#1C1C1E] border border-[#E4E4E7] hover:bg-[#F4F4F5]"
                }`}
              >
                {d.name} {d.id === currentUserId && "(You)"}
              </button>
            ))}
          </div>

          {/* Chair Selector if multiple chairs exist */}
          {chairs.length > 0 && (
            <div className="flex items-center gap-1.5 pl-3 border-l border-[#E4E4E7]">
              <Armchair className="w-3.5 h-3.5 text-[#6B7280]" />
              <select
                value={selectedChairId}
                onChange={(e) => setSelectedChairId(e.target.value)}
                className="bg-white border border-[#E4E4E7] text-xs font-semibold text-[#1C1C1E] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2A5CAA]"
              >
                {chairs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Workflow Guide Toggle */}
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="px-3 py-2 rounded-xl bg-white border border-[#E4E4E7] text-xs font-semibold text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] flex items-center gap-1.5 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#2A5CAA]" />
            <span>How Queue Works</span>
            {showGuide ? (
              <ChevronUp className="w-3 h-3 text-[#6B7280]" />
            ) : (
              <ChevronDown className="w-3 h-3 text-[#6B7280]" />
            )}
          </button>

          {/* Call Next Button */}
          <button
            type="button"
            onClick={handleCallNext}
            disabled={isCallingNext || getColumnItems("waiting").length === 0}
            className="px-4 py-2 rounded-xl bg-[#30D158] hover:bg-[#28b84d] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {isCallingNext ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Call Next Waiting Patient</span>
          </button>
        </div>
      </div>

      {/* Explanatory Patient Journey Banner */}
      {showGuide && (
        <div className="glass-panel p-4 rounded-2xl border border-[#2A5CAA]/20 bg-[#E8EEF7]/40 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 mb-2 text-[#2A5CAA] font-bold text-xs">
            <Info className="w-4 h-4" />
            <span>Dental Chamber 5-Stage Patient Flow:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-[11px]">
            <div className="p-2.5 rounded-xl bg-white border border-[#E4E4E7]">
              <span className="font-bold text-[#6B7280] block mb-1">1. Booked Today</span>
              <p className="text-[#6B7280]">
                Patients with scheduled appointments. When the patient arrives at the chamber, click <strong>"Check In"</strong>.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#FF9F0A]/30">
              <span className="font-bold text-[#FF9F0A] block mb-1">2. Waiting in Chamber</span>
              <p className="text-[#6B7280]">
                Patient is seated in waiting lounge with a daily Serial #. The doctor clicks <strong>"Call Next"</strong> or <strong>"To Chair"</strong>.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#2A5CAA]/30">
              <span className="font-bold text-[#2A5CAA] block mb-1">3. In Dental Chair</span>
              <p className="text-[#6B7280]">
                Actively receiving treatment in chair. Dentist writes prescription, then clicks <strong>"Finish Treatment"</strong>.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#FF453A]/30">
              <span className="font-bold text-[#FF453A] block mb-1">4. Pending Billing</span>
              <p className="text-[#6B7280]">
                Patient proceeds to front desk. Receptionist records Cash / bKash / Card payment and prints invoice.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#30D158]/30">
              <span className="font-bold text-[#30D158] block mb-1">5. Completed (Done)</span>
              <p className="text-[#6B7280]">
                Visit finalized, dues settled, and appointment safely closed for the day.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5-Column Kanban Board with Horizontal Scroll Protection */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-5 gap-4 min-w-[1100px] items-start">
          {/* Column 1: Booked */}
          <div className="bg-[#F4F4F5] rounded-2xl p-3 border border-[#E4E4E7] space-y-3">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold uppercase text-[#6B7280] tracking-wider">
                1. Booked ({getColumnItems("booked").length})
              </span>
            </div>

            <div className="space-y-2">
              {getColumnItems("booked").length === 0 ? (
                <div className="p-4 text-center text-xs text-[#6B7280] bg-white/50 rounded-xl border border-dashed border-[#E4E4E7]">
                  No upcoming bookings
                </div>
              ) : (
                getColumnItems("booked").map((item) => (
                  <div
                    key={item.id}
                    className="clinical-card p-3 rounded-xl shadow-xs border border-[#E4E4E7] space-y-2 hover:border-[#2A5CAA]/40 transition bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/app/patients/${item.patientId}`}
                          className="font-bold text-xs text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline truncate block"
                          title="View patient history"
                        >
                          {item.patientName}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-[#2A5CAA] bg-[#E8EEF7] px-1.5 py-0.2 rounded font-bold">
                            {item.patientCard}
                          </span>
                          <span className="text-[10px] text-[#6B7280] font-mono">
                            {item.startTime}
                          </span>
                        </div>
                      </div>
                      {item.allergyFlags.length > 0 && (
                        <span
                          className="text-[#FF453A] shrink-0"
                          title={`Allergies: ${item.allergyFlags.join(", ")}`}
                        >
                          <AlertCircle className="w-4 h-4 fill-[#FFEBEA]" />
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5">
                      <Stethoscope className="w-3 h-3 text-[#2A5CAA] shrink-0" />
                      <span className="truncate">{item.doctorName}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCheckIn(item.appointmentId)}
                      disabled={processingId === item.appointmentId}
                      className="w-full py-1.5 px-3 rounded-lg bg-[#2A5CAA] hover:bg-[#224b8c] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {processingId === item.appointmentId ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <span>Check In Patient</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Waiting in Chamber */}
          <div className="bg-[#FFF7EB]/40 rounded-2xl p-3 border border-[#FF9F0A]/30 space-y-3">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold uppercase text-[#FF9F0A] tracking-wider">
                2. Waiting ({getColumnItems("waiting").length})
              </span>
            </div>

            <div className="space-y-2">
              {getColumnItems("waiting").length === 0 ? (
                <div className="p-4 text-center text-xs text-[#6B7280] bg-white/50 rounded-xl border border-dashed border-[#FF9F0A]/30">
                  Lounge empty
                </div>
              ) : (
                getColumnItems("waiting").map((item) => (
                  <div
                    key={item.id}
                    className="clinical-card p-3 rounded-xl shadow-xs border border-[#E4E4E7] space-y-2.5 bg-white"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[#FFF7EB] text-[#FF9F0A] font-extrabold text-xs flex items-center justify-center font-mono border border-[#FF9F0A]/40 shrink-0">
                        #{item.serialNo || "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/app/patients/${item.patientId}`}
                          className="font-bold text-xs text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline truncate block"
                          title="View patient history"
                        >
                          {item.patientName}
                        </Link>
                        <span className="text-[10px] text-[#6B7280] block font-mono">
                          {item.patientPhone}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#6B7280] truncate">
                      Dentist: <span className="font-semibold text-[#1C1C1E]">{item.doctorName}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleAdvance(item.id, "in_chair", selectedChairId || undefined)
                      }
                      disabled={processingId === item.id}
                      className="w-full py-1.5 px-3 rounded-lg bg-[#2A5CAA] hover:bg-[#224b8c] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {processingId === item.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Armchair className="w-3 h-3" />
                          <span>Send to Chair</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: In Chair */}
          <div className="bg-[#E8EEF7]/40 rounded-2xl p-3 border border-[#2A5CAA]/30 space-y-3">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold uppercase text-[#2A5CAA] tracking-wider">
                3. In Chair ({getColumnItems("in_chair").length})
              </span>
            </div>

            <div className="space-y-2">
              {getColumnItems("in_chair").length === 0 ? (
                <div className="p-4 text-center text-xs text-[#6B7280] bg-white/50 rounded-xl border border-dashed border-[#2A5CAA]/30">
                  All chairs vacant
                </div>
              ) : (
                getColumnItems("in_chair").map((item) => {
                  const chairName = getChairName(item.chairId);
                  return (
                    <div
                      key={item.id}
                      className="clinical-card p-3 rounded-xl shadow-xs border border-[#2A5CAA]/30 space-y-2.5 bg-white"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-lg bg-[#E8EEF7] text-[#2A5CAA] font-extrabold text-xs flex items-center justify-center font-mono">
                            #{item.serialNo || "?"}
                          </span>
                          {chairName && (
                            <span className="text-[10px] font-semibold text-[#2A5CAA] bg-[#E8EEF7] px-1.5 py-0.5 rounded">
                              {chairName}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8EEF7] text-[#2A5CAA] animate-pulse">
                          Active
                        </span>
                      </div>

                      <div>
                        <Link
                          href={`/app/patients/${item.patientId}`}
                          className="font-bold text-xs text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline truncate block"
                          title="View patient history"
                        >
                          {item.patientName}
                        </Link>
                        <span className="text-[11px] text-[#6B7280] truncate block">
                          Dr. {item.doctorName}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1 border-t border-[#E4E4E7]">
                        <Link
                          href={`/app/prescriptions/new?patientId=${item.patientId}&appointmentId=${item.appointmentId}`}
                          className="w-full py-1.5 px-3 rounded-lg bg-[#F4F4F5] hover:bg-[#E8EEF7] text-[#1C1C1E] hover:text-[#2A5CAA] text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                        >
                          <FileText className="w-3 h-3 text-[#2A5CAA]" />
                          <span>Write Prescription</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleAdvance(item.id, "billing")}
                          disabled={processingId === item.id}
                          className="w-full py-1.5 px-3 rounded-lg bg-[#2A5CAA] hover:bg-[#224b8c] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                        >
                          {processingId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <span>Finish Treatment</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 4: Billing */}
          <div className="bg-[#FFEBEA]/30 rounded-2xl p-3 border border-[#FF453A]/20 space-y-3">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold uppercase text-[#FF453A] tracking-wider">
                4. Billing ({getColumnItems("billing").length})
              </span>
            </div>

            <div className="space-y-2">
              {getColumnItems("billing").length === 0 ? (
                <div className="p-4 text-center text-xs text-[#6B7280] bg-white/50 rounded-xl border border-dashed border-[#FF453A]/30">
                  No bills pending
                </div>
              ) : (
                getColumnItems("billing").map((item) => (
                  <div
                    key={item.id}
                    className="clinical-card p-3 rounded-xl shadow-xs border border-[#E4E4E7] space-y-2 bg-white"
                  >
                    <div>
                      <Link
                        href={`/app/patients/${item.patientId}`}
                        className="font-bold text-xs text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline truncate block"
                        title="View patient history"
                      >
                        {item.patientName}
                      </Link>
                      <span className="text-[10px] text-[#FF453A] font-bold block mt-0.5">
                        Awaiting Front Desk Payment
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <Link
                        href={`/app/billing?patientId=${item.patientId}`}
                        className="w-full py-1.5 px-3 rounded-lg bg-[#2A5CAA] hover:bg-[#224b8c] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Collect Payment</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleAdvance(item.id, "done")}
                        disabled={processingId === item.id}
                        className="w-full py-1.5 px-3 rounded-lg bg-[#F4F4F5] hover:bg-[#E8F8EE] text-[#1C1C1E] hover:text-[#30D158] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                      >
                        {processingId === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-[#30D158]" />
                            <span>Mark Completed</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 5: Done */}
          <div className="bg-[#E8F8EE]/30 rounded-2xl p-3 border border-[#30D158]/30 space-y-3">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold uppercase text-[#30D158] tracking-wider">
                5. Done ({getColumnItems("done").length})
              </span>
            </div>

            <div className="space-y-2">
              {getColumnItems("done").length === 0 ? (
                <div className="p-4 text-center text-xs text-[#6B7280] bg-white/50 rounded-xl border border-dashed border-[#30D158]/30">
                  0 visits completed
                </div>
              ) : (
                getColumnItems("done").map((item) => (
                  <div
                    key={item.id}
                    className="clinical-card p-2.5 rounded-xl shadow-xs border border-[#E4E4E7] bg-white opacity-90 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/app/patients/${item.patientId}`}
                        className="font-bold text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline truncate"
                        title="View patient history"
                      >
                        {item.patientName}
                      </Link>
                      <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0" />
                    </div>
                    <span className="text-[10px] text-[#6B7280] block truncate">
                      Treated by {item.doctorName}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
