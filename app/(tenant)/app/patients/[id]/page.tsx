import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { PatientHeaderActions } from "@/components/patients/PatientHeaderActions";
import { PatientDocumentsTray } from "@/components/patients/PatientDocumentsTray";
import { PatientPrescriptionsList } from "@/components/patients/PatientPrescriptionsList";
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
  ArrowRightLeft,
} from "lucide-react";
import { TakeOverPatientButton } from "@/components/patients/TakeOverPatientButton";

export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { tenant, user } = await requireClinicStaff();
  const { id } = await params;

  const canPrescribe = Boolean(
    user.isDoctor ||
    user.role === "DOCTOR" ||
    user.role === "TENANT_ADMIN" ||
    user.role === "SUPER_ADMIN"
  );

  const isPureDoctor = Boolean(
    (user.isDoctor || user.role === "DOCTOR") &&
    user.role !== "TENANT_ADMIN" &&
    user.role !== "SUPER_ADMIN" &&
    user.role !== "RECEPTIONIST"
  );

  // 1. Fetch Patient with assigned doctor info
  const [patientRecord] = await db
    .select({
      patient: schema.patients,
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
        eq(schema.patients.id, id),
        isNull(schema.patients.deletedAt)
      )
    )
    .limit(1);

  if (!patientRecord) {
    notFound();
  }

  const patient = patientRecord.patient;
  const assignedDoctorName = patientRecord.assignedDoctorName;

  const visibilityMode =
    (tenant.doctorPatientVisibilityMode as "ISOLATED" | "COLLABORATIVE") || "ISOLATED";

  // If clinic operates in ISOLATED mode, pure doctors are restricted from viewing
  // patients not assigned to them and with whom they have no clinical history or active visit/queue.
  if (visibilityMode === "ISOLATED" && isPureDoctor && patient.assignedDoctorId !== user.id) {
    const [hasAppointment] = await db
      .select({ id: schema.appointments.id })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          eq(schema.appointments.patientId, id),
          eq(schema.appointments.doctorId, user.id)
        )
      )
      .limit(1);

    const [hasPrescription] = !hasAppointment
      ? await db
          .select({ id: schema.prescriptions.id })
          .from(schema.prescriptions)
          .where(
            and(
              eq(schema.prescriptions.tenantId, tenant.id),
              eq(schema.prescriptions.patientId, id),
              eq(schema.prescriptions.doctorId, user.id)
            )
          )
          .limit(1)
      : [null];

    const [hasQueueEntry] = (!hasAppointment && !hasPrescription)
      ? await db
          .select({ id: schema.queueEntries.id })
          .from(schema.queueEntries)
          .where(
            and(
              eq(schema.queueEntries.tenantId, tenant.id),
              eq(schema.queueEntries.patientId, id),
              eq(schema.queueEntries.doctorId, user.id)
            )
          )
          .limit(1)
      : [null];

    if (!hasAppointment && !hasPrescription && !hasQueueEntry) {
      return (
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#1C1C1E]">
            Patient Not Assigned to You
          </h2>
          <p className="text-sm text-[#64748B] max-w-md mx-auto">
            This patient is currently assigned to{" "}
            <span className="font-bold text-[#1C1C1E]">
              {assignedDoctorName ? `Dr. ${assignedDoctorName}` : "another clinic doctor"}
            </span>
            . Under your clinic&apos;s privacy settings, you can only access records for patients assigned to your chamber or queued for your visit today. Please ask the clinic admin or receptionist to queue or reassign this patient to you.
          </p>
          <div className="pt-2">
            <Link
              href="/app/patients"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2A5CAA] text-white font-bold text-xs hover:bg-[#1E4282] transition"
            >
              Return to My Patients
            </Link>
          </div>
        </div>
      );
    }
  }

  // Doctor collaboration & cross-chamber coverage checks:
  const isDoctorUser = Boolean(user.isDoctor || user.role === "DOCTOR");
  const isAssignedToOther =
    isDoctorUser &&
    Boolean(patient.assignedDoctorId && patient.assignedDoctorId !== user.id);
  const isDoctorUnassigned =
    isDoctorUser && !patient.assignedDoctorId;

  // Fetch active clinic doctors for switching
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
      {/* Collaborative Cross-Chamber Banner if patient is assigned to another dentist or unassigned */}
      {(isAssignedToOther || isDoctorUnassigned) && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
              <ArrowRightLeft className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                  {isAssignedToOther ? "Cross-Chamber Coverage" : "Chamber Assignment"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-200/80 font-bold text-amber-900">
                  {assignedDoctorName ? `Assigned to Dr. ${assignedDoctorName}` : "Currently Unassigned"}
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-0.5">
                You have full access to view medical history and clinical records. Are you attending this patient today?
              </p>
            </div>
          </div>
          <TakeOverPatientButton
            patientId={patient.id}
            patientName={patient.name}
            targetDoctorId={user.id}
            targetDoctorName={user.name}
          />
        </div>
      )}

      {/* Patient Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
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
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs font-semibold shadow-2xs">
              <Stethoscope className="w-3.5 h-3.5 text-[#2A5CAA]" />
              <span className="text-[#64748B]">Attending:</span>
              <span className="font-bold text-[#1C1C1E]">
                {assignedDoctorName ? `Dr. ${assignedDoctorName}` : "Unassigned"}
              </span>
            </div>
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

        {/* Action Buttons including Edit, Switch Doctor & Delete */}
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
          canPrescribe={canPrescribe}
          assignedDoctorId={patient.assignedDoctorId}
          assignedDoctorName={assignedDoctorName}
          doctors={doctors}
          canSwitchDoctor={!isPureDoctor}
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
              {canPrescribe && (
                <Link
                  href={`/app/prescriptions/new?patientId=${patient.id}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#2A5CAA] bg-[#E8EEF7] hover:bg-[#2A5CAA] hover:text-white px-2.5 py-1 rounded-lg transition-colors"
                >
                  + New Prescription
                </Link>
              )}
            </div>

            <PatientPrescriptionsList prescriptions={prescriptions} canEdit={canPrescribe} />
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
          <PatientDocumentsTray
            patientId={patient.id}
            initialAttachments={enrichedAttachments}
          />
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
                prefetch={false}
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
                  prefetch={false}
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
                              prefetch={false}
                              className="text-[11px] font-bold text-[#C0392B] hover:underline bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                            >
                              Pay Due
                            </Link>
                          )}
                          <Link
                            href={`/print/invoice/${inv.id}`}
                            prefetch={false}
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
