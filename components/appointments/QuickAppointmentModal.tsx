"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  User,
  Search,
  Check,
  Plus,
  X,
  Loader2,
  Stethoscope,
  Sparkles,
  AlertTriangle,
  Armchair,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { formatBdt, formatBdPhone, formatDhakaTime, formatDhakaDate } from "@/lib/utils";
import {
  getStaffSlotsAction,
  createStaffAppointmentAction,
  searchPatientsForBookingAction,
  getBookingFormDataAction,
} from "@/app/(tenant)/app/appointments/actions";
import { QuickRegisterPatientModal } from "@/components/patients/QuickRegisterPatientModal";

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

interface PatientMatch {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  cardNumber: string;
}

interface QuickAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPatient?: PatientMatch | null;
  doctors?: Doctor[];
  services?: Service[];
  chairs?: Chair[];
}

export function QuickAppointmentModal({
  isOpen,
  onClose,
  preselectedPatient = null,
  doctors: initialDoctors,
  services: initialServices,
  chairs: initialChairs,
}: QuickAppointmentModalProps) {
  const router = useRouter();

  // Reference data state
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors || []);
  const [services, setServices] = useState<Service[]>(initialServices || []);
  const [chairs, setChairs] = useState<Chair[]>(initialChairs || []);
  const [isLoadingRefData, setIsLoadingRefData] = useState(false);

  // Patient state
  const [selectedPatient, setSelectedPatient] = useState<PatientMatch | null>(preselectedPatient);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<PatientMatch[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);

  // Booking details
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("any");
  const [selectedChairId, setSelectedChairId] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
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

  // Urgent overbooking override
  const [isOverbooking, setIsOverbooking] = useState(false);
  const [customStartTime, setCustomStartTime] = useState("10:00");
  const [customEndTime, setCustomEndTime] = useState("10:30");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check-in immediately toggle (for today's bookings)
  const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [checkInImmediately, setCheckInImmediately] = useState(false);

  // Sync preselected patient
  useEffect(() => {
    if (isOpen) {
      if (preselectedPatient) {
        setSelectedPatient(preselectedPatient);
      }
    }
  }, [isOpen, preselectedPatient]);

  // Load reference data if not passed in props
  useEffect(() => {
    if (!isOpen) return;

    if (!doctors.length || !services.length) {
      setIsLoadingRefData(true);
      getBookingFormDataAction()
        .then((data) => {
          setDoctors(data.doctors);
          setServices(data.services);
          setChairs(data.chairs);
          if (data.services.length > 0 && selectedServices.length === 0) {
            setSelectedServices([data.services[0].id]);
          }
        })
        .catch((err) => console.error("Failed to load booking reference data", err))
        .finally(() => setIsLoadingRefData(false));
    } else if (services.length > 0 && selectedServices.length === 0) {
      setSelectedServices([services[0].id]);
    }
  }, [isOpen]);

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

  // Total Duration
  const totalDuration = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((acc, s) => acc + s.durationMinutes, 0);

  // Total Estimated Price
  const totalEstimatedPrice = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((acc, s) => acc + s.priceBdt, 0);

  const filteredServices = useMemo(() => {
    if (!serviceSearchQuery.trim()) return services;
    const q = serviceSearchQuery.toLowerCase().trim();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [services, serviceSearchQuery]);

  // Auto fetch slots when date, doctor, or services change
  useEffect(() => {
    if (!isOpen) return;

    if (totalDuration > 0 && selectedDate && !isOverbooking) {
      loadSlots();
    } else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [isOpen, selectedDate, selectedDoctorId, selectedServices, isOverbooking, totalDuration]);

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
      if (res.slots && res.slots.length > 0) {
        setSelectedSlot({
          startTime: res.slots[0].startTime,
          endTime: res.slots[0].endTime,
          doctorId: res.slots[0].doctorId,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load slots");
    } finally {
      setIsLoadingSlots(false);
    }
  }

  function toggleService(serviceId: string) {
    if (selectedServices.includes(serviceId)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter((id) => id !== serviceId));
      } else {
        toast.info("Please keep at least one service selected");
      }
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  }

  async function handleBook() {
    if (!selectedPatient) {
      toast.error("Please select or register a patient");
      return;
    }
    if (selectedServices.length === 0) {
      toast.error("Please select at least one dental service");
      return;
    }

    let startTime = selectedSlot?.startTime;
    let endTime = selectedSlot?.endTime;
    let docId = selectedSlot?.doctorId;

    if (isOverbooking) {
      // Use custom time on selected date in Asia/Dhaka (+06:00)
      const sDate = new Date(`${selectedDate}T${customStartTime}:00+06:00`);
      const eDate = new Date(`${selectedDate}T${customEndTime}:00+06:00`);

      startTime = sDate.toISOString();
      endTime = eDate.toISOString();
      docId = selectedDoctorId === "any" ? doctors[0]?.id : selectedDoctorId;
    }

    if (!startTime || !endTime || !docId) {
      toast.error("Please select an available appointment time slot");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createStaffAppointmentAction({
        patientId: selectedPatient.id,
        doctorId: docId,
        chairId: selectedChairId || undefined,
        dateStr: selectedDate,
        startTime,
        endTime,
        serviceIds: selectedServices,
        patientEmail: selectedPatient.email || undefined,
        isOverbooked: isOverbooking,
        notes: notes.trim() || undefined,
        checkInImmediately: selectedDate === todayDhakaStr && checkInImmediately,
      });

      if (res?.error === "OVERLAP") {
        toast.warning(res.message);
        setIsOverbooking(true);
        setIsSubmitting(false);
        return;
      }

      if (res?.success) {
        if (res.serialNo) {
          toast.success(`Appointment #${res.appointmentCode} booked & patient checked in with Daily Serial #${res.serialNo}!`);
        } else {
          toast.success(`Appointment #${res.appointmentCode} booked successfully!`);
        }
        router.refresh();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to book appointment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 360, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E4E4E7] overflow-hidden flex flex-col max-h-[92vh]"
            role="dialog"
            aria-modal="true"
          >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between bg-gradient-to-r from-emerald-50/70 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1C1C1E]">
                Book New Appointment
              </h3>
              <p className="text-xs text-[#6B7280]">
                Live chairside scheduling with instant slot checking
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isLoadingRefData ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-sm text-[#6B7280]">
              <Loader2 className="w-6 h-6 animate-spin text-[#2A5CAA]" />
              <span>Loading clinic services &amp; doctors...</span>
            </div>
          ) : (
            <>
              {/* Step 1: Patient Selection */}
              <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E4E4E7] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#2A5CAA]" />
                    <span>Patient</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsQuickRegisterOpen(true)}
                    className="text-xs font-bold text-[#2A5CAA] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Quick Register New</span>
                  </button>
                </div>

                {selectedPatient ? (
                  <div className="p-3.5 rounded-xl bg-white border border-[#2A5CAA]/30 flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="font-extrabold text-sm text-[#1C1C1E] block">
                        {selectedPatient.name}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                        <span className="font-mono font-semibold text-[#2A5CAA]">
                          {selectedPatient.cardNumber}
                        </span>
                        {selectedPatient.phone && (
                          <span>• {formatBdPhone(selectedPatient.phone)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatient(null);
                        setPatientQuery("");
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      placeholder="Type patient name, phone (01X...), or card number..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E4E4E7] rounded-xl text-[#1C1C1E] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#2A5CAA]/20 transition"
                    />

                    {isSearchingPatient && (
                      <Loader2 className="w-4 h-4 text-[#2A5CAA] animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                    )}

                    {/* Results Dropdown */}
                    {patientResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E4E4E7] rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-[#E4E4E7]/60 max-h-52 overflow-y-auto">
                        {patientResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientResults([]);
                              setPatientQuery("");
                            }}
                            className="w-full p-3 text-left hover:bg-[#F4F4F5] transition flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-sm text-[#1C1C1E] block">
                                {p.name}
                              </span>
                              <span className="text-xs text-[#6B7280]">
                                {formatBdPhone(p.phone)}
                              </span>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#2A5CAA] bg-[#E8EEF7] px-2 py-0.5 rounded-md">
                              {p.cardNumber}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Dental Service Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2A5CAA]" />
                    <span>Select Dental Service(s)</span>
                  </label>
                  <span className="text-xs font-extrabold text-[#2A5CAA]">
                    {totalDuration} mins • ৳{totalEstimatedPrice.toLocaleString()}
                  </span>
                </div>

                {/* Procedure Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={serviceSearchQuery}
                    onChange={(e) => setServiceSearchQuery(e.target.value)}
                    placeholder="Search procedures by name or category..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-[#E4E4E7] rounded-xl text-[#1C1C1E] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2A5CAA] focus:ring-1 focus:ring-[#2A5CAA]/20 transition"
                  />
                  {serviceSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setServiceSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1C1C1E] p-0.5 rounded-full cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {filteredServices.length === 0 ? (
                  <p className="text-xs text-[#6B7280] py-3 text-center">
                    No procedures match &quot;{serviceSearchQuery}&quot;
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                    {filteredServices.map((s) => {
                      const isSelected = selectedServices.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleService(s.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? "bg-[#2A5CAA] text-white border-[#2A5CAA] shadow-2xs"
                              : "bg-white text-[#4B5563] border-[#E4E4E7] hover:border-[#2A5CAA]/40"
                          }`}
                        >
                          <span>{s.name}</span>
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded-md ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-[#F4F4F5] text-[#6B7280]"
                            }`}
                          >
                            {s.durationMinutes}m
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Doctor & Date & Chair */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Doctor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1E] flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-[#2A5CAA]" />
                    <span>Dentist</span>
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-[#E4E4E7] rounded-xl text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA]"
                  >
                    <option value="any">Any Available Dentist</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1E] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#2A5CAA]" />
                    <span>Date</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-[#E4E4E7] rounded-xl text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA]"
                  />
                </div>

                {/* Chair */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1E] flex items-center gap-1">
                    <Armchair className="w-3.5 h-3.5 text-[#2A5CAA]" />
                    <span>Chair</span>
                  </label>
                  <select
                    value={selectedChairId}
                    onChange={(e) => setSelectedChairId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-[#E4E4E7] rounded-xl text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA]"
                  >
                    <option value="">Any Dental Chair</option>
                    {chairs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 4: Time Slot Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#2A5CAA]" />
                    <span>Available Time Slot</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsOverbooking(!isOverbooking)}
                    className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>{isOverbooking ? "Use Auto Slots" : "Urgent Walk-in / Custom Time"}</span>
                  </button>
                </div>

                {isOverbooking ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-2 animate-in fade-in">
                    <span className="font-bold text-amber-900 block">
                      Custom Appointment Time (Overbooking Override)
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-[#6B7280] block mb-1">Start Time</span>
                        <input
                          type="time"
                          value={customStartTime}
                          onChange={(e) => setCustomStartTime(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-[#1C1C1E]"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-[#6B7280] block mb-1">End Time</span>
                        <input
                          type="time"
                          value={customEndTime}
                          onChange={(e) => setCustomEndTime(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-[#1C1C1E]"
                        />
                      </div>
                    </div>
                  </div>
                ) : isLoadingSlots ? (
                  <div className="p-4 rounded-xl border border-dashed border-[#E4E4E7] text-center text-xs text-[#6B7280] flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2A5CAA]" />
                    <span>Calculating available doctor slots...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#FAFAFA] border border-dashed border-[#E4E4E7] text-center text-xs text-[#6B7280]">
                    No open regular slots on this date. Click &quot;Urgent Walk-in&quot; above to book anyway.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-mono font-bold border transition cursor-pointer text-center ${
                            isSelected
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                              : "bg-white text-[#1C1C1E] border-[#E4E4E7] hover:border-emerald-500"
                          }`}
                        >
                          {slot.displayTime}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 5: Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1C1C1E]">
                  Chief Complaint / Notes <span className="text-[#9CA3AF] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Severe toothache on lower left molar"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E4E4E7] rounded-xl text-[#1C1C1E] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2A5CAA]"
                />
              </div>

              {/* Direct Waiting Lounge Check-in Toggle for Today's Appointments */}
              {selectedDate === todayDhakaStr && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer hover:bg-amber-100/70 transition">
                  <input
                    type="checkbox"
                    checked={checkInImmediately}
                    onChange={(e) => setCheckInImmediately(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#2A5CAA] focus:ring-0 cursor-pointer accent-[#2A5CAA]"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Check-in to Waiting Lounge immediately</span>
                    </span>
                    <p className="text-[11px] text-amber-800/80 mt-0.5 leading-snug">
                      Patient is present in clinic now. Automatically allocates next Daily Serial # (SL) and syncs to live TV queue.
                    </p>
                  </div>
                </label>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#E4E4E7] flex items-center justify-between bg-[#FAFAFA]">
          <div className="text-xs text-[#6B7280]">
            {selectedSlot ? (
              <span className="font-extrabold text-emerald-800 flex items-center gap-1.5 font-mono">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Slot: {formatDhakaTime(selectedSlot.startTime)} - {formatDhakaTime(selectedSlot.endTime)} ({selectedDate})</span>
              </span>
            ) : isOverbooking ? (
              <span className="font-extrabold text-amber-800 flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Overbooking: {customStartTime} - {customEndTime} ({selectedDate})</span>
              </span>
            ) : (
              <span className="text-[#64748B]">Please select an available time slot</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#E4E4E7] rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBook}
              disabled={isSubmitting || !selectedPatient}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Booking...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Booking</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

          {/* Child Quick Register Patient Modal */}
          <QuickRegisterPatientModal
            isOpen={isQuickRegisterOpen}
            onClose={() => setIsQuickRegisterOpen(false)}
            onSuccess={(newPatient) => {
              setSelectedPatient({
                id: newPatient.id,
                name: newPatient.name,
                phone: newPatient.phone,
                cardNumber: newPatient.cardNumber,
                email: newPatient.email,
              });
              setIsQuickRegisterOpen(false);
              toast.success(`Patient ${newPatient.name} registered and selected!`);
            }}
            initialName={patientQuery}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
