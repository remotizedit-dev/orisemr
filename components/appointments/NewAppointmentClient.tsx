"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  Search,
  Check,
  AlertTriangle,
  Plus,
  ArrowLeft,
  Loader2,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatBdt } from "@/lib/utils";
import {
  getStaffSlotsAction,
  createStaffAppointmentAction,
  searchPatientsForBookingAction,
} from "@/app/(tenant)/app/appointments/actions";

interface Doctor {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceBdt: number;
  category: string;
}

interface Chair {
  id: string;
  name: string;
}

interface Props {
  doctors: Doctor[];
  services: Service[];
  chairs: Chair[];
  initialPatientId?: string;
  initialPatientName?: string;
  initialPatientCard?: string;
}

interface PatientMatch {
  id: string;
  name: string;
  phone: string;
  cardNumber: string;
}

export default function NewAppointmentClient({
  doctors,
  services,
  chairs,
  initialPatientId,
  initialPatientName,
  initialPatientCard,
}: Props) {
  const router = useRouter();

  // Patient state
  const [patientQuery, setPatientQuery] = useState(initialPatientName || "");
  const [patientResults, setPatientResults] = useState<PatientMatch[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientMatch | null>(
    initialPatientId
      ? {
          id: initialPatientId,
          name: initialPatientName || "",
          phone: "",
          cardNumber: initialPatientCard || "",
        }
      : null
  );

  // Booking details
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("any");
  const [selectedChairId, setSelectedChairId] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  });
  const [notes, setNotes] = useState("");

  // Slots state
  const [availableSlots, setAvailableSlots] = useState<
    {
      time: string;
      displayTime: string;
      startTime: string;
      endTime: string;
      doctorId: string;
    }[]
  >([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    startTime: string;
    endTime: string;
    doctorId: string;
  } | null>(null);

  // Overbooking override
  const [isOverbookingModalOpen, setIsOverbookingModalOpen] = useState(false);
  const [customStartTime, setCustomStartTime] = useState("10:00");
  const [customEndTime, setCustomEndTime] = useState("10:30");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Total Duration
  const totalDuration = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((acc, s) => acc + s.durationMinutes, 0);

  // Total Estimated Price
  const totalEstimatedPrice = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((acc, s) => acc + s.priceBdt, 0);

  // Search patients debounced
  useEffect(() => {
    if (!patientQuery || selectedPatient) {
      setPatientResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPatient(true);
      try {
        const res = await searchPatientsForBookingAction(patientQuery);
        setPatientResults(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingPatient(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [patientQuery, selectedPatient]);

  // Auto fetch slots when date, doctor, or services change
  useEffect(() => {
    if (totalDuration > 0 && selectedDate) {
      loadSlots();
    } else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedDate, selectedDoctorId, selectedServices]);

  async function loadSlots() {
    setIsLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await getStaffSlotsAction({
        dateStr: selectedDate,
        durationMinutes: totalDuration,
        doctorId: selectedDoctorId,
      });
      setAvailableSlots(res.slots || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load slots");
    } finally {
      setIsLoadingSlots(false);
    }
  }

  function toggleService(serviceId: string) {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter((id) => id !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  }

  async function handleBook(isOverbooked: boolean = false) {
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }
    if (selectedServices.length === 0) {
      toast.error("Please select at least one dental service");
      return;
    }

    let startTime = selectedSlot?.startTime;
    let endTime = selectedSlot?.endTime;
    let docId = selectedSlot?.doctorId;

    if (isOverbooked) {
      // Use custom time on selected date
      const [sh, sm] = customStartTime.split(":").map(Number);
      const [eh, em] = customEndTime.split(":").map(Number);
      const [y, m, d] = selectedDate.split("-").map(Number);

      const sDate = new Date(Date.UTC(y, m - 1, d, sh, sm, 0));
      const eDate = new Date(Date.UTC(y, m - 1, d, eh, em, 0));

      startTime = sDate.toISOString();
      endTime = eDate.toISOString();
      docId = selectedDoctorId === "any" ? doctors[0]?.id : selectedDoctorId;
    }

    if (!startTime || !endTime || !docId) {
      toast.error("Please pick an available slot or use Overbook Override");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createStaffAppointmentAction({
        patientId: selectedPatient.id,
        doctorId: docId,
        chairId: selectedChairId || undefined,
        dateStr: selectedDate,
        startTime,
        endTime,
        serviceIds: selectedServices,
        isOverbooked,
        notes,
      });

      if (res.error === "OVERLAP") {
        setIsOverbookingModalOpen(true);
        return;
      }

      toast.success("Appointment successfully scheduled!");
      router.push(`/app/appointments?date=${selectedDate}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to book appointment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/app/appointments"
            className="p-2 rounded-xl bg-white border border-[#E4E4E7] text-[#6B7280] hover:text-[#1C1C1E] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-[#1C1C1E] tracking-tight">
              Schedule Appointment
            </h1>
            <p className="text-xs text-[#6B7280]">
              Slot calculation engine with double-booking prevention &amp; overbooking override.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Patient & Services */}
        <div className="md:col-span-2 space-y-5">
          {/* Step 1: Select Patient */}
          <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#2A5CAA]" />
                <span>1. Select Patient</span>
              </span>
              <Link
                href="/app/patients/new"
                className="text-xs font-bold text-[#2A5CAA] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Quick Register New</span>
              </Link>
            </div>

            {selectedPatient ? (
              <div className="p-3 rounded-xl bg-[#EBF2FC] border border-[#2A5CAA]/20 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-[#1C1C1E] block">
                    {selectedPatient.name}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                    <span className="font-mono">{selectedPatient.cardNumber}</span>
                    {selectedPatient.phone && <span>• {selectedPatient.phone}</span>}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientQuery("");
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-[#FF453A] hover:bg-white rounded-lg transition"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#A1A1AA]" />
                <input
                  type="text"
                  placeholder="Search by name, 01XXXXXXXXX phone, or card number..."
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
                {isSearchingPatient && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-3 text-[#6B7280]" />
                )}

                {patientResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-12 bg-white rounded-xl shadow-xl border border-[#E4E4E7] z-20 max-h-52 overflow-y-auto divide-y divide-[#E4E4E7]">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientQuery(p.name);
                          setPatientResults([]);
                        }}
                        className="w-full p-2.5 text-left hover:bg-[#F4F4F5] transition flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-xs text-[#1C1C1E] block">
                            {p.name}
                          </span>
                          <span className="text-[11px] text-[#6B7280]">
                            {p.phone}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-[#2A5CAA] bg-[#EBF2FC] px-2 py-0.5 rounded-md">
                          {p.cardNumber}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Select Services */}
          <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-[#2A5CAA]" />
                <span>2. Select Dental Procedures</span>
              </span>
              <span className="text-xs font-semibold text-[#6B7280]">
                Duration:{" "}
                <strong className="text-[#1C1C1E]">{totalDuration} mins</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {services.map((s) => {
                const isSelected = selectedServices.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleService(s.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-start justify-between ${
                      isSelected
                        ? "bg-[#EBF2FC] border-[#2A5CAA] text-[#1C1C1E]"
                        : "bg-white border-[#E4E4E7] hover:border-[#2A5CAA]/40 text-[#6B7280]"
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs block text-[#1C1C1E]">
                        {s.name}
                      </span>
                      <span className="text-[10px] text-[#6B7280]">
                        {s.durationMinutes} min • {formatBdt(s.priceBdt)}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#2A5CAA] shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Available Slots */}
          <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#2A5CAA]" />
                <span>3. Select Time Slot</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOverbookingModalOpen(true)}
                className="text-xs font-semibold text-[#FF9F0A] hover:underline flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Overbook Slot</span>
              </button>
            </div>

            {totalDuration === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center">
                Please select at least one procedure above to calculate available slots.
              </p>
            ) : isLoadingSlots ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#2A5CAA]" />
                <span className="text-xs text-[#6B7280]">
                  Calculating non-overlapping doctor windows...
                </span>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-[#FF453A] font-semibold">
                  No consecutive {totalDuration}-minute slots available on this date.
                </p>
                <button
                  type="button"
                  onClick={() => setIsOverbookingModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#FFF7EB] text-[#FF9F0A] text-xs font-bold hover:bg-[#FFEECB] transition"
                >
                  Force Overbook with Custom Time
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                {availableSlots.map((slot) => {
                  const isSelected =
                    selectedSlot?.startTime === slot.startTime &&
                    selectedSlot?.doctorId === slot.doctorId;

                  return (
                    <button
                      key={`${slot.startTime}-${slot.doctorId}`}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2 rounded-xl border text-center transition ${
                        isSelected
                          ? "bg-[#2A5CAA] text-white border-[#2A5CAA] shadow-xs"
                          : "bg-white border-[#E4E4E7] hover:border-[#2A5CAA] text-[#1C1C1E]"
                      }`}
                    >
                      <span className="font-extrabold text-xs block">
                        {slot.displayTime}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preferences & Summary */}
        <div className="space-y-5">
          <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-4">
            <h3 className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider">
              Booking Preferences
            </h3>

            {/* Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6B7280]">
                Appointment Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white"
              />
            </div>

            {/* Doctor Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6B7280]">
                Attending Dentist
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white"
              >
                <option value="any">Any Available Dentist (Auto)</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chair Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6B7280]">
                Dental Chair
              </label>
              <select
                value={selectedChairId}
                onChange={(e) => setSelectedChairId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white"
              >
                <option value="">Auto Assign / Any Chair</option>
                {chairs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6B7280]">
                Staff Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special medical conditions, requested tools, etc."
                className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white"
              />
            </div>

            {/* Summary */}
            <div className="pt-3 border-t border-[#E4E4E7] space-y-2 text-xs">
              <div className="flex justify-between text-[#6B7280]">
                <span>Est. Duration:</span>
                <span className="font-bold text-[#1C1C1E]">
                  {totalDuration} mins
                </span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Est. Service Cost:</span>
                <span className="font-bold text-[#2A5CAA]">
                  {formatBdt(totalEstimatedPrice)}
                </span>
              </div>
            </div>

            {/* Book Button */}
            <button
              type="button"
              onClick={() => handleBook(false)}
              disabled={isSubmitting || !selectedPatient || !selectedSlot}
              className="w-full py-3 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-bold text-xs shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Confirm &amp; Book Appointment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overbooking Override Dialog Modal */}
      {isOverbookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-[#FF9F0A]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-[#1C1C1E]">
                Overbooking Override
              </h3>
            </div>
            <p className="text-xs text-[#6B7280]">
              You are manually scheduling an appointment outside default calculated slot windows or over an existing slot. This appointment will be tagged with{" "}
              <strong className="text-[#FF453A]">is_overbooked: true</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                  Start Time (24h)
                </label>
                <input
                  type="time"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                  End Time (24h)
                </label>
                <input
                  type="time"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOverbookingModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6B7280] hover:bg-[#F4F4F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOverbookingModalOpen(false);
                  handleBook(true);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#FF9F0A] hover:bg-[#E08B07] text-white text-xs font-bold shadow-xs transition"
              >
                Confirm Overbooking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
