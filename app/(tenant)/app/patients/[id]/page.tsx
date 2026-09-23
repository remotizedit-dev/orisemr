import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { formatBdPhone, formatBdt, formatDhakaDate } from "@/lib/utils";
import {
  AlertCircle,
  Calendar,
  CreditCard,
  FileText,
  Paperclip,
  Plus,
  Printer,
  Stethoscope,
  User,
} from "lucide-react";

export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { tenant, user } = await requireClinicStaff();
  const { id } = await params;

  // 1. Fetch Patient
  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(
      and(
        eq(schema.patients.tenantId, tenant.id),
        eq(schema.patients.id, id)
      )
    )
    .limit(1);

  if (!patient) {
    notFound();
  }

  // Fetch patient clinical records, billing invoices, and appointment history in parallel
  const [prescriptions, invoices, appointments] = await Promise.all([
    // 2. Fetch Prescriptions
    db
      .select({
        id: schema.prescriptions.id,
        rxCode: schema.prescriptions.rxCode,
        diagnosis: schema.prescriptions.diagnosis,
        createdAt: schema.prescriptions.createdAt,
        doctorName: schema.users.name,
      })
      .from(schema.prescriptions)
      .innerJoin(
        schema.users,
        eq(schema.prescriptions.doctorId, schema.users.id)
      )
      .where(
        and(
          eq(schema.prescriptions.tenantId, tenant.id),
          eq(schema.prescriptions.patientId, id)
        )
      )
      .orderBy(desc(schema.prescriptions.createdAt)),

    // 3. Fetch Invoices
    db
      .select()
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.tenantId, tenant.id),
          eq(schema.invoices.patientId, id)
        )
      )
      .orderBy(desc(schema.invoices.createdAt)),

    // 4. Fetch Appointments
    db
      .select({
        id: schema.appointments.id,
        code: schema.appointments.appointmentCode,
        startTime: schema.appointments.startTime,
        status: schema.appointments.status,
        doctorName: schema.users.name,
      })
      .from(schema.appointments)
      .innerJoin(
        schema.users,
        eq(schema.appointments.doctorId, schema.users.id)
      )
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          eq(schema.appointments.patientId, id)
        )
      )
      .orderBy(desc(schema.appointments.startTime)),
  ]);

  const totalOutstanding = invoices
    .filter((inv) => inv.status === "due" || inv.status === "partial")
    .reduce((acc, inv) => acc + (inv.totalBdt - inv.paidBdt), 0);

  return (
    <div className="space-y-6">
      {/* Patient Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
              {patient.name}
            </h1>
            <span className="font-mono text-sm px-2.5 py-0.5 rounded-lg bg-[#E8EEF7] text-[#2A5CAA] font-bold">
              {patient.cardNumber}
            </span>
            {patient.bloodGroup && (
              <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-200">
                {patient.bloodGroup}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
            <span>
              {patient.approxAge ? `${patient.approxAge} years` : "Age —"} •{" "}
              <span className="capitalize">{patient.gender}</span>
            </span>
            <span>•</span>
            <span className="font-mono text-[#1C1C1E] font-semibold">
              {formatBdPhone(patient.phone)}
            </span>
            {patient.address && (
              <>
                <span>•</span>
                <span>{patient.address}</span>
              </>
            )}
          </div>

          {/* Allergy Badges (Red) and Medical Condition Badges (Amber) */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {patient.allergyFlags.map((flag) => (
              <span
                key={flag}
                className="px-2.5 py-0.5 rounded-full bg-[#FFEBEA] border border-[#FF453A]/40 text-[#FF453A] font-bold text-xs flex items-center gap-1 shadow-xs"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Allergy: {flag}</span>
              </span>
            ))}
            {patient.medicalConditions.map((cond) => (
              <span
                key={cond}
                className="px-2.5 py-0.5 rounded-full bg-[#FFF7EB] border border-[#FF9F0A]/40 text-[#FF9F0A] font-bold text-xs shadow-xs"
              >
                {cond}
              </span>
            ))}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {(user.isDoctor || user.role === "DOCTOR") && (
            <Link
              href={`/app/prescriptions/new?patientId=${patient.id}`}
              className="px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <FileText className="w-4 h-4" />
              <span>New Prescription</span>
            </Link>
          )}

          <Link
            href={`/app/appointments/new?patientId=${patient.id}`}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Calendar className="w-3.5 h-3.5 text-[#2A5CAA]" />
            <span>Book Visit</span>
          </Link>

          <Link
            href={`/app/billing/new?patientId=${patient.id}`}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#FF9F0A]" />
            <span>New Invoice</span>
          </Link>

          <Link
            href={`/print/card/${patient.id}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>Print Card</span>
          </Link>
        </div>
      </div>

      {/* Profile Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Prescriptions & Visits History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prescriptions History */}
          <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
            <div className="p-4 border-b border-[#E4E4E7] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1C1C1E] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2A5CAA]" />
                <span>Prescriptions History ({prescriptions.length})</span>
              </h2>
            </div>

            <div className="divide-y divide-[#E4E4E7]">
              {prescriptions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6B7280]">
                  No prescriptions recorded yet.
                </div>
              ) : (
                prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-4 hover:bg-white/80 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#2A5CAA]">
                          {rx.rxCode}
                        </span>
                        <span className="text-[#6B7280]">
                          • {formatDhakaDate(rx.createdAt, "dd MMM yyyy")}
                        </span>
                      </div>
                      <p className="mt-1 text-[#1C1C1E] font-medium">
                        Diagnosis: {rx.diagnosis || "Routine Dental Care"}
                      </p>
                      <span className="text-[11px] text-[#6B7280]">
                        Prescribed by {rx.doctorName}
                      </span>
                    </div>

                    <Link
                      href={`/print/prescription/${rx.id}`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Appointments History */}
          <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
            <div className="p-4 border-b border-[#E4E4E7]">
              <h2 className="text-sm font-bold text-[#1C1C1E] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#FF9F0A]" />
                <span>Appointments ({appointments.length})</span>
              </h2>
            </div>

            <div className="divide-y divide-[#E4E4E7]">
              {appointments.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6B7280]">
                  No past appointments recorded.
                </div>
              ) : (
                appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 hover:bg-white/80 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#1C1C1E]">
                        {apt.code}
                      </span>
                      <span className="text-[#6B7280] ml-2">
                        {formatDhakaDate(apt.startTime, "dd MMM yyyy, hh:mm a")}
                      </span>
                      <span className="block text-[11px] text-[#6B7280]">
                        Dentist: {apt.doctorName}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        apt.status === "completed"
                          ? "bg-[#E8F8EE] text-[#30D158]"
                          : apt.status === "confirmed"
                          ? "bg-[#E8EEF7] text-[#2A5CAA]"
                          : "bg-[#F4F4F5] text-[#6B7280]"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Invoices & Outstanding Due Balance */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#2A5CAA]" />
              <span>Billing Summary</span>
            </h2>

            <div className="p-3.5 rounded-xl bg-[#FFF7EB] border border-[#FF9F0A]/30">
              <span className="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold block">
                Total Outstanding Due:
              </span>
              <span className="text-2xl font-black text-[#1C1C1E] block mt-0.5">
                {formatBdt(totalOutstanding)}
              </span>
            </div>

            <div className="divide-y divide-[#E4E4E7] text-xs">
              {invoices.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#6B7280]">
                  No invoices generated yet.
                </div>
              ) : (
                invoices.map((inv) => (
                  <div key={inv.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-[#1C1C1E]">
                        {inv.invoiceCode || "DRAFT"}
                      </span>
                      <span className="text-[11px] text-[#6B7280] block">
                        {formatDhakaDate(inv.createdAt, "dd MMM yyyy")}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#1C1C1E]">
                        {formatBdt(inv.totalBdt)}
                      </span>
                      <Link
                        href={`/print/invoice/${inv.id}`}
                        target="_blank"
                        className="text-[11px] text-[#2A5CAA] hover:underline block"
                      >
                        Print →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
