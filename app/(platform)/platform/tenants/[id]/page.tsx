import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { formatBdt } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  ShieldAlert,
  Users,
} from "lucide-react";
import { TenantStatusToggle } from "@/components/platform/TenantStatusToggle";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, id))
    .limit(1);

  if (!tenant) {
    notFound();
  }

  const [subscription] = await db
    .select()
    .from(schema.platformSubscriptions)
    .where(eq(schema.platformSubscriptions.tenantId, id))
    .limit(1);

  const staff = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.tenantId, id));

  const features = await db
    .select()
    .from(schema.tenantFeatures)
    .where(eq(schema.tenantFeatures.tenantId, id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/platform/tenants"
            className="p-2 rounded-xl bg-white border border-[#E4E4E7] text-[#6B7280] hover:text-[#1C1C1E] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
                {tenant.name}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#E8EEF7] text-[#2A5CAA] font-bold">
                {tenant.shortCode}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  tenant.status === "active"
                    ? "bg-[#E8F8EE] text-[#30D158]"
                    : "bg-[#FFEBEA] text-[#FF453A]"
                }`}
              >
                {tenant.status}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Public Booking URL: <code className="text-[#2A5CAA]">/book/{tenant.slug}</code>
            </p>
          </div>
        </div>

        {/* Super Admin Status Action: Turn Off / Reactivate Access */}
        <TenantStatusToggle
          tenantId={tenant.id}
          tenantName={tenant.name}
          currentStatus={tenant.status}
          suspendedReason={tenant.suspendedReason}
          suspendedAt={tenant.suspendedAt}
        />
      </div>

      {/* Suspension Alert Banner */}
      {tenant.status === "suspended" && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">Clinic Access is Currently Suspended</p>
            <p>
              All staff logins and public appointment booking are currently disabled for this tenant.
            </p>
            {tenant.suspendedReason && (
              <p className="text-red-800">
                <strong>Reason:</strong> {tenant.suspendedReason}
              </p>
            )}
            {tenant.suspendedAt && (
              <p className="text-red-700 text-[11px]">
                Suspended on: {new Date(tenant.suspendedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Clinic Profile Card */}
          <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#2A5CAA]" />
              <span>Chamber Information</span>
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#6B7280] block">Phone:</span>
                <span className="font-semibold text-[#1C1C1E]">{tenant.phone || "—"}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block">Email:</span>
                <span className="font-semibold text-[#1C1C1E]">{tenant.email || "—"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#6B7280] block">Address:</span>
                <span className="font-semibold text-[#1C1C1E]">{tenant.address || "—"}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block">Card Mode:</span>
                <span className="font-semibold text-[#1C1C1E]">{tenant.patientIdMode}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block">Slot Granularity:</span>
                <span className="font-semibold text-[#1C1C1E]">{tenant.slotGranularityMinutes} minutes</span>
              </div>
            </div>
          </div>

          {/* Staff List */}
          <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2A5CAA]" />
              <span>Staff Users ({staff.length})</span>
            </h2>
            <div className="divide-y divide-[#E4E4E7]">
              {staff.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#1C1C1E]">{u.name}</span>
                    <span className="text-[#6B7280] block">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#F4F4F5] text-[#1C1C1E] font-semibold text-[11px]">
                      {u.role}
                    </span>
                    {u.isDoctor && (
                      <span className="px-2 py-0.5 rounded bg-[#E8EEF7] text-[#2A5CAA] font-semibold text-[11px]">
                        Dentist
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Subscription & Plan Features */}
        <div className="space-y-6">
          {/* Subscription Card */}
          <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#2A5CAA]" />
              <span>Subscription</span>
            </h2>
            {subscription ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Plan:</span>
                  <span className="font-bold text-[#1C1C1E]">{subscription.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Price:</span>
                  <span className="font-bold text-[#1C1C1E]">
                    {formatBdt(subscription.priceBdt)} / {subscription.billingCycle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Status:</span>
                  <span className="font-bold text-[#30D158] uppercase text-[10px]">
                    {subscription.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Current Period:</span>
                  <span className="text-[#1C1C1E]">
                    {subscription.currentPeriodStart} to {subscription.currentPeriodEnd}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#6B7280]">No active subscription.</p>
            )}
          </div>

          {/* Features Toggle Preview */}
          <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E]">
              Plan Feature Flags
            </h2>
            <div className="space-y-2">
              {features.map((f) => (
                <div key={f.featureKey} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#1C1C1E] capitalize">
                    {f.featureKey.replace("_", " ")}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      f.platformEnabled
                        ? "bg-[#E8F8EE] text-[#30D158]"
                        : "bg-[#FFEBEA] text-[#FF453A]"
                    }`}
                  >
                    {f.platformEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
