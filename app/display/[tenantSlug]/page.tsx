import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { fetchTodayQueueItems } from "@/app/(tenant)/app/queue/actions";
import { QueueTvDisplay } from "@/components/queue/QueueTvDisplay";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const cleanSlug = tenantSlug.toLowerCase().trim();
  const [t] = await db
    .select({ name: schema.tenants.name })
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, cleanSlug))
    .limit(1);

  return {
    title: t ? `Live Queue · ${t.name}` : "Live Queue Display",
    description: "Live waiting room and dental chair queue display monitor",
  };
}

import { getOrSetCache } from "@/lib/cache";
import { PrivateTvNoticeScreen } from "@/components/queue/PrivateTvNoticeScreen";

export default async function PublicQueueDisplayPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { tenantSlug } = await params;
  const { key } = await searchParams;
  const cleanSlug = tenantSlug.toLowerCase().trim();

  const tenant = await getOrSetCache(
    `tenant:public:${cleanSlug}`,
    async () => {
      const [t] = await db
        .select({
          id: schema.tenants.id,
          name: schema.tenants.name,
          slug: schema.tenants.slug,
          brandColor: schema.tenants.brandColor,
          tvDisplaySecret: schema.tenants.tvDisplaySecret,
        })
        .from(schema.tenants)
        .where(
          and(
            eq(schema.tenants.slug, cleanSlug),
            eq(schema.tenants.status, "active")
          )
        )
        .limit(1);
      return t || null;
    },
    300
  );

  if (!tenant) {
    notFound();
  }

  // Enforce secret key to protect patient queue and dental chair info from unauthorized public viewing
  if (!key || !tenant.tvDisplaySecret || key !== tenant.tvDisplaySecret) {
    return <PrivateTvNoticeScreen tenantName={tenant.name} />;
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
      secretKey={tenant.tvDisplaySecret || undefined}
      isPublic={true}
    />
  );
}
