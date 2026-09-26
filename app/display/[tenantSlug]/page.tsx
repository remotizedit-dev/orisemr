import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { fetchTodayQueueItems } from "@/app/(tenant)/app/queue/actions";
import { QueueTvDisplay } from "@/components/queue/QueueTvDisplay";

export const metadata = {
  title: "Live Chamber Queue Display | Oris EMR",
  description: "Live waiting room and dental chair queue display monitor",
};

export default async function PublicQueueDisplayPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const [tenant] = await db
    .select({
      id: schema.tenants.id,
      name: schema.tenants.name,
      slug: schema.tenants.slug,
      brandColor: schema.tenants.brandColor,
    })
    .from(schema.tenants)
    .where(
      and(
        eq(schema.tenants.slug, tenantSlug.toLowerCase().trim()),
        eq(schema.tenants.status, "active")
      )
    )
    .limit(1);

  if (!tenant) {
    notFound();
  }

  const items = await fetchTodayQueueItems(tenant.id);

  // Privacy sanitization for public waiting room screen: mask phone numbers and hide medical flags
  const sanitizedItems = items.map((i) => ({
    ...i,
    patientPhone: i.patientPhone
      ? `${i.patientPhone.slice(0, 3)}****${i.patientPhone.slice(-4)}`
      : "",
    allergyFlags: [],
  }));

  return (
    <QueueTvDisplay
      initialItems={sanitizedItems}
      tenantName={tenant.name}
      brandColor={tenant.brandColor}
      tenantSlug={tenant.slug}
      isPublic={true}
    />
  );
}
