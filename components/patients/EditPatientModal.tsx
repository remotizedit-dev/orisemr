"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  updatePatientAction,
  getPatientForEditAction,
  type UpdatePatientInput,
} from "@/app/(tenant)/app/patients/actions";
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  HeartPulse,
  ShieldAlert,
  AlertCircle,
  Loader2,
  Save,
  Plus,
  Trash2,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { normalizeBdPhone, formatBdPhone } from "@/lib/utils";

export interface EditablePatientData {
  id: string;
  name: string;
  phone: string;
  cardNumber: string;
  email?: string | null;
  gender: string;
  approxAge?: number | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  allergyFlags?: string[];
  medicalConditions?: string[];
  allergyNotes?: string | null;
  medicalNotes?: string | null;
}

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  initialData?: EditablePatientData | null;
  onSuccess?: (updated: any) => void;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const COMMON_ALLERGIES = [
  "Penicillin",
  "Sulfa",
  "Latex",
  "Aspirin",
  "NSAIDs",
  "Cephalosporin",
  "Erythromycin",
];

const COMMON_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Cardiac Disease",
  "Asthma",
  "Pregnancy",
  "Kidney Disease",
  "Hepatitis",
];

export function EditPatientModal({
  isOpen,
  onClose,
  patientId,
  initialData,
  onSuccess,
}: EditPatientModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [approxAge, setApproxAge] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [allergyFlags, setAllergyFlags] = useState<string[]>([]);
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [allergyNotes, setAllergyNotes] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");

  const [customAllergy, setCustomAllergy] = useState("");
  const [customCondition, setCustomCondition] = useState("");

  const populateForm = (data: EditablePatientData) => {
    setName(data.name || "");
    setCardNumber(data.cardNumber || "");
    setPhone(data.phone || "");
    setEmail(data.email || "");
    setGender(
      data.gender === "female" || data.gender === "other" ? data.gender : "male"
    );
    setApproxAge(data.approxAge ? String(data.approxAge) : "");
    setDateOfBirth(data.dateOfBirth || "");
    setBloodGroup(data.bloodGroup || "");
    setAddress(data.address || "");
    setEmergencyName(data.emergencyContactName || "");
    setEmergencyPhone(data.emergencyContactPhone || "");
    setAllergyFlags(data.allergyFlags || []);
    setMedicalConditions(data.medicalConditions || []);
    setAllergyNotes(data.allergyNotes || "");
    setMedicalNotes(data.medicalNotes || "");
  };

  useEffect(() => {
    if (!isOpen || !patientId) return;

    if (initialData && initialData.id === patientId) {
      populateForm(initialData);
      return;
    }

    // Otherwise fetch fresh data
    setIsLoading(true);
    getPatientForEditAction(patientId)
      .then((p) => {
        populateForm({
          id: p.id,
          name: p.name,
          phone: p.phone,
          cardNumber: p.cardNumber,
          email: p.email,
          gender: p.gender,
          approxAge: p.approxAge,
          dateOfBirth: p.dateOfBirth,
          bloodGroup: p.bloodGroup,
          address: p.address,
          emergencyContactName: p.emergencyContactName,
          emergencyContactPhone: p.emergencyContactPhone,
          allergyFlags: p.allergyFlags || [],
          medicalConditions: p.medicalConditions || [],
          allergyNotes: p.allergyNotes,
          medicalNotes: p.medicalNotes,
        });
      })
      .catch((err) => {
        toast.error("Failed to load patient details for editing");
        onClose();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, patientId, initialData]);

  const toggleAllergy = (item: string) => {
    setAllergyFlags((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addCustomAllergy = () => {
    const trimmed = customAllergy.trim();
    if (!trimmed) return;
    if (!allergyFlags.includes(trimmed)) {
      setAllergyFlags((prev) => [...prev, trimmed]);
    }
    setCustomAllergy("");
  };

  const toggleCondition = (item: string) => {
    setMedicalConditions((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addCustomCondition = () => {
    const trimmed = customCondition.trim();
    if (!trimmed) return;
    if (!medicalConditions.includes(trimmed)) {
      setMedicalConditions((prev) => [...prev, trimmed]);
    }
    setCustomCondition("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter the patient's full name");
      return;
    }

    const normalized = normalizeBdPhone(phone);
    if (!normalized) {
      toast.error("Invalid Bangladeshi mobile number (must be 01XXXXXXXXX)");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updatePatientAction({
        patientId,
        name: name.trim(),
        cardNumber: cardNumber.trim() || undefined,
        phone: normalized,
        email: email.trim() || null,
        approxAge: approxAge ? parseInt(approxAge, 10) : null,
        dateOfBirth: dateOfBirth || null,
        gender,
        bloodGroup: bloodGroup || null,
        address: address.trim() || null,
        emergencyContactName: emergencyName.trim() || null,
        emergencyContactPhone: emergencyPhone.trim() || null,
        allergyFlags,
        medicalConditions,
        allergyNotes: allergyNotes.trim() || null,
        medicalNotes: medicalNotes.trim() || null,
      });

      if (res?.success) {
        toast.success(`Patient record for ${name} updated successfully!`);
        if (onSuccess) {
          onSuccess(res.patient);
        }
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update patient data");
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
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 360, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E4E4E7] overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-b border-[#E4E4E7] flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-[#1C1C1E]">
                    Edit Patient Profile
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Update personal details, contact information, and medical background
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#E4E4E7] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-[#2A5CAA] gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-bold text-[#6B7280]">
                    Loading patient data...
                  </span>
                </div>
              ) : (
                <form id="edit-patient-form" onSubmit={handleSubmit} className="space-y-6">
                  {/* Primary Info */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#2A5CAA] flex items-center gap-1.5 border-b border-[#E4E4E7] pb-2">
                      <User className="w-4 h-4" />
                      <span>Primary Demographics</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Mohammad Rahim"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA] font-medium"
                        />
                      </div>

                      {/* Card Number */}
                      <div>
                        <label className="block text-xs font-bold text-[#1C1C1E] mb-1 flex items-center justify-between">
                          <span>Patient Card #</span>
                          <span className="text-[10px] text-[#6B7280]">Clinic ID</span>
                        </label>
                        <div className="relative">
                          <CreditCard className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="e.g. CARD-00042"
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E4E4E7] text-sm font-mono font-bold text-[#2A5CAA] focus:outline-none focus:border-[#2A5CAA]"
                          />
                        </div>
                      </div>

                      {/* Mobile Phone */}
                      <div>
                        <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                          Mobile Phone (BD) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="017XXXXXXXX"
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E4E4E7] text-sm font-mono font-semibold text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA]"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                          Email Address (Optional)
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="patient@example.com"
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E4E4E7] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA]"
                          />
                        </div>
                      </div>

                      {/* Gender Selector */}
                      <div>
                        <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                          Gender <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["male", "female", "other"] as const).map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setGender(g)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition border cursor-pointer ${
                                gender === g
                                  ? "bg-[#2A5CAA] text-white border-[#2A5CAA]"
                                  : "bg-[#F8FAFC] text-[#4B5563] border-[#E4E4E7] hover:bg-[#F1F5F9]"
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Blood Group */}
                      <div>
                        <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                          Blood Group
                        </label>
                        <select
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] text-sm font-bold text-[#1C1C1E] bg-white focus:outline-none focus:border-[#2A5CAA]"
                        >
                          <option value="">Unknown / Not Tested</option>
                          {BLOOD_GROUPS.map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Approx Age */}
                      <div>
                        <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                          Approximate Age (Years)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="130"
                          value={approxAge}
                          onChange={(e) => setApproxAge(e.target.value)}
                          placeholder="e.g. 35"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] text-sm font-mono text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA]"
                        />
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA]"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                        Residential Address
                      </label>
                      <textarea
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House / Flat #, Road, Area, City (e.g. Dhanmondi, Dhaka)"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#E4E4E7] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA]"
                      />
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-4 pt-2 border-t border-[#E4E4E7]">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#2A5CAA] flex items-center gap-1.5 border-b border-[#E4E4E7] pb-2">
                      <Phone className="w-4 h-4" />
                      <span>Emergency Contact</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                          Contact Person Name
                        </label>
                        <input
                          type="text"
                          value={emergencyName}
                          onChange={(e) => setEmergencyName(e.target.value)}
                          placeholder="e.g. Spouse, Parent, Sibling"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                          Emergency Phone Number
                        </label>
                        <input
                          type="tel"
                          value={emergencyPhone}
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] text-sm font-mono text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medical Background & Clinical Alerts */}
                  <div className="space-y-4 pt-2 border-t border-[#E4E4E7]">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#2A5CAA] flex items-center gap-1.5 border-b border-[#E4E4E7] pb-2">
                      <HeartPulse className="w-4 h-4" />
                      <span>Clinical Alerts &amp; Medical Background</span>
                    </h3>

                    {/* Drug Allergies */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[#1C1C1E] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-[#FF453A]" />
                        <span>Drug Allergies (Triggers clinical safety blocks)</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {COMMON_ALLERGIES.map((a) => {
                          const active = allergyFlags.includes(a);
                          return (
                            <button
                              key={a}
                              type="button"
                              onClick={() => toggleAllergy(a)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                                active
                                  ? "bg-[#FFEBEA] text-[#FF453A] border-[#FF453A]/40"
                                  : "bg-[#F8FAFC] text-[#4B5563] border-[#E4E4E7] hover:bg-[#F1F5F9]"
                              }`}
                            >
                              {active ? "✓ " : "+ "}
                              {a}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom allergy input */}
                      <div className="flex items-center gap-2 pt-1 max-w-sm">
                        <input
                          type="text"
                          value={customAllergy}
                          onChange={(e) => setCustomAllergy(e.target.value)}
                          placeholder="Add custom allergy..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomAllergy();
                            }
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-[#E4E4E7] text-xs"
                        />
                        <button
                          type="button"
                          onClick={addCustomAllergy}
                          className="px-3 py-1.5 rounded-lg bg-[#F4F4F5] hover:bg-[#E4E4E7] text-xs font-bold text-[#1C1C1E] cursor-pointer"
                        >
                          Add
                        </button>
                      </div>

                      {/* Selected Custom Allergies */}
                      {allergyFlags.filter((a) => !COMMON_ALLERGIES.includes(a)).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {allergyFlags
                            .filter((a) => !COMMON_ALLERGIES.includes(a))
                            .map((a) => (
                              <span
                                key={a}
                                className="px-2.5 py-0.5 rounded-lg bg-[#FFEBEA] text-[#FF453A] text-xs font-bold border border-[#FF453A]/30 flex items-center gap-1.5"
                              >
                                <span>{a}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleAllergy(a)}
                                  className="hover:opacity-70 cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                        </div>
                      )}

                      {/* Allergy Precautions Notes */}
                      <div className="pt-1">
                        <input
                          type="text"
                          value={allergyNotes}
                          onChange={(e) => setAllergyNotes(e.target.value)}
                          placeholder="Specific allergy precautions (e.g. Anaphylaxis history, mild skin rash, etc.)"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#E4E4E7] text-xs text-[#1C1C1E]"
                        />
                      </div>
                    </div>

                    {/* Chronic Medical Conditions */}
                    <div className="space-y-2 pt-2">
                      <label className="block text-xs font-bold text-[#1C1C1E] flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-[#FF9F0A]" />
                        <span>Medical Conditions &amp; Systemic Diseases</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {COMMON_CONDITIONS.map((c) => {
                          const active = medicalConditions.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => toggleCondition(c)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                                active
                                  ? "bg-[#FFF7EB] text-[#FF9F0A] border-[#FF9F0A]/40"
                                  : "bg-[#F8FAFC] text-[#4B5563] border-[#E4E4E7] hover:bg-[#F1F5F9]"
                              }`}
                            >
                              {active ? "✓ " : "+ "}
                              {c}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom condition input */}
                      <div className="flex items-center gap-2 pt-1 max-w-sm">
                        <input
                          type="text"
                          value={customCondition}
                          onChange={(e) => setCustomCondition(e.target.value)}
                          placeholder="Add custom medical condition..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomCondition();
                            }
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-[#E4E4E7] text-xs"
                        />
                        <button
                          type="button"
                          onClick={addCustomCondition}
                          className="px-3 py-1.5 rounded-lg bg-[#F4F4F5] hover:bg-[#E4E4E7] text-xs font-bold text-[#1C1C1E] cursor-pointer"
                        >
                          Add
                        </button>
                      </div>

                      {/* Selected Custom Conditions */}
                      {medicalConditions.filter((c) => !COMMON_CONDITIONS.includes(c)).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {medicalConditions
                            .filter((c) => !COMMON_CONDITIONS.includes(c))
                            .map((c) => (
                              <span
                                key={c}
                                className="px-2.5 py-0.5 rounded-lg bg-[#FFF7EB] text-[#FF9F0A] text-xs font-bold border border-[#FF9F0A]/30 flex items-center gap-1.5"
                              >
                                <span>{c}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleCondition(c)}
                                  className="hover:opacity-70 cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                        </div>
                      )}

                      {/* Medical Background Notes */}
                      <div className="pt-1">
                        <input
                          type="text"
                          value={medicalNotes}
                          onChange={(e) => setMedicalNotes(e.target.value)}
                          placeholder="Clinical background notes (e.g. On blood thinners, pacemaker, uncontrolled BP)"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#E4E4E7] text-xs text-[#1C1C1E]"
                        />
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 bg-white border-t border-[#E4E4E7] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#1C1C1E] font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-patient-form"
                disabled={isSubmitting || isLoading}
                className="px-6 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Patient Details</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
