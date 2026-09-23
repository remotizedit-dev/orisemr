import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { UserPlus } from "lucide-react";
import PatientsListClient, { type PatientRow } from "@/components/patients/PatientsListClient";

export default async function PatientsListPage() {
  const { tenant } = await requireClinicStaff();

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
    })
    .from(schema.patients)
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
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Patients ({formattedPatients.length})
          </h1>
          <p className="text-sm text-[#6B7280]">
            Search registered chamber records, card numbers, and medical conditions.
          </p>
        </div>

        <Link
          href="/app/patients/new"
          className="px-4 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </Link>
      </div>

      <PatientsListClient initialPatients={formattedPatients} />
    </div>
  );
}
