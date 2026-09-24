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
  Phone,
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
        toast.success(`Patient checked in! Assigned Serial #${res.serialNo}`);
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
    // Optimistic update
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
        in_chair: "In Dental Chair",
        billing: "Pending Front-Desk Billing",
        done: "Completed Visits",
      };
      toast.success(`Patient moved to ${labels[newStatus] || newStatus}`);
    } catch {
      toast.error("Failed to update patient queue status");
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
        toast.info(res?.message || "No patients currently waiting in lounge");
      }
    } catch {
      toast.error("Failed to call next patient");
    } finally {
      setIsCallingNext(false);
    }
  };

  const getChairName = (chairId?: string | null) => {
    if (!chairId) return null;
    return chairs.find((c) => c.id === chairId)?.name || null;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Queue Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-panel p-5 rounded-3xl border border-[#E4E4E7] shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF2FC] text-[#2A5CAA] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#1C1C1E] tracking-tight">
                Live Chamber Queue
              </h1>
              <p className="text-sm font-medium text-[#4B5563]">
                Manage today&apos;s active patients from booking to chairside treatment and checkout.
              </p>
            </div>
          </div>
        </div>

        {/* Doctor Filters, Chair Selector & Call Next Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Doctor Filter Chips */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F4F4F5] rounded-2xl border border-[#E4E4E7]">
            <button
              onClick={() => setSelectedDoctorFilter("all")}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                selectedDoctorFilter === "all"
                  ? "bg-[#2A5CAA] text-white shadow-xs"
                  : "text-[#4B5563] hover:text-[#1C1C1E] hover:bg-white"
              }`}
            >
              All Dentists
            </button>
            {doctors.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDoctorFilter(d.id)}
                className={`px-3.5 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                  selectedDoctorFilter === d.id
                    ? "bg-[#2A5CAA] text-white shadow-xs"
                    : "text-[#4B5563] hover:text-[#1C1C1E] hover:bg-white"
                }`}
              >
                {d.name} {d.id === currentUserId && "(You)"}
              </button>
            ))}
          </div>

          {/* Chair Selector */}
          {chairs.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E4E4E7] rounded-2xl shadow-xs">
              <Armchair className="w-4 h-4 text-[#2A5CAA]" />
              <select
                value={selectedChairId}
                onChange={(e) => setSelectedChairId(e.target.value)}
                className="bg-transparent text-sm font-bold text-[#1C1C1E] focus:outline-none cursor-pointer pr-2"
              >
                {chairs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Call Next Button - Large & High Visibility */}
          <button
            type="button"
            onClick={handleCallNext}
            disabled={isCallingNext || getColumnItems("waiting").length === 0}
            className="px-5 py-3 rounded-2xl bg-[#30D158] hover:bg-[#28b84d] text-white font-black text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition disabled:opacity-50 cursor-pointer"
          >
            {isCallingNext ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>Call Next Waiting Patient</span>
          </button>

          {/* Workflow Guide Toggle */}
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="p-2.5 rounded-2xl bg-white border border-[#E4E4E7] text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] transition cursor-pointer"
            title="How Queue Works"
          >
            <HelpCircle className="w-5 h-5 text-[#2A5CAA]" />
          </button>
        </div>
      </div>

      {/* Explanatory Patient Journey Banner */}
      {showGuide && (
        <div className="glass-panel p-5 rounded-3xl border border-[#2A5CAA]/20 bg-[#E8EEF7]/40 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 mb-3 text-[#2A5CAA] font-bold text-sm">
            <Info className="w-4 h-4" />
            <span>Dental Chamber 5-Stage Patient Workflow:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-white border border-[#E4E4E7]">
              <span className="font-bold text-[#4B5563] block mb-1">1. Booked Today</span>
              <p className="text-[#6B7280]">
                Patients with appointments today. When they walk in, click <strong>&quot;Check In&quot;</strong> to give them a Serial #.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#FF9F0A]/30">
              <span className="font-bold text-[#FF9F0A] block mb-1">2. Waiting Lounge</span>
              <p className="text-[#6B7280]">
                Patient is seated with a Serial number. Click <strong>&quot;Call to Chair&quot;</strong> or <strong>&quot;Call Next&quot;</strong>.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#2A5CAA]/30">
              <span className="font-bold text-[#2A5CAA] block mb-1">3. In Dental Chair</span>
              <p className="text-[#6B7280]">
                Treatment is underway. Doctor writes prescription and clicks <strong>&quot;Finish Treatment&quot;</strong>.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#FF453A]/30">
              <span className="font-bold text-[#FF453A] block mb-1">4. Front-Desk Billing</span>
              <p className="text-[#6B7280]">
                Patient arrives at receptionist counter. Collect cash / card / bKash and print invoice.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#30D158]/30">
              <span className="font-bold text-[#30D158] block mb-1">5. Completed Visits</span>
              <p className="text-[#6B7280]">
                Treatment finished, payments recorded, and patient record safely archived for the day.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5-Column Kanban Board - Big Cards & Big Serial Numbers */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-5 min-w-[1550px] items-start">
          {/* ================================================================ */}
          {/* Column 1: Booked Today                                           */}
          {/* ================================================================ */}
          <div className="w-[310px] shrink-0 bg-[#F4F4F5] rounded-3xl p-4 border border-[#E4E4E7] space-y-4 shadow-2xs">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center font-mono">
                  1
                </span>
                <span className="text-sm font-extrabold uppercase text-[#4B5563] tracking-wide">
                  Booked Today
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-slate-700 font-black text-xs border border-[#E4E4E7]">
                {getColumnItems("booked").length}
              </span>
            </div>

            <div className="space-y-3">
              {getColumnItems("booked").length === 0 ? (
                <div className="p-6 text-center text-sm font-medium text-[#6B7280] bg-white/60 rounded-2xl border border-dashed border-[#E4E4E7]">
                  No upcoming bookings for today
                </div>
              ) : (
                getColumnItems("booked").map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl shadow-sm border-2 border-[#E4E4E7] space-y-3 hover:border-[#2A5CAA]/50 hover:shadow-md transition bg-white"
                  >
                    {/* Top Row: Time + Patient Card */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#2A5CAA] bg-[#E8EEF7] px-2.5 py-1 rounded-lg font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{item.startTime}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#6B7280] bg-[#F4F4F5] px-2 py-0.5 rounded">
                        Card: {item.patientCard}
                      </span>
                    </div>

                    {/* Patient Name - Big & Legible */}
                    <div>
                      <Link
                        href={`/app/patients/${item.patientId}`}
                        className="font-black text-lg text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline line-clamp-1 block leading-tight"
                        title="View patient history"
                      >
                        {item.patientName}
                      </Link>
                      <div className="flex items-center gap-1 text-sm font-semibold text-[#4B5563] mt-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-[#8E8E93]" />
                        <span>{item.patientPhone}</span>
                      </div>
                    </div>

                    {/* Dentist */}
                    <div className="text-xs font-semibold text-[#4B5563] flex items-center gap-1.5 pt-1 border-t border-[#E4E4E7]/60">
                      <Stethoscope className="w-3.5 h-3.5 text-[#2A5CAA] shrink-0" />
                      <span className="truncate">Dentist: {item.doctorName}</span>
                    </div>

                    {/* Check In Action Button */}
                    <button
                      type="button"
                      onClick={() => handleCheckIn(item.appointmentId)}
                      disabled={processingId === item.appointmentId}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {processingId === item.appointmentId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Check In Patient</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ================================================================ */}
          {/* Column 2: Waiting in Chamber (Big Serial Numbers)                */}
          {/* ================================================================ */}
          <div className="w-[310px] shrink-0 bg-[#FFF7EB]/60 rounded-3xl p-4 border border-[#FF9F0A]/40 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-white font-bold text-xs flex items-center justify-center font-mono">
                  2
                </span>
                <span className="text-sm font-extrabold uppercase text-[#D97706] tracking-wide">
                  Waiting Lounge
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF9F0A] text-white font-black text-xs shadow-2xs">
                {getColumnItems("waiting").length}
              </span>
            </div>

            <div className="space-y-3">
              {getColumnItems("waiting").length === 0 ? (
                <div className="p-6 text-center text-sm font-medium text-[#6B7280] bg-white/70 rounded-2xl border border-dashed border-[#FF9F0A]/30">
                  Lounge is currently empty
                </div>
              ) : (
                getColumnItems("waiting").map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl shadow-sm border-2 border-amber-300/80 space-y-3.5 bg-white hover:shadow-md transition"
                  >
                    {/* Header: BIG SERIAL NUMBER BADGE + Patient Card */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="min-w-13 h-13 px-2.5 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-white font-black text-2xl flex items-center justify-center font-mono shadow-md border border-amber-500">
                          #{item.serialNo || "?"}
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block">
                            Daily Serial
                          </span>
                          <span className="font-mono text-xs font-bold text-[#6B7280]">
                            {item.patientCard}
                          </span>
                        </div>
                      </div>

                      {item.allergyFlags.length > 0 && (
                        <span
                          className="px-2.5 py-1 rounded-lg bg-[#FFEBEA] text-[#FF453A] font-extrabold text-xs uppercase border border-[#FF453A]/30"
                          title={`Allergies: ${item.allergyFlags.join(", ")}`}
                        >
                          Allergy
                        </span>
                      )}
                    </div>

                    {/* Patient Name - Big & Bold */}
                    <div>
                      <Link
                        href={`/app/patients/${item.patientId}`}
                        className="font-black text-lg text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline line-clamp-1 block leading-tight"
                        title="View patient history"
                      >
                        {item.patientName}
                      </Link>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-[#4B5563] mt-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-[#8E8E93]" />
                        <span>{item.patientPhone}</span>
                      </div>
                    </div>

                    {/* Assigned Dentist */}
                    <div className="text-xs font-semibold text-[#4B5563] flex items-center gap-1.5 pt-1.5 border-t border-[#E4E4E7]">
                      <Stethoscope className="w-3.5 h-3.5 text-[#2A5CAA] shrink-0" />
                      <span className="truncate">Dentist: {item.doctorName}</span>
                    </div>

                    {/* Send to Chair Action */}
                    <button
                      type="button"
                      onClick={() =>
                        handleAdvance(item.id, "in_chair", selectedChairId || undefined)
                      }
                      disabled={processingId === item.id}
                      className="w-full py-3 px-4 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-black flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {processingId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Armchair className="w-4 h-4" />
                          <span>Send to Chair Now</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ================================================================ */}
          {/* Column 3: In Dental Chair (Active Treatment)                     */}
          {/* ================================================================ */}
          <div className="w-[310px] shrink-0 bg-[#E8EEF7]/50 rounded-3xl p-4 border border-[#2A5CAA]/40 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#2A5CAA] text-white font-bold text-xs flex items-center justify-center font-mono">
                  3
                </span>
                <span className="text-sm font-extrabold uppercase text-[#2A5CAA] tracking-wide">
                  In Dental Chair
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#2A5CAA] text-white font-black text-xs shadow-2xs animate-pulse">
                {getColumnItems("in_chair").length}
              </span>
            </div>

            <div className="space-y-3">
              {getColumnItems("in_chair").length === 0 ? (
                <div className="p-6 text-center text-sm font-medium text-[#6B7280] bg-white/70 rounded-2xl border border-dashed border-[#2A5CAA]/30">
                  All dental chairs vacant
                </div>
              ) : (
                getColumnItems("in_chair").map((item) => {
                  const chairName = getChairName(item.chairId);
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl shadow-sm border-2 border-[#2A5CAA]/50 space-y-3.5 bg-white hover:shadow-md transition"
                    >
                      {/* Big Serial Badge & Active Chair Tag */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="min-w-13 h-13 px-2.5 rounded-2xl bg-gradient-to-br from-[#2A5CAA] to-[#1E4282] text-white font-black text-2xl flex items-center justify-center font-mono shadow-md border border-[#2A5CAA]">
                            #{item.serialNo || "?"}
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[#2A5CAA] block">
                              Active in Chair
                            </span>
                            <span className="font-mono text-xs font-bold text-[#6B7280]">
                              {item.patientCard}
                            </span>
                          </div>
                        </div>

                        {chairName ? (
                          <span className="px-2.5 py-1 rounded-lg bg-[#EBF2FC] text-[#2A5CAA] font-bold text-xs border border-[#2A5CAA]/30">
                            {chairName}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Patient Name - Big 18px */}
                      <div>
                        <Link
                          href={`/app/patients/${item.patientId}`}
                          className="font-black text-lg text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline line-clamp-1 block leading-tight"
                          title="View patient history"
                        >
                          {item.patientName}
                        </Link>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#4B5563] mt-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-[#8E8E93]" />
                          <span>{item.patientPhone}</span>
                        </div>
                      </div>

                      {/* Dentist */}
                      <div className="text-xs font-semibold text-[#4B5563] flex items-center gap-1.5 pt-1.5 border-t border-[#E4E4E7]">
                        <Stethoscope className="w-3.5 h-3.5 text-[#2A5CAA] shrink-0" />
                        <span className="truncate">Dentist: {item.doctorName}</span>
                      </div>

                      {/* Two Action Buttons: Write RX & Finish Treatment */}
                      <div className="space-y-2 pt-1 border-t border-[#E4E4E7]">
                        <Link
                          href={`/app/prescriptions/new?patientId=${item.patientId}&appointmentId=${item.appointmentId}`}
                          prefetch={true}
                          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#E8EEF7] text-[#2A5CAA] border-2 border-[#2A5CAA]/30 hover:border-[#2A5CAA] text-sm font-bold flex items-center justify-center gap-2 transition"
                        >
                          <FileText className="w-4 h-4 text-[#2A5CAA]" />
                          <span>Write Prescription</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleAdvance(item.id, "billing")}
                          disabled={processingId === item.id}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-black flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          {processingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <span>Finish Treatment → Bill</span>
                              <ArrowRight className="w-4 h-4" />
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

          {/* ================================================================ */}
          {/* Column 4: Front-Desk Billing                                     */}
          {/* ================================================================ */}
          <div className="w-[310px] shrink-0 bg-[#FFEBEA]/40 rounded-3xl p-4 border border-[#FF453A]/30 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FF453A] text-white font-bold text-xs flex items-center justify-center font-mono">
                  4
                </span>
                <span className="text-sm font-extrabold uppercase text-[#DC2626] tracking-wide">
                  Pending Billing
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF453A] text-white font-black text-xs shadow-2xs">
                {getColumnItems("billing").length}
              </span>
            </div>

            <div className="space-y-3">
              {getColumnItems("billing").length === 0 ? (
                <div className="p-6 text-center text-sm font-medium text-[#6B7280] bg-white/70 rounded-2xl border border-dashed border-[#FF453A]/30">
                  No bills awaiting checkout
                </div>
              ) : (
                getColumnItems("billing").map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl shadow-sm border-2 border-rose-300 space-y-3.5 bg-white hover:shadow-md transition"
                  >
                    {/* Header: BIG SERIAL NUMBER + Payment Flag */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="min-w-13 h-13 px-2.5 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white font-black text-2xl flex items-center justify-center font-mono shadow-md border border-rose-500">
                          #{item.serialNo || "?"}
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">
                            Billing Counter
                          </span>
                          <span className="font-mono text-xs font-bold text-[#6B7280]">
                            {item.patientCard}
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-xs uppercase">
                        Unpaid
                      </span>
                    </div>

                    {/* Patient Name - Big & Readable */}
                    <div>
                      <Link
                        href={`/app/patients/${item.patientId}`}
                        className="font-black text-lg text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline line-clamp-1 block leading-tight"
                        title="View patient history"
                      >
                        {item.patientName}
                      </Link>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-[#4B5563] mt-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-[#8E8E93]" />
                        <span>{item.patientPhone}</span>
                      </div>
                    </div>

                    {/* Action: Collect Payment & Invoice */}
                    <div className="space-y-2 pt-2 border-t border-[#E4E4E7]">
                      <Link
                        href={`/app/billing/new?patientId=${item.patientId}&appointmentId=${item.appointmentId}`}
                        className="w-full py-3 px-4 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-black flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                      >
                        <CreditCard className="w-4.5 h-4.5" />
                        <span>Collect Payment &amp; Invoice →</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleAdvance(item.id, "done")}
                        disabled={processingId === item.id}
                        className="w-full py-2 px-3 rounded-xl bg-[#F4F4F5] hover:bg-emerald-50 text-[#4B5563] hover:text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                      >
                        {processingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Mark Completed Without Bill</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ================================================================ */}
          {/* Column 5: Completed Visits                                       */}
          {/* ================================================================ */}
          <div className="w-[310px] shrink-0 bg-[#E8F8EE]/50 rounded-3xl p-4 border border-[#30D158]/40 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center font-mono">
                  5
                </span>
                <span className="text-sm font-extrabold uppercase text-emerald-800 tracking-wide">
                  Completed Today
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-xs shadow-2xs">
                {getColumnItems("done").length}
              </span>
            </div>

            <div className="space-y-3">
              {getColumnItems("done").length === 0 ? (
                <div className="p-6 text-center text-sm font-medium text-[#6B7280] bg-white/70 rounded-2xl border border-dashed border-[#30D158]/30">
                  0 visits finalized today
                </div>
              ) : (
                getColumnItems("done").map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl shadow-xs border border-emerald-200/80 bg-white space-y-2 opacity-95"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center font-mono">
                          #{item.serialNo || "✓"}
                        </span>
                        <Link
                          href={`/app/patients/${item.patientId}`}
                          className="font-bold text-base text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline truncate"
                          title="View patient history"
                        >
                          {item.patientName}
                        </Link>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-[#30D158] shrink-0" />
                    </div>
                    <div className="text-xs font-medium text-[#6B7280] truncate pl-10">
                      Treated by {item.doctorName}
                    </div>
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
