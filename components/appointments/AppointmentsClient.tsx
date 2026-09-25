"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  FileText,
  Search,
  ExternalLink,
  Check,
} from "lucide-react";
import { formatBdt } from "@/lib/utils";
import {
  updateAppointmentStatusAction,
  advanceAppointmentQueueAction,
} from "@/app/(tenant)/app/appointments/actions";
import { toast } from "sonner";

interface AppointmentItem {
  id: string;
  appointmentCode: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  queueStatus?: "booked" | "waiting" | "in_chair" | "billing" | "done" | null;
  isOverbooked: boolean;
  notes: string | null;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientCard: string;
  patientAllergies: string[];
  patientConditions: string[];
  doctorId: string;
  doctorName: string;
  chairName: string | null;
  services: {
    serviceName: string;
    durationMinutes: number;
    priceBdt: number;
  }[];
}

interface DoctorItem {
  id: string;
  name: string;
}

interface Props {
  initialDate: string; // YYYY-MM-DD
  doctors: DoctorItem[];
  appointments: AppointmentItem[];
}

export default function AppointmentsClient({
  initialDate,
  doctors,
  appointments,
}: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  function handleDateChange(newDate: string) {
    setSelectedDate(newDate);
    router.push(`/app/appointments?date=${newDate}`);
  }

  function shiftDate(days: number) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    dateObj.setUTCDate(dateObj.getUTCDate() + days);
    const nextStr = dateObj.toISOString().split("T")[0];
    handleDateChange(nextStr);
  }

  const filteredAppointments = appointments.filter((apt) => {
    if (selectedDoctorId !== "all" && apt.doctorId !== selectedDoctorId) {
      return false;
    }
    if (statusFilter !== "all" && apt.status !== statusFilter) {
      return false;
    }
    return true;
  });

  async function handleStatusUpdate(
    appointmentId: string,
    newStatus: "pending" | "confirmed" | "completed" | "cancelled" | "no_show",
    reason?: string
  ) {
    try {
      setIsUpdating(true);
      await updateAppointmentStatusAction(appointmentId, newStatus, reason);
      toast.success(`Appointment marked as ${newStatus}`);
      router.refresh();
      setCancellingId(null);
      setCancelReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update appointment status");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleQueueAdvance(
    appointmentId: string,
    target: "waiting" | "in_chair" | "done"
  ) {
    try {
      setIsUpdating(true);
      await advanceAppointmentQueueAction(appointmentId, target);
      const label =
        target === "waiting"
          ? "Patient Checked-In"
          : target === "in_chair"
          ? "Seated in Chair"
          : "Treatment Completed";
      toast.success(label);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update queue");
    } finally {
      setIsUpdating(false);
    }
  }

  function formatTime(isoStr: string) {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Dhaka",
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Date Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Appointments &amp; Schedule
          </h1>
          <p className="text-sm text-[#6B7280]">
            Manage doctor rosters, booked sessions, and chair allocations.
          </p>
        </div>

          <div className="flex items-center gap-3">
          {/* Date Picker & Controls */}
          <div className="flex items-center bg-white border border-[#E4E4E7] rounded-2xl p-1.5 shadow-2xs">
            <button
              onClick={() => shiftDate(-1)}
              className="p-2 hover:bg-[#F4F4F5] rounded-xl text-[#6B7280] transition cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-1 text-sm font-bold text-[#1C1C1E] bg-transparent outline-none cursor-pointer font-mono"
            />
            <button
              onClick={() => shiftDate(1)}
              className="p-2 hover:bg-[#F4F4F5] rounded-xl text-[#6B7280] transition cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <Link
            href="/app/appointments/new"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-bold shadow-md transition cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Book Appointment</span>
          </Link>
        </div>
      </div>

      {/* Filters Bar: Doctors and Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-[#E4E4E7] shadow-2xs">
        {/* Doctor filter tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedDoctorId("all")}
            className={`px-3.5 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
              selectedDoctorId === "all"
                ? "bg-[#2A5CAA] text-white shadow-xs"
                : "bg-white/60 text-[#4B5563] hover:bg-white border border-transparent hover:border-[#E4E4E7]"
            }`}
          >
            All Dentists ({appointments.length})
          </button>
          {doctors.map((doc) => {
            const count = appointments.filter((a) => a.doctorId === doc.id).length;
            return (
              <button
                key={doc.id}
                onClick={() => setSelectedDoctorId(doc.id)}
                className={`px-3.5 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                  selectedDoctorId === doc.id
                    ? "bg-[#2A5CAA] text-white shadow-xs"
                    : "bg-white/60 text-[#4B5563] hover:bg-white border border-transparent hover:border-[#E4E4E7]"
                }`}
              >
                {doc.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Status filter buttons */}
        <div className="flex items-center gap-1.5 bg-[#F4F4F5] p-1.5 rounded-2xl text-sm">
          {["all", "confirmed", "completed", "pending", "cancelled"].map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-bold capitalize transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-white text-[#1C1C1E] shadow-2xs"
                    : "text-[#6B7280] hover:text-[#1C1C1E]"
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl border border-[#E4E4E7] shadow-2xs">
            <CalendarIcon className="w-12 h-12 text-[#A1A1AA] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#1C1C1E]">
              No Appointments Found
            </h3>
            <p className="text-sm text-[#6B7280] mt-1 max-w-sm mx-auto">
              There are no appointments scheduled matching your current date and filter selection.
            </p>
            <Link
              href="/app/appointments/new"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-bold shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule New Appointment</span>
            </Link>
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const hasAlerts =
              apt.patientAllergies.length > 0 ||
              apt.patientConditions.length > 0;

            return (
              <div
                key={apt.id}
                className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] hover:border-[#2A5CAA]/40 transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 shadow-2xs"
              >
                {/* Left: Time and Patient Info */}
                <div className="flex items-start gap-4">
                  {/* Time Badge */}
                  <div className="min-w-[110px] text-center p-3 rounded-2xl bg-[#F4F4F5] border border-[#E4E4E7]">
                    <span className="text-sm font-black text-[#1C1C1E] block">
                      {formatTime(apt.startTime)}
                    </span>
                    <span className="text-xs text-[#6B7280] font-semibold block mt-0.5">
                      to {formatTime(apt.endTime)}
                    </span>
                  </div>

                  {/* Patient Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        href={`/app/patients/${apt.patientId}`}
                        className="font-black text-base text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline flex items-center gap-1.5"
                      >
                        <span>{apt.patientName}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#A1A1AA]" />
                      </Link>

                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-[#EBF2FC] text-[#2A5CAA] font-bold">
                        {apt.patientCard}
                      </span>

                      <span className="text-sm font-mono font-semibold text-[#4B5563]">
                        {apt.patientPhone}
                      </span>

                      {/* Overbooked Badge */}
                      {apt.isOverbooked && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FFEBEA] text-[#FF453A] border border-[#FF453A]/20">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Overbooked</span>
                        </span>
                      )}

                      {/* Status Badge */}
                      <span
                        className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                          apt.status === "completed"
                            ? "bg-[#E8F8EE] text-[#30D158]"
                            : apt.status === "confirmed"
                            ? "bg-[#EBF2FC] text-[#2A5CAA]"
                            : apt.status === "pending"
                            ? "bg-[#FFF7EB] text-[#FF9F0A]"
                            : apt.status === "cancelled"
                            ? "bg-[#FFEBEA] text-[#FF453A]"
                            : "bg-[#F4F4F5] text-[#6B7280]"
                        }`}
                      >
                        {apt.status}
                      </span>

                      {/* Queue Status Badge if in chair */}
                      {apt.queueStatus === "in_chair" && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EBF2FC] text-[#2A5CAA]">
                          In Chair
                        </span>
                      )}
                      {apt.queueStatus === "waiting" && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FFF7EB] text-[#FF9F0A]">
                          Waiting in Chamber
                        </span>
                      )}
                    </div>

                    {/* Services & Doctor & Chair */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[#4B5563]">
                      <span className="font-semibold text-[#1C1C1E]">
                        Dr: {apt.doctorName}
                      </span>
                      {apt.chairName && (
                        <span>• Chair: {apt.chairName}</span>
                      )}
                      <span>
                        • Services:{" "}
                        {apt.services.map((s) => s.serviceName).join(", ") ||
                          "General Consultation"}
                      </span>
                    </div>

                    {/* Alerts if any */}
                    {hasAlerts && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {apt.patientAllergies.map((all) => (
                          <span
                            key={all}
                            className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#FFEBEA] text-[#FF453A] border border-[#FF453A]/20"
                          >
                            Allergy: {all}
                          </span>
                        ))}
                        {apt.patientConditions.map((cond) => (
                          <span
                            key={cond}
                            className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-[#FFF7EB] text-[#FF9F0A] border border-[#FF9F0A]/20"
                          >
                            {cond}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end lg:self-center">
                  {/* If pending from public booking */}
                  {apt.status === "pending" && (
                    <button
                      onClick={() => handleStatusUpdate(apt.id, "confirmed")}
                      disabled={isUpdating}
                      className="px-4 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm Booking</span>
                    </button>
                  )}

                  {/* If confirmed and not yet checked in */}
                  {apt.status === "confirmed" && (!apt.queueStatus || apt.queueStatus === "booked") && (
                    <button
                      onClick={() => handleQueueAdvance(apt.id, "waiting")}
                      disabled={isUpdating}
                      className="px-4 py-2.5 rounded-xl bg-[#FFF7EB] hover:bg-[#FFEECB] text-[#FF9F0A] text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Check-In</span>
                    </button>
                  )}

                  {/* If waiting in queue */}
                  {apt.queueStatus === "waiting" && (
                    <button
                      onClick={() => handleQueueAdvance(apt.id, "in_chair")}
                      disabled={isUpdating}
                      className="px-4 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Play className="w-4 h-4" />
                      <span>Seat in Chair</span>
                    </button>
                  )}

                  {/* If in chair */}
                  {apt.queueStatus === "in_chair" && (
                    <div className="flex items-center gap-2">
                      {apt.patientId ? (
                        <Link
                          href={`/app/prescriptions/new?patientId=${apt.patientId}&appointmentId=${apt.id}`}
                          className="px-4 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Prescribe</span>
                        </Link>
                      ) : null}
                      <button
                        onClick={() => handleQueueAdvance(apt.id, "done")}
                        disabled={isUpdating}
                        className="px-4 py-2.5 rounded-xl bg-[#E8F8EE] hover:bg-[#D4F4DF] text-[#30D158] text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Complete</span>
                      </button>
                    </div>
                  )}

                  {apt.status !== "completed" && apt.status !== "cancelled" && (
                    <button
                      onClick={() => setCancellingId(apt.id)}
                      disabled={isUpdating}
                      className="p-2 rounded-xl hover:bg-[#FFEBEA] text-[#6B7280] hover:text-[#FF453A] transition cursor-pointer"
                      title="Cancel Appointment"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cancellation Dialog Modal */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#1C1C1E]">
              Cancel Appointment
            </h3>
            <p className="text-xs text-[#6B7280]">
              Please provide a cancellation reason for the patient audit log.
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Patient called to reschedule, emergency, etc."
              rows={3}
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setCancellingId(null);
                  setCancelReason("");
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6B7280] hover:bg-[#F4F4F5]"
              >
                Back
              </button>
              <button
                onClick={() =>
                  handleStatusUpdate(cancellingId, "cancelled", cancelReason)
                }
                disabled={isUpdating}
                className="px-4 py-1.5 rounded-xl bg-[#FF453A] hover:bg-[#D9382F] text-white text-xs font-bold shadow-xs transition"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
