import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { formatBdt, formatDhakaDate } from "@/lib/utils";
import {
  Calendar,
  CreditCard,
  Layers,
  Plus,
  UserCheck,
  UserPlus,
  Users,
  Clock,
  ArrowRight,
} from "lucide-react";

export default async function TenantDashboardPage() {
  const { tenant, user } = await requireClinicStaff();

  const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // 1. Fetch today's queue entries
  const todayQueue = await db
    .select({
      id: schema.queueEntries.id,
      status: schema.queueEntries.status,
      serialNo: schema.queueEntries.serialNo,
      patientName: schema.patients.name,
      patientCard: schema.patients.cardNumber,
      doctorName: schema.users.name,
    })
    .from(schema.queueEntries)
    .innerJoin(
      schema.patients,
      eq(schema.queueEntries.patientId, schema.patients.id)
    )
    .innerJoin(
      schema.users,
      eq(schema.queueEntries.doctorId, schema.users.id)
    )
    .where(
      and(
        eq(schema.queueEntries.tenantId, tenant.id),
        eq(schema.queueEntries.date, todayDhakaStr)
      )
    );

  const waitingCount = todayQueue.filter((q) => q.status === "waiting").length;
  const inChairCount = todayQueue.filter((q) => q.status === "in_chair").length;
  const billingCount = todayQueue.filter((q) => q.status === "billing").length;
  const doneCount = todayQueue.filter((q) => q.status === "done").length;

  // 2. Fetch today's scheduled appointments
  const todayAppointments = await db
    .select({
      id: schema.appointments.id,
      code: schema.appointments.appointmentCode,
      startTime: schema.appointments.startTime,
      status: schema.appointments.status,
      patientId: schema.appointments.patientId,
      patientName: schema.patients.name,
      patientPhone: schema.patients.phone,
      pendingName: schema.appointments.pendingPatientName,
      doctorName: schema.users.name,
    })
    .from(schema.appointments)
    .leftJoin(
      schema.patients,
      eq(schema.appointments.patientId, schema.patients.id)
    )
    .innerJoin(
      schema.users,
      eq(schema.appointments.doctorId, schema.users.id)
    )
    .where(eq(schema.appointments.tenantId, tenant.id))
    .orderBy(desc(schema.appointments.startTime))
    .limit(6);

  // 3. Outstanding Dues sum
  const dues = await db
    .select({
      total: schema.invoices.totalBdt,
      paid: schema.invoices.paidBdt,
    })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.tenantId, tenant.id),
        eq(schema.invoices.status, "due")
      )
    );

  const totalDueAmount = dues.reduce((acc, inv) => acc + (inv.total - inv.paid), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Today's Chamber Dashboard
          </h1>
          <p className="text-sm text-[#6B7280]">
            Live patient arrivals, today's serial numbers, and scheduled treatments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/patients/new"
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#2A5CAA]" />
            <span>New Patient</span>
          </Link>
          <Link
            href="/app/queue"
            className="px-4 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Open Live Queue</span>
          </Link>
        </div>
      </div>

      {/* Live Queue Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/app/queue"
          className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] hover:border-[#2A5CAA]/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#6B7280] tracking-wider">
              Waiting in Chamber
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF9F0A]" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#1C1C1E]">
              {waitingCount}
            </span>
            <span className="text-xs text-[#2A5CAA] font-semibold group-hover:underline">
              View queue →
            </span>
          </div>
        </Link>

        <Link
          href="/app/queue"
          className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] hover:border-[#2A5CAA]/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#6B7280] tracking-wider">
              Currently In Chair
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#2A5CAA] animate-ping" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#2A5CAA]">
              {inChairCount}
            </span>
            <span className="text-xs text-[#2A5CAA] font-semibold group-hover:underline">
              Chair active →
            </span>
          </div>
        </Link>

        <Link
          href="/app/queue"
          className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] hover:border-[#2A5CAA]/40 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#6B7280] tracking-wider">
              Pending Billing
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF453A]" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#1C1C1E]">
              {billingCount}
            </span>
            <span className="text-xs text-[#2A5CAA] font-semibold group-hover:underline">
              Take payment →
            </span>
          </div>
        </Link>

        <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#6B7280] tracking-wider">
              Completed Today
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#30D158]" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#1C1C1E]">
              {doneCount}
            </span>
            <span className="text-xs text-[#6B7280] font-semibold">
              Treatments done
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Split: Appointments List & Dues Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments List */}
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
          <div className="p-4 border-b border-[#E4E4E7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2A5CAA]" />
              <h2 className="text-sm font-bold text-[#1C1C1E]">
                Today's Appointments
              </h2>
            </div>
            <Link
              href="/app/appointments"
              className="text-xs font-semibold text-[#2A5CAA] hover:underline"
            >
              All Appointments →
            </Link>
          </div>

          <div className="divide-y divide-[#E4E4E7]">
            {todayAppointments.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6B7280]">
                No appointments booked for today.
              </div>
            ) : (
              todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-3.5 hover:bg-white/80 transition flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="min-w-[85px] text-center px-2.5 py-1.5 rounded-xl bg-[#E8EEF7] border border-[#2A5CAA]/20 shrink-0 shadow-2xs">
                      <span className="text-xs font-black text-[#2A5CAA] block whitespace-nowrap font-mono tracking-tight">
                        {formatDhakaDate(apt.startTime, "hh:mm a")}
                      </span>
                      <span className="text-[10px] text-[#6B7280] block mt-0.5 whitespace-nowrap font-medium">
                        {formatDhakaDate(apt.startTime, "dd MMM yyyy")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#1C1C1E] truncate">
                        {apt.patientId ? (
                          <Link
                            href={`/app/patients/${apt.patientId}`}
                            className="hover:text-[#2A5CAA] hover:underline"
                            title="Open patient profile"
                          >
                            {apt.patientName || apt.pendingName || "Patient"}
                          </Link>
                        ) : (
                          <span>{apt.patientName || apt.pendingName || "Patient"}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#6B7280] truncate mt-0.5">
                        <span className="font-mono">{apt.code}</span> • {apt.doctorName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        apt.status === "confirmed"
                          ? "bg-[#E8F8EE] text-[#30D158]"
                          : apt.status === "pending"
                          ? "bg-[#FFF7EB] text-[#FF9F0A]"
                          : "bg-[#F4F4F5] text-[#6B7280]"
                      }`}
                    >
                      {apt.status}
                    </span>
                    {apt.patientId && (
                      <Link
                        href={`/app/patients/${apt.patientId}`}
                        className="text-[11px] font-semibold text-[#2A5CAA] hover:underline hidden sm:inline"
                      >
                        Profile →
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dues Widget */}
        <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E4E4E7]">
            <CreditCard className="w-4 h-4 text-[#FF9F0A]" />
            <h2 className="text-sm font-bold text-[#1C1C1E]">
              Outstanding Patient Dues
            </h2>
          </div>

          <div>
            <span className="text-xs text-[#6B7280] block">Total Unpaid Balance:</span>
            <span className="text-2xl font-black text-[#1C1C1E] mt-1 block">
              {formatBdt(totalDueAmount)}
            </span>
          </div>

          <p className="text-xs text-[#6B7280] leading-relaxed">
            Review overdue patient invoices and send daily payment reminders with one click.
          </p>

          <Link
            href="/app/billing/dues"
            className="block text-center py-2 px-3 rounded-lg bg-white border border-[#E4E4E7] text-xs font-semibold text-[#1C1C1E] hover:bg-[#F4F4F5] transition"
          >
            Review Dues List →
          </Link>
        </div>
      </div>
    </div>
  );
}
