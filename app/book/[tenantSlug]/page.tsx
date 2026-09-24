import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { PublicBookingClient } from "./PublicBookingClient";
import { Stethoscope } from "lucide-react";

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { tenantSlug } = await params;
  const { embed } = await searchParams;

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(
      and(
        eq(schema.tenants.slug, tenantSlug.toLowerCase()),
        eq(schema.tenants.status, "active")
      )
    )
    .limit(1);

  if (!tenant) {
    notFound();
  }

  // Fetch feature, bookable services, and active doctors concurrently
  const [[feature], services, doctors] = await Promise.all([
    db
      .select()
      .from(schema.tenantFeatures)
      .where(
        and(
          eq(schema.tenantFeatures.tenantId, tenant.id),
          eq(schema.tenantFeatures.featureKey, "public_booking")
        )
      )
      .limit(1),
    db
      .select({
        id: schema.services.id,
        name: schema.services.name,
        durationMinutes: schema.services.durationMinutes,
        priceBdt: schema.services.priceBdt,
      })
      .from(schema.services)
      .where(
        and(
          eq(schema.services.tenantId, tenant.id),
          eq(schema.services.bookableOnline, true),
          eq(schema.services.isActive, true)
        )
      )
      .orderBy(schema.services.sortOrder),
    db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        doctorTitle: schema.users.doctorTitle,
        doctorSpecialty: schema.users.doctorSpecialty,
        sortOrder: schema.users.sortOrder,
      })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.tenantId, tenant.id),
          eq(schema.users.isDoctor, true),
          eq(schema.users.status, "active")
        )
      )
      .orderBy(schema.users.sortOrder),
  ]);

  if (feature && (!feature.platformEnabled || !feature.tenantEnabled)) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl max-w-md text-center space-y-3">
          <Stethoscope className="w-10 h-10 text-[#6B7280] mx-auto" />
          <h1 className="text-lg font-bold text-[#1C1C1E]">{tenant.name}</h1>
          <p className="text-sm text-[#6B7280]">
            Online appointment booking is currently unavailable for this chamber.
            Please contact the clinic directly at {tenant.phone || "the front desk"}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-[#F4F4F5] via-white to-[#E8EEF7]/40 ${
        embed ? "p-0" : "p-4 sm:p-6"
      }`}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Chamber Header */}
        <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-md shrink-0"
            style={{ backgroundColor: tenant.brandColor || "#2A5CAA" }}
          >
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#1C1C1E] tracking-tight">
              {tenant.name}
            </h1>
            <p className="text-xs text-[#6B7280]">{tenant.address}</p>
            {tenant.phone && (
              <p className="text-xs text-[#6B7280]">Phone: {tenant.phone}</p>
            )}
          </div>
        </div>

        {/* Interactive Booking Flow */}
        <PublicBookingClient
          tenant={{
            id: tenant.id,
            slug: tenant.slug,
            shortCode: tenant.shortCode,
            brandColor: tenant.brandColor || "#2A5CAA",
            slotGranularityMinutes: tenant.slotGranularityMinutes,
            bookingBufferMinutes: tenant.bookingBufferMinutes,
            publicBookingMinLeadMinutes: tenant.publicBookingMinLeadMinutes,
            publicBookingDaysAhead: tenant.publicBookingDaysAhead,
          }}
          services={services}
          doctors={doctors}
        />
      </div>
    </div>
  );
}
