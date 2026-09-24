import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { PrescriptionsListClient } from "@/components/prescription/PrescriptionsListClient";
import { FileText, Plus } from "lucide-react";

export default async function PrescriptionsPage() {
  const { tenant } = await requireClinicStaff();

  // Fetch all prescriptions for this tenant, joined with patient and doctor
  const rxList = await db
    .select({
      id: schema.prescriptions.id,
      rxCode: schema.prescriptions.rxCode,
      patientId: schema.prescriptions.patientId,
      patientName: schema.patients.name,
      patientPhone: schema.patients.phone,
      patientCardNumber: schema.patients.cardNumber,
      patientGender: schema.patients.gender,
      patientApproxAge: schema.patients.approxAge,
      doctorId: schema.prescriptions.doctorId,
      doctorName: schema.users.name,
      doctorTitle: schema.users.doctorTitle,
      diagnosis: schema.prescriptions.diagnosis,
      chiefComplaint: schema.prescriptions.chiefComplaint,
      toothCodes: schema.prescriptions.toothCodes,
      nextVisitDate: schema.prescriptions.nextVisitDate,
      createdAt: schema.prescriptions.createdAt,
    })
    .from(schema.prescriptions)
    .innerJoin(
      schema.patients,
      eq(schema.prescriptions.patientId, schema.patients.id)
    )
    .innerJoin(
      schema.users,
      eq(schema.prescriptions.doctorId, schema.users.id)
    )
    .where(eq(schema.prescriptions.tenantId, tenant.id))
    .orderBy(desc(schema.prescriptions.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#EBF2FC] text-[#2A5CAA]">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
              Prescriptions
            </h1>
          </div>
          <p className="text-sm text-[#6B7280] mt-1">
            Browse, search, print, and issue clinical dental prescriptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/queue"
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] font-semibold text-xs transition"
          >
            In-Chair Queue
          </Link>
          <Link
            href="/app/patients"
            className="px-4 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-bold text-xs shadow-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Select Patient to Prescribe</span>
          </Link>
        </div>
      </div>

      {/* Interactive Prescription Table Client */}
      <PrescriptionsListClient initialPrescriptions={rxList} />
    </div>
  );
}
