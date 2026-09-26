"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Image as ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
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
  };
}

export default function GeneralSettingsClient({ tenant }: Props) {
  const router = useRouter();
  const [logoKey, setLogoKey] = useState<string | null>(tenant.logoKey || null);
  const [logoPreview, setLogoPreview] = useState<string | null>(() => {
    if (!tenant.logoKey) return null;
    if (
      tenant.logoKey.startsWith("http://") ||
      tenant.logoKey.startsWith("https://") ||
      tenant.logoKey.startsWith("/")
    ) {
      return tenant.logoKey;
    }
    return `/uploads/${tenant.logoKey}`;
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
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#1C1C1E] uppercase tracking-wider">
            Clinic Logo &amp; Branding
          </h3>
          <p className="text-xs text-[#6B7280]">
            This logo will automatically appear on printed prescriptions, billing invoices/receipts, and automated patient emails.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-1">
          {/* Logo Preview Card */}
          <div className="w-40 h-24 rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-white flex flex-col items-center justify-center p-2 relative overflow-hidden shrink-0 shadow-2xs group">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Clinic Logo Preview"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-center text-[#9CA3AF] space-y-1">
                <ImageIcon className="w-7 h-7 mx-auto stroke-1" />
                <span className="text-[10px] font-semibold block">No Logo Set</span>
              </div>
            )}

            {isUploadingLogo && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-[#2A5CAA]" />
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="space-y-2.5 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <label className="px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{logoKey ? "Change Logo" : "Upload Clinic Logo"}</span>
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
                  className="px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-[#6B7280]">
              Recommended: Crisp square or horizontal logo (PNG, JPG, or SVG) with transparent or white background. Max 5 MB.
            </p>
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

          <div className="space-y-1">
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#6B7280]">
              Brand Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.brandColor}
                onChange={(e) =>
                  setFormData({ ...formData, brandColor: e.target.value })
                }
                className="w-9 h-9 p-0.5 rounded-lg border border-[#E4E4E7] cursor-pointer"
              />
              <input
                type="text"
                value={formData.brandColor}
                onChange={(e) =>
                  setFormData({ ...formData, brandColor: e.target.value })
                }
                className="w-32 px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none font-mono"
              />
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
