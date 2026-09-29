"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Edit3,
  ExternalLink,
  KeyRound,
  Loader2,
  Stethoscope,
  Tv,
  UserCheck,
  X,
} from "lucide-react";
import { updateTenantDetailsAction } from "@/app/(platform)/platform/tenants/actions";

interface EditTenantModalProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    shortCode: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  adminUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
    isDoctor?: boolean | null;
    doctorTitle?: string | null;
    doctorSpecialty?: string | null;
    doctorRegNo?: string | null;
  } | null;
}

export function EditTenantModal({ tenant, adminUser }: EditTenantModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form States
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [shortCode, setShortCode] = useState(tenant.shortCode);
  const [phone, setPhone] = useState(tenant.phone || "");
  const [email, setEmail] = useState(tenant.email || "");
  const [address, setAddress] = useState(tenant.address || "");

  // Admin User States
  const [adminName, setAdminName] = useState(adminUser?.name || "");
  const [adminEmail, setAdminEmail] = useState(adminUser?.email || "");
  const [adminIsDoctor, setAdminIsDoctor] = useState(Boolean(adminUser?.isDoctor));
  const [adminDoctorTitle, setAdminDoctorTitle] = useState(adminUser?.doctorTitle || "Dr.");
  const [adminDoctorSpecialty, setAdminDoctorSpecialty] = useState(adminUser?.doctorSpecialty || "");
  const [adminDoctorRegNo, setAdminDoctorRegNo] = useState(adminUser?.doctorRegNo || "");
  const [newPassword, setNewPassword] = useState("");

  const handleOpen = () => {
    setName(tenant.name);
    setSlug(tenant.slug);
    setShortCode(tenant.shortCode);
    setPhone(tenant.phone || "");
    setEmail(tenant.email || "");
    setAddress(tenant.address || "");
    setAdminName(adminUser?.name || "");
    setAdminEmail(adminUser?.email || "");
    setAdminIsDoctor(Boolean(adminUser?.isDoctor));
    setAdminDoctorTitle(adminUser?.doctorTitle || "Dr.");
    setAdminDoctorSpecialty(adminUser?.doctorSpecialty || "");
    setAdminDoctorRegNo(adminUser?.doctorRegNo || "");
    setNewPassword("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Clinic Name is required.");
      return;
    }
    if (!slug.trim()) {
      toast.error("Public URL Slug is required.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug.trim())) {
      toast.error("Slug can only contain lowercase letters, numbers, and hyphens.");
      return;
    }
    if (!shortCode.trim()) {
      toast.error("Short Code is required.");
      return;
    }
    if (newPassword && newPassword.trim().length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await updateTenantDetailsAction({
        tenantId: tenant.id,
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        shortCode: shortCode.toUpperCase().trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        adminUserId: adminUser?.id || null,
        adminName: adminName.trim() || null,
        adminEmail: adminEmail.trim() || null,
        adminIsDoctor,
        adminDoctorTitle: adminDoctorTitle.trim() || null,
        adminDoctorSpecialty: adminDoctorSpecialty.trim() || null,
        adminDoctorRegNo: adminDoctorRegNo.trim() || null,
        newPassword: newPassword.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update clinic details.");
        return;
      }

      toast.success("Clinic and administrator account updated successfully!");
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="px-4 py-2 rounded-xl bg-white border border-[#E4E4E7] hover:bg-[#F4F4F5] text-[#1C1C1E] font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
      >
        <Edit3 className="w-3.5 h-3.5 text-[#2A5CAA]" />
        <span>Edit Clinic &amp; Admin</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-[#E4E4E7] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#1C1C1E]">
                    Edit Clinic &amp; Administrator
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Modify practice profile, public URLs, and primary administrator details.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
              {/* SECTION 1: Clinic Profile & Public URLs */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#E4E4E7]">
                  <Building2 className="w-4 h-4 text-[#2A5CAA]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1E]">
                    1. Chamber Profile &amp; Public URLs
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                      Clinic / Practice Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Modern Dental Care"
                      className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-xs font-medium focus:outline-none focus:border-[#2A5CAA]"
                    />
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      Shown on printed prescription pads, receipts, waiting room TV screen, and booking header.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                      Public URL Slug *
                    </label>
                    <div className="flex items-center rounded-xl border border-[#E4E4E7] bg-white overflow-hidden">
                      <span className="pl-3 text-xs text-[#6B7280] select-none font-mono">
                        /book/
                      </span>
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        placeholder="modern-dental"
                        className="w-full px-2 py-2 text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                      Short Code (2–6 chars) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={shortCode}
                      onChange={(e) => setShortCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                      placeholder="MDC"
                      className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-xs font-mono uppercase focus:outline-none focus:border-[#2A5CAA]"
                    />
                  </div>

                  {/* Dynamic URL Preview Box */}
                  <div className="sm:col-span-2 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 text-xs">
                    <span className="font-bold text-[#1C1C1E] text-[11px] uppercase tracking-wider block">
                      Live Public URLs for Patients &amp; Lounge:
                    </span>
                    <div className="flex items-center gap-2 text-xs text-[#2A5CAA] font-mono">
                      <ExternalLink className="w-3.5 h-3.5 text-[#2A5CAA] shrink-0" />
                      <span>Online Booking: /book/{slug || "clinic-slug"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#059669] font-mono">
                      <Tv className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                      <span>Waiting Room TV: /display/{slug || "clinic-slug"}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01712-345678"
                      className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-xs focus:outline-none focus:border-[#2A5CAA]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                      Chamber Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@clinic.com"
                      className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-xs focus:outline-none focus:border-[#2A5CAA]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                      Chamber Physical Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House 12, Road 4, Dhanmondi, Dhaka"
                      className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-xs focus:outline-none focus:border-[#2A5CAA]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Primary Administrator Account */}
              {adminUser && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E7]">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#2A5CAA]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1E]">
                        2. Clinic Administrator Account
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold bg-[#E8EEF7] text-[#2A5CAA] px-2 py-0.5 rounded-full">
                      Primary Admin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                        Admin Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Dr. Tanvir Ahmed"
                        className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-xs font-medium focus:outline-none focus:border-[#2A5CAA]"
                      />
                      <p className="text-[11px] text-[#6B7280] mt-1">
                        The individual person's name for this clinic login.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                        Admin Login Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@clinic.com"
                        className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-xs focus:outline-none focus:border-[#2A5CAA]"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <input
                        type="checkbox"
                        id="adminIsDoctor"
                        checked={adminIsDoctor}
                        onChange={(e) => setAdminIsDoctor(e.target.checked)}
                        className="w-4 h-4 rounded text-[#2A5CAA] focus:ring-[#2A5CAA]"
                      />
                      <label htmlFor="adminIsDoctor" className="text-xs font-semibold text-[#1C1C1E] cursor-pointer">
                        This Administrator is also a practicing Dentist at this chamber
                      </label>
                    </div>

                    {adminIsDoctor && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                            Doctor Title
                          </label>
                          <input
                            type="text"
                            value={adminDoctorTitle}
                            onChange={(e) => setAdminDoctorTitle(e.target.value)}
                            placeholder="Dr. / Prof. Dr."
                            className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-xs focus:outline-none focus:border-[#2A5CAA]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                            BMDC Registration No
                          </label>
                          <input
                            type="text"
                            value={adminDoctorRegNo}
                            onChange={(e) => setAdminDoctorRegNo(e.target.value)}
                            placeholder="e.g. BMDC-A-12345"
                            className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-xs font-mono focus:outline-none focus:border-[#2A5CAA]"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                            Specialty
                          </label>
                          <input
                            type="text"
                            value={adminDoctorSpecialty}
                            onChange={(e) => setAdminDoctorSpecialty(e.target.value)}
                            placeholder="e.g. Orthodontics, Dental Surgeon"
                            className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-xs focus:outline-none focus:border-[#2A5CAA]"
                          />
                        </div>
                      </>
                    )}

                    <div className="sm:col-span-2 pt-1 border-t border-[#E4E4E7]">
                      <label className="block text-xs font-semibold text-[#1C1C1E] mb-1 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-[#6B7280]" />
                        <span>Reset Admin Password (Optional)</span>
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep unchanged (min 8 chars to change)"
                        className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-xs focus:outline-none focus:border-[#2A5CAA]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#E4E4E7] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E4E4E7] hover:bg-[#F4F4F5] text-[#6B7280] font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#2A5CAA]/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
