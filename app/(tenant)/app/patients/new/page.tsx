"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ALLERGY_FLAGS, MEDICAL_CONDITIONS } from "@/lib/clinical-flags";
import {
  checkDuplicatePhoneAction,
  registerPatientAction,
} from "../actions";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  Phone,
  Plus,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

export default function NewPatientPage() {
  const router = useRouter();
  const [cardNumber, setCardNumber] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [approxAge, setApproxAge] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [bloodGroup, setBloodGroup] = useState<string>("B+");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [allergyNotes, setAllergyNotes] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: string;
    name: string;
    cardNumber: string;
  } | null>(null);

  const toggleCondition = (cond: string) => {
    if (selectedConditions.includes(cond)) {
      setSelectedConditions(selectedConditions.filter((c) => c !== cond));
    } else {
      setSelectedConditions([...selectedConditions, cond]);
    }
  };

  const toggleAllergy = (flag: string) => {
    if (selectedAllergies.includes(flag)) {
      setSelectedAllergies(selectedAllergies.filter((a) => a !== flag));
    } else {
      setSelectedAllergies([...selectedAllergies, flag]);
    }
  };

  const handlePhoneBlur = async () => {
    if (!phone) return;
    try {
      const match = await checkDuplicatePhoneAction(phone);
      if (match) {
        setDuplicateWarning(match);
      } else {
        setDuplicateWarning(null);
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error("Please enter patient name and mobile number");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerPatientAction({
        cardNumber: cardNumber || undefined,
        name,
        phone,
        email: email || undefined,
        approxAge: approxAge ? parseInt(approxAge, 10) : undefined,
        gender,
        bloodGroup,
        address,
        emergencyContactName,
        emergencyContactPhone,
        medicalConditions: selectedConditions,
        allergyFlags: selectedAllergies,
        allergyNotes,
        medicalNotes,
      });
      toast.success("Patient registered successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to register patient");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/app/patients"
          className="p-2 rounded-xl bg-white border border-[#E4E4E7] text-[#6B7280] hover:text-[#1C1C1E] transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Register Patient
          </h1>
          <p className="text-sm text-[#6B7280]">
            Scan pre-printed card or auto-generate a new card number.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card Number & Identity */}
        <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E4E4E7]">
            <CreditCard className="w-4 h-4 text-[#2A5CAA]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E]">
              1. Card Number &amp; Contact
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Card Number (Scan hardware barcode or leave blank to auto-generate)
              </label>
              <input
                type="text"
                data-scan-target="true"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="Scan or type 10–16 digit card barcode (e.g. 1000000001)..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#2A5CAA]/60 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#E8EEF7]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Md. Rafiqul Islam"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Mobile Number (01XXXXXXXXX) *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onBlur={handlePhoneBlur}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01712345678"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm font-mono focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>

            {/* Duplicate Phone Warning */}
            {duplicateWarning && (
              <div className="sm:col-span-2 p-3 rounded-xl bg-[#FFF7EB] border border-[#FF9F0A]/30 text-xs flex items-center justify-between text-[#1C1C1E]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FF9F0A] shrink-0" />
                  <span>
                    This phone number is already registered to{" "}
                    <strong>{duplicateWarning.name}</strong> (Card:{" "}
                    {duplicateWarning.cardNumber}).
                  </span>
                </div>
                <Link
                  href={`/app/patients/${duplicateWarning.id}`}
                  className="text-xs font-bold text-[#2A5CAA] hover:underline flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>Open Existing Patient</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Approx. Age
                </label>
                <input
                  type="number"
                  value={approxAge}
                  onChange={(e) => setApproxAge(e.target.value)}
                  placeholder="32"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Gender *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none"
              >
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House, Road, Area, City"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Clinical Alerts (Allergies in Red, Conditions in Amber) */}
        <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E4E4E7]">
            <AlertCircle className="w-4 h-4 text-[#FF453A]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E]">
              2. Clinical Alerts &amp; Safety
            </h2>
          </div>

          {/* Allergy Flags in Red */}
          <div>
            <label className="block text-xs font-bold text-[#FF453A] uppercase tracking-wider mb-2">
              Drug Allergy Flags (Triggers Automated Safety Block):
            </label>
            <div className="flex flex-wrap gap-2">
              {ALLERGY_FLAGS.map((flag) => {
                const active = selectedAllergies.includes(flag);
                return (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => toggleAllergy(flag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                      active
                        ? "bg-[#FF453A] text-white border-[#FF453A] shadow-xs"
                        : "bg-white text-[#1C1C1E] border-[#E4E4E7] hover:border-[#FF453A]/50"
                    }`}
                  >
                    {active && "✓ "}
                    {flag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Medical Conditions in Amber */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-[#FF9F0A] uppercase tracking-wider mb-2">
              Medical Conditions (Displayed on Doctor Header):
            </label>
            <div className="flex flex-wrap gap-2">
              {MEDICAL_CONDITIONS.map((cond) => {
                const active = selectedConditions.includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => toggleCondition(cond)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                      active
                        ? "bg-[#FF9F0A] text-white border-[#FF9F0A] shadow-xs"
                        : "bg-white text-[#1C1C1E] border-[#E4E4E7] hover:border-[#FF9F0A]/50"
                    }`}
                  >
                    {active && "✓ "}
                    {cond}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#2A5CAA]/25 transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering Patient...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Register Patient &amp; Open Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
