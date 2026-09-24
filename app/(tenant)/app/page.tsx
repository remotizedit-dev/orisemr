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

  // Fetch dashboard metrics and appointments in parallel to eliminate sequential database waterfalls
  const [todayQueue, todayAppointments, dues] = await Promise.all([
    // 1. Fetch today's queue entries
    db
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
      ),

    // 2. Fetch scheduled appointments
    db
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
      .limit(6),

    // 3. Outstanding Dues sum
    db
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
      ),
  ]);

  const waitingCount = todayQueue.filter((q) => q.status === "waiting").length;
  const inChairCount = todayQueue.filter((q) => q.status === "in_chair").length;
  const billingCount = todayQueue.filter((q) => q.status === "billing").length;
  const doneCount = todayQueue.filter((q) => q.status === "done").length;

  const totalDueAmount = dues.reduce((acc, inv) => acc + (inv.total - inv.paid), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1C1C1E] tracking-tight">
            Today&apos;s Chamber Dashboard
          </h1>
          <p className="text-base font-medium text-[#4B5563] mt-1">
            Live patient arrivals, today&apos;s serial numbers, and scheduled treatments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/patients/new"
            className="px-4.5 py-3 rounded-2xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] text-sm font-bold flex items-center gap-2 shadow-xs transition"
          >
            <UserPlus className="w-4 h-4 text-[#2A5CAA]" />
            <span>New Patient</span>
          </Link>
          <Link
            href="/app/queue"
            className="px-4.5 py-3 rounded-2xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-bold flex items-center gap-2 shadow-sm transition"
          >
            <Layers className="w-4 h-4" />
            <span>Open Live Queue</span>
          </Link>
        </div>
      </div>

      {/* Live Queue Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <Link
          href="/app/queue"
          className="glass-panel p-6 rounded-3xl border border-[#E4E4E7] hover:border-[#2A5CAA]/40 transition group shadow-2xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold uppercase text-[#4B5563] tracking-wide">
              Waiting Lounge
            </span>
            <div className="w-3 h-3 rounded-full bg-[#FF9F0A]" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-[#1C1C1E]">
              {waitingCount}
            </span>
            <span className="text-sm text-[#2A5CAA] font-bold group-hover:underline">
              View queue →
            </span>
          </div>
        </Link>

        <Link
          href="/app/queue"
          className="glass-panel p-6 rounded-3xl border border-[#E4E4E7] hover:border-[#2A5CAA]/40 transition group shadow-2xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold uppercase text-[#4B5563] tracking-wide">
              In Dental Chair
            </span>
            <div className="w-3 h-3 rounded-full bg-[#2A5CAA] animate-ping" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-[#2A5CAA]">
              {inChairCount}
            </span>
            <span className="text-sm text-[#2A5CAA] font-bold group-hover:underline">
              Chair active →
            </span>
          </div>
        </Link>

        <Link
          href="/app/queue"
          className="glass-panel p-6 rounded-3xl border border-[#E4E4E7] hover:border-[#2A5CAA]/40 transition group shadow-2xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold uppercase text-[#4B5563] tracking-wide">
              Pending Billing
            </span>
            <div className="w-3 h-3 rounded-full bg-[#FF453A]" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-[#1C1C1E]">
              {billingCount}
            </span>
            <span className="text-sm text-[#2A5CAA] font-bold group-hover:underline">
              Take payment →
            </span>
          </div>
        </Link>

        <div className="glass-panel p-6 rounded-3xl border border-[#E4E4E7] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold uppercase text-[#4B5563] tracking-wide">
              Completed Today
            </span>
            <div className="w-3 h-3 rounded-full bg-[#30D158]" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-[#1C1C1E]">
              {doneCount}
            </span>
            <span className="text-sm text-[#4B5563] font-semibold">
              Visits finished
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Split: Appointments List & Dues Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments List */}
        <div className="lg:col-span-2 glass-panel rounded-3xl border border-[#E4E4E7] overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-[#E4E4E7] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#2A5CAA]" />
              <h2 className="text-base font-extrabold text-[#1C1C1E]">
                Today&apos;s Appointments
              </h2>
            </div>
            <Link
              href="/app/appointments"
              className="text-sm font-bold text-[#2A5CAA] hover:underline"
            >
              All Appointments →
            </Link>
          </div>

          <div className="divide-y divide-[#E4E4E7]">
            {todayAppointments.length === 0 ? (
              <div className="p-10 text-center text-sm font-medium text-[#6B7280]">
                No appointments booked for today.
              </div>
            ) : (
              todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 hover:bg-white/80 transition flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-[100px] text-center px-3 py-2 rounded-2xl bg-[#E8EEF7] border border-[#2A5CAA]/20 shrink-0 shadow-2xs">
                      <span className="text-sm font-black text-[#2A5CAA] block whitespace-nowrap font-mono tracking-tight">
                        {formatDhakaDate(apt.startTime, "hh:mm a")}
                      </span>
                      <span className="text-xs text-[#6B7280] block mt-0.5 whitespace-nowrap font-medium">
                        {formatDhakaDate(apt.startTime, "dd MMM yyyy")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-base text-[#1C1C1E] truncate">
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
                      <div className="text-xs sm:text-sm text-[#4B5563] truncate mt-0.5">
                        <span className="font-mono font-bold text-[#2A5CAA]">{apt.code}</span> • Dentist: {apt.doctorName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
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
                        className="text-xs sm:text-sm font-bold text-[#2A5CAA] hover:underline hidden sm:inline"
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
        <div className="glass-panel p-6 rounded-3xl border border-[#E4E4E7] space-y-4 shadow-2xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#E4E4E7]">
            <CreditCard className="w-5 h-5 text-[#FF9F0A]" />
            <h2 className="text-base font-extrabold text-[#1C1C1E]">
              Outstanding Patient Dues
            </h2>
          </div>

          <div>
            <span className="text-sm font-semibold text-[#4B5563] block">Total Unpaid Balance:</span>
            <span className="text-3xl font-black text-[#1C1C1E] mt-1 block font-mono">
              {formatBdt(totalDueAmount)}
            </span>
          </div>

          <p className="text-sm text-[#6B7280] leading-relaxed">
            Review overdue patient invoices and record settled balances at front desk.
          </p>

          <Link
            href="/app/billing/dues"
            className="block text-center py-3 px-4 rounded-xl bg-white border border-[#E4E4E7] hover:border-[#2A5CAA]/40 text-sm font-bold text-[#1C1C1E] hover:bg-[#F4F4F5] transition shadow-2xs"
          >
            Review Dues List →
          </Link>
        </div>
      </div>
    </div>
  );
}
