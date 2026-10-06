import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { formatBdt, formatDoctorName } from "@/lib/utils";
import { Plus, Stethoscope, Users, CreditCard, DollarSign, CheckCircle2, TrendingUp } from "lucide-react";
import InvoicesListClient, { type InvoiceRow } from "@/components/billing/InvoicesListClient";

export const metadata = {
  title: "Billing & Invoices",
};

export default async function BillingPage() {
  const { tenant, user } = await requireClinicStaff();

  // 1. Fetch all invoices with patient details and attending doctor attribution
  const invoices = await db
    .select({
      id: schema.invoices.id,
      code: schema.invoices.invoiceCode,
      totalBdt: schema.invoices.totalBdt,
      paidBdt: schema.invoices.paidBdt,
      status: schema.invoices.status,
      createdAt: schema.invoices.createdAt,
      patientId: schema.invoices.patientId,
      patientName: schema.patients.name,
      patientCard: schema.patients.cardNumber,
      doctorId: schema.invoices.doctorId,
      doctorName: schema.users.name,
    })
    .from(schema.invoices)
    .innerJoin(
      schema.patients,
      eq(schema.invoices.patientId, schema.patients.id)
    )
    .leftJoin(
      schema.users,
      eq(schema.invoices.doctorId, schema.users.id)
    )
    .where(eq(schema.invoices.tenantId, tenant.id))
    .orderBy(desc(schema.invoices.createdAt));

  // 2. Fetch active clinic doctors for attribution & filtering
  const clinicDoctors = await db
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

  // 3. Today's payments collection breakdown & desk cash custody audit
  const allPayments = await db
    .select({
      id: schema.payments.id,
      amountBdt: schema.payments.amountBdt,
      method: schema.payments.method,
      receivedBy: schema.payments.receivedBy,
      receiverName: schema.users.name,
      paidAt: schema.payments.paidAt,
    })
    .from(schema.payments)
    .leftJoin(schema.users, eq(schema.payments.receivedBy, schema.users.id))
    .where(eq(schema.payments.tenantId, tenant.id));

  let totalCollected = 0;
  const methodTotals: Record<string, number> = {
    cash: 0,
    bkash: 0,
    nagad: 0,
    card: 0,
  };

  const receiverMap = new Map<
    string,
    {
      userId: string;
      name: string;
      totalCollectedBdt: number;
      cashBdt: number;
      mfsBdt: number;
      cardBdt: number;
      count: number;
    }
  >();

  for (const p of allPayments) {
    totalCollected += p.amountBdt;
    if (methodTotals[p.method] !== undefined) {
      methodTotals[p.method] += p.amountBdt;
    }

    const rId = p.receivedBy || "unknown";
    const rName = p.receiverName || "Front Desk Staff";
    if (!receiverMap.has(rId)) {
      receiverMap.set(rId, {
        userId: rId,
        name: rName,
        totalCollectedBdt: 0,
        cashBdt: 0,
        mfsBdt: 0,
        cardBdt: 0,
        count: 0,
      });
    }
    const rec = receiverMap.get(rId)!;
    rec.totalCollectedBdt += p.amountBdt;
    if (p.method === "cash") {
      rec.cashBdt += p.amountBdt;
    } else if (p.method === "bkash" || p.method === "nagad") {
      rec.mfsBdt += p.amountBdt;
    } else {
      rec.cardBdt += p.amountBdt;
    }
    rec.count += 1;
  }

  const receiverBreakdown = Array.from(receiverMap.values()).sort(
    (a, b) => b.totalCollectedBdt - a.totalCollectedBdt
  );

  // 4. Calculate Doctor Performance & Earnings Breakdown
  const doctorMap = new Map<
    string,
    {
      doctorId: string;
      doctorName: string;
      patientIds: Set<string>;
      totalBilledBdt: number;
      totalCollectedBdt: number;
      totalDueBdt: number;
      invoicesCount: number;
    }
  >();

  // Pre-seed all active doctors
  for (const doc of clinicDoctors) {
    doctorMap.set(doc.id, {
      doctorId: doc.id,
      doctorName: formatDoctorName(doc.name),
      patientIds: new Set(),
      totalBilledBdt: 0,
      totalCollectedBdt: 0,
      totalDueBdt: 0,
      invoicesCount: 0,
    });
  }

  let unassignedBilled = 0;
  let unassignedCollected = 0;
  let unassignedDue = 0;
  const unassignedPatients = new Set<string>();
  let unassignedInvoices = 0;

  for (const inv of invoices) {
    if (inv.doctorId && doctorMap.has(inv.doctorId)) {
      const d = doctorMap.get(inv.doctorId)!;
      d.patientIds.add(inv.patientId);
      d.totalBilledBdt += inv.totalBdt;
      d.totalCollectedBdt += inv.paidBdt;
      d.totalDueBdt += Math.max(0, inv.totalBdt - inv.paidBdt);
      d.invoicesCount += 1;
    } else if (inv.doctorId) {
      const docName = inv.doctorName
        ? (inv.doctorName.startsWith("Dr.") ? inv.doctorName : `Dr. ${inv.doctorName}`)
        : "Attending Doctor";
      doctorMap.set(inv.doctorId, {
        doctorId: inv.doctorId,
        doctorName: docName,
        patientIds: new Set([inv.patientId]),
        totalBilledBdt: inv.totalBdt,
        totalCollectedBdt: inv.paidBdt,
        totalDueBdt: Math.max(0, inv.totalBdt - inv.paidBdt),
        invoicesCount: 1,
      });
    } else {
      unassignedPatients.add(inv.patientId);
      unassignedBilled += inv.totalBdt;
      unassignedCollected += inv.paidBdt;
      unassignedDue += Math.max(0, inv.totalBdt - inv.paidBdt);
      unassignedInvoices += 1;
    }
  }

  const doctorBreakdown = Array.from(doctorMap.values()).map((d) => ({
    doctorId: d.doctorId,
    doctorName: d.doctorName,
    uniquePatients: d.patientIds.size,
    totalBilledBdt: d.totalBilledBdt,
    totalCollectedBdt: d.totalCollectedBdt,
    totalDueBdt: d.totalDueBdt,
    invoicesCount: d.invoicesCount,
  }));

  const isDoctor = Boolean(user.isDoctor || user.role === "DOCTOR");
  const isPureDoctor = Boolean(
    isDoctor &&
    user.role !== "TENANT_ADMIN" &&
    user.role !== "SUPER_ADMIN" &&
    user.role !== "RECEPTIONIST"
  );

  const myStats = isDoctor
    ? doctorBreakdown.find((d) => d.doctorId === user.id) || {
        doctorId: user.id,
        doctorName: formatDoctorName(user.name),
        uniquePatients: 0,
        totalBilledBdt: 0,
        totalCollectedBdt: 0,
        totalDueBdt: 0,
        invoicesCount: 0,
      }
    : null;

  // Pure doctors only see invoices for patients they served
  const visibleInvoices = isPureDoctor
    ? invoices.filter((inv) => inv.doctorId === user.id)
    : invoices;

  const formattedInvoices: InvoiceRow[] = visibleInvoices.map((inv) => ({
    id: inv.id,
    code: inv.code,
    totalBdt: inv.totalBdt,
    paidBdt: inv.paidBdt,
    status: inv.status as any,
    createdAt: inv.createdAt,
    patientId: inv.patientId,
    patientName: inv.patientName,
    patientCard: inv.patientCard,
    doctorId: inv.doctorId,
    doctorName: inv.doctorName ? formatDoctorName(inv.doctorName) : undefined,
  }));

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1C1C1E] tracking-tight">
            Billing &amp; Invoices
          </h1>
          <p className="text-sm text-[#6B7280]">
            Attributed doctor earnings, patient billing, partial payments, and money reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/billing/dues"
            prefetch={false}
            className="px-4 py-2.5 rounded-2xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] text-sm font-bold shadow-2xs transition"
          >
            Review Outstanding Dues →
          </Link>
          <Link
            href="/app/billing/new"
            prefetch={false}
            className="px-5 py-2.5 rounded-2xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Create New Invoice</span>
          </Link>
        </div>
      </div>

      {/* Doctor-Specific Chamber Performance Highlight (when logged in as a Doctor) */}
      {isDoctor && myStats && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-[#2A5CAA]/10 via-[#2A5CAA]/5 to-transparent border border-[#2A5CAA]/25 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2A5CAA] text-white flex items-center justify-center shadow-xs">
                <Stethoscope className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-[#1C1C1E]">
                  My Chamber Revenue &amp; Patients Served
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Performance summary for {user.name.startsWith("Dr.") ? user.name : `Dr. ${user.name}`}
                </p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-[#2A5CAA] bg-white px-3 py-1 rounded-full border border-[#2A5CAA]/20 shadow-2xs">
              Doctor Chamber Portal
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-[#E4E4E7] shadow-2xs">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                Patients Served by Me
              </span>
              <span className="text-xl font-black text-[#1C1C1E] block mt-1">
                {myStats.uniquePatients}
              </span>
              <span className="text-[11px] text-[#6B7280] block mt-0.5">
                Across {myStats.invoicesCount} invoice(s)
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#E4E4E7] shadow-2xs">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                Total Billed by Me
              </span>
              <span className="text-xl font-black text-[#1C1C1E] block mt-1">
                {formatBdt(myStats.totalBilledBdt)}
              </span>
              <span className="text-[11px] text-[#6B7280] block mt-0.5">
                Procedures &amp; visits
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#E4E4E7] shadow-2xs">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                Total Collected / Earned
              </span>
              <span className="text-xl font-black text-[#30D158] block mt-1">
                {formatBdt(myStats.totalCollectedBdt)}
              </span>
              <span className="text-[11px] text-[#30D158] block mt-0.5">
                Cash, MFS &amp; Cards
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#E4E4E7] shadow-2xs">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                My Pending Patient Dues
              </span>
              <span className="text-xl font-black text-[#FF453A] block mt-1">
                {formatBdt(myStats.totalDueBdt)}
              </span>
              <span className="text-[11px] text-[#FF453A] block mt-0.5">
                Awaiting collection
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Whole-clinic Financial Overview (Admins & Reception Desk Only) */}
      {!isPureDoctor && (
        <>
          {/* Today's Reconciliation Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-[#E4E4E7]">
              <span className="text-[11px] font-bold uppercase text-[#6B7280] tracking-wider block">
                Clinic Total Collection
              </span>
              <span className="text-2xl font-black text-[#1C1C1E] block mt-1">
                {formatBdt(totalCollected)}
              </span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-[#E4E4E7]">
              <span className="text-[11px] font-bold uppercase text-[#6B7280] tracking-wider block">
                Cash Collection
              </span>
              <span className="text-2xl font-bold text-[#30D158] block mt-1">
                {formatBdt(methodTotals.cash)}
              </span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-[#E4E4E7]">
              <span className="text-[11px] font-bold uppercase text-[#6B7280] tracking-wider block">
                bKash Payments
              </span>
              <span className="text-2xl font-bold text-[#E2136E] block mt-1">
                {formatBdt(methodTotals.bkash)}
              </span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-[#E4E4E7]">
              <span className="text-[11px] font-bold uppercase text-[#6B7280] tracking-wider block">
                Nagad &amp; Cards
              </span>
              <span className="text-2xl font-bold text-[#2A5CAA] block mt-1">
                {formatBdt(methodTotals.nagad + methodTotals.card)}
              </span>
            </div>
          </div>

          {/* Doctor Performance & Earnings Attribution Summary (for Admin & Staff Overview) */}
          <div className="glass-panel rounded-3xl border border-[#E4E4E7] p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E4E4E7]">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-[#2A5CAA]" />
                <h2 className="text-base font-extrabold text-[#1C1C1E]">
                  Doctor Earnings &amp; Patient Attribution
                </h2>
              </div>
              <span className="text-xs text-[#6B7280]">
                Track which doctor served which patient and total revenue generated/collected
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E4E4E7] text-[#6B7280] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-3">Attending Doctor</th>
                    <th className="py-2.5 px-3 text-center">Patients Served</th>
                    <th className="py-2.5 px-3 text-center">Invoices</th>
                    <th className="py-2.5 px-3 text-right">Total Billed (Tk)</th>
                    <th className="py-2.5 px-3 text-right">Collected / Earned (Tk)</th>
                    <th className="py-2.5 px-3 text-right">Pending Due (Tk)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7]">
                  {doctorBreakdown.map((doc) => {
                    const isMe = user.id === doc.doctorId;
                    return (
                      <tr
                        key={doc.doctorId}
                        className={`hover:bg-[#F8FAFC] transition ${
                          isMe ? "bg-[#EBF2FC]/40 font-semibold" : ""
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1C1C1E]">{doc.doctorName}</span>
                            {isMe && (
                              <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded-md bg-[#2A5CAA] text-white">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[#1C1C1E]">
                          {doc.uniquePatients}
                        </td>
                        <td className="py-3 px-3 text-center text-[#6B7280]">
                          {doc.invoicesCount}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#1C1C1E]">
                          {formatBdt(doc.totalBilledBdt)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#30D158]">
                          {formatBdt(doc.totalCollectedBdt)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#FF453A]">
                          {formatBdt(doc.totalDueBdt)}
                        </td>
                      </tr>
                    );
                  })}

                  {unassignedInvoices > 0 && (
                    <tr className="hover:bg-[#F8FAFC] transition text-[#6B7280] italic">
                      <td className="py-3 px-3 font-semibold">
                        General Clinic (Unassigned Doctor)
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        {unassignedPatients.size}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {unassignedInvoices}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#1C1C1E]">
                        {formatBdt(unassignedBilled)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#30D158]">
                        {formatBdt(unassignedCollected)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#FF453A]">
                        {formatBdt(unassignedDue)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cash Custody & Desk Collection Audit (Received by Staff / Doctor) */}
          <div className="glass-panel rounded-3xl border border-[#E4E4E7] p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E4E4E7]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#30D158]" />
                <div>
                  <h2 className="text-base font-extrabold text-[#1C1C1E]">
                    Cash Custody &amp; Desk Collection Audit
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Shows physical funds received at the counter by staff or doctors (distinct from clinical procedure earnings)
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#30D158] bg-[#E8F8EE] px-3 py-1 rounded-full border border-[#30D158]/30">
                Cashier &amp; Register Reconciliation
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E4E4E7] text-[#6B7280] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-3">Received By (Staff / Chamber)</th>
                    <th className="py-2.5 px-3 text-center">Transactions</th>
                    <th className="py-2.5 px-3 text-right">Physical Cash (Tk)</th>
                    <th className="py-2.5 px-3 text-right">bKash / Nagad (Tk)</th>
                    <th className="py-2.5 px-3 text-right">Card / POS (Tk)</th>
                    <th className="py-2.5 px-3 text-right font-black text-[#1C1C1E]">Total Collected (Tk)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7]">
                  {receiverBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#6B7280]">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    receiverBreakdown.map((rec) => {
                      const isMe = user.id === rec.userId;
                      return (
                        <tr
                          key={rec.userId}
                          className={`hover:bg-[#F8FAFC] transition ${
                            isMe ? "bg-[#EBF2FC]/40 font-semibold" : ""
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#1C1C1E]">{rec.name}</span>
                              {isMe && (
                                <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded-md bg-[#2A5CAA] text-white">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-[#1C1C1E]">
                            {rec.count}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#30D158]">
                            {formatBdt(rec.cashBdt)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#E2136E]">
                            {formatBdt(rec.mfsBdt)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#2A5CAA]">
                            {formatBdt(rec.cardBdt)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-[#1C1C1E]">
                            {formatBdt(rec.totalCollectedBdt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Invoices List with Doctor Filter, Search, Pagination & Take Payment modal */}

      {/* Invoices List with Doctor Filter, Search, Pagination & Take Payment modal */}
      <InvoicesListClient
        invoices={formattedInvoices}
        doctors={clinicDoctors}
        currentUserId={user.id}
        isDoctor={isDoctor}
      />
    </div>
  );
}
