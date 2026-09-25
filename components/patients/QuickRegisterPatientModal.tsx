"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  registerPatientAction,
  checkDuplicatePhoneAction,
  RegisterPatientInput,
} from "@/app/(tenant)/app/patients/actions";
import {
  X,
  UserPlus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  User,
  HeartPulse,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { normalizeBdPhone, formatBdPhone } from "@/lib/utils";

interface QuickRegisterPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (patient: {
    id: string;
    name: string;
    phone: string;
    cardNumber: string;
    email?: string | null;
  }) => void;
  initialPhone?: string;
  initialName?: string;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const COMMON_ALLERGIES = [
  "Penicillin",
  "Sulfa",
  "Latex",
  "Aspirin",
  "NSAIDs",
];

const COMMON_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Cardiac",
  "Asthma",
  "Pregnancy",
];

export function QuickRegisterPatientModal({
  isOpen,
  onClose,
  onSuccess,
  initialPhone = "",
  initialName = "",
}: QuickRegisterPatientModalProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [approxAge, setApproxAge] = useState<string>("");
  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [showMedicalSection, setShowMedicalSection] = useState(false);

  // Duplicate phone state
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: string;
    name: string;
    cardNumber: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setPhone(initialPhone);
      setDuplicateWarning(null);
    }
  }, [isOpen, initialName, initialPhone]);

  // Debounced duplicate phone check
  useEffect(() => {
    if (!phone || phone.length < 11) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingPhone(true);
      try {
        const existing = await checkDuplicatePhoneAction(phone);
        if (existing) {
          setDuplicateWarning(existing);
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingPhone(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phone]);

  if (!isOpen) return null;

  const toggleAllergy = (flag: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(flag) ? prev.filter((a) => a !== flag) : [...prev, flag]
    );
  };

  const toggleCondition = (flag: string) => {
    setSelectedConditions((prev) =>
      prev.includes(flag) ? prev.filter((c) => c !== flag) : [...prev, flag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Patient name is required");
      return;
    }

    const normalizedPhone = normalizeBdPhone(phone);
    if (!normalizedPhone) {
      toast.error("Please enter a valid 11-digit Bangladeshi phone number (e.g. 017XXXXXXXX)");
      return;
    }

    setIsSubmitting(true);
    try {
      const allAllergies = [...selectedAllergies];
      if (customAllergy.trim() && !allAllergies.includes(customAllergy.trim())) {
        allAllergies.push(customAllergy.trim());
      }

      const input: RegisterPatientInput = {
        name: name.trim(),
        phone: normalizedPhone,
        email: email.trim() || undefined,
        gender,
        approxAge: approxAge ? parseInt(approxAge, 10) : null,
        bloodGroup: bloodGroup || undefined,
        address: address.trim() || undefined,
        allergyFlags: allAllergies,
        medicalConditions: selectedConditions,
      };

      const res = await registerPatientAction(input);

      if (res?.success && res.patient) {
        toast.success(`Patient ${res.patient.name} registered successfully! (Card #${res.patient.cardNumber})`);
        if (onSuccess) {
          onSuccess(res.patient);
        }
        onClose();
      } else {
        toast.error("Failed to register patient");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during registration");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#E4E4E7] overflow-hidden flex flex-col max-h-[92vh]"
            role="dialog"
            aria-modal="true"
          >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-[#E4E4E7] flex items-center justify-between bg-linear-to-r from-[#EBF2FC] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2A5CAA] text-white flex items-center justify-center font-bold shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1C1C1E]">
                Quick Register Patient
              </h3>
              <p className="text-xs text-[#6B7280]">
                Instant enrollment with auto-generated patient card #
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4.5 flex-1">
          {/* Patient Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1C1C1E] flex items-center gap-1">
              <span>Patient Full Name</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mohammad Asif Hossain"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E4E4E7] rounded-xl text-[#1C1C1E] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#2A5CAA]/20 transition"
              />
            </div>
          </div>

          {/* Phone Number with Duplicate Checker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1C1C1E] flex items-center gap-1">
                <span>Mobile Phone (01XXXXXXXXX)</span>
                <span className="text-red-500">*</span>
              </label>
              {isCheckingPhone && (
                <span className="text-[11px] text-[#2A5CAA] flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking...
                </span>
              )}
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01712345678"
                className={`w-full pl-10 pr-4 py-2.5 text-sm bg-white border rounded-xl text-[#1C1C1E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 transition ${
                  duplicateWarning
                    ? "border-amber-400 focus:border-amber-500 focus:ring-amber-200"
                    : "border-[#E4E4E7] focus:border-[#2A5CAA] focus:ring-[#2A5CAA]/20"
                }`}
              />
            </div>

            {duplicateWarning && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-2 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Phone already registered: </span>
                    <span>{duplicateWarning.name} (Card #{duplicateWarning.cardNumber})</span>
                  </div>
                </div>
                {onSuccess && (
                  <button
                    type="button"
                    onClick={() => {
                      onSuccess({
                        id: duplicateWarning.id,
                        name: duplicateWarning.name,
                        phone: normalizeBdPhone(phone) || phone,
                        cardNumber: duplicateWarning.cardNumber,
                        email: null,
                      });
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-xs transition"
                  >
                    Select This Patient
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Gender & Age */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1C1C1E]">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {(["male", "female", "other"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-2 text-xs font-bold rounded-xl border capitalize transition cursor-pointer ${
                      gender === g
                        ? "bg-[#2A5CAA] text-white border-[#2A5CAA] shadow-2xs"
                        : "bg-white text-[#4B5563] border-[#E4E4E7] hover:bg-[#F4F4F5]"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1C1C1E]">
                Approximate Age
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={approxAge}
                onChange={(e) => setApproxAge(e.target.value)}
                placeholder="e.g. 32"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E4E4E7] rounded-xl text-[#1C1C1E] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#2A5CAA]/20 transition"
              />
            </div>
          </div>

          {/* Email (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1C1C1E]">
                Email Address <span className="text-[#9CA3AF] font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-[#6B7280]">
                Auto-sends digital welcome &amp; card
              </span>
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E4E4E7] rounded-xl text-[#1C1C1E] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#2A5CAA]/20 transition"
              />
            </div>
          </div>

          {/* Blood Group */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1C1C1E]">Blood Group</label>
            <div className="flex flex-wrap gap-1.5">
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setBloodGroup(bloodGroup === bg ? "" : bg)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    bloodGroup === bg
                      ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                      : "bg-white text-[#4B5563] border-[#E4E4E7] hover:border-rose-300"
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Medical Alerts & Allergies */}
          <div className="pt-2 border-t border-[#E4E4E7]">
            <button
              type="button"
              onClick={() => setShowMedicalSection(!showMedicalSection)}
              className="text-xs font-bold text-[#2A5CAA] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-[#2A5CAA]" />
              <span>
                {showMedicalSection ? "Hide Medical Alerts & Allergies" : "+ Add Medical Conditions & Allergies"}
              </span>
            </button>
          </div>

          {showMedicalSection && (
            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-4 animate-in fade-in duration-200">
              {/* Allergy Flags */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-[#DC2626] block">
                  Allergy Flags (Triggers Clinical Safety Warnings)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_ALLERGIES.map((flag) => {
                    const isSelected = selectedAllergies.includes(flag);
                    return (
                      <button
                        key={flag}
                        type="button"
                        onClick={() => toggleAllergy(flag)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? "bg-red-500 text-white border-red-500 shadow-2xs"
                            : "bg-white text-[#4B5563] border-[#E4E4E7] hover:border-red-300"
                        }`}
                      >
                        {isSelected ? `✓ ${flag}` : flag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Medical Conditions */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-[#2A5CAA] block">
                  Systemic Health Conditions
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_CONDITIONS.map((cond) => {
                    const isSelected = selectedConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleCondition(cond)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? "bg-[#2A5CAA] text-white border-[#2A5CAA] shadow-2xs"
                            : "bg-white text-[#4B5563] border-[#E4E4E7] hover:border-[#2A5CAA]/40"
                        }`}
                      >
                        {isSelected ? `✓ ${cond}` : cond}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1C1C1E]">
                  Address / Locality <span className="text-[#9CA3AF] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Dhanmondi, Dhaka"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E4E4E7] rounded-xl text-[#1C1C1E] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#2A5CAA]/20 transition"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#E4E4E7] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E4E4E7] text-sm font-bold text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-black flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Registration</span>
                </>
              )}
            </button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
