"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClinicAction } from "../actions";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  Layers,
  Loader2,
  Sparkles,
  UserCheck,
} from "lucide-react";

export default function NewTenantPage() {
  const router = useRouter();
  const [isDoctor, setIsDoctor] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!slug) {
      // Auto-suggest slug
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
    }
    if (!shortCode && val.length >= 2) {
      // Auto-suggest shortCode
      const acronym = val
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 4);
      setShortCode(acronym);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const res = await createClinicAction(formData);

      if (res?.error) {
        setErrorMessage(res.error);
        toast.error(res.error);
        setIsSubmitting(false);
        return;
      }

      toast.success("Clinic successfully provisioned with master catalog!");
      router.push("/platform/tenants");
    } catch (err: any) {
      const msg = err?.message || "An unexpected error occurred while creating the clinic.";
      setErrorMessage(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/platform/tenants"
          className="p-2 rounded-xl bg-white border border-[#E4E4E7] text-[#6B7280] hover:text-[#1C1C1E] transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Create New Clinic
          </h1>
          <p className="text-sm text-[#6B7280]">
            Instantly provisions tenant database records, copies master catalog, and invites the clinic administrator.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#FFF2F2] border border-[#FF453A]/30 text-[#D70015] flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#FF453A]" />
          <div>
            <p className="font-bold text-sm">Cannot Create Clinic</p>
            <p className="text-xs mt-0.5 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Clinic Profile */}
        <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E4E4E7]">
            <Building2 className="w-4 h-4 text-[#2A5CAA]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E]">
              1. Chamber Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Clinic Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Modern Dental Care"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Public URL Slug *
              </label>
              <div className="flex items-center rounded-lg border border-[#E4E4E7] bg-white overflow-hidden">
                <span className="pl-3 text-xs text-[#6B7280] select-none font-mono">
                  /book/
                </span>
                <input
                  type="text"
                  name="slug"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="modern-dental"
                  className="w-full px-2 py-2.5 text-sm font-mono focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Short Code (2–6 chars) *
              </label>
              <input
                type="text"
                name="shortCode"
                required
                maxLength={6}
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                placeholder="MDC"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm font-mono uppercase focus:outline-none focus:border-[#2A5CAA]"
              />
              <span className="text-[11px] text-[#6B7280] mt-0.5 block">
                Used in codes: INV-{shortCode || "XXX"}-000001
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Phone Number
              </label>
              <input
                type="text"
                name="phone"
                placeholder="01712-345678"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Clinic Email (Reply-To)
              </label>
              <input
                type="email"
                name="email"
                placeholder="info@moderndental.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Chamber Address
              </label>
              <input
                type="text"
                name="address"
                placeholder="House 12, Road 4, Dhanmondi, Dhaka"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Clinic Admin */}
        <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E7]">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#2A5CAA]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E]">
                2. Clinic Administrator (Single Primary Account)
              </h2>
            </div>
            <span className="text-[10px] font-semibold text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-full">
              Must change password on first login
            </span>
          </div>
          <p className="text-xs text-[#6B7280]">
            Only the primary Clinic Administrator account is created at tenant provisioning. Upon first sign-in, this admin will be prompted to update their password, after which they can configure chairs, add doctors, and invite staff users.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Admin Full Name *
              </label>
              <input
                type="text"
                name="adminName"
                required
                placeholder="Dr. Tanvir Ahmed"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Admin Login Email *
              </label>
              <input
                type="email"
                name="adminEmail"
                required
                placeholder="admin@moderndental.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Initial Password
              </label>
              <input
                type="text"
                name="adminPassword"
                defaultValue="ClinicAdmin123!"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm font-mono focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="adminIsDoctor"
                  checked={isDoctor}
                  onChange={(e) => setIsDoctor(e.target.checked)}
                  className="w-4 h-4 rounded text-[#2A5CAA] focus:ring-0"
                />
                <span className="text-sm font-semibold text-[#1C1C1E]">
                  This administrator is also a practising dentist (is_doctor = true)
                </span>
              </label>
            </div>

            {isDoctor && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Doctor Title
                  </label>
                  <input
                    type="text"
                    name="adminDoctorTitle"
                    defaultValue="Dr."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Specialty / Degree
                  </label>
                  <input
                    type="text"
                    name="adminDoctorSpecialty"
                    placeholder="BDS, FCPS (Oral Surgery)"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    BMDC Registration Number
                  </label>
                  <input
                    type="text"
                    name="adminDoctorRegNo"
                    placeholder="BMDC-A-12345"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 3: Subscription Plan */}
        <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E4E4E7]">
            <CreditCard className="w-4 h-4 text-[#2A5CAA]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E]">
              3. Subscription Plan
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Plan Name
              </label>
              <input
                type="text"
                name="planName"
                defaultValue="Standard"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Price (BDT)
              </label>
              <input
                type="number"
                name="priceBdt"
                defaultValue={2000}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                Billing Cycle
              </label>
              <select
                name="billingCycle"
                defaultValue="monthly"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm focus:outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submission Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#2A5CAA]/25 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Provisioning Clinic &amp; Master Catalog...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create Clinic &amp; Clone Master Catalog</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
