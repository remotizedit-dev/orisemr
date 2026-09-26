import { requireClinicStaff } from "@/lib/session";
import GeneralSettingsClient from "@/components/settings/GeneralSettingsClient";

export default async function SettingsPage() {
  const { tenant } = await requireClinicStaff();

  return (
    <div className="w-full">
      <GeneralSettingsClient tenant={tenant} />
    </div>
  );
}

