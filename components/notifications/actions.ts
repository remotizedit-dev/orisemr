"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";

export interface AppNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  readAt?: Date | null;
  createdAt: Date;
}

export async function getUserNotificationsAction(): Promise<{
  notifications: AppNotificationItem[];
  unreadCount: number;
}> {
  const { user, tenant } = await requireClinicStaff();

  const rows = await db
    .select({
      id: schema.notifications.id,
      type: schema.notifications.type,
      title: schema.notifications.title,
      body: schema.notifications.body,
      link: schema.notifications.link,
      readAt: schema.notifications.readAt,
      createdAt: schema.notifications.createdAt,
    })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, user.id),
        eq(schema.notifications.tenantId, tenant.id)
      )
    )
    .orderBy(desc(schema.notifications.createdAt))
    .limit(20);

  const unreadCount = rows.filter((r) => !r.readAt).length;

  return {
    notifications: rows,
    unreadCount,
  };
}

export async function markNotificationReadAction(notificationId: string) {
  const { user } = await requireClinicStaff();

  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, user.id)
      )
    );

  revalidatePath("/app");
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const { user } = await requireClinicStaff();

  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.userId, user.id),
        isNull(schema.notifications.readAt)
      )
    );

  revalidatePath("/app");
  return { success: true };
}
