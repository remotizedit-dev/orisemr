import { requireClinicStaff } from "@/lib/session";
import CardModeClient from "@/components/settings/CardModeClient";

export default async function SettingsCardPage() {
  const { tenant } = await requireClinicStaff();

  return (
    <div className="w-full">
      <CardModeClient
        initialMode={tenant.patientIdMode as any}
        minLen={tenant.patientIdMinLen}
        maxLen={tenant.patientIdMaxLen}
      />
    </div>
  );
}

