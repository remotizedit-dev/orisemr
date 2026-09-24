"use client";

import { useState, useEffect } from "react";
import {
  getPublicAvailableSlots,
  submitPublicBooking,
} from "./actions";
import { formatBdt } from "@/lib/utils";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface PublicBookingClientProps {
  tenant: {
    id: string;
    slug: string;
    shortCode: string;
    brandColor: string;
    slotGranularityMinutes: number;
    bookingBufferMinutes: number;
    publicBookingMinLeadMinutes: number;
    publicBookingDaysAhead: number;
  };
  services: {
    id: string;
    name: string;
    durationMinutes: number;
    priceBdt: number;
  }[];
  doctors: {
    id: string;
    name: string;
    doctorTitle: string | null;
    doctorSpecialty: string | null;
  }[];
}

export function PublicBookingClient({
  tenant,
  services,
  doctors,
}: PublicBookingClientProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form selections
  const [selectedServices, setSelectedServices] = useState<string[]>(
    services.length > 0 ? [services[0].id] : []
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("any");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default tomorrow
    return d.toISOString().split("T")[0];
  });
  const [availableSlots, setAvailableSlots] = useState<
    { time: string; displayTime: string; doctorId: string }[]
  >([]);
  const [selectedSlot, setSelectedSlot] = useState<{
    time: string;
    doctorId: string;
  } | null>(null);

  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Patient info
  const [isExistingPatient, setIsExistingPatient] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    appointmentCode: string;
    isAutoConfirmed: boolean;
  } | null>(null);

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter((s) => s !== id));
      }
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  // Eager pre-fetching of available slots in the background whenever selections change
  useEffect(() => {
    if (selectedServices.length === 0 || !selectedDate) return;
    let isCancelled = false;

    setIsLoadingSlots(true);
    getPublicAvailableSlots(
      tenant.id,
      selectedDate,
      selectedServices,
      selectedDoctorId
    )
      .then((slots) => {
        if (!isCancelled) {
          setAvailableSlots(slots);
          setIsLoadingSlots(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsLoadingSlots(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [tenant.id, selectedDate, selectedDoctorId, selectedServices]);

  const shiftDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (cur >= today) {
      setSelectedDate(cur.toISOString().split("T")[0]);
      setSelectedSlot(null);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error("Please pick a convenient appointment time");
      return;
    }
    if (!phone) {
      toast.error("Please provide your mobile phone number");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitPublicBooking({
        tenantId: tenant.id,
        tenantShortCode: tenant.shortCode,
        date: selectedDate,
        time: selectedSlot.time,
        doctorId: selectedSlot.doctorId,
        serviceIds: selectedServices,
        isExistingPatient,
        cardNumber,
        phone,
        name,
        email,
        notes,
      });

      setConfirmedBooking(result);
      setStep(5);
    } catch (err: any) {
      toast.error(err?.message || "Booking submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 5 && confirmedBooking) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-[#E4E4E7] text-center space-y-4">
        <CheckCircle2 className="w-14 h-14 text-[#30D158] mx-auto" />
        <h2 className="text-2xl font-extrabold text-[#1C1C1E]">
          {confirmedBooking.isAutoConfirmed
            ? "Appointment Confirmed!"
            : "Appointment Request Received!"}
        </h2>

        <p className="text-sm text-[#6B7280] max-w-md mx-auto">
          {confirmedBooking.isAutoConfirmed
            ? "Your visit is confirmed in the chamber schedule. We look forward to seeing you!"
            : "Our reception staff has received your booking request and will confirm shortly."}
        </p>

        <div className="p-4 rounded-xl bg-[#E8EEF7] border border-[#2A5CAA]/20 inline-block font-mono text-center">
          <span className="text-xs text-[#6B7280] block uppercase tracking-wider">
            Appointment Reference Code:
          </span>
          <span className="text-xl font-black text-[#2A5CAA]">
            {confirmedBooking.appointmentCode}
          </span>
        </div>

        <p className="text-xs text-[#6B7280]">
          Date: <strong className="text-[#1C1C1E]">{selectedDate}</strong> at approx.{" "}
          <strong className="text-[#1C1C1E]">{selectedSlot?.time}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-[#E4E4E7] space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E4E4E7] text-xs font-semibold">
        <span className={step >= 1 ? "text-[#2A5CAA]" : "text-[#6B7280]"}>
          1. Services
        </span>
        <span>→</span>
        <span className={step >= 2 ? "text-[#2A5CAA]" : "text-[#6B7280]"}>
          2. Dentist &amp; Date
        </span>
        <span>→</span>
        <span className={step >= 3 ? "text-[#2A5CAA]" : "text-[#6B7280]"}>
          3. Time Slot
        </span>
        <span>→</span>
        <span className={step >= 4 ? "text-[#2A5CAA]" : "text-[#6B7280]"}>
          4. Contact Details
        </span>
      </div>

      {/* Step 1: Select Services */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1E]">
              What dental service do you need?
            </h2>
            <p className="text-xs text-[#6B7280]">
              Select one or more services to calculate accurate treatment duration.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {services.map((s) => {
              const active = selectedServices.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    active
                      ? "border-[#2A5CAA] bg-[#E8EEF7]/50 shadow-xs"
                      : "border-[#E4E4E7] bg-white hover:bg-[#F4F4F5]"
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs text-[#1C1C1E] block">
                      {s.name}
                    </span>
                    <span className="text-[11px] text-[#6B7280]">
                      ~{s.durationMinutes} mins
                    </span>
                  </div>
                  {active && <Check className="w-4 h-4 text-[#2A5CAA]" />}
                </button>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-semibold text-xs transition cursor-pointer"
            >
              Continue to Date Selection →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Dentist & Date */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1E]">
              Choose Dentist and Visit Date
            </h2>
            <p className="text-xs text-[#6B7280]">
              Select a preferred dentist or choose 'Any available' for the earliest time.
            </p>
          </div>

          {/* Dentist Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1C1E] mb-2">
              Select Dentist:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedDoctorId("any")}
                className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                  selectedDoctorId === "any"
                    ? "border-[#2A5CAA] bg-[#E8EEF7] font-bold text-[#2A5CAA]"
                    : "border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#1C1C1E]"
                }`}
              >
                <span className="block font-bold">Any Available Dentist</span>
                <span className="text-[11px] font-normal text-[#6B7280]">
                  Fastest appointment allocation
                </span>
              </button>

              {doctors.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDoctorId(d.id)}
                  className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                    selectedDoctorId === d.id
                      ? "border-[#2A5CAA] bg-[#E8EEF7] font-bold text-[#2A5CAA]"
                      : "border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#1C1C1E]"
                  }`}
                >
                  <span className="block font-bold">
                    {d.doctorTitle} {d.name}
                  </span>
                  <span className="text-[11px] font-normal text-[#6B7280]">
                    {d.doctorSpecialty || "Dental Surgeon"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
              Select Preferred Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-[#E4E4E7] bg-white text-xs font-mono"
            />
          </div>

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#1C1C1E]"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span>Find Available Times</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Available Slot Grid */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1E]">
              Pick an Appointment Time
            </h2>
            <p className="text-xs text-[#6B7280]">
              Select your convenient chamber visit time slot.
            </p>
          </div>

          {/* Quick Date Switcher Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#E8EEF7]/50 border border-[#2A5CAA]/20">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E4E4E7] text-[#6B7280] hover:text-[#1C1C1E] transition cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev Day</span>
            </button>

            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#2A5CAA]" />
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="px-2.5 py-1 rounded-lg border border-[#E4E4E7] bg-white font-mono text-xs font-bold text-[#1C1C1E] cursor-pointer shadow-2xs"
              />
            </div>

            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E4E4E7] text-[#6B7280] hover:text-[#1C1C1E] transition cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-2xs"
            >
              <span className="hidden sm:inline">Next Day</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoadingSlots ? (
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#2A5CAA]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking available chamber slots...</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded-xl bg-[#E4E4E7]/60 animate-pulse border border-[#E4E4E7]"
                  />
                ))}
              </div>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl border border-[#E4E4E7] text-center space-y-3">
              <Clock className="w-8 h-8 text-[#A1A1AA] mx-auto" />
              <p className="text-xs font-semibold text-[#1C1C1E]">
                No available appointment slots on {selectedDate}.
              </p>
              <p className="text-[11px] text-[#6B7280]">
                The clinic may be closed or all doctor slots are booked for this day.
              </p>
              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="px-4 py-2 rounded-xl bg-[#2A5CAA] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#1E4282] transition cursor-pointer shadow-xs"
              >
                <span>Check Next Day</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-[#6B7280]">
                Available slots ({availableSlots.length}):
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1">
                {availableSlots.map((s) => {
                  const active = selectedSlot?.time === s.time;
                  return (
                    <button
                      key={s.time}
                      type="button"
                      onClick={() =>
                        setSelectedSlot({ time: s.time, doctorId: s.doctorId })
                      }
                      className={`py-2.5 px-3 rounded-xl border text-center transition font-mono text-xs cursor-pointer shadow-2xs ${
                        active
                          ? "bg-[#2A5CAA] text-white border-[#2A5CAA] font-bold shadow-xs scale-102"
                          : "bg-white border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#E8EEF7] hover:border-[#2A5CAA]/30"
                      }`}
                    >
                      {s.displayTime}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#1C1C1E]"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={!selectedSlot}
              onClick={() => setStep(4)}
              className="px-6 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
            >
              Enter Contact Details →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Contact Details & Submit */}
      {step === 4 && (
        <form onSubmit={handleConfirmBooking} className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1E]">
              Patient Contact Information
            </h2>
            <p className="text-xs text-[#6B7280]">
              We will send your appointment confirmation via SMS/Email.
            </p>
          </div>

          <div className="flex gap-4 p-3 rounded-xl bg-[#F4F4F5] text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="radio"
                name="isExisting"
                checked={!isExistingPatient}
                onChange={() => setIsExistingPatient(false)}
              />
              <span>New Patient</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="radio"
                name="isExisting"
                checked={isExistingPatient}
                onChange={() => setIsExistingPatient(true)}
              />
              <span>I have an Oris Chamber Card</span>
            </label>
          </div>

          {isExistingPatient && (
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Chamber Card Number *
              </label>
              <input
                type="text"
                required
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="e.g. 1000000001"
                className="w-full p-2.5 rounded-lg border border-[#E4E4E7] bg-white text-xs font-mono"
              />
            </div>
          )}

          {!isExistingPatient && (
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full p-2.5 rounded-lg border border-[#E4E4E7] bg-white text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
              Mobile Phone Number (01XXXXXXXXX) *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01712345678"
              className="w-full p-2.5 rounded-lg border border-[#E4E4E7] bg-white text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full p-2.5 rounded-lg border border-[#E4E4E7] bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
              Brief Problem Description (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Tooth pain on chewing since 2 days"
              className="w-full p-2.5 rounded-lg border border-[#E4E4E7] bg-white text-xs"
            />
          </div>

          <div className="pt-4 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#1C1C1E]"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Confirming...</span>
                </>
              ) : (
                <span>Confirm &amp; Book Appointment</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
