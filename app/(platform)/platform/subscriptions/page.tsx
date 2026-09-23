import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { formatBdt } from "@/lib/utils";
import { CreditCard } from "lucide-react";

export default async function PlatformSubscriptionsPage() {
  const subscriptions = await db
    .select({
      id: schema.platformSubscriptions.id,
      tenantName: schema.tenants.name,
      shortCode: schema.tenants.shortCode,
      planName: schema.platformSubscriptions.planName,
      priceBdt: schema.platformSubscriptions.priceBdt,
      billingCycle: schema.platformSubscriptions.billingCycle,
      status: schema.platformSubscriptions.status,
      currentPeriodStart: schema.platformSubscriptions.currentPeriodStart,
      currentPeriodEnd: schema.platformSubscriptions.currentPeriodEnd,
    })
    .from(schema.platformSubscriptions)
    .innerJoin(
      schema.tenants,
      eq(schema.platformSubscriptions.tenantId, schema.tenants.id)
    )
    .orderBy(desc(schema.platformSubscriptions.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
          SaaS Subscriptions ({subscriptions.length})
        </h1>
        <p className="text-sm text-[#6B7280]">
          Platform subscription tracking, renewal periods, and MRR status.
        </p>
      </div>

      <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E4E4E7] bg-white/50 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <th className="py-3 px-4">Chamber</th>
                <th className="py-3 px-4">Plan Name</th>
                <th className="py-3 px-4">Rate</th>
                <th className="py-3 px-4">Billing Cycle</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[#6B7280]">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-white/70 transition">
                    <td className="py-3.5 px-4 font-bold text-[#1C1C1E]">
                      {s.tenantName}{" "}
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#E8EEF7] text-[#2A5CAA] font-normal">
                        {s.shortCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-xs text-[#1C1C1E]">
                      {s.planName}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-xs text-[#1C1C1E]">
                      {formatBdt(s.priceBdt)}
                    </td>
                    <td className="py-3.5 px-4 text-xs capitalize text-[#6B7280]">
                      {s.billingCycle}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#6B7280]">
                      {s.currentPeriodStart} to {s.currentPeriodEnd}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          s.status === "active"
                            ? "bg-[#E8F8EE] text-[#30D158]"
                            : "bg-[#FFEBEA] text-[#FF453A]"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
