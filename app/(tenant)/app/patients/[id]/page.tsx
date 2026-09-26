import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { PatientHeaderActions } from "@/components/patients/PatientHeaderActions";
import { formatBdPhone, formatBdt, formatDhakaDate } from "@/lib/utils";
import { getFileUrl } from "@/lib/s3";
import {
  AlertCircle,
  Calendar,
  CreditCard,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Mail,
  MapPin,
  Paperclip,
  Phone,
  Plus,
  Printer,
  ShieldAlert,
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
        eq(schema.patients.id, id),
        isNull(schema.patients.deletedAt)
      )
    )
    .limit(1);

  if (!patient) {
    notFound();
  }

  // Fetch patient clinical records, billing invoices, appointment history, and uploaded reports in parallel
  const [prescriptions, invoices, appointments, attachments] = await Promise.all([
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

    // 5. Fetch Attachments / Reports
    db
      .select({
        id: schema.attachments.id,
        title: schema.attachments.title,
        kind: schema.attachments.kind,
        reportCode: schema.attachments.reportCode,
        s3Key: schema.attachments.s3Key,
        contentType: schema.attachments.contentType,
        sizeBytes: schema.attachments.sizeBytes,
        uploadedAt: schema.attachments.uploadedAt,
        uploadedByName: schema.users.name,
      })
      .from(schema.attachments)
      .leftJoin(schema.users, eq(schema.attachments.uploadedBy, schema.users.id))
      .where(
        and(
          eq(schema.attachments.tenantId, tenant.id),
          eq(schema.attachments.patientId, id),
          sql`${schema.attachments.deletedAt} IS NULL`
        )
      )
      .orderBy(desc(schema.attachments.uploadedAt)),
  ]);

  const enrichedAttachments = attachments.map((att) => ({
    ...att,
    url: getFileUrl(att.s3Key),
  }));

  const totalOutstanding = invoices
    .filter((inv) => inv.status === "due" || inv.status === "partial")
    .reduce((acc, inv) => acc + (inv.totalBdt - inv.paidBdt), 0);

  return (
    <div className="space-y-6">
      {/* Patient Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2.5">
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
            <a
              href={`tel:${patient.phone}`}
              className="font-mono text-[#1C1C1E] font-semibold hover:text-[#2A5CAA] hover:underline flex items-center gap-1"
            >
              <Phone className="w-3.5 h-3.5 text-[#2A5CAA]" />
              <span>{formatBdPhone(patient.phone)}</span>
            </a>

            <span>•</span>
            {patient.email ? (
              <a
                href={`mailto:${patient.email}`}
                className="text-[#2A5CAA] font-semibold hover:underline flex items-center gap-1"
              >
                <Mail className="w-3.5 h-3.5 text-[#2A5CAA]" />
                <span>{patient.email}</span>
              </a>
            ) : (
              <span className="text-[#9CA3AF] flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span>No email</span>
              </span>
            )}

            {patient.address && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#4B5563]">
                  <MapPin className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>{patient.address}</span>
                </span>
              </>
            )}

            {patient.dateOfBirth && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#6B7280]">
                  <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>DOB: {formatDhakaDate(patient.dateOfBirth, "dd MMM yyyy")}</span>
                </span>
              </>
            )}

            {(patient.emergencyContactName || patient.emergencyContactPhone) && (
              <>
                <span>•</span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                  Emergency: {patient.emergencyContactName || ""}
                  {patient.emergencyContactPhone ? ` (${patient.emergencyContactPhone})` : ""}
                </span>
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

          {/* Clinical Notes & Allergy Notes (if provided) */}
          {(patient.medicalNotes || patient.allergyNotes) && (
            <div className="pt-2 space-y-1.5">
              {patient.medicalNotes && (
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Medical Background Notes: </span>
                    <span>{patient.medicalNotes}</span>
                  </div>
                </div>
              )}
              {patient.allergyNotes && (
                <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-200/70 text-xs text-red-900 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Allergy Details &amp; Precautions: </span>
                    <span>{patient.allergyNotes}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons including Edit & Delete */}
        <PatientHeaderActions
          patient={{
            id: patient.id,
            name: patient.name,
            phone: patient.phone,
            cardNumber: patient.cardNumber,
            email: patient.email,
            gender: patient.gender,
            approxAge: patient.approxAge,
            dateOfBirth: patient.dateOfBirth,
            bloodGroup: patient.bloodGroup,
            address: patient.address,
            emergencyContactName: patient.emergencyContactName,
            emergencyContactPhone: patient.emergencyContactPhone,
            allergyFlags: patient.allergyFlags || [],
            medicalConditions: patient.medicalConditions || [],
            allergyNotes: patient.allergyNotes,
            medicalNotes: patient.medicalNotes,
          }}
          canPrescribe={Boolean(
            user.isDoctor || user.role === "DOCTOR" || user.role === "TENANT_ADMIN"
          )}
        />
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
              {(user.isDoctor || user.role === "DOCTOR" || user.role === "TENANT_ADMIN") && (
                <Link
                  href={`/app/prescriptions/new?patientId=${patient.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#2A5CAA] bg-[#E8EEF7] hover:bg-[#2A5CAA] hover:text-white px-2.5 py-1 rounded-lg transition-colors"
                >
                  + New Prescription
                </Link>
              )}
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

          {/* Clinical Reports, X-Rays & Uploaded Documents */}
          <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
            <div className="p-4 border-b border-[#E4E4E7] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1C1C1E] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#2A5CAA]" />
                <span>Clinical Reports, X-Rays &amp; Documents ({enrichedAttachments.length})</span>
              </h2>
            </div>

            <div className="p-4">
              {enrichedAttachments.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6B7280] bg-[#F9FAFB] rounded-xl border border-dashed border-[#E4E4E7]">
                  No clinical documents, X-rays, or lab reports uploaded yet for this patient.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {enrichedAttachments.map((att) => {
                    const isImg =
                      att.contentType?.startsWith("image/") ||
                      /\.(jpg|jpeg|png|webp|gif)$/i.test(att.s3Key);

                    return (
                      <div
                        key={att.id}
                        className="p-3.5 rounded-2xl bg-white border border-[#E4E4E7] shadow-2xs space-y-3 flex flex-col justify-between hover:border-[#2A5CAA]/40 transition group"
                      >
                        <div className="space-y-2">
                          {isImg && (
                            <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center relative">
                              <img
                                src={att.url}
                                alt={att.title || "Clinical Report"}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#E8EEF7] text-[#2A5CAA]">
                              {att.kind.replace("_", " ")}
                            </span>
                            <span className="font-mono text-[10px] text-[#6B7280]">
                              {att.reportCode || "DOC"}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm text-[#1C1C1E] line-clamp-1 group-hover:text-[#2A5CAA]">
                            {att.title}
                          </h3>

                          <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                            <span>{formatDhakaDate(att.uploadedAt, "dd MMM yyyy")}</span>
                            {att.uploadedByName && <span>By {att.uploadedByName}</span>}
                          </div>
                        </div>

                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-[#2A5CAA] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Full Document ↗</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Invoices & Outstanding Due Balance */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#2A5CAA]" />
                <span>Billing Summary</span>
              </h2>
              <Link
                href={`/app/billing/new?patientId=${patient.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#2A5CAA] bg-[#E8EEF7] hover:bg-[#2A5CAA] hover:text-white px-2.5 py-1 rounded-lg transition-colors"
              >
                + New Invoice
              </Link>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFF7EB] border border-[#FF9F0A]/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold block">
                  Total Outstanding Due:
                </span>
                <span className={`text-2xl font-black block mt-0.5 ${totalOutstanding > 0 ? "text-[#C0392B]" : "text-[#1C1C1E]"}`}>
                  {formatBdt(totalOutstanding)}
                </span>
              </div>
              {totalOutstanding > 0 && (
                <Link
                  href={`/app/billing/dues?search=${encodeURIComponent(patient.phone || patient.name)}`}
                  className="px-3 py-1.5 bg-[#C0392B] hover:bg-[#A93226] text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                >
                  Settle Due →
                </Link>
              )}
            </div>

            <div className="divide-y divide-[#E4E4E7] text-xs">
              {invoices.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#6B7280]">
                  No invoices generated yet.
                </div>
              ) : (
                invoices.map((inv) => {
                  const dueBdt = inv.totalBdt - inv.paidBdt;
                  const isUnpaid = inv.status === "due" || inv.status === "partial" || dueBdt > 0;
                  return (
                    <div key={inv.id} className="py-3 flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#1C1C1E]">
                            {inv.invoiceCode || "DRAFT"}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              inv.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : inv.status === "partial"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {inv.status.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#6B7280] block mt-0.5">
                          {formatDhakaDate(inv.createdAt, "dd MMM yyyy")}
                        </span>
                        {isUnpaid && (
                          <span className="text-[11px] text-[#C0392B] font-semibold block">
                            Due: {formatBdt(dueBdt)}
                          </span>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="font-bold text-[#1C1C1E]">
                          {formatBdt(inv.totalBdt)}
                        </span>
                        <div className="flex items-center gap-2">
                          {isUnpaid && (
                            <Link
                              href={`/app/billing/dues?invoiceId=${inv.id}`}
                              className="text-[11px] font-bold text-[#C0392B] hover:underline bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                            >
                              Pay Due
                            </Link>
                          )}
                          <Link
                            href={`/print/invoice/${inv.id}`}
                            target="_blank"
                            className="text-[11px] text-[#2A5CAA] hover:underline"
                          >
                            Print →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
