import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

interface TenantPrivacyContext {
  id: string;
  doctorPatientVisibilityMode?: string | null;
}

interface UserPrivacyContext {
  id: string;
  role: string;
  isDoctor?: boolean | null;
}

/**
 * Checks whether a given user has authorization to access a patient's medical records,
 * write prescriptions, or generate invoices under the chamber's configured visibility mode.
 *
 * In ISOLATED mode:
 * Pure doctors (DOCTOR role, not TENANT_ADMIN / SUPER_ADMIN) are strictly restricted:
 * They may only access patients assigned directly to them OR patients with whom they have an active
 * consultation history (appointment, prescription, or queue entry).
 */
export async function canDoctorAccessPatient(
  tenant: TenantPrivacyContext,
  user: UserPrivacyContext,
  patientId: string,
  preloadedAssignedDoctorId?: string | null
): Promise<boolean> {
  const visibilityMode =
    (tenant.doctorPatientVisibilityMode as "ISOLATED" | "COLLABORATIVE") || "ISOLATED";

  // Admins, receptionists, and collaborative clinics have clinic-wide clinical access
  const isPureDoctor = Boolean(
    (user.isDoctor || user.role === "DOCTOR") &&
    user.role !== "TENANT_ADMIN" &&
    user.role !== "SUPER_ADMIN" &&
    user.role !== "RECEPTIONIST"
  );

  if (!isPureDoctor || visibilityMode !== "ISOLATED") {
    return true;
  }

  // Fast-path: If preloaded assigned doctor matches user ID
  if (preloadedAssignedDoctorId && preloadedAssignedDoctorId === user.id) {
    return true;
  }

  // Check if patient record has this doctor assigned
  const [patient] = await db
    .select({ assignedDoctorId: schema.patients.assignedDoctorId })
    .from(schema.patients)
    .where(
      and(
        eq(schema.patients.tenantId, tenant.id),
        eq(schema.patients.id, patientId)
      )
    )
    .limit(1);

  if (patient?.assignedDoctorId === user.id) {
    return true;
  }

  // Check whether doctor has any prior appointment with this patient
  const [hasAppointment] = await db
    .select({ id: schema.appointments.id })
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.tenantId, tenant.id),
        eq(schema.appointments.patientId, patientId),
        eq(schema.appointments.doctorId, user.id)
      )
    )
    .limit(1);

  if (hasAppointment) return true;

  // Check whether doctor has issued any prescription to this patient
  const [hasPrescription] = await db
    .select({ id: schema.prescriptions.id })
    .from(schema.prescriptions)
    .where(
      and(
        eq(schema.prescriptions.tenantId, tenant.id),
        eq(schema.prescriptions.patientId, patientId),
        eq(schema.prescriptions.doctorId, user.id)
      )
    )
    .limit(1);

  if (hasPrescription) return true;

  // Check whether doctor has an active queue entry with this patient
  const [hasQueue] = await db
    .select({ id: schema.queueEntries.id })
    .from(schema.queueEntries)
    .where(
      and(
        eq(schema.queueEntries.tenantId, tenant.id),
        eq(schema.queueEntries.patientId, patientId),
        eq(schema.queueEntries.doctorId, user.id)
      )
    )
    .limit(1);

  return Boolean(hasQueue);
}
