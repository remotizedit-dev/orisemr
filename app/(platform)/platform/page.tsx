import Link from "next/link";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { formatBdt } from "@/lib/utils";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  MailWarning,
  Plus,
  ArrowRight,
  Clock,
} from "lucide-react";

export default async function PlatformDashboardPage() {
  // 1. Fetch clinic counts
  const allTenants = await db.select().from(schema.tenants);
  const activeTenants = allTenants.filter((t) => t.status === "active");
  const suspendedTenants = allTenants.filter((t) => t.status === "suspended");

  // 2. Fetch subscriptions and MRR
  const subscriptions = await db.select().from(schema.platformSubscriptions);

  let mrr = 0;
  let pastDueCount = 0;
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  let dueIn7DaysCount = 0;

  for (const sub of subscriptions) {
    if (sub.status === "active" || sub.status === "trialing") {
      if (sub.billingCycle === "monthly") {
        mrr += sub.priceBdt;
      } else {
        mrr += Math.round(sub.priceBdt / 12);
      }
    }

    if (sub.status === "past_due") {
      pastDueCount++;
    }

    const endDate = new Date(sub.currentPeriodEnd);
    if (endDate >= now && endDate <= next7Days) {
      dueIn7DaysCount++;
    }
  }

  // 3. Failed emails
  const failedEmails = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.emailQueue)
    .where(eq(schema.emailQueue.status, "failed"));
  const failedEmailCount = Number(failedEmails[0]?.count || 0);

  // 4. Recent clinics
  const recentTenants = await db
    .select()
    .from(schema.tenants)
    .orderBy(desc(schema.tenants.createdAt))
    .limit(5);

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Platform Overview
          </h1>
          <p className="text-sm text-[#6B7280]">
            SaaS subscription, tenant clinic health, and system operations.
          </p>
        </div>

        <Link
          href="/platform/tenants/new"
          className="px-4 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Clinic</span>
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Clinics */}
        <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B7280] tracking-wider">
              Active Clinics
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E8F8EE] text-[#30D158] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#1C1C1E]">
              {activeTenants.length}
            </span>
            {suspendedTenants.length > 0 && (
              <span className="text-xs font-medium text-[#FF453A]">
                ({suspendedTenants.length} suspended)
              </span>
            )}
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B7280] tracking-wider">
              Monthly Recurring (MRR)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#1C1C1E]">
              {formatBdt(mrr)}
            </span>
          </div>
        </div>

        {/* Due in 7 Days */}
        <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B7280] tracking-wider">
              Due in Next 7 Days
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FFF7EB] text-[#FF9F0A] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#1C1C1E]">
              {dueIn7DaysCount}
            </span>
            {pastDueCount > 0 && (
              <span className="text-xs font-semibold text-[#FF453A]">
                ({pastDueCount} past-due)
              </span>
            )}
          </div>
        </div>

        {/* Failed Emails */}
        <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B7280] tracking-wider">
              Failed Email Queue
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FFEBEA] text-[#FF453A] flex items-center justify-center">
              <MailWarning className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#1C1C1E]">
              {failedEmailCount}
            </span>
          </div>
        </div>
      </div>

      {/* Newest Clinics List */}
      <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
        <div className="p-5 border-b border-[#E4E4E7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#2A5CAA]" />
            <h2 className="text-base font-bold text-[#1C1C1E]">
              Recently Created Clinics
            </h2>
          </div>
          <Link
            href="/platform/tenants"
            className="text-xs font-semibold text-[#2A5CAA] hover:underline flex items-center gap-1"
          >
            <span>View All Clinics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-[#E4E4E7]">
          {recentTenants.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#6B7280]">
              No clinics created yet. Click "Create New Clinic" to onboard your first chamber.
            </div>
          ) : (
            recentTenants.map((clinic) => (
              <div
                key={clinic.id}
                className="p-4 hover:bg-white/80 transition flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1C1C1E]">
                      {clinic.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#E8EEF7] text-[#2A5CAA] font-mono font-semibold">
                      {clinic.shortCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        clinic.status === "active"
                          ? "bg-[#E8F8EE] text-[#30D158]"
                          : "bg-[#FFEBEA] text-[#FF453A]"
                      }`}
                    >
                      {clinic.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#6B7280] flex items-center gap-3">
                    <span>Slug: /book/{clinic.slug}</span>
                    {clinic.phone && <span>Phone: {clinic.phone}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/platform/tenants/${clinic.id}`}
                    className="text-xs font-semibold text-[#2A5CAA] hover:underline"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
