import { requireClinicStaff } from "@/lib/session";
import { getFileUrl } from "@/lib/s3";
import GeneralSettingsClient from "@/components/settings/GeneralSettingsClient";

export const metadata = {
  title: "Clinic Settings",
};

export default async function SettingsPage() {
  const { tenant } = await requireClinicStaff();
  const initialLogoUrl = tenant.logoKey ? getFileUrl(tenant.logoKey) : null;

  return (
    <div className="w-full">
      <GeneralSettingsClient tenant={tenant} initialLogoUrl={initialLogoUrl} />
    </div>
  );
}

