import { requireClinicStaff } from "@/lib/session";
import SettingsTabs from "@/components/settings/SettingsTabs";
import GeneralSettingsClient from "@/components/settings/GeneralSettingsClient";

export default async function SettingsPage() {
  const { tenant } = await requireClinicStaff();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
          Chamber Settings
        </h1>
        <p className="text-sm text-[#6B7280]">
          Configure clinic operational hours, chairs, billing catalog, and patient ID mode.
        </p>
      </div>

      <SettingsTabs />

      <GeneralSettingsClient tenant={tenant} />
    </div>
  );
}
