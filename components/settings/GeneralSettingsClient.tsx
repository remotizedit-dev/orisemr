"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateGeneralSettingsAction } from "@/app/(tenant)/app/settings/actions";

interface Props {
  tenant: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
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
  const [formData, setFormData] = useState({
    name: tenant.name,
    phone: tenant.phone || "",
    email: tenant.email || "",
    address: tenant.address || "",
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateGeneralSettingsAction(formData);
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
