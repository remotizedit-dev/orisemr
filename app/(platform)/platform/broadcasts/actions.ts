"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSuperAdmin } from "@/lib/session";
import {
  sendEmailInBackground,
  renderBroadcastAnnouncementHtml,
} from "@/lib/email/mailer";
import { logAudit } from "@/lib/audit";

export interface SendBroadcastInput {
  title: string;
  body: string;
  target: (typeof schema.broadcastTargetEnum.enumValues)[number];
  targetTenantIds?: string[];
  audience: (typeof schema.broadcastAudienceEnum.enumValues)[number];
  sendEmail: boolean;
  sendInApp: boolean;
}

export async function sendBroadcastAction(input: SendBroadcastInput) {
  const session = await requireSuperAdmin();

  if (!input.title.trim() || !input.body.trim()) {
    throw new Error("Broadcast title and message body are required.");
  }

  if (!input.sendEmail && !input.sendInApp) {
    throw new Error("Please select at least one delivery channel (In-App or Email).");
  }

  // 1. Resolve Target Tenants
  let targetTenantIds: string[] = [];
  if (input.target === "all_tenants") {
    const allTenants = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.status, "active"));
    targetTenantIds = allTenants.map((t) => t.id);
  } else if (input.target === "selected_tenants") {
    targetTenantIds = input.targetTenantIds || [];
  }

  if (targetTenantIds.length === 0) {
    throw new Error("No target clinics found for this broadcast.");
  }

  // 2. Resolve Target Users
  const userConditions = [
    inArray(schema.users.tenantId, targetTenantIds),
    eq(schema.users.status, "active"),
  ];

  if (input.audience === "tenant_admins") {
    userConditions.push(eq(schema.users.role, "TENANT_ADMIN"));
  }

  const targetUsers = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      tenantId: schema.users.tenantId,
    })
    .from(schema.users)
    .where(and(...userConditions));

  const recipientCount = targetUsers.length;
  let createdBroadcastId: string | null = null;

  await db.transaction(async (tx) => {
    // 3. Create Broadcast Record
    const [broadcast] = await tx
      .insert(schema.platformBroadcasts)
      .values({
        title: input.title.trim(),
        body: input.body.trim(),
        target: input.target,
        targetTenantIds,
        targetUserIds: [],
        audience: input.audience,
        sendEmail: input.sendEmail,
        sendInApp: input.sendInApp,
        recipientCount,
        createdBy: session.user.id,
        sentAt: new Date(),
      })
      .returning({ id: schema.platformBroadcasts.id });

    createdBroadcastId = broadcast.id;

    // 4. Send In-App Notifications (Batch Insert)
    if (input.sendInApp && targetUsers.length > 0) {
      await tx.insert(schema.notifications).values(
        targetUsers.map((u) => ({
          userId: u.id,
          tenantId: u.tenantId || null,
          type: "PLATFORM_BROADCAST",
          title: input.title.trim(),
          body: input.body.trim(),
          broadcastId: broadcast.id,
        }))
      );
    }

    // 5. Send Emails to Target Users / Tenant Admins (Batch Insert Queue)
    if (input.sendEmail) {
      const emailUsers = targetUsers.filter((u) => Boolean(u.email));

      for (const u of emailUsers) {
        // Dispatch email directly in background
        sendEmailInBackground({
          to: u.email!.trim(),
          subject: `[Oris Platform Announcement] ${input.title.trim()}`,
          html: renderBroadcastAnnouncementHtml({
            recipientName: u.name,
            title: input.title.trim(),
            message: input.body.trim(),
          }),
        });
      }

      if (emailUsers.length > 0) {
        await tx.insert(schema.emailQueue).values(
          emailUsers.map((u) => ({
            tenantId: u.tenantId || null,
            toEmail: u.email!.trim(),
            subject: `[Oris Platform Announcement] ${input.title.trim()}`,
            templateKey: "platform_broadcast",
            payload: {
              title: input.title.trim(),
              message: input.body.trim(),
              recipientName: u.name,
            },
            status: "sent" as const,
            sentAt: new Date(),
            dedupeKey: `broadcast_${broadcast.id}_${u.id}`,
          }))
        );
      }
    }
  });

  await logAudit({
    action: "PLATFORM_BROADCAST_SENT",
    entityType: "broadcast",
    entityId: createdBroadcastId,
    actorId: session.user.id,
    after: {
      title: input.title.trim(),
      audience: input.audience,
      recipientCount,
      sendEmail: input.sendEmail,
      sendInApp: input.sendInApp,
    },
  });

  revalidatePath("/platform/broadcasts");
  revalidatePath("/platform/audit");
  return { success: true, recipientCount };
}
