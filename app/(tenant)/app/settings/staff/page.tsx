import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import SettingsTabs from "@/components/settings/SettingsTabs";
import StaffClient from "@/components/settings/StaffClient";

export default async function SettingsStaffPage() {
  const { tenant } = await requireClinicStaff();

  // Fetch all staff / receptionists for this tenant
  const staff = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      role: schema.users.role,
      status: schema.users.status,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.tenantId, tenant.id),
        eq(schema.users.role, "RECEPTIONIST")
      )
    )
    .orderBy(schema.users.name);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
          Chamber Settings
        </h1>
        <p className="text-sm text-[#6B7280]">
          Manage front-desk staff, receptionists, and user permissions for your clinic.
        </p>
      </div>

      <SettingsTabs />

      <StaffClient initialStaff={staff} />
    </div>
  );
}
