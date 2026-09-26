import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { formatBdt } from "@/lib/utils";
import { Building2, Plus, Search, ExternalLink } from "lucide-react";

export default async function TenantsListPage() {
  const tenants = await db
    .select({
      id: schema.tenants.id,
      name: schema.tenants.name,
      slug: schema.tenants.slug,
      shortCode: schema.tenants.shortCode,
      status: schema.tenants.status,
      phone: schema.tenants.phone,
      email: schema.tenants.email,
      createdAt: schema.tenants.createdAt,
      planName: schema.platformSubscriptions.planName,
      subStatus: schema.platformSubscriptions.status,
      priceBdt: schema.platformSubscriptions.priceBdt,
      billingCycle: schema.platformSubscriptions.billingCycle,
    })
    .from(schema.tenants)
    .leftJoin(
      schema.platformSubscriptions,
      eq(schema.tenants.id, schema.platformSubscriptions.tenantId)
    )
    .orderBy(desc(schema.tenants.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Clinics ({tenants.length})
          </h1>
          <p className="text-sm text-[#6B7280]">
            All onboarded dental chambers, active plans, and billing status.
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

      <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E4E4E7] bg-white/50 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <th className="py-3 px-4">Clinic Name</th>
                <th className="py-3 px-4">Short Code</th>
                <th className="py-3 px-4">Public URL</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[#6B7280]">
                    No clinics found.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-white/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1C1C1E]">{t.name}</div>
                      <div className="text-xs text-[#6B7280]">{t.phone || t.email || "No contact"}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#E8EEF7] text-[#2A5CAA] font-bold">
                        {t.shortCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <a
                        href={`/book/${t.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#2A5CAA] hover:underline flex items-center gap-1 font-mono"
                      >
                        <span>/book/{t.slug}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-xs text-[#1C1C1E]">
                        {t.planName || "Standard"} — {formatBdt(t.priceBdt || 0)}/{t.billingCycle || "mo"}
                      </div>
                      <div className="text-[11px] text-[#6B7280] uppercase font-bold">
                        {t.subStatus || "Active"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          t.status === "active"
                            ? "bg-[#E8F8EE] text-[#30D158]"
                            : "bg-[#FFEBEA] text-[#FF453A]"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/platform/tenants/${t.id}`}
                        className="text-xs font-bold text-[#2A5CAA] bg-[#E8EEF7] hover:bg-[#2A5CAA] hover:text-white px-3 py-1.5 rounded-xl transition inline-block shadow-2xs"
                      >
                        Manage Clinic →
                      </Link>
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
