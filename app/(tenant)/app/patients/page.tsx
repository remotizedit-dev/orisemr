import Link from "next/link";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { UserPlus } from "lucide-react";
import PatientsListClient, { type PatientRow } from "@/components/patients/PatientsListClient";

export const metadata = {
  title: "Patients",
};

export default async function PatientsListPage() {
  const { tenant, user } = await requireClinicStaff();

  const isPureDoctor = Boolean(
    (user.isDoctor || user.role === "DOCTOR") &&
    user.role !== "TENANT_ADMIN" &&
    user.role !== "SUPER_ADMIN" &&
    user.role !== "RECEPTIONIST"
  );

  // Doctors list in this clinic for doctor assignment filter
  const doctors = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.tenantId, tenant.id),
        eq(schema.users.isDoctor, true),
        eq(schema.users.status, "active")
      )
    )
    .orderBy(schema.users.name);

  const isDoctorUser = Boolean(user.isDoctor || user.role === "DOCTOR");

  // If user is a doctor, identify all patients associated with them
  // (via assignedDoctorId, or having appointments/queue/prescriptions with this doctor)
  const myPatientIdSet = new Set<string>();
  if (isDoctorUser) {
    const [myApts, myQueue, myRx] = await Promise.all([
      db
        .select({ patientId: schema.appointments.patientId })
        .from(schema.appointments)
        .where(
          and(
            eq(schema.appointments.tenantId, tenant.id),
            eq(schema.appointments.doctorId, user.id)
          )
        ),
      db
        .select({ patientId: schema.queueEntries.patientId })
        .from(schema.queueEntries)
        .where(
          and(
            eq(schema.queueEntries.tenantId, tenant.id),
            eq(schema.queueEntries.doctorId, user.id)
          )
        ),
      db
        .select({ patientId: schema.prescriptions.patientId })
        .from(schema.prescriptions)
        .where(
          and(
            eq(schema.prescriptions.tenantId, tenant.id),
            eq(schema.prescriptions.doctorId, user.id)
          )
        ),
    ]);

    myApts.forEach((a) => a.patientId && myPatientIdSet.add(a.patientId));
    myQueue.forEach((q) => q.patientId && myPatientIdSet.add(q.patientId));
    myRx.forEach((r) => r.patientId && myPatientIdSet.add(r.patientId));
  }

  const patientList = await db
    .select({
      id: schema.patients.id,
      name: schema.patients.name,
      phone: schema.patients.phone,
      cardNumber: schema.patients.cardNumber,
      gender: schema.patients.gender,
      approxAge: schema.patients.approxAge,
      allergyFlags: schema.patients.allergyFlags,
      medicalConditions: schema.patients.medicalConditions,
      createdAt: schema.patients.createdAt,
      assignedDoctorId: schema.patients.assignedDoctorId,
      assignedDoctorName: schema.users.name,
    })
    .from(schema.patients)
    .leftJoin(
      schema.users,
      eq(schema.patients.assignedDoctorId, schema.users.id)
    )
    .where(
      and(
        eq(schema.patients.tenantId, tenant.id),
        isNull(schema.patients.deletedAt)
      )
    )
    .orderBy(desc(schema.patients.createdAt));

  const formattedPatients: PatientRow[] = patientList.map((p) => ({
    id: p.id,
    name: p.name,
    phone: p.phone,
    cardNumber: p.cardNumber,
    gender: p.gender,
    approxAge: p.approxAge,
    allergyFlags: p.allergyFlags || [],
    medicalConditions: p.medicalConditions || [],
    createdAt: p.createdAt.toISOString(),
    assignedDoctorId: p.assignedDoctorId || null,
    assignedDoctorName: p.assignedDoctorName || null,
    isMyPatient: isDoctorUser
      ? p.assignedDoctorId === user.id || myPatientIdSet.has(p.id)
      : true,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Patients ({formattedPatients.length})
          </h1>
          <p className="text-sm text-[#6B7280]">
            {isPureDoctor
              ? `Displaying patients assigned to you (Dr. ${user.name}).`
              : "Search registered chamber records, card numbers, and assigned dentists."}
          </p>
        </div>

        <Link
          href="/app/patients/new"
          prefetch={false}
          className="px-5 py-3 rounded-2xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-bold text-sm flex items-center gap-2 shadow-md transition cursor-pointer"
        >
          <UserPlus className="w-4.5 h-4.5" />
          <span>Register New Patient</span>
        </Link>
      </div>

      <PatientsListClient
        initialPatients={formattedPatients}
        isPureDoctor={isPureDoctor}
        currentDoctorName={user.name}
        doctors={doctors}
      />
    </div>
  );
}
