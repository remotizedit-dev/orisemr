"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Image as ImageIcon,
  Loader2,
  Save,
  Trash2,
  Upload,
  Lock,
  ShieldAlert,
  Users,
  CheckCircle2,
  Printer,
  FileText,
  CreditCard,
  Monitor,
  Globe,
  Palette,
  Sparkles,
  Info,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateGeneralSettingsAction,
  uploadClinicLogoAction,
  removeClinicLogoAction,
} from "@/app/(tenant)/app/settings/actions";

interface Props {
  tenant: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    logoKey: string | null;
    brandColor: string | null;
    slotGranularityMinutes: number;
    bookingBufferMinutes: number;
    publicBookingDaysAhead: number;
    publicBookingMinLeadMinutes: number;
    autoConfirmExistingPatientBookings: boolean;
    reminder24hEnabled: boolean;
    reminder2hEnabled: boolean;
    rxPaperSize: "A4" | "A5" | "THERMAL_80MM";
    rxPrintLetterhead: boolean;
    rxTopMarginMm: number;
    invoicePaperSize: "A4" | "A5" | "THERMAL_80MM";
    doctorPatientVisibilityMode?: string;
  };
  initialLogoUrl?: string | null;
}

export default function GeneralSettingsClient({ tenant, initialLogoUrl }: Props) {
  const router = useRouter();
  const [logoKey, setLogoKey] = useState<string | null>(tenant.logoKey || null);
  const [logoPreview, setLogoPreview] = useState<string | null>(() => {
    if (initialLogoUrl) return initialLogoUrl;
    if (!tenant.logoKey) return null;
    if (
      tenant.logoKey.startsWith("http://") ||
      tenant.logoKey.startsWith("https://") ||
      tenant.logoKey.startsWith("/")
    ) {
      return tenant.logoKey;
    }
    const cfDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || "d29nkvl0g2nqwa.cloudfront.net";
    return `https://${cfDomain}/${tenant.logoKey}`;
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    name: tenant.name,
    phone: tenant.phone || "",
    email: tenant.email || "",
    address: tenant.address || "",
    logoKey: tenant.logoKey || null,
    brandColor: tenant.brandColor || "#2A5CAA",
    slotGranularityMinutes: tenant.slotGranularityMinutes,
    bookingBufferMinutes: tenant.bookingBufferMinutes,
    publicBookingDaysAhead: tenant.publicBookingDaysAhead,
    publicBookingMinLeadMinutes: tenant.publicBookingMinLeadMinutes,
    autoConfirmExistingPatientBookings: tenant.autoConfirmExistingPatientBookings,
    reminder24hEnabled: tenant.reminder24hEnabled,
    reminder2hEnabled: tenant.reminder2hEnabled,
    rxPaperSize: tenant.rxPaperSize,
    rxPrintLetterhead: tenant.rxPrintLetterhead,
    rxTopMarginMm: tenant.rxTopMarginMm,
    invoicePaperSize: tenant.invoicePaperSize,
    doctorPatientVisibilityMode:
      (tenant.doctorPatientVisibilityMode as "ISOLATED" | "COLLABORATIVE") || "ISOLATED",
  });

  const [isSaving, setIsSaving] = useState(false);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      const fd = new FormData();
      fd.append("logo", file);
      const res = await uploadClinicLogoAction(fd);
      setLogoKey(res.logoKey);
      setLogoPreview(res.logoUrl);
      setFormData((prev) => ({ ...prev, logoKey: res.logoKey }));
      toast.success("Clinic logo updated successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
      e.target.value = "";
    }
  }

  async function handleRemoveLogo() {
    if (!window.confirm("Are you sure you want to remove the clinic logo?")) return;
    try {
      setIsUploadingLogo(true);
      await removeClinicLogoAction();
      setLogoKey(null);
      setLogoPreview(null);
      setFormData((prev) => ({ ...prev, logoKey: null }));
      toast.success("Clinic logo removed");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove logo");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateGeneralSettingsAction({
        ...formData,
        logoKey,
      });
      toast.success("Settings saved successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Clinic Logo & Branding */}
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#2A5CAA]" />
              <span>Chamber Logo &amp; Official Branding</span>
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Your official chamber logo printed on prescriptions, billing invoices, and displayed across your digital clinic portals.
            </p>
          </div>
          <span className="self-start sm:self-auto text-[11px] font-mono font-bold bg-[#E8EEF7] text-[#2A5CAA] px-2.5 py-1 rounded-lg">
            Tenant: {tenant.name}
          </span>
        </div>

        {/* Logo Preview & Action Row */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-4 rounded-xl bg-white border border-[#E4E4E7]">
          {/* Logo Preview Frame */}
          <div className="w-44 h-28 rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#F9FAFB] flex flex-col items-center justify-center p-3 relative overflow-hidden shrink-0 shadow-2xs group">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Clinic Logo"
                className="max-h-full max-w-full object-contain"
                onError={() => {
                  if (logoKey && !logoPreview.includes("cloudfront.net")) {
                    const cfDomain =
                      process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN ||
                      "d29nkvl0g2nqwa.cloudfront.net";
                    setLogoPreview(`https://${cfDomain}/${logoKey}`);
                  }
                }}
              />
            ) : (
              <div className="text-center text-[#9CA3AF] space-y-1">
                <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                <span className="text-[11px] font-semibold block">No Logo Uploaded</span>
                <span className="text-[9px] text-[#A1A1AA] block">Using initials fallback</span>
              </div>
            )}

            {isUploadingLogo && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-[#2A5CAA]" />
              </div>
            )}
          </div>

          {/* Action buttons & specifications */}
          <div className="space-y-3 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <label className="px-4 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold flex items-center gap-2 shadow-2xs transition cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{logoKey ? "Change Chamber Logo" : "Upload Chamber Logo"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                  className="hidden"
                />
              </label>

              {logoKey && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={isUploadingLogo}
                  className="px-3.5 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Logo</span>
                </button>
              )}
            </div>

            {/* Dimension & File Size Specifications Box */}
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 text-left">
              <span className="text-[11px] font-bold text-[#1E293B] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#2A5CAA]" />
                <span>Recommended Image &amp; File Specifications:</span>
              </span>
              <ul className="text-[11px] text-[#475569] space-y-1 pl-4 list-disc marker:text-[#2A5CAA]">
                <li>
                  <strong>Dimensions:</strong> <strong>400 × 120 px</strong> for horizontal letterhead (prescription/invoice) or <strong>400 × 400 px</strong> for square/crest icons. Minimum height 60 px.
                </li>
                <li>
                  <strong>File Size:</strong> Maximum <strong>5 MB</strong>.
                </li>
                <li>
                  <strong>Formats:</strong> <strong>PNG</strong> (transparent background strongly recommended for crisp high-DPI print reproduction), <strong>SVG</strong>, <strong>JPG</strong>, or <strong>WEBP</strong>.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Where This Logo Appears (Destination Showcase) */}
        <div className="space-y-2.5 pt-1">
          <span className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#2A5CAA]" />
            <span>Where this logo automatically reflects:</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-white border border-[#E4E4E7] flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-[#2A5CAA] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#1C1C1E] block">Official Prescriptions (Rx)</span>
                <span className="text-[11px] text-[#6B7280]">Printed on prescription letterhead header &amp; PDF exports.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E4E4E7] flex items-start gap-2.5">
              <CreditCard className="w-4 h-4 text-[#2A5CAA] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#1C1C1E] block">Invoices &amp; Money Receipts</span>
                <span className="text-[11px] text-[#6B7280]">Printed on billing receipts, cash vouchers &amp; patient email receipts.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E4E4E7] flex items-start gap-2.5">
              <LayoutDashboard className="w-4 h-4 text-[#2A5CAA] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#1C1C1E] block">EMR Navigation &amp; Sidebar</span>
                <span className="text-[11px] text-[#6B7280]">Featured on your chamber desktop sidebar &amp; mobile menu drawer.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E4E4E7] flex items-start gap-2.5">
              <Globe className="w-4 h-4 text-[#2A5CAA] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#1C1C1E] block">Public Online Booking</span>
                <span className="text-[11px] text-[#6B7280]">Header brand banner on patient self-booking portal (/book/{tenant.id ? 'chamber' : '...'}).</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E4E4E7] flex items-start gap-2.5">
              <Monitor className="w-4 h-4 text-[#2A5CAA] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#1C1C1E] block">Smart TV Queue Display</span>
                <span className="text-[11px] text-[#6B7280]">Chamber branding displayed on live waiting room TV display.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E4E4E7] flex items-start gap-2.5">
              <Printer className="w-4 h-4 text-[#2A5CAA] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#1C1C1E] block">Patient ID Cards</span>
                <span className="text-[11px] text-[#6B7280]">Embedded on CR80 chamber membership and identification cards.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinic Identity */}
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
        <h3 className="text-sm font-bold text-[#1C1C1E] uppercase tracking-wider">
          Clinic Profile &amp; Contact
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#6B7280]">
              Clinic Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#6B7280]">
              Contact Phone
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="01XXXXXXXXX"
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold text-[#6B7280]">
              Contact Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="info@clinic.com"
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
            />
          </div>

          {/* Brand Accent Color & Dynamic Theme Preview */}
          <div className="md:col-span-2 space-y-3 pt-2 border-t border-[#E4E4E7]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div>
                <label className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#2A5CAA]" />
                  <span>Brand Accent Color</span>
                </label>
                <p className="text-[11px] text-[#6B7280]">
                  Customizes your clinic primary action buttons, active navigation bars, public booking theme, and TV display.
                </p>
              </div>

              {/* Color input & Hex text */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.brandColor || "#2A5CAA"}
                  onChange={(e) =>
                    setFormData({ ...formData, brandColor: e.target.value })
                  }
                  className="w-10 h-10 p-0.5 rounded-xl border border-[#E4E4E7] cursor-pointer shrink-0 shadow-2xs"
                  title="Choose brand accent color"
                />
                <input
                  type="text"
                  value={formData.brandColor || "#2A5CAA"}
                  onChange={(e) =>
                    setFormData({ ...formData, brandColor: e.target.value })
                  }
                  className="w-28 px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none font-mono font-bold"
                  placeholder="#2A5CAA"
                />
              </div>
            </div>

            {/* Quick Popular Color Swatches */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-[#6B7280]">Quick Presets:</span>
              {[
                { name: "Medical Navy", hex: "#2A5CAA" },
                { name: "Emerald Green", hex: "#059669" },
                { name: "Teal Clinic", hex: "#0D9488" },
                { name: "Royal Sapphire", hex: "#1D4ED8" },
                { name: "Deep Violet", hex: "#7C3AED" },
                { name: "Crimson Rose", hex: "#BE123C" },
                { name: "Slate Charcoal", hex: "#334155" },
              ].map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => setFormData({ ...formData, brandColor: swatch.hex })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    formData.brandColor?.toLowerCase() === swatch.hex.toLowerCase()
                      ? "border-[#1C1C1E] bg-[#1C1C1E] text-white shadow-xs"
                      : "border-[#E4E4E7] bg-white text-[#4B5563] hover:border-gray-400"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <span>{swatch.name}</span>
                </button>
              ))}
            </div>

            {/* Live Interactive Preview Card */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E293B] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2A5CAA]" />
                  <span>Live Theme Reflection Preview (Dynamic)</span>
                </span>
                <span className="text-[10px] font-mono text-[#64748B]">
                  Applied: {formData.brandColor || "#2A5CAA"}
                </span>
              </div>

              {/* Mock Elements demonstrating reflection */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                {/* 1. Top Workspace Bar Preview */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-[#64748B] font-semibold">
                    <span>1. Top Workspace Accent Bar</span>
                    <span>Clinic EMR top border</span>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full transition-colors"
                    style={{ backgroundColor: formData.brandColor || "#2A5CAA" }}
                  />
                </div>

                {/* 2. Button and Nav pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Primary Action Button */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#64748B] font-semibold block">
                      2. Primary Action Button
                    </span>
                    <button
                      type="button"
                      style={{ backgroundColor: formData.brandColor || "#2A5CAA" }}
                      className="w-full py-2 px-3 rounded-xl text-white text-xs font-bold shadow-xs transition hover:opacity-90 cursor-default"
                    >
                      Book Appointment →
                    </button>
                  </div>

                  {/* Active Sidebar Item */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#64748B] font-semibold block">
                      3. Active Sidebar Tab
                    </span>
                    <div
                      style={{ backgroundColor: formData.brandColor || "#2A5CAA" }}
                      className="w-full py-2 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-between shadow-xs"
                    >
                      <span>Live Queue</span>
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    </div>
                  </div>

                  {/* Active Badge / Tag */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#64748B] font-semibold block">
                      4. Public Booking &amp; TV Accent
                    </span>
                    <div
                      style={{
                        backgroundColor: `${formData.brandColor || "#2A5CAA"}18`,
                        color: formData.brandColor || "#2A5CAA",
                        borderColor: `${formData.brandColor || "#2A5CAA"}40`,
                      }}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold border text-center"
                    >
                      Slot 10:30 AM (Selected)
                    </div>
                  </div>
                </div>
              </div>

              {/* Explanatory bullet points */}
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                <strong>Where does Brand Accent reflect?</strong> When saved, this color dynamically themes the <strong>top accent bar</strong> across your entire EMR workspace, the <strong>active navigation indicators</strong> in the sidebar and mobile drawer, the <strong>buttons &amp; slot pickers</strong> on your public patient booking portal, and the <strong>header &amp; token cards</strong> on your waiting room TV queue.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-[#6B7280]">
              Physical Address (Printed on Rx &amp; Invoices)
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="House #, Road #, Sector, City"
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
            />
          </div>
        </div>
      </div>

      {/* Doctor & Patient Record Privacy Policy */}
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#2A5CAA]" />
            <span>Doctor Patient Visibility &amp; Privacy Policy</span>
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Configure how chamber dentists view and access patient clinical records across your clinic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Option 1: Strict Isolation */}
          <div
            onClick={() =>
              setFormData({ ...formData, doctorPatientVisibilityMode: "ISOLATED" })
            }
            className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
              formData.doctorPatientVisibilityMode === "ISOLATED"
                ? "bg-blue-50/70 border-[#2A5CAA] ring-1 ring-[#2A5CAA] shadow-xs"
                : "bg-white border-[#E4E4E7] hover:border-[#CBD5E1]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#2A5CAA]" />
                  <span>Strict Doctor Isolation (Default)</span>
                </span>
                <input
                  type="radio"
                  name="doctorPatientVisibilityMode"
                  checked={formData.doctorPatientVisibilityMode === "ISOLATED"}
                  onChange={() =>
                    setFormData({ ...formData, doctorPatientVisibilityMode: "ISOLATED" })
                  }
                  className="w-4 h-4 text-[#2A5CAA]"
                />
              </div>
              <p className="text-xs text-[#64748B] mt-2">
                Doctors can <strong>only see and access patients assigned to their chamber</strong>. Other doctors&apos; patient lists and clinical histories are completely hidden and locked. Reassignments must be performed by Admin or Receptionist.
              </p>
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md mt-3 w-fit">
              Maximum Doctor Privacy &amp; Data Siloing
            </span>
          </div>

          {/* Option 2: Collaborative */}
          <div
            onClick={() =>
              setFormData({ ...formData, doctorPatientVisibilityMode: "COLLABORATIVE" })
            }
            className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
              formData.doctorPatientVisibilityMode === "COLLABORATIVE"
                ? "bg-blue-50/70 border-[#2A5CAA] ring-1 ring-[#2A5CAA] shadow-xs"
                : "bg-white border-[#E4E4E7] hover:border-[#CBD5E1]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Collaborative Cross-Coverage</span>
                </span>
                <input
                  type="radio"
                  name="doctorPatientVisibilityMode"
                  checked={formData.doctorPatientVisibilityMode === "COLLABORATIVE"}
                  onChange={() =>
                    setFormData({ ...formData, doctorPatientVisibilityMode: "COLLABORATIVE" })
                  }
                  className="w-4 h-4 text-[#2A5CAA]"
                />
              </div>
              <p className="text-xs text-[#64748B] mt-2">
                Doctors default to their own chamber patients, but have an <strong>All Clinic Patients</strong> tab to look up any chart. If a colleague is delayed or leaves, the attending doctor can view records and click <strong>Take Over Patient</strong> directly.
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md mt-3 w-fit">
              Faster Emergency Handovers &amp; Collaboration
            </span>
          </div>
        </div>
      </div>

      {/* Scheduling & Public Booking Rules */}
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
        <h3 className="text-sm font-bold text-[#1C1C1E] uppercase tracking-wider">
          Scheduling &amp; Online Booking Policy
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#6B7280]">
              Slot Granularity (Minutes)
            </label>
            <select
              value={formData.slotGranularityMinutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slotGranularityMinutes: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none bg-white"
            >
              <option value={10}>10 Minutes (Recommended)</option>
              <option value={15}>15 Minutes</option>
              <option value={20}>20 Minutes</option>
              <option value={30}>30 Minutes</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#6B7280]">
              Buffer Between Bookings (Minutes)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={formData.bookingBufferMinutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  bookingBufferMinutes: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#6B7280]">
              Public Booking Window (Days Ahead)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={formData.publicBookingDaysAhead}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  publicBookingDaysAhead: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#6B7280]">
              Minimum Lead Time (Minutes before slot)
            </label>
            <input
              type="number"
              min={0}
              value={formData.publicBookingMinLeadMinutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  publicBookingMinLeadMinutes: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none"
            />
          </div>

          <div className="md:col-span-2 pt-2 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoConfirmExistingPatientBookings}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    autoConfirmExistingPatientBookings: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-[#E4E4E7] text-[#2A5CAA]"
              />
              <span className="text-xs text-[#1C1C1E] font-medium">
                Auto-confirm online bookings if patient enters valid existing Card Number
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.reminder24hEnabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reminder24hEnabled: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-[#E4E4E7] text-[#2A5CAA]"
              />
              <span className="text-xs text-[#1C1C1E] font-medium">
                Send automated 24-hour reminder email to scheduled patients
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.reminder2hEnabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reminder2hEnabled: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-[#E4E4E7] text-[#2A5CAA]"
              />
              <span className="text-xs text-[#1C1C1E] font-medium">
                Send automated 2-hour reminder email on day of appointment
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Prescription & Invoice Print Geometry */}
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
        <h3 className="text-sm font-bold text-[#1C1C1E] uppercase tracking-wider">
          Print Template Geometry
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#6B7280]">
              Rx Paper Size
            </label>
            <select
              value={formData.rxPaperSize}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  rxPaperSize: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none bg-white"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="A5">A5 (148 × 210 mm)</option>
              <option value="THERMAL_80MM">Thermal 80mm Roll</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#6B7280]">
              Top Margin for Letterhead (mm)
            </label>
            <input
              type="number"
              min={0}
              max={150}
              value={formData.rxTopMarginMm}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  rxTopMarginMm: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#6B7280]">
              Invoice Paper Size
            </label>
            <select
              value={formData.invoicePaperSize}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  invoicePaperSize: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none bg-white"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="A5">A5 (148 × 210 mm)</option>
              <option value="THERMAL_80MM">Thermal 80mm POS Receipt</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.rxPrintLetterhead}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rxPrintLetterhead: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-[#E4E4E7] text-[#2A5CAA]"
              />
              <span className="text-xs text-[#1C1C1E] font-medium">
                Print clinic header on plain paper (disable if printing on pre-printed prescription pad)
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold shadow-md transition disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save Changes</span>
        </button>
      </div>
    </form>
  );
}
