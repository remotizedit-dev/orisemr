"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSession, invalidateSession } from "@/lib/session";

export async function changeFirstLoginPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const context = await requireSession();
  const userId = context.user.id;

  if (!input.newPassword || input.newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters long." };
  }

  const reqHeaders = await headers();

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: false,
      },
      headers: reqHeaders,
    });
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.message ||
        "Incorrect current temporary password or update failed. Please check and try again.",
    };
  }

  // Update user preferences to clear mustChangePassword
  const currentPreferences = (context.user.preferences as Record<string, unknown>) || {};
  await db
    .update(schema.users)
    .set({
      preferences: {
        ...currentPreferences,
        mustChangePassword: false,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  invalidateSession();
  revalidatePath("/app");
  return { success: true };
}

/**
 * Immediately revokes all active sessions for a user from the database.
 * If a session cookie or token was ever cloned, stolen, or compromised,
 * this immediately renders it 100% dead across all devices and browsers.
 */
export async function revokeAllSessionsAction(targetUserId?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const context = await requireSession();
  const userIdToRevoke = targetUserId || context.user.id;

  // If revoking another user's sessions, verify administrative privileges
  if (targetUserId && targetUserId !== context.user.id) {
    const isPrivileged =
      context.user.role === "SUPER_ADMIN" || context.user.role === "TENANT_ADMIN";
    if (!isPrivileged) {
      return { success: false, error: "Unauthorized to revoke another user's sessions." };
    }
  }

  try {
    // 1. Delete all active sessions from the database
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userIdToRevoke));

    // 2. Clear in-memory session cache immediately
    invalidateSession();

    revalidatePath("/app");
    return {
      success: true,
      message: "All active sessions have been revoked. Any compromised or open sessions on any device are now invalid.",
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to revoke sessions." };
  }
}
