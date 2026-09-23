import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSuperAdmin } from "@/lib/session";
import BroadcastsClient from "@/components/platform/BroadcastsClient";

export default async function PlatformBroadcastsPage() {
  await requireSuperAdmin();

  // 1. Fetch all clinics
  const clinics = await db
    .select({
      id: schema.tenants.id,
      name: schema.tenants.name,
      shortCode: schema.tenants.shortCode,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.status, "active"))
    .orderBy(schema.tenants.name);

  // 2. Fetch past broadcasts
  const pastBroadcasts = await db
    .select({
      id: schema.platformBroadcasts.id,
      title: schema.platformBroadcasts.title,
      body: schema.platformBroadcasts.body,
      target: schema.platformBroadcasts.target,
      audience: schema.platformBroadcasts.audience,
      sendEmail: schema.platformBroadcasts.sendEmail,
      sendInApp: schema.platformBroadcasts.sendInApp,
      recipientCount: schema.platformBroadcasts.recipientCount,
      sentAt: schema.platformBroadcasts.sentAt,
      createdBy: schema.platformBroadcasts.createdBy,
    })
    .from(schema.platformBroadcasts)
    .orderBy(desc(schema.platformBroadcasts.createdAt));

  const formattedBroadcasts = pastBroadcasts.map((b) => ({
    ...b,
    sentAt: b.sentAt ? b.sentAt.toISOString() : null,
  }));

  return (
    <BroadcastsClient
      clinics={clinics}
      pastBroadcasts={formattedBroadcasts}
    />
  );
}
